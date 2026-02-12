import type { Place } from '../services/places';
import type { BudgetTier, Vibe } from '../types';
import { PRICE_LEVEL_ESTIMATE } from '../data/constants';
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

function matchesBudget(place: Place, tier: BudgetTier): boolean {
  if (tier === 'any') return true;
  if (tier === 'free') return place.priceLevel === 0 || place.priceLevel === -1;
  if (tier === '$') return place.priceLevel <= 1;
  if (tier === '$$') return place.priceLevel <= 2;
  if (tier === '$$$') return place.priceLevel <= 3;
  if (tier === '$$$$') return place.priceLevel >= 3 && place.priceLevel <= 4;
  return true;
}

function matchesVibe(place: Place, vibe: Vibe | null): boolean {
  if (!vibe) return true;
  const types = VIBE_TYPE_MAP[vibe];
  return types ? types.includes(place.category) : true;
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
 * Filter and return up to 3 surprise places matching budget + vibe.
 * Prioritizes open places with good ratings.
 */
export function filterSurprisePlaces(
  places: Place[],
  budgetTier: BudgetTier,
  selectedVibe: Vibe | null,
): Place[] {
  const candidates = places
    .filter(p => p.openNow)
    .filter(p => matchesBudget(p, budgetTier))
    .filter(p => matchesVibe(p, selectedVibe));

  if (candidates.length === 0) return [];

  // Sort by rating (high first), then shuffle top half for variety
  const sorted = candidates.sort((a, b) => b.rating - a.rating);
  const topHalf = sorted.slice(0, Math.max(6, Math.ceil(sorted.length / 2)));
  return shuffle(topHalf).slice(0, 3);
}

/**
 * Filter places that fit within a remaining dollar budget.
 */
export function filterBudgetAwarePlaces(
  places: Place[],
  remainingBudget: number,
  selectedVibe: Vibe | null,
  count: number = 3,
): Place[] {
  if (remainingBudget < 0) {
    return filterSurprisePlaces(places, 'any', selectedVibe);
  }

  const candidates = places
    .filter(p => p.openNow)
    .filter(p => matchesVibe(p, selectedVibe))
    .filter(p => (PRICE_LEVEL_ESTIMATE[p.priceLevel] ?? 15) <= remainingBudget);

  if (candidates.length === 0) return [];

  const sorted = candidates.sort((a, b) => b.rating - a.rating);
  const topHalf = sorted.slice(0, Math.max(count * 2, Math.ceil(sorted.length / 2)));
  return shuffle(topHalf).slice(0, count);
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
