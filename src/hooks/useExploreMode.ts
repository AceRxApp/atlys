import { useState, useMemo, useCallback, useEffect } from 'react';
import type { Stop, StopCheckIn } from '../types';
import { getHoursStatus } from '../services/places';
import { haversineKm, calcWalkMinutes, calcDriveMinutes } from '../utils/transport';

/** Extract lat/lng from a Stop (works for both place and event stops) */
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
 * Hook for Explore Mode — a guided, step-by-step trip experience.
 * Tracks the current stop, computes travel info to the next stop,
 * and detects when the traveler should leave to make it in time.
 */
export function useExploreMode(deps: {
  dayPlan: Stop[];
  isLiveDay: boolean;
  checkIns: Record<string, StopCheckIn>;
}) {
  const { dayPlan, isLiveDay, checkIns } = deps;
  const [active, setActive] = useState(false);

  // ── Current stop index ─────────────────────────────────────────────
  // Index of the first unchecked stop. If all checked, equals dayPlan.length.
  const currentStopIndex = useMemo(() => {
    for (let i = 0; i < dayPlan.length; i++) {
      if (!checkIns[dayPlan[i].id]) return i;
    }
    return dayPlan.length; // all checked — trip complete
  }, [dayPlan, checkIns]);

  const currentStop = dayPlan[currentStopIndex] || null;
  const nextStop = dayPlan[currentStopIndex + 1] || null;
  const tripComplete = currentStopIndex >= dayPlan.length;

  // ── Next stop transport info ───────────────────────────────────────
  const { nextStopDistance, nextStopWalkMin, nextStopDriveMin, distanceKm } = useMemo(() => {
    if (!currentStop || !nextStop) {
      return { nextStopDistance: null, nextStopWalkMin: null, nextStopDriveMin: null, distanceKm: null };
    }

    const fromCoords = getStopCoords(currentStop);
    const toCoords = getStopCoords(nextStop);

    if (!fromCoords || !toCoords) {
      return { nextStopDistance: null, nextStopWalkMin: null, nextStopDriveMin: null, distanceKm: null };
    }

    const km = haversineKm(fromCoords, toCoords);
    const walkMin = calcWalkMinutes(km);
    const driveMin = calcDriveMinutes(km);

    // Format distance
    let distStr: string;
    if (km < 1) {
      distStr = `${Math.round(km * 1000)}m`;
    } else {
      distStr = `${km.toFixed(1)} km`;
    }

    return {
      nextStopDistance: distStr,
      nextStopWalkMin: walkMin,
      nextStopDriveMin: driveMin,
      distanceKm: km,
    };
  }, [currentStop, nextStop]);

  // ── Should leave now / leave-by message ────────────────────────────
  const { shouldLeaveNow, leaveByMessage } = useMemo(() => {
    if (!nextStop || !nextStopWalkMin) {
      return { shouldLeaveNow: false, leaveByMessage: null };
    }

    // Check if next stop is closing soon
    if (nextStop.type === 'place' && nextStop.place?.hours) {
      const { urgent } = getHoursStatus(nextStop.place.hours, nextStop.place.openNow);

      if (urgent) {
        // Parse closing time from hours status to see how tight it is
        const now = new Date();
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = days[now.getDay()];
        const todayHours = nextStop.place.hours.find(h => h.startsWith(today));

        if (todayHours) {
          const closingMatch = todayHours.match(/[–\-]\s*(\d{1,2}:\d{2}\s*[AP]M)/i);
          if (closingMatch) {
            const closeStr = closingMatch[1].trim();
            const match = closeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            if (match) {
              let hours = parseInt(match[1]);
              const minutes = parseInt(match[2]);
              const isPM = match[3].toUpperCase() === 'PM';
              if (isPM && hours !== 12) hours += 12;
              if (!isPM && hours === 12) hours = 0;

              const closeDate = new Date();
              closeDate.setHours(hours, minutes, 0, 0);

              const diffMs = closeDate.getTime() - now.getTime();
              const diffMin = Math.round(diffMs / (1000 * 60));
              const bufferMin = 30; // 30-minute buffer once you arrive
              // Use drive time if walk would exceed 10 minutes
              const travelMin = nextStopWalkMin <= 10 ? nextStopWalkMin : (nextStopDriveMin ?? nextStopWalkMin);
              const timeNeeded = travelMin + bufferMin;

              if (diffMin > 0 && diffMin <= timeNeeded) {
                return {
                  shouldLeaveNow: true,
                  leaveByMessage: 'Head there now!',
                };
              }

              if (diffMin > timeNeeded && diffMin <= timeNeeded + 30) {
                const leaveIn = diffMin - timeNeeded;
                return {
                  shouldLeaveNow: false,
                  leaveByMessage: `Leave in ${leaveIn}min`,
                };
              }
            }
          }
        }
      }
    }

    return { shouldLeaveNow: false, leaveByMessage: null };
  }, [nextStop, nextStopWalkMin]);

  // ── Start / Stop ───────────────────────────────────────────────────
  const startExplore = useCallback(() => setActive(true), []);
  const stopExplore = useCallback(() => setActive(false), []);

  // Auto-deactivate if dayPlan becomes empty or isLiveDay becomes false
  useEffect(() => {
    if (!isLiveDay || dayPlan.length === 0) setActive(false);
  }, [isLiveDay, dayPlan.length]);

  return {
    exploreActive: active,
    currentStopIndex,
    currentStop,
    nextStop,
    nextStopDistance,
    nextStopWalkMin,
    nextStopDriveMin,
    shouldLeaveNow,
    leaveByMessage,
    tripComplete,
    startExplore,
    stopExplore,
  };
}
