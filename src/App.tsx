import { useState, useEffect, useCallback } from 'react';
import { fetchCities, saveEmailSignup } from './supabase';
import { searchNearby, formatDistance } from './services/places';
import type { Place } from './services/places';
import { useLocation } from './hooks/useLocation';

// ============================================================================
// TYPES
// ============================================================================

interface City {
  id: string;
  slug: string;
  name: string;
  country: string;
  region: string;
  banner_url: string;
  timezone: string;
  lat?: number;
  lng?: number;
}

interface Stop {
  id: string;
  place: Place;
  addedAt: Date;
}

type Screen = 'home' | 'vibes' | 'planner';
type Vibe = 'food' | 'cultural' | 'nightlife' | 'hidden';
type QuickFilter = 'open' | 'walking' | 'topRated' | 'budget';

// ============================================================================
// CITY COORDINATES (for cities selected from dropdown)
// ============================================================================

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'new york': { lat: 40.7128, lng: -73.9960 },
  'los angeles': { lat: 34.0522, lng: -118.2437 },
  'miami': { lat: 25.7617, lng: -80.1918 },
  'atlanta': { lat: 33.749, lng: -84.388 },
  'chicago': { lat: 41.8781, lng: -87.6298 },
  'washington': { lat: 38.9072, lng: -77.0369 },
  'new orleans': { lat: 29.9511, lng: -90.0715 },
  'las vegas': { lat: 36.1699, lng: -115.1398 },
  'san francisco': { lat: 37.7749, lng: -122.4194 },
  'seattle': { lat: 47.6062, lng: -122.3321 },
  'austin': { lat: 30.2672, lng: -97.7431 },
  'nashville': { lat: 36.1627, lng: -86.7816 },
  'toronto': { lat: 43.6532, lng: -79.3832 },
  'vancouver': { lat: 49.2827, lng: -123.1207 },
  'montreal': { lat: 45.5017, lng: -73.5673 },
  'cancun': { lat: 21.1619, lng: -86.8515 },
  'san juan': { lat: 18.4655, lng: -66.1057 },
  'london': { lat: 51.5074, lng: -0.1278 },
  'paris': { lat: 48.8566, lng: 2.3522 },
  'barcelona': { lat: 41.3874, lng: 2.1686 },
  'rome': { lat: 41.9028, lng: 12.4964 },
  'lisbon': { lat: 38.7223, lng: -9.1393 },
  'amsterdam': { lat: 52.3676, lng: 4.9041 },
  'berlin': { lat: 52.5200, lng: 13.4050 },
  'lagos': { lat: 6.5244, lng: 3.3792 },
  'accra': { lat: 5.6037, lng: -0.1870 },
  'cape town': { lat: -33.9249, lng: 18.4241 },
  'nairobi': { lat: -1.2921, lng: 36.8219 },
  'marrakech': { lat: 31.6295, lng: -7.9811 },
  'dubai': { lat: 25.2048, lng: 55.2708 },
  'tokyo': { lat: 35.6762, lng: 139.6503 },
  'bangkok': { lat: 13.7563, lng: 100.5018 },
  'singapore': { lat: 1.3521, lng: 103.8198 },
  'seoul': { lat: 37.5665, lng: 126.9780 },
  'bali': { lat: -8.3405, lng: 115.0920 },
  'sydney': { lat: -33.8688, lng: 151.2093 },
  'melbourne': { lat: -37.8136, lng: 144.9631 },
  'rio de janeiro': { lat: -22.9068, lng: -43.1729 },
  'buenos aires': { lat: -34.6037, lng: -58.3816 },
};

// ============================================================================
// SVG ICONS
// ============================================================================

const HomeIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="hg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#FBBF24" />
      </linearGradient>
    </defs>
    <path d="M3 10.5L12 3L21 10.5V20C21 20.5523 20.5523 21 20 21H15V15C15 14.4477 14.5523 14 14 14H10C9.44772 14 9 14.4477 9 15V21H4C3.44772 21 3 20.5523 3 20V10.5Z"
      stroke={active ? "url(#hg)" : "#78716C"} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
      fill={active ? "rgba(245,158,11,0.15)" : "none"} />
  </svg>
);

const VibesIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="vg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#FBBF24" />
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="9" stroke={active ? "url(#vg)" : "#78716C"} strokeWidth="1.75" fill="none" />
    <circle cx="12" cy="12" r="5" stroke={active ? "url(#vg)" : "#78716C"} strokeWidth="1.75" fill={active ? "rgba(245,158,11,0.1)" : "none"} />
    <circle cx="12" cy="12" r="2" fill={active ? "url(#vg)" : "#78716C"} />
  </svg>
);

const PlanIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#FBBF24" />
      </linearGradient>
    </defs>
    <rect x="5" y="3" width="14" height="16" rx="2" stroke={active ? "url(#pg)" : "#78716C"} strokeWidth="1.5"
      fill={active ? "rgba(245,158,11,0.05)" : "none"} opacity="0.5" />
    <rect x="6" y="5" width="14" height="16" rx="2" stroke={active ? "url(#pg)" : "#78716C"} strokeWidth="1.75"
      fill={active ? "rgba(245,158,11,0.15)" : "rgba(28,25,23,0.5)"} />
    <line x1="9" y1="10" x2="17" y2="10" stroke={active ? "url(#pg)" : "#78716C"} strokeWidth="1.5" strokeLinecap="round" />
    <line x1="9" y1="14" x2="15" y2="14" stroke={active ? "url(#pg)" : "#78716C"} strokeWidth="1.5" strokeLinecap="round" />
    <line x1="9" y1="18" x2="13" y2="18" stroke={active ? "url(#pg)" : "#78716C"} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Small action icons for place cards
const DirectionsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="3 11 22 2 13 21 11 13 3 11" />
  </svg>
);

const PhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const ShareIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

const LocationIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
  </svg>
);

// ============================================================================
// VIBE DEFINITIONS
// ============================================================================

const VIBES: { id: Vibe; emoji: string; label: string; description: string }[] = [
  { id: 'food', emoji: '🍜', label: 'Foodie', description: 'Local eats & cafes' },
  { id: 'cultural', emoji: '🏛️', label: 'Cultural', description: 'Art, history & museums' },
  { id: 'nightlife', emoji: '🌙', label: 'Nightlife', description: 'Bars & late nights' },
  { id: 'hidden', emoji: '💎', label: 'Hidden Gems', description: 'Off the beaten path' },
];

const QUICK_FILTERS: { id: QuickFilter; label: string }[] = [
  { id: 'open', label: 'Open Now' },
  { id: 'walking', label: 'Walking Distance' },
  { id: 'topRated', label: 'Top Rated' },
  { id: 'budget', label: 'Budget' },
];

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

export default function App() {
  // Core state
  const [screen, setScreen] = useState<Screen>('home');
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedVibes, setSelectedVibes] = useState<Vibe[]>([]);
  const [quickFilters, setQuickFilters] = useState<QuickFilter[]>(['open']);
  const [dayPlan, setDayPlan] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [useGps, setUseGps] = useState(false);
  const [searchRadius, setSearchRadius] = useState(1500);
  const [showEmailSignup, setShowEmailSignup] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailSaved, setEmailSaved] = useState(() => localStorage.getItem('nxstops_email_saved') === 'true');
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [surprisePlace, setSurprisePlace] = useState<Place | null>(null);

  const location = useLocation();

  // Load cities from Supabase on mount
  useEffect(() => {
    async function loadCities() {
      const data = await fetchCities();
      setCities(data);
      setLoading(false);
    }
    loadCities();
  }, []);

  // Auto-switch to GPS mode when location is available
  useEffect(() => {
    if (location.hasLocation && !selectedCity) {
      setUseGps(true);
    }
  }, [location.hasLocation, selectedCity]);

  // Load saved day plan from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nxstops_dayplan');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.expires > Date.now()) {
          setDayPlan(parsed.stops.map((s: Stop) => ({ ...s, addedAt: new Date(s.addedAt) })));
        } else {
          localStorage.removeItem('nxstops_dayplan');
        }
      }
    } catch { /* ignore corrupt data */ }
  }, []);

  // Save day plan to localStorage
  useEffect(() => {
    if (dayPlan.length > 0) {
      localStorage.setItem('nxstops_dayplan', JSON.stringify({
        stops: dayPlan,
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      }));
    } else {
      localStorage.removeItem('nxstops_dayplan');
    }
  }, [dayPlan]);

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch places from Google Places API
  const fetchPlaces = useCallback(async () => {
    let lat: number | undefined;
    let lng: number | undefined;

    if (useGps && location.lat && location.lng) {
      lat = location.lat;
      lng = location.lng;
    } else if (selectedCity) {
      const coords = CITY_COORDS[selectedCity.name.toLowerCase()];
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
      }
    }

    if (!lat || !lng) return;

    setPlacesLoading(true);
    const results = await searchNearby(lat, lng, selectedVibes, searchRadius);
    setPlaces(results);
    setPlacesLoading(false);
  }, [useGps, location.lat, location.lng, selectedCity, selectedVibes, searchRadius]);

  // Fetch when vibes change or location changes or city changes
  useEffect(() => {
    if (screen === 'planner' || (screen === 'vibes' && (useGps || selectedCity))) {
      fetchPlaces();
    }
  }, [screen, fetchPlaces]);

  // Apply quick filters to places
  const filteredPlaces = places.filter(place => {
    for (const filter of quickFilters) {
      switch (filter) {
        case 'open':
          if (!place.openNow) return false;
          break;
        case 'walking':
          if (place.distance !== null && place.distance > 1) return false;
          break;
        case 'topRated':
          if (place.rating < 4.5) return false;
          break;
        case 'budget':
          if (place.priceLevel > 2 && place.priceLevel !== -1) return false;
          break;
      }
    }
    return true;
  });

  // Day plan helpers
  const addToPlan = (place: Place) => {
    if (dayPlan.find(s => s.place.placeId === place.placeId)) return;
    setDayPlan([...dayPlan, { id: crypto.randomUUID(), place, addedAt: new Date() }]);
  };

  const removeFromPlan = (stopId: string) => {
    setDayPlan(dayPlan.filter(s => s.id !== stopId));
  };

  const isInPlan = (placeId: string) => dayPlan.some(s => s.place.placeId === placeId);

  // Time greeting
  const getGreeting = (): string => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 21) return 'Good evening';
    return 'Good night';
  };

  // Time-aware suggestion text
  const getTimeSuggestion = (): string => {
    const hour = currentTime.getHours();
    if (hour >= 6 && hour < 11) return 'Perfect time for coffee & brunch';
    if (hour >= 11 && hour < 14) return 'Lunch spots & afternoon vibes';
    if (hour >= 14 && hour < 17) return 'Explore something new nearby';
    if (hour >= 17 && hour < 21) return 'Dinner & evening plans await';
    return 'Late night spots still open';
  };

  // Share place
  const sharePlace = async (place: Place) => {
    if (navigator.share) {
      await navigator.share({
        title: place.name,
        text: `Check out ${place.name} on NxStops`,
        url: place.googleMapsUrl,
      });
    }
  };

  // Email signup handler
  const handleEmailSignup = async () => {
    if (!emailInput || !emailInput.includes('@')) return;
    setEmailSubmitting(true);
    await saveEmailSignup(emailInput, useGps ? (location.city || undefined) : selectedCity?.name);
    localStorage.setItem('nxstops_email_saved', 'true');
    setEmailSaved(true);
    setShowEmailSignup(false);
    setEmailSubmitting(false);
  };

  // Surprise Me — pick a random open place
  const handleSurpriseMe = () => {
    const openPlaces = places.filter(p => p.openNow);
    if (openPlaces.length === 0) return;
    const random = openPlaces[Math.floor(Math.random() * openPlaces.length)];
    setSurprisePlace(random);
  };

  // Price dots
  const PriceDots = ({ level }: { level: number }) => {
    if (level < 0) return null;
    return (
      <span style={{ color: '#78716C', fontSize: '12px', letterSpacing: '1px' }}>
        {Array.from({ length: 4 }, (_, i) => (
          <span key={i} style={{ color: i < level ? '#F59E0B' : '#3a3632' }}>$</span>
        ))}
      </span>
    );
  };

  // Star rating
  const StarRating = ({ rating, count }: { rating: number; count: number }) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
      <span style={{ color: '#F59E0B' }}>★</span>
      <span style={{ color: '#FFFBEB', fontWeight: 600 }}>{rating.toFixed(1)}</span>
      <span style={{ color: '#78716C', fontSize: '12px' }}>({count > 999 ? `${(count / 1000).toFixed(1)}k` : count})</span>
    </span>
  );

  // Skeleton loader
  const SkeletonCard = () => (
    <div style={{
      ...cardStyle,
      height: '280px',
      overflow: 'hidden',
    }}>
      <div style={{ height: '160px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', marginBottom: '12px' }}>
        <div style={{
          width: '100%', height: '100%', borderRadius: '12px',
          background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
        }} />
      </div>
      <div style={{ height: '16px', width: '60%', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '8px' }} />
      <div style={{ height: '12px', width: '40%', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }} />
    </div>
  );

  // ============================================================================
  // STYLES
  // ============================================================================

  const cardStyle: React.CSSProperties = {
    background: 'rgba(28, 25, 23, 0.8)',
    backdropFilter: 'blur(20px)',
    borderRadius: '16px',
    padding: '16px',
    marginBottom: '12px',
    border: '1px solid rgba(255,255,255,0.06)',
  };

  // ============================================================================
  // HOME SCREEN
  // ============================================================================

  const HomeScreen = () => (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '4px' }}>
          {getGreeting()} ✨
        </h1>
        <p style={{ color: '#A8A29E', fontSize: '14px' }}>
          {getTimeSuggestion()}
        </p>
      </div>

      {/* GPS Location Card */}
      {location.hasLocation && (
        <button
          onClick={() => {
            setUseGps(true);
            setSelectedCity(null);
            setScreen('vibes');
          }}
          style={{
            ...cardStyle,
            width: '100%',
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            border: useGps ? '2px solid #F59E0B' : '1px solid rgba(255,255,255,0.06)',
            background: useGps ? 'rgba(245, 158, 11, 0.08)' : 'rgba(28, 25, 23, 0.8)',
          }}
        >
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <LocationIcon />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '15px', color: '#FFFBEB' }}>
              {location.city || 'Near You'}
            </div>
            <div style={{ fontSize: '12px', color: '#A8A29E' }}>
              Use your current location
            </div>
          </div>
          <div style={{ marginLeft: 'auto', color: '#F59E0B', fontSize: '20px' }}>→</div>
        </button>
      )}

      {/* Divider */}
      {location.hasLocation && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
          <span style={{ fontSize: '12px', color: '#78716C' }}>or pick a city</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
        </div>
      )}

      {/* City Selector */}
      <div style={cardStyle}>
        <label style={{ fontSize: '11px', color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '10px' }}>
          Select Your City
        </label>
        <select
          style={{
            width: '100%', padding: '14px', borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)', background: '#0C0A09',
            color: '#FFFBEB', fontSize: '15px', cursor: 'pointer',
          }}
          value={selectedCity?.id || ''}
          onChange={(e) => {
            const city = cities.find(c => c.id === e.target.value);
            setSelectedCity(city || null);
            setUseGps(false);
          }}
        >
          <option value="">Choose a city...</option>
          {cities.map(city => (
            <option key={city.id} value={city.id}>
              {city.name}, {city.country}
            </option>
          ))}
        </select>
      </div>

      {/* City Banner */}
      {selectedCity && (
        <div style={{
          ...cardStyle, padding: 0, overflow: 'hidden', position: 'relative', marginTop: '4px',
        }}>
          <div style={{
            height: '140px',
            background: selectedCity.banner_url
              ? `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.7)), url(${selectedCity.banner_url})`
              : 'linear-gradient(135deg, #1C1917 0%, #292524 100%)',
            backgroundSize: 'cover', backgroundPosition: 'center',
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '16px',
          }}>
            <h2 style={{ fontSize: '22px', fontWeight: 700 }}>{selectedCity.name}</h2>
            <p style={{ color: '#d4d0cc', fontSize: '13px' }}>{selectedCity.country}</p>
          </div>
        </div>
      )}

      {/* Email Signup Card */}
      {!emailSaved && (
        <button
          onClick={() => setShowEmailSignup(true)}
          style={{
            ...cardStyle,
            width: '100%', cursor: 'pointer', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px',
            background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(217,119,6,0.05))',
            border: '1px solid rgba(245, 158, 11, 0.15)',
          }}
        >
          <div style={{ fontSize: '24px' }}>📬</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '14px', color: '#FFFBEB' }}>Get your free city guide</div>
            <div style={{ fontSize: '12px', color: '#A8A29E' }}>Hidden gems sent to your inbox</div>
          </div>
          <div style={{ color: '#F59E0B', fontSize: '18px' }}>→</div>
        </button>
      )}

      {/* Start Button */}
      {(selectedCity || useGps) && (
        <button
          style={{
            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
            color: '#0C0A09', border: 'none', borderRadius: '14px',
            padding: '16px', fontSize: '16px', fontWeight: 600,
            cursor: 'pointer', width: '100%', marginTop: '12px',
            boxShadow: '0 4px 20px rgba(245, 158, 11, 0.3)',
          }}
          onClick={() => setScreen('vibes')}
        >
          Choose Your Vibes →
        </button>
      )}
    </div>
  );

  // ============================================================================
  // VIBES SCREEN
  // ============================================================================

  const VibesScreen = () => (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => setScreen('home')}
          style={{ background: 'none', border: 'none', color: '#A8A29E', fontSize: '14px', cursor: 'pointer', marginBottom: '12px', padding: 0 }}
        >
          ← Back
        </button>
        <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>
          What's your vibe?
        </h1>
        <p style={{ color: '#A8A29E', fontSize: '14px' }}>
          Pick what you're in the mood for
        </p>
      </div>

      {/* Vibe Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
        {VIBES.map(vibe => {
          const isSelected = selectedVibes.includes(vibe.id);
          return (
            <button
              key={vibe.id}
              onClick={() => {
                setSelectedVibes(isSelected
                  ? selectedVibes.filter(v => v !== vibe.id)
                  : [...selectedVibes, vibe.id]
                );
              }}
              style={{
                ...cardStyle,
                cursor: 'pointer', textAlign: 'left',
                border: isSelected ? '2px solid #F59E0B' : '1px solid rgba(255,255,255,0.06)',
                background: isSelected ? 'rgba(245, 158, 11, 0.08)' : 'rgba(28, 25, 23, 0.8)',
                padding: '16px',
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '6px' }}>{vibe.emoji}</div>
              <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '2px', color: isSelected ? '#FFFBEB' : '#d4d0cc' }}>{vibe.label}</div>
              <div style={{ fontSize: '11px', color: '#78716C' }}>{vibe.description}</div>
            </button>
          );
        })}
      </div>

      {/* Continue Button */}
      <button
        style={{
          background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
          color: '#0C0A09', border: 'none', borderRadius: '14px',
          padding: '16px', fontSize: '16px', fontWeight: 600,
          cursor: 'pointer', width: '100%',
          boxShadow: '0 4px 20px rgba(245, 158, 11, 0.3)',
        }}
        onClick={() => {
          setScreen('planner');
          fetchPlaces();
        }}
      >
        {selectedVibes.length === 0 ? 'Show Everything' : `Show ${selectedVibes.map(v => VIBES.find(vb => vb.id === v)?.label).join(' & ')} →`}
      </button>
    </div>
  );

  // ============================================================================
  // PLANNER SCREEN
  // ============================================================================

  const PlannerScreen = () => (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={() => setScreen('vibes')}
          style={{ background: 'none', border: 'none', color: '#A8A29E', fontSize: '14px', cursor: 'pointer', marginBottom: '10px', padding: 0 }}
        >
          ← Change Vibes
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '2px' }}>
              {useGps ? (location.city || 'Near You') : selectedCity?.name} 📍
            </h1>
            <p style={{ color: '#78716C', fontSize: '13px' }}>
              {selectedVibes.length > 0
                ? selectedVibes.map(v => VIBES.find(vb => vb.id === v)?.emoji).join(' ')
                : 'All vibes'}
            </p>
          </div>
          {dayPlan.length > 0 && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.15)', padding: '6px 12px',
              borderRadius: '20px', fontSize: '13px', color: '#F59E0B', fontWeight: 600,
            }}>
              {dayPlan.length} stop{dayPlan.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Quick Filters */}
      <div style={{
        display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px',
        marginBottom: '12px', scrollbarWidth: 'none',
      }}>
        {QUICK_FILTERS.map(filter => {
          const isActive = quickFilters.includes(filter.id);
          return (
            <button
              key={filter.id}
              onClick={() => {
                setQuickFilters(isActive
                  ? quickFilters.filter(f => f !== filter.id)
                  : [...quickFilters, filter.id]
                );
              }}
              style={{
                padding: '8px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
                border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                background: isActive ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.05)',
                color: isActive ? '#F59E0B' : '#A8A29E',
              }}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Day Plan Summary */}
      {dayPlan.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: '16px' }}>
          <h3 style={{ fontSize: '12px', color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
            Your Day Plan
          </h3>
          {dayPlan.map((stop, index) => (
            <div key={stop.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0',
              borderBottom: index < dayPlan.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '22px', height: '22px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                  color: '#0C0A09', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 700, flexShrink: 0,
                }}>
                  {index + 1}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>{stop.place.name}</div>
                  <div style={{ fontSize: '11px', color: '#78716C' }}>
                    {stop.place.categoryDisplay}
                    {stop.place.distance != null && ` · ${formatDistance(stop.place.distance)}`}
                  </div>
                </div>
              </div>
              <button
                onClick={() => removeFromPlan(stop.id)}
                style={{ background: 'none', border: 'none', color: '#78716C', cursor: 'pointer', padding: '4px 8px', fontSize: '16px' }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Discover Places */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ fontSize: '12px', color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Discover ({filteredPlaces.length})
        </h3>
      </div>

      {/* Loading State */}
      {placesLoading && (
        <>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </>
      )}

      {/* Empty State */}
      {!placesLoading && filteredPlaces.length === 0 && places.length > 0 && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '32px 20px' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
          <p style={{ color: '#A8A29E', fontSize: '14px', marginBottom: '12px' }}>
            Nothing matching nearby. Try removing some filters.
          </p>
          <button
            onClick={() => setQuickFilters([])}
            style={{
              background: 'none', border: '1px solid #F59E0B', color: '#F59E0B',
              borderRadius: '10px', padding: '10px 20px', fontSize: '13px', cursor: 'pointer',
            }}
          >
            Clear Filters
          </button>
        </div>
      )}

      {!placesLoading && filteredPlaces.length === 0 && places.length === 0 && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '32px 20px' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📍</div>
          <p style={{ color: '#A8A29E', fontSize: '14px', marginBottom: '12px' }}>
            {(useGps || selectedCity)
              ? 'Loading places... If nothing shows, try selecting a city.'
              : 'Select a city or enable location to discover places.'}
          </p>
        </div>
      )}

      {/* Place Cards */}
      {!placesLoading && filteredPlaces.map(place => {
        const inPlan = isInPlan(place.placeId);

        return (
          <div key={place.placeId} style={{
            ...cardStyle,
            padding: 0,
            overflow: 'hidden',
            opacity: place.openNow ? 1 : 0.6,
          }}>
            {/* Photo */}
            {place.photoUrl && (
              <div style={{
                height: '160px', width: '100%',
                background: `linear-gradient(to bottom, transparent 60%, rgba(12,10,9,0.9)), url(${place.photoUrl})`,
                backgroundSize: 'cover', backgroundPosition: 'center',
                position: 'relative',
              }}>
                {/* Open/Closed Badge */}
                <div style={{
                  position: 'absolute', top: '10px', left: '10px',
                  padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                  background: place.openNow ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: place.openNow ? '#34D399' : '#F87171',
                  backdropFilter: 'blur(8px)',
                }}>
                  {place.openNow ? 'Open' : 'Closed'}
                </div>
                {/* Distance Badge */}
                {place.distance != null && (
                  <div style={{
                    position: 'absolute', top: '10px', right: '10px',
                    padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 500,
                    background: 'rgba(0,0,0,0.5)', color: '#FFFBEB',
                    backdropFilter: 'blur(8px)',
                  }}>
                    {formatDistance(place.distance)}
                  </div>
                )}
              </div>
            )}

            {/* Content */}
            <div style={{ padding: '14px 16px' }}>
              {/* Name + Rating Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, flex: 1 }}>{place.name}</h3>
                {place.rating > 0 && <StarRating rating={place.rating} count={place.reviewCount} />}
              </div>

              {/* Category + Price */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                {place.categoryDisplay && (
                  <span style={{
                    padding: '3px 8px', background: 'rgba(245, 158, 11, 0.12)',
                    color: '#F59E0B', borderRadius: '6px', fontSize: '11px', fontWeight: 500,
                  }}>
                    {place.categoryDisplay}
                  </span>
                )}
                <PriceDots level={place.priceLevel} />
                {place.tags.slice(0, 2).map(tag => (
                  <span key={tag} style={{
                    padding: '3px 8px', background: 'rgba(255,255,255,0.04)',
                    color: '#78716C', borderRadius: '6px', fontSize: '11px',
                  }}>
                    {tag}
                  </span>
                ))}
              </div>

              {/* Address */}
              {place.address && (
                <p style={{ fontSize: '12px', color: '#78716C', marginBottom: '12px', lineHeight: 1.3 }}>
                  {place.address}
                </p>
              )}

              {/* No photo fallback: show distance + open status inline */}
              {!place.photoUrl && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', fontSize: '12px' }}>
                  {place.distance != null && (
                    <span style={{ color: '#A8A29E' }}>📍 {formatDistance(place.distance)}</span>
                  )}
                  <span style={{ color: place.openNow ? '#34D399' : '#F87171' }}>
                    {place.openNow ? '● Open' : '● Closed'}
                  </span>
                </div>
              )}

              {/* Action Buttons Row */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {/* Add to Plan - Primary */}
                <button
                  onClick={() => inPlan ? removeFromPlan(dayPlan.find(s => s.place.placeId === place.placeId)!.id) : addToPlan(place)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', border: 'none',
                    background: inPlan ? 'transparent' : 'linear-gradient(135deg, #F59E0B, #D97706)',
                    color: inPlan ? '#F59E0B' : '#0C0A09',
                    ...(inPlan ? { border: '1.5px solid #F59E0B' } : {}),
                  }}
                >
                  {inPlan ? '✓ Saved' : '+ Add'}
                </button>

                {/* Directions */}
                {place.googleMapsUrl && (
                  <a
                    href={place.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '10px 14px', borderRadius: '10px',
                      background: 'rgba(255,255,255,0.06)', color: '#A8A29E',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      textDecoration: 'none',
                    }}
                  >
                    <DirectionsIcon />
                  </a>
                )}

                {/* Call */}
                {place.phone && (
                  <a
                    href={`tel:${place.phone}`}
                    style={{
                      padding: '10px 14px', borderRadius: '10px',
                      background: 'rgba(255,255,255,0.06)', color: '#A8A29E',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      textDecoration: 'none',
                    }}
                  >
                    <PhoneIcon />
                  </a>
                )}

                {/* Share */}
                <button
                  onClick={() => sharePlace(place)}
                  style={{
                    padding: '10px 14px', borderRadius: '10px',
                    background: 'rgba(255,255,255,0.06)', color: '#A8A29E',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <ShareIcon />
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* Load More / Expand Radius */}
      {!placesLoading && filteredPlaces.length > 0 && (
        <button
          onClick={() => setSearchRadius(prev => prev + 1500)}
          style={{
            width: '100%', padding: '14px', borderRadius: '12px', marginTop: '4px',
            background: 'none', border: '1px solid rgba(255,255,255,0.08)',
            color: '#A8A29E', fontSize: '13px', cursor: 'pointer',
          }}
        >
          Search wider area →
        </button>
      )}
    </div>
  );

  // ============================================================================
  // LOADING SCREEN
  // ============================================================================

  if (loading && cities.length === 0) {
    return (
      <div style={{
        fontFamily: "'DM Sans', system-ui, sans-serif",
        background: '#0C0A09', minHeight: '100vh', color: '#FFFBEB',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>✨</div>
          <div style={{
            fontSize: '28px', fontWeight: 700,
            background: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginBottom: '8px',
          }}>
            NxStops
          </div>
          <div style={{ color: '#78716C', fontSize: '13px' }}>Loading...</div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div style={{
      fontFamily: "'DM Sans', system-ui, sans-serif",
      background: 'linear-gradient(180deg, #0C0A09 0%, #1C1917 100%)',
      minHeight: '100vh', color: '#FFFBEB',
      maxWidth: '430px', margin: '0 auto', position: 'relative', overflow: 'hidden',
    }}>
      {/* Shimmer animation for skeleton loaders */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* Header */}
      <header style={{
        padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{
            fontSize: '22px', fontWeight: 700,
            background: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            NxStops
          </div>
          <div style={{ fontSize: '10px', color: '#78716C', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Vibes You Navigate
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '14px', color: '#FFFBEB' }}>
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div style={{ fontSize: '10px', color: '#78716C' }}>
            {currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{ padding: '0 20px 100px' }}>
        {screen === 'home' && <HomeScreen />}
        {screen === 'vibes' && <VibesScreen />}
        {screen === 'planner' && <PlannerScreen />}
      </main>

      {/* Bottom Navigation */}
      <nav style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: '430px',
        background: 'rgba(12, 10, 9, 0.95)', backdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', justifyContent: 'space-around',
        padding: '8px 0 28px',
      }}>
        {[
          { id: 'home' as Screen, icon: HomeIcon, label: 'Home' },
          { id: 'vibes' as Screen, icon: VibesIcon, label: 'Vibes' },
          { id: 'planner' as Screen, icon: PlanIcon, label: 'Plan' },
        ].map(tab => {
          const isActive = screen === tab.id;
          const canNavigate = tab.id === 'home' || useGps || selectedCity;
          return (
            <button
              key={tab.id}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                background: 'none', border: 'none',
                color: isActive ? '#FFFBEB' : canNavigate ? '#78716C' : '#3a3632',
                fontSize: '10px', fontWeight: 500, cursor: canNavigate ? 'pointer' : 'default',
                padding: '8px 20px', borderRadius: '12px', position: 'relative',
                opacity: canNavigate ? 1 : 0.4,
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
              {tab.id === 'planner' && dayPlan.length > 0 && (
                <span style={{
                  position: 'absolute', top: '2px', right: '8px',
                  background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                  color: '#0C0A09', fontSize: '9px', fontWeight: 700,
                  padding: '2px 5px', borderRadius: '8px',
                }}>
                  {dayPlan.length}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Surprise Me Floating Button — shown on planner screen */}
      {screen === 'planner' && places.length > 0 && !surprisePlace && (
        <button
          onClick={handleSurpriseMe}
          style={{
            position: 'fixed', bottom: '90px', right: 'calc(50% - 195px)',
            width: '52px', height: '52px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #F59E0B, #D97706)',
            border: 'none', cursor: 'pointer', color: '#0C0A09',
            fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(245, 158, 11, 0.4)',
            zIndex: 50,
          }}
          title="Surprise Me"
        >
          🎲
        </button>
      )}

      {/* Surprise Me Result Modal */}
      {surprisePlace && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          }}
          onClick={() => setSurprisePlace(null)}
        >
          <div
            style={{
              background: '#1C1917', borderRadius: '20px', maxWidth: '380px', width: '100%',
              overflow: 'hidden', border: '1px solid rgba(245, 158, 11, 0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {surprisePlace.photoUrl && (
              <div style={{
                height: '180px', width: '100%',
                background: `linear-gradient(to bottom, transparent 50%, #1C1917), url(${surprisePlace.photoUrl})`,
                backgroundSize: 'cover', backgroundPosition: 'center',
              }} />
            )}
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#F59E0B', marginBottom: '4px', fontWeight: 500 }}>
                Surprise!
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '6px' }}>{surprisePlace.name}</h2>
              <p style={{ color: '#A8A29E', fontSize: '13px', marginBottom: '4px' }}>
                {surprisePlace.categoryDisplay}
                {surprisePlace.distance != null && ` · ${formatDistance(surprisePlace.distance)}`}
              </p>
              {surprisePlace.rating > 0 && (
                <p style={{ color: '#F59E0B', fontSize: '14px', marginBottom: '16px' }}>
                  ★ {surprisePlace.rating.toFixed(1)} ({surprisePlace.reviewCount} reviews)
                </p>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => { addToPlan(surprisePlace); setSurprisePlace(null); }}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
                    background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                    color: '#0C0A09', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  + Add to Plan
                </button>
                {surprisePlace.googleMapsUrl && (
                  <a
                    href={surprisePlace.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex: 1, padding: '12px', borderRadius: '12px',
                      background: 'rgba(255,255,255,0.08)', color: '#FFFBEB',
                      fontSize: '14px', fontWeight: 600, textDecoration: 'none',
                      textAlign: 'center',
                    }}
                  >
                    Directions
                  </a>
                )}
              </div>
              <button
                onClick={() => { setSurprisePlace(null); handleSurpriseMe(); }}
                style={{
                  width: '100%', padding: '12px', borderRadius: '12px', marginTop: '8px',
                  background: 'none', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#A8A29E', fontSize: '13px', cursor: 'pointer',
                }}
              >
                🎲 Try another
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Signup Modal */}
      {showEmailSignup && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={() => setShowEmailSignup(false)}
        >
          <div
            style={{
              background: '#1C1917', borderRadius: '20px 20px 0 0', maxWidth: '430px', width: '100%',
              padding: '28px 24px 40px', border: '1px solid rgba(255,255,255,0.06)',
              borderBottom: 'none',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>✨</div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>
                Get your city guide
              </h2>
              <p style={{ color: '#A8A29E', fontSize: '14px' }}>
                We'll send curated picks and hidden gems straight to your inbox
              </p>
            </div>
            <input
              type="email"
              placeholder="your@email.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEmailSignup()}
              style={{
                width: '100%', padding: '16px', borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)', background: '#0C0A09',
                color: '#FFFBEB', fontSize: '16px', marginBottom: '12px',
                outline: 'none',
              }}
            />
            <button
              onClick={handleEmailSignup}
              disabled={emailSubmitting || !emailInput.includes('@')}
              style={{
                width: '100%', padding: '16px', borderRadius: '14px', border: 'none',
                background: emailInput.includes('@') ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'rgba(255,255,255,0.1)',
                color: emailInput.includes('@') ? '#0C0A09' : '#78716C',
                fontSize: '16px', fontWeight: 600, cursor: emailInput.includes('@') ? 'pointer' : 'default',
              }}
            >
              {emailSubmitting ? 'Saving...' : 'Send me the guide'}
            </button>
            <button
              onClick={() => setShowEmailSignup(false)}
              style={{
                width: '100%', padding: '12px', marginTop: '8px',
                background: 'none', border: 'none', color: '#78716C',
                fontSize: '13px', cursor: 'pointer',
              }}
            >
              Maybe later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
