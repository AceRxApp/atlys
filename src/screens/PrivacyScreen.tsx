import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import Footer from '../components/Footer';

export default function PrivacyScreen() {
  const { theme } = useTheme();
  const navigate = useNavigate();

  const headingStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 700,
    color: theme.text.primary,
    marginBottom: '8px',
    marginTop: '28px',
  };

  const bodyStyle: React.CSSProperties = {
    fontSize: '14px',
    lineHeight: 1.7,
    color: theme.text.body,
    marginBottom: '12px',
  };

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

        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Privacy Policy</h1>
        <p style={{ fontSize: '13px', color: theme.text.tertiary, marginBottom: '32px' }}>Effective date: January 1, 2025</p>

        <p style={bodyStyle}>
          NxStops ("we", "our", "us") is a product of NxStops. This Privacy Policy explains how we collect, use, and protect your information when you use NxStops.
        </p>

        <h2 style={headingStyle}>1. Information We Collect</h2>
        <p style={bodyStyle}>We may collect the following types of information:</p>
        <ul style={{ ...bodyStyle, paddingLeft: '20px' }}>
          <li style={{ marginBottom: '6px' }}><strong>Location data:</strong> If you enable GPS, we use your device's location to show nearby places and events. Location data is not stored on our servers.</li>
          <li style={{ marginBottom: '6px' }}><strong>Account information:</strong> If you create an account, we collect your email address and display name through Supabase authentication.</li>
          <li style={{ marginBottom: '6px' }}><strong>Trip plans:</strong> Your trip itineraries are stored locally on your device. Crew Mode plans are temporarily stored in our database to enable real-time collaboration.</li>
          <li style={{ marginBottom: '6px' }}><strong>Reviews and tags:</strong> Community reviews and tags you submit are stored in our database and visible to other users.</li>
          <li style={{ marginBottom: '6px' }}><strong>Usage data:</strong> We collect anonymous analytics to improve the app experience.</li>
        </ul>

        <h2 style={headingStyle}>2. How We Use Your Information</h2>
        <p style={bodyStyle}>We use your information to:</p>
        <ul style={{ ...bodyStyle, paddingLeft: '20px' }}>
          <li style={{ marginBottom: '6px' }}>Provide personalized place recommendations based on your location</li>
          <li style={{ marginBottom: '6px' }}>Enable trip planning and collaboration features</li>
          <li style={{ marginBottom: '6px' }}>Display community reviews and tags</li>
          <li style={{ marginBottom: '6px' }}>Improve our service through anonymous analytics</li>
        </ul>
        <p style={bodyStyle}>
          <strong>We do not sell your personal information.</strong> Your data is used solely to provide and improve the NxStops experience.
        </p>

        <h2 style={headingStyle}>3. Third-Party Services</h2>
        <p style={bodyStyle}>NxStops integrates with the following third-party services:</p>
        <ul style={{ ...bodyStyle, paddingLeft: '20px' }}>
          <li style={{ marginBottom: '6px' }}><strong>Google Maps Platform:</strong> For maps, place data, and directions. Subject to Google's Privacy Policy.</li>
          <li style={{ marginBottom: '6px' }}><strong>Supabase:</strong> For authentication and database services.</li>
          <li style={{ marginBottom: '6px' }}><strong>Vercel Analytics:</strong> For anonymous usage analytics and performance monitoring.</li>
          <li style={{ marginBottom: '6px' }}><strong>Sentry:</strong> For error tracking and application monitoring.</li>
          <li style={{ marginBottom: '6px' }}><strong>Open-Meteo:</strong> For weather data (no personal data is sent).</li>
        </ul>

        <h2 style={headingStyle}>4. Cookies & Local Storage</h2>
        <p style={bodyStyle}>
          NxStops uses browser local storage and session storage to save your preferences, trip plans, saved places, and session data. This data stays on your device and can be cleared at any time through your browser settings or by using the "Clear Data & Reload" option in the app.
        </p>

        <h2 style={headingStyle}>5. Data Security</h2>
        <p style={bodyStyle}>
          We take reasonable measures to protect your information. All data transmission is encrypted via HTTPS. Authentication is handled through Supabase's secure infrastructure.
        </p>

        <h2 style={headingStyle}>6. Your Rights</h2>
        <p style={bodyStyle}>
          You can delete your account and associated data at any time. You can clear all locally stored data through your browser. If you have questions about your data, contact us at the address below.
        </p>

        <h2 style={headingStyle}>7. Children's Privacy</h2>
        <p style={bodyStyle}>
          NxStops is not directed at children under 13. We do not knowingly collect personal information from children under 13.
        </p>

        <h2 style={headingStyle}>8. Changes to This Policy</h2>
        <p style={bodyStyle}>
          We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated effective date.
        </p>

        <h2 style={headingStyle}>9. Contact Us</h2>
        <p style={bodyStyle}>
          If you have any questions about this Privacy Policy, please contact us at:
        </p>
        <p style={bodyStyle}>
          <a href="mailto:support@nxstops.com" style={{ color: theme.accent.amber, textDecoration: 'none' }}>support@nxstops.com</a>
        </p>

        <Footer />
      </div>
    </div>
  );
}
