import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchCities, fetchEmailSignups, fetchAllCities, toggleCityActive, authSignUp, authSignIn, authSignOut, authGetSession, authOnStateChange, saveReview, fetchReviews, fetchPlaceTagCounts, createCrewTrip, loadCrewTrip, updateCrewTripDays, subscribeToCrewTrip, unsubscribeFromCrewTrip } from './supabase';
import type { Review } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { searchNearby, textSearchPlaces, formatDistance, getHoursStatus } from './services/places';
import type { Place } from './services/places';
import { useLocation } from './hooks/useLocation';
import type { User } from '@supabase/supabase-js';
import { APIProvider, Map, Marker, InfoWindow } from '@vis.gl/react-google-maps';

const MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';

// ============================================================================
// TYPES
// ============================================================================

interface City {
  id: string;
  slug: string;
  name: string;
  country: string;
  region: string;
  banner_url: string;
  timezone: string;
  lat?: number;
  lng?: number;
  is_active?: boolean;
}

interface EventItem {
  id: string;
  name: string;
  date: string;
  time: string;
  venue: string;
  venueAddress: string;
  imageUrl: string | null;
  url: string;
  category: string;
  source?: string;
  lat: number | null;
  lng: number | null;
}

interface Stop {
  id: string;
  place?: Place;
  event?: EventItem;
  type: 'place' | 'event';
  addedAt: Date;
}

interface AdminSignup {
  id: string;
  email: string;
  city: string | null;
  signed_up_at: string;
}

type Screen = 'home' | 'discover' | 'events' | 'plan';
type Vibe = 'food' | 'stay' | 'todo' | 'hidden';
type QuickFilter = 'open' | 'walking' | 'topRated' | 'budget' | 'family' | 'solo';
type TravelGroup = 'solo' | 'couple' | 'family' | 'friends' | 'girls' | 'boys' | 'bachelorette';
type CommunityTag = 'black-owned' | 'women-owned' | 'hispanic-owned' | 'asian-owned' | 'lgbtq-friendly' | 'kid-friendly' | 'baby-friendly' | 'wheelchair-accessible' | 'solo-friendly';

const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL as string) || '';

// ============================================================================
// CITY COORDINATES
// ============================================================================

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'abu dhabi': { lat: 24.4539, lng: 54.3773 },
  'abuja': { lat: 9.0579, lng: 7.4951 },
  'accra': { lat: 5.6037, lng: -0.1870 },
  'addis ababa': { lat: 9.025, lng: 38.7469 },
  'amman': { lat: 31.9454, lng: 35.9284 },
  'amsterdam': { lat: 52.3676, lng: 4.9041 },
  'aruba': { lat: 12.5211, lng: -69.9683 },
  'athens': { lat: 37.9838, lng: 23.7275 },
  'atlanta': { lat: 33.749, lng: -84.388 },
  'auckland': { lat: -36.8485, lng: 174.7633 },
  'austin': { lat: 30.2672, lng: -97.7431 },
  'bali': { lat: -8.3405, lng: 115.0920 },
  'bangkok': { lat: 13.7563, lng: 100.5018 },
  'barcelona': { lat: 41.3874, lng: 2.1686 },
  'beijing': { lat: 39.9042, lng: 116.4074 },
  'beirut': { lat: 33.8938, lng: 35.5018 },
  'belize city': { lat: 17.5046, lng: -88.1962 },
  'berlin': { lat: 52.5200, lng: 13.4050 },
  'bogota': { lat: 4.711, lng: -74.0721 },
  'boston': { lat: 42.3601, lng: -71.0589 },
  'bridgetown': { lat: 13.1132, lng: -59.5988 },
  'brisbane': { lat: -27.4698, lng: 153.0251 },
  'brussels': { lat: 50.8503, lng: 4.3517 },
  'budapest': { lat: 47.4979, lng: 19.0402 },
  'buenos aires': { lat: -34.6037, lng: -58.3816 },
  'calgary': { lat: 51.0447, lng: -114.0719 },
  'cancun': { lat: 21.1619, lng: -86.8515 },
  'cape town': { lat: -33.9249, lng: 18.4241 },
  'cartagena': { lat: 10.391, lng: -75.5364 },
  'casablanca': { lat: 33.5731, lng: -7.5898 },
  'charleston': { lat: 32.7765, lng: -79.9311 },
  'charlotte': { lat: 35.2271, lng: -80.8431 },
  'chiang mai': { lat: 18.7883, lng: 98.9853 },
  'chicago': { lat: 41.8781, lng: -87.6298 },
  'colombo': { lat: 6.9271, lng: 79.8612 },
  'copenhagen': { lat: 55.6761, lng: 12.5683 },
  'curacao': { lat: 12.1696, lng: -68.99 },
  'cusco': { lat: -13.5319, lng: -71.9675 },
  'dakar': { lat: 14.7167, lng: -17.4677 },
  'dallas': { lat: 32.7767, lng: -96.797 },
  'dar es salaam': { lat: -6.7924, lng: 39.2083 },
  'delhi': { lat: 28.7041, lng: 77.1025 },
  'denver': { lat: 39.7392, lng: -104.9903 },
  'detroit': { lat: 42.3314, lng: -83.0458 },
  'doha': { lat: 25.2854, lng: 51.531 },
  'dubai': { lat: 25.2048, lng: 55.2708 },
  'dublin': { lat: 53.3498, lng: -6.2603 },
  'edinburgh': { lat: 55.9533, lng: -3.1883 },
  'essaouira': { lat: 31.5085, lng: -9.7595 },
  'fiji': { lat: -17.7134, lng: 178.065 },
  'florence': { lat: 43.7696, lng: 11.2558 },
  'gold coast': { lat: -28.0167, lng: 153.4 },
  'guatemala city': { lat: 14.6349, lng: -90.5069 },
  'hanoi': { lat: 21.0278, lng: 105.8342 },
  'havana': { lat: 23.1136, lng: -82.3666 },
  'helsinki': { lat: 60.1699, lng: 24.9384 },
  'ho chi minh city': { lat: 10.8231, lng: 106.6297 },
  'hong kong': { lat: 22.3193, lng: 114.1694 },
  'honolulu': { lat: 21.3069, lng: -157.8583 },
  'houston': { lat: 29.7604, lng: -95.3698 },
  'istanbul': { lat: 41.0082, lng: 28.9784 },
  'jaipur': { lat: 26.9124, lng: 75.7873 },
  'jakarta': { lat: -6.2088, lng: 106.8456 },
  'johannesburg': { lat: -26.2041, lng: 28.0473 },
  'kampala': { lat: 0.3476, lng: 32.5825 },
  'kathmandu': { lat: 27.7172, lng: 85.324 },
  'kigali': { lat: -1.9403, lng: 29.8739 },
  'kingston': { lat: 18.0179, lng: -76.8099 },
  'krakow': { lat: 50.0647, lng: 19.945 },
  'kuala lumpur': { lat: 3.139, lng: 101.6869 },
  'kyoto': { lat: 35.0116, lng: 135.7681 },
  'la paz': { lat: -16.4897, lng: -68.1193 },
  'lagos': { lat: 6.5244, lng: 3.3792 },
  'las vegas': { lat: 36.1699, lng: -115.1398 },
  'lima': { lat: -12.0464, lng: -77.0428 },
  'lisbon': { lat: 38.7223, lng: -9.1393 },
  'london': { lat: 51.5074, lng: -0.1278 },
  'los angeles': { lat: 34.0522, lng: -118.2437 },
  'luanda': { lat: -8.839, lng: 13.2894 },
  'madrid': { lat: 40.4168, lng: -3.7038 },
  'manila': { lat: 14.5995, lng: 120.9842 },
  'maputo': { lat: -25.9692, lng: 32.5732 },
  'marrakech': { lat: 31.6295, lng: -7.9811 },
  'mauritius': { lat: -20.3484, lng: 57.5522 },
  'medellin': { lat: 6.2442, lng: -75.5812 },
  'melbourne': { lat: -37.8136, lng: 144.9631 },
  'memphis': { lat: 35.1495, lng: -90.049 },
  'mexico city': { lat: 19.4326, lng: -99.1332 },
  'miami': { lat: 25.7617, lng: -80.1918 },
  'milan': { lat: 45.4642, lng: 9.19 },
  'minneapolis': { lat: 44.9778, lng: -93.265 },
  'montego bay': { lat: 18.4762, lng: -77.8939 },
  'montevideo': { lat: -34.9011, lng: -56.1645 },
  'montreal': { lat: 45.5017, lng: -73.5673 },
  'mumbai': { lat: 19.076, lng: 72.8777 },
  'munich': { lat: 48.1351, lng: 11.582 },
  'muscat': { lat: 23.588, lng: 58.3829 },
  'nairobi': { lat: -1.2921, lng: 36.8219 },
  'nashville': { lat: 36.1627, lng: -86.7816 },
  'nassau': { lat: 25.048, lng: -77.3554 },
  'new orleans': { lat: 29.9511, lng: -90.0715 },
  'new york': { lat: 40.7128, lng: -73.9960 },
  'nice': { lat: 43.7102, lng: 7.262 },
  'ocho rios': { lat: 18.4074, lng: -77.1003 },
  'orlando': { lat: 28.5383, lng: -81.3792 },
  'osaka': { lat: 34.6937, lng: 135.5023 },
  'oslo': { lat: 59.9139, lng: 10.7522 },
  'ottawa': { lat: 45.4215, lng: -75.6972 },
  'panama city': { lat: 8.9824, lng: -79.5199 },
  'paris': { lat: 48.8566, lng: 2.3522 },
  'perth': { lat: -31.9505, lng: 115.8605 },
  'philadelphia': { lat: 39.9526, lng: -75.1652 },
  'phnom penh': { lat: 11.5564, lng: 104.9282 },
  'phoenix': { lat: 33.4484, lng: -112.074 },
  'pittsburgh': { lat: 40.4406, lng: -79.9959 },
  'portland': { lat: 45.5155, lng: -122.6789 },
  'porto': { lat: 41.1579, lng: -8.6291 },
  'prague': { lat: 50.0755, lng: 14.4378 },
  'punta cana': { lat: 18.5601, lng: -68.3725 },
  'quebec city': { lat: 46.8139, lng: -71.208 },
  'queenstown': { lat: -45.0312, lng: 168.6626 },
  'quito': { lat: -0.1807, lng: -78.4678 },
  'rio de janeiro': { lat: -22.9068, lng: -43.1729 },
  'riyadh': { lat: 24.7136, lng: 46.6753 },
  'rome': { lat: 41.9028, lng: 12.4964 },
  'san antonio': { lat: 29.4241, lng: -98.4936 },
  'san diego': { lat: 32.7157, lng: -117.1611 },
  'san francisco': { lat: 37.7749, lng: -122.4194 },
  'san jose': { lat: 9.9281, lng: -84.0907 },
  'san juan': { lat: 18.4655, lng: -66.1057 },
  'santiago': { lat: -33.4489, lng: -70.6693 },
  'santorini': { lat: 36.3932, lng: 25.4615 },
  'santo domingo': { lat: 18.4861, lng: -69.9312 },
  'sao paulo': { lat: -23.5505, lng: -46.6333 },
  'savannah': { lat: 32.0809, lng: -81.0912 },
  'seattle': { lat: 47.6062, lng: -122.3321 },
  'seoul': { lat: 37.5665, lng: 126.9780 },
  'seville': { lat: 37.3891, lng: -5.9845 },
  'shanghai': { lat: 31.2304, lng: 121.4737 },
  'siem reap': { lat: 13.3633, lng: 103.8564 },
  'singapore': { lat: 1.3521, lng: 103.8198 },
  'st. lucia': { lat: 13.9094, lng: -60.9789 },
  'st. louis': { lat: 38.627, lng: -90.1994 },
  'stockholm': { lat: 59.3293, lng: 18.0686 },
  'sydney': { lat: -33.8688, lng: 151.2093 },
  'taipei': { lat: 25.033, lng: 121.5654 },
  'tampa': { lat: 27.9506, lng: -82.4572 },
  'tel aviv': { lat: 32.0853, lng: 34.7818 },
  'tokyo': { lat: 35.6762, lng: 139.6503 },
  'toronto': { lat: 43.6532, lng: -79.3832 },
  'trinidad': { lat: 10.6918, lng: -61.2225 },
  'tulum': { lat: 20.2114, lng: -87.4654 },
  'vancouver': { lat: 49.2827, lng: -123.1207 },
  'venice': { lat: 45.4408, lng: 12.3155 },
  'vienna': { lat: 48.2082, lng: 16.3738 },
  'warsaw': { lat: 52.2297, lng: 21.0122 },
  'washington': { lat: 38.9072, lng: -77.0369 },
  'zanzibar': { lat: -6.1659, lng: 39.2026 },
  'zurich': { lat: 47.3769, lng: 8.5417 },
};

// ============================================================================
// SAFETY DATA
// ============================================================================

const NIGHTLIFE_TYPES = ['bar', 'night_club', 'casino'];

// Travel group type curation
const GIRLY_TYPES = ['cafe', 'coffee_shop', 'bakery', 'brunch_restaurant', 'breakfast_restaurant', 'spa', 'ice_cream_shop', 'art_gallery', 'book_store', 'market', 'performing_arts_theater', 'restaurant'];
const GIRLY_KEYWORDS = ['brunch', 'tea', 'dessert', 'botanical', 'garden', 'rooftop', 'cocktail', 'aesthetic', 'cute', 'vintage', 'floral', 'pink', 'boba', 'macarons', 'patisserie', 'wine'];
const BOYS_EXCLUDE_TYPES = ['spa', 'bakery', 'book_store'];


// Weather code → description/emoji (WMO codes from Open-Meteo)
const WEATHER_CODES: Record<number, { emoji: string; description: string }> = {
  0: { emoji: '☀️', description: 'Clear sky' },
  1: { emoji: '🌤️', description: 'Mostly clear' },
  2: { emoji: '⛅', description: 'Partly cloudy' },
  3: { emoji: '☁️', description: 'Overcast' },
  45: { emoji: '🌫️', description: 'Foggy' },
  48: { emoji: '🌫️', description: 'Icy fog' },
  51: { emoji: '🌦️', description: 'Light drizzle' },
  53: { emoji: '🌦️', description: 'Drizzle' },
  55: { emoji: '🌧️', description: 'Heavy drizzle' },
  61: { emoji: '🌧️', description: 'Light rain' },
  63: { emoji: '🌧️', description: 'Rain' },
  65: { emoji: '🌧️', description: 'Heavy rain' },
  71: { emoji: '🌨️', description: 'Light snow' },
  73: { emoji: '🌨️', description: 'Snow' },
  75: { emoji: '❄️', description: 'Heavy snow' },
  80: { emoji: '🌦️', description: 'Rain showers' },
  81: { emoji: '🌧️', description: 'Moderate showers' },
  82: { emoji: '⛈️', description: 'Heavy showers' },
  95: { emoji: '⛈️', description: 'Thunderstorm' },
  96: { emoji: '⛈️', description: 'Thunderstorm w/ hail' },
  99: { emoji: '⛈️', description: 'Severe thunderstorm' },
};

const RESERVABLE_TYPES = [
  'restaurant', 'steak_house', 'seafood_restaurant', 'pizza_restaurant',
  'sushi_restaurant', 'brunch_restaurant', 'breakfast_restaurant', 'bar',
];

const BOOKABLE_TYPES = [
  'museum', 'art_gallery', 'performing_arts_theater', 'aquarium', 'zoo',
  'amusement_park', 'movie_theater', 'spa', 'bowling_alley', 'stadium',
  'tourist_attraction',
];

// ============================================================================
// TRAVEL GROUPS
// ============================================================================

const TRAVEL_GROUPS: { id: TravelGroup; emoji: string; label: string }[] = [
  { id: 'solo', emoji: '🧳', label: 'Solo' },
  { id: 'couple', emoji: '💑', label: 'Couple' },
  { id: 'family', emoji: '👨‍👩‍👧', label: 'Family' },
  { id: 'friends', emoji: '👯', label: 'Friends' },
  { id: 'girls', emoji: '💃', label: 'Girls Trip' },
  { id: 'boys', emoji: '🕺', label: 'Boys Trip' },
  { id: 'bachelorette', emoji: '👰', label: 'Bachelorette' },
];

// ============================================================================
// COMMUNITY TAGS
// ============================================================================

const COMMUNITY_TAGS: { id: CommunityTag; emoji: string; label: string }[] = [
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

// ============================================================================
// CULTURAL CONTEXT
// ============================================================================

interface CityContext { tipping: string; dress: string; language: string; etiquette: string; currency: string; }

const CITY_CULTURE: Record<string, CityContext> = {
  'new york': { tipping: '15-20% at restaurants, $1-2 per drink', dress: 'Casual to smart casual. Upscale spots may require jackets.', language: 'English. Spanish widely spoken.', etiquette: 'Fast-paced. Queue culture strong. Tip everyone.', currency: 'USD. Cards accepted everywhere.' },
  'los angeles': { tipping: '15-20% at restaurants', dress: 'Casual. Athleisure is fine almost anywhere.', language: 'English. Spanish very common.', etiquette: 'Car culture — expect to drive everywhere.', currency: 'USD. Cards accepted everywhere.' },
  'miami': { tipping: '18-20% (often auto-added in South Beach)', dress: 'Casual/resort wear. Dress up for nightlife.', language: 'English and Spanish equally spoken.', etiquette: 'Vibrant nightlife culture. Latin influence strong.', currency: 'USD. Cards accepted everywhere.' },
  'atlanta': { tipping: '15-20% at restaurants', dress: 'Casual to smart. Southern hospitality vibes.', language: 'English. Diverse multilingual communities.', etiquette: 'Friendly and social. "Yes ma\'am/sir" is common.', currency: 'USD. Cards accepted everywhere.' },
  'chicago': { tipping: '18-20% at restaurants', dress: 'Layer up — weather changes fast. Smart casual for dining.', language: 'English. Large Spanish-speaking community.', etiquette: 'Deep-dish pizza is serious business. Don\'t call it "Chi-town" to locals.', currency: 'USD. Cards accepted everywhere.' },
  'new orleans': { tipping: '18-20% at restaurants', dress: 'Casual. Comfortable shoes for walking.', language: 'English with Creole/Cajun influence.', etiquette: 'Live music culture. Second lines are a way of life.', currency: 'USD. Some cash-only spots in the Quarter.' },
  'london': { tipping: '10-12.5% (check if service charge included)', dress: 'Smart casual. Pubs casual, restaurants smart.', language: 'English. Multicultural city.', etiquette: 'Queue rigorously. "Please" and "thank you" essential.', currency: 'GBP. Contactless widely accepted.' },
  'paris': { tipping: 'Service included. Round up for good service.', dress: 'Smart casual. Parisians dress elegantly.', language: 'French. Say "Bonjour" before any interaction.', etiquette: 'Don\'t speak loudly in public. Greet shopkeepers.', currency: 'EUR. Cards accepted, carry some cash.' },
  'barcelona': { tipping: 'Not expected. Round up or 5-10% for great service.', dress: 'Casual/smart casual. Beach to bar culture.', language: 'Spanish and Catalan. English in tourist areas.', etiquette: 'Late dining — dinner at 9-10 PM. Siesta culture.', currency: 'EUR. Cards widely accepted.' },
  'rome': { tipping: 'Round up the bill. "Coperto" (cover charge) is normal.', dress: 'Smart casual. Cover shoulders at churches.', language: 'Italian. English in tourist areas.', etiquette: 'Don\'t order cappuccino after 11 AM. No splitting bills.', currency: 'EUR. Cash still common at small shops.' },
  'amsterdam': { tipping: 'Round up or 5-10%', dress: 'Casual. Comfortable shoes for cobblestones.', language: 'Dutch. Almost everyone speaks excellent English.', etiquette: 'Bike lanes are sacred — don\'t walk in them.', currency: 'EUR. Cards/contactless preferred.' },
  'berlin': { tipping: '5-10% at restaurants', dress: 'Casual/alternative. All-black is a vibe.', language: 'German. English widely spoken.', etiquette: 'Cash culture — many places don\'t take cards.', currency: 'EUR. Carry cash!' },
  'tokyo': { tipping: 'No tipping. It can be offensive.', dress: 'Conservative and neat. Remove shoes when indicated.', language: 'Japanese. English limited outside tourist areas.', etiquette: 'Bow when greeting. Don\'t eat while walking. Silence on trains.', currency: 'JPY. Cash preferred at small shops.' },
  'bangkok': { tipping: 'Not mandatory. Round up for good service.', dress: 'Light, casual. Cover shoulders/knees at temples.', language: 'Thai. English in tourist areas.', etiquette: 'Wai (bow) to show respect. Feet are lowest, head is sacred.', currency: 'THB. Cash at markets, cards at malls.' },
  'singapore': { tipping: 'Not expected. 10% service charge usually included.', dress: 'Smart casual. Light fabrics for humidity.', language: 'English, Mandarin, Malay, Tamil — all official.', etiquette: 'No gum. Fines for littering. Clean and orderly.', currency: 'SGD. Cards/contactless everywhere.' },
  'seoul': { tipping: 'Not expected or necessary.', dress: 'Trendy casual. K-fashion is big.', language: 'Korean. English in tourist areas.', etiquette: 'Pour drinks for elders first. Use both hands to receive.', currency: 'KRW. Cards accepted almost everywhere.' },
  'dubai': { tipping: '10-15% if not included.', dress: 'Modest in public. Cover shoulders and knees.', language: 'Arabic and English widely spoken.', etiquette: 'No PDA. Don\'t photograph people without permission.', currency: 'AED. Cards widely accepted.' },
  'lagos': { tipping: '10% at restaurants. Negotiate at markets.', dress: 'Smart casual. Locals dress well for outings.', language: 'English. Pidgin widely spoken.', etiquette: 'Friendly culture. Greet with handshakes.', currency: 'NGN. Cash preferred, bring small bills.' },
  'accra': { tipping: '10% appreciated. Not mandatory.', dress: 'Casual. Light fabrics for heat.', language: 'English. Twi and other local languages.', etiquette: 'Right hand for greetings and eating.', currency: 'GHS. Cash common, cards at larger spots.' },
  'cape town': { tipping: '10-15% at restaurants', dress: 'Casual. Layers for changeable weather.', language: 'English, Afrikaans, Xhosa widely spoken.', etiquette: 'Friendly people. Be aware of surroundings at night.', currency: 'ZAR. Cards widely accepted.' },
  'nairobi': { tipping: '10% at restaurants. Round up for services.', dress: 'Smart casual. Respectful dress appreciated.', language: 'English and Swahili.', etiquette: 'Greet people warmly. "Jambo" goes a long way.', currency: 'KES. M-Pesa mobile payments widely used.' },
  'marrakech': { tipping: '10% at restaurants. Small tips for guides.', dress: 'Modest. Cover shoulders and knees.', language: 'Arabic and French. Some English in tourist areas.', etiquette: 'Haggling is expected at souks. Remove shoes in homes.', currency: 'MAD. Cash essential at markets.' },
  'mexico city': { tipping: '10-15% at restaurants. 10-20 pesos for services.', dress: 'Casual. Smart dress for upscale venues.', language: 'Spanish. English limited outside tourist areas.', etiquette: 'Friendly culture. "Por favor" and "gracias" essential.', currency: 'MXN. Cash preferred at markets.' },
  'cancun': { tipping: '15-20% in tourist areas (USD accepted)', dress: 'Beach/resort casual. Cover up in town.', language: 'Spanish. English widely spoken in hotel zone.', etiquette: 'Respect Mayan heritage sites.', currency: 'MXN. USD widely accepted in hotel zone.' },
  'lisbon': { tipping: 'Round up or 5-10%', dress: 'Casual. Comfortable shoes for hills.', language: 'Portuguese. English widely spoken.', etiquette: 'Fado music is sacred — listen quietly.', currency: 'EUR. Cards widely accepted.' },
  'rio de janeiro': { tipping: '10% usually included (gorjeta).', dress: 'Very casual. Beach culture permeates.', language: 'Portuguese. Limited English.', etiquette: 'Be street-smart. Use registered taxis or apps.', currency: 'BRL. Cards accepted, carry some cash.' },
  'havana': { tipping: '10-15% at restaurants. CUC tips for services.', dress: 'Casual. Light fabrics for heat.', language: 'Spanish. Very limited English.', etiquette: 'Cash only — ATMs unreliable. Bring euros or CAD to exchange.', currency: 'CUP. Bring foreign cash to exchange.' },
  'kingston': { tipping: '10-15% at restaurants', dress: 'Casual. Respectful dress appreciated.', language: 'English and Jamaican Patois.', etiquette: 'Warm and welcoming. Reggae culture is a way of life.', currency: 'JMD. USD widely accepted.' },
  'bali': { tipping: '5-10% at restaurants if no service charge.', dress: 'Casual. Sarong required at temples.', language: 'Indonesian. English in tourist areas.', etiquette: 'Don\'t touch heads. Don\'t point with feet.', currency: 'IDR. Cash at small shops, cards at hotels.' },
  'abu dhabi': { tipping: '10-15% if not included in the bill.', dress: 'Modest dress required. Cover shoulders and knees in public.', language: 'Arabic. English widely spoken.', etiquette: 'Don\'t eat, drink, or smoke in public during Ramadan.', currency: 'AED. Cards widely accepted.' },
  'abuja': { tipping: '10% at restaurants. Tip service staff directly.', dress: 'Smart casual. Conservative dress outside hotels.', language: 'English. Hausa and other local languages.', etiquette: 'Greet with a handshake. Respect for elders is important.', currency: 'NGN. Cash preferred, carry small denominations.' },
  'addis ababa': { tipping: '10% at restaurants. Small tips for guides.', dress: 'Smart casual. Modest dress near churches.', language: 'Amharic. English spoken in tourist areas.', etiquette: 'Coffee ceremony is sacred — accept invitations graciously.', currency: 'ETB. Cash essential, cards only at large hotels.' },
  'amman': { tipping: '10% at restaurants if not included.', dress: 'Modest. Cover shoulders and knees, especially at mosques.', language: 'Arabic. English widely spoken in the city.', etiquette: 'Accept tea or coffee when offered — it\'s rude to refuse.', currency: 'JOD. Cash preferred at local shops.' },
  'aruba': { tipping: '15-20% at restaurants if not included.', dress: 'Beach casual. Cover up when leaving resort areas.', language: 'Papiamento, Dutch, English, and Spanish all spoken.', etiquette: 'Friendly island culture. "Bon dia" is a common greeting.', currency: 'AWG. USD widely accepted everywhere.' },
  'athens': { tipping: 'Round up or 5-10% at restaurants.', dress: 'Casual. Cover shoulders and knees at churches and monasteries.', language: 'Greek. English widely spoken in tourist areas.', etiquette: 'Dining is leisurely — don\'t rush. "Yamas" when toasting.', currency: 'EUR. Cards accepted, carry cash for tavernas.' },
  'auckland': { tipping: 'Not expected. 10% for exceptional service.', dress: 'Casual. Layers for unpredictable weather.', language: 'English and Te Reo Maori.', etiquette: 'Relaxed Kiwi culture. Remove shoes before entering homes.', currency: 'NZD. Contactless/cards accepted everywhere.' },
  'austin': { tipping: '18-20% at restaurants. Tip food truck staff too.', dress: 'Very casual. "Keep Austin Weird" applies to fashion.', language: 'English. Spanish widely spoken.', etiquette: 'Live music capital — respect performers. BBQ is religion.', currency: 'USD. Cards accepted everywhere.' },
  'beijing': { tipping: 'Not expected and may be refused.', dress: 'Smart casual. Conservative for business settings.', language: 'Mandarin. Limited English outside tourist sites.', etiquette: 'Don\'t stick chopsticks upright in rice. Accept business cards with both hands.', currency: 'CNY. WeChat Pay and Alipay dominate; carry some cash.' },
  'beirut': { tipping: '10-15% at restaurants if not included.', dress: 'Stylish casual. Beirut is fashion-forward.', language: 'Arabic, French, and English widely spoken.', etiquette: 'Warm hospitality culture. Refusing food offers can be impolite.', currency: 'LBP. USD widely used and preferred.' },
  'belize city': { tipping: '10-15% at restaurants. Tip tour guides.', dress: 'Casual. Light fabrics for tropical heat.', language: 'English (official). Kriol and Spanish also spoken.', etiquette: 'Laid-back Caribbean culture. Be patient with "island time."', currency: 'BZD. USD widely accepted.' },
  'bogota': { tipping: '10% often included as "propina voluntaria."', dress: 'Smart casual. Layers for cool highland weather.', language: 'Spanish. Limited English outside upscale areas.', etiquette: 'Greet with a cheek kiss. Don\'t discuss politics or conflict history.', currency: 'COP. Cards accepted at most restaurants.' },
  'boston': { tipping: '18-20% at restaurants.', dress: 'Smart casual. Layers for harsh winters.', language: 'English. Large Portuguese and Spanish-speaking communities.', etiquette: 'Don\'t confuse it with New York. Sports loyalty is fierce.', currency: 'USD. Cards accepted everywhere.' },
  'bridgetown': { tipping: '10-15% if not included in the bill.', dress: 'Casual resort wear. Cover up away from beaches.', language: 'English. Bajan dialect spoken locally.', etiquette: 'Polite greetings are expected. "Good morning/afternoon" before conversation.', currency: 'BBD. USD widely accepted.' },
  'brisbane': { tipping: 'Not expected. Round up for great service.', dress: 'Very casual. Shorts and flip-flops common.', language: 'English.', etiquette: 'Relaxed and friendly. "No worries" is the national motto.', currency: 'AUD. Contactless/tap-and-go everywhere.' },
  'brussels': { tipping: 'Service included. Round up for good service.', dress: 'Smart casual. Europeans dress neatly.', language: 'French and Dutch. English widely spoken.', etiquette: 'Greet with one or three kisses depending on the region.', currency: 'EUR. Cards widely accepted.' },
  'budapest': { tipping: '10-15% at restaurants. Hand it directly to the server.', dress: 'Smart casual. Bring swimwear for thermal baths.', language: 'Hungarian. English spoken in tourist areas.', etiquette: 'Don\'t clink beer glasses — it\'s a historical tradition. Enjoy ruin bars.', currency: 'HUF. Cards increasingly accepted, carry some cash.' },
  'buenos aires': { tipping: '10% at restaurants. Round up for taxis.', dress: 'Smart casual. Portenos dress stylishly.', language: 'Spanish (Rioplatense). Limited English.', etiquette: 'Greet with a kiss on the cheek. Dinner starts at 9-10 PM.', currency: 'ARS. Carry cash; blue dollar rate may apply.' },
  'calgary': { tipping: '15-20% at restaurants.', dress: 'Casual. Western wear welcome during Stampede.', language: 'English. French signage in federal buildings.', etiquette: 'Friendly and polite. Hold doors open for others.', currency: 'CAD. Cards/contactless accepted everywhere.' },
  'cartagena': { tipping: '10% often included. Add extra for great service.', dress: 'Casual resort wear. Light fabrics for heat and humidity.', language: 'Spanish. Some English in tourist areas.', etiquette: 'Haggle at markets. Be cautious with street vendors.', currency: 'COP. Cash preferred at smaller shops.' },
  'casablanca': { tipping: '10% at restaurants. Small tips for services.', dress: 'Modest but cosmopolitan. Cover shoulders in traditional areas.', language: 'Arabic and French. Some English in business settings.', etiquette: 'Greet with "Salam." Handshakes common in business.', currency: 'MAD. Cash essential at most places.' },
  'charleston': { tipping: '18-20% at restaurants.', dress: 'Smart casual. Sundresses and seersucker fit right in.', language: 'English. Gullah heritage in the Lowcountry.', etiquette: 'Southern hospitality is genuine. Politeness is deeply valued.', currency: 'USD. Cards accepted everywhere.' },
  'charlotte': { tipping: '15-20% at restaurants.', dress: 'Casual to smart casual. Business attire in banking district.', language: 'English. Growing Spanish-speaking community.', etiquette: 'Southern manners — "sir" and "ma\'am" go a long way.', currency: 'USD. Cards accepted everywhere.' },
  'chiang mai': { tipping: 'Not expected. 20-50 baht appreciated for good service.', dress: 'Light and modest. Cover up at temples.', language: 'Thai. Northern dialect spoken locally. English in tourist areas.', etiquette: 'Remove shoes before entering temples and homes. Respect monks.', currency: 'THB. Cash at markets, cards at hotels and malls.' },
  'colombo': { tipping: '10% if not included in the service charge.', dress: 'Light, modest clothing. Cover up at temples.', language: 'Sinhala and Tamil. English widely understood.', etiquette: 'Remove shoes at temples. Use right hand for greetings.', currency: 'LKR. Cards accepted at hotels and larger restaurants.' },
  'copenhagen': { tipping: 'Service included. Round up for good service.', dress: 'Smart casual. Minimalist Scandinavian style.', language: 'Danish. Almost everyone speaks excellent English.', etiquette: 'Hygge culture — cozy and low-key. Don\'t skip the bicycle lanes.', currency: 'DKK. Cards/contactless preferred; many places are cash-free.' },
  'curacao': { tipping: '10-15% at restaurants if not included.', dress: 'Beach casual. Smart casual for nicer restaurants.', language: 'Papiamentu, Dutch, English, and Spanish.', etiquette: 'Friendly island culture. Greet with "Bon tardi" in the afternoon.', currency: 'ANG. USD widely accepted.' },
  'cusco': { tipping: '10% at restaurants. Tip trekking guides and porters generously.', dress: 'Layers — it\'s cold at altitude. Comfortable shoes for cobblestones.', language: 'Spanish and Quechua. Some English in tourist areas.', etiquette: 'Coca tea helps with altitude sickness. Respect Inca heritage sites.', currency: 'PEN. Cash essential at markets; soles preferred over USD.' },
  'dakar': { tipping: '10% at restaurants. Tip guides directly.', dress: 'Casual. Modest near mosques.', language: 'French (official). Wolof widely spoken.', etiquette: 'Greet everyone upon entering a room. Teranga (hospitality) is central.', currency: 'XOF. Cash essential; few places accept cards.' },
  'dallas': { tipping: '18-20% at restaurants.', dress: 'Casual to smart casual. Boots and hats at honky-tonks.', language: 'English. Large Spanish-speaking community.', etiquette: 'Texan pride runs deep. BBQ and Tex-Mex are cultural cornerstones.', currency: 'USD. Cards accepted everywhere.' },
  'dar es salaam': { tipping: '10% at restaurants. Tip safari guides separately.', dress: 'Modest and lightweight. Cover up in Swahili areas.', language: 'Swahili and English.', etiquette: 'Greet with "Mambo" or "Habari." Handshakes are common.', currency: 'TZS. Cash essential at most places; M-Pesa is growing.' },
  'delhi': { tipping: '10% at restaurants. Small tips for services appreciated.', dress: 'Modest. Cover shoulders and knees at temples and mosques.', language: 'Hindi and English. Urdu and Punjabi also spoken.', etiquette: 'Use right hand for eating and greetings. Remove shoes at temples.', currency: 'INR. UPI digital payments booming; cash at street vendors.' },
  'denver': { tipping: '18-20% at restaurants.', dress: 'Casual outdoors. Smart casual for dining.', language: 'English. Spanish widely spoken.', etiquette: 'Altitude affects you — hydrate and go easy on alcohol.', currency: 'USD. Cards accepted everywhere.' },
  'detroit': { tipping: '18-20% at restaurants.', dress: 'Casual. Streetwear culture strong.', language: 'English. Arabic community in Dearborn.', etiquette: 'Proud city culture. Respect the automotive heritage.', currency: 'USD. Cards accepted everywhere.' },
  'doha': { tipping: '10-15% if no service charge included.', dress: 'Modest in public. Cover shoulders and knees.', language: 'Arabic. English widely spoken.', etiquette: 'No PDA. Don\'t photograph locals without permission. Respect Ramadan.', currency: 'QAR. Cards widely accepted.' },
  'dublin': { tipping: '10-15% at restaurants. Not expected at pubs.', dress: 'Casual. Layers and rain gear essential.', language: 'English and Irish (Gaeilge).', etiquette: 'Pub culture is social — buy rounds. Don\'t order an "Irish Car Bomb."', currency: 'EUR. Cards/contactless widely accepted.' },
  'edinburgh': { tipping: '10% at restaurants if not included.', dress: 'Casual. Layers for unpredictable Scottish weather.', language: 'English. Scots Gaelic occasionally.', etiquette: 'Don\'t call it "Edinburg" — it\'s "Edin-bruh." Whisky, not whiskey.', currency: 'GBP. Scottish notes are legal but sometimes refused in England.' },
  'essaouira': { tipping: '10% at restaurants. Tip guides and riads staff.', dress: 'Modest. Cover shoulders and knees. Wind layers helpful.', language: 'Arabic, French, and Berber. Some English.', etiquette: 'Haggling expected at souks. Ask before photographing locals.', currency: 'MAD. Cash essential; very few places take cards.' },
  'fiji': { tipping: 'Not expected. A gift of kava root is appreciated.', dress: 'Resort casual. Sulu (sarong) appropriate for village visits.', language: 'English, Fijian, and Hindi.', etiquette: 'Say "Bula!" to greet. Remove hats and sunglasses in villages.', currency: 'FJD. Cash at markets, cards at resorts.' },
  'florence': { tipping: 'Round up the bill. Coperto (cover charge) is standard.', dress: 'Smart casual. Cover shoulders and knees at churches.', language: 'Italian. English at tourist sites.', etiquette: 'Don\'t sit on church steps to eat. Book Uffizi tickets in advance.', currency: 'EUR. Cash common at trattorias and gelaterias.' },
  'gold coast': { tipping: 'Not expected. Round up for exceptional service.', dress: 'Beach casual. Very laid-back.', language: 'English.', etiquette: 'Swim between the flags at patrolled beaches. Slip-slop-slap for sun safety.', currency: 'AUD. Contactless/tap-and-go everywhere.' },
  'guatemala city': { tipping: '10% at restaurants if not included.', dress: 'Casual. Modest in indigenous communities.', language: 'Spanish. Mayan languages in rural areas.', etiquette: 'Greet with "Buenos dias." Respect indigenous textiles and traditions.', currency: 'GTQ. Cash essential; USD accepted at some tourist spots.' },
  'hanoi': { tipping: 'Not expected. Small tips appreciated at high-end restaurants.', dress: 'Casual. Cover shoulders and knees at temples.', language: 'Vietnamese. Limited English outside tourist areas.', etiquette: 'Cross the street boldly — traffic flows around you. Don\'t touch heads.', currency: 'VND. Cash essential at street stalls and markets.' },
  'helsinki': { tipping: 'Service included. Round up if you like.', dress: 'Smart casual. Warm layers in winter.', language: 'Finnish and Swedish. English widely spoken.', etiquette: 'Sauna is sacred — follow local etiquette. Personal space is valued.', currency: 'EUR. Cards/contactless preferred; Finland is nearly cashless.' },
  'ho chi minh city': { tipping: 'Not expected. 5-10% at upscale restaurants.', dress: 'Casual. Light fabrics for heat and humidity.', language: 'Vietnamese. English growing in tourist areas.', etiquette: 'Bargain at markets. Motorbike traffic is intense — stay alert.', currency: 'VND. Cash essential at street vendors and markets.' },
  'hong kong': { tipping: '10% service charge usually added. Round up for extras.', dress: 'Smart casual. Fashion-conscious city.', language: 'Cantonese. English widely spoken in business and tourism.', etiquette: 'Offer and receive business cards with both hands. Escalator: stand right, walk left.', currency: 'HKD. Octopus card and contactless widely used.' },
  'honolulu': { tipping: '18-20% at restaurants.', dress: 'Aloha shirts and casual beach wear.', language: 'English and Hawaiian. Pidgin spoken locally.', etiquette: 'Remove shoes before entering homes. Respect sacred Hawaiian sites.', currency: 'USD. Cards accepted everywhere.' },
  'houston': { tipping: '18-20% at restaurants.', dress: 'Casual. Dress for heat and humidity.', language: 'English. Large Spanish, Vietnamese, and Chinese communities.', etiquette: 'Texan hospitality — friendly and welcoming. BBQ is serious.', currency: 'USD. Cards accepted everywhere.' },
  'istanbul': { tipping: '5-10% at restaurants. Round up for taxis.', dress: 'Smart casual. Cover up at mosques — scarves provided for women.', language: 'Turkish. English at tourist sites.', etiquette: 'Remove shoes at mosques. Turkish tea and hospitality go hand in hand.', currency: 'TRY. Cards accepted in the city; cash at bazaars.' },
  'jaipur': { tipping: '10% at restaurants. 50-100 rupees for guides.', dress: 'Modest. Cover shoulders and knees. Remove shoes at temples.', language: 'Hindi and Rajasthani. English at tourist sites.', etiquette: 'Bargain at bazaars. Accept chai invitations graciously.', currency: 'INR. Cash essential at markets; UPI growing.' },
  'jakarta': { tipping: '5-10% at restaurants if no service charge.', dress: 'Modest and lightweight. Cover up at mosques.', language: 'Bahasa Indonesia. Limited English.', etiquette: 'Use right hand for greetings and eating. Remove shoes indoors.', currency: 'IDR. Cash at street vendors; GoPay and cards at malls.' },
  'johannesburg': { tipping: '10-15% at restaurants.', dress: 'Smart casual. Layers for variable weather.', language: 'English, Zulu, Sotho, and many others.', etiquette: 'Be security-aware. Don\'t flash valuables. Friendly people once trust is built.', currency: 'ZAR. Cards widely accepted.' },
  'kampala': { tipping: '10% at restaurants. Tip guides directly.', dress: 'Smart casual. Modest dress appreciated.', language: 'English and Luganda. Swahili also spoken.', etiquette: 'Greet warmly with a handshake. Ask permission before photographing people.', currency: 'UGX. Cash preferred; mobile money widely used.' },
  'kathmandu': { tipping: '10% at restaurants. Tip trekking guides and porters.', dress: 'Modest. Layers for variable mountain weather.', language: 'Nepali. English in tourist areas.', etiquette: 'Remove shoes at temples. Walk clockwise around stupas. "Namaste" to greet.', currency: 'NPR. Cash essential; cards only at upscale hotels.' },
  'kigali': { tipping: '10% appreciated at restaurants.', dress: 'Smart casual. Kigali is notably clean and well-dressed.', language: 'Kinyarwanda, English, and French.', etiquette: 'Plastic bags are banned. Last Saturday of each month is community clean-up (Umuganda).', currency: 'RWF. Mobile money common; cash at most places.' },
  'krakow': { tipping: '10% at restaurants.', dress: 'Smart casual. Comfortable shoes for cobblestones.', language: 'Polish. English widely spoken by younger generations.', etiquette: 'Visit Auschwitz respectfully. Vodka toasts are common — maintain eye contact.', currency: 'PLN. Cards widely accepted.' },
  'kuala lumpur': { tipping: 'Not expected. Service charge usually included.', dress: 'Casual. Modest at mosques — cover shoulders and knees.', language: 'Malay. English and Mandarin widely spoken.', etiquette: 'Remove shoes at mosques and temples. Use right hand for eating.', currency: 'MYR. Cards and e-wallets widely accepted.' },
  'kyoto': { tipping: 'No tipping. It can be considered rude.', dress: 'Conservative and neat. Kimono rentals popular for temple visits.', language: 'Japanese. English limited.', etiquette: 'Walk quietly in geisha districts. Don\'t touch maiko or geisha.', currency: 'JPY. Cash preferred at traditional shops and temples.' },
  'la paz': { tipping: '10% at restaurants if not included.', dress: 'Layers for high altitude and cold. Comfortable walking shoes.', language: 'Spanish and Aymara. Limited English.', etiquette: 'Altitude sickness is real — acclimate slowly. Coca tea helps.', currency: 'BOB. Cash essential; cards only at upscale spots.' },
  'las vegas': { tipping: '18-20% at restaurants. $1-5 per hand for dealers.', dress: 'Anything goes. Dress up for clubs and fine dining.', language: 'English. Spanish widely spoken.', etiquette: 'Tip everyone — dealers, valets, bartenders, housekeeping.', currency: 'USD. Cards accepted everywhere; carry cash for tips and tables.' },
  'lima': { tipping: '10% often included as service charge.', dress: 'Smart casual. Layers for Lima\'s gray winters.', language: 'Spanish. Limited English outside tourist areas.', etiquette: 'Ceviche is a lunchtime dish — not dinner. Cheek kiss to greet.', currency: 'PEN. Cards accepted at restaurants; cash at markets.' },
  'luanda': { tipping: '10% at restaurants.', dress: 'Smart casual. Modest dress appreciated.', language: 'Portuguese. Local languages spoken widely.', etiquette: 'Formal greetings are valued. Be patient with bureaucratic processes.', currency: 'AOA. Cash essential; very limited card acceptance.' },
  'madrid': { tipping: 'Not expected. Round up or leave small change.', dress: 'Smart casual. Madrilenos dress well.', language: 'Spanish. Limited English in local neighborhoods.', etiquette: 'Late meals — lunch at 2 PM, dinner at 9-10 PM. Tapas culture thrives.', currency: 'EUR. Cards widely accepted.' },
  'manila': { tipping: '10% if no service charge included.', dress: 'Casual. Light fabrics for tropical heat.', language: 'Filipino (Tagalog) and English.', etiquette: 'Use "po" and "opo" for respect. Filipinos are very hospitable.', currency: 'PHP. Cash at markets; cards at malls and restaurants.' },
  'maputo': { tipping: '10% at restaurants.', dress: 'Casual. Light fabrics for heat.', language: 'Portuguese. Local languages spoken.', etiquette: 'Warm greetings are important. Seafood culture along the coast.', currency: 'MZN. Cash essential; limited card acceptance.' },
  'mauritius': { tipping: '10% at restaurants if not included.', dress: 'Resort casual. Modest away from beaches.', language: 'English, French, and Creole.', etiquette: 'Remove shoes when entering temples. Respect multicultural traditions.', currency: 'MUR. Cards accepted at hotels and larger restaurants.' },
  'medellin': { tipping: '10% propina voluntaria often included.', dress: 'Casual. Spring-like weather year-round — light layers.', language: 'Spanish. English growing in tourist areas.', etiquette: 'Friendly "paisa" culture. Don\'t bring up Pablo Escobar unprompted.', currency: 'COP. Cards accepted at most restaurants; cash at local shops.' },
  'melbourne': { tipping: 'Not expected. 10% for exceptional service.', dress: 'All-black fashion capital. Layers for four-seasons-in-one-day weather.', language: 'English. Multicultural with many languages.', etiquette: 'Coffee culture is serious — don\'t order Starbucks. Respect laneway art.', currency: 'AUD. Contactless/tap-and-go everywhere.' },
  'memphis': { tipping: '18-20% at restaurants.', dress: 'Casual. Comfortable shoes for Beale Street.', language: 'English.', etiquette: 'Blues and BBQ are the soul of the city. Visit Sun Studio and respect the music legacy.', currency: 'USD. Cards accepted everywhere.' },
  'milan': { tipping: 'Round up the bill. Coperto is standard.', dress: 'Stylish. Milan is a fashion capital — dress well.', language: 'Italian. English in business and tourist areas.', etiquette: 'Aperitivo hour (6-9 PM) is a ritual. Don\'t rush meals.', currency: 'EUR. Cards widely accepted.' },
  'minneapolis': { tipping: '18-20% at restaurants.', dress: 'Casual. Heavy winter gear essential from November to March.', language: 'English. Large Somali and Hmong communities.', etiquette: '"Minnesota Nice" is real. People are polite and helpful.', currency: 'USD. Cards accepted everywhere.' },
  'montego bay': { tipping: '10-15% at restaurants. Tip all-inclusive staff.', dress: 'Beach casual. Cover up when leaving resort areas.', language: 'English and Jamaican Patois.', etiquette: 'Warm and friendly. "No problem, mon" is the vibe.', currency: 'JMD. USD widely accepted at resorts.' },
  'montevideo': { tipping: '10% at restaurants.', dress: 'Smart casual. Relaxed style.', language: 'Spanish. Limited English.', etiquette: 'Mate (tea) is a social ritual — sharing is a sign of friendship.', currency: 'UYU. Cards accepted at most restaurants; cash at ferias.' },
  'montreal': { tipping: '15-20% at restaurants.', dress: 'Stylish casual. Winter requires serious cold-weather gear.', language: 'French (primary). English widely spoken.', etiquette: 'Greet in French first — "Bonjour" is legally required in shops.', currency: 'CAD. Cards/contactless accepted everywhere.' },
  'mumbai': { tipping: '10% at restaurants. Small tips for services.', dress: 'Modest. Light fabrics for heat. Cover up at temples.', language: 'Hindi, Marathi, and English.', etiquette: 'Use right hand for eating. "Namaste" with palms together to greet.', currency: 'INR. UPI and digital payments booming; cash at street vendors.' },
  'munich': { tipping: '5-10% at restaurants. Round up the bill.', dress: 'Smart casual. Lederhosen/dirndl welcome at beer halls during Oktoberfest.', language: 'German (Bavarian dialect). English widely spoken.', etiquette: 'Say "Prost!" when toasting and maintain eye contact.', currency: 'EUR. Cash more common than in other German cities.' },
  'muscat': { tipping: '10% at restaurants if not included.', dress: 'Modest. Cover shoulders and knees in public and at mosques.', language: 'Arabic. English widely spoken.', etiquette: 'Accept coffee and dates when offered. Remove shoes at mosques.', currency: 'OMR. Cards accepted at larger establishments; carry some cash.' },
  'nashville': { tipping: '18-20% at restaurants.', dress: 'Casual. Boots and denim fit right in on Broadway.', language: 'English.', etiquette: 'Live music everywhere — tip the performers. Hot chicken is a rite of passage.', currency: 'USD. Cards accepted everywhere.' },
  'nassau': { tipping: '15-20% at restaurants. $1-2 per bag for porters.', dress: 'Beach casual. Cover up in town.', language: 'English. Bahamian Creole spoken locally.', etiquette: 'Friendly and relaxed. Don\'t haggle at Straw Market too aggressively.', currency: 'BSD. USD accepted everywhere at 1:1.' },
  'nice': { tipping: 'Service included. Round up for good service.', dress: 'Smart casual to elegant. Riviera style.', language: 'French. Some English in tourist areas.', etiquette: 'Greet with "Bonjour." Respect beach etiquette.', currency: 'EUR. Cards widely accepted.' },
  'ocho rios': { tipping: '10-15% at restaurants.', dress: 'Beach and resort casual.', language: 'English and Jamaican Patois.', etiquette: 'Friendly and welcoming. Enjoy the waterfall culture at Dunn\'s River.', currency: 'JMD. USD widely accepted at tourist spots.' },
  'orlando': { tipping: '18-20% at restaurants.', dress: 'Casual. Comfortable shoes for theme parks.', language: 'English. Large Spanish-speaking community.', etiquette: 'Theme park culture — learn the app systems for queue management.', currency: 'USD. Cards accepted everywhere.' },
  'osaka': { tipping: 'No tipping. It can be considered rude.', dress: 'Casual and neat. More laid-back than Tokyo.', language: 'Japanese (Kansai dialect). Limited English.', etiquette: 'Osaka is Japan\'s kitchen — street food culture thrives. Eat while standing at stalls.', currency: 'JPY. Cash preferred at street food vendors.' },
  'oslo': { tipping: 'Service included. Round up for good service.', dress: 'Smart casual. Warm layers in winter.', language: 'Norwegian. Excellent English spoken by nearly everyone.', etiquette: 'Outdoor culture valued. Respect the concept of "friluftsliv" (open-air living).', currency: 'NOK. Almost entirely cashless; cards/contactless everywhere.' },
  'ottawa': { tipping: '15-20% at restaurants.', dress: 'Casual. Heavy winter gear from November to March.', language: 'English and French (officially bilingual).', etiquette: 'Polite and orderly. Hold doors open. Say "sorry" frequently.', currency: 'CAD. Cards/contactless accepted everywhere.' },
  'panama city': { tipping: '10% at restaurants if not included.', dress: 'Casual. Light fabrics for tropical heat.', language: 'Spanish. English at international hotels.', etiquette: 'Friendly culture. "Buenas" is a casual all-purpose greeting.', currency: 'USD (legal tender) and PAB. Cards widely accepted.' },
  'perth': { tipping: 'Not expected. Round up for great service.', dress: 'Very casual. Beach culture strong.', language: 'English.', etiquette: 'Relaxed and friendly. BBQ culture in parks.', currency: 'AUD. Contactless/tap-and-go everywhere.' },
  'philadelphia': { tipping: '18-20% at restaurants.', dress: 'Casual. Smart casual for Center City dining.', language: 'English. Growing immigrant communities.', etiquette: 'Don\'t skip the cheesesteak debate — Pat\'s vs. Geno\'s. Passionate sports fans.', currency: 'USD. Cards accepted everywhere.' },
  'phnom penh': { tipping: 'Not expected. $1-2 appreciated at restaurants.', dress: 'Light, modest clothing. Cover up at temples.', language: 'Khmer. English and French in tourist areas.', etiquette: 'Visit the Killing Fields respectfully. Remove shoes at temples.', currency: 'USD widely used alongside KHR. Carry small USD bills.' },
  'phoenix': { tipping: '18-20% at restaurants.', dress: 'Casual. Sun protection essential — hats and sunscreen.', language: 'English. Spanish widely spoken.', etiquette: 'Hydrate constantly in extreme heat. Desert hiking requires preparation.', currency: 'USD. Cards accepted everywhere.' },
  'pittsburgh': { tipping: '18-20% at restaurants.', dress: 'Casual. Steelers gear is always appropriate.', language: 'English. "Yinz" is the local second-person plural.', etiquette: 'Bridge city — embrace the geography. Pierogies are a food group.', currency: 'USD. Cards accepted everywhere.' },
  'portland': { tipping: '18-20% at restaurants.', dress: 'Very casual. Flannel, rain gear, and sustainable fashion.', language: 'English.', etiquette: '"Keep Portland Weird." Support local and independent businesses.', currency: 'USD. Cards accepted everywhere; no sales tax in Oregon.' },
  'porto': { tipping: 'Round up or 5-10% at restaurants.', dress: 'Casual. Comfortable shoes for steep hills.', language: 'Portuguese. English widely spoken in the center.', etiquette: 'Port wine tasting is a must. Don\'t compare Porto to Lisbon.', currency: 'EUR. Cards widely accepted.' },
  'prague': { tipping: '10% at restaurants. Round up for drinks.', dress: 'Smart casual. Comfortable shoes for cobblestones.', language: 'Czech. English widely spoken in tourist areas.', etiquette: 'Watch for tourist traps in Old Town. Czech beer is the best and cheapest.', currency: 'CZK. Cards accepted, but carry some crowns for small spots.' },
  'punta cana': { tipping: '$1-5 USD per service at resorts. 10-15% at restaurants.', dress: 'Beach and resort casual.', language: 'Spanish. English spoken at resorts.', etiquette: 'All-inclusive culture — but tip the staff anyway. They remember.', currency: 'DOP. USD widely accepted at resorts.' },
  'quebec city': { tipping: '15-20% at restaurants.', dress: 'Smart casual. Heavy winter gear for brutal cold seasons.', language: 'French. English understood but French strongly preferred.', etiquette: 'Speak French or attempt it — it\'s deeply appreciated. Rich colonial history.', currency: 'CAD. Cards/contactless accepted everywhere.' },
  'queenstown': { tipping: 'Not expected. 10% for exceptional service.', dress: 'Outdoor adventure wear. Layers for mountain weather.', language: 'English and Te Reo Maori.', etiquette: 'Adventure capital — respect nature and follow safety guidelines.', currency: 'NZD. Cards/contactless widely accepted.' },
  'quito': { tipping: '10% often included. Extra tip appreciated.', dress: 'Layers — altitude makes it cool. Comfortable shoes for the old town.', language: 'Spanish. Quechua in rural areas. Limited English.', etiquette: 'Greet with a cheek kiss. Altitude sickness is common — take it slow.', currency: 'USD (official currency). Cash preferred at markets.' },
  'riyadh': { tipping: '10-15% at restaurants if not included.', dress: 'Modest. Cover shoulders and knees.', language: 'Arabic. English spoken in business settings.', etiquette: 'No alcohol. Respect prayer times — shops close briefly.', currency: 'SAR. Cards widely accepted.' },
  'san antonio': { tipping: '18-20% at restaurants.', dress: 'Casual. Light fabrics for Texas heat.', language: 'English and Spanish equally prominent.', etiquette: 'River Walk is central to the culture. Respect the Alamo as sacred ground.', currency: 'USD. Cards accepted everywhere.' },
  'san diego': { tipping: '18-20% at restaurants.', dress: 'Casual beach culture. Flip-flops year-round.', language: 'English. Spanish very common near the border.', etiquette: 'Laid-back SoCal vibes. Craft beer culture is huge.', currency: 'USD. Cards accepted everywhere.' },
  'san francisco': { tipping: '18-20% at restaurants.', dress: 'Layers — fog makes it cold even in summer.', language: 'English. Mandarin and Spanish widely spoken.', etiquette: 'Tech culture pervasive. Don\'t call it "San Fran" or "Frisco."', currency: 'USD. Cards accepted everywhere.' },
  'san jose': { tipping: '10% at restaurants if not included.', dress: 'Casual. Light layers for the Central Valley climate.', language: 'Spanish. English at tourist hotels.', etiquette: '"Pura Vida" is a way of life — go with the flow. Ticos are friendly.', currency: 'CRC. USD accepted at tourist spots.' },
  'san juan': { tipping: '15-20% at restaurants.', dress: 'Casual resort wear. Smart casual for nicer Old San Juan spots.', language: 'Spanish and English.', etiquette: 'Salsa music and dance culture. Old San Juan cobblestones require good shoes.', currency: 'USD. Cards accepted everywhere.' },
  'santiago': { tipping: '10% at restaurants (propina usually suggested).', dress: 'Smart casual. Layers for temperature swings.', language: 'Spanish. Limited English.', etiquette: 'Greet with a single cheek kiss. Lunch is the main meal.', currency: 'CLP. Cards widely accepted.' },
  'santorini': { tipping: 'Round up or 5-10% at restaurants.', dress: 'Casual resort wear. Comfortable shoes for steep paths.', language: 'Greek. English widely spoken in tourist areas.', etiquette: 'Book sunset spots early. Respect the donkeys — consider walking the steps instead.', currency: 'EUR. Cards accepted at most places; cash at small shops.' },
  'santo domingo': { tipping: '10-15% if not included (propina legal is 10%).', dress: 'Casual. Light fabrics for tropical heat.', language: 'Spanish. Limited English.', etiquette: 'Friendly culture. Merengue and bachata are part of daily life.', currency: 'DOP. USD accepted at tourist areas.' },
  'sao paulo': { tipping: '10% usually included (gorjeta).', dress: 'Smart casual. Paulistanos dress well for going out.', language: 'Portuguese. Limited English.', etiquette: 'Biggest city in South America — plan for traffic. Food scene is world-class.', currency: 'BRL. Cards accepted at restaurants; Pix digital payments growing.' },
  'savannah': { tipping: '18-20% at restaurants.', dress: 'Smart casual. Southern charm with a vintage flair.', language: 'English. Gullah-Geechee heritage along the coast.', etiquette: 'Southern hospitality reigns. Open containers are legal in the Historic District.', currency: 'USD. Cards accepted everywhere.' },
  'seattle': { tipping: '18-20% at restaurants.', dress: 'Casual layers. Rain jacket more useful than an umbrella.', language: 'English. Diverse multilingual communities.', etiquette: 'Coffee culture is sacred. Don\'t confuse the original Starbucks with good local roasters.', currency: 'USD. Cards accepted everywhere.' },
  'seville': { tipping: 'Not expected. Round up or small change.', dress: 'Smart casual. Dress up for flamenco shows.', language: 'Spanish. Limited English.', etiquette: 'Siesta is real — shops close 2-5 PM. Tapas culture is social, not a quick meal.', currency: 'EUR. Cards accepted, carry cash for tapas bars.' },
  'shanghai': { tipping: 'Not expected and often refused.', dress: 'Smart casual. Cosmopolitan and fashion-forward city.', language: 'Mandarin (Shanghainese locally). English limited.', etiquette: 'Download WeChat before arriving — it\'s essential. Toast with "Ganbei."', currency: 'CNY. WeChat Pay and Alipay dominate; cash declining.' },
  'siem reap': { tipping: '$1-2 appreciated. Tip Angkor guides well.', dress: 'Light, modest clothing. Cover shoulders and knees at temples.', language: 'Khmer. English widely spoken in tourist areas.', etiquette: 'Rise early for Angkor Wat sunrise. Respect sacred sites — don\'t climb on ruins.', currency: 'USD widely used. Riel for small change under $1.' },
  'st. louis': { tipping: '18-20% at restaurants.', dress: 'Casual. Comfortable shoes for the Arch grounds.', language: 'English.', etiquette: 'BBQ and toasted ravioli are local staples. Cardinals baseball is a religion.', currency: 'USD. Cards accepted everywhere.' },
  'st. lucia': { tipping: '10-15% at restaurants if not included.', dress: 'Beach casual at resorts. Cover up in Castries town.', language: 'English. Kweyol (French Creole) spoken locally.', etiquette: 'Warm and friendly. Greet people before asking questions.', currency: 'XCD. USD widely accepted at resorts.' },
  'stockholm': { tipping: 'Service included. Round up for good service.', dress: 'Smart casual. Scandinavian minimalist style.', language: 'Swedish. Excellent English spoken by nearly everyone.', etiquette: 'Respect personal space. Fika (coffee break) is a beloved daily ritual.', currency: 'SEK. Almost cashless — cards/contactless everywhere.' },
  'sydney': { tipping: 'Not expected. 10% for great service at restaurants.', dress: 'Casual. Beach culture strong. Smart casual for dining.', language: 'English. Highly multicultural.', etiquette: 'Slip-slop-slap for sun protection. Don\'t swim outside flagged areas.', currency: 'AUD. Contactless/tap-and-go everywhere.' },
  'taipei': { tipping: 'Not expected. Service charge included at nicer restaurants.', dress: 'Casual. Light fabrics for humidity. Cover up at temples.', language: 'Mandarin. Some English in tourist areas.', etiquette: 'Night markets are essential. Don\'t stick chopsticks upright in rice.', currency: 'TWD. Cash at night markets; cards at restaurants and shops.' },
  'tampa': { tipping: '18-20% at restaurants.', dress: 'Casual. Beach and resort wear.', language: 'English. Spanish widely spoken.', etiquette: 'Cuban culture strong in Ybor City. Cigar culture has deep roots.', currency: 'USD. Cards accepted everywhere.' },
  'tel aviv': { tipping: '10-15% at restaurants.', dress: 'Very casual. Beach to bar culture.', language: 'Hebrew. English widely spoken.', etiquette: 'Shabbat (Friday sunset to Saturday night) — many places close. Direct communication style.', currency: 'ILS. Cards widely accepted.' },
  'toronto': { tipping: '15-20% at restaurants.', dress: 'Casual to smart casual. Heavy winter gear needed.', language: 'English. French, Mandarin, Cantonese, and many others.', etiquette: 'Multicultural and polite. Don\'t compare to American cities.', currency: 'CAD. Cards/contactless accepted everywhere.' },
  'trinidad': { tipping: '10-15% at restaurants.', dress: 'Casual. Respectful dress away from beaches.', language: 'English. Trinidad Creole and Hindi also spoken.', etiquette: 'Carnival is the biggest cultural event. Soca and calypso music everywhere.', currency: 'TTD. USD accepted at some tourist spots.' },
  'tulum': { tipping: '10-15% at restaurants. Pesos preferred over USD.', dress: 'Beach boho casual. Eco-chic is the Tulum aesthetic.', language: 'Spanish. English widely spoken in tourist zone.', etiquette: 'Eco-conscious culture. Respect cenotes — no sunscreen before swimming.', currency: 'MXN. USD accepted but you\'ll get better rates with pesos.' },
  'vancouver': { tipping: '15-20% at restaurants.', dress: 'Casual outdoors. Rain gear essential. Athleisure is the uniform.', language: 'English. Mandarin, Cantonese, and Punjabi widely spoken.', etiquette: 'Outdoor culture — hiking and biking year-round. Very environmentally conscious.', currency: 'CAD. Cards/contactless accepted everywhere.' },
  'venice': { tipping: 'Round up the bill. Coperto is standard.', dress: 'Smart casual. Comfortable waterproof shoes for acqua alta.', language: 'Italian (Venetian dialect). English at tourist sites.', etiquette: 'Don\'t swim in the canals. Don\'t sit on bridges to eat.', currency: 'EUR. Cash at smaller vendors; cards at restaurants.' },
  'vienna': { tipping: '5-10% at restaurants. Round up for taxis.', dress: 'Smart casual to formal for concerts and opera.', language: 'German. English widely spoken.', etiquette: 'Coffee house culture — linger and enjoy. Address people formally until invited not to.', currency: 'EUR. Cards widely accepted.' },
  'warsaw': { tipping: '10% at restaurants.', dress: 'Smart casual. Comfortable shoes for the rebuilt Old Town.', language: 'Polish. English widely spoken by younger people.', etiquette: 'Rich history — visit WWII memorials respectfully. Vodka culture is alive and well.', currency: 'PLN. Cards widely accepted.' },
  'washington': { tipping: '18-20% at restaurants.', dress: 'Smart casual. Business attire in government areas.', language: 'English. Diverse multilingual communities.', etiquette: 'Museums are mostly free. Stand right, walk left on escalators — it\'s the law of Metro.', currency: 'USD. Cards accepted everywhere.' },
  'zanzibar': { tipping: '10% at restaurants. Tip guides and boat crews.', dress: 'Modest. Cover shoulders and knees in Stone Town.', language: 'Swahili and English. Arabic influence.', etiquette: 'Respect local Muslim culture. Ask before photographing people.', currency: 'TZS. Cash essential; USD accepted at tourist spots.' },
  'zurich': { tipping: 'Service included. Round up for good service.', dress: 'Smart casual. Swiss dress neatly.', language: 'German (Swiss German). English widely spoken.', etiquette: 'Punctuality is paramount. Quiet hours are taken seriously.', currency: 'CHF. Cards/contactless widely accepted. Very expensive city.' },
};

const EMERGENCY_BY_COUNTRY: Record<string, { police: string; emergency: string }> = {
  'USA': { police: '911', emergency: '911' },
  'Canada': { police: '911', emergency: '911' },
  'Mexico': { police: '911', emergency: '911' },
  'Puerto Rico': { police: '911', emergency: '911' },
  'UK': { police: '999', emergency: '112' },
  'France': { police: '17', emergency: '112' },
  'Spain': { police: '091', emergency: '112' },
  'Italy': { police: '113', emergency: '112' },
  'Portugal': { police: '112', emergency: '112' },
  'Netherlands': { police: '112', emergency: '112' },
  'Germany': { police: '110', emergency: '112' },
  'Nigeria': { police: '199', emergency: '112' },
  'Ghana': { police: '191', emergency: '112' },
  'South Africa': { police: '10111', emergency: '112' },
  'Kenya': { police: '999', emergency: '112' },
  'Morocco': { police: '19', emergency: '15' },
  'UAE': { police: '999', emergency: '998' },
  'Japan': { police: '110', emergency: '119' },
  'Thailand': { police: '191', emergency: '1669' },
  'Singapore': { police: '999', emergency: '995' },
  'South Korea': { police: '112', emergency: '119' },
  'Indonesia': { police: '110', emergency: '118' },
  'Australia': { police: '000', emergency: '000' },
  'Brazil': { police: '190', emergency: '192' },
  'Argentina': { police: '101', emergency: '107' },
};

// ============================================================================
// SVG ICONS
// ============================================================================

const HomeIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="hg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#F59E0B" /><stop offset="100%" stopColor="#FBBF24" /></linearGradient></defs>
    <path d="M3 10.5L12 3L21 10.5V20C21 20.5523 20.5523 21 20 21H15V15C15 14.4477 14.5523 14 14 14H10C9.44772 14 9 14.4477 9 15V21H4C3.44772 21 3 20.5523 3 20V10.5Z"
      stroke={active ? "url(#hg)" : "#78716C"} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
      fill={active ? "rgba(245,158,11,0.15)" : "none"} />
  </svg>
);

const DiscoverIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="eg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#F59E0B" /><stop offset="100%" stopColor="#FBBF24" /></linearGradient></defs>
    <circle cx="11" cy="11" r="7" stroke={active ? "url(#eg)" : "#78716C"} strokeWidth="1.75" fill={active ? "rgba(245,158,11,0.1)" : "none"} />
    <path d="M21 21L16.5 16.5" stroke={active ? "url(#eg)" : "#78716C"} strokeWidth="1.75" strokeLinecap="round" />
  </svg>
);

const EventsIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="evi" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#F59E0B" /><stop offset="100%" stopColor="#FBBF24" /></linearGradient></defs>
    <rect x="3" y="4" width="18" height="17" rx="2" stroke={active ? "url(#evi)" : "#78716C"} strokeWidth="1.75" fill={active ? "rgba(245,158,11,0.1)" : "none"} />
    <path d="M3 9H21" stroke={active ? "url(#evi)" : "#78716C"} strokeWidth="1.5" />
    <path d="M8 2V5" stroke={active ? "url(#evi)" : "#78716C"} strokeWidth="1.75" strokeLinecap="round" />
    <path d="M16 2V5" stroke={active ? "url(#evi)" : "#78716C"} strokeWidth="1.75" strokeLinecap="round" />
    <circle cx="12" cy="15" r="2" fill={active ? "url(#evi)" : "#78716C"} />
  </svg>
);

const PlanIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#F59E0B" /><stop offset="100%" stopColor="#FBBF24" /></linearGradient></defs>
    <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15" stroke={active ? "url(#pg)" : "#78716C"} strokeWidth="1.75" strokeLinecap="round" />
    <rect x="9" y="3" width="6" height="4" rx="1" stroke={active ? "url(#pg)" : "#78716C"} strokeWidth="1.5" fill={active ? "rgba(245,158,11,0.15)" : "none"} />
    <path d="M9 12L11 14L15 10" stroke={active ? "url(#pg)" : "#78716C"} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DirectionsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="3 11 22 2 13 21 11 13 3 11" />
  </svg>
);

const PhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const ShareIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

const LocationIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
  </svg>
);

const GearIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#78716C" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const WebsiteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#78716C" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

// ============================================================================
// VIBE + FILTER DEFINITIONS
// ============================================================================

const VIBES: { id: Vibe; emoji: string; label: string }[] = [
  { id: 'food', emoji: '🍽️', label: 'Food & Drinks' },
  { id: 'stay', emoji: '🏨', label: 'Places to Stay' },
  { id: 'todo', emoji: '🎭', label: 'Things to Do' },
  { id: 'hidden', emoji: '💎', label: 'Hidden Gems' },
];

const QUICK_FILTERS: { id: QuickFilter; label: string }[] = [
  { id: 'open', label: 'Open Now' },
  { id: 'walking', label: 'Walking Distance' },
  { id: 'topRated', label: 'Top Rated' },
  { id: 'budget', label: 'Budget' },
  { id: 'family', label: 'Family Friendly' },
  { id: 'solo', label: 'Solo Friendly' },
];

// ============================================================================
// SHARED STYLES
// ============================================================================

const cardStyle: React.CSSProperties = {
  background: 'rgba(28, 25, 23, 0.8)',
  backdropFilter: 'blur(20px)',
  borderRadius: '16px',
  padding: '16px',
  marginBottom: '12px',
  border: '1px solid rgba(255,255,255,0.06)',
};

// ============================================================================
// MAIN APP
// ============================================================================

export default function App() {
  // --- Core state ---
  const [screen, setScreenRaw] = useState<Screen>(() => {
    return (sessionStorage.getItem('nxstops_screen') as Screen) || 'home';
  });
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCityRaw] = useState<City | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedVibe, setSelectedVibe] = useState<Vibe | null>(null);
  const [quickFilters, setQuickFilters] = useState<QuickFilter[]>(['open']);
  const [tripDays, setTripDays] = useState<Record<number, Stop[]>>({ 1: [] });
  const [activeDay, setActiveDay] = useState(1);
  const [loading, setLoading] = useState(true);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [useGps, setUseGpsRaw] = useState(() => sessionStorage.getItem('nxstops_use_gps') === 'true');
  const [searchRadius, setSearchRadius] = useState(1500);

  // --- Modals ---
  const [surprisePlace, setSurprisePlace] = useState<Place | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  // --- Safety ---
  const [showSafety, setShowSafety] = useState(false);

  // --- Auth ---
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authScreen, setAuthScreen] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // --- Admin ---
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminSignups, setAdminSignups] = useState<AdminSignup[]>([]);
  const [adminCities, setAdminCities] = useState<City[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminTab, setAdminTab] = useState<'dashboard' | 'signups' | 'cities'>('dashboard');

  // --- Events ---
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  // --- Map ---
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [activeMapPin, setActiveMapPin] = useState<string | null>(null);
  const [activeEventPin, setActiveEventPin] = useState<string | null>(null);

  // --- Events View ---
  const [eventsViewMode, setEventsViewMode] = useState<'list' | 'map'>('list');
  const [eventCategoryFilter, setEventCategoryFilter] = useState('all');

  // --- Place Detail Gallery ---
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const galleryRef = useRef<HTMLDivElement>(null);

  // --- Toast ---
  const [toast, setToast] = useState<string | null>(null);

  // --- Weather ---
  const [weather, setWeather] = useState<{ temp: number; high: number; low: number; code: number; description: string; emoji: string; forecast: { date: string; high: number; low: number; code: number; emoji: string; description: string; precipChance: number }[] } | null>(null);

  // --- Offline ---
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // --- Persisted setters ---
  const setScreen = useCallback((s: Screen) => {
    setScreenRaw(s);
    sessionStorage.setItem('nxstops_screen', s);
  }, []);

  const setSelectedCity = useCallback((city: City | null) => {
    setSelectedCityRaw(city);
    if (city) sessionStorage.setItem('nxstops_selected_city', JSON.stringify(city));
    else sessionStorage.removeItem('nxstops_selected_city');
  }, []);

  const setUseGps = useCallback((v: boolean) => {
    setUseGpsRaw(v);
    sessionStorage.setItem('nxstops_use_gps', String(v));
  }, []);

  // --- Travel Group ---
  const [travelGroup, setTravelGroup] = useState<TravelGroup | null>(() => {
    return (sessionStorage.getItem('nxstops_travel_group') as TravelGroup) || null;
  });

  // --- Cultural Context ---
  const [showCulture, setShowCulture] = useState(false);

  // --- Community ---
  const [communityFilters, setCommunityFilters] = useState<CommunityTag[]>([]);
  const [placeTagsCache, setPlaceTagsCache] = useState<Record<string, Record<string, number>>>({});

  // --- Reviews ---
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewTags, setReviewTags] = useState<CommunityTag[]>([]);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [placeReviews, setPlaceReviews] = useState<Review[]>([]);

  // --- Search ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // --- Onboarding ---
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('nxstops_onboarded'));
  const [onboardingStep, setOnboardingStep] = useState(0);

  // --- Crew Mode ---
  const [crewMode, setCrewMode] = useState(() => sessionStorage.getItem('nxstops_crew_mode') === 'true');
  const [crewCode, setCrewCode] = useState<string | null>(() => sessionStorage.getItem('nxstops_crew_code'));
  const [crewSyncing, setCrewSyncing] = useState(false);
  const [joinCrewInput, setJoinCrewInput] = useState('');
  const [showJoinCrew, setShowJoinCrew] = useState(false);
  const crewChannelRef = useRef<RealtimeChannel | null>(null);
  const crewSyncLock = useRef(false); // Prevent sync loops

  // --- Saved / Bookmarks ---
  const [savedPlaces, setSavedPlaces] = useState<Place[]>(() => {
    try {
      const saved = localStorage.getItem('nxstops_saved_places');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // --- Push Notifications ---
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(
    () => sessionStorage.getItem('nxstops_notif_dismissed') !== 'true'
  );

  // --- Profile ---
  const [showProfile, setShowProfile] = useState(false);

  const loc = useLocation();

  // Derived: active day plan (backwards compat)
  const dayPlan = tripDays[activeDay] || [];
  const totalStops = Object.values(tripDays).reduce((sum, stops) => sum + stops.length, 0);
  const dayCount = Object.keys(tripDays).length;

  const setActiveDayStops = useCallback((updater: Stop[] | ((prev: Stop[]) => Stop[])) => {
    setTripDays(prev => ({
      ...prev,
      [activeDay]: typeof updater === 'function' ? updater(prev[activeDay] || []) : updater,
    }));
  }, [activeDay]);

  // --------------------------------------------------------------------------
  // HELPERS
  // --------------------------------------------------------------------------

  const getPlanKey = useCallback(() => {
    if (useGps && loc.city) return `nxstops_plan_gps_${loc.city.toLowerCase().replace(/\s+/g, '_')}`;
    if (selectedCity) return `nxstops_plan_${selectedCity.name.toLowerCase().replace(/\s+/g, '_')}`;
    return 'nxstops_plan_default';
  }, [useGps, loc.city, selectedCity]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  // Request push notification permission and subscribe
  const requestNotificationPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return;
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        // Subscribe to push via the service worker
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
          });
          console.log('[NxStops] Push subscription:', JSON.stringify(subscription));
        }
        showToast('Notifications enabled!');
      }
    } catch (err) {
      console.error('[NxStops] Notification permission error:', err);
    }
  }, [showToast]);

  // Dismiss notification prompt
  const dismissNotificationPrompt = useCallback(() => {
    setShowNotificationPrompt(false);
    sessionStorage.setItem('nxstops_notif_dismissed', 'true');
  }, []);

  const userName = user?.user_metadata?.full_name
    ? (user.user_metadata.full_name as string).split(' ')[0]
    : null;

  const getGreeting = (): string => {
    const h = currentTime.getHours();
    const name = userName ? `, ${userName}` : '';
    if (h < 12) return `Good morning${name}`;
    if (h < 17) return `Good afternoon${name}`;
    if (h < 21) return `Good evening${name}`;
    return `Good night${name}`;
  };

  const getTimeSuggestion = (): string => {
    const h = currentTime.getHours();
    if (h >= 6 && h < 11) return 'Perfect time for coffee & brunch';
    if (h >= 11 && h < 14) return 'Lunch spots & afternoon vibes';
    if (h >= 14 && h < 17) return 'Explore something new nearby';
    if (h >= 17 && h < 21) return 'Dinner & evening plans await';
    return 'Late night spots still open';
  };

  const cityLabel = useGps ? (loc.city || 'Near You') : (selectedCity?.name || '');
  const citySlug = useGps ? (loc.city || '').toLowerCase().replace(/\s+/g, '-') : (selectedCity?.slug || '');

  // Safety indicators
  const getSafetyIndicators = (place: Place): string[] => {
    const indicators: string[] = [];
    if (place.rating >= 4.3 && place.reviewCount >= 100) indicators.push('Well-reviewed');
    if (place.reviewCount >= 500) indicators.push('Popular spot');
    if (NIGHTLIFE_TYPES.includes(place.category)) indicators.push('Night venue');
    if ((isReservable(place) || isBookable(place)) && place.rating >= 4.0) indicators.push('Reserve ahead');
    return indicators;
  };

  // Use miles for USA cities, km for everywhere else
  const useMiles = selectedCity?.country === 'USA' || selectedCity?.country === 'United States';

  // Distance reference
  const getDistanceReference = (): string => {
    if (useGps && loc.hasLocation) return 'from you';
    if (selectedCity) return `from ${selectedCity.name} center`;
    return '';
  };

  // Transport between stops
  const getTransportInfo = (fromStop: Stop, toStop: Stop): { emoji: string; text: string; distance: string; mapsUrl: string } | null => {
    let fromLat: number | undefined, fromLng: number | undefined, toLat: number | undefined, toLng: number | undefined;
    if (fromStop.type === 'place' && fromStop.place) { fromLat = fromStop.place.lat; fromLng = fromStop.place.lng; }
    else if (fromStop.type === 'event' && fromStop.event?.lat) { fromLat = fromStop.event.lat ?? undefined; fromLng = fromStop.event.lng ?? undefined; }
    if (toStop.type === 'place' && toStop.place) { toLat = toStop.place.lat; toLng = toStop.place.lng; }
    else if (toStop.type === 'event' && toStop.event?.lat) { toLat = toStop.event.lat ?? undefined; toLng = toStop.event.lng ?? undefined; }
    if (!fromLat || !fromLng || !toLat || !toLng) return null;
    const R = 6371;
    const dLat = ((toLat - fromLat) * Math.PI) / 180;
    const dLng = ((toLng - fromLng) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((fromLat * Math.PI) / 180) * Math.cos((toLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const mapsUrl = `https://www.google.com/maps/dir/${fromLat},${fromLng}/${toLat},${toLng}`;
    const distStr = (d: number) => {
      if (useMiles) { const mi = d * 0.621371; return mi < 0.5 ? `${mi.toFixed(1)} mi` : `${Math.round(mi * 10) / 10} mi`; }
      return d < 2 ? `${d.toFixed(1)} km` : `${Math.round(d)} km`;
    };
    if (km < 0.5) return { emoji: '🚶', text: '~5 min walk', distance: useMiles ? `${Math.round(km * 3281)}ft` : `${Math.round(km * 1000)}m`, mapsUrl };
    if (km < 1.5) return { emoji: '🚶🚕', text: `${Math.round(km * 12)} min walk or quick ride`, distance: distStr(km), mapsUrl };
    if (km < 5) return { emoji: '🚇🚕', text: 'Transit or ride recommended', distance: distStr(km), mapsUrl };
    return { emoji: '🚗🚕', text: 'Drive or ride needed', distance: distStr(km), mapsUrl };
  };

  // --------------------------------------------------------------------------
  // EFFECTS
  // --------------------------------------------------------------------------

  // Online/offline detection
  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Check notification permission on mount
  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Auth session
  useEffect(() => {
    authGetSession().then(session => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = authOnStateChange(session => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load cities + restore saved city
  useEffect(() => {
    (async () => {
      const data = await fetchCities();
      setCities(data);
      // Restore saved city from sessionStorage
      try {
        const savedCity = sessionStorage.getItem('nxstops_selected_city');
        if (savedCity) {
          const parsed = JSON.parse(savedCity);
          const match = data.find((c: City) => c.id === parsed.id);
          if (match) setSelectedCityRaw(match);
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  // Auto-GPS (only if no saved state)
  useEffect(() => {
    if (loc.hasLocation && !selectedCity && !sessionStorage.getItem('nxstops_selected_city') && !sessionStorage.getItem('nxstops_use_gps')) {
      setUseGps(true);
    }
  }, [loc.hasLocation, selectedCity]);

  // Fetch weather when city/GPS changes
  useEffect(() => {
    let lat: number | undefined, lng: number | undefined;
    if (useGps && loc.lat && loc.lng) { lat = loc.lat; lng = loc.lng; }
    else if (selectedCity) {
      const c = CITY_COORDS[selectedCity.name.toLowerCase()];
      if (c) { lat = c.lat; lng = c.lng; }
    }
    if (!lat || !lng) { setWeather(null); return; }
    const fetchWeather = async () => {
      try {
        const resp = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weathercode&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max&timezone=auto&forecast_days=10&temperature_unit=fahrenheit`
        );
        if (!resp.ok) return;
        const data = await resp.json();
        const code = data.current?.weathercode ?? 0;
        const wInfo = WEATHER_CODES[code] || { emoji: '🌡️', description: 'Unknown' };
        const forecast = (data.daily?.time || []).map((date: string, i: number) => {
          const dayCode = data.daily.weathercode[i] ?? 0;
          const dInfo = WEATHER_CODES[dayCode] || { emoji: '🌡️', description: 'Unknown' };
          return {
            date,
            high: Math.round(data.daily.temperature_2m_max[i]),
            low: Math.round(data.daily.temperature_2m_min[i]),
            code: dayCode,
            emoji: dInfo.emoji,
            description: dInfo.description,
            precipChance: data.daily.precipitation_probability_max?.[i] ?? 0,
          };
        });
        setWeather({
          temp: Math.round(data.current.temperature_2m),
          high: Math.round(data.daily.temperature_2m_max[0]),
          low: Math.round(data.daily.temperature_2m_min[0]),
          code,
          description: wInfo.description,
          emoji: wInfo.emoji,
          forecast,
        });
      } catch { /* weather is non-critical */ }
    };
    fetchWeather();
  }, [useGps, loc.lat, loc.lng, selectedCity]);

  // Load saved plan (city-isolated, multi-day)
  useEffect(() => {
    try {
      const key = getPlanKey();
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.expires > Date.now()) {
          // Multi-day format
          if (parsed.tripDays) {
            const loaded: Record<number, Stop[]> = {};
            for (const [day, stops] of Object.entries(parsed.tripDays)) {
              loaded[Number(day)] = (stops as Stop[]).map(s => ({ ...s, type: s.type || 'place', addedAt: new Date(s.addedAt) }));
            }
            setTripDays(loaded);
          // Legacy single-day format → migrate to Day 1
          } else if (parsed.stops) {
            const migrated = parsed.stops.map((s: Stop) => ({ ...s, type: s.type || 'place', addedAt: new Date(s.addedAt) }));
            setTripDays({ 1: migrated });
          }
          setActiveDay(1);
        } else {
          localStorage.removeItem(key);
          setTripDays({ 1: [] });
        }
      } else {
        setTripDays({ 1: [] });
      }
    } catch { setTripDays({ 1: [] }); }
  }, [getPlanKey]);

  // Save plan (city-isolated, multi-day)
  useEffect(() => {
    const key = getPlanKey();
    if (totalStops > 0) {
      localStorage.setItem(key, JSON.stringify({ tripDays, expires: Date.now() + 7 * 24 * 60 * 60 * 1000 }));
    } else {
      localStorage.removeItem(key);
    }
  }, [tripDays, totalStops, getPlanKey]);

  // Persist travel group in sessionStorage
  useEffect(() => {
    if (travelGroup) sessionStorage.setItem('nxstops_travel_group', travelGroup);
    else sessionStorage.removeItem('nxstops_travel_group');
  }, [travelGroup]);

  // Persist saved places to localStorage
  useEffect(() => {
    localStorage.setItem('nxstops_saved_places', JSON.stringify(savedPlaces));
  }, [savedPlaces]);

  // Load community tags when places change
  useEffect(() => {
    if (places.length === 0) return;
    const ids = places.map(p => p.placeId);
    fetchPlaceTagCounts(ids).then(setPlaceTagsCache);
  }, [places]);

  // Load reviews when selectedPlace changes
  useEffect(() => {
    if (!selectedPlace) { setPlaceReviews([]); setShowReviewForm(false); return; }
    setActivePhotoIndex(0);
    fetchReviews(selectedPlace.placeId).then(setPlaceReviews);
  }, [selectedPlace]);

  // Clock
  useEffect(() => {
    const i = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(i);
  }, []);

  // Crew mode: subscribe to realtime updates
  useEffect(() => {
    if (!crewMode || !crewCode) {
      if (crewChannelRef.current) {
        unsubscribeFromCrewTrip(crewChannelRef.current);
        crewChannelRef.current = null;
      }
      return;
    }
    const channel = subscribeToCrewTrip(crewCode, (remoteDays) => {
      if (crewSyncLock.current) return; // Skip if we're the one who updated
      crewSyncLock.current = true;
      // Parse remote days back into Stop format with Date objects
      const parsed: Record<number, Stop[]> = {};
      for (const [day, stops] of Object.entries(remoteDays)) {
        parsed[Number(day)] = (stops as Stop[]).map(s => ({
          ...s,
          addedAt: new Date(s.addedAt),
        }));
      }
      setTripDays(parsed);
      setTimeout(() => { crewSyncLock.current = false; }, 1000);
    });
    crewChannelRef.current = channel;
    return () => {
      unsubscribeFromCrewTrip(channel);
      crewChannelRef.current = null;
    };
  }, [crewMode, crewCode]);

  // Crew mode: sync local changes to Supabase
  useEffect(() => {
    if (!crewMode || !crewCode || crewSyncLock.current) return;
    const timer = setTimeout(() => {
      updateCrewTripDays(crewCode, tripDays);
    }, 500); // Debounce 500ms
    return () => clearTimeout(timer);
  }, [tripDays, crewMode, crewCode]);

  // Fetch places
  const fetchPlaces = useCallback(async () => {
    let lat: number | undefined;
    let lng: number | undefined;
    if (useGps && loc.lat && loc.lng) { lat = loc.lat; lng = loc.lng; }
    else if (selectedCity) {
      const c = CITY_COORDS[selectedCity.name.toLowerCase()];
      if (c) { lat = c.lat; lng = c.lng; }
    }
    if (!lat || !lng) return;
    setPlacesLoading(true);
    const vibes = selectedVibe ? [selectedVibe] : [];
    const results = await searchNearby(lat, lng, vibes, searchRadius);
    setPlaces(results);
    setPlacesLoading(false);
  }, [useGps, loc.lat, loc.lng, selectedCity, selectedVibe, searchRadius]);

  useEffect(() => {
    if (screen === 'discover' && (useGps || selectedCity)) fetchPlaces();
  }, [screen, fetchPlaces]);

  // Fetch events
  const fetchEventsData = useCallback(async () => {
    let lat: number | undefined;
    let lng: number | undefined;
    if (useGps && loc.lat && loc.lng) { lat = loc.lat; lng = loc.lng; }
    else if (selectedCity) {
      const c = CITY_COORDS[selectedCity.name.toLowerCase()];
      if (c) { lat = c.lat; lng = c.lng; }
    }
    if (!lat || !lng) return;
    setEventsLoading(true);
    try {
      const params = new URLSearchParams({ lat: lat.toString(), lng: lng.toString(), radius: '25' });
      const response = await fetch(`/api/events?${params}`);
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch { /* events API may not be configured yet */ }
    setEventsLoading(false);
  }, [useGps, loc.lat, loc.lng, selectedCity]);

  useEffect(() => {
    if (screen === 'events' && (useGps || selectedCity)) {
      fetchEventsData();
    }
  }, [screen, fetchEventsData]);

  // --------------------------------------------------------------------------
  // FILTERED PLACES
  // --------------------------------------------------------------------------

  const filteredPlaces = places.filter(place => {
    // Quick filters
    for (const f of quickFilters) {
      switch (f) {
        case 'open': if (!place.openNow) return false; break;
        case 'walking': if (place.distance !== null && place.distance > 1) return false; break;
        case 'topRated': if (place.rating < 4.5) return false; break;
        case 'budget': if (place.priceLevel > 2 && place.priceLevel !== -1) return false; break;
        case 'family': if (NIGHTLIFE_TYPES.includes(place.category)) return false; if (place.rating > 0 && place.rating < 3.5) return false; break;
        case 'solo': if (place.reviewCount < 50) return false; if (place.rating > 0 && place.rating < 3.8) return false; break;
      }
    }
    // Travel group filter — curated per trip type
    if (travelGroup) {
      const nameLower = place.name.toLowerCase();
      const summaryLower = (place.editorialSummary || '').toLowerCase();
      const combined = nameLower + ' ' + summaryLower;
      switch (travelGroup) {
        case 'girls':
        case 'bachelorette': {
          // Prioritize girly, cute, aesthetic places — exclude gyms, auto shops, hardware stores
          if (['gym', 'church', 'library'].includes(place.category)) return false;
          // Boost: if it's a girly type OR has girly keywords, keep it; otherwise need good rating
          const isGirlyType = GIRLY_TYPES.includes(place.category);
          const hasGirlyVibe = GIRLY_KEYWORDS.some(kw => combined.includes(kw));
          if (!isGirlyType && !hasGirlyVibe && place.rating > 0 && place.rating < 4.0) return false;
          break;
        }
        case 'family': {
          // Exclude bars/clubs, require family-safe places with decent ratings
          if (NIGHTLIFE_TYPES.includes(place.category)) return false;
          if (place.rating > 0 && place.rating < 3.5) return false;
          break;
        }
        case 'boys':
        case 'friends': {
          // Exclude overly girly-coded places, prefer action/food/nightlife
          if (travelGroup === 'boys' && BOYS_EXCLUDE_TYPES.includes(place.category)) return false;
          if (['library', 'church'].includes(place.category)) return false;
          break;
        }
        case 'solo': {
          // Prefer well-reviewed, established places for safety
          if (place.reviewCount < 20) return false;
          if (place.rating > 0 && place.rating < 3.5) return false;
          break;
        }
        case 'couple': break; // All places fine for couples
      }
    }
    // Community tag filters
    if (communityFilters.length > 0) {
      // Check community-submitted tags first
      const tags = placeTagsCache[place.placeId];
      if (tags) {
        const hasMatch = communityFilters.some(f => (tags[f] || 0) >= 1);
        if (!hasMatch) return false;
      } else {
        // No community tags yet — use smart defaults based on place data
        const cat = place.category;
        const nameLower = place.name.toLowerCase();
        const catDisplay = place.categoryDisplay.toLowerCase();
        for (const filter of communityFilters) {
          let matches = false;
          switch (filter) {
            case 'kid-friendly':
              matches = ['park', 'playground', 'museum', 'zoo', 'aquarium', 'amusement_park', 'bowling_alley', 'movie_theater', 'ice_cream_shop', 'pizza_restaurant', 'library'].includes(cat)
                || /\b(kid|child|family|play|fun|arcade|trampoline|zoo|aquarium|disney|museum)\b/i.test(nameLower + ' ' + catDisplay);
              break;
            case 'baby-friendly':
              matches = ['park', 'cafe', 'coffee_shop', 'restaurant', 'shopping_mall', 'library', 'museum'].includes(cat)
                || /\b(family|cafe|coffee|park|garden|library)\b/i.test(nameLower + ' ' + catDisplay);
              break;
            case 'wheelchair-accessible':
              // Most commercial establishments are accessible — exclude hiking trails, rooftops, etc.
              matches = !(/\b(trail|hike|climb|rooftop|boat|kayak|surf)\b/i.test(nameLower + ' ' + catDisplay));
              break;
            case 'solo-friendly':
              matches = place.rating >= 4.0 && place.reviewCount >= 50
                && ['cafe', 'coffee_shop', 'restaurant', 'bar', 'park', 'museum', 'library', 'bookstore', 'art_gallery'].includes(cat);
              break;
            case 'lgbtq-friendly':
              // Can't determine from data — show well-reviewed, welcoming-vibe places
              matches = place.rating >= 4.0 && ['cafe', 'coffee_shop', 'bar', 'restaurant', 'art_gallery', 'bookstore', 'park', 'museum', 'night_club', 'spa'].includes(cat);
              break;
            default:
              // Identity-owned tags (black-owned, women-owned, etc.) — can't determine from Google data
              // Show all places so the filter doesn't hide everything
              matches = true;
              break;
          }
          if (!matches) return false;
        }
      }
    }
    return true;
  });

  // --------------------------------------------------------------------------
  // DAY PLAN HANDLERS
  // --------------------------------------------------------------------------

  const addToPlan = (place: Place) => {
    // Check across all days
    const allStops = Object.values(tripDays).flat();
    if (allStops.find(s => s.place?.placeId === place.placeId)) return;
    setActiveDayStops(prev => [...prev, { id: crypto.randomUUID(), type: 'place', place, addedAt: new Date() }]);
    showToast(`Added ${place.name} to Day ${activeDay}`);
  };

  const addEventToPlan = (event: EventItem) => {
    const allStops = Object.values(tripDays).flat();
    if (allStops.find(s => s.event?.id === event.id)) return;
    setActiveDayStops(prev => [...prev, { id: crypto.randomUUID(), type: 'event', event, addedAt: new Date() }]);
    showToast(`Added ${event.name} to Day ${activeDay}`);
  };

  const isEventInPlan = (eventId: string) => Object.values(tripDays).flat().some(s => s.event?.id === eventId);

  const removeFromPlan = (stopId: string) => {
    // Search all days
    setTripDays(prev => {
      const updated = { ...prev };
      for (const day of Object.keys(updated)) {
        updated[Number(day)] = updated[Number(day)].filter(s => s.id !== stopId);
      }
      return updated;
    });
  };

  const isInPlan = (placeId: string) => Object.values(tripDays).flat().some(s => s.place?.placeId === placeId);

  const clearPlan = () => {
    setTripDays({ 1: [] });
    setActiveDay(1);
    showToast('Plan cleared');
  };

  const movePlanStop = (index: number, direction: 'up' | 'down') => {
    const newPlan = [...dayPlan];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= newPlan.length) return;
    [newPlan[index], newPlan[target]] = [newPlan[target], newPlan[index]];
    setActiveDayStops(newPlan);
  };

  const addDay = () => {
    const nextDay = Math.max(...Object.keys(tripDays).map(Number)) + 1;
    setTripDays(prev => ({ ...prev, [nextDay]: [] }));
    setActiveDay(nextDay);
    showToast(`Day ${nextDay} added`);
  };

  const removeDay = (day: number) => {
    if (dayCount <= 1) return;
    setTripDays(prev => {
      const updated = { ...prev };
      delete updated[day];
      return updated;
    });
    if (activeDay === day) setActiveDay(Number(Object.keys(tripDays).find(d => Number(d) !== day) || 1));
    showToast(`Day ${day} removed`);
  };

  const moveStopToDay = (stopId: string, fromDay: number, toDay: number) => {
    setTripDays(prev => {
      const stop = prev[fromDay]?.find(s => s.id === stopId);
      if (!stop) return prev;
      return {
        ...prev,
        [fromDay]: prev[fromDay].filter(s => s.id !== stopId),
        [toDay]: [...(prev[toDay] || []), stop],
      };
    });
    showToast(`Moved to Day ${toDay}`);
  };

  const getStopName = (stop: Stop) => stop.type === 'event' ? (stop.event?.name || 'Event') : (stop.place?.name || 'Place');
  const getStopCategory = (stop: Stop) => stop.type === 'event' ? (stop.event?.category || 'Event') : (stop.place?.categoryDisplay || '');

  const getRouteUrl = () => {
    if (dayPlan.length === 0) return '';
    const points = dayPlan
      .filter(s => s.type === 'place' ? (s.place?.lat && s.place?.lng) : (s.event?.lat && s.event?.lng))
      .map(s => s.type === 'place' ? `${s.place?.lat},${s.place?.lng}` : `${s.event?.lat},${s.event?.lng}`);
    if (points.length === 0) return '';
    return `https://www.google.com/maps/dir/${points.join('/')}`;
  };

  const sharePlan = async () => {
    const allDays = Object.entries(tripDays).sort(([a], [b]) => Number(a) - Number(b));
    const lines = allDays.map(([day, stops]) => {
      if (stops.length === 0) return '';
      const stopList = stops.map((s, i) => `  ${i + 1}. ${getStopName(s)} (${getStopCategory(s)})`).join('\n');
      return `Day ${day}:\n${stopList}`;
    }).filter(Boolean).join('\n\n');
    const summary = `My ${cityLabel} Trip Plan:\n\n${lines}\n\nPlanned with NxStops`;
    if (navigator.share) {
      await navigator.share({ title: `${cityLabel} Trip Plan`, text: summary });
    } else {
      await navigator.clipboard.writeText(summary);
      showToast('Plan copied to clipboard');
    }
  };

  // Review submission handler
  const handleSubmitReview = async () => {
    if (!selectedPlace || reviewRating === 0 || !user) return;
    setReviewSubmitting(true);
    const result = await saveReview(selectedPlace.placeId, citySlug, reviewRating, reviewText, reviewTags);
    if (result.success) {
      showToast('Review submitted!');
      setShowReviewForm(false);
      setReviewRating(0);
      setReviewText('');
      setReviewTags([]);
      // Refresh reviews
      const updated = await fetchReviews(selectedPlace.placeId);
      setPlaceReviews(updated);
      // Refresh tag counts
      const ids = places.map(p => p.placeId);
      if (ids.length > 0) fetchPlaceTagCounts(ids).then(setPlaceTagsCache);
    } else {
      showToast('Failed to submit review');
    }
    setReviewSubmitting(false);
  };

  // Search handler
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    let lat: number | undefined, lng: number | undefined;
    if (useGps && loc.lat && loc.lng) { lat = loc.lat; lng = loc.lng; }
    else if (selectedCity) {
      const c = CITY_COORDS[selectedCity.name.toLowerCase()];
      if (c) { lat = c.lat; lng = c.lng; }
    }
    if (!lat || !lng) return;
    setIsSearching(true);
    const results = await textSearchPlaces(searchQuery.trim(), lat, lng);
    setSearchResults(results);
    setIsSearching(false);
    setShowSearch(true);
  }, [searchQuery, useGps, loc.lat, loc.lng, selectedCity]);

  // Bookmark helpers
  const isSaved = (placeId: string) => savedPlaces.some(p => p.placeId === placeId);
  const toggleSaved = (place: Place) => {
    if (isSaved(place.placeId)) {
      setSavedPlaces(prev => prev.filter(p => p.placeId !== place.placeId));
      showToast('Removed from saved');
    } else {
      setSavedPlaces(prev => [...prev, place]);
      showToast('Saved for later');
    }
  };

  // --------------------------------------------------------------------------
  // AUTH HANDLERS
  // --------------------------------------------------------------------------

  const handleSignIn = async () => {
    setAuthError(null);
    setAuthSubmitting(true);
    const { error } = await authSignIn(authEmail, authPassword);
    if (error) setAuthError(error.message);
    setAuthSubmitting(false);
  };

  const handleSignUp = async () => {
    setAuthError(null);
    setAuthSubmitting(true);
    const { data, error } = await authSignUp(authEmail, authPassword, authName || undefined);
    if (error) {
      setAuthError(error.message);
    } else if (data.session) {
      // Auto-signed in (email confirmation disabled)
    } else {
      showToast('Check your email to confirm your account');
      setAuthScreen('signin');
    }
    setAuthSubmitting(false);
  };

  const handleSignOut = async () => {
    await authSignOut();
    setUser(null);
    setScreen('home');
  };

  const isReservable = (place: Place): boolean => RESERVABLE_TYPES.includes(place.category);
  const isBookable = (place: Place): boolean => BOOKABLE_TYPES.includes(place.category);

  const getBookingUrl = (place: Place): string => {
    // Prefer the place's own website for reservations/bookings
    if (place.website) return place.website;
    // Fall back to Google Search for "[place name] reservation" to find actual booking links
    const searchQuery = encodeURIComponent(`${place.name} ${place.address ? place.address.split(',')[0] : ''} reservation`);
    return `https://www.google.com/search?q=${searchQuery}`;
  };

  const getBookingLabel = (place: Place): string => {
    if (RESERVABLE_TYPES.includes(place.category)) return 'Reserve';
    return 'Book';
  };

  // --------------------------------------------------------------------------
  // OTHER HANDLERS
  // --------------------------------------------------------------------------

  const sharePlace = async (place: Place) => {
    if (navigator.share) {
      await navigator.share({ title: place.name, text: `Check out ${place.name} on NxStops`, url: place.googleMapsUrl });
    } else if (place.googleMapsUrl) {
      await navigator.clipboard.writeText(place.googleMapsUrl);
      showToast('Link copied');
    }
  };

  const handleSurpriseMe = () => {
    const open = places.filter(p => p.openNow);
    if (open.length === 0) { showToast('No open places found'); return; }
    setSurprisePlace(open[Math.floor(Math.random() * open.length)]);
  };

  const openAdmin = async () => {
    setShowAdmin(true);
    setAdminLoading(true);
    const [signups, allCities] = await Promise.all([fetchEmailSignups(), fetchAllCities()]);
    setAdminSignups(signups as AdminSignup[]);
    setAdminCities(allCities as City[]);
    setAdminLoading(false);
  };

  const handleToggleCity = async (cityId: string, isActive: boolean) => {
    const ok = await toggleCityActive(cityId, !isActive);
    if (ok) {
      setAdminCities(prev => prev.map(c => c.id === cityId ? { ...c, is_active: !isActive } : c));
      showToast(`City ${!isActive ? 'activated' : 'deactivated'}`);
    }
  };

  // --------------------------------------------------------------------------
  // SUB-COMPONENTS
  // --------------------------------------------------------------------------

  const PriceDots = ({ level }: { level: number }) => {
    if (level < 0) return null;
    return (
      <span style={{ color: '#78716C', fontSize: '12px', letterSpacing: '1px' }}>
        {Array.from({ length: 4 }, (_, i) => (
          <span key={i} style={{ color: i < level ? '#F59E0B' : '#3a3632' }}>$</span>
        ))}
      </span>
    );
  };

  const StarRating = ({ rating, count }: { rating: number; count: number }) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
      <span style={{ color: '#F59E0B' }}>★</span>
      <span style={{ color: '#FFFBEB', fontWeight: 600 }}>{rating.toFixed(1)}</span>
      <span style={{ color: '#78716C', fontSize: '12px' }}>({count > 999 ? `${(count / 1000).toFixed(1)}k` : count})</span>
    </span>
  );

  const SkeletonCard = () => (
    <div style={{ ...cardStyle, height: '280px', overflow: 'hidden' }}>
      <div style={{ height: '160px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', marginBottom: '12px' }}>
        <div style={{
          width: '100%', height: '100%', borderRadius: '12px',
          background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%)',
          backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
        }} />
      </div>
      <div style={{ height: '16px', width: '60%', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '8px' }} />
      <div style={{ height: '12px', width: '40%', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }} />
    </div>
  );

  // --------------------------------------------------------------------------
  // PLACE CARD COMPONENT
  // --------------------------------------------------------------------------

  const PlaceCard = ({ place }: { place: Place }) => {
    const inPlan = isInPlan(place.placeId);
    const hoursStatus = getHoursStatus(place.hours, place.openNow);

    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={`View details for ${place.name}`}
        style={{ ...cardStyle, padding: 0, overflow: 'hidden', opacity: place.openNow ? 1 : 0.6, cursor: 'pointer' }}
        onClick={() => setSelectedPlace(place)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedPlace(place); } }}
      >
        {/* Photo */}
        {place.photoUrl && (
          <div style={{
            height: '160px', width: '100%', position: 'relative',
            background: `linear-gradient(to bottom, transparent 60%, rgba(12,10,9,0.9)), url(${place.photoUrl})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
          }}>
            <div style={{
              position: 'absolute', top: '10px', left: '10px',
              padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
              background: place.openNow ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
              color: place.openNow ? '#34D399' : '#F87171', backdropFilter: 'blur(8px)',
            }}>
              {hoursStatus.text}
            </div>
            {place.distance != null && (
              <div style={{
                position: 'absolute', top: '10px', right: '10px',
                padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 500,
                background: 'rgba(0,0,0,0.5)', color: '#FFFBEB', backdropFilter: 'blur(8px)',
              }}>
                {formatDistance(place.distance, useMiles)} {getDistanceReference()}
              </div>
            )}
          </div>
        )}

        <div style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, flex: 1 }}>{place.name}</h3>
            {place.rating > 0 && <StarRating rating={place.rating} count={place.reviewCount} />}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
            {place.categoryDisplay && (
              <span style={{ padding: '3px 8px', background: 'rgba(245,158,11,0.12)', color: '#F59E0B', borderRadius: '6px', fontSize: '11px', fontWeight: 500 }}>
                {place.categoryDisplay}
              </span>
            )}
            {place.reviewCount >= 200 && (
              <span style={{ padding: '3px 8px', background: 'rgba(34,197,94,0.1)', color: '#34D399', borderRadius: '6px', fontSize: '10px', fontWeight: 600 }}>
                Popular
              </span>
            )}
            <PriceDots level={place.priceLevel} />
            {!place.photoUrl && place.distance != null && (
              <span style={{ fontSize: '11px', color: '#A8A29E' }}>{formatDistance(place.distance, useMiles)} {getDistanceReference()}</span>
            )}
            {!place.photoUrl && (
              <span style={{ fontSize: '11px', color: place.openNow ? '#34D399' : '#F87171' }}>{hoursStatus.text}</span>
            )}
          </div>

          {/* Safety Indicators */}
          {getSafetyIndicators(place).length > 0 && (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
              {getSafetyIndicators(place).map(ind => (
                <span key={ind} style={{ fontSize: '10px', color: '#78716C', padding: '2px 6px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                  {ind}
                </span>
              ))}
            </div>
          )}

          {/* Community Tags */}
          {placeTagsCache[place.placeId] && Object.entries(placeTagsCache[place.placeId]).filter(([, count]) => count >= 3).length > 0 && (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
              {Object.entries(placeTagsCache[place.placeId]).filter(([, count]) => count >= 3).map(([tag]) => {
                const tagInfo = COMMUNITY_TAGS.find(t => t.id === tag);
                return tagInfo ? (
                  <span key={tag} style={{ fontSize: '10px', color: '#D4A574', padding: '2px 6px', background: 'rgba(212,165,116,0.08)', borderRadius: '4px' }}>
                    {tagInfo.emoji} {tagInfo.label}
                  </span>
                ) : null;
              })}
            </div>
          )}

          {/* Action Row */}
          <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => { if (inPlan) { const stop = Object.values(tripDays).flat().find(s => s.place?.placeId === place.placeId); if (stop) removeFromPlan(stop.id); } else { addToPlan(place); } }}
              style={{
                flex: 1, padding: '12px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', minHeight: '44px',
                background: inPlan ? 'transparent' : 'linear-gradient(135deg, #F59E0B, #D97706)',
                color: inPlan ? '#F59E0B' : '#0C0A09',
                border: inPlan ? '1.5px solid #F59E0B' : 'none',
              }}
            >
              {inPlan ? '✓ Saved' : '+ Add'}
            </button>
            {place.googleMapsUrl && (
              <a href={place.googleMapsUrl} target="_blank" rel="noopener noreferrer"
                aria-label="Get directions"
                style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', color: '#A8A29E', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', minHeight: '44px', minWidth: '44px' }}>
                <DirectionsIcon />
              </a>
            )}
            {place.phone && (
              <a href={`tel:${place.phone}`}
                aria-label="Call"
                style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', color: '#A8A29E', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', minHeight: '44px', minWidth: '44px' }}>
                <PhoneIcon />
              </a>
            )}
            {(isReservable(place) || isBookable(place)) && (place.website || place.googleMapsUrl) && (
              <a href={getBookingUrl(place)} target="_blank" rel="noopener noreferrer"
                style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(34,197,94,0.1)', color: '#34D399', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: '11px', fontWeight: 600, border: '1px solid rgba(34,197,94,0.2)', minHeight: '44px' }}>
                {getBookingLabel(place)}
              </a>
            )}
            <button onClick={() => toggleSaved(place)}
              aria-label={isSaved(place.placeId) ? 'Remove from saved' : 'Save place'}
              style={{ padding: '12px 16px', borderRadius: '10px', background: isSaved(place.placeId) ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.06)', color: isSaved(place.placeId) ? '#F59E0B' : '#A8A29E', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', minHeight: '44px', minWidth: '44px' }}>
              {isSaved(place.placeId) ? '♥' : '♡'}
            </button>
            <button onClick={() => sharePlace(place)}
              aria-label="Share"
              style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', color: '#A8A29E', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '44px', minWidth: '44px' }}>
              <ShareIcon />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // --------------------------------------------------------------------------
  // EVENT CARD
  // --------------------------------------------------------------------------

  const formatEventDate = (dateStr: string): string => {
    if (!dateStr) return 'TBA';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatEventTime = (timeStr: string): string => {
    if (!timeStr) return '';
    const parts = timeStr.split(':').map(Number);
    const h = parts[0];
    const m = parts[1] ?? 0;
    if (isNaN(h)) return timeStr;
    const isPM = h >= 12;
    const hour12 = h % 12 || 12;
    return `${hour12}:${m.toString().padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
  };

  const EventCard = ({ event }: { event: EventItem }) => {
    const inPlan = isEventInPlan(event.id);
    return (
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        {event.imageUrl && (
          <div style={{
            height: '140px', width: '100%', position: 'relative',
            background: `linear-gradient(to bottom, transparent 50%, rgba(12,10,9,0.9)), url(${event.imageUrl})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
          }}>
            <div style={{
              position: 'absolute', top: '10px', left: '10px',
              padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
              background: 'rgba(168,85,247,0.2)', color: '#C084FC', backdropFilter: 'blur(8px)',
            }}>
              {event.category}
            </div>
          </div>
        )}
        <div style={{ padding: '14px 16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>{event.name}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#F59E0B', fontWeight: 500 }}>
              {formatEventDate(event.date)}
            </span>
            {event.time && (
              <span style={{ fontSize: '12px', color: '#A8A29E' }}>
                {formatEventTime(event.time)}
              </span>
            )}
          </div>
          <p style={{ fontSize: '12px', color: '#A8A29E', marginBottom: '10px' }}>
            {event.venue}{event.venueAddress ? ` — ${event.venueAddress}` : ''}
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => { if (inPlan) { const stop = Object.values(tripDays).flat().find(s => s.event?.id === event.id); if (stop) removeFromPlan(stop.id); } else { addEventToPlan(event); } }}
              style={{
                flex: 1, padding: '12px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', minHeight: '44px',
                background: inPlan ? 'transparent' : 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                color: inPlan ? '#C084FC' : '#FFFBEB',
                border: inPlan ? '1.5px solid #8B5CF6' : 'none',
              }}
            >
              {inPlan ? '✓ In Plan' : '+ Add to Plan'}
            </button>
            {event.url && (
              <a href={event.url} target="_blank" rel="noopener noreferrer"
                style={{
                  flex: 1, padding: '10px', borderRadius: '10px',
                  background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
                  color: '#C084FC', fontSize: '13px', fontWeight: 600,
                  textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box',
                }}>
                Get Tickets
              </a>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // HOME SCREEN
  // ==========================================================================

  const HomeScreen = () => (
    <div>
      {/* Greeting */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '4px' }}>
          {getGreeting()} ✨
        </h1>
        <p style={{ color: '#A8A29E', fontSize: '14px' }}>{getTimeSuggestion()}</p>
      </div>

      {/* Weather Card */}
      {weather && (selectedCity || useGps) && (
        <div style={{
          ...cardStyle, display: 'flex', alignItems: 'center', gap: '14px',
          background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(147,197,253,0.04))',
          border: '1px solid rgba(59,130,246,0.12)',
        }}>
          <span style={{ fontSize: '36px' }}>{weather.emoji}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#FFFBEB' }}>
              {weather.temp}°F
            </div>
            <div style={{ fontSize: '12px', color: '#93C5FD' }}>{weather.description}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', color: '#A8A29E' }}>H: {weather.high}° L: {weather.low}°</div>
            <div style={{ fontSize: '11px', color: '#78716C' }}>{cityLabel}</div>
          </div>
        </div>
      )}

      {/* GPS Card */}
      {loc.hasLocation && (
        <button
          onClick={() => { setUseGps(true); setSelectedCity(null); setScreen('discover'); }}
          style={{
            ...cardStyle, width: '100%', cursor: 'pointer', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: '14px',
            border: useGps ? '2px solid #F59E0B' : '1px solid rgba(255,255,255,0.06)',
            background: useGps ? 'rgba(245,158,11,0.08)' : 'rgba(28,25,23,0.8)',
          }}
        >
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <LocationIcon />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '15px', color: '#FFFBEB' }}>{loc.city || 'Near You'}</div>
            <div style={{ fontSize: '12px', color: '#A8A29E' }}>Use your current location</div>
          </div>
          <div style={{ marginLeft: 'auto', color: '#F59E0B', fontSize: '20px' }}>→</div>
        </button>
      )}

      {/* Divider */}
      {loc.hasLocation && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
          <span style={{ fontSize: '12px', color: '#78716C' }}>or pick a city</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
        </div>
      )}

      {/* City Selector */}
      <div style={cardStyle}>
        <label style={{ fontSize: '11px', color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '10px' }}>
          Select Your City
        </label>
        <select
          style={{
            width: '100%', padding: '14px', borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)', background: '#0C0A09',
            color: '#FFFBEB', fontSize: '15px', cursor: 'pointer',
          }}
          value={selectedCity?.id || ''}
          onChange={(e) => {
            const city = cities.find(c => c.id === e.target.value);
            setSelectedCity(city || null);
            setUseGps(false);
          }}
        >
          <option value="">Choose a city...</option>
          {cities.map(city => (
            <option key={city.id} value={city.id}>{city.name}, {city.country}</option>
          ))}
        </select>
      </div>

      {/* City Banner */}
      {selectedCity && (
        <div style={{ ...cardStyle, padding: 0, overflow: 'hidden', marginTop: '4px' }}>
          <div style={{
            height: '140px',
            background: selectedCity.banner_url
              ? `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.7)), url(${selectedCity.banner_url})`
              : 'linear-gradient(135deg, #1C1917 0%, #292524 100%)',
            backgroundSize: 'cover', backgroundPosition: 'center',
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '16px',
          }}>
            <h2 style={{ fontSize: '22px', fontWeight: 700 }}>{selectedCity.name}</h2>
            <p style={{ color: '#d4d0cc', fontSize: '13px' }}>{selectedCity.country}</p>
          </div>
        </div>
      )}

      {/* Travel Group Selector */}
      {(selectedCity || useGps) && (
        <div style={{ ...cardStyle, marginTop: '8px' }}>
          <label style={{ fontSize: '11px', color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '10px' }}>
            Who&apos;s traveling?
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {TRAVEL_GROUPS.map(g => {
              const active = travelGroup === g.id;
              return (
                <button key={g.id} onClick={() => setTravelGroup(active ? null : g.id)}
                  style={{
                    padding: '8px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 500,
                    border: active ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(255,255,255,0.08)',
                    cursor: 'pointer', background: active ? 'rgba(245,158,11,0.12)' : 'transparent',
                    color: active ? '#F59E0B' : '#A8A29E',
                  }}>
                  {g.emoji} {g.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Cultural Context */}
      {(selectedCity || (useGps && loc.city)) && (() => {
        const key = (selectedCity?.name || loc.city || '').toLowerCase();
        const culture = CITY_CULTURE[key];
        if (!culture) return null;
        return (
          <div style={{ ...cardStyle, marginTop: '8px' }}>
            <button
              onClick={() => setShowCulture(!showCulture)}
              style={{
                width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: 0, color: '#FFFBEB',
              }}>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>Cultural Tips</span>
              <span style={{ color: '#78716C', fontSize: '16px', transform: showCulture ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
            </button>
            {showCulture && (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { emoji: '💰', label: 'Tipping', value: culture.tipping },
                  { emoji: '👔', label: 'Dress', value: culture.dress },
                  { emoji: '🗣️', label: 'Language', value: culture.language },
                  { emoji: '🤝', label: 'Etiquette', value: culture.etiquette },
                  { emoji: '💵', label: 'Currency', value: culture.currency },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '16px', flexShrink: 0, width: '24px', textAlign: 'center' }}>{row.emoji}</span>
                    <div>
                      <div style={{ fontSize: '11px', color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>{row.label}</div>
                      <div style={{ fontSize: '13px', color: '#d4d0cc', lineHeight: 1.4 }}>{row.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Start Exploring */}
      {(selectedCity || useGps) && (
        <button
          style={{
            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
            color: '#0C0A09', border: 'none', borderRadius: '14px',
            padding: '16px', fontSize: '16px', fontWeight: 600,
            cursor: 'pointer', width: '100%', marginTop: '12px',
            boxShadow: '0 4px 20px rgba(245,158,11,0.3)',
          }}
          onClick={() => setScreen('discover')}
        >
          Start Exploring →
        </button>
      )}

      {/* Saved Places */}
      {savedPlaces.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Saved for Later</h2>
            <span style={{ fontSize: '12px', color: '#78716C' }}>{savedPlaces.length} places</span>
          </div>
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
            {savedPlaces.map(place => (
              <div key={place.placeId} onClick={() => setSelectedPlace(place)}
                role="button"
                tabIndex={0}
                aria-label={`View details for ${place.name}`}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedPlace(place); } }}
                style={{
                  ...cardStyle, padding: 0, overflow: 'hidden', minWidth: '200px', maxWidth: '220px',
                  flexShrink: 0, cursor: 'pointer',
                }}>
                {place.photoUrl && (
                  <div style={{
                    height: '100px', width: '100%',
                    background: `linear-gradient(to bottom, transparent 50%, rgba(12,10,9,0.9)), url(${place.photoUrl})`,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                  }} />
                )}
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {place.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {place.rating > 0 && (
                      <span style={{ fontSize: '11px', color: '#F59E0B' }}>★ {place.rating.toFixed(1)}</span>
                    )}
                    {place.categoryDisplay && (
                      <span style={{ fontSize: '11px', color: '#78716C' }}>{place.categoryDisplay}</span>
                    )}
                  </div>
                  <button onClick={e => { e.stopPropagation(); toggleSaved(place); }}
                    style={{
                      marginTop: '8px', width: '100%', padding: '6px', borderRadius: '8px',
                      border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)',
                      color: '#F87171', fontSize: '11px', cursor: 'pointer',
                    }}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ==========================================================================
  // MAP COMPONENTS
  // ==========================================================================

  const getMapCenter = () => {
    if (useGps && loc.lat && loc.lng) return { lat: loc.lat, lng: loc.lng };
    if (selectedCity) {
      const c = CITY_COORDS[selectedCity.name.toLowerCase()];
      if (c) return c;
    }
    return { lat: 40.7128, lng: -73.996 };
  };

  const PlacesMapView = ({ places: mapPlaces }: { places: Place[] }) => {
    const center = getMapCenter();
    if (!MAPS_API_KEY) {
      return (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🗺️</div>
          <p style={{ color: '#A8A29E', fontSize: '14px', marginBottom: '8px' }}>Map view requires Google Maps API key</p>
          <p style={{ color: '#57534E', fontSize: '12px' }}>Set VITE_GOOGLE_MAPS_API_KEY in your environment variables and enable Maps JavaScript API in Google Cloud Console.</p>
        </div>
      );
    }
    return (
      <div style={{ height: 'calc(100vh - 280px)', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
        <APIProvider apiKey={MAPS_API_KEY}>
          <Map
            defaultCenter={center}
            defaultZoom={14}
            gestureHandling="greedy"
            disableDefaultUI={true}
            style={{ width: '100%', height: '100%' }}
            colorScheme="DARK"
          >
            {mapPlaces.filter(p => p.lat && p.lng).map(place => (
              <Marker
                key={place.placeId}
                position={{ lat: place.lat!, lng: place.lng! }}
                onClick={() => setActiveMapPin(activeMapPin === place.placeId ? null : place.placeId)}
                title={place.name}
              />
            ))}
            {activeMapPin && (() => {
              const place = mapPlaces.find(p => p.placeId === activeMapPin);
              if (!place || !place.lat || !place.lng) return null;
              return (
                <InfoWindow
                  position={{ lat: place.lat, lng: place.lng }}
                  onCloseClick={() => setActiveMapPin(null)}
                >
                  <div style={{ padding: '4px', minWidth: '160px', color: '#1C1917' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{place.name}</div>
                    <div style={{ fontSize: '12px', color: '#57534E', marginBottom: '4px' }}>
                      {place.categoryDisplay}
                      {place.rating > 0 && ` · ★ ${place.rating.toFixed(1)}`}
                      {place.distance != null && ` · ${formatDistance(place.distance, useMiles)}`}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                      <button
                        onClick={() => { setSelectedPlace(place); setActiveMapPin(null); }}
                        style={{ flex: 1, padding: '6px', borderRadius: '6px', border: 'none', background: '#F59E0B', color: '#0C0A09', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Details
                      </button>
                      <button
                        onClick={() => { addToPlan(place); setActiveMapPin(null); }}
                        style={{ flex: 1, padding: '6px', borderRadius: '6px', border: '1px solid #D6D3D1', background: 'white', color: '#1C1917', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        + Plan
                      </button>
                    </div>
                  </div>
                </InfoWindow>
              );
            })()}
          </Map>
        </APIProvider>
      </div>
    );
  };

  const EventsMapView = ({ eventsList }: { eventsList: typeof events }) => {
    const center = getMapCenter();
    const mappableEvents = eventsList.filter(e => e.lat && e.lng);
    if (mappableEvents.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🗺️</div>
          <p style={{ color: '#A8A29E', fontSize: '14px' }}>No event locations available to map</p>
        </div>
      );
    }
    return (
      <div style={{ height: 'calc(100vh - 280px)', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
        <APIProvider apiKey={MAPS_API_KEY}>
          <Map
            defaultCenter={center}
            defaultZoom={11}
            gestureHandling="greedy"
            disableDefaultUI={true}
            style={{ width: '100%', height: '100%' }}
            colorScheme="DARK"
          >
            {mappableEvents.map(event => (
              <Marker
                key={event.id}
                position={{ lat: event.lat!, lng: event.lng! }}
                onClick={() => setActiveEventPin(activeEventPin === event.id ? null : event.id)}
                title={event.name}
              />
            ))}
            {activeEventPin && (() => {
              const event = mappableEvents.find(e => e.id === activeEventPin);
              if (!event) return null;
              return (
                <InfoWindow
                  position={{ lat: event.lat!, lng: event.lng! }}
                  onCloseClick={() => setActiveEventPin(null)}
                >
                  <div style={{ padding: '4px', minWidth: '180px', color: '#1C1917' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{event.name}</div>
                    <div style={{ fontSize: '12px', color: '#57534E', marginBottom: '2px' }}>
                      {formatEventDate(event.date)}{event.time ? ` · ${formatEventTime(event.time)}` : ''}
                    </div>
                    <div style={{ fontSize: '11px', color: '#78716C', marginBottom: '8px' }}>{event.venue}</div>
                    {event.url && (
                      <a href={event.url} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'block', padding: '6px', borderRadius: '6px', background: '#7C3AED', color: 'white', fontSize: '11px', fontWeight: 600, textAlign: 'center', textDecoration: 'none' }}>
                        Get Tickets
                      </a>
                    )}
                  </div>
                </InfoWindow>
              );
            })()}
          </Map>
        </APIProvider>
      </div>
    );
  };

  // ==========================================================================
  // DISCOVER SCREEN
  // ==========================================================================

  const DiscoverScreen = () => (
    <div>
      {/* Notification Permission Prompt */}
      {showNotificationPrompt && notificationPermission === 'default' && selectedCity && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '12px 14px', marginBottom: '12px', borderRadius: '12px',
          background: 'rgba(245,158,11,0.06)',
          border: '1px solid rgba(245,158,11,0.2)',
        }}>
          <span style={{ fontSize: '20px', flexShrink: 0 }}>🔔</span>
          <span style={{ flex: 1, fontSize: '13px', color: '#D6D3D1', lineHeight: 1.4 }}>
            Stay in the loop — get notified about events near you
          </span>
          <button
            onClick={async () => { await requestNotificationPermission(); dismissNotificationPrompt(); }}
            style={{
              padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #F59E0B, #D97706)',
              color: '#0C0A09', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            Enable
          </button>
          <button
            onClick={dismissNotificationPrompt}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#78716C', fontSize: '18px', padding: '8px', flexShrink: 0, lineHeight: 1,
              minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            aria-label="Dismiss notification prompt"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '2px' }}>
            {cityLabel} 📍
          </h1>
          <p style={{ color: '#78716C', fontSize: '13px' }}>{filteredPlaces.length} places nearby</p>
        </div>
        <div style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
          <button onClick={() => setViewMode('list')}
            aria-label="List view"
            style={{
              padding: '10px 14px', fontSize: '12px', fontWeight: 500, border: 'none', cursor: 'pointer',
              background: viewMode === 'list' ? 'rgba(245,158,11,0.15)' : 'transparent',
              color: viewMode === 'list' ? '#F59E0B' : '#78716C', minHeight: '44px',
            }}>
            List
          </button>
          <button onClick={() => setViewMode('map')}
            aria-label="Map view"
            style={{
              padding: '10px 14px', fontSize: '12px', fontWeight: 500, border: 'none', cursor: 'pointer',
              borderLeft: '1px solid rgba(255,255,255,0.1)',
              background: viewMode === 'map' ? 'rgba(245,158,11,0.15)' : 'transparent',
              color: viewMode === 'map' ? '#F59E0B' : '#78716C', minHeight: '44px',
            }}>
            Map
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <input
          type="text"
          placeholder="Search for a place..."
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); if (!e.target.value.trim()) { setShowSearch(false); setSearchResults([]); } }}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          style={{
            flex: 1, padding: '12px 16px', borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
            color: '#FFFBEB', fontSize: '14px', outline: 'none',
          }}
        />
        <button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}
          aria-label="Search"
          style={{
            padding: '12px 18px', borderRadius: '12px', border: 'none', cursor: 'pointer',
            background: searchQuery.trim() ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'rgba(255,255,255,0.06)',
            color: searchQuery.trim() ? '#0C0A09' : '#78716C', fontSize: '14px', fontWeight: 600,
            minHeight: '44px', minWidth: '44px',
          }}>
          {isSearching ? '...' : '🔍'}
        </button>
      </div>

      {/* Search Results Banner */}
      {showSearch && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
          <span style={{ fontSize: '13px', color: '#F59E0B', fontWeight: 500 }}>
            {searchResults.length} results for "{searchQuery}"
          </span>
          <button onClick={() => { setShowSearch(false); setSearchResults([]); setSearchQuery(''); }}
            style={{ background: 'none', border: 'none', color: '#78716C', cursor: 'pointer', fontSize: '13px' }}>
            Clear
          </button>
        </div>
      )}

      {/* Vibe Chips + Filters (hidden during search) */}
      {!showSearch && (<>
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '4px', scrollbarWidth: 'none' }}>
        {VIBES.map(vibe => {
          const active = selectedVibe === vibe.id;
          return (
            <button
              key={vibe.id}
              onClick={() => {
                setSelectedVibe(active ? null : vibe.id);
                setSearchRadius(1500);
              }}
              style={{
                padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 500,
                border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                background: active ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'rgba(255,255,255,0.05)',
                color: active ? '#0C0A09' : '#A8A29E',
              }}
            >
              {vibe.emoji} {vibe.label}
            </button>
          );
        })}
      </div>

      {/* Quick Filters */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '12px', scrollbarWidth: 'none' }}>
        {QUICK_FILTERS.map(filter => {
          const active = quickFilters.includes(filter.id);
          return (
            <button
              key={filter.id}
              onClick={() => setQuickFilters(active ? quickFilters.filter(f => f !== filter.id) : [...quickFilters, filter.id])}
              style={{
                padding: '6px 12px', borderRadius: '16px', fontSize: '11px', fontWeight: 500,
                border: active ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                background: active ? 'rgba(245,158,11,0.12)' : 'transparent',
                color: active ? '#F59E0B' : '#78716C',
              }}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Community Tags */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '4px', scrollbarWidth: 'none' }}>
        {COMMUNITY_TAGS.map(tag => {
          const active = communityFilters.includes(tag.id);
          return (
            <button key={tag.id}
              onClick={() => setCommunityFilters(active ? communityFilters.filter(f => f !== tag.id) : [...communityFilters, tag.id])}
              style={{
                padding: '6px 12px', borderRadius: '16px', fontSize: '11px', fontWeight: 500,
                border: active ? '1px solid rgba(212,165,116,0.4)' : '1px solid rgba(255,255,255,0.06)',
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                background: active ? 'rgba(212,165,116,0.12)' : 'transparent',
                color: active ? '#D4A574' : '#57534E',
              }}>
              {tag.emoji} {tag.label}
            </button>
          );
        })}
      </div>
      </>)}

      {/* Community filter active banner */}
      {communityFilters.length > 0 && !showSearch && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', padding: '10px 14px',
          borderRadius: '10px', background: 'rgba(212,165,116,0.08)', border: '1px solid rgba(212,165,116,0.15)',
        }}>
          <span style={{ fontSize: '14px' }}>✨</span>
          <span style={{ fontSize: '12px', color: '#D4A574', lineHeight: 1.4 }}>
            Showing results based on smart matching. Tap a place → leave a review to improve community tags!
          </span>
        </div>
      )}

      {/* Map View */}
      {viewMode === 'map' ? (
        <PlacesMapView places={showSearch ? searchResults : filteredPlaces} />
      ) : (
        <>
          {/* Search Results */}
          {showSearch ? (
            <>
              {isSearching && <><SkeletonCard /><SkeletonCard /></>}
              {!isSearching && searchResults.length === 0 && (
                <div style={{ ...cardStyle, textAlign: 'center', padding: '32px 20px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
                  <p style={{ color: '#A8A29E', fontSize: '14px' }}>No results found. Try a different search.</p>
                </div>
              )}
              {!isSearching && searchResults.map(place => (
                <PlaceCard key={place.placeId} place={place} />
              ))}
            </>
          ) : (
            <>
              {/* Places to Stay — Booking Links */}
              {selectedVibe === 'stay' && !placesLoading && cityLabel && (
                <div style={{ ...cardStyle, marginBottom: '12px', padding: '16px 18px', background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(251,191,36,0.04))', border: '1px solid rgba(245,158,11,0.15)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '20px' }}>🛏️</span>
                    <span style={{ fontWeight: 600, fontSize: '15px', color: '#FFFBEB' }}>Find Places to Stay</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#A8A29E', lineHeight: 1.5, margin: '0 0 12px 0' }}>
                    Browse hotels, apartments & unique stays in {cityLabel}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[
                      { label: 'Airbnb', emoji: '🏡', url: `https://www.airbnb.com/s/${encodeURIComponent(cityLabel)}/homes` },
                      { label: 'Booking.com', emoji: '🏨', url: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(cityLabel)}` },
                      { label: 'Hotels.com', emoji: '⭐', url: `https://www.hotels.com/search.do?q-destination=${encodeURIComponent(cityLabel)}` },
                    ].map(site => (
                      <a key={site.label} href={site.url} target="_blank" rel="noopener noreferrer"
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          padding: '10px 16px', borderRadius: '12px',
                          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                          color: '#FFFBEB', fontSize: '13px', fontWeight: 500,
                          textDecoration: 'none', cursor: 'pointer',
                          transition: 'background 0.2s',
                        }}>
                        <span>{site.emoji}</span> {site.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Hidden Gems banner */}
              {selectedVibe === 'hidden' && !placesLoading && filteredPlaces.length > 0 && (
                <div style={{ ...cardStyle, marginBottom: '12px', padding: '16px 18px', background: 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(139,92,246,0.04))', border: '1px solid rgba(168,85,247,0.15)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '20px' }}>💎</span>
                    <span style={{ fontWeight: 600, fontSize: '15px', color: '#FFFBEB' }}>Hidden Gems</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#A8A29E', lineHeight: 1.5, margin: 0 }}>
                    Off-the-beaten-path spots — parks, bookstores, spas, markets, and local favorites most tourists miss.
                  </p>
                </div>
              )}

              {/* Loading */}
              {placesLoading && <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>}

              {/* Empty: filters too strict */}
              {!placesLoading && filteredPlaces.length === 0 && places.length > 0 && (
                <div style={{ ...cardStyle, textAlign: 'center', padding: '32px 20px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
                  <p style={{ color: '#A8A29E', fontSize: '14px', marginBottom: '12px' }}>Nothing matching. Try removing some filters.</p>
                  <button onClick={() => setQuickFilters([])}
                    style={{ background: 'none', border: '1px solid #F59E0B', color: '#F59E0B', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', cursor: 'pointer' }}>
                    Clear Filters
                  </button>
                </div>
              )}

              {/* Empty: no results at all */}
              {!placesLoading && places.length === 0 && (
                <div style={{ ...cardStyle, textAlign: 'center', padding: '32px 20px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📍</div>
                  <p style={{ color: '#A8A29E', fontSize: '14px' }}>
                    {(useGps || selectedCity) ? 'Loading places...' : 'Select a city or enable location first.'}
                  </p>
                </div>
              )}

              {/* Hidden Gems Horizontal Section (when not on hidden vibe) */}
              {!placesLoading && selectedVibe !== 'hidden' && (() => {
                const gems = places.filter(p => p.rating >= 4.2 && p.reviewCount > 0 && p.reviewCount < 150 && !NIGHTLIFE_TYPES.includes(p.category));
                if (gems.length === 0) return null;
                return (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        💎 Hidden Gems
                      </h3>
                      <button onClick={() => setSelectedVibe('hidden')}
                        style={{ background: 'none', border: 'none', color: '#F59E0B', fontSize: '12px', cursor: 'pointer' }}>
                        See all →
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
                      {gems.slice(0, 8).map(place => (
                        <div key={place.placeId} onClick={() => setSelectedPlace(place)}
                          role="button"
                          tabIndex={0}
                          aria-label={`View details for ${place.name}`}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedPlace(place); } }}
                          style={{
                            ...cardStyle, padding: 0, overflow: 'hidden', minWidth: '180px', maxWidth: '200px',
                            flexShrink: 0, cursor: 'pointer',
                          }}>
                          {place.photoUrl && (
                            <div style={{
                              height: '90px', width: '100%',
                              background: `linear-gradient(to bottom, transparent 40%, rgba(12,10,9,0.9)), url(${place.photoUrl})`,
                              backgroundSize: 'cover', backgroundPosition: 'center',
                            }} />
                          )}
                          <div style={{ padding: '10px 12px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#FFFBEB', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place.name}</div>
                            <div style={{ fontSize: '11px', color: '#78716C', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ color: '#F59E0B' }}>★</span> {place.rating.toFixed(1)}
                              <span style={{ margin: '0 2px' }}>·</span>
                              {place.categoryDisplay}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Place Cards */}
              {!placesLoading && filteredPlaces.map(place => (
                <PlaceCard key={place.placeId} place={place} />
              ))}

              {/* Expand Radius */}
              {!placesLoading && filteredPlaces.length > 0 && (
                <button onClick={() => setSearchRadius(prev => prev + 1500)}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '12px', marginTop: '4px',
                    background: 'none', border: '1px solid rgba(255,255,255,0.08)',
                    color: '#A8A29E', fontSize: '13px', cursor: 'pointer',
                  }}>
                  Search wider area →
                </button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );

  // ==========================================================================
  // EVENTS SCREEN
  // ==========================================================================

  const EVENT_CATEGORIES = [
    { id: 'all', label: 'All' },
    { id: 'music', label: 'Music' },
    { id: 'sports', label: 'Sports' },
    { id: 'comedy', label: 'Comedy' },
    { id: 'arts', label: 'Arts' },
    { id: 'family', label: 'Family' },
    { id: 'festivals', label: 'Festivals' },
  ];

  const EventsScreen = () => {
    // Filter: show events within current month, plus ticketed events further out
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const filteredEvents = events.filter(event => {
      if (!event.date) return true;
      const eventDate = new Date(event.date + 'T00:00:00');
      // Date filter: current month + ticketed up to 3 months
      if (eventDate > endOfMonth) {
        if (!event.url) return false;
        const threeMonths = new Date(now.getFullYear(), now.getMonth() + 3, 0);
        if (eventDate > threeMonths) return false;
      }
      // Category filter
      if (eventCategoryFilter !== 'all') {
        const catLower = (event.category || '').toLowerCase();
        const nameLower = (event.name || '').toLowerCase();
        const combined = catLower + ' ' + nameLower;
        switch (eventCategoryFilter) {
          case 'music': if (!/\b(music|concert|live|band|dj|singer|tour|rap|hip.?hop|r&b|pop|rock|jazz|country|latin|reggae)\b/i.test(combined)) return false; break;
          case 'sports': if (!/\b(sport|game|match|basketball|football|soccer|baseball|hockey|tennis|golf|boxing|mma|racing|nba|nfl|mlb|nhl)\b/i.test(combined)) return false; break;
          case 'comedy': if (!/\b(comedy|comedian|stand.?up|improv|funny|laugh)\b/i.test(combined)) return false; break;
          case 'arts': if (!/\b(art|theater|theatre|ballet|opera|dance|exhibit|museum|gallery|performing|symphony|orchestra)\b/i.test(combined)) return false; break;
          case 'family': if (!/\b(family|kids|children|disney|paw patrol|sesame|lego|circus|magic|puppet|nickelodeon)\b/i.test(combined)) return false; break;
          case 'festivals': if (!/\b(festival|fair|carnival|expo|convention|conference|parade|celebration)\b/i.test(combined)) return false; break;
        }
      }
      // Travel group event curation
      if (travelGroup) {
        const eventNameLower = (event.name || '').toLowerCase();
        const eventCatLower = (event.category || '').toLowerCase();
        const combined = eventNameLower + ' ' + eventCatLower;
        switch (travelGroup) {
          case 'girls':
          case 'bachelorette':
            // Boost concerts, performing arts, pop, comedy; deprioritize combat sports
            if (/\b(mma|ufc|boxing|wrestling|monster truck)\b/.test(combined)) return false;
            break;
          case 'family':
            // Exclude nightlife events; boost family/kids events
            if (/\b(21\+|18\+|adults only|burlesque|strip)\b/.test(combined)) return false;
            break;
          case 'boys':
          case 'friends':
            // Include everything — sports, concerts, comedy
            break;
        }
      }
      return true;
    });

    // Sort events: boost relevance based on travel group
    if (travelGroup === 'family') {
      filteredEvents.sort((a, b) => {
        const aFamily = /\b(kids|children|family|disney|nickelodeon|paw patrol|sesame|lego)\b/i.test(a.name + ' ' + a.category) ? -1 : 0;
        const bFamily = /\b(kids|children|family|disney|nickelodeon|paw patrol|sesame|lego)\b/i.test(b.name + ' ' + b.category) ? -1 : 0;
        return aFamily - bFamily;
      });
    }

    return (
      <div>
        {/* Header */}
        <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '2px' }}>
              Events {cityLabel ? `in ${cityLabel}` : ''} 🎫
            </h1>
            <p style={{ color: '#78716C', fontSize: '13px' }}>
              {eventsLoading ? 'Finding events...' : `${filteredEvents.length} upcoming events`}
            </p>
          </div>
          <div style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
            <button onClick={() => setEventsViewMode('list')}
              aria-label="List view"
              style={{
                padding: '10px 14px', fontSize: '12px', fontWeight: 500, border: 'none', cursor: 'pointer',
                background: eventsViewMode === 'list' ? 'rgba(168,85,247,0.15)' : 'transparent',
                color: eventsViewMode === 'list' ? '#A855F7' : '#78716C', minHeight: '44px',
              }}>
              List
            </button>
            <button onClick={() => setEventsViewMode('map')}
              aria-label="Map view"
              style={{
                padding: '10px 14px', fontSize: '12px', fontWeight: 500, border: 'none', cursor: 'pointer',
                borderLeft: '1px solid rgba(255,255,255,0.1)',
                background: eventsViewMode === 'map' ? 'rgba(168,85,247,0.15)' : 'transparent',
                color: eventsViewMode === 'map' ? '#A855F7' : '#78716C', minHeight: '44px',
              }}>
              Map
            </button>
          </div>
        </div>

        {/* Event Category Filters */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '8px', scrollbarWidth: 'none' }}>
          {EVENT_CATEGORIES.map(cat => {
            const isActive = eventCategoryFilter === cat.id;
            return (
              <button key={cat.id}
                onClick={() => setEventCategoryFilter(isActive && cat.id !== 'all' ? 'all' : cat.id)}
                style={{
                  padding: '6px 14px', borderRadius: '16px', fontSize: '12px', fontWeight: 500,
                  border: isActive ? '1px solid rgba(168,85,247,0.3)' : '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  background: isActive ? 'rgba(168,85,247,0.12)' : 'transparent',
                  color: isActive ? '#A855F7' : '#78716C',
                }}>
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Events Content */}
        {eventsLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ width: '36px', height: '36px', border: '3px solid rgba(168,85,247,0.2)', borderTopColor: '#A855F7', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: '#78716C', fontSize: '14px' }}>Finding events nearby...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: '60px' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.6 }}>🎫</div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>No events found</h2>
            <p style={{ color: '#A8A29E', fontSize: '14px', lineHeight: 1.5 }}>
              {!useGps && !selectedCity
                ? 'Select a city or use GPS to discover events nearby'
                : 'No upcoming events found in this area. Check back soon!'}
            </p>
          </div>
        ) : eventsViewMode === 'map' ? (
          <EventsMapView eventsList={filteredEvents} />
        ) : (
          <div>
            {filteredEvents.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // ==========================================================================
  // PLAN SCREEN (Redesigned Timeline)
  // ==========================================================================

  const PlanScreen = () => {
    const sortedDays = Object.keys(tripDays).map(Number).sort((a, b) => a - b);

    if (totalStops === 0 && !crewMode) {
      return (
        <div style={{ textAlign: 'center', paddingTop: '60px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.6 }}>🗺️</div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>No stops yet</h2>
          <p style={{ color: '#A8A29E', fontSize: '14px', marginBottom: '24px', lineHeight: 1.5 }}>
            Explore places and tap &quot;+ Add&quot; to build your trip plan
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => setScreen('discover')}
              style={{
                background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#0C0A09',
                border: 'none', borderRadius: '14px', padding: '14px 28px',
                fontSize: '15px', fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(245,158,11,0.3)',
              }}
            >
              Start Exploring →
            </button>
            <button
              onClick={() => setShowJoinCrew(true)}
              style={{
                background: 'none', border: '1px solid rgba(255,255,255,0.1)',
                color: '#A8A29E', borderRadius: '14px', padding: '12px 24px',
                fontSize: '14px', cursor: 'pointer',
              }}
            >
              👥 Join a Crew
            </button>
          </div>
          {/* Inline Join Crew */}
          {showJoinCrew && (
            <div style={{ ...cardStyle, marginTop: '20px', padding: '16px', textAlign: 'left' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#FFFBEB' }}>Enter Crew Code</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="e.g. X7K3NP"
                  value={joinCrewInput}
                  onChange={e => setJoinCrewInput(e.target.value.toUpperCase())}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && joinCrewInput.length >= 4) {
                      // Inline join logic
                      const doJoin = async () => {
                        const code = joinCrewInput.trim().toUpperCase();
                        setCrewSyncing(true);
                        const trip = await loadCrewTrip(code);
                        if (trip) {
                          const parsed: Record<number, Stop[]> = {};
                          for (const [day, stops] of Object.entries(trip.trip_days)) {
                            parsed[Number(day)] = (stops as Stop[]).map(s => ({
                              ...s, addedAt: new Date((s as Stop).addedAt),
                            }));
                          }
                          setTripDays(parsed);
                          setCrewMode(true);
                          setCrewCode(code);
                          sessionStorage.setItem('nxstops_crew_code', code);
                          sessionStorage.setItem('nxstops_crew_mode', 'true');
                          setShowJoinCrew(false);
                          setJoinCrewInput('');
                          showToast(`Joined crew ${code}!`);
                        } else {
                          showToast('Crew not found');
                        }
                        setCrewSyncing(false);
                      };
                      doJoin();
                    }
                  }}
                  maxLength={6}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.1)', background: '#0C0A09',
                    color: '#FFFBEB', fontSize: '18px', fontWeight: 700,
                    letterSpacing: '4px', textAlign: 'center', outline: 'none',
                  }}
                />
                <button
                  onClick={async () => {
                    const code = joinCrewInput.trim().toUpperCase();
                    if (code.length < 4) return;
                    setCrewSyncing(true);
                    const trip = await loadCrewTrip(code);
                    if (trip) {
                      const parsed: Record<number, Stop[]> = {};
                      for (const [day, stops] of Object.entries(trip.trip_days)) {
                        parsed[Number(day)] = (stops as Stop[]).map(s => ({
                          ...s, addedAt: new Date((s as Stop).addedAt),
                        }));
                      }
                      setTripDays(parsed);
                      setCrewMode(true);
                      setCrewCode(code);
                      sessionStorage.setItem('nxstops_crew_code', code);
                      sessionStorage.setItem('nxstops_crew_mode', 'true');
                      setShowJoinCrew(false);
                      setJoinCrewInput('');
                      showToast(`Joined crew ${code}!`);
                    } else {
                      showToast('Crew not found');
                    }
                    setCrewSyncing(false);
                  }}
                  disabled={crewSyncing || joinCrewInput.length < 4}
                  style={{
                    padding: '12px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                    background: joinCrewInput.length >= 4 ? '#F59E0B' : 'rgba(255,255,255,0.06)',
                    color: joinCrewInput.length >= 4 ? '#0C0A09' : '#78716C',
                    fontSize: '14px', fontWeight: 600,
                  }}>
                  {crewSyncing ? '...' : 'Join'}
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    const generateCrewCode = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
      return code;
    };

    const startCrewMode = async () => {
      const code = generateCrewCode();
      setCrewSyncing(true);
      const created = await createCrewTrip(code, citySlug, cityLabel, tripDays);
      if (created) {
        setCrewMode(true);
        setCrewCode(code);
        sessionStorage.setItem('nxstops_crew_code', code);
        sessionStorage.setItem('nxstops_crew_mode', 'true');
        showToast('Crew mode activated!');
      } else {
        showToast('Failed to start crew mode. Try again.');
      }
      setCrewSyncing(false);
    };

    const stopCrewMode = () => {
      setCrewMode(false);
      setCrewCode(null);
      sessionStorage.removeItem('nxstops_crew_code');
      sessionStorage.removeItem('nxstops_crew_mode');
    };

    const joinCrew = async () => {
      const code = joinCrewInput.trim().toUpperCase();
      if (code.length < 4) { showToast('Enter a valid crew code'); return; }
      setCrewSyncing(true);
      const trip = await loadCrewTrip(code);
      if (trip) {
        // Load the shared plan
        const parsed: Record<number, Stop[]> = {};
        for (const [day, stops] of Object.entries(trip.trip_days)) {
          parsed[Number(day)] = (stops as Stop[]).map(s => ({
            ...s,
            addedAt: new Date((s as Stop).addedAt),
          }));
        }
        setTripDays(parsed);
        setCrewMode(true);
        setCrewCode(code);
        sessionStorage.setItem('nxstops_crew_code', code);
        sessionStorage.setItem('nxstops_crew_mode', 'true');
        setShowJoinCrew(false);
        setJoinCrewInput('');
        showToast(`Joined crew ${code}!`);
      } else {
        showToast('Crew not found. Check the code.');
      }
      setCrewSyncing(false);
    };

    const shareCrewPlan = async () => {
      const allDays = Object.entries(tripDays).sort(([a], [b]) => Number(a) - Number(b));
      const lines = allDays.map(([day, stops]) => {
        if (stops.length === 0) return '';
        const stopList = stops.map((s, i) => `  ${i + 1}. ${getStopName(s)} (${getStopCategory(s)})`).join('\n');
        return `Day ${day}:\n${stopList}`;
      }).filter(Boolean).join('\n\n');
      const joinInstructions = crewCode
        ? `\n🔗 Join our crew on NxStops!\n\n1. Open https://vynbynave.vercel.app\n2. Go to Plan tab → tap "Join Crew"\n3. Enter code: ${crewCode}\n`
        : '';
      const summary = `${cityLabel} Trip Plan${joinInstructions}\n${lines}\n\nPlanned with NxStops ✨`;
      if (navigator.share) {
        await navigator.share({ title: `${cityLabel} Trip Plan`, text: summary, url: 'https://vynbynave.vercel.app' });
      } else {
        await navigator.clipboard.writeText(summary);
        showToast('Plan copied — share with your crew!');
      }
    };

    return (
      <div>
        {/* Header */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>
              Your Trip Plan
            </h1>
            {/* Crew Toggle */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {!crewMode && (
                <button onClick={() => setShowJoinCrew(true)}
                  style={{
                    padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                    border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                    color: '#78716C', cursor: 'pointer',
                  }}>
                  Join Crew
                </button>
              )}
              <button
                onClick={crewMode ? stopCrewMode : startCrewMode}
                disabled={crewSyncing}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                  border: crewMode ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.1)',
                  background: crewMode ? 'rgba(245,158,11,0.12)' : 'transparent',
                  color: crewMode ? '#F59E0B' : '#78716C', cursor: crewSyncing ? 'default' : 'pointer',
                  opacity: crewSyncing ? 0.5 : 1,
                }}>
                {crewSyncing ? '...' : crewMode ? '👥 Crew On' : '👤 Solo'}
              </button>
            </div>
          </div>
          <p style={{ color: '#78716C', fontSize: '13px' }}>
            {cityLabel} · {totalStops} stop{totalStops !== 1 ? 's' : ''} · {dayCount} day{dayCount !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Join Crew Modal */}
        {showJoinCrew && (
          <div style={{
            ...cardStyle, marginBottom: '12px', padding: '16px',
            background: 'rgba(28,25,23,0.95)', border: '1px solid rgba(245,158,11,0.15)',
          }}>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px', color: '#FFFBEB' }}>Join a Crew</div>
            <p style={{ fontSize: '12px', color: '#A8A29E', marginBottom: '12px' }}>Enter the crew code shared with you</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="e.g. X7K3NP"
                value={joinCrewInput}
                onChange={e => setJoinCrewInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && joinCrew()}
                maxLength={6}
                style={{
                  flex: 1, padding: '12px 14px', borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.1)', background: '#0C0A09',
                  color: '#FFFBEB', fontSize: '18px', fontWeight: 700,
                  letterSpacing: '4px', textAlign: 'center', outline: 'none',
                  textTransform: 'uppercase',
                }}
              />
              <button onClick={joinCrew} disabled={crewSyncing || joinCrewInput.length < 4}
                style={{
                  padding: '12px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                  background: joinCrewInput.length >= 4 ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'rgba(255,255,255,0.06)',
                  color: joinCrewInput.length >= 4 ? '#0C0A09' : '#78716C',
                  fontSize: '14px', fontWeight: 600,
                }}>
                {crewSyncing ? '...' : 'Join'}
              </button>
            </div>
            <button onClick={() => { setShowJoinCrew(false); setJoinCrewInput(''); }}
              style={{ width: '100%', padding: '8px', marginTop: '8px', background: 'none', border: 'none', color: '#78716C', fontSize: '12px', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        )}

        {/* Crew Mode Banner */}
        {crewMode && crewCode && (
          <div style={{
            ...cardStyle, marginBottom: '12px', padding: '16px',
            background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(217,119,6,0.05))',
            border: '1px solid rgba(245,158,11,0.2)',
          }}>
            <div style={{ fontSize: '11px', color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Share this code with your crew</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{
                flex: 1, fontSize: '28px', fontWeight: 700, letterSpacing: '6px', color: '#F59E0B',
                background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '10px 16px', textAlign: 'center',
                fontFamily: 'monospace',
              }}>{crewCode}</div>
              <button onClick={() => { navigator.clipboard.writeText(crewCode); showToast('Code copied!'); }}
                style={{
                  padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(245,158,11,0.3)',
                  background: 'rgba(245,158,11,0.1)', color: '#F59E0B', cursor: 'pointer',
                  fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap',
                }}>
                Copy
              </button>
            </div>
            <button onClick={shareCrewPlan}
              style={{
                width: '100%', padding: '12px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                color: '#0C0A09', fontSize: '14px', fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              }}>
              📤 Share Plan with Crew
            </button>
            <p style={{ fontSize: '11px', color: '#A8A29E', marginTop: '8px', lineHeight: 1.4, textAlign: 'center' }}>
              Your crew opens the app → Plan tab → &quot;Join Crew&quot; → enters the code above
            </p>
          </div>
        )}

        {/* Trip Weather Forecast */}
        {weather && weather.forecast.length > 0 && dayCount > 0 && (
          <div style={{ ...cardStyle, marginBottom: '12px', padding: '12px', background: 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(147,197,253,0.03))', border: '1px solid rgba(59,130,246,0.1)' }}>
            <div style={{ fontSize: '11px', color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Pack for your trip</div>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none' }}>
              {weather.forecast.slice(0, dayCount).map((day, i) => (
                <div key={day.date} style={{ textAlign: 'center', minWidth: '60px', flexShrink: 0, padding: '6px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)' }}>
                  <div style={{ fontSize: '10px', color: '#78716C', marginBottom: '2px' }}>Day {i + 1}</div>
                  <div style={{ fontSize: '20px', marginBottom: '2px' }}>{day.emoji}</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#FFFBEB' }}>{day.high}°</div>
                  <div style={{ fontSize: '10px', color: '#78716C' }}>{day.low}°</div>
                  {day.precipChance > 30 && (
                    <div style={{ fontSize: '9px', color: '#93C5FD', marginTop: '2px' }}>💧 {day.precipChance}%</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Day Tabs */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '12px', scrollbarWidth: 'none' }}>
          {sortedDays.map(day => {
            const stops = tripDays[day] || [];
            const isActive = activeDay === day;
            return (
              <button key={day} onClick={() => setActiveDay(day)}
                style={{
                  padding: '8px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 600,
                  border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  background: isActive ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'rgba(255,255,255,0.06)',
                  color: isActive ? '#0C0A09' : '#A8A29E',
                }}>
                Day {day} ({stops.length})
              </button>
            );
          })}
          <button onClick={addDay}
            style={{
              padding: '8px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 600,
              border: '1px dashed rgba(255,255,255,0.15)', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              background: 'transparent', color: '#78716C',
            }}>
            + Day
          </button>
        </div>

        {/* Active day stops */}
        {dayPlan.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: 'center', padding: '32px 20px' }}>
            <p style={{ color: '#A8A29E', fontSize: '14px' }}>No stops on Day {activeDay} yet. Explore to add some!</p>
          </div>
        ) : (<>
          {dayPlan.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', padding: '6px 10px', borderRadius: '8px', background: 'rgba(245,158,11,0.06)' }}>
              <span style={{ fontSize: '12px' }}>↕️</span>
              <span style={{ fontSize: '11px', color: '#D97706', fontWeight: 500 }}>Tap the arrows to reorder your stops</span>
            </div>
          )}
          <div style={{ position: 'relative', paddingLeft: '32px' }}>
            {/* Vertical route line */}
            <div style={{
              position: 'absolute', left: '14px', top: '16px',
              bottom: '16px', width: '2px',
              background: 'linear-gradient(to bottom, #F59E0B, rgba(245,158,11,0.1))',
              borderRadius: '1px',
            }} />

            {dayPlan.map((stop, index) => (
              <div key={stop.id}>
                <div style={{ position: 'relative', marginBottom: index < dayPlan.length - 1 ? '4px' : '16px' }}>
                  {/* Stop number circle */}
                  <div style={{
                    position: 'absolute', left: '-32px', top: '16px',
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: stop.type === 'event'
                      ? 'linear-gradient(135deg, #8B5CF6, #7C3AED)'
                      : 'linear-gradient(135deg, #F59E0B, #D97706)',
                    color: stop.type === 'event' ? '#FFFBEB' : '#0C0A09',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 700, zIndex: 1,
                    boxShadow: '0 0 0 4px #0C0A09',
                  }}>
                    {index + 1}
                  </div>

                  {/* Stop card */}
                  <div style={{
                    ...cardStyle, marginBottom: 0, overflow: 'hidden',
                    border: stop.type === 'event'
                      ? '1px solid rgba(139,92,246,0.15)'
                      : '1px solid rgba(245,158,11,0.1)',
                  }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      {stop.type === 'place' && stop.place?.photoUrl && (
                        <div style={{
                          width: '80px', height: '80px', borderRadius: '12px', flexShrink: 0,
                          background: `url(${stop.place.photoUrl})`,
                          backgroundSize: 'cover', backgroundPosition: 'center',
                        }} />
                      )}
                      {stop.type === 'event' && stop.event?.imageUrl && (
                        <div style={{
                          width: '80px', height: '80px', borderRadius: '12px', flexShrink: 0,
                          background: `url(${stop.event.imageUrl})`,
                          backgroundSize: 'cover', backgroundPosition: 'center',
                        }} />
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {getStopName(stop)}
                        </h3>
                        {stop.type === 'place' && stop.place && (
                          <>
                            <p style={{ fontSize: '12px', color: '#A8A29E', marginBottom: '4px' }}>
                              {stop.place.categoryDisplay}
                              {stop.place.distance != null && ` · ${formatDistance(stop.place.distance, useMiles)} ${getDistanceReference()}`}
                            </p>
                            {stop.place.rating > 0 && (
                              <div style={{ fontSize: '12px' }}>
                                <span style={{ color: '#F59E0B' }}>★ {stop.place.rating.toFixed(1)}</span>
                                <span style={{ color: '#78716C' }}> ({stop.place.reviewCount})</span>
                              </div>
                            )}
                          </>
                        )}
                        {stop.type === 'event' && stop.event && (
                          <>
                            <p style={{ fontSize: '12px', color: '#C084FC', marginBottom: '4px' }}>
                              {formatEventDate(stop.event.date)}
                              {stop.event.time && ` · ${formatEventTime(stop.event.time)}`}
                            </p>
                            <p style={{ fontSize: '12px', color: '#A8A29E' }}>
                              {stop.event.venue}
                            </p>
                          </>
                        )}

                        {/* Mini actions */}
                        <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                          {stop.type === 'place' && stop.place?.googleMapsUrl && (
                            <a href={stop.place.googleMapsUrl} target="_blank" rel="noopener noreferrer"
                              style={{
                                padding: '5px 10px', borderRadius: '8px', fontSize: '11px',
                                background: 'rgba(245,158,11,0.1)', color: '#F59E0B',
                                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px',
                              }}>
                              <DirectionsIcon /> Go
                            </a>
                          )}
                          {stop.type === 'place' && stop.place?.phone && (
                            <a href={`tel:${stop.place.phone}`}
                              style={{
                                padding: '5px 10px', borderRadius: '8px', fontSize: '11px',
                                background: 'rgba(255,255,255,0.05)', color: '#A8A29E',
                                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px',
                              }}>
                              <PhoneIcon /> Call
                            </a>
                          )}
                          {stop.type === 'event' && stop.event?.url && (
                            <a href={stop.event.url} target="_blank" rel="noopener noreferrer"
                              style={{
                                padding: '5px 10px', borderRadius: '8px', fontSize: '11px',
                                background: 'rgba(139,92,246,0.1)', color: '#C084FC',
                                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px',
                              }}>
                              🎫 Tickets
                            </a>
                          )}
                          {/* Move to different day */}
                          {dayCount > 1 && (
                            <select
                              value=""
                              onChange={e => { if (e.target.value) moveStopToDay(stop.id, activeDay, Number(e.target.value)); }}
                              style={{
                                padding: '5px 8px', borderRadius: '8px', fontSize: '11px',
                                background: 'rgba(255,255,255,0.05)', color: '#78716C',
                                border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer',
                              }}>
                              <option value="">Move to...</option>
                              {sortedDays.filter(d => d !== activeDay).map(d => (
                                <option key={d} value={d}>Day {d}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>

                      {/* Right controls: reorder + remove */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', justifyContent: 'center', minWidth: '44px' }}>
                        {index > 0 && (
                          <button onClick={() => movePlanStop(index, 'up')}
                            aria-label="Move up"
                            style={{
                              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
                              color: '#F59E0B', cursor: 'pointer', fontSize: '14px', fontWeight: 700,
                              padding: '6px 10px', borderRadius: '8px',
                              minHeight: '36px', minWidth: '44px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px',
                            }}>
                            ↑
                          </button>
                        )}
                        <button onClick={() => removeFromPlan(stop.id)}
                          aria-label="Remove stop"
                          style={{
                            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
                            color: '#F87171', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                            padding: '6px 8px', borderRadius: '8px',
                            minHeight: '32px', minWidth: '44px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                          ✕
                        </button>
                        {index < dayPlan.length - 1 && (
                          <button onClick={() => movePlanStop(index, 'down')}
                            aria-label="Move down"
                            style={{
                              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
                              color: '#F59E0B', cursor: 'pointer', fontSize: '14px', fontWeight: 700,
                              padding: '6px 10px', borderRadius: '8px',
                              minHeight: '36px', minWidth: '44px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px',
                            }}>
                            ↓
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transportation between stops */}
                {index < dayPlan.length - 1 && (() => {
                  const transport = getTransportInfo(stop, dayPlan[index + 1]);
                  if (!transport) return null;
                  return (
                    <div style={{
                      marginLeft: '0', marginBottom: '4px', padding: '8px 12px',
                      display: 'flex', alignItems: 'center', gap: '10px',
                      background: 'rgba(255,255,255,0.02)', borderRadius: '10px',
                      border: '1px dashed rgba(255,255,255,0.06)',
                    }}>
                      <span style={{ fontSize: '16px' }}>{transport.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', color: '#A8A29E' }}>{transport.text}</div>
                        <div style={{ fontSize: '11px', color: '#57534E' }}>{transport.distance}</div>
                      </div>
                      <a href={transport.mapsUrl} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: '11px', color: '#F59E0B', textDecoration: 'none' }}>
                        Directions
                      </a>
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        </>)}

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
          {dayPlan.length > 0 && (
            <a href={getRouteUrl()} target="_blank" rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#0C0A09',
                border: 'none', borderRadius: '14px', padding: '14px',
                fontSize: '15px', fontWeight: 600, textDecoration: 'none',
                boxShadow: '0 4px 20px rgba(245,158,11,0.3)',
              }}>
              <DirectionsIcon /> Get Day {activeDay} Route
            </a>
          )}

          <button onClick={sharePlan}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              background: 'rgba(255,255,255,0.06)', color: '#FFFBEB',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px',
              padding: '14px', fontSize: '15px', fontWeight: 500, cursor: 'pointer',
            }}>
            <ShareIcon /> Share Trip
          </button>

          {dayCount > 1 && (
            <button onClick={() => removeDay(activeDay)}
              style={{
                background: 'none', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171',
                fontSize: '13px', cursor: 'pointer', padding: '10px', borderRadius: '10px',
              }}>
              Delete Day {activeDay}
            </button>
          )}

          <button onClick={clearPlan}
            style={{
              background: 'none', border: 'none', color: '#78716C',
              fontSize: '13px', cursor: 'pointer', padding: '10px',
            }}>
            Clear all stops
          </button>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // PLACE DETAIL MODAL
  // ==========================================================================

  const PlaceDetailModal = ({ place }: { place: Place }) => {
    const hoursStatus = getHoursStatus(place.hours, place.openNow);
    const inPlan = isInPlan(place.placeId);

    // Build photo URLs from photoNames (up to 10)
    const galleryPhotos = (place.photoNames || []).slice(0, 10).map(
      (name) => `/api/places?action=photo&name=${encodeURIComponent(name)}&maxWidth=800`
    );
    const hasMultiplePhotos = galleryPhotos.length > 1;

    const goToPhoto = (dir: 'prev' | 'next') => {
      if (dir === 'prev' && activePhotoIndex > 0) setActivePhotoIndex(activePhotoIndex - 1);
      if (dir === 'next' && activePhotoIndex < galleryPhotos.length - 1) setActivePhotoIndex(activePhotoIndex + 1);
    };

    return (
      <div
        className="modal-backdrop"
        role="dialog"
        aria-label={`Details for ${place.name}`}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}
        onClick={() => setSelectedPlace(null)}
      >
        <div
          className="modal-sheet"
          style={{
            background: '#1C1917', borderRadius: '24px 24px 0 0',
            maxWidth: '430px', width: '100%', maxHeight: '90vh',
            overflowY: 'auto', overflowX: 'hidden',
            border: '1px solid rgba(255,255,255,0.06)', borderBottom: 'none',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Photo Gallery / Hero */}
          {galleryPhotos.length > 0 && (
            <div style={{ position: 'relative', width: '100%', height: '250px', borderRadius: '24px 24px 0 0', overflow: 'hidden', background: '#292524' }}>
              {/* Sliding photo strip */}
              <div style={{
                display: 'flex', width: `${galleryPhotos.length * 100}%`, height: '100%',
                transform: `translateX(-${activePhotoIndex * (100 / galleryPhotos.length)}%)`,
                transition: 'transform 0.35s ease-out',
              }}>
                {galleryPhotos.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`${place.name} photo ${i + 1}`}
                    style={{
                      width: `${100 / galleryPhotos.length}%`, height: '100%',
                      objectFit: 'cover', display: 'block', flexShrink: 0,
                    }}
                  />
                ))}
              </div>

              {/* Gradient overlay */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to bottom, transparent 50%, #1C1917)',
                pointerEvents: 'none',
              }} />

              {/* Tap zones for prev/next */}
              {hasMultiplePhotos && (
                <>
                  {activePhotoIndex > 0 && (
                    <button onClick={() => goToPhoto('prev')}
                      aria-label="Previous photo"
                      style={{
                        position: 'absolute', left: 0, top: 0, width: '40%', height: '100%',
                        background: 'transparent', border: 'none', cursor: 'pointer', zIndex: 1,
                      }} />
                  )}
                  {activePhotoIndex < galleryPhotos.length - 1 && (
                    <button onClick={() => goToPhoto('next')}
                      aria-label="Next photo"
                      style={{
                        position: 'absolute', right: 0, top: 0, width: '40%', height: '100%',
                        background: 'transparent', border: 'none', cursor: 'pointer', zIndex: 1,
                      }} />
                  )}
                </>
              )}

              {/* Prev/Next arrow buttons */}
              {hasMultiplePhotos && activePhotoIndex > 0 && (
                <button onClick={() => goToPhoto('prev')}
                  aria-label="Previous photo"
                  style={{
                    position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 2,
                    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', border: 'none',
                    borderRadius: '50%', width: '36px', height: '36px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#FFFBEB', fontSize: '16px', fontWeight: 700,
                  }}>
                  ‹
                </button>
              )}
              {hasMultiplePhotos && activePhotoIndex < galleryPhotos.length - 1 && (
                <button onClick={() => goToPhoto('next')}
                  aria-label="Next photo"
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 2,
                    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', border: 'none',
                    borderRadius: '50%', width: '36px', height: '36px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#FFFBEB', fontSize: '16px', fontWeight: 700,
                  }}>
                  ›
                </button>
              )}

              {/* Close button */}
              <button onClick={() => setSelectedPlace(null)}
                aria-label="Close"
                style={{
                  position: 'absolute', top: '12px', right: '12px', zIndex: 3,
                  background: 'rgba(0,0,0,0.5)', border: 'none',
                  borderRadius: '50%', width: '36px', height: '36px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#FFFBEB', backdropFilter: 'blur(8px)',
                }}>
                <CloseIcon />
              </button>

              {/* Photo counter + dots */}
              {hasMultiplePhotos && (
                <div style={{
                  position: 'absolute', bottom: '10px', left: '50%',
                  transform: 'translateX(-50%)', zIndex: 2,
                  display: 'flex', gap: '5px', alignItems: 'center',
                  background: 'rgba(0,0,0,0.4)', borderRadius: '12px', padding: '4px 10px',
                  backdropFilter: 'blur(8px)',
                }}>
                  {galleryPhotos.map((_, i) => (
                    <button
                      key={i}
                      aria-label={`Go to photo ${i + 1}`}
                      onClick={() => setActivePhotoIndex(i)}
                      style={{
                        width: i === activePhotoIndex ? '14px' : '8px',
                        height: '8px',
                        borderRadius: '4px',
                        background: i === activePhotoIndex ? '#F59E0B' : 'rgba(255,255,255,0.4)',
                        border: 'none', padding: 0, cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Content */}
          <div style={{ padding: '20px 20px 120px' }}>
            {galleryPhotos.length === 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                <button onClick={() => setSelectedPlace(null)}
                  aria-label="Close"
                  style={{ background: 'none', border: 'none', color: '#78716C', cursor: 'pointer', padding: '10px', minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CloseIcon />
                </button>
              </div>
            )}

            {/* Name */}
            <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>{place.name}</h2>

            {/* Meta row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {place.categoryDisplay && (
                <span style={{ padding: '4px 10px', background: 'rgba(245,158,11,0.12)', color: '#F59E0B', borderRadius: '8px', fontSize: '12px', fontWeight: 500 }}>
                  {place.categoryDisplay}
                </span>
              )}
              {place.rating > 0 && <StarRating rating={place.rating} count={place.reviewCount} />}
              <PriceDots level={place.priceLevel} />
            </div>

            {/* Hours status */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: '10px', marginBottom: '16px',
              background: place.openNow ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${place.openNow ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
            }}>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: place.openNow ? '#34D399' : '#F87171',
              }} />
              <span style={{ fontSize: '13px', fontWeight: 500, color: place.openNow ? '#34D399' : '#F87171' }}>
                {hoursStatus.text}
              </span>
              {hoursStatus.urgent && (
                <span style={{ fontSize: '11px', color: '#F87171', fontWeight: 600 }}>Hurry!</span>
              )}
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '20px' }}>
              {place.googleMapsUrl && (
                <a href={place.googleMapsUrl} target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                    padding: '12px 8px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)',
                    color: '#A8A29E', textDecoration: 'none', fontSize: '11px',
                  }}>
                  <DirectionsIcon />
                  Directions
                </a>
              )}
              {place.phone && (
                <a href={`tel:${place.phone}`}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                    padding: '12px 8px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)',
                    color: '#A8A29E', textDecoration: 'none', fontSize: '11px',
                  }}>
                  <PhoneIcon />
                  Call
                </a>
              )}
              {place.website && (
                <a href={place.website} target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                    padding: '12px 8px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)',
                    color: '#A8A29E', textDecoration: 'none', fontSize: '11px',
                  }}>
                  <WebsiteIcon />
                  Website
                </a>
              )}
              <button onClick={() => toggleSaved(place)}
                aria-label={isSaved(place.placeId) ? 'Remove from saved' : 'Save place'}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                  padding: '12px 8px', borderRadius: '12px', minHeight: '44px',
                  background: isSaved(place.placeId) ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.05)',
                  color: isSaved(place.placeId) ? '#F59E0B' : '#A8A29E', border: 'none', cursor: 'pointer', fontSize: '11px',
                }}>
                <span style={{ fontSize: '16px' }}>{isSaved(place.placeId) ? '♥' : '♡'}</span>
                {isSaved(place.placeId) ? 'Saved' : 'Save'}
              </button>
              <button onClick={() => sharePlace(place)}
                aria-label="Share place"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                  padding: '12px 8px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)',
                  color: '#A8A29E', border: 'none', cursor: 'pointer', fontSize: '11px', minHeight: '44px',
                }}>
                <ShareIcon />
                Share
              </button>
            </div>

            {/* Reserve / Book */}
            {(isReservable(place) || isBookable(place)) && (
              <div style={{ marginBottom: '16px' }}>
                <a href={getBookingUrl(place)} target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    width: '100%', padding: '14px', borderRadius: '12px', boxSizing: 'border-box',
                    background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                    color: '#34D399', textDecoration: 'none', fontSize: '14px', fontWeight: 600,
                  }}>
                  {isReservable(place) ? 'Reserve a Table' : 'Book Tickets'}
                </a>
                {place.googleMapsUrl && (
                  <a href={place.googleMapsUrl} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'block', textAlign: 'center', marginTop: '8px', color: '#A8A29E', fontSize: '12px', textDecoration: 'none' }}>
                    View on Google Maps
                  </a>
                )}
              </div>
            )}

            {/* Address */}
            {place.address && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Address</div>
                <a href={place.googleMapsUrl} target="_blank" rel="noopener noreferrer"
                  style={{ color: '#FFFBEB', fontSize: '14px', textDecoration: 'none', lineHeight: 1.4 }}>
                  {place.address}
                </a>
              </div>
            )}

            {/* Editorial Summary */}
            {place.editorialSummary && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>About</div>
                <p style={{ color: '#d4d0cc', fontSize: '14px', lineHeight: 1.5 }}>{place.editorialSummary}</p>
              </div>
            )}

            {/* Hours */}
            {place.hours.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Hours</div>
                {place.hours.map((h, i) => {
                  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                  const today = days[new Date().getDay()];
                  const isToday = h.startsWith(today);
                  return (
                    <div key={i} style={{
                      fontSize: '13px', padding: '4px 0',
                      color: isToday ? '#FFFBEB' : '#78716C',
                      fontWeight: isToday ? 600 : 400,
                    }}>
                      {h}
                      {isToday && <span style={{ color: '#F59E0B', marginLeft: '8px', fontSize: '11px' }}>Today</span>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Distance */}
            {place.distance != null && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Distance</div>
                <p style={{ color: '#FFFBEB', fontSize: '14px' }}>{formatDistance(place.distance, useMiles)} {getDistanceReference()}</p>
              </div>
            )}

            {/* Good to Know (Safety) */}
            {getSafetyIndicators(place).length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Good to know</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {getSafetyIndicators(place).map(ind => (
                    <span key={ind} style={{ fontSize: '12px', color: '#A8A29E', padding: '4px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                      {ind}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Community Tags */}
            {placeTagsCache[place.placeId] && Object.keys(placeTagsCache[place.placeId]).length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Community Tags</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {Object.entries(placeTagsCache[place.placeId]).map(([tag, count]) => {
                    const tagInfo = COMMUNITY_TAGS.find(t => t.id === tag);
                    return tagInfo ? (
                      <span key={tag} style={{ fontSize: '12px', color: '#D4A574', padding: '4px 10px', background: 'rgba(212,165,116,0.08)', borderRadius: '8px' }}>
                        {tagInfo.emoji} {tagInfo.label} ({count})
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {/* Reviews Section */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '11px', color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Community Reviews</div>
                {user && !showReviewForm && (
                  <button onClick={() => setShowReviewForm(true)}
                    style={{ background: 'none', border: '1px solid rgba(245,158,11,0.3)', color: '#F59E0B', borderRadius: '8px', padding: '5px 12px', fontSize: '11px', cursor: 'pointer' }}>
                    Leave a Review
                  </button>
                )}
              </div>

              {/* Review Form */}
              {showReviewForm && user && (
                <div style={{ ...cardStyle, marginBottom: '12px', border: '1px solid rgba(245,158,11,0.15)' }}>
                  {/* Star Rating */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button key={star} onClick={() => setReviewRating(star)}
                        aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                        style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', padding: '8px', color: star <= reviewRating ? '#F59E0B' : '#3a3632', minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        ★
                      </button>
                    ))}
                  </div>

                  {/* Review Text */}
                  <textarea
                    placeholder="Share your experience (optional)"
                    value={reviewText}
                    onChange={e => setReviewText(e.target.value)}
                    style={{
                      width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)',
                      background: '#0C0A09', color: '#FFFBEB', fontSize: '14px', resize: 'vertical',
                      minHeight: '60px', boxSizing: 'border-box', outline: 'none',
                    }}
                  />

                  {/* Community Tags */}
                  <div style={{ marginTop: '10px', marginBottom: '10px' }}>
                    <div style={{ fontSize: '11px', color: '#78716C', marginBottom: '6px' }}>Tag this place:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {COMMUNITY_TAGS.map(tag => {
                        const selected = reviewTags.includes(tag.id);
                        return (
                          <button key={tag.id}
                            onClick={() => setReviewTags(selected ? reviewTags.filter(t => t !== tag.id) : [...reviewTags, tag.id])}
                            style={{
                              padding: '4px 10px', borderRadius: '12px', fontSize: '11px',
                              border: selected ? '1px solid rgba(212,165,116,0.4)' : '1px solid rgba(255,255,255,0.08)',
                              background: selected ? 'rgba(212,165,116,0.12)' : 'transparent',
                              color: selected ? '#D4A574' : '#78716C', cursor: 'pointer',
                            }}>
                            {tag.emoji} {tag.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Submit */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handleSubmitReview}
                      disabled={reviewRating === 0 || reviewSubmitting}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
                        background: reviewRating > 0 ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'rgba(255,255,255,0.1)',
                        color: reviewRating > 0 ? '#0C0A09' : '#78716C',
                        fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: reviewSubmitting ? 0.6 : 1,
                      }}>
                      {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                    </button>
                    <button onClick={() => { setShowReviewForm(false); setReviewRating(0); setReviewText(''); setReviewTags([]); }}
                      style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', background: 'none', color: '#78716C', fontSize: '13px', cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Existing Reviews */}
              {placeReviews.length > 0 ? (
                placeReviews.slice(0, 5).map(review => (
                  <div key={review.id} style={{ ...cardStyle, marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ color: '#F59E0B', fontSize: '13px' }}>
                        {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                      </span>
                      <span style={{ color: '#57534E', fontSize: '11px' }}>
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {review.review_text && (
                      <p style={{ color: '#d4d0cc', fontSize: '13px', lineHeight: 1.4, marginBottom: '6px' }}>{review.review_text}</p>
                    )}
                    {review.tags && review.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {review.tags.map(tag => {
                          const tagInfo = COMMUNITY_TAGS.find(t => t.id === tag);
                          return tagInfo ? (
                            <span key={tag} style={{ fontSize: '10px', color: '#D4A574', padding: '2px 6px', background: 'rgba(212,165,116,0.08)', borderRadius: '4px' }}>
                              {tagInfo.emoji} {tagInfo.label}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p style={{ color: '#57534E', fontSize: '13px' }}>No reviews yet. Be the first!</p>
              )}
            </div>
          </div>

          {/* Sticky Bottom Bar */}
          <div style={{
            position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            maxWidth: '430px', width: '100%', padding: '16px 20px 32px',
            background: 'linear-gradient(to top, #1C1917, rgba(28,25,23,0.95))',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            <button
              onClick={() => {
                if (inPlan) {
                  const stop = Object.values(tripDays).flat().find(s => s.place?.placeId === place.placeId);
                  if (stop) removeFromPlan(stop.id);
                } else {
                  addToPlan(place);
                }
              }}
              style={{
                width: '100%', padding: '16px', borderRadius: '14px',
                fontSize: '16px', fontWeight: 600, cursor: 'pointer',
                background: inPlan ? 'transparent' : 'linear-gradient(135deg, #F59E0B, #D97706)',
                color: inPlan ? '#F59E0B' : '#0C0A09',
                border: inPlan ? '2px solid #F59E0B' : 'none',
                boxShadow: inPlan ? 'none' : '0 4px 20px rgba(245,158,11,0.3)',
              }}
            >
              {inPlan ? '✓ In Your Plan — Remove' : '+ Add to Plan'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // PROFILE SCREEN
  // ==========================================================================

  const ProfileScreen = () => {
    const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
    const fullName = (user?.user_metadata?.full_name as string) || user?.email || 'Traveler';
    const profileTotalStops = Object.values(tripDays).reduce((sum, stops) => sum + stops.length, 0);
    const profileDayCount = Object.keys(tripDays).length;

    return (
      <div
        className="modal-backdrop"
        role="dialog"
        aria-label="Profile"
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}
        onClick={() => setShowProfile(false)}
      >
        <div
          className="modal-sheet"
          style={{
            background: '#1C1917', borderRadius: '24px 24px 0 0',
            maxWidth: '430px', width: '100%', maxHeight: '92vh', overflow: 'auto',
            border: '1px solid rgba(255,255,255,0.06)', borderBottom: 'none',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ padding: '24px 20px 40px' }}>
            {/* Header with close button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Profile</h2>
              <button
                onClick={() => setShowProfile(false)}
                aria-label="Close profile"
                style={{
                  background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%',
                  width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#A8A29E', fontSize: '18px',
                }}
              >
                ✕
              </button>
            </div>

            <div>
                {/* Avatar & Name */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
                  <div style={{
                    width: '80px', height: '80px', borderRadius: '50%', marginBottom: '12px',
                    border: '3px solid rgba(245,158,11,0.3)', overflow: 'hidden',
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(217,119,6,0.2))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#FFFBEB', marginBottom: '4px' }}>
                    {fullName}
                  </div>
                </div>

                {/* Stats Row */}
                <div style={{
                  display: 'flex', justifyContent: 'center', gap: '0',
                  background: 'rgba(255,255,255,0.03)', borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.06)', marginBottom: '24px', overflow: 'hidden',
                }}>
                  {[
                    { value: savedPlaces.length, label: 'Saved' },
                    { value: profileTotalStops, label: 'Planned' },
                    { value: profileDayCount, label: 'Days' },
                  ].map((stat, i) => (
                    <div key={stat.label} style={{
                      flex: 1, textAlign: 'center', padding: '16px 12px',
                      borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    }}>
                      <div style={{
                        fontSize: '22px', fontWeight: 700,
                        background: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                      }}>
                        {stat.value}
                      </div>
                      <div style={{ fontSize: '11px', color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '4px' }}>
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Saved Places Section */}
                {savedPlaces.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '11px', color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
                      Saved Places
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {savedPlaces.map(place => (
                        <button
                          key={place.placeId}
                          onClick={() => { setSelectedPlace(place); setShowProfile(false); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '12px', width: '100%',
                            padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)',
                            background: 'rgba(255,255,255,0.03)', cursor: 'pointer', textAlign: 'left',
                          }}
                        >
                          <div style={{
                            width: '44px', height: '44px', borderRadius: '10px', flexShrink: 0, overflow: 'hidden',
                            background: place.photoUrl
                              ? `url(${place.photoUrl}) center/cover no-repeat`
                              : 'rgba(245,158,11,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {!place.photoUrl && <span style={{ fontSize: '18px' }}>📍</span>}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#FFFBEB', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {place.name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                              {place.rating > 0 && (
                                <span style={{ fontSize: '11px', color: '#F59E0B' }}>★ {place.rating.toFixed(1)}</span>
                              )}
                              {place.address && (
                                <span style={{ fontSize: '11px', color: '#78716C', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {place.address.split(',')[0]}
                                </span>
                              )}
                            </div>
                          </div>
                          <span style={{ color: '#78716C', fontSize: '14px', flexShrink: 0 }}>›</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* My Trips Section */}
                {profileTotalStops > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '11px', color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
                      My Trips
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {Object.entries(tripDays).map(([day, stops]) => (
                        <div
                          key={day}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '12px 14px', borderRadius: '12px',
                            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '36px', height: '36px', borderRadius: '10px',
                              background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '14px', fontWeight: 700, color: '#F59E0B',
                            }}>
                              {day}
                            </div>
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: 600, color: '#FFFBEB' }}>Day {day}</div>
                              <div style={{ fontSize: '11px', color: '#78716C' }}>
                                {stops.length} {stops.length === 1 ? 'stop' : 'stops'}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {stops.slice(0, 3).map((stop, i) => (
                              <div key={i} style={{
                                width: '24px', height: '24px', borderRadius: '6px', overflow: 'hidden',
                                background: (stop.place?.photoUrl)
                                  ? `url(${stop.place.photoUrl}) center/cover no-repeat`
                                  : 'rgba(245,158,11,0.15)',
                                border: '1px solid rgba(255,255,255,0.06)',
                              }} />
                            ))}
                            {stops.length > 3 && (
                              <div style={{
                                width: '24px', height: '24px', borderRadius: '6px',
                                background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '9px', color: '#78716C', fontWeight: 600,
                              }}>
                                +{stops.length - 3}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================================================
  // ADMIN PANEL
  // ==========================================================================

  const AdminPanel = () => (
    <div
      style={{
        position: 'fixed', inset: 0, background: '#0C0A09', zIndex: 200,
        overflow: 'auto', maxWidth: '430px', margin: '0 auto',
      }}
    >
      {/* Admin Header */}
      <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Admin Panel</h1>
          <p style={{ color: '#78716C', fontSize: '11px' }}>NxStops by Nav&eacute;</p>
        </div>
        <button onClick={() => setShowAdmin(false)}
          aria-label="Close admin panel"
          style={{ background: 'none', border: 'none', color: '#78716C', cursor: 'pointer', padding: '10px', minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CloseIcon />
        </button>
      </div>

      {/* Admin Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {(['dashboard', 'signups', 'cities'] as const).map(tab => (
          <button key={tab}
            onClick={() => setAdminTab(tab)}
            style={{
              flex: 1, padding: '12px', fontSize: '13px', fontWeight: 500,
              background: 'none', border: 'none', cursor: 'pointer',
              color: adminTab === tab ? '#F59E0B' : '#78716C',
              borderBottom: adminTab === tab ? '2px solid #F59E0B' : '2px solid transparent',
            }}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ padding: '20px' }}>
        {adminLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ color: '#78716C', fontSize: '14px' }}>Loading admin data...</div>
          </div>
        ) : (
          <>
            {/* Dashboard */}
            {adminTab === 'dashboard' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                  {[
                    { label: 'Email Signups', value: adminSignups.length, emoji: '📬' },
                    { label: 'Total Cities', value: adminCities.length, emoji: '🏙️' },
                    { label: 'Active Cities', value: adminCities.filter(c => c.is_active).length, emoji: '✅' },
                    { label: 'Inactive Cities', value: adminCities.filter(c => !c.is_active).length, emoji: '⏸️' },
                  ].map(stat => (
                    <div key={stat.label} style={{ ...cardStyle }}>
                      <div style={{ fontSize: '24px', marginBottom: '4px' }}>{stat.emoji}</div>
                      <div style={{ fontSize: '28px', fontWeight: 700, color: '#FFFBEB' }}>{stat.value}</div>
                      <div style={{ fontSize: '11px', color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Recent Signups Preview */}
                <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#A8A29E' }}>Recent Signups</h3>
                {adminSignups.slice(0, 5).map(s => (
                  <div key={s.id} style={{
                    display: 'flex', justifyContent: 'space-between', padding: '10px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '13px',
                  }}>
                    <span style={{ color: '#FFFBEB' }}>{s.email}</span>
                    <span style={{ color: '#78716C' }}>{s.city || 'No city'}</span>
                  </div>
                ))}
                {adminSignups.length === 0 && (
                  <p style={{ color: '#78716C', fontSize: '13px' }}>No signups yet</p>
                )}
              </div>
            )}

            {/* Signups Tab */}
            {adminTab === 'signups' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600 }}>All Signups ({adminSignups.length})</h3>
                </div>
                {adminSignups.length === 0 ? (
                  <p style={{ color: '#78716C', fontSize: '14px', textAlign: 'center', padding: '40px' }}>No signups yet. The email signup form on the home screen collects these.</p>
                ) : (
                  adminSignups.map(s => (
                    <div key={s.id} style={{
                      ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: '#FFFBEB', marginBottom: '2px' }}>{s.email}</div>
                        <div style={{ fontSize: '12px', color: '#78716C' }}>
                          {s.city || 'No city selected'} · {new Date(s.signed_up_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ fontSize: '11px', color: '#78716C' }}>
                        {new Date(s.signed_up_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Cities Tab */}
            {adminTab === 'cities' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600 }}>All Cities ({adminCities.length})</h3>
                </div>
                {adminCities.map(city => (
                  <div key={city.id} style={{
                    ...cardStyle, display: 'flex', alignItems: 'center', gap: '12px',
                  }}>
                    {city.banner_url && (
                      <div style={{
                        width: '48px', height: '48px', borderRadius: '10px', flexShrink: 0,
                        background: `url(${city.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center',
                      }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: '#FFFBEB' }}>{city.name}</div>
                      <div style={{ fontSize: '12px', color: '#78716C' }}>{city.country} · {city.region}</div>
                    </div>
                    <button
                      onClick={() => handleToggleCity(city.id, !!city.is_active)}
                      style={{
                        padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                        cursor: 'pointer', border: 'none',
                        background: city.is_active ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                        color: city.is_active ? '#34D399' : '#F87171',
                      }}
                    >
                      {city.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  // ==========================================================================
  // LOADING SCREEN
  // ==========================================================================

  if (loading && cities.length === 0) {
    return (
      <div style={{
        fontFamily: "'DM Sans', system-ui, sans-serif",
        background: '#0C0A09', minHeight: '100vh', color: '#FFFBEB',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '36px', fontWeight: 700, marginBottom: '4px',
            background: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            NxStops
          </div>
          <div style={{ fontSize: '11px', color: '#78716C', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '24px' }}>
            by Nav&eacute;
          </div>
          <div style={{
            width: '40px', height: '3px', borderRadius: '2px', margin: '0 auto',
            background: 'linear-gradient(90deg, rgba(245,158,11,0.3) 25%, #F59E0B 50%, rgba(245,158,11,0.3) 75%)',
            backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
          }} />
        </div>
      </div>
    );
  }

  // ==========================================================================
  // ONBOARDING SCREENS
  // ==========================================================================

  const ONBOARDING_SCREENS = [
    { emoji: '🌍', title: 'Welcome to NxStops', subtitle: 'Discover what to do right now, wherever you are. Curated experiences for modern travelers.' },
    { emoji: '👯', title: 'Your Trip, Your Vibe', subtitle: 'Girls trip, boys trip, family vacation — we curate places, events, and hidden gems based on who you\'re traveling with.' },
    { emoji: '🗺️', title: 'Plan Together', subtitle: 'Build multi-day itineraries, get directions between stops, and share your plan with your crew.' },
  ];

  if (showOnboarding) {
    const step = ONBOARDING_SCREENS[onboardingStep];
    return (
      <div style={{
        fontFamily: "'DM Sans', system-ui, sans-serif",
        background: '#0C0A09', minHeight: '100vh', color: '#FFFBEB',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        maxWidth: '430px', margin: '0 auto', padding: '40px 24px',
      }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: '72px', marginBottom: '24px' }}>{step.emoji}</div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '12px', lineHeight: 1.2 }}>{step.title}</h1>
          <p style={{ fontSize: '15px', color: '#A8A29E', lineHeight: 1.6, maxWidth: '300px' }}>{step.subtitle}</p>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {ONBOARDING_SCREENS.map((_, i) => (
            <div key={i} style={{
              width: i === onboardingStep ? '24px' : '8px', height: '8px', borderRadius: '4px',
              background: i === onboardingStep ? '#F59E0B' : 'rgba(255,255,255,0.15)',
              transition: 'all 0.3s ease',
            }} />
          ))}
        </div>

        {/* Actions */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={() => {
              if (onboardingStep < ONBOARDING_SCREENS.length - 1) {
                setOnboardingStep(onboardingStep + 1);
              } else {
                localStorage.setItem('nxstops_onboarded', 'true');
                setShowOnboarding(false);
              }
            }}
            style={{
              width: '100%', padding: '16px', borderRadius: '14px', border: 'none',
              background: 'linear-gradient(135deg, #F59E0B, #D97706)',
              color: '#0C0A09', fontSize: '16px', fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(245,158,11,0.3)',
            }}>
            {onboardingStep < ONBOARDING_SCREENS.length - 1 ? 'Next' : 'Get Started'}
          </button>
          {onboardingStep < ONBOARDING_SCREENS.length - 1 && (
            <button
              onClick={() => { localStorage.setItem('nxstops_onboarded', 'true'); setShowOnboarding(false); }}
              style={{ width: '100%', padding: '12px', background: 'none', border: 'none', color: '#78716C', fontSize: '13px', cursor: 'pointer' }}>
              Skip
            </button>
          )}
        </div>
      </div>
    );
  }

  // Auth screen removed — app is open to all users

  // ==========================================================================
  // MAIN RENDER
  // ==========================================================================

  return (
    <div style={{
      fontFamily: "'DM Sans', system-ui, sans-serif",
      background: 'linear-gradient(180deg, #0C0A09 0%, #1C1917 100%)',
      minHeight: '100vh', color: '#FFFBEB',
      maxWidth: '430px', margin: '0 auto', position: 'relative', overflow: 'hidden',
    }}>
      {/* Shimmer animation */}
      <style>{`
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes toastIn { from { opacity: 0; transform: translateY(16px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes offlineBannerIn { from { opacity: 0; transform: translateY(-100%); } to { opacity: 1; transform: translateY(0); } }
        @keyframes offlineBannerOut { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-100%); } }
        .modal-sheet { animation: slideUp 0.3s ease-out; }
        .modal-backdrop { animation: fadeIn 0.2s ease-out; }
        .photo-gallery-scroll::-webkit-scrollbar { display: none; }
        *:focus-visible { outline: 2px solid #F59E0B; outline-offset: 2px; }
        button:focus-visible { outline: 2px solid #F59E0B; outline-offset: 2px; }
        a:focus-visible { outline: 2px solid #F59E0B; outline-offset: 2px; }
        input:focus-visible { outline: 2px solid #F59E0B; outline-offset: 2px; }
      `}</style>

      {/* Offline banner */}
      {isOffline && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          background: '#78716C', color: '#FFFFFF',
          fontSize: '12px', textAlign: 'center', padding: '6px',
          zIndex: 9999,
          animation: 'offlineBannerIn 0.3s ease-out',
        }}>
          You're offline — showing cached data
        </div>
      )}

      {/* Header */}
      <header style={{
        padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{
            fontSize: '22px', fontWeight: 700,
            background: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            NxStops
          </div>
          <div style={{ fontSize: '10px', color: '#78716C', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            by Nav&eacute;
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', color: '#FFFBEB' }}>
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style={{ fontSize: '10px', color: '#78716C' }}>
              {currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
          </div>
          <button onClick={() => setShowSafety(true)}
            aria-label="Travel toolkit"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px', borderRadius: '10px', minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldIcon />
          </button>
          {user?.email === ADMIN_EMAIL && (
            <button onClick={openAdmin}
              aria-label="Admin settings"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px', borderRadius: '10px', minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GearIcon />
            </button>
          )}
          <button onClick={() => setShowProfile(true)}
            aria-label="Open profile"
            style={{
              width: '44px', height: '44px', borderRadius: '50%', border: '2px solid rgba(245,158,11,0.3)',
              background: user?.user_metadata?.avatar_url
                ? `url(${user.user_metadata.avatar_url}) center/cover no-repeat`
                : 'rgba(255,255,255,0.08)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', padding: 0, color: '#A8A29E', flexShrink: 0,
            }}>
            {!user?.user_metadata?.avatar_url && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A8A29E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Content */}
      <main style={{ padding: '0 20px 100px' }}>
        {screen === 'home' && HomeScreen()}
        {screen === 'discover' && DiscoverScreen()}
        {screen === 'events' && EventsScreen()}
        {screen === 'plan' && PlanScreen()}
      </main>

      {/* Bottom Navigation */}
      <nav aria-label="Main navigation" style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: '430px',
        background: 'rgba(12,10,9,0.95)', backdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', justifyContent: 'space-around',
        padding: '8px 0 28px',
      }}>
        {[
          { id: 'home' as Screen, icon: HomeIcon, label: 'Home' },
          { id: 'discover' as Screen, icon: DiscoverIcon, label: 'Discover' },
          { id: 'events' as Screen, icon: EventsIcon, label: 'Events' },
          { id: 'plan' as Screen, icon: PlanIcon, label: 'Plan' },
        ].map(tab => {
          const isActive = screen === tab.id;
          const canNavigate = tab.id === 'home' || useGps || selectedCity;
          return (
            <button
              key={tab.id}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                background: 'none', border: 'none',
                color: isActive ? '#FFFBEB' : canNavigate ? '#78716C' : '#3a3632',
                fontSize: '10px', fontWeight: 500, cursor: canNavigate ? 'pointer' : 'default',
                padding: '8px 20px', borderRadius: '12px', position: 'relative',
                opacity: canNavigate ? 1 : 0.4, minHeight: '48px',
              }}
              onClick={() => canNavigate && setScreen(tab.id)}
            >
              {isActive && (
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '44px', height: '44px',
                  background: 'radial-gradient(circle, rgba(245,158,11,0.2) 0%, transparent 70%)',
                  borderRadius: '50%', pointerEvents: 'none', zIndex: -1,
                }} />
              )}
              <tab.icon active={isActive} />
              <span style={{
                background: isActive ? 'linear-gradient(135deg, #F59E0B, #FBBF24)' : 'none',
                WebkitBackgroundClip: isActive ? 'text' : 'unset',
                WebkitTextFillColor: isActive ? 'transparent' : undefined,
              }}>
                {tab.label}
              </span>
              {tab.id === 'plan' && totalStops > 0 && (
                <span style={{
                  position: 'absolute', top: '2px', right: '8px',
                  background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                  color: '#0C0A09', fontSize: '9px', fontWeight: 700,
                  padding: '2px 5px', borderRadius: '8px',
                }}>
                  {totalStops}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Surprise Me Floating Button */}
      {screen === 'discover' && places.length > 0 && !surprisePlace && !selectedPlace && (
        <button
          onClick={handleSurpriseMe}
          aria-label="Surprise me with a random place"
          style={{
            position: 'fixed', bottom: '90px', right: 'calc(50% - 195px)',
            width: '52px', height: '52px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #F59E0B, #D97706)',
            border: 'none', cursor: 'pointer', color: '#0C0A09',
            fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(245,158,11,0.4)', zIndex: 50,
          }}
          title="Surprise Me"
        >
          🎲
        </button>
      )}

      {/* Surprise Me Modal */}
      {surprisePlace && (
        <div className="modal-backdrop"
          role="dialog"
          aria-label="Surprise place recommendation"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={() => setSurprisePlace(null)}>
          <div className="modal-sheet"
            style={{ background: '#1C1917', borderRadius: '20px', maxWidth: '380px', width: '100%', overflow: 'hidden', border: '1px solid rgba(245,158,11,0.2)' }}
            onClick={e => e.stopPropagation()}>
            {surprisePlace.photoUrl && (
              <div style={{
                height: '180px', width: '100%',
                background: `linear-gradient(to bottom, transparent 50%, #1C1917), url(${surprisePlace.photoUrl})`,
                backgroundSize: 'cover', backgroundPosition: 'center',
              }} />
            )}
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#F59E0B', marginBottom: '4px', fontWeight: 500 }}>Surprise!</div>
              <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '6px' }}>{surprisePlace.name}</h2>
              <p style={{ color: '#A8A29E', fontSize: '13px', marginBottom: '4px' }}>
                {surprisePlace.categoryDisplay}{surprisePlace.distance != null && ` · ${formatDistance(surprisePlace.distance, useMiles)}`}
              </p>
              {surprisePlace.rating > 0 && (
                <p style={{ color: '#F59E0B', fontSize: '14px', marginBottom: '16px' }}>
                  ★ {surprisePlace.rating.toFixed(1)} ({surprisePlace.reviewCount} reviews)
                </p>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => { addToPlan(surprisePlace); setSurprisePlace(null); }}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#0C0A09', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                  + Add to Plan
                </button>
                {surprisePlace.googleMapsUrl && (
                  <a href={surprisePlace.googleMapsUrl} target="_blank" rel="noopener noreferrer"
                    style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.08)', color: '#FFFBEB', fontSize: '14px', fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
                    Directions
                  </a>
                )}
              </div>
              <button
                onClick={() => { setSurprisePlace(null); handleSurpriseMe(); }}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', marginTop: '8px', background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#A8A29E', fontSize: '13px', cursor: 'pointer' }}>
                🎲 Try another
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Place Detail Modal */}
      {selectedPlace && <PlaceDetailModal key={selectedPlace.placeId} place={selectedPlace} />}

      {/* (Email signup removed) */}

      {/* Safety Toolkit Modal */}
      {showSafety && (
        <div className="modal-backdrop"
          role="dialog"
          aria-label="Travel toolkit"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setShowSafety(false)}>
          <div className="modal-sheet"
            style={{ background: '#1C1917', borderRadius: '24px 24px 0 0', maxWidth: '430px', width: '100%', maxHeight: '85vh', overflow: 'auto', border: '1px solid rgba(255,255,255,0.06)', borderBottom: 'none' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: '24px 20px 40px' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '2px' }}>Travel Toolkit</h2>
                  <p style={{ color: '#78716C', fontSize: '12px' }}>Stay connected & informed</p>
                </div>
                <button onClick={() => setShowSafety(false)}
                  aria-label="Close travel toolkit"
                  style={{ background: 'none', border: 'none', color: '#78716C', cursor: 'pointer', padding: '10px', minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CloseIcon />
                </button>
              </div>

              {/* Share My Location */}
              <button
                onClick={async () => {
                  if (loc.lat && loc.lng) {
                    const url = `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
                    const text = `Here's my current location${loc.city ? ` in ${loc.city}` : ''}`;
                    if (navigator.share) {
                      await navigator.share({ title: 'My Location', text, url });
                    } else {
                      await navigator.clipboard.writeText(`${text}: ${url}`);
                      showToast('Location copied to clipboard');
                    }
                  } else {
                    showToast('Location not available — enable GPS');
                  }
                }}
                style={{
                  ...cardStyle, width: '100%', cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: '14px',
                  background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.03))',
                  border: '1px solid rgba(34,197,94,0.15)',
                }}
              >
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                  background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '20px',
                }}>
                  📍
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '15px', color: '#FFFBEB' }}>Share My Location</div>
                  <div style={{ fontSize: '12px', color: '#A8A29E' }}>Send your GPS pin to someone you trust</div>
                </div>
                <div style={{ color: '#34D399', fontSize: '18px' }}>→</div>
              </button>

              {/* Emergency Numbers */}
              {(() => {
                const country = selectedCity?.country || (loc.city ? Object.keys(EMERGENCY_BY_COUNTRY).find(_c => {
                  const cityNames = Object.keys(CITY_COORDS);
                  return cityNames.some(cn => cn.toLowerCase().includes(loc.city?.toLowerCase() || ''));
                }) : undefined);
                const nums = country ? EMERGENCY_BY_COUNTRY[country] : null;
                const displayCountry = selectedCity?.country || country || null;

                return (
                  <div style={{ ...cardStyle, marginTop: '4px' }}>
                    <div style={{ fontSize: '11px', color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
                      Emergency Numbers{displayCountry ? ` — ${displayCountry}` : ''}
                    </div>
                    {nums ? (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <a href={`tel:${nums.emergency}`}
                          style={{
                            flex: 1, padding: '14px', borderRadius: '12px', textAlign: 'center',
                            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.15)',
                            color: '#F87171', textDecoration: 'none', fontWeight: 600, fontSize: '16px',
                          }}>
                          <div style={{ fontSize: '11px', color: '#A8A29E', fontWeight: 400, marginBottom: '4px' }}>Emergency</div>
                          {nums.emergency}
                        </a>
                        <a href={`tel:${nums.police}`}
                          style={{
                            flex: 1, padding: '14px', borderRadius: '12px', textAlign: 'center',
                            background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.15)',
                            color: '#93C5FD', textDecoration: 'none', fontWeight: 600, fontSize: '16px',
                          }}>
                          <div style={{ fontSize: '11px', color: '#A8A29E', fontWeight: 400, marginBottom: '4px' }}>Police</div>
                          {nums.police}
                        </a>
                      </div>
                    ) : (
                      <p style={{ color: '#A8A29E', fontSize: '13px' }}>Select a city to see local emergency numbers</p>
                    )}
                  </div>
                );
              })()}

              {/* Travel Tips */}
              <div style={{ ...cardStyle, marginTop: '4px' }}>
                <div style={{ fontSize: '11px', color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
                  Quick Tips
                </div>
                {[
                  { icon: '🔋', tip: 'Keep your phone charged — you\'ll need it for maps & rides' },
                  { icon: '📱', tip: 'Download offline maps before heading out' },
                  { icon: '🏨', tip: 'Save your accommodation address — show it to taxi drivers' },
                  { icon: '💳', tip: 'Keep a small amount of local cash for emergencies' },
                  { icon: '🌙', tip: 'Stick to well-lit, busy streets at night' },
                  { icon: '👥', tip: 'Look for places with lots of reviews — popular spots are usually welcoming' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', padding: '8px 0', borderBottom: i < 5 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.icon}</span>
                    <span style={{ fontSize: '13px', color: '#d4d0cc', lineHeight: 1.4 }}>{item.tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Screen */}
      {showProfile && <ProfileScreen />}

      {/* Admin Panel */}
      {showAdmin && <AdminPanel />}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(28,25,23,0.95)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px',
          padding: '12px 20px', fontSize: '14px', fontWeight: 500, color: '#FFFBEB',
          zIndex: 300, animation: 'toastIn 0.3s ease-out',
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
