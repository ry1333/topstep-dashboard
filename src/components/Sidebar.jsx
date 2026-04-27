import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useBotStatus } from '../hooks/useBotStatus'
import { toast } from './Toast'

const nav = [
  { to: '/',          label: 'Overview',   icon: <GridIcon />,    code: '01' },
  { to: '/trades',    label: 'Trades',     icon: <ListIcon />,    code: '02' },
  { to: '/analytics', label: 'Analytics',  icon: <ChartIcon />,   code: '03' },
  { to: '/risk',      label: 'Risk',       icon: <ShieldIcon />,  code: '04' },
  { to: '/backtest',  label: 'Backtester', icon: <BeakerIcon />,  code: '05' },
  { to: '/settings',  label: 'Settings',   icon: <SettingsIcon />, code: '06' },
]

export default function Sidebar({ open = false, onClose = () => {} }) {
  const { user, signOut } = useAuth()
  const { status, sendCommand, pending } = useBotStatus()
  const isRunning = status?.is_running ?? false
  const isPending = pending != null
  const balance = status?.balance
  const dailyPnl = status?.daily_pnl

  function openCmdK() {
    window.dispatchEvent(new Event('cmdk:open'))
    onClose()
  }

  return (
    <aside className={`sidebar-aside${open ? ' open' : ''}`} style={{
      width: 220,
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #08080a 0%, #050507 100%)',
      borderRight: '1px solid var(--hud-edge)',
      display: 'flex',
      flexDirection: 'column',
      padding: '16px 14px',
      position: 'fixed',
      top: 0, left: 0,
      zIndex: 40,
    }}>

      {/* Logo + system status */}
      <div style={{ marginBottom: 22, padding: '4px 4px 14px', borderBottom: '1px solid var(--hud-edge)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 28, height: 28,
            background: 'linear-gradient(135deg, var(--brand), var(--cy))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(94,234,212,0.3)',
            boxShadow: '0 0 14px rgba(94,234,212,0.25)',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.6" strokeLinecap="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
            </svg>
          </div>
          <div>
            <div className="mono" style={{ fontSize: 12, fontWeight: 600, color: '#fff', letterSpacing: '0.04em' }}>TOPSTEPX</div>
            <div className="mono" style={{ fontSize: 9, color: 'var(--t4)', letterSpacing: '0.16em' }}>OPS · CONSOLE</div>
          </div>
        </div>
        <div className={`chip-hud ${isRunning ? 'pl' : ''}`} style={{ width: '100%', justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className={isRunning ? 'dot dot-live' : 'dot'} />
            {isRunning ? 'NOMINAL' : 'OFFLINE'}
          </span>
          <span style={{ color: 'var(--t4)', fontSize: 9 }}>SYS</span>
        </div>
      </div>

      {/* Search */}
      <button
        onClick={openCmdK}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', marginBottom: 16, padding: '7px 10px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--hud-edge)',
          borderRadius: 0,
          color: 'var(--t3)',
          fontSize: 11.5,
          fontFamily: 'var(--font)',
          cursor: 'pointer',
          transition: 'all 0.1s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cy-edge)'; e.currentTarget.style.color = 'var(--cy)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--hud-edge)'; e.currentTarget.style.color = 'var(--t3)' }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          Search
        </span>
        <span className="kbd" style={{ borderRadius: 0 }}>⌘K</span>
      </button>

      {/* Section label */}
      <div className="cap" style={{ fontSize: 9, padding: '4px 4px 8px', letterSpacing: '0.2em' }}>NAVIGATION</div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
        {nav.map(({ to, label, icon, code }) => (
          <NavLink key={to} to={to} end={to === '/'} onClick={onClose}
            className={({ isActive }) => `hud-nav${isActive ? ' active' : ''}`}
            style={{ position: 'relative', textDecoration: 'none' }}>
            {({ isActive }) => (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px',
                background: isActive ? 'rgba(94,234,212,0.06)' : 'transparent',
                borderLeft: `2px solid ${isActive ? 'var(--cy)' : 'transparent'}`,
                color: isActive ? 'var(--t1)' : 'var(--t2)',
                fontSize: 12.5,
                fontWeight: 450,
                letterSpacing: '-0.005em',
                transition: 'all 0.1s',
              }}
              onMouseEnter={e => !isActive && (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
              onMouseLeave={e => !isActive && (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ color: isActive ? 'var(--cy)' : 'var(--t3)', display: 'flex' }}>{icon}</span>
                <span style={{ flex: 1 }}>{label}</span>
                <span className="mono" style={{ fontSize: 9, color: isActive ? 'var(--cy)' : 'var(--t4)', letterSpacing: '0.05em' }}>{code}</span>
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Live mini-stats */}
      {(balance != null || dailyPnl != null) && (
        <div style={{ marginTop: 14, padding: '10px 4px', borderTop: '1px solid var(--hud-edge)', borderBottom: '1px solid var(--hud-edge)' }}>
          <div className="cap" style={{ fontSize: 9, marginBottom: 8, letterSpacing: '0.16em' }}>LIVE</div>
          {balance != null && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span className="mono" style={{ fontSize: 10, color: 'var(--t4)' }}>BAL</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--t1)' }}>${balance.toFixed(0)}</span>
            </div>
          )}
          {dailyPnl != null && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="mono" style={{ fontSize: 10, color: 'var(--t4)' }}>DAY</span>
              <span className="mono" style={{ fontSize: 11, color: dailyPnl >= 0 ? 'var(--profit)' : 'var(--loss)' }}>
                {dailyPnl >= 0 ? '+' : '-'}${Math.abs(dailyPnl).toFixed(2)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Bot control */}
      <div style={{ marginTop: 14 }}>
        <button
          disabled={isPending}
          onClick={() => {
            sendCommand(isRunning ? 'stop' : 'start')
            toast(isRunning ? 'Halt sent' : 'Engage sent', 'info')
          }}
          style={{
            width: '100%', padding: '9px 0',
            fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
            background: isPending ? 'transparent' :
                        isRunning ? 'rgba(239,68,68,0.06)' : 'rgba(34,197,94,0.06)',
            color: isPending ? 'var(--t3)' : isRunning ? 'var(--loss)' : 'var(--profit)',
            border: `1px solid ${isPending ? 'var(--hud-edge)' : isRunning ? 'rgba(239,68,68,0.32)' : 'rgba(34,197,94,0.32)'}`,
            borderRadius: 0,
            cursor: isPending ? 'not-allowed' : 'pointer',
            transition: 'all 0.12s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            textTransform: 'uppercase',
            boxShadow: !isPending && isRunning ? '0 0 14px rgba(239,68,68,0.18)' : !isPending ? '0 0 14px rgba(34,197,94,0.18)' : 'none',
          }}>
          {isPending && <span className="spinner" />}
          {isPending ? (pending === 'start' ? '◍ Starting' : '◍ Stopping') : (isRunning ? '■ HALT BOT' : '▶ ENGAGE BOT')}
        </button>

        <button
          onClick={() => {
            const now = localStorage.getItem('demo') === '1'
            localStorage.setItem('demo', now ? '0' : '1')
            window.location.reload()
          }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
            padding: '6px 9px', marginTop: 10,
            background: localStorage.getItem('demo') === '1' ? 'var(--brand-dim)' : 'transparent',
            border: `1px solid ${localStorage.getItem('demo') === '1' ? 'rgba(139,92,246,0.30)' : 'var(--hud-edge)'}`,
            color: localStorage.getItem('demo') === '1' ? 'var(--brand)' : 'var(--t3)',
            fontSize: 10,
            fontFamily: 'var(--mono)',
            cursor: 'pointer',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          <span>Demo · {localStorage.getItem('demo') === '1' ? 'on' : 'off'}</span>
          <span style={{ fontSize: 8 }}>{localStorage.getItem('demo') === '1' ? '●' : '○'}</span>
        </button>
      </div>

      {/* User row */}
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--hud-edge)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="mono" style={{ fontSize: 9.5, color: 'var(--t4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
          {user?.email}
        </span>
        <button onClick={signOut} style={{
          background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer',
          fontFamily: 'var(--mono)', fontSize: 9.5, padding: '2px 0',
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}
        onMouseEnter={e => e.target.style.color = 'var(--cy)'}
        onMouseLeave={e => e.target.style.color = 'var(--t3)'}>
          Sign out
        </button>
      </div>
    </aside>
  )
}

function GridIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> }
function ListIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3" cy="6" r="1" fill="currentColor"/><circle cx="3" cy="12" r="1" fill="currentColor"/><circle cx="3" cy="18" r="1" fill="currentColor"/></svg> }
function ChartIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> }
function ShieldIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> }
function BeakerIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6v3l4 11a3 3 0 0 1-3 4H8a3 3 0 0 1-3-4l4-11V3z"/><line x1="9" y1="3" x2="15" y2="3"/><line x1="6.5" y1="13" x2="17.5" y2="13"/></svg> }
function SettingsIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> }
