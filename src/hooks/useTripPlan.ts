import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { track } from '@vercel/analytics';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createCrewTrip, loadCrewTrip, updateCrewTripDays, subscribeToCrewTrip, unsubscribeFromCrewTrip } from '../supabase';
import type { City, EventItem, Stop, PlanDuration } from '../types';
import type { Place } from '../services/places';
import { formatDistance } from '../services/places';
import { calcWalkMinutes, calcDriveMinutes, buildMapsUrl, haversineKm } from '../utils/transport';
import { PRICE_LEVEL_ESTIMATE } from '../data/constants';
import { hapticImpact, hapticNotification, hapticSelection } from '../utils/haptics';
import { generateDayPlan } from '../services/autoPlan';
import { getPreferenceSummary, recordTripGenerated, recordAddedToTrip, recordSwapPreference } from '../utils/preferences';

export function useTripPlan(deps: {
  useGps: boolean;
  locCity: string | null;
  selectedCity: City | null;
  cityLabel: string;
  citySlug: string;
  useMiles: boolean;
  showToast: (msg: string) => void;
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

  // Crew mode state
  const [crewMode, setCrewMode] = useState(() => sessionStorage.getItem('nxstops_crew_mode') === 'true');
  const [crewCode, setCrewCode] = useState<string | null>(() => sessionStorage.getItem('nxstops_crew_code'));
  const [crewSyncing, setCrewSyncing] = useState(false);
  const [joinCrewInput, setJoinCrewInput] = useState('');
  const [showJoinCrew, setShowJoinCrew] = useState(false);
  const crewChannelRef = useRef<RealtimeChannel | null>(null);
  const crewSyncLock = useRef(false);

  // Budget per day: day number → dollar amount (-1 = unlimited)
  const [dayBudgets, setDayBudgets] = useState<Record<number, number>>(() => {
    try {
      const key = `nxstops_budget_${citySlug}`;
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  // Derived
  const dayPlan = tripDays[activeDay] || [];
  const totalStops = Object.values(tripDays).reduce((sum, stops) => sum + stops.length, 0);
  const dayCount = Object.keys(tripDays).length;
  const activeDayBudget = dayBudgets[activeDay] ?? -1;

  const estimatedSpend = useMemo(() => {
    return dayPlan.reduce((total, stop) => {
      if (stop.type === 'event') return total + 20;
      const pl = stop.place?.priceLevel ?? -1;
      return total + (PRICE_LEVEL_ESTIMATE[pl] ?? 15);
    }, 0);
  }, [dayPlan]);

  const budgetRemaining = activeDayBudget === -1 ? Infinity : activeDayBudget - estimatedSpend;
  const budgetPercentUsed = activeDayBudget <= 0 ? 0 : Math.min(100, (estimatedSpend / activeDayBudget) * 100);
  const isOverBudget = activeDayBudget > 0 && estimatedSpend > activeDayBudget;

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
      localStorage.setItem(key, JSON.stringify({ tripDays, expires: Date.now() + 7 * 24 * 60 * 60 * 1000 }));
    } else {
      localStorage.removeItem(key);
    }
  }, [tripDays, totalStops, getPlanKey]);

  // Persist budget
  useEffect(() => {
    const key = `nxstops_budget_${citySlug}`;
    if (Object.keys(dayBudgets).length > 0) {
      localStorage.setItem(key, JSON.stringify(dayBudgets));
    } else {
      localStorage.removeItem(key);
    }
  }, [dayBudgets, citySlug]);

  const setDayBudget = useCallback((day: number, amount: number) => {
    setDayBudgets(prev => ({ ...prev, [day]: amount }));
    track('set_budget', { day: String(day), amount: String(amount) });
  }, []);

  // Crew mode: subscribe to realtime updates
  useEffect(() => {
    if (!crewMode || !crewCode) {
      if (crewChannelRef.current) {
        unsubscribeFromCrewTrip(crewChannelRef.current);
        crewChannelRef.current = null;
      }
      return;
    }
    const channel = subscribeToCrewTrip(crewCode, (remoteDays) => {
      if (crewSyncLock.current) return;
      crewSyncLock.current = true;
      const parsed: Record<number, Stop[]> = {};
      for (const [day, stops] of Object.entries(remoteDays)) {
        parsed[Number(day)] = (stops as Stop[]).map(s => ({ ...s, addedAt: new Date(s.addedAt) }));
      }
      setTripDays(parsed);
      setTimeout(() => { crewSyncLock.current = false; }, 1000);
    });
    crewChannelRef.current = channel;
    return () => { unsubscribeFromCrewTrip(channel); crewChannelRef.current = null; };
  }, [crewMode, crewCode]);

  // Crew mode: sync local changes to Supabase
  useEffect(() => {
    if (!crewMode || !crewCode || crewSyncLock.current) return;
    const timer = setTimeout(() => { updateCrewTripDays(crewCode, tripDays); }, 500);
    return () => clearTimeout(timer);
  }, [tripDays, crewMode, crewCode]);

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

  const isEventInPlan = (eventId: string) => Object.values(tripDays).flat().some(s => s.event?.id === eventId);

  const removeFromPlan = (stopId: string) => {
    hapticImpact('Light');
    setTripDays(prev => {
      const updated = { ...prev };
      for (const day of Object.keys(updated)) {
        updated[Number(day)] = updated[Number(day)].filter(s => s.id !== stopId);
      }
      return updated;
    });
  };

  const isInPlan = (placeId: string) => Object.values(tripDays).flat().some(s => s.place?.placeId === placeId);

  const clearPlan = () => {
    hapticNotification('Warning');
    setTripDays({ 1: [] });
    setActiveDay(1);
    showToast('Plan cleared');
  };

  const movePlanStop = (index: number, direction: 'up' | 'down') => {
    const newPlan = [...dayPlan];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= newPlan.length) return;
    hapticSelection();
    [newPlan[index], newPlan[target]] = [newPlan[target], newPlan[index]];
    setActiveDayStops(newPlan);
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
          newStops[idx] = {
            id: crypto.randomUUID(),
            type: 'place',
            place: newPlace,
            addedAt: new Date(),
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
    if (km < 0.5) {
      emoji = '\u{1F6B6}';
      text = `${walkMin} min walk`;
    } else if (km < 1.5) {
      emoji = '\u{1F6B6}';
      text = `${walkMin} min walk · ${driveMin} min drive`;
    } else if (km < 5) {
      emoji = '\u{1F695}';
      text = `${driveMin} min drive · ${walkMin} min walk`;
    } else {
      emoji = '\u{1F697}';
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

  // --------------------------------------------------------------------------
  // Crew mode handlers
  // --------------------------------------------------------------------------

  const generateCrewCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[bytes[i] % chars.length];
    return code;
  };

  const startCrewMode = async () => {
    if (!requireAuth()) return;
    const code = generateCrewCode();
    setCrewSyncing(true);
    const created = await createCrewTrip(code, citySlug, cityLabel, tripDays);
    if (created) {
      setCrewMode(true);
      setCrewCode(code);
      sessionStorage.setItem('nxstops_crew_code', code);
      sessionStorage.setItem('nxstops_crew_mode', 'true');
      showToast('Crew mode activated!');
      track('start_crew', { city: cityLabel, code });
    } else {
      showToast('Failed to start crew mode. Try again.');
    }
    setCrewSyncing(false);
  };

  const stopCrewMode = () => {
    setCrewMode(false);
    setCrewCode(null);
    sessionStorage.removeItem('nxstops_crew_code');
    sessionStorage.removeItem('nxstops_crew_mode');
  };

  const joinCrew = async () => {
    if (!requireAuth()) return;
    const code = joinCrewInput.trim().toUpperCase();
    if (code.length < 6) { showToast('Enter a valid crew code'); return; }
    setCrewSyncing(true);
    const trip = await loadCrewTrip(code);
    if (trip) {
      const parsed: Record<number, Stop[]> = {};
      for (const [day, stops] of Object.entries(trip.trip_days)) {
        parsed[Number(day)] = (stops as Stop[]).map(s => ({
          ...s,
          addedAt: new Date((s as Stop).addedAt),
        }));
      }
      setTripDays(parsed);
      setCrewMode(true);
      setCrewCode(code);
      sessionStorage.setItem('nxstops_crew_code', code);
      sessionStorage.setItem('nxstops_crew_mode', 'true');
      setShowJoinCrew(false);
      setJoinCrewInput('');
      showToast(`Joined crew ${code}!`);
      track('join_crew', { code });
    } else {
      showToast('Crew not found. Check the code.');
    }
    setCrewSyncing(false);
  };

  const shareCrewPlan = async () => {
    const allDays = Object.entries(tripDays).sort(([a], [b]) => Number(a) - Number(b));
    const lines = allDays.map(([day, stops]) => {
      if (stops.length === 0) return '';
      const stopList = stops.map((s, i) => `  ${i + 1}. ${getStopName(s)} (${getStopCategory(s)})`).join('\n');
      return `Day ${day}:\n${stopList}`;
    }).filter(Boolean).join('\n\n');
    const joinInstructions = crewCode
      ? `\n\u{1F517} Join our crew on NxStops!\n\n1. Open https://nxstops.com\n2. Go to Plan tab \u{2192} tap "Join Crew"\n3. Enter code: ${crewCode}\n`
      : '';
    const summary = `${cityLabel} Trip Plan${joinInstructions}\n${lines}\n\nPlanned with NxStops \u{2728}`;
    if (navigator.share) {
      await navigator.share({ title: `${cityLabel} Trip Plan`, text: summary, url: 'https://nxstops.com' });
    } else {
      await navigator.clipboard.writeText(summary);
      showToast('Plan copied \u{2014} share with your crew!');
    }
  };

  // --------------------------------------------------------------------------
  // Auto Day Planner
  // --------------------------------------------------------------------------

  const [autoPlanLoading, setAutoPlanLoading] = useState(false);
  const [autoPlanError, setAutoPlanError] = useState<string | null>(null);
  const [lastPlanTitle, setLastPlanTitle] = useState<string | null>(null);

  const planMyDay = useCallback(async (mood: string, budget: number, duration: PlanDuration): Promise<boolean> => {
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

      // Get today's events for the AI to optionally include
      const today = new Date().toISOString().split('T')[0];
      const todayEvents = events
        .filter(e => e.date === today)
        .slice(0, 5)
        .map(e => ({ name: e.name, category: e.category, time: e.time, venue: e.venue }));

      const result = await generateDayPlan({
        lat,
        lng,
        city: cityLabel || undefined,
        mood,
        budget,
        travelGroup: travelGroup || undefined,
        duration,
        weather: weatherStr,
        preferences: prefSummary,
        events: todayEvents.length > 0 ? todayEvents : undefined,
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

      // Record in preference memory
      recordTripGenerated(mood);

      hapticNotification('Success');
      showToast(`Day ${activeDay}: ${result.dayTitle} — ${stops.length} stops planned!`);
      track('auto_plan_generated', {
        mood, duration, budget: String(budget),
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
  }, [lat, lng, weather, cityLabel, travelGroup, events, showToast, activeDay]);

  return {
    tripDays, setTripDays, activeDay, setActiveDay,
    dayPlan, totalStops, dayCount, setActiveDayStops,
    addToPlan, addEventToPlan, removeFromPlan, isInPlan, isEventInPlan,
    clearPlan, movePlanStop, addDay, removeDay, moveStopToDay, pivotStop,
    getRouteUrl, getFullTripRouteUrl, sharePlan, getTransportInfo, getDaySummary,
    dayBudgets, setDayBudget, activeDayBudget,
    estimatedSpend, budgetRemaining, budgetPercentUsed, isOverBudget,
    crewMode, crewCode, crewSyncing, joinCrewInput, setJoinCrewInput,
    showJoinCrew, setShowJoinCrew, startCrewMode, stopCrewMode, joinCrew, shareCrewPlan,
    autoPlanLoading, autoPlanError, lastPlanTitle, planMyDay,
  };
}
