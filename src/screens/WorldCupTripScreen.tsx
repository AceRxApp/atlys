import { useNavigate, useParams, Navigate } from 'react-router-dom';
import Footer from '../components/Footer';
import { WC_PARTNERS, WC_TYPE_COLORS } from '../data/worldcupTrips';

export default function WorldCupTripScreen() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();

  const partner = slug ? WC_PARTNERS[slug] : null;
  if (!partner) return <Navigate to="/worldcup" replace />;

  const isCity = partner.partnerType === 'city';
  const heroTitle = isCity
    ? `NxStops x ${partner.city}`
    : `${partner.partnerName} x FIFA World Cup 2026`;
  const heroLabel = isCity
    ? `FIFA World Cup 2026 — ${partner.city}`
    : `${partner.partnerName} x World Cup`;

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
        {/* HERO — personalized per partner                                  */}
        {/* ================================================================ */}
        <div className="text-center pt-8 pb-12">
          <div className="text-xs text-accent-amber uppercase tracking-[0.15em] font-semibold mb-4">
            {heroLabel}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary leading-tight mb-4">
            {heroTitle}
          </h1>
          <p className="text-[16px] text-text-secondary leading-relaxed max-w-[480px] mx-auto mb-8">
            {partner.heroSubtitle}
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
            {isCity ? (
              <>
                <h2 className="text-lg font-bold text-text-primary mb-3">
                  {partner.city} deserves more than a stadium map
                </h2>
                <p className="text-sm leading-[1.7] text-text-secondary mb-3">
                  Millions of fans are coming to {partner.city} for the World Cup. Most have never visited before. They'll find the {partner.venue} — but they won't find the best restaurants, the local culture, or the spots that make {partner.city} special.
                </p>
                <p className="text-sm leading-[1.7] text-text-secondary">
                  The result? Fans stuck in tourist traps, missed economic impact for local businesses, and a city experience that doesn't match the level of the World Cup.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-text-primary mb-3">
                  World Cup activations deserve better tools
                </h2>
                <p className="text-sm leading-[1.7] text-text-secondary mb-3">
                  {partner.partnerName} is investing in a World Cup activation — but the itinerary lives in a Google Doc. Creator logistics bounce around a WhatsApp group. Your team misses the best content moments because they don't know {partner.city}.
                </p>
                <p className="text-sm leading-[1.7] text-text-secondary">
                  The result? Missed content moments, confused creators, and an activation that doesn't match the level of {partner.partnerName}'s brand.
                </p>
              </>
            )}
          </div>
        </div>

        {/* ================================================================ */}
        {/* HOW IT WORKS                                                     */}
        {/* ================================================================ */}
        <div className="mb-12">
          <h2 className="text-lg font-bold text-text-primary mb-5 text-center">How it works</h2>
          <div className="grid gap-4">
            {(isCity
              ? [
                  {
                    step: '01',
                    title: 'We curate',
                    desc: `NxStops builds a custom interactive guide for ${partner.city} — ${partner.venue}, fan zones, restaurants, nightlife, and hidden gems curated by locals.`,
                  },
                  {
                    step: '02',
                    title: 'Fans explore',
                    desc: `Every visitor gets an interactive guide on their phone. Maps, directions, match schedules, and real-time recommendations for ${partner.city} — all in one place.`,
                  },
                  {
                    step: '03',
                    title: `${partner.city} shines`,
                    desc: `Every stop is a discovery moment. The best local restaurants, cultural landmarks, and nightlife — so fans experience the real ${partner.city}, not just the stadium.`,
                  },
                ]
              : [
                  {
                    step: '01',
                    title: 'We curate',
                    desc: `NxStops builds a custom branded activation guide for ${partner.partnerName} in ${partner.city} — venues, experiences, and content moments tailored to your brand aesthetic.`,
                  },
                  {
                    step: '02',
                    title: 'Creators explore',
                    desc: `Each creator gets an interactive guide on their phone. Maps, directions, time slots, and local discovery in ${partner.city} — all in one place.`,
                  },
                  {
                    step: '03',
                    title: 'Content flows',
                    desc: `Every stop is a content moment. Photogenic venues, shareable routes, and curated experiences that align with ${partner.partnerName}'s World Cup activation.`,
                  },
                ]
            ).map((item) => (
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
        {/* SAMPLE ITINERARY — partner-specific                              */}
        {/* ================================================================ */}
        <div className="mb-12">
          <div className="text-center mb-6">
            <div className="text-xs text-text-tertiary uppercase tracking-[0.12em] mb-2">
              {isCity ? 'Sample Fan Guide' : 'Sample Activation Guide'}
            </div>
            <h2 className="text-xl font-bold text-text-primary">
              {isCity ? `${partner.city} — World Cup 2026` : `${partner.partnerName} x ${partner.city}`}
            </h2>
            <p className="text-[13px] text-text-secondary mt-1.5">
              {partner.tagline}
            </p>
          </div>

          <div className="flex flex-col gap-6">
            {partner.days.map((day) => (
              <div key={day.day}>
                {/* Day header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-accent-amber flex items-center justify-center text-[13px] font-bold text-stone-900 shrink-0">
                    {day.day}
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-text-primary">Day {day.day}</div>
                    <div className="text-[11px] text-text-tertiary">{day.title}</div>
                  </div>
                </div>

                {/* Stop cards */}
                <div className="flex flex-col gap-2 pl-4 border-l-2 border-border-subtle ml-4">
                  {day.stops.map((stop, i) => (
                    <div
                      key={i}
                      className="bg-bg-surface-alpha backdrop-blur-[20px] rounded-xl p-4 border border-border-subtle ml-3 relative"
                    >
                      {/* Connector dot */}
                      <div className="absolute -left-[22px] top-4 w-2.5 h-2.5 rounded-full bg-accent-amber border-2 border-bg-body" />

                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-text-tertiary font-mono">{stop.time}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${WC_TYPE_COLORS[stop.type] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                            {stop.type}
                          </span>
                        </div>
                      </div>
                      <h4 className="text-[14px] font-semibold text-text-primary mb-1">{stop.name}</h4>
                      <p className="text-[12px] leading-relaxed text-text-secondary">{stop.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ================================================================ */}
        {/* WHAT PARTNERS GET                                                */}
        {/* ================================================================ */}
        <div className="mb-12">
          <h2 className="text-lg font-bold text-text-primary mb-5 text-center">
            What {isCity ? partner.partnerName : partner.partnerName} gets
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {(isCity
              ? [
                  { title: 'Custom city guide', desc: `Interactive ${partner.city} guide with stadiums, fan zones, restaurants, and nightlife` },
                  { title: 'Match-day maps', desc: `Walking and transit routes to ${partner.venue} and fan zones` },
                  { title: 'Offline access', desc: 'Works without wifi — fans stay on track in crowded stadiums' },
                  { title: 'Real-time updates', desc: 'Schedule changes, weather, closures — updated instantly' },
                  { title: 'Shareable links', desc: 'One link to share with every fan visiting your city' },
                  { title: 'Local business spotlight', desc: `Highlight ${partner.city}'s best restaurants, culture, and nightlife` },
                ]
              : [
                  { title: 'Custom activation guide', desc: `Branded ${partner.partnerName} itinerary with your venues and aesthetic` },
                  { title: 'Interactive maps', desc: `Walking routes between every stop in ${partner.city}` },
                  { title: 'Offline access', desc: 'Works without wifi — creators stay on track anywhere' },
                  { title: 'Real-time updates', desc: 'Change the plan on the fly. Everyone sees updates instantly' },
                  { title: 'Shareable links', desc: 'One link to share with your entire creator roster' },
                  { title: 'Content-ready stops', desc: 'Every venue selected for visual impact and brand alignment' },
                ]
            ).map((item) => (
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
        {/* CTA                                                              */}
        {/* ================================================================ */}
        <div className="text-center py-10 border-t border-border-subtle">
          <h2 className="text-xl font-bold text-text-primary mb-2">
            {isCity
              ? `Let's build ${partner.city}'s World Cup fan guide`
              : `Let's build ${partner.partnerName}'s World Cup activation guide`}
          </h2>
          <p className="text-sm text-text-secondary mb-6 max-w-[400px] mx-auto">
            {isCity
              ? `We'll curate an interactive ${partner.city} guide that helps millions of World Cup fans discover the real city.`
              : `We'll curate a ${partner.city} activation guide your creators won't forget — interactive, shareable, and on-brand.`}
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
