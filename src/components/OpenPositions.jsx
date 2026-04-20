import GlassCard from './GlassCard'

const COLORS = {
  MES: '#4f9cf9',
  MNQ: '#7c3aed',
  M2K: '#f59e0b',
  MYM: '#10b981',
}

export default function OpenPositions({ trades }) {
  const open = trades.filter(t => t.status === 'open')

  return (
    <GlassCard className="p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-white/30">Open Positions</span>
        <span className="text-xs font-mono px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(79,156,249,0.1)', color: '#4f9cf9', border: '1px solid rgba(79,156,249,0.2)' }}>
          {open.length} active
        </span>
      </div>

      {open.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-white/20">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 opacity-50">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
          <span className="text-sm">No open positions</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {open.map(t => (
            <div key={t.id} className="flex items-center justify-between px-4 py-3 rounded-xl tr-hover"
                 style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                     style={{ background: `${COLORS[t.symbol] ?? '#4f9cf9'}20`, color: COLORS[t.symbol] ?? '#4f9cf9' }}>
                  {t.symbol?.replace('M', '')}
                </div>
                <div>
                  <div className="font-medium text-sm">{t.symbol}</div>
                  <div className="text-xs text-white/30">{t.contracts}x @ ${t.entry_price?.toLocaleString()}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono px-2 py-0.5 rounded-full"
                     style={t.side === 'buy'
                       ? { background: 'rgba(16,185,129,0.1)', color: '#10b981' }
                       : { background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                  {t.side?.toUpperCase()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  )
}
