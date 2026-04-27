/**
 * Histogram — bucketed distribution renderer.
 * Pass an array of numbers; renders bars with min/max labels.
 */
export default function Histogram({ values = [], buckets = 24, height = 90, posColor = 'var(--profit)', negColor = 'var(--loss)', neutralColor = 'var(--t3)' }) {
  if (!values.length) {
    return <div style={{ height, color: 'var(--t4)', fontSize: 11 }}>no data</div>
  }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const bins = new Array(buckets).fill(0)
  values.forEach(v => {
    const idx = Math.min(buckets - 1, Math.floor(((v - min) / range) * buckets))
    bins[idx]++
  })
  const peak = Math.max(...bins, 1)
  const zeroIdx = Math.floor(((0 - min) / range) * buckets)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${buckets}, 1fr)`, gap: 1, alignItems: 'flex-end', height }}>
        {bins.map((n, i) => {
          // pick color: pos if bucket midpoint > 0
          const mid = min + (i + 0.5) * (range / buckets)
          const color = mid > 0 ? posColor : mid < 0 ? negColor : neutralColor
          return (
            <div key={i} style={{
              height: `${(n / peak) * 100}%`,
              background: color,
              opacity: 0.7,
              minHeight: n > 0 ? 1 : 0,
            }} title={`${n} trades`} />
          )
        })}
      </div>
      <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 9.5, color: 'var(--t4)' }}>
        <span>{fmt(min)}</span>
        {zeroIdx > 0 && zeroIdx < buckets - 1 && <span style={{ color: 'var(--t3)' }}>0</span>}
        <span>{fmt(max)}</span>
      </div>
    </div>
  )
}

function fmt(n) {
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n.toFixed(1)
}
