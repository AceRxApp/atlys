// Vercel Serverless API Route — Dish Image Search
// Priority: Google Places restaurant photos → Wikipedia → Pexels → Unsplash → Wikimedia

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIp } from './_lib/cors.js';

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';
const PEXELS_API_KEY = process.env.PEXELS_API_KEY || '';
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || '';

interface ImageResult {
  url: string;
  thumb: string;
  alt: string;
  source: string;
  photographer?: string;
}

// --------------------------------------------------------------------------
// Google Places Photos — real restaurant photos from reviews
// --------------------------------------------------------------------------
async function searchGooglePlaces(restaurant: string, city?: string): Promise<ImageResult[]> {
  if (!GOOGLE_API_KEY) return [];
  try {
    const searchQuery = city ? `${restaurant} ${city}` : restaurant;

    // Step 1: Text Search to find the place and get photo references
    const searchResp = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'places.photos,places.displayName',
      },
      body: JSON.stringify({
        textQuery: searchQuery,
        maxResultCount: 1,
      }),
    });

    if (!searchResp.ok) return [];
    const searchData = await searchResp.json();
    const place = searchData.places?.[0];
    if (!place?.photos || place.photos.length === 0) return [];

    const placeName = place.displayName?.text || restaurant;

    // Step 2: Build photo URLs (up to 5 photos)
    const photos = place.photos.slice(0, 5);
    return photos.map((photo: { name: string; authorAttributions?: { displayName?: string }[] }, i: number) => {
      const photoUrl = `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=800&key=${GOOGLE_API_KEY}`;
      const photographer = photo.authorAttributions?.[0]?.displayName || undefined;
      return {
        url: photoUrl,
        thumb: `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=400&key=${GOOGLE_API_KEY}`,
        alt: `${placeName} - Photo ${i + 1}`,
        source: 'Google',
        photographer,
      };
    });
  } catch { return []; }
}

// --------------------------------------------------------------------------
// Wikipedia — great for well-known dishes
// --------------------------------------------------------------------------
async function searchWikipedia(query: string): Promise<ImageResult[]> {
  try {
    const resp = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query.replace(/\s+/g, '_'))}`
    );
    if (!resp.ok) return [];
    const data = await resp.json();
    if (data.thumbnail?.source) {
      const hiRes = data.originalimage?.source || data.thumbnail.source;
      return [{
        url: hiRes,
        thumb: data.thumbnail.source,
        alt: data.title || query,
        source: 'Wikipedia',
      }];
    }
    return [];
  } catch { return []; }
}

// --------------------------------------------------------------------------
// Pexels — stock food photos
// --------------------------------------------------------------------------
async function searchPexels(query: string): Promise<ImageResult[]> {
  if (!PEXELS_API_KEY) return [];
  try {
    const resp = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`,
      { headers: { Authorization: PEXELS_API_KEY } }
    );
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data.photos || []).map((p: { src: { large: string; medium: string }; alt: string; photographer: string }) => ({
      url: p.src.large,
      thumb: p.src.medium,
      alt: p.alt || query,
      source: 'Pexels',
      photographer: p.photographer,
    }));
  } catch { return []; }
}

// --------------------------------------------------------------------------
// Unsplash — stock food photos
// --------------------------------------------------------------------------
async function searchUnsplash(query: string): Promise<ImageResult[]> {
  if (!UNSPLASH_ACCESS_KEY) return [];
  try {
    const resp = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } }
    );
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data.results || []).map((p: { urls: { regular: string; small: string }; alt_description: string; user: { name: string } }) => ({
      url: p.urls.regular,
      thumb: p.urls.small,
      alt: p.alt_description || query,
      source: 'Unsplash',
      photographer: p.user?.name,
    }));
  } catch { return []; }
}

// --------------------------------------------------------------------------
// Wikimedia Commons — free, no API key needed
// --------------------------------------------------------------------------
async function searchWikimedia(query: string): Promise<ImageResult[]> {
  try {
    const searchTerms = `${query} dish served plate`;
    const resp = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(searchTerms)}&gsrlimit=8&gsrnamespace=6&prop=imageinfo&iiprop=url|extmetadata|mime&iiurlwidth=800&format=json&origin=*`
    );
    if (!resp.ok) return [];
    const data = await resp.json();
    const pages = data.query?.pages;
    if (!pages) return [];
    const results: ImageResult[] = [];
    for (const page of Object.values(pages) as { title: string; imageinfo?: { thumburl: string; url: string; mime: string; extmetadata?: { ImageDescription?: { value: string }; Artist?: { value: string } } }[] }[]) {
      const info = page.imageinfo?.[0];
      if (!info?.thumburl) continue;
      if (info.mime && !/image\/(jpeg|webp)/.test(info.mime)) continue;
      const artist = info.extmetadata?.Artist?.value?.replace(/<[^>]*>/g, '') || '';
      results.push({
        url: info.thumburl,
        thumb: info.thumburl,
        alt: page.title.replace(/^File:/, '').replace(/\.[^.]+$/, ''),
        source: 'Wikimedia',
        photographer: artist || undefined,
      });
      if (results.length >= 5) break;
    }
    return results;
  } catch { return []; }
}

// --------------------------------------------------------------------------
// Handler
// --------------------------------------------------------------------------
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const corsOk = setCorsHeaders(res, req.headers.origin as string | undefined, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!corsOk) return res.status(403).json({ error: 'Origin not allowed' });

  const clientIp = getClientIp(req.headers);
  if (!(await checkRateLimit(clientIp, 20, 60_000))) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const query = (req.query.q as string || '').trim();
  const restaurant = (req.query.restaurant as string || '').trim();
  const city = (req.query.city as string || '').trim();
  if (!query && !restaurant) return res.status(400).json({ error: 'q or restaurant parameter required' });

  let images: ImageResult[] = [];

  // Priority 1: If restaurant is provided, get real Google Places photos
  if (restaurant) {
    images = await searchGooglePlaces(restaurant, city || undefined);
  }

  // Priority 2: If no restaurant photos, try Wikipedia for the dish name
  if (images.length === 0 && query) {
    const dishName = query.replace(/\s+(food|dish|plate|served|restaurant)$/gi, '').trim();
    const [wikiImages, pexelsImages] = await Promise.all([
      searchWikipedia(dishName),
      searchPexels(query),
    ]);

    // Wikipedia images go first (usually the best match for named dishes)
    if (wikiImages.length > 0) {
      images = wikiImages;
    }

    // Add Pexels images
    if (pexelsImages.length > 0) {
      images = [...images, ...pexelsImages].slice(0, 5);
    }

    // Fallback to Unsplash
    if (images.length === 0) {
      images = await searchUnsplash(query);
    }

    // Last resort: Wikimedia Commons
    if (images.length === 0) {
      images = await searchWikimedia(query);
    }
  }

  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=172800');
  return res.status(200).json({ images, query: query || restaurant });
}
