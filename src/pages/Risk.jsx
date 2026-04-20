import { useTrades } from '../hooks/useTrades'
import { useBotStatus } from '../hooks/useBotStatus'

const DD_LIMIT      = 2000
const DAILY_LIMIT   = 800
const INST_LIMIT    = 300
const PROFIT_TARGET = 3000
const SYMS = ['MES','MNQ','M2K','MYM']
const SYM_COLORS = { MES: 'rgba(237,237,237,0.92)', MNQ: 'rgba(237,237,237,0.6)', M2K: 'rgba(237,237,237,0.38)', MYM: 'rgba(237,237,237,0.22)' }

function statusColor(pct) {
  if (pct < 0.5) return 'var(--profit)'
  if (pct < 0.8) return 'var(--warn)'
  return 'var(--loss)'
}

function RiskBudget({ used, limit }) {
  const pct = Math.min(1, used / limit)
  const pos = pct < 0.5
  const warn = pct >= 0.5 && pct < 0.8
  return (
    <div>
      <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
        {/* Zone segments — subtle */}
        <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '50%', background: 'rgba(139,92,246,0.06)' }} />
        <div style={{ position: 'absolute', top: 0, left: '50%', height: '100%', width: '30%', background: 'rgba(245,165,36,0.06)' }} />
        <div style={{ position: 'absolute', top: 0, left: '80%', height: '100%', width: '20%', background: 'rgba(239,68,68,0.08)' }} />
        {/* Fill */}
        <div style={{
          position: 'absolute', top: 0, left: 0,
          height: '100%', width: `${pct * 100}%`,
          background: pos ? 'var(--profit)' : warn ? 'var(--warn)' : 'var(--loss)',
          borderRadius: 4,
          transition: 'width 1s cubic-bezier(0.2,0.8,0.2,1)',
        }} />
      </div>
      <div className="mono" style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 10.5, color: 'var(--t4)', marginTop: 6,
      }}>
        <span>safe</span>
        <span style={{ marginLeft: '40%' }}>caution</span>
        <span>danger</span>
      </div>
    </div>
  )
}

export default function Risk() {
  const { trades, pnlToday, pnlAllTime } = useTrades()
  const { status } = useBotStatus()

  const closed   = trades.filter(t => t.status === 'closed' && t.pnl != null)
  const maxDD    = Math.min(0, pnlAllTime)
  const ddUsed   = Math.abs(maxDD)
  const ddPct    = ddUsed / DD_LIMIT

  const dailyUsed = Math.abs(Math.min(0, pnlToday))
  const dailyPct  = dailyUsed / DAILY_LIMIT

  const combinePct = Math.max(0, pnlAllTime) / PROFIT_TARGET

  const today = new Date().toDateString()
  const todayTrades = closed.filter(t => new Date(t.created_at).toDateString() === today)

  const rules = [
    { label: 'Daily loss < $800',     ok: pnlToday > -DAILY_LIMIT },
    { label: 'Total drawdown < $2,000', ok: Math.abs(maxDD) < DD_LIMIT },
    { label: 'No overnight positions', ok: trades.filter(t => t.status === 'open').length === 0 },
    { label: 'Bot within trading hours', ok: status?.is_running ?? false },
    { label: 'Combine target progress', ok: pnlAllTime > 0 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }} className="fade-up">

      {/* Header */}
      <div>
        <div style={{ fontSize: 11, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 500, marginBottom: 10 }}>
          Monitor
        </div>
        <h1 className="title" style={{ fontSize: 44 }}>
          Risk
        </h1>
      </div>

      {/* Hero: overall risk budget */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 500 }}>
            Drawdown budget
          </div>
          <div className="mono" style={{ fontSize: 11, color: statusColor(ddPct) }}>
            {ddPct < 0.5 ? 'safe' : ddPct < 0.8 ? 'caution' : 'danger'}
          </div>
        </div>

        <div className="display" style={{ fontSize: 72, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 16, color: statusColor(ddPct), fontVariantNumeric: 'tabular-nums' }}>
          ${ddUsed.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          <span style={{ color: 'var(--t4)', fontSize: 28, marginLeft: 14 }}>
            / {DD_LIMIT.toLocaleString()}
          </span>
        </div>

        <RiskBudget used={ddUsed} limit={DD_LIMIT} />
      </div>

      {/* Three text-forward limit stats */}
      <div className="grid-responsive" style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: 44, paddingTop: 28,
        borderTop: '1px solid var(--border)',
      }}>
        {[
          { label: 'Daily loss used', used: dailyUsed, limit: DAILY_LIMIT, pct: dailyPct, color: statusColor(dailyPct) },
          { label: 'Combine progress', used: Math.max(0, pnlAllTime), limit: PROFIT_TARGET, pct: combinePct, color: 'var(--brand)' },
          { label: 'Open positions', used: trades.filter(t => t.status === 'open').length, limit: 4, pct: trades.filter(t => t.status === 'open').length / 4, color: 'var(--t1)', raw: true },
        ].map(s => (
          <div key={s.label}>
            <div style={{ fontSize: 10.5, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 500, marginBottom: 10 }}>
              {s.label}
            </div>
            <div className="mono" style={{ fontSize: 26, fontWeight: 500, color: s.color, letterSpacing: '-0.03em', lineHeight: 1 }}>
              {s.raw ? s.used : `$${s.used.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
              <span style={{ color: 'var(--t4)', fontWeight: 400, fontSize: 14, marginLeft: 8 }}>
                {s.raw ? `/ ${s.limit}` : `/ ${s.limit.toLocaleString()}`}
              </span>
            </div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--t3)', marginTop: 6 }}>
              {(s.pct * 100).toFixed(1)}%
            </div>
          </div>
        ))}
      </div>

      {/* Per-instrument heatmap strip */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 500 }}>
            Instrument caps · today
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--t4)' }}>
            ${INST_LIMIT} limit each
          </div>
        </div>
        <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {SYMS.map(s => {
            const loss = Math.abs(Math.min(0, todayTrades.filter(t => t.symbol === s).reduce((a, t) => a + t.pnl, 0)))
            const pct  = Math.min(1, loss / INST_LIMIT)
            const bgAlpha = 0.05 + pct * 0.25
            const color = statusColor(pct)
            return (
              <div key={s} style={{
                padding: '20px 22px',
                background: `linear-gradient(180deg, rgba(239,68,68,${bgAlpha}) 0%, var(--bg2) 100%)`,
                borderRadius: 10,
                boxShadow: 'inset 0 1px 0 rgba(237,237,237,0.035)',
                position: 'relative',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 3, height: 12, borderRadius: 2, background: SYM_COLORS[s] }} />
                  <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)' }}>{s}</span>
                </div>
                <div className="mono" style={{ fontSize: 18, fontWeight: 500, color: loss > 0 ? color : 'var(--t3)', letterSpacing: '-0.02em' }}>
                  {loss > 0 ? `-$${loss.toFixed(0)}` : '$0'}
                </div>
                <div className="mono" style={{ fontSize: 10.5, color: 'var(--t4)', marginTop: 4 }}>
                  {(pct * 100).toFixed(0)}% used
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Rules — mono checklist, no colored rows */}
      <div>
        <div style={{ fontSize: 11, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 500, marginBottom: 18 }}>
          Combine rules
        </div>
        <div className="mono" style={{ display: 'flex', flexDirection: 'column' }}>
          {rules.map(r => (
            <div key={r.label} style={{
              display: 'grid', gridTemplateColumns: '24px 1fr 60px',
              alignItems: 'center', gap: 10,
              padding: '13px 0',
              borderTop: '1px solid var(--border)',
              fontSize: 12.5,
            }}>
              <span style={{ color: r.ok ? 'var(--profit)' : 'var(--loss)', fontWeight: 600 }}>
                {r.ok ? '✓' : '✗'}
              </span>
              <span style={{ color: 'var(--t1)', letterSpacing: '-0.01em' }}>{r.label}</span>
              <span style={{
                textAlign: 'right',
                fontSize: 10.5,
                color: r.ok ? 'var(--profit)' : 'var(--loss)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}>
                {r.ok ? 'pass' : 'check'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
