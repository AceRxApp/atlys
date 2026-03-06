import { describe, it, expect } from 'vitest';
import { findPivotAlternatives } from './surpriseFilter';
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
    photoNames: [],
    address: '123 Main St',
    phone: null,
    website: null,
    googleMapsUrl: null,
    editorialSummary: null,
    hours: null,
    tags: [],
    ...overrides,
  };
}

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
