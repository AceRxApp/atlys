// Vercel Serverless API Route — Currency Exchange Rate Proxy
// Proxies requests to open.er-api.com for full ISO 4217 currency support (160+ currencies)

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

  const { from } = req.query;
  if (!from || typeof from !== 'string') {
    return res.status(400).json({ error: 'from parameter required' });
  }

  const base = from.toUpperCase();

  try {
    // open.er-api.com returns ALL rates for a given base currency in one call
    const resp = await fetch(`https://open.er-api.com/v6/latest/${base}`);
    if (!resp.ok) {
      // Fallback to frankfurter for ECB-supported currencies
      const { to } = req.query;
      if (to) {
        const fallback = await fetch(`https://api.frankfurter.app/latest?from=${base}&to=${to}`);
        if (fallback.ok) {
          const data = await fallback.json();
          res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
          return res.status(200).json(data);
        }
      }
      return res.status(resp.status).json({ error: 'Currency API error' });
    }

    const data = await resp.json();

    if (data.result !== 'success') {
      return res.status(500).json({ error: 'Currency API returned error' });
    }

    // Normalize response to match our frontend expectations
    const response = {
      base: data.base_code,
      date: data.time_last_update_utc,
      rates: data.rates,
    };

    // Cache for 1 hour, stale for 2 more
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
    return res.status(200).json(response);
  } catch {
    return res.status(500).json({ error: 'Failed to fetch exchange rate' });
  }
}
