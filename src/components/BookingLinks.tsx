import { useState } from 'react';
import { BOOKING_SERVICES } from '../data/bookingLinks';

interface Props {
  cityName: string;
  theme: Record<string, any>;
  cardStyle: React.CSSProperties;
}

const CATEGORIES = [
  { key: 'flights', label: 'Flights', emoji: '\u2708\uFE0F' },
  { key: 'hotels', label: 'Hotels & Stays', emoji: '\u{1F3E8}' },
  { key: 'experiences', label: 'Experiences', emoji: '\u{1F3AF}' },
] as const;

export default function BookingLinks({ cityName, theme, cardStyle }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      ...cardStyle,
      border: `1px solid ${theme.border.subtle}`,
      background: theme.bg.surfaceAlpha,
      padding: 0, overflow: 'hidden',
    }}>
      {/* Header (toggle) */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>{'\u{1F30D}'}</span>
          <span style={{ fontSize: '14px', fontWeight: 600, color: theme.text.primary }}>Book Your Trip</span>
        </div>
        <span style={{
          fontSize: '12px', color: theme.text.tertiary,
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
        }}>
          {'\u25BC'}
        </span>
      </button>

      {/* Body */}
      {expanded && (
        <div style={{ padding: '0 20px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {CATEGORIES.map(cat => {
            const services = BOOKING_SERVICES.filter(s => s.category === cat.key);
            if (services.length === 0) return null;
            return (
              <div key={cat.key}>
                <div style={{
                  fontSize: '12px', fontWeight: 600, color: theme.text.tertiary,
                  marginBottom: '8px', textTransform: 'uppercase' as const, letterSpacing: '0.5px',
                }}>
                  {cat.emoji} {cat.label}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {services.map(service => (
                    <a
                      key={service.id}
                      href={service.buildUrl(cityName)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '12px 14px', borderRadius: '12px',
                        background: theme.bg.elevated,
                        border: `1px solid ${theme.border.subtle}`,
                        textDecoration: 'none', cursor: 'pointer',
                      }}
                    >
                      <span style={{ fontSize: '20px', flexShrink: 0 }}>{service.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: theme.text.primary }}>
                          {service.name}
                        </div>
                        <div style={{ fontSize: '11px', color: theme.text.tertiary }}>
                          {service.description}
                        </div>
                      </div>
                      <span style={{ color: theme.text.tertiary, fontSize: '16px' }}>{'\u2197'}</span>
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
