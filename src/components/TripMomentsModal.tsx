import { createPortal } from 'react-dom';
import { fixPhotoUrl } from '../utils/photoUrl';
import NativeImg from './NativeImg';
import type { TripHistoryEntry, StopCheckIn } from '../types';
import { haversineKm } from '../utils/transport';

interface Props {
  trip: TripHistoryEntry;
  checkIns?: Record<string, StopCheckIn>; // for current trip (has photos/notes)
  onClose: () => void;
}

/** Format an ISO date string to a human-readable date */
function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

/** Format an ISO timestamp to just the time (e.g. "2:34 PM") */
function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

/** Calculate total distance walked (km) by summing haversine between consecutive stops */
function calcTotalDistance(stops: TripHistoryEntry['stops']): number {
  let total = 0;
  for (let i = 1; i < stops.length; i++) {
    // We don't have lat/lng on TripHistoryStop — estimate from placeId count
    // This is a rough proxy; actual distance requires coordinates
  }
  return total;
}

/** Count unique categories explored */
function countCategories(breakdown: Record<string, number>): number {
  return Object.keys(breakdown).length;
}

/**
 * Generate a shareable Trip Moments card using Canvas API.
 * 800x1200 dark gradient card with NXSTOPS branding, city, date, stats, stop names.
 */
function generateMomentsCard(
  cityName: string,
  tripDate: string | null,
  stops: { name: string; category?: string }[],
  stopsVisited: number,
  categoriesExplored: number,
) {
  const W = 800;
  const H = 1200;
  const pad = 56;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1C1917');
  bg.addColorStop(0.5, '#0F0E0D');
  bg.addColorStop(1, '#0C0A09');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Amber accent line at top
  const accent = ctx.createLinearGradient(0, 0, W, 0);
  accent.addColorStop(0, '#E8940A');
  accent.addColorStop(1, '#C47D08');
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, W, 6);

  // NXSTOPS branding
  ctx.fillStyle = '#E8940A';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText('NXSTOPS', pad, 60);

  // "TRIP MOMENTS" subtitle
  ctx.fillStyle = '#78716C';
  ctx.font = '13px system-ui, sans-serif';
  ctx.letterSpacing = '3px';
  ctx.fillText('TRIP MOMENTS', pad, 88);

  // City name
  ctx.fillStyle = '#FAFAF9';
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.fillText(cityName, pad, 150);

  // Date
  if (tripDate) {
    ctx.fillStyle = '#A8A29E';
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText(formatDate(tripDate), pad, 184);
  }

  // Divider line
  ctx.strokeStyle = '#292524';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, 210);
  ctx.lineTo(W - pad, 210);
  ctx.stroke();

  // Stats row
  const statsY = 260;
  const colW = (W - pad * 2) / 3;

  // Stops visited
  ctx.fillStyle = '#E8940A';
  ctx.font = 'bold 48px system-ui, sans-serif';
  ctx.fillText(`${stopsVisited}`, pad, statsY);
  ctx.fillStyle = '#78716C';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('STOPS VISITED', pad, statsY + 24);

  // Categories
  ctx.fillStyle = '#E8940A';
  ctx.font = 'bold 48px system-ui, sans-serif';
  ctx.fillText(`${categoriesExplored}`, pad + colW, statsY);
  ctx.fillStyle = '#78716C';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('CATEGORIES', pad + colW, statsY + 24);

  // Divider line
  ctx.strokeStyle = '#292524';
  ctx.beginPath();
  ctx.moveTo(pad, 310);
  ctx.lineTo(W - pad, 310);
  ctx.stroke();

  // Stop names (up to 6)
  const listY = 360;
  ctx.fillStyle = '#78716C';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('ITINERARY', pad, listY - 16);

  const displayStops = stops.slice(0, 6);
  displayStops.forEach((s, i) => {
    const y = listY + i * 48;

    // Number
    ctx.fillStyle = '#E8940A';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText(`${i + 1}.`, pad, y + 6);

    // Name
    ctx.fillStyle = '#FAFAF9';
    ctx.font = '18px system-ui, sans-serif';
    const name = s.name.length > 35 ? s.name.slice(0, 32) + '...' : s.name;
    ctx.fillText(name, pad + 36, y + 6);

    // Category
    if (s.category) {
      ctx.fillStyle = '#57534E';
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillText(s.category, pad + 36, y + 26);
    }
  });

  if (stops.length > 6) {
    const moreY = listY + 6 * 48 + 6;
    ctx.fillStyle = '#78716C';
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText(`+${stops.length - 6} more stops`, pad + 36, moreY);
  }

  // Footer branding
  ctx.fillStyle = '#57534E';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('Built with nxstops.com', pad, H - 40);

  // Amber line at bottom
  ctx.fillStyle = accent;
  ctx.fillRect(0, H - 6, W, 6);

  // Share / download
  canvas.toBlob(blob => {
    if (!blob) return;
    const file = new File(
      [blob],
      `nxstops-moments-${cityName.toLowerCase().replace(/\s+/g, '-')}.png`,
      { type: 'image/png' },
    );
    if (navigator.canShare?.({ files: [file] })) {
      navigator.share({ files: [file], title: `My ${cityName} Trip Moments \u2014 NxStops` });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, 'image/png');
}

/**
 * Full-screen modal showing a trip timeline with photos, journal entries, and ratings.
 * Rendered via createPortal to document.body.
 */
export default function TripMomentsModal({ trip, checkIns, onClose }: Props) {
  const stopsVisited = trip.totalStops;
  const categoriesExplored = countCategories(trip.categoryBreakdown);

  // Build timeline entries by merging stops with check-in data and moments
  const timelineEntries = trip.stops.map(stop => {
    const ci = checkIns?.[stop.placeId || ''];
    const moment = trip.moments?.find(m => m.stopId === (stop.placeId || ''));

    const checkedInAt = ci?.checkedInAt || moment?.checkedInAt || null;
    const photos = ci?.photos || moment?.photos || [];
    const journalNote = ci?.journalNote || moment?.note || null;
    const rating = trip.ratings[stop.placeId || ''] || stop.rating || null;

    return {
      name: stop.name,
      category: stop.category || '',
      photoUrl: stop.photoUrl,
      placeId: stop.placeId,
      checkedInAt,
      photos,
      journalNote,
      rating,
    };
  });

  const handleShare = () => {
    generateMomentsCard(
      trip.city,
      trip.tripStartDate,
      trip.stops.map(s => ({ name: s.name, category: s.category })),
      stopsVisited,
      categoriesExplored,
    );
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-bg-modal-overlay-deep z-[1001] flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="bg-bg-surface rounded-t-3xl max-w-[430px] w-full max-h-[92vh] overflow-auto border border-border-subtle border-b-0"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-8">
          {/* Handle bar */}
          <div className="flex justify-center mb-4">
            <div className="w-10 h-1 rounded-full bg-border-medium" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xl font-bold text-text-primary">{trip.city}</div>
              {trip.tripStartDate && (
                <div className="text-xs text-text-tertiary mt-0.5">
                  {formatDate(trip.tripStartDate)}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-bg-subtle border border-border-subtle flex items-center justify-center cursor-pointer"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="text-center py-3 px-2 rounded-xl bg-bg-subtle border border-border-subtle">
              <div className="text-xl font-bold text-accent-amber">{stopsVisited}</div>
              <div className="text-[10px] text-text-tertiary uppercase tracking-wider">Stops</div>
            </div>
            <div className="text-center py-3 px-2 rounded-xl bg-bg-subtle border border-border-subtle">
              <div className="text-xl font-bold text-text-primary">{categoriesExplored}</div>
              <div className="text-[10px] text-text-tertiary uppercase tracking-wider">Categories</div>
            </div>
            <div className="text-center py-3 px-2 rounded-xl bg-bg-subtle border border-border-subtle">
              <div className="text-xl font-bold text-text-primary">{trip.dayCount}</div>
              <div className="text-[10px] text-text-tertiary uppercase tracking-wider">
                {trip.dayCount === 1 ? 'Day' : 'Days'}
              </div>
            </div>
          </div>

          {/* Timeline section */}
          <div className="mb-5">
            <div className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">
              Timeline
            </div>

            <div className="relative pl-6">
              {/* Vertical amber timeline line */}
              <div
                className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-accent-amber opacity-30"
              />

              {timelineEntries.map((entry, i) => (
                <div key={i} className="relative mb-5 last:mb-0">
                  {/* Amber dot on the line */}
                  <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-accent-amber border-2 border-bg-surface" />

                  {/* Time */}
                  {entry.checkedInAt && (
                    <div className="text-[10px] text-text-tertiary mb-0.5">
                      {formatTime(entry.checkedInAt)}
                    </div>
                  )}

                  {/* Stop name + category */}
                  <div className="text-sm font-semibold text-text-primary">{entry.name}</div>
                  {entry.category && (
                    <div className="text-xs text-text-tertiary">{entry.category}</div>
                  )}

                  {/* Rating indicator */}
                  {entry.rating && (
                    <div className="mt-1 inline-flex items-center gap-1">
                      {entry.rating === 'up' ? (
                        <span className="text-xs px-2 py-0.5 rounded-md bg-green-tint-bg border border-green-tint-border text-green-500">
                          {'\uD83D\uDC4D'} Liked
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-md bg-red-tint-bg border border-red-tint-border text-red-400">
                          {'\uD83D\uDC4E'} Nah
                        </span>
                      )}
                    </div>
                  )}

                  {/* Photo thumbnails (horizontal scroll) */}
                  {entry.photos.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto mt-2 pb-1 -mx-1 px-1 scrollbar-hide">
                      {entry.photos.map((photoSrc, pi) => (
                        <NativeImg
                          key={pi}
                          src={fixPhotoUrl(photoSrc) || photoSrc}
                          alt={`${entry.name} photo ${pi + 1}`}
                          className="w-20 h-20 rounded-lg object-cover shrink-0 border border-border-subtle"
                        />
                      ))}
                    </div>
                  )}

                  {/* Journal note */}
                  {entry.journalNote && (
                    <div className="mt-2 text-xs text-text-secondary bg-bg-subtle border border-border-subtle rounded-lg px-3 py-2 italic">
                      "{entry.journalNote}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Category breakdown */}
          {Object.keys(trip.categoryBreakdown).length > 0 && (
            <div className="mb-5">
              <div className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">
                Categories Explored
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(trip.categoryBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, count]) => (
                    <span
                      key={cat}
                      className="text-xs px-2.5 py-1 rounded-lg bg-amber-tint-bg10 text-accent-amber border border-amber-tint-border20"
                    >
                      {cat} ({count})
                    </span>
                  ))}
              </div>
            </div>
          )}

          {/* Share Moments button */}
          <button
            onClick={handleShare}
            className="w-full py-3.5 rounded-xl bg-amber-tint-bg10 border border-amber-tint-border20 text-accent-amber text-sm font-semibold cursor-pointer flex items-center justify-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            Share Moments
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
