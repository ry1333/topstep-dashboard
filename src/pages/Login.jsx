import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { signIn, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [pass, setPass]   = useState('')
  const [err, setErr]     = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { if (user) navigate('/', { replace: true }) }, [user])

  async function submit(e) {
    e.preventDefault(); setErr(''); setLoading(true)
    const { error } = await signIn(email, pass)
    if (error) setErr(error.message)
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#000',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ width: '100%', maxWidth: 360, padding: '0 24px' }} className="fade-up">

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 40 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--brand)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.025em', color: '#fff' }}>TopstepX</div>
            <div className="mono" style={{ fontSize: 10.5, color: 'var(--t3)', letterSpacing: '0.05em', marginTop: 2, textTransform: 'uppercase' }}>
              trading terminal
            </div>
          </div>
        </div>

        {/* Heading */}
        <h1 className="title" style={{ fontSize: 32, marginBottom: 8 }}>
          Sign In
        </h1>
        <div style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 32 }}>
          Authorized Traders Only
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 10.5, color: 'var(--t3)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500 }}>Email</label>
            <input className="inp" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label style={{ fontSize: 10.5, color: 'var(--t3)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500 }}>Password</label>
            <input className="inp" type="password" placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} required />
          </div>
          {err && (
            <div style={{ fontSize: 12, color: 'var(--loss)', background: 'var(--loss-dim)', borderRadius: 8, padding: '9px 12px' }}>
              {err}
            </div>
          )}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8, padding: '12px' }} disabled={loading}>
            {loading ? 'Signing In…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
