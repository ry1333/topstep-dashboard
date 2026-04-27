/**
 * Sparkline — minimal SVG line/area chart.
 * Designed for tight spaces: stat tiles, table cells, status bars.
 */
export default function Sparkline({
  data = [],
  width = 120,
  height = 28,
  stroke = 'currentColor',
  fill = true,
  smooth = true,
  baseline = null,
  className = '',
}) {
  if (!data || data.length < 2) {
    return <svg width={width} height={height} className={className} />
  }

  const min = Math.min(...data, baseline ?? Infinity)
  const max = Math.max(...data, baseline ?? -Infinity)
  const range = max - min || 1
  const stepX = width / (data.length - 1)

  const pts = data.map((v, i) => [
    i * stepX,
    height - ((v - min) / range) * (height - 2) - 1,
  ])

  const path = smooth ? smoothPath(pts) : pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ')
  const areaPath = `${path} L ${width.toFixed(2)} ${height} L 0 ${height} Z`
  const id = `sg-${Math.random().toString(36).slice(2, 8)}`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} preserveAspectRatio="none">
      {fill && (
        <>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${id})`} />
        </>
      )}
      <path d={path} className="spark-line" stroke={stroke} />
      {baseline != null && (() => {
        const y = height - ((baseline - min) / range) * (height - 2) - 1
        return <line x1="0" x2={width} y1={y} y2={y} stroke="currentColor" strokeOpacity="0.18" strokeDasharray="2 3" />
      })()}
    </svg>
  )
}

// Catmull-Rom-ish smoothing via simple bezier interpolation
function smoothPath(pts) {
  if (pts.length < 3) return pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ')
  let d = `M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[Math.max(0, i - 1)]
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[i + 1]
    const [x3, y3] = pts[Math.min(pts.length - 1, i + 2)]
    const t = 0.18
    const c1x = x1 + (x2 - x0) * t
    const c1y = y1 + (y2 - y0) * t
    const c2x = x2 - (x3 - x1) * t
    const c2y = y2 - (y3 - y1) * t
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}`
  }
  return d
}
