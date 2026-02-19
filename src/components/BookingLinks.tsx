import { useState } from 'react';
import { BOOKING_SERVICES } from '../data/bookingLinks';

interface Props {
  cityName: string;
  category?: 'hotels' | 'experiences';
}

export default function BookingLinks({ cityName, category }: Props) {
  const [openUrl, setOpenUrl] = useState<string | null>(null);
  const [openLabel, setOpenLabel] = useState('');

  const services = category
    ? BOOKING_SERVICES.filter(s => s.category === category)
    : BOOKING_SERVICES;

  const experiences = services.filter(s => s.category === 'experiences');

  if (experiences.length === 0) return null;

  return (
    <>
      <div>
        <div className="section-label mb-2">{'\u{1F3AF}'} Experiences & Tours</div>
        <div className="flex gap-2.5 overflow-x-auto pb-1 scroll-hidden">
          {experiences.map(service => (
            <button
              key={service.id}
              onClick={() => {
                setOpenUrl(service.buildUrl(cityName));
                setOpenLabel(service.name);
              }}
              className="flex flex-col items-center gap-2 min-w-[110px] max-w-[130px] shrink-0 py-3.5 px-3 rounded-xl bg-bg-elevated border border-border-subtle cursor-pointer text-center"
            >
              <span className="text-2xl">{service.emoji}</span>
              <div>
                <div className="text-[13px] font-semibold text-text-primary leading-tight">
                  {service.name}
                </div>
                <div className="text-[11px] text-text-tertiary mt-0.5 leading-tight">
                  {service.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* In-App Browser Modal */}
      {openUrl && (
        <div className="fixed inset-0 z-[1000] flex flex-col bg-bg-surface">
          {/* Header bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-bg-nav shrink-0">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <span className="text-base">{'\u{1F3AF}'}</span>
              <span className="text-[14px] font-semibold text-text-primary truncate">{openLabel}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={openUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] text-accent-amber font-medium no-underline px-2 py-1"
              >
                Open in Browser
              </a>
              <button
                onClick={() => setOpenUrl(null)}
                className="bg-transparent border-none text-text-tertiary text-xl cursor-pointer p-2 leading-none"
                aria-label="Close"
              >
                {'\u2715'}
              </button>
            </div>
          </div>
          {/* Iframe */}
          <iframe
            src={openUrl}
            title={openLabel}
            className="flex-1 w-full border-none"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation"
          />
        </div>
      )}
    </>
  );
}
