// Shared CORS + rate limiting utilities for all API routes

import type { VercelResponse } from '@vercel/node';

export const ALLOWED_ORIGINS = [
  'https://nxstops.com',
  'https://www.nxstops.com',
  'https://vynbynave.vercel.app',
  'https://nxstops-new.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
];

/**
 * Set CORS headers. Returns false if origin is not allowed (reject the request).
 */
export function setCorsHeaders(
  res: VercelResponse,
  origin: string | undefined,
  methods: string = 'GET, OPTIONS',
): boolean {
  const isAllowed = ALLOWED_ORIGINS.includes(origin || '');
  if (!isAllowed && origin) {
    res.setHeader('Vary', 'Origin');
    return false;
  }
  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin!);
  }
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
  return true;
}

// ---------------------------------------------------------------------------
// Upstash Redis rate limiter (lazy-loaded to avoid crash if package missing)
// ---------------------------------------------------------------------------

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

let redisInstance: unknown = null;
let redisInitialized = false;

async function getRedis(): Promise<unknown> {
  if (redisInitialized) return redisInstance;
  redisInitialized = true;
  if (!upstashUrl || !upstashToken) return null;
  try {
    const { Redis } = await import('@upstash/redis');
    redisInstance = new Redis({ url: upstashUrl, token: upstashToken });
    return redisInstance;
  } catch {
    console.warn('[NxStops] Upstash Redis not available, using in-memory rate limiting');
    return null;
  }
}

type RatelimitWindow = `${number} s` | `${number} m` | `${number} h`;

function formatWindow(ms: number): RatelimitWindow {
  if (ms >= 3_600_000 && ms % 3_600_000 === 0) return `${ms / 3_600_000} h`;
  if (ms >= 60_000 && ms % 60_000 === 0) return `${ms / 60_000} m`;
  return `${ms / 1_000} s`;
}

const ratelimitCache = new Map<string, unknown>();

async function getUpstashRatelimit(max: number, windowMs: number, redis: unknown): Promise<unknown> {
  const key = `${max}:${windowMs}`;
  let rl = ratelimitCache.get(key);
  if (!rl) {
    const { Ratelimit } = await import('@upstash/ratelimit');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rl = new Ratelimit({
      redis: redis as any,
      limiter: Ratelimit.slidingWindow(max, formatWindow(windowMs)),
      prefix: `nxstops:rl:${key}`,
    });
    ratelimitCache.set(key, rl);
  }
  return rl;
}

// ---------------------------------------------------------------------------
// In-memory fallback (dev/preview or when Upstash is not configured)
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

function checkRateLimitInMemory(ip: string, max: number, windowMs: number): boolean {
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

// ---------------------------------------------------------------------------
// Public API — async, with graceful fallback
// ---------------------------------------------------------------------------

export async function checkRateLimit(
  ip: string,
  max: number,
  windowMs: number,
): Promise<boolean> {
  try {
    const redis = await getRedis();
    if (redis) {
      const rl = await getUpstashRatelimit(max, windowMs, redis) as { limit: (id: string) => Promise<{ success: boolean }> };
      const { success } = await rl.limit(ip);
      return success;
    }
  } catch {
    // Fall through to in-memory
  }
  return checkRateLimitInMemory(ip, max, windowMs);
}

export function getClientIp(headers: Record<string, string | string[] | undefined>): string {
  const forwarded = headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim() || 'unknown';
  return 'unknown';
}
