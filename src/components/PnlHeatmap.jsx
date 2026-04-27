/**
 * PnlHeatmap — calendar-style daily PnL grid. Each cell is one trading day.
 * Pass an object { 'YYYY-MM-DD': pnl } and a date window.
 */
export default function PnlHeatmap({ daily = {}, days = 90, height = 64 }) {
  // Build last N days array
  const today = new Date()
  const cells = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const k = d.toISOString().slice(0, 10)
    cells.push({ date: k, pnl: daily[k] ?? null, dow: d.getDay() })
  }

  // Compute color scale based on max abs pnl
  const max = Math.max(0.01, ...cells.map(c => Math.abs(c.pnl ?? 0)))

  function cellClass(pnl) {
    if (pnl == null) return 'heat-neut'
    const r = Math.abs(pnl) / max
    if (pnl > 0) {
      if (r > 0.66) return 'heat-pos-4'
      if (r > 0.33) return 'heat-pos-3'
      if (r > 0.10) return 'heat-pos-2'
      return 'heat-pos-1'
    } else if (pnl < 0) {
      if (r > 0.66) return 'heat-neg-4'
      if (r > 0.33) return 'heat-neg-3'
      if (r > 0.10) return 'heat-neg-2'
      return 'heat-neg-1'
    }
    return 'heat-neut'
  }

  // Layout into 7-row weekday grid (Mon→Sun rows)
  // First column starts on the dow of first cell
  const weeks = []
  let week = new Array(7).fill(null)
  let wi = 0
  cells.forEach((c, i) => {
    week[c.dow] = c
    if (c.dow === 6 || i === cells.length - 1) {
      weeks.push(week)
      week = new Array(7).fill(null)
      wi++
    }
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${weeks.length}, 1fr)`, gap: 2 }}>
        {weeks.map((wk, idx) => (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {wk.map((c, di) => (
              <div
                key={di}
                className={c ? cellClass(c.pnl) : ''}
                title={c ? `${c.date}  ${c.pnl != null ? (c.pnl >= 0 ? '+' : '') + c.pnl.toFixed(2) : 'no data'}` : ''}
                style={{
                  height: Math.floor(height / 8),
                  border: '1px solid rgba(255,255,255,0.04)',
                  borderRadius: 1,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
