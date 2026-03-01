import type { Place } from '../services/places';
import { haversineKm } from './transport';

const VIBE_TYPE_MAP: Record<string, string[]> = {
  thespot: ['bar', 'wine_bar', 'tourist_attraction', 'park', 'spa', 'bowling_alley', 'amusement_park', 'aquarium', 'zoo', 'historical_landmark', 'performing_arts_theater', 'movie_theater', 'book_store', 'market', 'stadium'],
  eatsip: ['restaurant', 'cafe', 'bakery', 'bar', 'coffee_shop', 'pizza_restaurant', 'sushi_restaurant', 'steak_house', 'seafood_restaurant', 'brunch_restaurant', 'breakfast_restaurant', 'ice_cream_shop', 'meal_delivery', 'meal_takeaway'],
  nightlife: ['bar', 'night_club', 'casino', 'wine_bar', 'event_venue', 'karaoke', 'comedy_club', 'performing_arts_theater', 'community_center'],
  cultureart: ['museum', 'art_gallery', 'tourist_attraction', 'amusement_park', 'aquarium', 'zoo', 'performing_arts_theater', 'movie_theater', 'stadium', 'bowling_alley', 'spa'],
  neighborhood: ['park', 'cafe', 'bakery', 'coffee_shop', 'market', 'bar', 'library', 'community_center', 'clothing_store', 'gift_shop', 'book_store', 'florist', 'art_gallery', 'beauty_salon', 'jewelry_store'],
};

// Reverse map: category → vibe
const CATEGORY_TO_VIBE: Record<string, string> = {};
for (const [vibe, types] of Object.entries(VIBE_TYPE_MAP)) {
  for (const type of types) {
    if (!CATEGORY_TO_VIBE[type]) CATEGORY_TO_VIBE[type] = vibe;
  }
}

/** Shuffle an array (Fisher-Yates) */
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Categories that are food/drink */
const FOOD_CATEGORIES = new Set([
  'restaurant', 'cafe', 'coffee_shop', 'bar', 'bakery', 'wine_bar',
  'steak_house', 'seafood_restaurant', 'pizza_restaurant', 'sushi_restaurant',
  'brunch_restaurant', 'breakfast_restaurant', 'sandwich_shop', 'ice_cream_shop',
  'meal_takeaway', 'meal_delivery', 'food', 'night_club',
  'bistro', 'diner', 'grill', 'bbq', 'tea_house', 'dessert_shop',
]);

/** Categories appropriate for breakfast/brunch (morning slots) */
const BREAKFAST_CATEGORIES = new Set([
  'cafe', 'coffee_shop', 'bakery', 'brunch_restaurant', 'breakfast_restaurant',
  'restaurant', 'bistro', 'diner',
]);

/** Parse a timeSlot string like "8:00 AM" or "10:30 AM" into hour (0-23) */
function parseTimeSlotHour(timeSlot: string): number | null {
  const m = timeSlot.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return null;
  let hour = parseInt(m[1], 10);
  const ampm = m[3].toUpperCase();
  if (ampm === 'PM' && hour !== 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;
  return hour;
}

/**
 * Find alternative places for a Pivot swap.
 * Scores by: same category, same vibe, similar price, proximity, rating.
 * When planVibe is 'food' or 'stacked', only food/drink places are returned.
 * When timeSlot is morning (before 11 AM), breakfast/brunch places are prioritized.
 */
export function findPivotAlternatives(
  allPlaces: Place[],
  currentStop: { category: string; lat: number; lng: number; priceLevel: number; placeId: string },
  excludeIds: Set<string>,
  maxResults: number = 3,
  planVibe?: string,
  timeSlot?: string,
): Place[] {
  const isFoodVibe = planVibe === 'food' || planVibe === 'stacked';
  const hour = timeSlot ? parseTimeSlotHour(timeSlot) : null;
  const isMorning = hour !== null && hour < 11;
  const isLunch = hour !== null && hour >= 11 && hour < 15;

  let open = allPlaces.filter(p => p.openNow && !excludeIds.has(p.placeId));

  // For food vibes, ONLY return food/drink places
  if (isFoodVibe) {
    open = open.filter(p => FOOD_CATEGORIES.has(p.category));
  }

  // For morning time slots on food vibes, further filter to breakfast-appropriate places
  if (isFoodVibe && isMorning) {
    const breakfastOnly = open.filter(p => BREAKFAST_CATEGORIES.has(p.category));
    // Only use the strict filter if we have enough results
    if (breakfastOnly.length >= 3) {
      open = breakfastOnly;
    }
  }

  const scored = open.map(p => {
    let score = 0;

    // Same category: +40
    if (p.category === currentStop.category) score += 40;

    // Same vibe group: +20
    const currentVibe = CATEGORY_TO_VIBE[currentStop.category];
    const candidateVibe = CATEGORY_TO_VIBE[p.category];
    if (currentVibe && candidateVibe && currentVibe === candidateVibe) score += 20;

    // Time-appropriate bonus for food vibes
    if (isFoodVibe && isMorning && BREAKFAST_CATEGORIES.has(p.category)) score += 30;
    if (isFoodVibe && isLunch && (p.category === 'restaurant' || p.category === 'bistro' || p.category === 'diner')) score += 15;

    // Similar price: +15 exact, +10 for +-1
    const priceDiff = Math.abs(p.priceLevel - currentStop.priceLevel);
    if (priceDiff === 0) score += 15;
    else if (priceDiff === 1) score += 10;

    // Distance: closer is better
    const km = haversineKm(
      { lat: currentStop.lat, lng: currentStop.lng },
      { lat: p.lat, lng: p.lng },
    );
    if (km < 0.5) score += 20;
    else if (km < 1) score += 15;
    else if (km < 2) score += 10;
    else if (km < 5) score += 5;

    // Rating bonus
    if (p.rating >= 4.5) score += 10;
    else if (p.rating >= 4.0) score += 5;

    return { place: p, score, km };
  });

  scored.sort((a, b) => b.score - a.score || a.km - b.km);

  const topCandidates = scored.slice(0, Math.max(maxResults * 2, 8));
  const shuffled = shuffle(topCandidates);
  return shuffled.slice(0, maxResults).map(s => s.place);
}
