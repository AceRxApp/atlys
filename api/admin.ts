// Vercel Serverless API Route — Admin Verification
// Checks if the requesting user is an admin (server-side, email never exposed to client)

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';

const ALLOWED_ORIGINS = [
  'https://nxstops.com',
  'https://www.nxstops.com',
  'https://vynbynave.vercel.app',
  'https://nxstops-new.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
];

function getCorsHeaders(origin?: string) {
  const isAllowed = ALLOWED_ORIGINS.includes(origin || '');
  const allowedOrigin = isAllowed ? origin! : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const corsHeaders = getCorsHeaders(req.headers.origin as string);
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(200).json({ isAdmin: false });
  }

  const token = authHeader.slice(7);

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(200).json({ isAdmin: false });
    }

    const isAdmin = user.email === ADMIN_EMAIL;
    return res.status(200).json({ isAdmin });
  } catch {
    return res.status(200).json({ isAdmin: false });
  }
}
