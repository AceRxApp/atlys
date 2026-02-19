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

    // 2. Build mood-aware place list — single mood = 100% that category
    console.log(`[NxStops Plan] mood="${mood}" duration="${duration}" food=${uniqueFood.length} activities=${uniqueActivities.length}`);
    // Parse mood string (can be "foodie" or "foodie + nightlife")
    const validMoods = ['foodie', 'nightlife', 'outdoors', 'culture', 'hidden-gems', 'sightseeing'];
    const moodParts = (mood || 'sightseeing').split(/\s*\+\s*/).filter(m => validMoods.includes(m));
    if (moodParts.length === 0) moodParts.push('sightseeing');

    // Helper: get places for a single mood (pure — no mixing)
    const nightlifeTypes = new Set(['bar', 'night_club', 'casino', 'wine_bar', 'fine_dining_restaurant', 'steak_house', 'restaurant']);
    const outdoorTypes = new Set(['park', 'hiking_area', 'national_park', 'zoo', 'aquarium', 'amusement_park', 'tourist_attraction', 'stadium']);
    const cultureTypes = new Set(['museum', 'art_gallery', 'performing_arts_theater', 'historical_landmark', 'movie_theater', 'book_store', 'market']);

    function getPlacesForMood(m: string, limit: number): PlanPlace[] {
      if (m === 'foodie') {
        return uniqueFood.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, limit);
      }
      if (m === 'nightlife') {
        const nightFood = uniqueFood.filter(p => nightlifeTypes.has(p.category));
        const nightAct = uniqueActivities.filter(p => nightlifeTypes.has(p.category) || p.category === 'night_club' || p.category === 'casino');
        const spots = [...nightFood, ...nightAct].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, limit);
        // Fallback: if sparse, add bars/restaurants
        if (spots.length < 6) {
          const remaining = uniqueFood.filter(p => !spots.some(tp => tp.placeId === p.placeId));
          spots.push(...remaining.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, limit - spots.length));
        }
        return spots;
      }
      if (m === 'outdoors') {
        return uniqueActivities.filter(p => outdoorTypes.has(p.category)).sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, limit);
      }
      if (m === 'culture') {
        return uniqueActivities.filter(p => cultureTypes.has(p.category)).sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, limit);
      }
      if (m === 'hidden-gems') {
        const all = [...uniqueFood, ...uniqueActivities];
        return all
          .filter(p => p.reviewCount < 2000 && p.rating >= 3.8)
          .sort((a, b) => {
            const scoreA = (a.rating || 0) * 2 - Math.log10(Math.max(a.reviewCount, 1));
            const scoreB = (b.rating || 0) * 2 - Math.log10(Math.max(b.reviewCount, 1));
            return scoreB - scoreA;
          })
          .slice(0, limit);
      }
      // sightseeing: wow-factor activities ONLY — no food
      return uniqueActivities.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, limit);
    }

    let topPlaces: PlanPlace[];
    if (moodParts.length === 1) {
      // Single mood: 100% that category
      topPlaces = getPlacesForMood(moodParts[0], 20);
    } else {
      // Two moods: split evenly (10 each), deduplicate
      const first = getPlacesForMood(moodParts[0], 12);
      const firstIds = new Set(first.map(p => p.placeId));
      const second = getPlacesForMood(moodParts[1], 12).filter(p => !firstIds.has(p.placeId));
      topPlaces = [...first.slice(0, 10), ...second.slice(0, 10)];
    }

    console.log(`[NxStops Plan] resolved moodParts=[${moodParts}] topPlaces=${topPlaces.length} names=[${topPlaces.slice(0, 6).map(p => p.name).join(', ')}]`);

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

    // Mood-specific structure rules — single mood = ALL stops are that category
    const moodStructures: Record<string, { full: string; half: string; desc: string }> = {
      sightseeing: {
        full: 'Pick exactly 6 stops: ALL must be sightseeing/attractions. landmark → viewpoint → iconic attraction → famous site → scenic spot → must-see landmark. NO food stops. Only "wow" moments and iconic places.',
        half: 'Pick 3 stops: all sightseeing — landmarks, viewpoints, iconic attractions. NO food.',
        desc: 'iconic landmarks, viewpoints, famous attractions, must-see sights, "wow" moments',
      },
      foodie: {
        full: 'Pick exactly 6 stops: ALL must be food/drink. breakfast/brunch → bakery/snack/cookies → lunch (local cuisine) → dessert/ice cream/cafe → dinner (best-rated) → late-night treat/cocktail bar. Every single stop must be edible: restaurants, cafes, bakeries, ice cream, snacks, desserts, food markets. Diverse cuisines required.',
        half: 'Pick 3 stops: ALL food/drink — breakfast/brunch, lunch, dinner OR dessert. Every stop is a meal or snack.',
        desc: 'restaurants, cafes, bakeries, ice cream shops, dessert spots, food markets, snack shops, brunch spots, fine dining, street food',
      },
      outdoors: {
        full: 'Pick exactly 6 stops: ALL must be outdoor/nature. park → trail/hike → nature area → zoo/garden → waterfront/scenic → sunset viewpoint. NO food stops. Only outdoor and nature experiences.',
        half: 'Pick 3 stops: all outdoor/nature — parks, hikes, waterfront, gardens. NO food.',
        desc: 'parks, gardens, hiking trails, waterfront, nature reserves, zoos, outdoor recreation, scenic spots',
      },
      nightlife: {
        full: 'Pick exactly 6 stops: ALL must be nightlife/bars/clubs. cocktail bar → wine bar → dinner at trendy restaurant → rooftop bar/lounge → live music/club → late-night spot. Every stop should have a nightlife atmosphere.',
        half: 'Pick 3 stops: all nightlife — bar → restaurant/lounge → club or late-night venue.',
        desc: 'bars, clubs, lounges, rooftop bars, wine bars, casinos, live music venues, cocktail spots',
      },
      culture: {
        full: 'Pick exactly 6 stops: ALL must be cultural. museum → art gallery → historic landmark → cultural site → performing arts/theater → architectural landmark. NO food stops. Only museums, galleries, landmarks, and cultural experiences.',
        half: 'Pick 3 stops: all cultural — museums, galleries, historic sites. NO food.',
        desc: 'museums, art galleries, historic landmarks, cultural sites, performing arts, theaters, architecture',
      },
      'hidden-gems': {
        full: 'Pick exactly 6 stops: ALL must be hidden gems — underrated, low review count, unique. off-the-beaten-path spots locals love. Avoid anything with 5000+ reviews. Prioritize places with fewer reviews but high ratings. Mix of food and activities is OK but all must be "hidden" gems.',
        half: 'Pick 3 stops: all hidden gems — underrated and unique. Avoid popular tourist spots.',
        desc: 'underrated spots, local favorites, off-the-beaten-path, unique finds, low review count but high rating',
      },
    };

    // For multi-mood, build a combined prompt
    const primaryMood = moodParts[0];
    const secondaryMood = moodParts.length > 1 ? moodParts[1] : null;
    const primaryConfig = moodStructures[primaryMood] || moodStructures.sightseeing;

    let structureRule: string;
    let moodDesc: string;
    let moodLabel: string;

    if (secondaryMood) {
      const secondaryConfig = moodStructures[secondaryMood] || moodStructures.sightseeing;
      moodLabel = `${primaryMood} + ${secondaryMood}`;
      moodDesc = `${primaryConfig.desc}, ${secondaryConfig.desc}`;
      if (isFullDay) {
        structureRule = `Pick exactly 6 stops: 3 from the "${primaryMood}" category (${primaryConfig.desc}) and 3 from the "${secondaryMood}" category (${secondaryConfig.desc}). Alternate between the two categories for variety.`;
      } else {
        structureRule = `Pick 3 stops: mix of "${primaryMood}" and "${secondaryMood}" — at least 1 from each category.`;
      }
    } else {
      moodLabel = primaryMood;
      moodDesc = primaryConfig.desc;
      structureRule = isFullDay ? primaryConfig.full : primaryConfig.half;
    }

    const prompt = `Create a ${durationLabel} itinerary from ONLY the numbered places below.

CONTEXT:
- City: ${city || 'nearby area'}
- Current time: ${timeLabel}
- Mood: ${moodLabel} (focus on: ${moodDesc})
- Group: ${travelGroup || 'solo'}${weather ? `\n- Weather: ${weather}` : ''}${preferences ? `\n- User preferences: ${preferences}` : ''}

PLACES (pick from these only, reference by idx):
${JSON.stringify(condensed)}${eventsSection}

RULES:
1. ${structureRule}
2. CRITICAL: If mood is a single category, EVERY stop must be that category. Foodie = all food. Sightseeing = all sightseeing (no food). Culture = all culture (no food). Outdoors = all outdoors (no food). Do NOT add food stops unless the mood is "foodie" or includes food.
3. Time-logical ordering: earlier activities first, dinner/nightlife last
4. Prefer open places and 4.0+ ratings
5. The "spend" field must be a realistic USD estimate for one person at that specific stop (e.g. coffee=$5, museum=$20, nice dinner=$45).
6. Group adjustments: family=kid-friendly, no nightlife; couple=intimate/scenic; solo=flexible; friends=social/group-friendly; girls=aesthetic/brunch; boys=casual/sports; bachelorette=festive/fun
7. Keep stops close together for walkability
8. MIX PRICE RANGES when applicable: variety makes the day interesting.
9. VARIETY: diverse types within the mood category. For foodie: different cuisines. For sightseeing: different types of attractions.${eventsSection ? '\n10. Include at most 1 event if it fits the mood/timing' : ''}

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
      _moodReceived: mood,
      _moodResolved: moodParts.join(' + '),
    });
  } catch (err: unknown) {
    console.error('[NxStops Plan] Error:', err);
    return res.status(500).json({ error: 'Something went wrong generating your plan. Please try again.' });
  }
}
