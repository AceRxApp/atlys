import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import EventCard from '../components/EventCard';
import BookingLinks from '../components/BookingLinks';
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
  const mappableEvents = eventsList.filter(e => e.lat && e.lng);

  if (mappableEvents.length === 0) {
    return (
      <div className="text-center py-[60px] px-5">
        <div className="text-[40px] mb-3">🗺️</div>
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
                      className="block p-1.5 rounded-md bg-[#7C3AED] text-white text-[11px] font-semibold text-center no-underline">
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
  } = useApp();
  const { theme } = useTheme();

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
    if (eventCategoryFilter !== 'all') {
      const catLower = (event.category || '').toLowerCase();
      const nameLower = (event.name || '').toLowerCase();
      const combined = catLower + ' ' + nameLower;
      switch (eventCategoryFilter) {
        case 'music': if (!/\b(music|concert|live|band|dj|singer|tour|rap|hip.?hop|r&b|pop|rock|jazz|country|latin|reggae)\b/i.test(combined)) return false; break;
        case 'sports': if (!/\b(sport|game|match|basketball|football|soccer|baseball|hockey|tennis|golf|boxing|mma|racing|nba|nfl|mlb|nhl)\b/i.test(combined)) return false; break;
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
      {/* Header */}
      <div className="mb-3 flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold mb-0.5">
            Events {cityLabel ? `in ${cityLabel}` : ''} 🎫
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

      {/* Event Category Filters */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-2 scroll-hidden">
        {EVENT_CATEGORIES.map(cat => {
          const isActive = eventCategoryFilter === cat.id;
          return (
            <button key={cat.id}
              onClick={() => setEventCategoryFilter(isActive && cat.id !== 'all' ? 'all' : cat.id)}
              className={`py-1.5 px-3.5 rounded-2xl text-xs font-medium cursor-pointer whitespace-nowrap shrink-0 ${
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
        <div className="text-center py-[60px]">
          <div className="w-9 h-9 border-3 border-purple-tint-border20 border-t-events-active rounded-full mx-auto mb-4 animate-spin" />
          <p className="text-text-tertiary text-sm">Finding events nearby...</p>
        </div>
      ) : eventsError ? (
        <div className="text-center pt-[60px]">
          <div className="text-[64px] mb-4 opacity-60">&#x26A0;&#xFE0F;</div>
          <h2 className="text-xl font-bold mb-2">Couldn't load events</h2>
          <p className="text-text-secondary text-sm leading-[1.5] mb-4">
            Check your connection and try again.
          </p>
          <button onClick={fetchEventsData}
            className="bg-none border border-events-active text-events-active rounded-[10px] py-2.5 px-5 text-[13px] font-semibold cursor-pointer">
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
              : 'No upcoming events found in this area. Check back soon!'}
          </p>
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

      {/* Book Your Trip */}
      {cityLabel && (
        <div className="mt-4">
          <BookingLinks cityName={cityLabel} />
        </div>
      )}
    </div>
  );
}
