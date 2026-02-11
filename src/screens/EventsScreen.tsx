import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import EventCard from '../components/EventCard';
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
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>🗺️</div>
        <p style={{ color: theme.text.secondary, fontSize: '14px' }}>No event locations available to map</p>
      </div>
    );
  }

  return (
    <div style={{ height: 'calc(100vh - 280px)', borderRadius: '16px', overflow: 'hidden', border: `1px solid ${theme.border.subtle}` }}>
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
                <div style={{ padding: '4px', minWidth: '180px', color: '#1C1917' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{event.name}</div>
                  <div style={{ fontSize: '12px', color: '#57534E', marginBottom: '2px' }}>
                    {formatEventDate(event.date)}{event.time ? ` · ${formatEventTime(event.time)}` : ''}
                  </div>
                  <div style={{ fontSize: '11px', color: '#78716C', marginBottom: '8px' }}>{event.venue}</div>
                  {event.url && (
                    <a href={event.url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'block', padding: '6px', borderRadius: '6px', background: '#7C3AED', color: 'white', fontSize: '11px', fontWeight: 600, textAlign: 'center', textDecoration: 'none' }}>
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
      <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '2px' }}>
            Events {cityLabel ? `in ${cityLabel}` : ''} 🎫
          </h1>
          <p style={{ color: theme.text.tertiary, fontSize: '13px' }}>
            {eventsLoading ? 'Finding events...' : `${filteredEvents.length} upcoming events`}
          </p>
        </div>
        <div style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', border: `1px solid ${theme.border.strong}`, flexShrink: 0 }}>
          <button onClick={() => setEventsViewMode('list')}
            aria-label="List view"
            style={{
              padding: '10px 14px', fontSize: '12px', fontWeight: 500, border: 'none', cursor: 'pointer',
              background: eventsViewMode === 'list' ? theme.purpleTint.bg15 : 'transparent',
              color: eventsViewMode === 'list' ? theme.events.active : theme.text.tertiary, minHeight: '44px',
            }}>
            List
          </button>
          <button onClick={() => setEventsViewMode('map')}
            aria-label="Map view"
            style={{
              padding: '10px 14px', fontSize: '12px', fontWeight: 500, border: 'none', cursor: 'pointer',
              borderLeft: `1px solid ${theme.border.strong}`,
              background: eventsViewMode === 'map' ? theme.purpleTint.bg15 : 'transparent',
              color: eventsViewMode === 'map' ? theme.events.active : theme.text.tertiary, minHeight: '44px',
            }}>
            Map
          </button>
        </div>
      </div>

      {/* Event Category Filters */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '8px', scrollbarWidth: 'none' }}>
        {EVENT_CATEGORIES.map(cat => {
          const isActive = eventCategoryFilter === cat.id;
          return (
            <button key={cat.id}
              onClick={() => setEventCategoryFilter(isActive && cat.id !== 'all' ? 'all' : cat.id)}
              style={{
                padding: '6px 14px', borderRadius: '16px', fontSize: '12px', fontWeight: 500,
                border: isActive ? `1px solid ${theme.purpleTint.border30}` : `1px solid ${theme.border.medium}`,
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                background: isActive ? theme.purpleTint.bg12 : 'transparent',
                color: isActive ? theme.events.active : theme.text.tertiary,
              }}>
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Events Content */}
      {eventsLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ width: '36px', height: '36px', border: `3px solid ${theme.purpleTint.border20}`, borderTopColor: theme.events.active, borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: theme.text.tertiary, fontSize: '14px' }}>Finding events nearby...</p>
        </div>
      ) : eventsError ? (
        <div style={{ textAlign: 'center', paddingTop: '60px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.6 }}>&#x26A0;&#xFE0F;</div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Couldn't load events</h2>
          <p style={{ color: theme.text.secondary, fontSize: '14px', lineHeight: 1.5, marginBottom: '16px' }}>
            Check your connection and try again.
          </p>
          <button onClick={fetchEventsData}
            style={{ background: 'none', border: `1px solid ${theme.events.active}`, color: theme.events.active, borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            Tap to Retry
          </button>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: '60px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.6 }}>&#x1F3AB;</div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>No events found</h2>
          <p style={{ color: theme.text.secondary, fontSize: '14px', lineHeight: 1.5 }}>
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
    </div>
  );
}
