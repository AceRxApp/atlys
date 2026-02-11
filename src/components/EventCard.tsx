import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { getCardStyle } from '../styles/shared';
import type { EventItem } from '../types';

export default function EventCard({ event }: { event: EventItem }) {
  const {
    isEventInPlan,
    addEventToPlan,
    removeFromPlan,
    tripDays,
    formatEventDate,
    formatEventTime,
  } = useApp();
  const { theme } = useTheme();
  const cardStyle = getCardStyle(theme);

  const inPlan = isEventInPlan(event.id);

  return (
    <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
      {event.imageUrl && (
        <div style={{
          height: '140px', width: '100%', position: 'relative',
          overflow: 'hidden',
        }}>
          <img src={event.imageUrl} alt={event.name} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, transparent 50%, ${theme.bg.imageOverlay})` }} />
          <div style={{
            position: 'absolute', top: '10px', left: '10px',
            padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
            background: theme.purpleTint.bg20, color: theme.events.text, backdropFilter: 'blur(8px)',
          }}>
            {event.category}
          </div>
        </div>
      )}
      <div style={{ padding: '14px 16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>{event.name}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', color: theme.accent.amber, fontWeight: 500 }}>
            {formatEventDate(event.date)}
          </span>
          {event.time && (
            <span style={{ fontSize: '12px', color: theme.text.secondary }}>
              {formatEventTime(event.time)}
            </span>
          )}
        </div>
        <p style={{ fontSize: '12px', color: theme.text.secondary, marginBottom: '10px' }}>
          {event.venue}{event.venueAddress ? ` — ${event.venueAddress}` : ''}
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => { if (inPlan) { const stop = Object.values(tripDays).flat().find(s => s.event?.id === event.id); if (stop) removeFromPlan(stop.id); } else { addEventToPlan(event); } }}
            style={{
              flex: 1, padding: '12px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', minHeight: '44px',
              background: inPlan ? 'transparent' : `linear-gradient(135deg, ${theme.events.gradientStart}, ${theme.events.gradientEnd})`,
              color: inPlan ? theme.events.text : theme.text.primary,
              border: inPlan ? `1.5px solid ${theme.events.gradientStart}` : 'none',
            }}
          >
            {inPlan ? '✓ In Plan' : '+ Add to Plan'}
          </button>
          {event.url && (
            <a href={event.url} target="_blank" rel="noopener noreferrer"
              style={{
                flex: 1, padding: '10px', borderRadius: '10px',
                background: theme.purpleTint.bg08, border: `1px solid ${theme.purpleTint.border20}`,
                color: theme.events.text, fontSize: '13px', fontWeight: 600,
                textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box',
              }}>
              Get Tickets
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
