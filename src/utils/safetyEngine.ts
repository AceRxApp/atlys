// Safety Engine — Sunset Guardian, night risk scoring, safety tips

const NIGHTLIFE_SAFE = [
  'bar', 'night_club', 'casino', 'movie_theater', 'performing_arts_theater',
  'bowling_alley', 'restaurant', 'steak_house', 'seafood_restaurant',
];

const WELL_LIT_TYPES = [
  'shopping_mall', 'restaurant', 'bar', 'movie_theater', 'casino',
  'performing_arts_theater', 'bowling_alley', 'hotel', 'night_club',
  'steak_house', 'seafood_restaurant', 'brunch_restaurant',
];

const OUTDOOR_TYPES = [
  'park', 'hiking_area', 'national_park', 'garden', 'beach',
  'campground', 'playground', 'zoo', 'tourist_attraction',
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
  else if (reviewCount < 10) score -= 10;

  // Open places are inherently safer (people around)
  if (openNow) score += 5;
  else score -= 10;

  if (score >= 70) {
    return { level: 'low', label: 'Safe at night', emoji: '\u{1F7E2}', tip: 'Well-lit, well-reviewed area' };
  }
  if (score >= 45) {
    return { level: 'moderate', label: 'Use caution', emoji: '\u{1F7E1}', tip: 'Stay aware of your surroundings' };
  }
  return { level: 'high', label: 'Not ideal at night', emoji: '\u{1F534}', tip: 'Consider visiting during daytime' };
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
