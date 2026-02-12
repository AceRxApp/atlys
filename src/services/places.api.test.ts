import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  searchNearby,
  textSearchPlaces,
  getPlaceDetails,
  getPhotoUrl,
  VIBE_TYPE_MAP,
  getTimeAwareTypes,
} from '../services/places';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRawPlace(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ChIJ123',
    displayName: { text: 'Test Place' },
    location: { latitude: 40.7, longitude: -74.0 },
    primaryType: 'restaurant',
    primaryTypeDisplayName: { text: 'Restaurant' },
    rating: 4.5,
    userRatingCount: 100,
    priceLevel: 'PRICE_LEVEL_MODERATE',
    currentOpeningHours: {
      openNow: true,
      weekdayDescriptions: ['Monday: 9:00 AM \u2013 10:00 PM'],
    },
    photos: [{ name: 'photos/123/456' }],
    types: ['restaurant', 'food'],
    formattedAddress: '123 Main St, NY',
    nationalPhoneNumber: '(555) 123-4567',
    websiteUri: 'https://example.com',
    googleMapsUri: 'https://maps.google.com/123',
    editorialSummary: { text: 'A great restaurant' },
    ...overrides,
  };
}

function okResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

function errorResponse(status = 500) {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({}),
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('places API service', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ========================================================================
  // searchNearby
  // ========================================================================
  describe('searchNearby', () => {
    it('calls fetch with correct params including action, lat, lng, radius, and types', async () => {
      fetchMock.mockResolvedValueOnce(okResponse({ places: [makeRawPlace()] }));

      await searchNearby(40.7, -74.0, ['food'], 2000);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toContain('/api/places?');
      expect(url).toContain('action=nearby');
      expect(url).toContain('lat=40.7');
      expect(url).toContain('lng=-74');
      expect(url).toContain('radius=2000');
      expect(url).toContain('types=');
    });

    it('transforms the raw Google response into the Place shape', async () => {
      fetchMock.mockResolvedValueOnce(okResponse({ places: [makeRawPlace()] }));

      const results = await searchNearby(40.7, -74.0, ['food']);

      expect(results.length).toBeGreaterThanOrEqual(1);
      const place = results[0];
      expect(place.placeId).toBe('ChIJ123');
      expect(place.name).toBe('Test Place');
      expect(place.category).toBe('restaurant');
      expect(place.categoryDisplay).toBe('Restaurant');
      expect(place.rating).toBe(4.5);
      expect(place.reviewCount).toBe(100);
      expect(place.priceLevel).toBe(2); // PRICE_LEVEL_MODERATE -> 2
      expect(place.openNow).toBe(true);
      expect(place.hours).toEqual(['Monday: 9:00 AM \u2013 10:00 PM']);
      expect(place.address).toBe('123 Main St, NY');
      expect(place.phone).toBe('(555) 123-4567');
      expect(place.website).toBe('https://example.com');
      expect(place.googleMapsUrl).toBe('https://maps.google.com/123');
      expect(place.editorialSummary).toBe('A great restaurant');
      expect(place.lat).toBe(40.7);
      expect(place.lng).toBe(-74.0);
      expect(place.photoUrl).toContain('action=photo');
      expect(place.photoNames).toEqual(['photos/123/456']);
    });

    it('sorts results by distance (ascending)', async () => {
      const farPlace = makeRawPlace({
        id: 'far',
        displayName: { text: 'Far Place' },
        location: { latitude: 41.0, longitude: -74.5 },
      });
      const nearPlace = makeRawPlace({
        id: 'near',
        displayName: { text: 'Near Place' },
        location: { latitude: 40.7001, longitude: -74.0001 },
      });

      fetchMock.mockResolvedValueOnce(
        okResponse({ places: [farPlace, nearPlace] }),
      );

      const results = await searchNearby(40.7, -74.0, ['food']);
      // The near place should appear before the far place
      expect(results[0].name).toBe('Near Place');
      expect(results[results.length - 1].name).toBe('Far Place');
    });

    it('returns an empty array when the API responds with an error status', async () => {
      // fetchRetry retries 5xx errors up to 2 times, so provide 3 error responses
      fetchMock.mockResolvedValue(errorResponse(500));

      const results = await searchNearby(40.7, -74.0, ['food']);
      expect(results).toEqual([]);
    });

    it('uses default types when vibes array is empty', async () => {
      fetchMock.mockResolvedValueOnce(okResponse({ places: [] }));

      await searchNearby(40.7, -74.0, []);

      const url = fetchMock.mock.calls[0][0] as string;
      // Should include some default types like restaurant, cafe, bar, etc.
      expect(url).toContain('restaurant');
      expect(url).toContain('cafe');
    });
  });

  // ========================================================================
  // textSearchPlaces
  // ========================================================================
  describe('textSearchPlaces', () => {
    it('calls fetch with correct params including action=textsearch and query', async () => {
      fetchMock.mockResolvedValueOnce(okResponse({ places: [] }));

      await textSearchPlaces('pizza near me', 40.7, -74.0, 3000);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toContain('/api/places?');
      expect(url).toContain('action=textsearch');
      expect(url).toContain('query=pizza');
      expect(url).toContain('lat=40.7');
      expect(url).toContain('lng=-74');
      expect(url).toContain('radius=3000');
    });

    it('transforms the response into Place objects', async () => {
      fetchMock.mockResolvedValueOnce(
        okResponse({ places: [makeRawPlace()] }),
      );

      const results = await textSearchPlaces('sushi', 40.7, -74.0);
      expect(results.length).toBe(1);
      expect(results[0].placeId).toBe('ChIJ123');
      expect(results[0].name).toBe('Test Place');
      expect(results[0].distance).toBeTypeOf('number');
    });

    it('returns an empty array when the API responds with an error', async () => {
      fetchMock.mockResolvedValueOnce(errorResponse(404));

      const results = await textSearchPlaces('tacos', 40.7, -74.0);
      expect(results).toEqual([]);
    });
  });

  // ========================================================================
  // getPlaceDetails
  // ========================================================================
  describe('getPlaceDetails', () => {
    it('calls fetch with action=details and placeId', async () => {
      fetchMock.mockResolvedValueOnce(okResponse(makeRawPlace()));

      await getPlaceDetails('ChIJ123');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toContain('action=details');
      expect(url).toContain('placeId=ChIJ123');
    });

    it('transforms the response into a single Place object', async () => {
      fetchMock.mockResolvedValueOnce(okResponse(makeRawPlace()));

      const place = await getPlaceDetails('ChIJ123');
      expect(place).not.toBeNull();
      expect(place!.placeId).toBe('ChIJ123');
      expect(place!.name).toBe('Test Place');
      expect(place!.rating).toBe(4.5);
    });

    it('returns null when the API responds with an error', async () => {
      // fetchRetry retries 5xx errors up to 2 times, so provide persistent error responses
      fetchMock.mockResolvedValue(errorResponse(500));

      const place = await getPlaceDetails('ChIJ_BAD');
      expect(place).toBeNull();
    });
  });

  // ========================================================================
  // getPhotoUrl
  // ========================================================================
  describe('getPhotoUrl', () => {
    it('generates the correct URL string with default maxWidth', () => {
      const url = getPhotoUrl('photos/abc/def');
      expect(url).toBe(
        '/api/places?action=photo&name=photos%2Fabc%2Fdef&maxWidth=400',
      );
    });

    it('generates the correct URL string with custom maxWidth', () => {
      const url = getPhotoUrl('photos/abc/def', 800);
      expect(url).toBe(
        '/api/places?action=photo&name=photos%2Fabc%2Fdef&maxWidth=800',
      );
    });
  });

  // ========================================================================
  // VIBE_TYPE_MAP
  // ========================================================================
  describe('VIBE_TYPE_MAP', () => {
    const expectedVibes = ['food', 'stay', 'todo', 'hidden', 'locals'];

    it('has entries for all 5 vibes', () => {
      for (const vibe of expectedVibes) {
        expect(VIBE_TYPE_MAP).toHaveProperty(vibe);
      }
    });

    it('each vibe has a non-empty array of types', () => {
      for (const vibe of expectedVibes) {
        expect(Array.isArray(VIBE_TYPE_MAP[vibe])).toBe(true);
        expect(VIBE_TYPE_MAP[vibe].length).toBeGreaterThan(0);
      }
    });

    it('all entries are strings', () => {
      for (const vibe of expectedVibes) {
        for (const type of VIBE_TYPE_MAP[vibe]) {
          expect(typeof type).toBe('string');
        }
      }
    });
  });

  // ========================================================================
  // getTimeAwareTypes
  // ========================================================================
  describe('getTimeAwareTypes', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('returns an array of strings', () => {
      const types = getTimeAwareTypes();
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
      for (const t of types) {
        expect(typeof t).toBe('string');
      }
    });

    it('returns morning types during morning hours', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2025, 0, 15, 8, 0, 0)); // 8 AM
      const types = getTimeAwareTypes();
      expect(types).toContain('cafe');
      vi.useRealTimers();
    });

    it('returns evening types during evening hours', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2025, 0, 15, 20, 0, 0)); // 8 PM
      const types = getTimeAwareTypes();
      expect(types).toContain('bar');
      vi.useRealTimers();
    });
  });
});
