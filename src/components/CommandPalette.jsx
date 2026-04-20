import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBotStatus } from '../hooks/useBotStatus'
import { supabase } from '../lib/supabase'
import { toast } from './Toast'

export default function CommandPalette() {
  const [open, setOpen]     = useState(false)
  const [query, setQuery]   = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef            = useRef(null)
  const navigate            = useNavigate()
  const { sendCommand }     = useBotStatus()

  const items = [
    { id: 'nav-overview',  label: 'Go to Overview',   kind: 'page', hint: 'G O', run: () => navigate('/') },
    { id: 'nav-trades',    label: 'Go to Trades',     kind: 'page', hint: 'G T', run: () => navigate('/trades') },
    { id: 'nav-analytics', label: 'Go to Analytics',  kind: 'page', hint: 'G A', run: () => navigate('/analytics') },
    { id: 'nav-risk',      label: 'Go to Risk',       kind: 'page', hint: 'G R', run: () => navigate('/risk') },
    { id: 'nav-settings',  label: 'Go to Settings',   kind: 'page', hint: 'G S', run: () => navigate('/settings') },
    { id: 'bot-start',     label: 'Start Bot',        kind: 'action', run: () => { sendCommand('start'); toast('Start command sent', 'info') } },
    { id: 'bot-stop',      label: 'Stop Bot',         kind: 'action', run: () => { sendCommand('stop'); toast('Stop command sent', 'info') } },
    { id: 'bot-emergency', label: 'Emergency Stop',   kind: 'action', run: async () => {
        await supabase.from('bot_commands').insert({ command: 'emergency_stop', executed: false })
        toast('Emergency stop sent', 'loss')
    } },
    { id: 'sign-out',      label: 'Sign Out',         kind: 'action', run: async () => { await supabase.auth.signOut() } },
  ]

  const filtered = query
    ? items.filter(i => i.label.toLowerCase().includes(query.toLowerCase()))
    : items

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    function onOpen() { setOpen(true) }
    window.addEventListener('keydown', onKey)
    window.addEventListener('cmdk:open', onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('cmdk:open', onOpen)
    }
  }, [])

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 10); setQuery(''); setCursor(0) }
  }, [open])

  useEffect(() => { setCursor(0) }, [query])

  function run(item) {
    setOpen(false)
    item.run()
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    if (e.key === 'Enter' && filtered[cursor]) { e.preventDefault(); run(filtered[cursor]) }
  }

  if (!open) return null

  return (
    <>
      <div className="cmdk-bg" onClick={() => setOpen(false)} />
      <div className="cmdk-panel" role="dialog" aria-label="Command palette">
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 18px',
          borderBottom: '1px solid var(--border)',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a Command or Search…"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--t1)', fontSize: 14, fontFamily: 'var(--font)',
              letterSpacing: '-0.01em',
            }}
          />
          <span className="kbd">esc</span>
        </div>

        <div style={{ maxHeight: 360, overflowY: 'auto', padding: '6px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '24px 16px', color: 'var(--t4)', fontSize: 13, textAlign: 'center' }}>
              No results
            </div>
          ) : filtered.map((item, i) => (
            <div
              key={item.id}
              onClick={() => run(item)}
              onMouseEnter={() => setCursor(i)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 7,
                background: cursor === i ? 'rgba(255,255,255,0.055)' : 'transparent',
                cursor: 'pointer',
                transition: 'background 0.08s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <span style={{
                  fontSize: 9.5, color: item.kind === 'action' ? 'var(--brand)' : 'var(--t3)',
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                  fontWeight: 500,
                  width: 46,
                }}>
                  {item.kind === 'action' ? '• run' : '→ page'}
                </span>
                <span style={{ fontSize: 13, color: 'var(--t1)', letterSpacing: '-0.01em' }}>{item.label}</span>
              </div>
              {item.hint && <span className="kbd">{item.hint}</span>}
            </div>
          ))}
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '9px 16px',
          borderTop: '1px solid var(--border)',
          fontSize: 10.5, color: 'var(--t4)',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="kbd">↑↓</span> navigate</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="kbd">↵</span> select</span>
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}><span className="kbd">⌘K</span> toggle</span>
        </div>
      </div>
    </>
  )
}
