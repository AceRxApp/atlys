// Vercel Serverless API Route — Open-Meteo Weather Proxy
// Proxies weather requests server-side to avoid CSP/CORS browser issues

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, checkRateLimit, getClientIp } from './_lib/cors.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const corsOk = setCorsHeaders(res, req.headers.origin as string | undefined, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!corsOk) return res.status(403).json({ error: 'Origin not allowed' });

  const clientIp = getClientIp(req.headers);
  if (!(await checkRateLimit(clientIp, 30, 60_000))) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weathercode&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max,sunset&timezone=auto&forecast_days=10&temperature_unit=fahrenheit`;
    const resp = await fetch(url);
    if (!resp.ok) {
      return res.status(resp.status).json({ error: 'Weather API error' });
    }
    const data = await resp.json();
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch weather' });
  }
}
