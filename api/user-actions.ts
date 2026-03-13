// Vercel Serverless API Route — User Actions (account-delete + report + extract-link + api-keys)
// Combined to stay within Hobby plan serverless function limit

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders, checkRateLimit, getClientIp } from './_lib/cors.js';
import crypto from 'crypto';

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || '').trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim();
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const corsOk = setCorsHeaders(res, req.headers.origin as string | undefined, 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!corsOk) return res.status(403).json({ error: 'Origin not allowed' });

  const clientIp = getClientIp(req.headers);

  const action = req.query.action as string;

  // extract-link uses GET with its own rate limit
  if (action === 'extract-link') {
    if (!(await checkRateLimit(clientIp, 20, 60_000))) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    return handleExtractLink(req, res);
  }

  // video actions use GET (public reads) and POST (admin writes)
  if (action === 'get-video') return handleGetVideo(req, res);
  if (action === 'get-city-videos') return handleGetCityVideos(req, res);
  if (action === 'upsert-video' && req.method === 'POST') return handleUpsertVideo(req, res);

  // API key management actions
  if (action === 'register-api-key' && req.method === 'POST') return handleRegisterApiKey(req, res);
  if (action === 'check-api-key') return handleCheckApiKey(req, res);
  if (action === 'list-api-keys') return handleListApiKeys(req, res);
  if (action === 'approve-api-key' && req.method === 'POST') return handleApproveApiKey(req, res);
  if (action === 'revoke-api-key' && req.method === 'POST') return handleRevokeApiKey(req, res);
  if (action === 'update-api-tier' && req.method === 'POST') return handleUpdateApiTier(req, res);

  // All other actions require POST
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await checkRateLimit(clientIp, 10, 60_000))) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  if (action === 'delete-account') return handleDeleteAccount(req, res);
  if (action === 'report') return handleReport(req, res);
  return res.status(400).json({ error: 'Invalid action' });
}

// =========================================================================
// Account Deletion
// =========================================================================
async function handleDeleteAccount(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }
  const token = authHeader.slice(7);

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const userId = user.id;

    // Delete all user data in order (respecting foreign key constraints)
    const tables = [
      { table: 'reviews', column: 'user_id' },
      { table: 'place_tags', column: 'user_id' },
      { table: 'saved_places', column: 'user_id' },
      { table: 'crew_trips', column: 'created_by' },
      { table: 'subscriptions', column: 'user_id' },
    ];

    for (const { table, column } of tables) {
      const { error } = await supabase.from(table).delete().eq(column, userId);
      if (error) {
        console.error(`Error deleting ${table}:`, error);
        // Continue anyway — some tables might not exist
      }
    }

    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      console.error('Error deleting auth user:', deleteUserError);
      return res.status(500).json({ error: 'Failed to delete user account' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Account deletion error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// =========================================================================
// Content Report
// =========================================================================
async function handleReport(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = authHeader.slice(7);

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { content_type, content_id, reason, details } = req.body || {};

    if (!content_type || !content_id || !reason) {
      return res.status(400).json({ error: 'content_type, content_id, and reason are required' });
    }

    const validTypes = ['review', 'place_tag', 'place'];
    const validReasons = ['spam', 'inappropriate', 'harassment', 'misinformation', 'other'];

    if (!validTypes.includes(content_type)) {
      return res.status(400).json({ error: `content_type must be one of: ${validTypes.join(', ')}` });
    }
    if (!validReasons.includes(reason)) {
      return res.status(400).json({ error: `reason must be one of: ${validReasons.join(', ')}` });
    }

    const { error: insertError } = await supabase.from('reports').insert({
      reporter_id: user.id,
      content_type,
      content_id: String(content_id),
      reason,
      details: details ? String(details).slice(0, 500) : null,
      status: 'pending',
    });

    if (insertError) {
      console.error('Report insert error:', insertError);
      return res.status(500).json({ error: 'Failed to submit report' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Report API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// =========================================================================
// Link Metadata Extraction
// Fetches a URL server-side and extracts OG tags, JSON-LD, with Gemini AI fallback
// =========================================================================

interface ExtractedData {
  name: string;
  date: string;
  time: string;
  venue: string;
  venueAddress: string;
  imageUrl: string | null;
  url: string;
  category: string;
  lat: number | null;
  lng: number | null;
  partial: boolean;
}

const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function handleExtractLink(req: VercelRequest, res: VercelResponse) {
  const rawUrl = req.query.url as string | undefined;
  if (!rawUrl) return res.status(400).json({ error: 'url parameter is required' });

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    // Instagram/TikTok: Use oEmbed API (bypasses login walls)
    if (url.hostname.includes('instagram.com') || url.hostname.includes('tiktok.com')) {
      const oembedResult = await tryOembed(rawUrl, url.hostname);
      if (oembedResult) return res.status(200).json(oembedResult);
    }

    // Step 1: Fetch the page HTML
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    let html = '';
    try {
      const resp = await fetch(url.toString(), {
        headers: {
          'User-Agent': BROWSER_UA,
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      html = await resp.text();
    } catch {
      clearTimeout(timeout);
      return res.status(422).json({ error: 'Could not fetch URL' });
    }

    // Step 2: Extract OG tags
    const og = extractOgTags(html);

    // Step 3: Extract JSON-LD structured data
    const jsonLd = extractJsonLd(html);

    // Step 4: Check for source links (Pinterest, link-in-bio, etc.)
    let sourceData: Partial<ExtractedData> = {};
    const sourceUrl = detectSourceLink(html, url.hostname);
    if (sourceUrl && (!og.title || !jsonLd.date)) {
      sourceData = await fetchSourceLink(sourceUrl);
    }

    // Step 5: Merge all data sources (priority: JSON-LD > source link > OG tags)
    const merged: ExtractedData = {
      name: jsonLd.name || sourceData.name || og.title || '',
      date: jsonLd.date || sourceData.date || og.date || '',
      time: jsonLd.time || sourceData.time || og.time || 'TBD',
      venue: jsonLd.venue || sourceData.venue || og.siteName || '',
      venueAddress: jsonLd.venueAddress || sourceData.venueAddress || '',
      imageUrl: og.image || sourceData.imageUrl || jsonLd.imageUrl || null,
      url: rawUrl,
      category: jsonLd.category || sourceData.category || classifyUrl(url.hostname, og.type) || 'Event',
      lat: jsonLd.lat ?? sourceData.lat ?? null,
      lng: jsonLd.lng ?? sourceData.lng ?? null,
      partial: false,
    };

    // Step 6: AI fallback for missing fields
    if (GEMINI_API_KEY && (!merged.name || !merged.date)) {
      const aiData = await aiExtract(html, rawUrl);
      if (aiData) {
        if (!merged.name && aiData.name) merged.name = aiData.name;
        if (!merged.date && aiData.date) merged.date = aiData.date;
        if (merged.time === 'TBD' && aiData.time) merged.time = aiData.time;
        if (!merged.venue && aiData.venue) merged.venue = aiData.venue;
        if (!merged.venueAddress && aiData.address) merged.venueAddress = aiData.address;
        if (!merged.category || merged.category === 'Event') {
          merged.category = aiData.category || merged.category;
        }
      }
    }

    // If we couldn't get even a name, fail
    if (!merged.name) {
      return res.status(422).json({ error: 'Could not extract details from this link' });
    }

    // Mark as partial if key fields are missing
    merged.partial = !merged.date || merged.time === 'TBD';

    return res.status(200).json(merged);
  } catch (error) {
    console.error('extract-link error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// --- OG tag extraction ---

function extractOgTags(html: string): {
  title: string; description: string; image: string; type: string;
  date: string; time: string; siteName: string;
} {
  const get = (property: string): string => {
    const patterns = [
      new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'),
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m?.[1]) return m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&#x27;/g, "'");
    }
    return '';
  };

  const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || '';
  const startTime = get('event:start_time') || get('article:published_time');
  let date = '';
  let time = '';
  if (startTime) {
    const dt = new Date(startTime);
    if (!isNaN(dt.getTime())) {
      date = dt.toISOString().split('T')[0];
      time = dt.toISOString().split('T')[1]?.slice(0, 5) || '';
    }
  }

  return {
    title: get('og:title') || titleTag,
    description: get('og:description'),
    image: get('og:image'),
    type: get('og:type'),
    date,
    time,
    siteName: get('og:site_name'),
  };
}

// --- JSON-LD extraction ---

function extractJsonLd(html: string): {
  name: string; date: string; time: string; venue: string;
  venueAddress: string; category: string; imageUrl: string | null;
  lat: number | null; lng: number | null;
} {
  const empty = { name: '', date: '', time: '', venue: '', venueAddress: '', category: '', imageUrl: null, lat: null, lng: null };
  const scripts = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (!scripts) return empty;

  for (const script of scripts) {
    const content = script.replace(/<\/?script[^>]*>/gi, '').trim();
    try {
      const data = JSON.parse(content);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const type = (item['@type'] || '').toLowerCase();
        if (['event', 'musicevent', 'socialevent', 'businessevent', 'foodestablishment',
             'restaurant', 'barorgrill', 'cafeorcoffeeshop', 'place'].includes(type)) {
          const startDate = item.startDate || '';
          let date = '';
          let time = '';
          if (startDate) {
            const dt = new Date(startDate);
            if (!isNaN(dt.getTime())) {
              date = dt.toISOString().split('T')[0];
              time = dt.toISOString().split('T')[1]?.slice(0, 5) || '';
            }
          }
          const location = item.location || {};
          const address = location.address || {};
          return {
            name: item.name || '',
            date,
            time,
            venue: location.name || '',
            venueAddress: typeof address === 'string' ? address
              : [address.streetAddress, address.addressLocality, address.addressRegion].filter(Boolean).join(', '),
            category: type.includes('restaurant') || type.includes('bar') || type.includes('cafe')
              ? 'Restaurant' : type.includes('music') ? 'Concert' : 'Event',
            imageUrl: typeof item.image === 'string' ? item.image : item.image?.url || null,
            lat: location.geo?.latitude ? parseFloat(location.geo.latitude) : null,
            lng: location.geo?.longitude ? parseFloat(location.geo.longitude) : null,
          };
        }
      }
    } catch { /* invalid JSON-LD */ }
  }
  return empty;
}

// --- Source link detection (Pinterest, Instagram, TikTok) ---

function detectSourceLink(html: string, hostname: string): string | null {
  if (hostname.includes('pinterest')) {
    const m = html.match(/data-pin-url=["']([^"']+)["']/i) || html.match(/"link":\s*"(https?:\/\/[^"]+)"/);
    if (m?.[1]) return m[1];
  }
  if (hostname.includes('instagram') || hostname.includes('tiktok')) {
    const linkTreeMatch = html.match(/https?:\/\/linktr\.ee\/[^\s"'<]+/i);
    if (linkTreeMatch) return linkTreeMatch[0];
    const externalUrl = html.match(/"external_url":\s*"(https?:\/\/[^"]+)"/);
    if (externalUrl?.[1]) return externalUrl[1];
  }
  return null;
}

async function fetchSourceLink(sourceUrl: string): Promise<Partial<ExtractedData>> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    const resp = await fetch(sourceUrl, {
      headers: { 'User-Agent': BROWSER_UA, 'Accept': 'text/html' },
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const html = await resp.text();
    const og = extractOgTags(html);
    const jsonLd = extractJsonLd(html);
    return {
      name: jsonLd.name || og.title,
      date: jsonLd.date || og.date,
      time: jsonLd.time || og.time,
      venue: jsonLd.venue || og.siteName,
      venueAddress: jsonLd.venueAddress,
      imageUrl: og.image || jsonLd.imageUrl,
      category: jsonLd.category || classifyUrl(new URL(sourceUrl).hostname, og.type),
      lat: jsonLd.lat,
      lng: jsonLd.lng,
    };
  } catch {
    return {};
  }
}

// --- oEmbed for Instagram/TikTok ---

async function tryOembed(rawUrl: string, hostname: string): Promise<ExtractedData | null> {
  try {
    let oembedUrl = '';
    if (hostname.includes('instagram.com')) {
      oembedUrl = `https://api.instagram.com/oembed?url=${encodeURIComponent(rawUrl)}&maxwidth=500`;
    } else if (hostname.includes('tiktok.com')) {
      oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(rawUrl)}`;
    }
    if (!oembedUrl) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    const resp = await fetch(oembedUrl, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) return null;
    const data = await resp.json();

    const title = data.title || '';
    const author = data.author_name || '';
    const thumb = data.thumbnail_url || '';
    const name = title || (author ? `Post by @${author}` : '');

    if (!name) return null;

    return {
      name,
      date: '',
      time: 'TBD',
      venue: '',
      venueAddress: '',
      imageUrl: thumb || null,
      url: rawUrl,
      category: 'Activity',
      lat: null,
      lng: null,
      partial: true,
    };
  } catch {
    return null;
  }
}

// --- URL classification ---

function classifyUrl(hostname: string, ogType?: string): string {
  if (ogType?.includes('restaurant')) return 'Restaurant';
  if (hostname.includes('eventbrite')) return 'Event';
  if (hostname.includes('lu.ma') || hostname.includes('luma')) return 'Event';
  if (hostname.includes('meetup')) return 'Event';
  if (hostname.includes('ticketmaster') || hostname.includes('seatgeek')) return 'Event';
  if (hostname.includes('opentable') || hostname.includes('resy') || hostname.includes('yelp')) return 'Restaurant';
  if (hostname.includes('facebook') && hostname.includes('event')) return 'Event';
  if (hostname.includes('instagram')) return 'Activity';
  if (hostname.includes('tiktok')) return 'Activity';
  if (hostname.includes('pinterest')) return 'Activity';
  return 'Event';
}

// --- Gemini AI fallback ---

async function aiExtract(html: string, url: string): Promise<{
  name?: string; date?: string; time?: string; venue?: string;
  address?: string; category?: string;
} | null> {
  if (!GEMINI_API_KEY) return null;

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 3000);

  if (text.length < 30) return null;

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Extract event/place details from this webpage text. URL: ${url}\n\nText:\n${text}\n\nReturn ONLY valid JSON (no markdown, no backticks):\n{"name": "event or place name", "date": "YYYY-MM-DD or empty", "time": "HH:MM or empty", "venue": "venue name or empty", "address": "full address or empty", "category": "Event|Restaurant|Pop-up|Concert|Activity"}\n\nIf you can't determine a field, use an empty string. Return only the JSON object.`,
            }],
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 200 },
        }),
      },
    );

    if (!resp.ok) return null;
    const data = await resp.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonStr = raw.replace(/```json?\s*\n?/g, '').replace(/```\s*$/g, '').trim();
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

// =========================================================================
// Video Clips — place-level video management
// =========================================================================

const ADMIN_SECRET = process.env.ADMIN_SECRET || '';

async function handleGetVideo(req: VercelRequest, res: VercelResponse) {
  const placeId = req.query.placeId as string;
  if (!placeId) return res.status(400).json({ error: 'placeId required' });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return res.status(200).json({ video: null });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase
    .from('place_videos')
    .select('*')
    .eq('place_id', placeId)
    .limit(1)
    .maybeSingle();
  if (error) { console.error('[Videos] get error:', error); return res.status(500).json({ error: 'DB error' }); }
  return res.status(200).json({ video: data || null });
}

async function handleGetCityVideos(req: VercelRequest, res: VercelResponse) {
  const city = req.query.city as string;
  if (!city) return res.status(400).json({ error: 'city required' });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return res.status(200).json({ videos: [] });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase
    .from('place_videos')
    .select('*')
    .ilike('city', city)
    .order('created_at', { ascending: false });
  if (error) { console.error('[Videos] city error:', error); return res.status(500).json({ error: 'DB error' }); }
  return res.status(200).json({ videos: data || [] });
}

async function handleUpsertVideo(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  if (!ADMIN_SECRET || authHeader !== `Bearer ${ADMIN_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const { place_id, place_name, city, video_url, thumbnail_url, duration, caption, source, source_url } = req.body;
  if (!place_id || !video_url || !city) {
    return res.status(400).json({ error: 'place_id, video_url, and city are required' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase
    .from('place_videos')
    .upsert({
      place_id,
      place_name: place_name || '',
      city,
      video_url,
      thumbnail_url: thumbnail_url || null,
      duration: duration || 0,
      caption: caption || null,
      source: source || 'self',
      source_url: source_url || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'place_id' })
    .select()
    .single();

  if (error) { console.error('[Videos] upsert error:', error); return res.status(500).json({ error: 'DB error' }); }
  return res.status(200).json({ video: data });
}

// =========================================================================
// API Key Management
// =========================================================================

const TIER_LIMITS: Record<string, number> = {
  free: 100,
  basic: 5000,
  pro: 50000,
};

/** Verify admin via Supabase auth token */
async function verifyAdmin(token: string): Promise<boolean> {
  if (!ADMIN_EMAIL) return false;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return false;
  return user.email === ADMIN_EMAIL;
}

/** Generate a prefixed API key: nxs_live_... */
function generateApiKey(): string {
  return `nxs_live_${crypto.randomBytes(24).toString('hex')}`;
}

// ── Register: Developer requests a new API key ──────────────────────────

async function handleRegisterApiKey(req: VercelRequest, res: VercelResponse) {
  const clientIp = getClientIp(req.headers);
  if (!(await checkRateLimit(clientIp, 5, 60_000))) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const { email, name, app_name, app_description } = req.body || {};
  if (!email || !app_name) {
    return res.status(400).json({ error: 'email and app_name are required' });
  }

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Check if developer already has a key
  const { data: existing } = await supabase
    .from('api_keys')
    .select('id, status, key')
    .eq('developer_email', email)
    .limit(1)
    .maybeSingle();

  if (existing) {
    if (existing.status === 'revoked') {
      return res.status(403).json({ error: 'Your access has been revoked. Contact support for assistance.' });
    }
    return res.status(409).json({
      error: 'An API key already exists for this email',
      status: existing.status,
      hint: existing.status === 'pending'
        ? 'Your application is being reviewed. You will receive an email when approved.'
        : 'Use the check-api-key endpoint to view your key details.',
    });
  }

  const apiKey = generateApiKey();

  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      key: apiKey,
      developer_email: email,
      developer_name: name || null,
      app_name,
      app_description: app_description ? String(app_description).slice(0, 500) : null,
      status: 'pending',
      tier: 'free',
      monthly_limit: TIER_LIMITS.free,
    })
    .select('id, status, tier, monthly_limit, created_at')
    .single();

  if (error) {
    console.error('[API Keys] register error:', error);
    return res.status(500).json({ error: 'Failed to register API key' });
  }

  return res.status(201).json({
    message: 'API key registered! Your application is pending admin approval.',
    key_preview: `${apiKey.slice(0, 12)}...${apiKey.slice(-4)}`,
    ...data,
  });
}

// ── Check: Developer checks their key status and usage ──────────────────

async function handleCheckApiKey(req: VercelRequest, res: VercelResponse) {
  const apiKey = (req.query.key as string) || (req.headers['x-api-key'] as string);
  if (!apiKey) {
    return res.status(400).json({ error: 'key parameter or X-API-Key header required' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, developer_email, app_name, status, tier, monthly_limit, monthly_usage, usage_reset_at, created_at, approved_at, last_used_at')
    .eq('key', apiKey)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return res.status(404).json({ error: 'API key not found' });
  }

  return res.status(200).json(data);
}

// ── Admin: List all API keys ────────────────────────────────────────────

async function handleListApiKeys(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required' });
  }
  if (!(await verifyAdmin(authHeader.slice(7)))) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const status = req.query.status as string | undefined;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let query = supabase
    .from('api_keys')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[API Keys] list error:', error);
    return res.status(500).json({ error: 'Failed to fetch API keys' });
  }

  // Mask keys for security — only show prefix and last 4
  const masked = (data || []).map((k: Record<string, unknown>) => ({
    ...k,
    key: `${String(k.key).slice(0, 12)}...${String(k.key).slice(-4)}`,
  }));

  return res.status(200).json({ keys: masked });
}

// ── Admin: Approve a pending API key ────────────────────────────────────

async function handleApproveApiKey(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required' });
  }
  if (!(await verifyAdmin(authHeader.slice(7)))) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { key_id } = req.body || {};
  if (!key_id) return res.status(400).json({ error: 'key_id is required' });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase
    .from('api_keys')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
    })
    .eq('id', key_id)
    .eq('status', 'pending')
    .select('id, developer_email, app_name, status, key')
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Pending key not found' });
  }

  return res.status(200).json({
    message: 'API key approved',
    id: data.id,
    developer_email: data.developer_email,
    app_name: data.app_name,
  });
}

// ── Admin: Revoke an API key ────────────────────────────────────────────

async function handleRevokeApiKey(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required' });
  }
  if (!(await verifyAdmin(authHeader.slice(7)))) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { key_id } = req.body || {};
  if (!key_id) return res.status(400).json({ error: 'key_id is required' });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase
    .from('api_keys')
    .update({ status: 'revoked' })
    .eq('id', key_id)
    .select('id, developer_email, app_name, status')
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'API key not found' });
  }

  return res.status(200).json({ message: 'API key revoked', ...data });
}

// ── Admin: Update API key tier (after Stripe payment or manually) ───────

async function handleUpdateApiTier(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required' });
  }
  if (!(await verifyAdmin(authHeader.slice(7)))) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { key_id, tier, stripe_customer_id, stripe_subscription_id } = req.body || {};
  if (!key_id || !tier) return res.status(400).json({ error: 'key_id and tier are required' });

  if (!TIER_LIMITS[tier as string]) {
    return res.status(400).json({ error: 'tier must be free, basic, or pro' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const updateData: Record<string, unknown> = {
    tier,
    monthly_limit: TIER_LIMITS[tier as string],
  };
  if (stripe_customer_id) updateData.stripe_customer_id = stripe_customer_id;
  if (stripe_subscription_id) updateData.stripe_subscription_id = stripe_subscription_id;

  const { data, error } = await supabase
    .from('api_keys')
    .update(updateData)
    .eq('id', key_id)
    .select('id, developer_email, tier, monthly_limit')
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'API key not found' });
  }

  return res.status(200).json({ message: `Tier updated to ${tier}`, ...data });
}
