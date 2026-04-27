/**
 * MaeMfeScatter — scatter of every trade's MAE (x) vs MFE (y), color-coded by P&L.
 * Reveals trade quality: tight winners cluster near origin; tail risk shows on left/right.
 */
export default function MaeMfeScatter({ trades = [], width = 520, height = 240 }) {
  if (!trades.length) return <div style={{ height, color: 'var(--t4)', fontSize: 11 }}>no data</div>

  const points = trades.map(t => {
    // mae/mfe stored as price extremes during trade; convert to ticks signed
    // we already have entry_price; mae/mfe vs entry_price → adverse / favorable
    const e = parseFloat(t.entry_price)
    const sideSign = t.side === 'buy' ? 1 : -1
    const mae = t.mae != null ? sideSign * (parseFloat(t.mae) - e) : 0
    const mfe = t.mfe != null ? sideSign * (parseFloat(t.mfe) - e) : 0
    return { mae, mfe, pnl: parseFloat(t.pnl_net) }
  })
  // signed convention: mae should be negative (adverse), mfe positive (favorable).
  // Take absolute values for plotting magnitude.
  const xs = points.map(p => Math.abs(p.mae))
  const ys = points.map(p => Math.abs(p.mfe))
  const xMax = Math.max(0.5, ...xs) * 1.05
  const yMax = Math.max(0.5, ...ys) * 1.05

  const padL = 32, padB = 22, padT = 6, padR = 6
  const W = width - padL - padR
  const H = height - padT - padB

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {/* axes */}
      <line x1={padL} y1={height - padB} x2={width - padR} y2={height - padB} stroke="var(--hud-edge)" />
      <line x1={padL} y1={padT} x2={padL} y2={height - padB} stroke="var(--hud-edge)" />
      {/* gridlines */}
      {[0.25, 0.5, 0.75].map(f => (
        <g key={f}>
          <line x1={padL + W * f} y1={padT} x2={padL + W * f} y2={height - padB} stroke="var(--hud-edge)" strokeOpacity="0.4" strokeDasharray="2 4" />
          <line x1={padL} y1={(height - padB) - H * f} x2={width - padR} y2={(height - padB) - H * f} stroke="var(--hud-edge)" strokeOpacity="0.4" strokeDasharray="2 4" />
        </g>
      ))}
      {/* y=x reference (where MFE == MAE; below this line = trade went against you more than for you) */}
      <line
        x1={padL}
        y1={height - padB}
        x2={padL + Math.min(W, H * (xMax / yMax))}
        y2={(height - padB) - Math.min(H, W * (yMax / xMax))}
        stroke="var(--cy)"
        strokeOpacity="0.25"
        strokeDasharray="3 4"
      />
      {/* points */}
      {points.map((p, i) => {
        const cx = padL + (Math.abs(p.mae) / xMax) * W
        const cy = (height - padB) - (Math.abs(p.mfe) / yMax) * H
        const winner = p.pnl > 0
        return (
          <circle
            key={i}
            cx={cx} cy={cy} r="2.5"
            fill={winner ? 'var(--profit)' : 'var(--loss)'}
            fillOpacity="0.55"
          />
        )
      })}
      {/* labels */}
      <text x={padL} y={height - 4} fontFamily="var(--mono)" fontSize="9" fill="var(--t4)" letterSpacing="0.1em">MAE →</text>
      <text x={4} y={padT + 8} fontFamily="var(--mono)" fontSize="9" fill="var(--t4)" letterSpacing="0.1em">MFE</text>
      <text x={width - padR} y={height - 4} textAnchor="end" fontFamily="var(--mono)" fontSize="9" fill="var(--t4)">{xMax.toFixed(1)}</text>
    </svg>
  )
}
