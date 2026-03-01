export interface BookingService {
  id: string;
  name: string;
  emoji: string;
  category: 'hotels' | 'experiences';
  description: string;
  buildUrl: (cityName: string) => string;
  affiliateNote?: string;
}

// Affiliate IDs — set via environment or replace placeholders
const BOOKING_AID = import.meta.env.VITE_BOOKING_AID || '';
const GYG_PARTNER = import.meta.env.VITE_GYG_PARTNER_ID || '';
const VIATOR_PID = import.meta.env.VITE_VIATOR_PID || '';
const KLOOK_AID = import.meta.env.VITE_KLOOK_AID || '';
const OPENTABLE_REF = import.meta.env.VITE_OPENTABLE_REF || '';
const RESY_REF = import.meta.env.VITE_RESY_REF || '';
const TM_AFFILIATE = import.meta.env.VITE_TICKETMASTER_AFFILIATE_ID || '';

export const BOOKING_SERVICES: BookingService[] = [
  {
    id: 'booking',
    name: 'Booking.com',
    emoji: '\u{1F3E8}',
    category: 'hotels',
    description: 'Hotels & stays',
    affiliateNote: '25-40% commission',
    buildUrl: (city) => {
      const base = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city)}`;
      return BOOKING_AID ? `${base}&aid=${BOOKING_AID}` : base;
    },
  },
  {
    id: 'hostelworld',
    name: 'Hostelworld',
    emoji: '\u{1F6CC}',
    category: 'hotels',
    description: 'Budget stays & hostels',
    buildUrl: (city) => `https://www.hostelworld.com/s?q=${encodeURIComponent(city)}`,
  },
  {
    id: 'getyourguide',
    name: 'GetYourGuide',
    emoji: '\u{1F3AF}',
    category: 'experiences',
    description: 'Tours & activities',
    affiliateNote: '~8% commission',
    buildUrl: (city) => {
      const base = `https://www.getyourguide.com/s/?q=${encodeURIComponent(city)}`;
      return GYG_PARTNER ? `${base}&partner_id=${GYG_PARTNER}` : base;
    },
  },
  {
    id: 'viator',
    name: 'Viator',
    emoji: '\u{1F5FA}\u{FE0F}',
    category: 'experiences',
    description: 'Tours, tickets & excursions',
    affiliateNote: '8% commission',
    buildUrl: (city) => {
      const base = `https://www.viator.com/searchResults/all?text=${encodeURIComponent(city)}`;
      return VIATOR_PID ? `${base}&pid=${VIATOR_PID}` : base;
    },
  },
  {
    id: 'klook',
    name: 'Klook',
    emoji: '\u{1F39F}\u{FE0F}',
    category: 'experiences',
    description: 'Attractions & transport passes',
    affiliateNote: 'Up to 5% commission',
    buildUrl: (city) => {
      const base = `https://www.klook.com/search/result/?query=${encodeURIComponent(city)}`;
      return KLOOK_AID ? `${base}&aid=${KLOOK_AID}` : base;
    },
  },
];

// --------------------------------------------------------------------------
// Place-specific booking helpers
// --------------------------------------------------------------------------

const EXPERIENCE_TYPES = [
  'museum', 'art_gallery', 'tourist_attraction', 'performing_arts_theater',
  'historical_landmark', 'zoo', 'aquarium', 'amusement_park', 'park',
  'hiking_area', 'national_park', 'stadium',
];

const FOOD_TYPES = [
  'restaurant', 'steak_house', 'seafood_restaurant', 'sushi_restaurant',
  'brunch_restaurant', 'breakfast_restaurant', 'bar',
];

export function getPlaceBookingUrl(placeName: string, placeCategory: string, cityName: string): { url: string; label: string; service: string } | null {
  if (EXPERIENCE_TYPES.includes(placeCategory)) {
    const query = `${placeName} ${cityName}`;
    const base = `https://www.getyourguide.com/s/?q=${encodeURIComponent(query)}`;
    const url = GYG_PARTNER ? `${base}&partner_id=${GYG_PARTNER}` : base;
    return { url, label: 'Find Tours', service: 'GetYourGuide' };
  }

  if (FOOD_TYPES.includes(placeCategory)) {
    return getRestaurantBookingUrl(placeName, cityName);
  }

  return null;
}

// --------------------------------------------------------------------------
// Restaurant reservation links (OpenTable + Resy with affiliate tracking)
// --------------------------------------------------------------------------

export function getRestaurantBookingUrl(
  placeName: string,
  cityName?: string,
): { url: string; label: string; service: string } {
  const term = encodeURIComponent(placeName);
  const city = cityName ? encodeURIComponent(cityName) : '';

  // OpenTable (primary — largest reservation network)
  const otBase = `https://www.opentable.com/s?term=${term}&covers=2${city ? `&queryUnderstandingType=location&rawQuery=${term}+${city}` : ''}`;
  const otUrl = OPENTABLE_REF ? `${otBase}&ref=${OPENTABLE_REF}` : otBase;

  return { url: otUrl, label: 'Reserve Table', service: 'OpenTable' };
}

export function getResyBookingUrl(
  placeName: string,
  cityName?: string,
): { url: string; label: string; service: string } {
  const query = encodeURIComponent(`${placeName}${cityName ? ` ${cityName}` : ''}`);
  const base = `https://resy.com/cities?query=${query}`;
  const url = RESY_REF ? `${base}&ref=${RESY_REF}` : base;
  return { url, label: 'Reserve on Resy', service: 'Resy' };
}

// --------------------------------------------------------------------------
// Event URL affiliate tagging
// --------------------------------------------------------------------------

/**
 * Tag an event ticket URL with the appropriate affiliate ID.
 * Works for Ticketmaster and GetYourGuide; passes others through unchanged.
 */
export function tagEventUrl(url: string, source?: string): string {
  if (!url) return url;

  try {
    const u = new URL(url);

    // Ticketmaster — add affiliate ID
    if (u.hostname.includes('ticketmaster.com') || source === 'Ticketmaster') {
      if (TM_AFFILIATE && !u.searchParams.has('at_custom2')) {
        u.searchParams.set('at_custom2', TM_AFFILIATE);
      }
      return u.toString();
    }

    // GetYourGuide — add partner ID
    if (u.hostname.includes('getyourguide.com') || source === 'GetYourGuide') {
      if (GYG_PARTNER && !u.searchParams.has('partner_id')) {
        u.searchParams.set('partner_id', GYG_PARTNER);
      }
      return u.toString();
    }
  } catch {
    // Invalid URL — return as-is
  }

  return url;
}

export function getExperienceSearchUrl(query: string): string {
  const base = `https://www.getyourguide.com/s/?q=${encodeURIComponent(query)}`;
  return GYG_PARTNER ? `${base}&partner_id=${GYG_PARTNER}` : base;
}

export function getViatorSearchUrl(query: string): string {
  const base = `https://www.viator.com/searchResults/all?text=${encodeURIComponent(query)}`;
  return VIATOR_PID ? `${base}&pid=${VIATOR_PID}` : base;
}
