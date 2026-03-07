import type { ItineraryAlert } from '../types';

interface Props {
  alerts: ItineraryAlert[];
  onAction: (alert: ItineraryAlert) => void;
  onDismiss: (id: string) => void;
}

/** Icon SVGs for each alert type */
function AlertIcon({ type }: { type: ItineraryAlert['type'] }) {
  if (type === 'closing_soon') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    );
  }
  if (type === 'skipped') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <polyline points="5 12 12 5 19 12" />
        <line x1="12" y1="19" x2="12" y2="5" />
      </svg>
    );
  }
  if (type === 'bonus_time') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    );
  }
  // time_swap
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

/** Style map for each alert type */
const ALERT_STYLES: Record<ItineraryAlert['type'], string> = {
  closing_soon: 'bg-amber-tint-bg10 border-amber-tint-border20 text-accent-amber',
  skipped: 'bg-bg-subtle border-border-subtle text-text-secondary',
  bonus_time: 'bg-green-tint-bg border-green-tint-border text-green-500',
  time_swap: 'bg-blue-tint-bg border-blue-tint-border text-blue-400',
};

const ACTION_STYLES: Record<ItineraryAlert['type'], string> = {
  closing_soon: 'bg-amber-tint-bg10 border-amber-tint-border20 text-accent-amber',
  skipped: 'bg-bg-elevated border-border-medium text-text-primary',
  bonus_time: 'bg-green-tint-bg border-green-tint-border text-green-500',
  time_swap: 'bg-blue-tint-bg border-blue-tint-border text-blue-400',
};

/**
 * Renders itinerary alert banners above the stop list.
 * Shows a maximum of 2 alerts at once, each with an action button and dismiss X.
 */
export default function ItineraryAlertBanner({ alerts, onAction, onDismiss }: Props) {
  // Show at most 2 alerts
  const visible = alerts.slice(0, 2);

  if (visible.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mb-3 animate-fade-in">
      {visible.map(alert => (
        <div
          key={alert.id}
          className={`flex items-center gap-2 rounded-xl px-3 py-2.5 border ${ALERT_STYLES[alert.type]}`}
        >
          {/* Icon */}
          <AlertIcon type={alert.type} />

          {/* Message */}
          <span className="flex-1 text-sm leading-snug min-w-0">
            {alert.message}
          </span>

          {/* Action button */}
          {alert.action && (
            <button
              onClick={() => onAction(alert)}
              className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border cursor-pointer whitespace-nowrap ${ACTION_STYLES[alert.type]}`}
            >
              {alert.action.label}
            </button>
          )}

          {/* Dismiss button */}
          <button
            onClick={() => onDismiss(alert.id)}
            className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md bg-transparent border-none cursor-pointer text-text-tertiary hover:text-text-secondary"
            aria-label="Dismiss alert"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
