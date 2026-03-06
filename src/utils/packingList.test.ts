import { describe, it, expect } from 'vitest';
import { generatePackingList } from './packingList';
import type { Stop } from '../types';

const makeStop = (category: string): Stop => ({
  id: '1',
  type: 'place',
  place: {
    placeId: 'p1',
    name: 'Test',
    lat: 0,
    lng: 0,
    category,
    categoryDisplay: category,
    rating: 4,
    reviewCount: 10,
    priceLevel: 2,
    openNow: true,
    distance: null,
    photoUrl: null,
    photoNames: [],
    address: '',
    phone: null,
    website: null,
    googleMapsUrl: null,
    editorialSummary: null,
    hours: null,
    tags: [],
  },
  addedAt: new Date(),
});

const mildForecast = [{ high: 22, low: 14, precipChance: 10, code: 0 }];
const rainyForecast = [{ high: 18, low: 8, precipChance: 70, code: 61 }];
const coldForecast = [{ high: 2, low: -5, precipChance: 20, code: 71 }];
const hotForecast = [{ high: 35, low: 22, precipChance: 5, code: 0 }];

describe('generatePackingList', () => {
  it('always includes essentials', () => {
    const items = generatePackingList([], mildForecast, null);
    const labels = items.map(i => i.label);
    expect(labels).toContain('Phone charger');
    expect(labels).toContain('Wallet & ID');
    expect(labels).toContain('Comfortable shoes');
  });

  it('adds umbrella for rainy forecast', () => {
    const items = generatePackingList([], rainyForecast, null);
    const labels = items.map(i => i.label);
    expect(labels).toContain('Umbrella');
    expect(labels).toContain('Rain jacket');
  });

  it('adds warm clothing for cold forecast', () => {
    const items = generatePackingList([], coldForecast, null);
    const labels = items.map(i => i.label);
    expect(labels).toContain('Gloves');
    expect(labels).toContain('Scarf');
    expect(labels).toContain('Warm hat');
  });

  it('adds sunscreen for hot forecast', () => {
    const items = generatePackingList([], hotForecast, null);
    const labels = items.map(i => i.label);
    expect(labels).toContain('Sunscreen');
    expect(labels).toContain('Light breathable clothes');
  });

  it('adds activity items based on stop categories', () => {
    const stops = [makeStop('spa'), makeStop('bar')];
    const items = generatePackingList(stops, mildForecast, null);
    const labels = items.map(i => i.label);
    expect(labels).toContain('Swimsuit');
    expect(labels).toContain('Going-out outfit');
  });

  it('adds group items for family travel', () => {
    const items = generatePackingList([], mildForecast, 'family');
    const labels = items.map(i => i.label);
    expect(labels).toContain('Kid snacks');
    expect(labels).toContain('First aid kit');
  });

  it('adds group items for solo travel', () => {
    const items = generatePackingList([], mildForecast, 'solo');
    const labels = items.map(i => i.label);
    expect(labels).toContain('Portable battery pack');
  });

  it('deduplicates items', () => {
    const stops = [makeStop('park'), makeStop('zoo')];
    const items = generatePackingList(stops, hotForecast, null);
    const labels = items.map(i => i.label);
    const sunscreenCount = labels.filter(l => l === 'Sunscreen').length;
    expect(sunscreenCount).toBe(1);
  });

  it('returns items grouped by category', () => {
    const items = generatePackingList([makeStop('spa')], rainyForecast, 'family');
    const categories = [...new Set(items.map(i => i.category))];
    expect(categories).toContain('essentials');
    expect(categories).toContain('weather');
    expect(categories).toContain('activities');
    expect(categories).toContain('group');
  });
});
