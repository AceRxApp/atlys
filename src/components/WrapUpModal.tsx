import { useState, useCallback } from 'react';
import { track } from '@vercel/analytics';
import { useApp } from '../context/AppContext';
import { fixPhotoUrl } from '../utils/photoUrl';
import NativeImg from './NativeImg';

/** Generate a shareable Trip Story Card using Canvas API */
function generateTripStoryCard(
  cityName: string,
  tripDate: string | null,
  stops: { name: string; category?: string; rating?: 'up' | 'down' }[],
  totalSpend: number,
  categoryBreakdown: Record<string, number>,
) {
  const W = 800;
  const H = 600;
  const pad = 48;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1C1917');
  bg.addColorStop(1, '#0C0A09');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Amber accent line at top
  const accent = ctx.createLinearGradient(0, 0, W, 0);
  accent.addColorStop(0, '#E8940A');
  accent.addColorStop(1, '#C47D08');
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, W, 5);

  // NxStops branding
  ctx.fillStyle = '#E8940A';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText('NXSTOPS', pad, 44);

  // City name
  ctx.fillStyle = '#FAFAF9';
  ctx.font = 'bold 36px system-ui, sans-serif';
  ctx.fillText(cityName, pad, 100);

  // Date
  if (tripDate) {
    ctx.fillStyle = '#A8A29E';
    ctx.font = '16px system-ui, sans-serif';
    const d = new Date(tripDate + 'T00:00:00');
    ctx.fillText(d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), pad, 130);
  }

  // Stats row
  const statsY = 175;
  ctx.fillStyle = '#E8940A';
  ctx.font = 'bold 42px system-ui, sans-serif';
  ctx.fillText(`${stops.length}`, pad, statsY);
  ctx.fillStyle = '#A8A29E';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('stops', pad, statsY + 24);

  if (totalSpend > 0) {
    ctx.fillStyle = '#E8940A';
    ctx.font = 'bold 42px system-ui, sans-serif';
    ctx.fillText(`$${totalSpend}`, pad + 160, statsY);
    ctx.fillStyle = '#A8A29E';
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('estimated spend', pad + 160, statsY + 24);
  }

  // Top categories
  const catY = 260;
  ctx.fillStyle = '#78716C';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('TOP CATEGORIES', pad, catY);

  const topCats = Object.entries(categoryBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  ctx.font = '15px system-ui, sans-serif';
  topCats.forEach(([cat, count], i) => {
    ctx.fillStyle = '#FAFAF9';
    ctx.fillText(`${cat}`, pad, catY + 28 + i * 26);
    ctx.fillStyle = '#78716C';
    ctx.fillText(` (${count})`, pad + ctx.measureText(cat).width, catY + 28 + i * 26);
  });

  // Stops list (right column or below)
  const listX = W / 2;
  ctx.fillStyle = '#78716C';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('ITINERARY', listX, catY);

  const liked = stops.filter(s => s.rating === 'up');
  const displayStops = liked.length > 0 ? liked.slice(0, 6) : stops.slice(0, 6);

  ctx.font = '14px system-ui, sans-serif';
  displayStops.forEach((s, i) => {
    const y = catY + 28 + i * 28;
    // Number
    ctx.fillStyle = '#E8940A';
    ctx.fillText(`${i + 1}.`, listX, y);
    // Name
    ctx.fillStyle = '#FAFAF9';
    const name = s.name.length > 28 ? s.name.slice(0, 25) + '...' : s.name;
    ctx.fillText(name, listX + 24, y);
    // Thumbs up indicator
    if (s.rating === 'up') {
      ctx.fillText('\u{1F44D}', listX + 24 + ctx.measureText(name).width + 6, y);
    }
  });
  if (stops.length > 6) {
    ctx.fillStyle = '#78716C';
    ctx.fillText(`+${stops.length - 6} more`, listX + 24, catY + 28 + 6 * 28);
  }

  // Footer
  ctx.fillStyle = '#57534E';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('Built with nxstops.com', pad, H - 30);

  // Amber line at bottom
  ctx.fillStyle = accent;
  ctx.fillRect(0, H - 5, W, 5);

  // Share / download
  track('trip_story_card', { city: cityName, stops: String(stops.length) });
  canvas.toBlob(blob => {
    if (!blob) return;
    const file = new File([blob], `nxstops-trip-${cityName.toLowerCase().replace(/\s+/g, '-')}.png`, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      navigator.share({ files: [file], title: `My ${cityName} Trip — NxStops` });
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

export default function WrapUpModal() {
  const {
    tripDays,
    dayPlan,
    totalStops,
    dayCount,
    cityLabel,
    estimatedSpend,
    tripStartDate,
    dismissWrapUp,
    confirmClearPlan,
  } = useApp();

  const [step, setStep] = useState<'rate' | 'summary'>('rate');
  const [ratings, setRatings] = useState<Record<string, 'up' | 'down'>>({});

  const allStops = Object.values(tripDays).flat();

  const toggleRating = useCallback((stopId: string, rating: 'up' | 'down') => {
    setRatings(prev => {
      if (prev[stopId] === rating) {
        const next = { ...prev };
        delete next[stopId];
        return next;
      }
      return { ...prev, [stopId]: rating };
    });
  }, []);

  // Category breakdown for summary
  const categoryBreakdown: Record<string, number> = {};
  allStops.forEach(s => {
    const cat = s.type === 'event' ? 'Event' : (s.place?.categoryDisplay || 'Other');
    categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
  });

  const likedCount = Object.values(ratings).filter(r => r === 'up').length;

  const handleShare = () => {
    generateTripStoryCard(
      cityLabel,
      tripStartDate,
      allStops.map(s => ({
        name: s.place?.name || s.event?.name || 'Stop',
        category: s.type === 'event' ? 'Event' : (s.place?.categoryDisplay || ''),
        rating: ratings[s.id],
      })),
      estimatedSpend,
      categoryBreakdown,
    );
  };

  const handleDone = () => {
    confirmClearPlan(ratings);
  };

  return (
    <div
      className="fixed inset-0 bg-bg-modal-overlay-deep z-[1000] flex items-end justify-center"
      onClick={dismissWrapUp}
    >
      <div
        className="bg-bg-surface rounded-t-3xl max-w-[430px] md:max-w-[600px] w-full max-h-[85vh] overflow-auto border border-border-subtle border-b-0"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-8">
          {/* Handle bar */}
          <div className="flex justify-center mb-4">
            <div className="w-10 h-1 rounded-full bg-border-medium" />
          </div>

          {step === 'rate' && (
            <>
              <div className="text-center mb-5">
                <div className="text-2xl mb-1">How was your trip?</div>
                <div className="text-sm text-text-secondary">
                  Rate your stops to help us plan better next time
                </div>
              </div>

              <div className="flex flex-col gap-2 mb-5 max-h-[50vh] overflow-auto">
                {allStops.map((stop, i) => {
                  const name = stop.place?.name || stop.event?.name || 'Stop';
                  const cat = stop.type === 'event' ? (stop.event?.category || 'Event') : (stop.place?.categoryDisplay || '');
                  const photo = stop.place?.photoUrl ? fixPhotoUrl(stop.place.photoUrl) : null;
                  const r = ratings[stop.id];

                  return (
                    <div key={stop.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-bg-subtle border border-border-subtle">
                      {/* Stop number */}
                      <div className="w-6 h-6 rounded-full bg-accent-gradient text-text-on-accent flex items-center justify-center text-xs font-bold shrink-0">
                        {i + 1}
                      </div>

                      {/* Photo */}
                      {photo && (
                        <NativeImg
                          src={photo}
                          alt={name}
                          className="w-10 h-10 rounded-lg object-cover shrink-0"
                        />
                      )}

                      {/* Name + category */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-text-primary truncate">{name}</div>
                        <div className="text-xs text-text-tertiary truncate">{cat}</div>
                      </div>

                      {/* Thumbs */}
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => toggleRating(stop.id, 'up')}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center text-base cursor-pointer border ${
                            r === 'up'
                              ? 'bg-green-tint-bg border-green-tint-border'
                              : 'bg-transparent border-border-subtle'
                          }`}
                        >
                          {'\u{1F44D}'}
                        </button>
                        <button
                          onClick={() => toggleRating(stop.id, 'down')}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center text-base cursor-pointer border ${
                            r === 'down'
                              ? 'bg-red-tint-bg border-red-tint-border'
                              : 'bg-transparent border-border-subtle'
                          }`}
                        >
                          {'\u{1F44E}'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('summary')}
                  className="flex-1 py-3 rounded-xl bg-transparent border border-border-medium text-text-secondary text-sm cursor-pointer"
                >
                  Skip
                </button>
                <button
                  onClick={() => setStep('summary')}
                  className="flex-1 py-3 rounded-xl btn-primary text-sm font-semibold cursor-pointer"
                >
                  Next
                </button>
              </div>
            </>
          )}

          {step === 'summary' && (
            <>
              <div className="text-center mb-5">
                <div className="text-2xl mb-1">Trip Recap</div>
                <div className="text-sm text-text-secondary">{cityLabel}</div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="text-center py-3 px-2 rounded-xl bg-bg-subtle border border-border-subtle">
                  <div className="text-xl font-bold text-accent-amber">{totalStops}</div>
                  <div className="text-xs text-text-tertiary">stops</div>
                </div>
                <div className="text-center py-3 px-2 rounded-xl bg-bg-subtle border border-border-subtle">
                  <div className="text-xl font-bold text-text-primary">{dayCount}</div>
                  <div className="text-xs text-text-tertiary">{dayCount === 1 ? 'day' : 'days'}</div>
                </div>
                <div className="text-center py-3 px-2 rounded-xl bg-bg-subtle border border-border-subtle">
                  <div className="text-xl font-bold text-text-primary">~${estimatedSpend}</div>
                  <div className="text-xs text-text-tertiary">spend</div>
                </div>
              </div>

              {/* Category breakdown */}
              {Object.keys(categoryBreakdown).length > 0 && (
                <div className="mb-5">
                  <div className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">Categories</div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(categoryBreakdown)
                      .sort((a, b) => b[1] - a[1])
                      .map(([cat, count]) => (
                        <span key={cat} className="text-xs px-2.5 py-1 rounded-lg bg-amber-tint-bg10 text-accent-amber border border-amber-tint-border20">
                          {cat} ({count})
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* Liked stops highlight */}
              {likedCount > 0 && (
                <div className="mb-5">
                  <div className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">
                    Your favorites ({likedCount})
                  </div>
                  <div className="flex flex-col gap-1">
                    {allStops
                      .filter(s => ratings[s.id] === 'up')
                      .map(s => (
                        <div key={s.id} className="text-sm text-text-primary flex items-center gap-2">
                          <span className="text-green-500">{'\u{1F44D}'}</span>
                          {s.place?.name || s.event?.name || 'Stop'}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={handleShare}
                  className="w-full py-3.5 rounded-xl bg-amber-tint-bg10 border border-amber-tint-border20 text-accent-amber text-sm font-semibold cursor-pointer flex items-center justify-center gap-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                  Share Trip Story Card
                </button>
                <button
                  onClick={handleDone}
                  className="w-full py-3.5 rounded-xl btn-primary text-sm font-semibold cursor-pointer"
                >
                  Done — Save & Clear Plan
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
