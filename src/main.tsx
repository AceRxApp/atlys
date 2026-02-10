import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#0C0A09', color: '#FAFAF9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>😵</div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Something went wrong</h1>
          <p style={{ fontSize: '14px', color: '#A8A29E', marginBottom: '24px', textAlign: 'center', maxWidth: '300px' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button onClick={() => window.location.reload()} style={{ padding: '12px 32px', borderRadius: '12px', background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#0C0A09', fontWeight: 700, fontSize: '15px', border: 'none', cursor: 'pointer', marginBottom: '12px' }}>
            Reload App
          </button>
          <button onClick={() => { localStorage.clear(); sessionStorage.clear(); window.location.reload(); }} style={{ padding: '10px 24px', borderRadius: '10px', background: 'transparent', color: '#78716C', fontSize: '13px', border: '1px solid #292524', cursor: 'pointer' }}>
            Clear Data & Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
