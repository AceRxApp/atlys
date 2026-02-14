import { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { EventItem } from '../types';

const CATEGORY_EMOJI: Record<string, string> = {
  music: '\u{1F3B5}', sports: '\u{26BD}', comedy: '\u{1F923}',
  arts: '\u{1F3AD}', family: '\u{1F3AA}', festivals: '\u{1F389}',
};

export default function EventCard({ event }: { event: EventItem }) {
  const {
    isEventInPlan,
    addEventToPlan,
    removeFromPlan,
    tripDays,
    formatEventDate,
    formatEventTime,
  } = useApp();

  const [imgError, setImgError] = useState(false);
  const inPlan = isEventInPlan(event.id);
  const showImage = event.imageUrl && !imgError;

  return (
    <div className="card p-0 overflow-hidden">
      {showImage ? (
        <div className="h-[140px] w-full relative overflow-hidden">
          <img
            src={event.imageUrl!}
            alt={event.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover block"
            onError={() => setImgError(true)}
          />
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(to bottom, transparent 50%, var(--bg-image-overlay))` }}
          />
          <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-purple-tint-bg20 text-events-text backdrop-blur-[8px]">
            {event.category}
          </div>
        </div>
      ) : (
        <div className="h-[100px] w-full relative overflow-hidden flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, var(--events-gradient-start), var(--events-gradient-end))' }}>
          <span className="text-4xl opacity-60">{CATEGORY_EMOJI[event.category?.toLowerCase()] || '\u{1F3AB}'}</span>
          <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-purple-tint-bg20 text-events-text backdrop-blur-[8px]">
            {event.category}
          </div>
        </div>
      )}
      <div className="px-4 py-3.5">
        <h3 className="text-base font-semibold mb-1.5">{event.name}</h3>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="text-[13px] text-accent-amber font-medium">
            {formatEventDate(event.date)}
          </span>
          {event.time && (
            <span className="text-xs text-text-secondary">
              {formatEventTime(event.time)}
            </span>
          )}
        </div>
        <p className="text-xs text-text-secondary mb-2.5">
          {event.venue}{event.venueAddress ? ` — ${event.venueAddress}` : ''}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (inPlan) {
                const stop = Object.values(tripDays).flat().find(s => s.event?.id === event.id);
                if (stop) removeFromPlan(stop.id);
              } else {
                addEventToPlan(event);
              }
            }}
            aria-label={inPlan ? `Remove ${event.name} from plan` : `Add ${event.name} to plan`}
            className={`flex-1 px-4 py-3 rounded-[10px] text-[13px] font-semibold cursor-pointer min-h-[44px] ${
              inPlan
                ? 'bg-transparent text-events-text'
                : 'bg-events-gradient text-text-primary border-none'
            }`}
            style={inPlan ? { border: '1.5px solid var(--events-gradient-start)' } : undefined}
          >
            {inPlan ? '✓ In Plan' : '+ Add to Plan'}
          </button>
          {event.url && (
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Get tickets for ${event.name}`}
              className="flex-1 py-2.5 px-2.5 rounded-[10px] bg-purple-tint-bg08 border border-purple-tint-border20 text-events-text text-[13px] font-semibold text-center no-underline box-border"
            >
              Get Tickets
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
