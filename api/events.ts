// Vercel Serverless API Route — Multi-Source Events Proxy
// Aggregates events from Ticketmaster + SeatGeek + PredictHQ

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIp } from './_lib/cors.js';

const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY || '';
const SEATGEEK_CLIENT_ID = process.env.SEATGEEK_CLIENT_ID || '';
const PREDICTHQ_TOKEN = process.env.PREDICTHQ_TOKEN || '';

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
  if (isNaN(radiusNum) || radiusNum < 0 || radiusNum > 200) {
    return res.status(400).json({ error: 'radius must be between 0 and 200 miles' });
  }

  // Fetch from all configured sources in parallel
  const fetchers: Promise<NormalizedEvent[]>[] = [];

  if (TICKETMASTER_API_KEY) {
    fetchers.push(fetchTicketmaster(latNum, lngNum, radius as string, category as string | undefined, page as string));
  }
  if (SEATGEEK_CLIENT_ID) {
    fetchers.push(fetchSeatGeek(latNum, lngNum, radius as string));
  }
  if (PREDICTHQ_TOKEN) {
    fetchers.push(fetchPredictHQ(latNum, lngNum, radius as string));
  }

  if (fetchers.length === 0) {
    return res.status(200).json({ events: [], totalEvents: 0, message: 'No event API keys configured. Add TICKETMASTER_API_KEY, SEATGEEK_CLIENT_ID, or PREDICTHQ_TOKEN.' });
  }

  try {
    const results = await Promise.allSettled(fetchers);
    let allEvents: NormalizedEvent[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        allEvents = allEvents.concat(result.value);
      }
    }

    // Deduplicate by name + date (fuzzy match)
    const seen = new Set<string>();
    const deduped = allEvents.filter(e => {
      const key = `${e.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30)}_${e.date}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by date
    deduped.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    });

    return res.status(200).json({
      events: deduped,
      totalEvents: deduped.length,
      sources: {
        ticketmaster: !!TICKETMASTER_API_KEY,
        seatgeek: !!SEATGEEK_CLIENT_ID,
        predicthq: !!PREDICTHQ_TOKEN,
      },
    });
  } catch (error) {
    console.error('Events API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
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
// PredictHQ
// --------------------------------------------------------------------------
async function fetchPredictHQ(lat: number, lng: number, radius: string): Promise<NormalizedEvent[]> {
  const radiusKm = Math.round(parseFloat(radius) * 1.609);
  const today = new Date().toISOString().split('T')[0];

  const params = new URLSearchParams({
    'within': `${radiusKm}km@${lat},${lng}`,
    'active.gte': today,
    'category': 'concerts,conferences,expos,festivals,performing-arts,community,sports',
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
