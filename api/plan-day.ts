// Vercel Serverless API Route — Auto Day Planner
// Uses Groq AI + Google Places to generate personalized day itineraries

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIp } from './_lib/cors.js';

const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();
const GOOGLE_API_KEY = (process.env.GOOGLE_PLACES_API_KEY || '').trim();
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim();
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_FALLBACK_MODEL = 'llama-3.1-8b-instant';

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

  if (!GROQ_API_KEY || !GOOGLE_API_KEY) {
    return res.status(500).json({ error: 'Plan service not configured.' });
  }

  try {
    const {
      lat, lng, city, mood, travelGroup, duration,
      weather, preferences, events,
    } = req.body as {
      lat: number; lng: number; city?: string; mood?: string;
      travelGroup?: string; duration?: string;
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

    const foodPlaces = foodRaw.map(p => transformPlace(p, lat, lng));
    const activityPlaces = activityRaw.map(p => transformPlace(p, lat, lng));

    // Deduplicate by placeId
    const seen = new Set<string>();
    const dedupe = (list: PlanPlace[]) => list.filter(p => {
      if (!p.placeId || seen.has(p.placeId)) return false;
      seen.add(p.placeId);
      return true;
    });
    const uniqueFood = dedupe(foodPlaces);
    const uniqueActivities = dedupe(activityPlaces);

    // 2. Build mood-aware place list — prioritize the right category
    const moodKey = mood || 'sightseeing';
    let topPlaces: PlanPlace[];

    if (moodKey === 'foodie') {
      // Foodie: ONLY food places — no attractions, parks, museums
      topPlaces = uniqueFood.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 20);
    } else if (moodKey === 'nightlife') {
      // Nightlife: bars, clubs, restaurants — filter to nightlife-relevant
      const nightlifeTypes = new Set(['bar', 'night_club', 'casino', 'wine_bar', 'restaurant', 'fine_dining_restaurant', 'steak_house']);
      const nightFood = uniqueFood.filter(p => nightlifeTypes.has(p.category));
      const nightAct = uniqueActivities.filter(p => nightlifeTypes.has(p.category) || p.category === 'night_club' || p.category === 'casino');
      topPlaces = [...nightFood, ...nightAct].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 20);
      // Fallback: if not enough nightlife spots, add top-rated food
      if (topPlaces.length < 8) {
        const remaining = uniqueFood.filter(p => !topPlaces.some(tp => tp.placeId === p.placeId));
        topPlaces.push(...remaining.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 20 - topPlaces.length));
      }
    } else if (moodKey === 'outdoors') {
      // Outdoors: parks, hikes, outdoor spots + a few food for meals
      const outdoorTypes = new Set(['park', 'hiking_area', 'national_park', 'zoo', 'aquarium', 'amusement_park', 'tourist_attraction', 'stadium']);
      const outdoor = uniqueActivities.filter(p => outdoorTypes.has(p.category)).sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 12);
      const meals = uniqueFood.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 8);
      topPlaces = [...outdoor, ...meals];
    } else if (moodKey === 'culture') {
      // Culture: museums, galleries, landmarks + a few food
      const cultureTypes = new Set(['museum', 'art_gallery', 'performing_arts_theater', 'historical_landmark', 'movie_theater', 'book_store', 'market']);
      const cultural = uniqueActivities.filter(p => cultureTypes.has(p.category)).sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 12);
      const meals = uniqueFood.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 8);
      topPlaces = [...cultural, ...meals];
    } else if (moodKey === 'hidden-gems') {
      // Hidden gems: lower review count, high rating
      const allUnique = [...uniqueFood, ...uniqueActivities];
      topPlaces = allUnique
        .filter(p => p.reviewCount < 2000 && p.rating >= 3.8)
        .sort((a, b) => {
          const scoreA = (a.rating || 0) * 2 - Math.log10(Math.max(a.reviewCount, 1));
          const scoreB = (b.rating || 0) * 2 - Math.log10(Math.max(b.reviewCount, 1));
          return scoreB - scoreA;
        })
        .slice(0, 20);
    } else {
      // Sightseeing (default): balanced mix — more activities, some food
      const sortedAct = uniqueActivities.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 12);
      const sortedFood = uniqueFood.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 8);
      topPlaces = [...sortedAct, ...sortedFood];
    }

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

    // 4. Build AI prompt
    const durationLabel = duration || 'full day';
    const isFullDay = durationLabel === 'full day' || durationLabel === 'full';
    const now = new Date();
    const timeLabel = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Mood-specific structure rules — each vibe controls the food-to-activity ratio
    const moodStructures: Record<string, { full: string; half: string; desc: string }> = {
      sightseeing: {
        full: 'Pick exactly 6 stops: coffee/breakfast → landmark/attraction → landmark/viewpoint → lunch → museum/attraction → scenic dinner spot. Max 2 food stops, prioritize iconic sights.',
        half: 'Pick 3 stops: 1 food + 2 landmarks/attractions.',
        desc: 'iconic landmarks, viewpoints, famous attractions, must-see sights',
      },
      foodie: {
        full: 'Pick exactly 6 stops: brunch/breakfast → food market/bakery → lunch (local cuisine) → dessert/cafe → dinner (best-rated) → cocktail bar/late dessert. Prioritize diverse cuisines and best-rated food spots.',
        half: 'Pick 3 stops: all food/drink — different cuisines and vibes.',
        desc: 'best-rated restaurants, diverse cuisines, food markets, local specialties, hidden food gems',
      },
      outdoors: {
        full: 'Pick exactly 6 stops: coffee → park/garden → hiking/trail/outdoor activity → casual lunch → waterfront/nature spot → sunset dinner. Max 2 food stops, prioritize outdoor/nature experiences.',
        half: 'Pick 3 stops: 1 food + 2 outdoor/nature spots.',
        desc: 'parks, gardens, hiking, waterfront, nature, outdoor activities',
      },
      nightlife: {
        full: 'Pick exactly 6 stops: late lunch/brunch → afternoon activity → pre-dinner drinks → dinner → bar/lounge → nightclub/late-night spot. Start afternoon, build to night.',
        half: 'Pick 3 stops: dinner → bar → late-night venue.',
        desc: 'bars, clubs, lounges, rooftop bars, live music venues, late-night food',
      },
      culture: {
        full: 'Pick exactly 6 stops: cafe → museum → gallery/historic site → lunch → performing arts/cultural landmark → dinner at culturally-rich restaurant. Max 2 food stops, prioritize museums/galleries/cultural landmarks.',
        half: 'Pick 3 stops: 1 food + 2 cultural venues (museum, gallery, historic site).',
        desc: 'museums, art galleries, historic sites, cultural landmarks, performing arts, theaters',
      },
      'hidden-gems': {
        full: 'Pick exactly 6 stops: local-favorite cafe → off-the-beaten-path attraction → unique shop/market → local lunch spot → underrated attraction/park → neighborhood dinner spot. Avoid tourist traps. Prioritize places with fewer reviews but high ratings.',
        half: 'Pick 3 stops: mix of unknown food spots and underrated attractions. Avoid popular tourist picks.',
        desc: 'underrated spots, local favorites, off-the-beaten-path, unique finds, low review count but high rating',
      },
    };

    const moodConfig = moodStructures[moodKey] || moodStructures.sightseeing;
    const structureRule = isFullDay ? moodConfig.full : moodConfig.half;

    const prompt = `Create a ${durationLabel} itinerary from ONLY the numbered places below.

CONTEXT:
- City: ${city || 'nearby area'}
- Current time: ${timeLabel}
- Mood: ${moodKey} (focus on: ${moodConfig.desc})
- Group: ${travelGroup || 'solo'}${weather ? `\n- Weather: ${weather}` : ''}${preferences ? `\n- User preferences: ${preferences}` : ''}

PLACES (pick from these only, reference by idx):
${JSON.stringify(condensed)}${eventsSection}

RULES:
1. ${structureRule}
2. Never pick 2 restaurants in a row (unless mood is "foodie")
3. Time-logical: morning food first, activities mid-day, dinner/nightlife last
4. Prefer open places and 4.0+ ratings
5. The "spend" field must be a realistic USD estimate for one person at that specific stop (e.g. coffee=$5, museum=$20, nice dinner=$45).
6. Group adjustments: family=kid-friendly, no nightlife; couple=intimate/scenic; solo=flexible; friends=social/group-friendly; girls=aesthetic/brunch; boys=casual/sports; bachelorette=festive/fun
7. Keep stops close together for walkability
8. MIX PRICE RANGES: include at least one upscale/high-end spot (steakhouses, rooftop dining, fine dining — $$$+), one mid-range spot ($$), and one affordable spot ($). Variety in dining tiers makes the day interesting.
9. VARIETY: Never recommend the same combination of places twice. Prioritize places you haven't seen in recent plans. Include diverse cuisine types and unique experiences (rooftops, waterfront, hidden alleys, etc.).${eventsSection ? '\n10. Include at most 1 event if it fits the mood/timing' : ''}

Return ONLY this JSON:
{"stops":[{"idx":0,"timeSlot":"9:00 AM","reason":"why this fits","spend":15}],"dayTitle":"Catchy 3-4 word title"}`;

    const systemMsg = 'You are a JSON-only itinerary generator. Return ONLY valid JSON, no markdown, no explanation, no extra text.';
    const groqMessages = [
      { role: 'system' as const, content: systemMsg },
      { role: 'user' as const, content: prompt },
    ];

    // Fallback chain: Groq 70B → Groq 8B → Gemini Flash
    let aiContent: string | null = null;

    // 1. Try primary Groq model
    let groqResponse = await callGroq({
      model: GROQ_MODEL, messages: groqMessages,
      temperature: 0.8, max_tokens: 500, response_format: { type: 'json_object' },
    });

    if (groqResponse.status === 429) {
      // 2. Rate limited — try lighter Groq model
      console.log('[NxStops Plan] Primary model rate limited, trying Groq fallback');
      groqResponse = await callGroq({
        model: GROQ_FALLBACK_MODEL, messages: groqMessages,
        temperature: 0.7, max_tokens: 500, response_format: { type: 'json_object' },
      });
    }

    if (groqResponse.ok) {
      const groqData = await groqResponse.json();
      aiContent = groqData.choices?.[0]?.message?.content || null;
    } else {
      // 3. Both Groq models failed — try Gemini as free backup
      console.log('[NxStops Plan] Groq unavailable, trying Gemini fallback');
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
