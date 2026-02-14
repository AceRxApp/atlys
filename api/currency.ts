// Vercel Serverless API Route — Currency Exchange Rate Proxy
// Proxies requests to frankfurter.app to avoid CSP browser blocks

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIp } from './_lib/cors.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const corsOk = setCorsHeaders(res, req.headers.origin as string | undefined, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!corsOk) return res.status(403).json({ error: 'Origin not allowed' });

  const clientIp = getClientIp(req.headers);
  if (!(await checkRateLimit(clientIp, 20, 60_000))) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from and to required' });

  try {
    const resp = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
    if (!resp.ok) return res.status(resp.status).json({ error: 'Currency API error' });
    const data = await resp.json();
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
    return res.status(200).json(data);
  } catch {
    return res.status(500).json({ error: 'Failed to fetch exchange rate' });
  }
}
