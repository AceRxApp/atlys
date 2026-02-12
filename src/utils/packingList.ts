import type { Stop } from '../types';
import type { TravelGroup } from '../types';
import {
  ESSENTIALS,
  CATEGORY_PACK_ITEMS,
  WEATHER_PACK_RULES,
  GROUP_PACK_ITEMS,
} from '../data/packingItems';
import type { PackingItem } from '../data/packingItems';

interface ForecastDay {
  high: number;
  low: number;
  precipChance: number;
  code: number;
}

/**
 * Generate a deduplicated packing list based on trip stops, weather, and travel group.
 */
export function generatePackingList(
  stops: Stop[],
  forecast: ForecastDay[],
  travelGroup: TravelGroup | null,
): PackingItem[] {
  const seen = new Set<string>();
  const items: PackingItem[] = [];

  const add = (item: PackingItem) => {
    if (seen.has(item.label)) return;
    seen.add(item.label);
    items.push(item);
  };

  // 1. Essentials
  for (const item of ESSENTIALS) add(item);

  // 2. Weather-based items (check all forecast days)
  for (const day of forecast) {
    for (const rule of WEATHER_PACK_RULES) {
      if (rule.condition(day)) {
        for (const item of rule.items) add(item);
      }
    }
  }

  // 3. Activity-based items from stop categories
  for (const stop of stops) {
    const category = stop.type === 'place' ? stop.place?.category : null;
    if (category && CATEGORY_PACK_ITEMS[category]) {
      for (const item of CATEGORY_PACK_ITEMS[category]) add(item);
    }
  }

  // 4. Travel group items
  if (travelGroup && GROUP_PACK_ITEMS[travelGroup]) {
    for (const item of GROUP_PACK_ITEMS[travelGroup]!) add(item);
  }

  return items;
}
