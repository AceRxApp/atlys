import { useState } from 'react';
import { fixPhotoUrl } from '../utils/photoUrl';
import NativeImg from './NativeImg';
import { buildMapsUrl } from '../utils/transport';
import type { Stop } from '../types';

/** Generate a teaser clue based on stop category without revealing the name */
function getMysteryTeaser(stop: Stop): string {
  const category = (stop.place?.category || stop.event?.category || '').toLowerCase();
  const name = (stop.place?.name || stop.event?.name || '').toLowerCase();

  if (/restaurant|food|bistro|diner|grill|bbq|seafood|steak|brunch/i.test(category))
    return 'A delicious spot where locals eat...';
  if (/cafe|coffee|tea|bakery/i.test(category))
    return 'A cozy place to sip and savor...';
  if (/bar|pub|brewery|wine|cocktail|nightclub/i.test(category))
    return 'A place to raise a glass...';
  if (/park|garden|hiking|nature|trail/i.test(category))
    return 'A breath of fresh air awaits...';
  if (/beach|waterfront|marina|pier/i.test(category))
    return 'Waves and views are calling...';
  if (/museum|gallery|art|cultural/i.test(category))
    return 'Culture and stories to discover...';
  if (/market|shopping|store|mall|boutique/i.test(category))
    return 'A treasure trove of finds...';
  if (/temple|church|mosque|shrine|monument/i.test(category))
    return 'A place of wonder and history...';
  if (/safari|wildlife|zoo|aquarium/i.test(category))
    return 'Wild encounters ahead...';
  if (/spa|wellness|yoga/i.test(category))
    return 'Relaxation is on the horizon...';
  if (stop.type === 'event')
    return 'An experience you won\'t forget...';
  return 'Something special awaits around the corner...';
}

interface Props {
  currentStop: Stop;
  nextStop: Stop | null;
  currentStopIndex: number;
  totalStops: number;
  nextStopWalkMin: number | null;
  nextStopDistance: string | null;
  shouldLeaveNow: boolean;
  leaveByMessage: string | null;
  tripComplete: boolean;
  onCheckIn: (stopId: string) => void;
  onEndTrip: () => void;
}

/** Get name from a Stop regardless of type */
function getStopName(stop: Stop): string {
  return stop.type === 'event'
    ? (stop.event?.name || 'Event')
    : (stop.place?.name || 'Place');
}

/** Get category display from a Stop */
function getStopCategory(stop: Stop): string {
  return stop.type === 'event'
    ? (stop.event?.category || 'Event')
    : (stop.place?.categoryDisplay || '');
}

/** Get photo URL from a Stop */
function getStopPhoto(stop: Stop): string | null {
  if (stop.type === 'place' && stop.place?.photoUrl) {
    return fixPhotoUrl(stop.place.photoUrl);
  }
  if (stop.type === 'event' && stop.event?.imageUrl) {
    return stop.event.imageUrl;
  }
  return null;
}

/** Get coords from a Stop */
function getStopCoords(stop: Stop): { lat: number; lng: number } | null {
  if (stop.type === 'place' && stop.place?.lat && stop.place?.lng) {
    return { lat: stop.place.lat, lng: stop.place.lng };
  }
  if (stop.type === 'event' && stop.event?.lat && stop.event?.lng) {
    return { lat: stop.event.lat, lng: stop.event.lng };
  }
  return null;
}

/**
 * Sticky banner shown at the top of PlanScreen during Explore Mode.
 * Displays the current stop with photo, progress dots, check-in / directions buttons,
 * leave-by warnings, and next stop preview.
 */
export default function ExploreModeBanner({
  currentStop,
  nextStop,
  currentStopIndex,
  totalStops,
  nextStopWalkMin,
  nextStopDistance,
  shouldLeaveNow,
  leaveByMessage,
  tripComplete,
  onCheckIn,
  onEndTrip,
}: Props) {
  // ── Trip complete state ────────────────────────────────────────────
  if (tripComplete) {
    return (
      <div className="bg-bg-elevated border border-green-tint-border rounded-2xl p-4 mb-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-green-500 uppercase tracking-wider">
            Explore Mode
          </span>
          {/* All dots filled */}
          <div className="flex gap-1">
            {Array.from({ length: totalStops }).map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-green-500"
              />
            ))}
          </div>
        </div>

        {/* Completion message */}
        <div className="text-center py-4">
          <div className="text-2xl mb-1">{'\uD83C\uDF89'} Trip complete!</div>
          <div className="text-sm text-text-secondary">
            You visited all {totalStops} stops. Amazing day!
          </div>
        </div>

        {/* End trip */}
        <button
          onClick={onEndTrip}
          className="w-full py-3 rounded-xl btn-primary text-sm font-semibold cursor-pointer"
        >
          Wrap Up Trip
        </button>
      </div>
    );
  }

  const [mysteryMode, setMysteryMode] = useState(false);

  const photo = getStopPhoto(currentStop);
  const name = getStopName(currentStop);
  const category = getStopCategory(currentStop);
  const currentCoords = getStopCoords(currentStop);

  // Build Google Maps directions URL
  let directionsUrl: string | null = null;
  if (currentCoords) {
    // Use current location as origin (Google Maps resolves it)
    directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${currentCoords.lat},${currentCoords.lng}&travelmode=walking`;
  }

  return (
    <div className="bg-bg-elevated border border-green-tint-border rounded-2xl p-4 mb-4 animate-fade-in">
      {/* Header: label + mystery toggle + progress dots */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-green-500 uppercase tracking-wider">
            {mysteryMode ? 'Mystery Mode' : 'Explore Mode'}
          </span>
          <button
            onClick={() => setMysteryMode(!mysteryMode)}
            className={`text-[10px] font-semibold py-0.5 px-2 rounded-full border cursor-pointer transition-colors ${
              mysteryMode
                ? 'bg-accent-amber text-text-on-accent border-accent-amber'
                : 'bg-transparent text-text-tertiary border-border-medium'
            }`}
          >
            {mysteryMode ? '\u{1F52E} On' : '\u{1F52E} Mystery'}
          </button>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: totalStops }).map((_, i) => {
            const isCurrent = i === currentStopIndex;
            const isChecked = i < currentStopIndex;
            return (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  isChecked
                    ? 'bg-green-500'
                    : isCurrent
                      ? 'bg-green-500 animate-pulse'
                      : mysteryMode
                        ? 'bg-accent-amber/30'
                        : 'bg-border-medium'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Current stop: photo + info */}
      <div className="flex items-center gap-3 mb-3">
        {/* Photo */}
        {photo ? (
          <NativeImg
            src={photo}
            alt={name}
            className="w-14 h-14 rounded-xl object-cover shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-bg-subtle border border-border-subtle flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
        )}

        {/* Name + category + badge */}
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold text-text-primary truncate">{name}</div>
          <div className="text-xs text-text-tertiary truncate">{category}</div>
          <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-tint-bg border border-green-tint-border">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-semibold text-green-500 uppercase">You are here</span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => onCheckIn(currentStop.id)}
          className="flex-1 py-2.5 rounded-xl bg-green-tint-bg border border-green-tint-border text-green-500 text-sm font-semibold cursor-pointer flex items-center justify-center gap-1.5"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Check In
        </button>
        {directionsUrl && (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2.5 rounded-xl bg-transparent border border-border-medium text-text-secondary text-sm font-semibold cursor-pointer flex items-center justify-center gap-1.5 no-underline"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11" />
            </svg>
            Directions
          </a>
        )}
      </div>

      {/* Should-leave-now warning */}
      {leaveByMessage && nextStop && (
        <div className={`flex items-center gap-2 rounded-xl px-3 py-2 mb-3 ${
          shouldLeaveNow
            ? 'bg-amber-tint-bg10 border border-amber-tint-border20'
            : 'bg-bg-subtle border border-border-subtle'
        }`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={shouldLeaveNow ? 'var(--accent-amber)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className={`text-xs font-medium ${shouldLeaveNow ? 'text-accent-amber' : 'text-text-secondary'}`}>
            {leaveByMessage} to reach {getStopName(nextStop)}
          </span>
        </div>
      )}

      {/* Next stop preview / mystery teaser */}
      {nextStop && (
        <div className="flex items-center gap-2 pt-2 border-t border-border-subtle">
          {mysteryMode ? (
            <>
              <span className="text-xs text-accent-amber">{'\u{1F52E}'}</span>
              <span className="text-xs font-medium text-accent-amber/80 italic truncate">
                {getMysteryTeaser(nextStop)}
              </span>
            </>
          ) : (
            <>
              <span className="text-xs text-text-tertiary">Next:</span>
              <span className="text-xs font-medium text-text-secondary truncate">
                {getStopName(nextStop)}
              </span>
              {nextStopWalkMin != null && nextStopDistance != null && (
                <span className="text-xs text-text-tertiary ml-auto shrink-0">
                  {nextStopDistance} {'\u00B7'} {nextStopWalkMin}min walk
                </span>
              )}
            </>
          )}
        </div>
      )}

      {/* End trip */}
      <button
        onClick={onEndTrip}
        className="w-full mt-3 py-1.5 bg-transparent border-none text-xs text-text-tertiary cursor-pointer hover:text-text-secondary"
      >
        End Trip
      </button>
    </div>
  );
}
