import { useMemo } from 'react'
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import HudCard from '../components/HudCard'
import MetricTile from '../components/MetricTile'
import Sparkline from '../components/Sparkline'
import PnlHeatmap from '../components/PnlHeatmap'
import { useBotStatus } from '../hooks/useBotStatus'
import { useTrades } from '../hooks/useTrades'

const SYM_TONE = { MES: 'var(--cy)', MNQ: 'var(--brand)', M2K: 'var(--t2)', MYM: 'var(--t3)' }

const fmtUSD = v =>
  (v == null ? '—' :
    (v >= 0 ? '+$' : '-$') +
    Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))

export default function Dashboard() {
  const { trades, loading, pnlToday, pnlWeek, pnlMonth, pnlAllTime, equityCurve } = useTrades()
  const { status } = useBotStatus()
  const liveBalance = status?.balance ?? null
  const liveDailyPnl = status?.daily_pnl ?? null

  const closed = trades.filter(t => t.status === 'closed' && t.pnl != null)
  const open = trades.filter(t => t.status === 'open')
  const wins = closed.filter(t => t.pnl > 0)
  const losses = closed.filter(t => t.pnl <= 0)
  const winRate = closed.length ? (wins.length / closed.length) : 0
  const avgWin = wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0
  const avgLoss = losses.length ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0
  const pf = losses.length && Math.abs(avgLoss) > 0 ? (avgWin / Math.abs(avgLoss)) : Infinity
  const expectancy = closed.length ? closed.reduce((s, t) => s + t.pnl, 0) / closed.length : 0

  const currentBalance = liveBalance ?? (50000 + (pnlAllTime || 0))
  const todayVal = liveDailyPnl ?? pnlToday
  const todayPos = (todayVal ?? 0) >= 0
  const combinePct = Math.min(100, Math.max(0, ((currentBalance - 50000) / 3000) * 100))
  const isRunning = status?.is_running ?? false

  const balanceInt = Math.floor(currentBalance)
  const balanceDec = (currentBalance - balanceInt).toFixed(2).slice(1)

  // sparklines
  const equitySpark = (equityCurve || []).slice(-200).map(p => p.equity ?? p.value ?? 0)
  const recentPnls = closed.slice(0, 30).map(t => t.pnl).reverse()

  // daily heatmap from trades
  const dailyPnl = useMemo(() => {
    const out = {}
    closed.forEach(t => {
      const d = new Date(t.created_at).toISOString().slice(0, 10)
      out[d] = (out[d] || 0) + t.pnl
    })
    return out
  }, [closed])

  // symbol breakdown
  const bySymbol = useMemo(() => {
    const m = {}
    closed.forEach(t => {
      const s = t.symbol || 'UNK'
      if (!m[s]) m[s] = { n: 0, pnl: 0, wins: 0 }
      m[s].n++; m[s].pnl += t.pnl
      if (t.pnl > 0) m[s].wins++
    })
    return Object.entries(m).map(([sym, v]) => ({ sym, ...v })).sort((a, b) => b.pnl - a.pnl)
  }, [closed])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }} className="fade-up">
      {/* ── Hero header: balance + live status ─────────────────────────── */}
      <div className="page-head" style={{ marginBottom: 0, paddingBottom: 22 }}>
        <div>
          <div className="crumbs">control / overview · {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18 }}>
            <div>
              <div className="cap" style={{ marginBottom: 8 }}>ACCOUNT BALANCE · USD</div>
              <div className="mono" style={{ fontSize: 64, fontWeight: 600, lineHeight: 0.92, letterSpacing: '-0.04em', color: '#fff' }}>
                ${balanceInt.toLocaleString()}<span style={{ color: 'var(--t3)' }}>{balanceDec}</span>
              </div>
            </div>
            <div style={{ paddingBottom: 6 }}>
              <Sparkline data={equitySpark.length > 1 ? equitySpark : [50000, currentBalance]} width={180} height={42}
                stroke={(currentBalance - 50000) >= 0 ? 'var(--profit)' : 'var(--loss)'}
                baseline={50000}
              />
              <div className="cap" style={{ marginTop: 4 }}>EQUITY · 200d</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
          <span className={`chip-hud ${isRunning ? 'pl' : ''}`}>
            <span className={isRunning ? 'dot dot-live' : 'dot'} />
            {isRunning ? 'BOT · ACTIVE' : 'BOT · OFFLINE'}
          </span>
          {status?.mode && <span className="chip-hud cy"><span className="dot" /> MODE · {status.mode.toUpperCase()}</span>}
          <span className="chip-hud"><span style={{ color: 'var(--t4)' }}>WR</span> <span style={{ color: 'var(--t1)' }}>{(winRate * 100).toFixed(1)}%</span></span>
        </div>
      </div>

      {/* ── KPI strip ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 0 }}>
        <MetricTile label="TODAY" value={fmtUSD(todayVal)} tone={todayPos ? 'pos' : 'neg'} flash />
        <MetricTile label="7D" value={fmtUSD(pnlWeek)} tone={(pnlWeek ?? 0) >= 0 ? 'pos' : 'neg'} spark={recentPnls} />
        <MetricTile label="30D" value={fmtUSD(pnlMonth)} tone={(pnlMonth ?? 0) >= 0 ? 'pos' : 'neg'} />
        <MetricTile label="ALL TIME" value={fmtUSD(pnlAllTime)} tone={(pnlAllTime ?? 0) >= 0 ? 'pos' : 'neg'} sub={`${closed.length} trades`} />
        <MetricTile label="PROFIT FACTOR" value={isFinite(pf) ? pf.toFixed(2) : '∞'} tone={pf >= 1 ? 'pos' : 'neg'} sub={`avg ${fmtUSD(avgWin)} / ${fmtUSD(avgLoss)}`} />
        <MetricTile label="EXPECTANCY" value={fmtUSD(expectancy)} tone={expectancy >= 0 ? 'pos' : 'neg'} sub="per trade" />
      </div>

      {/* ── Equity curve large ────────────────────────────────────────── */}
      <HudCard style={{ padding: 18 }}>
        <div className="sec-title">
          equity curve
          <span className="count">{(equityCurve || []).length} samples</span>
        </div>
        {equityCurve && equityCurve.length > 1 ? (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={equityCurve} margin={{ top: 4, right: 12, bottom: 0, left: -12 }}>
              <defs>
                <linearGradient id="ovGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5eead4" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="#5eead4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="var(--t4)" tick={{ fontSize: 10, fontFamily: 'var(--mono)', fill: 'var(--t4)' }} axisLine={{ stroke: 'var(--hud-edge)' }} tickLine={false} />
              <YAxis tickFormatter={v => '$' + (v >= 1000 ? (v/1000).toFixed(1) + 'k' : v.toFixed(0))} stroke="var(--t4)" tick={{ fontSize: 10, fontFamily: 'var(--mono)', fill: 'var(--t4)' }} axisLine={false} tickLine={false} width={60} domain={['auto','auto']} />
              <Tooltip
                contentStyle={{ background: 'rgba(8,8,10,0.95)', border: '1px solid var(--cy-edge)', borderRadius: 0, fontSize: 11, fontFamily: 'var(--mono)' }}
                labelStyle={{ color: 'var(--t3)', fontSize: 10, letterSpacing: '0.1em' }}
                itemStyle={{ color: 'var(--t1)' }}
              />
              <ReferenceLine y={50000} stroke="var(--t4)" strokeDasharray="2 5" strokeOpacity={0.5} />
              <Area dataKey="equity" stroke="#5eead4" fill="url(#ovGrad)" strokeWidth={1.4} dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="cap" style={{ color: 'var(--t4)', padding: '40px 0' }}>NO DATA</div>
        )}
      </HudCard>

      {/* ── Combine progress & symbol breakdown row ────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <HudCard style={{ padding: 18 }}>
          <div className="sec-title">
            $50K combine · target $52K
            <span className="count">{combinePct.toFixed(1)}% complete</span>
          </div>
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.04)', position: 'relative', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${combinePct}%`,
                background: 'linear-gradient(90deg, var(--profit), var(--cy))',
                boxShadow: '0 0 16px var(--cy-soft)',
                transition: 'width 0.8s cubic-bezier(0.2,0.8,0.2,1)',
              }} />
            </div>
            <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 10.5 }}>
              <span style={{ color: 'var(--t4)' }}>$50,000</span>
              <span style={{ color: combinePct >= 50 ? 'var(--cy)' : 'var(--t3)' }}>
                {fmtUSD(currentBalance - 50000)} / $3,000
              </span>
              <span style={{ color: 'var(--t4)' }}>$52,000</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, paddingTop: 14, borderTop: '1px solid var(--hud-edge)' }}>
            <Mini label="DAILY LIMIT" value="-$1,000" tone="neg" />
            <Mini label="TRAILING DD" value="-$2,000" tone="neg" />
            <Mini label="MIN DAYS" value="5d active" tone="cy" />
          </div>
        </HudCard>

        <HudCard style={{ padding: 18 }}>
          <div className="sec-title">
            by symbol
            <span className="count">{bySymbol.length} contracts</span>
          </div>
          {bySymbol.length === 0 ? (
            <div style={{ color: 'var(--t4)', fontSize: 11, padding: '20px 0' }} className="cap">NO TRADES</div>
          ) : (
            <table className="term">
              <thead>
                <tr>
                  <th>SYM</th>
                  <th className="r">N</th>
                  <th className="r">WR</th>
                  <th className="r">PNL</th>
                  <th>RATIO</th>
                </tr>
              </thead>
              <tbody>
                {bySymbol.map(s => {
                  const wr = s.wins / s.n
                  const total = bySymbol.reduce((sum, x) => sum + Math.abs(x.pnl), 0)
                  const pct = total > 0 ? (Math.abs(s.pnl) / total) * 100 : 0
                  return (
                    <tr key={s.sym}>
                      <td><span style={{ color: SYM_TONE[s.sym] || 'var(--t2)', fontWeight: 600 }}>{s.sym}</span></td>
                      <td className="r" style={{ color: 'var(--t2)' }}>{s.n}</td>
                      <td className="r" style={{ color: wr >= 0.5 ? 'var(--profit)' : 'var(--t2)' }}>{(wr * 100).toFixed(0)}%</td>
                      <td className="r" style={{ color: s.pnl >= 0 ? 'var(--profit)' : 'var(--loss)', fontWeight: 600 }}>{fmtUSD(s.pnl)}</td>
                      <td>
                        <div style={{ height: 4, background: 'rgba(255,255,255,0.04)', position: 'relative' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: s.pnl >= 0 ? 'var(--profit)' : 'var(--loss)', opacity: 0.7 }} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </HudCard>
      </div>

      {/* ── Daily PnL heatmap ─────────────────────────────────────────── */}
      <HudCard style={{ padding: 18 }}>
        <div className="sec-title">
          daily pnl heat · last 90d
          <span className="count">
            {Object.values(dailyPnl).filter(v => v > 0).length} green · {Object.values(dailyPnl).filter(v => v < 0).length} red
          </span>
        </div>
        <PnlHeatmap daily={dailyPnl} days={90} height={120} />
      </HudCard>

      {/* ── Open positions + Recent trades ────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16 }}>
        <HudCard style={{ padding: 0 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--hud-edge)' }}>
            <div className="sec-title" style={{ marginBottom: 0 }}>
              open positions
              <span className="count" style={{ color: open.length > 0 ? 'var(--cy)' : 'var(--t4)' }}>
                {open.length} · live
              </span>
            </div>
          </div>
          <div style={{ padding: open.length === 0 ? 24 : 0 }}>
            {open.length === 0 ? (
              <div className="cap" style={{ color: 'var(--t4)' }}>NO OPEN POSITIONS</div>
            ) : (
              <table className="term">
                <thead>
                  <tr>
                    <th>SYM</th>
                    <th>SIDE</th>
                    <th className="r">QTY</th>
                    <th className="r">ENTRY</th>
                  </tr>
                </thead>
                <tbody>
                  {open.map(t => (
                    <tr key={t.id}>
                      <td><span style={{ color: SYM_TONE[t.symbol] || 'var(--t2)', fontWeight: 600 }}>{t.symbol}</span></td>
                      <td>
                        <span className={`chip-hud ${t.side === 'buy' ? 'pl' : 'ls'}`} style={{ fontSize: 9 }}>{t.side?.toUpperCase()}</span>
                      </td>
                      <td className="r" style={{ color: 'var(--t2)' }}>{t.contracts}</td>
                      <td className="r" style={{ color: 'var(--t1)' }}>${t.entry_price?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </HudCard>

        <HudCard style={{ padding: 0 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--hud-edge)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="sec-title" style={{ marginBottom: 0 }}>
              recent trades
              <span className="count">{wins.length}w · {losses.length}l</span>
            </div>
          </div>
          {loading ? <div className="cap" style={{ padding: 20 }}>LOADING…</div> :
           closed.length === 0 ? <div className="cap" style={{ padding: 20 }}>NO TRADES</div> : (
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              <table className="term">
                <thead>
                  <tr>
                    <th>TIME</th>
                    <th>SYM</th>
                    <th>SIDE</th>
                    <th className="r">ENTRY</th>
                    <th className="r">EXIT</th>
                    <th className="r">PNL</th>
                  </tr>
                </thead>
                <tbody>
                  {closed.slice(0, 12).map(t => (
                    <tr key={t.id}>
                      <td style={{ color: 'var(--t4)' }}>
                        {new Date(t.created_at).toLocaleString('en-US', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td><span style={{ color: SYM_TONE[t.symbol] || 'var(--t2)', fontWeight: 600 }}>{t.symbol}</span></td>
                      <td><span className={`chip-hud ${t.side === 'buy' ? 'pl' : 'ls'}`} style={{ fontSize: 9, padding: '1px 5px' }}>{t.side?.toUpperCase()}</span></td>
                      <td className="r" style={{ color: 'var(--t2)' }}>${t.entry_price?.toLocaleString()}</td>
                      <td className="r" style={{ color: 'var(--t2)' }}>{t.exit_price ? `$${t.exit_price.toLocaleString()}` : '—'}</td>
                      <td className="r" style={{ color: t.pnl >= 0 ? 'var(--profit)' : 'var(--loss)', fontWeight: 600 }}>{fmtUSD(t.pnl)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </HudCard>
      </div>
    </div>
  )
}

function Mini({ label, value, tone = 'neutral' }) {
  const c = { neutral: 'var(--t1)', pos: 'var(--profit)', neg: 'var(--loss)', cy: 'var(--cy)' }[tone]
  return (
    <div>
      <div className="cap" style={{ fontSize: 9, marginBottom: 4 }}>{label}</div>
      <div className="mono" style={{ fontSize: 14, color: c, fontWeight: 500 }}>{value}</div>
    </div>
  )
}
