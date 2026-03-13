// Vercel Serverless API Route — Google Places Proxy
// Keeps API keys server-side, never exposed to the browser

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIp, validateApiKey } from './_lib/cors.js';

const GOOGLE_API_KEY = (process.env.GOOGLE_PLACES_API_KEY || '').trim();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { action } = req.query;

  // Photo proxy: skip CORS origin check — <img> tags don't need CORS,
  // and Capacitor WKWebView may send Origin: null which would get rejected.
  // SSRF protection is handled by the photo name regex instead.
  if (action === 'photo') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') return res.status(200).end();
    const clientIp = getClientIp(req.headers);
    if (!(await checkRateLimit(clientIp, 60, 60_000))) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    try {
      return await handlePlacePhoto(req, res);
    } catch (error) {
      console.error('Photo proxy error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  const corsOk = setCorsHeaders(res, req.headers.origin as string | undefined, 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // If CORS fails, check for valid API key (third-party developer access)
  if (!corsOk) {
    const apiKeyInfo = await validateApiKey(req.headers as Record<string, string | string[] | undefined>, res, 'places');
    if (!apiKeyInfo) return res.status(403).json({ error: 'Origin not allowed. Use X-API-Key header for API access.' });
  }

  const clientIp = getClientIp(req.headers);
  if (!(await checkRateLimit(clientIp, 60, 60_000))) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  try {
    switch (action) {
      case 'nearby':
        return await handleNearbySearch(req, res);
      case 'textsearch':
        return await handleTextSearch(req, res);
      case 'details':
        return await handlePlaceDetails(req, res);
      case 'photo':
        return await handlePlacePhoto(req, res);
      case 'autocomplete':
        return await handleAutocomplete(req, res);
      case 'geocode':
        return await handleGeocode(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action. Use: nearby, details, photo, autocomplete, geocode' });
    }
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// --------------------------------------------------------------------------
// Nearby Search (New API)
// --------------------------------------------------------------------------
async function handleNearbySearch(req: VercelRequest, res: VercelResponse) {
  const { lat, lng, radius = '1500', types, keyword, pagetoken } = req.query;

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
  if (isNaN(radiusNum) || radiusNum < 0 || radiusNum > 50000) {
    return res.status(400).json({ error: 'radius must be between 0 and 50000' });
  }

  // Use the Places API (New) — Nearby Search
  const body: Record<string, unknown> = {
    includedTypes: types ? (types as string).split(',') : ['restaurant', 'bar', 'cafe', 'museum', 'night_club', 'tourist_attraction', 'park', 'beach', 'hiking_area', 'national_park'],
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude: parseFloat(lat as string), longitude: parseFloat(lng as string) },
        radius: parseFloat(radius as string),
      },
    },
  };

  if (keyword) {
    body.textQuery = keyword;
  }

  // Use the new Nearby Search endpoint
  const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': [
        'places.id',
        'places.displayName',
        'places.formattedAddress',
        'places.location',
        'places.types',
        'places.primaryType',
        'places.primaryTypeDisplayName',
        'places.rating',
        'places.userRatingCount',
        'places.priceLevel',
        'places.currentOpeningHours',
        'places.nationalPhoneNumber',
        'places.websiteUri',
        'places.googleMapsUri',
        'places.photos',
        'places.editorialSummary',
        'places.regularOpeningHours',
        'places.businessStatus',
      ].join(','),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Places API error:', errorText);
    return res.status(response.status).json({ error: 'Google Places API error' });
  }

  const data = await response.json();
  // Filter out closed, not-yet-open, and non-venue places (junctions, event halls, etc.)
  if (data.places) {
    data.places = data.places.filter((p: Record<string, unknown>) => !isNotYetOpen(p) && !isNonVenue(p));
  }
  return res.status(200).json(data);
}

// --------------------------------------------------------------------------
// Text Search
// --------------------------------------------------------------------------
async function handleTextSearch(req: VercelRequest, res: VercelResponse) {
  const { query, lat, lng, radius = '5000' } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'query is required' });
  }

  if ((query as string).length > 200) {
    return res.status(400).json({ error: 'query must be 200 characters or less' });
  }

  const radiusNum = parseFloat(radius as string);
  if (isNaN(radiusNum) || radiusNum < 0 || radiusNum > 50000) {
    return res.status(400).json({ error: 'radius must be between 0 and 50000' });
  }

  const body: Record<string, unknown> = {
    textQuery: query as string,
    maxResultCount: 20,
  };

  if (lat && lng) {
    const latNum = parseFloat(lat as string);
    const lngNum = parseFloat(lng as string);
    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      return res.status(400).json({ error: 'lat must be between -90 and 90' });
    }
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      return res.status(400).json({ error: 'lng must be between -180 and 180' });
    }
    // Use locationRestriction (rectangle) to STRICTLY limit results to the city area
    // locationBias only hints — Google can still return results from other cities/countries
    const deltaLat = radiusNum / 111111;
    const deltaLng = radiusNum / (111111 * Math.cos(latNum * Math.PI / 180));
    body.locationRestriction = {
      rectangle: {
        low: { latitude: latNum - deltaLat, longitude: lngNum - deltaLng },
        high: { latitude: latNum + deltaLat, longitude: lngNum + deltaLng },
      },
    };
  }

  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': [
        'places.id',
        'places.displayName',
        'places.formattedAddress',
        'places.location',
        'places.types',
        'places.primaryType',
        'places.primaryTypeDisplayName',
        'places.rating',
        'places.userRatingCount',
        'places.priceLevel',
        'places.currentOpeningHours',
        'places.nationalPhoneNumber',
        'places.websiteUri',
        'places.googleMapsUri',
        'places.photos',
        'places.editorialSummary',
        'places.businessStatus',
      ].join(','),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Text Search API error:', errorText);
    return res.status(response.status).json({ error: 'Text search error' });
  }

  const data = await response.json();
  if (data.places) {
    const centerLat = lat ? parseFloat(lat as string) : null;
    const centerLng = lng ? parseFloat(lng as string) : null;
    data.places = data.places.filter((p: Record<string, unknown>) => {
      // Filter out closed, not-yet-open, and non-venue places
      if (isNotYetOpen(p) || isNonVenue(p)) return false;
      // Safety net: filter out places too far from the city center (>50km)
      if (centerLat !== null && centerLng !== null) {
        const loc = p.location as { latitude: number; longitude: number } | undefined;
        if (loc) {
          const dist = haversineKm(centerLat, centerLng, loc.latitude, loc.longitude);
          if (dist > 50) return false;
        }
      }
      return true;
    });
  }
  return res.status(200).json(data);
}

/** Types that are never useful for NxStops discovery */
const EXCLUDED_PRIMARY_TYPES = new Set([
  'event_venue', 'wedding_venue', 'banquet_hall',
  'condominium_complex', 'apartment_complex', 'residential_area',
  'lodging', 'hotel', 'motel', 'resort_hotel',
]);

/** Check if a place is a non-venue (junction, street, event hall, etc.) */
function isNonVenue(p: Record<string, unknown>): boolean {
  const primaryType = p.primaryType as string | undefined;
  // No primaryType = generic POI (junctions, streets, interchanges)
  if (!primaryType) return true;
  const name = (p.displayName as { text?: string } | undefined)?.text || '';
  // Allow safari/wildlife experiences even if typed as lodging/resort
  if (EXCLUDED_PRIMARY_TYPES.has(primaryType) && !/\b(safari|wildlife|game|conservancy|sanctuary|reserve)\b/i.test(name)) return true;
  // Catch junctions/interchanges by name
  if (/\b(junction|interchange|roundabout|overpass|flyover|intersection|highway|motorway)\b/i.test(name)) return true;
  return false;
}

/** Keywords that indicate a place isn't open to the public yet */
const NOT_OPEN_KEYWORDS = /\b(coming soon|opening soon|under construction|not yet open|grand opening|pre-opening|opening \d{4}|opens? in|currently closed|permanently closed|temporarily closed|reopening|closed for renovation|under renovation)\b/i;

/** Check if a Google Places (New) result looks like a place not yet open */
function isNotYetOpen(p: Record<string, unknown>): boolean {
  // Check businessStatus — only OPERATIONAL should pass
  const status = p.businessStatus as string | undefined;
  if (status === 'CLOSED_PERMANENTLY' || status === 'CLOSED_TEMPORARILY') return true;
  // Check editorial summary for "coming soon" etc.
  const summary = p.editorialSummary as { text?: string } | undefined;
  if (summary?.text && NOT_OPEN_KEYWORDS.test(summary.text)) return true;
  // Check display name
  const displayName = p.displayName as { text?: string } | undefined;
  if (displayName?.text && NOT_OPEN_KEYWORDS.test(displayName.text)) return true;
  return false;
}

/** Haversine distance in km between two points */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// --------------------------------------------------------------------------
// Place Details
// --------------------------------------------------------------------------
async function handlePlaceDetails(req: VercelRequest, res: VercelResponse) {
  const { placeId } = req.query;

  if (!placeId) {
    return res.status(400).json({ error: 'placeId is required' });
  }

  // Validate placeId format to prevent SSRF / path traversal
  if (!/^[A-Za-z0-9\-_]+$/.test(placeId as string)) {
    return res.status(400).json({ error: 'Invalid placeId format' });
  }

  const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': [
        'id',
        'displayName',
        'formattedAddress',
        'location',
        'types',
        'primaryType',
        'primaryTypeDisplayName',
        'rating',
        'userRatingCount',
        'priceLevel',
        'currentOpeningHours',
        'regularOpeningHours',
        'nationalPhoneNumber',
        'internationalPhoneNumber',
        'websiteUri',
        'googleMapsUri',
        'photos',
        'editorialSummary',
        'reviews',
      ].join(','),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    return res.status(response.status).json({ error: 'Google Places API error' });
  }

  const data = await response.json();
  return res.status(200).json(data);
}

// --------------------------------------------------------------------------
// Place Photo Proxy
// --------------------------------------------------------------------------
async function handlePlacePhoto(req: VercelRequest, res: VercelResponse) {
  const { name, maxWidth = '400' } = req.query;

  if (!name) {
    return res.status(400).json({ error: 'name (photo resource name) is required' });
  }

  // Validate photo resource name format to prevent SSRF
  if (!/^places\/[A-Za-z0-9\-_]+\/photos\/[A-Za-z0-9\-_.~:=+]+$/.test(name as string)) {
    return res.status(400).json({ error: 'Invalid photo name format' });
  }

  const maxWidthNum = parseInt(maxWidth as string, 10);
  if (isNaN(maxWidthNum) || maxWidthNum < 100 || maxWidthNum > 1600) {
    return res.status(400).json({ error: 'maxWidth must be between 100 and 1600' });
  }

  const photoUrl = `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${maxWidthNum}&key=${GOOGLE_API_KEY}`;

  const response = await fetch(photoUrl);

  if (!response.ok) {
    return res.status(response.status).json({ error: 'Failed to fetch photo' });
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const safeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  res.setHeader('Content-Type', safeTypes.includes(contentType) ? contentType : 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=86400');

  const buffer = await response.arrayBuffer();
  return res.status(200).send(Buffer.from(buffer));
}

// --------------------------------------------------------------------------
// Autocomplete (for city/place search)
// --------------------------------------------------------------------------
async function handleAutocomplete(req: VercelRequest, res: VercelResponse) {
  const { input, lat, lng } = req.query;

  if (!input) {
    return res.status(400).json({ error: 'input is required' });
  }

  if ((input as string).length > 100) {
    return res.status(400).json({ error: 'input must be 100 characters or less' });
  }

  const body: Record<string, unknown> = {
    input: input as string,
    includedPrimaryTypes: ['(cities)'],
  };

  if (lat && lng) {
    body.locationBias = {
      circle: {
        center: { latitude: parseFloat(lat as string), longitude: parseFloat(lng as string) },
        radius: 50000,
      },
    };
  }

  const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return res.status(response.status).json({ error: 'Autocomplete error' });
  }

  const data = await response.json();
  return res.status(200).json(data);
}

// --------------------------------------------------------------------------
// Reverse Geocode (lat/lng → city name)
// --------------------------------------------------------------------------
async function handleGeocode(req: VercelRequest, res: VercelResponse) {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng are required' });
  }

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}&result_type=locality`
  );

  if (!response.ok) {
    return res.status(response.status).json({ error: 'Geocoding failed' });
  }

  const data = await response.json();
  let city = null;
  if (data.results?.[0]) {
    const cityComponent = data.results[0].address_components?.find(
      (c: { types: string[] }) => c.types.includes('locality')
    );
    city = cityComponent?.long_name || data.results[0].formatted_address;
  }

  return res.status(200).json({ city });
}
