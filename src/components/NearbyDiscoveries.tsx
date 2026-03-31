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

// Map categories to broader groups so we match "same type"
const CATEGORY_GROUP: Record<string, string> = {
  restaurant: 'food', cafe: 'food', bakery: 'food', bar: 'drink', pub: 'drink',
  wine_bar: 'drink', cocktail_bar: 'drink', brewery: 'drink', coffee_shop: 'food',
  diner: 'food', bistro: 'food', fast_food: 'food', ice_cream: 'food',
  pizzeria: 'food', ramen: 'food', sushi: 'food', brunch: 'food',
  museum: 'culture', art_gallery: 'culture', library: 'culture',
  historic_site: 'landmark', monument: 'landmark', landmark: 'landmark',
  church: 'landmark', temple: 'landmark', mosque: 'landmark', castle: 'landmark',
  park: 'outdoor', garden: 'outdoor', beach: 'outdoor', hiking_area: 'outdoor',
  national_park: 'outdoor', playground: 'outdoor', zoo: 'outdoor',
  nightclub: 'nightlife', lounge: 'nightlife', karaoke: 'nightlife',
  shopping_mall: 'shopping', market: 'shopping', boutique: 'shopping',
  spa: 'wellness', gym: 'wellness', yoga_studio: 'wellness',
};

function getGroup(category: string): string {
  return CATEGORY_GROUP[category] || category;
}

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const fetchedRef = useRef(false);

  const coords = getStopCoords(stop);
  const stopCategory = stop.place?.category || stop.event?.category || '';
  const stopGroup = getGroup(stopCategory);

  useEffect(() => {
    if (!coords || fetchedRef.current) return;
    fetchedRef.current = true;

    const cached = nearbyCache.get(stop.id);
    if (cached) {
      setResults(cached);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    // Search with broader radius to find same-type places
    searchNearby(coords.lat, coords.lng, ['eatsip', 'thespot'], 800)
      .then(places => {
        if (cancelled) return;
        // Filter out places already in plan
        let filtered = places.filter(p => !isInPlan(p.placeId) && p.placeId !== stop.place?.placeId);

        // Prioritize same category group
        const sameGroup = filtered.filter(p => getGroup(p.category) === stopGroup);
        const sameCategory = filtered.filter(p => p.category === stopCategory);

        // Use same-category first, then same-group, then all
        if (sameCategory.length >= 3) {
          filtered = sameCategory;
        } else if (sameGroup.length >= 3) {
          filtered = sameGroup;
        }
        // else keep all

        filtered = filtered.slice(0, 8);
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

  // Reset index if it goes out of bounds
  const safeIndex = Math.min(currentIndex, Math.max(0, filteredResults.length - 1));

  if (!coords) return null;

  if (loading) {
    return (
      <div className="mt-3 p-4 rounded-xl bg-bg-subtle border border-border-subtle">
        <div className="flex items-center justify-center py-4">
          <div className="w-5 h-5 border-2 border-accent-amber border-t-transparent rounded-full animate-spin" />
          <span className="ml-2.5 text-xs text-text-tertiary">Finding nearby {stopGroup || 'spots'}...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-3 p-3 rounded-xl bg-bg-subtle border border-border-subtle">
        <p className="text-xs text-text-tertiary text-center">Could not load nearby spots</p>
      </div>
    );
  }

  if (filteredResults.length === 0) {
    return (
      <div className="mt-3 p-3 rounded-xl bg-bg-subtle border border-border-subtle">
        <p className="text-xs text-text-tertiary text-center">No nearby spots found</p>
      </div>
    );
  }

  const place = filteredResults[safeIndex];
  if (!place) return null;

  const distKm = haversineKm(coords, { lat: place.lat, lng: place.lng });
  const walkMin = calcWalkMinutes(distKm);
  const canPrev = safeIndex > 0;
  const canNext = safeIndex < filteredResults.length - 1;

  return (
    <div className="mt-3 p-3 rounded-xl bg-bg-subtle border border-border-subtle">
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[12px] font-semibold text-text-secondary">
          Nearby {place.categoryDisplay || stopGroup}
        </span>
        <span className="text-[11px] text-text-tertiary">{safeIndex + 1}/{filteredResults.length}</span>
      </div>

      {/* Single card */}
      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-bg-elevated border border-border-subtle">
        <div className="w-14 h-14 rounded-lg shrink-0 overflow-hidden bg-bg-subtle-strong">
          {place.photoUrl ? (
            <NativeImg src={fixPhotoUrl(place.photoUrl)!} alt={place.name} loading="lazy" decoding="async"
              className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg text-text-tertiary">
              {'\u{1F4CD}'}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-text-primary truncate">{place.name}</div>
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-text-secondary">
            {place.categoryDisplay && <span>{place.categoryDisplay}</span>}
            <span className="text-text-tertiary">{'\u00B7'} {walkMin}m walk</span>
          </div>
          {place.rating > 0 && (
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[11px] text-accent-amber font-semibold">{'\u2605'} {place.rating.toFixed(1)}</span>
              <span className="text-[11px] text-text-tertiary">({place.reviewCount})</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation + Add */}
      <div className="flex items-center gap-2 mt-2.5">
        <button
          onClick={() => { if (canPrev) setCurrentIndex(i => i - 1); }}
          disabled={!canPrev}
          aria-label="Previous"
          className="w-8 h-8 rounded-lg border border-border-medium bg-bg-elevated flex items-center justify-center cursor-pointer disabled:opacity-25 disabled:cursor-default text-text-secondary"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button
          onClick={() => { if (canNext) setCurrentIndex(i => i + 1); }}
          disabled={!canNext}
          aria-label="Next"
          className="w-8 h-8 rounded-lg border border-border-medium bg-bg-elevated flex items-center justify-center cursor-pointer disabled:opacity-25 disabled:cursor-default text-text-secondary"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <button
          onClick={() => {
            addToPlan(place);
            showToast(`Added ${place.name}`);
            // Move to next if available
            if (canNext) setCurrentIndex(i => i + 1);
          }}
          className="flex-1 py-2 rounded-lg bg-accent-gradient text-text-on-accent border-none cursor-pointer text-[12px] font-semibold min-h-[36px]"
          aria-label={`Add ${place.name} to plan`}
        >
          + Add to Plan
        </button>
      </div>
    </div>
  );
}
