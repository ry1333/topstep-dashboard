import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * StatusBar — bottom strip, code-editor style. Shows db connectivity, runner state, build hash, lat-aware time.
 */
export default function StatusBar() {
  const [dbState, setDbState] = useState('connecting')
  const [latency, setLatency] = useState(null)
  const [queued, setQueued] = useState(0)
  const [running, setRunning] = useState(0)

  async function ping() {
    const t0 = performance.now()
    try {
      const { error, count: c1 } = await supabase
        .from('backtest_runs').select('id', { count: 'exact', head: true }).eq('status', 'queued')
      if (error) throw error
      const { count: c2 } = await supabase
        .from('backtest_runs').select('id', { count: 'exact', head: true }).eq('status', 'running')
      setLatency(performance.now() - t0)
      setQueued(c1 ?? 0)
      setRunning(c2 ?? 0)
      setDbState('online')
    } catch {
      setDbState('error')
    }
  }

  useEffect(() => {
    ping()
    const t = setInterval(ping, 4000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="statusbar">
      <div className="seg">
        <span className="blink" style={{ width: 5, height: 5, borderRadius: '50%', background: dbState === 'online' ? 'var(--cy)' : dbState === 'error' ? 'var(--loss)' : 'var(--t3)', boxShadow: dbState === 'online' ? '0 0 6px var(--cy)' : 'none' }} />
        <span style={{ color: 'var(--t4)' }}>db</span>
        <span style={{ color: dbState === 'online' ? 'var(--cy)' : dbState === 'error' ? 'var(--loss)' : 'var(--t3)', textTransform: 'uppercase' }}>
          {dbState}
        </span>
        {latency != null && <span style={{ color: 'var(--t4)' }}>· {latency.toFixed(0)}ms</span>}
      </div>
      <div className="seg">
        <span style={{ color: 'var(--t4)' }}>queue</span>
        <span style={{ color: queued > 0 ? 'var(--brand)' : 'var(--t3)' }}>{queued}q</span>
        <span style={{ color: running > 0 ? 'var(--cy)' : 'var(--t3)' }}>{running}r</span>
      </div>
      <div className="seg">
        <span style={{ color: 'var(--t4)' }}>realm</span>
        <span style={{ color: 'var(--t3)' }}>topstep · 50k</span>
      </div>
      <div className="seg" style={{ marginLeft: 'auto' }}>
        <span style={{ color: 'var(--t4)' }}>build</span>
        <span style={{ color: 'var(--t3)' }}>v2.0 · ops-console</span>
      </div>
    </div>
  )
}
