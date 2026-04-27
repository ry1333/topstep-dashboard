import { useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useBotStatus } from './hooks/useBotStatus'
import Sidebar from './components/Sidebar'
import ToastContainer from './components/Toast'
import CommandPalette from './components/CommandPalette'
import TickerBar from './components/TickerBar'
import StatusBar from './components/StatusBar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Trades from './pages/Trades'
import Analytics from './pages/Analytics'
import Risk from './pages/Risk'
import Backtest from './pages/Backtest'
import BacktestRun from './pages/BacktestRun'
import Settings from './pages/Settings'

function MobileTopbar({ onOpen }) {
  const { status } = useBotStatus()
  const isRunning = status?.is_running ?? false
  return (
    <div className="mobile-topbar">
      <button className="hamburger" onClick={onOpen} aria-label="Open menu">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>
        </svg>
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 22, height: 22, borderRadius: 5, background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/></svg>
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', letterSpacing: '-0.025em' }}>TopstepX</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: isRunning ? 'var(--profit)' : 'var(--t3)', fontFamily: 'var(--mono)' }}>
        <span className={isRunning ? 'dot-live' : ''} style={{ width: 6, height: 6, borderRadius: '50%', background: isRunning ? 'var(--profit)' : 'var(--t4)' }} />
        {isRunning ? 'live' : 'off'}
      </div>
    </div>
  )
}

function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div className="layout-shell shell-with-bars">
      <MobileTopbar onOpen={() => setMenuOpen(true)} />
      {menuOpen && <div className="sidebar-backdrop" onClick={() => setMenuOpen(false)} />}
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="layout-main">
        <TickerBar />
        <div style={{ paddingTop: 24 }}>
          {children}
        </div>
      </main>
      <StatusBar />
      <ToastContainer />
      <CommandPalette />
    </div>
  )
}

function Guard({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg,#5b8af0,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg className="dot-live" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/></svg>
        </div>
        <span style={{ color: 'var(--text2)', fontSize: 13 }}>Loading...</span>
      </div>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Guard><Layout><Dashboard /></Layout></Guard>} />
        <Route path="/trades" element={<Guard><Layout><Trades /></Layout></Guard>} />
        <Route path="/analytics" element={<Guard><Layout><Analytics /></Layout></Guard>} />
        <Route path="/risk" element={<Guard><Layout><Risk /></Layout></Guard>} />
        <Route path="/backtest" element={<Guard><Layout><Backtest /></Layout></Guard>} />
        <Route path="/backtest/:id" element={<Guard><Layout><BacktestRun /></Layout></Guard>} />
        <Route path="/settings" element={<Guard><Layout><Settings /></Layout></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
