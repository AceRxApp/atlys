// Auto Day Planner — calls /api/plan-day to generate AI itineraries

import type { Place } from './places';
import { fetchRetry } from '../utils/fetchRetry';
import { API_URL } from '../utils/api';

export interface AutoPlanStop {
  place: Place;
  timeSlot: string;
  reason: string;
  estimatedSpend: number;
}

export interface AutoPlanResult {
  plan: AutoPlanStop[];
  dayTitle: string;
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
}

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
    totalPlaces: data.totalPlaces || 0,
  };
}
