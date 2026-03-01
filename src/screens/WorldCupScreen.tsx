import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import { HOST_CITIES } from '../data/worldcupTrips';

export default function WorldCupScreen() {
  const navigate = useNavigate();

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

        {/* ================================================================ */}
        {/* HERO                                                             */}
        {/* ================================================================ */}
        <div className="text-center pt-8 pb-12">
          <div className="text-xs text-accent-amber uppercase tracking-[0.15em] font-semibold mb-4">
            NxStops x FIFA World Cup 2026
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary leading-tight mb-4">
            The Fan Guide for<br />Every Host City
          </h1>
          <p className="text-[16px] text-text-secondary leading-relaxed max-w-[480px] mx-auto mb-8">
            Help millions of World Cup visitors navigate your city with interactive guides — stadiums, fan zones, restaurants, nightlife, and local culture, all in one place.
          </p>
          <a
            href="mailto:partnerships@nxstops.com?subject=FIFA%20World%20Cup%202026%20Partnership%20Inquiry"
            className="btn-primary inline-block px-8 py-3.5 rounded-[14px] text-[15px] font-semibold no-underline shadow-[0_4px_20px_var(--amber-tint-shadow)]"
          >
            Partner With Us
          </a>
        </div>

        {/* ================================================================ */}
        {/* PROBLEM                                                          */}
        {/* ================================================================ */}
        <div className="mb-12">
          <div className="bg-bg-surface-alpha backdrop-blur-[20px] rounded-2xl p-6 border border-border-subtle">
            <h2 className="text-lg font-bold text-text-primary mb-3">Millions of fans, zero city guides</h2>
            <p className="text-sm leading-[1.7] text-text-secondary mb-3">
              The 2026 FIFA World Cup brings 5+ million visitors to 11 US host cities. Most of them have never been there before. They don't know where to eat, what to see, or how to get from the stadium to the best local spots.
            </p>
            <p className="text-sm leading-[1.7] text-text-secondary">
              The result? Fans stuck in tourist traps, missed content moments for creators, and cities that don't get to show off their best side.
            </p>
          </div>
        </div>

        {/* ================================================================ */}
        {/* HOW IT WORKS                                                     */}
        {/* ================================================================ */}
        <div className="mb-12">
          <h2 className="text-lg font-bold text-text-primary mb-5 text-center">How it works</h2>
          <div className="grid gap-4">
            {[
              {
                step: '01',
                title: 'We curate',
                desc: 'NxStops builds an interactive city guide for each host city — stadiums, fan zones, restaurants, nightlife, and hidden gems curated by locals.',
              },
              {
                step: '02',
                title: 'Fans explore',
                desc: 'Every visitor gets an interactive guide on their phone. Maps, directions, match schedules, and real-time recommendations — all in one place.',
              },
              {
                step: '03',
                title: 'Cities shine',
                desc: 'Every stop is a discovery moment. The best local restaurants, cultural landmarks, and nightlife — so fans experience the real city, not just the stadium.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="bg-bg-surface-alpha backdrop-blur-[20px] rounded-2xl p-5 border border-border-subtle"
              >
                <div className="flex items-start gap-4">
                  <div className="text-2xl font-bold text-accent-amber opacity-50 leading-none pt-0.5">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-text-primary mb-1">{item.title}</h3>
                    <p className="text-[13px] leading-relaxed text-text-secondary">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ================================================================ */}
        {/* WHAT PARTNERS GET                                                */}
        {/* ================================================================ */}
        <div className="mb-12">
          <h2 className="text-lg font-bold text-text-primary mb-5 text-center">What partners get</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { title: 'Custom city guide', desc: 'Interactive guide with stadiums, fan zones, restaurants, and local picks' },
              { title: 'Match-day maps', desc: 'Walking and transit routes from hotels to stadiums and fan zones' },
              { title: 'Offline access', desc: 'Works without wifi — fans stay on track even in crowded stadiums' },
              { title: 'Real-time updates', desc: 'Weather changes, venue closures, or schedule shifts — updated instantly' },
              { title: 'Shareable links', desc: 'One link to share with fans, creators, or your entire activation team' },
              { title: 'Brand integration', desc: 'Sponsored stops, branded activations, and partner venue highlights' },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-bg-surface-alpha backdrop-blur-[20px] rounded-xl p-4 border border-border-subtle"
              >
                <h3 className="text-[13px] font-semibold text-text-primary mb-1">{item.title}</h3>
                <p className="text-[11px] leading-relaxed text-text-tertiary">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ================================================================ */}
        {/* HOST CITIES                                                      */}
        {/* ================================================================ */}
        <div className="mb-12">
          <h2 className="text-lg font-bold text-text-primary mb-5 text-center">2026 US Host Cities</h2>
          <div className="grid grid-cols-3 gap-3">
            {HOST_CITIES.map((c) => (
              <div
                key={c.city}
                className="bg-bg-surface-alpha backdrop-blur-[20px] rounded-xl p-3 border border-border-subtle text-center"
              >
                <div className="text-[13px] font-semibold text-text-primary">{c.city}</div>
                <div className="text-[10px] text-text-tertiary">{c.venue}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ================================================================ */}
        {/* CTA                                                              */}
        {/* ================================================================ */}
        <div className="text-center py-10 border-t border-border-subtle">
          <h2 className="text-xl font-bold text-text-primary mb-2">
            Let's build the ultimate fan guide
          </h2>
          <p className="text-sm text-text-secondary mb-6 max-w-[400px] mx-auto">
            Whether you're a tourism board, a sponsor, or a brand activating around the World Cup — we'll build an interactive guide your fans will actually use.
          </p>
          <a
            href="mailto:partnerships@nxstops.com?subject=FIFA%20World%20Cup%202026%20Partnership%20Inquiry"
            className="btn-primary inline-block px-10 py-3.5 rounded-[14px] text-[15px] font-semibold no-underline shadow-[0_4px_20px_var(--amber-tint-shadow)]"
          >
            partnerships@nxstops.com
          </a>
          <div className="text-[11px] text-text-tertiary mt-3">
            We typically respond within 24 hours
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}
