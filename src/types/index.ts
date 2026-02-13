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
  estimatedSpend?: number;
}

export type PlanMood = 'adventurous' | 'chill' | 'cultural' | 'foodie' | 'nightlife' | 'eat' | 'sleep' | 'adventure' | 'event';
export type PlanDuration = 'full' | 'morning' | 'afternoon' | 'evening';

export interface AdminSignup {
  id: string;
  email: string;
  city: string | null;
  signed_up_at: string;
}

export type Screen = 'home' | 'discover' | 'events' | 'plan';
export type Vibe = 'food' | 'stay' | 'todo' | 'hidden' | 'locals';
export type QuickFilter = 'open' | 'walking' | 'topRated' | 'budget' | 'family' | 'solo' | 'chainBreaker' | '15min' | 'lateNight' | 'rainyDay' | 'goldenHour';
export type TravelGroup = 'solo' | 'couple' | 'family' | 'friends' | 'girls' | 'boys' | 'bachelorette';
export type CommunityTag = 'black-owned' | 'women-owned' | 'hispanic-owned' | 'asian-owned' | 'lgbtq-friendly' | 'kid-friendly' | 'baby-friendly' | 'wheelchair-accessible' | 'solo-friendly';
