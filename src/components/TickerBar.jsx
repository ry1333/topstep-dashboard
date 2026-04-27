import { useEffect, useState } from 'react'
import { useBotStatus } from '../hooks/useBotStatus'
import { useTrades } from '../hooks/useTrades'

/**
 * TickerBar — top global Bloomberg-style ticker with key live values.
 * Renders in App.jsx layout above every page.
 */
export default function TickerBar() {
  const { status } = useBotStatus()
  const { pnlToday, pnlWeek, pnlAllTime } = useTrades()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const isRunning = status?.is_running ?? false
  const balance = status?.balance ?? (50000 + (pnlAllTime || 0))
  const todayVal = status?.daily_pnl ?? pnlToday
  const todayPos = (todayVal ?? 0) >= 0

  return (
    <div className="ticker">
      <div className="ticker-cell">
        <span className={isRunning ? 'dot blink' : 'dot'} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: isRunning ? 'var(--profit)' : 'var(--t4)',
          boxShadow: isRunning ? '0 0 8px var(--profit)' : 'none',
        }} />
        <span className="lbl">SYS</span>
        <span className="val" style={{ color: isRunning ? 'var(--profit)' : 'var(--t3)' }}>
          {isRunning ? 'NOMINAL' : 'OFFLINE'}
        </span>
      </div>
      <span className="sep" />
      <div className="ticker-cell">
        <span className="lbl">BAL</span>
        <span className="val">${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>
      <span className="sep" />
      <div className="ticker-cell">
        <span className="lbl">DAY</span>
        <span className="val" style={{ color: todayPos ? 'var(--profit)' : 'var(--loss)' }}>
          {todayPos ? '+' : '-'}${Math.abs(todayVal ?? 0).toFixed(2)}
        </span>
      </div>
      <span className="sep" />
      <div className="ticker-cell">
        <span className="lbl">7D</span>
        <span className="val" style={{ color: (pnlWeek ?? 0) >= 0 ? 'var(--profit)' : 'var(--loss)' }}>
          {(pnlWeek ?? 0) >= 0 ? '+' : '-'}${Math.abs(pnlWeek ?? 0).toFixed(2)}
        </span>
      </div>
      <span className="sep" />
      <div className="ticker-cell">
        <span className="lbl">MODE</span>
        <span className="val" style={{ color: status?.mode ? 'var(--cy)' : 'var(--t3)' }}>{status?.mode || '—'}</span>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div className="ticker-cell">
          <span className="lbl">UTC</span>
          <span className="val">{now.toISOString().slice(11, 19)}</span>
        </div>
        <span className="sep" />
        <div className="ticker-cell">
          <span className="lbl">CT</span>
          <span className="val">{now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'America/Chicago' })}</span>
        </div>
      </div>
    </div>
  )
}
