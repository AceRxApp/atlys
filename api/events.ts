// Vercel Serverless API Route — Ticketmaster Events Proxy
// Keeps API keys server-side, never exposed to the browser

import type { VercelRequest, VercelResponse } from '@vercel/node';

const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY || '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (!TICKETMASTER_API_KEY) {
    return res.status(200).json({ events: [], totalEvents: 0, message: 'Ticketmaster API key not configured' });
  }

  const { lat, lng, radius = '25', category, page = '0' } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng are required' });
  }

  try {
    const params = new URLSearchParams({
      apikey: TICKETMASTER_API_KEY,
      latlong: `${lat},${lng}`,
      radius: radius as string,
      unit: 'miles',
      sort: 'date,asc',
      size: '20',
      page: page as string,
    });

    if (category) {
      params.set('classificationName', category as string);
    }

    const response = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?${params}`
    );

    if (!response.ok) {
      console.error('Ticketmaster API error:', response.status);
      return res.status(200).json({ events: [], totalEvents: 0 });
    }

    const data = await response.json();

    const events = (data._embedded?.events || []).map((event: Record<string, unknown>) => {
      const embedded = event._embedded as Record<string, unknown[]> | undefined;
      const venue = embedded?.venues?.[0] as Record<string, unknown> | undefined;
      const images = event.images as { url: string; width: number }[] | undefined;
      const dates = event.dates as { start?: { localDate?: string; localTime?: string } } | undefined;

      const bestImage = images?.sort((a, b) => (b.width || 0) - (a.width || 0))[0];
      const venueLocation = venue?.location as Record<string, string> | undefined;

      return {
        id: event.id,
        name: event.name,
        date: dates?.start?.localDate || '',
        time: dates?.start?.localTime || '',
        venue: (venue?.name as string) || 'TBA',
        venueAddress: ((venue?.address as Record<string, string>)?.line1) || '',
        imageUrl: bestImage?.url || null,
        url: event.url || '',
        category: ((event.classifications as Record<string, Record<string, string>>[])?.[0]?.segment?.name) || 'Event',
        lat: venueLocation?.latitude ? parseFloat(venueLocation.latitude) : null,
        lng: venueLocation?.longitude ? parseFloat(venueLocation.longitude) : null,
      };
    });

    return res.status(200).json({
      events,
      totalEvents: data.page?.totalElements || 0,
      totalPages: data.page?.totalPages || 0,
    });
  } catch (error) {
    console.error('Events API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
