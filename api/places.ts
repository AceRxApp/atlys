// Vercel Serverless API Route — Google Places Proxy
// Keeps API keys server-side, never exposed to the browser

import type { VercelRequest, VercelResponse } from '@vercel/node';

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  const { action } = req.query;

  try {
    switch (action) {
      case 'nearby':
        return await handleNearbySearch(req, res);
      case 'details':
        return await handlePlaceDetails(req, res);
      case 'photo':
        return await handlePlacePhoto(req, res);
      case 'autocomplete':
        return await handleAutocomplete(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action. Use: nearby, details, photo, autocomplete' });
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
    return res.status(response.status).json({ error: 'Google Places API error', details: errorText });
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
    return res.status(response.status).json({ error: 'Google Places API error', details: errorText });
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

  const photoUrl = `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${maxWidth}&key=${GOOGLE_API_KEY}`;

  const response = await fetch(photoUrl);

  if (!response.ok) {
    return res.status(response.status).json({ error: 'Failed to fetch photo' });
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg';
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache photos for 24h

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
    return res.status(response.status).json({ error: 'Autocomplete error', details: errorText });
  }

  const data = await response.json();
  return res.status(200).json(data);
}
