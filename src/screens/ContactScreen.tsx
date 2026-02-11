import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import Footer from '../components/Footer';

export default function ContactScreen() {
  const { theme } = useTheme();
  const navigate = useNavigate();

  return (
    <div style={{
      fontFamily: "'DM Sans', system-ui, sans-serif",
      background: theme.bg.bodyGradient,
      minHeight: '100vh',
      color: theme.text.primary,
    }}>
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 20px' }}>
        {/* Back button */}
        <div style={{ padding: '16px 0' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: theme.text.secondary, fontSize: '14px',
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 0',
            }}
          >
            <span style={{ fontSize: '18px' }}>&larr;</span> Back to NxStops
          </button>
        </div>

        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Contact Us</h1>
        <p style={{ fontSize: '15px', color: theme.text.secondary, marginBottom: '40px', lineHeight: 1.6 }}>
          We'd love to hear from you. Whether you have a question, feedback, or want to partner with us — reach out anytime.
        </p>

        <div style={{ display: 'grid', gap: '16px', marginBottom: '48px' }}>
          {/* General inquiries */}
          <a
            href="mailto:hello@nxstops.com"
            style={{
              background: theme.bg.surfaceAlpha,
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              padding: '24px',
              border: `1px solid ${theme.border.subtle}`,
              textDecoration: 'none',
              color: 'inherit',
              display: 'block',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px',
                background: theme.amberTint.bg10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', flexShrink: 0,
              }}>
                {'\u{1F44B}'}
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: theme.text.primary }}>General Inquiries & Partnerships</div>
              </div>
            </div>
            <div style={{
              fontSize: '15px',
              color: theme.accent.amber,
              fontWeight: 500,
              marginLeft: '52px',
            }}>
              hello@nxstops.com
            </div>
          </a>

          {/* Support */}
          <a
            href="mailto:support@nxstops.com"
            style={{
              background: theme.bg.surfaceAlpha,
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              padding: '24px',
              border: `1px solid ${theme.border.subtle}`,
              textDecoration: 'none',
              color: 'inherit',
              display: 'block',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px',
                background: theme.greenTint.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', flexShrink: 0,
              }}>
                {'\u{1F6E0}\u{FE0F}'}
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: theme.text.primary }}>Help & Feedback</div>
              </div>
            </div>
            <div style={{
              fontSize: '15px',
              color: theme.accent.amber,
              fontWeight: 500,
              marginLeft: '52px',
            }}>
              support@nxstops.com
            </div>
          </a>
        </div>

        {/* About NxStops brief */}
        <div style={{
          textAlign: 'center',
          padding: '32px 0',
          borderTop: `1px solid ${theme.border.subtle}`,
        }}>
          <div style={{
            fontSize: '24px',
            fontWeight: 700,
            marginBottom: '4px',
            background: theme.accent.amberTextGradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            NxStops
          </div>
          <p style={{
            fontSize: '13px',
            color: theme.text.secondary,
            lineHeight: 1.6,
            maxWidth: '360px',
            margin: '8px auto 0',
          }}>
            A travel companion for discovering places, planning trips, and exploring cities. Built by Eleve Creative Haus.
          </p>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', paddingBottom: '20px' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '14px 40px',
              borderRadius: '14px',
              border: 'none',
              background: theme.accent.amberGradient,
              color: theme.text.onAccent,
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: `0 4px 20px ${theme.amberTint.shadow}`,
            }}
          >
            Open NxStops
          </button>
        </div>

        <Footer />
      </div>
    </div>
  );
}
