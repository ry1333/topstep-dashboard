import { useState } from 'react'
import { useTrades } from '../hooks/useTrades'

const SYMS  = ['All','MES','MNQ','M2K','MYM']
const SIDES = ['All','buy','sell']
const SYM_COLORS = { MES: 'rgba(237,237,237,0.92)', MNQ: 'rgba(237,237,237,0.6)', M2K: 'rgba(237,237,237,0.38)', MYM: 'rgba(237,237,237,0.22)' }

function fmt(n) {
  if (n == null) return '—'
  return (n >= 0 ? '+$' : '-$') + Math.abs(n).toFixed(2)
}

export default function Trades() {
  const { trades, loading } = useTrades()
  const [sym, setSym]       = useState('All')
  const [side, setSide]     = useState('All')
  const [limit, setLimit]   = useState(50)

  const closed   = trades.filter(t => t.status === 'closed' && t.pnl != null)
  const filtered = closed.filter(t =>
    (sym === 'All' || t.symbol === sym) &&
    (side === 'All' || t.side === side)
  )

  const wins    = filtered.filter(t => t.pnl > 0)
  const losses  = filtered.filter(t => t.pnl <= 0)
  const winRate = filtered.length ? (wins.length / filtered.length * 100).toFixed(1) : '0.0'
  const avgWin  = wins.length ? wins.reduce((s,t) => s + t.pnl, 0) / wins.length : 0
  const avgLoss = losses.length ? losses.reduce((s,t) => s + t.pnl, 0) / losses.length : 0
  const pf      = losses.length && Math.abs(avgLoss) > 0 ? (avgWin / Math.abs(avgLoss)).toFixed(2) : '∞'
  const total   = filtered.reduce((s,t) => s + t.pnl, 0)

  function exportCSV() {
    const rows = [['Date','Symbol','Side','Entry','Exit','PnL','Contracts','Reason']]
    filtered.forEach(t => rows.push([t.created_at, t.symbol, t.side, t.entry_price, t.exit_price, t.pnl, t.contracts, t.reason]))
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'trades.csv'; a.click()
  }

  const Stat = ({ label, value, color }) => (
    <>
      <span style={{ color: 'var(--t4)' }}>{label}</span>
      <span className="mono" style={{ color: color || 'var(--t1)', marginLeft: 6 }}>{value}</span>
    </>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }} className="fade-up">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 500, marginBottom: 10 }}>
            Journal
          </div>
          <h1 className="title" style={{ fontSize: 44 }}>
            Trades
          </h1>
        </div>
        <button className="btn btn-ghost" onClick={exportCSV} style={{
          display: 'flex', alignItems: 'center', gap: 7,
          border: '1px solid var(--border2)',
          fontSize: 12,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 3v13m-5-5l5 5 5-5M5 21h14"/></svg>
          Export CSV
        </button>
      </div>

      {/* Status line — Unix-style inline stats */}
      <div className="mono" style={{
        fontSize: 12.5, color: 'var(--t2)', letterSpacing: '-0.01em',
        display: 'flex', flexWrap: 'wrap', gap: '6px 22px',
      }}>
        <span><Stat label="trades" value={filtered.length} /></span>
        <span style={{ color: 'var(--t4)' }}>·</span>
        <span><Stat label="win rate" value={`${winRate}%`} color={parseFloat(winRate) >= 50 ? 'var(--profit)' : 'var(--loss)'} /></span>
        <span style={{ color: 'var(--t4)' }}>·</span>
        <span><Stat label="total" value={fmt(total)} color={total >= 0 ? 'var(--profit)' : 'var(--loss)'} /></span>
        <span style={{ color: 'var(--t4)' }}>·</span>
        <span><Stat label="avg win" value={`+$${avgWin.toFixed(2)}`} color="var(--profit)" /></span>
        <span style={{ color: 'var(--t4)' }}>·</span>
        <span><Stat label="avg loss" value={`-$${Math.abs(avgLoss).toFixed(2)}`} color="var(--loss)" /></span>
        <span style={{ color: 'var(--t4)' }}>·</span>
        <span><Stat label="pf" value={pf} color={parseFloat(pf) >= 1 ? 'var(--profit)' : 'var(--loss)'} /></span>
      </div>

      {/* Filters — text underline chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap', borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
        <span style={{ fontSize: 10.5, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: 14 }}>Symbol</span>
        {SYMS.map(s => (
          <button key={s} className={`chip${sym === s ? ' active' : ''}`} onClick={() => setSym(s)}>{s}</button>
        ))}
        <span style={{ width: 1, height: 14, background: 'var(--border2)', margin: '0 16px 0 4px' }} />
        <span style={{ fontSize: 10.5, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: 14 }}>Side</span>
        {SIDES.map(s => (
          <button key={s} className={`chip${side === s ? ' active' : ''}`} onClick={() => setSide(s)}>
            {s === 'All' ? 'All' : s === 'buy' ? 'Long' : 'Short'}
          </button>
        ))}
        <span className="mono" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--t4)' }}>
          {wins.length}w / {losses.length}l
        </span>
      </div>

      {/* Table */}
      <div>
        <table className="clean">
          <thead>
            <tr>
              <th>Date</th>
              <th>Symbol</th>
              <th>Side</th>
              <th style={{ textAlign: 'right' }}>Entry</th>
              <th style={{ textAlign: 'right' }}>Exit</th>
              <th style={{ textAlign: 'right' }}>P&amp;L</th>
              <th style={{ textAlign: 'right' }}>Qty</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, limit).map(t => (
              <tr key={t.id} style={{ borderTop: '1px solid var(--border)' }}>
                <td className="mono" style={{ color: 'var(--t2)', fontSize: 12 }}>
                  {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  <span style={{ color: 'var(--t4)', marginLeft: 8 }}>
                    {new Date(t.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </td>
                <td>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: SYM_COLORS[t.symbol] ?? 'var(--brand)' }}>{t.symbol}</span>
                </td>
                <td>
                  <span style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 600,
                    background: t.side === 'buy' ? 'var(--profit-dim)' : 'var(--loss-dim)',
                    color: t.side === 'buy' ? 'var(--profit)' : 'var(--loss)',
                    letterSpacing: '0.04em',
                  }}>{t.side?.toUpperCase()}</span>
                </td>
                <td className="mono" style={{ textAlign: 'right', color: 'var(--t2)' }}>${t.entry_price?.toLocaleString()}</td>
                <td className="mono" style={{ textAlign: 'right', color: 'var(--t2)' }}>
                  {t.exit_price ? `$${t.exit_price.toLocaleString()}` : '—'}
                </td>
                <td className="mono" style={{ textAlign: 'right', fontWeight: 600, color: t.pnl >= 0 ? 'var(--profit)' : 'var(--loss)' }}>
                  {fmt(t.pnl)}
                </td>
                <td className="mono" style={{ textAlign: 'right', color: 'var(--t3)' }}>{t.contracts}</td>
                <td style={{ color: 'var(--t3)', fontSize: 11.5, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.reason ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && !loading && (
          <div style={{ textAlign: 'center', color: 'var(--t4)', padding: '48px 0', fontSize: 13 }}>
            No trades match the current filter
          </div>
        )}
        {filtered.length > limit && (
          <button
            onClick={() => setLimit(l => l + 50)}
            className="btn btn-ghost"
            style={{
              width: '100%', marginTop: 16, padding: '10px',
              border: '1px solid var(--border)',
              fontSize: 12,
            }}
          >
            Load {Math.min(50, filtered.length - limit)} More ({filtered.length - limit} Remaining)
          </button>
        )}
      </div>
    </div>
  )
}
