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
// Region-aware restaurant reservation links
// --------------------------------------------------------------------------

// Country → reservation platform mapping
const REGION_PLATFORMS: Record<string, { name: string; buildUrl: (place: string, city: string) => string }> = {
  // North America — OpenTable + Resy
  US: { name: 'OpenTable', buildUrl: (place, city) => {
    const base = `https://www.opentable.com/s?term=${encodeURIComponent(place)}&covers=2&queryUnderstandingType=location&rawQuery=${encodeURIComponent(place + ' ' + city)}`;
    return OPENTABLE_REF ? `${base}&ref=${OPENTABLE_REF}` : base;
  }},
  CA: { name: 'OpenTable', buildUrl: (place, city) => {
    const base = `https://www.opentable.com/s?term=${encodeURIComponent(place)}&covers=2&rawQuery=${encodeURIComponent(place + ' ' + city)}`;
    return OPENTABLE_REF ? `${base}&ref=${OPENTABLE_REF}` : base;
  }},
  MX: { name: 'OpenTable', buildUrl: (place, city) => {
    const base = `https://www.opentable.com/s?term=${encodeURIComponent(place)}&covers=2&rawQuery=${encodeURIComponent(place + ' ' + city)}`;
    return OPENTABLE_REF ? `${base}&ref=${OPENTABLE_REF}` : base;
  }},
  // Europe — TheFork (owned by TripAdvisor, covers 22+ countries)
  FR: { name: 'TheFork', buildUrl: (place, city) => `https://www.thefork.com/search?queryText=${encodeURIComponent(place + ' ' + city)}` },
  ES: { name: 'TheFork', buildUrl: (place, city) => `https://www.thefork.es/search?queryText=${encodeURIComponent(place + ' ' + city)}` },
  IT: { name: 'TheFork', buildUrl: (place, city) => `https://www.thefork.it/search?queryText=${encodeURIComponent(place + ' ' + city)}` },
  DE: { name: 'TheFork', buildUrl: (place, city) => `https://www.thefork.de/search?queryText=${encodeURIComponent(place + ' ' + city)}` },
  NL: { name: 'TheFork', buildUrl: (place, city) => `https://www.thefork.nl/search?queryText=${encodeURIComponent(place + ' ' + city)}` },
  BE: { name: 'TheFork', buildUrl: (place, city) => `https://www.thefork.be/search?queryText=${encodeURIComponent(place + ' ' + city)}` },
  PT: { name: 'TheFork', buildUrl: (place, city) => `https://www.thefork.pt/search?queryText=${encodeURIComponent(place + ' ' + city)}` },
  CH: { name: 'TheFork', buildUrl: (place, city) => `https://www.thefork.ch/search?queryText=${encodeURIComponent(place + ' ' + city)}` },
  AT: { name: 'TheFork', buildUrl: (place, city) => `https://www.thefork.at/search?queryText=${encodeURIComponent(place + ' ' + city)}` },
  SE: { name: 'TheFork', buildUrl: (place, city) => `https://www.thefork.se/search?queryText=${encodeURIComponent(place + ' ' + city)}` },
  DK: { name: 'TheFork', buildUrl: (place, city) => `https://www.thefork.dk/search?queryText=${encodeURIComponent(place + ' ' + city)}` },
  // UK — OpenTable UK
  GB: { name: 'OpenTable', buildUrl: (place, city) => {
    const base = `https://www.opentable.co.uk/s?term=${encodeURIComponent(place)}&covers=2&rawQuery=${encodeURIComponent(place + ' ' + city)}`;
    return OPENTABLE_REF ? `${base}&ref=${OPENTABLE_REF}` : base;
  }},
  IE: { name: 'OpenTable', buildUrl: (place, city) => {
    const base = `https://www.opentable.co.uk/s?term=${encodeURIComponent(place)}&covers=2&rawQuery=${encodeURIComponent(place + ' ' + city)}`;
    return OPENTABLE_REF ? `${base}&ref=${OPENTABLE_REF}` : base;
  }},
  // Australia + NZ — OpenTable AU
  AU: { name: 'OpenTable', buildUrl: (place, city) => {
    const base = `https://www.opentable.com.au/s?term=${encodeURIComponent(place)}&covers=2&rawQuery=${encodeURIComponent(place + ' ' + city)}`;
    return OPENTABLE_REF ? `${base}&ref=${OPENTABLE_REF}` : base;
  }},
  NZ: { name: 'OpenTable', buildUrl: (place, city) => {
    const base = `https://www.opentable.com.au/s?term=${encodeURIComponent(place)}&covers=2&rawQuery=${encodeURIComponent(place + ' ' + city)}`;
    return OPENTABLE_REF ? `${base}&ref=${OPENTABLE_REF}` : base;
  }},
  // Japan — Tabelog
  JP: { name: 'Tabelog', buildUrl: (place, city) => `https://tabelog.com/en/rstLst/?vs=1&sa=&sk=${encodeURIComponent(place + ' ' + city)}` },
  // SE Asia — Chope
  SG: { name: 'Chope', buildUrl: (place, city) => `https://www.chope.co/singapore-restaurants/search?keyword=${encodeURIComponent(place)}` },
  TH: { name: 'Chope', buildUrl: (place, city) => `https://www.chope.co/bangkok-restaurants/search?keyword=${encodeURIComponent(place)}` },
  HK: { name: 'Chope', buildUrl: (place, city) => `https://www.chope.co/hong-kong-restaurants/search?keyword=${encodeURIComponent(place)}` },
  ID: { name: 'Chope', buildUrl: (place, city) => `https://www.chope.co/jakarta-restaurants/search?keyword=${encodeURIComponent(place)}` },
  MY: { name: 'Chope', buildUrl: (place, city) => `https://www.chope.co/kuala-lumpur-restaurants/search?keyword=${encodeURIComponent(place)}` },
  PH: { name: 'Chope', buildUrl: (place, city) => `https://www.chope.co/manila-restaurants/search?keyword=${encodeURIComponent(place)}` },
  // South Korea — Catchtable
  KR: { name: 'Catchtable', buildUrl: (place) => `https://app.catchtable.co.kr/ct/search?keyword=${encodeURIComponent(place)}` },
  // India — Dineout
  IN: { name: 'Dineout', buildUrl: (place, city) => `https://www.dineout.co.in/search?q=${encodeURIComponent(place + ' ' + city)}` },
  // Middle East — OpenTable (limited) → Google Maps fallback
  AE: { name: 'Google Maps', buildUrl: (place, city) => `https://www.google.com/maps/search/${encodeURIComponent(place + ' ' + city + ' reservation')}` },
  SA: { name: 'Google Maps', buildUrl: (place, city) => `https://www.google.com/maps/search/${encodeURIComponent(place + ' ' + city + ' reservation')}` },
  QA: { name: 'Google Maps', buildUrl: (place, city) => `https://www.google.com/maps/search/${encodeURIComponent(place + ' ' + city + ' reservation')}` },
  // South America — Google Maps (no dominant platform)
  BR: { name: 'Google Maps', buildUrl: (place, city) => `https://www.google.com/maps/search/${encodeURIComponent(place + ' ' + city + ' reserva')}` },
  AR: { name: 'Google Maps', buildUrl: (place, city) => `https://www.google.com/maps/search/${encodeURIComponent(place + ' ' + city + ' reserva')}` },
  CO: { name: 'Google Maps', buildUrl: (place, city) => `https://www.google.com/maps/search/${encodeURIComponent(place + ' ' + city + ' reserva')}` },
  CL: { name: 'Google Maps', buildUrl: (place, city) => `https://www.google.com/maps/search/${encodeURIComponent(place + ' ' + city + ' reserva')}` },
  PE: { name: 'Google Maps', buildUrl: (place, city) => `https://www.google.com/maps/search/${encodeURIComponent(place + ' ' + city + ' reserva')}` },
  // Africa — Google Maps
  GH: { name: 'Google Maps', buildUrl: (place, city) => `https://www.google.com/maps/search/${encodeURIComponent(place + ' ' + city)}` },
  NG: { name: 'Google Maps', buildUrl: (place, city) => `https://www.google.com/maps/search/${encodeURIComponent(place + ' ' + city)}` },
  ZA: { name: 'Google Maps', buildUrl: (place, city) => `https://www.google.com/maps/search/${encodeURIComponent(place + ' ' + city)}` },
  KE: { name: 'Google Maps', buildUrl: (place, city) => `https://www.google.com/maps/search/${encodeURIComponent(place + ' ' + city)}` },
  MA: { name: 'Google Maps', buildUrl: (place, city) => `https://www.google.com/maps/search/${encodeURIComponent(place + ' ' + city)}` },
  EG: { name: 'Google Maps', buildUrl: (place, city) => `https://www.google.com/maps/search/${encodeURIComponent(place + ' ' + city)}` },
};

// Country name → ISO code for region lookup
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  'united states': 'US', 'usa': 'US', 'canada': 'CA', 'mexico': 'MX',
  'france': 'FR', 'spain': 'ES', 'italy': 'IT', 'germany': 'DE',
  'netherlands': 'NL', 'belgium': 'BE', 'portugal': 'PT', 'switzerland': 'CH',
  'austria': 'AT', 'sweden': 'SE', 'denmark': 'DK',
  'united kingdom': 'GB', 'uk': 'GB', 'england': 'GB', 'ireland': 'IE',
  'australia': 'AU', 'new zealand': 'NZ',
  'japan': 'JP', 'south korea': 'KR', 'india': 'IN',
  'singapore': 'SG', 'thailand': 'TH', 'hong kong': 'HK',
  'indonesia': 'ID', 'malaysia': 'MY', 'philippines': 'PH',
  'uae': 'AE', 'united arab emirates': 'AE', 'saudi arabia': 'SA', 'qatar': 'QA',
  'brazil': 'BR', 'argentina': 'AR', 'colombia': 'CO', 'chile': 'CL', 'peru': 'PE',
  'ghana': 'GH', 'nigeria': 'NG', 'south africa': 'ZA', 'kenya': 'KE',
  'morocco': 'MA', 'egypt': 'EG',
  'china': 'CN', 'taiwan': 'TW', 'vietnam': 'VN',
  'turkey': 'TR', 'greece': 'GR', 'czech republic': 'CZ', 'czechia': 'CZ',
  'poland': 'PL', 'hungary': 'HU', 'croatia': 'HR', 'norway': 'NO',
};

function resolveCountryCode(countryNameOrCode?: string): string | null {
  if (!countryNameOrCode) return null;
  const upper = countryNameOrCode.toUpperCase();
  if (upper.length === 2) return upper;
  return COUNTRY_NAME_TO_CODE[countryNameOrCode.toLowerCase()] || null;
}

// Set from App.tsx when city changes
let _countryCode: string | null = null;
export function setBookingCountry(countryNameOrCode: string) {
  _countryCode = resolveCountryCode(countryNameOrCode);
}

export function getRestaurantBookingUrl(
  placeName: string,
  cityName?: string,
  countryCode?: string,
): { url: string; label: string; service: string } {
  const code = resolveCountryCode(countryCode) || _countryCode;
  const platform = code ? REGION_PLATFORMS[code] : null;

  if (platform) {
    return {
      url: platform.buildUrl(placeName, cityName || ''),
      label: platform.name === 'Google Maps' ? 'Find Restaurant' : 'Reserve Table',
      service: platform.name,
    };
  }

  // Fallback: Google Maps search (works globally)
  const query = encodeURIComponent(`${placeName}${cityName ? ' ' + cityName : ''}`);
  return { url: `https://www.google.com/maps/search/${query}`, label: 'Find Restaurant', service: 'Google Maps' };
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
