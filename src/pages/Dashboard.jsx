import EquityChart from '../components/EquityChart'
import { useTrades } from '../hooks/useTrades'
import { useBotStatus } from '../hooks/useBotStatus'

const SYM_COLORS = { MES: 'rgba(237,237,237,0.92)', MNQ: 'rgba(237,237,237,0.6)', M2K: 'rgba(237,237,237,0.38)', MYM: 'rgba(237,237,237,0.22)' }

const fmtUSD = v =>
  (v >= 0 ? '+$' : '-$') +
  Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function PnLCell({ label, value }) {
  const pos = value >= 0
  return (
    <div>
      <div style={{ fontSize: 10.5, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 500, marginBottom: 8 }}>
        {label}
      </div>
      <div className="mono tick" key={value} style={{ fontSize: 22, fontWeight: 500, color: pos ? 'var(--profit)' : 'var(--loss)' }}>
        {fmtUSD(value)}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { trades, loading, pnlToday, pnlWeek, pnlMonth, pnlAllTime, equityCurve } = useTrades()
  const { status } = useBotStatus()
  const liveBalance  = status?.balance   ?? null
  const liveDailyPnl = status?.daily_pnl ?? null

  const closed   = trades.filter(t => t.status === 'closed' && t.pnl != null)
  const open     = trades.filter(t => t.status === 'open')
  const wins     = closed.filter(t => t.pnl > 0).length
  const losses   = closed.filter(t => t.pnl <= 0).length
  const winRate  = closed.length ? ((wins / closed.length) * 100).toFixed(1) : '0.0'

  const currentBalance = liveBalance ?? (50000 + pnlAllTime)
  const todayVal       = liveDailyPnl ?? pnlToday
  const todayPos       = todayVal >= 0
  const combinePct     = Math.min(100, Math.max(0, ((currentBalance - 50000) / 3000) * 100))
  const isRunning      = status?.is_running ?? false

  const balanceInt = Math.floor(currentBalance)
  const balanceDec = (currentBalance - balanceInt).toFixed(2).slice(1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }} className="fade-up">

      {/* Hero row: page label + live status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 11, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 500 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </div>
        <div className="status-strip" style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 11.5, color: 'var(--t3)', fontFamily: 'var(--mono)', letterSpacing: '-0.01em' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span className={isRunning ? 'dot-live' : ''} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: isRunning ? 'var(--profit)' : 'var(--t4)',
              display: 'inline-block',
            }} />
            <span style={{ color: isRunning ? 'var(--profit)' : 'var(--t3)' }}>
              {isRunning ? 'bot · live' : 'bot · offline'}
            </span>
          </div>
          {status?.mode && (
            <span style={{ color: status.mode === 'trend' ? 'var(--brand)' : 'var(--t2)' }}>
              mode · {status.mode}
            </span>
          )}
          <span>combine · {combinePct.toFixed(1)}%</span>
          <span>wr · {winRate}%</span>
        </div>
      </div>

      {/* Hero number + equity chart, no container */}
      <div>
        <div className="hero-flex" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 26 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 500, marginBottom: 12 }}>
              Account Balance
            </div>
            <div className="display" style={{
              fontSize: 88, lineHeight: 0.92,
              letterSpacing: '-0.035em', color: '#fff',
              fontVariantNumeric: 'tabular-nums',
            }}>
              ${balanceInt.toLocaleString()}
              <span style={{ color: 'var(--t3)' }}>{balanceDec}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right', paddingBottom: 4 }}>
            <div style={{ fontSize: 11, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 500, marginBottom: 12 }}>
              Today
            </div>
            <div className="mono" style={{
              fontSize: 28, fontWeight: 500,
              color: todayPos ? 'var(--profit)' : 'var(--loss)',
              letterSpacing: '-0.03em',
            }}>
              {fmtUSD(todayVal)}
            </div>
          </div>
        </div>

        <EquityChart data={equityCurve} height={280} />
      </div>

      {/* P&L strip — spacing separates, no dividers */}
      <div className="grid-responsive" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 40,
        paddingTop: 32,
        borderTop: '1px solid var(--border)',
      }}>
        <PnLCell label="Today" value={todayVal} />
        <PnLCell label="7d" value={pnlWeek} />
        <PnLCell label="30d" value={pnlMonth} />
        <PnLCell label="All time" value={pnlAllTime} />
      </div>

      {/* Combine progress — slim inline bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 500 }}>
            Combine target · $3,000
          </div>
          <div className="mono" style={{ fontSize: 12, color: 'var(--t2)' }}>
            {fmtUSD(currentBalance - 50000)} <span style={{ color: 'var(--t4)' }}>/ $3,000.00</span>
          </div>
        </div>
        <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
          <div className="progress-fill" style={{ height: '100%', width: `${combinePct}%`, borderRadius: 3, transition: 'width 0.8s cubic-bezier(0.2,0.8,0.2,1)' }} />
        </div>
      </div>

      {/* Split: open positions + recent trades */}
      <div className="grid-responsive-2" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 48, paddingTop: 8 }}>

        {/* Open positions */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ fontSize: 11, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 500 }}>Open</div>
            <div className="mono" style={{ fontSize: 11, color: open.length > 0 ? 'var(--profit)' : 'var(--t4)' }}>
              {open.length} {open.length === 1 ? 'position' : 'positions'}
            </div>
          </div>
          {open.length === 0 ? (
            <div style={{ color: 'var(--t4)', fontSize: 12.5, padding: '8px 0' }}>No open positions</div>
          ) : open.map(t => (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 0', borderTop: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 3, height: 22, borderRadius: 2, background: SYM_COLORS[t.symbol] ?? 'var(--brand)' }} />
                <div>
                  <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{t.symbol}</div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>
                    {t.contracts}x @ {t.entry_price?.toLocaleString()}
                  </div>
                </div>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 4,
                background: t.side === 'buy' ? 'var(--profit-dim)' : 'var(--loss-dim)',
                color: t.side === 'buy' ? 'var(--profit)' : 'var(--loss)',
                letterSpacing: '0.04em',
              }}>
                {t.side?.toUpperCase()}
              </span>
            </div>
          ))}
        </div>

        {/* Recent trades table */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ fontSize: 11, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 500 }}>Recent trades</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--t4)' }}>
              {wins}w · {losses}l
            </div>
          </div>
          {loading ? (
            <div style={{ color: 'var(--t4)', fontSize: 12.5 }}>Loading…</div>
          ) : closed.length === 0 ? (
            <div style={{ color: 'var(--t4)', fontSize: 12.5 }}>No trades yet</div>
          ) : (
            <table className="clean" style={{ margin: '-12px' }}>
              <thead>
                <tr>
                  <th style={{ paddingLeft: 12 }}>Symbol</th>
                  <th>Side</th>
                  <th style={{ textAlign: 'right' }}>Entry</th>
                  <th style={{ textAlign: 'right' }}>Exit</th>
                  <th style={{ textAlign: 'right' }}>P&amp;L</th>
                  <th style={{ textAlign: 'right', paddingRight: 12 }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {closed.slice(0, 8).map(t => (
                  <tr key={t.id}>
                    <td style={{ paddingLeft: 12 }}>
                      <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: SYM_COLORS[t.symbol] ?? 'var(--brand)' }}>{t.symbol}</span>
                    </td>
                    <td>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
                        background: t.side === 'buy' ? 'var(--profit-dim)' : 'var(--loss-dim)',
                        color: t.side === 'buy' ? 'var(--profit)' : 'var(--loss)',
                        letterSpacing: '0.04em',
                      }}>{t.side?.toUpperCase()}</span>
                    </td>
                    <td className="mono" style={{ textAlign: 'right', color: 'var(--t2)' }}>${t.entry_price?.toLocaleString()}</td>
                    <td className="mono" style={{ textAlign: 'right', color: 'var(--t2)' }}>
                      {t.exit_price ? `$${t.exit_price.toLocaleString()}` : '—'}
                    </td>
                    <td className="mono" style={{
                      textAlign: 'right', fontWeight: 600,
                      color: t.pnl >= 0 ? 'var(--profit)' : 'var(--loss)',
                    }}>
                      {t.pnl >= 0 ? '+' : ''}${t.pnl?.toFixed(2)}
                    </td>
                    <td className="mono" style={{ textAlign: 'right', paddingRight: 12, color: 'var(--t3)', fontSize: 11 }}>
                      {new Date(t.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
