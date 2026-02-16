// Vercel Serverless API Route — Dish Image Search
// Priority: Wikipedia exact → Google Images → Wikimedia Commons → Pexels → Unsplash
// Focused on finding photos of the SPECIFIC DISH, not the restaurant

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIp } from './_lib/cors.js';

const PEXELS_API_KEY = process.env.PEXELS_API_KEY || '';
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || '';
const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID || '';

// Wikipedia/Wikimedia APIs require a descriptive User-Agent or they return 403
const WIKI_HEADERS = {
  'User-Agent': 'NxStops/1.0 (https://nxstops.com; nxstops-app) node-fetch',
  'Accept': 'application/json',
};

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
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query.replace(/\s+/g, '_'))}`,
      { headers: WIKI_HEADERS }
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
      `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query + ' food')}&gsrlimit=3&prop=pageimages&piprop=thumbnail|original&pithumbsize=600&format=json&origin=*`,
      { headers: WIKI_HEADERS }
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
// Google Custom Search — most reliable for specific dish photos
// Requires GOOGLE_PLACES_API_KEY + GOOGLE_CSE_ID env vars
// Free tier: 100 searches/day
// --------------------------------------------------------------------------
async function searchGoogle(query: string): Promise<ImageResult[]> {
  if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) return [];
  try {
    const resp = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CSE_ID}&q=${encodeURIComponent(query + ' food dish')}&searchType=image&num=4&imgType=photo&safe=active`
    );
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data.items || []).slice(0, 4).map((item: { link: string; image?: { thumbnailLink: string }; title: string; displayLink: string }) => ({
      url: item.link,
      thumb: item.image?.thumbnailLink || item.link,
      alt: item.title || query,
      source: 'Google',
      photographer: item.displayLink,
    }));
  } catch { return []; }
}

// --------------------------------------------------------------------------
// Wikimedia Commons — free, no API key needed
// --------------------------------------------------------------------------
async function searchWikimedia(query: string): Promise<ImageResult[]> {
  try {
    const resp = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query + ' food dish')}&gsrlimit=6&gsrnamespace=6&prop=imageinfo&iiprop=url|extmetadata|mime&iiurlwidth=800&format=json&origin=*`,
      { headers: WIKI_HEADERS }
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
// Food synonym expansion — regional/cultural name variations
// --------------------------------------------------------------------------
const FOOD_SYNONYMS: Record<string, string[]> = {
  'peanut butter soup': ['groundnut soup', 'nkate nkwan'],
  'groundnut soup': ['peanut butter soup', 'peanut soup', 'nkate nkwan'],
  'peanut soup': ['groundnut soup', 'peanut butter soup'],
  'jollof rice': ['jollof'],
  'banku': ['banku and tilapia'],
  'waakye': ['waakye rice and beans'],
  'kenkey': ['kenkey and fish'],
  'fufu': ['fufu and soup', 'pounded fufu'],
  'egusi soup': ['melon seed soup'],
  'suya': ['beef suya', 'chicken suya'],
  'moi moi': ['moin moin', 'bean pudding'],
  'chin chin': ['chin-chin'],
  'plantain': ['fried plantain', 'kelewele'],
  'kelewele': ['spicy fried plantain'],
};

function expandDishQuery(query: string): string[] {
  const q = query.toLowerCase();
  const variants = new Set<string>([query]);

  // Check full query against synonyms
  for (const [key, synonyms] of Object.entries(FOOD_SYNONYMS)) {
    if (q.includes(key)) {
      for (const syn of synonyms) {
        variants.add(query.toLowerCase().replace(key, syn));
      }
    }
  }

  // For compound dishes ("X and Y", "X with Y"), also try each part
  const compoundMatch = q.match(/^(.+?)\s+(?:and|with|&|in)\s+(.+)$/);
  if (compoundMatch) {
    const [, part1, part2] = compoundMatch;
    variants.add(part1.trim());
    variants.add(part2.trim());
    // Also check synonyms for each part
    for (const [key, synonyms] of Object.entries(FOOD_SYNONYMS)) {
      if (part1.trim() === key || part2.trim() === key) {
        for (const syn of synonyms) variants.add(syn);
      }
    }
  }

  return Array.from(variants);
}

// --------------------------------------------------------------------------
// Deduplicate images by URL
// --------------------------------------------------------------------------
function deduplicateImages(images: ImageResult[]): ImageResult[] {
  const seen = new Set<string>();
  return images.filter(img => {
    const key = img.url || img.thumb;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

  // Expand query with synonyms (e.g. "peanut butter soup" → also try "groundnut soup")
  const queryVariants = expandDishQuery(dishName);

  const stopWords = new Set(['and', 'with', 'the', 'for', 'from', 'this', 'that']);
  const queryWords = dishName.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
  const minScore = Math.max(1, queryWords.length); // Must match ALL significant words

  let images: ImageResult[] = [];

  // Step 1: All sources in parallel for speed
  const step1Promises: Promise<ImageResult[]>[] = [
    searchGoogle(dishName),        // Google Images — most accurate
    searchWikimedia(dishName),     // Wikimedia Commons — specific filenames
    searchPexels(dishName),        // Pexels — stock food photos
  ];
  for (const variant of queryVariants) {
    step1Promises.push(searchWikipedia(variant));  // Wikipedia exact per variant
  }

  const step1Results = await Promise.all(step1Promises);
  const [googleResults, wikimediaResults, pexelsResults, ...wikiExactResults] = step1Results;

  // 1st: Wikipedia exact matches — always go first (most authoritative, always relevant)
  for (const wikiExact of wikiExactResults) {
    if (wikiExact.length > 0) {
      images.push(...wikiExact);
    }
  }

  // 2nd: Google Images — very accurate, goes right after Wikipedia
  if (googleResults.length > 0) {
    images.push(...googleResults);
  }

  // 3rd: Wikimedia Commons — only keep images where filename matches MOST query words
  // e.g. for "Jollof Rice", keep "Jollof_rice_and_tomato_stew" (2/2 words),
  // reject "Red_beans_and_rice" (1/2 words — too generic)
  if (wikimediaResults.length > 0) {
    const goodWikimedia = wikimediaResults.filter(img => {
      const altLower = img.alt.toLowerCase();
      const matchCount = queryWords.filter(w => altLower.includes(w)).length;
      return matchCount >= minScore;
    });
    images.push(...goodWikimedia);
  }

  // 4th: Pexels stock photos — filter strictly by relevance
  // Must match ALL query words (same as Wikimedia) to avoid generic stock photos
  if (pexelsResults.length > 0) {
    const goodPexels = pexelsResults.filter(img => {
      const altLower = (img.alt || '').toLowerCase();
      const matchCount = queryWords.filter(w => altLower.includes(w)).length;
      return matchCount >= minScore;
    });
    images.push(...goodPexels);
  }

  images = deduplicateImages(images).slice(0, 6);

  // Step 2: If nothing good yet, try Wikipedia fuzzy + Unsplash
  if (images.length === 0) {
    const step2Promises: Promise<ImageResult[]>[] = [
      searchUnsplash(dishName),
    ];
    for (const variant of queryVariants.slice(0, 3)) {
      step2Promises.push(searchWikipediaFuzzy(variant));
    }

    const step2Results = await Promise.all(step2Promises);
    const [unsplashResults, ...fuzzyResults] = step2Results;

    // Score fuzzy results — only keep high-relevance matches
    const allFuzzy: ImageResult[] = [];
    for (const fuzzy of fuzzyResults) allFuzzy.push(...fuzzy);
    if (allFuzzy.length > 0) {
      const scored = allFuzzy
        .map(img => ({
          img,
          score: queryWords.filter(w => img.alt.toLowerCase().includes(w)).length,
        }))
        .filter(s => s.score >= Math.ceil(queryWords.length / 2))
        .sort((a, b) => b.score - a.score);
      images.push(...scored.map(s => s.img));
    }

    if (unsplashResults.length > 0) {
      images.push(...unsplashResults);
    }

    images = deduplicateImages(images).slice(0, 6);
  }

  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=172800');
  return res.status(200).json({ images, query: dishName });
}
