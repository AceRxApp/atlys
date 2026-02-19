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

/** City-specific packing items — things you need for specific destinations */
export const CITY_PACK_ITEMS: Record<string, PackingItem[]> = {
  // International destinations — passport & adapter
  london: [
    { label: 'Passport', category: 'essentials' },
    { label: 'UK power adapter (Type G)', category: 'essentials' },
    { label: 'Oyster card or contactless card', category: 'comfort' },
    { label: 'Compact umbrella', category: 'weather' },
    { label: 'Layered outfits', category: 'weather' },
  ],
  paris: [
    { label: 'Passport', category: 'essentials' },
    { label: 'EU power adapter (Type C/E)', category: 'essentials' },
    { label: 'Comfortable walking shoes (cobblestones)', category: 'activities' },
    { label: 'Chic dinner outfit', category: 'activities' },
    { label: 'Phrasebook or translation app', category: 'comfort' },
  ],
  tokyo: [
    { label: 'Passport', category: 'essentials' },
    { label: 'Japan power adapter (Type A/B)', category: 'essentials' },
    { label: 'Pocket Wi-Fi or SIM card', category: 'essentials' },
    { label: 'Cash (many places are cash-only)', category: 'essentials' },
    { label: 'Comfortable walking shoes', category: 'activities' },
    { label: 'Compact day bag', category: 'activities' },
  ],
  dubai: [
    { label: 'Passport', category: 'essentials' },
    { label: 'UAE power adapter (Type G)', category: 'essentials' },
    { label: 'Modest clothing for mosques & malls', category: 'activities' },
    { label: 'High SPF sunscreen', category: 'weather' },
    { label: 'Light breathable fabrics', category: 'weather' },
    { label: 'Swimsuit for beach & pool', category: 'activities' },
  ],
  barcelona: [
    { label: 'Passport', category: 'essentials' },
    { label: 'EU power adapter (Type C/F)', category: 'essentials' },
    { label: 'Comfortable walking shoes', category: 'activities' },
    { label: 'Swimsuit', category: 'activities' },
    { label: 'Anti-theft crossbody bag', category: 'comfort' },
  ],
  amsterdam: [
    { label: 'Passport', category: 'essentials' },
    { label: 'EU power adapter (Type C/F)', category: 'essentials' },
    { label: 'Rain jacket', category: 'weather' },
    { label: 'Comfortable walking shoes', category: 'activities' },
    { label: 'Layers for changing weather', category: 'weather' },
  ],
  accra: [
    { label: 'Passport', category: 'essentials' },
    { label: 'Ghana power adapter (Type D/G)', category: 'essentials' },
    { label: 'Mosquito repellent', category: 'essentials' },
    { label: 'Yellow fever vaccination card', category: 'essentials' },
    { label: 'Light breathable clothes', category: 'weather' },
    { label: 'Cash (cedis)', category: 'essentials' },
  ],
  lagos: [
    { label: 'Passport', category: 'essentials' },
    { label: 'Nigeria power adapter (Type G)', category: 'essentials' },
    { label: 'Mosquito repellent', category: 'essentials' },
    { label: 'Light breathable clothes', category: 'weather' },
    { label: 'Cash (naira)', category: 'essentials' },
  ],
  'cape town': [
    { label: 'Passport', category: 'essentials' },
    { label: 'South Africa power adapter (Type M)', category: 'essentials' },
    { label: 'Windbreaker', category: 'weather' },
    { label: 'Hiking shoes for Table Mountain', category: 'activities' },
    { label: 'Swimsuit', category: 'activities' },
    { label: 'Layers (weather changes fast)', category: 'weather' },
  ],
  nairobi: [
    { label: 'Passport', category: 'essentials' },
    { label: 'Kenya power adapter (Type G)', category: 'essentials' },
    { label: 'Mosquito repellent', category: 'essentials' },
    { label: 'Neutral-colored safari clothes', category: 'activities' },
    { label: 'Binoculars', category: 'activities' },
    { label: 'Light jacket for evenings', category: 'weather' },
  ],
  toronto: [
    { label: 'Passport', category: 'essentials' },
    { label: 'Comfortable walking shoes', category: 'activities' },
  ],
  'mexico city': [
    { label: 'Passport', category: 'essentials' },
    { label: 'Comfortable walking shoes (cobblestones)', category: 'activities' },
    { label: 'Stomach meds (adjust to street food)', category: 'comfort' },
    { label: 'Light jacket for evenings', category: 'weather' },
  ],
  kingston: [
    { label: 'Passport', category: 'essentials' },
    { label: 'Mosquito repellent', category: 'essentials' },
    { label: 'Swimsuit', category: 'activities' },
    { label: 'Sunscreen', category: 'weather' },
    { label: 'Cash (Jamaican dollars)', category: 'essentials' },
  ],
  'san juan': [
    { label: 'Comfortable walking shoes (cobblestones)', category: 'activities' },
    { label: 'Swimsuit', category: 'activities' },
    { label: 'Sunscreen', category: 'weather' },
    { label: 'Bug spray', category: 'comfort' },
  ],
  // US domestic cities — no passport needed
  'new york': [
    { label: 'Comfortable walking shoes', category: 'activities' },
    { label: 'MetroCard or OMNY-ready phone', category: 'comfort' },
    { label: 'Compact umbrella', category: 'weather' },
    { label: 'Dressy dinner outfit', category: 'activities' },
  ],
  'los angeles': [
    { label: 'Sunscreen', category: 'weather' },
    { label: 'Sunglasses', category: 'weather' },
    { label: 'Swimsuit', category: 'activities' },
    { label: 'Light jacket for evenings', category: 'weather' },
  ],
  miami: [
    { label: 'Swimsuit', category: 'activities' },
    { label: 'Sunscreen SPF 50+', category: 'weather' },
    { label: 'Going-out outfit', category: 'activities' },
    { label: 'Bug spray', category: 'comfort' },
    { label: 'Light breathable clothes', category: 'weather' },
  ],
  chicago: [
    { label: 'Warm layers', category: 'weather' },
    { label: 'Windproof jacket', category: 'weather' },
    { label: 'Comfortable walking shoes', category: 'activities' },
  ],
  atlanta: [
    { label: 'Comfortable walking shoes', category: 'activities' },
    { label: 'Light breathable clothes', category: 'weather' },
    { label: 'Umbrella (afternoon showers)', category: 'weather' },
  ],
  houston: [
    { label: 'Sunscreen', category: 'weather' },
    { label: 'Light breathable clothes', category: 'weather' },
    { label: 'Umbrella', category: 'weather' },
  ],
  sarasota: [
    { label: 'Swimsuit', category: 'activities' },
    { label: 'Sunscreen SPF 50+', category: 'weather' },
    { label: 'Beach towel', category: 'activities' },
    { label: 'Sunglasses', category: 'weather' },
    { label: 'Dressy outfit for waterfront dining', category: 'activities' },
    { label: 'Bug spray', category: 'comfort' },
  ],
};

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
