// Google Places API Service
// Communicates with our Vercel API route to keep keys server-side

import { fetchRetry } from '../utils/fetchRetry';
import { API_URL } from '../utils/api';

const API_BASE = `${API_URL}/api/places`;

// ============================================================================
// TYPES
// ============================================================================

export interface Place {
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
  hours: string[] | null;
  distance: number | null;
  lat: number;
  lng: number;
  phone: string | null;
  website: string | null;
  googleMapsUrl: string | null;
  editorialSummary: string | null;
}

// ============================================================================
// VIBE → GOOGLE PLACES TYPE MAPPING
// ============================================================================

export const VIBE_TYPE_MAP: Record<string, string[]> = {
  thespot: [
    'bar', 'wine_bar', 'tourist_attraction', 'park', 'spa',
    'bowling_alley', 'amusement_park', 'aquarium', 'zoo',
    'historical_landmark', 'performing_arts_theater', 'movie_theater',
    'book_store', 'market', 'stadium',
    'beach', 'hiking_area', 'national_park', 'garden', 'marina',
    'wildlife_park', 'wildlife_refuge', 'nature_preserve',
  ],
  eatsip: [
    'restaurant', 'cafe', 'coffee_shop', 'bar', 'bakery',
    'steak_house', 'seafood_restaurant', 'pizza_restaurant', 'sushi_restaurant',
    'brunch_restaurant', 'breakfast_restaurant', 'sandwich_shop',
    'ice_cream_shop', 'meal_takeaway',
  ],
  nightlife: [
    'bar', 'night_club', 'casino', 'wine_bar',
    'event_venue', 'karaoke', 'comedy_club',
    'performing_arts_theater', 'community_center',
  ],
  cultureart: [
    'museum', 'art_gallery', 'tourist_attraction', 'performing_arts_theater',
    'historical_landmark', 'church', 'library', 'community_center',
    'aquarium', 'zoo', 'movie_theater',
    'wildlife_park', 'wildlife_refuge', 'nature_preserve',
  ],
  neighborhood: [
    'cafe', 'bakery', 'coffee_shop', 'restaurant', 'brunch_restaurant',
    'florist', 'book_store', 'art_gallery', 'market', 'park',
    'ice_cream_shop', 'bar', 'wine_bar', 'library',
    'community_center', 'performing_arts_theater',
    'clothing_store', 'gift_shop', 'beauty_salon', 'shopping_mall',
    'jewelry_store', 'shoe_store', 'garden', 'playground',
  ],
};

// Reverse map: Google type → vibe tag
export const TYPE_TO_VIBE: Record<string, string> = {};
for (const [vibe, types] of Object.entries(VIBE_TYPE_MAP)) {
  for (const type of types) {
    TYPE_TO_VIBE[type] = vibe;
  }
}

// ============================================================================
// DISTANCE CALCULATION
// ============================================================================

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(km: number, useMiles = false): string {
  if (km < 0.2) return '1 min walk';
  if (km < 1) return `${Math.round(km * 1000 / 80)} min walk`;
  if (useMiles) {
    const miles = km * 0.621371;
    if (miles < 0.5) return `${miles.toFixed(1)} mi`;
    return `${Math.round(miles * 10) / 10} mi`;
  }
  if (km < 2) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

// ============================================================================
// HOURS STATUS HELPER
// ============================================================================

export function getHoursStatus(hours: string[] | null, openNow: boolean): { text: string; urgent: boolean } {
  if (!hours || !hours.length) return { text: openNow ? 'Open' : 'Closed', urgent: false };

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const now = new Date();
  const today = days[now.getDay()];

  const todayHours = hours.find(h => h.startsWith(today));
  if (!todayHours) return { text: openNow ? 'Open' : 'Closed', urgent: false };

  if (todayHours.includes('Open 24 hours')) return { text: 'Open 24h', urgent: false };
  if (todayHours.includes('Closed')) return { text: 'Closed today', urgent: false };

  // Parse closing time — format: "Monday: 8:00 AM – 10:00 PM"
  const closingMatch = todayHours.match(/[–\-]\s*(\d{1,2}:\d{2}\s*[AP]M)/i);
  const openingMatch = todayHours.match(/:\s*(\d{1,2}:\d{2}\s*[AP]M)/i);

  if (openNow && closingMatch) {
    const closeStr = closingMatch[1].trim();
    const closeDate = parseTimeToday(closeStr);
    if (closeDate) {
      const diffMs = closeDate.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      if (diffHours > 0 && diffHours <= 2) {
        const mins = Math.round(diffMs / (1000 * 60));
        return { text: `Closes in ${mins < 60 ? `${mins}m` : `${Math.floor(diffHours)}h ${mins % 60}m`}`, urgent: true };
      }
      return { text: `Open til ${closeStr}`, urgent: false };
    }
  }

  if (!openNow && openingMatch) {
    return { text: `Opens ${openingMatch[1].trim()}`, urgent: false };
  }

  return { text: openNow ? 'Open' : 'Closed', urgent: false };
}

function parseTimeToday(timeStr: string): Date | null {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const isPM = match[3].toUpperCase() === 'PM';
  if (isPM && hours !== 12) hours += 12;
  if (!isPM && hours === 12) hours = 0;
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

// ============================================================================
// TRANSFORM GOOGLE PLACES RESPONSE → Our Place type
// ============================================================================

function transformPlace(raw: Record<string, unknown>, userLat?: number, userLng?: number): Place {
  const location = raw.location as { latitude: number; longitude: number } | undefined;
  const displayName = raw.displayName as { text: string } | undefined;
  const primaryTypeDisplay = raw.primaryTypeDisplayName as { text: string } | undefined;
  const editorialSummary = raw.editorialSummary as { text: string } | undefined;
  const currentHours = raw.currentOpeningHours as { openNow?: boolean; weekdayDescriptions?: string[] } | undefined;
  const photos = raw.photos as { name: string }[] | undefined;
  const types = raw.types as string[] | undefined;

  const lat = location?.latitude || 0;
  const lng = location?.longitude || 0;

  // Map Google types to our vibe tags
  const tags: string[] = [];
  if (types) {
    for (const type of types) {
      const vibe = TYPE_TO_VIBE[type];
      if (vibe && !tags.includes(vibe)) {
        tags.push(vibe);
      }
    }
  }

  // Calculate distance from user
  let distance: number | null = null;
  if (userLat != null && userLng != null && lat && lng) {
    distance = getDistanceKm(userLat, userLng, lat, lng);
  }

  // Get photo names for later fetching
  const photoNames = photos?.map(p => p.name) || [];

  // Build first photo URL via our proxy
  const photoUrl = photoNames.length > 0
    ? `${API_BASE}?action=photo&name=${encodeURIComponent(photoNames[0])}&maxWidth=400`
    : null;

  // Map price level
  const priceLevelMap: Record<string, number> = {
    'PRICE_LEVEL_FREE': 0,
    'PRICE_LEVEL_INEXPENSIVE': 1,
    'PRICE_LEVEL_MODERATE': 2,
    'PRICE_LEVEL_EXPENSIVE': 3,
    'PRICE_LEVEL_VERY_EXPENSIVE': 4,
  };

  return {
    placeId: raw.id as string || '',
    name: displayName?.text || 'Unknown',
    category: (raw.primaryType as string) || '',
    categoryDisplay: primaryTypeDisplay?.text || formatType(raw.primaryType as string),
    tags,
    address: (raw.formattedAddress as string) || '',
    photoUrl,
    photoNames,
    rating: (raw.rating as number) || 0,
    reviewCount: (raw.userRatingCount as number) || 0,
    priceLevel: priceLevelMap[(raw.priceLevel as string)] ?? -1,
    openNow: currentHours?.openNow ?? true,
    hours: currentHours?.weekdayDescriptions || [],
    distance,
    lat,
    lng,
    phone: (raw.nationalPhoneNumber as string) || '',
    website: (raw.websiteUri as string) || '',
    googleMapsUrl: (raw.googleMapsUri as string) || '',
    editorialSummary: editorialSummary?.text || '',
  };
}

function formatType(type: string | undefined): string {
  if (!type) return '';
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// ============================================================================
// CHAIN / FRANCHISE FILTER (for Hidden Gems)
// ============================================================================

const CHAIN_KEYWORDS = [
  'mcdonald', 'burger king', 'wendy', 'taco bell', 'kfc', 'chick-fil-a',
  'popeyes', 'subway', 'five guys', 'chipotle', 'panda express', 'sonic',
  'arby', 'jack in the box', 'whataburger', 'carl\'s jr', 'hardee',
  'dunkin', 'starbucks', 'tim hortons', 'krispy kreme',
  'domino', 'pizza hut', 'papa john', 'little caesars',
  'applebee', 'chili\'s', 'olive garden', 'red lobster', 'outback',
  'ihop', 'denny\'s', 'cracker barrel', 'buffalo wild wings', 'hooters',
  'cheesecake factory', 'p.f. chang', 'benihana', 'ruth\'s chris',
  'waffle house', 'panera', 'noodles & company', 'wingstop',
  'planet fitness', 'la fitness', 'gold\'s gym', 'anytime fitness', 'equinox',
  'hilton', 'marriott', 'hyatt', 'holiday inn', 'best western',
  'sheraton', 'courtyard', 'hampton inn', 'fairfield', 'comfort inn',
  'walmart', 'target', 'costco', 'walgreens', 'cvs',
  'home depot', 'lowe\'s', 'petco', 'petsmart', 'bath & body',
  'victoria\'s secret', 'gap', 'old navy', 'h&m', 'zara', 'forever 21',
  'shell', 'exxon', 'chevron', 'bp', 'speedway',
  'jersey mike', 'jimmy john', 'firehouse subs', 'quiznos',
  'el pollo loco', 'del taco', 'in-n-out', 'shake shack', 'smashburger',
  'raising cane', 'zaxby', 'culver', 'dairy queen', 'baskin-robbins',
  'cold stone', 'jamba', 'smoothie king', 'tropical smoothie',
  'sweetgreen', 'cava', 'nando', 'wagamama',
];

export function isChain(name: string): boolean {
  const lower = name.toLowerCase();
  return CHAIN_KEYWORDS.some(chain => lower.includes(chain));
}

// Types that should NEVER appear in NxStops results
const EXCLUDED_TYPES = new Set([
  'lodging', 'hotel', 'motel', 'resort_hotel', 'extended_stay_hotel',
  'inn', 'bed_and_breakfast',
  'gas_station', 'electric_vehicle_charging_station',
  'car_wash', 'car_repair', 'car_dealer', 'car_rental',
  'parking', 'transit_station', 'bus_station', 'train_station', 'airport',
  'hospital', 'dentist', 'doctor', 'pharmacy', 'veterinary_care',
  'school', 'university', 'preschool',
  'post_office', 'bank', 'atm', 'insurance_agency',
  'laundry', 'storage', 'moving_company', 'locksmith',
  'real_estate_agency', 'lawyer', 'accounting', 'funeral_home',
  'gym', 'fitness_center',
  'grocery_store', 'supermarket', 'convenience_store',
  'event_venue', 'wedding_venue', 'banquet_hall',
  'condominium_complex', 'apartment_complex', 'residential_area',
  'bridge', 'playground', 'cemetery',
  'store', 'clothing_store', 'furniture_store', 'electronics_store',
  'shoe_store', 'hardware_store', 'department_store', 'shopping_mall',
  'home_goods_store', 'pet_store',
  'church', 'mosque', 'synagogue', 'hindu_temple',
]);

/** Filter out places that don't belong in NxStops */
function isExcludedPlace(place: Place): boolean {
  const nameLower = place.name.toLowerCase();
  // Safari/wildlife experiences are allowed even if typed as lodging/resort
  const isSafariExperience = /\b(safari|wildlife|game|conservancy|sanctuary|reserve)\b/i.test(nameLower);
  // Excluded by category type
  if (EXCLUDED_TYPES.has(place.category) && !isSafariExperience) return true;
  // No primaryType = likely a junction, street, interchange, or generic POI — not a real venue
  if (!place.category) return true;
  // Catch hotels/motels by name even if Google types them differently
  if (/\b(hotel|motel|inn|suites|lodge|resort)\b/i.test(nameLower)
    && !nameLower.includes('restaurant') && !nameLower.includes('bar') && !nameLower.includes('rooftop')
    && !isSafariExperience) return true;
  // Catch junctions, streets, interchanges, roundabouts by name
  if (/\b(junction|interchange|roundabout|overpass|underpass|flyover|intersection|highway|motorway|expressway)\b/i.test(nameLower)) return true;
  return false;
}

const NIGHTLIFE_CATS = new Set([
  'bar', 'night_club', 'casino', 'wine_bar', 'karaoke', 'comedy_club',
]);

/** Filter out places with very low safety signals */
function isUnsafePlace(place: Place): boolean {
  // Very low-rated nightlife — don't send users there
  if (NIGHTLIFE_CATS.has(place.category) && place.rating > 0 && place.rating < 2.5) return true;
  // Very low-rated place with enough reviews to be reliable signal
  if (place.rating > 0 && place.rating < 2.0 && place.reviewCount >= 20) return true;
  return false;
}

/** Filter out places that aren't open to the public yet (coming soon, under construction, etc.) */
const NOT_OPEN_KEYWORDS = /\b(coming soon|opening soon|under construction|not yet open|grand opening|pre-opening|opening \d{4}|opens? in|currently closed|permanently closed|temporarily closed|reopening|closed for renovation|under renovation)\b/i;
function isNotYetOpen(place: Place): boolean {
  if (NOT_OPEN_KEYWORDS.test(place.name)) return true;
  if (place.editorialSummary && NOT_OPEN_KEYWORDS.test(place.editorialSummary)) return true;
  return false;
}

/** Hidden gem score: high rating + few reviews = more "hidden" */
function hiddenGemScore(place: Place): number {
  if (place.rating < 3.8) return -1;
  // Ideal: rated 4.0+ with 10-300 reviews
  const ratingBonus = (place.rating - 3.5) * 20; // 0-30 points
  // Fewer reviews = more hidden (cap at 2000)
  const reviewPenalty = Math.min(place.reviewCount, 2000) / 20; // 0-100 penalty
  // Bonus for editorial summary (unique places tend to have one)
  const editorialBonus = place.editorialSummary ? 15 : 0;
  // Bonus for having photos
  const photoBonus = place.photoUrl ? 5 : 0;
  return ratingBonus - reviewPenalty + editorialBonus + photoBonus;
}

/** Diversity score: mix of upscale popular spots + culturally unique local gems */
function diversityScore(place: Place): number {
  let score = 50; // baseline

  // Rating bonus (good quality)
  if (place.rating >= 4.5) score += 25;
  else if (place.rating >= 4.0) score += 15;
  else if (place.rating >= 3.5) score += 5;
  else if (place.rating < 3.0 && place.rating > 0) score -= 20;

  // Popular + highly rated = upscale/trendy — boost these, not penalize
  if (place.rating >= 4.3 && place.reviewCount > 1000) score += 10;
  // Only penalize high-volume places that are mediocre-rated (actual tourist traps)
  if (place.reviewCount > 10000 && place.rating < 4.3) score -= 20;
  else if (place.reviewCount > 5000 && place.rating < 4.0) score -= 10;
  // Boost local spots with solid review count (not too obscure)
  if (place.reviewCount >= 50 && place.reviewCount <= 2000) score += 10;
  // Slight penalty for very few reviews (place may not be established yet)
  if (place.reviewCount > 0 && place.reviewCount < 10) score -= 5;

  // Bonus for editorial summary (notable places get them)
  if (place.editorialSummary) score += 8;

  // Bonus for having photos
  if (place.photoUrl) score += 3;

  // Keep nearby places slightly boosted (within walking distance)
  if (place.distance !== null) {
    if (place.distance < 0.5) score += 10;
    else if (place.distance < 1) score += 5;
    else if (place.distance > 5) score -= 5;
  }

  // Bonus for food/drink/cultural categories (the soul of NxStops)
  const culturalTypes = new Set([
    'restaurant', 'cafe', 'bakery', 'coffee_shop', 'bar', 'wine_bar',
    'brunch_restaurant', 'seafood_restaurant', 'sushi_restaurant',
    'steak_house', 'ice_cream_shop', 'market', 'art_gallery',
    'museum', 'performing_arts_theater', 'historical_landmark',
    'book_store', 'community_center', 'night_club',
  ]);
  if (culturalTypes.has(place.category)) score += 5;

  // Penalize generic tourist attractions only if mediocre rating
  if (place.category === 'tourist_attraction' && place.reviewCount > 3000 && place.rating < 4.3) score -= 15;

  return score;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

// Diverse cuisine searches — the soul of NxStops
const DIVERSE_CUISINE_SEARCHES = [
  'Mexican restaurant taqueria',
  'Ethiopian restaurant Eritrean',
  'Indian restaurant curry biryani',
  'soul food restaurant Southern comfort food',
  'Jamaican restaurant Caribbean jerk',
  'Korean restaurant BBQ bibimbap',
  'Vietnamese pho banh mi restaurant',
  'Thai restaurant pad thai',
  'Japanese ramen izakaya restaurant',
  'Chinese dim sum Szechuan restaurant',
  'Middle Eastern shawarma falafel restaurant',
  'African restaurant Nigerian Senegalese',
  'Colombian Peruvian restaurant empanada',
  'Halal restaurant',
  'Greek Mediterranean restaurant',
  'Polish restaurant Eastern European',
  'Filipino restaurant',
  'Haitian restaurant Caribbean',
  'Puerto Rican restaurant',
  'Turkish restaurant kebab',
  'fine dining upscale restaurant',
  'best restaurant in town top rated',
  'celebrity chef restaurant tasting menu',
  'luxury dining experience prix fixe',
  'popular restaurant reservation',
];

const DIVERSE_DRINKS_SEARCHES = [
  'speakeasy hidden cocktail bar',
  'rooftop bar lounge cocktail',
  'wine bar wine tasting',
  'cocktail lounge craft bar',
  'hookah lounge bar',
  'late night bar dive bar',
  'Black owned bar lounge',
  'Latin bar lounge',
  'tiki bar rum bar',
  'craft beer taproom brewery',
  'sake bar mezcal bar',
  'upscale lounge premium bar',
  'beach club day club pool bar',
  'sky bar panoramic rooftop',
  'best cocktail bar mixology',
  'VIP lounge nightclub exclusive',
  'champagne bar luxury lounge',
];

const DIVERSE_LIVE_MUSIC_SEARCHES = [
  'jazz club live jazz bar',
  'Afrobeat dancehall reggae club',
  'live music venue concert hall',
  'open mic night comedy club',
  'Latin salsa reggaeton nightclub',
  'hip hop club lounge',
  'R&B lounge soul bar live music',
  'Caribbean club dancehall reggae',
  'karaoke bar singing',
  'blues club live blues bar',
  'cultural performance theater',
  'upscale nightclub popular club',
  'trendy lounge DJ bar',
];

const DIVERSE_SHOP_SEARCHES = [
  'vintage store thrift shop',
  'independent boutique clothing',
  'Black owned shop boutique',
  'artisan market craft market',
  'record store vinyl shop',
  'bookstore independent book shop',
  'women owned boutique shop',
  'antique store vintage collectibles',
  'art supply store gallery shop',
  'street market flea market pop up',
  'ethnic grocery specialty market',
];

const DIVERSE_CULTURE_SEARCHES = [
  'art gallery contemporary art',
  'mural street art graffiti tour',
  'cultural center community center',
  'history museum heritage site',
  'African American museum cultural center',
  'Hispanic cultural center Latin art',
  'Asian cultural center gallery',
  'performing arts theater dance',
  'independent cinema art house film',
  'sculpture garden public art',
  'luxury boutique gallery exhibition',
  'iconic landmark must visit attraction',
];

const DIVERSE_NEIGHBORHOOD_SEARCHES = [
  'ethnic enclave neighborhood walk',
  'night market food market street food',
  'walkable district main street shops',
  'historic neighborhood walking tour',
  'Chinatown Little Italy Koreatown',
  'local neighborhood cafe bakery',
  'farmers market outdoor market',
  'scenic street mural district',
  'cultural district arts district',
  'food hall food court diverse',
  'beach boardwalk promenade coastal walk',
  'park garden scenic trail nature',
];

/** Run multiple text searches in parallel, dedupe, filter chains+excluded+out-of-city */
async function diverseTextSearch(
  queries: string[], lat: number, lng: number, radius: number, maxQueries: number,
): Promise<Place[]> {
  const shuffled = queries.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, maxQueries);
  const results = await Promise.all(
    selected.map(q => textSearchPlaces(q, lat, lng, radius).catch(() => [] as Place[]))
  );
  const maxDistKm = 80; // ~50 miles from city center
  const seen = new Set<string>();
  const seenNames = new Set<string>();
  const places: Place[] = [];
  for (const batch of results) {
    for (const p of batch) {
      if (seen.has(p.placeId) || isChain(p.name) || isExcludedPlace(p) || isUnsafePlace(p) || isNotYetOpen(p)) continue;
      // Filter out places too far from the city center
      if (p.lat && p.lng) {
        const dist = getDistanceKm(lat, lng, p.lat, p.lng);
        if (dist > maxDistKm) continue;
      }
      // Deduplicate by normalized name — catches same restaurant with different placeIds
      const nameLower = p.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
      const baseWords = nameLower.split(' ').slice(0, 3).join(' ');
      if (seenNames.has(nameLower)) continue;
      if (baseWords.length >= 5 && [...seenNames].some(n => n.startsWith(baseWords) || baseWords.startsWith(n))) continue;
      seen.add(p.placeId);
      seenNames.add(nameLower);
      places.push(p);
    }
  }
  return places;
}

export async function searchNearby(
  lat: number,
  lng: number,
  vibes: string[],
  radius: number = 1500,
): Promise<Place[]> {
  const searchRadius = Math.max(radius, 50000); // 50km minimum — covers ~30 miles

  // ── CURATED CITY (no vibes) ──
  // Upscale, bougie, dress-nice vibe — sit-down restaurants, premium lounges, iconic spots
  if (vibes.length === 0) {
    const curatedRadius = Math.max(searchRadius, 50000); // 50km min — cover wider metro area
    const [diningPlaces, loungePlaces, culturePlaces] = await Promise.all([
      diverseTextSearch([
        'fine dining restaurant upscale',
        'best restaurant award winning',
        'upscale restaurant reservation',
        'celebrity chef restaurant tasting menu',
        'luxury dining experience prix fixe',
        'trendy restaurant popular dinner',
        'rooftop restaurant dining view',
        'steakhouse prime seafood restaurant',
        'upscale brunch champagne brunch',
        'exclusive restaurant date night',
        'Michelin restaurant top rated dining',
        'signature cocktail restaurant bar',
        'waterfront restaurant scenic dining',
        'boutique restaurant intimate dining',
        'upscale sushi omakase restaurant',
        'upscale Italian French restaurant',
      ], lat, lng, curatedRadius, 8),
      diverseTextSearch([
        'upscale lounge premium cocktail bar',
        'rooftop bar sky bar panoramic',
        'beach club day club pool bar',
        'champagne bar wine lounge',
        'speakeasy craft cocktail bar',
        'VIP lounge nightclub exclusive',
        'trendy bar popular nightlife',
        'jazz lounge live music upscale',
      ], lat, lng, curatedRadius, 4),
      diverseTextSearch([
        'iconic landmark must visit attraction',
        'art gallery contemporary exhibition',
        'luxury boutique designer shopping',
        'museum cultural landmark',
      ], lat, lng, curatedRadius, 2),
    ]);
    const seen = new Set(diningPlaces.map(p => p.placeId));
    for (const p of [...loungePlaces, ...culturePlaces]) {
      if (!seen.has(p.placeId)) { seen.add(p.placeId); diningPlaces.push(p); }
    }
    // Curated City quality gate — upscale venues only, no casual/street food
    const curated = diningPlaces.filter(p => {
      const n = p.name.toLowerCase();
      // No food trucks, street food, kiosks, food carts, market stalls
      if (/\b(food truck|street food|food cart|food stall|kiosk|hawker|chop bar|roadside)\b/i.test(n)) return false;
      if (p.category === 'meal_takeaway' || p.category === 'meal_delivery') return false;
      // Must have some reviews to be considered established
      if (p.reviewCount < 5) return false;
      return true;
    });

    // Fallback for small/island/remote cities — if upscale searches found too few results,
    // run broader queries that work anywhere
    if (curated.length < 5) {
      const fallbackPlaces = await diverseTextSearch([
        'best restaurant',
        'popular restaurant locals',
        'seafood restaurant waterfront',
        'restaurant bar good food',
        'best place to eat',
        'cafe coffee shop',
        'bar cocktails drinks',
        'tourist attraction things to do',
        'beach bar restaurant',
        'local food authentic restaurant',
        'scenic spot viewpoint',
        'market shopping',
      ], lat, lng, curatedRadius, 8);
      const seenFallback = new Set(curated.map(p => p.placeId));
      for (const p of fallbackPlaces) {
        if (!seenFallback.has(p.placeId) && p.reviewCount >= 3) {
          seenFallback.add(p.placeId);
          curated.push(p);
        }
      }
    }

    curated.sort((a, b) => diversityScore(b) - diversityScore(a));
    return curated;
  }

  // ── THE SPOT — lounges, scenic spots, tourist attractions, hangout places ──
  if (vibes.includes('thespot')) {
    const [textPlaces, nearbyPlaces] = await Promise.all([
      diverseTextSearch([
        'rooftop lounge scenic views', 'tourist attraction must see',
        'scenic viewpoint lookout', 'local hangout popular spot',
        'unique experience activity', 'cool bar lounge chill',
        'botanical garden park scenic', 'waterfront boardwalk pier',
        'bowling arcade entertainment', 'hidden gem local favorite',
        'speakeasy lounge cocktails', 'landmark sightseeing tour',
        'beach club pool day club', 'luxury lounge upscale bar',
        'best rated place top spot', 'sky bar panoramic view',
        'iconic restaurant famous', 'popular nightclub trendy club',
        'beach shoreline coast ocean', 'hiking trail nature walk',
        'marina harbor waterfront', 'national park nature reserve',
      ], lat, lng, searchRadius, 10),
      fetchNearbyByTypes(lat, lng, radius, VIBE_TYPE_MAP.thespot),
    ]);
    const seen = new Set(textPlaces.map(p => p.placeId));
    for (const p of nearbyPlaces) {
      if (!seen.has(p.placeId)) { seen.add(p.placeId); textPlaces.push(p); }
    }
    textPlaces.sort((a, b) => diversityScore(b) - diversityScore(a));
    return textPlaces;
  }

  // ── EAT & SIP — diverse cuisine text searches ──
  if (vibes.includes('eatsip')) {
    const places = await diverseTextSearch([
      ...DIVERSE_CUISINE_SEARCHES,
      'brunch spot breakfast cafe',
      'food truck street food',
      'hole in the wall restaurant local',
      'mom and pop restaurant family owned',
      'upscale brunch best brunch spot',
      'popular restaurant best food in town',
    ], lat, lng, searchRadius, 12);
    places.sort((a, b) => diversityScore(b) - diversityScore(a));
    return places;
  }

  // ── NIGHTLIFE — bars, clubs, live music, speakeasies, jazz, open mic ──
  if (vibes.includes('nightlife')) {
    const places = await diverseTextSearch([
      ...DIVERSE_DRINKS_SEARCHES,
      ...DIVERSE_LIVE_MUSIC_SEARCHES,
    ], lat, lng, searchRadius, 10);
    places.sort((a, b) => diversityScore(b) - diversityScore(a));
    return places;
  }

  // ── CULTURE & ART — galleries, murals, cultural districts ──
  if (vibes.includes('cultureart')) {
    const [textPlaces, nearbyPlaces] = await Promise.all([
      diverseTextSearch(DIVERSE_CULTURE_SEARCHES, lat, lng, searchRadius, 6),
      fetchNearbyByTypes(lat, lng, radius, VIBE_TYPE_MAP.cultureart),
    ]);
    const seen = new Set(textPlaces.map(p => p.placeId));
    for (const p of nearbyPlaces) {
      if (!seen.has(p.placeId)) { seen.add(p.placeId); textPlaces.push(p); }
    }
    textPlaces.sort((a, b) => diversityScore(b) - diversityScore(a));
    return textPlaces;
  }

  // ── THE NEIGHBORHOOD — walkable areas, shops, boutiques, markets, ethnic enclaves ──
  if (vibes.includes('neighborhood')) {
    const [textPlaces, shopPlaces, nearbyPlaces] = await Promise.all([
      diverseTextSearch(DIVERSE_NEIGHBORHOOD_SEARCHES, lat, lng, searchRadius, 6),
      diverseTextSearch(DIVERSE_SHOP_SEARCHES, lat, lng, searchRadius, 4),
      fetchNearbyByTypes(lat, lng, radius, VIBE_TYPE_MAP.neighborhood),
    ]);
    const seen = new Set(textPlaces.map(p => p.placeId));
    for (const p of [...shopPlaces, ...nearbyPlaces]) {
      if (!seen.has(p.placeId)) { seen.add(p.placeId); textPlaces.push(p); }
    }
    textPlaces.sort((a, b) => diversityScore(b) - diversityScore(a));
    return textPlaces;
  }

  // ── FALLBACK — nearby search with type mapping ──
  return fetchNearbyByTypes(lat, lng, radius, []);
}

/** Fetch nearby places by Google types, filter chains/excluded/unsafe */
async function fetchNearbyByTypes(
  lat: number, lng: number, radius: number, types: string[],
): Promise<Place[]> {
  if (types.length === 0) types = ['restaurant', 'cafe', 'bar', 'museum', 'park'];

  const params = new URLSearchParams({
    action: 'nearby',
    lat: lat.toString(),
    lng: lng.toString(),
    radius: radius.toString(),
    types: types.join(','),
  });

  const response = await fetchRetry(`${API_BASE}?${params}`);
  if (!response.ok) return [];

  const data = await response.json();
  let places = (data.places || []).map((p: Record<string, unknown>) => transformPlace(p, lat, lng));
  places = places.filter((p: Place) => !isChain(p.name) && !isExcludedPlace(p) && !isUnsafePlace(p) && !isNotYetOpen(p));
  const allowedTypes = new Set(types);
  places = places.filter((p: Place) => allowedTypes.has(p.category));
  places.sort((a: Place, b: Place) => diversityScore(b) - diversityScore(a));
  return places;
}

export async function textSearchPlaces(
  query: string,
  lat: number,
  lng: number,
  radius: number = 50000,
): Promise<Place[]> {
  const params = new URLSearchParams({
    action: 'textsearch',
    query,
    lat: lat.toString(),
    lng: lng.toString(),
    radius: radius.toString(),
  });

  const response = await fetchRetry(`${API_BASE}?${params}`);
  if (!response.ok) {
    console.error('Text search failed:', response.status);
    return [];
  }

  const data = await response.json();
  const places = (data.places || []).map((p: Record<string, unknown>) => transformPlace(p, lat, lng));
  places.sort((a: Place, b: Place) => (a.distance ?? 999) - (b.distance ?? 999));
  return places;
}

export async function getPlaceDetails(placeId: string): Promise<Place | null> {
  const params = new URLSearchParams({
    action: 'details',
    placeId,
  });

  const response = await fetchRetry(`${API_BASE}?${params}`);
  if (!response.ok) return null;

  const data = await response.json();
  return transformPlace(data);
}

export function getPhotoUrl(photoName: string, maxWidth: number = 400): string {
  return `${API_BASE}?action=photo&name=${encodeURIComponent(photoName)}&maxWidth=${maxWidth}`;
}

// ============================================================================
// TIME-AWARE DEFAULTS
// ============================================================================

export function getTimeAwareTypes(): string[] {
  const hour = new Date().getHours();

  if (hour >= 6 && hour < 11) {
    // Morning: cafes, brunch, breakfast
    return ['cafe', 'bakery', 'breakfast_restaurant', 'brunch_restaurant', 'coffee_shop'];
  } else if (hour >= 11 && hour < 17) {
    // Afternoon: lunch, activities, cultural
    return ['restaurant', 'museum', 'art_gallery', 'tourist_attraction', 'park'];
  } else if (hour >= 17 && hour < 22) {
    // Evening: dinner, bars
    return ['restaurant', 'bar', 'steak_house', 'seafood_restaurant'];
  } else {
    // Late night: clubs, late-night food
    return ['night_club', 'bar', 'restaurant', 'casino'];
  }
}
