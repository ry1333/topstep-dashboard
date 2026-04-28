import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import HudCard from '../components/HudCard'
import Sparkline from '../components/Sparkline'
import { toast } from '../components/Toast'
import { supabase } from '../lib/supabase'
import { useBacktestRuns, uploadStrategyAndQueue } from '../hooks/useBacktests'

const SYMS = ['MES', 'MNQ', 'M2K']
// Earliest bar date we have cached locally (Databento pull window).
// Update if you extend the cache.
const DATA_FLOOR = '2026-01-27'

const STATUS = {
  queued:   { tone: 'br', label: 'QUEUED' },
  running:  { tone: 'cy', label: 'RUNNING' },
  done:     { tone: 'pl', label: 'DONE' },
  failed:   { tone: 'ls', label: 'FAILED' },
  canceled: { tone: '',   label: 'CANCEL' },
}

function fmtMoney(n) {
  if (n == null) return '—'
  return (n >= 0 ? '+$' : '-$') + Math.abs(n).toFixed(2)
}
function todayMinus(days) {
  const d = new Date(); d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

export default function Backtest() {
  const { runs, loading } = useBacktestRuns()
  const [showForm, setShowForm] = useState(false)

  // aggregate stats across all done runs (for header summary)
  const done = runs.filter(r => r.status === 'done')
  const blown = done.filter(r => r.account_blown).length
  const totalTrades = done.reduce((s, r) => s + (r.summary?.n_trades || 0), 0)
  const profitable = done.filter(r => (r.summary?.pnl || 0) > 0).length
  const queuedCount = runs.filter(r => r.status === 'queued').length
  const runningCount = runs.filter(r => r.status === 'running').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }} className="fade-up">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="page-head">
        <div>
          <div className="crumbs">research / backtester</div>
          <h1>BACKTESTER</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="chip-hud">
            <span className="dot" /> {runs.length} runs
          </span>
          {runningCount > 0 && (
            <span className="chip-hud cy">
              <span className="dot dot-live" /> {runningCount} running
            </span>
          )}
          {queuedCount > 0 && (
            <span className="chip-hud br">
              <span className="dot" /> {queuedCount} queued
            </span>
          )}
          <button
            onClick={() => setShowForm(s => !s)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 14px',
              background: showForm ? 'transparent' : 'var(--cy)',
              color: showForm ? 'var(--cy)' : '#000',
              fontFamily: 'var(--mono)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              border: `1px solid ${showForm ? 'var(--cy-edge)' : 'var(--cy)'}`,
              borderRadius: 0,
              cursor: 'pointer',
              transition: 'all 0.12s',
            }}
          >
            {showForm ? '× CANCEL' : '+ NEW RUN'}
          </button>
        </div>
      </div>

      {/* ── Aggregate summary tiles ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, border: '1px solid var(--hud-edge)', borderRadius: 0 }}>
        <SummaryStat label="TOTAL RUNS" value={runs.length} />
        <SummaryStat label="COMPLETED" value={done.length} sub={`${profitable} profitable`} subColor="var(--profit)" />
        <SummaryStat label="TOTAL TRADES" value={totalTrades.toLocaleString()} />
        <SummaryStat label="BLOWN ACCOUNTS" value={blown} sub={blown > 0 ? `${((blown/done.length)*100).toFixed(0)}% rate` : ''} subColor="var(--loss)" tone={blown > 0 ? 'neg' : 'neutral'} />
      </div>

      {/* ── New run form ────────────────────────────────────────────────── */}
      {showForm && <NewRunForm onDone={() => setShowForm(false)} />}

      {/* ── Runs list ───────────────────────────────────────────────────── */}
      <div>
        <div className="sec-title">
          run log
          <span className="count">{loading ? 'loading' : `${runs.length} entries`}</span>
        </div>

        {!loading && runs.length === 0 ? (
          <HudCard style={{ padding: 32, textAlign: 'center' }}>
            <div className="cap" style={{ marginBottom: 8 }}>NO RUNS</div>
            <div style={{ color: 'var(--t3)', fontSize: 12 }}>upload a strategy to begin</div>
          </HudCard>
        ) : (
          <HudCard style={{ overflow: 'hidden' }}>
            <table className="term">
              <thead>
                <tr>
                  <th style={{ width: 86 }}>STATUS</th>
                  <th>LABEL · WINDOW</th>
                  <th className="r">CURVE</th>
                  <th className="r" style={{ width: 70 }}>TRADES</th>
                  <th className="r" style={{ width: 100 }}>PNL</th>
                  <th className="r" style={{ width: 100 }}>MAX DD</th>
                  <th className="r" style={{ width: 70 }}>WR</th>
                  <th className="r" style={{ width: 70 }}>PF</th>
                  <th className="c" style={{ width: 70 }}>FLAGS</th>
                </tr>
              </thead>
              <tbody>
                {runs.map(r => <RunRow key={r.id} run={r} />)}
              </tbody>
            </table>
          </HudCard>
        )}
      </div>
    </div>
  )
}

function SummaryStat({ label, value, sub, subColor, tone = 'neutral' }) {
  const toneColor = { neutral: 'var(--t1)', pos: 'var(--profit)', neg: 'var(--loss)', cy: 'var(--cy)' }[tone]
  return (
    <div style={{
      padding: '16px 20px',
      borderRight: '1px solid var(--hud-edge)',
      background: 'linear-gradient(180deg, var(--srf-1) 0%, var(--srf-0) 100%)',
    }}>
      <div className="cap" style={{ marginBottom: 8 }}>{label}</div>
      <div className="fig" style={{ fontSize: 22, color: toneColor }}>{value}</div>
      {sub && <div className="cap" style={{ marginTop: 4, color: subColor || 'var(--t4)', textTransform: 'none', letterSpacing: '0.02em', fontSize: 10 }}>{sub}</div>}
    </div>
  )
}

function RunRow({ run }) {
  const [spark, setSpark] = useState(null)
  const status = STATUS[run.status] || { tone: '', label: run.status?.toUpperCase() }
  const pnl = run.summary?.pnl
  const dd = run.summary?.max_drawdown
  const wr = run.summary?.win_rate
  const pf = run.summary?.profit_factor

  // Lazy-load equity sparkline once for done runs
  useEffect(() => {
    if (run.status !== 'done' || spark != null) return
    let cancel = false
    ;(async () => {
      const { data } = await supabase
        .from('backtest_equity').select('equity').eq('run_id', run.id).order('ts').limit(400)
      if (!cancel) setSpark((data || []).map(e => parseFloat(e.equity)))
    })()
    return () => { cancel = true }
  }, [run.id, run.status])

  const sparkColor = pnl == null ? 'var(--t3)' : pnl >= 0 ? 'var(--profit)' : 'var(--loss)'
  const pct = run.progress_bars_total ? (100 * run.progress_bars_done / run.progress_bars_total) : 0

  return (
    <tr style={{ cursor: 'pointer' }} onClick={() => window.location.hash = `#/backtest/${run.id}`}>
      <td>
        <span className={`chip-hud${status.tone ? ' ' + status.tone : ''}`}>
          {run.status === 'running' && <span className="dot dot-live" />}
          {run.status === 'queued' && <span className="dot" />}
          {run.status === 'done' && <span className="dot" />}
          {run.status === 'failed' && <span className="dot" />}
          {status.label}
        </span>
      </td>
      <td>
        <div style={{ color: 'var(--t1)', fontSize: 12, lineHeight: 1.3 }}>
          {run.label || `${run.symbol} · ${run.strategy_class_name || 'strategy'}`}
        </div>
        <div style={{ color: 'var(--t4)', fontSize: 10.5, marginTop: 3, letterSpacing: '0.04em' }}>
          {run.symbol} · {run.start_date} → {run.end_date}{run.enforce_topstep ? ' · TOPSTEP' : ''}
        </div>
      </td>
      <td className="r" style={{ color: sparkColor }}>
        {run.status === 'done' && spark && spark.length > 1 ? (
          <Sparkline data={spark} width={120} height={22} stroke={sparkColor} baseline={spark[0]} />
        ) : run.status === 'running' ? (
          <div style={{ display: 'inline-block', width: 120, height: 4, background: 'rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
            <div className="shimmer" style={{ height: '100%', width: `${pct}%`, background: 'var(--cy)' }} />
          </div>
        ) : <span style={{ color: 'var(--t4)' }}>—</span>}
      </td>
      <td className="r" style={{ color: 'var(--t2)' }}>
        {run.summary?.n_trades ?? (run.status === 'running' ? `${pct.toFixed(0)}%` : '—')}
      </td>
      <td className="r" style={{ color: pnl == null ? 'var(--t3)' : pnl >= 0 ? 'var(--profit)' : 'var(--loss)', fontWeight: 600 }}>
        {fmtMoney(pnl)}
      </td>
      <td className="r" style={{ color: 'var(--t3)' }}>
        {dd != null ? '-$' + Math.abs(dd).toFixed(0) : '—'}
      </td>
      <td className="r" style={{ color: wr != null ? (wr >= 0.5 ? 'var(--profit)' : 'var(--t2)') : 'var(--t4)' }}>
        {wr != null ? (wr * 100).toFixed(0) + '%' : '—'}
      </td>
      <td className="r" style={{ color: pf != null ? (pf >= 1 ? 'var(--profit)' : 'var(--loss)') : 'var(--t4)' }}>
        {pf != null && isFinite(pf) ? pf.toFixed(2) : pf === Infinity ? '∞' : '—'}
      </td>
      <td className="c">
        {run.account_blown && (
          <span className="chip-hud ls" style={{ fontSize: 8.5, padding: '1px 5px' }}>BLOWN</span>
        )}
        {!run.account_blown && run.enforce_topstep && (
          <span className="chip-hud" style={{ fontSize: 8.5, padding: '1px 5px', color: 'var(--t4)' }}>TS</span>
        )}
      </td>
    </tr>
  )
}

function NewRunForm({ onDone }) {
  const [file, setFile] = useState(null)
  const [drag, setDrag] = useState(false)
  const [className, setClassName] = useState('Strategy')
  const [selectedSyms, setSelectedSyms] = useState(['MES','MNQ','M2K'])
  const [startDate, setStartDate] = useState(DATA_FLOOR)        // longest available
  const [endDate, setEndDate] = useState(todayMinus(0))
  const [equity, setEquity] = useState(50000)
  const [enforceTopstep, setEnforceTopstep] = useState(true)
  const [label, setLabel] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function toggleSym(s) {
    setSelectedSyms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  function pickFile(f) {
    if (!f) return
    if (!f.name.endsWith('.py')) { toast('Must be a .py file', 'error'); return }
    setFile(f)
    // try to auto-detect class name from file content
    f.text().then(txt => {
      const m = txt.match(/class\s+([A-Z]\w*)\s*\(\s*Strategy\b/)
      if (m) setClassName(m[1])
    }).catch(() => {})
  }

  async function submit(e) {
    e.preventDefault()
    if (!file) { toast('Pick a strategy .py file', 'error'); return }
    if (selectedSyms.length === 0) { toast('Select at least one symbol', 'error'); return }
    setSubmitting(true)
    try {
      // Store symbols comma-separated in the existing single-column field
      // (runner splits on comma). MES kept first for back-compat with existing
      // bar/chart code that reads run.symbol as a single label.
      const symbol = selectedSyms.join(',')
      await uploadStrategyAndQueue({
        file, className, symbol, startDate, endDate, equity, enforceTopstep, label,
      })
      toast('Run queued · runner will pick it up', 'info')
      onDone()
    } catch (err) {
      toast(`Failed: ${err.message || err}`, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const inputBase = {
    background: 'var(--srf-1)',
    border: '1px solid var(--hud-edge)',
    borderRadius: 0,
    padding: '8px 11px',
    color: 'var(--t1)',
    fontSize: 12,
    fontFamily: 'var(--mono)',
    width: '100%',
    outline: 'none',
    transition: 'border-color 0.12s, background 0.12s',
  }
  const Lbl = ({ children }) => <div className="cap" style={{ marginBottom: 6 }}>{children}</div>

  return (
    <HudCard style={{ padding: 0 }} active>
      <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 0 }}>
        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); pickFile(e.dataTransfer.files[0]) }}
          onClick={() => document.getElementById('strategy-file').click()}
          style={{
            borderRight: '1px solid var(--hud-edge)',
            padding: 24,
            background: drag ? 'var(--cy-dim)' : 'rgba(255,255,255,0.012)',
            cursor: 'pointer',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            minHeight: 240,
            position: 'relative',
            transition: 'background 0.12s',
          }}
        >
          <input id="strategy-file" type="file" accept=".py" style={{ display: 'none' }} onChange={e => pickFile(e.target.files[0])} />
          {file ? (
            <>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--cy)" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
              <div className="mono" style={{ marginTop: 14, fontSize: 12, color: 'var(--cy)' }}>{file.name}</div>
              <div className="cap" style={{ marginTop: 6 }}>{(file.size / 1024).toFixed(1)} KB · CLICK TO REPLACE</div>
            </>
          ) : (
            <>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.3">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <div className="cap" style={{ marginTop: 14 }}>STRATEGY · .PY</div>
              <div style={{ color: 'var(--t3)', fontSize: 11.5, marginTop: 6, letterSpacing: '-0.005em' }}>drop here or click to browse</div>
              <a href={`${import.meta.env.BASE_URL}example_strategy.py`} download onClick={e => e.stopPropagation()}
                style={{ marginTop: 18, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--cy)', letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none', borderBottom: '1px dotted var(--cy-edge)' }}>
                ↓ download template
              </a>
            </>
          )}
        </div>

        {/* Config grid */}
        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 14 }}>
            <div>
              <Lbl>CLASS NAME</Lbl>
              <input value={className} onChange={e => setClassName(e.target.value)} style={inputBase} placeholder="EmaCrossLong" />
            </div>
            <div>
              <Lbl>RUN LABEL</Lbl>
              <input value={label} onChange={e => setLabel(e.target.value)} style={inputBase} placeholder="what's this testing?" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 14 }}>
            <div>
              <Lbl>SYMBOLS</Lbl>
              <div style={{ display: 'flex', gap: 6 }}>
                {SYMS.map(s => {
                  const on = selectedSyms.includes(s)
                  return (
                    <button key={s} type="button" onClick={() => toggleSym(s)} style={{
                      flex: 1,
                      padding: '7px 6px',
                      background: on ? 'var(--cy-dim)' : 'transparent',
                      color: on ? 'var(--cy)' : 'var(--t3)',
                      border: `1px solid ${on ? 'var(--cy-edge)' : 'var(--hud-edge)'}`,
                      borderRadius: 0,
                      fontFamily: 'var(--mono)',
                      fontSize: 12,
                      fontWeight: 500,
                      letterSpacing: '0.04em',
                      cursor: 'pointer',
                      transition: 'all 0.1s',
                    }}>
                      {on ? '✓ ' : ''}{s}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <Lbl>START · earliest {DATA_FLOOR}</Lbl>
              <input type="date" min={DATA_FLOOR} value={startDate} onChange={e => setStartDate(e.target.value)} style={inputBase} />
            </div>
            <div>
              <Lbl>END</Lbl>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputBase} />
            </div>
            <div>
              <Lbl>EQUITY · USD</Lbl>
              <input type="number" value={equity} onChange={e => setEquity(parseFloat(e.target.value))} style={inputBase} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span className="cap" style={{ marginRight: 4 }}>QUICK</span>
            {[
              { lbl: '7d',   start: todayMinus(7) },
              { lbl: '30d',  start: todayMinus(30) },
              { lbl: '90d',  start: DATA_FLOOR },
              { lbl: 'MAX',  start: DATA_FLOOR },
            ].map(p => (
              <button key={p.lbl} type="button" onClick={() => setStartDate(p.start)} style={{
                background: startDate === p.start ? 'var(--cy-dim)' : 'transparent',
                color: startDate === p.start ? 'var(--cy)' : 'var(--t3)',
                border: `1px solid ${startDate === p.start ? 'var(--cy-edge)' : 'var(--hud-edge)'}`,
                padding: '3px 9px', fontFamily: 'var(--mono)', fontSize: 10,
                letterSpacing: '0.06em', cursor: 'pointer', borderRadius: 0,
              }}>{p.lbl}</button>
            ))}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 12px', border: '1px solid var(--hud-edge)', background: enforceTopstep ? 'var(--cy-dim)' : 'transparent' }}>
            <div style={{
              width: 14, height: 14, border: `1.5px solid ${enforceTopstep ? 'var(--cy)' : 'var(--hud-edge-strong)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: enforceTopstep ? 'var(--cy)' : 'transparent',
            }}>
              {enforceTopstep && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>}
            </div>
            <input type="checkbox" checked={enforceTopstep} onChange={e => setEnforceTopstep(e.target.checked)} style={{ display: 'none' }} />
            <div>
              <div className="mono" style={{ fontSize: 11, color: enforceTopstep ? 'var(--cy)' : 'var(--t2)', letterSpacing: '0.02em' }}>ENFORCE TOPSTEP $50K RULES</div>
              <div className="cap" style={{ marginTop: 2, color: 'var(--t4)', textTransform: 'none', letterSpacing: '0.02em', fontSize: 10 }}>
                $1,000 daily loss · $2,000 trailing dd · 4pm CT flatten · 10ct cap
              </div>
            </div>
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onDone} style={{
              background: 'transparent', color: 'var(--t3)',
              border: '1px solid var(--hud-edge)',
              padding: '8px 16px', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.06em',
              cursor: 'pointer', borderRadius: 0,
            }}>CANCEL</button>
            <button type="submit" disabled={submitting} style={{
              background: 'var(--cy)', color: '#000',
              border: '1px solid var(--cy)',
              padding: '8px 22px', fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
              cursor: submitting ? 'wait' : 'pointer', borderRadius: 0,
              opacity: submitting ? 0.5 : 1,
              boxShadow: '0 0 18px -4px var(--cy-soft)',
            }}>
              {submitting ? 'Queueing…' : '▶ Execute'}
            </button>
          </div>
        </div>
      </form>
    </HudCard>
  )
}
