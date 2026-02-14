import { useState, useCallback } from 'react';
import { track } from '@vercel/analytics';
import { hapticImpact } from '../utils/haptics';
import { saveStopRating } from '../supabase';
import type { User } from '@supabase/supabase-js';

export type StopRating = 'up' | 'down';

interface RatingsMap {
  [stopId: string]: { placeId: string; rating: StopRating };
}

export function useStopRatings(citySlug: string, user: User | null) {
  const storageKey = `nxstops_stop_ratings_${citySlug}`;

  const [ratings, setRatings] = useState<RatingsMap>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const persist = useCallback((next: RatingsMap) => {
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* full */ }
  }, [storageKey]);

  const rateStop = useCallback((stopId: string, placeId: string, rating: StopRating) => {
    hapticImpact('Light');
    setRatings(prev => {
      const existing = prev[stopId];
      let next: RatingsMap;
      if (existing?.rating === rating) {
        // Toggle off
        const { [stopId]: _, ...rest } = prev;
        next = rest;
      } else {
        next = { ...prev, [stopId]: { placeId, rating } };
      }
      persist(next);
      // Sync to Supabase if authenticated
      if (user && placeId) {
        const finalRating = next[stopId]?.rating;
        if (finalRating) saveStopRating(placeId, citySlug, finalRating).catch(() => {});
      }
      track('rate_stop', { placeId, rating });
      return next;
    });
  }, [citySlug, user, persist]);

  const getRating = useCallback((stopId: string): StopRating | null => {
    return ratings[stopId]?.rating || null;
  }, [ratings]);

  return { rateStop, getRating };
}
