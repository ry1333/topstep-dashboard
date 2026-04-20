import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const v = payload[0].value
  const pnl = v - 50000
  return (
    <div style={{
      background: '#141414',
      border: '1px solid rgba(255,255,255,0.09)',
      borderRadius: 10,
      padding: '9px 13px',
      fontFamily: 'var(--font)',
    }}>
      <div style={{ fontSize: 10.5, color: 'var(--t3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div className="mono" style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>
        ${v.toLocaleString()}
      </div>
      <div className="mono" style={{ fontSize: 12, color: pnl >= 0 ? 'var(--profit)' : 'var(--loss)', marginTop: 2 }}>
        {pnl >= 0 ? '+' : ''}${pnl.toLocaleString()}
      </div>
    </div>
  )
}

export default function EquityChart({ data, height = 260 }) {
  const vals = data.map(d => d.equity)
  const last = vals[vals.length - 1] ?? 50000
  const pos  = last >= 50000
  const min  = Math.min(...vals, 49200)
  const max  = Math.max(...vals, 50800)
  const color = pos ? 'var(--profit)' : 'var(--loss)'
  const colorHex = pos ? '#8b5cf6' : '#ef4444'

  if (data.length === 0) {
    return (
      <div style={{
        height,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--t4)', fontSize: 13,
      }}>
        No trades yet — chart will appear once the bot starts trading
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorHex} stopOpacity={0.18} />
            <stop offset="100%" stopColor={colorHex} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="time"
          tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 10.5, fontFamily: 'var(--mono)' }}
          axisLine={false} tickLine={false}
          interval="preserveStartEnd"
          minTickGap={40}
        />
        <YAxis
          domain={[min * 0.999, max * 1.001]}
          tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 10.5, fontFamily: 'var(--mono)' }}
          axisLine={false} tickLine={false}
          tickFormatter={v => `${(v / 1000).toFixed(1)}k`}
          width={44}
          orientation="right"
        />
        <Tooltip content={<Tip />} cursor={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1, strokeDasharray: '3 3' }} />
        <ReferenceLine y={50000} stroke="rgba(255,255,255,0.08)" strokeDasharray="2 4" />
        <Area
          type="monotone"
          dataKey="equity"
          stroke={colorHex}
          strokeWidth={1.75}
          fill="url(#eg)"
          dot={false}
          activeDot={{ r: 4, fill: colorHex, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
