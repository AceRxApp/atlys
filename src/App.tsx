import { useState, useEffect, useCallback } from 'react';
import { fetchCities, saveEmailSignup, fetchEmailSignups, fetchAllCities, toggleCityActive, authSignUp, authSignIn, authSignOut, authGetSession, authOnStateChange, saveReview, fetchReviews, fetchPlaceTagCounts } from './supabase';
import type { Review } from './supabase';
import { searchNearby, formatDistance, getHoursStatus } from './services/places';
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
  lat?: number;
  lng?: number;
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

const NIGHTLIFE_TYPES = ['bar', 'night_club', 'casino', 'cocktail_bar', 'wine_bar', 'karaoke', 'comedy_club'];

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
  'sushi_restaurant', 'brunch_restaurant', 'breakfast_restaurant',
  'bar', 'cocktail_bar', 'wine_bar',
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

  // --- Email signup ---
  const [showEmailSignup, setShowEmailSignup] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailSaved, setEmailSaved] = useState(() => localStorage.getItem('nxstops_email_saved') === 'true');
  const [emailSubmitting, setEmailSubmitting] = useState(false);

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
  const [events, setEvents] = useState<{ id: string; name: string; date: string; time: string; venue: string; venueAddress: string; imageUrl: string | null; url: string; category: string; lat: number | null; lng: number | null }[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  // --- Map ---
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // --- Toast ---
  const [toast, setToast] = useState<string | null>(null);

  // --- Weather ---
  const [weather, setWeather] = useState<{ temp: number; high: number; low: number; code: number; description: string; emoji: string; forecast: { date: string; high: number; low: number; code: number; emoji: string; description: string; precipChance: number }[] } | null>(null);

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
    if (km < 0.5) return { emoji: '🚶', text: '~5 min walk', distance: `${Math.round(km * 1000)}m`, mapsUrl };
    if (km < 1.5) return { emoji: '🚶🚕', text: `${Math.round(km * 12)} min walk or quick ride`, distance: `${km.toFixed(1)} km`, mapsUrl };
    if (km < 5) return { emoji: '🚇🚕', text: 'Transit or ride recommended', distance: `${km.toFixed(1)} km`, mapsUrl };
    return { emoji: '🚗🚕', text: 'Drive or ride needed', distance: `${Math.round(km)} km`, mapsUrl };
  };

  // --------------------------------------------------------------------------
  // EFFECTS
  // --------------------------------------------------------------------------

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

  // Load community tags when places change
  useEffect(() => {
    if (places.length === 0) return;
    const ids = places.map(p => p.placeId);
    fetchPlaceTagCounts(ids).then(setPlaceTagsCache);
  }, [places]);

  // Load reviews when selectedPlace changes
  useEffect(() => {
    if (!selectedPlace) { setPlaceReviews([]); setShowReviewForm(false); return; }
    fetchReviews(selectedPlace.placeId).then(setPlaceReviews);
  }, [selectedPlace]);

  // Clock
  useEffect(() => {
    const i = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(i);
  }, []);

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
    // Travel group filter
    if (travelGroup) {
      switch (travelGroup) {
        case 'family': if (NIGHTLIFE_TYPES.includes(place.category)) return false; if (place.rating > 0 && place.rating < 4.0) return false; break;
        case 'solo': if (place.reviewCount < 30) return false; break;
        case 'bachelorette': case 'girls': case 'boys': case 'friends':
          if (['library', 'church'].includes(place.category)) return false; break;
      }
    }
    // Community tag filters
    if (communityFilters.length > 0) {
      const tags = placeTagsCache[place.placeId];
      if (!tags) return false;
      const hasMatch = communityFilters.some(f => (tags[f] || 0) >= 2);
      if (!hasMatch) return false;
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

  const getStopName = (stop: Stop) => stop.type === 'event' ? stop.event!.name : stop.place!.name;
  const getStopCategory = (stop: Stop) => stop.type === 'event' ? stop.event!.category : stop.place!.categoryDisplay;

  const getRouteUrl = () => {
    if (dayPlan.length === 0) return '';
    const points = dayPlan
      .filter(s => s.type === 'place' ? (s.place!.lat && s.place!.lng) : (s.event?.lat && s.event?.lng))
      .map(s => s.type === 'place' ? `${s.place!.lat},${s.place!.lng}` : `${s.event!.lat},${s.event!.lng}`);
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
    // Fall back to Google Maps which often has "Reserve" or "Book" links
    return place.googleMapsUrl;
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

  const handleEmailSignup = async () => {
    if (!emailInput || !emailInput.includes('@')) return;
    setEmailSubmitting(true);
    await saveEmailSignup(emailInput, useGps ? (loc.city || undefined) : selectedCity?.name);
    localStorage.setItem('nxstops_email_saved', 'true');
    setEmailSaved(true);
    setShowEmailSignup(false);
    setEmailSubmitting(false);
    showToast('You\'re signed up!');
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
        style={{ ...cardStyle, padding: 0, overflow: 'hidden', opacity: place.openNow ? 1 : 0.6, cursor: 'pointer' }}
        onClick={() => setSelectedPlace(place)}
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
                {formatDistance(place.distance)} {getDistanceReference()}
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
              <span style={{ fontSize: '11px', color: '#A8A29E' }}>{formatDistance(place.distance)} {getDistanceReference()}</span>
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
              onClick={() => inPlan ? removeFromPlan(Object.values(tripDays).flat().find(s => s.place?.placeId === place.placeId)!.id) : addToPlan(place)}
              style={{
                flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer',
                background: inPlan ? 'transparent' : 'linear-gradient(135deg, #F59E0B, #D97706)',
                color: inPlan ? '#F59E0B' : '#0C0A09',
                border: inPlan ? '1.5px solid #F59E0B' : 'none',
              }}
            >
              {inPlan ? '✓ Saved' : '+ Add'}
            </button>
            {place.googleMapsUrl && (
              <a href={place.googleMapsUrl} target="_blank" rel="noopener noreferrer"
                style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', color: '#A8A29E', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                <DirectionsIcon />
              </a>
            )}
            {place.phone && (
              <a href={`tel:${place.phone}`}
                style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', color: '#A8A29E', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                <PhoneIcon />
              </a>
            )}
            {(isReservable(place) || isBookable(place)) && (place.website || place.googleMapsUrl) && (
              <a href={getBookingUrl(place)} target="_blank" rel="noopener noreferrer"
                style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(34,197,94,0.1)', color: '#34D399', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: '11px', fontWeight: 600, border: '1px solid rgba(34,197,94,0.2)' }}>
                {getBookingLabel(place)}
              </a>
            )}
            <button onClick={() => sharePlace(place)}
              style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', color: '#A8A29E', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
    const [h, m] = timeStr.split(':').map(Number);
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
              onClick={() => inPlan ? removeFromPlan(Object.values(tripDays).flat().find(s => s.event?.id === event.id)!.id) : addEventToPlan(event)}
              style={{
                flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer',
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

      {/* Email Signup Card */}
      {!emailSaved && (
        <button
          onClick={() => setShowEmailSignup(true)}
          style={{
            ...cardStyle, width: '100%', cursor: 'pointer', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px',
            background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(217,119,6,0.05))',
            border: '1px solid rgba(245,158,11,0.15)',
          }}
        >
          <div style={{ fontSize: '24px' }}>📬</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '14px', color: '#FFFBEB' }}>Get your free city guide</div>
            <div style={{ fontSize: '12px', color: '#A8A29E' }}>Hidden gems sent to your inbox</div>
          </div>
          <div style={{ color: '#F59E0B', fontSize: '18px' }}>→</div>
        </button>
      )}

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
    const [activePin, setActivePin] = useState<string | null>(null);
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
                onClick={() => setActivePin(activePin === place.placeId ? null : place.placeId)}
                title={place.name}
              />
            ))}
            {activePin && (() => {
              const place = mapPlaces.find(p => p.placeId === activePin);
              if (!place || !place.lat || !place.lng) return null;
              return (
                <InfoWindow
                  position={{ lat: place.lat, lng: place.lng }}
                  onCloseClick={() => setActivePin(null)}
                >
                  <div style={{ padding: '4px', minWidth: '160px', color: '#1C1917' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{place.name}</div>
                    <div style={{ fontSize: '12px', color: '#57534E', marginBottom: '4px' }}>
                      {place.categoryDisplay}
                      {place.rating > 0 && ` · ★ ${place.rating.toFixed(1)}`}
                      {place.distance != null && ` · ${formatDistance(place.distance)}`}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                      <button
                        onClick={() => { setSelectedPlace(place); setActivePin(null); }}
                        style={{ flex: 1, padding: '6px', borderRadius: '6px', border: 'none', background: '#F59E0B', color: '#0C0A09', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Details
                      </button>
                      <button
                        onClick={() => { addToPlan(place); setActivePin(null); }}
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
    const [activeEventPin, setActiveEventPin] = useState<string | null>(null);
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
            style={{
              padding: '6px 14px', fontSize: '12px', fontWeight: 500, border: 'none', cursor: 'pointer',
              background: viewMode === 'list' ? 'rgba(245,158,11,0.15)' : 'transparent',
              color: viewMode === 'list' ? '#F59E0B' : '#78716C',
            }}>
            List
          </button>
          <button onClick={() => setViewMode('map')}
            style={{
              padding: '6px 14px', fontSize: '12px', fontWeight: 500, border: 'none', cursor: 'pointer',
              borderLeft: '1px solid rgba(255,255,255,0.1)',
              background: viewMode === 'map' ? 'rgba(245,158,11,0.15)' : 'transparent',
              color: viewMode === 'map' ? '#F59E0B' : '#78716C',
            }}>
            Map
          </button>
        </div>
      </div>

      {/* Vibe Chips (exclusive selection) */}
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

      {/* Map View */}
      {viewMode === 'map' ? (
        <PlacesMapView places={filteredPlaces} />
      ) : (
        <>
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
    </div>
  );

  // ==========================================================================
  // EVENTS SCREEN
  // ==========================================================================

  const EventsScreen = () => {
    const [eventsViewMode, setEventsViewMode] = useState<'list' | 'map'>('list');

    // Filter: show events within current month, plus ticketed events further out
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const filteredEvents = events.filter(event => {
      if (!event.date) return true;
      const eventDate = new Date(event.date + 'T00:00:00');
      // Within current month: always show
      if (eventDate <= endOfMonth) return true;
      // Ticketed events (has a URL): show up to 3 months out
      if (event.url) {
        const threeMonths = new Date(now.getFullYear(), now.getMonth() + 3, 0);
        return eventDate <= threeMonths;
      }
      return false;
    });

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
              style={{
                padding: '6px 14px', fontSize: '12px', fontWeight: 500, border: 'none', cursor: 'pointer',
                background: eventsViewMode === 'list' ? 'rgba(168,85,247,0.15)' : 'transparent',
                color: eventsViewMode === 'list' ? '#A855F7' : '#78716C',
              }}>
              List
            </button>
            <button onClick={() => setEventsViewMode('map')}
              style={{
                padding: '6px 14px', fontSize: '12px', fontWeight: 500, border: 'none', cursor: 'pointer',
                borderLeft: '1px solid rgba(255,255,255,0.1)',
                background: eventsViewMode === 'map' ? 'rgba(168,85,247,0.15)' : 'transparent',
                color: eventsViewMode === 'map' ? '#A855F7' : '#78716C',
              }}>
              Map
            </button>
          </div>
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

    if (totalStops === 0) {
      return (
        <div style={{ textAlign: 'center', paddingTop: '60px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.6 }}>🗺️</div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>No stops yet</h2>
          <p style={{ color: '#A8A29E', fontSize: '14px', marginBottom: '24px', lineHeight: 1.5 }}>
            Explore places and tap &quot;+ Add&quot; to build your trip plan
          </p>
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
        </div>
      );
    }

    return (
      <div>
        {/* Header */}
        <div style={{ marginBottom: '16px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>
            Your Trip Plan
          </h1>
          <p style={{ color: '#78716C', fontSize: '13px' }}>
            {cityLabel} · {totalStops} stop{totalStops !== 1 ? 's' : ''} · {dayCount} day{dayCount !== 1 ? 's' : ''}
          </p>
        </div>

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
        ) : (
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
                              {stop.place.distance != null && ` · ${formatDistance(stop.place.distance)} ${getDistanceReference()}`}
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
                        {index > 0 && (
                          <button onClick={() => movePlanStop(index, 'up')}
                            style={{ background: 'none', border: 'none', color: '#78716C', cursor: 'pointer', fontSize: '16px', padding: '2px 6px' }}>
                            ▲
                          </button>
                        )}
                        <button onClick={() => removeFromPlan(stop.id)}
                          style={{ background: 'none', border: 'none', color: '#78716C', cursor: 'pointer', fontSize: '18px', padding: '2px 6px' }}>
                          ×
                        </button>
                        {index < dayPlan.length - 1 && (
                          <button onClick={() => movePlanStop(index, 'down')}
                            style={{ background: 'none', border: 'none', color: '#78716C', cursor: 'pointer', fontSize: '16px', padding: '2px 6px' }}>
                            ▼
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
        )}

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

    return (
      <div
        className="modal-backdrop"
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
            overflow: 'auto', border: '1px solid rgba(255,255,255,0.06)', borderBottom: 'none',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Hero Photo */}
          {place.photoUrl && (
            <div style={{
              height: '250px', width: '100%', position: 'relative',
              background: `linear-gradient(to bottom, transparent 40%, #1C1917), url(${place.photoUrl})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
            }}>
              <button onClick={() => setSelectedPlace(null)}
                style={{
                  position: 'absolute', top: '16px', right: '16px',
                  background: 'rgba(0,0,0,0.5)', border: 'none',
                  borderRadius: '50%', width: '36px', height: '36px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#FFFBEB', backdropFilter: 'blur(8px)',
                }}>
                <CloseIcon />
              </button>
            </div>
          )}

          {/* Content */}
          <div style={{ padding: '20px 20px 120px' }}>
            {!place.photoUrl && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                <button onClick={() => setSelectedPlace(null)}
                  style={{ background: 'none', border: 'none', color: '#78716C', cursor: 'pointer', padding: '4px' }}>
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
              <button onClick={() => sharePlace(place)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                  padding: '12px 8px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)',
                  color: '#A8A29E', border: 'none', cursor: 'pointer', fontSize: '11px',
                }}>
                <ShareIcon />
                Share
              </button>
            </div>

            {/* Reserve / Book */}
            {(isReservable(place) || isBookable(place)) && (place.website || place.googleMapsUrl) && (
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
                {place.website && place.googleMapsUrl && place.website !== getBookingUrl(place) && (
                  <a href={place.googleMapsUrl} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'block', textAlign: 'center', marginTop: '8px', color: '#A8A29E', fontSize: '12px', textDecoration: 'none' }}>
                    or view on Google Maps
                  </a>
                )}
                {!place.website && place.googleMapsUrl && (
                  <a href={place.googleMapsUrl} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'block', textAlign: 'center', marginTop: '8px', color: '#A8A29E', fontSize: '12px', textDecoration: 'none' }}>
                    or view on Google Maps
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
                <p style={{ color: '#FFFBEB', fontSize: '14px' }}>{formatDistance(place.distance)} {getDistanceReference()}</p>
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
                        style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', padding: '2px', color: star <= reviewRating ? '#F59E0B' : '#3a3632' }}>
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
          style={{ background: 'none', border: 'none', color: '#78716C', cursor: 'pointer', padding: '8px' }}>
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

  if (authLoading || (loading && cities.length === 0)) {
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
  // AUTH SCREEN
  // ==========================================================================

  if (!user) {
    return (
      <div style={{
        fontFamily: "'DM Sans', system-ui, sans-serif",
        background: '#0C0A09', minHeight: '100vh', color: '#FFFBEB',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        maxWidth: '430px', margin: '0 auto', padding: '20px',
      }}>
        <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            fontSize: '36px', fontWeight: 700, marginBottom: '4px',
            background: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>NxStops</div>
          <div style={{ fontSize: '11px', color: '#78716C', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            by Nav&eacute;
          </div>
        </div>

        <div style={{ ...cardStyle, width: '100%', maxWidth: '360px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', textAlign: 'center' }}>
            {authScreen === 'signin' ? 'Welcome Back' : 'Create Account'}
          </h2>

          {authScreen === 'signup' && (
            <input type="text" placeholder="Name (optional)" value={authName}
              onChange={e => setAuthName(e.target.value)}
              style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: '#0C0A09', color: '#FFFBEB', fontSize: '15px', marginBottom: '10px', outline: 'none', boxSizing: 'border-box' }} />
          )}
          <input type="email" placeholder="Email" value={authEmail}
            onChange={e => setAuthEmail(e.target.value)}
            style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: '#0C0A09', color: '#FFFBEB', fontSize: '15px', marginBottom: '10px', outline: 'none', boxSizing: 'border-box' }} />
          <input type="password" placeholder="Password (min 6 characters)" value={authPassword}
            onChange={e => setAuthPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (authScreen === 'signin' ? handleSignIn() : handleSignUp())}
            style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: '#0C0A09', color: '#FFFBEB', fontSize: '15px', marginBottom: '16px', outline: 'none', boxSizing: 'border-box' }} />

          {authError && (
            <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', color: '#F87171', fontSize: '13px', marginBottom: '12px' }}>
              {authError}
            </div>
          )}

          <button
            onClick={authScreen === 'signin' ? handleSignIn : handleSignUp}
            disabled={authSubmitting || !authEmail.includes('@') || authPassword.length < 6}
            style={{
              width: '100%', padding: '16px', borderRadius: '14px', border: 'none',
              background: (authEmail.includes('@') && authPassword.length >= 6) ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'rgba(255,255,255,0.1)',
              color: (authEmail.includes('@') && authPassword.length >= 6) ? '#0C0A09' : '#78716C',
              fontSize: '16px', fontWeight: 600, cursor: 'pointer', opacity: authSubmitting ? 0.7 : 1,
            }}
          >
            {authSubmitting ? 'Loading...' : authScreen === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>

          <button onClick={() => { setAuthScreen(authScreen === 'signin' ? 'signup' : 'signin'); setAuthError(null); }}
            style={{ width: '100%', padding: '12px', marginTop: '10px', background: 'none', border: 'none', color: '#A8A29E', fontSize: '13px', cursor: 'pointer' }}>
            {authScreen === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    );
  }

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
        .modal-sheet { animation: slideUp 0.3s ease-out; }
        .modal-backdrop { animation: fadeIn 0.2s ease-out; }
      `}</style>

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
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '10px' }}>
            <ShieldIcon />
          </button>
          {user?.email === ADMIN_EMAIL && (
            <button onClick={openAdmin}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '10px' }}>
              <GearIcon />
            </button>
          )}
          <button onClick={handleSignOut}
            style={{ background: 'none', border: 'none', color: '#78716C', fontSize: '10px', cursor: 'pointer', padding: '4px 6px' }}>
            Out
          </button>
        </div>
      </header>

      {/* Content */}
      <main style={{ padding: '0 20px 100px' }}>
        {screen === 'home' && <HomeScreen />}
        {screen === 'discover' && <DiscoverScreen />}
        {screen === 'events' && <EventsScreen />}
        {screen === 'plan' && <PlanScreen />}
      </main>

      {/* Bottom Navigation */}
      <nav style={{
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
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                background: 'none', border: 'none',
                color: isActive ? '#FFFBEB' : canNavigate ? '#78716C' : '#3a3632',
                fontSize: '10px', fontWeight: 500, cursor: canNavigate ? 'pointer' : 'default',
                padding: '8px 20px', borderRadius: '12px', position: 'relative',
                opacity: canNavigate ? 1 : 0.4,
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
                {surprisePlace.categoryDisplay}{surprisePlace.distance != null && ` · ${formatDistance(surprisePlace.distance)}`}
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
      {selectedPlace && <PlaceDetailModal place={selectedPlace} />}

      {/* Email Signup Modal */}
      {showEmailSignup && (
        <div className="modal-backdrop"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setShowEmailSignup(false)}>
          <div className="modal-sheet"
            style={{ background: '#1C1917', borderRadius: '20px 20px 0 0', maxWidth: '430px', width: '100%', padding: '28px 24px 40px', border: '1px solid rgba(255,255,255,0.06)', borderBottom: 'none' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>✨</div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>Get your city guide</h2>
              <p style={{ color: '#A8A29E', fontSize: '14px' }}>We'll send curated picks and hidden gems straight to your inbox</p>
            </div>
            <input type="email" placeholder="your@email.com" value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEmailSignup()}
              style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: '#0C0A09', color: '#FFFBEB', fontSize: '16px', marginBottom: '12px', outline: 'none' }} />
            <button onClick={handleEmailSignup} disabled={emailSubmitting || !emailInput.includes('@')}
              style={{
                width: '100%', padding: '16px', borderRadius: '14px', border: 'none',
                background: emailInput.includes('@') ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'rgba(255,255,255,0.1)',
                color: emailInput.includes('@') ? '#0C0A09' : '#78716C',
                fontSize: '16px', fontWeight: 600, cursor: emailInput.includes('@') ? 'pointer' : 'default',
              }}>
              {emailSubmitting ? 'Saving...' : 'Send me the guide'}
            </button>
            <button onClick={() => setShowEmailSignup(false)}
              style={{ width: '100%', padding: '12px', marginTop: '8px', background: 'none', border: 'none', color: '#78716C', fontSize: '13px', cursor: 'pointer' }}>
              Maybe later
            </button>
          </div>
        </div>
      )}

      {/* Safety Toolkit Modal */}
      {showSafety && (
        <div className="modal-backdrop"
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
                  style={{ background: 'none', border: 'none', color: '#78716C', cursor: 'pointer', padding: '4px' }}>
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
                const country = selectedCity?.country || (loc.city ? Object.keys(EMERGENCY_BY_COUNTRY).find(c => {
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
