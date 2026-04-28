/**
 * ML data export utilities.
 *
 * Goal: produce files that can be `pd.read_csv()`-ed and fed straight into
 * LightGBM / XGBoost / TabPFN with no preprocessing.
 *
 * Conventions:
 * - Every CSV row has run_id so multi-run datasets can be concatenated.
 * - Time fields are ISO 8601 UTC.
 * - Categorical fields are strings, not encoded — let the trainer one-hot.
 * - Bar context features prefix: bar_{tminus N}_o / h / l / c / v / ret
 *   where bar_tminus_1 is the bar BEFORE the signal (most recent closed).
 * - Walk-forward fold: 0..4 (5 chronological folds, signals partitioned by time).
 */

const RETURN_WINDOWS_BARS = [1, 3, 5, 10, 20]   // 1m, 3m, 5m, 10m, 20m if 1m bars; or 5m, 15m, 25m, 50m, 100m if 5m
const BAR_CONTEXT_LOOKBACK = 20                  // last N closed bars before each signal

// ── CSV helpers ──────────────────────────────────────────────────────────
function csvCell(v) {
  if (v == null) return ''
  const s = typeof v === 'string' ? v
          : typeof v === 'object' ? JSON.stringify(v)
          : String(v)
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

export function rowsToCSV(rows) {
  return rows.map(r => r.map(csvCell).join(',')).join('\n')
}

export function downloadCSV(rows, name) {
  const blob = new Blob([rowsToCSV(rows)], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = name; a.click()
}

export function downloadJSON(obj, name) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = name; a.click()
}

// ── Build the ML dataset (signals + bar context + returns + fold) ───────
/**
 * Build a "drop into pandas" CSV from signals + bars.
 *
 * @param {object} args
 * @param {string} args.runId
 * @param {object} args.runMeta - run row from backtest_runs (label, symbol, dates, etc.)
 * @param {Array}  args.signals - signal_log rows
 * @param {Array}  args.bars    - [{t (epoch sec), o, h, l, c, v}, ...]
 * @param {Array}  args.trades  - backtest_trades rows (for outcome enrichment)
 * @returns {Array<Array<string|number>>} rows for CSV
 */
export function buildMLDataset({ runId, runMeta, signals, bars, trades }) {
  const sortedBars = [...bars].sort((a, b) => a.t - b.t)
  const sortedSignals = [...(signals || [])].sort((a, b) =>
    new Date(a.created_at || 0) - new Date(b.created_at || 0))
  // Map trades back to signals where signal_log_id was tracked, or by entry_ts proximity
  const tradeByEntryTs = new Map()
  trades.forEach(t => tradeByEntryTs.set(t.entry_ts, t))

  // Compute time-fold (5 chronological splits)
  const tsList = sortedSignals.map(s => new Date(s.created_at || 0).getTime()).filter(t => t > 0)
  const tsMin = tsList.length ? Math.min(...tsList) : 0
  const tsMax = tsList.length ? Math.max(...tsList) : 0
  const tsRange = Math.max(1, tsMax - tsMin)
  const fold = (ts) => {
    const f = Math.floor(((ts - tsMin) / tsRange) * 5)
    return Math.min(4, Math.max(0, f))
  }

  // Discover all feature keys (and filter keys for rejected signals)
  const featKeys = new Set()
  const filterKeys = new Set()
  sortedSignals.forEach(s => {
    if (s.features) Object.keys(s.features).forEach(k => featKeys.add(k))
    if (Array.isArray(s.filters)) s.filters.forEach(f => filterKeys.add(f))
  })
  const featCols = [...featKeys].sort().map(k => `feat_${k}`)
  const filterCols = [...filterKeys].sort().map(k => `filter_${k}`)

  // Bar context columns
  const barCols = []
  for (let n = 1; n <= BAR_CONTEXT_LOOKBACK; n++) {
    barCols.push(`bar_tminus${n}_o`, `bar_tminus${n}_h`, `bar_tminus${n}_l`,
                 `bar_tminus${n}_c`, `bar_tminus${n}_v`)
  }
  const retCols = RETURN_WINDOWS_BARS.map(n => `ret_${n}b`)

  const baseCols = [
    // identifiers
    'run_id', 'run_label', 'symbol', 'bot_version',
    // signal time
    'created_at', 'closed_at', 'fold',
    // setup
    'side', 'entry_price', 'contracts',
    'score', 'min_score', 'regime_mode', 'session', 'minutes_into_session',
    'day_of_week', 'hour_of_day',
    // context at decision time
    'trades_today', 'daily_pnl_before', 'consecutive_losses',
    // brackets (target / stop levels, useful as features)
    'tp_price', 'sl_price',
    // outcome (label)
    'outcome', 'taken', 'win', 'pnl', 'r_multiple',
    'exit_price', 'duration_seconds', 'mfe_ticks', 'mae_ticks',
  ]

  const cols = [...baseCols, ...featCols, ...filterCols, ...retCols, ...barCols]
  const rows = [cols]

  for (const s of sortedSignals) {
    const tsMs = new Date(s.created_at || 0).getTime()
    const tsSec = Math.floor(tsMs / 1000)
    const taken = s.outcome !== 'filtered_out' ? 1 : 0
    const pnl = s.pnl != null ? parseFloat(s.pnl) : null
    const win = pnl != null ? (pnl > 0 ? 1 : 0) : ''
    const risk = (s.entry_price != null && s.sl_price != null)
                 ? Math.abs(parseFloat(s.entry_price) - parseFloat(s.sl_price)) : null
    const r_multiple = (pnl != null && risk && risk > 0)
                       ? pnl / risk : ''

    // Find prior bars (most recent N bars with t <= tsSec)
    const lastIdx = lowerBound(sortedBars, tsSec)
    const ctx = []
    for (let n = 1; n <= BAR_CONTEXT_LOOKBACK; n++) {
      const b = sortedBars[lastIdx - n]
      if (b) ctx.push(b.o, b.h, b.l, b.c, b.v)
      else ctx.push('', '', '', '', '')
    }
    // Returns (close_now / close_n_back) - 1
    const closeNow = sortedBars[lastIdx - 1]?.c
    const rets = RETURN_WINDOWS_BARS.map(n => {
      const past = sortedBars[lastIdx - 1 - n]?.c
      if (!closeNow || !past) return ''
      return ((closeNow - past) / past).toFixed(6)
    })

    const filterFlags = [...filterKeys].sort().map(k =>
      Array.isArray(s.filters) && s.filters.includes(k) ? 1 : 0)
    const featValues = [...featKeys].sort().map(k => s.features?.[k] ?? '')

    rows.push([
      runId, runMeta?.label || '', s.symbol || runMeta?.symbol || '', s.bot_version || '',
      s.created_at || '', s.closed_at || '', tsMs ? fold(tsMs) : '',
      s.side || '', s.entry_price ?? '', s.contracts ?? '',
      s.score ?? '', s.min_score_threshold ?? '', s.regime_mode || '', s.session || '', s.minutes_into_session ?? '',
      s.day_of_week ?? '', s.hour_of_day ?? '',
      s.trades_today ?? '', s.daily_pnl_before ?? '', s.consecutive_losses ?? '',
      s.tp_price ?? '', s.sl_price ?? '',
      s.outcome || '', taken, win, pnl ?? '', r_multiple,
      s.exit_price ?? '', s.duration_seconds ?? '', s.mfe_ticks ?? '', s.mae_ticks ?? '',
      ...featValues,
      ...filterFlags,
      ...rets,
      ...ctx,
    ])
  }
  return rows
}

// Binary search: largest index with bars[i].t <= target. Returns insertion point.
function lowerBound(bars, t) {
  let lo = 0, hi = bars.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (bars[mid].t <= t) lo = mid + 1
    else hi = mid
  }
  return lo
}

// ── Schema documentation ───────────────────────────────────────────────
export function buildSchemaDoc({ featKeysHint = [], runMeta = {} } = {}) {
  return {
    generated_at: new Date().toISOString(),
    description: "ML-ready training dataset from a backtest run. One row per bot signal (taken or rejected).",
    target_columns: {
      win:        "1 if pnl>0 else 0. Binary classification target.",
      pnl:        "Net PnL in USD. Regression target.",
      r_multiple: "PnL divided by risk_per_trade (entry-stop distance). Risk-adjusted target.",
    },
    feature_columns: {
      "feat_*":   "All numeric features the bot computed at signal time (ATR percentile, KER, VWAP distance, etc.). Discovered dynamically.",
      "filter_*": "Binary flags for each filter the bot considered (1=this filter rejected, 0=passed). Useful for negative training examples.",
      "bar_tminusN_o/h/l/c/v": "OHLCV of the Nth most recent bar before the signal (1 = bar just before signal). Use for sequence-aware models.",
      "ret_Nb":   "Log-style return over the last N bars. Quick momentum feature.",
      "regime_mode / session / side": "Categorical — one-hot encode in your trainer.",
      "fold":     "0-4 chronological split for walk-forward CV. Train: fold<4. Val: fold==4.",
    },
    methodology_notes: [
      "Walk-forward CV: never random_split. Train on fold<N, validate on fold==N.",
      "Class imbalance: typical bot has 30-50% win rate. Consider class_weight='balanced' or scale_pos_weight in LightGBM/XGBoost.",
      "Calibration: raw model probabilities are usually overconfident. Apply isotonic regression or Platt scaling on validation set.",
      "Cost-sensitive learning: predict r_multiple (continuous) instead of win (binary) to capture asymmetric payoffs.",
      "Avoid look-ahead: bar_tminusN columns only use bars BEFORE the signal timestamp. Verify before training.",
    ],
    suggested_models: [
      "LightGBM with categorical_feature=['regime_mode','session','side'] — gold standard for tabular trading data",
      "TabPFN — zero-tuning transformer, often beats LightGBM under 10k rows",
      "Two-stage: setup classifier first, then per-setup XGBoost (mixture of experts)",
    ],
    run_metadata: runMeta,
  }
}
