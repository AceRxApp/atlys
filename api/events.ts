// Vercel Serverless API Route — Multi-Source Events Proxy
// Aggregates events from Ticketmaster + SeatGeek + PredictHQ + TheSportsDB + API-Football

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIp } from './_lib/cors.js';

const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY || '';
const SEATGEEK_CLIENT_ID = process.env.SEATGEEK_CLIENT_ID || '';
const PREDICTHQ_TOKEN = process.env.PREDICTHQ_TOKEN || '';
const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';
const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY || '';

interface NormalizedEvent {
  id: string;
  name: string;
  date: string;
  time: string;
  venue: string;
  venueAddress: string;
  imageUrl: string | null;
  url: string;
  category: string;
  source: string;
  lat: number | null;
  lng: number | null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const corsOk = setCorsHeaders(res, req.headers.origin as string | undefined, 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!corsOk) return res.status(403).json({ error: 'Origin not allowed' });

  const clientIp = getClientIp(req.headers);
  if (!(await checkRateLimit(clientIp, 60, 60_000))) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  const { lat, lng, radius = '50', category, page = '0' } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng are required' });
  }

  const latNum = parseFloat(lat as string);
  const lngNum = parseFloat(lng as string);
  const radiusNum = parseFloat(radius as string);

  if (isNaN(latNum) || latNum < -90 || latNum > 90) {
    return res.status(400).json({ error: 'lat must be between -90 and 90' });
  }
  if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
    return res.status(400).json({ error: 'lng must be between -180 and 180' });
  }
  if (isNaN(radiusNum) || radiusNum < 0 || radiusNum > 500) {
    return res.status(400).json({ error: 'radius must be between 0 and 500 miles' });
  }

  try {
    // Phase 1: Start reverse geocoding + non-geo fetchers in parallel
    const geoPromise = GOOGLE_API_KEY
      ? reverseGeocode(latNum, lngNum)
      : Promise.resolve(null);

    const nonGeoFetchers: Promise<NormalizedEvent[]>[] = [];
    if (TICKETMASTER_API_KEY) {
      nonGeoFetchers.push(fetchTicketmaster(latNum, lngNum, radius as string, category as string | undefined, page as string));
    }
    if (SEATGEEK_CLIENT_ID) {
      nonGeoFetchers.push(fetchSeatGeek(latNum, lngNum, radius as string));
    }
    if (PREDICTHQ_TOKEN) {
      nonGeoFetchers.push(fetchPredictHQ(latNum, lngNum, radius as string));
    }

    const [geoResult, ...nonGeoResults] = await Promise.all([
      geoPromise,
      ...nonGeoFetchers.map(f => f.catch(() => [] as NormalizedEvent[])),
    ]);

    let allEvents: NormalizedEvent[] = [];
    for (const events of nonGeoResults) {
      allEvents = allEvents.concat(events);
    }

    // Phase 2: Country-based sports fetchers (need reverse geocode result)
    const country = geoResult?.country || '';
    if (country) {
      const sportsFetchers: Promise<NormalizedEvent[]>[] = [
        fetchSportsDB(country).catch(() => [] as NormalizedEvent[]),
      ];
      if (API_FOOTBALL_KEY) {
        sportsFetchers.push(fetchFootballFixtures(country).catch(() => [] as NormalizedEvent[]));
      }
      const sportsResults = await Promise.all(sportsFetchers);
      for (const events of sportsResults) {
        allEvents = allEvents.concat(events);
      }
    }

    // If no API keys are configured and no sports data found, return helpful message
    if (allEvents.length === 0 && !TICKETMASTER_API_KEY && !SEATGEEK_CLIENT_ID && !PREDICTHQ_TOKEN && !country) {
      return res.status(200).json({
        events: [],
        totalEvents: 0,
        message: 'No event API keys configured. Add TICKETMASTER_API_KEY, SEATGEEK_CLIENT_ID, or PREDICTHQ_TOKEN.',
      });
    }

    // Deduplicate by name + date (fuzzy match)
    const seen = new Set<string>();
    const deduped = allEvents.filter(e => {
      const key = `${e.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30)}_${e.date}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Geocode events missing coordinates (batch up to 15 to avoid excessive API calls)
    if (GOOGLE_API_KEY) {
      const needsGeocode = deduped.filter(e => !e.lat && !e.lng && (e.venue || e.venueAddress));
      const toGeocode = needsGeocode.slice(0, 15);
      if (toGeocode.length > 0) {
        const geocodeResults = await Promise.allSettled(
          toGeocode.map(e => geocodeVenue(e.venue, e.venueAddress))
        );
        geocodeResults.forEach((result, i) => {
          if (result.status === 'fulfilled' && result.value) {
            toGeocode[i].lat = result.value.lat;
            toGeocode[i].lng = result.value.lng;
          }
        });
      }
    }

    // Sort by date
    deduped.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    });

    return res.status(200).json({
      events: deduped,
      totalEvents: deduped.length,
      country,
      sources: {
        ticketmaster: !!TICKETMASTER_API_KEY,
        seatgeek: !!SEATGEEK_CLIENT_ID,
        predicthq: !!PREDICTHQ_TOKEN,
        thesportsdb: true,
        apifootball: !!API_FOOTBALL_KEY,
      },
    });
  } catch (error) {
    console.error('Events API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// --------------------------------------------------------------------------
// Reverse geocode lat/lng to country name (for sports API lookups)
// --------------------------------------------------------------------------
async function reverseGeocode(lat: number, lng: number): Promise<{ country: string; city: string } | null> {
  try {
    const resp = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&result_type=country|locality&key=${GOOGLE_API_KEY}`
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    let country = '';
    let city = '';
    for (const result of data.results || []) {
      for (const comp of (result.address_components || []) as { long_name: string; types: string[] }[]) {
        if (comp.types?.includes('country') && !country) country = comp.long_name;
        if (comp.types?.includes('locality') && !city) city = comp.long_name;
      }
    }
    return country ? { country, city } : null;
  } catch { return null; }
}

// --------------------------------------------------------------------------
// Ticketmaster
// --------------------------------------------------------------------------
async function fetchTicketmaster(lat: number, lng: number, radius: string, category?: string, page: string = '0'): Promise<NormalizedEvent[]> {
  const params = new URLSearchParams({
    apikey: TICKETMASTER_API_KEY,
    latlong: `${lat},${lng}`,
    radius,
    unit: 'miles',
    sort: 'date,asc',
    size: '50',
    page,
  });

  if (category) params.set('classificationName', category);

  const response = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${params}`);
  if (!response.ok) return [];

  const data = await response.json();
  return (data._embedded?.events || []).map((event: Record<string, unknown>) => {
    const embedded = event._embedded as Record<string, unknown[]> | undefined;
    const venue = embedded?.venues?.[0] as Record<string, unknown> | undefined;
    const images = event.images as { url: string; width: number }[] | undefined;
    const dates = event.dates as { start?: { localDate?: string; localTime?: string } } | undefined;
    const bestImage = images?.sort((a, b) => (b.width || 0) - (a.width || 0))[0];
    const venueLocation = venue?.location as Record<string, string> | undefined;

    return {
      id: `tm_${event.id}`,
      name: event.name as string,
      date: dates?.start?.localDate || '',
      time: dates?.start?.localTime || '',
      venue: (venue?.name as string) || 'TBA',
      venueAddress: ((venue?.address as Record<string, string>)?.line1) || '',
      imageUrl: bestImage?.url || null,
      url: (event.url as string) || '',
      category: ((event.classifications as Record<string, Record<string, string>>[])?.[0]?.segment?.name) || 'Event',
      source: 'Ticketmaster',
      lat: venueLocation?.latitude ? parseFloat(venueLocation.latitude) : null,
      lng: venueLocation?.longitude ? parseFloat(venueLocation.longitude) : null,
    };
  });
}

// --------------------------------------------------------------------------
// SeatGeek
// --------------------------------------------------------------------------
async function fetchSeatGeek(lat: number, lng: number, radius: string): Promise<NormalizedEvent[]> {
  const params = new URLSearchParams({
    client_id: SEATGEEK_CLIENT_ID,
    lat: lat.toString(),
    lon: lng.toString(),
    range: `${radius}mi`,
    per_page: '50',
    sort: 'datetime_local.asc',
  });

  const response = await fetch(`https://api.seatgeek.com/2/events?${params}`);
  if (!response.ok) return [];

  const data = await response.json();
  return (data.events || []).map((event: Record<string, unknown>) => {
    const venue = event.venue as Record<string, unknown> | undefined;
    const performers = event.performers as Record<string, unknown>[] | undefined;
    const bestImage = performers?.[0]?.image as string | undefined;
    const dtLocal = event.datetime_local as string | undefined;
    const date = dtLocal ? dtLocal.split('T')[0] : '';
    const time = dtLocal ? dtLocal.split('T')[1]?.slice(0, 5) || '' : '';

    return {
      id: `sg_${event.id}`,
      name: (event.short_title || event.title) as string,
      date,
      time,
      venue: (venue?.name as string) || 'TBA',
      venueAddress: venue ? `${(venue.address as string) || ''}, ${(venue.city as string) || ''}` : '',
      imageUrl: bestImage || null,
      url: (event.url as string) || '',
      category: (event.type as string)?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Event',
      source: 'SeatGeek',
      lat: (venue?.location as Record<string, number>)?.lat || null,
      lng: (venue?.location as Record<string, number>)?.lon || null,
    };
  });
}

// --------------------------------------------------------------------------
// PredictHQ — expanded categories for broader global coverage
// --------------------------------------------------------------------------
async function fetchPredictHQ(lat: number, lng: number, radius: string): Promise<NormalizedEvent[]> {
  const radiusKm = Math.round(parseFloat(radius) * 1.609);
  const today = new Date().toISOString().split('T')[0];

  const params = new URLSearchParams({
    'within': `${radiusKm}km@${lat},${lng}`,
    'active.gte': today,
    'category': 'academic,community,concerts,conferences,expos,festivals,observances,performing-arts,public-holidays,sports',
    'limit': '50',
    'sort': 'start',
  });

  const response = await fetch(`https://api.predicthq.com/v1/events/?${params}`, {
    headers: { Authorization: `Bearer ${PREDICTHQ_TOKEN}` },
  });
  if (!response.ok) return [];

  const data = await response.json();
  return (data.results || []).map((event: Record<string, unknown>) => {
    const location = event.location as number[] | undefined;
    const start = event.start as string | undefined;
    const date = start ? start.split('T')[0] : '';
    const time = start ? start.split('T')[1]?.slice(0, 5) || '' : '';
    const entities = event.entities as Record<string, unknown>[] | undefined;
    const venue = entities?.find(e => (e.type as string) === 'venue');

    return {
      id: `phq_${event.id}`,
      name: event.title as string,
      date,
      time,
      venue: (venue?.name as string) || '',
      venueAddress: '',
      imageUrl: null,
      url: '',
      category: ((event.category as string) || 'Event').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      source: 'PredictHQ',
      lat: location ? location[1] : null,
      lng: location ? location[0] : null,
    };
  });
}

// --------------------------------------------------------------------------
// TheSportsDB — Free global sports events (no API key needed)
// Searches for sports leagues in the user's country, then fetches upcoming events
// --------------------------------------------------------------------------
async function fetchSportsDB(country: string): Promise<NormalizedEvent[]> {
  try {
    // Step 1: Get all sports leagues for this country
    const leaguesResp = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/search_all_leagues.php?c=${encodeURIComponent(country)}`
    );
    if (!leaguesResp.ok) return [];
    const leaguesData = await leaguesResp.json();

    // TheSportsDB response key varies: "countries" or "countrys" (API typo)
    const leagues = (leaguesData.countries || leaguesData.countrys || []) as {
      idLeague: string;
      strLeague: string;
      strSport: string;
      strCurrentSeason?: string;
    }[];
    if (leagues.length === 0) return [];

    // Limit to top 8 leagues to avoid excessive API calls
    const topLeagues = leagues.slice(0, 8);

    // Step 2: Get next upcoming events for each league (parallel)
    const eventPromises = topLeagues.map(league =>
      fetch(`https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=${league.idLeague}`)
        .then(r => r.json())
        .catch(() => ({ events: null }))
    );
    const eventResults = await Promise.all(eventPromises);

    const events: NormalizedEvent[] = [];
    for (let i = 0; i < eventResults.length; i++) {
      const result = eventResults[i];
      const league = topLeagues[i];
      if (!result.events) continue;

      for (const ev of result.events as {
        idEvent: string;
        strEvent: string;
        strHomeTeam?: string;
        strAwayTeam?: string;
        dateEvent?: string;
        strTime?: string;
        strVenue?: string;
        strCity?: string;
        strCountry?: string;
        strThumb?: string;
        strBanner?: string;
        strSport?: string;
        strLeague?: string;
      }[]) {
        // Only include future events
        if (ev.dateEvent) {
          const eventDate = new Date(ev.dateEvent + 'T00:00:00');
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          if (eventDate < now) continue;
        }

        events.push({
          id: `sdb_${ev.idEvent}`,
          name: ev.strEvent || `${ev.strHomeTeam || '?'} vs ${ev.strAwayTeam || '?'}`,
          date: ev.dateEvent || '',
          time: ev.strTime?.slice(0, 5) || '',
          venue: ev.strVenue || '',
          venueAddress: [ev.strCity, ev.strCountry].filter(Boolean).join(', '),
          imageUrl: ev.strThumb || ev.strBanner || null,
          url: '',
          category: `Sports - ${ev.strSport || league.strSport || ev.strLeague || league.strLeague || 'Sports'}`,
          source: 'TheSportsDB',
          lat: null,
          lng: null,
        });
      }
    }

    return events;
  } catch { return []; }
}

// --------------------------------------------------------------------------
// API-Football — Comprehensive football/soccer fixtures (needs API_FOOTBALL_KEY)
// Covers 900+ leagues worldwide including Ghana Premier League, African leagues, etc.
// --------------------------------------------------------------------------
async function fetchFootballFixtures(country: string): Promise<NormalizedEvent[]> {
  if (!API_FOOTBALL_KEY) return [];
  try {
    // Step 1: Get active leagues for this country
    const leaguesResp = await fetch(
      `https://v3.football.api-sports.io/leagues?country=${encodeURIComponent(country)}&current=true`,
      { headers: { 'x-apisports-key': API_FOOTBALL_KEY } }
    );
    if (!leaguesResp.ok) return [];
    const leaguesData = await leaguesResp.json();

    const leagues = (leaguesData.response || []) as {
      league: { id: number; name: string; logo?: string };
      seasons: { year: number }[];
    }[];
    if (leagues.length === 0) return [];

    // Limit to top 5 leagues
    const topLeagues = leagues.slice(0, 5);

    // Step 2: Get fixtures for the next 30 days (parallel)
    const today = new Date();
    const future = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const fromDate = today.toISOString().split('T')[0];
    const toDate = future.toISOString().split('T')[0];

    const fixturePromises = topLeagues.map(l => {
      const season = l.seasons?.[0]?.year || new Date().getFullYear();
      return fetch(
        `https://v3.football.api-sports.io/fixtures?league=${l.league.id}&season=${season}&from=${fromDate}&to=${toDate}`,
        { headers: { 'x-apisports-key': API_FOOTBALL_KEY } }
      ).then(r => r.json()).catch(() => ({ response: [] }));
    });

    const fixtureResults = await Promise.all(fixturePromises);
    const events: NormalizedEvent[] = [];

    for (const result of fixtureResults) {
      for (const f of (result.response || []) as {
        fixture: { id: number; date: string; venue?: { name?: string; city?: string } };
        teams: { home: { name: string }; away: { name: string } };
        league: { name?: string; logo?: string };
      }[]) {
        const dt = new Date(f.fixture.date);
        events.push({
          id: `af_${f.fixture.id}`,
          name: `${f.teams.home.name} vs ${f.teams.away.name}`,
          date: dt.toISOString().split('T')[0],
          time: dt.toISOString().split('T')[1]?.slice(0, 5) || '',
          venue: f.fixture.venue?.name || '',
          venueAddress: f.fixture.venue?.city || '',
          imageUrl: f.league?.logo || null,
          url: '',
          category: `Sports - ${f.league?.name || 'Football'}`,
          source: 'API-Football',
          lat: null,
          lng: null,
        });
      }
    }

    return events;
  } catch { return []; }
}

// --------------------------------------------------------------------------
// Geocode venue name/address to coordinates
// --------------------------------------------------------------------------
async function geocodeVenue(venue: string, address: string): Promise<{ lat: number; lng: number } | null> {
  const query = address ? `${venue}, ${address}` : venue;
  if (!query.trim()) return null;
  try {
    const params = new URLSearchParams({
      address: query,
      key: GOOGLE_API_KEY,
    });
    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);
    if (!response.ok) return null;
    const data = await response.json();
    const result = data.results?.[0];
    if (!result?.geometry?.location) return null;
    return { lat: result.geometry.location.lat, lng: result.geometry.location.lng };
  } catch {
    return null;
  }
}
