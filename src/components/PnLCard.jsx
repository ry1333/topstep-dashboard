import { useEffect, useState } from 'react'
import GlassCard from './GlassCard'

function fmt(n) {
  const abs = Math.abs(n)
  return (n < 0 ? '-$' : '+$') + abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function PnLCard({ label, value, subtitle }) {
  const [key, setKey] = useState(0)
  const positive = value >= 0

  useEffect(() => { setKey(k => k + 1) }, [value])

  return (
    <GlassCard hover className="p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-widest text-white/40">{label}</span>
        <div className="w-6 h-6 rounded-md flex items-center justify-center"
             style={{ background: positive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
               stroke={positive ? '#10b981' : '#ef4444'} strokeWidth="2.5">
            {positive
              ? <polyline points="18 15 12 9 6 15" />
              : <polyline points="6 9 12 15 18 9" />}
          </svg>
        </div>
      </div>

      <div key={key} className="num-animate">
        <div className="font-mono font-bold text-2xl"
             style={{ color: positive ? '#10b981' : '#ef4444' }}>
          {fmt(value)}
        </div>
        {subtitle && <div className="text-xs text-white/30 mt-1">{subtitle}</div>}
      </div>

      {/* Thin gradient bar at bottom */}
      <div className="h-0.5 rounded-full w-full mt-1"
           style={{ background: positive
             ? 'linear-gradient(90deg, rgba(16,185,129,0.6), transparent)'
             : 'linear-gradient(90deg, rgba(239,68,68,0.6), transparent)' }} />
    </GlassCard>
  )
}
