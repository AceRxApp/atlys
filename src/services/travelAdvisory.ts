// Travel Advisory Service — fetches UK FCDO data via serverless proxy
import { API_URL } from '../utils/api';

export interface TravelAdvisory {
  country: string;
  hasAdvisory: boolean;
  level: 'advise_against_all' | 'advise_against_some' | 'exercise_caution' | 'normal' | null;
  title?: string;
  summary?: string;
  updatedAt?: string;
  url?: string;
}

const clientCache = new Map<string, { data: TravelAdvisory; fetchedAt: number }>();
const CLIENT_CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function fetchTravelAdvisory(country: string): Promise<TravelAdvisory | null> {
  if (!country) return null;

  const key = country.toLowerCase().trim();
  const cached = clientCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CLIENT_CACHE_TTL) return cached.data;

  try {
    const resp = await fetch(`${API_URL}/api/weather?action=advisory&country=${encodeURIComponent(country)}`);
    if (!resp.ok) return null;
    const data: TravelAdvisory = await resp.json();
    clientCache.set(key, { data, fetchedAt: Date.now() });
    return data;
  } catch {
    return null;
  }
}

export function getAdvisoryDisplay(advisory: TravelAdvisory): {
  emoji: string;
  label: string;
  color: string;
  bgClass: string;
  borderClass: string;
} | null {
  if (!advisory.hasAdvisory || advisory.level === 'normal' || !advisory.level) return null;

  switch (advisory.level) {
    case 'advise_against_all':
      return {
        emoji: '\u{1F6D1}',
        label: 'UK gov advises against all travel',
        color: 'text-status-red',
        bgClass: 'bg-[rgba(239,68,68,0.08)]',
        borderClass: 'border-[rgba(239,68,68,0.2)]',
      };
    case 'advise_against_some':
      return {
        emoji: '\u{26A0}\u{FE0F}',
        label: 'UK gov advises against some travel',
        color: 'text-status-red',
        bgClass: 'bg-[rgba(239,68,68,0.08)]',
        borderClass: 'border-[rgba(239,68,68,0.2)]',
      };
    case 'exercise_caution':
      return {
        emoji: '\u{1F7E1}',
        label: 'Exercise caution advised',
        color: 'text-accent-amber',
        bgClass: 'bg-amber-tint-bg10',
        borderClass: 'border-amber-tint-border15',
      };
    default:
      return null;
  }
}
