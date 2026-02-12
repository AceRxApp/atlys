import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import Footer from '../components/Footer';

export default function TermsScreen() {
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

        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Terms of Service</h1>
        <p style={{ fontSize: '13px', color: theme.text.tertiary, marginBottom: '32px' }}>Effective date: January 1, 2025</p>

        <p style={bodyStyle}>
          Welcome to NxStops. By accessing or using our service, you agree to be bound by these Terms of Service. NxStops is operated by NxStops.
        </p>

        <h2 style={headingStyle}>1. Acceptance of Terms</h2>
        <p style={bodyStyle}>
          By using NxStops, you agree to these Terms of Service and our Privacy Policy. If you do not agree, please do not use the service.
        </p>

        <h2 style={headingStyle}>2. Description of Service</h2>
        <p style={bodyStyle}>
          NxStops is a travel companion web application that helps users discover places, plan trips, browse events, and collaborate with others on trip itineraries. The service is provided "as is" and "as available."
        </p>

        <h2 style={headingStyle}>3. User Accounts</h2>
        <p style={bodyStyle}>
          You may create an account to access additional features such as community reviews and crew mode. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
        </p>

        <h2 style={headingStyle}>4. User Conduct</h2>
        <p style={bodyStyle}>When using NxStops, you agree not to:</p>
        <ul style={{ ...bodyStyle, paddingLeft: '20px' }}>
          <li style={{ marginBottom: '6px' }}>Submit false, misleading, or inappropriate reviews or content</li>
          <li style={{ marginBottom: '6px' }}>Use the service for any unlawful purpose</li>
          <li style={{ marginBottom: '6px' }}>Attempt to interfere with the service's operation or security</li>
          <li style={{ marginBottom: '6px' }}>Scrape, copy, or redistribute content from the service without permission</li>
        </ul>

        <h2 style={headingStyle}>5. Third-Party Content & Links</h2>
        <p style={bodyStyle}>
          NxStops displays data from third-party sources including Google Maps, Google Places, and event providers. We also may link to third-party booking sites, travel services, and affiliate partners. We are not responsible for the accuracy, availability, or content of these third-party services. Your use of third-party services is subject to their respective terms and policies.
        </p>

        <h2 style={headingStyle}>6. Intellectual Property</h2>
        <p style={bodyStyle}>
          The NxStops name, logo, design, and original content are the property of NxStops. Place data, maps, and photos are provided by their respective owners (e.g., Google) and are subject to their terms of use.
        </p>

        <h2 style={headingStyle}>7. Limitation of Liability</h2>
        <p style={bodyStyle}>
          NxStops is provided for informational and planning purposes only. We do not guarantee the accuracy of place information, business hours, ratings, or event details. To the maximum extent permitted by law, NxStops shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service.
        </p>
        <p style={bodyStyle}>
          Always verify important details (hours, availability, safety) directly with businesses and venues before visiting.
        </p>

        <h2 style={headingStyle}>8. Termination</h2>
        <p style={bodyStyle}>
          We reserve the right to suspend or terminate your access to NxStops at any time for violations of these terms or for any other reason at our discretion.
        </p>

        <h2 style={headingStyle}>9. Changes to Terms</h2>
        <p style={bodyStyle}>
          We may update these Terms of Service from time to time. Continued use of the service after changes constitutes acceptance of the updated terms.
        </p>

        <h2 style={headingStyle}>10. Contact Us</h2>
        <p style={bodyStyle}>
          If you have any questions about these Terms of Service, please contact us at:
        </p>
        <p style={bodyStyle}>
          <a href="mailto:support@nxstops.com" style={{ color: theme.accent.amber, textDecoration: 'none' }}>support@nxstops.com</a>
        </p>

        <Footer />
      </div>
    </div>
  );
}
