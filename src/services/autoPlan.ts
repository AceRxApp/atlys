// Auto Day Planner — calls /api/plan-day to generate AI itineraries

import type { Place } from './places';
import { fetchRetry } from '../utils/fetchRetry';

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
  mood?: string;
  travelGroup?: string;
  duration?: string;
  weather?: string;
  preferences?: string;
  events?: { name: string; category: string; time: string; venue: string }[];
}

export async function generateDayPlan(request: AutoPlanRequest): Promise<AutoPlanResult> {
  const response = await fetchRetry('/api/plan-day', {
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

  return {
    plan: data.plan,
    dayTitle: data.dayTitle || 'Your Day Plan',
    totalPlaces: data.totalPlaces || 0,
  };
}
