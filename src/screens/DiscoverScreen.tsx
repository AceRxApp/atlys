import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { getCardStyle } from '../styles/shared';
import { VIBES, QUICK_FILTERS, COMMUNITY_TAGS, NIGHTLIFE_TYPES } from '../data';
import { formatDistance } from '../services/places';
import { SkeletonCard } from '../components/ui';
import PlaceCard from '../components/PlaceCard';
import { APIProvider, Map, Marker, InfoWindow } from '@vis.gl/react-google-maps';
import type { Place } from '../services/places';

// ---------------------------------------------------------------------------
// PlacesMapView (local component -- only used within DiscoverScreen)
// ---------------------------------------------------------------------------

function PlacesMapView({ places: mapPlaces }: { places: Place[] }) {
  const {
    setActiveMapPin,
    activeMapPin,
    setSelectedPlace,
    addToPlan,
    useMiles,
    MAPS_API_KEY,
    getMapCenter,
  } = useApp();

  const { theme } = useTheme();

  const center = getMapCenter();

  if (!MAPS_API_KEY) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🗺️</div>
        <p style={{ color: theme.text.secondary, fontSize: '14px', marginBottom: '8px' }}>Map view requires Google Maps API key</p>
        <p style={{ color: theme.text.muted, fontSize: '12px' }}>Set VITE_GOOGLE_MAPS_API_KEY in your environment variables and enable Maps JavaScript API in Google Cloud Console.</p>
      </div>
    );
  }

  return (
    <div style={{ height: 'calc(100vh - 280px)', borderRadius: '16px', overflow: 'hidden', border: `1px solid ${theme.border.subtle}` }}>
      <APIProvider apiKey={MAPS_API_KEY}>
        <Map
          defaultCenter={center}
          defaultZoom={14}
          gestureHandling="greedy"
          disableDefaultUI={true}
          style={{ width: '100%', height: '100%' }}
          colorScheme={theme.mapColorScheme}
        >
          {mapPlaces.filter(p => p.lat && p.lng).map(place => (
            <Marker
              key={place.placeId}
              position={{ lat: place.lat!, lng: place.lng! }}
              onClick={() => setActiveMapPin(activeMapPin === place.placeId ? null : place.placeId)}
              title={place.name}
            />
          ))}
          {activeMapPin && (() => {
            const place = mapPlaces.find(p => p.placeId === activeMapPin);
            if (!place || !place.lat || !place.lng) return null;
            return (
              <InfoWindow
                position={{ lat: place.lat, lng: place.lng }}
                onCloseClick={() => setActiveMapPin(null)}
              >
                <div style={{ padding: '4px', minWidth: '160px', color: '#1C1917' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{place.name}</div>
                  <div style={{ fontSize: '12px', color: '#57534E', marginBottom: '4px' }}>
                    {place.categoryDisplay}
                    {place.rating > 0 && ` · ★ ${place.rating.toFixed(1)}`}
                    {place.distance != null && ` · ${formatDistance(place.distance, useMiles)}`}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                    <button
                      onClick={() => { setSelectedPlace(place); setActiveMapPin(null); }}
                      style={{ flex: 1, padding: '6px', borderRadius: '6px', border: 'none', background: '#F59E0B', color: '#0C0A09', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Details
                    </button>
                    <button
                      onClick={() => { addToPlan(place); setActiveMapPin(null); }}
                      style={{ flex: 1, padding: '6px', borderRadius: '6px', border: '1px solid #D6D3D1', background: 'white', color: '#1C1917', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      + Plan
                    </button>
                  </div>
                </div>
              </InfoWindow>
            );
          })()}
        </Map>
      </APIProvider>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DiscoverScreen
// ---------------------------------------------------------------------------

export default function DiscoverScreen() {
  const {
    showNotificationPrompt,
    notificationPermission,
    selectedCity,
    requestNotificationPermission,
    dismissNotificationPrompt,
    cityLabel,
    filteredPlaces,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    handleSearch,
    isSearching,
    showSearch,
    setShowSearch,
    searchResults,
    selectedVibe,
    setSelectedVibe,
    setSearchRadius,
    quickFilters,
    setQuickFilters,
    communityFilters,
    setCommunityFilters,
    placesLoading,
    placesError,
    places,
    setSelectedPlace,
    setActiveMapPin,
    activeMapPin,
    useGps,
    loc,
    addToPlan,
    useMiles,
    MAPS_API_KEY,
    getMapCenter,
    fetchPlaces,
  } = useApp();

  const { theme } = useTheme();
  const cardStyle = getCardStyle(theme);

  return (
    <div>
      {/* Notification Permission Prompt */}
      {showNotificationPrompt && notificationPermission === 'default' && selectedCity && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '12px 14px', marginBottom: '12px', borderRadius: '12px',
          background: theme.amberTint.bg06,
          border: `1px solid ${theme.amberTint.border20}`,
        }}>
          <span style={{ fontSize: '20px', flexShrink: 0 }}>🔔</span>
          <span style={{ flex: 1, fontSize: '13px', color: theme.text.light, lineHeight: 1.4 }}>
            Stay in the loop — get notified about events near you
          </span>
          <button
            onClick={async () => { await requestNotificationPermission(); dismissNotificationPrompt(); }}
            style={{
              padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: theme.accent.amberGradient,
              color: theme.text.onAccent, fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            Enable
          </button>
          <button
            onClick={dismissNotificationPrompt}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: theme.text.tertiary, fontSize: '18px', padding: '8px', flexShrink: 0, lineHeight: 1,
              minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            aria-label="Dismiss notification prompt"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '2px' }}>
            {cityLabel} 📍
          </h1>
          <p style={{ color: theme.text.tertiary, fontSize: '13px' }}>{filteredPlaces.length} places nearby</p>
        </div>
        <div style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', border: `1px solid ${theme.border.strong}`, flexShrink: 0 }}>
          <button onClick={() => setViewMode('list')}
            aria-label="List view"
            style={{
              padding: '10px 14px', fontSize: '12px', fontWeight: 500, border: 'none', cursor: 'pointer',
              background: viewMode === 'list' ? theme.amberTint.border15 : 'transparent',
              color: viewMode === 'list' ? theme.accent.amber : theme.text.tertiary, minHeight: '44px',
            }}>
            List
          </button>
          <button onClick={() => setViewMode('map')}
            aria-label="Map view"
            style={{
              padding: '10px 14px', fontSize: '12px', fontWeight: 500, border: 'none', cursor: 'pointer',
              borderLeft: `1px solid ${theme.border.strong}`,
              background: viewMode === 'map' ? theme.amberTint.border15 : 'transparent',
              color: viewMode === 'map' ? theme.accent.amber : theme.text.tertiary, minHeight: '44px',
            }}>
            Map
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <input
          type="text"
          placeholder="Search for a place..."
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); if (!e.target.value.trim()) { setShowSearch(false); } }}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          style={{
            flex: 1, padding: '12px 16px', borderRadius: '12px',
            border: `1px solid ${theme.border.strong}`, background: theme.bg.subtle,
            color: theme.text.primary, fontSize: '14px', outline: 'none',
          }}
        />
        <button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}
          aria-label="Search"
          style={{
            padding: '12px 18px', borderRadius: '12px', border: 'none', cursor: 'pointer',
            background: searchQuery.trim() ? theme.accent.amberGradient : theme.bg.subtleStrong,
            color: searchQuery.trim() ? theme.text.onAccent : theme.text.tertiary, fontSize: '14px', fontWeight: 600,
            minHeight: '44px', minWidth: '44px',
          }}>
          {isSearching ? '...' : '🔍'}
        </button>
      </div>

      {/* Search Results Banner */}
      {showSearch && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '10px 14px', borderRadius: '10px', background: theme.amberTint.bg10, border: `1px solid ${theme.amberTint.border15}` }}>
          <span style={{ fontSize: '13px', color: theme.accent.amber, fontWeight: 500 }}>
            {searchResults.length} results for "{searchQuery}"
          </span>
          <button onClick={() => { setShowSearch(false); setSearchQuery(''); }}
            style={{ background: 'none', border: 'none', color: theme.text.tertiary, cursor: 'pointer', fontSize: '13px' }}>
            Clear
          </button>
        </div>
      )}

      {/* Vibe Chips + Filters (hidden during search) */}
      {!showSearch && (<>
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '4px', scrollbarWidth: 'none' }}>
        {VIBES.map(vibe => {
          const active = selectedVibe === vibe.id;
          return (
            <button
              key={vibe.id}
              onClick={() => {
                setSelectedVibe(active ? null : vibe.id);
                setSearchRadius(1500);
              }}
              style={{
                padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 500,
                border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                background: active ? theme.accent.amberGradient : theme.bg.subtleMedium,
                color: active ? theme.text.onAccent : theme.text.secondary,
              }}
            >
              {vibe.emoji} {vibe.label}
            </button>
          );
        })}
      </div>

      {/* Quick Filters */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '12px', scrollbarWidth: 'none' }}>
        {QUICK_FILTERS.map(filter => {
          const active = quickFilters.includes(filter.id);
          return (
            <button
              key={filter.id}
              onClick={() => setQuickFilters(active ? quickFilters.filter(f => f !== filter.id) : [...quickFilters, filter.id])}
              style={{
                padding: '6px 12px', borderRadius: '16px', fontSize: '11px', fontWeight: 500,
                border: active ? `1px solid ${theme.amberTint.border30}` : `1px solid ${theme.border.medium}`,
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                background: active ? theme.amberTint.bg15 : 'transparent',
                color: active ? theme.accent.amber : theme.text.tertiary,
              }}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Community Tags */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '4px', scrollbarWidth: 'none' }}>
        {COMMUNITY_TAGS.map(tag => {
          const active = communityFilters.includes(tag.id);
          return (
            <button key={tag.id}
              onClick={() => setCommunityFilters(active ? communityFilters.filter(f => f !== tag.id) : [...communityFilters, tag.id])}
              style={{
                padding: '6px 12px', borderRadius: '16px', fontSize: '11px', fontWeight: 500,
                border: active ? `1px solid ${theme.communityTint.border40}` : `1px solid ${theme.border.subtle}`,
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                background: active ? theme.communityTint.bg12 : 'transparent',
                color: active ? theme.community.text : theme.text.muted,
              }}>
              {tag.emoji} {tag.label}
            </button>
          );
        })}
      </div>
      </>)}

      {/* Community filter active banner */}
      {communityFilters.length > 0 && !showSearch && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', padding: '10px 14px',
          borderRadius: '10px', background: theme.communityTint.bg, border: `1px solid ${theme.communityTint.border}`,
        }}>
          <span style={{ fontSize: '14px' }}>✨</span>
          <span style={{ fontSize: '12px', color: theme.community.text, lineHeight: 1.4 }}>
            Showing results based on smart matching. Tap a place → leave a review to improve community tags!
          </span>
        </div>
      )}

      {/* Map View */}
      {viewMode === 'map' ? (
        <PlacesMapView places={showSearch ? searchResults : filteredPlaces} />
      ) : (
        <>
          {/* Search Results */}
          {showSearch ? (
            <>
              {isSearching && <><SkeletonCard /><SkeletonCard /></>}
              {!isSearching && searchResults.length === 0 && (
                <div style={{ ...cardStyle, textAlign: 'center', padding: '32px 20px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
                  <p style={{ color: theme.text.secondary, fontSize: '14px' }}>No results found. Try a different search.</p>
                </div>
              )}
              {!isSearching && searchResults.map(place => (
                <PlaceCard key={place.placeId} place={place} />
              ))}
            </>
          ) : (
            <>
              {/* Places to Stay — Booking Links */}
              {selectedVibe === 'stay' && !placesLoading && cityLabel && (
                <div style={{ ...cardStyle, marginBottom: '12px', padding: '16px 18px', background: `linear-gradient(135deg, ${theme.amberTint.bg10}, rgba(251,191,36,0.04))`, border: `1px solid ${theme.amberTint.border15}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '20px' }}>🛏️</span>
                    <span style={{ fontWeight: 600, fontSize: '15px', color: theme.text.primary }}>Find Places to Stay</span>
                  </div>
                  <p style={{ fontSize: '12px', color: theme.text.secondary, lineHeight: 1.5, margin: '0 0 12px 0' }}>
                    Browse hotels, apartments & unique stays in {cityLabel}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[
                      { label: 'Booking.com', emoji: '🏨', url: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(cityLabel)}` },
                      { label: 'Hotels.com', emoji: '⭐', url: `https://www.hotels.com/search.do?q-destination=${encodeURIComponent(cityLabel)}` },
                      { label: 'Vrbo', emoji: '🏡', url: `https://www.vrbo.com/search?destination=${encodeURIComponent(cityLabel)}` },
                    ].map(site => (
                      <a key={site.label} href={site.url} target="_blank" rel="noopener noreferrer"
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          padding: '10px 16px', borderRadius: '12px',
                          background: theme.bg.subtleStrong, border: `1px solid ${theme.border.strong}`,
                          color: theme.text.primary, fontSize: '13px', fontWeight: 500,
                          textDecoration: 'none', cursor: 'pointer',
                          transition: 'background 0.2s',
                        }}>
                        <span>{site.emoji}</span> {site.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Hidden Gems banner */}
              {selectedVibe === 'hidden' && !placesLoading && filteredPlaces.length > 0 && (
                <div style={{ ...cardStyle, marginBottom: '12px', padding: '16px 18px', background: `linear-gradient(135deg, ${theme.purpleTint.bg08}, rgba(139,92,246,0.04))`, border: `1px solid ${theme.purpleTint.border15}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '20px' }}>💎</span>
                    <span style={{ fontWeight: 600, fontSize: '15px', color: theme.text.primary }}>Hidden Gems</span>
                  </div>
                  <p style={{ fontSize: '12px', color: theme.text.secondary, lineHeight: 1.5, margin: 0 }}>
                    Off-the-beaten-path spots — parks, bookstores, spas, markets, and local favorites most tourists miss.
                  </p>
                </div>
              )}

              {/* Loading */}
              {placesLoading && <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>}

              {/* Empty: filters too strict */}
              {!placesLoading && filteredPlaces.length === 0 && places.length > 0 && (
                <div style={{ ...cardStyle, textAlign: 'center', padding: '32px 20px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
                  <p style={{ color: theme.text.secondary, fontSize: '14px', marginBottom: '12px' }}>Nothing matching. Try removing some filters.</p>
                  <button onClick={() => setQuickFilters([])}
                    style={{ background: 'none', border: `1px solid ${theme.accent.amber}`, color: theme.accent.amber, borderRadius: '10px', padding: '10px 20px', fontSize: '13px', cursor: 'pointer' }}>
                    Clear Filters
                  </button>
                </div>
              )}

              {/* Empty / Error state */}
              {!placesLoading && places.length === 0 && (
                <div style={{ ...cardStyle, textAlign: 'center', padding: '32px 20px' }}>
                  {placesError ? (
                    <>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>&#x26A0;&#xFE0F;</div>
                      <p style={{ color: theme.text.secondary, fontSize: '14px', marginBottom: '12px' }}>
                        Couldn't load places. Check your connection and try again.
                      </p>
                      <button onClick={fetchPlaces}
                        style={{ background: 'none', border: `1px solid ${theme.accent.amber}`, color: theme.accent.amber, borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                        Tap to Retry
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>&#x1F4CD;</div>
                      <p style={{ color: theme.text.secondary, fontSize: '14px' }}>
                        {(useGps || selectedCity) ? 'No places found nearby.' : 'Select a city or enable location first.'}
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Hidden Gems Horizontal Section (when not on hidden vibe) */}
              {!placesLoading && selectedVibe !== 'hidden' && (() => {
                const gems = places.filter(p => p.rating >= 4.2 && p.reviewCount > 0 && p.reviewCount < 150 && !NIGHTLIFE_TYPES.includes(p.category));
                if (gems.length === 0) return null;
                return (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        💎 Hidden Gems
                      </h3>
                      <button onClick={() => setSelectedVibe('hidden')}
                        style={{ background: 'none', border: 'none', color: theme.accent.amber, fontSize: '12px', cursor: 'pointer' }}>
                        See all →
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
                      {gems.slice(0, 8).map(place => (
                        <div key={place.placeId} onClick={() => setSelectedPlace(place)}
                          role="button"
                          tabIndex={0}
                          aria-label={`View details for ${place.name}`}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedPlace(place); } }}
                          style={{
                            ...cardStyle, padding: 0, overflow: 'hidden', minWidth: '180px', maxWidth: '200px',
                            flexShrink: 0, cursor: 'pointer',
                          }}>
                          {place.photoUrl && (
                            <div style={{
                              height: '90px', width: '100%',
                              background: `linear-gradient(to bottom, transparent 40%, ${theme.bg.imageOverlay}), url(${place.photoUrl})`,
                              backgroundSize: 'cover', backgroundPosition: 'center',
                            }} />
                          )}
                          <div style={{ padding: '10px 12px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: theme.text.primary, marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place.name}</div>
                            <div style={{ fontSize: '11px', color: theme.text.tertiary, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ color: theme.accent.amber }}>★</span> {place.rating.toFixed(1)}
                              <span style={{ margin: '0 2px' }}>·</span>
                              {place.categoryDisplay}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Place Cards */}
              {!placesLoading && filteredPlaces.map(place => (
                <PlaceCard key={place.placeId} place={place} />
              ))}

              {/* Expand Radius */}
              {!placesLoading && filteredPlaces.length > 0 && (
                <button onClick={() => setSearchRadius(prev => prev + 1500)}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '12px', marginTop: '4px',
                    background: 'none', border: `1px solid ${theme.border.medium}`,
                    color: theme.text.secondary, fontSize: '13px', cursor: 'pointer',
                  }}>
                  Search wider area →
                </button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
