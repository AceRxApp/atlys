import type { TravelGroup, CommunityTag, Vibe, QuickFilter } from '../types';

export const NIGHTLIFE_TYPES = ['bar', 'night_club', 'casino'];

export const GIRLY_TYPES = ['cafe', 'coffee_shop', 'bakery', 'brunch_restaurant', 'breakfast_restaurant', 'spa', 'ice_cream_shop', 'art_gallery', 'book_store', 'market', 'performing_arts_theater', 'restaurant'];
export const GIRLY_KEYWORDS = ['brunch', 'tea', 'dessert', 'botanical', 'garden', 'rooftop', 'cocktail', 'aesthetic', 'cute', 'vintage', 'floral', 'pink', 'boba', 'macarons', 'patisserie', 'wine'];
export const BOYS_EXCLUDE_TYPES = ['spa', 'bakery', 'book_store'];

export const RESERVABLE_TYPES = [
  'restaurant', 'steak_house', 'seafood_restaurant', 'pizza_restaurant',
  'sushi_restaurant', 'brunch_restaurant', 'breakfast_restaurant', 'bar',
];

export const BOOKABLE_TYPES = [
  'museum', 'art_gallery', 'performing_arts_theater', 'aquarium', 'zoo',
  'amusement_park', 'movie_theater', 'spa', 'bowling_alley', 'stadium',
  'tourist_attraction',
];

export const TRAVEL_GROUPS: { id: TravelGroup; emoji: string; label: string }[] = [
  { id: 'solo', emoji: '🧳', label: 'Solo' },
  { id: 'couple', emoji: '💑', label: 'Couple' },
  { id: 'family', emoji: '👨‍👩‍👧', label: 'Family' },
  { id: 'friends', emoji: '👯', label: 'Friends' },
  { id: 'girls', emoji: '💃', label: 'Girls Trip' },
  { id: 'boys', emoji: '🕺', label: 'Boys Trip' },
  { id: 'bachelorette', emoji: '👰', label: 'Bachelorette' },
];

export const COMMUNITY_TAGS: { id: CommunityTag; emoji: string; label: string }[] = [
  { id: 'black-owned', emoji: '✊🏿', label: 'Black-owned' },
  { id: 'women-owned', emoji: '♀️', label: 'Women-owned' },
  { id: 'hispanic-owned', emoji: '🌎', label: 'Hispanic-owned' },
  { id: 'asian-owned', emoji: '🏮', label: 'Asian-owned' },
  { id: 'lgbtq-friendly', emoji: '🏳️‍🌈', label: 'LGBTQ+ friendly' },
  { id: 'kid-friendly', emoji: '👶', label: 'Kid-friendly' },
  { id: 'baby-friendly', emoji: '🍼', label: 'Baby-friendly' },
  { id: 'wheelchair-accessible', emoji: '♿', label: 'Accessible' },
  { id: 'solo-friendly', emoji: '🧭', label: 'Solo-friendly' },
];

export const VIBES: { id: Vibe; emoji: string; label: string; desc: string }[] = [
  { id: 'thespot', emoji: '📍', label: 'The Spot', desc: 'Lounges, scenic spots, tourist attractions, hangout places' },
  { id: 'eatsip', emoji: '🍽️', label: 'Eat & Sip', desc: 'Hole-in-the-wall eats, mom & pop spots' },
  { id: 'nightlife', emoji: '🍸', label: 'Nightlife', desc: 'Bars, clubs, live music, speakeasies, open mic' },
  { id: 'cultureart', emoji: '🎨', label: 'Culture & Art', desc: 'Galleries, murals, cultural districts' },
  { id: 'neighborhood', emoji: '🏘️', label: 'The Neighborhood', desc: 'Walkable areas, shops, boutiques, markets, ethnic enclaves' },
];

export const QUICK_FILTERS: { id: QuickFilter; label: string }[] = [
  { id: 'open', label: 'Open Now' },
  { id: 'chainBreaker', label: 'No Chains' },
  { id: 'walking', label: 'Walking Distance' },
  { id: 'topRated', label: 'Top Rated' },
  { id: 'budget', label: 'Budget' },
  { id: 'family', label: 'Family Friendly' },
  { id: 'solo', label: 'Solo Friendly' },
];

export const SMART_FILTERS: { id: QuickFilter; label: string; emoji: string }[] = [
  { id: '15min', emoji: '\u{26A1}', label: '15-Min Adventure' },
  { id: 'lateNight', emoji: '\u{1F319}', label: 'Late Night' },
  { id: 'rainyDay', emoji: '\u{2614}', label: 'Rainy Day' },
  { id: 'goldenHour', emoji: '\u{1F305}', label: 'Golden Hour' },
];

/** Estimated cost per stop by Google priceLevel (0-4, -1=unknown) */
export const PRICE_LEVEL_ESTIMATE: Record<number, number> = {
  [-1]: 15,
  0: 0,
  1: 15,
  2: 30,
  3: 60,
  4: 100,
};

/** Budget presets for the burn rate picker */
export const BURN_RATE_PRESETS = [
  { value: 0, label: 'Free Day', emoji: '\u{1F333}', desc: 'Parks & free spots only' },
  { value: 50, label: '$50 Afternoon', emoji: '\u{2615}', desc: 'Coffee & casual bites' },
  { value: 100, label: '$100 Day Out', emoji: '\u{1F37D}\u{FE0F}', desc: 'Nice meals & activities' },
  { value: 200, label: '$200 Splurge', emoji: '\u{1F37E}', desc: 'Upscale dining & events' },
  { value: -1, label: 'Sky is the Limit', emoji: '\u{1F680}', desc: 'No budget constraints' },
] as const;
