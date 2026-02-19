// Vercel Serverless API Route — Content Report
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders, checkRateLimit, getClientIp } from './_lib/cors.js';

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || '').trim();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const corsOk = setCorsHeaders(res, req.headers.origin as string | undefined, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!corsOk) return res.status(403).json({ error: 'Origin not allowed' });

  const clientIp = getClientIp(req.headers);
  if (!(await checkRateLimit(clientIp, 10, 60_000))) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.slice(7);

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { content_type, content_id, reason, details } = req.body || {};

    if (!content_type || !content_id || !reason) {
      return res.status(400).json({ error: 'content_type, content_id, and reason are required' });
    }

    const validTypes = ['review', 'place_tag', 'place'];
    const validReasons = ['spam', 'inappropriate', 'harassment', 'misinformation', 'other'];

    if (!validTypes.includes(content_type)) {
      return res.status(400).json({ error: `content_type must be one of: ${validTypes.join(', ')}` });
    }
    if (!validReasons.includes(reason)) {
      return res.status(400).json({ error: `reason must be one of: ${validReasons.join(', ')}` });
    }

    const { error: insertError } = await supabase.from('reports').insert({
      reporter_id: user.id,
      content_type,
      content_id: String(content_id),
      reason,
      details: details ? String(details).slice(0, 500) : null,
      status: 'pending',
    });

    if (insertError) {
      console.error('Report insert error:', insertError);
      return res.status(500).json({ error: 'Failed to submit report' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Report API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
