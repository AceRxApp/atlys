import { useState } from 'react';
import { BOOKING_SERVICES } from '../data/bookingLinks';

interface Props {
  cityName: string;
}

const CATEGORIES = [
  { key: 'flights', label: 'Flights', emoji: '\u2708\uFE0F' },
  { key: 'hotels', label: 'Hotels & Stays', emoji: '\u{1F3E8}' },
  { key: 'experiences', label: 'Experiences', emoji: '\u{1F3AF}' },
] as const;

export default function BookingLinks({ cityName }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card p-0 overflow-hidden">
      {/* Header (toggle) */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 bg-transparent border-none cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-lg">{'\u{1F30D}'}</span>
          <span className="text-sm font-semibold text-text-primary">Book Your Trip</span>
        </div>
        <span
          className="text-xs text-text-tertiary transition-transform duration-200"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          {'\u25BC'}
        </span>
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-5 pb-4 flex flex-col gap-4">
          {CATEGORIES.map(cat => {
            const services = BOOKING_SERVICES.filter(s => s.category === cat.key);
            if (services.length === 0) return null;
            return (
              <div key={cat.key}>
                <div className="section-label">
                  {cat.emoji} {cat.label}
                </div>
                <div className="flex flex-col gap-1.5">
                  {services.map(service => (
                    <a
                      key={service.id}
                      href={service.buildUrl(cityName)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-bg-elevated border border-border-subtle no-underline cursor-pointer"
                    >
                      <span className="text-xl shrink-0">{service.emoji}</span>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-text-primary">
                          {service.name}
                        </div>
                        <div className="text-[11px] text-text-tertiary">
                          {service.description}
                        </div>
                      </div>
                      <span className="text-text-tertiary text-base">{'\u2197'}</span>
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
