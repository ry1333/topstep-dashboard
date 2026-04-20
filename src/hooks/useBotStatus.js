import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { FAKE_STATUS } from '../lib/demoData'

const isDemo = () => localStorage.getItem('demo') === '1'

export function useBotStatus() {
  const [status,  setStatus]  = useState(isDemo() ? FAKE_STATUS : null)
  const [loading, setLoading] = useState(!isDemo())
  const [pending, setPending] = useState(null) // 'start' | 'stop' | null
  const pendingTimeout = useRef(null)

  useEffect(() => {
    if (isDemo()) { setStatus(FAKE_STATUS); setLoading(false); return }
    fetchStatus()
    const interval = setInterval(fetchStatus, 3000)
    return () => clearInterval(interval)
  }, [])

  // Auto-clear pending once status reflects the intended change
  useEffect(() => {
    if (!pending || !status) return
    const done =
      (pending === 'start' && status.is_running === true) ||
      (pending === 'stop'  && status.is_running === false)
    if (done) {
      setPending(null)
      if (pendingTimeout.current) clearTimeout(pendingTimeout.current)
    }
  }, [pending, status])

  async function fetchStatus() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await supabase
        .from('bot_status')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      if (data) setStatus(data)
    } catch(e) {}
    setLoading(false)
  }

  async function sendCommand(command) {
    if (isDemo()) return
    if (command === 'start' || command === 'stop') {
      setPending(command)
      // Safety fallback: clear pending after 25s regardless
      if (pendingTimeout.current) clearTimeout(pendingTimeout.current)
      pendingTimeout.current = setTimeout(() => setPending(null), 25000)
    }
    await supabase.from('bot_commands').insert({ command, executed: false })
    setTimeout(fetchStatus, 1500)
  }

  return { status, loading, pending, sendCommand }
}
