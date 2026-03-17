import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { track } from '@vercel/analytics';
import { createSharedPlan } from '../supabase';
import type { City, EventItem, Stop, PlanDuration, TripHistoryEntry } from '../types';
import type { Place } from '../services/places';
import { formatDistance } from '../services/places';
import { calcWalkMinutes, calcDriveMinutes, buildMapsUrl, haversineKm } from '../utils/transport';
import { PRICE_LEVEL_ESTIMATE } from '../data/constants';
import { hapticImpact, hapticNotification, hapticSelection } from '../utils/haptics';
import { generateDayPlan } from '../services/autoPlan';
import { fetchTravelAdvisory } from '../services/travelAdvisory';
import { getPreferenceSummary, recordTripGenerated, recordAddedToTrip, recordSwapPreference } from '../utils/preferences';

/** Get timezone offset in hours for a given date and IANA timezone */
function getTimezoneOffsetHours(date: Date, timeZone: string): number {
  const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC' });
  const tzStr = date.toLocaleString('en-US', { timeZone });
  return (new Date(tzStr).getTime() - new Date(utcStr).getTime()) / 3600000;
}

export function useTripPlan(deps: {
  useGps: boolean;
  locCity: string | null;
  selectedCity: City | null;
  cityLabel: string;
  citySlug: string;
  useMiles: boolean;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  requireAuth: () => boolean;
  lat: number | null;
  lng: number | null;
  weather: { temp: number; description: string; emoji: string } | null;
  travelGroup: string | null;
  events: EventItem[];
}) {
  const { useGps, locCity, selectedCity, cityLabel, citySlug, useMiles, showToast, requireAuth, lat, lng, weather, travelGroup, events } = deps;

  const [tripDays, setTripDays] = useState<Record<number, Stop[]>>({ 1: [] });
  const [activeDay, setActiveDay] = useState(1);
  const [tripStartDate, setTripStartDate] = useState<string | null>(null);

  // Derived
  const dayPlan = tripDays[activeDay] || [];
  const totalStops = Object.values(tripDays).reduce((sum, stops) => sum + stops.length, 0);
  const dayCount = Object.keys(tripDays).length;

  // Auto-sort: when tripStartDate changes, move dated events to their correct day
  useEffect(() => {
    if (!tripStartDate) return;
    const startMs = new Date(tripStartDate + 'T00:00:00').getTime();
    let moved = false;
    const updated: Record<number, Stop[]> = {};
    for (const [day, stops] of Object.entries(tripDays)) {
      updated[Number(day)] = [...stops];
    }
    for (const [day, stops] of Object.entries(updated)) {
      const dayNum = Number(day);
      for (let i = stops.length - 1; i >= 0; i--) {
        const stop = stops[i];
        if (stop.type !== 'event' || !stop.event?.date) continue;
        const eventMs = new Date(stop.event.date + 'T00:00:00').getTime();
        const correctDay = Math.floor((eventMs - startMs) / 86400000) + 1;
        if (correctDay >= 1 && correctDay <= dayCount && correctDay !== dayNum) {
          stops.splice(i, 1);
          if (!updated[correctDay]) updated[correctDay] = [];
          updated[correctDay].push(stop);
          moved = true;
        }
      }
    }
    if (moved) setTripDays(updated);
  }, [tripStartDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const estimatedSpend = useMemo(() => {
    return dayPlan.reduce((total, stop) => {
      // Prefer AI's per-stop estimate; fall back to price-level heuristic for manually added stops
      if (stop.estimatedSpend && stop.estimatedSpend > 0) return total + stop.estimatedSpend;
      if (stop.type === 'event') return total + 20;
      const pl = stop.place?.priceLevel ?? -1;
      return total + (PRICE_LEVEL_ESTIMATE[pl] ?? 15);
    }, 0);
  }, [dayPlan]);

  const setActiveDayStops = useCallback((updater: Stop[] | ((prev: Stop[]) => Stop[])) => {
    setTripDays(prev => ({
      ...prev,
      [activeDay]: typeof updater === 'function' ? updater(prev[activeDay] || []) : updater,
    }));
  }, [activeDay]);

  const getPlanKey = useCallback(() => {
    if (useGps && locCity) return `nxstops_plan_gps_${locCity.toLowerCase().replace(/\s+/g, '_')}`;
    if (selectedCity) return `nxstops_plan_${selectedCity.name.toLowerCase().replace(/\s+/g, '_')}`;
    return 'nxstops_plan_default';
  }, [useGps, locCity, selectedCity]);

  // Load saved plan
  useEffect(() => {
    try {
      const key = getPlanKey();
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.expires > Date.now()) {
          if (parsed.tripDays) {
            const loaded: Record<number, Stop[]> = {};
            for (const [day, stops] of Object.entries(parsed.tripDays)) {
              loaded[Number(day)] = (stops as Stop[]).map(s => ({ ...s, type: s.type || 'place', addedAt: new Date(s.addedAt) }));
            }
            setTripDays(loaded);
          } else if (parsed.stops) {
            const migrated = parsed.stops.map((s: Stop) => ({ ...s, type: s.type || 'place', addedAt: new Date(s.addedAt) }));
            setTripDays({ 1: migrated });
          }
          setTripStartDate(parsed.tripStartDate || null);
          setActiveDay(1);
        } else {
          localStorage.removeItem(key);
          setTripDays({ 1: [] });
        }
      } else {
        setTripDays({ 1: [] });
      }
    } catch { setTripDays({ 1: [] }); }
  }, [getPlanKey]);

  // Save plan
  useEffect(() => {
    const key = getPlanKey();
    if (totalStops > 0) {
      localStorage.setItem(key, JSON.stringify({ tripDays, tripStartDate, expires: Date.now() + 7 * 24 * 60 * 60 * 1000 }));
    } else {
      localStorage.removeItem(key);
    }
  }, [tripDays, totalStops, getPlanKey, tripStartDate]);

  // --------------------------------------------------------------------------
  // Plan handlers
  // --------------------------------------------------------------------------

  const addToPlan = (place: Place) => {
    if (!requireAuth()) return;
    const allStops = Object.values(tripDays).flat();
    if (allStops.find(s => s.place?.placeId === place.placeId)) return;
    hapticImpact('Medium');
    setActiveDayStops(prev => [...prev, { id: crypto.randomUUID(), type: 'place', place, addedAt: new Date() }]);
    showToast(`Added ${place.name} to Day ${activeDay}`);
    track('add_to_plan', { place: place.name, category: place.categoryDisplay || '', day: String(activeDay) });
    recordAddedToTrip(place.category, place.priceLevel);
  };

  const addEventToPlan = (event: EventItem) => {
    if (!requireAuth()) return;
    const allStops = Object.values(tripDays).flat();
    if (allStops.find(s => s.event?.id === event.id)) return;
    hapticImpact('Medium');
    setActiveDayStops(prev => [...prev, { id: crypto.randomUUID(), type: 'event', event, addedAt: new Date() }]);
    showToast(`Added ${event.name} to Day ${activeDay}`);
    track('add_event_to_plan', { event: event.name, day: String(activeDay) });
  };

  const addEventToPlanOnDay = (event: EventItem, day: number) => {
    if (!requireAuth()) return;
    const allStops = Object.values(tripDays).flat();
    if (allStops.find(s => s.event?.id === event.id)) return;
    hapticImpact('Medium');
    setTripDays(prev => ({
      ...prev,
      [day]: [...(prev[day] || []), { id: crypto.randomUUID(), type: 'event' as const, event, addedAt: new Date() }],
    }));
    showToast(`Added ${event.name} to Day ${day}`);
    track('add_from_link', { event: event.name, day: String(day) });
  };

  const isEventInPlan = (eventId: string) => Object.values(tripDays).flat().some(s => s.event?.id === eventId);

  const removeFromPlan = (stopId: string) => {
    hapticImpact('Light');
    setLastPlanTitle(null);
    setLastPlanVibe(null);
    setTripDays(prev => {
      const updated = { ...prev };
      for (const day of Object.keys(updated)) {
        updated[Number(day)] = updated[Number(day)].filter(s => s.id !== stopId);
      }
      return updated;
    });
  };

  const isInPlan = (placeId: string) => Object.values(tripDays).flat().some(s => s.place?.placeId === placeId);

  // Trip history — save snapshots of cleared plans
  const [tripHistory, setTripHistory] = useState<TripHistoryEntry[]>(() => {
    try {
      const raw = localStorage.getItem('nxstops_trip_history');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  // Plan title/vibe (declared early for use in confirmClearPlan)
  const [lastPlanTitle, setLastPlanTitle] = useState<string | null>(null);
  const [lastPlanVibe, setLastPlanVibe] = useState<string | null>(null);

  // Reset plan title/vibe when city changes — prevents stale "plan completed" state
  const prevCityLabel = useRef(cityLabel);
  useEffect(() => {
    if (prevCityLabel.current !== cityLabel) {
      setLastPlanTitle(null);
      setLastPlanVibe(null);
      prevCityLabel.current = cityLabel;
    }
  }, [cityLabel]);

  // Wrap-up flow state
  const [wrapUpOpen, setWrapUpOpen] = useState(false);

  const startWrapUp = useCallback(() => {
    if (totalStops === 0) {
      setTripDays({ 1: [] });
      setActiveDay(1);
      showToast('Plan cleared');
      return;
    }
    hapticImpact('Medium');
    setWrapUpOpen(true);
  }, [totalStops, showToast]);

  const dismissWrapUp = useCallback(() => {
    setWrapUpOpen(false);
  }, []);

  const confirmClearPlan = useCallback((pendingRatings: Record<string, 'up' | 'down'>) => {
    hapticNotification('Success');
    const allStops = Object.values(tripDays).flat();

    // Compute total spend
    const totalSpend = allStops.reduce((sum, s) => {
      if (s.estimatedSpend && s.estimatedSpend > 0) return sum + s.estimatedSpend;
      if (s.type === 'event') return sum + 20;
      const pl = s.place?.priceLevel ?? -1;
      return sum + (PRICE_LEVEL_ESTIMATE[pl] ?? 15);
    }, 0);

    // Category breakdown
    const categories: Record<string, number> = {};
    allStops.forEach(s => {
      const cat = s.type === 'event' ? 'event' : (s.place?.categoryDisplay || 'other');
      categories[cat] = (categories[cat] || 0) + 1;
    });

    const entry: TripHistoryEntry = {
      id: Date.now().toString(36),
      city: cityLabel,
      title: lastPlanTitle,
      totalStops,
      dayCount,
      savedAt: new Date().toISOString(),
      tripStartDate,
      totalEstimatedSpend: totalSpend,
      categoryBreakdown: categories,
      ratings: pendingRatings,
      stops: allStops.map(s => ({
        name: s.place?.name || s.event?.name || 'Stop',
        photoUrl: s.place?.photoUrl || null,
        category: s.type === 'event' ? (s.event?.category || 'Event') : (s.place?.categoryDisplay || ''),
        placeId: s.place?.placeId,
        rating: pendingRatings[s.id],
        estimatedSpend: s.estimatedSpend,
      })),
    };

    const updated = [entry, ...tripHistory].slice(0, 10);
    setTripHistory(updated);
    localStorage.setItem('nxstops_trip_history', JSON.stringify(updated));

    // Reset
    setTripDays({ 1: [] });
    setActiveDay(1);
    setLastPlanTitle(null);
    setLastPlanVibe(null);
    setTripStartDate(null);
    setWrapUpOpen(false);
    showToast('Trip saved to history!');
    track('trip_wrap_up', { city: cityLabel, stops: String(totalStops), rated: String(Object.keys(pendingRatings).length) });
  }, [tripDays, dayCount, cityLabel, lastPlanTitle, totalStops, tripStartDate, tripHistory, showToast]);

  const clearPlan = () => {
    hapticNotification('Warning');
    // Save basic snapshot to history before clearing (if there are stops)
    if (totalStops > 0) {
      const allStops = Object.values(tripDays).flat();
      const entry: TripHistoryEntry = {
        id: Date.now().toString(36),
        city: cityLabel,
        title: lastPlanTitle,
        totalStops,
        dayCount,
        savedAt: new Date().toISOString(),
        tripStartDate,
        totalEstimatedSpend: 0,
        categoryBreakdown: {},
        ratings: {},
        stops: allStops.slice(0, 4).map(s => ({
          name: s.place?.name || s.event?.name || 'Stop',
          photoUrl: s.place?.photoUrl || null,
        })),
      };
      const updated = [entry, ...tripHistory].slice(0, 10);
      setTripHistory(updated);
      localStorage.setItem('nxstops_trip_history', JSON.stringify(updated));
    }
    setTripDays({ 1: [] });
    setActiveDay(1);
    setLastPlanTitle(null);
    setLastPlanVibe(null);
    setTripStartDate(null);
    showToast('Plan cleared');
  };

  const deleteTripHistoryEntry = (entryId: string) => {
    setTripHistory(prev => {
      const updated = prev.filter(e => e.id !== entryId);
      if (updated.length > 0) localStorage.setItem('nxstops_trip_history', JSON.stringify(updated));
      else localStorage.removeItem('nxstops_trip_history');
      return updated;
    });
    showToast('Trip removed');
  };

  const clearTripHistory = () => {
    setTripHistory([]);
    localStorage.removeItem('nxstops_trip_history');
    showToast('Trip history cleared');
  };

  const movePlanStop = (index: number, direction: 'up' | 'down') => {
    const newPlan = [...dayPlan];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= newPlan.length) return;
    hapticSelection();
    [newPlan[index], newPlan[target]] = [newPlan[target], newPlan[index]];
    setActiveDayStops(newPlan);
  };

  const reorderStops = (oldIndex: number, newIndex: number) => {
    if (oldIndex === newIndex) return;
    hapticImpact('Medium');
    setActiveDayStops(prev => {
      // Save original timeSlots — times belong to positions, not stops
      const originalTimeSlots = prev.map(s => s.timeSlot);
      const result = [...prev];
      const [removed] = result.splice(oldIndex, 1);
      result.splice(newIndex, 0, removed);
      // Reassign timeSlots so times stay in their original order
      for (let i = 0; i < result.length; i++) {
        result[i] = { ...result[i], timeSlot: originalTimeSlots[i] };
      }
      return result;
    });
  };

  const addDay = () => {
    hapticImpact('Light');
    const nextDay = Math.max(...Object.keys(tripDays).map(Number)) + 1;
    setTripDays(prev => ({ ...prev, [nextDay]: [] }));
    setActiveDay(nextDay);
    showToast(`Day ${nextDay} added`);
  };

  const removeDay = (day: number) => {
    if (dayCount <= 1) return;
    hapticNotification('Warning');
    setTripDays(prev => {
      const updated = { ...prev };
      delete updated[day];
      return updated;
    });
    if (activeDay === day) setActiveDay(Number(Object.keys(tripDays).find(d => Number(d) !== day) || 1));
    showToast(`Day ${day} removed`);
  };

  const moveStopToDay = (stopId: string, fromDay: number, toDay: number) => {
    setTripDays(prev => {
      const stop = prev[fromDay]?.find(s => s.id === stopId);
      if (!stop) return prev;
      return {
        ...prev,
        [fromDay]: prev[fromDay].filter(s => s.id !== stopId),
        [toDay]: [...(prev[toDay] || []), stop],
      };
    });
    showToast(`Moved to Day ${toDay}`);
  };

  const pivotStop = useCallback((oldStopId: string, newPlace: Place) => {
    // Record the swap in preferences before modifying
    const allStops = Object.values(tripDays).flat();
    const oldStop = allStops.find(s => s.id === oldStopId);
    if (oldStop?.place) {
      recordSwapPreference(oldStop.place.category, oldStop.place.placeId);
    }
    recordAddedToTrip(newPlace.category, newPlace.priceLevel);

    setTripDays(prev => {
      const updated = { ...prev };
      for (const day of Object.keys(updated)) {
        const dayNum = Number(day);
        const idx = updated[dayNum].findIndex(s => s.id === oldStopId);
        if (idx !== -1) {
          const newStops = [...updated[dayNum]];
          const old = newStops[idx];
          newStops[idx] = {
            id: crypto.randomUUID(),
            type: 'place',
            place: newPlace,
            addedAt: new Date(),
            timeSlot: old.timeSlot,
            reason: old.reason,
            estimatedSpend: old.estimatedSpend,
          };
          updated[dayNum] = newStops;
          break;
        }
      }
      return updated;
    });
    showToast(`Swapped to ${newPlace.name}`);
    track('pivot_stop', { newPlace: newPlace.name, category: newPlace.categoryDisplay || '' });
  }, [showToast, tripDays]);

  const getStopName = (stop: Stop) => stop.type === 'event' ? (stop.event?.name || 'Event') : (stop.place?.name || 'Place');
  const getStopCategory = (stop: Stop) => stop.type === 'event' ? (stop.event?.category || 'Event') : (stop.place?.categoryDisplay || '');

  const getRouteUrl = () => {
    if (dayPlan.length === 0) return '';
    const points = dayPlan
      .filter(s => s.type === 'place' ? (s.place?.lat && s.place?.lng) : (s.event?.lat && s.event?.lng))
      .map(s => s.type === 'place' ? `${s.place?.lat},${s.place?.lng}` : `${s.event?.lat},${s.event?.lng}`);
    if (points.length === 0) return '';
    return `https://www.google.com/maps/dir/${points.join('/')}`;
  };

  const getFullTripRouteUrl = () => {
    const allStops = Object.entries(tripDays)
      .sort(([a], [b]) => Number(a) - Number(b))
      .flatMap(([, stops]) => stops);
    if (allStops.length < 2) return '';
    const points = allStops
      .filter(s => s.type === 'place' ? (s.place?.lat && s.place?.lng) : (s.event?.lat && s.event?.lng))
      .map(s => s.type === 'place' ? `${s.place?.lat},${s.place?.lng}` : `${s.event?.lat},${s.event?.lng}`)
      .slice(0, 25);
    if (points.length < 2) return '';
    return `https://www.google.com/maps/dir/${points.join('/')}`;
  };

  const sharePlan = async () => {
    const allDays = Object.entries(tripDays).sort(([a], [b]) => Number(a) - Number(b));
    const lines = allDays.map(([day, stops]) => {
      if (stops.length === 0) return '';
      const stopList = stops.map((s, i) => `  ${i + 1}. ${getStopName(s)} (${getStopCategory(s)})`).join('\n');
      return `Day ${day}:\n${stopList}`;
    }).filter(Boolean).join('\n\n');
    const summary = `My ${cityLabel} Trip Plan:\n\n${lines}\n\nPlanned with NxStops`;
    const allStops = Object.values(tripDays).flat().length;
    track('share_plan', { city: cityLabel, days: String(Object.keys(tripDays).length), stops: String(allStops) });
    hapticImpact('Light');
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const { Share } = await import('@capacitor/share');
        await Share.share({ title: `${cityLabel} Trip Plan`, text: summary, dialogTitle: 'Share your trip' });
        return;
      }
    } catch { /* fall through */ }
    if (navigator.share) {
      await navigator.share({ title: `${cityLabel} Trip Plan`, text: summary });
    } else {
      await navigator.clipboard.writeText(summary);
      showToast('Plan copied to clipboard');
    }
  };

  const shareAsLink = async (): Promise<string | null> => {
    const slug = generateShareCode();
    const success = await createSharedPlan(slug, citySlug, cityLabel, tripDays, lastPlanTitle || undefined);
    if (!success) { showToast('Failed to create share link', 'error'); return null; }
    const url = `${window.location.origin}/trip/${slug}`;
    track('share_plan_link', { city: cityLabel, slug });
    hapticImpact('Light');
    if (navigator.share) {
      try { await navigator.share({ title: `${cityLabel} Trip Plan`, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      showToast('Link copied!');
    }
    return url;
  };

  const getStopCoords = (stop: Stop): { lat: number; lng: number } | null => {
    if (stop.type === 'place' && stop.place?.lat && stop.place?.lng) return { lat: stop.place.lat, lng: stop.place.lng };
    if (stop.type === 'event' && stop.event?.lat && stop.event?.lng) return { lat: stop.event.lat, lng: stop.event.lng };
    return null;
  };

  const formatDist = (km: number): string => {
    if (useMiles) {
      const mi = km * 0.621371;
      return mi < 0.5 ? `${mi.toFixed(1)} mi` : `${Math.round(mi * 10) / 10} mi`;
    }
    return km < 2 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
  };

  const getTransportInfo = (fromStop: Stop, toStop: Stop): {
    emoji: string; text: string; distance: string;
    walkMinutes: number; driveMinutes: number; km: number;
    walkMapsUrl: string; driveMapsUrl: string; mapsUrl: string;
  } | null => {
    const from = getStopCoords(fromStop);
    const to = getStopCoords(toStop);
    if (!from || !to) return null;

    const km = haversineKm(from, to);
    const walkMin = calcWalkMinutes(km);
    const driveMin = calcDriveMinutes(km);
    const walkUrl = buildMapsUrl(from, to, 'walking');
    const driveUrl = buildMapsUrl(from, to, 'driving');
    const legacyUrl = `https://www.google.com/maps/dir/${from.lat},${from.lng}/${to.lat},${to.lng}`;

    let emoji: string;
    let text: string;
    // Walking capped at 10 minutes — anything longer recommends driving
    if (walkMin <= 10) {
      emoji = '\u{1F6B6}';
      text = walkMin <= 5
        ? `${walkMin} min walk`
        : `${walkMin} min walk · ${driveMin} min drive`;
    } else {
      emoji = '\u{1F695}';
      text = `${driveMin} min drive`;
    }

    return {
      emoji, text, distance: formatDist(km),
      walkMinutes: walkMin, driveMinutes: driveMin, km,
      walkMapsUrl: walkUrl, driveMapsUrl: driveUrl, mapsUrl: legacyUrl,
    };
  };

  const getDaySummary = (): { totalKm: number; totalWalkMin: number; totalDriveMin: number; distance: string } | null => {
    if (dayPlan.length < 2) return null;
    let totalKm = 0;
    let totalWalkMin = 0;
    let totalDriveMin = 0;
    for (let i = 0; i < dayPlan.length - 1; i++) {
      const info = getTransportInfo(dayPlan[i], dayPlan[i + 1]);
      if (info) {
        totalKm += info.km;
        totalWalkMin += info.walkMinutes;
        totalDriveMin += info.driveMinutes;
      }
    }
    return { totalKm, totalWalkMin, totalDriveMin, distance: formatDist(totalKm) };
  };

  const generateShareCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[bytes[i] % chars.length];
    return code;
  };

  // --------------------------------------------------------------------------
  // Auto Day Planner
  // --------------------------------------------------------------------------

  const [autoPlanLoading, setAutoPlanLoading] = useState(false);
  const [autoPlanError, setAutoPlanError] = useState<string | null>(null);
  const planMyDay = useCallback(async (mood: string, duration: PlanDuration, vibe?: string, subVibe?: string): Promise<boolean> => {
    if (!lat || !lng) {
      showToast('Location needed — pick a city or enable GPS');
      return false;
    }

    setAutoPlanLoading(true);
    setAutoPlanError(null);

    try {
      const weatherStr = weather
        ? `${weather.temp}°F, ${weather.description}`
        : undefined;

      const prefSummary = getPreferenceSummary() || undefined;

      // Fetch travel advisory for international destinations
      let advisoryStr: string | undefined;
      if (selectedCity?.country) {
        try {
          const adv = await fetchTravelAdvisory(selectedCity.country);
          if (adv?.hasAdvisory && adv.level && adv.level !== 'normal') {
            advisoryStr = `${adv.level.replace(/_/g, ' ')}: ${adv.summary || adv.country}`;
          }
        } catch { /* advisory is optional */ }
      }

      // Compute jet lag context for the AI — only when user has set a trip start date
      // (otherwise they're just planning/exploring, not actually jet-lagged)
      let jetLagStr: string | undefined;
      if (selectedCity?.timezone && tripStartDate) {
        try {
          const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          const destTz = selectedCity.timezone;
          if (userTz !== destTz) {
            const refDate = new Date();
            const userOffset = getTimezoneOffsetHours(refDate, userTz);
            const destOffset = getTimezoneOffsetHours(refDate, destTz);
            const hourDiff = Math.abs(destOffset - userOffset);
            if (hourDiff >= 5) {
              const startMs = new Date(tripStartDate + 'T00:00:00').getTime();
              const todayMs = new Date().setHours(0, 0, 0, 0);
              const tripDay = Math.max(1, Math.floor((todayMs - startMs) / 86400000) + 1);
              if (tripDay <= 2) {
                jetLagStr = `Day ${tripDay} of trip with ${Math.round(hourDiff)}-hour timezone shift (${userTz} → ${destTz}). Traveler is likely jet-lagged.`;
              }
            }
          }
        } catch { /* timezone calc is optional */ }
      }

      // Get today's events for the AI to optionally include
      const today = new Date().toISOString().split('T')[0];
      const todayEvents = events
        .filter(e => e.date === today)
        .slice(0, 5)
        .map(e => ({ name: e.name, category: e.category, time: e.time, venue: e.venue }));

      // Compute user's local time in the destination timezone
      const now = new Date();
      let localTimeStr: string | undefined;
      try {
        if (selectedCity?.timezone) {
          const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: selectedCity.timezone,
            hour: 'numeric', minute: 'numeric', hour12: false,
          }).formatToParts(now);
          const h = parts.find(p => p.type === 'hour')?.value || '';
          const m = parts.find(p => p.type === 'minute')?.value || '';
          if (h && m) localTimeStr = `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
        }
      } catch { /* fall back to browser local time */ }
      if (!localTimeStr) {
        localTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      }

      const result = await generateDayPlan({
        lat,
        lng,
        city: cityLabel || undefined,
        vibe: vibe || undefined,
        subVibe: subVibe || undefined,
        mood,
        travelGroup: travelGroup || undefined,
        duration,
        weather: weatherStr,
        preferences: prefSummary,
        events: todayEvents.length > 0 ? todayEvents : undefined,
        advisory: advisoryStr,
        jetLagContext: jetLagStr,
        localTime: localTimeStr,
      });

      // Convert plan stops to Stop objects
      const stops: Stop[] = result.plan.map(s => ({
        id: crypto.randomUUID(),
        type: 'place' as const,
        place: s.place,
        addedAt: new Date(),
        timeSlot: s.timeSlot,
        reason: s.reason,
        estimatedSpend: s.estimatedSpend,
      }));

      // Populate the currently active day (preserve other days)
      setTripDays(prev => ({ ...prev, [activeDay]: stops }));
      setLastPlanTitle(result.dayTitle);
      setLastPlanVibe(vibe || null);

      // Clear old trip start date so the new plan starts fresh (no stale "posttrip" state)
      setTripStartDate(null);

      // Record in preference memory
      recordTripGenerated(mood);

      // Schedule a "morning of" push notification
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        // Compute the correct notification date based on trip start date
        const notifDate = new Date();
        if (tripStartDate) {
          const start = new Date(tripStartDate + 'T00:00:00');
          start.setDate(start.getDate() + (activeDay - 1));
          // Only schedule if the day hasn't passed yet
          if (start.getTime() >= new Date().setHours(0, 0, 0, 0)) {
            notifDate.setTime(start.getTime());
          } else {
            notifDate.setDate(notifDate.getDate() + 1);
          }
        } else {
          notifDate.setDate(notifDate.getDate() + 1);
        }
        const firstStop = stops[0];
        const firstStopName = firstStop?.place?.name || firstStop?.event?.name || null;
        import('../supabase').then(({ scheduleNotification }) => {
          scheduleNotification(
            'morning_of',
            notifDate.toISOString().split('T')[0],
            citySlug,
            {
              title: `Your Day ${activeDay} in ${cityLabel} starts!`,
              body: firstStopName
                ? `First stop: ${firstStopName}. ${stops.length} stops planned!`
                : weather
                ? `${weather.emoji} ${weather.temp}°F — ${stops.length} stops planned!`
                : `${stops.length} stops planned for today!`,
              url: '/plan',
            },
          ).catch(() => {});
        });
      }

      hapticNotification('Success');
      showToast(`Day ${activeDay}: ${result.dayTitle} — ${stops.length} stops planned!`);
      track('auto_plan_generated', {
        mood, duration,
        stops: String(stops.length), city: cityLabel,
      });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate plan';
      setAutoPlanError(msg);
      hapticNotification('Error');
      showToast(msg);
      return false;
    } finally {
      setAutoPlanLoading(false);
    }
  }, [lat, lng, weather, cityLabel, travelGroup, events, showToast, activeDay, selectedCity, tripStartDate]);

  return {
    tripDays, setTripDays, activeDay, setActiveDay,
    dayPlan, totalStops, dayCount, setActiveDayStops,
    addToPlan, addEventToPlan, addEventToPlanOnDay, removeFromPlan, isInPlan, isEventInPlan,
    clearPlan, movePlanStop, reorderStops, addDay, removeDay, moveStopToDay, pivotStop,
    getRouteUrl, getFullTripRouteUrl, sharePlan, shareAsLink, getTransportInfo, getDaySummary,
    estimatedSpend,
    autoPlanLoading, autoPlanError, lastPlanTitle, lastPlanVibe, planMyDay,
    tripStartDate, setTripStartDate,
    tripHistory, clearTripHistory, deleteTripHistoryEntry,
    wrapUpOpen, startWrapUp, dismissWrapUp, confirmClearPlan,
  };
}
