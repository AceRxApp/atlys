import { BOOKING_SERVICES } from '../data/bookingLinks';

interface Props {
  cityName: string;
  /** Optional: only show one category ('hotels' | 'experiences'). Defaults to all. */
  category?: 'hotels' | 'experiences';
}

export default function BookingLinks({ cityName, category }: Props) {
  const services = category
    ? BOOKING_SERVICES.filter(s => s.category === category)
    : BOOKING_SERVICES;

  if (services.length === 0) return null;

  // Group by category for display
  const hotels = services.filter(s => s.category === 'hotels');
  const experiences = services.filter(s => s.category === 'experiences');

  return (
    <div className="flex flex-col gap-3">
      {/* Hotels & Stays */}
      {hotels.length > 0 && (
        <div>
          <div className="section-label mb-2">{'\u{1F3E8}'} Hotels & Stays</div>
          <div className="flex gap-2.5 overflow-x-auto pb-1 scroll-hidden">
            {hotels.map(service => (
              <a
                key={service.id}
                href={service.buildUrl(cityName)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 min-w-[110px] max-w-[130px] shrink-0 py-3.5 px-3 rounded-xl bg-bg-elevated border border-border-subtle no-underline cursor-pointer text-center"
              >
                <span className="text-2xl">{service.emoji}</span>
                <div>
                  <div className="text-[13px] font-semibold text-text-primary leading-tight">
                    {service.name}
                  </div>
                  <div className="text-[10px] text-text-tertiary mt-0.5 leading-tight">
                    {service.description}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Experiences */}
      {experiences.length > 0 && (
        <div>
          <div className="section-label mb-2">{'\u{1F3AF}'} Experiences & Tours</div>
          <div className="flex gap-2.5 overflow-x-auto pb-1 scroll-hidden">
            {experiences.map(service => (
              <a
                key={service.id}
                href={service.buildUrl(cityName)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 min-w-[110px] max-w-[130px] shrink-0 py-3.5 px-3 rounded-xl bg-bg-elevated border border-border-subtle no-underline cursor-pointer text-center"
              >
                <span className="text-2xl">{service.emoji}</span>
                <div>
                  <div className="text-[13px] font-semibold text-text-primary leading-tight">
                    {service.name}
                  </div>
                  <div className="text-[10px] text-text-tertiary mt-0.5 leading-tight">
                    {service.description}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
