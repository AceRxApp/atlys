import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { LocationIcon } from '../components/icons';
import { TRAVEL_GROUPS, CITY_CULTURE } from '../data';
import type { CityContext } from '../data';
import type { PlanMood, PlanDuration } from '../types';
import CurrencyWidget from '../components/CurrencyWidget';
import BookingLinks from '../components/BookingLinks';
import { getSunsetGuardian, isNightTime, getNightSafetyTips } from '../utils/safetyEngine';

const PLAN_MOODS: { id: PlanMood; emoji: string; label: string }[] = [
  { id: 'adventurous', emoji: '\u{1F525}', label: 'Adventurous' },
  { id: 'chill', emoji: '\u{1F33F}', label: 'Chill' },
  { id: 'cultural', emoji: '\u{1F3DB}\u{FE0F}', label: 'Cultural' },
  { id: 'foodie', emoji: '\u{1F37D}\u{FE0F}', label: 'Foodie' },
  { id: 'nightlife', emoji: '\u{1F378}', label: 'Nightlife' },
];

const PLAN_DURATIONS: { id: PlanDuration; emoji: string; label: string; desc: string }[] = [
  { id: 'full', emoji: '\u{2600}\u{FE0F}', label: 'Full Day', desc: '5-7 stops' },
  { id: 'morning', emoji: '\u{1F305}', label: 'Morning', desc: '2-3 stops' },
  { id: 'afternoon', emoji: '\u{26C5}', label: 'Afternoon', desc: '2-3 stops' },
  { id: 'evening', emoji: '\u{1F319}', label: 'Evening', desc: '2-3 stops' },
];

const PLAN_BUDGETS = [
  { value: 50, emoji: '\u{2615}', label: '$50' },
  { value: 100, emoji: '\u{1F37D}\u{FE0F}', label: '$100' },
  { value: 200, emoji: '\u{1F37E}', label: '$200' },
  { value: -1, emoji: '\u{1F680}', label: 'No Limit' },
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
    <div ref={containerRef} className={`card relative ${open ? 'z-[999]' : 'z-auto'}`}>
      <label className="section-label block mb-2.5">
        Search Your City
      </label>
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
// Home Screen
// ============================================================================

export default function HomeScreen() {
  const {
    getGreeting,
    getTimeSuggestion,
    weather,
    selectedCity,
    useGps,
    setUseGps,
    setSelectedCity,
    setScreen,
    loc,
    cities,
    travelGroup,
    setTravelGroup,
    showCulture,
    setShowCulture,
    savedPlaces,
    setSelectedPlace,
    toggleSaved,
    cityLabel,
    setSelectedVibe,
    setQuickFilters,
    spinBlindDate,
    loading,
    autoPlanLoading,
    planMyDay,
  } = useApp();
  const [bannerFailed, setBannerFailed] = useState(false);
  const [showPlanner, setShowPlanner] = useState(false);
  const [planMoods, setPlanMoods] = useState<PlanMood[]>(['adventurous']);
  const [planBudget, setPlanBudget] = useState(100);
  const [planDuration, setPlanDuration] = useState<PlanDuration>('full');
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

  // Reset banner state when city changes
  useEffect(() => { setBannerFailed(false); }, [selectedCity?.id]);

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
        // Don't allow empty — keep at least 1
        return prev.length > 1 ? prev.filter(m => m !== id) : prev;
      }
      // Max 2 vibes
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const handlePlanMyDay = async () => {
    setShowPlanner(false);
    const moodStr = planMoods.join(' + ');
    await planMyDay(moodStr, planBudget, planDuration);
    setScreen('plan');
  };

  return (
    <div>
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-[26px] font-bold mb-1">
          {getGreeting()} ✨
        </h1>
        <p className="text-text-secondary text-sm">{getTimeSuggestion()}</p>
      </div>

      {/* Weather Card */}
      {weather && (selectedCity || useGps) && (
        <div
          className="card flex items-center gap-3.5 border border-blue-tint-border"
          style={{ background: `linear-gradient(135deg, var(--blue-tint-bg), rgba(147,197,253,0.04))` }}
        >
          <span className="text-4xl">{weather.emoji}</span>
          <div className="flex-1">
            <div className="text-[22px] font-bold text-text-primary">
              {weather.temp}°F
            </div>
            <div className="text-xs text-status-blue">{weather.description}</div>
          </div>
          <div className="text-right">
            <div className="text-[13px] text-text-secondary">H: {weather.high}° L: {weather.low}°</div>
            <div className="text-[11px] text-text-tertiary">{cityLabel}</div>
          </div>
        </div>
      )}

      {/* Sunset Guardian */}
      {weather && (() => {
        const guardian = getSunsetGuardian(weather.sunset);
        if (!guardian.active) return null;
        const gradients: Record<string, string> = {
          golden_hour: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(251,191,36,0.04))',
          approaching_sunset: 'linear-gradient(135deg, rgba(251,146,60,0.15), rgba(251,146,60,0.04))',
          past_sunset: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(139,92,246,0.04))',
          night: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.04))',
        };
        const borders: Record<string, string> = {
          golden_hour: 'border-amber-tint-border20',
          approaching_sunset: 'border-[rgba(251,146,60,0.3)]',
          past_sunset: 'border-purple-tint-border20',
          night: 'border-[rgba(99,102,241,0.25)]',
        };
        return (
          <div className={`card flex items-center gap-3 border ${borders[guardian.phase!]}`}
            style={{ background: gradients[guardian.phase!] }}>
            <span className="text-2xl shrink-0">{guardian.emoji}</span>
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-text-primary">{guardian.message}</div>
              {guardian.phase === 'night' && (
                <div className="text-[11px] text-text-tertiary mt-1">
                  {getNightSafetyTips(true, false).slice(0, 2).map((tip, i) => (
                    <span key={i}>{i > 0 ? ' · ' : ''}{tip}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Plan My Day — Primary CTA (moved to top) */}
      {(selectedCity || useGps) && !autoPlanLoading && (
        <button
          onClick={() => setShowPlanner(true)}
          className="w-full mt-1 mb-2 p-4 rounded-[16px] border-none cursor-pointer text-left flex items-center gap-4 shadow-[0_4px_24px_var(--amber-tint-shadow)]"
          style={{ background: `linear-gradient(135deg, var(--accent-amber), #D97706)` }}
        >
          <div className="w-12 h-12 rounded-2xl bg-[rgba(0,0,0,0.15)] flex items-center justify-center shrink-0 text-2xl">
            {'\u2728'}
          </div>
          <div className="flex-1">
            <div className="text-[17px] font-bold text-[#0C0A09]">Plan My Day</div>
            <div className="text-[12px] text-[#0C0A09] opacity-70">AI builds your perfect itinerary</div>
          </div>
          <div className="text-[#0C0A09] text-xl font-bold">{'\u2192'}</div>
        </button>
      )}

      {/* AI Generating State */}
      {autoPlanLoading && (
        <div className="card mt-1 mb-2 py-8 text-center border border-amber-tint-border20"
          style={{ background: `linear-gradient(135deg, var(--amber-tint-bg10), var(--bg-subtle))` }}>
          <div className="w-10 h-[3px] rounded-sm mx-auto mb-4 animate-shimmer"
            style={{ background: `linear-gradient(90deg, var(--amber-tint-border30) 25%, var(--accent-amber) 50%, var(--amber-tint-border30) 75%)`, backgroundSize: '200% 100%' }} />
          <div className="text-2xl mb-2">{'\u2728'}</div>
          <div className="text-sm font-semibold text-text-primary mb-1">Planning your day...</div>
          <div className="text-xs text-text-tertiary">{LOADING_MESSAGES[loadingMsgIdx]}</div>
        </div>
      )}

      {/* Currency Converter */}
      {(selectedCity || (useGps && loc.city)) && (
        <CurrencyWidget
          cityName={(selectedCity?.name || loc.city || '').toLowerCase()}
        />
      )}

      {/* GPS Card */}
      {loc.hasLocation && (
        <button
          onClick={() => { setUseGps(true); setSelectedCity(null); setScreen('discover'); }}
          className={`card w-full cursor-pointer text-left flex items-center gap-3.5 ${useGps ? 'border-2 border-accent-amber bg-amber-tint-bg10' : 'border border-border-subtle bg-bg-surface-alpha'}`}
        >
          <div className="w-11 h-11 rounded-xl bg-accent-gradient flex items-center justify-center shrink-0">
            <LocationIcon />
          </div>
          <div>
            <div className="font-semibold text-[15px] text-text-primary">{loc.city || 'Near You'}</div>
            <div className="text-xs text-text-secondary">Use your current location</div>
          </div>
          <div className="ml-auto text-accent-amber text-xl">→</div>
        </button>
      )}

      {/* Divider */}
      {loc.hasLocation && (
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-border-subtle" />
          <span className="text-xs text-text-tertiary">or pick a city</span>
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

      {/* City Banner */}
      {selectedCity && (
        <div className="card p-0 overflow-hidden mt-1 relative z-[1]">
          <div className="h-[140px] relative overflow-hidden flex flex-col justify-end p-4">
            {selectedCity.banner_url && !bannerFailed ? (
              <>
                <img src={selectedCity.banner_url} alt={selectedCity.name} loading="lazy" decoding="async"
                  onError={() => setBannerFailed(true)}
                  className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.7))' }} />
              </>
            ) : (() => {
              const regionGradients: Record<string, string> = {
                'Africa': 'linear-gradient(135deg, #D97706, #92400E)',
                'Asia': 'linear-gradient(135deg, #DC2626, #9F1239)',
                'Europe': 'linear-gradient(135deg, #2563EB, #1E3A8A)',
                'North America': 'linear-gradient(135deg, #059669, #064E3B)',
                'South America': 'linear-gradient(135deg, #D97706, #065F46)',
                'Caribbean': 'linear-gradient(135deg, #0891B2, #155E75)',
                'Central America': 'linear-gradient(135deg, #059669, #0D9488)',
                'Middle East': 'linear-gradient(135deg, #B45309, #78350F)',
                'Oceania': 'linear-gradient(135deg, #0284C7, #1E3A8A)',
              };
              const regionEmojis: Record<string, string> = {
                'Africa': '\u{1F30D}', 'Asia': '\u{1F3EF}', 'Europe': '\u{1F3F0}',
                'North America': '\u{1F5FD}', 'South America': '\u{26F0}\u{FE0F}',
                'Caribbean': '\u{1F3D6}\u{FE0F}', 'Central America': '\u{1F33A}',
                'Middle East': '\u{1F54C}', 'Oceania': '\u{1F3D6}\u{FE0F}',
              };
              const grad = regionGradients[selectedCity.region] || 'linear-gradient(135deg, #F59E0B, #92400E)';
              const emoji = regionEmojis[selectedCity.region] || '\u{1F30D}';
              return (
                <>
                  <div className="absolute inset-0" style={{ background: grad }} />
                  <div className="absolute top-3 right-4 text-4xl opacity-30">{emoji}</div>
                </>
              );
            })()}
            <h2 className="text-[22px] font-bold relative z-[1]">{selectedCity.name}</h2>
            <p className="text-text-body text-[13px] relative z-[1]">{selectedCity.country}</p>
          </div>
        </div>
      )}

      {/* Travel Group Selector */}
      {(selectedCity || useGps) && (
        <div className="card mt-2 relative z-[1]">
          <label className="section-label block mb-2.5">
            Who&apos;s traveling?
          </label>
          <div className="flex flex-wrap gap-2">
            {TRAVEL_GROUPS.map(g => {
              const active = travelGroup === g.id;
              return (
                <button key={g.id}
                  aria-pressed={active}
                  onClick={() => setTravelGroup(active ? null : g.id)}
                  className={`py-2 px-3.5 rounded-[20px] text-[13px] font-medium cursor-pointer ${active ? 'border border-amber-tint-border40 bg-amber-tint-bg15 text-accent-amber' : 'border border-border-medium bg-transparent text-text-secondary'}`}>
                  {g.emoji} {g.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Cultural Context */}
      {(selectedCity || (useGps && loc.city)) && (() => {
        const key = (selectedCity?.name || loc.city || '').toLowerCase();
        const culture = CITY_CULTURE[key];
        if (!culture) return null;
        return (
          <div className="card mt-2">
            <button
              onClick={() => setShowCulture(!showCulture)}
              className="w-full bg-transparent border-none cursor-pointer flex items-center justify-between p-0 text-text-primary">
              <span className="text-sm font-semibold">Cultural Tips</span>
              <span className={`text-text-tertiary text-base transition-transform duration-200 ${showCulture ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {showCulture && (
              <div className="mt-3 flex flex-col gap-2.5">
                {[
                  { emoji: '💰', label: 'Tipping', value: culture.tipping },
                  { emoji: '👔', label: 'Dress', value: culture.dress },
                  { emoji: '🗣️', label: 'Language', value: culture.language },
                  { emoji: '🤝', label: 'Etiquette', value: culture.etiquette },
                  { emoji: '💵', label: 'Currency', value: culture.currency },
                ].map(row => (
                  <div key={row.label} className="flex gap-2.5 items-start">
                    <span className="text-base shrink-0 w-6 text-center">{row.emoji}</span>
                    <div>
                      <div className="text-[11px] text-text-tertiary uppercase tracking-[0.06em] mb-0.5">{row.label}</div>
                      <div className="text-[13px] text-text-body leading-[1.4]">{row.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Quick Actions */}
      {(selectedCity || useGps) && !autoPlanLoading && (
        <>
          <div className="flex gap-2.5 mt-2.5">
            <button
              className="flex-1 bg-bg-subtle-strong text-text-primary border border-border-medium rounded-[14px] p-3.5 text-[15px] font-semibold cursor-pointer"
              onClick={() => setScreen('discover')}
            >
              Browse Places {'\u2192'}
            </button>
            <button
              className="flex flex-col items-center justify-center gap-0.5 py-3 px-[18px] rounded-[14px] border-[1.5px] border-accent-amber bg-amber-tint-bg10 text-accent-amber cursor-pointer shrink-0"
              onClick={() => { setSelectedVibe('food'); setScreen('discover'); }}
              aria-label="Find food near me"
            >
              <span className="text-xl">{'\u{1F37D}\u{FE0F}'}</span>
              <span className="text-[11px] font-semibold">Near Me</span>
            </button>
          </div>
          {/* Adventure shortcuts */}
          <div className="flex gap-2.5 mt-2.5">
            <button
              className="flex-1 flex items-center gap-2.5 py-3 px-4 rounded-[14px] border border-purple-tint-border20 bg-purple-tint-bg08 cursor-pointer"
              onClick={() => { setQuickFilters(['15min']); setScreen('discover'); }}
            >
              <span className="text-lg">{'\u26A1'}</span>
              <div className="text-left">
                <div className="text-[13px] font-semibold text-text-primary">15-Min Adventure</div>
                <div className="text-[11px] text-text-tertiary">Quick stops nearby</div>
              </div>
            </button>
            <button
              className="flex-1 flex items-center gap-2.5 py-3 px-4 rounded-[14px] border border-purple-tint-border20 bg-purple-tint-bg08 cursor-pointer"
              onClick={() => { setScreen('discover'); setTimeout(() => spinBlindDate(), 300); }}
            >
              <span className="text-lg">{'\u{1F3B2}'}</span>
              <div className="text-left">
                <div className="text-[13px] font-semibold text-text-primary">Blind Date</div>
                <div className="text-[11px] text-text-tertiary">Surprise spot</div>
              </div>
            </button>
          </div>
        </>
      )}

      {/* Plan My Day Modal */}
      {showPlanner && (
        <div
          className="fixed inset-0 bg-[rgba(0,0,0,0.6)] backdrop-blur-[8px] z-[1000] flex items-end justify-center"
          onClick={() => setShowPlanner(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-[440px] bg-bg-surface rounded-t-[24px] pt-6 px-5 pb-10 animate-[slideUp_0.3s_ease-out]"
          >
            {/* Handle */}
            <div className="w-10 h-1 rounded-sm bg-border-strong mx-auto mb-5" />

            {/* Header */}
            <div className="text-center mb-5">
              <div className="text-3xl mb-1">{'\u2728'}</div>
              <h3 className="text-xl font-bold text-text-primary mb-1">Plan My Day</h3>
              <p className="text-[13px] text-text-secondary">Answer a few questions and we'll build your perfect itinerary</p>
            </div>

            {/* Mood Picker (pick up to 2) */}
            <div className="mb-5">
              <label className="text-xs font-semibold text-text-tertiary uppercase tracking-[0.06em] block mb-2">What's the vibe? <span className="text-text-tertiary font-normal">(pick up to 2)</span></label>
              <div className="flex flex-wrap gap-2">
                {PLAN_MOODS.map(m => {
                  const selected = planMoods.includes(m.id);
                  return (
                    <button key={m.id}
                      onClick={() => togglePlanMood(m.id)}
                      className={`py-2 px-3.5 rounded-[20px] text-[13px] font-medium cursor-pointer ${
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

            {/* Duration Picker */}
            <div className="mb-5">
              <label className="text-xs font-semibold text-text-tertiary uppercase tracking-[0.06em] block mb-2">How long?</label>
              <div className="grid grid-cols-4 gap-2">
                {PLAN_DURATIONS.map(d => (
                  <button key={d.id}
                    onClick={() => setPlanDuration(d.id)}
                    className={`py-2.5 px-2 rounded-xl text-center cursor-pointer ${
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

            {/* Budget Picker */}
            <div className="mb-6">
              <label className="text-xs font-semibold text-text-tertiary uppercase tracking-[0.06em] block mb-2">Budget</label>
              <div className="flex gap-2">
                {PLAN_BUDGETS.map(b => (
                  <button key={b.value}
                    onClick={() => setPlanBudget(b.value)}
                    className={`flex-1 py-2.5 rounded-xl text-center cursor-pointer ${
                      planBudget === b.value
                        ? 'border-2 border-accent-amber bg-amber-tint-bg15'
                        : 'border border-border-medium bg-transparent'
                    }`}>
                    <div className="text-base mb-0.5">{b.emoji}</div>
                    <div className={`text-[12px] font-semibold ${planBudget === b.value ? 'text-accent-amber' : 'text-text-primary'}`}>{b.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handlePlanMyDay}
              className="w-full p-4 rounded-[14px] border-none cursor-pointer text-base font-bold shadow-[0_4px_20px_var(--amber-tint-shadow)]"
              style={{ background: `linear-gradient(135deg, var(--accent-amber), #D97706)`, color: '#0C0A09' }}
            >
              {'\u2728'} Generate My Day
            </button>

            {/* Cancel */}
            <button
              onClick={() => setShowPlanner(false)}
              className="w-full mt-2 p-3 bg-transparent border-none text-text-tertiary text-sm cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Book Your Trip */}
      {(selectedCity || useGps) && (
        <div className="mt-3">
          <BookingLinks cityName={cityLabel} />
        </div>
      )}

      {/* Saved Places */}
      {savedPlaces.length > 0 && (
        <div className="mt-5">
          <div className="flex justify-between items-center mb-2.5">
            <h2 className="text-base font-semibold">Saved for Later</h2>
            <span className="text-xs text-text-tertiary">{savedPlaces.length} places</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scroll-hidden">
            {savedPlaces.map(place => (
              <div key={place.placeId} onClick={() => setSelectedPlace(place)}
                role="button"
                tabIndex={0}
                aria-label={`View details for ${place.name}`}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedPlace(place); } }}
                className="card p-0 overflow-hidden min-w-[200px] max-w-[220px] shrink-0 cursor-pointer">
                {place.photoUrl && (
                  <div className="h-[100px] w-full relative overflow-hidden">
                    <img src={place.photoUrl} alt={place.name} loading="lazy" decoding="async"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      className="w-full h-full object-cover block" />
                    <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, transparent 50%, var(--bg-image-overlay))` }} />
                  </div>
                )}
                <div className="py-2.5 px-3">
                  <div className="text-[13px] font-semibold mb-1 truncate">
                    {place.name}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {place.rating > 0 && (
                      <span className="text-[11px] text-accent-amber">★ {place.rating.toFixed(1)}</span>
                    )}
                    {place.categoryDisplay && (
                      <span className="text-[11px] text-text-tertiary">{place.categoryDisplay}</span>
                    )}
                  </div>
                  <button onClick={e => { e.stopPropagation(); toggleSaved(place); }}
                    className="mt-2 w-full py-1.5 rounded-lg border border-red-tint-border bg-red-tint-bg text-status-red text-[11px] cursor-pointer">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
