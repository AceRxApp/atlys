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
