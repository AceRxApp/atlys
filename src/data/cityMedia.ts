// ---------------------------------------------------------------------------
// City-level media: self-hosted video clips and social handles
// ---------------------------------------------------------------------------
// Add your self-hosted video URLs per city as you film and upload them.
// Videos should be hosted on Cloudflare Stream, Supabase Storage, Mux, or
// any CDN that serves direct mp4 files.
// The app will show an in-app video player section when a city has content.
// ---------------------------------------------------------------------------

import type { CityVideoClip } from '../components/CityVideoPlayer';
import { fetchCityVideos as fetchSupabaseVideos } from '../supabase';

export interface CityMedia {
  videos?: CityVideoClip[];       // Self-hosted video clips (mp4 / HLS)
  instagramUrl?: string;          // Instagram profile/highlight URL
  instagramHandle?: string;       // e.g. "@nxstops"
}

// Map: lowercase city slug → media links
// Update this as you create content for each city

// DC media shared across slug variants
const DC_MEDIA: CityMedia = {
  videos: [
    // Upload your DC clips and add the mp4 URLs here:
    // { url: 'https://your-cdn.com/dc-balos.mp4', thumbnail: '...', caption: 'Balos Esiatorio', duration: 30 },
    // { url: 'https://your-cdn.com/dc-parks.mp4', thumbnail: '...', caption: 'The Parks at 14th', duration: 25 },
  ],
};

// Accra media shared across slug variants
const ACCRA_MEDIA: CityMedia = {
  videos: [
    // { url: 'https://your-cdn.com/accra-mausoleum.mp4', thumbnail: '...', caption: 'Kwame Nkrumah Mausoleum', duration: 35 },
    // { url: 'https://your-cdn.com/accra-sandbox.mp4', thumbnail: '...', caption: 'Sandbox Beach Club', duration: 28 },
    // { url: 'https://your-cdn.com/accra-madskyz.mp4', thumbnail: '...', caption: 'Mad Skyz', duration: 22 },
  ],
};

const CITY_MEDIA: Record<string, CityMedia> = {
  // ── Cities with video content ──
  // Add self-hosted mp4 URLs as you upload them.
  // Format: { url: 'https://cdn.../video.mp4', thumbnail: 'https://cdn.../thumb.jpg', caption: 'Title', duration: 30 }

  'barcelona': {
    videos: [
      // { url: '...', thumbnail: '...', caption: 'City Discovery', duration: 30 },
    ],
  },
  'cartagena': {
    videos: [
      // { url: '...', thumbnail: '...', caption: 'Why Cartagena should be on your list', duration: 45 },
      // { url: '...', thumbnail: '...', caption: 'Plan Cartagena with me', duration: 35 },
    ],
  },
  'cape-town': {
    videos: [
      // { url: '...', thumbnail: '...', caption: 'The beauty of Cape Town', duration: 40 },
      // { url: '...', thumbnail: '...', caption: 'NxStops takes Cape Town', duration: 30 },
    ],
  },
  'capetown': {
    videos: [
      // { url: '...', thumbnail: '...', caption: 'The beauty of Cape Town', duration: 40 },
      // { url: '...', thumbnail: '...', caption: 'NxStops takes Cape Town', duration: 30 },
    ],
  },
  'nairobi': {
    videos: [
      // { url: '...', thumbnail: '...', caption: 'Ololo Safari Lodge', duration: 25 },
    ],
  },
  'accra': ACCRA_MEDIA,
  'busan': {
    videos: [
      // { url: '...', thumbnail: '...', caption: 'Hidden Gems of Busan', duration: 30 },
    ],
  },
  'sydney': {
    videos: [
      // { url: '...', thumbnail: '...', caption: 'Sydney Opera House', duration: 28 },
    ],
  },
  'chicago': {
    videos: [
      // { url: '...', thumbnail: '...', caption: 'Your night, curated', duration: 35 },
      // { url: '...', thumbnail: '...', caption: 'Crying Tiger', duration: 25 },
    ],
  },
  'kyoto': {
    videos: [
      // { url: '...', thumbnail: '...', caption: 'K36 Rooftop Views', duration: 30 },
    ],
  },
  'atlanta': {
    videos: [
      // { url: '...', thumbnail: '...', caption: 'Mercedes-Benz Stadium', duration: 28 },
    ],
  },
  'london': {
    videos: [
      // { url: '...', thumbnail: '...', caption: 'Exploring London', duration: 35 },
    ],
  },
  'houston': {
    videos: [
      // { url: '...', thumbnail: '...', caption: 'Toca Madera', duration: 30 },
    ],
  },
  'washington-dc': DC_MEDIA,
  'washington-d.c.': DC_MEDIA,
  'washington': DC_MEDIA,
};

// Default social links (shown when no city-specific content exists)
const DEFAULT_MEDIA: CityMedia = {
  instagramUrl: 'https://www.instagram.com/nxstops/',
  instagramHandle: '@nxstops',
};

/**
 * Get media links for a city. Falls back to default social profiles.
 * @param citySlug - lowercase hyphenated city name (e.g. "new-york", "paris")
 */
export function getCityMedia(citySlug: string): CityMedia {
  const slug = citySlug.toLowerCase().replace(/\s+/g, '-');
  const citySpecific = CITY_MEDIA[slug];
  if (citySpecific) {
    return { ...DEFAULT_MEDIA, ...citySpecific };
  }
  return DEFAULT_MEDIA;
}

/**
 * Check if a city has self-hosted video content (static only — for quick checks)
 */
export function cityHasVideo(citySlug: string): boolean {
  const slug = citySlug.toLowerCase().replace(/\s+/g, '-');
  const media = CITY_MEDIA[slug];
  return !!(media?.videos && media.videos.length > 0);
}

// In-memory cache for Supabase video fetches (avoids re-fetching every render)
const _supabaseVideoCache = new Map<string, { clips: CityVideoClip[]; fetchedAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch city videos from Supabase, merge with any hardcoded clips.
 * Returns combined list ready for CityVideoPlayer.
 */
export async function fetchCityVideoClips(citySlug: string): Promise<CityVideoClip[]> {
  const slug = citySlug.toLowerCase().replace(/\s+/g, '-');

  // Check cache
  const cached = _supabaseVideoCache.get(slug);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.clips;
  }

  // Hardcoded clips from CITY_MEDIA
  const staticMedia = CITY_MEDIA[slug];
  const staticClips = staticMedia?.videos?.filter((v) => v.url && !v.url.startsWith('//')) || [];

  // Fetch from Supabase
  let supabaseClips: CityVideoClip[] = [];
  try {
    const rows = await fetchSupabaseVideos(slug);
    supabaseClips = rows.map((r) => ({
      url: r.video_url,
      thumbnail: r.thumbnail_url || undefined,
      caption: r.caption,
      duration: r.duration,
    }));
  } catch { /* offline or error — use static only */ }

  // Merge: Supabase videos first, then any static ones
  const combined = [...supabaseClips, ...staticClips];
  _supabaseVideoCache.set(slug, { clips: combined, fetchedAt: Date.now() });
  return combined;
}

// ---------------------------------------------------------------------------
// Place-level video clips
// ---------------------------------------------------------------------------
// Store video URLs for specific places. These are shown in PlaceDetailModal.
// Key: Google Place ID → video info

export interface PlaceVideo {
  videoUrl: string;       // Direct mp4 URL or HLS stream
  thumbnailUrl: string;   // Video thumbnail
  duration: number;       // Duration in seconds
  caption?: string;       // Short caption overlay
  source: 'self';         // Self-hosted only
}

// Place ID → video clip
// This will eventually be backed by Supabase, but starts as static data
const PLACE_VIDEOS: Record<string, PlaceVideo> = {
  // 'ChIJxxxxxxxx': {
  //   videoUrl: 'https://customer-xxxxx.cloudflarestream.com/xxxxx/manifest/video.m3u8',
  //   thumbnailUrl: 'https://customer-xxxxx.cloudflarestream.com/xxxxx/thumbnails/thumbnail.jpg',
  //   duration: 22,
  //   caption: 'The best tacos in Brooklyn',
  //   source: 'self',
  // },
};

/**
 * Get video clip for a specific place, if available
 */
export function getPlaceVideo(placeId: string): PlaceVideo | null {
  return PLACE_VIDEOS[placeId] || null;
}
