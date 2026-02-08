// Google Places API Service
// Communicates with our Vercel API route to keep keys server-side

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
  food: ['restaurant', 'cafe', 'bakery', 'meal_delivery', 'meal_takeaway', 'coffee_shop', 'ice_cream_shop', 'steak_house', 'seafood_restaurant', 'pizza_restaurant', 'sushi_restaurant', 'brunch_restaurant', 'breakfast_restaurant'],
  cultural: ['museum', 'art_gallery', 'tourist_attraction', 'church', 'library', 'performing_arts_theater', 'cultural_center', 'historical_landmark'],
  nightlife: ['bar', 'night_club', 'casino', 'karaoke', 'comedy_club', 'cocktail_bar', 'wine_bar'],
  hidden: ['park', 'book_store', 'spa', 'botanical_garden', 'flea_market', 'farmers_market', 'garden', 'hiking_area', 'yoga_studio'],
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

export function formatDistance(km: number): string {
  if (km < 0.2) return '1 min walk';
  if (km < 1) return `${Math.round(km * 1000 / 80)} min walk`;
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

  const response = await fetch(`${API_BASE}?${params}`);
  if (!response.ok) {
    console.error('Nearby search failed:', response.status);
    return [];
  }

  const data = await response.json();
  const places = (data.places || []).map((p: Record<string, unknown>) => transformPlace(p, lat, lng));

  // Sort by distance
  places.sort((a: Place, b: Place) => (a.distance ?? 999) - (b.distance ?? 999));

  return places;
}

export async function getPlaceDetails(placeId: string): Promise<Place | null> {
  const params = new URLSearchParams({
    action: 'details',
    placeId,
  });

  const response = await fetch(`${API_BASE}?${params}`);
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
    return ['restaurant', 'bar', 'cocktail_bar', 'wine_bar', 'steak_house'];
  } else {
    // Late night: clubs, late-night food
    return ['night_club', 'bar', 'restaurant', 'casino'];
  }
}
