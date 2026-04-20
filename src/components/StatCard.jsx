import { useEffect, useState } from 'react'

function fmt(n) {
  const abs = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (n >= 0 ? '+$' : '-$') + abs
}

export default function StatCard({ label, value, sub, delay = 0 }) {
  const [key, setKey] = useState(0)
  const pos = value >= 0

  useEffect(() => { setKey(k => k + 1) }, [value])

  return (
    <div className="fade-up" style={{
      animationDelay: `${delay}s`,
      background: '#111',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 12,
      padding: '20px',
    }}>
      <div style={{
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.05em',
        color: 'rgba(255,255,255,0.38)',
        textTransform: 'uppercase',
        marginBottom: 10,
      }}>
        {label}
      </div>

      <div key={key} className="tick" style={{
        fontSize: 26,
        fontWeight: 600,
        fontFamily: 'var(--mono)',
        color: pos ? '#22c55e' : '#ef4444',
        letterSpacing: '-0.5px',
        lineHeight: 1,
      }}>
        {fmt(value)}
      </div>

      {sub && (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', marginTop: 8 }}>
          {sub}
        </div>
      )}
    </div>
  )
}
