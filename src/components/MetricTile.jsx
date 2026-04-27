import HudCard from './HudCard'
import Sparkline from './Sparkline'

/**
 * MetricTile — label + big number + optional sparkline + optional change.
 * Used in dense KPI grids on Backtester run detail and Dashboard overview.
 */
export default function MetricTile({
  label,
  value,
  sub,           // small caption underneath value
  spark,         // array of numbers
  sparkColor,    // override stroke (defaults to value tone)
  tone = 'neutral', // 'pos' | 'neg' | 'cy' | 'br' | 'neutral'
  baseline,      // dotted reference line in sparkline
  flash = false, // ticker-flash animation when value changes
  align = 'left',
  className = '',
}) {
  const toneColor = {
    pos: 'var(--profit)',
    neg: 'var(--loss)',
    cy: 'var(--cy)',
    br: 'var(--brand)',
    neutral: 'var(--t1)',
  }[tone]

  const stroke = sparkColor || toneColor

  return (
    <HudCard className={className} style={{ padding: '14px 16px', minHeight: 92, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1, textAlign: align }}>
          <div className="cap" style={{ marginBottom: 8 }}>{label}</div>
          <div className={`fig${flash ? ' fig-flash' : ''}`} key={String(value)} style={{ fontSize: 22, color: toneColor, lineHeight: 1 }}>
            {value}
          </div>
          {sub && <div className="cap" style={{ marginTop: 6, color: 'var(--t4)', letterSpacing: '0.04em', textTransform: 'none', fontSize: 10 }}>{sub}</div>}
        </div>
      </div>
      {spark && spark.length > 1 && (
        <div style={{ marginTop: 12, color: stroke }}>
          <Sparkline data={spark} width={140} height={26} baseline={baseline} stroke={stroke} />
        </div>
      )}
    </HudCard>
  )
}
