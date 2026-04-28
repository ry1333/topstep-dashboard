import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Area, AreaChart, ComposedChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import HudCard from '../components/HudCard'
import MetricTile from '../components/MetricTile'
import Histogram from '../components/Histogram'
import MaeMfeScatter from '../components/MaeMfeScatter'
import PnlHeatmap from '../components/PnlHeatmap'
import PriceReplayChart from '../components/PriceReplayChart'
import { fetchSignalLogFromStorage, useBacktestRun } from '../hooks/useBacktests'

function parseReasoning(entryTag) {
  if (!entryTag || typeof entryTag !== 'string') return null
  if (!entryTag.startsWith('{')) return null
  try { return JSON.parse(entryTag) } catch { return null }
}

const STATUS_CHIP = { queued: 'br', running: 'cy', done: 'pl', failed: 'ls', canceled: '' }
const SPEEDS = [
  { label: '8s',   duration: 8 },
  { label: '30s',  duration: 30 },
  { label: '60s',  duration: 60 },
  { label: '2m',   duration: 120 },
  { label: '5m',   duration: 300 },
]

function fmtMoney(n, sign = true) {
  if (n == null || isNaN(n)) return '—'
  const s = sign ? (n >= 0 ? '+$' : '-$') : '$'
  return s + Math.abs(n).toFixed(2)
}
function fmtPct(n) { return n == null ? '—' : (100 * n).toFixed(1) + '%' }

export default function BacktestRun() {
  const { id } = useParams()
  const { run, equity, trades, riskEvents, bars, loading } = useBacktestRun(id)

  // ── ALL hooks declared up-front (no early returns above this line) ──
  const [tradeFilter, setTradeFilter] = useState('all')
  const [cursor, setCursor] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(60)
  const [autoPlayed, setAutoPlayed] = useState(false)
  const lastTRef = useRef(0)

  const startMs = equity[0]?.ts ? new Date(equity[0].ts).getTime() : null
  const endMs   = equity[equity.length - 1]?.ts ? new Date(equity[equity.length - 1].ts).getTime() : null

  // Initialize cursor when equity loads
  useEffect(() => {
    if (equity.length === 0 || cursor != null) return
    setCursor(startMs)
  }, [equity.length, cursor, startMs])

  // Auto-play once on first load of a completed run
  useEffect(() => {
    if (autoPlayed) return
    if (!run || run.status !== 'done') return
    if (equity.length === 0) return
    setPlaying(true)
    setAutoPlayed(true)
  }, [run, equity.length, autoPlayed])

  // Playback loop — rAF, advances by equity-sample index so that overnight /
  // weekend gaps are skipped (the cursor only "lands" on times that have data).
  useEffect(() => {
    if (!playing || equity.length === 0 || cursor == null) return
    const samples = equity.length
    let raf
    lastTRef.current = performance.now()
    const tick = (now) => {
      const dt = now - lastTRef.current
      lastTRef.current = now
      setCursor(prev => {
        if (!equity[0]?.ts) return prev  // guard: data not ready
        if (prev == null) return new Date(equity[0].ts).getTime()
        // binary search current sample index from cursor ms
        let lo = 0, hi = samples - 1
        while (lo < hi) {
          const mid = (lo + hi + 1) >> 1
          const midTs = equity[mid]?.ts
          if (midTs && new Date(midTs).getTime() <= prev) lo = mid
          else hi = mid - 1
        }
        const idx = lo
        const advance = samples * (dt / (duration * 1000))
        const nextIdx = Math.min(samples - 1, idx + advance)
        const nextItem = equity[Math.floor(nextIdx)]
        if (!nextItem?.ts) return prev
        const nextMs = new Date(nextItem.ts).getTime()
        if (nextIdx >= samples - 1) {
          setPlaying(false)
          const lastTs = equity[samples - 1]?.ts
          return lastTs ? new Date(lastTs).getTime() : prev
        }
        return nextMs
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, duration, equity.length])

  // ── Sliced views derived from cursor ──
  const visibleEquity = useMemo(() => {
    if (cursor == null) return equity
    return equity.filter(e => e?.ts && new Date(e.ts).getTime() <= cursor)
  }, [equity, cursor])

  const visibleTrades = useMemo(() => {
    if (cursor == null) return trades
    return trades.filter(t => t?.exit_ts && new Date(t.exit_ts).getTime() <= cursor)
  }, [trades, cursor])

  const visibleRiskEvents = useMemo(() => {
    if (cursor == null) return riskEvents
    return riskEvents.filter(e => e?.ts && new Date(e.ts).getTime() <= cursor)
  }, [riskEvents, cursor])

  // Trade currently open (entered before cursor, not yet exited)
  const openTrade = useMemo(() => {
    if (cursor == null) return null
    return trades.find(t => {
      const e = new Date(t.entry_ts).getTime()
      const x = new Date(t.exit_ts).getTime()
      return e <= cursor && x > cursor
    }) || null
  }, [trades, cursor])

  // Most recent closed trade (for "last trade" highlight)
  const lastTrade = visibleTrades[visibleTrades.length - 1]

  const pnls = visibleTrades.map(t => parseFloat(t.pnl_net))
  const durations = visibleTrades.map(t => t.bars_held)
  const wins = visibleTrades.filter(t => parseFloat(t.pnl_net) > 0)
  const losses = visibleTrades.filter(t => parseFloat(t.pnl_net) <= 0)
  const winRate = visibleTrades.length ? wins.length / visibleTrades.length : 0
  const totalPnl = pnls.reduce((s, x) => s + x, 0)
  const avgWin = wins.length ? wins.reduce((s, t) => s + parseFloat(t.pnl_net), 0) / wins.length : 0
  const avgLoss = losses.length ? losses.reduce((s, t) => s + parseFloat(t.pnl_net), 0) / losses.length : 0
  const grossProfit = wins.reduce((s, t) => s + parseFloat(t.pnl_net), 0)
  const grossLoss = -losses.reduce((s, t) => s + parseFloat(t.pnl_net), 0)
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : Infinity
  const expectancy = visibleTrades.length ? totalPnl / visibleTrades.length : 0
  const maxDD = visibleEquity.length ? Math.min(...visibleEquity.map(e => parseFloat(e.drawdown))) : 0
  const currentEquity = visibleEquity.length ? parseFloat(visibleEquity[visibleEquity.length - 1].equity) : (run ? parseFloat(run.starting_equity) : 50000)

  const exitReasons = useMemo(() => {
    const m = {}
    visibleTrades.forEach(t => { m[t.exit_reason] = (m[t.exit_reason] || 0) + 1 })
    return Object.entries(m).map(([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n)
  }, [visibleTrades])

  // Entry setups: WHY trades were taken (regime · session combo from bot's reasoning)
  const entrySetups = useMemo(() => {
    const m = {}
    visibleTrades.forEach(t => {
      const r = parseReasoning(t.entry_tag)
      const regime = r?.regime || 'unknown'
      const session = r?.session || 'no-session'
      const key = `${regime} · ${session}`
      if (!m[key]) m[key] = { count: 0, wins: 0, pnl: 0 }
      m[key].count++
      const pnl = parseFloat(t.pnl_net)
      if (pnl > 0) m[key].wins++
      m[key].pnl += pnl
    })
    return Object.entries(m).map(([k, v]) => ({ k, ...v })).sort((a, b) => b.count - a.count)
  }, [visibleTrades])

  const dailyPnl = useMemo(() => {
    const out = {}
    visibleTrades.forEach(t => {
      const d = new Date(t.exit_ts).toISOString().slice(0, 10)
      out[d] = (out[d] || 0) + parseFloat(t.pnl_net)
    })
    return out
  }, [visibleTrades])

  const equityChart = useMemo(() => visibleEquity.map(e => ({
    ts: new Date(e.ts).getTime(),
    equity: parseFloat(e.equity),
    drawdown: parseFloat(e.drawdown),
  })), [visibleEquity])

  // For trade entry/exit markers on chart: only show last few for clarity
  const recentTradeMarkers = useMemo(() => {
    return visibleTrades.slice(-12).map(t => ({
      x: new Date(t.exit_ts).getTime(),
      y: parseFloat(visibleEquity.find(e => new Date(e.ts).getTime() >= new Date(t.exit_ts).getTime())?.equity ?? currentEquity),
      pnl: parseFloat(t.pnl_net),
      side: t.side,
    }))
  }, [visibleTrades, visibleEquity, currentEquity])

  function exportTradesCSV() {
    // Flatten reasoning JSON into separate columns for easy ML training
    const baseCols = ['entry_ts','exit_ts','side','qty','entry_price','exit_price','pnl_gross','pnl_net','commission','bars_held','mae','mfe','exit_reason']
    const reasoningCols = ['score','regime','session','min_score','min_into','trades_today','consec_losses']
    const cols = [...baseCols, ...reasoningCols]
    const rows = [cols, ...trades.map(t => {
      const r = parseReasoning(t.entry_tag) || {}
      return [...baseCols.map(c => t[c] ?? ''), ...reasoningCols.map(c => r[c] ?? '')]
    })]
    download(rows, `trades_${id?.slice(0,8) || 'run'}.csv`)
  }
  function exportEquityCSV() {
    const cols = ['ts','equity','drawdown']
    const rows = [cols, ...equity.map(e => cols.map(c => e[c]))]
    download(rows, `equity_${id?.slice(0,8) || 'run'}.csv`)
  }
  async function exportSignalLogJSON() {
    const signals = await fetchSignalLogFromStorage(id)
    const blob = new Blob([JSON.stringify({ signals }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `signals_${id?.slice(0,8) || 'run'}.json`
    a.click()
  }

  // ── Now safe to early-return since all hooks above are unconditional ──
  if (loading || !run) return <div className="cap" style={{ padding: 24 }}>LOADING…</div>

  const summary = run.summary || {}
  const blown = run.account_blown
  const startEq = parseFloat(run.starting_equity || 50000)
  const mddFloor = summary.mdd_floor

  const filteredTrades = tradeFilter === 'all' ? visibleTrades
    : tradeFilter === 'wins' ? wins
    : tradeFilter === 'losses' ? losses
    : visibleTrades.filter(t => t.exit_reason === tradeFilter)

  // Scrub bar % uses sample index (skips dead time), not wall-clock
  const cursorPct = (() => {
    if (cursor == null || equity.length === 0 || !equity[0]?.ts) return 0
    let lo = 0, hi = equity.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      const midTs = equity[mid]?.ts
      if (midTs && new Date(midTs).getTime() <= cursor) lo = mid
      else hi = mid - 1
    }
    return Math.max(0, Math.min(1, lo / Math.max(1, equity.length - 1)))
  })()
  const cursorDate = cursor != null ? new Date(cursor) : null
  const isReplayable = run.status === 'done' && equity.length > 0
  const atEnd = cursor != null && endMs != null && cursor >= endMs - 100

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }} className="fade-up">
      {/* ── header ─────────────────────────────────────────────────── */}
      <div className="page-head">
        <div>
          <Link to="/backtest" className="crumbs" style={{ color: 'var(--t4)', textDecoration: 'none', cursor: 'pointer' }}>
            ← research / backtester / runs
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8 }}>
            <h1 style={{ fontSize: 30 }}>{run.label || `${run.symbol} · ${run.strategy_class_name}`}</h1>
            <span className={`chip-hud ${STATUS_CHIP[run.status] || ''}`}>
              {run.status === 'running' && <span className="dot dot-live" />}
              {run.status?.toUpperCase()}
            </span>
            {blown && atEnd && <span className="chip-hud ls"><span className="dot" /> ACCOUNT BLOWN</span>}
            {run.enforce_topstep && <span className="chip-hud cy">TOPSTEP</span>}
          </div>
          <div className="cap" style={{ marginTop: 10, letterSpacing: '0.06em', textTransform: 'none' }}>
            <span className="mono">{run.symbol}</span>
            <span style={{ margin: '0 10px', color: 'var(--t4)' }}>·</span>
            <span className="mono">{run.start_date} → {run.end_date}</span>
            <span style={{ margin: '0 10px', color: 'var(--t4)' }}>·</span>
            <span className="mono">${startEq.toLocaleString()} starting</span>
            <span style={{ margin: '0 10px', color: 'var(--t4)' }}>·</span>
            <span className="mono">{run.id.slice(0,8)}</span>
          </div>
        </div>
        {trades.length > 0 && (
          <div style={{ display: 'flex', gap: 8 }}>
            <ExportBtn onClick={exportEquityCSV}>↓ EQUITY.CSV</ExportBtn>
            <ExportBtn onClick={exportTradesCSV}>↓ TRADES.CSV</ExportBtn>
            <ExportBtn onClick={exportSignalLogJSON}>↓ SIGNALS.JSON</ExportBtn>
          </div>
        )}
      </div>

      {run.status === 'failed' && (
        <HudCard style={{ padding: 18, borderColor: 'rgba(239,68,68,0.4)' }}>
          <div className="cap ls" style={{ marginBottom: 8 }}>RUN FAILED</div>
          <pre className="mono" style={{ fontSize: 11, color: 'var(--t3)', whiteSpace: 'pre-wrap' }}>{run.error_message}</pre>
        </HudCard>
      )}

      {/* ── REPLAY DECK ────────────────────────────────────────────── */}
      {isReplayable && (
        <HudCard style={{ padding: 0 }} active={playing}>
          <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 18, borderBottom: '1px solid var(--hud-edge)' }}>
            <div className="sec-title" style={{ marginBottom: 0 }}>
              {playing ? '◉ replay · live' : atEnd ? '■ replay · complete' : '▣ replay · paused'}
            </div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--cy)', letterSpacing: '0.04em' }}>
              {cursorDate ? cursorDate.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'medium' }) : '—'}
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
              <button onClick={() => { setCursor(startMs); setPlaying(true) }}
                title="Restart"
                style={replayBtnStyle()}>
                ⟲
              </button>
              <button onClick={() => setPlaying(p => atEnd ? (setCursor(startMs), true) : !p)}
                style={replayBtnStyle(true)}>
                {playing ? '❚❚ PAUSE' : atEnd ? '⟲ REPLAY' : '▶ PLAY'}
              </button>
              {SPEEDS.map(s => (
                <button key={s.label} onClick={() => setDuration(s.duration)}
                  style={{
                    background: duration === s.duration ? 'var(--cy-dim)' : 'transparent',
                    color: duration === s.duration ? 'var(--cy)' : 'var(--t3)',
                    border: `1px solid ${duration === s.duration ? 'var(--cy-edge)' : 'var(--hud-edge)'}`,
                    padding: '4px 8px', fontFamily: 'var(--mono)', fontSize: 10,
                    letterSpacing: '0.06em', cursor: 'pointer', borderRadius: 0,
                  }}>{s.label}</button>
              ))}
              <button onClick={() => { setCursor(endMs); setPlaying(false) }}
                title="Skip to end"
                style={replayBtnStyle()}>
                ⏭
              </button>
            </div>
          </div>
          {/* scrub bar */}
          <div style={{ padding: '10px 18px 12px' }}>
            <div style={{ position: 'relative', height: 6, background: 'rgba(255,255,255,0.04)' }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: `${cursorPct * 100}%`,
                background: playing ? 'var(--cy)' : 'rgba(94,234,212,0.55)',
                boxShadow: playing ? '0 0 14px var(--cy-soft)' : 'none',
                transition: playing ? 'none' : 'width 0.15s',
              }} />
              <input type="range" min="0" max="1000" value={cursorPct * 1000}
                onChange={e => {
                  const v = parseInt(e.target.value) / 1000
                  setPlaying(false)
                  if (equity.length > 0) {
                    const idx = Math.floor(v * (equity.length - 1))
                    setCursor(new Date(equity[idx].ts).getTime())
                  }
                }}
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'ew-resize', width: '100%' }}
              />
            </div>
            <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 9.5, color: 'var(--t4)' }}>
              <span>{startMs ? new Date(startMs).toLocaleDateString() : ''}</span>
              <span style={{ color: 'var(--cy)' }}>{(cursorPct * 100).toFixed(1)}%</span>
              <span>{endMs ? new Date(endMs).toLocaleDateString() : ''}</span>
            </div>
          </div>
        </HudCard>
      )}

      {/* ── KPI grid (live during playback) ───────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 0 }}>
        <MetricTile label="EQUITY" value={'$' + currentEquity.toFixed(2)} tone={(currentEquity - startEq) >= 0 ? 'pos' : 'neg'} flash={playing} />
        <MetricTile label="NET PNL" value={fmtMoney(totalPnl)} tone={totalPnl >= 0 ? 'pos' : 'neg'} flash={playing} />
        <MetricTile label="TRADES" value={visibleTrades.length} sub={`${wins.length}w · ${losses.length}l`} flash={playing} />
        <MetricTile label="WIN RATE" value={fmtPct(winRate)} tone={winRate >= 0.5 ? 'pos' : 'neutral'} />
        <MetricTile label="PROFIT FACTOR" value={isFinite(profitFactor) ? profitFactor.toFixed(2) : '∞'} tone={profitFactor >= 1 ? 'pos' : 'neg'} />
        <MetricTile label="MAX DRAWDOWN" value={fmtMoney(maxDD, false)} tone="neg" sub={mddFloor != null ? `floor $${mddFloor.toFixed(0)}` : null} />
      </div>

      {/* ── progress bar (running, not done) ──────────────────────── */}
      {run.status === 'running' && run.progress_bars_total > 0 && (
        <HudCard style={{ padding: 14 }} active>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="cap cap-cy">REPLAY · IN PROGRESS</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--cy)' }}>
              {run.progress_bars_done.toLocaleString()} / {run.progress_bars_total.toLocaleString()} bars
              <span style={{ color: 'var(--t4)', marginLeft: 8 }}>· {((run.progress_bars_done / run.progress_bars_total) * 100).toFixed(1)}%</span>
            </span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
            <div className="shimmer" style={{ height: '100%', width: `${(run.progress_bars_done / run.progress_bars_total) * 100}%`, background: 'var(--cy)', boxShadow: '0 0 14px var(--cy-soft)' }} />
          </div>
        </HudCard>
      )}

      {/* ════ TWO MAIN VISUALS · price + equity, side-by-side ════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        {/* PRICE CHART with bot entries/exits */}
        <HudCard style={{ padding: 18 }}>
          <div className="sec-title">
            {run.symbol} · price action
            <span className="count">
              {playing && <span style={{ color: 'var(--cy)', marginRight: 8 }}>● PLAYING</span>}
              {bars.length.toLocaleString()} bars · {visibleTrades.length} trades
            </span>
          </div>
          <PriceReplayChart bars={bars} trades={trades} cursor={cursor} height={340} />
        </HudCard>

        {/* EQUITY + DRAWDOWN */}
        <HudCard style={{ padding: 18 }}>
          <div className="sec-title">
            equity · pnl
            <span className="count">
              {visibleEquity.length.toLocaleString()} samples
            </span>
          </div>
          {equityChart.length === 0 ? (
            <div className="cap" style={{ color: 'var(--t4)', padding: '40px 0' }}>NO DATA</div>
          ) : (
            <div>
              <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={equityChart} margin={{ top: 4, right: 12, bottom: 0, left: -12 }}>
                  <defs>
                    <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#5eead4" stopOpacity={0.34}/>
                      <stop offset="100%" stopColor="#5eead4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="ts" type="number" domain={startMs && endMs ? [startMs, endMs] : ['auto','auto']} scale="time"
                    tickFormatter={t => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    stroke="var(--t4)" tick={{ fontSize: 10, fontFamily: 'var(--mono)', fill: 'var(--t4)' }} axisLine={{ stroke: 'var(--hud-edge)' }} tickLine={false} />
                  <YAxis domain={['auto','auto']}
                    tickFormatter={v => '$' + (v >= 1000 ? (v/1000).toFixed(1) + 'k' : v.toFixed(0))}
                    stroke="var(--t4)" tick={{ fontSize: 10, fontFamily: 'var(--mono)', fill: 'var(--t4)' }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(8,8,10,0.95)', border: '1px solid var(--cy-edge)', borderRadius: 0, fontSize: 11, fontFamily: 'var(--mono)' }}
                    labelStyle={{ color: 'var(--t3)', fontSize: 10, letterSpacing: '0.1em' }}
                    itemStyle={{ color: 'var(--t1)' }}
                    labelFormatter={t => new Date(t).toLocaleString()}
                    formatter={(v, n) => [`$${parseFloat(v).toFixed(2)}`, n.toUpperCase()]}
                  />
                  {mddFloor != null && <ReferenceLine y={mddFloor} stroke="var(--loss)" strokeDasharray="3 4" strokeOpacity={0.6} label={{ value: 'MDD FLOOR', fill: 'var(--loss)', fontSize: 9, fontFamily: 'var(--mono)', position: 'insideBottomLeft' }} />}
                  <ReferenceLine y={startEq} stroke="var(--t4)" strokeDasharray="2 5" strokeOpacity={0.5} />
                  {cursor != null && playing && (
                    <ReferenceLine x={cursor} stroke="var(--cy)" strokeWidth={1.2} strokeOpacity={0.8} />
                  )}
                  {recentTradeMarkers.map((m, i) => (
                    <ReferenceDot key={i} x={m.x} y={m.y} r={3} fill={m.pnl >= 0 ? 'var(--profit)' : 'var(--loss)'} stroke="rgba(0,0,0,0.4)" />
                  ))}
                  <Area dataKey="equity" stroke="#5eead4" fill="url(#eqGrad)" strokeWidth={1.4} dot={false} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
              <div style={{ marginTop: 4 }}>
                <div className="cap" style={{ marginBottom: 4, marginLeft: 6 }}>DRAWDOWN</div>
                <ResponsiveContainer width="100%" height={64}>
                  <AreaChart data={equityChart} margin={{ top: 0, right: 12, bottom: 0, left: -12 }}>
                    <defs>
                      <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4}/>
                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="ts" type="number" domain={startMs && endMs ? [startMs, endMs] : ['auto','auto']} scale="time" hide />
                    <YAxis hide domain={['auto', 0]} />
                    <Area dataKey="drawdown" stroke="#ef4444" fill="url(#ddGrad)" strokeWidth={1} dot={false} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </HudCard>
      </div>

      {/* ── Open position + recent fills (compact row) ──────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16 }}>
        <HudCard style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--hud-edge)' }}>
            <div className="sec-title" style={{ marginBottom: 0 }}>
              {openTrade ? 'open position' : 'flat'}
              {openTrade && <span className="count cy" style={{ color: 'var(--cy)' }}>HOLDING</span>}
            </div>
          </div>
          {openTrade ? (
            <OpenTradePanel trade={openTrade} cursor={cursor} startEq={startEq} />
          ) : (
            <div style={{ padding: 18, flex: 1 }}>
              <div className="cap" style={{ color: 'var(--t4)', textAlign: 'center', padding: '40px 0' }}>
                NO OPEN POSITION
              </div>
            </div>
          )}
        </HudCard>

        <HudCard style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--hud-edge)' }}>
            <div className="sec-title" style={{ marginBottom: 0 }}>
              recent fills
              <span className="count">last 10 · {visibleTrades.length} total</span>
            </div>
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 280 }}>
            {visibleTrades.length === 0 ? (
              <div className="cap" style={{ color: 'var(--t4)', textAlign: 'center', padding: '36px 0' }}>NO FILLS YET</div>
            ) : (
              <table className="term">
                <thead>
                  <tr>
                    <th>EXIT TIME</th>
                    <th>SIDE</th>
                    <th className="r">ENTRY</th>
                    <th className="r">EXIT</th>
                    <th className="r">PNL</th>
                    <th>REASON</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTrades.slice(-10).reverse().map((t, i) => {
                    const pnl = parseFloat(t.pnl_net)
                    return (
                      <tr key={t.id} className={i === 0 && playing ? 'fig-flash' : ''}>
                        <td style={{ color: 'var(--t4)', fontSize: 10 }}>
                          {new Date(t.exit_ts).toLocaleString('en-US', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td><span className={`chip-hud ${t.side === 'buy' ? 'pl' : 'ls'}`} style={{ fontSize: 9, padding: '0 5px' }}>{t.side?.toUpperCase()}</span></td>
                        <td className="r">{parseFloat(t.entry_price).toFixed(2)}</td>
                        <td className="r">{parseFloat(t.exit_price).toFixed(2)}</td>
                        <td className="r" style={{ color: pnl >= 0 ? 'var(--profit)' : 'var(--loss)', fontWeight: 600 }}>{fmtMoney(pnl)}</td>
                        <td style={{ color: t.exit_reason === 'take_profit' ? 'var(--profit)' :
                          t.exit_reason === 'stop_loss' ? 'var(--loss)' : 'var(--t3)',
                          fontSize: 10,
                        }}>{t.exit_reason}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </HudCard>
      </div>

      {/* ── three-panel data viz row (bottom, computed on visibleTrades) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 16 }}>
        <HudCard style={{ padding: 18 }}>
          <div className="sec-title">
            pnl distribution
            <span className="count">{visibleTrades.length} trades</span>
          </div>
          <Histogram values={pnls} buckets={32} height={120} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginTop: 16 }}>
            <Mini label="AVG WIN" value={fmtMoney(avgWin)} tone="pos" />
            <Mini label="AVG LOSS" value={fmtMoney(avgLoss)} tone="neg" />
            <Mini label="LARGEST WIN" value={fmtMoney(Math.max(0, ...pnls))} tone="pos" />
            <Mini label="LARGEST LOSS" value={fmtMoney(Math.min(0, ...pnls))} tone="neg" />
          </div>
        </HudCard>

        <HudCard style={{ padding: 18 }}>
          <div className="sec-title">
            hold time · bars
            <span className="count">median {durations.length ? Math.round(median(durations)) : 0}</span>
          </div>
          <Histogram values={durations} buckets={20} height={120} posColor="var(--cy)" negColor="var(--cy)" neutralColor="var(--cy)" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginTop: 16 }}>
            <Mini label="MIN" value={durations.length ? Math.min(...durations) + 'b' : '—'} />
            <Mini label="MAX" value={durations.length ? Math.max(...durations) + 'b' : '—'} />
            <Mini label="P25" value={durations.length ? Math.round(quantile(durations, 0.25)) + 'b' : '—'} />
            <Mini label="P75" value={durations.length ? Math.round(quantile(durations, 0.75)) + 'b' : '—'} />
          </div>
        </HudCard>

        <HudCard style={{ padding: 18 }}>
          <div className="sec-title">
            entry setups
            <span className="count">{entrySetups.length} kinds · why trades fired</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {entrySetups.map(({ k, count, wins, pnl }) => {
              const pct = visibleTrades.length ? (count / visibleTrades.length) * 100 : 0
              const wr = wins / count
              const wrColor = wr >= 0.5 ? 'var(--profit)' : wr >= 0.3 ? 'var(--t2)' : 'var(--loss)'
              return (
                <div key={k}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--t1)' }}>{k}</span>
                    <span className="mono" style={{ fontSize: 10.5, color: 'var(--t3)' }}>
                      {count}
                      <span style={{ color: wrColor, marginLeft: 6 }}>{(wr * 100).toFixed(0)}%</span>
                      <span style={{ color: pnl >= 0 ? 'var(--profit)' : 'var(--loss)', marginLeft: 6 }}>
                        {pnl >= 0 ? '+' : '-'}${Math.abs(pnl).toFixed(0)}
                      </span>
                    </span>
                  </div>
                  <div style={{ height: 3, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: pnl >= 0 ? 'var(--profit)' : 'var(--loss)', opacity: 0.8 }} />
                  </div>
                </div>
              )
            })}
            {entrySetups.length === 0 && (
              <div className="cap" style={{ color: 'var(--t4)', padding: '8px 0' }}>
                NO REASONING DATA · run bot to capture signal logs
              </div>
            )}
          </div>
          {/* Compact secondary row: exit reasons */}
          {exitReasons.length > 0 && (
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--hud-edge)' }}>
              <div className="cap" style={{ marginBottom: 8, fontSize: 9 }}>EXIT BREAKDOWN</div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontFamily: 'var(--mono)', fontSize: 10 }}>
                {exitReasons.map(({ k, n }) => {
                  const color = k === 'take_profit' ? 'var(--profit)' :
                    k === 'stop_loss' ? 'var(--loss)' :
                    k === 'risk_flatten' ? 'var(--brand)' :
                    k === 'session_flatten' ? 'var(--cy)' : 'var(--t3)'
                  return (
                    <span key={k} style={{ color }}>
                      {k}: {n}
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </HudCard>
      </div>

      {/* MAE/MFE scatter + daily heatmap */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
        <HudCard style={{ padding: 18 }}>
          <div className="sec-title">
            mae · mfe scatter
            <span className="count">trade quality (point = trade, color = pnl)</span>
          </div>
          <MaeMfeScatter trades={visibleTrades} width={620} height={240} />
        </HudCard>
        <HudCard style={{ padding: 18 }}>
          <div className="sec-title">
            daily pnl
            <span className="count">heat · last 30d</span>
          </div>
          <PnlHeatmap daily={dailyPnl} days={30} height={120} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 18 }}>
            <Mini label="GREEN DAYS" value={Object.values(dailyPnl).filter(v => v > 0).length} tone="pos" />
            <Mini label="RED DAYS" value={Object.values(dailyPnl).filter(v => v < 0).length} tone="neg" />
            <Mini label="BEST DAY" value={fmtMoney(Math.max(0, ...Object.values(dailyPnl).concat([0])))} tone="pos" />
          </div>
        </HudCard>
      </div>

      {/* risk events */}
      {visibleRiskEvents.length > 0 && (
        <HudCard style={{ padding: 0 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--hud-edge)' }}>
            <div className="sec-title" style={{ marginBottom: 0 }}>
              risk events
              <span className="count">{visibleRiskEvents.length}</span>
            </div>
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            <table className="term">
              <thead>
                <tr>
                  <th style={{ width: 200 }}>TIMESTAMP</th>
                  <th style={{ width: 160 }}>KIND</th>
                  <th>DETAIL</th>
                  <th className="r" style={{ width: 110 }}>EQUITY</th>
                </tr>
              </thead>
              <tbody>
                {visibleRiskEvents.map(e => (
                  <tr key={e.id}>
                    <td style={{ color: 'var(--t4)' }}>{new Date(e.ts).toLocaleString()}</td>
                    <td>
                      <span className={`chip-hud ${e.kind === 'account_blown' ? 'ls' : e.kind === 'daily_loss_halt' ? 'br' : 'cy'}`}>{e.kind}</span>
                    </td>
                    <td>{e.detail}</td>
                    <td className="r" style={{ color: 'var(--t1)' }}>${parseFloat(e.equity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </HudCard>
      )}

      {/* trades table with filters */}
      {visibleTrades.length > 0 && (
        <HudCard style={{ padding: 0 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--hud-edge)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="sec-title" style={{ marginBottom: 0 }}>
              trades
              <span className="count">{filteredTrades.length} of {visibleTrades.length}</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { k: 'all', label: 'ALL', n: visibleTrades.length },
                { k: 'wins', label: 'WINS', n: wins.length, color: 'var(--profit)' },
                { k: 'losses', label: 'LOSSES', n: losses.length, color: 'var(--loss)' },
                ...exitReasons.map(({ k, n }) => ({ k, label: k.toUpperCase().slice(0,3), n })),
              ].map(({ k, label, n, color }) => (
                <button key={k} onClick={() => setTradeFilter(k)} style={{
                  background: tradeFilter === k ? 'var(--cy-dim)' : 'transparent',
                  color: tradeFilter === k ? 'var(--cy)' : (color || 'var(--t3)'),
                  border: `1px solid ${tradeFilter === k ? 'var(--cy-edge)' : 'var(--hud-edge)'}`,
                  fontFamily: 'var(--mono)', fontSize: 10, padding: '4px 9px',
                  letterSpacing: '0.06em', cursor: 'pointer', borderRadius: 0,
                }}>
                  {label} <span style={{ color: 'var(--t4)' }}>· {n}</span>
                </button>
              ))}
            </div>
          </div>
          <div style={{ maxHeight: 480, overflowY: 'auto' }}>
            <table className="term">
              <thead>
                <tr>
                  <th>#</th>
                  <th>ENTRY</th>
                  <th>SIDE</th>
                  <th className="r">ENTRY $</th>
                  <th className="r">EXIT $</th>
                  <th className="r">PNL</th>
                  <th className="r">SCORE</th>
                  <th>REGIME</th>
                  <th>SESSION</th>
                  <th>EXIT</th>
                  <th>FEATURES</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrades.map((t, i) => {
                  const pnl = parseFloat(t.pnl_net)
                  const e = parseFloat(t.entry_price)
                  const x = parseFloat(t.exit_price)
                  const r = parseReasoning(t.entry_tag)
                  return (
                    <tr key={t.id}>
                      <td style={{ color: 'var(--t4)' }}>{i + 1}</td>
                      <td style={{ color: 'var(--t3)', fontSize: 10.5 }}>{new Date(t.entry_ts).toLocaleString()}</td>
                      <td><span className={`chip-hud ${t.side === 'buy' ? 'pl' : 'ls'}`} style={{ fontSize: 9, padding: '1px 5px' }}>{t.side?.toUpperCase()}</span></td>
                      <td className="r">{e.toFixed(2)}</td>
                      <td className="r">{x.toFixed(2)}</td>
                      <td className="r" style={{ color: pnl >= 0 ? 'var(--profit)' : 'var(--loss)', fontWeight: 600 }}>{fmtMoney(pnl)}</td>
                      <td className="r" style={{ color: r?.score >= (r?.min_score ?? 0) ? 'var(--cy)' : 'var(--t3)' }}>
                        {r?.score ?? '—'}
                        {r?.min_score != null && <span style={{ color: 'var(--t4)' }}>/{r.min_score}</span>}
                      </td>
                      <td style={{ color: 'var(--t2)', fontSize: 10 }}>{r?.regime ?? '—'}</td>
                      <td style={{ color: 'var(--t3)', fontSize: 10 }}>{r?.session ?? '—'}</td>
                      <td>
                        <span style={{ color: t.exit_reason === 'take_profit' ? 'var(--profit)' :
                          t.exit_reason === 'stop_loss' ? 'var(--loss)' :
                          t.exit_reason === 'risk_flatten' ? 'var(--brand)' :
                          t.exit_reason === 'session_flatten' ? 'var(--cy)' : 'var(--t3)',
                          fontSize: 10, letterSpacing: '0.04em',
                        }}>{t.exit_reason}</span>
                      </td>
                      <td style={{ fontSize: 9.5 }}>
                        {r?.features ? (
                          <details style={{ cursor: 'pointer' }}>
                            <summary style={{ color: 'var(--cy)' }}>view ({Object.keys(r.features).length})</summary>
                            <pre style={{ background: 'rgba(0,0,0,0.3)', padding: 6, marginTop: 4, fontSize: 9, color: 'var(--t2)', whiteSpace: 'pre-wrap', maxWidth: 320 }}>
{JSON.stringify(r.features, null, 1)}
                            </pre>
                          </details>
                        ) : <span style={{ color: 'var(--t4)' }}>—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </HudCard>
      )}
    </div>
  )
}

function OpenTradePanel({ trade, cursor, startEq }) {
  const e = parseFloat(trade.entry_price)
  const sideSign = trade.side === 'buy' ? 1 : -1
  // proxy live PnL by interpolating between entry and exit price based on cursor position
  const entryT = new Date(trade.entry_ts).getTime()
  const exitT = new Date(trade.exit_ts).getTime()
  const frac = Math.max(0, Math.min(1, (cursor - entryT) / Math.max(1, exitT - entryT)))
  const x = parseFloat(trade.exit_price)
  const livePx = e + (x - e) * frac
  const liveDelta = (livePx - e) * sideSign
  const tone = liveDelta >= 0 ? 'var(--profit)' : 'var(--loss)'
  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div className="cap" style={{ marginBottom: 4 }}>SIDE</div>
          <div className={`chip-hud ${trade.side === 'buy' ? 'pl' : 'ls'}`}>{trade.side?.toUpperCase()}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="cap" style={{ marginBottom: 4 }}>QTY</div>
          <div className="mono" style={{ fontSize: 16, color: 'var(--t1)' }}>{trade.qty}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 14 }}>
        <Mini label="ENTRY" value={'$' + e.toFixed(2)} />
        <Mini label="LIVE" value={'$' + livePx.toFixed(2)} tone={liveDelta >= 0 ? 'pos' : 'neg'} />
      </div>
      <div style={{ background: 'rgba(255,255,255,0.02)', padding: 10, border: `1px solid ${liveDelta >= 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
        <div className="cap" style={{ marginBottom: 4 }}>UNREALIZED</div>
        <div className="mono fig-flash" key={livePx.toFixed(2)} style={{ fontSize: 22, color: tone, fontWeight: 600 }}>
          {liveDelta >= 0 ? '+' : ''}{(liveDelta * 5 * trade.qty).toFixed(2)}
        </div>
        <div className="cap" style={{ marginTop: 3, color: tone, fontSize: 9, textTransform: 'none', letterSpacing: '0.05em' }}>
          {liveDelta >= 0 ? '+' : ''}{liveDelta.toFixed(2)} pts · holding for {Math.round(((cursor - entryT) / 60000))} min
        </div>
      </div>
    </div>
  )
}

function Mini({ label, value, tone = 'neutral' }) {
  const c = { neutral: 'var(--t1)', pos: 'var(--profit)', neg: 'var(--loss)', cy: 'var(--cy)' }[tone]
  return (
    <div>
      <div className="cap" style={{ fontSize: 9, marginBottom: 4 }}>{label}</div>
      <div className="mono" style={{ fontSize: 13, color: c, fontWeight: 500 }}>{value}</div>
    </div>
  )
}

function ExportBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{
      background: 'transparent', color: 'var(--t2)',
      border: '1px solid var(--hud-edge)',
      padding: '7px 14px', fontFamily: 'var(--mono)', fontSize: 10.5,
      letterSpacing: '0.08em', cursor: 'pointer', borderRadius: 0, transition: 'all 0.12s',
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cy-edge)'; e.currentTarget.style.color = 'var(--cy)' }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--hud-edge)'; e.currentTarget.style.color = 'var(--t2)' }}
    >{children}</button>
  )
}

function replayBtnStyle(emphasis = false) {
  return {
    background: emphasis ? 'var(--cy-dim)' : 'transparent',
    color: emphasis ? 'var(--cy)' : 'var(--t2)',
    border: `1px solid ${emphasis ? 'var(--cy-edge)' : 'var(--hud-edge)'}`,
    padding: emphasis ? '5px 16px' : '5px 9px',
    fontFamily: 'var(--mono)',
    fontSize: emphasis ? 11 : 12,
    fontWeight: emphasis ? 600 : 400,
    letterSpacing: '0.08em',
    cursor: 'pointer',
    borderRadius: 0,
    transition: 'all 0.12s',
  }
}

function median(arr) {
  if (!arr.length) return 0
  const s = [...arr].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
function quantile(arr, q) {
  if (!arr.length) return 0
  const s = [...arr].sort((a, b) => a - b)
  const i = (s.length - 1) * q
  const lo = Math.floor(i), hi = Math.ceil(i)
  return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (i - lo)
}
function download(rows, name) {
  const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click()
}
