// Vercel Serverless API Route — Multi-Source Events Proxy
// Aggregates: Ticketmaster + SeatGeek + PredictHQ + TheSportsDB + API-Football + GetYourGuide + Eventbrite

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIp, validateApiKey } from './_lib/cors.js';

const TICKETMASTER_API_KEY = (process.env.TICKETMASTER_API_KEY || '').trim();
const SEATGEEK_CLIENT_ID = (process.env.SEATGEEK_CLIENT_ID || '').trim();
const PREDICTHQ_TOKEN = (process.env.PREDICTHQ_TOKEN || '').trim();
const GOOGLE_API_KEY = (process.env.GOOGLE_PLACES_API_KEY || '').trim();
const API_FOOTBALL_KEY = (process.env.API_FOOTBALL_KEY || '').trim();
const GETYOURGUIDE_KEY = (process.env.GETYOURGUIDE_PARTNER_KEY || '').trim();
// Eventbrite token no longer needed — using public page scraping instead of deprecated API

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
  if (!corsOk) {
    const apiKeyInfo = await validateApiKey(req.headers as Record<string, string | string[] | undefined>, res, 'events');
    if (!apiKeyInfo) return res.status(403).json({ error: 'Origin not allowed. Use X-API-Key header for API access.' });
    // Events requires Basic tier or higher
    if (apiKeyInfo.tier === 'free') return res.status(403).json({ error: 'Events API requires Basic tier or higher. Upgrade at nxstops.com/developers' });
  }

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
    // Phase 1: Reverse geocode + location-based fetchers in parallel
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
    const [geoResult, ...nonGeoResults] = await Promise.all([
      geoPromise,
      ...nonGeoFetchers.map(f => f.catch(() => [] as NormalizedEvent[])),
    ]);

    let allEvents: NormalizedEvent[] = [];
    for (const events of nonGeoResults) {
      allEvents = allEvents.concat(events);
    }

    const country = geoResult?.country || '';
    const countryCode = geoResult?.countryCode || '';

    // Phase 2: Country-aware fetchers (run in parallel)
    const phase2Fetchers: Promise<NormalizedEvent[]>[] = [];

    // PredictHQ — now with country filter to prevent foreign events
    if (PREDICTHQ_TOKEN) {
      phase2Fetchers.push(fetchPredictHQ(latNum, lngNum, radius as string, countryCode).catch(() => [] as NormalizedEvent[]));
    }

    // Sports APIs — country-based
    if (country) {
      phase2Fetchers.push(fetchSportsDB(country).catch(() => [] as NormalizedEvent[]));
      if (API_FOOTBALL_KEY) {
        phase2Fetchers.push(fetchFootballFixtures(country).catch(() => [] as NormalizedEvent[]));
      }
    }

    // GetYourGuide — tours & activities
    if (GETYOURGUIDE_KEY) {
      phase2Fetchers.push(fetchGetYourGuide(latNum, lngNum).catch(() => [] as NormalizedEvent[]));
    }

    // Eventbrite — scrape public search page (needs city/country)
    if (geoResult?.city && geoResult?.country) {
      phase2Fetchers.push(fetchEventbrite(geoResult.city, geoResult.country).catch(() => [] as NormalizedEvent[]));
    }

    if (phase2Fetchers.length > 0) {
      const phase2Results = await Promise.all(phase2Fetchers);
      for (const events of phase2Results) {
        allEvents = allEvents.concat(events);
      }
    }

    // If nothing at all, return helpful message
    if (allEvents.length === 0 && !TICKETMASTER_API_KEY && !SEATGEEK_CLIENT_ID && !PREDICTHQ_TOKEN && !country) {
      return res.status(200).json({
        events: [],
        totalEvents: 0,
        message: 'No event API keys configured. Add TICKETMASTER_API_KEY, SEATGEEK_CLIENT_ID, or PREDICTHQ_TOKEN.',
      });
    }

    // Filter out past events and junk/test event names
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const JUNK_PATTERNS = [
      /^test\b/i,
      /\btest\s+test/i,
      /^tbd$/i,
      /^tba$/i,
      /^placeholder/i,
      /^untitled\s*event$/i,
      /^sample\b/i,
    ];

    const filtered = allEvents.filter(e => {
      // Remove events with dates in the past
      if (e.date && e.date < todayStr) return false;
      // Remove junk/test event names
      const name = (e.name || '').trim();
      if (!name || name.length < 2) return false;
      if (JUNK_PATTERNS.some(p => p.test(name))) return false;
      return true;
    });

    // Deduplicate by name + date (fuzzy match)
    const seen = new Set<string>();
    const deduped = filtered.filter(e => {
      const key = `${e.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30)}_${e.date}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Geocode events missing coordinates (batch up to 15)
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

    // Sort by date (dateless tours/activities go to end)
    deduped.sort((a, b) => {
      if (!a.date && !b.date) return 0;
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
        getyourguide: !!GETYOURGUIDE_KEY,
        eventbrite: true,
      },
    });
  } catch (error) {
    console.error('Events API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// --------------------------------------------------------------------------
// Reverse geocode lat/lng → country name + ISO code + city
// --------------------------------------------------------------------------
async function reverseGeocode(lat: number, lng: number): Promise<{ country: string; countryCode: string; city: string } | null> {
  try {
    const resp = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&result_type=country|locality&key=${GOOGLE_API_KEY}`
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    let country = '';
    let countryCode = '';
    let city = '';
    for (const result of data.results || []) {
      for (const comp of (result.address_components || []) as { long_name: string; short_name: string; types: string[] }[]) {
        if (comp.types?.includes('country') && !country) {
          country = comp.long_name;
          countryCode = comp.short_name;  // ISO 3166-1 alpha-2 (e.g., "GH" for Ghana)
        }
        if (comp.types?.includes('locality') && !city) city = comp.long_name;
      }
    }
    return country ? { country, countryCode, city } : null;
  } catch { return null; }
}

// --------------------------------------------------------------------------
// Ticketmaster
// --------------------------------------------------------------------------
async function fetchTicketmaster(lat: number, lng: number, radius: string, category?: string, page: string = '0'): Promise<NormalizedEvent[]> {
  const now = new Date();
  const startDateTime = now.toISOString().split('.')[0] + 'Z';
  const params = new URLSearchParams({
    apikey: TICKETMASTER_API_KEY,
    latlong: `${lat},${lng}`,
    radius,
    unit: 'miles',
    sort: 'date,asc',
    size: '50',
    page,
    startDateTime,
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
  const now = new Date();
  const nowISO = now.toISOString().split('.')[0];
  const params = new URLSearchParams({
    client_id: SEATGEEK_CLIENT_ID,
    lat: lat.toString(),
    lon: lng.toString(),
    range: `${radius}mi`,
    per_page: '50',
    sort: 'datetime_local.asc',
    'datetime_local.gte': nowISO,
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
// PredictHQ — now with country code filter to prevent foreign events
// --------------------------------------------------------------------------
async function fetchPredictHQ(lat: number, lng: number, radius: string, countryCode?: string): Promise<NormalizedEvent[]> {
  const radiusKm = Math.round(parseFloat(radius) * 1.609);
  const today = new Date().toISOString().split('T')[0];

  const params = new URLSearchParams({
    'within': `${radiusKm}km@${lat},${lng}`,
    'active.gte': today,
    'category': 'academic,community,concerts,conferences,expos,festivals,observances,performing-arts,public-holidays,sports',
    'limit': '50',
    'sort': 'start',
  });

  // Filter by country to prevent foreign events (e.g., English Premier League in Ghana)
  if (countryCode) {
    params.set('country', countryCode);
  }

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
// Now filters events to only include those in the target country
// --------------------------------------------------------------------------
async function fetchSportsDB(country: string): Promise<NormalizedEvent[]> {
  try {
    const leaguesResp = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/search_all_leagues.php?c=${encodeURIComponent(country)}`
    );
    if (!leaguesResp.ok) return [];
    const leaguesData = await leaguesResp.json();

    const leagues = (leaguesData.countries || leaguesData.countrys || []) as {
      idLeague: string;
      strLeague: string;
      strSport: string;
      strCountry?: string;
    }[];
    if (leagues.length === 0) return [];

    // Only keep leagues that actually belong to the target country
    const countryLower = country.toLowerCase();
    const countryLeagues = leagues.filter(l =>
      !l.strCountry || l.strCountry.toLowerCase() === countryLower
    );
    const topLeagues = countryLeagues.slice(0, 8);
    if (topLeagues.length === 0) return [];

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

        // Skip events explicitly in a different country
        if (ev.strCountry && ev.strCountry.toLowerCase() !== countryLower) continue;

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
// --------------------------------------------------------------------------
async function fetchFootballFixtures(country: string): Promise<NormalizedEvent[]> {
  if (!API_FOOTBALL_KEY) return [];
  try {
    const leaguesResp = await fetch(
      `https://v3.football.api-sports.io/leagues?country=${encodeURIComponent(country)}&current=true`,
      { headers: { 'x-apisports-key': API_FOOTBALL_KEY } }
    );
    if (!leaguesResp.ok) return [];
    const leaguesData = await leaguesResp.json();

    const leagues = (leaguesData.response || []) as {
      league: { id: number; name: string; logo?: string };
      country: { name: string };
      seasons: { year: number }[];
    }[];
    if (leagues.length === 0) return [];

    // Only keep leagues from the target country
    const countryLower = country.toLowerCase();
    const countryLeagues = leagues.filter(l =>
      !l.country?.name || l.country.name.toLowerCase() === countryLower
    );
    const topLeagues = countryLeagues.slice(0, 5);
    if (topLeagues.length === 0) return [];

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
// GetYourGuide — Tours, activities & experiences worldwide
// --------------------------------------------------------------------------
async function fetchGetYourGuide(lat: number, lng: number): Promise<NormalizedEvent[]> {
  if (!GETYOURGUIDE_KEY) return [];
  try {
    const params = new URLSearchParams({
      'coordinates[lat]': lat.toString(),
      'coordinates[lng]': lng.toString(),
      'limit': '20',
      'sort_by': 'popularity',
    });

    const response = await fetch(`https://api.getyourguide.com/1/activities?${params}`, {
      headers: {
        'X-Access-Token': GETYOURGUIDE_KEY,
        'Accept': 'application/json',
      },
    });
    if (!response.ok) return [];

    const data = await response.json();
    const activities = data.data?.activities || data.activities || [];

    return activities.map((a: {
      activity_id?: number;
      id?: number;
      title?: string;
      abstract?: string;
      url?: string;
      pictures?: { url: string }[];
      images?: { url: string }[];
      price?: { values?: { amount?: number; currency?: string } };
      coordinates?: { lat: number; lng: number };
      location?: { name?: string; city?: string };
      categories?: { name: string }[];
      rating?: number;
      reviews_count?: number;
      duration?: { value: number; unit: string };
    }) => {
      const price = a.price?.values?.amount;
      const currency = a.price?.values?.currency || 'USD';
      const priceStr = price ? ` · From ${currency} ${price}` : '';
      const rating = a.rating ? ` · ${a.rating}/5` : '';
      const imgUrl = a.pictures?.[0]?.url || a.images?.[0]?.url || null;
      const cat = a.categories?.[0]?.name || 'Tours & Activities';

      return {
        id: `gyg_${a.activity_id || a.id}`,
        name: a.title || '',
        date: '',  // Tours are ongoing — no specific date
        time: '',
        venue: a.location?.name || '',
        venueAddress: `${cat}${priceStr}${rating}`,
        imageUrl: imgUrl,
        url: a.url || '',
        category: 'Tours & Activities',
        source: 'GetYourGuide',
        lat: a.coordinates?.lat || null,
        lng: a.coordinates?.lng || null,
      };
    });
  } catch { return []; }
}

// --------------------------------------------------------------------------
// Eventbrite — Scrape public search page for events (API search deprecated)
// --------------------------------------------------------------------------
async function fetchEventbrite(city: string, country: string): Promise<NormalizedEvent[]> {
  try {
    // Build Eventbrite search URL: /d/{country}--{city}/all-events/
    const slug = (s: string) => s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const url = `https://www.eventbrite.com/d/${slug(country)}--${slug(city)}/all-events/`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NxStops/1.0)',
        'Accept': 'text/html',
      },
    });
    if (!response.ok) return [];

    const html = await response.text();

    // Extract JSON-LD structured event data from <script type="application/ld+json">
    const ldMatches = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) || [];

    const events: NormalizedEvent[] = [];
    for (const scriptTag of ldMatches) {
      const jsonStr = scriptTag.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
      try {
        const data = JSON.parse(jsonStr);
        if (!data?.itemListElement) continue;

        for (const item of data.itemListElement) {
          const ev = item.item;
          if (!ev || ev['@type'] !== 'Event') continue;

          const startDate = ev.startDate || '';
          const date = startDate.includes('T') ? startDate.split('T')[0] : startDate;
          const time = startDate.includes('T') ? startDate.split('T')[1]?.slice(0, 5) || '' : '';
          const geo = ev.location?.geo;
          const address = ev.location?.address;

          // Extract event ID from URL
          const idMatch = ev.url?.match(/tickets?-(\d+)/);
          const eventId = idMatch ? idMatch[1] : String(events.length);

          events.push({
            id: `eb_${eventId}`,
            name: ev.name || '',
            date,
            time,
            venue: ev.location?.name || '',
            venueAddress: [address?.streetAddress, address?.addressLocality].filter(Boolean).join(', '),
            imageUrl: ev.image || null,
            url: ev.url || '',
            category: 'Event',
            source: 'Eventbrite',
            lat: geo?.latitude ? parseFloat(geo.latitude) : null,
            lng: geo?.longitude ? parseFloat(geo.longitude) : null,
          });
        }
      } catch { /* skip malformed JSON-LD */ }
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
