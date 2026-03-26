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
const CITY_TO_IATA: Record<string, string> = {
  paris: 'CDG', tokyo: 'TYO', 'new york': 'JFK', 'rio de janeiro': 'GIG',
  accra: 'ACC', sydney: 'SYD', dubai: 'DXB', cartagena: 'CTG',
  london: 'LHR', bangkok: 'BKK', rome: 'FCO', istanbul: 'IST',
  'mexico city': 'MEX', 'cape town': 'CPT', barcelona: 'BCN', marrakech: 'RAK',
  miami: 'MIA', 'los angeles': 'LAX', 'san francisco': 'SFO', chicago: 'ORD',
  atlanta: 'ATL', dallas: 'DFW', seattle: 'SEA', boston: 'BOS', denver: 'DEN',
  houston: 'IAH', philadelphia: 'PHL', washington: 'IAD', minneapolis: 'MSP',
  detroit: 'DTW', 'las vegas': 'LAS', orlando: 'MCO', nashville: 'BNA',
  amsterdam: 'AMS', berlin: 'BER', madrid: 'MAD', lisbon: 'LIS', vienna: 'VIE',
  prague: 'PRG', budapest: 'BUD', athens: 'ATH', dublin: 'DUB', zurich: 'ZRH',
  singapore: 'SIN', 'hong kong': 'HKG', seoul: 'ICN', mumbai: 'BOM',
  delhi: 'DEL', 'kuala lumpur': 'KUL', taipei: 'TPE', manila: 'MNL',
  cairo: 'CAI', nairobi: 'NBO', lagos: 'LOS', johannesburg: 'JNB',
  'buenos aires': 'EZE', 'sao paulo': 'GRU', lima: 'LIM', bogota: 'BOG',
  doha: 'DOH', 'abu dhabi': 'AUH', jeddah: 'JED', riyadh: 'RUH',
  melbourne: 'MEL', auckland: 'AKL', bali: 'DPS', phuket: 'HKT',
  cancun: 'CUN', ibiza: 'IBZ', santorini: 'JTR', mykonos: 'JMK',
  'tel aviv': 'TLV', havana: 'HAV', 'san juan': 'SJU', reykjavik: 'KEF',
};

const SESSION_KEY_PREFIX = 'nxstops_flights_';

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
    if (!selectedCity || !userLat || !userLng) {
      setFlights(null);
      setOriginAirport(null);
      setDestinationAirport(null);
      return;
    }

    // Find origin airport from user's location
    let originCode: string | null = null;
    try {
      // Dynamic import to avoid loading airport data until needed
      import('../data/airports').then(({ findNearestAirport }) => {
        const nearest = findNearestAirport(userLat, userLng);
        if (nearest) {
          originCode = nearest.iata;
          fetchFlights(nearest.iata);
        }
      }).catch(() => {
        // Fallback: skip flights if airport data fails to load
      });
    } catch {
      // skip
    }

    function fetchFlights(origin: string) {
      // Find destination IATA
      const cityName = selectedCity!.name.toLowerCase();
      const destCode = CITY_TO_IATA[cityName];
      if (!destCode) {
        // Try partial match
        const match = Object.entries(CITY_TO_IATA).find(([key]) => cityName.includes(key) || key.includes(cityName));
        if (!match) return; // Can't map destination to airport
      }
      const destination = destCode || Object.entries(CITY_TO_IATA).find(([key]) => cityName.includes(key) || key.includes(cityName))?.[1];
      if (!destination) return;

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
