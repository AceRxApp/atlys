import { describe, it, expect } from 'vitest';
import { calcWalkMinutes, calcDriveMinutes, buildMapsUrl, haversineKm } from './transport';

describe('calcWalkMinutes', () => {
  it('returns 0 for 0 km', () => {
    expect(calcWalkMinutes(0)).toBe(0);
  });

  it('calculates ~16 min for 1 km (1.3× multiplier at 5 km/h)', () => {
    expect(calcWalkMinutes(1)).toBe(16);
  });

  it('handles long distances', () => {
    expect(calcWalkMinutes(5)).toBe(78);
  });
});

describe('calcDriveMinutes', () => {
  it('returns at least 1 minute for short distances', () => {
    expect(calcDriveMinutes(0.1)).toBe(1);
  });

  it('calculates ~2 min for 1 km (1.2× multiplier at 30 km/h)', () => {
    expect(calcDriveMinutes(1)).toBe(2);
  });

  it('handles longer distances', () => {
    expect(calcDriveMinutes(10)).toBe(24);
  });
});

describe('buildMapsUrl', () => {
  it('builds a walking directions URL', () => {
    const url = buildMapsUrl({ lat: 40.7, lng: -74 }, { lat: 40.8, lng: -73.9 }, 'walking');
    expect(url).toContain('travelmode=walking');
    expect(url).toContain('origin=40.7,-74');
    expect(url).toContain('destination=40.8,-73.9');
  });

  it('builds a driving directions URL', () => {
    const url = buildMapsUrl({ lat: 1, lng: 2 }, { lat: 3, lng: 4 }, 'driving');
    expect(url).toContain('travelmode=driving');
  });
});

describe('haversineKm', () => {
  it('returns 0 for same point', () => {
    expect(haversineKm({ lat: 40, lng: -74 }, { lat: 40, lng: -74 })).toBe(0);
  });

  it('calculates roughly correct distance (NYC to Newark ~15 km)', () => {
    const km = haversineKm({ lat: 40.7128, lng: -74.006 }, { lat: 40.7357, lng: -74.1724 });
    expect(km).toBeGreaterThan(13);
    expect(km).toBeLessThan(17);
  });

  it('handles short distances (<1 km)', () => {
    const km = haversineKm({ lat: 40.7128, lng: -74.006 }, { lat: 40.714, lng: -74.007 });
    expect(km).toBeLessThan(1);
    expect(km).toBeGreaterThan(0);
  });
});
