import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { LocationIcon } from '../components/icons';
import type { PlanMood, PlanDuration } from '../types';

const PLAN_MOODS: { id: PlanMood; emoji: string; label: string }[] = [
  { id: 'adventurous', emoji: '\u{1F525}', label: 'Adventurous' },
  { id: 'chill', emoji: '\u{1F33F}', label: 'Chill' },
  { id: 'cultural', emoji: '\u{1F3DB}\u{FE0F}', label: 'Cultural' },
  { id: 'foodie', emoji: '\u{1F37D}\u{FE0F}', label: 'Foodie' },
  { id: 'nightlife', emoji: '\u{1F378}', label: 'Nightlife' },
  { id: 'romantic', emoji: '\u{1F495}', label: 'Romantic' },
];

const PLAN_DURATIONS: { id: PlanDuration; emoji: string; label: string; desc: string }[] = [
  { id: 'full', emoji: '\u{2600}\u{FE0F}', label: 'Full Day', desc: '6 stops' },
  { id: 'morning', emoji: '\u{1F305}', label: 'Morning', desc: '3 stops' },
  { id: 'afternoon', emoji: '\u{26C5}', label: 'Afternoon', desc: '3 stops' },
  { id: 'evening', emoji: '\u{1F319}', label: 'Evening', desc: '3 stops' },
];

const PLAN_BUDGETS = [
  { value: 1, label: '$', desc: 'Budget' },
  { value: 2, label: '$$', desc: 'Moderate' },
  { value: 3, label: '$$$', desc: 'Splurge' },
  { value: -1, label: '\u{1F680}', desc: 'No Limit' },
];

const LOADING_MESSAGES = [
  'Finding the best spots nearby...',
  'Checking what\'s open right now...',
  'Building your perfect day...',
  'Curating hidden gems...',
  'Almost there...',
];

// ============================================================================
// City Search Autocomplete
// ============================================================================

interface CitySearchProps {
  cities: { id: string; name: string; country: string; region: string }[];
  selectedCity: { id: string; name: string; country: string } | null;
  loading: boolean;
  onSelect: (city: CitySearchProps['cities'][number] | null) => void;
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
            className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer p-1 text-text-tertiary text-base leading-none"
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
                <div className="px-3.5 pt-2 pb-1 text-[10px] font-bold text-text-tertiary uppercase tracking-[0.08em] sticky top-0 bg-bg-surface z-[1]">
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
                        <div className="text-[11px] text-text-tertiary">
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
  } = useApp();

  const [planMoods, setPlanMoods] = useState<PlanMood[]>(['adventurous']);
  const [planBudget, setPlanBudget] = useState(2);
  const [planDuration, setPlanDuration] = useState<PlanDuration>('full');
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

  const hasLocation = useGps || !!selectedCity;

  // Rotate loading messages
  useEffect(() => {
    if (!autoPlanLoading) { setLoadingMsgIdx(0); return; }
    const interval = setInterval(() => {
      setLoadingMsgIdx(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [autoPlanLoading]);

  const togglePlanMood = (id: PlanMood) => {
    setPlanMoods(prev => {
      if (prev.includes(id)) {
        return prev.length > 1 ? prev.filter(m => m !== id) : prev;
      }
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const handlePlanMyDay = async () => {
    const moodStr = planMoods.join(' + ');
    const success = await planMyDay(moodStr, planBudget, planDuration);
    if (success) {
      setScreen('plan');
    }
  };

  // Full-page loading state
  if (autoPlanLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-[3px] rounded-sm mx-auto mb-6 animate-shimmer"
          style={{ background: 'linear-gradient(90deg, var(--amber-tint-border30) 25%, var(--accent-amber) 50%, var(--amber-tint-border30) 75%)', backgroundSize: '200% 100%' }} />
        <div className="text-5xl mb-4">{'\u2728'}</div>
        <div className="text-lg font-bold text-text-primary mb-2">Planning your day...</div>
        <div className="text-sm text-text-tertiary">{LOADING_MESSAGES[loadingMsgIdx]}</div>
      </div>
    );
  }

  return (
    <div>
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-[26px] font-bold mb-1">
          {getGreeting()} {'\u2728'}
        </h1>
        <p className="text-text-secondary text-sm">{getTimeSuggestion()}</p>
      </div>

      {/* ── Where are you going? ── */}
      <div className="mb-5">
        <label className="section-label block mb-3">Where are you going?</label>

        {/* GPS Card */}
        {loc.hasLocation && (
          <button
            onClick={() => { setUseGps(true); setSelectedCity(null); }}
            className={`w-full cursor-pointer text-left flex items-center gap-3.5 p-3.5 rounded-xl mb-3 ${
              useGps
                ? 'border-2 border-accent-amber bg-amber-tint-bg10'
                : 'border border-border-medium bg-bg-surface-alpha'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-accent-gradient flex items-center justify-center shrink-0">
              <LocationIcon />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-[14px] text-text-primary">{loc.city || 'Near You'}</div>
              <div className="text-[11px] text-text-secondary">Use your current location</div>
            </div>
            {useGps && <span className="text-accent-amber text-sm shrink-0">{'\u2713'}</span>}
          </button>
        )}

        {/* Divider */}
        {loc.hasLocation && (
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px bg-border-subtle" />
            <span className="text-[11px] text-text-tertiary">or pick a city</span>
            <div className="flex-1 h-px bg-border-subtle" />
          </div>
        )}

        {/* City Search */}
        <CitySearch
          cities={cities}
          selectedCity={selectedCity}
          loading={loading}
          onSelect={(city) => { setSelectedCity(city); setUseGps(false); }}
        />
      </div>

      {/* ── What's the vibe? ── */}
      <div className="mb-5">
        <label className="section-label block mb-2.5">
          What&apos;s the vibe? <span className="text-text-tertiary font-normal text-[11px]">(pick up to 2)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {PLAN_MOODS.map(m => {
            const selected = planMoods.includes(m.id);
            return (
              <button key={m.id}
                onClick={() => togglePlanMood(m.id)}
                className={`py-2 px-3.5 rounded-[20px] text-[13px] font-medium cursor-pointer transition-colors duration-150 ${
                  selected
                    ? 'border-2 border-accent-amber bg-amber-tint-bg15 text-accent-amber'
                    : 'border border-border-medium bg-transparent text-text-secondary'
                }`}>
                {m.emoji} {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── How long? ── */}
      <div className="mb-5">
        <label className="section-label block mb-2.5">How long?</label>
        <div className="grid grid-cols-4 gap-2">
          {PLAN_DURATIONS.map(d => (
            <button key={d.id}
              onClick={() => setPlanDuration(d.id)}
              className={`py-2.5 px-2 rounded-xl text-center cursor-pointer transition-colors duration-150 ${
                planDuration === d.id
                  ? 'border-2 border-accent-amber bg-amber-tint-bg15'
                  : 'border border-border-medium bg-transparent'
              }`}>
              <div className="text-lg mb-0.5">{d.emoji}</div>
              <div className={`text-[11px] font-semibold ${planDuration === d.id ? 'text-accent-amber' : 'text-text-primary'}`}>{d.label}</div>
              <div className="text-[10px] text-text-tertiary">{d.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Budget ── */}
      <div className="mb-6">
        <label className="section-label block mb-2.5">Budget</label>
        <div className="flex gap-2">
          {PLAN_BUDGETS.map(b => (
            <button key={b.value}
              onClick={() => setPlanBudget(b.value)}
              className={`flex-1 py-3 rounded-xl text-center cursor-pointer transition-colors duration-150 ${
                planBudget === b.value
                  ? 'border-2 border-accent-amber bg-amber-tint-bg15'
                  : 'border border-border-medium bg-transparent'
              }`}>
              <div className={`text-lg font-bold mb-0.5 ${planBudget === b.value ? 'text-accent-amber' : 'text-text-primary'}`}>{b.label}</div>
              <div className="text-[10px] text-text-tertiary">{b.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Generate Button ── */}
      <button
        onClick={handlePlanMyDay}
        disabled={!hasLocation}
        className={`w-full p-4 rounded-[14px] border-none text-base font-bold transition-opacity duration-150 ${
          hasLocation
            ? 'cursor-pointer shadow-[0_4px_20px_var(--amber-tint-shadow)]'
            : 'opacity-40 cursor-not-allowed'
        }`}
        style={{ background: 'linear-gradient(135deg, var(--accent-amber), #D97706)', color: '#0C0A09' }}
      >
        {'\u2728'} Plan My Day
      </button>

      {!hasLocation && (
        <p className="text-center text-[12px] text-text-tertiary mt-2.5">
          Pick a city or enable GPS to get started
        </p>
      )}
    </div>
  );
}
