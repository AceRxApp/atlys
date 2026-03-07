import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { searchNearby } from '../services/places';
import type { Place } from '../services/places';
import type { Stop } from '../types';
import { haversineKm, calcWalkMinutes } from '../utils/transport';
import { fixPhotoUrl } from '../utils/photoUrl';
import NativeImg from './NativeImg';

// Cache nearby results per stopId to avoid refetching
const nearbyCache = new Map<string, Place[]>();

function getStopCoords(stop: Stop): { lat: number; lng: number } | null {
  if (stop.type === 'place' && stop.place?.lat && stop.place?.lng) {
    return { lat: stop.place.lat, lng: stop.place.lng };
  }
  if (stop.type === 'event' && stop.event?.lat && stop.event?.lng) {
    return { lat: stop.event.lat, lng: stop.event.lng };
  }
  return null;
}

export default function NearbyDiscoveries({ stop }: { stop: Stop }) {
  const { addToPlan, isInPlan, showToast } = useApp();

  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const fetchedRef = useRef(false);

  const coords = getStopCoords(stop);

  useEffect(() => {
    if (!coords || fetchedRef.current) return;
    fetchedRef.current = true;

    // Check cache first
    const cached = nearbyCache.get(stop.id);
    if (cached) {
      setResults(cached);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    searchNearby(coords.lat, coords.lng, ['eatsip', 'thespot'], 500)
      .then(places => {
        if (cancelled) return;
        // Filter out places already in plan and limit to 5
        const filtered = places
          .filter(p => !isInPlan(p.placeId))
          .slice(0, 5);
        nearbyCache.set(stop.id, filtered);
        setResults(filtered);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [stop.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-filter on every render to reflect plan changes
  const filteredResults = results.filter(p => !isInPlan(p.placeId));

  if (!coords) return null;

  // Loading state
  if (loading) {
    return (
      <div className="mt-3 p-4 rounded-xl bg-bg-subtle border border-border-subtle">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="text-base">{'\u{1F4CD}'}</span>
          <span className="text-sm font-semibold text-text-primary">Nearby Discoveries</span>
        </div>
        <div className="flex items-center justify-center py-6">
          <div className="w-5 h-5 border-2 border-accent-amber border-t-transparent rounded-full animate-spin" />
          <span className="ml-2.5 text-xs text-text-tertiary">Finding nearby spots...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="mt-3 p-4 rounded-xl bg-bg-subtle border border-border-subtle">
        <div className="flex items-center gap-2.5">
          <span className="text-base">{'\u{1F4CD}'}</span>
          <span className="text-sm font-semibold text-text-primary">Nearby Discoveries</span>
        </div>
        <p className="text-xs text-text-tertiary mt-2">Could not load nearby spots. Try again later.</p>
      </div>
    );
  }

  // Empty state
  if (filteredResults.length === 0 && !loading) {
    return (
      <div className="mt-3 p-4 rounded-xl bg-bg-subtle border border-border-subtle">
        <div className="flex items-center gap-2.5">
          <span className="text-base">{'\u{1F4CD}'}</span>
          <span className="text-sm font-semibold text-text-primary">Nearby Discoveries</span>
        </div>
        <p className="text-xs text-text-tertiary mt-2">No nearby spots found</p>
      </div>
    );
  }

  return (
    <div className="mt-3 p-4 rounded-xl bg-bg-subtle border border-border-subtle">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="text-base">{'\u{1F4CD}'}</span>
        <span className="text-sm font-semibold text-text-primary">Nearby Discoveries</span>
        <span className="text-[11px] text-text-tertiary ml-auto">within 500m</span>
      </div>

      <div className="flex flex-col gap-2">
        {filteredResults.map(place => {
          const distKm = haversineKm(coords, { lat: place.lat, lng: place.lng });
          const walkMin = calcWalkMinutes(distKm);

          return (
            <div
              key={place.placeId}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-bg-elevated border border-border-subtle"
            >
              {/* Photo */}
              <div className="w-12 h-12 rounded-lg shrink-0 overflow-hidden bg-bg-subtle-strong">
                {place.photoUrl ? (
                  <NativeImg
                    src={fixPhotoUrl(place.photoUrl)!}
                    alt={place.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg text-text-tertiary">
                    {'\u{1F4CD}'}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-text-primary truncate">
                  {place.name}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {place.categoryDisplay && (
                    <span className="text-[11px] text-text-secondary">
                      {place.categoryDisplay}
                    </span>
                  )}
                  <span className="text-[11px] text-text-tertiary">
                    {'\u00B7'} {'\u{1F6B6}'} {walkMin}m walk
                  </span>
                </div>
                {place.rating > 0 && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[11px] text-accent-amber font-semibold">
                      {'\u2605'} {place.rating.toFixed(1)}
                    </span>
                    <span className="text-[11px] text-text-tertiary">
                      ({place.reviewCount})
                    </span>
                  </div>
                )}
              </div>

              {/* Add button */}
              <button
                onClick={() => {
                  addToPlan(place);
                  showToast(`Added ${place.name}`);
                }}
                className="shrink-0 w-9 h-9 rounded-lg bg-accent-gradient text-text-on-accent border-none cursor-pointer flex items-center justify-center text-lg font-bold min-h-[36px] min-w-[36px]"
                aria-label={`Add ${place.name} to plan`}
              >
                +
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
