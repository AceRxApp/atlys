import { useState, useEffect, useMemo } from 'react';
import type { TripHistoryEntry, StopCheckIn, Achievement } from '../types';

// ============================================================================
// ACHIEVEMENT DEFINITIONS
// ============================================================================

interface AchievementDef {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  category: string | null;
  count: number;
  citiesCount?: boolean;
  singleCity?: boolean;
}

const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: 'first_steps', emoji: '\u{1F463}', title: 'First Steps', desc: 'Your first check-in', category: null, count: 1 },
  { id: 'coffee_explorer', emoji: '\u2615', title: 'Coffee Explorer', desc: 'Visit 5+ cafes', category: 'cafe', count: 5 },
  { id: 'museum_hunter', emoji: '\u{1F3A8}', title: 'Museum Hunter', desc: 'Visit 3+ museums', category: 'museum', count: 3 },
  { id: 'nightlife_discoverer', emoji: '\u{1F378}', title: 'Nightlife Discoverer', desc: 'Visit 3+ bars', category: 'bar', count: 3 },
  { id: 'foodie', emoji: '\u{1F37D}\u{FE0F}', title: 'Foodie', desc: 'Visit 10+ restaurants', category: 'restaurant', count: 10 },
  { id: 'park_ranger', emoji: '\u{1F333}', title: 'Park Ranger', desc: 'Visit 5+ parks', category: 'park', count: 5 },
  { id: 'world_traveler', emoji: '\u{1F30D}', title: 'World Traveler', desc: 'Explore 3+ cities', category: null, count: 3, citiesCount: true },
  { id: 'city_master', emoji: '\u{1F3C6}', title: 'City Master', desc: '20+ places in one city', category: null, count: 20, singleCity: true },
];

// ============================================================================
// CATEGORY MAPPING
// ============================================================================

const CATEGORY_MAP: Record<string, string> = {
  // Cafe / Coffee
  'Cafe': 'cafe',
  'Coffee Shop': 'cafe',
  'Coffee': 'cafe',
  'Bakery': 'cafe',
  'Tea House': 'cafe',
  'cafe': 'cafe',
  'coffee_shop': 'cafe',
  'bakery': 'cafe',

  // Restaurant
  'Restaurant': 'restaurant',
  'Brunch Restaurant': 'restaurant',
  'Breakfast Restaurant': 'restaurant',
  'Seafood Restaurant': 'restaurant',
  'Steak House': 'restaurant',
  'Pizza Restaurant': 'restaurant',
  'Sushi Restaurant': 'restaurant',
  'Sandwich Shop': 'restaurant',
  'Ice Cream Shop': 'restaurant',
  'restaurant': 'restaurant',
  'brunch_restaurant': 'restaurant',
  'breakfast_restaurant': 'restaurant',
  'seafood_restaurant': 'restaurant',
  'steak_house': 'restaurant',
  'pizza_restaurant': 'restaurant',
  'sushi_restaurant': 'restaurant',
  'sandwich_shop': 'restaurant',
  'ice_cream_shop': 'restaurant',
  'meal_takeaway': 'restaurant',

  // Museum
  'Museum': 'museum',
  'Art Gallery': 'museum',
  'museum': 'museum',
  'art_gallery': 'museum',
  'Historical Landmark': 'museum',
  'historical_landmark': 'museum',

  // Bar / Nightlife
  'Bar': 'bar',
  'Night Club': 'bar',
  'Wine Bar': 'bar',
  'Karaoke': 'bar',
  'Comedy Club': 'bar',
  'Casino': 'bar',
  'bar': 'bar',
  'night_club': 'bar',
  'wine_bar': 'bar',
  'karaoke': 'bar',
  'comedy_club': 'bar',
  'casino': 'bar',

  // Park / Nature
  'Park': 'park',
  'Garden': 'park',
  'Hiking Area': 'park',
  'National Park': 'park',
  'Beach': 'park',
  'Marina': 'park',
  'park': 'park',
  'garden': 'park',
  'hiking_area': 'park',
  'national_park': 'park',
  'beach': 'park',
  'marina': 'park',
  'zoo': 'park',
  'aquarium': 'park',
};

function normalizeCategory(categoryDisplay: string | undefined): string {
  if (!categoryDisplay) return 'other';
  return CATEGORY_MAP[categoryDisplay] || CATEGORY_MAP[categoryDisplay.toLowerCase()] || 'other';
}

// ============================================================================
// HOOK
// ============================================================================

const ACHIEVEMENTS_STORAGE_KEY = 'nxstops_achievements';

export function useCityProgress(
  tripHistory: TripHistoryEntry[],
  checkIns: Record<string, StopCheckIn>,
) {
  // Load previously unlocked achievements from localStorage
  const [storedAchievements, setStoredAchievements] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Aggregate all unique visited places from trip history
  const { categoryProgress, totalPlacesVisited, totalCitiesExplored, placesByCity } = useMemo(() => {
    const seenPlaceIds = new Set<string>();
    const categories: Record<string, number> = {};
    const cities = new Set<string>();
    const cityPlaceCounts: Record<string, number> = {};

    for (const trip of tripHistory) {
      const cityName = trip.city;
      cities.add(cityName);

      for (const stop of trip.stops) {
        // Deduplicate by placeId when available
        if (stop.placeId) {
          if (seenPlaceIds.has(stop.placeId)) continue;
          seenPlaceIds.add(stop.placeId);
        }

        const cat = normalizeCategory(stop.category);
        categories[cat] = (categories[cat] || 0) + 1;

        // Count per city for city_master achievement
        cityPlaceCounts[cityName] = (cityPlaceCounts[cityName] || 0) + 1;
      }
    }

    // Also count check-ins that might not be in trip history yet
    const checkInCount = Object.keys(checkIns).length;
    const totalPlaces = Math.max(seenPlaceIds.size, checkInCount);

    return {
      categoryProgress: categories,
      totalPlacesVisited: totalPlaces,
      totalCitiesExplored: cities.size,
      placesByCity: cityPlaceCounts,
    };
  }, [tripHistory, checkIns]);

  // Compute achievements
  const achievements: Achievement[] = useMemo(() => {
    const totalPlaces = totalPlacesVisited;
    const checkInCount = Object.keys(checkIns).length;
    const maxSingleCity = Object.values(placesByCity).reduce((max, c) => Math.max(max, c), 0);

    return ACHIEVEMENT_DEFS.map(def => {
      let progress = 0;

      if (def.citiesCount) {
        // Count unique cities
        progress = totalCitiesExplored;
      } else if (def.singleCity) {
        // Max places in a single city
        progress = maxSingleCity;
      } else if (def.category) {
        // Category-specific count
        progress = categoryProgress[def.category] || 0;
      } else {
        // General count (first_steps uses total places or check-ins)
        progress = Math.max(totalPlaces, checkInCount);
      }

      const isUnlocked = progress >= def.count;
      const previouslyUnlocked = storedAchievements[def.id] || null;

      return {
        id: def.id,
        emoji: def.emoji,
        title: def.title,
        description: def.desc,
        unlockedAt: isUnlocked
          ? (previouslyUnlocked || new Date().toISOString())
          : null,
        progress: Math.min(progress, def.count),
        requirement: def.count,
      };
    });
  }, [categoryProgress, totalPlacesVisited, totalCitiesExplored, placesByCity, checkIns, storedAchievements]);

  // Persist newly unlocked achievements
  useEffect(() => {
    let changed = false;
    const updated = { ...storedAchievements };

    for (const achievement of achievements) {
      if (achievement.unlockedAt && !updated[achievement.id]) {
        updated[achievement.id] = achievement.unlockedAt;
        changed = true;
      }
    }

    if (changed) {
      setStoredAchievements(updated);
      try {
        localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(updated));
      } catch { /* storage full */ }
    }
  }, [achievements]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    categoryProgress,
    achievements,
    totalCitiesExplored,
    totalPlacesVisited,
  };
}
