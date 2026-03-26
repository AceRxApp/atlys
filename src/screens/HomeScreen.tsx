import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { LocationIcon } from '../components/icons';
import { formatDistance } from '../services/places';
import type { City } from '../types';
import ContextHint from '../components/ContextHint';
import { useSubscription } from '../hooks/useSubscription';
import PaywallModal from '../components/PaywallModal';
import { fixPhotoUrl } from '../utils/photoUrl';
import NativeImg from '../components/NativeImg';
import { FlightCard, FlightCardSkeleton } from '../components/FlightCard';
import CommunityRoutesSection from '../components/CommunityRoutesSection';
import SocialProof from '../components/SocialProof';
import PlanLoadingAnimation from '../components/PlanLoadingAnimation';

// ── Vibe Cards ──
interface VibeOption {
  id: string;
  emoji: string;
  label: string;
  desc: string;
}

const VIBES: VibeOption[] = [
  { id: 'starthare', emoji: '\u{2B50}', label: 'Greatest Hits', desc: 'The must-do highlights & iconic spots' },
  { id: 'indulge', emoji: '\u{1F37D}\u{FE0F}', label: 'Indulge', desc: 'Food & drink worth the trip' },
  { id: 'afterdark', emoji: '\u{1F31C}', label: 'After Dark', desc: 'Where the city comes alive at night' },
  { id: 'escape', emoji: '\u{1F33F}', label: 'Escape', desc: 'Nature, scenic views & peaceful spots' },
  { id: 'luxe', emoji: '\u{1F451}', label: 'Luxe', desc: 'High-end, upscale experiences' },
  { id: 'undertheradar', emoji: '\u{1F4CD}', label: 'Under the Radar', desc: 'Hidden gems & local favorites' },
];

const LOADING_MESSAGES = [
  'Finding top spots nearby...',
  'Checking what\'s open now...',
  'Curating the best picks...',
  'Adding local favorites...',
  'Almost ready...',
];

// Expanded destination pool — 8 shown per day, rotated daily
const ALL_DESTINATIONS = [
  {
    city: 'Paris', country: 'France', landmark: 'Eiffel Tower', continent: 'Europe',
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&h=400&fit=crop',
  },
  {
    city: 'Tokyo', country: 'Japan', landmark: 'Senso-ji Temple', continent: 'Asia',
    image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&h=400&fit=crop',
  },
  {
    city: 'New York', country: 'USA', landmark: 'Statue of Liberty', continent: 'N. America',
    image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&h=400&fit=crop',
  },
  {
    city: 'Rio de Janeiro', country: 'Brazil', landmark: 'Christ the Redeemer', continent: 'S. America',
    image: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=600&h=400&fit=crop',
  },
  {
    city: 'Accra', country: 'Ghana', landmark: 'Independence Arch', continent: 'Africa',
    image: 'https://images.unsplash.com/photo-1630386226447-af0a955c1009?w=600&h=400&fit=crop',
  },
  {
    city: 'Sydney', country: 'Australia', landmark: 'Opera House', continent: 'Oceania',
    image: 'https://images.unsplash.com/photo-1524293581917-878a6d017c71?w=600&h=400&fit=crop',
  },
  {
    city: 'Dubai', country: 'UAE', landmark: 'Burj Khalifa', continent: 'Middle East',
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&h=400&fit=crop',
  },
  {
    city: 'Cartagena', country: 'Colombia', landmark: 'Castillo San Felipe', continent: 'S. America',
    image: 'https://images.unsplash.com/photo-1770808564556-7bc511b893a2?w=600&h=400&fit=crop',
  },
  {
    city: 'London', country: 'England', landmark: 'Tower Bridge', continent: 'Europe',
    image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&h=400&fit=crop',
  },
  {
    city: 'Bangkok', country: 'Thailand', landmark: 'Grand Palace', continent: 'Asia',
    image: 'https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=600&h=400&fit=crop',
  },
  {
    city: 'Rome', country: 'Italy', landmark: 'Colosseum', continent: 'Europe',
    image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&h=400&fit=crop',
  },
  {
    city: 'Istanbul', country: 'Turkey', landmark: 'Hagia Sophia', continent: 'Europe',
    image: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=600&h=400&fit=crop',
  },
  {
    city: 'Mexico City', country: 'Mexico', landmark: 'Palacio de Bellas Artes', continent: 'N. America',
    image: 'https://images.unsplash.com/photo-1585464231875-d9ef1f5ad396?w=600&h=400&fit=crop',
  },
  {
    city: 'Cape Town', country: 'South Africa', landmark: 'Table Mountain', continent: 'Africa',
    image: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=600&h=400&fit=crop',
  },
  {
    city: 'Barcelona', country: 'Spain', landmark: 'Sagrada Familia', continent: 'Europe',
    image: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=600&h=400&fit=crop',
  },
  {
    city: 'Marrakech', country: 'Morocco', landmark: 'Jemaa el-Fnaa', continent: 'Africa',
    image: 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=600&h=400&fit=crop',
  },
];

// Deterministic daily shuffle — same 8 cities all day, different tomorrow
function getDailyDestinations() {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const shuffled = [...ALL_DESTINATIONS];
  // Simple seeded shuffle (Lehmer LCG)
  let s = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = s % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, 8);
}

const FEATURED_DESTINATIONS = getDailyDestinations();

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
          inputMode="search"
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
    loadCuratedPicks,
    curatedLoading,
    planMyDay,
    autoPlanLoading,
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
    flights,
    flightsLoading,
    originAirport,
    destinationAirport,
    googleFlightsUrl,
  } = useApp();
  const subscription = useSubscription(user);

  const [selectedVibesSet, setSelectedVibesSet] = useState<Set<string>>(new Set());
  const [selectedDuration, setSelectedDuration] = useState<'full' | 'morning' | 'afternoon' | 'evening'>('full');
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);

  const hasLocation = useGps || !!selectedCity;

  // Rotate loading messages
  useEffect(() => {
    if (!curatedLoading) { setLoadingMsgIdx(0); return; }
    const interval = setInterval(() => {
      setLoadingMsgIdx(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [curatedLoading]);

  const handleSelectVibe = (vibeId: string) => {
    setSelectedVibesSet(prev => {
      const next = new Set(prev);
      if (next.has(vibeId)) {
        next.delete(vibeId);
      } else {
        if (next.size >= 2) {
          const first = next.values().next().value;
          if (first) next.delete(first);
        }
        next.add(vibeId);
      }
      return next;
    });
  };
  const selectedVibe = selectedVibesSet.size > 0 ? Array.from(selectedVibesSet).join(',') : null;

  const handlePlanMyDay = async () => {
    // "Try before sign up" — allow 1 free plan without an account
    const FREE_TRIAL_KEY = 'nxstops_free_trial_used';
    const trialUsed = localStorage.getItem(FREE_TRIAL_KEY) === '1';

    if (!user) {
      if (trialUsed) {
        setShowProfile(true);
        setAuthScreen('signup');
        return;
      }
    } else {
      if (!subscription.canUseFeature('plan_my_day')) {
        setShowPaywall(true);
        return;
      }
    }

    const vibe = selectedVibe || 'starthare';
    const success = await planMyDay('explore', selectedDuration, vibe);
    if (success) {
      if (user) {
        subscription.useFeature('plan_my_day');
      } else {
        localStorage.setItem(FREE_TRIAL_KEY, '1');
      }
      setScreen('plan');
    }
  };

  // Full-page loading state — fun animated progress
  if (curatedLoading || autoPlanLoading) {
    const vibeLabel = selectedVibesSet.size > 1
      ? Array.from(selectedVibesSet).map(id => VIBES.find(v => v.id === id)?.label || '').join(' + ')
      : VIBES.find(v => v.id === (Array.from(selectedVibesSet)[0] || 'starthare'))?.label || 'Explore';
    return (
      <PlanLoadingAnimation
        cityName={cityLabel || loc.city || 'your city'}
        vibe={vibeLabel}
      />
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
          subtitle="Your AI-powered city discovery app. Here's how to get started:"
          hints={[
            { emoji: '\u{1F4CD}', title: 'Pick your destination', description: 'Search for any city or tap "Use my location" to explore where you are right now.' },
            { emoji: '\u{1F3AF}', title: 'Choose your vibe', description: 'Pick a mood like Food Tour, Adventure, or Best of the City — then choose Full Day, Morning, Afternoon, or Evening.' },
            { emoji: '\u{1F4CB}', title: 'Pick your vibe', description: 'Choose a vibe and we\u2019ll show you the best spots for morning, afternoon, and evening. Add what you like.' },
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
                {/* Fallback when image fails — rich gradient with city initial */}
                <div className="absolute inset-0 -z-10 flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-subtle) 50%, var(--amber-tint-bg15) 100%)` }}>
                  <span className="text-[48px] font-bold opacity-15" style={{ color: 'var(--accent-amber)' }}>{dest.city[0]}</span>
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

      {/* ── What's your vibe? ── */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <label className="section-label font-heading">What's your vibe?</label>
          <span className="text-[11px] text-text-tertiary">Pick up to 2</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {VIBES.map((v, i) => {
            const isVibeSelected = selectedVibesSet.has(v.id);
            return (
            <button key={v.id}
              onClick={() => handleSelectVibe(v.id)}
              aria-label={`${v.label} — ${v.desc}`}
              aria-pressed={isVibeSelected}
              style={{ animationDelay: `${i * 50}ms` }}
              className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl cursor-pointer transition-all duration-200 animate-enter-up ${
                isVibeSelected
                  ? 'border-[1.5px] border-accent-amber bg-amber-tint-bg15 shadow-[0_0_16px_rgba(232,148,10,0.12)]'
                  : 'border border-border-medium bg-transparent hover:border-border-strong'
              }`}>
              <span className="text-lg">{v.emoji}</span>
              <span className={`text-[12px] font-semibold leading-tight ${isVibeSelected ? 'text-accent-amber' : 'text-text-primary'}`}>{v.label}</span>
            </button>
            );
          })}
        </div>
      </div>

      {/* ── Duration Picker ── */}
      <div className="mb-4">
        <div className="flex gap-2">
          {([
            { id: 'full' as const, label: 'Full Day', emoji: '\u2600\uFE0F' },
            { id: 'morning' as const, label: 'Morning', emoji: '\u{1F305}' },
            { id: 'afternoon' as const, label: 'Afternoon', emoji: '\u{1F31E}' },
            { id: 'evening' as const, label: 'Tonight', emoji: '\u{1F303}' },
          ]).map(d => (
            <button key={d.id}
              onClick={() => setSelectedDuration(d.id)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                selectedDuration === d.id
                  ? 'border-[1.5px] border-accent-amber bg-amber-tint-bg15 text-accent-amber'
                  : 'border border-border-medium bg-transparent text-text-tertiary'
              }`}>
              <span className="block text-sm mb-0.5">{d.emoji}</span>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Generate Button ── */}
      <button
        onClick={handlePlanMyDay}
        disabled={autoPlanLoading}
        className="w-full p-4 rounded-[14px] border-none text-base font-bold cursor-pointer shadow-[0_4px_20px_var(--amber-tint-shadow)] disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, var(--accent-amber), var(--accent-amber-dark))', color: '#0C0A09' }}
      >
        {autoPlanLoading ? 'Building your plan...' : `Plan My ${selectedDuration === 'full' ? 'Day' : selectedDuration === 'evening' ? 'Night' : selectedDuration.charAt(0).toUpperCase() + selectedDuration.slice(1)}`}
      </button>
      {!user ? (
        <div className="text-center text-xs text-text-tertiary mt-1.5">
          {localStorage.getItem('nxstops_free_trial_used') === '1'
            ? <>Sign up to keep planning {' '}<button onClick={() => { setShowProfile(true); setAuthScreen('signup'); }} className="text-accent-amber bg-transparent border-none cursor-pointer text-xs p-0 underline">Create free account</button></>
            : 'No account needed — try your first plan free'
          }
        </div>
      ) : !subscription.isPro ? (
        <div className="text-center text-xs text-text-tertiary mt-1.5">
          {subscription.getRemainingUses('plan_my_day')} of {subscription.getLimit('plan_my_day')} free plans left this month
          {' '}<button onClick={() => setShowPaywall(true)} className="text-accent-amber bg-transparent border-none cursor-pointer text-xs p-0 underline">Upgrade</button>
        </div>
      ) : null}

      {/* Compact Weather Banner */}
      {weather && (
        <div className="flex items-center gap-2.5 mb-5 py-2.5 px-3.5 rounded-xl border border-blue-tint-border"
          style={{ background: 'linear-gradient(135deg, var(--blue-tint-bg), var(--bg-subtle))' }}>
          <span className="text-2xl">{weather.emoji}</span>
          <span className="text-base font-bold text-text-primary">{formatTemp(weather.temp)}</span>
          <span className="text-xs text-text-secondary flex-1">{weather.description} · H: {formatTemp(weather.high)} L: {formatTemp(weather.low)}</span>
        </div>
      )}

      {/* ── Flight Prices ── */}
      {flights && flights.length > 0 && originAirport && destinationAirport && (
        <div className="mb-5">
          <FlightCard
            flights={flights}
            originAirport={originAirport}
            destinationAirport={destinationAirport}
            googleFlightsUrl={googleFlightsUrl}
          />
        </div>
      )}
      {flightsLoading && <div className="mb-5"><FlightCardSkeleton /></div>}

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

      {/* ── Discover — Community Routes + Quick Actions ── */}
      {hasLocation && <CommunityRoutesSection citySlug={citySlug} />}

      {/* Social Proof */}
      <div className="mt-5">
        <SocialProof />
      </div>

      {/* TasteLens & Events — accessible from bottom nav, removed here to reduce clutter */}

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
