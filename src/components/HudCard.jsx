/**
 * HudCard — corner-bracketed card with optional hover glow.
 * Use as the primary container for grouped metrics / panels.
 */
export default function HudCard({ children, hover = false, active = false, className = '', style }) {
  const cls = ['hud', hover ? 'hud-hover' : '', active ? 'hud-active' : '', className].filter(Boolean).join(' ')
  return (
    <div className={cls} style={style}>
      {/* bottom corner brackets (top corners drawn via ::before/::after) */}
      <span className="hud-bl" />
      <span className="hud-br" />
      {children}
    </div>
  )
}
