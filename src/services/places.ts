// Google Places API Service
// Communicates with our Vercel API route to keep keys server-side

import { fetchRetry } from '../utils/fetchRetry';

const API_BASE = '/api/places';

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
  hours: string[];
  distance: number | null;
  lat: number;
  lng: number;
  phone: string;
  website: string;
  googleMapsUrl: string;
  editorialSummary: string;
}

// ============================================================================
// VIBE → GOOGLE PLACES TYPE MAPPING
// ============================================================================

export const VIBE_TYPE_MAP: Record<string, string[]> = {
  food: [
    'restaurant', 'cafe', 'coffee_shop', 'bar', 'bakery',
    'steak_house', 'seafood_restaurant', 'pizza_restaurant', 'sushi_restaurant',
    'brunch_restaurant', 'breakfast_restaurant', 'fast_food_restaurant', 'sandwich_shop',
    'ice_cream_shop', 'meal_takeaway',
  ],
  nightlife: [
    'bar', 'night_club', 'casino', 'wine_bar',
    'event_venue', 'karaoke', 'comedy_club', 'restaurant',
  ],
  outdoors: [
    'park', 'hiking_area', 'national_park', 'campground',
    'tourist_attraction', 'zoo', 'aquarium', 'amusement_park',
    'stadium', 'cafe', 'restaurant',
  ],
  culture: [
    'museum', 'art_gallery', 'tourist_attraction', 'performing_arts_theater',
    'historical_landmark', 'church', 'library', 'community_center',
    'aquarium', 'zoo', 'movie_theater',
  ],
  hidden: [
    'cafe', 'restaurant', 'bar', 'bakery', 'book_store', 'spa',
    'market', 'art_gallery', 'park', 'hiking_area', 'national_park',
    'wine_bar', 'coffee_shop', 'ice_cream_shop', 'brunch_restaurant',
    'performing_arts_theater', 'historical_landmark', 'movie_theater',
  ],
  locals: [
    'bakery', 'cafe', 'coffee_shop', 'restaurant', 'brunch_restaurant',
    'florist', 'book_store', 'art_gallery', 'market', 'grocery_store',
    'gift_shop', 'clothing_store', 'pet_store', 'beauty_salon',
    'ice_cream_shop', 'bar', 'wine_bar', 'park', 'library',
    'community_center', 'spa', 'performing_arts_theater', 'movie_theater',
  ],
};

// Reverse map: Google type → vibe tag
const TYPE_TO_VIBE: Record<string, string> = {};
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

export function getHoursStatus(hours: string[], openNow: boolean): { text: string; urgent: boolean } {
  if (!hours.length) return { text: openNow ? 'Open' : 'Closed', urgent: false };

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

// ============================================================================
// API FUNCTIONS
// ============================================================================

export async function searchNearby(
  lat: number,
  lng: number,
  vibes: string[],
  radius: number = 1500,
): Promise<Place[]> {
  // Collect types for selected vibes
  let types: string[] = [];
  if (vibes.length === 0) {
    // Default: show a mix of everything
    types = ['restaurant', 'cafe', 'bar', 'museum', 'tourist_attraction', 'park', 'night_club'];
  } else {
    for (const vibe of vibes) {
      const vibeTypes = VIBE_TYPE_MAP[vibe];
      if (vibeTypes) {
        types.push(...vibeTypes);
      }
    }
  }

  // Deduplicate
  types = [...new Set(types)];

  const params = new URLSearchParams({
    action: 'nearby',
    lat: lat.toString(),
    lng: lng.toString(),
    radius: radius.toString(),
    types: types.join(','),
  });

  const response = await fetchRetry(`${API_BASE}?${params}`);
  if (!response.ok) {
    console.error('Nearby search failed:', response.status);
    return [];
  }

  const data = await response.json();
  let places = (data.places || []).map((p: Record<string, unknown>) => transformPlace(p, lat, lng));

  // Filter results to match the requested vibe types (Google can return places with secondary type matches)
  if (vibes.length > 0 && !vibes.includes('nightlife')) {
    const allowedTypes = new Set(types);
    places = places.filter((p: Place) => allowedTypes.has(p.category));
  }

  // Nightlife: supplement with text search for clubs, lounges, rooftops etc.
  // Google's type system misses many nightlife venues (lounges, rooftop bars, hookah, karaoke)
  if (vibes.includes('nightlife')) {
    try {
      const textResults = await textSearchPlaces(
        'nightclub lounge rooftop bar hookah karaoke comedy club',
        lat, lng, Math.max(radius, 3000),
      );
      // Merge: add text results that aren't already in the nearby results
      const existingIds = new Set(places.map((p: Place) => p.placeId));
      const newPlaces = textResults.filter(p => !existingIds.has(p.placeId));
      places = [...places, ...newPlaces];
    } catch { /* text search failed — use nearby results only */ }

    // For nightlife, also allow restaurants/bars that came from text search
    // but filter out clearly non-nightlife types
    const nightlifeExclude = new Set([
      'grocery_store', 'supermarket', 'gas_station', 'pharmacy', 'hospital',
      'school', 'church', 'library', 'post_office', 'bank', 'atm',
      'laundry', 'car_wash', 'car_repair', 'dentist', 'doctor',
      'hardware_store', 'pet_store', 'veterinary_care',
    ]);
    places = places.filter((p: Place) => !nightlifeExclude.has(p.category));
  }

  // Hidden Gems: filter out chains, prefer high rating + fewer reviews, sort by gem score
  if (vibes.includes('hidden')) {
    places = places
      .filter((p: Place) => !isChain(p.name))
      .filter((p: Place) => p.rating >= 3.8)
      .filter((p: Place) => p.reviewCount < 2000); // Skip only mega-tourist traps
    places.sort((a: Place, b: Place) => hiddenGemScore(b) - hiddenGemScore(a));
    return places;
  }

  // Sort by distance
  places.sort((a: Place, b: Place) => (a.distance ?? 999) - (b.distance ?? 999));

  return places;
}

export async function textSearchPlaces(
  query: string,
  lat: number,
  lng: number,
  radius: number = 5000,
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
