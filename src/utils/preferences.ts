// Preference memory for Auto Day Planner personalization
// Tracks user likes/dislikes/swaps to improve future AI-generated plans

const STORAGE_KEY = 'nxstops_preferences';

export interface UserPreferences {
  likedCategories: Record<string, number>;
  dislikedCategories: Record<string, number>;
  swappedAwayIds: string[];
  likedPriceLevels: Record<string, number>;
  tripCount: number;
  lastMood: string | null;
}

function load(): UserPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    likedCategories: {},
    dislikedCategories: {},
    swappedAwayIds: [],
    likedPriceLevels: {},
    tripCount: 0,
    lastMood: null,
  };
}

function save(prefs: UserPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch { /* ignore */ }
}

export function getPreferences(): UserPreferences {
  return load();
}

export function recordAddedToTrip(category: string, priceLevel: number): void {
  const prefs = load();
  prefs.likedCategories[category] = (prefs.likedCategories[category] || 0) + 1;
  const plKey = String(priceLevel);
  prefs.likedPriceLevels[plKey] = (prefs.likedPriceLevels[plKey] || 0) + 1;
  save(prefs);
}

export function recordSwapPreference(oldCategory: string, oldPlaceId: string): void {
  const prefs = load();
  prefs.dislikedCategories[oldCategory] = (prefs.dislikedCategories[oldCategory] || 0) + 1;
  prefs.swappedAwayIds.push(oldPlaceId);
  if (prefs.swappedAwayIds.length > 50) prefs.swappedAwayIds = prefs.swappedAwayIds.slice(-50);
  save(prefs);
}

export function recordTripGenerated(mood: string): void {
  const prefs = load();
  prefs.tripCount++;
  prefs.lastMood = mood;
  save(prefs);
}

/** Score a place 0-100 based on learned preferences. Higher = better match. */
export function scorePlaceByPreference(category: string, priceLevel: number, rating: number): number {
  const prefs = load();
  if (prefs.tripCount === 0 && Object.keys(prefs.likedCategories).length === 0) return -1; // No data yet

  let score = 50; // baseline

  // Category affinity: +20 for top liked, +10 for liked, -15 for disliked
  const likedRank = Object.entries(prefs.likedCategories)
    .sort((a, b) => b[1] - a[1])
    .findIndex(([cat]) => cat === category);
  if (likedRank === 0) score += 20;
  else if (likedRank > 0 && likedRank <= 3) score += 12;
  else if (likedRank > 3) score += 5;

  const dislikedCount = prefs.dislikedCategories[category] || 0;
  if (dislikedCount >= 3) score -= 20;
  else if (dislikedCount >= 1) score -= 10;

  // Price alignment: +10 if matches preferred price level
  const plKey = String(priceLevel);
  const plEntries = Object.entries(prefs.likedPriceLevels).sort((a, b) => b[1] - a[1]);
  if (plEntries.length > 0 && plEntries[0][0] === plKey) score += 10;
  else if (plEntries.some(([k]) => k === plKey)) score += 5;

  // Rating bonus
  if (rating >= 4.5) score += 8;
  else if (rating >= 4.0) score += 4;

  // Swapped-away penalty
  // (placeId check is done in the caller)

  return Math.max(0, Math.min(100, score));
}

export function getPreferenceSummary(): string {
  const prefs = load();
  const parts: string[] = [];

  const likedEntries = Object.entries(prefs.likedCategories).sort((a, b) => b[1] - a[1]);
  if (likedEntries.length > 0) {
    const top = likedEntries.slice(0, 5).map(([cat]) => cat.replace(/_/g, ' '));
    parts.push(`Loves: ${top.join(', ')}`);
  }

  const dislikedEntries = Object.entries(prefs.dislikedCategories).sort((a, b) => b[1] - a[1]);
  if (dislikedEntries.length > 0) {
    const top = dislikedEntries.slice(0, 3).map(([cat]) => cat.replace(/_/g, ' '));
    parts.push(`Less interested in: ${top.join(', ')}`);
  }

  const plEntries = Object.entries(prefs.likedPriceLevels).sort((a, b) => b[1] - a[1]);
  if (plEntries.length > 0) {
    const topPL = parseInt(plEntries[0][0]);
    const plLabels: Record<number, string> = { 0: 'free spots', 1: 'budget', 2: 'moderate', 3: 'upscale', 4: 'luxury' };
    parts.push(`Price preference: ${plLabels[topPL] || 'varied'}`);
  }

  return parts.length > 0 ? parts.join('. ') + '.' : '';
}
