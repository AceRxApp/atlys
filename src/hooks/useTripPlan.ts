import { useState, useEffect, useCallback, useRef } from 'react';
import { track } from '@vercel/analytics';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createCrewTrip, loadCrewTrip, updateCrewTripDays, subscribeToCrewTrip, unsubscribeFromCrewTrip } from '../supabase';
import type { City, EventItem, Stop } from '../types';
import type { Place } from '../services/places';
import { formatDistance } from '../services/places';

export function useTripPlan(deps: {
  useGps: boolean;
  locCity: string | null;
  selectedCity: City | null;
  cityLabel: string;
  citySlug: string;
  useMiles: boolean;
  showToast: (msg: string) => void;
}) {
  const { useGps, locCity, selectedCity, cityLabel, citySlug, useMiles, showToast } = deps;

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

  // Derived
  const dayPlan = tripDays[activeDay] || [];
  const totalStops = Object.values(tripDays).reduce((sum, stops) => sum + stops.length, 0);
  const dayCount = Object.keys(tripDays).length;

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
    const allStops = Object.values(tripDays).flat();
    if (allStops.find(s => s.place?.placeId === place.placeId)) return;
    setActiveDayStops(prev => [...prev, { id: crypto.randomUUID(), type: 'place', place, addedAt: new Date() }]);
    showToast(`Added ${place.name} to Day ${activeDay}`);
    track('add_to_plan', { place: place.name, category: place.categoryDisplay || '', day: String(activeDay) });
  };

  const addEventToPlan = (event: EventItem) => {
    const allStops = Object.values(tripDays).flat();
    if (allStops.find(s => s.event?.id === event.id)) return;
    setActiveDayStops(prev => [...prev, { id: crypto.randomUUID(), type: 'event', event, addedAt: new Date() }]);
    showToast(`Added ${event.name} to Day ${activeDay}`);
    track('add_event_to_plan', { event: event.name, day: String(activeDay) });
  };

  const isEventInPlan = (eventId: string) => Object.values(tripDays).flat().some(s => s.event?.id === eventId);

  const removeFromPlan = (stopId: string) => {
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
    setTripDays({ 1: [] });
    setActiveDay(1);
    showToast('Plan cleared');
  };

  const movePlanStop = (index: number, direction: 'up' | 'down') => {
    const newPlan = [...dayPlan];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= newPlan.length) return;
    [newPlan[index], newPlan[target]] = [newPlan[target], newPlan[index]];
    setActiveDayStops(newPlan);
  };

  const addDay = () => {
    const nextDay = Math.max(...Object.keys(tripDays).map(Number)) + 1;
    setTripDays(prev => ({ ...prev, [nextDay]: [] }));
    setActiveDay(nextDay);
    showToast(`Day ${nextDay} added`);
  };

  const removeDay = (day: number) => {
    if (dayCount <= 1) return;
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
    if (navigator.share) {
      await navigator.share({ title: `${cityLabel} Trip Plan`, text: summary });
    } else {
      await navigator.clipboard.writeText(summary);
      showToast('Plan copied to clipboard');
    }
  };

  const getTransportInfo = (fromStop: Stop, toStop: Stop): { emoji: string; text: string; distance: string; mapsUrl: string } | null => {
    let fromLat: number | undefined, fromLng: number | undefined, toLat: number | undefined, toLng: number | undefined;
    if (fromStop.type === 'place' && fromStop.place) { fromLat = fromStop.place.lat; fromLng = fromStop.place.lng; }
    else if (fromStop.type === 'event' && fromStop.event?.lat) { fromLat = fromStop.event.lat ?? undefined; fromLng = fromStop.event.lng ?? undefined; }
    if (toStop.type === 'place' && toStop.place) { toLat = toStop.place.lat; toLng = toStop.place.lng; }
    else if (toStop.type === 'event' && toStop.event?.lat) { toLat = toStop.event.lat ?? undefined; toLng = toStop.event.lng ?? undefined; }
    if (!fromLat || !fromLng || !toLat || !toLng) return null;
    const R = 6371;
    const dLat = ((toLat - fromLat) * Math.PI) / 180;
    const dLng = ((toLng - fromLng) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((fromLat * Math.PI) / 180) * Math.cos((toLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const mapsUrl = `https://www.google.com/maps/dir/${fromLat},${fromLng}/${toLat},${toLng}`;
    const distStr = (d: number) => {
      if (useMiles) { const mi = d * 0.621371; return mi < 0.5 ? `${mi.toFixed(1)} mi` : `${Math.round(mi * 10) / 10} mi`; }
      return d < 2 ? `${d.toFixed(1)} km` : `${Math.round(d)} km`;
    };
    if (km < 0.5) return { emoji: '\u{1F6B6}', text: '~5 min walk', distance: useMiles ? `${Math.round(km * 3281)}ft` : `${Math.round(km * 1000)}m`, mapsUrl };
    if (km < 1.5) return { emoji: '\u{1F6B6}\u{1F695}', text: `${Math.round(km * 12)} min walk or quick ride`, distance: distStr(km), mapsUrl };
    if (km < 5) return { emoji: '\u{1F687}\u{1F695}', text: 'Transit or ride recommended', distance: distStr(km), mapsUrl };
    return { emoji: '\u{1F697}\u{1F695}', text: 'Drive or ride needed', distance: distStr(km), mapsUrl };
  };

  // --------------------------------------------------------------------------
  // Crew mode handlers
  // --------------------------------------------------------------------------

  const generateCrewCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  };

  const startCrewMode = async () => {
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
    const code = joinCrewInput.trim().toUpperCase();
    if (code.length < 4) { showToast('Enter a valid crew code'); return; }
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

  return {
    tripDays, setTripDays, activeDay, setActiveDay,
    dayPlan, totalStops, dayCount, setActiveDayStops,
    addToPlan, addEventToPlan, removeFromPlan, isInPlan, isEventInPlan,
    clearPlan, movePlanStop, addDay, removeDay, moveStopToDay,
    getRouteUrl, sharePlan, getTransportInfo,
    crewMode, crewCode, crewSyncing, joinCrewInput, setJoinCrewInput,
    showJoinCrew, setShowJoinCrew, startCrewMode, stopCrewMode, joinCrew, shareCrewPlan,
  };
}
