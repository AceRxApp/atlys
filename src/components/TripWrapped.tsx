import { useMemo, useCallback, useRef, useState } from 'react';
import InstagramStoryCard from './InstagramStoryCard';

interface TripHistoryEntry {
  id: string;
  city: string;
  title: string | null;
  totalStops: number;
  dayCount: number;
  savedAt: string;
  tripStartDate: string | null;
  totalEstimatedSpend: number;
  categoryBreakdown: Record<string, number>;
  ratings: Record<string, 'up' | 'down'>;
  stops: { name: string; category?: string; rating?: 'up' | 'down' }[];
  moments?: { stopId: string; photos: string[]; note: string; checkedInAt: string }[];
}

interface TripWrappedProps {
  trip: TripHistoryEntry;
  onClose: () => void;
  useMiles?: boolean;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  restaurant: '\u{1F37D}\u{FE0F}',
  cafe: '\u{2615}',
  bar: '\u{1F378}',
  nightclub: '\u{1F3B6}',
  park: '\u{1F333}',
  museum: '\u{1F3DB}\u{FE0F}',
  beach: '\u{1F3D6}\u{FE0F}',
  shopping: '\u{1F6CD}\u{FE0F}',
  temple: '\u{26E9}\u{FE0F}',
  hotel: '\u{1F3E8}',
  market: '\u{1F6D2}',
  landmark: '\u{1F3F0}',
};

function getCategoryEmoji(category: string): string {
  const lower = category.toLowerCase();
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJIS)) {
    if (lower.includes(key)) return emoji;
  }
  return '\u{1F4CD}';
}

function getWrappedTitle(trip: TripHistoryEntry): string {
  const likedCount = Object.values(trip.ratings).filter(r => r === 'up').length;
  const ratio = likedCount / Math.max(1, trip.totalStops);
  if (ratio >= 0.8) return 'A Trip to Remember';
  if (trip.dayCount >= 5) return 'The Grand Adventure';
  if (trip.totalStops >= 10) return 'Non-Stop Explorer';
  return 'Your Trip Wrapped';
}

function getPersonality(trip: TripHistoryEntry): { title: string; emoji: string; description: string } {
  const cats = trip.categoryBreakdown;
  const foodCount = (cats['restaurant'] || 0) + (cats['cafe'] || 0) + (cats['bar'] || 0);
  const cultureCount = (cats['museum'] || 0) + (cats['temple'] || 0) + (cats['landmark'] || 0);
  const outdoorCount = (cats['park'] || 0) + (cats['beach'] || 0) + (cats['hiking'] || 0);
  const total = trip.totalStops;

  if (foodCount / total > 0.5) return { title: 'The Foodie', emoji: '\u{1F9D1}\u{200D}\u{1F373}', description: 'Your trip was a culinary adventure!' };
  if (cultureCount / total > 0.4) return { title: 'Culture Seeker', emoji: '\u{1F3AD}', description: 'You soaked in history and art at every turn.' };
  if (outdoorCount / total > 0.4) return { title: 'Nature Lover', emoji: '\u{1F3DE}\u{FE0F}', description: 'Fresh air and great views defined your trip.' };
  if (trip.dayCount >= 5) return { title: 'Marathon Traveler', emoji: '\u{1F30D}', description: 'You explored like a true adventurer!' };
  return { title: 'Well-Rounded Explorer', emoji: '\u{1F9ED}', description: 'You experienced a bit of everything!' };
}

export default function TripWrapped({ trip, onClose, useMiles: _useMiles }: TripWrappedProps) {
  const [showStoryCard, setShowStoryCard] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const stats = useMemo(() => {
    const likedStops = trip.stops.filter(s => s.rating === 'up');
    const topCategories = Object.entries(trip.categoryBreakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
    const personality = getPersonality(trip);
    const photoCount = trip.moments?.reduce((sum, m) => sum + m.photos.length, 0) || 0;
    
    return { likedStops, topCategories, personality, photoCount };
  }, [trip]);

  const shareWrapped = useCallback(async () => {
    const text = [
      `${getWrappedTitle(trip)} — ${trip.city}`,
      `${trip.totalStops} stops across ${trip.dayCount} day${trip.dayCount > 1 ? 's' : ''}`,
      stats.personality.emoji + ' ' + stats.personality.title,
      `\nPlanned with NxStops`,
    ].join('\n');

    try {
      if (navigator.share) {
        await navigator.share({ title: `My ${trip.city} Trip Wrapped`, text });
      } else {
        await navigator.clipboard.writeText(text);
      }
    } catch { /* user cancelled */ }
  }, [trip, stats]);

  const personality = stats.personality;
  const topCats = stats.topCategories;
  const likedCount = stats.likedStops.length;
  const tripDate = trip.tripStartDate 
    ? new Date(trip.tripStartDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : new Date(trip.savedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  return (
    <div
      className="modal-backdrop fixed inset-0 bg-bg-modal-overlay-deep z-[1000] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        ref={cardRef}
        className="w-full max-w-[380px] rounded-3xl overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(165deg, #1A0A00 0%, #2D1200 30%, #1A0800 100%)',
        }}
      >
        {/* Top section — city & date */}
        <div className="px-6 pt-8 pb-4 text-center">
          <div className="text-[10px] uppercase tracking-[3px] text-amber-400/50 mb-2 font-bold">
            {tripDate}
          </div>
          <h2 className="text-2xl font-black text-white mb-1 tracking-tight">
            {trip.city}
          </h2>
          <div className="text-xs text-amber-200/60">
            {getWrappedTitle(trip)}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-px mx-6 rounded-xl overflow-hidden mb-5" style={{ background: 'rgba(232,148,10,0.15)' }}>
          {[
            { value: trip.totalStops, label: 'Stops' },
            { value: trip.dayCount, label: trip.dayCount === 1 ? 'Day' : 'Days' },
            { value: stats.photoCount || likedCount, label: stats.photoCount ? 'Photos' : 'Liked' },
          ].map(s => (
            <div key={s.label} className="text-center py-3" style={{ background: 'rgba(26,10,0,0.8)' }}>
              <div className="text-xl font-black text-amber-400">{s.value}</div>
              <div className="text-[9px] uppercase tracking-wider text-amber-200/40 font-bold">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Personality badge */}
        <div className="mx-6 mb-4 p-4 rounded-2xl text-center" style={{ background: 'rgba(232,148,10,0.08)', border: '1px solid rgba(232,148,10,0.15)' }}>
          <div className="text-3xl mb-1">{personality.emoji}</div>
          <div className="text-sm font-bold text-amber-300 mb-0.5">{personality.title}</div>
          <div className="text-[11px] text-amber-200/50">{personality.description}</div>
        </div>

        {/* Top categories */}
        {topCats.length > 0 && (
          <div className="mx-6 mb-4">
            <div className="text-[9px] uppercase tracking-[2px] text-amber-200/30 font-bold mb-2">Your Favorites</div>
            <div className="flex flex-wrap gap-1.5">
              {topCats.map(([cat, count]) => (
                <span key={cat} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs" style={{ background: 'rgba(232,148,10,0.1)', border: '1px solid rgba(232,148,10,0.15)' }}>
                  <span>{getCategoryEmoji(cat)}</span>
                  <span className="text-amber-200/70 capitalize">{cat}</span>
                  <span className="text-amber-400 font-bold">{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Top liked stops */}
        {stats.likedStops.length > 0 && (
          <div className="mx-6 mb-5">
            <div className="text-[9px] uppercase tracking-[2px] text-amber-200/30 font-bold mb-2">Highlights</div>
            {stats.likedStops.slice(0, 4).map((stop, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5">
                <span className="text-amber-400 text-xs font-bold w-4 text-right">{i + 1}</span>
                <span className="text-xs text-amber-100/80">{stop.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Footer — branding + share */}
        <div className="px-6 pb-6 flex items-center justify-between">
          <div className="text-[10px] text-amber-200/25 font-bold tracking-wider">
            NXSTOPS
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowStoryCard(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer border border-amber-200/30 bg-transparent"
              style={{ color: '#E8940A' }}
            >
              IG Story
            </button>
            <button
              onClick={shareWrapped}
              className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer border-none"
              style={{
                background: 'linear-gradient(135deg, #E8940A, #D85A18)',
                color: '#fff',
              }}
            >
              Share {'\u{1F4E4}'}
            </button>
          </div>
        </div>
      </div>

      {showStoryCard && (
        <InstagramStoryCard
          cityName={trip.city}
          dateRange={trip.tripStartDate
            ? `${new Date(trip.tripStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${trip.dayCount > 1 ? ` - ${new Date(new Date(trip.tripStartDate).getTime() + (trip.dayCount - 1) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : `, ${new Date(trip.tripStartDate).getFullYear()}`}`
            : new Date(trip.savedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          stopsCount={trip.totalStops}
          totalDistanceKm={trip.totalStops * 1.2}
          cuisineCount={Object.keys(trip.categoryBreakdown).filter(c => ['restaurant', 'cafe', 'bar', 'bakery', 'ice_cream_shop'].includes(c)).length}
          photoCount={trip.moments?.reduce((sum, m) => sum + m.photos.length, 0) || 0}
          personality={personality.title}
          personalitySub={personality.description}
          topStops={trip.stops.slice(0, 3).map(s => ({ name: s.name, category: s.category || 'spot' }))}
          onClose={() => setShowStoryCard(false)}
        />
      )}
    </div>
  );
}
