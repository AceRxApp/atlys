// Shared CORS + rate limiting utilities for all API routes
// NOTE: No imports here — @vercel/node in devDeps causes FUNCTION_INVOCATION_FAILED

interface ServerResponse {
  setHeader(name: string, value: string): void;
}

export const ALLOWED_ORIGINS = [
  'https://nxstops.com',
  'https://www.nxstops.com',
  'https://vynbynave.vercel.app',
  'https://nxstops-new.vercel.app',
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
