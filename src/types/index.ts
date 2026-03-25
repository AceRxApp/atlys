import type { Place } from '../services/places';

export type { Place };

export interface City {
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

export interface EventItem {
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

export interface Stop {
  id: string;
  place?: Place;
  event?: EventItem;
  type: 'place' | 'event';
  addedAt: Date;
  timeSlot?: string;
  reason?: string;
  knownFor?: string;
  estimatedSpend?: number;
  neighborhood?: string;
}

export type PlanDuration = 'full' | 'morning' | 'afternoon' | 'evening';

export interface AdminSignup {
  id: string;
  email: string;
  city: string | null;
  signed_up_at: string;
}

export type Screen = 'home' | 'discover' | 'events' | 'currency' | 'plan' | 'tastelens';
export type Vibe = 'thespot' | 'eatsip' | 'nightlife' | 'cultureart' | 'neighborhood';
export type QuickFilter = 'open' | 'walking' | 'topRated' | 'budget' | 'family' | 'solo' | 'chainBreaker' | '15min' | 'lateNight' | 'rainyDay' | 'goldenHour';
export type TravelGroup = 'solo' | 'couple' | 'family' | 'friends' | 'girls' | 'boys' | 'bachelorette';
export type CommunityTag = 'black-owned' | 'women-owned' | 'hispanic-owned' | 'asian-owned' | 'lgbtq-friendly' | 'kid-friendly' | 'baby-friendly' | 'wheelchair-accessible' | 'solo-friendly';

export interface TripHistoryStop {
  name: string;
  photoUrl?: string | null;
  category?: string;
  placeId?: string;
  rating?: 'up' | 'down';
  estimatedSpend?: number;
}

export interface TripHistoryEntry {
  id: string;
  city: string;
  title: string | null;
  totalStops: number;
  dayCount: number;
  savedAt: string;
  tripStartDate: string | null;
  totalEstimatedSpend: number;
  categoryBreakdown: Record<string, number>;
  ratings: Record<string, 'up' | 'down'>;
  stops: TripHistoryStop[];
  moments?: { stopId: string; photos: string[]; note: string; checkedInAt: string }[];
}

export interface StopCheckIn {
  stopId: string;
  checkedInAt: string;
  rating?: number;
  comment?: string;
  actualSpend?: number;
  photos?: string[];
  journalNote?: string;
}

// --- Logistics ---
export interface Reservation {
  id: string;
  name: string;
  dateTime: string;
  confirmationNumber: string;
  notes?: string;
}

export interface TripLogistics {
  reservations: Reservation[];
  tickets: { id: string; name: string; url?: string; reference?: string }[];
  hotel: { name: string; address: string; checkIn: string; checkOut: string } | null;
  transitPass: { type: string; reference: string } | null;
}

// --- Achievements ---
export interface Achievement {
  id: string;
  emoji: string;
  title: string;
  description: string;
  unlockedAt: string | null;
  progress: number;
  requirement: number;
}

// --- Itinerary Alerts ---
export interface ItineraryAlert {
  id: string;
  type: 'closing_soon' | 'skipped' | 'bonus_time' | 'time_swap';
  message: string;
  stopId?: string;
  action?: { label: string; actionType: 'reorder' | 'remove' | 'suggest' | 'swap' };
}
