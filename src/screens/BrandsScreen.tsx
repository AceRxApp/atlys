import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';

export default function BrandsScreen() {
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
            NxStops for Brands
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary leading-tight mb-4">
            Elevate Your Next<br />Brand Trip
          </h1>
          <p className="text-[16px] text-text-secondary leading-relaxed max-w-[480px] mx-auto mb-8">
            Give your creators an interactive, curated trip guide they'll actually use — not a PDF itinerary they'll lose.
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
                desc: 'NxStops builds a custom branded itinerary with luxury venues, restaurants, and experiences tailored to your brand aesthetic and trip destination.',
              },
              {
                step: '02',
                title: 'Creators explore',
                desc: 'Each attendee gets an interactive trip guide on their phone. Maps, directions, time slots, and local discovery — all in one place.',
              },
              {
                step: '03',
                title: 'Content flows',
                desc: 'Every stop is a content moment. Photogenic venues, shareable routes, and curated experiences that align with your brand story.',
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
        {/* WHAT BRANDS GET                                                  */}
        {/* ================================================================ */}
        <div className="mb-12">
          <h2 className="text-lg font-bold text-text-primary mb-5 text-center">What your brand gets</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { title: 'Custom itinerary', desc: 'Branded trip plan with your venues, your aesthetic, your story' },
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
        {/* PAST TRIP DESTINATIONS                                           */}
        {/* ================================================================ */}
        <div className="mb-12">
          <h2 className="text-lg font-bold text-text-primary mb-5 text-center">Built for destinations like these</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { city: 'Positano', country: 'Italy' },
              { city: 'Mallorca', country: 'Spain' },
              { city: 'Big Sky', country: 'Montana' },
              { city: 'Tulum', country: 'Mexico' },
              { city: 'Mykonos', country: 'Greece' },
              { city: 'Bali', country: 'Indonesia' },
              { city: 'Dubai', country: 'UAE' },
              { city: 'Sydney', country: 'Australia' },
              { city: 'Tokyo', country: 'Japan' },
            ].map((d) => (
              <div
                key={d.city}
                className="bg-bg-surface-alpha backdrop-blur-[20px] rounded-xl p-3 border border-border-subtle text-center"
              >
                <div className="text-[13px] font-semibold text-text-primary">{d.city}</div>
                <div className="text-[10px] text-text-tertiary">{d.country}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ================================================================ */}
        {/* CTA                                                              */}
        {/* ================================================================ */}
        <div className="text-center py-10 border-t border-border-subtle">
          <h2 className="text-xl font-bold text-text-primary mb-2">
            Let's build your next brand trip
          </h2>
          <p className="text-sm text-text-secondary mb-6 max-w-[400px] mx-auto">
            Whether it's a product launch in Positano or a creator retreat in Tulum — we'll curate an experience your creators won't forget.
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
