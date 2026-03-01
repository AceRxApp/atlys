// Search History — persists searched & planned places for Discover feed rotation
import type { Place } from '../services/places';

const STORAGE_KEY = 'nxstops_search_history';
const MAX_ITEMS = 50;

interface HistoryEntry {
  place: Place;
  addedAt: number;
  source: 'search' | 'plan';
}

function load(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function save(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ITEMS)));
  } catch { /* ignore */ }
}

/** Save places to search history (deduplicates by placeId) */
export function saveToHistory(places: Place[], source: 'search' | 'plan'): void {
  const existing = load();
  const existingIds = new Set(existing.map(e => e.place.placeId));
  const now = Date.now();
  const newEntries = places
    .filter(p => !existingIds.has(p.placeId))
    .map(p => ({ place: p, addedAt: now, source }));
  if (newEntries.length === 0) return;
  save([...newEntries, ...existing]);
}

/** Get all history places, newest first */
export function getHistoryPlaces(): Place[] {
  return load()
    .sort((a, b) => b.addedAt - a.addedAt)
    .map(e => e.place);
}

/** Clear search history */
export function clearHistory(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}
