import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import EventCard from '../components/EventCard';
import BookingLinks from '../components/BookingLinks';
import { SkeletonCard } from '../components/ui';
import { APIProvider, Map, Marker, InfoWindow } from '@vis.gl/react-google-maps';
import type { EventItem } from '../types';

// ---------------------------------------------------------------------------
// Event category filter options (local constant)
// ---------------------------------------------------------------------------

const EVENT_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'music', label: 'Music' },
  { id: 'sports', label: 'Sports' },
  { id: 'comedy', label: 'Comedy' },
  { id: 'arts', label: 'Arts' },
  { id: 'family', label: 'Family' },
  { id: 'festivals', label: 'Festivals' },
];

const DATE_FILTERS = [
  { id: 'all', label: 'All Dates' },
  { id: 'today', label: 'Today' },
  { id: 'weekend', label: 'This Weekend' },
  { id: 'month', label: 'This Month' },
];

// ---------------------------------------------------------------------------
// EventsMapView (local component -- only used within EventsScreen)
// ---------------------------------------------------------------------------

function EventsMapView({ eventsList }: { eventsList: EventItem[] }) {
  const {
    setActiveEventPin,
    activeEventPin,
    formatEventDate,
    formatEventTime,
    MAPS_API_KEY,
    getMapCenter,
  } = useApp();
  const { theme } = useTheme();

  const center = getMapCenter();
  const mappableEvents = eventsList.filter(e => e.lat != null && e.lng != null);

  if (!MAPS_API_KEY) {
    return (
      <div className="text-center py-[60px] px-5">
        <div className="text-[40px] mb-3">{'\u{1F5FA}\u{FE0F}'}</div>
        <p className="text-text-secondary text-sm">Map view requires Google Maps API key</p>
      </div>
    );
  }

  if (mappableEvents.length === 0) {
    return (
      <div className="text-center py-[60px] px-5">
        <div className="text-[40px] mb-3">{'\u{1F5FA}\u{FE0F}'}</div>
        <p className="text-text-secondary text-sm">No event locations available to map</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-280px)] rounded-2xl overflow-hidden border border-border-subtle">
      <APIProvider apiKey={MAPS_API_KEY}>
        <Map
          defaultCenter={center}
          defaultZoom={11}
          gestureHandling="greedy"
          disableDefaultUI={true}
          style={{ width: '100%', height: '100%' }}
          colorScheme={theme.mapColorScheme}
        >
          {mappableEvents.map(event => (
            <Marker
              key={event.id}
              position={{ lat: event.lat!, lng: event.lng! }}
              onClick={() => setActiveEventPin(activeEventPin === event.id ? null : event.id)}
              title={event.name}
            />
          ))}
          {activeEventPin && (() => {
            const event = mappableEvents.find(e => e.id === activeEventPin);
            if (!event) return null;
            return (
              <InfoWindow
                position={{ lat: event.lat!, lng: event.lng! }}
                onCloseClick={() => setActiveEventPin(null)}
              >
                <div className="p-1 min-w-[180px] text-[#1C1917]">
                  <div className="font-bold text-sm mb-1">{event.name}</div>
                  <div className="text-xs text-[#57534E] mb-0.5">
                    {formatEventDate(event.date)}{event.time ? ` · ${formatEventTime(event.time)}` : ''}
                  </div>
                  <div className="text-[11px] text-[#78716C] mb-2">{event.venue}</div>
                  {event.url && (
                    <a href={event.url} target="_blank" rel="noopener noreferrer"
                      className="block p-1.5 rounded-md bg-[#C48A5A] text-white text-[11px] font-semibold text-center no-underline">
                      Get Tickets
                    </a>
                  )}
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
// EventsScreen
// ---------------------------------------------------------------------------

export default function EventsScreen() {
  const {
    cityLabel,
    events,
    eventsLoading,
    eventsError,
    eventsViewMode,
    setEventsViewMode,
    eventCategoryFilter,
    setEventCategoryFilter,
    travelGroup,
    useGps,
    selectedCity,
    formatEventDate,
    formatEventTime,
    setActiveEventPin,
    activeEventPin,
    MAPS_API_KEY,
    getMapCenter,
    fetchEventsData,
    weather,
  } = useApp();
  const { theme } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

  // Filter: show events within current month, plus ticketed events further out
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const filteredEvents = events.filter(event => {
    if (!event.date) return true;
    const eventDate = new Date(event.date + 'T00:00:00');
    if (eventDate > endOfMonth) {
      if (!event.url) return false;
      const threeMonths = new Date(now.getFullYear(), now.getMonth() + 3, 0);
      if (eventDate > threeMonths) return false;
    }

    // Date filter (use local date formatting to avoid UTC timezone shifts)
    if (dateFilter !== 'all' && event.date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const pad = (n: number) => n.toString().padStart(2, '0');
      const toLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const todayStr = toLocal(today);

      if (dateFilter === 'today') {
        if (event.date !== todayStr) return false;
      } else if (dateFilter === 'weekend') {
        const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat
        const saturday = new Date(today);
        const sunday = new Date(today);
        if (dayOfWeek === 0) {
          // Today is Sunday — show yesterday (Sat) + today (Sun)
          saturday.setDate(today.getDate() - 1);
        } else if (dayOfWeek === 6) {
          // Today is Saturday — show today (Sat) + tomorrow (Sun)
          sunday.setDate(today.getDate() + 1);
        } else {
          // Weekday — show upcoming Sat + Sun
          saturday.setDate(today.getDate() + (6 - dayOfWeek));
          sunday.setDate(today.getDate() + (7 - dayOfWeek));
        }
        const satStr = toLocal(saturday);
        const sunStr = toLocal(sunday);
        if (event.date < satStr || event.date > sunStr) return false;
      } else if (dateFilter === 'month') {
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const monthEndStr = toLocal(monthEnd);
        if (event.date < todayStr || event.date > monthEndStr) return false;
      }
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const searchable = `${event.name} ${event.venue} ${event.category}`.toLowerCase();
      if (!searchable.includes(q)) return false;
    }

    if (eventCategoryFilter !== 'all') {
      const catLower = (event.category || '').toLowerCase();
      const nameLower = (event.name || '').toLowerCase();
      const combined = catLower + ' ' + nameLower;
      switch (eventCategoryFilter) {
        case 'music': if (!/\b(music|concert|live|band|dj|singer|tour|rap|hip.?hop|r&b|pop|rock|jazz|country|latin|reggae)\b/i.test(combined)) return false; break;
        case 'sports': if (!/\b(sport|game|match|basketball|football|soccer|baseball|hockey|tennis|golf|boxing|mma|racing|nba|nfl|mlb|nhl|premier.?league|league|fixture|cricket|rugby|volleyball)\b/i.test(combined)) return false; break;
        case 'comedy': if (!/\b(comedy|comedian|stand.?up|improv|funny|laugh)\b/i.test(combined)) return false; break;
        case 'arts': if (!/\b(art|theater|theatre|ballet|opera|dance|exhibit|museum|gallery|performing|symphony|orchestra)\b/i.test(combined)) return false; break;
        case 'family': if (!/\b(family|kids|children|disney|paw patrol|sesame|lego|circus|magic|puppet|nickelodeon)\b/i.test(combined)) return false; break;
        case 'festivals': if (!/\b(festival|fair|carnival|expo|convention|conference|parade|celebration)\b/i.test(combined)) return false; break;
      }
    }
    if (travelGroup) {
      const eventNameLower = (event.name || '').toLowerCase();
      const eventCatLower = (event.category || '').toLowerCase();
      const combined = eventNameLower + ' ' + eventCatLower;
      switch (travelGroup) {
        case 'girls':
        case 'bachelorette':
          if (/\b(mma|ufc|boxing|wrestling|monster truck)\b/.test(combined)) return false;
          break;
        case 'family':
          if (/\b(21\+|18\+|adults only|burlesque|strip)\b/.test(combined)) return false;
          break;
        case 'boys':
        case 'friends':
          break;
      }
    }
    return true;
  });

  if (travelGroup === 'family') {
    filteredEvents.sort((a, b) => {
      const aFamily = /\b(kids|children|family|disney|nickelodeon|paw patrol|sesame|lego)\b/i.test(a.name + ' ' + a.category) ? -1 : 0;
      const bFamily = /\b(kids|children|family|disney|nickelodeon|paw patrol|sesame|lego)\b/i.test(b.name + ' ' + b.category) ? -1 : 0;
      return aFamily - bFamily;
    });
  }

  return (
    <div>
      {/* Weather Banner */}
      {weather && (
        <div className="flex items-center gap-2.5 mb-3 px-3.5 py-2.5 rounded-xl border border-blue-tint-border"
          style={{ background: 'linear-gradient(135deg, var(--blue-tint-bg), var(--bg-subtle))' }}>
          <span className="text-2xl">{weather.emoji}</span>
          <div className="flex-1">
            <span className="text-sm font-semibold text-text-primary">{weather.temp}°F</span>
            <span className="text-xs text-text-secondary ml-1.5">{weather.description}</span>
          </div>
          <div className="text-[11px] text-text-tertiary shrink-0">
            H: {weather.high}° L: {weather.low}°
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-3 flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold mb-0.5">
            Events {cityLabel ? `in ${cityLabel}` : ''} {'\u{1F3AB}'}
          </h1>
          <p className="text-text-tertiary text-[13px]">
            {eventsLoading ? 'Finding events...' : `${filteredEvents.length} upcoming events`}
          </p>
        </div>
        <div className="flex rounded-[10px] overflow-hidden border border-border-strong shrink-0">
          <button onClick={() => setEventsViewMode('list')}
            aria-label="List view"
            className={`py-2.5 px-3.5 text-xs font-medium border-none cursor-pointer min-h-[44px] ${
              eventsViewMode === 'list' ? 'bg-purple-tint-bg15 text-events-active' : 'bg-transparent text-text-tertiary'
            }`}>
            List
          </button>
          <button onClick={() => setEventsViewMode('map')}
            aria-label="Map view"
            className={`py-2.5 px-3.5 text-xs font-medium border-none cursor-pointer min-h-[44px] border-l border-border-strong ${
              eventsViewMode === 'map' ? 'bg-purple-tint-bg15 text-events-active' : 'bg-transparent text-text-tertiary'
            }`}>
            Map
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-3">
        <input
          type="text"
          placeholder="Search events, venues..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="input-field w-full pl-10"
        />
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-text-tertiary cursor-pointer text-sm p-1"
            aria-label="Clear search"
          >
            {'\u2715'}
          </button>
        )}
      </div>

      {/* Date Filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-1.5 scroll-hidden">
        {DATE_FILTERS.map(df => {
          const isActive = dateFilter === df.id;
          return (
            <button key={df.id}
              onClick={() => setDateFilter(isActive && df.id !== 'all' ? 'all' : df.id)}
              className={`py-2.5 px-3.5 rounded-2xl text-xs font-medium cursor-pointer whitespace-nowrap shrink-0 min-h-[44px] ${
                isActive
                  ? 'border border-amber-tint-border30 bg-amber-tint-bg15 text-accent-amber'
                  : 'border border-border-medium bg-transparent text-text-tertiary'
              }`}>
              {df.label}
            </button>
          );
        })}
      </div>

      {/* Event Category Filters */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-2 scroll-hidden">
        {EVENT_CATEGORIES.map(cat => {
          const isActive = eventCategoryFilter === cat.id;
          return (
            <button key={cat.id}
              onClick={() => setEventCategoryFilter(isActive && cat.id !== 'all' ? 'all' : cat.id)}
              className={`py-2.5 px-3.5 rounded-2xl text-xs font-medium cursor-pointer whitespace-nowrap shrink-0 min-h-[44px] ${
                isActive
                  ? 'border border-purple-tint-border30 bg-purple-tint-bg12 text-events-active'
                  : 'border border-border-medium bg-transparent text-text-tertiary'
              }`}>
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Events Content */}
      {eventsLoading ? (
        <div>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : eventsError ? (
        <div className="text-center pt-[60px]">
          <div className="text-[64px] mb-4 opacity-60">&#x26A0;&#xFE0F;</div>
          <h2 className="text-xl font-bold mb-2">Couldn't load events</h2>
          <p className="text-text-secondary text-sm leading-[1.5] mb-4">
            Check your connection and try again.
          </p>
          <button onClick={fetchEventsData}
            className="bg-none border border-events-active text-events-active rounded-[10px] py-2.5 px-5 text-[13px] font-semibold cursor-pointer min-h-[44px]">
            Tap to Retry
          </button>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center pt-[60px]">
          <div className="text-[64px] mb-4 opacity-60">&#x1F3AB;</div>
          <h2 className="text-xl font-bold mb-2">No events found</h2>
          <p className="text-text-secondary text-sm leading-[1.5]">
            {!useGps && !selectedCity
              ? 'Select a city or use GPS to discover events nearby'
              : searchQuery || dateFilter !== 'all' || eventCategoryFilter !== 'all'
                ? 'Try adjusting your filters or search.'
                : 'No upcoming events found in this area. Check back soon!'}
          </p>
          {(searchQuery || dateFilter !== 'all' || eventCategoryFilter !== 'all') && (
            <button
              onClick={() => { setSearchQuery(''); setDateFilter('all'); setEventCategoryFilter('all'); }}
              className="mt-3 bg-none border border-events-active text-events-active rounded-[10px] py-2.5 px-5 text-[13px] font-semibold cursor-pointer min-h-[44px]">
              Clear Filters
            </button>
          )}
        </div>
      ) : eventsViewMode === 'map' ? (
        <EventsMapView eventsList={filteredEvents} />
      ) : (
        <div>
          {filteredEvents.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      {/* Book Experiences */}
      {cityLabel && !eventsLoading && filteredEvents.length > 0 && (
        <div className="mt-4">
          <BookingLinks cityName={cityLabel} category="experiences" />
        </div>
      )}
    </div>
  );
}
