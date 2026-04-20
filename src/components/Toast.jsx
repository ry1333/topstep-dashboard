import { useEffect, useState } from 'react'

let _add = null
export function toast(msg, type = 'info') { _add?.({ msg, type, id: Date.now() }) }

export default function ToastContainer() {
  const [toasts, setToasts] = useState([])
  _add = (t) => {
    setToasts(p => [...p, t])
    setTimeout(() => setToasts(p => p.filter(x => x.id !== t.id)), 4000)
  }

  const colors = { info: 'var(--blue)', profit: 'var(--profit)', loss: 'var(--loss)' }

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} className="toast" style={{
          background: 'var(--surface2)', border: `1px solid ${colors[t.type]}40`,
          borderLeft: `3px solid ${colors[t.type]}`,
          borderRadius: 10, padding: '12px 16px', fontSize: 13, fontWeight: 500,
          color: 'var(--text)', maxWidth: 300, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          {t.msg}
        </div>
      ))}
    </div>
  )
}
