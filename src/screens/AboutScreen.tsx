import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';

export default function AboutScreen() {
  const navigate = useNavigate();

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
    <div className="font-sans bg-body-gradient min-h-screen text-text-primary">
      <div className="max-w-[700px] mx-auto px-5">
        {/* Back button */}
        <div className="py-4">
          <button
            onClick={() => navigate('/')}
            className="bg-transparent border-none cursor-pointer text-text-secondary text-sm flex items-center gap-1.5 py-2"
          >
            <span className="text-lg">&larr;</span> Back to NxStops
          </button>
        </div>

        {/* Hero */}
        <div className="text-center py-10 pb-12">
          <div className="text-4xl font-bold mb-1 bg-accent-text-gradient">
            NxStops
          </div>
          <div className="text-[11px] text-text-tertiary tracking-[0.1em] uppercase mb-4">
            by Nav&eacute;
          </div>
          <p className="text-[17px] text-text-secondary leading-relaxed max-w-[440px] mx-auto">
            Your travel companion for discovering places, planning trips, and exploring cities — wherever you are.
          </p>
        </div>

        {/* What is NxStops */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-text-primary mb-3">What is NxStops?</h2>
          <p className="text-sm leading-[1.7] text-text-body">
            NxStops is a modern travel companion built for explorers, friend groups, solo travelers, and everyone in between. Whether you're visiting a new city or rediscovering your own, NxStops helps you find what's around you, plan your day, and make the most of every stop.
          </p>
          <p className="text-sm leading-[1.7] text-text-body mt-3">
            We combine real-time data from Google Maps and Places with curated vibes and community tags so you can discover places that match your mood — from cozy brunch spots to late-night rooftops, family-friendly parks to hidden local gems.
          </p>
        </div>

        {/* Features */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-text-primary mb-3">Key Features</h2>
          <div className="grid gap-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-bg-surface-alpha backdrop-blur-[20px] rounded-2xl p-5 border border-border-subtle"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="text-[22px]">{f.icon}</span>
                  <h3 className="text-base font-semibold text-text-primary">{f.title}</h3>
                </div>
                <p className="text-[13px] leading-relaxed text-text-secondary">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Built by */}
        <div className="mb-8 text-center py-8 border-t border-border-subtle">
          <p className="text-xs text-text-tertiary uppercase tracking-[0.08em] mb-1.5">
            Built by
          </p>
          <p className="text-lg font-semibold text-text-primary">
            NxStops
          </p>
          <p className="text-[13px] text-text-secondary mt-2 leading-relaxed">
            A creative studio building tools for modern travelers.
          </p>
        </div>

        {/* CTA */}
        <div className="text-center pb-5">
          <button
            onClick={() => navigate('/')}
            className="btn-primary px-10 py-3.5 rounded-[14px] text-[15px] shadow-[0_4px_20px_var(--amber-tint-shadow)]"
          >
            Open NxStops
          </button>
        </div>

        <Footer />
      </div>
    </div>
  );
}
