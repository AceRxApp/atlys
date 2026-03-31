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
      `${supabaseUrl}/rest/v1/api_keys?key=eq.${encodeURIComponent(apiKey)}&select=id,status,tier,monthly_limit,monthly_usage,usage_reset_at&limit=1`,
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
// In-memory rate limiting
// ---------------------------------------------------------------------------

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

export async function checkRateLimit(
  ip: string,
  max: number,
  windowMs: number,
): Promise<boolean> {
  cleanupStaleEntries();
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
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
