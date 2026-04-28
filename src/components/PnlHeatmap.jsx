/**
 * PnlHeatmap — calendar-style grid of daily PnL.
 * Mon-Fri rows (no weekends), week columns, month labels above.
 *
 * Pass an object { 'YYYY-MM-DD': pnl } and a number of days to look back.
 */

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmtMoney(n) {
  if (n == null) return ''
  const s = n >= 0 ? '+$' : '-$'
  return s + Math.abs(n).toFixed(0)
}

export default function PnlHeatmap({ daily = {}, days = 30, cellSize = 14 }) {
  const today = new Date()
  // Build the array of trading days (Mon-Fri) for the last `days` calendar days,
  // padded backward to start on a Monday so columns are clean weeks.
  const allDays = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const dow = d.getDay()  // 0=Sun, 1=Mon..6=Sat
    if (dow === 0 || dow === 6) continue  // skip weekends
    const k = d.toISOString().slice(0, 10)
    allDays.push({ date: k, dow, dayOfMonth: d.getDate(), month: d.getMonth(), pnl: daily[k] ?? null })
  }

  if (allDays.length === 0) {
    return <div className="cap" style={{ color: 'var(--t4)', padding: '20px 0' }}>NO DATA</div>
  }

  // Color scale based on max abs pnl
  const max = Math.max(0.01, ...allDays.map(c => Math.abs(c.pnl ?? 0)))
  function cellClass(pnl) {
    if (pnl == null) return 'heat-neut'
    const r = Math.abs(pnl) / max
    if (pnl > 0) {
      if (r > 0.66) return 'heat-pos-4'
      if (r > 0.33) return 'heat-pos-3'
      if (r > 0.10) return 'heat-pos-2'
      return 'heat-pos-1'
    }
    if (pnl < 0) {
      if (r > 0.66) return 'heat-neg-4'
      if (r > 0.33) return 'heat-neg-3'
      if (r > 0.10) return 'heat-neg-2'
      return 'heat-neg-1'
    }
    return 'heat-neut'
  }

  // Group days into weeks (columns). Each column holds Mon-Fri (5 cells).
  // Pad the FIRST week with nulls for any missing weekday slots before the first day.
  const weeks = []
  let currentWeek = new Array(5).fill(null)
  let firstDow = allDays[0].dow  // 1..5 for Mon..Fri
  let weekDayIdx = firstDow - 1  // 0=Mon

  // Pre-fill first week's leading nulls (already null), start from weekDayIdx
  allDays.forEach(c => {
    currentWeek[weekDayIdx] = c
    weekDayIdx++
    if (weekDayIdx >= 5) {
      weeks.push(currentWeek)
      currentWeek = new Array(5).fill(null)
      weekDayIdx = 0
    }
  })
  if (currentWeek.some(x => x !== null)) {
    weeks.push(currentWeek)
  }

  // Compute month label positions: first week of each month gets the label
  const monthLabels = []
  let lastMonth = -1
  weeks.forEach((wk, wIdx) => {
    const firstDayInWeek = wk.find(d => d !== null)
    if (firstDayInWeek && firstDayInWeek.month !== lastMonth) {
      monthLabels.push({ wIdx, month: firstDayInWeek.month })
      lastMonth = firstDayInWeek.month
    }
  })

  const cellGap = 3
  const labelWidth = 28
  const monthLabelHeight = 14

  return (
    <div style={{ display: 'flex', flexDirection: 'column', userSelect: 'none' }}>
      {/* Month labels row */}
      <div style={{ display: 'flex', height: monthLabelHeight, paddingLeft: labelWidth }}>
        {weeks.map((_, wIdx) => {
          const m = monthLabels.find(ml => ml.wIdx === wIdx)
          return (
            <div key={wIdx} style={{
              width: cellSize, marginRight: cellGap,
              fontSize: 9.5, color: 'var(--t3)', fontFamily: 'var(--mono)',
              letterSpacing: '0.08em',
            }}>
              {m ? MONTH_NAMES[m.month] : ''}
            </div>
          )
        })}
      </div>

      {/* Calendar grid: weekday-label column + week columns */}
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: cellGap, marginRight: 6, width: labelWidth - 6 }}>
          {WEEKDAY_LABELS.map(d => (
            <div key={d} style={{
              height: cellSize, lineHeight: `${cellSize}px`,
              fontSize: 9, color: 'var(--t4)', fontFamily: 'var(--mono)',
              letterSpacing: '0.08em',
            }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: cellGap }}>
          {weeks.map((wk, wIdx) => (
            <div key={wIdx} style={{ display: 'flex', flexDirection: 'column', gap: cellGap }}>
              {wk.map((c, di) => (
                <div
                  key={di}
                  className={c ? cellClass(c.pnl) : ''}
                  title={c ? `${c.date} · ${c.pnl != null ? fmtMoney(c.pnl) : 'no data'}` : ''}
                  style={{
                    width: cellSize, height: cellSize,
                    border: c ? '1px solid rgba(255,255,255,0.05)' : '1px dashed rgba(255,255,255,0.03)',
                    borderRadius: 2,
                    background: c ? undefined : 'transparent',
                    cursor: c ? 'pointer' : 'default',
                    transition: 'transform 0.08s, border-color 0.08s',
                  }}
                  onMouseEnter={e => { if (c) { e.currentTarget.style.borderColor = 'var(--cy)'; e.currentTarget.style.transform = 'scale(1.15)' } }}
                  onMouseLeave={e => { if (c) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'scale(1)' } }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14, fontSize: 9, color: 'var(--t4)', fontFamily: 'var(--mono)', letterSpacing: '0.08em' }}>
        <span>LOSS</span>
        {['heat-neg-4','heat-neg-3','heat-neg-2','heat-neg-1','heat-neut','heat-pos-1','heat-pos-2','heat-pos-3','heat-pos-4'].map(c => (
          <div key={c} className={c} style={{ width: 11, height: 11, border: '1px solid rgba(255,255,255,0.05)', borderRadius: 2 }} />
        ))}
        <span>WIN</span>
      </div>
    </div>
  )
}
