import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { VIBES, QUICK_FILTERS, SMART_FILTERS, COMMUNITY_TAGS } from '../data';
import { SkeletonCard } from '../components/ui';
import PlaceCard from '../components/PlaceCard';
import type { EventItem } from '../types';
import ContextHint from '../components/ContextHint';
import { getSunsetGuardian, getRegionSafetyAlert } from '../utils/safetyEngine';
import { fixPhotoUrl } from '../utils/photoUrl';
import { getPreferences } from '../utils/preferences';
import NativeImg from '../components/NativeImg';
import NearbyEvents from '../components/NearbyEvents';
import LumeMap from '../components/LumeMap';
import { getCityMedia } from '../data/cityMedia';
import CityVideoPlayer from '../components/CityVideoPlayer';

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
    useGps,
    loc,
    addToPlan,
    useMiles,
    MAPS_API_KEY,
    getMapCenter,
    fetchPlaces,
    weather, formatTemp,
    forYouPlaces: allForYouPlaces,
    user,
    requireAuth,
    setScreen,
    isInPlan,
    events,
    addEventToPlan,
    isEventInPlan,
  } = useApp();

  // Filter out places already in the user's plan to avoid duplicates across tabs
  const filteredPlaces = allFilteredPlaces.filter(p => !isInPlan(p.placeId));
  const forYouPlaces = allForYouPlaces.filter(p => !isInPlan(p.placeId));

  const { theme } = useTheme();
  const [showFilters, setShowFilters] = useState(false);
  const [safetyExpanded, setSafetyExpanded] = useState(false);

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

      {/* Weather + Sunset Guardian — combined compact banner */}
      {weather && (() => {
        const guardian = getSunsetGuardian(weather.sunset);
        return (
          <div className="flex items-center gap-2.5 mb-3 px-3.5 py-2 rounded-xl border border-blue-tint-border"
            style={{ background: 'linear-gradient(135deg, var(--blue-tint-bg), var(--bg-subtle))' }}>
            <span className="text-xl">{weather.emoji}</span>
            <span className="text-sm font-semibold text-text-primary">{formatTemp(weather.temp)}</span>
            <span className="text-xs text-text-secondary flex-1 truncate">{weather.description} · H:{formatTemp(weather.high)} L:{formatTemp(weather.low)}</span>
            {guardian.active && (
              <span className={`text-[11px] font-medium shrink-0 ${guardian.phase === 'night' ? 'text-[#818CF8]' : 'text-accent-amber'}`}>
                {guardian.emoji} {guardian.message.split('.')[0]}
              </span>
            )}
          </div>
        );
      })()}

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
          <p className="text-text-tertiary text-[13px]">{filteredPlaces.length} places near you</p>
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
          <button onClick={() => setViewMode('lume')}
            aria-label="Lume map view"
            aria-pressed={viewMode === 'lume'}
            className={`py-2.5 px-3.5 text-xs font-medium border-none cursor-pointer min-h-[44px] border-l border-border-strong ${
              viewMode === 'lume' ? 'bg-amber-tint-border15 text-accent-amber' : 'bg-transparent text-text-tertiary'
            }`}>
            ✨ Lume
          </button>
        </div>
      </div>

      {/* Region Safety Alert — collapsible, collapsed by default */}
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
          <button
            onClick={() => setSafetyExpanded(!safetyExpanded)}
            className={`w-full text-left p-3 rounded-xl mb-3 border ${c.bg} ${c.border} bg-transparent cursor-pointer`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{alert.emoji}</span>
              <span className={`text-[12px] font-bold uppercase tracking-wide ${c.text} flex-1`}>{alert.label} — {selectedCity?.country}</span>
              <span className={`text-xs ${c.text}`}>{safetyExpanded ? '\u25B2' : '\u25BC'}</span>
            </div>
            {safetyExpanded && (
              <>
                <p className={`text-[11px] leading-relaxed ${c.text} opacity-90 mb-2 mt-1.5`}>{alert.message}</p>
                <div className="flex flex-wrap gap-1.5">
                  {alert.tips.slice(0, 3).map((tip, i) => (
                    <span key={i} className={`text-[10px] px-2 py-1 rounded-md ${c.bg} border ${c.border} ${c.text} opacity-80`}>
                      {tip}
                    </span>
                  ))}
                </div>
              </>
            )}
          </button>
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
                if (!active) setSearchRadius(1500);
                toggleVibe(vibe.id);
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

      {/* More Filters toggle + collapsible filters (includes community tags) */}
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
          {(quickFilters.length > 0 || communityFilters.length > 0) && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-tint-bg15 text-accent-amber text-[10px] font-bold">
              {quickFilters.length + communityFilters.length}
            </span>
          )}
          <span className="text-text-muted text-[10px]" style={{ transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            {'\u25BC'}
          </span>
        </button>

        {showFilters && (<>
        {/* Community Tags */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-1.5 scroll-hidden">
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
        {/* Smart & Quick Filters */}
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
        </>)}
      </div>
      )}

      {/* Community filter active banner */}
      {communityFilters.length > 0 && !showSearch && (
        <div className="flex items-center gap-2 mb-2.5 px-3.5 py-2.5 rounded-[10px] bg-community-tint-bg border border-community-tint-border">
          <span className="text-sm">🏷️</span>
          <span className="text-xs text-community-text leading-[1.4]">
            Filtered by community reviews. Tap a place to leave your own review and help improve results!
          </span>
        </div>
      )}


      {/* Lume Map / List View */}
      {viewMode === 'lume' ? (
        <LumeMap
          places={showSearch ? searchResults : filteredPlaces}
          events={events}
          apiKey={MAPS_API_KEY}
          center={getMapCenter()}
          colorScheme={theme.mapColorScheme}
          useMiles={useMiles}
          onSelectPlace={setSelectedPlace}
          onAddToPlan={addToPlan}
        />
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
              {!placesLoading && forYouPlaces.length >= 3 && (() => {
                const prefs = getPreferences();
                const isNewUser = prefs.tripCount === 0 && Object.keys(prefs.likedCategories).length === 0;
                return (
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2.5">
                    <h3 className="text-[15px] font-semibold flex items-center gap-1.5">
                      {isNewUser ? 'Top Picks' : 'For You'}
                    </h3>
                    <span className="text-xs text-text-tertiary">{isNewUser ? 'Highest rated nearby' : 'Based on your preferences'}</span>
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
                            <NativeImg src={fixPhotoUrl(place.photoUrl)!} alt={place.name} loading="lazy" decoding="async"
                              className="w-full h-full object-cover block" />
                            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, var(--bg-image-overlay))' }} />
                          </div>
                        ) : (
                          <div className="h-[90px] w-full bg-amber-tint-bg06 flex items-center justify-center text-xl text-text-tertiary">{'\u{1F4CD}'}</div>
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
                );
              })()}

              {/* Events happening now — woven into places discovery */}
              {!placesLoading && events.length > 0 && (
                <div className="mb-3">
                  <NearbyEvents
                    events={events.filter((e: EventItem) => {
                      const today = new Date().toISOString().split('T')[0];
                      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
                      return e.date === today || e.date === tomorrow;
                    }).slice(0, 8).map((e: EventItem) => ({
                      id: e.id, name: e.name, date: e.date, time: e.time,
                      venue: e.venue, imageUrl: e.imageUrl, category: e.category, url: e.url,
                    }))}
                    onAddToPlan={(eventId: string) => {
                      const event = events.find((e: EventItem) => e.id === eventId);
                      if (event) addEventToPlan(event);
                    }}
                    isInPlan={isEventInPlan}
                  />
                </div>
              )}

              {/* City Videos — in-app self-hosted video player */}
              {!placesLoading && cityLabel && (() => {
                const media = getCityMedia(cityLabel);
                if (!media.videos || media.videos.length === 0) return null;
                return <CityVideoPlayer cityName={cityLabel} videos={media.videos} />;
              })()}

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
