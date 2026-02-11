import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import Footer from '../components/Footer';

export default function AboutScreen() {
  const { theme } = useTheme();
  const navigate = useNavigate();

  const sectionStyle: React.CSSProperties = {
    marginBottom: '32px',
  };

  const headingStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 700,
    color: theme.text.primary,
    marginBottom: '12px',
  };

  const bodyStyle: React.CSSProperties = {
    fontSize: '14px',
    lineHeight: 1.7,
    color: theme.text.body,
  };

  const features = [
    {
      icon: '\u{1F50D}',
      title: 'Discover',
      desc: 'Find the best places around you — restaurants, cafes, nightlife, attractions — filtered by vibe, group, and what\'s open now.',
    },
    {
      icon: '\u{1F5D3}\u{FE0F}',
      title: 'Plan',
      desc: 'Build multi-day itineraries, reorder stops, get directions between them, and share your plan with friends.',
    },
    {
      icon: '\u{1F389}',
      title: 'Events',
      desc: 'Browse local events — concerts, festivals, markets, and more — happening near you or in any city you\'re exploring.',
    },
    {
      icon: '\u{1F46F}',
      title: 'Crew Mode',
      desc: 'Plan together in real time. Create a crew code, share it with your group, and build your trip collaboratively.',
    },
  ];

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

        {/* Hero */}
        <div style={{ textAlign: 'center', padding: '40px 0 48px' }}>
          <div style={{
            fontSize: '36px',
            fontWeight: 700,
            marginBottom: '4px',
            background: theme.accent.amberTextGradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            NxStops
          </div>
          <div style={{
            fontSize: '11px',
            color: theme.text.tertiary,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '16px',
          }}>
            by Nav&eacute;
          </div>
          <p style={{
            fontSize: '17px',
            color: theme.text.secondary,
            lineHeight: 1.6,
            maxWidth: '440px',
            margin: '0 auto',
          }}>
            Your travel companion for discovering places, planning trips, and exploring cities — wherever you are.
          </p>
        </div>

        {/* What is NxStops */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>What is NxStops?</h2>
          <p style={bodyStyle}>
            NxStops is a modern travel companion built for explorers, friend groups, solo travelers, and everyone in between. Whether you're visiting a new city or rediscovering your own, NxStops helps you find what's around you, plan your day, and make the most of every stop.
          </p>
          <p style={{ ...bodyStyle, marginTop: '12px' }}>
            We combine real-time data from Google Maps and Places with curated vibes and community tags so you can discover places that match your mood — from cozy brunch spots to late-night rooftops, family-friendly parks to hidden local gems.
          </p>
        </div>

        {/* Features */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>Key Features</h2>
          <div style={{ display: 'grid', gap: '12px' }}>
            {features.map((f) => (
              <div
                key={f.title}
                style={{
                  background: theme.bg.surfaceAlpha,
                  backdropFilter: 'blur(20px)',
                  borderRadius: '16px',
                  padding: '20px',
                  border: `1px solid ${theme.border.subtle}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '22px' }}>{f.icon}</span>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: theme.text.primary }}>{f.title}</h3>
                </div>
                <p style={{ fontSize: '13px', lineHeight: 1.6, color: theme.text.secondary }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Built by */}
        <div style={{
          ...sectionStyle,
          textAlign: 'center',
          padding: '32px 0',
          borderTop: `1px solid ${theme.border.subtle}`,
        }}>
          <p style={{ fontSize: '12px', color: theme.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
            Built by
          </p>
          <p style={{ fontSize: '18px', fontWeight: 600, color: theme.text.primary }}>
            Eleve Creative Haus
          </p>
          <p style={{ fontSize: '13px', color: theme.text.secondary, marginTop: '8px', lineHeight: 1.6 }}>
            A creative studio building tools for modern travelers.
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
