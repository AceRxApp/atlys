// Safety Engine — Sunset Guardian, night risk scoring, safety tips, place safety

const NIGHTLIFE_SAFE = [
  'bar', 'night_club', 'casino', 'movie_theater', 'performing_arts_theater',
  'bowling_alley', 'restaurant', 'steak_house', 'seafood_restaurant',
];

const WELL_LIT_TYPES = [
  'shopping_mall', 'restaurant', 'bar', 'movie_theater', 'casino',
  'performing_arts_theater', 'bowling_alley', 'hotel', 'night_club',
  'steak_house', 'seafood_restaurant', 'brunch_restaurant',
  'cafe', 'coffee_shop', 'bakery', 'ice_cream_shop',
];

const OUTDOOR_TYPES = [
  'park', 'hiking_area', 'national_park', 'garden', 'beach',
  'campground', 'playground', 'zoo', 'tourist_attraction',
];

const NIGHTLIFE_TYPES = [
  'bar', 'night_club', 'casino', 'wine_bar', 'event_venue', 'karaoke', 'comedy_club',
];

export type NightRisk = 'low' | 'moderate' | 'high';

export interface NightRiskResult {
  level: NightRisk;
  label: string;
  emoji: string;
  tip: string;
}

/** Score a place's safety for nighttime visits (0-100, higher = safer). */
export function getNightRisk(
  category: string,
  rating: number,
  reviewCount: number,
  openNow: boolean,
): NightRiskResult {
  let score = 50;

  // Well-lit indoor venues are safer at night
  if (WELL_LIT_TYPES.includes(category)) score += 25;
  else if (NIGHTLIFE_SAFE.includes(category)) score += 20;
  else if (OUTDOOR_TYPES.includes(category)) score -= 20;

  // High ratings + many reviews = well-trafficked
  if (rating >= 4.3 && reviewCount >= 200) score += 15;
  else if (rating >= 4.0 && reviewCount >= 50) score += 8;
  else if (reviewCount < 10) score -= 15;

  // Open places are inherently safer (people around)
  if (openNow) score += 5;
  else score -= 10;

  // Low-rated nightlife = bigger concern
  if (NIGHTLIFE_TYPES.includes(category) && rating > 0 && rating < 3.5) score -= 15;

  if (score >= 70) {
    return { level: 'low', label: 'Safe at night', emoji: '\u{1F7E2}', tip: 'Well-lit, well-reviewed area' };
  }
  if (score >= 45) {
    return { level: 'moderate', label: 'Use caution at night', emoji: '\u{1F7E1}', tip: 'Stay aware of surroundings, travel with friends' };
  }
  return { level: 'high', label: 'Not recommended at night', emoji: '\u{1F534}', tip: 'Visit during daytime or go with a group' };
}

// ============================================================================
// OVERALL PLACE SAFETY
// ============================================================================

export type SafetyLevel = 'safe' | 'caution' | 'warning';

export interface SafetyWarning {
  level: SafetyLevel;
  label: string;
  emoji: string;
  message: string;
}

/** Get overall safety assessment for a place based on available signals. */
export function getPlaceSafety(
  category: string,
  rating: number,
  reviewCount: number,
  openNow: boolean,
  isNight: boolean,
): SafetyWarning | null {
  // Nightlife venue with very low rating — warn users
  if (NIGHTLIFE_TYPES.includes(category) && rating > 0 && rating < 3.0) {
    return {
      level: 'warning',
      label: 'Low ratings',
      emoji: '\u{26A0}\u{FE0F}',
      message: 'This venue has low ratings. Check recent reviews before visiting.',
    };
  }

  // Nightlife with very few reviews — could be sketchy
  if (NIGHTLIFE_TYPES.includes(category) && reviewCount < 10 && rating < 4.0) {
    return {
      level: 'caution',
      label: 'Few reviews',
      emoji: '\u{1F7E1}',
      message: 'Very few reviews. Ask locals or check social media before visiting.',
    };
  }

  // Outdoor spots at night
  if (isNight && OUTDOOR_TYPES.includes(category) && !openNow) {
    return {
      level: 'warning',
      label: 'Closed after dark',
      emoji: '\u{1F534}',
      message: 'This outdoor spot is closed. Visit during daylight hours.',
    };
  }

  if (isNight && OUTDOOR_TYPES.includes(category)) {
    return {
      level: 'caution',
      label: 'Outdoor at night',
      emoji: '\u{1F7E1}',
      message: 'Outdoor areas may be poorly lit. Go with others and stay on main paths.',
    };
  }

  // Low-rated place in general
  if (rating > 0 && rating < 3.0 && reviewCount >= 20) {
    return {
      level: 'caution',
      label: 'Below average',
      emoji: '\u{1F7E1}',
      message: 'Below-average ratings. Check recent reviews for current conditions.',
    };
  }

  // Night + not well-reviewed
  if (isNight && !WELL_LIT_TYPES.includes(category) && reviewCount < 30) {
    return {
      level: 'caution',
      label: 'Limited info',
      emoji: '\u{1F7E1}',
      message: 'Few reviews for this area at night. Share your location with someone.',
    };
  }

  return null;
}

export interface SunsetGuardianState {
  active: boolean;
  phase: 'golden_hour' | 'approaching_sunset' | 'past_sunset' | 'night' | null;
  message: string;
  emoji: string;
  minutesToSunset: number | null;
}

/** Check sunset status and return guardian state. */
export function getSunsetGuardian(sunsetIso?: string): SunsetGuardianState {
  if (!sunsetIso) return { active: false, phase: null, message: '', emoji: '', minutesToSunset: null };

  const now = Date.now();
  const sunset = new Date(sunsetIso).getTime();
  const diffMin = Math.round((sunset - now) / 60000);

  // Golden hour: 60-90 min before sunset
  if (diffMin > 60 && diffMin <= 90) {
    return {
      active: true,
      phase: 'golden_hour',
      message: `Golden hour! ${diffMin} min until sunset — great time for photos`,
      emoji: '\u{1F305}',
      minutesToSunset: diffMin,
    };
  }

  // Approaching: 15-60 min before sunset
  if (diffMin > 15 && diffMin <= 60) {
    return {
      active: true,
      phase: 'approaching_sunset',
      message: `Sunset in ${diffMin} min — wrap up outdoor activities soon`,
      emoji: '\u{1F319}',
      minutesToSunset: diffMin,
    };
  }

  // Just past sunset: 0-30 min after
  if (diffMin >= -30 && diffMin <= 15) {
    return {
      active: true,
      phase: 'past_sunset',
      message: 'Sun is setting — switch to well-lit spots',
      emoji: '\u{1F303}',
      minutesToSunset: Math.max(0, diffMin),
    };
  }

  // Night mode: 30+ min after sunset
  if (diffMin < -30) {
    const hour = new Date().getHours();
    if (hour >= 18 || hour <= 5) {
      return {
        active: true,
        phase: 'night',
        message: 'Night mode — stick to well-reviewed, well-lit areas',
        emoji: '\u{1F30C}',
        minutesToSunset: null,
      };
    }
  }

  return { active: false, phase: null, message: '', emoji: '', minutesToSunset: null };
}

/** Check if it's currently "night" (between sunset and sunrise, or late hours). */
export function isNightTime(sunsetIso?: string): boolean {
  const hour = new Date().getHours();
  if (hour >= 21 || hour <= 5) return true;
  if (!sunsetIso) return false;
  const now = Date.now();
  const sunset = new Date(sunsetIso).getTime();
  return now > sunset;
}

// ============================================================================
// HIGH-RISK REGION ALERTS — always-on safety for dangerous areas
// ============================================================================

export type RiskLevel = 'extreme' | 'high' | 'elevated';

export interface RegionSafetyAlert {
  level: RiskLevel;
  emoji: string;
  label: string;
  message: string;
  tips: string[];
}

/** Countries/regions with persistent safety concerns (cartel, conflict, high violence). */
const HIGH_RISK_REGIONS: Record<string, { level: RiskLevel; reason: string }> = {
  // Active conflict zones
  'Afghanistan': { level: 'extreme', reason: 'Active conflict zone' },
  'Syria': { level: 'extreme', reason: 'Active conflict zone' },
  'Yemen': { level: 'extreme', reason: 'Active conflict zone' },
  'Somalia': { level: 'extreme', reason: 'Active conflict and terrorism' },
  'South Sudan': { level: 'extreme', reason: 'Active conflict zone' },
  'Sudan': { level: 'extreme', reason: 'Active conflict zone' },
  'Libya': { level: 'extreme', reason: 'Ongoing instability and armed conflict' },
  'Myanmar': { level: 'extreme', reason: 'Military conflict and civil unrest' },
  'Ukraine': { level: 'extreme', reason: 'Active conflict zone' },

  // Cartel & gang violence
  'Mexico': { level: 'high', reason: 'Cartel activity and regional violence' },
  'Honduras': { level: 'high', reason: 'Gang violence and high crime' },
  'El Salvador': { level: 'high', reason: 'Gang violence' },
  'Guatemala': { level: 'high', reason: 'Gang violence and high crime' },
  'Venezuela': { level: 'high', reason: 'Political instability and violent crime' },
  'Haiti': { level: 'high', reason: 'Gang violence and kidnapping risk' },

  // Very high crime
  'Colombia': { level: 'elevated', reason: 'Regional crime and rural conflict areas' },
  'Brazil': { level: 'elevated', reason: 'High crime in urban areas' },
  'South Africa': { level: 'elevated', reason: 'Very high crime rates' },
  'Nigeria': { level: 'elevated', reason: 'Terrorism and kidnapping in some regions' },
  'DRC': { level: 'high', reason: 'Conflict and instability' },
  'Central African Republic': { level: 'high', reason: 'Armed conflict' },
  'Iraq': { level: 'high', reason: 'Ongoing instability' },
  'Pakistan': { level: 'elevated', reason: 'Terrorism risk in some areas' },
  'Papua New Guinea': { level: 'elevated', reason: 'High crime and tribal violence' },
  'Jamaica': { level: 'elevated', reason: 'High violent crime in some areas' },
  'Trinidad and Tobago': { level: 'elevated', reason: 'High crime rates' },
  'Kenya': { level: 'elevated', reason: 'Terrorism risk in some regions' },
  'Mozambique': { level: 'elevated', reason: 'Insurgency in northern regions' },
  'Mali': { level: 'high', reason: 'Terrorism and armed conflict' },
  'Burkina Faso': { level: 'high', reason: 'Terrorism and armed conflict' },
  'Niger': { level: 'high', reason: 'Terrorism risk' },
  'Chad': { level: 'high', reason: 'Terrorism and instability' },
  'Cameroon': { level: 'elevated', reason: 'Regional conflict in some areas' },
  'Ethiopia': { level: 'elevated', reason: 'Regional conflict' },
  'Lebanon': { level: 'high', reason: 'Political instability and conflict' },
  'Philippines': { level: 'elevated', reason: 'Terrorism risk in southern regions' },
};

const RISK_TIPS: Record<RiskLevel, string[]> = {
  extreme: [
    'Avoid all non-essential travel to this region',
    'Register with your embassy before arrival',
    'Keep emergency contacts accessible at all times',
    'Share your real-time location with family',
    'Avoid traveling after dark completely',
    'Stay in well-secured, vetted accommodations only',
  ],
  high: [
    'Stay in well-known tourist areas and vetted hotels',
    'Avoid traveling alone, especially after dark',
    'Do not display expensive jewelry, phones, or cameras',
    'Use only vetted, pre-booked transportation',
    'Share your live location with someone you trust',
    'Keep copies of your passport and documents',
    'Avoid ATMs on the street — use bank lobbies',
  ],
  elevated: [
    'Stay aware of your surroundings at all times',
    'Avoid poorly lit or isolated areas after dark',
    'Use ride-hailing apps instead of street taxis',
    'Keep valuables out of sight',
    'Research neighborhoods before visiting',
    'Have your hotel address saved offline',
  ],
};

/** Get a persistent safety alert for a country, if it's a high-risk region. */
export function getRegionSafetyAlert(country?: string): RegionSafetyAlert | null {
  if (!country) return null;
  const risk = HIGH_RISK_REGIONS[country];
  if (!risk) return null;

  const labels: Record<RiskLevel, string> = {
    extreme: 'Extreme Risk',
    high: 'High Risk',
    elevated: 'Elevated Risk',
  };

  const emojis: Record<RiskLevel, string> = {
    extreme: '\u{1F6A8}',
    high: '\u{26A0}\u{FE0F}',
    elevated: '\u{1F6E1}\u{FE0F}',
  };

  const messages: Record<RiskLevel, string> = {
    extreme: `${risk.reason}. Exercise extreme caution at all times.`,
    high: `${risk.reason}. Stay alert and take safety precautions.`,
    elevated: `${risk.reason}. Stay aware and follow safety tips.`,
  };

  return {
    level: risk.level,
    emoji: emojis[risk.level],
    label: labels[risk.level],
    message: messages[risk.level],
    tips: RISK_TIPS[risk.level],
  };
}

/** Get contextual safety tips for the current time/conditions. */
export function getNightSafetyTips(isNight: boolean, isRaining: boolean): string[] {
  const tips: string[] = [];
  if (isNight) {
    tips.push('Share your live location with someone you trust');
    tips.push('Stick to well-lit, populated streets');
    tips.push('Keep your phone charged');
    tips.push('Have your accommodation address saved offline');
  }
  if (isRaining) {
    tips.push('Watch for slippery surfaces');
    tips.push('Seek covered walkways when possible');
  }
  return tips;
}
