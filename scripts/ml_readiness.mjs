#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const env = Object.fromEntries(
  readFileSync(resolve(here, '..', '.env'), 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)

const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_ANON_KEY
if (!url || !key) { console.error('Missing Supabase env vars'); process.exit(1) }

const sb = createClient(url, key)

const email = process.env.SUPABASE_EMAIL
const password = process.env.SUPABASE_PASSWORD
if (email && password) {
  const { error } = await sb.auth.signInWithPassword({ email, password })
  if (error) { console.error('Sign-in failed:', error.message); process.exit(1) }
  console.log(`Signed in as ${email}\n`)
} else {
  console.log('No SUPABASE_EMAIL/SUPABASE_PASSWORD set — using anon key only.')
  console.log('If your trades table has RLS, results may be empty.\n')
}

const { count, error: countErr } = await sb
  .from('trades')
  .select('*', { count: 'exact', head: true })

if (countErr) { console.error('Query error:', countErr.message); process.exit(1) }
console.log(`Total rows in trades: ${count ?? 0}`)
if (!count) process.exit(0)

const PAGE = 1000
let all = []
for (let from = 0; from < count; from += PAGE) {
  const { data, error } = await sb
    .from('trades')
    .select('*')
    .order('created_at', { ascending: true })
    .range(from, Math.min(from + PAGE - 1, count - 1))
  if (error) { console.error(error.message); process.exit(1) }
  all = all.concat(data)
}

const closed = all.filter(t => t.status === 'closed' && t.pnl != null)
const open = all.filter(t => t.status !== 'closed')
const wins = closed.filter(t => t.pnl > 0)
const losses = closed.filter(t => t.pnl < 0)
const totalPnl = closed.reduce((s, t) => s + Number(t.pnl), 0)

const dates = all.map(t => new Date(t.created_at)).sort((a, b) => a - b)
const first = dates[0]
const last = dates[dates.length - 1]
const days = Math.max(1, Math.round((last - first) / 864e5))

console.log(`Closed:        ${closed.length}`)
console.log(`Open:          ${open.length}`)
console.log(`Date range:    ${first.toISOString().slice(0, 10)} → ${last.toISOString().slice(0, 10)} (${days} days)`)
console.log(`Trades/day:    ${(closed.length / days).toFixed(2)}`)
console.log(`Win rate:      ${closed.length ? ((wins.length / closed.length) * 100).toFixed(1) : '0'}%`)
console.log(`Total PnL:     $${totalPnl.toFixed(2)}`)
console.log(`Avg trade:     $${closed.length ? (totalPnl / closed.length).toFixed(2) : '0'}`)

const grossWin = wins.reduce((s, t) => s + Number(t.pnl), 0)
const grossLoss = Math.abs(losses.reduce((s, t) => s + Number(t.pnl), 0))
console.log(`Profit factor: ${grossLoss ? (grossWin / grossLoss).toFixed(2) : '∞'}`)

const groupBy = (arr, key) => arr.reduce((m, t) => {
  const k = t[key] ?? 'unknown'
  ;(m[k] ??= []).push(t)
  return m
}, {})

const printBreakdown = (label, key) => {
  const groups = groupBy(closed, key)
  const rows = Object.entries(groups)
    .map(([k, ts]) => {
      const pnl = ts.reduce((s, t) => s + Number(t.pnl), 0)
      const wr = ts.filter(t => t.pnl > 0).length / ts.length
      return { k, n: ts.length, pnl, wr }
    })
    .sort((a, b) => b.n - a.n)
  if (!rows.length) return
  console.log(`\n${label}:`)
  console.log(`  ${'name'.padEnd(24)} ${'n'.padStart(5)}  ${'wr%'.padStart(6)}  ${'pnl'.padStart(10)}`)
  for (const r of rows) {
    console.log(`  ${String(r.k).padEnd(24)} ${String(r.n).padStart(5)}  ${(r.wr * 100).toFixed(1).padStart(6)}  ${r.pnl.toFixed(2).padStart(10)}`)
  }
}

const sample = all[0] ?? {}
if ('strategy' in sample) printBreakdown('By strategy', 'strategy')
if ('symbol' in sample) printBreakdown('By symbol', 'symbol')
if ('instrument' in sample) printBreakdown('By instrument', 'instrument')

const verdict = (n) => {
  if (n < 500) return 'TOO FEW — keep backtest-trained models, use live as validation only.'
  if (n < 2000) return 'BORDERLINE — can fine-tune existing GBT on live, blended with backtest.'
  return 'READY — can train a live-only filter model.'
}
console.log(`\nML readiness (closed trades = ${closed.length}): ${verdict(closed.length)}`)
console.log('Available columns:', Object.keys(sample).join(', '))
