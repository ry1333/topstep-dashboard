export default function GlassCard({ children, className = '', hover = false, gradient = false }) {
  return (
    <div className={`glass ${hover ? 'glass-hover' : ''} ${gradient ? 'gradient-border' : ''} ${className}`}>
      {children}
    </div>
  )
}
