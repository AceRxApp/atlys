import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { Routes, Route, useLocation as useRouterLocation, useNavigate, Navigate } from 'react-router-dom';
import { track } from '@vercel/analytics';
import { fetchCities, fetchEmailSignups, fetchAllCities, toggleCityActive, authSignUp, authSignIn, authSignOut, authGetSession, authOnStateChange, saveReview, fetchReviews, fetchPlaceTagCounts, createCrewTrip, loadCrewTrip, updateCrewTripDays, subscribeToCrewTrip, unsubscribeFromCrewTrip } from './supabase';
import type { Review } from './supabase';
import type { RealtimeChannel, User } from '@supabase/supabase-js';
import { searchNearby, textSearchPlaces, formatDistance } from './services/places';
import type { Place } from './services/places';
import { useLocation as useGeoLocation } from './hooks/useLocation';
import type { City, EventItem, Stop, AdminSignup, Vibe, QuickFilter, TravelGroup, CommunityTag } from './types';
import {
  CITY_COORDS, WEATHER_CODES, EMERGENCY_BY_COUNTRY,
  NIGHTLIFE_TYPES, GIRLY_TYPES, GIRLY_KEYWORDS, BOYS_EXCLUDE_TYPES,
  RESERVABLE_TYPES, BOOKABLE_TYPES, ADMIN_EMAIL,
} from './data';
import { getCardStyle } from './styles/shared';
import { AppContext } from './context/AppContext';
import { useTheme } from './context/ThemeContext';
import { HomeIcon, DiscoverIcon, EventsIcon, PlanIcon, ShieldIcon, GearIcon, CloseIcon } from './components/icons';
import { SkeletonCard } from './components/ui';
import Footer from './components/Footer';

type Screen = 'home' | 'discover' | 'events' | 'plan';

// Lazy-loaded screens & modals
const HomeScreen = lazy(() => import('./screens/HomeScreen'));
const DiscoverScreen = lazy(() => import('./screens/DiscoverScreen'));
const EventsScreen = lazy(() => import('./screens/EventsScreen'));
const PlanScreen = lazy(() => import('./screens/PlanScreen'));
const PlaceDetailModal = lazy(() => import('./components/PlaceDetailModal'));
const ProfileScreen = lazy(() => import('./screens/ProfileScreen'));
const AdminPanel = lazy(() => import('./screens/AdminPanel'));
const AboutScreen = lazy(() => import('./screens/AboutScreen'));
const PrivacyScreen = lazy(() => import('./screens/PrivacyScreen'));
const TermsScreen = lazy(() => import('./screens/TermsScreen'));
const ContactScreen = lazy(() => import('./screens/ContactScreen'));

const MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';

// ============================================================================
// APP — slim shell: state + effects + handlers + context provider + router
// ============================================================================

export default function App() {
  const { theme } = useTheme();
  const cardStyle = getCardStyle(theme);

  // --- Router integration ---
  const routerLocation = useRouterLocation();
  const navigate = useNavigate();

  const screen = (() => {
    const path = routerLocation.pathname.slice(1) || 'home';
    return (['home', 'discover', 'events', 'plan'].includes(path) ? path : 'home') as Screen;
  })();

  const isInfoPage = ['/about', '/privacy', '/terms', '/contact'].includes(routerLocation.pathname);

  const setScreen = useCallback((s: string) => {
    navigate(s === 'home' ? '/' : `/${s}`);
  }, [navigate]);

  // --- Core state ---
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCityRaw] = useState<City | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedVibe, setSelectedVibe] = useState<Vibe | null>(null);
  const [quickFilters, setQuickFilters] = useState<QuickFilter[]>(['open']);
  const [tripDays, setTripDays] = useState<Record<number, Stop[]>>({ 1: [] });
  const [activeDay, setActiveDay] = useState(1);
  const [loading, setLoading] = useState(true);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [useGps, setUseGpsRaw] = useState(() => sessionStorage.getItem('nxstops_use_gps') === 'true');
  const [searchRadius, setSearchRadius] = useState(1500);

  // --- Modals ---
  const [surprisePlace, setSurprisePlace] = useState<Place | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [showSafety, setShowSafety] = useState(false);
  const [showCulture, setShowCulture] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  // --- Auth ---
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authScreen, setAuthScreen] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // --- Admin ---
  const [adminSignups, setAdminSignups] = useState<AdminSignup[]>([]);
  const [adminCities, setAdminCities] = useState<City[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminTab, setAdminTab] = useState<'dashboard' | 'signups' | 'cities'>('dashboard');

  // --- Events ---
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsViewMode, setEventsViewMode] = useState<'list' | 'map'>('list');
  const [eventCategoryFilter, setEventCategoryFilter] = useState('all');

  // --- Map ---
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [activeMapPin, setActiveMapPin] = useState<string | null>(null);
  const [activeEventPin, setActiveEventPin] = useState<string | null>(null);

  // --- Place Detail ---
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // --- Toast ---
  const [toast, setToast] = useState<string | null>(null);

  // --- Weather ---
  const [weather, setWeather] = useState<{
    temp: number; high: number; low: number; code: number;
    description: string; emoji: string;
    forecast: { date: string; high: number; low: number; code: number; emoji: string; description: string; precipChance: number }[];
  } | null>(null);

  // --- Offline ---
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // --- Travel Group ---
  const [travelGroup, setTravelGroup] = useState<TravelGroup | null>(() => {
    return (sessionStorage.getItem('nxstops_travel_group') as TravelGroup) || null;
  });

  // --- Community ---
  const [communityFilters, setCommunityFilters] = useState<CommunityTag[]>([]);
  const [placeTagsCache, setPlaceTagsCache] = useState<Record<string, Record<string, number>>>({});

  // --- Reviews ---
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewTags, setReviewTags] = useState<CommunityTag[]>([]);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [placeReviews, setPlaceReviews] = useState<Review[]>([]);

  // --- Search ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // --- Onboarding ---
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('nxstops_onboarded'));
  const [onboardingStep, setOnboardingStep] = useState(0);

  // --- Crew Mode ---
  const [crewMode, setCrewMode] = useState(() => sessionStorage.getItem('nxstops_crew_mode') === 'true');
  const [crewCode, setCrewCode] = useState<string | null>(() => sessionStorage.getItem('nxstops_crew_code'));
  const [crewSyncing, setCrewSyncing] = useState(false);
  const [joinCrewInput, setJoinCrewInput] = useState('');
  const [showJoinCrew, setShowJoinCrew] = useState(false);
  const crewChannelRef = useRef<RealtimeChannel | null>(null);
  const crewSyncLock = useRef(false);

  // --- Saved / Bookmarks ---
  const [savedPlaces, setSavedPlaces] = useState<Place[]>(() => {
    try {
      const saved = localStorage.getItem('nxstops_saved_places');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // --- Push Notifications ---
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(
    () => sessionStorage.getItem('nxstops_notif_dismissed') !== 'true'
  );

  // --- Location hook ---
  const loc = useGeoLocation();

  // --------------------------------------------------------------------------
  // DERIVED VALUES
  // --------------------------------------------------------------------------

  const dayPlan = tripDays[activeDay] || [];
  const totalStops = Object.values(tripDays).reduce((sum, stops) => sum + stops.length, 0);
  const dayCount = Object.keys(tripDays).length;

  const setActiveDayStops = useCallback((updater: Stop[] | ((prev: Stop[]) => Stop[])) => {
    setTripDays(prev => ({
      ...prev,
      [activeDay]: typeof updater === 'function' ? updater(prev[activeDay] || []) : updater,
    }));
  }, [activeDay]);

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

  const userName = user?.user_metadata?.full_name
    ? (user.user_metadata.full_name as string).split(' ')[0]
    : null;

  const cityLabel = useGps ? (loc.city || 'Near You') : (selectedCity?.name || '');
  const citySlug = useGps ? (loc.city || '').toLowerCase().replace(/\s+/g, '-') : (selectedCity?.slug || '');
  const useMiles = selectedCity?.country === 'USA' || selectedCity?.country === 'United States';

  // --------------------------------------------------------------------------
  // HELPERS
  // --------------------------------------------------------------------------

  const getPlanKey = useCallback(() => {
    if (useGps && loc.city) return `nxstops_plan_gps_${loc.city.toLowerCase().replace(/\s+/g, '_')}`;
    if (selectedCity) return `nxstops_plan_${selectedCity.name.toLowerCase().replace(/\s+/g, '_')}`;
    return 'nxstops_plan_default';
  }, [useGps, loc.city, selectedCity]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return;
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          await registration.pushManager.subscribe({ userVisibleOnly: true });
        }
        showToast('Notifications enabled!');
      }
    } catch (err) {
      console.error('[NxStops] Notification permission error:', err);
    }
  }, [showToast]);

  const dismissNotificationPrompt = useCallback(() => {
    setShowNotificationPrompt(false);
    sessionStorage.setItem('nxstops_notif_dismissed', 'true');
  }, []);

  const getGreeting = (): string => {
    const h = currentTime.getHours();
    const name = userName ? `, ${userName}` : '';
    if (h < 12) return `Good morning${name}`;
    if (h < 17) return `Good afternoon${name}`;
    if (h < 21) return `Good evening${name}`;
    return `Good night${name}`;
  };

  const getTimeSuggestion = (): string => {
    const h = currentTime.getHours();
    if (h >= 6 && h < 11) return 'Perfect time for coffee & brunch';
    if (h >= 11 && h < 14) return 'Lunch spots & afternoon vibes';
    if (h >= 14 && h < 17) return 'Explore something new nearby';
    if (h >= 17 && h < 21) return 'Dinner & evening plans await';
    return 'Late night spots still open';
  };

  const getSafetyIndicators = (place: Place): string[] => {
    const indicators: string[] = [];
    if (place.rating >= 4.3 && place.reviewCount >= 100) indicators.push('Well-reviewed');
    if (place.reviewCount >= 500) indicators.push('Popular spot');
    if (NIGHTLIFE_TYPES.includes(place.category)) indicators.push('Night venue');
    if ((isReservable(place) || isBookable(place)) && place.rating >= 4.0) indicators.push('Reserve ahead');
    return indicators;
  };

  const getDistanceReference = (): string => {
    if (useGps && loc.hasLocation) return 'from you';
    if (selectedCity) return `from ${selectedCity.name} center`;
    return '';
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

  const getMapCenter = () => {
    if (useGps && loc.lat && loc.lng) return { lat: loc.lat, lng: loc.lng };
    if (selectedCity) {
      const c = CITY_COORDS[selectedCity.name.toLowerCase()];
      if (c) return c;
    }
    return { lat: 40.7128, lng: -73.996 };
  };

  const isReservable = (place: Place): boolean => RESERVABLE_TYPES.includes(place.category);
  const isBookable = (place: Place): boolean => BOOKABLE_TYPES.includes(place.category);

  const getBookingUrl = (place: Place): string => {
    if (place.website) return place.website;
    const q = encodeURIComponent(`${place.name} ${place.address ? place.address.split(',')[0] : ''} reservation`);
    return `https://www.google.com/search?q=${q}`;
  };

  const getBookingLabel = (place: Place): string => {
    if (RESERVABLE_TYPES.includes(place.category)) return 'Reserve';
    return 'Book';
  };

  const getStopName = (stop: Stop) => stop.type === 'event' ? (stop.event?.name || 'Event') : (stop.place?.name || 'Place');
  const getStopCategory = (stop: Stop) => stop.type === 'event' ? (stop.event?.category || 'Event') : (stop.place?.categoryDisplay || '');

  // --------------------------------------------------------------------------
  // EFFECTS
  // --------------------------------------------------------------------------

  // Online/offline detection
  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  // Check notification permission on mount
  useEffect(() => {
    if (typeof Notification !== 'undefined') setNotificationPermission(Notification.permission);
  }, []);

  // Auth session
  useEffect(() => {
    authGetSession().then(session => { setUser(session?.user ?? null); setAuthLoading(false); });
    const { data: { subscription } } = authOnStateChange(session => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

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

  // Load saved plan (city-isolated, multi-day)
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

  // Persist travel group
  useEffect(() => {
    if (travelGroup) sessionStorage.setItem('nxstops_travel_group', travelGroup);
    else sessionStorage.removeItem('nxstops_travel_group');
  }, [travelGroup]);

  // Persist saved places
  useEffect(() => {
    localStorage.setItem('nxstops_saved_places', JSON.stringify(savedPlaces));
  }, [savedPlaces]);

  // Load community tags
  useEffect(() => {
    if (places.length === 0) return;
    const ids = places.map(p => p.placeId);
    fetchPlaceTagCounts(ids).then(setPlaceTagsCache);
  }, [places]);

  // Load reviews when selectedPlace changes
  useEffect(() => {
    if (!selectedPlace) { setPlaceReviews([]); setShowReviewForm(false); return; }
    setActivePhotoIndex(0);
    fetchReviews(selectedPlace.placeId).then(setPlaceReviews);
  }, [selectedPlace]);

  // Clock
  useEffect(() => {
    const i = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(i);
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

  // Fetch places
  const fetchPlaces = useCallback(async () => {
    let lat: number | undefined, lng: number | undefined;
    if (useGps && loc.lat && loc.lng) { lat = loc.lat; lng = loc.lng; }
    else if (selectedCity) {
      const c = CITY_COORDS[selectedCity.name.toLowerCase()];
      if (c) { lat = c.lat; lng = c.lng; }
    }
    if (!lat || !lng) return;
    setPlacesLoading(true);
    const vibes = selectedVibe ? [selectedVibe] : [];
    const results = await searchNearby(lat, lng, vibes, searchRadius);
    setPlaces(results);
    setPlacesLoading(false);
  }, [useGps, loc.lat, loc.lng, selectedCity, selectedVibe, searchRadius]);

  useEffect(() => {
    if (screen === 'discover' && (useGps || selectedCity)) fetchPlaces();
  }, [screen, fetchPlaces, useGps, selectedCity]);

  // Fetch events
  const fetchEventsData = useCallback(async () => {
    let lat: number | undefined, lng: number | undefined;
    if (useGps && loc.lat && loc.lng) { lat = loc.lat; lng = loc.lng; }
    else if (selectedCity) {
      const c = CITY_COORDS[selectedCity.name.toLowerCase()];
      if (c) { lat = c.lat; lng = c.lng; }
    }
    if (!lat || !lng) return;
    setEventsLoading(true);
    try {
      const params = new URLSearchParams({ lat: lat.toString(), lng: lng.toString(), radius: '25' });
      const response = await fetch(`/api/events?${params}`);
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch { /* events API may not be configured yet */ }
    setEventsLoading(false);
  }, [useGps, loc.lat, loc.lng, selectedCity]);

  useEffect(() => {
    if (screen === 'events' && (useGps || selectedCity)) fetchEventsData();
  }, [screen, fetchEventsData, useGps, selectedCity]);

  // --------------------------------------------------------------------------
  // FILTERED PLACES
  // --------------------------------------------------------------------------

  const filteredPlaces = places.filter(place => {
    for (const f of quickFilters) {
      switch (f) {
        case 'open': if (!place.openNow) return false; break;
        case 'walking': if (place.distance !== null && place.distance > 1) return false; break;
        case 'topRated': if (place.rating < 4.5) return false; break;
        case 'budget': if (place.priceLevel > 2 && place.priceLevel !== -1) return false; break;
        case 'family': if (NIGHTLIFE_TYPES.includes(place.category)) return false; if (place.rating > 0 && place.rating < 3.5) return false; break;
        case 'solo': if (place.reviewCount < 50) return false; if (place.rating > 0 && place.rating < 3.8) return false; break;
      }
    }
    if (travelGroup) {
      const nameLower = place.name.toLowerCase();
      const summaryLower = (place.editorialSummary || '').toLowerCase();
      const combined = nameLower + ' ' + summaryLower;
      switch (travelGroup) {
        case 'girls':
        case 'bachelorette': {
          if (['gym', 'church', 'library'].includes(place.category)) return false;
          const isGirlyType = GIRLY_TYPES.includes(place.category);
          const hasGirlyVibe = GIRLY_KEYWORDS.some(kw => combined.includes(kw));
          if (!isGirlyType && !hasGirlyVibe && place.rating > 0 && place.rating < 4.0) return false;
          break;
        }
        case 'family': {
          if (NIGHTLIFE_TYPES.includes(place.category)) return false;
          if (place.rating > 0 && place.rating < 3.5) return false;
          break;
        }
        case 'boys':
        case 'friends': {
          if (travelGroup === 'boys' && BOYS_EXCLUDE_TYPES.includes(place.category)) return false;
          if (['library', 'church'].includes(place.category)) return false;
          break;
        }
        case 'solo': {
          if (place.reviewCount < 20) return false;
          if (place.rating > 0 && place.rating < 3.5) return false;
          break;
        }
        case 'couple': break;
      }
    }
    if (communityFilters.length > 0) {
      const tags = placeTagsCache[place.placeId];
      if (tags) {
        const hasMatch = communityFilters.some(f => (tags[f] || 0) >= 1);
        if (!hasMatch) return false;
      } else {
        const cat = place.category;
        const nameLower = place.name.toLowerCase();
        const catDisplay = place.categoryDisplay.toLowerCase();
        for (const filter of communityFilters) {
          let matches = false;
          switch (filter) {
            case 'kid-friendly':
              matches = ['park', 'playground', 'museum', 'zoo', 'aquarium', 'amusement_park', 'bowling_alley', 'movie_theater', 'ice_cream_shop', 'pizza_restaurant', 'library'].includes(cat)
                || /\b(kid|child|family|play|fun|arcade|trampoline|zoo|aquarium|disney|museum)\b/i.test(nameLower + ' ' + catDisplay);
              break;
            case 'baby-friendly':
              matches = ['park', 'cafe', 'coffee_shop', 'restaurant', 'shopping_mall', 'library', 'museum'].includes(cat)
                || /\b(family|cafe|coffee|park|garden|library)\b/i.test(nameLower + ' ' + catDisplay);
              break;
            case 'wheelchair-accessible':
              matches = !(/\b(trail|hike|climb|rooftop|boat|kayak|surf)\b/i.test(nameLower + ' ' + catDisplay));
              break;
            case 'solo-friendly':
              matches = place.rating >= 4.0 && place.reviewCount >= 50
                && ['cafe', 'coffee_shop', 'restaurant', 'bar', 'park', 'museum', 'library', 'bookstore', 'art_gallery'].includes(cat);
              break;
            case 'lgbtq-friendly':
              matches = place.rating >= 4.0 && ['cafe', 'coffee_shop', 'bar', 'restaurant', 'art_gallery', 'bookstore', 'park', 'museum', 'night_club', 'spa'].includes(cat);
              break;
            default:
              matches = true;
              break;
          }
          if (!matches) return false;
        }
      }
    }
    return true;
  });

  // --------------------------------------------------------------------------
  // DAY PLAN HANDLERS
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
    const totalStops = Object.values(tripDays).flat().length;
    track('share_plan', { city: cityLabel, days: String(Object.keys(tripDays).length), stops: String(totalStops) });
    if (navigator.share) {
      await navigator.share({ title: `${cityLabel} Trip Plan`, text: summary });
    } else {
      await navigator.clipboard.writeText(summary);
      showToast('Plan copied to clipboard');
    }
  };

  // --------------------------------------------------------------------------
  // REVIEW HANDLER
  // --------------------------------------------------------------------------

  const handleSubmitReview = async () => {
    if (!selectedPlace || reviewRating === 0 || !user) return;
    setReviewSubmitting(true);
    const result = await saveReview(selectedPlace.placeId, citySlug, reviewRating, reviewText, reviewTags);
    if (result.success) {
      showToast('Review submitted!');
      setShowReviewForm(false);
      setReviewRating(0);
      setReviewText('');
      setReviewTags([]);
      const updated = await fetchReviews(selectedPlace.placeId);
      setPlaceReviews(updated);
      const ids = places.map(p => p.placeId);
      if (ids.length > 0) fetchPlaceTagCounts(ids).then(setPlaceTagsCache);
    } else {
      showToast('Failed to submit review');
    }
    setReviewSubmitting(false);
  };

  // --------------------------------------------------------------------------
  // SEARCH
  // --------------------------------------------------------------------------

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    let lat: number | undefined, lng: number | undefined;
    if (useGps && loc.lat && loc.lng) { lat = loc.lat; lng = loc.lng; }
    else if (selectedCity) {
      const c = CITY_COORDS[selectedCity.name.toLowerCase()];
      if (c) { lat = c.lat; lng = c.lng; }
    }
    if (!lat || !lng) return;
    setIsSearching(true);
    track('search', { query: searchQuery.trim() });
    const results = await textSearchPlaces(searchQuery.trim(), lat, lng);
    setSearchResults(results);
    setIsSearching(false);
    setShowSearch(true);
  }, [searchQuery, useGps, loc.lat, loc.lng, selectedCity]);

  // --------------------------------------------------------------------------
  // BOOKMARK HELPERS
  // --------------------------------------------------------------------------

  const isSaved = (placeId: string) => savedPlaces.some(p => p.placeId === placeId);
  const toggleSaved = (place: Place) => {
    if (isSaved(place.placeId)) {
      setSavedPlaces(prev => prev.filter(p => p.placeId !== place.placeId));
      showToast('Removed from saved');
      track('unsave_place', { place: place.name });
    } else {
      setSavedPlaces(prev => [...prev, place]);
      showToast('Saved for later');
      track('save_place', { place: place.name, category: place.categoryDisplay || '' });
    }
  };

  // --------------------------------------------------------------------------
  // AUTH HANDLERS
  // --------------------------------------------------------------------------

  const handleSignIn = async () => {
    setAuthError(null);
    setAuthSubmitting(true);
    const { error } = await authSignIn(authEmail, authPassword);
    if (error) setAuthError(error.message);
    setAuthSubmitting(false);
  };

  const handleSignUp = async () => {
    setAuthError(null);
    setAuthSubmitting(true);
    const { data, error } = await authSignUp(authEmail, authPassword, authName || undefined);
    if (error) {
      setAuthError(error.message);
    } else if (data.session) {
      // Auto-signed in
    } else {
      showToast('Check your email to confirm your account');
      setAuthScreen('signin');
    }
    setAuthSubmitting(false);
  };

  const handleSignOut = async () => {
    await authSignOut();
    setUser(null);
    setScreen('home');
  };

  // --------------------------------------------------------------------------
  // OTHER HANDLERS
  // --------------------------------------------------------------------------

  const sharePlace = async (place: Place) => {
    if (navigator.share) {
      await navigator.share({ title: place.name, text: `Check out ${place.name} on NxStops`, url: place.googleMapsUrl });
    } else if (place.googleMapsUrl) {
      await navigator.clipboard.writeText(place.googleMapsUrl);
      showToast('Link copied');
    }
  };

  const handleSurpriseMe = () => {
    const open = places.filter(p => p.openNow);
    if (open.length === 0) { showToast('No open places found'); return; }
    setSurprisePlace(open[Math.floor(Math.random() * open.length)]);
  };

  const openAdmin = async () => {
    setShowAdmin(true);
    setAdminLoading(true);
    const [signups, allCities] = await Promise.all([fetchEmailSignups(), fetchAllCities()]);
    setAdminSignups(signups as AdminSignup[]);
    setAdminCities(allCities as City[]);
    setAdminLoading(false);
  };

  const handleToggleCity = async (cityId: string, isActive: boolean) => {
    const ok = await toggleCityActive(cityId, !isActive);
    if (ok) {
      setAdminCities(prev => prev.map(c => c.id === cityId ? { ...c, is_active: !isActive } : c));
      showToast(`City ${!isActive ? 'activated' : 'deactivated'}`);
    }
  };

  // --------------------------------------------------------------------------
  // CREW MODE HANDLERS
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

  // --------------------------------------------------------------------------
  // CONTEXT VALUE
  // --------------------------------------------------------------------------

  const contextValue = {
    screen, setScreen, cities, selectedCity, setSelectedCity, places, setPlaces,
    filteredPlaces, placesLoading, useGps, setUseGps, searchRadius, setSearchRadius,
    loc,
    tripDays, setTripDays, activeDay, setActiveDay, dayPlan, totalStops, dayCount, setActiveDayStops,
    addToPlan, removeFromPlan, isInPlan, clearPlan, movePlanStop, addDay, removeDay, moveStopToDay,
    getRouteUrl, sharePlan, addEventToPlan, isEventInPlan,
    events, eventsLoading, eventsViewMode, setEventsViewMode, eventCategoryFilter, setEventCategoryFilter,
    selectedVibe, setSelectedVibe, quickFilters, setQuickFilters, viewMode, setViewMode,
    activeMapPin, setActiveMapPin, activeEventPin, setActiveEventPin,
    selectedPlace, setSelectedPlace, activePhotoIndex, setActivePhotoIndex,
    placeReviews, showReviewForm, setShowReviewForm,
    reviewRating, setReviewRating, reviewText, setReviewText, reviewTags, setReviewTags,
    reviewSubmitting, handleSubmitReview,
    user, authLoading,
    searchQuery, setSearchQuery, searchResults, isSearching, showSearch, setShowSearch, handleSearch,
    cityLabel, citySlug, useMiles, weather,
    showToast, getSafetyIndicators, getDistanceReference, getTransportInfo,
    isReservable, isBookable, getBookingUrl, getBookingLabel, getGreeting, getTimeSuggestion, currentTime,
    communityFilters, setCommunityFilters, placeTagsCache, travelGroup, setTravelGroup,
    savedPlaces, toggleSaved, isSaved,
    crewMode, crewCode, crewSyncing, joinCrewInput, setJoinCrewInput, showJoinCrew, setShowJoinCrew,
    startCrewMode, stopCrewMode, joinCrew, shareCrewPlan,
    surprisePlace, setSurprisePlace, showSafety, setShowSafety, showProfile, setShowProfile,
    showAdmin, setShowAdmin, showCulture, setShowCulture,
    showNotificationPrompt, notificationPermission, requestNotificationPermission, dismissNotificationPrompt,
    adminSignups, adminCities, adminLoading, adminTab, setAdminTab, openAdmin, handleToggleCity,
    loading, isOffline, sharePlace, handleSurpriseMe, formatEventDate, formatEventTime, getMapCenter, MAPS_API_KEY,
    showOnboarding, onboardingStep, setOnboardingStep, setShowOnboarding,
    handleSignIn, handleSignUp, handleSignOut, authScreen, setAuthScreen,
    authEmail, setAuthEmail, authPassword, setAuthPassword, authName, setAuthName, authError, authSubmitting,
    fetchPlaces, fetchEventsData,
  };

  // ==========================================================================
  // LOADING SCREEN
  // ==========================================================================

  if (loading && cities.length === 0) {
    return (
      <div style={{
        fontFamily: "'DM Sans', system-ui, sans-serif",
        background: theme.bg.body, minHeight: '100vh', color: theme.text.primary,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '36px', fontWeight: 700, marginBottom: '4px',
            background: theme.accent.amberTextGradient,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            NxStops
          </div>
          <div style={{ fontSize: '11px', color: theme.text.tertiary, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '24px' }}>
            by Nav&eacute;
          </div>
          <div style={{
            width: '40px', height: '3px', borderRadius: '2px', margin: '0 auto',
            background: `linear-gradient(90deg, ${theme.amberTint.border30} 25%, ${theme.accent.amber} 50%, ${theme.amberTint.border30} 75%)`,
            backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
          }} />
        </div>
      </div>
    );
  }

  // ==========================================================================
  // ONBOARDING
  // ==========================================================================

  if (showOnboarding) {
    return (
      <div style={{
        fontFamily: "'DM Sans', system-ui, sans-serif",
        background: theme.bg.body, minHeight: '100vh', color: theme.text.primary,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        maxWidth: '430px', margin: '0 auto', padding: '40px 24px',
      }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{
            fontSize: '36px', fontWeight: 700, marginBottom: '4px',
            background: theme.accent.amberTextGradient,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            NxStops
          </div>
          <div style={{ fontSize: '11px', color: theme.text.tertiary, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '32px' }}>
            by Nav&eacute;
          </div>
          <p style={{ fontSize: '17px', color: theme.text.secondary, lineHeight: 1.6, maxWidth: '300px', marginBottom: '8px' }}>
            Discover places, plan trips, and explore cities — wherever you are.
          </p>
        </div>
        <div style={{ width: '100%' }}>
          <button
            onClick={() => { localStorage.setItem('nxstops_onboarded', 'true'); setShowOnboarding(false); }}
            style={{
              width: '100%', padding: '16px', borderRadius: '14px', border: 'none',
              background: theme.accent.amberGradient,
              color: theme.text.onAccent, fontSize: '16px', fontWeight: 600, cursor: 'pointer',
              boxShadow: `0 4px 20px ${theme.amberTint.shadow}`,
            }}>
            Get Started
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // MAIN RENDER
  // ==========================================================================

  return (
    <AppContext.Provider value={contextValue}>
      <div style={{
        fontFamily: "'DM Sans', system-ui, sans-serif",
        background: theme.bg.bodyGradient,
        minHeight: '100vh', color: theme.text.primary,
        maxWidth: '430px', margin: '0 auto', position: 'relative', overflow: 'hidden',
      }}>
        {/* Animations */}
        <style>{`
          @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
          @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
          @keyframes toastIn { from { opacity: 0; transform: translateY(16px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
          @keyframes offlineBannerIn { from { opacity: 0; transform: translateY(-100%); } to { opacity: 1; transform: translateY(0); } }
          .modal-sheet { animation: slideUp 0.3s ease-out; }
          .modal-backdrop { animation: fadeIn 0.2s ease-out; }
          .photo-gallery-scroll::-webkit-scrollbar { display: none; }
          *:focus-visible { outline: 2px solid #F59E0B; outline-offset: 2px; }
          button:focus-visible { outline: 2px solid #F59E0B; outline-offset: 2px; }
          a:focus-visible { outline: 2px solid #F59E0B; outline-offset: 2px; }
          input:focus-visible { outline: 2px solid #F59E0B; outline-offset: 2px; }
        `}</style>

        {/* Offline banner */}
        {isOffline && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0,
            background: '#78716C', color: '#FFFFFF',
            fontSize: '12px', textAlign: 'center', padding: '6px',
            zIndex: 9999, animation: 'offlineBannerIn 0.3s ease-out',
          }}>
            You're offline — showing cached data
          </div>
        )}

        {/* Header */}
        {!isInfoPage && (
        <header style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{
              fontSize: '22px', fontWeight: 700,
              background: theme.accent.amberTextGradient,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              NxStops
            </div>
            <div style={{ fontSize: '10px', color: theme.text.tertiary, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              by Nav&eacute;
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14px', color: theme.text.primary }}>
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div style={{ fontSize: '10px', color: theme.text.tertiary }}>
                {currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
            </div>
            <button onClick={() => setShowSafety(true)}
              aria-label="Travel toolkit"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px', borderRadius: '10px', minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldIcon />
            </button>
            {user?.email === ADMIN_EMAIL && (
              <button onClick={openAdmin}
                aria-label="Admin settings"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px', borderRadius: '10px', minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GearIcon />
              </button>
            )}
            <button onClick={() => setShowProfile(true)}
              aria-label="Open profile"
              style={{
                width: '44px', height: '44px', borderRadius: '50%', border: `2px solid ${theme.amberTint.border30}`,
                background: user?.user_metadata?.avatar_url
                  ? `url(${user.user_metadata.avatar_url}) center/cover no-repeat`
                  : theme.bg.subtleButton,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px', padding: 0, color: theme.text.secondary, flexShrink: 0,
              }}>
              {!user?.user_metadata?.avatar_url && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A8A29E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )}
            </button>
          </div>
        </header>
        )}

        {/* Content — routed screens */}
        <main style={{ padding: isInfoPage ? '0' : '0 20px 100px' }}>
          <Suspense fallback={<><SkeletonCard /><SkeletonCard /><SkeletonCard /></>}>
            <Routes>
              <Route path="/" element={<HomeScreen />} />
              <Route path="/discover" element={<DiscoverScreen />} />
              <Route path="/events" element={<EventsScreen />} />
              <Route path="/plan" element={<PlanScreen />} />
              <Route path="/about" element={<AboutScreen />} />
              <Route path="/privacy" element={<PrivacyScreen />} />
              <Route path="/terms" element={<TermsScreen />} />
              <Route path="/contact" element={<ContactScreen />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          {!isInfoPage && <Footer />}
        </main>

        {/* Bottom Navigation */}
        {!isInfoPage && <nav aria-label="Main navigation" style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: '430px',
          background: theme.bg.nav, backdropFilter: 'blur(24px)',
          borderTop: `1px solid ${theme.border.nav}`,
          display: 'flex', justifyContent: 'space-around',
          padding: '8px 0 28px',
        }}>
          {([
            { id: 'home' as Screen, icon: HomeIcon, label: 'Home' },
            { id: 'discover' as Screen, icon: DiscoverIcon, label: 'Discover' },
            { id: 'events' as Screen, icon: EventsIcon, label: 'Events' },
            { id: 'plan' as Screen, icon: PlanIcon, label: 'Plan' },
          ]).map(tab => {
            const isActive = screen === tab.id;
            const canNavigate = tab.id === 'home' || useGps || selectedCity;
            return (
              <button
                key={tab.id}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                  background: 'none', border: 'none',
                  color: isActive ? theme.text.primary : canNavigate ? theme.text.tertiary : theme.text.disabled,
                  fontSize: '10px', fontWeight: 500, cursor: canNavigate ? 'pointer' : 'default',
                  padding: '8px 20px', borderRadius: '12px', position: 'relative',
                  opacity: canNavigate ? 1 : 0.4, minHeight: '48px',
                }}
                onClick={() => canNavigate && setScreen(tab.id)}
              >
                {isActive && (
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '44px', height: '44px',
                    background: 'radial-gradient(circle, rgba(245,158,11,0.2) 0%, transparent 70%)',
                    borderRadius: '50%', pointerEvents: 'none', zIndex: -1,
                  }} />
                )}
                <tab.icon active={isActive} />
                <span style={{
                  background: isActive ? 'linear-gradient(135deg, #F59E0B, #FBBF24)' : 'none',
                  WebkitBackgroundClip: isActive ? 'text' : 'unset',
                  WebkitTextFillColor: isActive ? 'transparent' : undefined,
                }}>
                  {tab.label}
                </span>
                {tab.id === 'plan' && totalStops > 0 && (
                  <span style={{
                    position: 'absolute', top: '2px', right: '8px',
                    background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                    color: '#0C0A09', fontSize: '9px', fontWeight: 700,
                    padding: '2px 5px', borderRadius: '8px',
                  }}>
                    {totalStops}
                  </span>
                )}
              </button>
            );
          })}
        </nav>}

        {/* Surprise Me Floating Button */}
        {!isInfoPage && screen === 'discover' && places.length > 0 && !surprisePlace && !selectedPlace && (
          <button
            onClick={handleSurpriseMe}
            aria-label="Surprise me with a random place"
            style={{
              position: 'fixed', bottom: '90px', right: 'calc(50% - 195px)',
              width: '52px', height: '52px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #F59E0B, #D97706)',
              border: 'none', cursor: 'pointer', color: '#0C0A09',
              fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(245,158,11,0.4)', zIndex: 50,
            }}
            title="Surprise Me"
          >
            {'\u{1F3B2}'}
          </button>
        )}

        {/* Surprise Me Modal */}
        {surprisePlace && (
          <div className="modal-backdrop"
            role="dialog"
            aria-label="Surprise place recommendation"
            style={{ position: 'fixed', inset: 0, background: theme.bg.modalOverlay, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
            onClick={() => setSurprisePlace(null)}>
            <div className="modal-sheet"
              style={{ background: theme.bg.surface, borderRadius: '20px', maxWidth: '380px', width: '100%', overflow: 'hidden', border: `1px solid ${theme.amberTint.border20}` }}
              onClick={e => e.stopPropagation()}>
              {surprisePlace.photoUrl && (
                <div style={{
                  height: '180px', width: '100%',
                  background: `linear-gradient(to bottom, transparent 50%, ${theme.bg.surface}), url(${surprisePlace.photoUrl})`,
                  backgroundSize: 'cover', backgroundPosition: 'center',
                }} />
              )}
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '14px', color: theme.accent.amber, marginBottom: '4px', fontWeight: 500 }}>Surprise!</div>
                <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '6px' }}>{surprisePlace.name}</h2>
                <p style={{ color: theme.text.secondary, fontSize: '13px', marginBottom: '4px' }}>
                  {surprisePlace.categoryDisplay}{surprisePlace.distance != null && ` \u{00B7} ${formatDistance(surprisePlace.distance, useMiles)}`}
                </p>
                {surprisePlace.rating > 0 && (
                  <p style={{ color: '#F59E0B', fontSize: '14px', marginBottom: '16px' }}>
                    \u{2605} {surprisePlace.rating.toFixed(1)} ({surprisePlace.reviewCount} reviews)
                  </p>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => { addToPlan(surprisePlace); setSurprisePlace(null); }}
                    style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#0C0A09', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                    + Add to Plan
                  </button>
                  {surprisePlace.googleMapsUrl && (
                    <a href={surprisePlace.googleMapsUrl} target="_blank" rel="noopener noreferrer"
                      style={{ flex: 1, padding: '12px', borderRadius: '12px', background: theme.bg.subtleButton, color: theme.text.primary, fontSize: '14px', fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
                      Directions
                    </a>
                  )}
                </div>
                <button
                  onClick={() => { setSurprisePlace(null); handleSurpriseMe(); }}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', marginTop: '8px', background: 'none', border: `1px solid ${theme.border.strong}`, color: theme.text.secondary, fontSize: '13px', cursor: 'pointer' }}>
                  {'\u{1F3B2}'} Try another
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Place Detail Modal */}
        {selectedPlace && (
          <Suspense fallback={null}>
            <PlaceDetailModal place={selectedPlace} />
          </Suspense>
        )}

        {/* Safety Toolkit Modal */}
        {showSafety && (
          <div className="modal-backdrop"
            role="dialog"
            aria-label="Travel toolkit"
            style={{ position: 'fixed', inset: 0, background: theme.bg.modalOverlay, zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
            onClick={() => setShowSafety(false)}>
            <div className="modal-sheet"
              style={{ background: theme.bg.surface, borderRadius: '24px 24px 0 0', maxWidth: '430px', width: '100%', maxHeight: '85vh', overflow: 'auto', border: `1px solid ${theme.border.subtle}`, borderBottom: 'none' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ padding: '24px 20px 40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '2px' }}>Travel Toolkit</h2>
                    <p style={{ color: theme.text.tertiary, fontSize: '12px' }}>Stay connected & informed</p>
                  </div>
                  <button onClick={() => setShowSafety(false)}
                    aria-label="Close travel toolkit"
                    style={{ background: 'none', border: 'none', color: theme.text.tertiary, cursor: 'pointer', padding: '10px', minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CloseIcon />
                  </button>
                </div>

                {/* Share My Location */}
                <button
                  onClick={async () => {
                    if (loc.lat && loc.lng) {
                      const url = `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
                      const text = `Here's my current location${loc.city ? ` in ${loc.city}` : ''}`;
                      if (navigator.share) {
                        await navigator.share({ title: 'My Location', text, url });
                      } else {
                        await navigator.clipboard.writeText(`${text}: ${url}`);
                        showToast('Location copied to clipboard');
                      }
                    } else {
                      showToast('Location not available \u{2014} enable GPS');
                    }
                  }}
                  style={{
                    ...cardStyle, width: '100%', cursor: 'pointer', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: '14px',
                    background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.03))',
                    border: '1px solid rgba(34,197,94,0.15)',
                  }}
                >
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                    background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '20px',
                  }}>
                    {'\u{1F4CD}'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: theme.text.primary }}>Share My Location</div>
                    <div style={{ fontSize: '12px', color: theme.text.secondary }}>Send your GPS pin to someone you trust</div>
                  </div>
                  <div style={{ color: '#34D399', fontSize: '18px' }}>{'\u{2192}'}</div>
                </button>

                {/* Emergency Numbers */}
                {(() => {
                  const country = selectedCity?.country || (loc.city ? Object.keys(EMERGENCY_BY_COUNTRY).find(_c => {
                    const cityNames = Object.keys(CITY_COORDS);
                    return cityNames.some(cn => cn.toLowerCase().includes(loc.city?.toLowerCase() || ''));
                  }) : undefined);
                  const nums = country ? EMERGENCY_BY_COUNTRY[country] : null;
                  const displayCountry = selectedCity?.country || country || null;

                  return (
                    <div style={{ ...cardStyle, marginTop: '4px' }}>
                      <div style={{ fontSize: '11px', color: theme.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
                        Emergency Numbers{displayCountry ? ` \u{2014} ${displayCountry}` : ''}
                      </div>
                      {nums ? (
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <a href={`tel:${nums.emergency}`}
                            style={{
                              flex: 1, padding: '14px', borderRadius: '12px', textAlign: 'center',
                              background: theme.redTint.bg, border: `1px solid ${theme.redTint.border}`,
                              color: theme.status.red, textDecoration: 'none', fontWeight: 600, fontSize: '16px',
                            }}>
                            <div style={{ fontSize: '11px', color: theme.text.secondary, fontWeight: 400, marginBottom: '4px' }}>Emergency</div>
                            {nums.emergency}
                          </a>
                          <a href={`tel:${nums.police}`}
                            style={{
                              flex: 1, padding: '14px', borderRadius: '12px', textAlign: 'center',
                              background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.15)',
                              color: '#93C5FD', textDecoration: 'none', fontWeight: 600, fontSize: '16px',
                            }}>
                            <div style={{ fontSize: '11px', color: theme.text.secondary, fontWeight: 400, marginBottom: '4px' }}>Police</div>
                            {nums.police}
                          </a>
                        </div>
                      ) : (
                        <p style={{ color: theme.text.secondary, fontSize: '13px' }}>Select a city to see local emergency numbers</p>
                      )}
                    </div>
                  );
                })()}

                {/* Travel Tips */}
                <div style={{ ...cardStyle, marginTop: '4px' }}>
                  <div style={{ fontSize: '11px', color: theme.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
                    Quick Tips
                  </div>
                  {[
                    { icon: '\u{1F50B}', tip: 'Keep your phone charged \u{2014} you\'ll need it for maps & rides' },
                    { icon: '\u{1F4F1}', tip: 'Download offline maps before heading out' },
                    { icon: '\u{1F3E8}', tip: 'Save your accommodation address \u{2014} show it to taxi drivers' },
                    { icon: '\u{1F4B3}', tip: 'Keep a small amount of local cash for emergencies' },
                    { icon: '\u{1F319}', tip: 'Stick to well-lit, busy streets at night' },
                    { icon: '\u{1F465}', tip: 'Look for places with lots of reviews \u{2014} popular spots are usually welcoming' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', padding: '8px 0', borderBottom: i < 5 ? `1px solid ${theme.bg.subtleMedium}` : 'none' }}>
                      <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.icon}</span>
                      <span style={{ fontSize: '13px', color: theme.text.body, lineHeight: 1.4 }}>{item.tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profile Screen */}
        {showProfile && (
          <Suspense fallback={null}>
            <ProfileScreen />
          </Suspense>
        )}

        {/* Admin Panel */}
        {showAdmin && (
          <Suspense fallback={null}>
            <AdminPanel />
          </Suspense>
        )}

        {/* Toast */}
        {toast && (
          <div style={{
            position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)',
            background: theme.bg.toast, backdropFilter: 'blur(20px)',
            border: `1px solid ${theme.amberTint.border20}`, borderRadius: '12px',
            padding: '12px 20px', fontSize: '14px', fontWeight: 500, color: theme.text.primary,
            zIndex: 300, animation: 'toastIn 0.3s ease-out',
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
          }}>
            {toast}
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
}
