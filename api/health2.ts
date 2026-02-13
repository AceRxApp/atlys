// Test endpoint that imports from _cors to isolate the crash
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, getClientIp } from './_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res, req.headers.origin as string | undefined, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const ip = getClientIp(req.headers);
  res.status(200).json({ ok: true, ip, time: new Date().toISOString() });
}
