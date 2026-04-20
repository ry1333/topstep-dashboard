import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useTrades } from '../hooks/useTrades'

const SYMS = ['MES','MNQ','M2K','MYM']
const SESSIONS = ['Morning','Afternoon','Power Hour']
const DAYS = ['Mon','Tue','Wed','Thu','Fri']
const SYM_COLORS = { MES: 'rgba(237,237,237,0.92)', MNQ: 'rgba(237,237,237,0.6)', M2K: 'rgba(237,237,237,0.38)', MYM: 'rgba(237,237,237,0.22)' }

const fmt = v => (v >= 0 ? '+$' : '-$') + Math.abs(v).toFixed(0)

function Section({ label, children, right }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ fontSize: 11, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 500 }}>
          {label}
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}

function BarRanking({ data }) {
  const max = Math.max(...data.map(d => Math.abs(d.pnl)), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {data.map(d => {
        const pct = (Math.abs(d.pnl) / max) * 100
        const pos = d.pnl >= 0
        return (
          <div key={d.name} style={{
            display: 'grid', gridTemplateColumns: '72px 1fr 90px',
            alignItems: 'center', gap: 16,
            padding: '11px 0', borderTop: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {d.color && <div style={{ width: 3, height: 14, borderRadius: 2, background: d.color }} />}
              <span className="mono" style={{ fontSize: 12, color: 'var(--t1)', fontWeight: 500 }}>{d.name}</span>
            </div>
            <div style={{ position: 'relative', height: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 3 }}>
              <div style={{
                position: 'absolute', top: 0, left: 0,
                height: '100%', width: `${pct}%`,
                background: pos ? 'var(--profit)' : 'var(--loss)',
                borderRadius: 3,
                transition: 'width 0.8s cubic-bezier(0.2,0.8,0.2,1)',
              }} />
            </div>
            <div className="mono" style={{
              textAlign: 'right', fontSize: 12.5, fontWeight: 600,
              color: pos ? 'var(--profit)' : 'var(--loss)',
            }}>
              {d.pnl >= 0 ? '+' : ''}${d.pnl.toFixed(0)}
              {d.trades != null && <span style={{ color: 'var(--t4)', fontWeight: 400, marginLeft: 8 }}>·{d.trades}</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const Tip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const v = payload[0].value
  return (
    <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '8px 12px' }}>
      <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: v >= 0 ? 'var(--profit)' : 'var(--loss)' }}>
        {v >= 0 ? '+$' : '-$'}{Math.abs(v).toFixed(2)}
      </div>
    </div>
  )
}

export default function Analytics() {
  const { trades } = useTrades()
  const closed = trades.filter(t => t.status === 'closed' && t.pnl != null)

  const bySymbol = SYMS.map(s => ({
    name: s,
    pnl: closed.filter(t => t.symbol === s).reduce((a, t) => a + t.pnl, 0),
    trades: closed.filter(t => t.symbol === s).length,
    color: SYM_COLORS[s],
  })).sort((a, b) => b.pnl - a.pnl)

  const sessionMap = { Morning: [570, 690], Afternoon: [780, 900], 'Power Hour': [900, 960] }
  const bySession = SESSIONS.map(s => {
    const [start, end] = sessionMap[s]
    const match = closed.filter(t => {
      const m = new Date(t.created_at).getHours() * 60 + new Date(t.created_at).getMinutes()
      return m >= start && m < end
    })
    return { name: s, pnl: match.reduce((a, t) => a + t.pnl, 0), trades: match.length }
  }).sort((a, b) => b.pnl - a.pnl)

  const byDow = DAYS.map((d, i) => ({
    name: d,
    pnl: closed.filter(t => new Date(t.created_at).getDay() === i + 1).reduce((a, t) => a + t.pnl, 0),
    trades: closed.filter(t => new Date(t.created_at).getDay() === i + 1).length,
  }))

  const cumulative = [...closed]
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .reduce((acc, t, i) => {
      const prev = acc[i - 1]?.equity ?? 0
      return [...acc, { day: i + 1, equity: prev + t.pnl }]
    }, [])

  const best5  = [...closed].sort((a, b) => b.pnl - a.pnl).slice(0, 5)
  const worst5 = [...closed].sort((a, b) => a.pnl - b.pnl).slice(0, 5)
  const totalPnl = closed.reduce((a, t) => a + t.pnl, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }} className="fade-up">

      {/* Header */}
      <div>
        <div style={{ fontSize: 11, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 500, marginBottom: 10 }}>
          Performance
        </div>
        <h1 className="title" style={{ fontSize: 44, marginBottom: 10 }}>
          Analytics
        </h1>
        <div className="mono" style={{ fontSize: 12.5, color: 'var(--t2)' }}>
          <span style={{ color: 'var(--t4)' }}>closed</span> <span style={{ marginLeft: 6 }}>{closed.length}</span>
          <span style={{ color: 'var(--t4)', margin: '0 8px' }}>·</span>
          <span style={{ color: 'var(--t4)' }}>total p&amp;l</span>
          <span style={{ marginLeft: 6, color: totalPnl >= 0 ? 'var(--profit)' : 'var(--loss)' }}>{fmt(totalPnl)}</span>
        </div>
      </div>

      {/* Hero — cumulative chart, full width */}
      <Section label="Cumulative P&L">
        {cumulative.length === 0 ? (
          <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t4)', fontSize: 13 }}>
            No trades yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={cumulative} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={totalPnl >= 0 ? '#8b5cf6' : '#ef4444'} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={totalPnl >= 0 ? '#8b5cf6' : '#ef4444'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 6" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: 'var(--t3)', fontSize: 10.5, fontFamily: 'var(--mono)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--t3)', fontSize: 10.5, fontFamily: 'var(--mono)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} width={52} orientation="right" />
              <Tooltip content={<Tip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeDasharray: '3 3' }} />
              <Area type="monotone" dataKey="equity" stroke={totalPnl >= 0 ? '#8b5cf6' : '#ef4444'} strokeWidth={1.75} fill="url(#cg)" dot={false} activeDot={{ r: 4, fill: totalPnl >= 0 ? '#8b5cf6' : '#ef4444', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* Two rankings side by side */}
      <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56 }}>
        <Section label="By instrument">
          <BarRanking data={bySymbol} />
        </Section>
        <Section label="By session">
          <BarRanking data={bySession} />
        </Section>
      </div>

      {/* Full-width day of week */}
      <Section label="By day of week">
        <BarRanking data={byDow} />
      </Section>

      {/* Best / Worst — editorial style */}
      <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56 }}>
        {[{ label: 'Best trades', data: best5, pos: true }, { label: 'Worst trades', data: worst5, pos: false }].map(({ label, data, pos }) => (
          <Section key={label} label={label}>
            {data.length === 0 ? (
              <div style={{ color: 'var(--t4)', fontSize: 13, padding: '16px 0' }}>No data</div>
            ) : data.map(t => (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 0', borderTop: '1px solid var(--border)',
              }}>
                <div className="mono" style={{
                  fontSize: 20, fontWeight: 500,
                  color: pos ? 'var(--profit)' : 'var(--loss)',
                  letterSpacing: '-0.02em',
                  minWidth: 100,
                }}>
                  {pos ? '+' : ''}${t.pnl?.toFixed(2)}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="mono" style={{ fontSize: 12.5, color: 'var(--t1)', fontWeight: 500 }}>
                    {t.symbol} <span style={{ color: 'var(--t3)', fontWeight: 400 }}>· {t.side}</span>
                  </div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>
                    {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>
            ))}
          </Section>
        ))}
      </div>
    </div>
  )
}
