import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e) { return { error: e } }
  render() {
    if (this.state.error) return (
      <div style={{ color: 'white', padding: 40, fontFamily: 'monospace', background: '#060910', minHeight: '100vh' }}>
        <h2 style={{ color: '#ef4444' }}>App Error</h2>
        <pre style={{ color: '#f0f6fc', whiteSpace: 'pre-wrap' }}>{this.state.error?.message}</pre>
        <pre style={{ color: '#8b949e', fontSize: 12 }}>{this.state.error?.stack}</pre>
      </div>
    )
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
