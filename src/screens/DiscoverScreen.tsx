import { useApp } from '../context/AppContext';
import { cardStyle } from '../styles/shared';
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

  const center = getMapCenter();

  if (!MAPS_API_KEY) {
    return (
      <div style={{ ...cardStyle, textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🗺️</div>
        <p style={{ color: '#A8A29E', fontSize: '14px', marginBottom: '8px' }}>Map view requires Google Maps API key</p>
        <p style={{ color: '#57534E', fontSize: '12px' }}>Set VITE_GOOGLE_MAPS_API_KEY in your environment variables and enable Maps JavaScript API in Google Cloud Console.</p>
      </div>
    );
  }

  return (
    <div style={{ height: 'calc(100vh - 280px)', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
      <APIProvider apiKey={MAPS_API_KEY}>
        <Map
          defaultCenter={center}
          defaultZoom={14}
          gestureHandling="greedy"
          disableDefaultUI={true}
          style={{ width: '100%', height: '100%' }}
          colorScheme="DARK"
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
  } = useApp();

  return (
    <div>
      {/* Notification Permission Prompt */}
      {showNotificationPrompt && notificationPermission === 'default' && selectedCity && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '12px 14px', marginBottom: '12px', borderRadius: '12px',
          background: 'rgba(245,158,11,0.06)',
          border: '1px solid rgba(245,158,11,0.2)',
        }}>
          <span style={{ fontSize: '20px', flexShrink: 0 }}>🔔</span>
          <span style={{ flex: 1, fontSize: '13px', color: '#D6D3D1', lineHeight: 1.4 }}>
            Stay in the loop — get notified about events near you
          </span>
          <button
            onClick={async () => { await requestNotificationPermission(); dismissNotificationPrompt(); }}
            style={{
              padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #F59E0B, #D97706)',
              color: '#0C0A09', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            Enable
          </button>
          <button
            onClick={dismissNotificationPrompt}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#78716C', fontSize: '18px', padding: '8px', flexShrink: 0, lineHeight: 1,
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
          <p style={{ color: '#78716C', fontSize: '13px' }}>{filteredPlaces.length} places nearby</p>
        </div>
        <div style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
          <button onClick={() => setViewMode('list')}
            aria-label="List view"
            style={{
              padding: '10px 14px', fontSize: '12px', fontWeight: 500, border: 'none', cursor: 'pointer',
              background: viewMode === 'list' ? 'rgba(245,158,11,0.15)' : 'transparent',
              color: viewMode === 'list' ? '#F59E0B' : '#78716C', minHeight: '44px',
            }}>
            List
          </button>
          <button onClick={() => setViewMode('map')}
            aria-label="Map view"
            style={{
              padding: '10px 14px', fontSize: '12px', fontWeight: 500, border: 'none', cursor: 'pointer',
              borderLeft: '1px solid rgba(255,255,255,0.1)',
              background: viewMode === 'map' ? 'rgba(245,158,11,0.15)' : 'transparent',
              color: viewMode === 'map' ? '#F59E0B' : '#78716C', minHeight: '44px',
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
            border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
            color: '#FFFBEB', fontSize: '14px', outline: 'none',
          }}
        />
        <button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}
          aria-label="Search"
          style={{
            padding: '12px 18px', borderRadius: '12px', border: 'none', cursor: 'pointer',
            background: searchQuery.trim() ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'rgba(255,255,255,0.06)',
            color: searchQuery.trim() ? '#0C0A09' : '#78716C', fontSize: '14px', fontWeight: 600,
            minHeight: '44px', minWidth: '44px',
          }}>
          {isSearching ? '...' : '🔍'}
        </button>
      </div>

      {/* Search Results Banner */}
      {showSearch && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
          <span style={{ fontSize: '13px', color: '#F59E0B', fontWeight: 500 }}>
            {searchResults.length} results for "{searchQuery}"
          </span>
          <button onClick={() => { setShowSearch(false); setSearchQuery(''); }}
            style={{ background: 'none', border: 'none', color: '#78716C', cursor: 'pointer', fontSize: '13px' }}>
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
                background: active ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'rgba(255,255,255,0.05)',
                color: active ? '#0C0A09' : '#A8A29E',
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
                border: active ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                background: active ? 'rgba(245,158,11,0.12)' : 'transparent',
                color: active ? '#F59E0B' : '#78716C',
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
                border: active ? '1px solid rgba(212,165,116,0.4)' : '1px solid rgba(255,255,255,0.06)',
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                background: active ? 'rgba(212,165,116,0.12)' : 'transparent',
                color: active ? '#D4A574' : '#57534E',
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
          borderRadius: '10px', background: 'rgba(212,165,116,0.08)', border: '1px solid rgba(212,165,116,0.15)',
        }}>
          <span style={{ fontSize: '14px' }}>✨</span>
          <span style={{ fontSize: '12px', color: '#D4A574', lineHeight: 1.4 }}>
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
                  <p style={{ color: '#A8A29E', fontSize: '14px' }}>No results found. Try a different search.</p>
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
                <div style={{ ...cardStyle, marginBottom: '12px', padding: '16px 18px', background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(251,191,36,0.04))', border: '1px solid rgba(245,158,11,0.15)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '20px' }}>🛏️</span>
                    <span style={{ fontWeight: 600, fontSize: '15px', color: '#FFFBEB' }}>Find Places to Stay</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#A8A29E', lineHeight: 1.5, margin: '0 0 12px 0' }}>
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
                          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                          color: '#FFFBEB', fontSize: '13px', fontWeight: 500,
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
                <div style={{ ...cardStyle, marginBottom: '12px', padding: '16px 18px', background: 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(139,92,246,0.04))', border: '1px solid rgba(168,85,247,0.15)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '20px' }}>💎</span>
                    <span style={{ fontWeight: 600, fontSize: '15px', color: '#FFFBEB' }}>Hidden Gems</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#A8A29E', lineHeight: 1.5, margin: 0 }}>
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
                  <p style={{ color: '#A8A29E', fontSize: '14px', marginBottom: '12px' }}>Nothing matching. Try removing some filters.</p>
                  <button onClick={() => setQuickFilters([])}
                    style={{ background: 'none', border: '1px solid #F59E0B', color: '#F59E0B', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', cursor: 'pointer' }}>
                    Clear Filters
                  </button>
                </div>
              )}

              {/* Empty: no results at all */}
              {!placesLoading && places.length === 0 && (
                <div style={{ ...cardStyle, textAlign: 'center', padding: '32px 20px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📍</div>
                  <p style={{ color: '#A8A29E', fontSize: '14px' }}>
                    {(useGps || selectedCity) ? 'Loading places...' : 'Select a city or enable location first.'}
                  </p>
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
                        style={{ background: 'none', border: 'none', color: '#F59E0B', fontSize: '12px', cursor: 'pointer' }}>
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
                              background: `linear-gradient(to bottom, transparent 40%, rgba(12,10,9,0.9)), url(${place.photoUrl})`,
                              backgroundSize: 'cover', backgroundPosition: 'center',
                            }} />
                          )}
                          <div style={{ padding: '10px 12px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#FFFBEB', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place.name}</div>
                            <div style={{ fontSize: '11px', color: '#78716C', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ color: '#F59E0B' }}>★</span> {place.rating.toFixed(1)}
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
                    background: 'none', border: '1px solid rgba(255,255,255,0.08)',
                    color: '#A8A29E', fontSize: '13px', cursor: 'pointer',
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
