import { useState, useMemo } from 'react';
import NativeImg from './NativeImg';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NearbyEvent {
  id: string;
  name: string;
  date: string;
  time: string;
  venue: string;
  imageUrl: string | null;
  category: string;
  url: string;
}

interface NearbyEventsProps {
  events: NearbyEvent[];
  onAddToPlan: (eventId: string) => void;
  isInPlan: (eventId: string) => boolean;
  compact?: boolean;
}

// ---------------------------------------------------------------------------
// Category helpers
// ---------------------------------------------------------------------------

const CATEGORY_EMOJI: Record<string, string> = {
  music: '\u{1F3B5}',
  sports: '\u{26BD}',
  comedy: '\u{1F923}',
  arts: '\u{1F3AD}',
  family: '\u{1F3AA}',
  festivals: '\u{1F389}',
};

const CATEGORY_GRADIENTS: Record<string, string> = {
  music: 'linear-gradient(135deg, #7C3AED, #A855F7)',
  sports: 'linear-gradient(135deg, #059669, #34D399)',
  comedy: 'linear-gradient(135deg, #D97706, #FBBF24)',
  arts: 'linear-gradient(135deg, #DB2777, #F472B6)',
  family: 'linear-gradient(135deg, #2563EB, #60A5FA)',
  festivals: 'linear-gradient(135deg, #DC2626, #F87171)',
};

const DEFAULT_GRADIENT = 'linear-gradient(135deg, var(--events-gradient-start), var(--events-gradient-end))';

// ---------------------------------------------------------------------------
// Date / time helpers
// ---------------------------------------------------------------------------

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isTodayOrTomorrow(dateStr: string): boolean {
  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 2);

  // Parse date string — handle "YYYY-MM-DD" and other formats
  const eventDate = startOfDay(new Date(dateStr));
  return eventDate >= today && eventDate < dayAfter;
}

function getDateLabel(dateStr: string): string {
  const now = new Date();
  const today = startOfDay(now);
  const eventDate = startOfDay(new Date(dateStr));
  const diff = eventDate.getTime() - today.getTime();
  if (diff === 0) return 'Today';
  if (diff > 0 && diff <= 86400000) return 'Tomorrow';
  return '';
}

/**
 * Determines whether an event is "happening now" — i.e. the event date is
 * today and the start time was within the last 2 hours.
 */
function isHappeningNow(dateStr: string, timeStr: string): boolean {
  if (!timeStr) return false;

  const now = new Date();
  const today = startOfDay(now);
  const eventDate = startOfDay(new Date(dateStr));

  // Only applies to today's events
  if (eventDate.getTime() !== today.getTime()) return false;

  // Parse time string — supports "7:00 PM", "19:00", "7:00PM", etc.
  const normalized = timeStr.trim().toUpperCase();
  let hours = 0;
  let minutes = 0;

  const match12 = normalized.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  const match24 = normalized.match(/^(\d{1,2}):(\d{2})$/);

  if (match12) {
    hours = parseInt(match12[1], 10);
    minutes = parseInt(match12[2], 10);
    const period = match12[3];
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
  } else if (match24) {
    hours = parseInt(match24[1], 10);
    minutes = parseInt(match24[2], 10);
  } else {
    return false;
  }

  const eventTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
  const diffMs = now.getTime() - eventTime.getTime();

  // Event started but less than 2 hours ago
  return diffMs >= 0 && diffMs <= 2 * 60 * 60 * 1000;
}

function formatTimeDisplay(timeStr: string): string {
  if (!timeStr) return '';
  // Return as-is — already formatted from the API
  return timeStr;
}

// ---------------------------------------------------------------------------
// NearbyEvents Component
// ---------------------------------------------------------------------------

export default function NearbyEvents({
  events,
  onAddToPlan,
  isInPlan,
  compact = false,
}: NearbyEventsProps) {
  // Filter to today + tomorrow only
  const filteredEvents = useMemo(
    () => events.filter((e) => isTodayOrTomorrow(e.date)),
    [events],
  );

  if (filteredEvents.length === 0) return null;

  return (
    <div className="mt-3">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3 px-1">
        <span className="text-base">{'\u{1F3AB}'}</span>
        <span className="text-sm font-semibold text-text-primary">Nearby Events</span>
        <span className="text-[11px] text-text-tertiary ml-auto">
          {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Horizontal scroll row */}
      <div
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {filteredEvents.map((event) => (
          <EventMiniCard
            key={event.id}
            event={event}
            onAddToPlan={onAddToPlan}
            inPlan={isInPlan(event.id)}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EventMiniCard (internal)
// ---------------------------------------------------------------------------

function EventMiniCard({
  event,
  onAddToPlan,
  inPlan,
  compact,
}: {
  event: NearbyEvent;
  onAddToPlan: (id: string) => void;
  inPlan: boolean;
  compact: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const showImage = event.imageUrl && !imgError;
  const happeningNow = isHappeningNow(event.date, event.time);
  const dateLabel = getDateLabel(event.date);
  const categoryKey = event.category?.toLowerCase() || '';
  const emoji = CATEGORY_EMOJI[categoryKey] || '\u{1F3AB}';
  const gradient = CATEGORY_GRADIENTS[categoryKey] || DEFAULT_GRADIENT;

  const cardWidth = compact ? 'w-[200px]' : 'w-[220px]';
  const imageHeight = compact ? 'h-[90px]' : 'h-[110px]';

  return (
    <div
      className={`${cardWidth} shrink-0 rounded-xl overflow-hidden bg-bg-elevated border border-purple-tint-border15`}
    >
      {/* Image / gradient placeholder */}
      {showImage ? (
        <div className={`${imageHeight} w-full relative overflow-hidden`}>
          <NativeImg
            src={event.imageUrl!}
            alt={event.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover block"
            onError={() => setImgError(true)}
          />
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, transparent 40%, var(--bg-image-overlay))',
            }}
          />
          {/* Category badge on image */}
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-tint-bg20 text-events-text backdrop-blur-[8px]">
            {event.category}
          </div>
          {/* Happening now badge */}
          {happeningNow && (
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500 text-white animate-pulse">
              LIVE
            </div>
          )}
        </div>
      ) : (
        <div
          className={`${imageHeight} w-full relative overflow-hidden flex items-center justify-center`}
          style={{ background: gradient }}
        >
          <span className="text-3xl opacity-60">{emoji}</span>
          {/* Category badge */}
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-tint-bg20 text-events-text backdrop-blur-[8px]">
            {event.category}
          </div>
          {happeningNow && (
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500 text-white animate-pulse">
              LIVE
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="px-3 py-2.5">
        {/* Event name */}
        <h4 className="text-[13px] font-semibold text-text-primary truncate leading-tight">
          {event.name}
        </h4>

        {/* Venue */}
        <p className="text-[11px] text-text-secondary truncate mt-0.5">{event.venue}</p>

        {/* Date + Time row */}
        <div className="flex items-center gap-1.5 mt-1.5">
          {dateLabel && (
            <span className="text-[10px] font-semibold text-accent-amber">{dateLabel}</span>
          )}
          {event.time && (
            <span className="text-[10px] text-text-tertiary">
              {dateLabel ? '\u00B7 ' : ''}
              {formatTimeDisplay(event.time)}
            </span>
          )}
          {happeningNow && (
            <span className="text-[10px] font-semibold text-red-400 ml-auto">Happening now</span>
          )}
        </div>

        {/* Add to Plan button */}
        <button
          onClick={() => onAddToPlan(event.id)}
          aria-label={inPlan ? `${event.name} is in your plan` : `Add ${event.name} to plan`}
          className={`w-full mt-2.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-all duration-150 ${
            inPlan
              ? 'bg-purple-tint-bg08 text-events-text border border-purple-tint-border20'
              : 'bg-events-gradient text-text-primary border-none'
          }`}
        >
          {inPlan ? '\u2713 In Plan' : '+ Add to Plan'}
        </button>
      </div>
    </div>
  );
}
