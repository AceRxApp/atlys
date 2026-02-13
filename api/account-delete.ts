// Vercel Serverless API Route — Account Deletion
// Deletes all user data and the auth account (required by Apple App Store guidelines)

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders, checkRateLimit, getClientIp } from './_lib/cors.js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const corsOk = setCorsHeaders(res, req.headers.origin as string | undefined, 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!corsOk) return res.status(403).json({ error: 'Origin not allowed' });

  const clientIp = getClientIp(req.headers);
  if (!(await checkRateLimit(clientIp, 5, 60_000))) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  const token = authHeader.slice(7);

  try {
    // Create service-role client for admin operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify the user's token and get their identity
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const userId = user.id;

    // Delete all user data in order (respecting foreign key constraints)
    const { error: reviewsError } = await supabase
      .from('reviews')
      .delete()
      .eq('user_id', userId);
    if (reviewsError) {
      console.error('Error deleting reviews:', reviewsError);
      return res.status(500).json({ error: 'Failed to delete reviews' });
    }

    const { error: tagsError } = await supabase
      .from('place_tags')
      .delete()
      .eq('user_id', userId);
    if (tagsError) {
      console.error('Error deleting place_tags:', tagsError);
      return res.status(500).json({ error: 'Failed to delete place tags' });
    }

    const { error: savedError } = await supabase
      .from('saved_places')
      .delete()
      .eq('user_id', userId);
    if (savedError) {
      console.error('Error deleting saved_places:', savedError);
      return res.status(500).json({ error: 'Failed to delete saved places' });
    }

    const { error: tripsError } = await supabase
      .from('crew_trips')
      .delete()
      .eq('created_by', userId);
    if (tripsError) {
      console.error('Error deleting crew_trips:', tripsError);
      return res.status(500).json({ error: 'Failed to delete crew trips' });
    }

    // Delete the auth user (requires service role key)
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      console.error('Error deleting auth user:', deleteUserError);
      return res.status(500).json({ error: 'Failed to delete user account' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Account deletion error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
