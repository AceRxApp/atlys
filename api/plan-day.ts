// Vercel Serverless API Route — Auto Day Planner
// Uses GPT-4o-mini + Google Places to generate personalized day itineraries

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIp } from './_lib/cors.js';

const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || '').trim();
const GOOGLE_API_KEY = (process.env.GOOGLE_PLACES_API_KEY || '').trim();
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim();

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
  'wine_bar', 'fine_dining_restaurant',
];

const BAR_TYPES = [
  'bar', 'wine_bar', 'night_club', 'restaurant', 'cafe',
];

const MUSEUM_TYPES = [
  'museum', 'art_gallery', 'performing_arts_theater', 'historical_landmark',
];

const OUTDOOR_TYPES = [
  'park', 'hiking_area', 'zoo', 'aquarium', 'amusement_park',
  'tourist_attraction',
];

const ACTIVITY_TYPES = [
  'museum', 'art_gallery', 'tourist_attraction', 'park',
  'performing_arts_theater', 'historical_landmark', 'zoo',
  'aquarium', 'night_club', 'bowling_alley', 'casino',
  'amusement_park', 'movie_theater', 'market', 'spa',
  'book_store', 'hiking_area',
];

// Vibe → which place types to fetch + what the AI prompt should say
const VIBE_CONFIG: Record<string, {
  fetchFood: boolean;
  fetchActivity: boolean;
  foodTypes?: string[];
  activityTypes?: string[];
  aiHint: string;
}> = {
  food: {
    fetchFood: true, fetchActivity: false,
    aiHint: 'This is a FOOD-ONLY tour. Every stop MUST be a restaurant, cafe, bakery, or food spot. No museums, parks, landmarks, or tourist attractions.',
  },
  bars: {
    fetchFood: true, fetchActivity: false,
    foodTypes: BAR_TYPES,
    aiHint: 'This is a BAR HOPPING plan. Every stop MUST be a bar, lounge, pub, wine bar, brewery, or nightclub. No restaurants (unless they are primarily a bar), no museums, no parks.',
  },
  museum: {
    fetchFood: false, fetchActivity: true,
    activityTypes: MUSEUM_TYPES,
    aiHint: 'This is a MUSEUM/CULTURE day. Every stop MUST be a museum, gallery, theater, or cultural landmark. No restaurants, bars, or parks.',
  },
  date: {
    fetchFood: true, fetchActivity: true,
    aiHint: 'This is a DATE NIGHT. Pick romantic, intimate spots — nice restaurants, scenic locations, cozy bars. Avoid loud/crowded fast food joints.',
  },
  outdoor: {
    fetchFood: false, fetchActivity: true,
    activityTypes: OUTDOOR_TYPES,
    aiHint: 'This is an OUTDOOR ADVENTURE. Every stop MUST be a park, garden, waterfront, hiking trail, zoo, or outdoor attraction. No indoor museums or restaurants.',
  },
  hidden: {
    fetchFood: true, fetchActivity: true,
    aiHint: 'Pick HIDDEN GEMS only — lesser-known spots with fewer reviews but great ratings. Avoid popular tourist traps and chain restaurants. Prioritize unique, local, off-the-beaten-path places.',
  },
  surprise: {
    fetchFood: true, fetchActivity: true,
    aiHint: 'Create a well-rounded mix of the best food, sights, and experiences. Include variety — a great meal, something cultural or scenic, and something fun.',
  },
};

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

  if (!response.ok) {
    const errText = await response.text().catch(() => 'no body');
    console.error('[NxStops Plan] Google Places error:', response.status, errText.slice(0, 300));
    return [];
  }
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
    steak_house: 'food', seafood_restaurant: 'food', pizza_restaurant: 'food',
    sushi_restaurant: 'food', brunch_restaurant: 'food', breakfast_restaurant: 'food',
    ice_cream_shop: 'food', fine_dining_restaurant: 'food', wine_bar: 'food',
    museum: 'culture', art_gallery: 'culture', performing_arts_theater: 'culture',
    historical_landmark: 'culture', movie_theater: 'culture',
    tourist_attraction: 'outdoors', park: 'outdoors', hiking_area: 'outdoors',
    zoo: 'outdoors', aquarium: 'outdoors', amusement_park: 'outdoors',
    night_club: 'nightlife', casino: 'nightlife',
    hotel: 'stay', motel: 'stay',
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
// OpenAI GPT-4o-mini call
// --------------------------------------------------------------------------

async function callOpenAI(messages: { role: string; content: string }[]): Promise<string | null> {
  if (!OPENAI_API_KEY) return null;
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.8,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
    });
    if (!response.ok) {
      console.error('[NxStops Plan] OpenAI error:', response.status);
      return null;
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (e) {
    console.error('[NxStops Plan] OpenAI exception:', e);
    return null;
  }
}

// --------------------------------------------------------------------------
// Gemini fallback (free tier: 15 RPM, 1M+ TPD)
// --------------------------------------------------------------------------

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string | null> {
  if (!GEMINI_API_KEY) return null;
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 500,
            responseMimeType: 'application/json',
          },
        }),
      },
    );
    if (!response.ok) {
      console.error('[NxStops Plan] Gemini error:', response.status);
      return null;
    }
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (e) {
    console.error('[NxStops Plan] Gemini exception:', e);
    return null;
  }
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
  if (!(await checkRateLimit(ip, 15, 60_000))) {
    return res.status(429).json({ error: 'Too many plan requests. Please wait a moment.' });
  }

  if ((!OPENAI_API_KEY && !GEMINI_API_KEY) || !GOOGLE_API_KEY) {
    return res.status(500).json({ error: 'Plan service not configured.' });
  }

  try {
    const {
      lat, lng, city, vibe, subVibe, mood, travelGroup, duration,
      weather, preferences, events,
    } = req.body as {
      lat: number; lng: number; city?: string;
      vibe?: string; subVibe?: string; mood?: string;
      travelGroup?: string; duration?: string;
      weather?: string; preferences?: string;
      events?: { name: string; category: string; time: string; venue: string }[];
    };

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Location is required' });
    }

    // Determine vibe config — use structured vibe if provided, fall back to 'surprise'
    const vibeKey = vibe && VIBE_CONFIG[vibe] ? vibe : 'surprise';
    const config = VIBE_CONFIG[vibeKey];

    // 1. Fetch ONLY the place types relevant to this vibe
    const fetches: Promise<Record<string, unknown>[]>[] = [];
    let fetchLabels: string[] = [];

    if (config.fetchFood) {
      const types = config.foodTypes || FOOD_TYPES;
      fetches.push(fetchNearbyPlaces(lat, lng, types, 2500));
      fetchLabels.push('food');
    }
    if (config.fetchActivity) {
      const types = config.activityTypes || ACTIVITY_TYPES;
      fetches.push(fetchNearbyPlaces(lat, lng, types, 3000));
      fetchLabels.push('activity');
    }

    const rawResults = await Promise.all(fetches);
    const allRaw = rawResults.flat();
    const allTransformed = allRaw.map(p => transformPlace(p, lat, lng));

    // 2. Deduplicate, sort by rating, take top 30
    const seen = new Set<string>();
    const allPlaces: PlanPlace[] = [];
    for (const p of allTransformed) {
      if (p.placeId && !seen.has(p.placeId)) {
        seen.add(p.placeId);
        allPlaces.push(p);
      }
    }
    allPlaces.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    const topPlaces = allPlaces.slice(0, 30);

    console.log(`[NxStops Plan] vibe="${vibeKey}" subVibe="${subVibe || ''}" fetched=[${fetchLabels}] totalPlaces=${topPlaces.length}`);

    if (topPlaces.length < 3) {
      return res.status(200).json({
        plan: [],
        dayTitle: '',
        message: 'Not enough places found nearby. Try a different location.',
      });
    }

    const condensed = topPlaces.map((p, i) => ({
      idx: i,
      name: p.name,
      cat: p.categoryDisplay,
      rating: p.rating,
      price: p.priceLevel,
      open: p.openNow,
      dist: p.distance ? `${p.distance.toFixed(1)}km` : '?',
    }));

    // 3. Build events section if available
    let eventsSection = '';
    if (events && events.length > 0) {
      const todayEvents = events.slice(0, 5);
      eventsSection = `\n\nTODAY'S EVENTS (can include 0-1 in the plan):\n${todayEvents.map((e, i) => `E${i}: ${e.name} at ${e.venue} (${e.time}) [${e.category}]`).join('\n')}`;
    }

    // 4. Build AI prompt — structured vibe drives place selection
    const durationLabel = duration || 'full day';
    const isFullDay = durationLabel === 'full day' || durationLabel === 'full';
    const stopCount = isFullDay ? 6 : 3;
    const now = new Date();
    const timeLabel = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Build human-readable vibe description for the AI
    const vibeLabels: Record<string, string> = {
      food: 'Food Tour', bars: 'Bar Hopping', museum: 'Museum Day',
      date: 'Date Night', outdoor: 'Outdoor Adventure', hidden: 'Hidden Gems', surprise: 'Surprise Me',
    };
    const vibeLabel = vibeLabels[vibeKey] || 'Surprise Me';
    const subVibeNote = subVibe && subVibe !== 'mix' ? ` (focus: ${subVibe})` : '';

    const prompt = `Create a ${durationLabel} itinerary from ONLY the numbered places below.

CONTEXT:
- City: ${city || 'nearby area'}
- Current time: ${timeLabel}
- Vibe: ${vibeLabel}${subVibeNote}
- Group: ${travelGroup || 'solo'}${weather ? `\n- Weather: ${weather}` : ''}${preferences ? `\n- User preferences: ${preferences}` : ''}

PLACES (pick from these only, reference by idx):
${JSON.stringify(condensed)}${eventsSection}

RULES:
1. Pick exactly ${stopCount} stops
2. CRITICAL: ${config.aiHint}
3. Time-logical ordering: earlier activities first, dinner/nightlife last
4. Prefer places that are currently open and have 4.0+ ratings
5. The "spend" field must be a realistic USD estimate for one person (e.g. coffee=$5, museum=$20, nice dinner=$45)
6. Group adjustments: family=kid-friendly, no nightlife; couple=intimate/scenic; solo=flexible; friends=social/group-friendly
7. Keep stops close together for walkability
8. Variety: pick diverse options within the theme (different cuisines for food, different types for sightseeing, etc)${subVibe && subVibe !== 'mix' ? `\n9. SUB-THEME: Focus on "${subVibe}" specifically when choosing stops` : ''}${eventsSection ? `\n${subVibe && subVibe !== 'mix' ? '10' : '9'}. Include at most 1 event if it fits the vibe/timing` : ''}

Return ONLY this JSON:
{"stops":[{"idx":0,"timeSlot":"9:00 AM","reason":"why this fits","spend":15}],"dayTitle":"Catchy 3-4 word title"}`;

    const systemMsg = 'You are a JSON-only itinerary generator. Return ONLY valid JSON, no markdown, no explanation, no extra text.';
    const messages = [
      { role: 'system', content: systemMsg },
      { role: 'user', content: prompt },
    ];

    // Fallback chain: GPT-4o-mini → Gemini 2.0 Flash
    let aiContent: string | null = null;

    // 1. Try GPT-4o-mini (primary)
    aiContent = await callOpenAI(messages);

    if (!aiContent) {
      // 2. OpenAI failed — try Gemini as free backup
      console.log('[NxStops Plan] OpenAI unavailable, trying Gemini fallback');
      aiContent = await callGemini(systemMsg, prompt);
    }

    if (!aiContent) {
      return res.status(502).json({ error: 'AI service is busy. Please try again in a few minutes.' });
    }

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
      .filter(s => s.idx >= 0 && s.idx < topPlaces.length)
      .map(s => ({
        place: topPlaces[s.idx],
        timeSlot: s.timeSlot || '',
        reason: s.reason || '',
        estimatedSpend: s.spend || 0,
      }));

    return res.status(200).json({
      plan: planStops,
      dayTitle: aiPlan.dayTitle || 'Your Day Plan',
      totalPlaces: topPlaces.length,
    });
  } catch (err: unknown) {
    console.error('[NxStops Plan] Error:', err);
    return res.status(500).json({ error: 'Something went wrong generating your plan. Please try again.' });
  }
}
