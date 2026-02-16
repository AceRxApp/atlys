// Vercel Serverless API Route — Dish Image Search
// Priority: Wikipedia (exact dish) → Pexels → Unsplash → Wikimedia Commons
// Focused on finding photos of the SPECIFIC DISH, not the restaurant

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIp } from './_lib/cors.js';

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
// Wikipedia — best for well-known dishes (exact match by article title)
// --------------------------------------------------------------------------
async function searchWikipedia(query: string): Promise<ImageResult[]> {
  try {
    // Try exact dish name first
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
// Wikipedia search — fuzzy search for dishes Wikipedia doesn't have an exact article for
// --------------------------------------------------------------------------
async function searchWikipediaFuzzy(query: string): Promise<ImageResult[]> {
  try {
    const resp = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query + ' food')}&gsrlimit=3&prop=pageimages&piprop=thumbnail|original&pithumbsize=600&format=json&origin=*`
    );
    if (!resp.ok) return [];
    const data = await resp.json();
    const pages = data.query?.pages;
    if (!pages) return [];
    const results: ImageResult[] = [];
    for (const page of Object.values(pages) as { title: string; thumbnail?: { source: string }; original?: { source: string } }[]) {
      if (page.thumbnail?.source) {
        results.push({
          url: page.original?.source || page.thumbnail.source,
          thumb: page.thumbnail.source,
          alt: page.title || query,
          source: 'Wikipedia',
        });
      }
    }
    return results;
  } catch { return []; }
}

// --------------------------------------------------------------------------
// Pexels — stock food photos (specific dish queries)
// --------------------------------------------------------------------------
async function searchPexels(query: string): Promise<ImageResult[]> {
  if (!PEXELS_API_KEY) return [];
  try {
    const resp = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=4&orientation=landscape`,
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
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=4&orientation=landscape`,
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
    const resp = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query + ' food dish')}&gsrlimit=6&gsrnamespace=6&prop=imageinfo&iiprop=url|extmetadata|mime&iiurlwidth=800&format=json&origin=*`
    );
    if (!resp.ok) return [];
    const data = await resp.json();
    const pages = data.query?.pages;
    if (!pages) return [];
    const results: ImageResult[] = [];
    for (const page of Object.values(pages) as { title: string; imageinfo?: { thumburl: string; url: string; mime: string; extmetadata?: { ImageDescription?: { value: string }; Artist?: { value: string } } }[] }[]) {
      const info = page.imageinfo?.[0];
      if (!info?.thumburl) continue;
      if (info.mime && !/image\/(jpeg|webp|png)/.test(info.mime)) continue;
      const artist = info.extmetadata?.Artist?.value?.replace(/<[^>]*>/g, '') || '';
      results.push({
        url: info.thumburl,
        thumb: info.thumburl,
        alt: page.title.replace(/^File:/, '').replace(/\.[^.]+$/, ''),
        source: 'Wikimedia',
        photographer: artist || undefined,
      });
      if (results.length >= 4) break;
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
  if (!query) return res.status(400).json({ error: 'q parameter required' });

  // Clean the dish name — strip generic filler words for better matching
  const dishName = query
    .replace(/\s+(food|dish|plate|served|restaurant|menu|item)$/gi, '')
    .trim();

  let images: ImageResult[] = [];

  // Step 1: Try Wikipedia exact match (best for well-known dishes like "Pad Thai", "Jollof Rice")
  // Also start Pexels search in parallel for faster response
  const [wikiExact, pexelsResults] = await Promise.all([
    searchWikipedia(dishName),
    searchPexels(dishName),
  ]);

  if (wikiExact.length > 0) {
    images = wikiExact;
  }

  // Step 2: Add Pexels photos (dish-specific search)
  if (pexelsResults.length > 0) {
    images = [...images, ...pexelsResults].slice(0, 5);
  }

  // Step 3: If still nothing, try Wikipedia fuzzy search + Unsplash in parallel
  if (images.length === 0) {
    const [wikiFuzzy, unsplashResults] = await Promise.all([
      searchWikipediaFuzzy(dishName),
      searchUnsplash(dishName),
    ]);

    if (wikiFuzzy.length > 0) {
      images = wikiFuzzy;
    }
    if (unsplashResults.length > 0) {
      images = [...images, ...unsplashResults].slice(0, 5);
    }
  }

  // Step 4: Last resort — Wikimedia Commons
  if (images.length === 0) {
    images = await searchWikimedia(dishName);
  }

  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=172800');
  return res.status(200).json({ images, query: dishName });
}
