// ---------------------------------------------------------------------------
// City-level media links: TikTok profiles, video clips, social handles
// ---------------------------------------------------------------------------
// Add your TikTok video URLs per city as you film them.
// The app will show a "Watch on TikTok" section when a city has content.
// ---------------------------------------------------------------------------

export interface CityMedia {
  tiktokUrl?: string;       // Your TikTok profile or city-specific playlist URL
  tiktokHandle?: string;    // e.g. "@nxstops"
  tiktokVideos?: { url: string; caption: string }[]; // Multiple TikTok videos for this city
  instagramUrl?: string;    // Instagram profile/highlight URL
  instagramHandle?: string; // e.g. "@nxstops"
  youtubeUrl?: string;      // YouTube channel or city playlist URL
  heroVideoUrl?: string;    // Self-hosted city sizzle reel (Cloudflare Stream / Mux / direct mp4)
  heroVideoThumb?: string;  // Thumbnail for the hero video
}

// Map: lowercase city slug → media links
// Update this as you create content for each city
// DC media shared across slug variants
const DC_MEDIA: CityMedia = {
  tiktokVideos: [
    { url: 'https://www.tiktok.com/@nxstops/video/7610934219291856159', caption: 'Balos Esiatorio' },
    { url: 'https://www.tiktok.com/@nxstops/video/7610541168903900446', caption: 'The Parks at 14th' },
  ],
};

// Accra media shared across slug variants
const ACCRA_MEDIA: CityMedia = {
  tiktokVideos: [
    { url: 'https://www.tiktok.com/@nxstops/video/7614167071479450911', caption: 'Kwame Nkrumah Mausoleum' },
    { url: 'https://www.tiktok.com/@nxstops/video/7611291737528601887', caption: 'Sandbox Beach Club' },
    { url: 'https://www.tiktok.com/@nxstops/video/7610031758888815902', caption: 'Mad Skyz' },
  ],
};

const CITY_MEDIA: Record<string, CityMedia> = {
  // ── Live cities with TikTok content (full video URLs) ──
  'barcelona': {
    tiktokVideos: [
      { url: 'https://www.tiktok.com/@nxstops/video/7616514111744003358', caption: 'City Discovery' },
    ],
  },
  'cartagena': {
    tiktokVideos: [
      { url: 'https://www.tiktok.com/@nxstops/video/7616057632746409246', caption: 'Why Cartagena should be on your list' },
      { url: 'https://www.tiktok.com/@nxstops/video/7616117118655827230', caption: 'Plan Cartagena with me' },
    ],
  },
  'cape-town': {
    tiktokVideos: [
      { url: 'https://www.tiktok.com/@nxstops/video/7615468776384941342', caption: 'The beauty of Cape Town' },
      { url: 'https://www.tiktok.com/@nxstops/video/7615402749835988255', caption: 'NxStops takes Cape Town' },
    ],
  },
  'capetown': {
    tiktokVideos: [
      { url: 'https://www.tiktok.com/@nxstops/video/7615468776384941342', caption: 'The beauty of Cape Town' },
      { url: 'https://www.tiktok.com/@nxstops/video/7615402749835988255', caption: 'NxStops takes Cape Town' },
    ],
  },
  'nairobi': {
    tiktokVideos: [
      { url: 'https://www.tiktok.com/@nxstops/video/7614606160435449119', caption: 'Ololo Safari Lodge' },
    ],
  },
  'accra': ACCRA_MEDIA,
  'busan': {
    tiktokVideos: [
      { url: 'https://www.tiktok.com/@nxstops/video/7613888071532121374', caption: 'Hidden Gems of Busan' },
    ],
  },
  'sydney': {
    tiktokVideos: [
      { url: 'https://www.tiktok.com/@nxstops/video/7613514870322973983', caption: 'Sydney Opera House' },
    ],
  },
  'chicago': {
    tiktokVideos: [
      { url: 'https://www.tiktok.com/@nxstops/video/7609746218167651615', caption: 'Your night, curated' },
      { url: 'https://www.tiktok.com/@nxstops/video/7613141280733842718', caption: 'Crying Tiger' },
    ],
  },
  'kyoto': {
    tiktokVideos: [
      { url: 'https://www.tiktok.com/@nxstops/video/7612807420951219487', caption: 'K36 Rooftop Views' },
    ],
  },
  'atlanta': {
    tiktokVideos: [
      { url: 'https://www.tiktok.com/@nxstops/video/7612676643215248671', caption: 'Mercedes-Benz Stadium' },
    ],
  },
  'london': {
    tiktokVideos: [
      { url: 'https://www.tiktok.com/@nxstops/video/7611765664985926942', caption: 'Exploring London' },
    ],
  },
  'houston': {
    tiktokVideos: [
      { url: 'https://www.tiktok.com/@nxstops/video/7610972975491190047', caption: 'Toca Madera' },
    ],
  },
  'washington-dc': DC_MEDIA,
  'washington-d.c.': DC_MEDIA,
  'washington': DC_MEDIA,
};

// Default social links (shown when no city-specific content exists)
const DEFAULT_MEDIA: CityMedia = {
  tiktokUrl: 'https://www.tiktok.com/@nxstops',
  tiktokHandle: '@nxstops',
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
    const merged = { ...DEFAULT_MEDIA, ...citySpecific };
    // Auto-set tiktokUrl from first video if not explicitly set
    if (!merged.tiktokUrl && merged.tiktokVideos && merged.tiktokVideos.length > 0) {
      merged.tiktokUrl = merged.tiktokVideos[0].url;
    }
    return merged;
  }
  return DEFAULT_MEDIA;
}

/**
 * Check if a city has dedicated video content (not just social links)
 */
export function cityHasVideo(citySlug: string): boolean {
  const slug = citySlug.toLowerCase().replace(/\s+/g, '-');
  const media = CITY_MEDIA[slug];
  return !!(media?.heroVideoUrl);
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
  source: 'self' | 'tiktok' | 'youtube'; // Where it's hosted
  sourceUrl?: string;     // Original source URL (for attribution)
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
