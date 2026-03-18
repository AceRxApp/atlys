// Vercel Serverless API Route — Admin Data (signups, users, health checks)
// Uses service role key to bypass RLS — admin-only access verified via ADMIN_EMAIL

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders, checkRateLimit, getClientIp } from './_lib/cors.js';

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || '').trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim();

/** Verify the request is from an admin user */
async function verifyAdmin(token: string): Promise<boolean> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return false;
  return user.email === ADMIN_EMAIL;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const corsOk = setCorsHeaders(res, req.headers.origin as string | undefined, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!corsOk) return res.status(403).json({ error: 'Origin not allowed' });

  const clientIp = getClientIp(req.headers);
  if (!(await checkRateLimit(clientIp, 20, 60_000))) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Auth check
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    // For verify requests, return isAdmin: false instead of 401
    const section = (req.query.section as string) || 'all';
    if (section === 'verify') return res.status(200).json({ isAdmin: false });
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.slice(7);
  const isAdmin = await verifyAdmin(token);

  // Lightweight admin verification — replaces the old /api/admin endpoint
  const section0 = (req.query.section as string) || 'all';
  if (section0 === 'verify') return res.status(200).json({ isAdmin });

  if (!isAdmin) return res.status(403).json({ error: 'Not an admin' });

  // Service role client — bypasses RLS
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const section = (req.query.section as string) || 'all';

  try {
    const result: Record<string, unknown> = {};

    // Email signups — from email_signups table
    if (section === 'all' || section === 'signups') {
      const { data: signups, error: signupsErr } = await admin
        .from('email_signups')
        .select('*')
        .order('signed_up_at', { ascending: false });

      result.signups = signupsErr ? [] : (signups || []);
      if (signupsErr) result.signupsError = signupsErr.message;
    }

    // Registered auth users — from auth.users via admin API
    if (section === 'all' || section === 'users') {
      const { data: usersData, error: usersErr } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 100,
      });

      if (usersErr) {
        result.users = [];
        result.usersError = usersErr.message;
      } else {
        // Only send safe fields (no tokens/secrets)
        result.users = (usersData?.users || []).map(u => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          confirmed_at: u.confirmed_at,
          user_metadata: u.user_metadata,
        }));
      }
    }

    // Health check — test Supabase connectivity + key tables
    if (section === 'all' || section === 'health') {
      const checks: { name: string; status: 'ok' | 'error'; detail?: string; ms?: number }[] = [];

      // Check cities table
      const t0 = Date.now();
      const { error: citiesErr } = await admin.from('cities').select('id').limit(1);
      checks.push({
        name: 'Supabase (cities)',
        status: citiesErr ? 'error' : 'ok',
        detail: citiesErr?.message,
        ms: Date.now() - t0,
      });

      // Check email_signups table
      const t1 = Date.now();
      const { data: signupCount, error: signupErr } = await admin
        .from('email_signups')
        .select('id', { count: 'exact', head: true });
      checks.push({
        name: 'Supabase (email_signups)',
        status: signupErr ? 'error' : 'ok',
        detail: signupErr?.message || `${signupCount?.length ?? 0} rows`,
        ms: Date.now() - t1,
      });

      // Check saved_places table
      const t2 = Date.now();
      const { error: savedErr } = await admin.from('saved_places').select('place_id').limit(1);
      checks.push({
        name: 'Supabase (saved_places)',
        status: savedErr ? 'error' : 'ok',
        detail: savedErr?.message,
        ms: Date.now() - t2,
      });

      // Check reports table
      const t3 = Date.now();
      const { error: reportsErr } = await admin.from('reports').select('id').limit(1);
      checks.push({
        name: 'Supabase (reports)',
        status: reportsErr ? 'error' : 'ok',
        detail: reportsErr?.message,
        ms: Date.now() - t3,
      });

      // Check user_stops table
      const t4 = Date.now();
      const { error: stopsErr } = await admin.from('user_stops').select('id').limit(1);
      checks.push({
        name: 'Supabase (user_stops)',
        status: stopsErr ? 'error' : 'ok',
        detail: stopsErr?.message,
        ms: Date.now() - t4,
      });

      // Check auth service
      const t5 = Date.now();
      const { error: authErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
      checks.push({
        name: 'Supabase Auth',
        status: authErr ? 'error' : 'ok',
        detail: authErr?.message,
        ms: Date.now() - t5,
      });

      result.health = checks;
      result.healthTimestamp = new Date().toISOString();
    }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', detail: String(err) });
  }
}
