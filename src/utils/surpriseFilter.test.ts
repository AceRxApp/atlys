import { describe, it, expect } from 'vitest';
import { filterSurprisePlaces, filterBudgetAwarePlaces, findPivotAlternatives } from './surpriseFilter';
import type { Place } from '../services/places';

function makePlace(overrides: Partial<Place> = {}): Place {
  return {
    placeId: 'p1',
    name: 'Test Place',
    lat: 40.7,
    lng: -74,
    category: 'restaurant',
    categoryDisplay: 'Restaurant',
    rating: 4.2,
    reviewCount: 100,
    priceLevel: 2,
    openNow: true,
    distance: 0.5,
    photoUrl: null,
    photos: [],
    address: '123 Main St',
    phone: null,
    website: null,
    googleMapsUrl: null,
    editorialSummary: null,
    hours: null,
    ...overrides,
  };
}

describe('filterSurprisePlaces', () => {
  it('returns up to 3 places', () => {
    const places = Array.from({ length: 10 }, (_, i) =>
      makePlace({ placeId: `p${i}`, name: `Place ${i}` }),
    );
    const result = filterSurprisePlaces(places, 'any', null);
    expect(result.length).toBeLessThanOrEqual(3);
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns empty array when no places match', () => {
    const places = [makePlace({ openNow: false })];
    expect(filterSurprisePlaces(places, 'any', null)).toEqual([]);
  });

  it('filters by budget tier — free', () => {
    const places = [
      makePlace({ placeId: 'free', priceLevel: 0 }),
      makePlace({ placeId: 'expensive', priceLevel: 4 }),
    ];
    const result = filterSurprisePlaces(places, 'free', null);
    expect(result.every(p => p.priceLevel === 0 || p.priceLevel === -1)).toBe(true);
  });

  it('filters by budget tier — $$', () => {
    const places = [
      makePlace({ placeId: 'cheap', priceLevel: 1 }),
      makePlace({ placeId: 'mid', priceLevel: 2 }),
      makePlace({ placeId: 'expensive', priceLevel: 4 }),
    ];
    const result = filterSurprisePlaces(places, '$$', null);
    expect(result.every(p => p.priceLevel <= 2)).toBe(true);
  });

  it('filters by vibe — food only', () => {
    const places = [
      makePlace({ placeId: 'food', category: 'restaurant' }),
      makePlace({ placeId: 'hotel', category: 'hotel' }),
    ];
    const result = filterSurprisePlaces(places, 'any', 'food');
    expect(result.every(p => p.category === 'restaurant')).toBe(true);
  });

  it('only returns open places', () => {
    const places = [
      makePlace({ placeId: 'open', openNow: true }),
      makePlace({ placeId: 'closed', openNow: false }),
    ];
    const result = filterSurprisePlaces(places, 'any', null);
    expect(result.every(p => p.openNow)).toBe(true);
  });

  it('returns fewer than 3 if not enough candidates', () => {
    const places = [makePlace({ placeId: 'only' })];
    const result = filterSurprisePlaces(places, 'any', null);
    expect(result).toHaveLength(1);
  });
});

describe('filterBudgetAwarePlaces', () => {
  it('returns places within remaining dollar budget', () => {
    const places = [
      makePlace({ placeId: 'free', priceLevel: 0 }),
      makePlace({ placeId: 'expensive', priceLevel: 4 }),
    ];
    const result = filterBudgetAwarePlaces(places, 20, null);
    // priceLevel 0 = $0, priceLevel 4 = $100 — only free fits $20 budget
    expect(result.every(p => p.priceLevel === 0)).toBe(true);
  });

  it('returns any places when budget is unlimited (-1)', () => {
    const places = Array.from({ length: 5 }, (_, i) =>
      makePlace({ placeId: `p${i}`, priceLevel: i % 5 }),
    );
    const result = filterBudgetAwarePlaces(places, -1, null);
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns empty when no places fit budget', () => {
    const places = [makePlace({ priceLevel: 4 })];
    const result = filterBudgetAwarePlaces(places, 10, null);
    expect(result).toEqual([]);
  });

  it('respects count parameter', () => {
    const places = Array.from({ length: 10 }, (_, i) =>
      makePlace({ placeId: `p${i}`, priceLevel: 0 }),
    );
    const result = filterBudgetAwarePlaces(places, 50, null, 2);
    expect(result.length).toBeLessThanOrEqual(2);
  });
});

describe('findPivotAlternatives', () => {
  it('includes same-category places when available', () => {
    const places = [
      makePlace({ placeId: 'same', category: 'restaurant', lat: 40.7, lng: -74.0, rating: 4.5 }),
      makePlace({ placeId: 'diff', category: 'museum', lat: 40.7, lng: -74.0, rating: 4.5 }),
    ];
    const current = { category: 'restaurant', lat: 40.7, lng: -74.0, priceLevel: 2, placeId: 'old' };
    const result = findPivotAlternatives(places, current, new Set(['old']));
    expect(result.some(p => p.placeId === 'same')).toBe(true);
  });

  it('excludes places already in plan', () => {
    const places = [
      makePlace({ placeId: 'inPlan', category: 'restaurant' }),
      makePlace({ placeId: 'available', category: 'restaurant' }),
    ];
    const current = { category: 'restaurant', lat: 40.7, lng: -74.0, priceLevel: 2, placeId: 'old' };
    const result = findPivotAlternatives(places, current, new Set(['old', 'inPlan']));
    expect(result.every(p => p.placeId !== 'inPlan')).toBe(true);
  });

  it('only returns open places', () => {
    const places = [
      makePlace({ placeId: 'open', category: 'restaurant', openNow: true }),
      makePlace({ placeId: 'closed', category: 'restaurant', openNow: false }),
    ];
    const current = { category: 'restaurant', lat: 40.7, lng: -74.0, priceLevel: 2, placeId: 'old' };
    const result = findPivotAlternatives(places, current, new Set(['old']));
    expect(result.every(p => p.openNow)).toBe(true);
  });

  it('returns max 3 by default', () => {
    const places = Array.from({ length: 10 }, (_, i) =>
      makePlace({ placeId: `p${i}`, category: 'restaurant', lat: 40.7 + i * 0.001, lng: -74 }),
    );
    const current = { category: 'restaurant', lat: 40.7, lng: -74.0, priceLevel: 2, placeId: 'old' };
    const result = findPivotAlternatives(places, current, new Set(['old']));
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it('returns empty when no alternatives available', () => {
    const places = [makePlace({ placeId: 'only', openNow: false })];
    const current = { category: 'restaurant', lat: 40.7, lng: -74.0, priceLevel: 2, placeId: 'old' };
    const result = findPivotAlternatives(places, current, new Set(['old']));
    expect(result).toEqual([]);
  });
});
