import { useState, useMemo } from 'react';
import { APIProvider, Map as GoogleMap, AdvancedMarker } from '@vis.gl/react-google-maps';
import type { Place } from '../services/places';
import type { EventItem } from '../types';
import { formatDistance } from '../services/places';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LumeMapProps {
  places: Place[];
  events: EventItem[];
  apiKey: string;
  center: { lat: number; lng: number };
  colorScheme: 'DARK' | 'LIGHT';
  useMiles: boolean;
  onSelectPlace: (place: Place) => void;
  onAddToPlan: (place: Place) => void;
}

interface LumeZone {
  id: string;
  lat: number;
  lng: number;
  places: Place[];
  events: EventItem[];
  dominantCategory: 'food' | 'nightlife' | 'culture' | 'outdoors' | 'shopping';
  intensity: number; // 0-1 how "hot" this zone is
  hasLiveEvents: boolean;
}

// ---------------------------------------------------------------------------
// Category classification
// ---------------------------------------------------------------------------

const FOOD_CATS = new Set([
  'restaurant', 'cafe', 'coffee_shop', 'bakery', 'meal_delivery',
  'meal_takeaway', 'brunch_restaurant', 'breakfast_restaurant',
  'chinese_restaurant', 'japanese_restaurant', 'korean_restaurant',
  'italian_restaurant', 'mexican_restaurant', 'thai_restaurant',
  'indian_restaurant', 'vietnamese_restaurant', 'french_restaurant',
  'greek_restaurant', 'turkish_restaurant', 'spanish_restaurant',
  'american_restaurant', 'brazilian_restaurant', 'lebanese_restaurant',
  'indonesian_restaurant', 'mediterranean_restaurant', 'seafood_restaurant',
  'steak_house', 'sushi_restaurant', 'ramen_restaurant', 'pizza_restaurant',
  'hamburger_restaurant', 'sandwich_shop', 'ice_cream_shop', 'dessert_shop',
  'fine_dining_restaurant', 'fast_food_restaurant', 'vegan_restaurant',
  'vegetarian_restaurant',
]);

const NIGHTLIFE_CATS = new Set([
  'bar', 'wine_bar', 'night_club', 'karaoke', 'casino',
  'comedy_club', 'live_music_venue',
]);

const CULTURE_CATS = new Set([
  'museum', 'art_gallery', 'library', 'performing_arts_theater',
  'movie_theater', 'cultural_center', 'historical_landmark',
  'church', 'mosque', 'hindu_temple', 'synagogue',
]);

const OUTDOORS_CATS = new Set([
  'park', 'national_park', 'hiking_area', 'campground',
  'beach', 'garden', 'zoo', 'aquarium', 'amusement_park',
  'tourist_attraction', 'stadium', 'ski_resort',
]);

function classifyPlace(category: string): LumeZone['dominantCategory'] {
  if (NIGHTLIFE_CATS.has(category)) return 'nightlife';
  if (FOOD_CATS.has(category)) return 'food';
  if (CULTURE_CATS.has(category)) return 'culture';
  if (OUTDOORS_CATS.has(category)) return 'outdoors';
  return 'shopping';
}

// ---------------------------------------------------------------------------
// Color schemes for each category
// ---------------------------------------------------------------------------

const ZONE_COLORS: Record<LumeZone['dominantCategory'], {
  core: string; glow: string; ring: string; label: string; emoji: string;
}> = {
  food:      { core: 'rgba(232,148,10,0.9)',  glow: 'rgba(232,148,10,0.35)', ring: 'rgba(232,148,10,0.12)', label: '#E8940A', emoji: '🍽️' },
  nightlife: { core: 'rgba(168,85,247,0.9)',   glow: 'rgba(168,85,247,0.35)', ring: 'rgba(168,85,247,0.12)', label: '#A855F7', emoji: '🌙' },
  culture:   { core: 'rgba(59,130,246,0.9)',   glow: 'rgba(59,130,246,0.35)', ring: 'rgba(59,130,246,0.12)', label: '#3B82F6', emoji: '🏛️' },
  outdoors:  { core: 'rgba(34,197,94,0.9)',    glow: 'rgba(34,197,94,0.35)',  ring: 'rgba(34,197,94,0.12)',  label: '#22C55E', emoji: '🌿' },
  shopping:  { core: 'rgba(244,114,182,0.9)',  glow: 'rgba(244,114,182,0.35)',ring: 'rgba(244,114,182,0.12)',label: '#F472B6', emoji: '🛍️' },
};

// ---------------------------------------------------------------------------
// Clustering: group nearby places into zones
// ---------------------------------------------------------------------------

function clusterPlaces(
  places: Place[],
  events: EventItem[],
  gridSizeLat = 0.004, // ~450m cells
  gridSizeLng = 0.005,
): LumeZone[] {
  const grid = new Map<string, { places: Place[]; events: EventItem[] }>();

  // Bucket places
  for (const p of places) {
    if (!p.lat || !p.lng) continue;
    const gx = Math.floor(p.lat / gridSizeLat);
    const gy = Math.floor(p.lng / gridSizeLng);
    const key = `${gx}:${gy}`;
    if (!grid.has(key)) grid.set(key, { places: [], events: [] });
    grid.get(key)!.places.push(p);
  }

  // Bucket events into nearest zone
  const todayStr = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter(e => e.date === todayStr && e.lat != null && e.lng != null);
  for (const e of todayEvents) {
    const gx = Math.floor(e.lat! / gridSizeLat);
    const gy = Math.floor(e.lng! / gridSizeLng);
    const key = `${gx}:${gy}`;
    if (!grid.has(key)) grid.set(key, { places: [], events: [] });
    grid.get(key)!.events.push(e);
  }

  const zones: LumeZone[] = [];
  let maxCount = 1;

  for (const [key, bucket] of grid) {
    if (bucket.places.length === 0 && bucket.events.length === 0) continue;
    const totalCount = bucket.places.length + bucket.events.length;
    if (totalCount > maxCount) maxCount = totalCount;
  }

  for (const [key, bucket] of grid) {
    if (bucket.places.length === 0 && bucket.events.length === 0) continue;

    // Compute zone center
    const allLats = [...bucket.places.map((p: Place) => p.lat), ...bucket.events.map((e: EventItem) => e.lat!)];
    const allLngs = [...bucket.places.map((p: Place) => p.lng), ...bucket.events.map((e: EventItem) => e.lng!)];
    const centerLat = allLats.reduce((s, v) => s + v, 0) / allLats.length;
    const centerLng = allLngs.reduce((s, v) => s + v, 0) / allLngs.length;

    // Determine dominant category
    const catCounts: Record<string, number> = {};
    for (const p of bucket.places) {
      const cat = classifyPlace(p.category);
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    }
    // Events boost nightlife/culture
    for (const e of bucket.events) {
      const cat = e.category?.toLowerCase().includes('music') || e.category?.toLowerCase().includes('night')
        ? 'nightlife' : 'culture';
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    }
    const dominant = (Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'food') as LumeZone['dominantCategory'];

    const totalCount = bucket.places.length + bucket.events.length;
    const intensity = Math.min(totalCount / Math.max(maxCount, 1), 1);

    zones.push({
      id: key,
      lat: centerLat,
      lng: centerLng,
      places: bucket.places,
      events: bucket.events,
      dominantCategory: dominant,
      intensity,
      hasLiveEvents: bucket.events.length > 0,
    });
  }

  return zones;
}

// ---------------------------------------------------------------------------
// Glow Marker (the animated orb)
// ---------------------------------------------------------------------------

function GlowMarker({
  zone,
  onClick,
  isActive,
}: {
  zone: LumeZone;
  onClick: () => void;
  isActive: boolean;
}) {
  const colors = ZONE_COLORS[zone.dominantCategory];
  const count = zone.places.length + zone.events.length;

  // Size: 28px min, up to 56px for dense zones
  const size = Math.round(28 + zone.intensity * 28);
  // Pulse speed: live events pulse faster
  const pulseSpeed = zone.hasLiveEvents ? '1.5s' : '3s';

  return (
    <div
      onClick={onClick}
      className="relative cursor-pointer"
      style={{ width: size + 20, height: size + 20 }}
    >
      {/* Outer pulse ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: colors.ring,
          animation: `lume-pulse ${pulseSpeed} ease-in-out infinite`,
        }}
      />
      {/* Mid glow */}
      <div
        className="absolute rounded-full"
        style={{
          inset: 4,
          background: colors.glow,
          animation: `lume-glow ${pulseSpeed} ease-in-out infinite`,
          animationDelay: '0.2s',
          filter: 'blur(2px)',
        }}
      />
      {/* Core orb */}
      <div
        className="absolute rounded-full flex items-center justify-center"
        style={{
          inset: 10,
          background: `radial-gradient(circle at 40% 35%, ${colors.core}, ${colors.glow})`,
          boxShadow: `0 0 ${8 + zone.intensity * 12}px ${colors.glow}, 0 0 ${16 + zone.intensity * 20}px ${colors.ring}`,
          border: isActive ? '2px solid white' : 'none',
        }}
      >
        <span className="text-white font-bold" style={{ fontSize: Math.max(10, size * 0.35) }}>
          {count}
        </span>
      </div>
      {/* Live event sparkle indicator */}
      {zone.hasLiveEvents && (
        <div
          className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full"
          style={{
            background: '#FBBF24',
            boxShadow: '0 0 6px rgba(251,191,36,0.6)',
            animation: 'lume-sparkle 1s ease-in-out infinite',
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Zone Detail Panel
// ---------------------------------------------------------------------------

function ZonePanel({
  zone,
  useMiles,
  onSelectPlace,
  onAddToPlan,
  onClose,
}: {
  zone: LumeZone;
  useMiles: boolean;
  onSelectPlace: (place: Place) => void;
  onAddToPlan: (place: Place) => void;
  onClose: () => void;
}) {
  const colors = ZONE_COLORS[zone.dominantCategory];
  const topPlaces = zone.places
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 5);

  return (
    <div className="absolute bottom-3 left-3 right-3 z-20 rounded-2xl border border-border-subtle overflow-hidden"
      style={{ background: 'var(--bg-card)', backdropFilter: 'blur(20px)' }}>
      {/* Header */}
      <div className="flex items-center gap-2.5 p-3 border-b border-border-subtle"
        style={{ background: `linear-gradient(135deg, ${colors.ring}, transparent)` }}>
        <span className="text-xl">{colors.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-text-primary">
            {zone.places.length} spot{zone.places.length !== 1 ? 's' : ''}
            {zone.events.length > 0 && (
              <span className="text-[#FBBF24] ml-1.5">
                + {zone.events.length} event{zone.events.length !== 1 ? 's' : ''} live
              </span>
            )}
          </div>
          <div className="text-[11px] text-text-tertiary capitalize">{zone.dominantCategory} district</div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-bg-subtle flex items-center justify-center text-text-tertiary text-sm border-none cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* Places list */}
      <div className="max-h-[200px] overflow-y-auto">
        {topPlaces.map(place => (
          <div
            key={place.placeId}
            className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border-subtle last:border-b-0"
          >
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-text-primary truncate">{place.name}</div>
              <div className="text-[11px] text-text-tertiary">
                {place.categoryDisplay}
                {place.rating > 0 && <span className="text-accent-amber ml-1">★ {place.rating.toFixed(1)}</span>}
                {place.distance != null && <span className="ml-1">· {formatDistance(place.distance, useMiles)}</span>}
              </div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={() => onSelectPlace(place)}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-accent-amber text-[#0C0A09] border-none cursor-pointer"
              >
                View
              </button>
              <button
                onClick={() => onAddToPlan(place)}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-border-medium bg-transparent text-text-secondary cursor-pointer"
              >
                + Plan
              </button>
            </div>
          </div>
        ))}

        {/* Events in zone */}
        {zone.events.map(event => (
          <div
            key={event.id}
            className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border-subtle last:border-b-0"
            style={{ background: 'rgba(251,191,36,0.04)' }}
          >
            <span className="text-base shrink-0">🎫</span>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-text-primary truncate">{event.name}</div>
              <div className="text-[11px] text-text-tertiary truncate">{event.time} · {event.venue}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------

function LumeLegend() {
  return (
    <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5">
      {(['food', 'nightlife', 'culture', 'outdoors'] as const).map(cat => {
        const c = ZONE_COLORS[cat];
        return (
          <div
            key={cat}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium"
            style={{
              background: 'rgba(12,10,9,0.75)',
              backdropFilter: 'blur(8px)',
              color: c.label,
              border: `1px solid ${c.ring}`,
            }}
          >
            <div className="w-2 h-2 rounded-full" style={{ background: c.core, boxShadow: `0 0 4px ${c.glow}` }} />
            <span className="capitalize">{cat}</span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LumeMap — Main Component
// ---------------------------------------------------------------------------

export default function LumeMap({
  places,
  events,
  apiKey,
  center,
  colorScheme,
  useMiles,
  onSelectPlace,
  onAddToPlan,
}: LumeMapProps) {
  const [activeZone, setActiveZone] = useState<string | null>(null);

  const zones = useMemo(
    () => clusterPlaces(places, events),
    [places, events],
  );

  const selectedZone = zones.find(z => z.id === activeZone);

  if (!apiKey) {
    return (
      <div className="text-center py-10 px-5">
        <div className="text-[32px] mb-2">✨</div>
        <p className="text-text-secondary text-sm">Lume map requires Google Maps API key</p>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-280px)] rounded-2xl overflow-hidden border border-border-subtle">
      <LumeLegend />

      {/* Live events badge */}
      {zones.some(z => z.hasLiveEvents) && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold"
          style={{
            background: 'rgba(12,10,9,0.75)',
            backdropFilter: 'blur(8px)',
            color: '#FBBF24',
            border: '1px solid rgba(251,191,36,0.25)',
          }}>
          <div className="w-2 h-2 rounded-full bg-[#FBBF24]" style={{ animation: 'lume-sparkle 1s ease-in-out infinite' }} />
          Live events
        </div>
      )}

      <APIProvider apiKey={apiKey}>
        <GoogleMap
          defaultCenter={center}
          defaultZoom={14}
          gestureHandling="greedy"
          disableDefaultUI={true}
          mapId="lume-map"
          style={{ width: '100%', height: '100%' }}
          colorScheme={colorScheme}
          onClick={() => setActiveZone(null)}
        >
          {zones.map(zone => (
            <AdvancedMarker
              key={zone.id}
              position={{ lat: zone.lat, lng: zone.lng }}
              onClick={() => setActiveZone(activeZone === zone.id ? null : zone.id)}
            >
              <GlowMarker
                zone={zone}
                onClick={() => setActiveZone(activeZone === zone.id ? null : zone.id)}
                isActive={activeZone === zone.id}
              />
            </AdvancedMarker>
          ))}
        </GoogleMap>
      </APIProvider>

      {/* Zone detail panel */}
      {selectedZone && (
        <ZonePanel
          zone={selectedZone}
          useMiles={useMiles}
          onSelectPlace={onSelectPlace}
          onAddToPlan={onAddToPlan}
          onClose={() => setActiveZone(null)}
        />
      )}
    </div>
  );
}
