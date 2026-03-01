import { useNavigate, useParams, Navigate } from 'react-router-dom';
import Footer from '../components/Footer';
import { BRAND_TRIPS, TYPE_COLORS } from '../data/brandTrips';

export default function BrandTripScreen() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();

  const brand = slug ? BRAND_TRIPS[slug] : null;
  if (!brand) return <Navigate to="/brands" replace />;

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
        {/* HERO — personalized per brand                                    */}
        {/* ================================================================ */}
        <div className="text-center pt-8 pb-12">
          <div className="text-xs text-accent-amber uppercase tracking-[0.15em] font-semibold mb-4">
            NxStops for Brands
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary leading-tight mb-4">
            {brand.brandName} x {brand.destination}
          </h1>
          <p className="text-[16px] text-text-secondary leading-relaxed max-w-[480px] mx-auto mb-8">
            {brand.heroSubtitle}
          </p>
          <a
            href="mailto:partnerships@nxstops.com?subject=Brand%20Trip%20Partnership%20Inquiry"
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
            <h2 className="text-lg font-bold text-text-primary mb-3">Brand trips deserve better tools</h2>
            <p className="text-sm leading-[1.7] text-text-secondary mb-3">
              Your brand spends months planning the perfect creator trip. But the itinerary lives in a Google Doc. Logistics bounce around a WhatsApp group. Creators miss the best local spots because they don't know the city.
            </p>
            <p className="text-sm leading-[1.7] text-text-secondary">
              The result? Missed content moments, confused creators, and experiences that don't match the level of your brand.
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
                desc: `NxStops builds a custom branded itinerary with luxury venues, restaurants, and experiences tailored to ${brand.brandName}'s aesthetic and trip destination.`,
              },
              {
                step: '02',
                title: 'Creators explore',
                desc: 'Each attendee gets an interactive trip guide on their phone. Maps, directions, time slots, and local discovery — all in one place.',
              },
              {
                step: '03',
                title: 'Content flows',
                desc: `Every stop is a content moment. Photogenic venues, shareable routes, and curated experiences that align with ${brand.brandName}'s brand story.`,
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
        {/* MOCK TRIP — brand-specific                                       */}
        {/* ================================================================ */}
        <div className="mb-12">
          <div className="text-center mb-6">
            <div className="text-xs text-text-tertiary uppercase tracking-[0.12em] mb-2">
              Sample Brand Trip
            </div>
            <h2 className="text-xl font-bold text-text-primary">
              {brand.brandName} x {brand.destination}
            </h2>
            <p className="text-[13px] text-text-secondary mt-1.5">
              {brand.tagline}
            </p>
          </div>

          <div className="flex flex-col gap-6">
            {brand.days.map((day) => (
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
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${TYPE_COLORS[stop.type] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
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
        {/* WHAT BRANDS GET                                                  */}
        {/* ================================================================ */}
        <div className="mb-12">
          <h2 className="text-lg font-bold text-text-primary mb-5 text-center">What {brand.brandName} gets</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { title: 'Custom itinerary', desc: `Branded trip plan with ${brand.brandName}'s venues, aesthetic, and story` },
              { title: 'Interactive maps', desc: 'Walking and driving routes between every stop' },
              { title: 'Offline access', desc: 'Works without wifi — creators stay on track anywhere' },
              { title: 'Real-time updates', desc: 'Change the plan on the fly. Everyone sees updates instantly' },
              { title: 'Shareable links', desc: 'One link to share the entire trip with your creator roster' },
              { title: 'Content-ready stops', desc: 'Every venue selected for visual impact and brand alignment' },
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
        {/* CTA                                                              */}
        {/* ================================================================ */}
        <div className="text-center py-10 border-t border-border-subtle">
          <h2 className="text-xl font-bold text-text-primary mb-2">
            Let's build {brand.brandName}'s next brand trip
          </h2>
          <p className="text-sm text-text-secondary mb-6 max-w-[400px] mx-auto">
            We'll curate a {brand.destination} experience your creators won't forget — interactive, shareable, and on-brand.
          </p>
          <a
            href="mailto:partnerships@nxstops.com?subject=Brand%20Trip%20Partnership%20Inquiry"
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
