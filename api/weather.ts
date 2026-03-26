// Vercel Serverless API Route — Weather + Travel Advisory Proxy
// Handles both Open-Meteo weather and UK FCDO travel advisories

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIp, validateApiKey } from './_lib/cors.js';

// ── Travel Advisory (FCDO) ──
const advisoryCache = new Map<string, { data: unknown; expiresAt: number }>();
const ADVISORY_TTL = 24 * 60 * 60 * 1000; // 24 hours

function toFcdoSlug(country: string): string {
  return country.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

const COUNTRY_SLUG_MAP: Record<string, string> = {
  usa: 'usa', us: 'usa', 'united states': 'usa', 'united states of america': 'usa',
  uk: 'uk', 'united kingdom': 'uk', uae: 'united-arab-emirates',
  'south korea': 'south-korea', 'north korea': 'north-korea',
  'czech republic': 'czech-republic', 'sri lanka': 'sri-lanka',
  'costa rica': 'costa-rica', 'dominican republic': 'dominican-republic',
  'el salvador': 'el-salvador', 'new zealand': 'new-zealand',
  'south africa': 'south-africa', 'saudi arabia': 'saudi-arabia',
  'hong kong': 'hong-kong', 'trinidad and tobago': 'trinidad-and-tobago',
  'puerto rico': 'usa',
};

async function handleAdvisory(req: VercelRequest, res: VercelResponse) {
  const { country } = req.query;
  if (!country || typeof country !== 'string') {
    return res.status(400).json({ error: 'country parameter required' });
  }

  const slug = COUNTRY_SLUG_MAP[country.toLowerCase().trim()] || toFcdoSlug(country);

  const cached = advisoryCache.get(slug);
  if (cached && Date.now() < cached.expiresAt) {
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json(cached.data);
  }

  try {
    const resp = await fetch(`https://www.gov.uk/api/content/foreign-travel-advice/${slug}`);

    if (!resp.ok) {
      if (resp.status === 404) {
        const noData = { country: slug, hasAdvisory: false, level: null, summary: null };
        advisoryCache.set(slug, { data: noData, expiresAt: Date.now() + ADVISORY_TTL });
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
        return res.status(200).json(noData);
      }
      return res.status(resp.status).json({ error: 'Advisory API error' });
    }

    const raw = await resp.json();
    const title = raw.title || '';
    const description = raw.description || '';

    const parts = raw.details?.parts || [];
    const summaryPart = parts.find((p: { slug: string }) => p.slug === 'summary');
    const summaryHtml = summaryPart?.body || '';
    const summaryText = summaryHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500);

    let level: 'advise_against_all' | 'advise_against_some' | 'exercise_caution' | 'normal' = 'normal';
    const lower = (summaryText + ' ' + description).toLowerCase();
    if (lower.includes('advise against all travel') || lower.includes('advises against all travel')) {
      level = 'advise_against_all';
    } else if (lower.includes('advise against all but essential') || lower.includes('advises against all but essential')) {
      level = 'advise_against_some';
    } else if (lower.includes('heightened risk') || lower.includes('exercise caution') || lower.includes('take extra care')) {
      level = 'exercise_caution';
    }

    const result = {
      country: slug,
      hasAdvisory: true,
      level,
      title,
      summary: summaryText || description,
      updatedAt: raw.public_updated_at || null,
      url: `https://www.gov.uk/foreign-travel-advice/${slug}`,
    };

    advisoryCache.set(slug, { data: result, expiresAt: Date.now() + ADVISORY_TTL });
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json(result);
  } catch (err) {
    console.error('[NxStops] Advisory fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch travel advisory' });
  }
}

// ── Weather (Open-Meteo) ──
async function handleWeather(req: VercelRequest, res: VercelResponse) {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weathercode&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max,sunset&timezone=auto&forecast_days=10&temperature_unit=fahrenheit`;
    const resp = await fetch(url);
    if (!resp.ok) {
      return res.status(resp.status).json({ error: 'Weather API error' });
    }
    const data = await resp.json();
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch weather' });
  }
}

// ── Flights (Kiwi Tequila API) ──
const flightsCache = new Map<string, { data: unknown; expiresAt: number }>();
const FLIGHTS_TTL = 30 * 60 * 1000; // 30 minutes

async function handleFlights(req: VercelRequest, res: VercelResponse) {
  const { origin, destination, date } = req.query;
  if (!origin || typeof origin !== 'string' || !destination || typeof destination !== 'string') {
    return res.status(400).json({ error: 'origin and destination parameters required (IATA codes or city names)' });
  }

  const KIWI_KEY = process.env.KIWI_API_KEY;
  if (!KIWI_KEY) {
    return res.status(500).json({ error: 'Flight search not configured' });
  }

  // Use date or default to next 30-day window
  const today = new Date();
  const dateFrom = typeof date === 'string' && date.length === 10
    ? date.replace(/-/g, '/')
    : `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  const dateTo = (() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 30);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  })();

  const cacheKey = `${origin.toUpperCase()}_${destination.toUpperCase()}_${dateFrom}`;
  const cached = flightsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    return res.status(200).json(cached.data);
  }

  try {
    const params = new URLSearchParams({
      fly_from: origin.toUpperCase(),
      fly_to: destination.toUpperCase(),
      date_from: dateFrom,
      date_to: dateTo,
      sort: 'price',
      limit: '5',
      curr: 'USD',
      max_stopovers: '2',
      one_for_city: '0',
      adults: '1',
    });

    const resp = await fetch(`https://api.tequila.kiwi.com/v2/search?${params}`, {
      headers: { apikey: KIWI_KEY },
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      console.error('Kiwi API error:', resp.status, errText);
      return res.status(502).json({ error: 'Flight search unavailable' });
    }

    const raw = await resp.json();
    const flights = (raw.data || []).slice(0, 3).map((f: any) => {
      const route = f.route || [];
      const airlines = [...new Set(route.map((r: any) => r.airline))];
      const stops = Math.max(0, route.length - 1);
      // Duration in hours and minutes
      const durationSec = f.duration?.total || 0;
      const hours = Math.floor(durationSec / 3600);
      const minutes = Math.floor((durationSec % 3600) / 60);

      return {
        airline: airlines[0] || 'Unknown',
        airlines,
        price: Math.round(f.price || 0),
        currency: f.currency || 'USD',
        duration: `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`,
        durationMinutes: Math.round(durationSec / 60),
        stops,
        stopsLabel: stops === 0 ? 'Nonstop' : `${stops} stop${stops > 1 ? 's' : ''}`,
        departTime: f.local_departure || '',
        arriveTime: f.local_arrival || '',
        deepLink: f.deep_link || '',
        bookingLink: `https://www.kiwi.com/deep?affilid=nxstopsapp&from=${origin.toUpperCase()}&to=${destination.toUpperCase()}&departure=${dateFrom}`,
      };
    });

    const result = {
      flights,
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      dateRange: `${dateFrom} - ${dateTo}`,
      searchedAt: new Date().toISOString(),
    };

    flightsCache.set(cacheKey, { data: result, expiresAt: Date.now() + FLIGHTS_TTL });

    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    return res.status(200).json(result);
  } catch (err) {
    console.error('Flight search error:', err);
    return res.status(500).json({ error: 'Failed to search flights' });
  }
}

// ── Main handler — routes by ?action= ──
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const corsOk = setCorsHeaders(res, req.headers.origin as string | undefined, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!corsOk) {
    const apiKeyInfo = await validateApiKey(req.headers as Record<string, string | string[] | undefined>, res, 'weather');
    if (!apiKeyInfo) return res.status(403).json({ error: 'Origin not allowed. Use X-API-Key header for API access.' });
  }

  const clientIp = getClientIp(req.headers);
  if (!(await checkRateLimit(clientIp, 30, 60_000))) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const action = req.query.action as string | undefined;
  if (action === 'advisory') return handleAdvisory(req, res);
  if (action === 'flights') return handleFlights(req, res);
  return handleWeather(req, res);
}
