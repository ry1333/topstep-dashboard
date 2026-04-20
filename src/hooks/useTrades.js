import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getFakeTrades } from '../lib/demoData'

const isDemo = () => localStorage.getItem('demo') === '1'

export function useTrades() {
  const [trades,  setTrades]  = useState(isDemo() ? getFakeTrades() : [])
  const [loading, setLoading] = useState(!isDemo())

  useEffect(() => {
    if (isDemo()) { setTrades(getFakeTrades()); setLoading(false); return }
    fetchTrades()
    const interval = setInterval(fetchTrades, 5000)
    return () => clearInterval(interval)
  }, [])

  async function fetchTrades() {
    try {
      const { data } = await supabase
        .from('trades')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)
      if (data) setTrades(data)
    } catch(e) {}
    setLoading(false)
  }

  return deriveStats(trades, loading)
}

export function deriveStats(trades, loading = false) {
  const today        = new Date().toDateString()
  const todayTrades  = trades.filter(t => new Date(t.created_at).toDateString() === today)
  const closedTrades = trades.filter(t => t.status === 'closed' && t.pnl != null)

  const pnlToday   = todayTrades.filter(t => t.pnl != null).reduce((s, t) => s + t.pnl, 0)
  const pnlWeek    = closedTrades.filter(t => (new Date() - new Date(t.created_at)) / 864e5 <= 7).reduce((s, t) => s + t.pnl, 0)
  const pnlMonth   = closedTrades.filter(t => new Date(t.created_at).getMonth() === new Date().getMonth()).reduce((s, t) => s + t.pnl, 0)
  const pnlAllTime = closedTrades.reduce((s, t) => s + t.pnl, 0)
  const equityCurve = buildEquityCurve(closedTrades)

  return { trades, loading, pnlToday, pnlWeek, pnlMonth, pnlAllTime, equityCurve, todayTrades }
}

function buildEquityCurve(trades) {
  const sorted = [...trades].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  let equity = 50000
  return sorted.map(t => ({
    time: new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    equity: Math.round((equity += t.pnl)),
  }))
}
