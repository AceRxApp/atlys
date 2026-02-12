import type { TravelGroup } from '../types';

export interface PackingItem {
  label: string;
  category: 'essentials' | 'weather' | 'activities' | 'group' | 'comfort';
}

/** Always-included essentials */
export const ESSENTIALS: PackingItem[] = [
  { label: 'Phone charger', category: 'essentials' },
  { label: 'Wallet & ID', category: 'essentials' },
  { label: 'Medications', category: 'essentials' },
  { label: 'Comfortable shoes', category: 'essentials' },
  { label: 'Reusable water bottle', category: 'essentials' },
];

/** Place category → packing items */
export const CATEGORY_PACK_ITEMS: Record<string, PackingItem[]> = {
  restaurant: [
    { label: 'Dressy outfit', category: 'activities' },
  ],
  steak_house: [
    { label: 'Dressy outfit', category: 'activities' },
  ],
  seafood_restaurant: [
    { label: 'Dressy outfit', category: 'activities' },
  ],
  bar: [
    { label: 'Going-out outfit', category: 'activities' },
  ],
  night_club: [
    { label: 'Going-out outfit', category: 'activities' },
    { label: 'Earplugs', category: 'comfort' },
  ],
  spa: [
    { label: 'Swimsuit', category: 'activities' },
    { label: 'Flip flops', category: 'activities' },
  ],
  park: [
    { label: 'Sunscreen', category: 'activities' },
    { label: 'Hat', category: 'activities' },
  ],
  hiking_area: [
    { label: 'Hiking shoes', category: 'activities' },
    { label: 'Daypack', category: 'activities' },
    { label: 'Sunscreen', category: 'activities' },
  ],
  museum: [
    { label: 'Comfortable walking shoes', category: 'activities' },
  ],
  art_gallery: [
    { label: 'Comfortable walking shoes', category: 'activities' },
  ],
  tourist_attraction: [
    { label: 'Camera', category: 'activities' },
    { label: 'Comfortable walking shoes', category: 'activities' },
  ],
  amusement_park: [
    { label: 'Comfortable shoes', category: 'activities' },
    { label: 'Sunscreen', category: 'activities' },
    { label: 'Small backpack', category: 'activities' },
  ],
  aquarium: [
    { label: 'Camera', category: 'activities' },
  ],
  zoo: [
    { label: 'Sunscreen', category: 'activities' },
    { label: 'Comfortable walking shoes', category: 'activities' },
  ],
  beach: [
    { label: 'Swimsuit', category: 'activities' },
    { label: 'Towel', category: 'activities' },
    { label: 'Sunscreen', category: 'activities' },
    { label: 'Sunglasses', category: 'activities' },
  ],
  gym: [
    { label: 'Workout clothes', category: 'activities' },
    { label: 'Sneakers', category: 'activities' },
  ],
  bowling_alley: [
    { label: 'Socks', category: 'activities' },
  ],
  stadium: [
    { label: 'Team gear', category: 'activities' },
    { label: 'Sunscreen', category: 'activities' },
  ],
  campground: [
    { label: 'Tent & sleeping bag', category: 'activities' },
    { label: 'Flashlight', category: 'activities' },
    { label: 'Bug spray', category: 'activities' },
  ],
};

/** Weather conditions → packing items based on WMO codes and forecast data */
export const WEATHER_PACK_RULES: {
  condition: (forecast: { high: number; low: number; precipChance: number; code: number }) => boolean;
  items: PackingItem[];
}[] = [
  {
    condition: f => f.precipChance > 40 || [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(f.code),
    items: [
      { label: 'Umbrella', category: 'weather' },
      { label: 'Rain jacket', category: 'weather' },
    ],
  },
  {
    condition: f => f.low < 10,
    items: [
      { label: 'Warm layers', category: 'weather' },
      { label: 'Jacket', category: 'weather' },
    ],
  },
  {
    condition: f => f.low < 0,
    items: [
      { label: 'Gloves', category: 'weather' },
      { label: 'Scarf', category: 'weather' },
      { label: 'Warm hat', category: 'weather' },
    ],
  },
  {
    condition: f => f.high > 30,
    items: [
      { label: 'Sunscreen', category: 'weather' },
      { label: 'Sunglasses', category: 'weather' },
      { label: 'Light breathable clothes', category: 'weather' },
    ],
  },
  {
    condition: f => f.high > 25 && f.high <= 30,
    items: [
      { label: 'Sunscreen', category: 'weather' },
      { label: 'Sunglasses', category: 'weather' },
    ],
  },
  {
    condition: f => [71, 73, 75, 77, 85, 86].includes(f.code),
    items: [
      { label: 'Waterproof boots', category: 'weather' },
      { label: 'Heavy coat', category: 'weather' },
    ],
  },
];

/** Travel group → specific packing items */
export const GROUP_PACK_ITEMS: Partial<Record<TravelGroup, PackingItem[]>> = {
  family: [
    { label: 'Kid snacks', category: 'group' },
    { label: 'Baby wipes', category: 'group' },
    { label: 'First aid kit', category: 'group' },
  ],
  solo: [
    { label: 'Portable battery pack', category: 'group' },
    { label: 'Copy of ID/passport', category: 'group' },
  ],
  girls: [
    { label: 'Going-out outfits', category: 'group' },
    { label: 'Hair tools', category: 'group' },
  ],
  bachelorette: [
    { label: 'Going-out outfits', category: 'group' },
    { label: 'Matching accessories', category: 'group' },
  ],
  boys: [
    { label: 'Going-out outfit', category: 'group' },
  ],
  couple: [
    { label: 'Nice dinner outfit', category: 'group' },
  ],
};
