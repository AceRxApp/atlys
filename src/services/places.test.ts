import { describe, it, expect } from 'vitest';
import { formatDistance, getHoursStatus } from './places';

describe('formatDistance', () => {
  it('returns "1 min walk" for very short distances', () => {
    expect(formatDistance(0.1)).toBe('1 min walk');
  });

  it('returns walk time for distances under 1km', () => {
    // 500m at ~80m/min = ~6 min
    expect(formatDistance(0.5)).toBe('6 min walk');
  });

  it('returns km for distances 1-2km', () => {
    expect(formatDistance(1.5)).toBe('1.5 km');
  });

  it('returns rounded km for larger distances', () => {
    expect(formatDistance(5.0)).toBe('5 km');
  });

  it('converts to miles when useMiles is true', () => {
    const result = formatDistance(1.6, true);
    expect(result).toMatch(/mi$/);
  });

  it('returns miles for distances over 1km', () => {
    const result = formatDistance(2.0, true);
    expect(result).toMatch(/mi$/);
  });
});

describe('getHoursStatus', () => {
  it('returns Open/Closed when no hours provided', () => {
    expect(getHoursStatus([], true)).toEqual({ text: 'Open', urgent: false });
    expect(getHoursStatus([], false)).toEqual({ text: 'Closed', urgent: false });
  });

  it('returns Open when openNow is true', () => {
    const result = getHoursStatus(['Monday: 9:00 AM – 5:00 PM'], true);
    expect(result.text).toContain('Open');
  });

  it('returns Closed when openNow is false', () => {
    const result = getHoursStatus(['Monday: 9:00 AM – 5:00 PM'], false);
    expect(result.text).toBe('Closed');
  });
});
