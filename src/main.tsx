import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import App from './App'
import { ThemeProvider } from './context/ThemeContext'
import './index.css'
import { initSentry, Sentry } from './utils/sentry'
import { getThemeForTime } from './styles/theme'

// Initialize error tracking before rendering
initSentry();

function ErrorFallback({ error }: { error: Error }) {
  const isDark = getThemeForTime() === 'dark';
  const bg = isDark ? '#0C0A09' : '#FAFAF9';
  const fg = isDark ? '#FAFAF9' : '#1C1917';
  const muted = isDark ? '#A8A29E' : '#57534E';
  const borderColor = isDark ? '#292524' : 'rgba(0,0,0,0.1)';
  return (
    <div style={{ minHeight: '100vh', background: bg, color: fg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>😵</div>
      <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Something went wrong</h1>
      <p style={{ fontSize: '14px', color: muted, marginBottom: '24px', textAlign: 'center', maxWidth: '300px' }}>
        {error?.message || 'An unexpected error occurred'}
      </p>
      <button onClick={() => window.location.reload()} style={{ padding: '12px 32px', borderRadius: '12px', background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#0C0A09', fontWeight: 700, fontSize: '15px', border: 'none', cursor: 'pointer', marginBottom: '12px' }}>
        Reload App
      </button>
      <button onClick={() => { localStorage.clear(); sessionStorage.clear(); window.location.reload(); }} style={{ padding: '10px 24px', borderRadius: '10px', background: 'transparent', color: '#78716C', fontSize: '13px', border: `1px solid ${borderColor}`, cursor: 'pointer' }}>
        Clear Data & Reload
      </button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={({ error }) => <ErrorFallback error={error as Error} />}>
      <ThemeProvider>
        <BrowserRouter>
          <App />
          <Analytics />
          <SpeedInsights />
        </BrowserRouter>
      </ThemeProvider>
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
)
