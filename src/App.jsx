import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Sidebar from './components/Sidebar'
import ToastContainer from './components/Toast'
import CommandPalette from './components/CommandPalette'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Trades from './pages/Trades'
import Analytics from './pages/Analytics'
import Risk from './pages/Risk'
import Settings from './pages/Settings'

function Layout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, padding: '32px 36px', minHeight: '100vh', maxWidth: 'calc(100vw - 220px)' }}>
        {children}
      </main>
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
        <Route path="/settings" element={<Guard><Layout><Settings /></Layout></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
