import { useState, useCallback, useEffect } from 'react';
import type { Stop } from '../types';
import type { Place } from '../services/places';
import type { EventItem } from '../types';

export function useOfflineSave(
  tripDays: Record<number, Stop[]>,
  citySlug: string,
  lat: number | null,
  lng: number | null,
  places?: Place[],
  events?: EventItem[],
) {
  const storageKey = `nxstops_offline_${citySlug}`;
  const [isSaved, setIsSaved] = useState(() => localStorage.getItem(storageKey) === 'true');
  const [isSaving, setIsSaving] = useState(false);

  // Listen for service worker cache completion
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'CACHE_COMPLETE') {
        setIsSaving(false);
        setIsSaved(true);
        try { localStorage.setItem(storageKey, 'true'); } catch { /* full */ }
      }
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, [storageKey]);

  const saveForOffline = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;
    setIsSaving(true);

    const allStops = Object.values(tripDays).flat();

    // Collect photo URLs — trip photos + gallery photos (photoNames)
    const photoUrls: string[] = [];
    for (const stop of allStops) {
      if (stop.place?.photoUrl) photoUrls.push(stop.place.photoUrl);
      // Also cache gallery photos for place detail view
      if (stop.place?.photoNames) {
        for (const name of stop.place.photoNames.slice(0, 5)) {
          photoUrls.push(`/api/places?action=photo&name=${encodeURIComponent(name)}&maxWidth=800`);
        }
      }
      if (stop.event?.imageUrl) photoUrls.push(stop.event.imageUrl);
    }

    // Collect API URLs
    const apiUrls: string[] = [];
    if (lat && lng) {
      apiUrls.push(`/api/weather?lat=${lat}&lng=${lng}`);
    }

    // Save places + events data to localStorage for full offline access
    try {
      if (places && places.length > 0) {
        localStorage.setItem(`nxstops_places_${citySlug}`, JSON.stringify(places));
      }
      if (events && events.length > 0) {
        localStorage.setItem(`nxstops_events_${citySlug}`, JSON.stringify(events));
      }
      // Save trip data explicitly too (in case auto-save doesn't cover it)
      localStorage.setItem(`nxstops_trip_offline_${citySlug}`, JSON.stringify(tripDays));
    } catch { /* localStorage full — non-critical */ }

    try {
      const reg = await navigator.serviceWorker.ready;
      if (photoUrls.length > 0) {
        reg.active?.postMessage({ type: 'CACHE_URLS', urls: photoUrls });
      }
      if (apiUrls.length > 0) {
        reg.active?.postMessage({ type: 'CACHE_API', urls: apiUrls });
      }
      // If nothing to cache via SW, mark as saved immediately
      if (photoUrls.length === 0 && apiUrls.length === 0) {
        setIsSaving(false);
        setIsSaved(true);
        try { localStorage.setItem(storageKey, 'true'); } catch { /* full */ }
      }
    } catch {
      setIsSaving(false);
    }
  }, [tripDays, lat, lng, storageKey, places, events, citySlug]);

  // Clear saved flag when citySlug changes
  useEffect(() => {
    setIsSaved(localStorage.getItem(storageKey) === 'true');
  }, [storageKey]);

  return { saveForOffline, isSaved, isSaving };
}
