import { useState, useEffect, useRef, useCallback } from 'react'
import * as signalR from '@microsoft/signalr'

const BASE = 'https://api.topstepx.com/api'
const HUB  = 'https://rtc.topstepx.com/hubs/user'

const POINT_VALUES = { MES: 5, MNQ: 2, M2K: 5, MYM: 0.5 }

function normalizeTrades(raw) {
  // ProjectX /Trade/search returns half-turns — pair them up
  const byPaired = {}
  const openers  = []

  for (const t of raw) {
    if (t.profitAndLoss != null) {
      // closing leg — has pnl
      byPaired[t.id] = t
    } else {
      openers.push(t)
    }
  }

  return openers.map(o => {
    const closer = byPaired[o.pairedTradeId] ?? null
    const sym    = (o.contractName ?? '').split(' ')[0]
    return {
      id:          o.id,
      created_at:  o.createdAt,
      symbol:      sym,
      side:        (o.side ?? '').toLowerCase(),
      entry_price: o.price,
      exit_price:  closer?.price ?? null,
      pnl:         closer?.profitAndLoss ?? null,
      contracts:   o.size ?? o.lots ?? 1,
      reason:      o.orderCreationDisposition ?? null,
      status:      closer ? 'closed' : 'open',
    }
  }).filter(t => t.symbol)
}

export function useTopstepX() {
  const [token,    setToken]    = useState(() => localStorage.getItem('tsx_token') ?? null)
  const [accountId,setAccountId]= useState(() => localStorage.getItem('tsx_account_id') ? Number(localStorage.getItem('tsx_account_id')) : null)
  const [trades,   setTrades]   = useState([])
  const [account,  setAccount]  = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [connected,setConnected]= useState(false)
  const hubRef = useRef(null)

  const login = useCallback(async (userName, apiKey) => {
    setLoading(true); setError(null)
    try {
      const r = await fetch(`${BASE}/Auth/loginKey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName, apiKey }),
      })
      const d = await r.json()
      console.log('TopstepX auth response:', d)
      if (!d.success) throw new Error(d.errorMessage || `Login failed (code ${d.errorCode ?? 'unknown'})`)
      localStorage.setItem('tsx_token', d.token)
      localStorage.setItem('tsx_username', userName)
      localStorage.setItem('tsx_api_key', apiKey)
      setToken(d.token)
      return d.token
    } catch(e) {
      const msg = e.message === 'Failed to fetch'
        ? 'Network error — TopstepX API may be blocking browser requests (CORS). Use the bot to sync data instead.'
        : e.message
      setError(msg); setLoading(false); throw e
    }
  }, [])

  const fetchAccount = useCallback(async (tok) => {
    const r = await fetch(`${BASE}/Account/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
      body: JSON.stringify({}),
    })
    const d = await r.json()
    if (!d.success || !d.accounts?.length) throw new Error('No accounts found')
    const acc = d.accounts[0]
    localStorage.setItem('tsx_account_id', acc.id)
    setAccountId(acc.id)
    setAccount(acc)
    return acc
  }, [])

  const fetchTrades = useCallback(async (tok, accId) => {
    const start = new Date()
    start.setMonth(start.getMonth() - 3)
    const r = await fetch(`${BASE}/Trade/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
      body: JSON.stringify({ accountId: accId, startTimestamp: start.toISOString() }),
    })
    const d = await r.json()
    if (!d.success) throw new Error(d.errorMessage || 'Failed to fetch trades')
    return normalizeTrades(d.trades ?? [])
  }, [])

  const connectHub = useCallback((tok, accId) => {
    if (hubRef.current) hubRef.current.stop()

    const hub = new signalR.HubConnectionBuilder()
      .withUrl(`${HUB}?access_token=${tok}`, {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    hub.on('GatewayUserTrade', (data) => {
      const raw = Array.isArray(data) ? data : [data]
      setTrades(prev => {
        const updated = [...prev]
        for (const t of raw) {
          const sym = (t.contractName ?? '').split(' ')[0]
          if (t.profitAndLoss != null) {
            // closing trade — update existing opener
            const idx = updated.findIndex(x => x.id === t.pairedTradeId)
            if (idx >= 0) {
              updated[idx] = { ...updated[idx], exit_price: t.price, pnl: t.profitAndLoss, status: 'closed' }
            }
          } else {
            // opening trade
            if (!updated.find(x => x.id === t.id)) {
              updated.unshift({
                id: t.id, created_at: t.createdAt, symbol: sym,
                side: (t.side ?? '').toLowerCase(), entry_price: t.price,
                exit_price: null, pnl: null,
                contracts: t.lots ?? t.size ?? 1,
                reason: t.orderCreationDisposition ?? null,
                status: 'open',
              })
            }
          }
        }
        return updated
      })
    })

    hub.on('GatewayUserAccount', (data) => {
      setAccount(prev => prev ? { ...prev, ...data } : data)
    })

    hub.start()
      .then(() => setConnected(true))
      .catch(e => console.warn('SignalR connect failed:', e))

    hub.onclose(() => setConnected(false))
    hub.onreconnected(() => setConnected(true))
    hubRef.current = hub
  }, [])

  const initialize = useCallback(async (tok) => {
    try {
      const acc = await fetchAccount(tok)
      const tr  = await fetchTrades(tok, acc.id)
      setTrades(tr)
      connectHub(tok, acc.id)
    } catch(e) {
      if (e.message?.includes('401') || e.message?.includes('auth')) {
        localStorage.removeItem('tsx_token')
        setToken(null)
      }
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [fetchAccount, fetchTrades, connectHub])

  // Auto-init if we have a saved token
  useEffect(() => {
    if (token) { setLoading(true); initialize(token) }
    return () => { hubRef.current?.stop() }
  }, []) // eslint-disable-line

  const connect = useCallback(async (userName, apiKey) => {
    const tok = await login(userName, apiKey)
    setLoading(true)
    await initialize(tok)
  }, [login, initialize])

  const disconnect = useCallback(() => {
    hubRef.current?.stop()
    localStorage.removeItem('tsx_token')
    localStorage.removeItem('tsx_account_id')
    localStorage.removeItem('tsx_username')
    localStorage.removeItem('tsx_api_key')
    setToken(null); setAccountId(null); setTrades([]); setAccount(null); setConnected(false)
  }, [])

  const refresh = useCallback(() => {
    if (token) { setLoading(true); initialize(token) }
  }, [token, initialize])

  return {
    isConnected: !!token,
    hubConnected: connected,
    loading, error,
    trades, account,
    connect, disconnect, refresh,
  }
}
