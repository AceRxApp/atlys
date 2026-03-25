// Auto Day Planner — calls /api/plan-day to generate AI itineraries

import type { Place } from './places';
import { fetchRetry } from '../utils/fetchRetry';
import { API_URL } from '../utils/api';

export interface AutoPlanStop {
  place: Place;
  timeSlot: string;
  reason: string;
  knownFor?: string;
  estimatedSpend: number;
  neighborhood?: string;
}

export interface AutoPlanResult {
  plan: AutoPlanStop[];
  dayTitle: string;
  headline: string;
  totalPlaces: number;
}

export interface AutoPlanRequest {
  lat: number;
  lng: number;
  city?: string;
  vibe?: string;
  subVibe?: string;
  mood?: string;
  travelGroup?: string;
  duration?: string;
  weather?: string;
  preferences?: string;
  events?: { name: string; category: string; time: string; venue: string }[];
  advisory?: string;
  jetLagContext?: string;
  localTime?: string;
}

// ─── Curated Picks (Browse mode) ──────────────────────────────────────────

export interface CuratedSection {
  label: string;
  emoji: string;
  picks: (Place & { gem?: boolean })[];
}

export interface CuratedPicksResult {
  sections: Record<'morning' | 'afternoon' | 'evening', CuratedSection>;
  vibeLabel: string;
  totalPlaces: number;
}

export async function fetchCuratedPicks(
  request: Omit<AutoPlanRequest, 'mood' | 'duration'>,
): Promise<CuratedPicksResult> {
  const response = await fetchRetry(`${API_URL}/api/plan-day`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...request, mode: 'curated' }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Failed to load picks (${response.status})`);
  }

  const data = await response.json();

  if (!data.sections) {
    throw new Error('No picks available. Try a different location.');
  }

  // Prefix relative photo URLs with API_URL for native apps
  const fixPhotos = (picks: (Place & { gem?: boolean })[]) =>
    picks.map(p => ({
      ...p,
      photoUrl: p.photoUrl && p.photoUrl.startsWith('/')
        ? `${API_URL}${p.photoUrl}`
        : p.photoUrl,
    }));

  const sections = data.sections as Record<string, CuratedSection>;
  for (const key of Object.keys(sections)) {
    sections[key].picks = fixPhotos(sections[key].picks);
  }

  return {
    sections: sections as CuratedPicksResult['sections'],
    vibeLabel: data.vibeLabel || 'Explore',
    totalPlaces: data.totalPlaces || 0,
  };
}

// ─── AI Itinerary (Original mode) ────────────────────────────────────────

export async function generateDayPlan(request: AutoPlanRequest): Promise<AutoPlanResult> {
  const response = await fetchRetry(`${API_URL}/api/plan-day`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Plan generation failed (${response.status})`);
  }

  const data = await response.json();

  if (!data.plan || data.plan.length === 0) {
    throw new Error(data.message || 'No plan generated. Try a different location.');
  }

  // Prefix relative photo URLs with API_URL for native apps
  const plan = (data.plan as AutoPlanStop[]).map(stop => ({
    ...stop,
    place: {
      ...stop.place,
      photoUrl: stop.place.photoUrl && stop.place.photoUrl.startsWith('/')
        ? `${API_URL}${stop.place.photoUrl}`
        : stop.place.photoUrl,
    },
  }));

  return {
    plan,
    dayTitle: data.dayTitle || 'Your Day Plan',
    headline: data.headline || '',
    totalPlaces: data.totalPlaces || 0,
  };
}
