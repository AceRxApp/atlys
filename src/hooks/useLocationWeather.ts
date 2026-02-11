import { useState, useEffect, useCallback } from 'react';
import { track } from '@vercel/analytics';
import { fetchCities } from '../supabase';
import type { City } from '../types';
import { CITY_COORDS, WEATHER_CODES } from '../data';

export const MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';

interface LocState {
  lat: number | null;
  lng: number | null;
  city: string | null;
  loading: boolean;
  error: string | null;
  permissionDenied: boolean;
  requestLocation: () => void;
  hasLocation: boolean;
}

export function useLocationWeather(loc: LocState) {
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCityRaw] = useState<City | null>(null);
  const [useGps, setUseGpsRaw] = useState(() => sessionStorage.getItem('nxstops_use_gps') === 'true');
  const [searchRadius, setSearchRadius] = useState(1500);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<{
    temp: number; high: number; low: number; code: number;
    description: string; emoji: string;
    forecast: { date: string; high: number; low: number; code: number; emoji: string; description: string; precipChance: number }[];
  } | null>(null);

  // Persisted setters
  const setSelectedCity = useCallback((city: City | null) => {
    setSelectedCityRaw(city);
    if (city) {
      sessionStorage.setItem('nxstops_selected_city', JSON.stringify(city));
      track('city_selected', { city: city.name, country: city.country });
    } else {
      sessionStorage.removeItem('nxstops_selected_city');
    }
  }, []);

  const setUseGps = useCallback((v: boolean) => {
    setUseGpsRaw(v);
    sessionStorage.setItem('nxstops_use_gps', String(v));
  }, []);

  // Derived
  const cityLabel = useGps ? (loc.city || 'Near You') : (selectedCity?.name || '');
  const citySlug = useGps ? (loc.city || '').toLowerCase().replace(/\s+/g, '-') : (selectedCity?.slug || '');
  const useMiles = selectedCity?.country === 'USA' || selectedCity?.country === 'United States';

  const getMapCenter = useCallback(() => {
    if (useGps && loc.lat && loc.lng) return { lat: loc.lat, lng: loc.lng };
    if (selectedCity) {
      const c = CITY_COORDS[selectedCity.name.toLowerCase()];
      if (c) return c;
    }
    return { lat: 40.7128, lng: -73.996 };
  }, [useGps, loc.lat, loc.lng, selectedCity]);

  // Load cities + restore saved city
  useEffect(() => {
    (async () => {
      const data = await fetchCities();
      setCities(data);
      try {
        const savedCity = sessionStorage.getItem('nxstops_selected_city');
        if (savedCity) {
          const parsed = JSON.parse(savedCity);
          const match = data.find((c: City) => c.id === parsed.id);
          if (match) setSelectedCityRaw(match);
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  // Auto-GPS
  useEffect(() => {
    if (loc.hasLocation && !selectedCity && !sessionStorage.getItem('nxstops_selected_city') && !sessionStorage.getItem('nxstops_use_gps')) {
      setUseGps(true);
    }
  }, [loc.hasLocation, selectedCity, setUseGps]);

  // Fetch weather
  useEffect(() => {
    let lat: number | undefined, lng: number | undefined;
    if (useGps && loc.lat && loc.lng) { lat = loc.lat; lng = loc.lng; }
    else if (selectedCity) {
      const c = CITY_COORDS[selectedCity.name.toLowerCase()];
      if (c) { lat = c.lat; lng = c.lng; }
    }
    if (!lat || !lng) { setWeather(null); return; }
    const fetchWeather = async () => {
      try {
        const resp = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weathercode&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max&timezone=auto&forecast_days=10&temperature_unit=fahrenheit`
        );
        if (!resp.ok) return;
        const data = await resp.json();
        const code = data.current?.weathercode ?? 0;
        const wInfo = WEATHER_CODES[code] || { emoji: '\u{1F321}\u{FE0F}', description: 'Unknown' };
        const forecast = (data.daily?.time || []).map((date: string, i: number) => {
          const dayCode = data.daily.weathercode[i] ?? 0;
          const dInfo = WEATHER_CODES[dayCode] || { emoji: '\u{1F321}\u{FE0F}', description: 'Unknown' };
          return {
            date,
            high: Math.round(data.daily.temperature_2m_max[i]),
            low: Math.round(data.daily.temperature_2m_min[i]),
            code: dayCode,
            emoji: dInfo.emoji,
            description: dInfo.description,
            precipChance: data.daily.precipitation_probability_max?.[i] ?? 0,
          };
        });
        setWeather({
          temp: Math.round(data.current.temperature_2m),
          high: Math.round(data.daily.temperature_2m_max[0]),
          low: Math.round(data.daily.temperature_2m_min[0]),
          code,
          description: wInfo.description,
          emoji: wInfo.emoji,
          forecast,
        });
      } catch { /* weather is non-critical */ }
    };
    fetchWeather();
  }, [useGps, loc.lat, loc.lng, selectedCity]);

  return {
    cities, selectedCity, setSelectedCity,
    useGps, setUseGps, searchRadius, setSearchRadius,
    loading, weather, loc,
    cityLabel, citySlug, useMiles,
    getMapCenter, MAPS_API_KEY,
  };
}
