// Vercel Serverless API Route — Auto Day Planner
// Uses Groq AI + Google Places to generate personalized day itineraries

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIp } from './_cors';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const FIELD_MASK = [
  'places.id', 'places.displayName', 'places.formattedAddress',
  'places.location', 'places.types', 'places.primaryType',
  'places.primaryTypeDisplayName', 'places.rating', 'places.userRatingCount',
  'places.priceLevel', 'places.currentOpeningHours', 'places.nationalPhoneNumber',
  'places.websiteUri', 'places.googleMapsUri', 'places.photos',
  'places.editorialSummary',
].join(',');

const FOOD_TYPES = [
  'restaurant', 'cafe', 'coffee_shop', 'bar', 'bakery',
  'brunch_restaurant', 'breakfast_restaurant', 'ice_cream_shop',
  'steak_house', 'seafood_restaurant', 'sushi_restaurant', 'pizza_restaurant',
];

const ACTIVITY_TYPES = [
  'museum', 'art_gallery', 'tourist_attraction', 'park',
  'performing_arts_theater', 'historical_landmark', 'zoo',
  'aquarium', 'night_club', 'bowling_alley', 'casino',
  'amusement_park', 'movie_theater', 'market', 'spa',
  'book_store', 'hiking_area',
];

// --------------------------------------------------------------------------
// Google Places fetch
// --------------------------------------------------------------------------

async function fetchNearbyPlaces(
  lat: number, lng: number, types: string[], radius: number,
): Promise<Record<string, unknown>[]> {
  const body = {
    includedTypes: types,
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius,
      },
    },
  };

  const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) return [];
  const data = await response.json();
  return data.places || [];
}

// --------------------------------------------------------------------------
// Transform raw Google Place → our Place shape
// --------------------------------------------------------------------------

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const PRICE_MAP: Record<string, number> = {
  'PRICE_LEVEL_FREE': 0,
  'PRICE_LEVEL_INEXPENSIVE': 1,
  'PRICE_LEVEL_MODERATE': 2,
  'PRICE_LEVEL_EXPENSIVE': 3,
  'PRICE_LEVEL_VERY_EXPENSIVE': 4,
};

interface PlanPlace {
  placeId: string;
  name: string;
  category: string;
  categoryDisplay: string;
  tags: string[];
  address: string;
  photoUrl: string | null;
  photoNames: string[];
  rating: number;
  reviewCount: number;
  priceLevel: number;
  openNow: boolean;
  hours: string[];
  distance: number | null;
  lat: number;
  lng: number;
  phone: string;
  website: string;
  googleMapsUrl: string;
  editorialSummary: string;
}

function transformPlace(raw: Record<string, unknown>, userLat: number, userLng: number): PlanPlace {
  const location = raw.location as { latitude: number; longitude: number } | undefined;
  const displayName = raw.displayName as { text: string } | undefined;
  const primaryTypeDisplay = raw.primaryTypeDisplayName as { text: string } | undefined;
  const editorial = raw.editorialSummary as { text: string } | undefined;
  const currentHours = raw.currentOpeningHours as { openNow?: boolean; weekdayDescriptions?: string[] } | undefined;
  const photos = raw.photos as { name: string }[] | undefined;
  const types = raw.types as string[] | undefined;

  const lat = location?.latitude || 0;
  const lng = location?.longitude || 0;
  const photoNames = photos?.map(p => p.name) || [];

  const vibeMap: Record<string, string> = {
    restaurant: 'food', cafe: 'food', bar: 'food', bakery: 'food', coffee_shop: 'food',
    museum: 'todo', art_gallery: 'todo', tourist_attraction: 'todo', park: 'todo',
    night_club: 'todo', hotel: 'stay', motel: 'stay',
  };
  const tags: string[] = [];
  if (types) {
    for (const t of types) {
      const v = vibeMap[t];
      if (v && !tags.includes(v)) tags.push(v);
    }
  }

  return {
    placeId: (raw.id as string) || '',
    name: displayName?.text || 'Unknown',
    category: (raw.primaryType as string) || '',
    categoryDisplay: primaryTypeDisplay?.text ||
      ((raw.primaryType as string) || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    tags,
    address: (raw.formattedAddress as string) || '',
    photoUrl: photoNames.length > 0
      ? `/api/places?action=photo&name=${encodeURIComponent(photoNames[0])}&maxWidth=400`
      : null,
    photoNames,
    rating: (raw.rating as number) || 0,
    reviewCount: (raw.userRatingCount as number) || 0,
    priceLevel: PRICE_MAP[(raw.priceLevel as string)] ?? -1,
    openNow: currentHours?.openNow ?? true,
    hours: currentHours?.weekdayDescriptions || [],
    lat,
    lng,
    phone: (raw.nationalPhoneNumber as string) || '',
    website: (raw.websiteUri as string) || '',
    googleMapsUrl: (raw.googleMapsUri as string) || '',
    editorialSummary: editorial?.text || '',
    distance: lat && lng ? getDistanceKm(userLat, userLng, lat, lng) : null,
  };
}

// --------------------------------------------------------------------------
// Groq call with retry
// --------------------------------------------------------------------------

async function callGroq(body: object): Promise<Response> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify(body),
    });
    if (response.status === 429 && attempt < 2) {
      await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
      continue;
    }
    return response;
  }
  throw new Error('Max retries exceeded');
}

// --------------------------------------------------------------------------
// Handler
// --------------------------------------------------------------------------

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const corsOk = setCorsHeaders(res, req.headers.origin as string | undefined, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!corsOk) return res.status(403).json({ error: 'Origin not allowed' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIp(req.headers);
  if (!(await checkRateLimit(ip, 5, 60_000))) {
    return res.status(429).json({ error: 'Too many plan requests. Please wait a moment.' });
  }

  if (!GROQ_API_KEY || !GOOGLE_API_KEY) {
    return res.status(500).json({ error: 'Plan service not configured.' });
  }

  try {
    const {
      lat, lng, city, mood, budget, travelGroup, duration,
      weather, preferences, events,
    } = req.body as {
      lat: number; lng: number; city?: string; mood?: string;
      budget?: number; travelGroup?: string; duration?: string;
      weather?: string; preferences?: string;
      events?: { name: string; category: string; time: string; venue: string }[];
    };

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Location is required' });
    }

    // 1. Fetch places in parallel (food + activities)
    const [foodRaw, activityRaw] = await Promise.all([
      fetchNearbyPlaces(lat, lng, FOOD_TYPES, 2500),
      fetchNearbyPlaces(lat, lng, ACTIVITY_TYPES, 3000),
    ]);

    const allPlaces = [
      ...foodRaw.map(p => transformPlace(p, lat, lng)),
      ...activityRaw.map(p => transformPlace(p, lat, lng)),
    ];

    // Deduplicate by placeId
    const seen = new Set<string>();
    const uniquePlaces = allPlaces.filter(p => {
      if (!p.placeId || seen.has(p.placeId)) return false;
      seen.add(p.placeId);
      return true;
    });

    if (uniquePlaces.length < 3) {
      return res.status(200).json({
        plan: [],
        dayTitle: '',
        message: 'Not enough places found nearby. Try a different location.',
      });
    }

    // 2. Build condensed place list for AI (keep it small for token efficiency)
    const condensed = uniquePlaces.map((p, i) => ({
      idx: i,
      name: p.name,
      cat: p.categoryDisplay,
      rating: p.rating,
      price: p.priceLevel,
      open: p.openNow,
      dist: p.distance ? `${p.distance.toFixed(1)}km` : '?',
      summary: p.editorialSummary?.slice(0, 60) || '',
    }));

    // 3. Build events section if available
    let eventsSection = '';
    if (events && events.length > 0) {
      const todayEvents = events.slice(0, 5);
      eventsSection = `\n\nTODAY'S EVENTS (can include 0-1 in the plan):\n${todayEvents.map((e, i) => `E${i}: ${e.name} at ${e.venue} (${e.time}) [${e.category}]`).join('\n')}`;
    }

    // 4. Build AI prompt
    const budgetLabel = !budget || budget === -1 ? 'unlimited' : `$${budget}`;
    const durationLabel = duration || 'full day';
    const now = new Date();
    const timeLabel = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

    const prompt = `Create a ${durationLabel} itinerary from ONLY the numbered places below.

CONTEXT:
- City: ${city || 'nearby area'}
- Current time: ${timeLabel}
- Mood: ${mood || 'adventurous'}
- Budget: ${budgetLabel} total
- Group: ${travelGroup || 'solo'}${weather ? `\n- Weather: ${weather}` : ''}${preferences ? `\n- User preferences: ${preferences}` : ''}

PLACES (pick from these only, reference by idx):
${JSON.stringify(condensed)}${eventsSection}

RULES:
1. Pick ${durationLabel === 'full day' || durationLabel === 'full' ? '5-7' : '3-4'} stops
2. Alternate categories: food → activity → food (never 2 restaurants in a row)
3. Time-logical: breakfast/coffee first, activities mid-day, dinner/nightlife last
4. Prefer open places and 4.0+ ratings
5. Stay within ${budgetLabel} budget
6. Mood: adventurous=unique/offbeat, chill=cafes/parks, cultural=museums/galleries, foodie=diverse cuisines, nightlife=bars/clubs
7. Group: family=no nightlife, couple=romantic, solo=flexible, girls=aesthetic/brunch, boys=casual, bachelorette=festive
8. Keep stops close together for walkability${eventsSection ? '\n9. Include at most 1 event if it fits the mood/timing' : ''}

Return ONLY this JSON:
{"stops":[{"idx":0,"timeSlot":"9:00 AM","reason":"why this fits","spend":15}],"dayTitle":"Catchy 3-4 word title"}`;

    const groqBody = {
      model: GROQ_MODEL,
      messages: [
        { role: 'system' as const, content: 'You are a JSON-only itinerary generator. Return ONLY valid JSON, no markdown, no explanation, no extra text.' },
        { role: 'user' as const, content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 600,
      response_format: { type: 'json_object' },
    };

    const groqResponse = await callGroq(groqBody);
    if (!groqResponse.ok) {
      console.error('[NxStops Plan] Groq error:', groqResponse.status);
      return res.status(502).json({ error: 'AI service unavailable. Try again.' });
    }

    const groqData = await groqResponse.json();
    const aiContent = groqData.choices?.[0]?.message?.content || '{}';

    let aiPlan: {
      stops: { idx: number; timeSlot: string; reason: string; spend: number; eventIdx?: number }[];
      dayTitle?: string;
    };
    try {
      aiPlan = JSON.parse(aiContent);
    } catch {
      console.error('[NxStops Plan] Invalid JSON from AI:', aiContent.slice(0, 200));
      return res.status(502).json({ error: 'AI returned an invalid response. Try again.' });
    }

    if (!aiPlan.stops || !Array.isArray(aiPlan.stops)) {
      return res.status(502).json({ error: 'AI returned unexpected format. Try again.' });
    }

    // 5. Map AI selections back to full place objects
    const planStops = aiPlan.stops
      .filter(s => s.idx >= 0 && s.idx < uniquePlaces.length)
      .map(s => ({
        place: uniquePlaces[s.idx],
        timeSlot: s.timeSlot || '',
        reason: s.reason || '',
        estimatedSpend: s.spend || 0,
      }));

    return res.status(200).json({
      plan: planStops,
      dayTitle: aiPlan.dayTitle || 'Your Day Plan',
      totalPlaces: uniquePlaces.length,
    });
  } catch (err) {
    console.error('[NxStops Plan] Error:', err);
    return res.status(500).json({ error: 'Something went wrong generating your plan. Please try again.' });
  }
}
