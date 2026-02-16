import { useState, useEffect, useCallback } from 'react';
import type { City } from '../types';
import { CITY_COORDS } from '../data';

interface LocState {
  lat: number | null;
  lng: number | null;
  city: string | null;
  hasLocation: boolean;
}

export function useEvents(deps: {
  useGps: boolean;
  loc: LocState;
  selectedCity: City | null;
  screen: string;
}) {
  const { useGps, loc, selectedCity, screen } = deps;

  const [events, setEvents] = useState<import('../types').EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState(false);
  const [eventsViewMode, setEventsViewMode] = useState<'list' | 'map'>('list');
  const [eventCategoryFilter, setEventCategoryFilter] = useState('all');
  const [activeEventPin, setActiveEventPin] = useState<string | null>(null);

  const fetchEventsData = useCallback(async () => {
    let lat: number | undefined, lng: number | undefined;
    if (useGps && loc.lat && loc.lng) { lat = loc.lat; lng = loc.lng; }
    else if (selectedCity) {
      const c = CITY_COORDS[selectedCity.name.toLowerCase()];
      if (c) { lat = c.lat; lng = c.lng; }
    }
    if (!lat || !lng) return;
    setEventsLoading(true);
    setEventsError(false);
    try {
      const params = new URLSearchParams({ lat: lat.toString(), lng: lng.toString(), radius: '50' });
      const response = await fetch(`/api/events?${params}`);
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      } else {
        setEventsError(true);
      }
    } catch {
      setEventsError(true);
    }
    setEventsLoading(false);
  }, [useGps, loc.lat, loc.lng, selectedCity]);

  useEffect(() => {
    if (screen === 'events' && (useGps || selectedCity)) fetchEventsData();
  }, [screen, fetchEventsData, useGps, selectedCity]);

  // Helpers
  const formatEventDate = (dateStr: string): string => {
    if (!dateStr) return 'TBA';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatEventTime = (timeStr: string): string => {
    if (!timeStr) return '';
    const parts = timeStr.split(':').map(Number);
    const h = parts[0];
    const m = parts[1] ?? 0;
    if (isNaN(h)) return timeStr;
    const isPM = h >= 12;
    const hour12 = h % 12 || 12;
    return `${hour12}:${m.toString().padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
  };

  return {
    events, eventsLoading, eventsError,
    eventsViewMode, setEventsViewMode,
    eventCategoryFilter, setEventCategoryFilter,
    activeEventPin, setActiveEventPin,
    fetchEventsData, formatEventDate, formatEventTime,
  };
}
