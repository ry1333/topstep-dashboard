import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useBotStatus } from '../hooks/useBotStatus'
import { toast } from './Toast'

const nav = [
  { to: '/',          label: 'Overview',   icon: <GridIcon /> },
  { to: '/trades',    label: 'Trades',     icon: <ListIcon /> },
  { to: '/analytics', label: 'Analytics',  icon: <ChartIcon /> },
  { to: '/risk',      label: 'Risk',       icon: <ShieldIcon /> },
  { to: '/settings',  label: 'Settings',   icon: <SettingsIcon /> },
]

export default function Sidebar() {
  const { user, signOut }       = useAuth()
  const { status, sendCommand } = useBotStatus()
  const isRunning = status?.is_running ?? false

  function openCmdK() {
    window.dispatchEvent(new Event('cmdk:open'))
  }

  return (
    <aside style={{
      width: 220,
      minHeight: '100vh',
      background: '#000',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '22px 14px 16px',
      position: 'fixed',
      top: 0, left: 0,
      zIndex: 40,
    }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 32, padding: '0 4px' }}>
        <div style={{
          width: 26, height: 26, borderRadius: 6,
          background: 'var(--brand)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.025em', color: '#fff' }}>TopstepX</div>
          <div className="mono" style={{ fontSize: 9.5, color: isRunning ? 'var(--profit)' : 'var(--t4)', fontWeight: 500, letterSpacing: '0.05em', marginTop: 2, textTransform: 'uppercase' }}>
            {isRunning ? '● live' : '○ offline'}
          </div>
        </div>
      </div>

      {/* Command palette trigger */}
      <button
        onClick={openCmdK}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', marginBottom: 20, padding: '8px 11px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          color: 'var(--t3)',
          fontSize: 12,
          fontFamily: 'var(--font)',
          cursor: 'pointer',
          transition: 'all 0.1s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.055)'; e.currentTarget.style.color = 'var(--t2)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'var(--t3)' }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          Search
        </span>
        <span className="kbd">⌘K</span>
      </button>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
        {nav.map(({ to, label, icon }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            {icon}
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bot status card */}
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{
          borderRadius: 10,
          padding: '13px 12px',
          background: 'rgba(255,255,255,0.03)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
            <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--t3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Bot</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className={isRunning ? 'dot-live' : ''} style={{ width: 5, height: 5, borderRadius: '50%', background: isRunning ? 'var(--profit)' : 'var(--t4)', display: 'inline-block' }} />
              <span className="mono" style={{ fontSize: 10.5, color: isRunning ? 'var(--profit)' : 'var(--t3)', letterSpacing: '-0.01em' }}>
                {isRunning ? 'running' : 'stopped'}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              sendCommand(isRunning ? 'stop' : 'start')
              toast(isRunning ? 'Stop sent' : 'Start sent', 'info')
            }}
            style={{
              width: '100%', padding: '7px 0', fontSize: 11.5, fontWeight: 500,
              background: 'transparent',
              color: isRunning ? 'var(--loss)' : 'var(--profit)',
              border: `1px solid ${isRunning ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.3)'}`,
              borderRadius: 7,
              cursor: 'pointer',
              transition: 'all 0.12s',
              letterSpacing: '-0.01em',
            }}>
            {isRunning ? 'Stop Bot' : 'Start Bot'}
          </button>
        </div>

        {/* Demo toggle */}
        <button
          onClick={() => {
            const now = localStorage.getItem('demo') === '1'
            localStorage.setItem('demo', now ? '0' : '1')
            window.location.reload()
          }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 8px', borderRadius: 6,
            background: localStorage.getItem('demo') === '1' ? 'rgba(139,92,246,0.08)' : 'transparent',
            border: `1px solid ${localStorage.getItem('demo') === '1' ? 'rgba(139,92,246,0.22)' : 'var(--border)'}`,
            color: localStorage.getItem('demo') === '1' ? 'var(--brand)' : 'var(--t3)',
            fontSize: 10.5,
            fontFamily: 'var(--mono)',
            cursor: 'pointer',
            letterSpacing: '-0.01em',
            transition: 'all 0.12s',
          }}
        >
          <span>{localStorage.getItem('demo') === '1' ? 'demo mode on' : 'demo mode off'}</span>
          <span style={{ fontSize: 9, opacity: 0.6 }}>{localStorage.getItem('demo') === '1' ? '●' : '○'}</span>
        </button>

        {/* User row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
          <span style={{ fontSize: 10.5, color: 'var(--t4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
            {user?.email}
          </span>
          <button onClick={signOut} style={{
            background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer',
            fontSize: 10.5, fontFamily: 'inherit', padding: '2px 0', transition: 'color 0.12s',
          }}
          onMouseEnter={e => e.target.style.color = 'var(--t1)'}
          onMouseLeave={e => e.target.style.color = 'var(--t3)'}>
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  )
}

function GridIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
}
function ListIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3" cy="6" r="1" fill="currentColor"/><circle cx="3" cy="12" r="1" fill="currentColor"/><circle cx="3" cy="18" r="1" fill="currentColor"/></svg>
}
function ChartIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
}
function ShieldIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
}
function SettingsIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
}
