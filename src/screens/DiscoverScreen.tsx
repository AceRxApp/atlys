import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { VIBES, QUICK_FILTERS, SMART_FILTERS, COMMUNITY_TAGS, NIGHTLIFE_TYPES } from '../data';
import { formatDistance, isChain } from '../services/places';
import { SkeletonCard } from '../components/ui';
import PlaceCard from '../components/PlaceCard';
import { APIProvider, Map, Marker, InfoWindow } from '@vis.gl/react-google-maps';
import type { Place } from '../services/places';

const STOP_CATEGORIES = [
  { id: 'cafe', emoji: '\u{2615}', label: 'Cafe' },
  { id: 'restaurant', emoji: '\u{1F37D}\u{FE0F}', label: 'Restaurant' },
  { id: 'bar', emoji: '\u{1F378}', label: 'Bar' },
  { id: 'park', emoji: '\u{1F333}', label: 'Park' },
  { id: 'viewpoint', emoji: '\u{1F304}', label: 'Viewpoint' },
  { id: 'market', emoji: '\u{1F6D2}', label: 'Market' },
  { id: 'art', emoji: '\u{1F3A8}', label: 'Art / Gallery' },
  { id: 'shop', emoji: '\u{1F6CD}\u{FE0F}', label: 'Shop' },
  { id: 'landmark', emoji: '\u{1F3DB}\u{FE0F}', label: 'Landmark' },
  { id: 'food_truck', emoji: '\u{1F69A}', label: 'Food Truck' },
  { id: 'street_art', emoji: '\u{1F5BC}\u{FE0F}', label: 'Street Art' },
  { id: 'other', emoji: '\u{2728}', label: 'Other' },
];

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
      <div className="text-center py-10 px-5">
        <div className="text-[32px] mb-2">🗺️</div>
        <p className="text-text-secondary text-sm mb-2">Map view requires Google Maps API key</p>
        <p className="text-text-muted text-xs">Set VITE_GOOGLE_MAPS_API_KEY in your environment variables and enable Maps JavaScript API in Google Cloud Console.</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-280px)] rounded-2xl overflow-hidden border border-border-subtle">
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
                <div className="p-1 min-w-[160px] text-[#1C1917]">
                  <div className="font-bold text-sm mb-1">{place.name}</div>
                  <div className="text-xs text-[#57534E] mb-1">
                    {place.categoryDisplay}
                    {place.rating > 0 && ` · ★ ${place.rating.toFixed(1)}`}
                    {place.distance != null && ` · ${formatDistance(place.distance, useMiles)}`}
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    <button
                      onClick={() => { setSelectedPlace(place); setActiveMapPin(null); }}
                      className="flex-1 p-1.5 rounded-md border-none bg-[#F59E0B] text-[#0C0A09] text-[11px] font-semibold cursor-pointer"
                    >
                      Details
                    </button>
                    <button
                      onClick={() => { addToPlan(place); setActiveMapPin(null); }}
                      className="flex-1 p-1.5 rounded-md border border-[#D6D3D1] bg-white text-[#1C1917] text-[11px] font-semibold cursor-pointer"
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
    weather,
    forYouPlaces,
    blindDatePlace,
    blindDateRevealed,
    spinBlindDate,
    revealBlindDate,
    dismissBlindDate,
    userStops,
    showPinStop,
    setShowPinStop,
    pinStopSubmitting,
    submitPinStop,
    user,
    requireAuth,
  } = useApp();

  // Pin a Stop form state
  const [pinName, setPinName] = useState('');
  const [pinDescription, setPinDescription] = useState('');
  const [pinCategory, setPinCategory] = useState('cafe');
  const [pinLat, setPinLat] = useState('');
  const [pinLng, setPinLng] = useState('');

  const { theme } = useTheme();

  // Contextual smart filter visibility
  const currentHour = new Date().getHours();
  const isLateNight = currentHour >= 21 || currentHour <= 4;
  const isRainy = weather && weather.code >= 51 && weather.code <= 99;
  const isGoldenHour = (() => {
    if (!weather?.sunset) return false;
    const now = Date.now();
    const sunset = new Date(weather.sunset).getTime();
    const diff = sunset - now;
    return diff > 0 && diff <= 90 * 60 * 1000; // Within 1.5 hours of sunset
  })();

  const visibleSmartFilters = SMART_FILTERS.filter(f => {
    if (f.id === 'lateNight') return isLateNight;
    if (f.id === 'rainyDay') return isRainy;
    if (f.id === 'goldenHour') return isGoldenHour;
    return true; // 15min always shows
  });

  return (
    <div>
      {/* Notification Permission Prompt */}
      {showNotificationPrompt && notificationPermission === 'default' && selectedCity && (
        <div className="flex items-center gap-2.5 px-3.5 py-3 mb-3 rounded-xl bg-amber-tint-bg06 border border-amber-tint-border20">
          <span className="text-xl shrink-0">🔔</span>
          <span className="flex-1 text-[13px] text-text-light leading-[1.4]">
            Stay in the loop — get notified about events near you
          </span>
          <button
            onClick={async () => { await requestNotificationPermission(); dismissNotificationPrompt(); }}
            className="bg-accent-gradient text-text-on-accent text-xs font-semibold px-3.5 py-1.5 rounded-lg border-none cursor-pointer whitespace-nowrap shrink-0"
          >
            Enable
          </button>
          <button
            onClick={dismissNotificationPrompt}
            className="bg-none border-none cursor-pointer text-text-tertiary text-lg p-2 shrink-0 leading-none min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Dismiss notification prompt"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-3 flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold mb-0.5">
            {cityLabel} 📍
          </h1>
          <p className="text-text-tertiary text-[13px]">{filteredPlaces.length} places nearby</p>
        </div>
        <div className="flex rounded-[10px] overflow-hidden border border-border-strong shrink-0">
          <button onClick={() => setViewMode('list')}
            aria-label="List view"
            aria-pressed={viewMode === 'list'}
            className={`py-2.5 px-3.5 text-xs font-medium border-none cursor-pointer min-h-[44px] ${
              viewMode === 'list' ? 'bg-amber-tint-border15 text-accent-amber' : 'bg-transparent text-text-tertiary'
            }`}>
            List
          </button>
          <button onClick={() => setViewMode('map')}
            aria-label="Map view"
            aria-pressed={viewMode === 'map'}
            className={`py-2.5 px-3.5 text-xs font-medium border-none cursor-pointer min-h-[44px] border-l border-border-strong ${
              viewMode === 'map' ? 'bg-amber-tint-border15 text-accent-amber' : 'bg-transparent text-text-tertiary'
            }`}>
            Map
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder="Search for a place..."
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); if (!e.target.value.trim()) { setShowSearch(false); } }}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          className="input-field flex-1"
        />
        <button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}
          aria-label="Search"
          className={`py-3 px-[18px] rounded-xl border-none cursor-pointer text-sm font-semibold min-h-[44px] min-w-[44px] ${
            searchQuery.trim() ? 'bg-accent-gradient text-text-on-accent' : 'bg-bg-subtle-strong text-text-tertiary'
          }`}>
          {isSearching ? '...' : '🔍'}
        </button>
      </div>

      {/* Search Results Banner */}
      {showSearch && (
        <div className="flex justify-between items-center mb-3 px-3.5 py-2.5 rounded-[10px] bg-amber-tint-bg10 border border-amber-tint-border15">
          <span className="text-[13px] text-accent-amber font-medium">
            {searchResults.length} results for "{searchQuery}"
          </span>
          <button onClick={() => { setShowSearch(false); setSearchQuery(''); }}
            className="bg-none border-none text-text-tertiary cursor-pointer text-[13px]">
            Clear
          </button>
        </div>
      )}

      {/* Vibe Chips + Filters (hidden during search) */}
      {!showSearch && (<>
      <div className="flex gap-2 overflow-x-auto pb-2.5 mb-1 scroll-hidden">
        {VIBES.map(vibe => {
          const active = selectedVibe === vibe.id;
          return (
            <button
              key={vibe.id}
              aria-pressed={active}
              onClick={() => {
                setSelectedVibe(active ? null : vibe.id);
                setSearchRadius(1500);
              }}
              className={`chip ${
                active ? 'bg-accent-gradient text-text-on-accent' : 'bg-bg-subtle-medium text-text-secondary'
              }`}
            >
              {vibe.emoji} {vibe.label}
            </button>
          );
        })}
      </div>

      {/* Smart Picks — Blind Date + contextual filters */}
      <div className="flex gap-2 overflow-x-auto pb-2.5 mb-1 scroll-hidden">
        <button
          onClick={spinBlindDate}
          className="py-1.5 px-3.5 rounded-2xl text-[11px] font-semibold cursor-pointer whitespace-nowrap shrink-0 border border-purple-tint-border20 bg-purple-tint-bg08 text-purple-tint-text"
        >
          {'\u{1F3B2}'} Blind Date
        </button>
        {visibleSmartFilters.map(filter => {
          const active = quickFilters.includes(filter.id);
          return (
            <button
              key={filter.id}
              aria-pressed={active}
              onClick={() => setQuickFilters(active ? quickFilters.filter(f => f !== filter.id) : [...quickFilters, filter.id])}
              className={`py-1.5 px-3.5 rounded-2xl text-[11px] font-semibold cursor-pointer whitespace-nowrap shrink-0 ${
                active
                  ? 'border border-purple-tint-border30 bg-purple-tint-bg15 text-purple-tint-text'
                  : 'border border-purple-tint-border20 bg-purple-tint-bg08 text-purple-tint-text'
              }`}
            >
              {filter.emoji} {filter.label}
            </button>
          );
        })}
      </div>

      {/* Quick Filters */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-3 scroll-hidden">
        {QUICK_FILTERS.map(filter => {
          const active = quickFilters.includes(filter.id);
          return (
            <button
              key={filter.id}
              aria-pressed={active}
              onClick={() => setQuickFilters(active ? quickFilters.filter(f => f !== filter.id) : [...quickFilters, filter.id])}
              className={`py-1.5 px-3 rounded-2xl text-[11px] font-medium cursor-pointer whitespace-nowrap shrink-0 ${
                active
                  ? 'border border-amber-tint-border30 bg-amber-tint-bg15 text-accent-amber'
                  : 'border border-border-medium bg-transparent text-text-tertiary'
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Community Tags */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-1 scroll-hidden">
        {COMMUNITY_TAGS.map(tag => {
          const active = communityFilters.includes(tag.id);
          return (
            <button key={tag.id}
              aria-pressed={active}
              aria-label={`Filter by ${tag.label}`}
              onClick={() => setCommunityFilters(active ? communityFilters.filter(f => f !== tag.id) : [...communityFilters, tag.id])}
              className={`py-1.5 px-3 rounded-2xl text-[11px] font-medium cursor-pointer whitespace-nowrap shrink-0 ${
                active
                  ? 'border border-community-tint-border40 bg-community-tint-bg12 text-community-text'
                  : 'border border-border-subtle bg-transparent text-text-muted'
              }`}>
              {tag.emoji} {tag.label}
            </button>
          );
        })}
      </div>
      </>)}

      {/* Community filter active banner */}
      {communityFilters.length > 0 && !showSearch && (
        <div className="flex items-center gap-2 mb-2.5 px-3.5 py-2.5 rounded-[10px] bg-community-tint-bg border border-community-tint-border">
          <span className="text-sm">✨</span>
          <span className="text-xs text-community-text leading-[1.4]">
            Showing results based on smart matching. Tap a place → leave a review to improve community tags!
          </span>
        </div>
      )}

      {/* Blind Date Mystery Card */}
      {blindDatePlace && (
        <div className="card mb-3 px-[18px] py-4 relative overflow-hidden" style={{ background: `linear-gradient(135deg, var(--purple-tint-bg08), rgba(139,92,246,0.04))`, border: `1px solid var(--purple-tint-border15)` }}>
          <button
            onClick={dismissBlindDate}
            className="absolute top-2 right-2 bg-none border-none text-text-tertiary cursor-pointer text-base p-2 leading-none"
            aria-label="Dismiss blind date"
          >
            {'\u2715'}
          </button>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="text-xl">{'\u{1F3B2}'}</span>
            <span className="font-semibold text-[15px] text-text-primary">Blind Date Stop</span>
          </div>
          {!blindDateRevealed ? (
            <>
              <div className="flex items-center gap-4 mb-3">
                <div className="w-16 h-16 rounded-xl bg-purple-tint-bg15 flex items-center justify-center text-2xl">?</div>
                <div>
                  <div className="text-sm text-text-secondary mb-1">{blindDatePlace.categoryDisplay}</div>
                  <div className="flex items-center gap-2 text-xs text-text-tertiary">
                    <span className="text-accent-amber">{'\u2605'} {blindDatePlace.rating.toFixed(1)}</span>
                    <span>{'\u00B7'}</span>
                    <span>{formatDistance(blindDatePlace.distance ?? 0, useMiles)}</span>
                    {blindDatePlace.priceLevel > 0 && (
                      <><span>{'\u00B7'}</span><span>{'$'.repeat(blindDatePlace.priceLevel)}</span></>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={revealBlindDate}
                  className="flex-1 py-2.5 rounded-xl border-none bg-accent-gradient text-text-on-accent text-sm font-semibold cursor-pointer"
                >
                  Reveal & Go
                </button>
                <button
                  onClick={spinBlindDate}
                  className="py-2.5 px-4 rounded-xl border border-border-medium bg-transparent text-text-secondary text-sm cursor-pointer"
                >
                  Re-spin
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-3">
                {blindDatePlace.photoUrl && (
                  <div className="w-16 h-16 rounded-xl bg-cover bg-center shrink-0"
                    style={{ backgroundImage: `url(${blindDatePlace.photoUrl})` }} />
                )}
                <div>
                  <div className="text-[15px] font-bold text-text-primary mb-0.5">{blindDatePlace.name}</div>
                  <div className="text-sm text-text-secondary">{blindDatePlace.categoryDisplay}</div>
                  <div className="flex items-center gap-2 text-xs text-text-tertiary mt-0.5">
                    <span className="text-accent-amber">{'\u2605'} {blindDatePlace.rating.toFixed(1)}</span>
                    <span>{'\u00B7'}</span>
                    <span>{formatDistance(blindDatePlace.distance ?? 0, useMiles)}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setSelectedPlace(blindDatePlace); dismissBlindDate(); }}
                  className="flex-1 py-2.5 rounded-xl border-none bg-accent-gradient text-text-on-accent text-sm font-semibold cursor-pointer"
                >
                  View Details
                </button>
                <button
                  onClick={() => { addToPlan(blindDatePlace); dismissBlindDate(); }}
                  className="py-2.5 px-4 rounded-xl border border-border-medium bg-transparent text-text-secondary text-sm cursor-pointer"
                >
                  + Plan
                </button>
              </div>
            </>
          )}
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
                <div className="card text-center py-8 px-5">
                  <div className="text-[32px] mb-2">🔍</div>
                  <p className="text-text-secondary text-sm">No results found. Try a different search.</p>
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
                <div className="card mb-3 px-[18px] py-4" style={{ background: `linear-gradient(135deg, var(--amber-tint-bg10), rgba(251,191,36,0.04))`, border: `1px solid var(--amber-tint-border15)` }}>
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="text-xl">🛏️</span>
                    <span className="font-semibold text-[15px] text-text-primary">Find Places to Stay</span>
                  </div>
                  <p className="text-xs text-text-secondary leading-[1.5] mb-3">
                    Browse hotels, apartments & unique stays in {cityLabel}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { label: 'Booking.com', emoji: '🏨', url: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(cityLabel)}` },
                      { label: 'Hotels.com', emoji: '⭐', url: `https://www.hotels.com/search.do?q-destination=${encodeURIComponent(cityLabel)}` },
                      { label: 'Vrbo', emoji: '🏡', url: `https://www.vrbo.com/search?destination=${encodeURIComponent(cityLabel)}` },
                    ].map(site => (
                      <a key={site.label} href={site.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 py-2.5 px-4 rounded-xl bg-bg-subtle-strong border border-border-strong text-text-primary text-[13px] font-medium no-underline cursor-pointer">
                        <span>{site.emoji}</span> {site.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Hidden Gems banner */}
              {selectedVibe === 'hidden' && !placesLoading && filteredPlaces.length > 0 && (
                <div className="card mb-3 px-[18px] py-4" style={{ background: `linear-gradient(135deg, var(--purple-tint-bg08), rgba(139,92,246,0.04))`, border: `1px solid var(--purple-tint-border15)` }}>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="text-xl">💎</span>
                    <span className="font-semibold text-[15px] text-text-primary">Hidden Gems</span>
                  </div>
                  <p className="text-xs text-text-secondary leading-[1.5] m-0">
                    Highly-rated spots most people don't know about — no chains, no tourist traps. The kind of places only locals would take you.
                  </p>
                </div>
              )}

              {/* Locals banner */}
              {selectedVibe === 'locals' && !placesLoading && filteredPlaces.length > 0 && (
                <div className="card mb-3 px-[18px] py-4" style={{ background: `linear-gradient(135deg, var(--green-tint-bg), rgba(34,197,94,0.04))`, border: `1px solid var(--green-tint-border)` }}>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="text-xl">🌻</span>
                    <span className="font-semibold text-[15px] text-text-primary">Locals</span>
                  </div>
                  <p className="text-xs text-text-secondary leading-[1.5] m-0">
                    Neighborhood favorites — bakeries, flower shops, bookstores, markets, and the charming spots locals love.
                  </p>
                </div>
              )}

              {/* Loading */}
              {placesLoading && <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>}

              {/* Empty: filters too strict */}
              {!placesLoading && filteredPlaces.length === 0 && places.length > 0 && (
                <div className="card text-center py-8 px-5">
                  <div className="text-[32px] mb-2">🔍</div>
                  <p className="text-text-secondary text-sm mb-3">Nothing matching. Try removing some filters.</p>
                  <button onClick={() => setQuickFilters([])}
                    className="bg-none border border-accent-amber text-accent-amber rounded-[10px] py-2.5 px-5 text-[13px] cursor-pointer">
                    Clear Filters
                  </button>
                </div>
              )}

              {/* Empty / Error state */}
              {!placesLoading && places.length === 0 && (
                <div className="card text-center py-8 px-5">
                  {placesError ? (
                    <>
                      <div className="text-[32px] mb-2">&#x26A0;&#xFE0F;</div>
                      <p className="text-text-secondary text-sm mb-3">
                        Couldn't load places. Check your connection and try again.
                      </p>
                      <button onClick={fetchPlaces}
                        className="bg-none border border-accent-amber text-accent-amber rounded-[10px] py-2.5 px-5 text-[13px] font-semibold cursor-pointer">
                        Tap to Retry
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="text-[32px] mb-2">&#x1F4CD;</div>
                      <p className="text-text-secondary text-sm">
                        {(useGps || selectedCity) ? 'No places found nearby.' : 'Select a city or enable location first.'}
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* For You — Personalized picks based on preference learning */}
              {!placesLoading && forYouPlaces.length >= 3 && (
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2.5">
                    <h3 className="text-[15px] font-semibold flex items-center gap-1.5">
                      {'\u2728'} For You
                    </h3>
                    <span className="text-xs text-text-tertiary">Based on your taste</span>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 scroll-hidden">
                    {forYouPlaces.slice(0, 8).map(place => (
                      <div key={place.placeId} onClick={() => setSelectedPlace(place)}
                        role="button"
                        tabIndex={0}
                        aria-label={`View details for ${place.name}`}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedPlace(place); } }}
                        className="card !p-0 overflow-hidden min-w-[180px] max-w-[200px] shrink-0 cursor-pointer border border-amber-tint-border15">
                        {place.photoUrl ? (
                          <div className="h-[90px] w-full bg-cover bg-center"
                            style={{
                              background: `linear-gradient(to bottom, transparent 40%, var(--bg-image-overlay)), url(${place.photoUrl})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }} />
                        ) : (
                          <div className="h-[90px] w-full bg-amber-tint-bg06 flex items-center justify-center text-2xl">{'\u2728'}</div>
                        )}
                        <div className="py-2.5 px-3">
                          <div className="text-[13px] font-semibold text-text-primary mb-[3px] overflow-hidden text-ellipsis whitespace-nowrap">{place.name}</div>
                          <div className="text-[11px] text-text-tertiary flex items-center gap-1">
                            <span className="text-accent-amber">{'\u2605'}</span> {place.rating.toFixed(1)}
                            <span className="mx-0.5">{'\u00B7'}</span>
                            {place.categoryDisplay}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hidden Gems Horizontal Section (when not on hidden vibe) */}
              {!placesLoading && selectedVibe !== 'hidden' && (() => {
                const gems = places.filter(p => p.rating >= 4.2 && p.reviewCount > 0 && p.reviewCount < 150 && !NIGHTLIFE_TYPES.includes(p.category) && !isChain(p.name));
                if (gems.length === 0) return null;
                return (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2.5">
                      <h3 className="text-[15px] font-semibold flex items-center gap-1.5">
                        💎 Hidden Gems
                      </h3>
                      <button onClick={() => setSelectedVibe('hidden')}
                        className="bg-none border-none text-accent-amber text-xs cursor-pointer">
                        See all →
                      </button>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2 scroll-hidden">
                      {gems.slice(0, 8).map(place => (
                        <div key={place.placeId} onClick={() => setSelectedPlace(place)}
                          role="button"
                          tabIndex={0}
                          aria-label={`View details for ${place.name}`}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedPlace(place); } }}
                          className="card !p-0 overflow-hidden min-w-[180px] max-w-[200px] shrink-0 cursor-pointer">
                          {place.photoUrl && (
                            <div className="h-[90px] w-full bg-cover bg-center"
                              style={{
                                background: `linear-gradient(to bottom, transparent 40%, var(--bg-image-overlay)), url(${place.photoUrl})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                              }} />
                          )}
                          <div className="py-2.5 px-3">
                            <div className="text-[13px] font-semibold text-text-primary mb-[3px] overflow-hidden text-ellipsis whitespace-nowrap">{place.name}</div>
                            <div className="text-[11px] text-text-tertiary flex items-center gap-1">
                              <span className="text-accent-amber">★</span> {place.rating.toFixed(1)}
                              <span className="mx-0.5">·</span>
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

              {/* Community Stops */}
              {!placesLoading && userStops.filter(s => s.status === 'approved').length > 0 && (
                <div className="mb-4 mt-2">
                  <div className="flex justify-between items-center mb-2.5">
                    <h3 className="text-[15px] font-semibold flex items-center gap-1.5">
                      {'\u{1F4CD}'} Community Stops
                    </h3>
                    <span className="text-xs text-text-tertiary">{userStops.filter(s => s.status === 'approved').length} spots</span>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 scroll-hidden">
                    {userStops.filter(s => s.status === 'approved').map(stop => {
                      const catInfo = STOP_CATEGORIES.find(c => c.id === stop.category);
                      return (
                        <div key={stop.id}
                          className="card !p-0 overflow-hidden min-w-[180px] max-w-[200px] shrink-0">
                          <div className="h-[60px] w-full bg-purple-tint-bg15 flex items-center justify-center text-2xl">
                            {catInfo?.emoji || '\u{2728}'}
                          </div>
                          <div className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-tint-bg15 text-purple-tint-text font-medium">Community</span>
                            </div>
                            <div className="text-[13px] font-semibold text-text-primary mb-[3px] overflow-hidden text-ellipsis whitespace-nowrap">{stop.name}</div>
                            <div className="text-[11px] text-text-tertiary">{catInfo?.label || stop.category}</div>
                            {stop.description && (
                              <div className="text-[11px] text-text-muted mt-1 line-clamp-2">{stop.description}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Expand Radius */}
              {!placesLoading && filteredPlaces.length > 0 && (
                <button onClick={() => setSearchRadius(prev => prev + 1500)}
                  className="w-full py-3.5 rounded-xl mt-1 bg-none border border-border-medium text-text-secondary text-[13px] cursor-pointer">
                  Search wider area {'\u2192'}
                </button>
              )}
            </>
          )}
        </>
      )}

      {/* Pin a Stop FAB */}
      {(useGps || selectedCity) && !showPinStop && (
        <button
          onClick={() => { if (!requireAuth()) return; setShowPinStop(true); }}
          className="fixed bottom-20 right-4 max-w-[430px] w-12 h-12 rounded-full bg-accent-gradient text-text-on-accent shadow-lg border-none cursor-pointer flex items-center justify-center text-xl z-50"
          aria-label="Pin a new stop"
        >
          {'\u{1F4CC}'}
        </button>
      )}

      {/* Pin a Stop Modal */}
      {showPinStop && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center">
          <div className="absolute inset-0 bg-bg-modal-overlay" onClick={() => setShowPinStop(false)} />
          <div className="relative w-full max-w-[430px] bg-bg-surface rounded-t-2xl p-5 pb-8 max-h-[80vh] overflow-y-auto animate-slide-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">{'\u{1F4CC}'} Pin a Stop</h3>
              <button onClick={() => setShowPinStop(false)} className="bg-none border-none text-text-tertiary cursor-pointer text-xl p-2">{'\u2715'}</button>
            </div>
            <p className="text-xs text-text-secondary mb-4">Found a hidden gem that isn't on the map? Pin it for the community!</p>

            <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Name *</label>
            <input
              type="text"
              placeholder="e.g. Mama Rosa's Empanadas"
              value={pinName}
              onChange={e => setPinName(e.target.value)}
              maxLength={100}
              className="input-field w-full mb-3"
            />

            <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Category *</label>
            <div className="flex gap-2 flex-wrap mb-3">
              {STOP_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setPinCategory(cat.id)}
                  className={`py-1.5 px-3 rounded-2xl text-[11px] font-medium cursor-pointer whitespace-nowrap ${
                    pinCategory === cat.id
                      ? 'border border-amber-tint-border30 bg-amber-tint-bg15 text-accent-amber'
                      : 'border border-border-medium bg-transparent text-text-tertiary'
                  }`}
                >
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>

            <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Description</label>
            <textarea
              placeholder="What makes this place special?"
              value={pinDescription}
              onChange={e => setPinDescription(e.target.value)}
              maxLength={500}
              rows={3}
              className="input-field w-full mb-3 resize-none"
            />

            <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Location *</label>
            <div className="flex gap-2 mb-1.5">
              <input
                type="number"
                placeholder="Latitude"
                value={pinLat}
                onChange={e => setPinLat(e.target.value)}
                step="any"
                className="input-field flex-1"
              />
              <input
                type="number"
                placeholder="Longitude"
                value={pinLng}
                onChange={e => setPinLng(e.target.value)}
                step="any"
                className="input-field flex-1"
              />
            </div>
            <button
              onClick={() => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    pos => { setPinLat(pos.coords.latitude.toFixed(6)); setPinLng(pos.coords.longitude.toFixed(6)); },
                    () => {}
                  );
                }
              }}
              className="text-xs text-accent-amber bg-none border-none cursor-pointer mb-4 underline"
            >
              Use my current location
            </button>

            <button
              disabled={!pinName.trim() || !pinLat || !pinLng || pinStopSubmitting}
              onClick={() => {
                submitPinStop({
                  name: pinName,
                  description: pinDescription || undefined,
                  category: pinCategory,
                  lat: parseFloat(pinLat),
                  lng: parseFloat(pinLng),
                });
                setPinName('');
                setPinDescription('');
                setPinCategory('cafe');
                setPinLat('');
                setPinLng('');
              }}
              className={`w-full py-3.5 rounded-xl border-none text-sm font-semibold cursor-pointer ${
                pinName.trim() && pinLat && pinLng && !pinStopSubmitting
                  ? 'bg-accent-gradient text-text-on-accent'
                  : 'bg-bg-subtle-strong text-text-tertiary'
              }`}
            >
              {pinStopSubmitting ? 'Submitting...' : 'Submit for Review'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
