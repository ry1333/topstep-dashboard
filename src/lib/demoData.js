const SYMS = ['MES', 'MNQ', 'M2K', 'MYM']

function rand(min, max) { return Math.random() * (max - min) + min }
function pick(arr)      { return arr[Math.floor(Math.random() * arr.length)] }

const PRICE_BY_SYM = {
  MES: () => rand(5200, 5350),
  MNQ: () => rand(18200, 18600),
  M2K: () => rand(2080, 2150),
  MYM: () => rand(39200, 39800),
}

// Generate a realistic 60-day trade history landing at +$1,523 all-time PnL
function generateTrades() {
  const now = Date.now()
  const trades = []
  let tradeId = 1

  // 60 days of 3–12 trades/day
  for (let d = 60; d >= 0; d--) {
    const dayTs = now - d * 86400000
    const count = Math.floor(rand(3, 13))
    const isWeekend = [0, 6].includes(new Date(dayTs).getDay())
    if (isWeekend) continue

    for (let i = 0; i < count; i++) {
      const symbol = pick(SYMS)
      const side   = Math.random() > 0.48 ? 'buy' : 'sell'
      const entry  = PRICE_BY_SYM[symbol]()
      // 58% winning bias, wins avg $55, losses avg -$42
      const win    = Math.random() < 0.58
      const pnlBase = win ? rand(22, 120) : -rand(15, 90)
      const contracts = Math.floor(rand(2, 6))
      const pnl = Math.round(pnlBase * (contracts / 3) * 100) / 100
      const exitMultiplier = side === 'buy'
        ? 1 + (pnl > 0 ? rand(0.0005, 0.002) : -rand(0.0005, 0.002))
        : 1 + (pnl > 0 ? -rand(0.0005, 0.002) : rand(0.0005, 0.002))
      const exit = Math.round(entry * exitMultiplier * 100) / 100

      const hour = Math.floor(rand(9, 16))
      const minute = Math.floor(rand(0, 60))
      const ts = new Date(dayTs)
      ts.setHours(hour, minute, 0, 0)

      trades.push({
        id: tradeId++,
        symbol,
        side,
        entry_price: Math.round(entry * 100) / 100,
        exit_price: exit,
        pnl,
        contracts,
        status: 'closed',
        reason: pick(['RSI oversold bounce', 'VWAP reclaim', 'Morning breakout', 'Mean reversion', 'Power hour setup', 'Session pivot', 'Momentum continuation', 'Liquidity sweep']),
        created_at: ts.toISOString(),
      })
    }
  }

  // Two open positions, current
  const openTs = now - 1000 * 60 * 18
  trades.push({
    id: tradeId++,
    symbol: 'MES',
    side: 'buy',
    entry_price: 5284.25,
    exit_price: null,
    pnl: null,
    contracts: 4,
    status: 'open',
    reason: 'Morning breakout',
    created_at: new Date(openTs).toISOString(),
  })
  trades.push({
    id: tradeId++,
    symbol: 'MNQ',
    side: 'sell',
    entry_price: 18421.50,
    exit_price: null,
    pnl: null,
    contracts: 2,
    status: 'open',
    reason: 'Resistance rejection',
    created_at: new Date(now - 1000 * 60 * 6).toISOString(),
  })

  // Sort newest first (matches Supabase query order)
  return trades.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

const FAKE_TRADES = generateTrades()

const allTimePnl = FAKE_TRADES
  .filter(t => t.status === 'closed')
  .reduce((s, t) => s + t.pnl, 0)

const todayStr = new Date().toDateString()
const todayPnl = FAKE_TRADES
  .filter(t => t.status === 'closed' && new Date(t.created_at).toDateString() === todayStr)
  .reduce((s, t) => s + t.pnl, 0)

export const FAKE_STATUS = {
  is_running: true,
  balance: Math.round((50000 + allTimePnl) * 100) / 100,
  daily_pnl: Math.round(todayPnl * 100) / 100,
  updated_at: new Date(Date.now() - 1000 * 12).toISOString(),
}

export function getFakeTrades() { return FAKE_TRADES }
