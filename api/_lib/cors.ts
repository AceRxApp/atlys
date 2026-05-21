// Shared CORS + rate limiting + API key utilities for all API routes
// NOTE: No imports here — @vercel/node in devDeps causes FUNCTION_INVOCATION_FAILED

interface ServerResponse {
  setHeader(name: string, value: string): void;
}

export const ALLOWED_ORIGINS = [
  'https://nxstops.com',
  'https://www.nxstops.com',
  'http://localhost:5173',
  'http://localhost:4173',
];

/** Check if origin is from a Capacitor native app (any scheme://localhost or null) */
function isNativeAppOrigin(origin: string): boolean {
  // Capacitor WKWebView with custom schemes may send "null" as origin
  if (origin === 'null') return true;
  try {
    const url = new URL(origin);
    return url.hostname === 'localhost';
  } catch {
    return false;
  }
}

/**
 * Set CORS headers. Returns false if origin is not allowed (reject the request).
 */
export function setCorsHeaders(
  res: ServerResponse,
  origin: string | undefined,
  methods: string = 'GET, OPTIONS',
): boolean {
  const isAllowed = !origin || ALLOWED_ORIGINS.includes(origin) || isNativeAppOrigin(origin);
  if (!isAllowed) {
    res.setHeader('Vary', 'Origin');
    return false;
  }
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  res.setHeader('Vary', 'Origin');
  return true;
}

// ---------------------------------------------------------------------------
// API Key validation for third-party developers
// ---------------------------------------------------------------------------

export interface ApiKeyInfo {
  id: string;
  tier: 'free' | 'basic' | 'pro';
  monthlyLimit: number;
  monthlyUsage: number;
}

/**
 * Validate an API key from X-API-Key header. If valid, sets CORS headers
 * to allow the request from any origin.
 * Returns key info if valid, null if no key or invalid.
 */
export async function validateApiKey(
  headers: Record<string, string | string[] | undefined>,
  res: ServerResponse,
  endpoint: string,
): Promise<ApiKeyInfo | null> {
  const apiKey = headers['x-api-key'];
  if (!apiKey || typeof apiKey !== 'string') return null;

  const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!supabaseUrl || !serviceKey) return null;

  try {
    // Look up the key via REST API (no import needed)
    const resp = await fetch(
      `${supabaseUrl}/rest/v1/api_keys?key=eq.${encodeURIComponent(apiKey)}&select=id,status,tier,monthly_limit,monthly_usage,usage_reset_at,allowed_origins&limit=1`,
      {
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
      },
    );
    if (!resp.ok) return null;
    const rows = await resp.json();
    if (!rows || rows.length === 0) return null;

    const row = rows[0];
    if (row.status !== 'approved') return null;

    // Enforce per-key origin binding. NULL/empty = unrestricted (legacy keys);
    // non-empty array requires the request Origin to match exactly. A leaked
    // key cannot be replayed from an attacker-hosted page once the owner sets
    // allowed_origins for the key.
    const callerOrigin = headers['origin'];
    if (Array.isArray(row.allowed_origins) && row.allowed_origins.length > 0) {
      const originStr = typeof callerOrigin === 'string' ? callerOrigin : '';
      if (!originStr || !row.allowed_origins.includes(originStr)) return null;
    }

    // Auto-reset usage if past the reset date
    const resetAt = new Date(row.usage_reset_at);
    let usage = row.monthly_usage;
    if (resetAt <= new Date()) {
      usage = 0;
      // Reset in background — don't block the request
      fetch(
        `${supabaseUrl}/rest/v1/api_keys?id=eq.${row.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            monthly_usage: 1,
            usage_reset_at: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
            last_used_at: new Date().toISOString(),
          }),
        },
      ).catch(() => {});
    } else {
      // Check limit
      if (usage >= row.monthly_limit) return null;
      // Increment usage in background
      fetch(
        `${supabaseUrl}/rest/v1/api_keys?id=eq.${row.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            monthly_usage: usage + 1,
            last_used_at: new Date().toISOString(),
          }),
        },
      ).catch(() => {});
    }

    // Log usage in background
    fetch(
      `${supabaseUrl}/rest/v1/api_key_usage_log`,
      {
        method: 'POST',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ api_key_id: row.id, endpoint }),
      },
    ).catch(() => {});

    // Allow CORS from any origin for API key holders
    const origin = headers['origin'];
    if (origin && typeof origin === 'string') {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
      res.setHeader('Vary', 'Origin');
    }

    return {
      id: row.id,
      tier: row.tier,
      monthlyLimit: row.monthly_limit,
      monthlyUsage: usage + 1,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Rate limiting (Upstash Redis when available, in-memory fallback)
// ---------------------------------------------------------------------------
//
// Why Upstash: Vercel serverless functions run in isolated instances per
// region — an in-memory Map cannot enforce a global rate limit because each
// cold start gets a fresh Map and each region has its own pool. Upstash gives
// us a single shared counter, so an attacker rotating IPs or regions cannot
// bypass the limit by force.

const UPSTASH_URL = (process.env.UPSTASH_REDIS_REST_URL || '').trim();
const UPSTASH_TOKEN = (process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();
const UPSTASH_ENABLED = !!(UPSTASH_URL && UPSTASH_TOKEN);

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
let lastCleanup = Date.now();
function cleanupStaleEntries() {
  const now = Date.now();
  if (now - lastCleanup < 30_000) return;
  lastCleanup = now;
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}

async function upstashIncrWithExpire(key: string, windowSec: number): Promise<number | null> {
  try {
    // Pipeline: INCR key  +  EXPIRE key windowSec NX (only set TTL on first hit)
    const resp = await fetch(`${UPSTASH_URL}/pipeline`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, windowSec.toString(), 'NX'],
      ]),
    });
    if (!resp.ok) return null;
    const out = await resp.json();
    const count = Array.isArray(out) && out[0] && typeof out[0].result === 'number' ? out[0].result : null;
    return count;
  } catch {
    return null;
  }
}

/**
 * Check whether the caller is within the rate-limit window.
 * Returns true if allowed, false if over the limit.
 * Uses Upstash Redis when configured (global, cold-start-safe), otherwise
 * falls back to an in-memory Map (per-instance, dev only).
 */
export async function checkRateLimit(
  identifier: string,
  max: number,
  windowMs: number,
): Promise<boolean> {
  if (UPSTASH_ENABLED) {
    const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
    const bucket = Math.floor(Date.now() / windowMs);
    const key = `rl:${identifier}:${bucket}`;
    const count = await upstashIncrWithExpire(key, windowSec + 1);
    // If Upstash fails, fail open (allow) — better than locking out all users
    // during a Redis outage. The in-memory fallback below would also accept.
    if (count === null) return true;
    return count <= max;
  }

  cleanupStaleEntries();
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

export function getClientIp(headers: Record<string, string | string[] | undefined>): string {
  const forwarded = headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim() || 'unknown';
  return 'unknown';
}

// ---------------------------------------------------------------------------
// Supabase JWT verification (for first-party app callers)
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  email: string | null;
}

/**
 * Verify a Supabase access token from the Authorization header.
 * Returns the user record if the token is valid, or null otherwise.
 *
 * Uses Supabase's /auth/v1/user REST endpoint with the user's bearer token,
 * which validates the JWT signature against the project's secret server-side.
 */
export async function verifySupabaseToken(
  headers: Record<string, string | string[] | undefined>,
): Promise<AuthUser | null> {
  const authHeader = headers['authorization'];
  if (!authHeader || typeof authHeader !== 'string') return null;
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;

  const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
  const anonKey = (process.env.SUPABASE_ANON_KEY || '').trim();
  if (!supabaseUrl || !anonKey) return null;

  try {
    const resp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!resp.ok) return null;
    const user = await resp.json();
    if (!user || !user.id) return null;
    return { id: user.id, email: user.email ?? null };
  } catch {
    return null;
  }
}
