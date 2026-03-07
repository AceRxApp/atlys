import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { LocationIcon } from '../components/icons';
import { formatDistance } from '../services/places';
import type { PlanDuration, City } from '../types';
import ContextHint from '../components/ContextHint';
import { useSubscription } from '../hooks/useSubscription';
import PaywallModal from '../components/PaywallModal';
import { fixPhotoUrl } from '../utils/photoUrl';
import NativeImg from '../components/NativeImg';
import CommunityRoutesSection from '../components/CommunityRoutesSection';

// ── Vibe Cards ──
interface VibeOption {
  id: string;
  emoji: string;
  label: string;
  desc: string;
}

function getVibesForDuration(duration: PlanDuration): VibeOption[] {
  const food: VibeOption = {
    id: 'food', emoji: '\u{1F37D}\u{FE0F}', label: 'Food Tour',
    desc: duration === 'morning' ? 'Coffee shops, brunch spots, bakeries'
      : duration === 'afternoon' ? 'Lunch spots, desserts, afternoon bites'
      : duration === 'evening' ? 'Dinner spots, late-night bites, cocktails'
      : 'The best food spots across the city',
  };
  const adventure: VibeOption = {
    id: 'adventure', emoji: '\u{1F33F}', label: 'Adventure',
    desc: duration === 'morning' ? 'Parks, museums, scenic walks + breakfast'
      : duration === 'afternoon' ? 'Culture, landmarks, markets + lunch'
      : duration === 'evening' ? 'Sunset spots, viewpoints, culture + dinner'
      : 'Outdoor, museums, culture + food between',
  };
  const curatedCity: VibeOption = {
    id: 'surprise', emoji: '\u{1F3D9}\u{FE0F}', label: 'Best of the City',
    desc: duration === 'morning' ? 'Top cafés, brunch spots, parks & culture'
      : duration === 'afternoon' ? 'Best lunch, museums, shopping & neighborhoods'
      : duration === 'evening' ? 'Top dinner, bars, events & nightlife'
      : 'The city\'s greatest hits — top-rated everything',
  };

  if (duration === 'morning') {
    return [
      { id: 'chill', emoji: '\u{2615}', label: 'Chill Vibes', desc: 'Coffee shops, bookstores, scenic walks' },
      food, adventure, curatedCity,
    ];
  }
  if (duration === 'afternoon') {
    return [
      { id: 'daydrinks', emoji: '\u{1F379}', label: 'Day Drinks', desc: 'Rooftop bars, happy hour, wine bars' },
      food, adventure, curatedCity,
    ];
  }
  if (duration === 'evening') {
    return [
      { id: 'nightout', emoji: '\u{1F319}', label: 'Night Out',
        desc: 'Dinner, bars, lounges, late night bites' },
      food, adventure, curatedCity,
    ];
  }
  // Full day vibes
  return [
    { id: 'stacked', emoji: '\u{1F525}', label: 'Full Experience',
      desc: 'Breakfast to late night — the complete itinerary' },
    food, adventure, curatedCity,
  ];
}

const PLAN_DURATIONS: { id: PlanDuration; emoji: string; label: string; desc: string }[] = [
  { id: 'full', emoji: '\u{2600}\u{FE0F}', label: 'Full Day', desc: '6-8 stops' },
  { id: 'morning', emoji: '\u{1F305}', label: 'Morning', desc: '3 stops' },
  { id: 'afternoon', emoji: '\u{26C5}', label: 'Afternoon', desc: '3 stops' },
  { id: 'evening', emoji: '\u{1F319}', label: 'Evening', desc: '3 stops' },
];

const LOADING_MESSAGES = [
  'Finding top spots nearby...',
  'Checking what\'s open now...',
  'Building your itinerary...',
  'Adding local favorites...',
  'Almost ready...',
];

// 8 major tourist attractions across all continents
const FEATURED_DESTINATIONS = [
  {
    city: 'Paris', country: 'France', landmark: 'Eiffel Tower', continent: 'Europe',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Tour_Eiffel_Wikimedia_Commons_%28cropped%29.jpg/600px-Tour_Eiffel_Wikimedia_Commons_%28cropped%29.jpg',
  },
  {
    city: 'Tokyo', country: 'Japan', landmark: 'Senso-ji Temple', continent: 'Asia',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Sensoji_2023.jpg/600px-Sensoji_2023.jpg',
  },
  {
    city: 'New York', country: 'USA', landmark: 'Statue of Liberty', continent: 'N. America',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Front_view_of_Statue_of_Liberty_%28cropped%29.jpg/600px-Front_view_of_Statue_of_Liberty_%28cropped%29.jpg',
  },
  {
    city: 'Rio de Janeiro', country: 'Brazil', landmark: 'Christ the Redeemer', continent: 'S. America',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Christ_the_Redeemer_-_Cristo_Redentor.jpg/600px-Christ_the_Redeemer_-_Cristo_Redentor.jpg',
  },
  {
    city: 'Accra', country: 'Ghana', landmark: 'Independence Arch', continent: 'Africa',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Independence_Arch_Accra_Ghana.jpg/600px-Independence_Arch_Accra_Ghana.jpg',
  },
  {
    city: 'Sydney', country: 'Australia', landmark: 'Opera House', continent: 'Oceania',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Sydney_Australia._%2821339175489%29.jpg/600px-Sydney_Australia._%2821339175489%29.jpg',
  },
  {
    city: 'Dubai', country: 'UAE', landmark: 'Burj Khalifa', continent: 'Middle East',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Burj_Khalifa_%28worlds_tallest_building%29_and_the_Dubai_skyline_%2825781049892%29.jpg/600px-Burj_Khalifa_%28worlds_tallest_building%29_and_the_Dubai_skyline_%2825781049892%29.jpg',
  },
  {
    city: 'Cartagena', country: 'Colombia', landmark: 'Castillo San Felipe', continent: 'S. America',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/62_-_Carthag%C3%A8ne_-_D%C3%A9cembre_2008.jpg/600px-62_-_Carthag%C3%A8ne_-_D%C3%A9cembre_2008.jpg',
  },
];

// ============================================================================
// City Search Autocomplete
// ============================================================================

interface CitySearchProps {
  cities: City[];
  selectedCity: City | null;
  loading: boolean;
  onSelect: (city: City | null) => void;
}

function CitySearch({ cities, selectedCity, loading, onSelect }: CitySearchProps) {
  const [query, setQuery] = useState(selectedCity ? `${selectedCity.name}, ${selectedCity.country}` : '');
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync display text when selectedCity changes externally
  useEffect(() => {
    if (selectedCity) {
      setQuery(`${selectedCity.name}, ${selectedCity.country}`);
    }
  }, [selectedCity]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Filter cities
  const normalizedQuery = query.toLowerCase().trim();
  const isExactMatch = selectedCity && query === `${selectedCity.name}, ${selectedCity.country}`;
  const filtered = (normalizedQuery.length === 0 || isExactMatch)
    ? cities
    : cities.filter(c =>
        c.name.toLowerCase().includes(normalizedQuery) ||
        c.country.toLowerCase().includes(normalizedQuery) ||
        `${c.name}, ${c.country}`.toLowerCase().includes(normalizedQuery)
      );

  // Group by region
  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, city) => {
    const region = city.region || 'Other';
    (acc[region] ??= []).push(city);
    return acc;
  }, {});
  const regionOrder = Object.keys(grouped).sort();
  const flatList = regionOrder.flatMap(r => grouped[r]);

  const selectCity = useCallback((city: typeof cities[number]) => {
    onSelect(city);
    setQuery(`${city.name}, ${city.country}`);
    setOpen(false);
    setHighlightIndex(-1);
    inputRef.current?.blur();
  }, [onSelect]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') { setOpen(true); e.preventDefault(); }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(prev => Math.min(prev + 1, flatList.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlightIndex >= 0 && highlightIndex < flatList.length) {
      e.preventDefault();
      selectCity(flatList[highlightIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setHighlightIndex(-1);
    }
  };

  // Scroll highlighted into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-city-item]');
      items[highlightIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex]);

  return (
    <div ref={containerRef} className={`relative ${open ? 'z-[999]' : 'z-auto'}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder={loading && cities.length === 0 ? 'Loading cities...' : 'Type a city name...'}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlightIndex(-1);
          }}
          onFocus={() => {
            setOpen(true);
            if (selectedCity) inputRef.current?.select();
          }}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls="city-search-list"
          className={`input-field pr-10 transition-[border-color] duration-150 ${open ? 'border-accent-amber' : 'border-border-strong'}`}
        />
        {query && selectedCity ? (
          <button
            onClick={() => { setQuery(''); onSelect(null); setOpen(true); inputRef.current?.focus(); }}
            aria-label="Clear city"
            className="absolute right-1 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center text-text-tertiary text-base leading-none"
          >
            ✕
          </button>
        ) : (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
        )}
      </div>

      {open && (
        <div
          ref={listRef}
          id="city-search-list"
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1 max-h-[280px] overflow-y-auto rounded-xl border border-border-strong bg-bg-surface z-50 shadow-[0_8px_32px_rgba(0,0,0,0.2)]"
        >
          {flatList.length === 0 ? (
            <div className="p-4 text-center text-text-tertiary text-[13px]">
              No cities found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            regionOrder.map(region => (
              <div key={region}>
                <div className="px-3.5 pt-2 pb-1 text-[11px] font-bold text-text-tertiary uppercase tracking-[0.08em] sticky top-0 bg-bg-surface z-[1]">
                  {region}
                </div>
                {grouped[region].map(city => {
                  const idx = flatList.indexOf(city);
                  const isHighlighted = idx === highlightIndex;
                  const isSelected = selectedCity?.id === city.id;
                  return (
                    <button
                      key={city.id}
                      data-city-item
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => selectCity(city)}
                      onMouseEnter={() => setHighlightIndex(idx)}
                      className={`w-full py-2.5 px-3.5 border-none cursor-pointer text-left flex items-center gap-2.5 text-text-primary ${isHighlighted ? 'bg-amber-tint-bg10' : 'bg-transparent'}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm truncate ${isSelected ? 'font-bold text-accent-amber' : 'font-medium text-text-primary'}`}>
                          {city.name}
                        </div>
                        <div className="text-xs text-text-tertiary">
                          {city.country}
                        </div>
                      </div>
                      {isSelected && (
                        <span className="text-accent-amber text-sm shrink-0">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Home Screen — Planner Only
// ============================================================================

export default function HomeScreen() {
  const {
    getGreeting,
    getTimeSuggestion,
    selectedCity,
    useGps,
    setUseGps,
    setSelectedCity,
    setScreen,
    loc,
    cities,
    loading,
    autoPlanLoading,
    planMyDay,
    weather, formatTemp,
    forYouPlaces,
    filteredPlaces,
    placesLoading,
    setSelectedPlace,
    useMiles,
    setDishLensContext,
    cityLabel,
    citySlug,
    user,
    showToast,
    setShowProfile,
    setAuthScreen,
  } = useApp();
  const subscription = useSubscription(user);

  const [selectedVibe, setSelectedVibe] = useState<string | null>(null);
  const [planDuration, setPlanDuration] = useState<PlanDuration>('full');
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);

  const hasLocation = useGps || !!selectedCity;
  const currentVibes = getVibesForDuration(planDuration);

  // Reset vibe when duration changes if current vibe isn't available
  useEffect(() => {
    if (selectedVibe && !currentVibes.some(v => v.id === selectedVibe)) {
      setSelectedVibe(null);
    }
  }, [planDuration]); // eslint-disable-line react-hooks/exhaustive-deps

  // Rotate loading messages
  useEffect(() => {
    if (!autoPlanLoading) { setLoadingMsgIdx(0); return; }
    const interval = setInterval(() => {
      setLoadingMsgIdx(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [autoPlanLoading]);

  const handleSelectVibe = (vibeId: string) => {
    setSelectedVibe(selectedVibe === vibeId ? null : vibeId);
  };

  const handlePlanMyDay = async () => {
    // Require sign-in
    if (!user) {
      setShowProfile(true);
      setAuthScreen('signup');
      return;
    }
    // Check free tier usage
    if (!subscription.canUseFeature('plan_my_day')) {
      setShowPaywall(true);
      return;
    }

    const vibe = selectedVibe || 'surprise';
    const vibeLabel = currentVibes.find(v => v.id === vibe)?.label || 'Best of the City';
    const success = await planMyDay(vibeLabel, planDuration, vibe);
    if (success) {
      subscription.useFeature('plan_my_day');
      setScreen('plan');
    }
  };

  // Full-page loading state
  if (autoPlanLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-[3px] rounded-sm mx-auto mb-6 animate-shimmer"
          style={{ background: 'linear-gradient(90deg, var(--amber-tint-border30) 25%, var(--accent-amber) 50%, var(--amber-tint-border30) 75%)', backgroundSize: '200% 100%' }} />
        <div className="text-lg font-bold text-text-primary mb-2">Planning your day...</div>
        <div className="text-sm text-text-tertiary">{LOADING_MESSAGES[loadingMsgIdx]}</div>
      </div>
    );
  }

  // ================================================================
  // PREVIEW PAGE — no city selected yet
  // ================================================================
  if (!hasLocation) {
    return (
      <div>
        {/* First-visit hint */}
        <ContextHint
          storageKey="home"
          title="Welcome to NxStops"
          subtitle="Your all-in-one travel companion. Here's how to get started:"
          hints={[
            { emoji: '\u{1F4CD}', title: 'Pick your destination', description: 'Search for any city or tap "Use my location" to explore where you are right now.' },
            { emoji: '\u{1F3AF}', title: 'Choose your vibe', description: 'Pick a mood like Food Tour, Adventure, or Best of the City — then choose Full Day, Morning, Afternoon, or Evening.' },
            { emoji: '\u{1F4CB}', title: 'Auto-plan your day', description: 'Tap "Plan My Day" and our AI builds a complete itinerary with the best stops for your mood and time.' },
            { emoji: '\u{1F30D}', title: 'Explore featured cities', description: 'Scroll through popular destinations worldwide for trip inspiration.' },
          ]}
        />

        {/* Hero */}
        <div className="text-center mb-5">
          <h1 className="text-[30px] font-extrabold tracking-tight text-text-primary mb-1.5">
            WHERE TO NEXT?
          </h1>
          <p className="text-text-tertiary text-[13px]">Pick a destination and we'll plan your perfect day</p>
        </div>

        {/* City Search */}
        <div className="mb-2">
          <CitySearch
            cities={cities}
            selectedCity={selectedCity}
            loading={loading}
            onSelect={(city) => { setSelectedCity(city); setUseGps(false); }}
          />
        </div>

        {/* Use current location */}
        <div className="flex justify-center mb-5">
          <button
            onClick={() => { setUseGps(true); setSelectedCity(null); }}
            className="flex items-center gap-1.5 text-[13px] text-accent-amber font-semibold bg-amber-tint-bg10 border border-amber-tint-border20 rounded-full px-4 py-2.5 cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Use my current location
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-border-subtle" />
          <span className="text-xs text-text-tertiary">or explore a destination</span>
          <div className="flex-1 h-px bg-border-subtle" />
        </div>

        {/* Featured Destinations */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {FEATURED_DESTINATIONS.map(dest => {
            const matchedCity = cities.find(c => c.name.toLowerCase() === dest.city.toLowerCase());
            return (
              <div
                key={dest.city}
                role="button"
                tabIndex={0}
                aria-label={`Select ${dest.city}, ${dest.country}`}
                onClick={() => {
                  if (matchedCity) {
                    setSelectedCity(matchedCity);
                    setUseGps(false);
                  }
                }}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (matchedCity) { setSelectedCity(matchedCity); setUseGps(false); } } }}
                className="relative overflow-hidden rounded-xl border border-border-subtle cursor-pointer h-[130px]"
              >
                <NativeImg
                  src={dest.image}
                  alt={`${dest.landmark}, ${dest.city}`}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Fallback when image fails */}
                <div className="absolute inset-0 -z-10 flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, var(--amber-tint-bg15), var(--bg-subtle))' }}>
                  <span className="text-3xl opacity-60">{'\u{1F3D9}\u{FE0F}'}</span>
                </div>
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)' }} />
                <div className="absolute bottom-0 left-0 right-0 p-2.5">
                  <div className="text-sm font-bold text-white leading-tight">{dest.city}</div>
                  <div className="text-xs text-white/80 mt-0.5">{dest.landmark}</div>
                  <div className="text-[11px] text-white/60 mt-0.5">{dest.country} {'\u00B7'} {dest.continent}</div>
                </div>
                {!matchedCity && (
                  <div className="absolute top-1.5 right-1.5 text-[10px] text-white/50 bg-black/30 px-1.5 py-0.5 rounded-full">
                    Coming soon
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ================================================================
  // PLANNER — city selected, show full planning UI
  // ================================================================
  return (
    <div>
      {/* Greeting */}
      <div className="mb-5">
        <h1 className="text-[26px] font-bold mb-1">
          {getGreeting()}
        </h1>
        <p className="text-text-secondary text-sm">{getTimeSuggestion()}</p>
      </div>

      {/* Compact Weather Banner */}
      {weather && (
        <div className="flex items-center gap-2.5 mb-5 py-2.5 px-3.5 rounded-xl border border-blue-tint-border"
          style={{ background: 'linear-gradient(135deg, var(--blue-tint-bg), var(--bg-subtle))' }}>
          <span className="text-2xl">{weather.emoji}</span>
          <span className="text-base font-bold text-text-primary">{formatTemp(weather.temp)}</span>
          <span className="text-xs text-text-secondary flex-1">{weather.description} · H: {formatTemp(weather.high)} L: {formatTemp(weather.low)}</span>
        </div>
      )}

      {/* ── Selected City ── */}
      <div className="mb-5">
        <div className="flex items-center gap-2.5 py-2.5 px-3.5 rounded-xl border border-accent-amber bg-amber-tint-bg10">
          <div className="w-8 h-8 rounded-lg bg-accent-gradient flex items-center justify-center shrink-0">
            <LocationIcon />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold text-text-primary truncate">{cityLabel || loc.city || 'Your Location'}</div>
          </div>
          <button
            onClick={() => { setSelectedCity(null); setUseGps(false); }}
            className="text-xs text-accent-amber bg-transparent border-none cursor-pointer font-medium px-2 py-1"
          >
            Change
          </button>
        </div>
      </div>

      {/* ── How long? ── */}
      <div className="mb-5">
        <label className="section-label block mb-2.5">How long?</label>
        <div className="grid grid-cols-4 gap-2">
          {PLAN_DURATIONS.map(d => (
            <button key={d.id}
              onClick={() => setPlanDuration(d.id)}
              aria-label={`${d.label} — ${d.desc}`}
              aria-pressed={planDuration === d.id}
              className={`py-2.5 px-2 rounded-xl text-center cursor-pointer transition-colors duration-150 ${
                planDuration === d.id
                  ? 'border-2 border-accent-amber bg-amber-tint-bg15'
                  : 'border border-border-medium bg-transparent'
              }`}>
              <div className="text-lg mb-0.5">{d.emoji}</div>
              <div className={`text-xs font-semibold ${planDuration === d.id ? 'text-accent-amber' : 'text-text-primary'}`}>{d.label}</div>
              <div className="text-[11px] text-text-tertiary">{d.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── I'm out for... ── */}
      <div className="mb-5">
        <label className="section-label block mb-2.5">What's your vibe?</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          {currentVibes.map(v => (
            <button key={v.id}
              onClick={() => handleSelectVibe(v.id)}
              aria-label={`${v.label} — ${v.desc}`}
              aria-pressed={selectedVibe === v.id}
              className={`py-3 px-3 rounded-xl text-left cursor-pointer transition-all duration-150 ${
                selectedVibe === v.id
                  ? 'border-2 border-accent-amber bg-amber-tint-bg15 scale-[1.01]'
                  : 'border border-border-medium bg-transparent'
              }`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{v.emoji}</span>
                <span className={`text-[13px] font-semibold ${selectedVibe === v.id ? 'text-accent-amber' : 'text-text-primary'}`}>{v.label}</span>
              </div>
              <div className="text-[11px] text-text-tertiary leading-snug">{v.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Nearby Picks — show what's around before committing to a plan ── */}
      {!placesLoading && (() => {
        const picks = forYouPlaces.length >= 3
          ? forYouPlaces.slice(0, 6)
          : filteredPlaces.filter(p => p.rating >= 4.0 && p.photoUrl).slice(0, 6);
        if (picks.length < 2) return null;
        return (
          <div className="mb-5">
            <div className="flex justify-between items-center mb-2.5">
              <h3 className="text-[15px] font-semibold flex items-center gap-1.5">
                Nearby Picks
              </h3>
              <button
                onClick={() => setScreen('discover')}
                className="text-xs text-accent-amber bg-transparent border-none cursor-pointer font-medium">
                See all {'\u2192'}
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scroll-hidden">
              {picks.map(place => (
                <div key={place.placeId}
                  onClick={() => setSelectedPlace(place)}
                  role="button"
                  tabIndex={0}
                  aria-label={`View details for ${place.name}`}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedPlace(place); } }}
                  className="card !p-0 overflow-hidden min-w-[160px] max-w-[180px] shrink-0 cursor-pointer border border-amber-tint-border15">
                  {place.photoUrl ? (
                    <div className="h-[100px] w-full relative overflow-hidden">
                      <NativeImg src={fixPhotoUrl(place.photoUrl)!} alt={place.name} loading="lazy" decoding="async"
                        className="w-full h-full object-cover block" />
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, var(--bg-image-overlay))' }} />
                    </div>
                  ) : (
                    <div className="h-[100px] w-full bg-amber-tint-bg06 flex items-center justify-center text-xl text-text-tertiary">{'\u{1F4CD}'}</div>
                  )}
                  <div className="py-2.5 px-3">
                    <div className="text-[13px] font-semibold text-text-primary mb-[3px] overflow-hidden text-ellipsis whitespace-nowrap">{place.name}</div>
                    <div className="text-xs text-text-tertiary flex items-center gap-1">
                      <span className="text-accent-amber">{'\u2605'}</span> {place.rating.toFixed(1)}
                      <span className="mx-0.5">{'\u00B7'}</span>
                      {place.categoryDisplay}
                    </div>
                    {place.distance != null && (
                      <div className="text-[11px] text-text-muted mt-0.5">{formatDistance(place.distance, useMiles)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Generate Button ── */}
      <button
        onClick={handlePlanMyDay}
        className="w-full p-4 rounded-[14px] border-none text-base font-bold cursor-pointer shadow-[0_4px_20px_var(--amber-tint-shadow)]"
        style={{ background: 'linear-gradient(135deg, var(--accent-amber), var(--accent-amber-dark))', color: '#0C0A09' }}
      >
        Plan My Day
      </button>
      {!subscription.isPro && (
        <div className="text-center text-xs text-text-tertiary mt-1.5">
          {subscription.getRemainingUses('plan_my_day')} of {subscription.getLimit('plan_my_day')} free plans left this month
          {' '}<button onClick={() => setShowPaywall(true)} className="text-accent-amber bg-transparent border-none cursor-pointer text-xs p-0 underline">Upgrade</button>
        </div>
      )}

      {/* ── Discover — Community Routes + Quick Actions ── */}
      {hasLocation && <CommunityRoutesSection citySlug={citySlug} />}

      <div className="mt-5 flex gap-2.5">
        <button
          onClick={() => setScreen('tastelens')}
          className="flex-1 card !p-3 flex items-center gap-2.5 cursor-pointer border border-amber-tint-border15"
          style={{ background: 'linear-gradient(135deg, var(--amber-tint-bg06), var(--bg-subtle))' }}>
          <span className="text-xl">{'\u{1F37D}\u{FE0F}'}</span>
          <div>
            <div className="text-[13px] font-semibold text-text-primary">TasteLens</div>
            <div className="text-[11px] text-text-tertiary">Scan any menu</div>
          </div>
        </button>
        <button
          onClick={() => setScreen('events')}
          className="flex-1 card !p-3 flex items-center gap-2.5 cursor-pointer border border-purple-tint-border15"
          style={{ background: 'linear-gradient(135deg, var(--purple-tint-bg08), var(--bg-subtle))' }}>
          <span className="text-xl">{'\u{1F3AB}'}</span>
          <div>
            <div className="text-[13px] font-semibold text-text-primary">Events</div>
            <div className="text-[11px] text-text-tertiary">What's happening</div>
          </div>
        </button>
      </div>

      {/* Paywall Modal */}
      {showPaywall && (
        <PaywallModal
          feature="plan_my_day"
          remaining={subscription.getRemainingUses('plan_my_day')}
          limit={subscription.getLimit('plan_my_day')}
          onClose={() => setShowPaywall(false)}
          onUpgrade={subscription.startCheckout}
          requiresAuth={!user}
          onSignIn={() => { setShowPaywall(false); setShowProfile(true); setAuthScreen('signup'); }}
        />
      )}

    </div>
  );
}
