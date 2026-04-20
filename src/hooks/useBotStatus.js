import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { FAKE_STATUS } from '../lib/demoData'

const isDemo = () => localStorage.getItem('demo') === '1'

export function useBotStatus() {
  const [status,  setStatus]  = useState(isDemo() ? FAKE_STATUS : null)
  const [loading, setLoading] = useState(!isDemo())

  useEffect(() => {
    if (isDemo()) { setStatus(FAKE_STATUS); setLoading(false); return }
    fetchStatus()
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [])

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
    await supabase.from('bot_commands').insert({ command, executed: false })
    setTimeout(fetchStatus, 1000)
  }

  return { status, loading, sendCommand }
}
