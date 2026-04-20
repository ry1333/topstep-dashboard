import { supabase } from '../lib/supabase'
import { toast } from '../components/Toast'
import { useBotStatus } from '../hooks/useBotStatus'

export default function Settings() {
  const { status, sendCommand, pending } = useBotStatus()
  const isRunning = status?.is_running ?? false
  const isPending = pending != null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 52 }} className="fade-up">

      {/* Header */}
      <div>
        <div style={{ fontSize: 10.5, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 500, marginBottom: 12 }}>
          Configuration
        </div>
        <h1 className="title" style={{ fontSize: 44 }}>
          Settings
        </h1>
      </div>

      {/* Bot control — terminal-style technical panel */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: 10.5, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 500 }}>
            Bot Control
          </div>
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--t4)' }}>
            {status?.updated_at
              ? `last heartbeat ${new Date(status.updated_at).toLocaleTimeString('en-US', { hour12: false })}`
              : 'no heartbeat'}
          </div>
        </div>

        {/* Terminal block */}
        <div style={{
          border: '1px solid var(--border2)',
          borderRadius: 10,
          overflow: 'hidden',
          background: 'var(--bg2)',
        }}>
          {/* Header strip like a window chrome */}
          <div className="mono" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 14px',
            borderBottom: '1px solid var(--border)',
            background: 'rgba(255,255,255,0.01)',
            fontSize: 10.5, color: 'var(--t3)', letterSpacing: '0.02em',
          }}>
            <span>topstep-bot · digital ocean · 64.225.27.200</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {status?.mode && (
                <span style={{ color: status.mode === 'trend' ? 'var(--brand)' : 'var(--t2)', letterSpacing: '0.02em' }}>
                  mode · {status.mode}
                </span>
              )}
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className={isRunning ? 'dot-live' : ''} style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: isRunning ? 'var(--profit)' : 'var(--t4)',
                }} />
                <span style={{ color: isRunning ? 'var(--profit)' : 'var(--t3)' }}>
                  {isRunning ? 'active' : 'idle'}
                </span>
              </span>
            </span>
          </div>

          {/* Body */}
          <div style={{ padding: '28px 24px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center' }}>
            <div>
              <div className="display" style={{
                fontSize: 32, letterSpacing: '-0.02em', color: '#fff', lineHeight: 1.1,
              }}>
                {isRunning ? (
                  <>
                    Bot is <span className="display-italic" style={{ color: 'var(--profit)' }}>live</span> on Digital Ocean
                  </>
                ) : (
                  <>
                    Bot is <span className="display-italic" style={{ color: 'var(--loss)' }}>offline</span>
                  </>
                )}
              </div>
              <div className="mono" style={{ fontSize: 11.5, color: 'var(--t3)', marginTop: 10 }}>
                trades sync automatically · commands polled every 5s
              </div>
            </div>

            <button
              disabled={isPending}
              onClick={() => { sendCommand(isRunning ? 'stop' : 'start'); toast(isRunning ? 'Stop sent' : 'Start sent', 'info') }}
              className={`btn ${isPending ? 'btn-outline' : isRunning ? 'btn-danger' : 'btn-accent'}`}
              style={{ padding: '14px 26px', fontSize: 13, minWidth: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {isPending ? (
                <>
                  <span className="spinner" />
                  {pending === 'start' ? 'Starting…' : 'Stopping…'}
                </>
              ) : (isRunning ? '■  Stop Bot' : '▶  Start Bot')}
            </button>
          </div>

          {/* Footer strip with secondary action */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px',
            borderTop: '1px solid var(--border)',
            background: 'rgba(0,0,0,0.3)',
          }}>
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--t4)' }}>
              {status?.balance ? `balance $${status.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'balance —'}
              {status?.daily_pnl != null && (
                <>
                  <span style={{ margin: '0 10px', color: 'var(--t4)' }}>·</span>
                  <span style={{ color: status.daily_pnl >= 0 ? 'var(--profit)' : 'var(--loss)' }}>
                    today {status.daily_pnl >= 0 ? '+' : ''}${status.daily_pnl.toFixed(2)}
                  </span>
                </>
              )}
            </span>
            <button
              onClick={async () => {
                await supabase.from('bot_commands').insert({ command: 'emergency_stop', executed: false })
                toast('Emergency stop sent', 'loss')
              }}
              style={{
                background: 'transparent', border: 'none',
                color: 'var(--loss)', fontSize: 11, fontFamily: 'var(--font)',
                cursor: 'pointer', padding: 0, letterSpacing: '-0.005em',
                opacity: 0.7, transition: 'opacity 0.12s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = 1}
              onMouseLeave={e => e.currentTarget.style.opacity = 0.7}
            >
              Emergency Stop ↗
            </button>
          </div>
        </div>
      </div>

      {/* Placeholder — config coming later */}
      <div style={{
        padding: '32px 28px',
        border: '1px dashed var(--border2)',
        borderRadius: 10,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 6, letterSpacing: '-0.005em' }}>
          Bot Configuration
        </div>
        <div className="mono" style={{ fontSize: 11.5, color: 'var(--t4)' }}>
          position size · risk limits · instruments · sessions — coming soon
        </div>
      </div>

    </div>
  )
}
