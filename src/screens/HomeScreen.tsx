import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { getCardStyle } from '../styles/shared';
import { LocationIcon } from '../components/icons';
import { TRAVEL_GROUPS, CITY_CULTURE } from '../data';
import type { CityContext } from '../data';

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
  } = useApp();
  const { theme } = useTheme();
  const cardStyle = getCardStyle(theme);

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

      {/* City Selector */}
      <div style={cardStyle}>
        <label style={{ fontSize: '11px', color: theme.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '10px' }}>
          Select Your City
        </label>
        <select
          style={{
            width: '100%', padding: '14px', borderRadius: '12px',
            border: `1px solid ${theme.border.strong}`, background: theme.bg.input,
            color: theme.text.primary, fontSize: '15px', cursor: 'pointer',
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
            <option key={city.id} value={city.id}>{city.name}, {city.country}</option>
          ))}
        </select>
      </div>

      {/* City Banner */}
      {selectedCity && (
        <div style={{ ...cardStyle, padding: 0, overflow: 'hidden', marginTop: '4px' }}>
          <div style={{
            height: '140px',
            background: selectedCity.banner_url
              ? `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.7)), url(${selectedCity.banner_url})`
              : `linear-gradient(135deg, ${theme.bg.surface} 0%, ${theme.bg.elevated} 100%)`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '16px',
          }}>
            <h2 style={{ fontSize: '22px', fontWeight: 700 }}>{selectedCity.name}</h2>
            <p style={{ color: theme.text.body, fontSize: '13px' }}>{selectedCity.country}</p>
          </div>
        </div>
      )}

      {/* Travel Group Selector */}
      {(selectedCity || useGps) && (
        <div style={{ ...cardStyle, marginTop: '8px' }}>
          <label style={{ fontSize: '11px', color: theme.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '10px' }}>
            Who&apos;s traveling?
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {TRAVEL_GROUPS.map(g => {
              const active = travelGroup === g.id;
              return (
                <button key={g.id} onClick={() => setTravelGroup(active ? null : g.id)}
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

      {/* Start Exploring */}
      {(selectedCity || useGps) && (
        <button
          style={{
            background: theme.accent.amberGradient,
            color: theme.text.onAccent, border: 'none', borderRadius: '14px',
            padding: '16px', fontSize: '16px', fontWeight: 600,
            cursor: 'pointer', width: '100%', marginTop: '12px',
            boxShadow: `0 4px 20px ${theme.amberTint.shadow}`,
          }}
          onClick={() => setScreen('discover')}
        >
          Start Exploring →
        </button>
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
                  <div style={{
                    height: '100px', width: '100%',
                    background: `linear-gradient(to bottom, transparent 50%, ${theme.bg.imageOverlay}), url(${place.photoUrl})`,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                  }} />
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
