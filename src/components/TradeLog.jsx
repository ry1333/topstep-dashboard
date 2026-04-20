import { useState } from 'react'
import GlassCard from './GlassCard'

const FILTERS = ['All', 'MES', 'MNQ', 'M2K', 'MYM']

function fmt(n) {
  if (n == null) return '—'
  return (n >= 0 ? '+$' : '-$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function timeAgo(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) +
    ' · ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function TradeLog({ trades }) {
  const [filter, setFilter] = useState('All')
  const [limit, setLimit]   = useState(20)

  const filtered = trades
    .filter(t => t.status === 'closed')
    .filter(t => filter === 'All' || t.symbol === filter)
    .slice(0, limit)

  const wins   = filtered.filter(t => (t.pnl ?? 0) > 0).length
  const losses = filtered.filter(t => (t.pnl ?? 0) <= 0).length

  return (
    <GlassCard className="p-6 flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-widest text-white/30">Trade Log</span>
          <div className="flex gap-1 text-xs">
            <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
              {wins}W
            </span>
            <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
              {losses}L
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-1">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
              style={filter === f
                ? { background: 'rgba(79,156,249,0.2)', color: '#4f9cf9', border: '1px solid rgba(79,156,249,0.3)' }
                : { background: 'rgba(255,255,255,0.04)', color: '#8b949e', border: '1px solid transparent' }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-white/30 uppercase tracking-wide">
              <th className="text-left pb-3 font-medium">Symbol</th>
              <th className="text-left pb-3 font-medium">Side</th>
              <th className="text-right pb-3 font-medium">Entry</th>
              <th className="text-right pb-3 font-medium">Exit</th>
              <th className="text-right pb-3 font-medium">P&L</th>
              <th className="text-right pb-3 font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-white/20 text-sm">No trades yet</td>
              </tr>
            )}
            {filtered.map(t => {
              const profit = (t.pnl ?? 0) > 0
              return (
                <tr key={t.id} className="tr-hover border-t border-white/5">
                  <td className="py-3 pr-4">
                    <span className="font-mono font-semibold text-xs px-2 py-1 rounded-md"
                          style={{ background: 'rgba(79,156,249,0.1)', color: '#4f9cf9' }}>
                      {t.symbol}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-xs px-2 py-0.5 rounded-full"
                          style={t.side === 'buy'
                            ? { background: 'rgba(16,185,129,0.1)', color: '#10b981' }
                            : { background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                      {t.side?.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right font-mono text-xs text-white/60">
                    ${t.entry_price?.toLocaleString() ?? '—'}
                  </td>
                  <td className="py-3 pr-4 text-right font-mono text-xs text-white/60">
                    ${t.exit_price?.toLocaleString() ?? '—'}
                  </td>
                  <td className="py-3 pr-4 text-right font-mono font-semibold text-sm"
                      style={{ color: profit ? '#10b981' : '#ef4444' }}>
                    {fmt(t.pnl)}
                  </td>
                  <td className="py-3 text-right text-xs text-white/30 whitespace-nowrap">
                    {timeAgo(t.created_at)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {trades.filter(t => t.status === 'closed').length > limit && (
        <button onClick={() => setLimit(l => l + 20)}
          className="text-xs text-white/30 hover:text-accent-blue transition-colors text-center pt-2">
          Load more trades ↓
        </button>
      )}
    </GlassCard>
  )
}
