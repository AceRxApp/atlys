// Shared CORS + rate limiting utilities for all API routes

import type { VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

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
// Upstash Redis rate limiter (persistent across cold starts)
// ---------------------------------------------------------------------------

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

let redis: Redis | null = null;
if (upstashUrl && upstashToken) {
  redis = new Redis({ url: upstashUrl, token: upstashToken });
}

function formatWindow(ms: number): `${number} s` | `${number} m` | `${number} h` {
  if (ms >= 3_600_000 && ms % 3_600_000 === 0) return `${ms / 3_600_000} h`;
  if (ms >= 60_000 && ms % 60_000 === 0) return `${ms / 60_000} m`;
  return `${ms / 1_000} s`;
}

const ratelimitCache = new Map<string, Ratelimit>();

function getUpstashRatelimit(max: number, windowMs: number): Ratelimit {
  const key = `${max}:${windowMs}`;
  let rl = ratelimitCache.get(key);
  if (!rl && redis) {
    rl = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(max, formatWindow(windowMs)),
      prefix: `nxstops:rl:${key}`,
    });
    ratelimitCache.set(key, rl);
  }
  return rl!;
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
  if (redis) {
    try {
      const rl = getUpstashRatelimit(max, windowMs);
      const { success } = await rl.limit(ip);
      return success;
    } catch {
      return checkRateLimitInMemory(ip, max, windowMs);
    }
  }
  return checkRateLimitInMemory(ip, max, windowMs);
}

export function getClientIp(headers: Record<string, string | string[] | undefined>): string {
  const forwarded = headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim() || 'unknown';
  return 'unknown';
}
