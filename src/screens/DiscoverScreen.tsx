import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { VIBES, QUICK_FILTERS, SMART_FILTERS, COMMUNITY_TAGS } from '../data';
import { formatDistance } from '../services/places';
import { SkeletonCard } from '../components/ui';
import PlaceCard from '../components/PlaceCard';
import { APIProvider, Map, Marker, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps';
import type { Place } from '../services/places';
import type { EventItem } from '../types';
import ContextHint from '../components/ContextHint';
import { getSunsetGuardian, getRegionSafetyAlert } from '../utils/safetyEngine';

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
    events,
    formatEventTime,
    addEventToPlan,
    isEventInPlan,
  } = useApp();

  const { theme } = useTheme();
  const [showEventPins, setShowEventPins] = useState(false);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);

  const center = getMapCenter();

  // Today's events with valid coordinates
  const todayStr = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter(
    (e: EventItem) => e.date === todayStr && e.lat != null && e.lng != null
  );

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
    <div className="relative h-[calc(100vh-280px)] rounded-2xl overflow-hidden border border-border-subtle">
      {/* Live Pulse toggle — only shows when events exist today */}
      {todayEvents.length > 0 && (
        <button
          onClick={() => { setShowEventPins(v => !v); if (showEventPins) setActiveEventId(null); }}
          className={`absolute top-3 right-3 z-10 flex items-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium cursor-pointer border shadow-sm transition-colors ${
            showEventPins
              ? 'bg-[rgba(196,138,90,0.15)] border-[rgba(196,138,90,0.4)] text-[#C48A5A]'
              : 'bg-bg-card border-border-medium text-text-secondary'
          }`}
        >
          🎫 Today
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
            showEventPins ? 'bg-[rgba(196,138,90,0.2)] text-[#C48A5A]' : 'bg-bg-subtle text-text-tertiary'
          }`}>
            {todayEvents.length}
          </span>
        </button>
      )}

      <APIProvider apiKey={MAPS_API_KEY}>
        <Map
          defaultCenter={center}
          defaultZoom={14}
          gestureHandling="greedy"
          disableDefaultUI={true}
          mapId="discover-map"
          style={{ width: '100%', height: '100%' }}
          colorScheme={theme.mapColorScheme}
        >
          {/* Place markers */}
          {mapPlaces.filter(p => p.lat && p.lng).map(place => (
            <Marker
              key={place.placeId}
              position={{ lat: place.lat!, lng: place.lng! }}
              onClick={() => { setActiveMapPin(activeMapPin === place.placeId ? null : place.placeId); setActiveEventId(null); }}
              title={place.name}
            />
          ))}

          {/* Event markers — bronze pins, only when toggle is on */}
          {showEventPins && todayEvents.map(event => (
            <AdvancedMarker
              key={event.id}
              position={{ lat: event.lat!, lng: event.lng! }}
              onClick={() => { setActiveEventId(activeEventId === event.id ? null : event.id); setActiveMapPin(null); }}
              title={event.name}
            >
              <Pin background="#C48A5A" borderColor="#A0714A" glyphColor="#FFF" scale={0.9} />
            </AdvancedMarker>
          ))}

          {/* Place InfoWindow */}
          {activeMapPin && !activeEventId && (() => {
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
                      className="flex-1 p-1.5 rounded-md border-none bg-[#E8940A] text-[#0C0A09] text-xs font-semibold cursor-pointer"
                    >
                      Details
                    </button>
                    <button
                      onClick={() => { addToPlan(place); setActiveMapPin(null); }}
                      className="flex-1 p-1.5 rounded-md border border-[#D6D3D1] bg-white text-[#1C1917] text-xs font-semibold cursor-pointer"
                    >
                      + Plan
                    </button>
                  </div>
                </div>
              </InfoWindow>
            );
          })()}

          {/* Event InfoWindow */}
          {activeEventId && (() => {
            const event = todayEvents.find(e => e.id === activeEventId);
            if (!event || !event.lat || !event.lng) return null;
            return (
              <InfoWindow
                position={{ lat: event.lat, lng: event.lng }}
                onCloseClick={() => setActiveEventId(null)}
              >
                <div className="p-1 min-w-[160px] text-[#1C1917]">
                  <div className="font-bold text-sm mb-1">{event.name}</div>
                  <div className="text-xs text-[#57534E] mb-0.5">
                    {formatEventTime(event.time)} · {event.category}
                  </div>
                  <div className="text-xs text-[#78716C] mb-2 truncate max-w-[200px]">{event.venue}</div>
                  <div className="flex gap-1.5">
                    {event.url && (
                      <a
                        href={event.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 p-1.5 rounded-md border-none bg-[#C48A5A] text-white text-xs font-semibold cursor-pointer text-center no-underline"
                      >
                        Tickets
                      </a>
                    )}
                    <button
                      onClick={() => { addEventToPlan(event); setActiveEventId(null); }}
                      disabled={isEventInPlan(event.id)}
                      className={`flex-1 p-1.5 rounded-md border text-xs font-semibold cursor-pointer ${
                        isEventInPlan(event.id)
                          ? 'border-[#D6D3D1] bg-[#F5F5F4] text-[#A8A29E]'
                          : 'border-[#D6D3D1] bg-white text-[#1C1917]'
                      }`}
                    >
                      {isEventInPlan(event.id) ? 'Added' : '+ Plan'}
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
    filteredPlaces: allFilteredPlaces,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    handleSearch,
    isSearching,
    showSearch,
    setShowSearch,
    dismissSearch,
    searchResults,
    selectedVibes,
    toggleVibe,
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
    forYouPlaces: allForYouPlaces,
    user,
    requireAuth,
    setScreen,
    isInPlan,
  } = useApp();

  // Filter out places already in the user's plan to avoid duplicates across tabs
  const filteredPlaces = allFilteredPlaces.filter(p => !isInPlan(p.placeId));
  const forYouPlaces = allForYouPlaces.filter(p => !isInPlan(p.placeId));

  const { theme } = useTheme();
  const [showFilters, setShowFilters] = useState(false);

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

      {/* Weather Banner */}
      {weather && (
        <div className="flex items-center gap-2.5 mb-3 px-3.5 py-2.5 rounded-xl border border-blue-tint-border"
          style={{ background: 'linear-gradient(135deg, var(--blue-tint-bg), var(--bg-subtle))' }}>
          <span className="text-2xl">{weather.emoji}</span>
          <div className="flex-1">
            <span className="text-sm font-semibold text-text-primary">{weather.temp}°F</span>
            <span className="text-xs text-text-secondary ml-1.5">{weather.description}</span>
          </div>
          <div className="text-xs text-text-tertiary shrink-0">
            H: {weather.high}° L: {weather.low}°
          </div>
        </div>
      )}

      {/* First-visit hint */}
      <ContextHint
        storageKey="discover"
        title="Discover places"
        subtitle="Browse restaurants, attractions, and hidden gems in your city."
        hints={[
          { emoji: '\u{1F50D}', title: 'Search & filter', description: 'Search by name or use vibe filters like Coffee, Brunch, Romantic, or Late Night to find the perfect spot.' },
          { emoji: '\u{1F5FA}\u{FE0F}', title: 'List or Map view', description: 'Switch between a scrollable list and an interactive map to see places around you.' },
          { emoji: '\u2B50', title: 'Tap for details', description: 'Tap any place to see hours, reviews, directions, phone, and website — then add it to your plan.' },
          { emoji: '\u2764\u{FE0F}', title: 'Save favorites', description: 'Heart a place to save it for later. Find your saved places in your Profile.' },
        ]}
      />

      {/* Header */}
      <div className="mb-3 flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold mb-0.5">
            {cityLabel} 📍
          </h1>
          <p className="text-text-tertiary text-[13px]">{filteredPlaces.length} local & culturally diverse spots</p>
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

      {/* Region Safety Alert — always-on for high-risk countries */}
      {(() => {
        const alert = getRegionSafetyAlert(selectedCity?.country);
        if (!alert) return null;
        const colors = {
          extreme: { bg: 'bg-[rgba(239,68,68,0.12)]', border: 'border-[rgba(239,68,68,0.3)]', text: 'text-[#F87171]' },
          high: { bg: 'bg-[rgba(251,146,60,0.10)]', border: 'border-[rgba(251,146,60,0.25)]', text: 'text-[#FB923C]' },
          elevated: { bg: 'bg-[rgba(250,204,21,0.08)]', border: 'border-[rgba(250,204,21,0.2)]', text: 'text-[#FACC15]' },
        };
        const c = colors[alert.level];
        return (
          <div className={`p-3 rounded-xl mb-3 border ${c.bg} ${c.border}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg">{alert.emoji}</span>
              <span className={`text-[12px] font-bold uppercase tracking-wide ${c.text}`}>{alert.label} — {selectedCity?.country}</span>
            </div>
            <p className={`text-[11px] leading-relaxed ${c.text} opacity-90 mb-2`}>{alert.message}</p>
            <div className="flex flex-wrap gap-1.5">
              {alert.tips.slice(0, 3).map((tip, i) => (
                <span key={i} className={`text-[10px] px-2 py-1 rounded-md ${c.bg} border ${c.border} ${c.text} opacity-80`}>
                  {tip}
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Sunset Guardian Banner */}
      {(() => {
        const guardian = getSunsetGuardian(weather?.sunset);
        if (!guardian.active) return null;
        return (
          <div className={`flex items-center gap-2.5 p-3 rounded-xl mb-3 border ${
            guardian.phase === 'night'
              ? 'bg-[rgba(99,102,241,0.08)] border-[rgba(99,102,241,0.2)]'
              : guardian.phase === 'golden_hour'
              ? 'bg-amber-tint-bg10 border-amber-tint-border15'
              : 'bg-[rgba(99,102,241,0.06)] border-[rgba(99,102,241,0.15)]'
          }`}>
            <span className="text-lg">{guardian.emoji}</span>
            <span className={`text-[12px] font-medium ${
              guardian.phase === 'night' ? 'text-[#818CF8]' : 'text-accent-amber'
            }`}>
              {guardian.message}
            </span>
          </div>
        );
      })()}

      {/* Search Bar */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder="Search for a place..."
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); if (!e.target.value.trim() && showSearch) { dismissSearch(); } }}
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
            {searchResults.length} results for &ldquo;{searchQuery}&rdquo;
          </span>
          <button onClick={dismissSearch}
            className="bg-none border-none text-text-tertiary cursor-pointer text-[13px]">
            Done
          </button>
        </div>
      )}

      {/* Vibe Chips (always visible, hidden during search) */}
      {!showSearch && (
      <div className="flex gap-2 overflow-x-auto pb-2.5 mb-1.5 scroll-hidden">
        {VIBES.map(vibe => {
          const active = selectedVibes.includes(vibe.id);
          return (
            <button
              key={vibe.id}
              aria-pressed={active}
              onClick={() => {
                toggleVibe(vibe.id);
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
      )}

      {/* Community Tags — always visible, core to NxStops */}
      {!showSearch && (
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-1 scroll-hidden">
        {COMMUNITY_TAGS.map(tag => {
          const active = communityFilters.includes(tag.id);
          return (
            <button key={tag.id}
              aria-pressed={active}
              aria-label={`Filter by ${tag.label}`}
              onClick={() => setCommunityFilters(active ? communityFilters.filter(f => f !== tag.id) : [...communityFilters, tag.id])}
              className={`py-2 px-3 rounded-2xl text-xs font-medium cursor-pointer whitespace-nowrap shrink-0 min-h-[38px] ${
                active
                  ? 'border border-community-tint-border40 bg-community-tint-bg12 text-community-text'
                  : 'border border-community-tint-border20 bg-transparent text-text-secondary'
              }`}>
              {tag.emoji} {tag.label}
            </button>
          );
        })}
      </div>
      )}

      {/* More Filters toggle + collapsible filters */}
      {!showSearch && (
      <div className="mb-2">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 py-2 px-0.5 bg-transparent border-none cursor-pointer text-text-secondary text-xs font-medium mb-1.5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="16" y2="12" /><line x1="4" y1="18" x2="12" y2="18" />
          </svg>
          More Filters
          {quickFilters.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-tint-bg15 text-accent-amber text-[10px] font-bold">
              {quickFilters.length}
            </span>
          )}
          <span className="text-text-muted text-[10px]" style={{ transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            {'\u25BC'}
          </span>
        </button>

        {showFilters && (
        <div className="flex gap-1.5 overflow-x-auto pb-3 scroll-hidden">
          {visibleSmartFilters.map(filter => {
            const active = quickFilters.includes(filter.id);
            return (
              <button
                key={filter.id}
                aria-pressed={active}
                onClick={() => {
                  setQuickFilters(active ? quickFilters.filter(f => f !== filter.id) : [...quickFilters, filter.id]);
                }}
                className={`py-2.5 px-3.5 rounded-2xl text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 min-h-[44px] ${
                  active
                    ? 'border border-purple-tint-border30 bg-purple-tint-bg15 text-purple-tint-text'
                    : 'border border-purple-tint-border20 bg-purple-tint-bg08 text-purple-tint-text'
                }`}
              >
                {filter.emoji} {filter.label}
              </button>
            );
          })}
          {QUICK_FILTERS.map(filter => {
            const active = quickFilters.includes(filter.id);
            return (
              <button
                key={filter.id}
                aria-pressed={active}
                onClick={() => {
                  setQuickFilters(active ? quickFilters.filter(f => f !== filter.id) : [...quickFilters, filter.id]);
                }}
                className={`py-2.5 px-3.5 rounded-2xl text-xs font-medium cursor-pointer whitespace-nowrap shrink-0 min-h-[44px] ${
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
        )}
      </div>
      )}

      {/* Community filter active banner */}
      {communityFilters.length > 0 && !showSearch && (
        <div className="flex items-center gap-2 mb-2.5 px-3.5 py-2.5 rounded-[10px] bg-community-tint-bg border border-community-tint-border">
          <span className="text-sm">✨</span>
          <span className="text-xs text-community-text leading-[1.4]">
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
                <div className="card text-center py-8 px-5">
                  <div className="text-[32px] mb-2">🔍</div>
                  <p className="text-text-secondary text-sm">No results found. Try a different search.</p>
                </div>
              )}
              <div className="md:grid md:grid-cols-2 md:gap-4">
              {!isSearching && searchResults.map(place => (
                <PlaceCard key={place.placeId} place={place} />
              ))}
              </div>
            </>
          ) : (
            <>
              {/* Vibe banner — shows description for active vibe */}
              {selectedVibes.length > 0 && !placesLoading && filteredPlaces.length > 0 && (() => {
                const activeVibe = VIBES.find(v => selectedVibes.includes(v.id));
                if (!activeVibe) return null;
                return (
                  <div className="card mb-3 px-[18px] py-4" style={{ background: `linear-gradient(135deg, var(--amber-tint-bg10), rgba(245,158,11,0.04))`, border: `1px solid var(--amber-tint-border15)` }}>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <span className="text-xl">{activeVibe.emoji}</span>
                      <span className="font-semibold text-[15px] text-text-primary">{activeVibe.label}</span>
                    </div>
                    <p className="text-xs text-text-secondary leading-[1.5] m-0">
                      {activeVibe.desc}
                    </p>
                  </div>
                );
              })()}

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
                          <div className="h-[90px] w-full relative overflow-hidden">
                            <img src={place.photoUrl} alt={place.name} loading="lazy" decoding="async"
                              className="w-full h-full object-cover block"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, var(--bg-image-overlay))' }} />
                          </div>
                        ) : (
                          <div className="h-[90px] w-full bg-amber-tint-bg06 flex items-center justify-center text-2xl">{'\u2728'}</div>
                        )}
                        <div className="py-2.5 px-3">
                          <div className="text-[13px] font-semibold text-text-primary mb-[3px] overflow-hidden text-ellipsis whitespace-nowrap">{place.name}</div>
                          <div className="text-xs text-text-tertiary flex items-center gap-1">
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

              {/* Place Cards */}
              <div className="md:grid md:grid-cols-2 md:gap-4">
              {!placesLoading && filteredPlaces.map(place => (
                <PlaceCard key={place.placeId} place={place} />
              ))}
              </div>

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

    </div>
  );
}
