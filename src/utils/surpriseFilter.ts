import type { Place } from '../services/places';
import { haversineKm } from './transport';

const VIBE_TYPE_MAP: Record<string, string[]> = {
  food: ['restaurant', 'cafe', 'bakery', 'bar', 'coffee_shop', 'pizza_restaurant', 'sushi_restaurant', 'steak_house', 'seafood_restaurant', 'brunch_restaurant', 'breakfast_restaurant', 'ice_cream_shop', 'meal_delivery', 'meal_takeaway'],
  stay: ['hotel', 'motel', 'hostel', 'lodging', 'resort_hotel', 'bed_and_breakfast', 'guest_house', 'campground', 'rv_park'],
  todo: ['museum', 'art_gallery', 'tourist_attraction', 'amusement_park', 'aquarium', 'zoo', 'performing_arts_theater', 'movie_theater', 'stadium', 'bowling_alley', 'spa'],
  hidden: ['park', 'market', 'book_store', 'record_store', 'antique_store', 'garden', 'viewpoint'],
  locals: ['night_club', 'bar', 'cafe', 'coffee_shop', 'market', 'park'],
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

/**
 * Find alternative places for a Pivot swap.
 * Scores by: same category, same vibe, similar price, proximity, rating.
 */
export function findPivotAlternatives(
  allPlaces: Place[],
  currentStop: { category: string; lat: number; lng: number; priceLevel: number; placeId: string },
  excludeIds: Set<string>,
  maxResults: number = 3,
): Place[] {
  const open = allPlaces.filter(p => p.openNow && !excludeIds.has(p.placeId));

  const scored = open.map(p => {
    let score = 0;

    // Same category: +40
    if (p.category === currentStop.category) score += 40;

    // Same vibe group: +20
    const currentVibe = CATEGORY_TO_VIBE[currentStop.category];
    const candidateVibe = CATEGORY_TO_VIBE[p.category];
    if (currentVibe && candidateVibe && currentVibe === candidateVibe) score += 20;

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
