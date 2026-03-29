import { useState, useEffect, useRef } from 'react';
import { API_URL } from '../utils/api';
import type { City } from '../types';

export interface FlightOffer {
  airline: string;
  airlines: string[];
  price: number;
  currency: string;
  duration: string;
  durationMinutes: number;
  stops: number;
  stopsLabel: string;
  departTime: string;
  arriveTime: string;
  deepLink: string;
  bookingLink: string;
}

export interface FlightsResult {
  flights: FlightOffer[];
  origin: string;
  destination: string;
  dateRange: string;
  searchedAt: string;
}

// IATA codes for cities in the app — maps lowercase city name to airport code
// Maps city name (lowercase) AND slug to IATA code — duplicates are intentional for matching
const CITY_TO_IATA: Record<string, string> = {
  // Major destinations
  paris: 'CDG', tokyo: 'TYO', 'new york': 'JFK', 'new-york': 'JFK',
  'rio de janeiro': 'GIG', 'rio-de-janeiro': 'GIG', rio: 'GIG',
  accra: 'ACC', sydney: 'SYD', dubai: 'DXB', cartagena: 'CTG',
  london: 'LHR', bangkok: 'BKK', rome: 'FCO', istanbul: 'IST',
  'mexico city': 'MEX', 'mexico-city': 'MEX', 'cape town': 'CPT', 'cape-town': 'CPT',
  barcelona: 'BCN', marrakech: 'RAK', marrakesh: 'RAK',
  // US cities
  miami: 'MIA', 'los angeles': 'LAX', 'los-angeles': 'LAX',
  'san francisco': 'SFO', 'san-francisco': 'SFO', chicago: 'ORD',
  atlanta: 'ATL', dallas: 'DFW', seattle: 'SEA', boston: 'BOS', denver: 'DEN',
  houston: 'IAH', philadelphia: 'PHL', washington: 'IAD', 'washington dc': 'IAD', 'washington-dc': 'IAD',
  minneapolis: 'MSP', detroit: 'DTW', 'las vegas': 'LAS', 'las-vegas': 'LAS',
  orlando: 'MCO', nashville: 'BNA', 'new orleans': 'MSY', 'new-orleans': 'MSY',
  austin: 'AUS', portland: 'PDX', 'san diego': 'SAN', 'san-diego': 'SAN',
  charlotte: 'CLT', tampa: 'TPA', pittsburgh: 'PIT', sacramento: 'SMF',
  // Europe
  amsterdam: 'AMS', berlin: 'BER', madrid: 'MAD', lisbon: 'LIS', vienna: 'VIE',
  prague: 'PRG', budapest: 'BUD', athens: 'ATH', dublin: 'DUB', zurich: 'ZRH',
  copenhagen: 'CPH', stockholm: 'ARN', oslo: 'OSL', helsinki: 'HEL',
  warsaw: 'WAW', bucharest: 'OTP', milan: 'MXP', florence: 'FLR',
  venice: 'VCE', nice: 'NCE', edinburgh: 'EDI', munich: 'MUC',
  brussels: 'BRU', porto: 'OPO', seville: 'SVQ', malaga: 'AGP',
  // Asia
  singapore: 'SIN', 'hong kong': 'HKG', 'hong-kong': 'HKG', seoul: 'ICN',
  mumbai: 'BOM', delhi: 'DEL', 'new delhi': 'DEL', 'new-delhi': 'DEL',
  'kuala lumpur': 'KUL', 'kuala-lumpur': 'KUL', taipei: 'TPE', manila: 'MNL',
  hanoi: 'HAN', 'ho chi minh': 'SGN', 'ho-chi-minh': 'SGN', saigon: 'SGN',
  osaka: 'KIX', kyoto: 'KIX', 'phnom penh': 'PNH', 'phnom-penh': 'PNH',
  colombo: 'CMB', kathmandu: 'KTM', yangon: 'RGN',
  // Middle East
  doha: 'DOH', 'abu dhabi': 'AUH', 'abu-dhabi': 'AUH', jeddah: 'JED', riyadh: 'RUH',
  muscat: 'MCT', amman: 'AMM', beirut: 'BEY', kuwait: 'KWI',
  // Africa
  cairo: 'CAI', nairobi: 'NBO', lagos: 'LOS', johannesburg: 'JNB',
  abuja: 'ABV', 'dar es salaam': 'DAR', 'dar-es-salaam': 'DAR',
  addis: 'ADD', 'addis ababa': 'ADD', 'addis-ababa': 'ADD',
  casablanca: 'CMN', dakar: 'DSS', kampala: 'EBB', kigali: 'KGL',
  zanzibar: 'ZNZ', tunis: 'TUN', algiers: 'ALG', abidjan: 'ABJ',
  lusaka: 'LUN', harare: 'HRE', maputo: 'MPM', windhoek: 'WDH',
  kumasi: 'KMS', lome: 'LFW', cotonou: 'COO',
  // South America
  'buenos aires': 'EZE', 'buenos-aires': 'EZE', 'sao paulo': 'GRU', 'sao-paulo': 'GRU',
  lima: 'LIM', bogota: 'BOG', santiago: 'SCL', medellin: 'MDE', medellín: 'MDE',
  quito: 'UIO', montevideo: 'MVD', 'panama city': 'PTY', 'panama-city': 'PTY',
  // Oceania / Islands
  melbourne: 'MEL', auckland: 'AKL', bali: 'DPS', phuket: 'HKT',
  cancun: 'CUN', ibiza: 'IBZ', santorini: 'JTR', mykonos: 'JMK',
  'tel aviv': 'TLV', 'tel-aviv': 'TLV', havana: 'HAV',
  'san juan': 'SJU', 'san-juan': 'SJU', reykjavik: 'KEF',
  fiji: 'NAN', honolulu: 'HNL', 'punta cana': 'PUJ', 'punta-cana': 'PUJ',
  kingston: 'KIN', nassau: 'NAS', 'montego bay': 'MBJ', 'montego-bay': 'MBJ',
  // Canada
  toronto: 'YYZ', montreal: 'YUL', vancouver: 'YVR', calgary: 'YYC',
};

const SESSION_KEY_PREFIX = 'nxstops_flights_';

// Fallback: guess a major airport from the user's timezone when GPS is unavailable
function guessAirportFromTimezone(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone; // e.g. "America/New_York"
    const tzMap: Record<string, string> = {
      'America/New_York': 'JFK', 'America/Chicago': 'ORD', 'America/Denver': 'DEN',
      'America/Los_Angeles': 'LAX', 'America/Phoenix': 'PHX', 'America/Anchorage': 'ANC',
      'Pacific/Honolulu': 'HNL', 'America/Detroit': 'DTW', 'America/Indiana/Indianapolis': 'IND',
      'America/Toronto': 'YYZ', 'America/Vancouver': 'YVR', 'America/Montreal': 'YUL',
      'Europe/London': 'LHR', 'Europe/Paris': 'CDG', 'Europe/Berlin': 'BER',
      'Europe/Madrid': 'MAD', 'Europe/Rome': 'FCO', 'Europe/Amsterdam': 'AMS',
      'Europe/Istanbul': 'IST', 'Europe/Lisbon': 'LIS', 'Europe/Dublin': 'DUB',
      'Europe/Zurich': 'ZRH', 'Europe/Vienna': 'VIE', 'Europe/Prague': 'PRG',
      'Europe/Stockholm': 'ARN', 'Europe/Copenhagen': 'CPH', 'Europe/Oslo': 'OSL',
      'Asia/Tokyo': 'NRT', 'Asia/Seoul': 'ICN', 'Asia/Shanghai': 'PVG',
      'Asia/Hong_Kong': 'HKG', 'Asia/Singapore': 'SIN', 'Asia/Bangkok': 'BKK',
      'Asia/Dubai': 'DXB', 'Asia/Kolkata': 'BOM', 'Asia/Kuala_Lumpur': 'KUL',
      'Asia/Taipei': 'TPE', 'Asia/Manila': 'MNL', 'Asia/Jakarta': 'CGK',
      'Australia/Sydney': 'SYD', 'Australia/Melbourne': 'MEL', 'Pacific/Auckland': 'AKL',
      'Africa/Johannesburg': 'JNB', 'Africa/Cairo': 'CAI', 'Africa/Lagos': 'LOS',
      'Africa/Nairobi': 'NBO', 'Africa/Accra': 'ACC', 'Africa/Casablanca': 'CMN',
      'America/Sao_Paulo': 'GRU', 'America/Argentina/Buenos_Aires': 'EZE',
      'America/Mexico_City': 'MEX', 'America/Bogota': 'BOG', 'America/Lima': 'LIM',
    };
    return tzMap[tz] || null;
  } catch { return null; }
}

export function useFlights(deps: {
  selectedCity: City | null;
  userLat: number | null;
  userLng: number | null;
  tripStartDate: string | null;
}) {
  const { selectedCity, userLat, userLng, tripStartDate } = deps;
  const [flights, setFlights] = useState<FlightOffer[] | null>(null);
  const [originAirport, setOriginAirport] = useState<string | null>(null);
  const [destinationAirport, setDestinationAirport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!selectedCity) {
      setFlights(null);
      setOriginAirport(null);
      setDestinationAirport(null);
      return;
    }

    // Load airport data once, then resolve origin + destination
    import('../data/airports').then(({ findNearestAirport }) => {
      // Resolve origin: GPS → nearest airport → timezone fallback
      let originCode: string | null = null;
      if (userLat && userLng) {
        const nearest = findNearestAirport(userLat, userLng);
        originCode = nearest?.iata || guessAirportFromTimezone();
      } else {
        originCode = guessAirportFromTimezone();
      }
      if (!originCode) return;

      // Resolve destination: map lookup → nearest airport to city's lat/lng
      const cityName = selectedCity!.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const citySlug = (selectedCity as any).slug?.toLowerCase() || cityName.replace(/\s+/g, '-');
      let destCode =
        CITY_TO_IATA[cityName] ||
        CITY_TO_IATA[citySlug] ||
        Object.entries(CITY_TO_IATA).find(([key]) => cityName.includes(key) || key.includes(cityName))?.[1] ||
        null;

      // If not in the map, use the city's own coordinates to find nearest airport
      if (!destCode) {
        const cityLat = (selectedCity as any).lat;
        const cityLng = (selectedCity as any).lng;
        if (cityLat && cityLng) {
          const nearestDest = findNearestAirport(cityLat, cityLng);
          destCode = nearestDest?.iata || null;
        }
      }
      if (!destCode) return;

      fetchFlights(originCode, destCode);
    }).catch(() => {
      // Airport data failed to load — try with timezone + map only
      const originCode = guessAirportFromTimezone();
      if (!originCode) return;
      const cityName = selectedCity!.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const citySlug = (selectedCity as any).slug?.toLowerCase() || cityName.replace(/\s+/g, '-');
      const destCode =
        CITY_TO_IATA[cityName] ||
        CITY_TO_IATA[citySlug] ||
        Object.entries(CITY_TO_IATA).find(([key]) => cityName.includes(key) || key.includes(cityName))?.[1] ||
        null;
      if (!destCode) return;
      fetchFlights(originCode, destCode);
    });

    function fetchFlights(origin: string, destination: string) {

      // Don't search flights to same city
      if (origin === destination) return;

      setOriginAirport(origin);
      setDestinationAirport(destination);

      // Check session cache
      const cacheKey = `${SESSION_KEY_PREFIX}${origin}_${destination}`;
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached) as FlightsResult;
          // Check if cache is less than 30 min old
          const age = Date.now() - new Date(parsed.searchedAt).getTime();
          if (age < 30 * 60 * 1000) {
            setFlights(parsed.flights);
            setLoading(false);
            return;
          }
        }
      } catch { /* ignore cache errors */ }

      // Fetch from API
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ origin, destination });
      if (tripStartDate) params.set('date', tripStartDate);

      fetch(`${API_URL}/api/weather?action=flights&${params}`, { signal: controller.signal })
        .then(r => {
          if (!r.ok) throw new Error('Flight search failed');
          return r.json();
        })
        .then((data: FlightsResult) => {
          if (controller.signal.aborted) return;
          setFlights(data.flights);
          setLoading(false);
          // Cache in session
          try { sessionStorage.setItem(cacheKey, JSON.stringify(data)); } catch { /* full */ }
        })
        .catch(err => {
          if (controller.signal.aborted) return;
          setFlights(null);
          setLoading(false);
          setError(err.message);
        });
    }

    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [selectedCity?.name, userLat, userLng, tripStartDate]);

  // Google Flights fallback link
  const googleFlightsUrl = originAirport && destinationAirport
    ? `https://www.google.com/travel/flights?q=flights+from+${originAirport}+to+${destinationAirport}${tripStartDate ? `+on+${tripStartDate}` : ''}`
    : null;

  return { flights, originAirport, destinationAirport, loading, error, googleFlightsUrl };
}
