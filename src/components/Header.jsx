import { useAuth } from '../hooks/useAuth'
import { useBotStatus } from '../hooks/useBotStatus'

export default function Header() {
  const { user, signOut }    = useAuth()
  const { status, sendCommand } = useBotStatus()

  const isRunning = status?.is_running ?? false

  async function toggle() {
    await sendCommand(isRunning ? 'stop' : 'start')
  }

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/5 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #4f9cf9, #7c3aed)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
              <polyline points="16 7 22 7 22 13"/>
            </svg>
          </div>
          <span className="font-bold text-lg tracking-tight">TopstepX</span>
          <span className="text-white/20 text-sm font-mono ml-1">Dashboard</span>
        </div>

        {/* Center — Bot Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
               style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span className={`w-2 h-2 rounded-full ${isRunning ? 'status-dot-running' : ''}`}
                  style={{ background: isRunning ? '#10b981' : '#6b7280' }} />
            <span className="text-xs font-medium" style={{ color: isRunning ? '#10b981' : '#6b7280' }}>
              {isRunning ? 'Bot Running' : 'Bot Stopped'}
            </span>
          </div>

          {/* Start / Stop toggle */}
          <button onClick={toggle}
            className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
            style={isRunning
              ? { background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }
              : { background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }
            }>
            {isRunning ? '⏹ Stop Bot' : '▶ Start Bot'}
          </button>
        </div>

        {/* User */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-white/40">Signed in as</div>
            <div className="text-sm font-medium truncate max-w-[160px]">{user?.email}</div>
          </div>
          <button onClick={signOut}
            className="text-xs text-white/30 hover:text-white/70 transition-colors px-2 py-1 rounded">
            Sign out
          </button>
        </div>

      </div>
    </header>
  )
}
