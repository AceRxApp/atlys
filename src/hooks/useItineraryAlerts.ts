import { useState, useEffect, useCallback, useRef } from 'react';
import type { Stop, StopCheckIn, ItineraryAlert } from '../types';
import { getHoursStatus } from '../services/places';

const STORAGE_KEY = 'nxstops_dismissed_alerts';
const CHECK_INTERVAL_MS = 60_000; // 60 seconds

/** Museum / gallery Google Places categories */
const MUSEUM_GALLERY_CATS = new Set([
  'museum', 'art_gallery', 'historical_landmark',
]);

function getDismissedSet(): Set<string> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function persistDismissedSet(ids: Set<string>): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch { /* quota exceeded — ignore */ }
}

function getStopName(stop: Stop): string {
  return stop.type === 'event'
    ? (stop.event?.name || 'Event')
    : (stop.place?.name || 'Place');
}

/**
 * Detects smart itinerary alerts during a live trip day.
 * Checks run every 60 seconds and only when `isLiveDay` is true.
 */
export function useItineraryAlerts(deps: {
  dayPlan: Stop[];
  isLiveDay: boolean;
  checkIns: Record<string, StopCheckIn>;
}) {
  const { dayPlan, isLiveDay, checkIns } = deps;

  const [alerts, setAlerts] = useState<ItineraryAlert[]>([]);
  const dismissedRef = useRef<Set<string>>(getDismissedSet());

  // ── Generate alerts ────────────────────────────────────────────────
  const generateAlerts = useCallback(() => {
    if (!isLiveDay || dayPlan.length === 0) {
      setAlerts([]);
      return;
    }

    const now = new Date();
    const hour = now.getHours();
    const dismissed = dismissedRef.current;
    const next: ItineraryAlert[] = [];

    // Helper: is a stop checked in?
    const checked = (s: Stop) => !!checkIns[s.id];

    // ── 1. CLOSING_SOON ──────────────────────────────────────────────
    for (const stop of dayPlan) {
      if (checked(stop)) continue;
      if (stop.type !== 'place' || !stop.place?.hours) continue;

      const alertId = `closing_soon_${stop.id}`;
      if (dismissed.has(alertId)) continue;

      const { urgent } = getHoursStatus(stop.place.hours, stop.place.openNow);
      if (urgent) {
        next.push({
          id: alertId,
          type: 'closing_soon',
          message: `\u26A0\uFE0F ${getStopName(stop)} closes soon! Move it up?`,
          stopId: stop.id,
          action: { label: 'Move up', actionType: 'reorder' },
        });
      }
    }

    // ── 2. SKIPPED ───────────────────────────────────────────────────
    for (let i = 1; i < dayPlan.length; i++) {
      const prev = dayPlan[i - 1];
      const curr = dayPlan[i];

      if (checked(curr) && !checked(prev)) {
        const alertId = `skipped_${prev.id}`;
        if (dismissed.has(alertId)) continue;

        next.push({
          id: alertId,
          type: 'skipped',
          message: `Looks like you skipped ${getStopName(prev)}. Remove it?`,
          stopId: prev.id,
          action: { label: 'Remove', actionType: 'remove' },
        });
      }
    }

    // ── 3. BONUS_TIME ────────────────────────────────────────────────
    const allChecked = dayPlan.length > 0 && dayPlan.every(s => checked(s));
    if (allChecked && hour < 18) {
      const alertId = 'bonus_time_all';
      if (!dismissed.has(alertId)) {
        next.push({
          id: alertId,
          type: 'bonus_time',
          message: "You're ahead of schedule! Want a bonus stop nearby?",
          action: { label: 'Find stops', actionType: 'suggest' },
        });
      }
    }

    // ── 4. TIME_SWAP ─────────────────────────────────────────────────
    if (hour >= 19) {
      for (const stop of dayPlan) {
        if (checked(stop)) continue;
        if (stop.type !== 'place') continue;

        const cat = stop.place?.category || '';
        if (!MUSEUM_GALLERY_CATS.has(cat)) continue;

        const alertId = `time_swap_${stop.id}`;
        if (dismissed.has(alertId)) continue;

        next.push({
          id: alertId,
          type: 'time_swap',
          message: `It's evening \u2014 swap ${getStopName(stop)} for dinner?`,
          stopId: stop.id,
          action: { label: 'Find dinner', actionType: 'swap' },
        });
      }
    }

    setAlerts(next);
  }, [dayPlan, isLiveDay, checkIns]);

  // ── Run checks on interval ─────────────────────────────────────────
  useEffect(() => {
    if (!isLiveDay) {
      setAlerts([]);
      return;
    }

    // Initial check
    generateAlerts();

    const timer = setInterval(generateAlerts, CHECK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isLiveDay, generateAlerts]);

  // ── Dismiss handler ────────────────────────────────────────────────
  const dismissAlert = useCallback((id: string) => {
    dismissedRef.current.add(id);
    persistDismissedSet(dismissedRef.current);
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  return { alerts, dismissAlert };
}
