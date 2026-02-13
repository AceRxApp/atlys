// Vercel Serverless API Route — Google Places Proxy
// Keeps API keys server-side, never exposed to the browser

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIp } from './_lib/cors.js';

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const corsOk = setCorsHeaders(res, req.headers.origin as string | undefined, 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!corsOk) return res.status(403).json({ error: 'Origin not allowed' });

  const clientIp = getClientIp(req.headers);
  if (!(await checkRateLimit(clientIp, 60, 60_000))) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  const { action } = req.query;

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
    includedTypes: types ? (types as string).split(',') : ['restaurant', 'bar', 'cafe', 'museum', 'night_club', 'tourist_attraction', 'park'],
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
    body.locationBias = {
      circle: {
        center: { latitude: latNum, longitude: lngNum },
        radius: radiusNum,
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
  return res.status(200).json(data);
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
  if (!/^places\/[A-Za-z0-9\-_]+\/photos\/[A-Za-z0-9\-_]+$/.test(name as string)) {
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
