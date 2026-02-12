import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { getCardStyle } from '../styles/shared';
import { LocationIcon } from '../components/icons';
import { TRAVEL_GROUPS, CITY_CULTURE } from '../data';
import type { CityContext } from '../data';

// ============================================================================
// City Search Autocomplete
// ============================================================================

interface CitySearchProps {
  cities: { id: string; name: string; country: string; region: string }[];
  selectedCity: { id: string; name: string; country: string } | null;
  loading: boolean;
  onSelect: (city: CitySearchProps['cities'][number] | null) => void;
  theme: Record<string, any>;
  cardStyle: React.CSSProperties;
}

function CitySearch({ cities, selectedCity, loading, onSelect, theme, cardStyle }: CitySearchProps) {
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
    <div ref={containerRef} style={{ ...cardStyle, position: 'relative', zIndex: open ? 999 : 'auto' }}>
      <label style={{ fontSize: '11px', color: theme.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '10px' }}>
        Search Your City
      </label>
      <div style={{ position: 'relative' }}>
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
          style={{
            width: '100%', padding: '14px 40px 14px 14px', borderRadius: '12px',
            border: `1px solid ${open ? theme.accent.amber : theme.border.strong}`,
            background: theme.bg.input, color: theme.text.primary,
            fontSize: '15px', outline: 'none',
            transition: 'border-color 0.15s',
          }}
        />
        {query && selectedCity ? (
          <button
            onClick={() => { setQuery(''); onSelect(null); setOpen(true); inputRef.current?.focus(); }}
            aria-label="Clear city"
            style={{
              position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
              color: theme.text.tertiary, fontSize: '16px', lineHeight: 1,
            }}
          >
            ✕
          </button>
        ) : (
          <div style={{
            position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
            color: theme.text.tertiary, pointerEvents: 'none',
          }}>
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
          style={{
            position: 'absolute', left: 0, right: 0, top: '100%',
            marginTop: '4px', maxHeight: '280px', overflowY: 'auto',
            borderRadius: '12px', border: `1px solid ${theme.border.strong}`,
            background: theme.bg.surface, zIndex: 50,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}
        >
          {flatList.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: theme.text.tertiary, fontSize: '13px' }}>
              No cities found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            regionOrder.map(region => (
              <div key={region}>
                <div style={{
                  padding: '8px 14px 4px', fontSize: '10px', fontWeight: 700,
                  color: theme.text.tertiary, textTransform: 'uppercase',
                  letterSpacing: '0.08em', position: 'sticky', top: 0,
                  background: theme.bg.surface, zIndex: 1,
                }}>
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
                      style={{
                        width: '100%', padding: '10px 14px', border: 'none',
                        cursor: 'pointer', textAlign: 'left',
                        display: 'flex', alignItems: 'center', gap: '10px',
                        background: isHighlighted ? theme.amberTint.bg10 : 'transparent',
                        color: theme.text.primary,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '14px', fontWeight: isSelected ? 700 : 500,
                          color: isSelected ? theme.accent.amber : theme.text.primary,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {city.name}
                        </div>
                        <div style={{ fontSize: '11px', color: theme.text.tertiary }}>
                          {city.country}
                        </div>
                      </div>
                      {isSelected && (
                        <span style={{ color: theme.accent.amber, fontSize: '14px', flexShrink: 0 }}>✓</span>
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
    loading,
  } = useApp();
  const { theme } = useTheme();
  const cardStyle = getCardStyle(theme);
  const [bannerFailed, setBannerFailed] = useState(false);

  // Reset banner state when city changes
  useEffect(() => { setBannerFailed(false); }, [selectedCity?.id]);

  return (
    <div>
      {/* Greeting */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '4px' }}>
          {getGreeting()} ✨
        </h1>
        <p style={{ color: theme.text.secondary, fontSize: '14px' }}>{getTimeSuggestion()}</p>
      </div>

      {/* Weather Card */}
      {weather && (selectedCity || useGps) && (
        <div style={{
          ...cardStyle, display: 'flex', alignItems: 'center', gap: '14px',
          background: `linear-gradient(135deg, ${theme.blueTint.bg}, rgba(147,197,253,0.04))`,
          border: `1px solid ${theme.blueTint.border}`,
        }}>
          <span style={{ fontSize: '36px' }}>{weather.emoji}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '22px', fontWeight: 700, color: theme.text.primary }}>
              {weather.temp}°F
            </div>
            <div style={{ fontSize: '12px', color: theme.status.blue }}>{weather.description}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', color: theme.text.secondary }}>H: {weather.high}° L: {weather.low}°</div>
            <div style={{ fontSize: '11px', color: theme.text.tertiary }}>{cityLabel}</div>
          </div>
        </div>
      )}

      {/* GPS Card */}
      {loc.hasLocation && (
        <button
          onClick={() => { setUseGps(true); setSelectedCity(null); setScreen('discover'); }}
          style={{
            ...cardStyle, width: '100%', cursor: 'pointer', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: '14px',
            border: useGps ? `2px solid ${theme.accent.amber}` : `1px solid ${theme.border.subtle}`,
            background: useGps ? theme.amberTint.bg10 : theme.bg.surfaceAlpha,
          }}
        >
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: theme.accent.amberGradient,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <LocationIcon />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '15px', color: theme.text.primary }}>{loc.city || 'Near You'}</div>
            <div style={{ fontSize: '12px', color: theme.text.secondary }}>Use your current location</div>
          </div>
          <div style={{ marginLeft: 'auto', color: theme.accent.amber, fontSize: '20px' }}>→</div>
        </button>
      )}

      {/* Divider */}
      {loc.hasLocation && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0' }}>
          <div style={{ flex: 1, height: '1px', background: theme.border.subtle }} />
          <span style={{ fontSize: '12px', color: theme.text.tertiary }}>or pick a city</span>
          <div style={{ flex: 1, height: '1px', background: theme.border.subtle }} />
        </div>
      )}

      {/* City Search */}
      <CitySearch
        cities={cities}
        selectedCity={selectedCity}
        loading={loading}
        onSelect={(city) => { setSelectedCity(city); setUseGps(false); }}
        theme={theme}
        cardStyle={cardStyle}
      />

      {/* City Banner */}
      {selectedCity && (
        <div style={{ ...cardStyle, padding: 0, overflow: 'hidden', marginTop: '4px', position: 'relative', zIndex: 1 }}>
          <div style={{ height: '140px', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '16px' }}>
            {selectedCity.banner_url && !bannerFailed ? (
              <>
                <img src={selectedCity.banner_url} alt={selectedCity.name} loading="lazy" decoding="async"
                  onError={() => setBannerFailed(true)}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.7))' }} />
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
                  <div style={{ position: 'absolute', inset: 0, background: grad }} />
                  <div style={{ position: 'absolute', top: '12px', right: '16px', fontSize: '36px', opacity: 0.3 }}>{emoji}</div>
                </>
              );
            })()}
            <h2 style={{ fontSize: '22px', fontWeight: 700, position: 'relative', zIndex: 1 }}>{selectedCity.name}</h2>
            <p style={{ color: theme.text.body, fontSize: '13px', position: 'relative', zIndex: 1 }}>{selectedCity.country}</p>
          </div>
        </div>
      )}

      {/* Travel Group Selector */}
      {(selectedCity || useGps) && (
        <div style={{ ...cardStyle, marginTop: '8px', position: 'relative', zIndex: 1 }}>
          <label style={{ fontSize: '11px', color: theme.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '10px' }}>
            Who&apos;s traveling?
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {TRAVEL_GROUPS.map(g => {
              const active = travelGroup === g.id;
              return (
                <button key={g.id}
                  aria-pressed={active}
                  onClick={() => setTravelGroup(active ? null : g.id)}
                  style={{
                    padding: '8px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 500,
                    border: active ? `1px solid ${theme.amberTint.border40}` : `1px solid ${theme.border.medium}`,
                    cursor: 'pointer', background: active ? theme.amberTint.bg15 : 'transparent',
                    color: active ? theme.accent.amber : theme.text.secondary,
                  }}>
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
          <div style={{ ...cardStyle, marginTop: '8px' }}>
            <button
              onClick={() => setShowCulture(!showCulture)}
              style={{
                width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: 0, color: theme.text.primary,
              }}>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>Cultural Tips</span>
              <span style={{ color: theme.text.tertiary, fontSize: '16px', transform: showCulture ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
            </button>
            {showCulture && (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { emoji: '💰', label: 'Tipping', value: culture.tipping },
                  { emoji: '👔', label: 'Dress', value: culture.dress },
                  { emoji: '🗣️', label: 'Language', value: culture.language },
                  { emoji: '🤝', label: 'Etiquette', value: culture.etiquette },
                  { emoji: '💵', label: 'Currency', value: culture.currency },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '16px', flexShrink: 0, width: '24px', textAlign: 'center' }}>{row.emoji}</span>
                    <div>
                      <div style={{ fontSize: '11px', color: theme.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>{row.label}</div>
                      <div style={{ fontSize: '13px', color: theme.text.body, lineHeight: 1.4 }}>{row.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Quick Actions */}
      {(selectedCity || useGps) && (
        <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
          <button
            style={{
              flex: 1, background: theme.accent.amberGradient,
              color: theme.text.onAccent, border: 'none', borderRadius: '14px',
              padding: '16px', fontSize: '16px', fontWeight: 600,
              cursor: 'pointer',
              boxShadow: `0 4px 20px ${theme.amberTint.shadow}`,
            }}
            onClick={() => setScreen('discover')}
          >
            Start Exploring →
          </button>
          <button
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: '2px', padding: '12px 18px', borderRadius: '14px',
              border: `1.5px solid ${theme.accent.amber}`,
              background: theme.amberTint.bg10, color: theme.accent.amber,
              cursor: 'pointer', flexShrink: 0,
            }}
            onClick={() => { setSelectedVibe('food'); setScreen('discover'); }}
            aria-label="Find food near me"
          >
            <span style={{ fontSize: '20px' }}>🍽️</span>
            <span style={{ fontSize: '11px', fontWeight: 600 }}>Near Me</span>
          </button>
        </div>
      )}

      {/* Saved Places */}
      {savedPlaces.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Saved for Later</h2>
            <span style={{ fontSize: '12px', color: theme.text.tertiary }}>{savedPlaces.length} places</span>
          </div>
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
            {savedPlaces.map(place => (
              <div key={place.placeId} onClick={() => setSelectedPlace(place)}
                role="button"
                tabIndex={0}
                aria-label={`View details for ${place.name}`}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedPlace(place); } }}
                style={{
                  ...cardStyle, padding: 0, overflow: 'hidden', minWidth: '200px', maxWidth: '220px',
                  flexShrink: 0, cursor: 'pointer',
                }}>
                {place.photoUrl && (
                  <div style={{ height: '100px', width: '100%', position: 'relative', overflow: 'hidden' }}>
                    <img src={place.photoUrl} alt={place.name} loading="lazy" decoding="async"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, transparent 50%, ${theme.bg.imageOverlay})` }} />
                  </div>
                )}
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {place.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {place.rating > 0 && (
                      <span style={{ fontSize: '11px', color: theme.accent.amber }}>★ {place.rating.toFixed(1)}</span>
                    )}
                    {place.categoryDisplay && (
                      <span style={{ fontSize: '11px', color: theme.text.tertiary }}>{place.categoryDisplay}</span>
                    )}
                  </div>
                  <button onClick={e => { e.stopPropagation(); toggleSaved(place); }}
                    style={{
                      marginTop: '8px', width: '100%', padding: '6px', borderRadius: '8px',
                      border: `1px solid ${theme.redTint.border}`, background: theme.redTint.bg,
                      color: theme.status.red, fontSize: '11px', cursor: 'pointer',
                    }}>
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
