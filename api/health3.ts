// Test endpoint with inline cors (no _cors import) to isolate the issue
import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED_ORIGINS = ['https://nxstops.com', 'http://localhost:5173'];

function setCors(res: VercelResponse, origin: string | undefined) {
  if (ALLOWED_ORIGINS.includes(origin || '')) {
    res.setHeader('Access-Control-Allow-Origin', origin!);
  }
  res.setHeader('Vary', 'Origin');
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res, req.headers.origin as string | undefined);
  res.status(200).json({ ok: true, time: new Date().toISOString() });
}
