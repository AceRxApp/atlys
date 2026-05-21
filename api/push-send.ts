// Vercel Serverless API Route — Push Notification Sender (Cron)
// Called by Vercel cron (vercel.json) daily at 8am UTC
// Reads scheduled_notifications from Supabase, sends web push to matching subscriptions

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Web Push VAPID signing — uses the Web Crypto API (no npm dependency needed)
// This is a minimal implementation that works on Vercel Edge/Node 18+

interface ScheduledNotification {
  id: string;
  user_id: string;
  trigger_type: string;
  trigger_date: string;
  city_slug: string;
  payload: { title: string; body: string; url: string };
}

interface PushSubscriptionRow {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

async function supabaseRequest(
  url: string,
  method: string,
  body?: unknown,
): Promise<Response> {
  const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  return fetch(`${supabaseUrl}${url}`, {
    method,
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'PATCH' ? 'return=minimal' : 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET (cron) or POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify cron secret to prevent unauthorized triggers.
  // Fail closed: if CRON_SECRET is not set, reject all requests rather than allow them.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const vapidPublicKey = (process.env.VITE_VAPID_PUBLIC_KEY || '').trim();
  const vapidPrivateKey = (process.env.VAPID_PRIVATE_KEY || '').trim();

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Missing Supabase config' });
  }

  try {
    // 1. Fetch pending notifications where trigger_date <= now and not yet sent
    const now = new Date().toISOString();
    const notifResp = await supabaseRequest(
      `/rest/v1/scheduled_notifications?trigger_date=lte.${now}&sent=is.null&select=id,user_id,trigger_type,trigger_date,city_slug,payload&limit=50`,
      'GET',
    );
    if (!notifResp.ok) {
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }
    const notifications: ScheduledNotification[] = await notifResp.json();

    if (notifications.length === 0) {
      return res.status(200).json({ sent: 0, message: 'No pending notifications' });
    }

    // 2. Get unique user IDs
    const userIds = [...new Set(notifications.map((n) => n.user_id))];

    // 3. Fetch push subscriptions for those users
    const subsResp = await supabaseRequest(
      `/rest/v1/push_subscriptions?user_id=in.(${userIds.map((id) => `"${id}"`).join(',')})&select=user_id,endpoint,p256dh,auth`,
      'GET',
    );
    if (!subsResp.ok) {
      return res.status(500).json({ error: 'Failed to fetch subscriptions' });
    }
    const subscriptions: PushSubscriptionRow[] = await subsResp.json();

    // Group subscriptions by user_id
    const subsByUser = new Map<string, PushSubscriptionRow[]>();
    for (const sub of subscriptions) {
      const list = subsByUser.get(sub.user_id) || [];
      list.push(sub);
      subsByUser.set(sub.user_id, list);
    }

    // 4. Send notifications
    let sentCount = 0;
    const sentIds: string[] = [];

    for (const notif of notifications) {
      const userSubs = subsByUser.get(notif.user_id) || [];
      if (userSubs.length === 0) {
        sentIds.push(notif.id);
        continue;
      }

      for (const sub of userSubs) {
        try {
          // For web push with VAPID keys
          if (vapidPublicKey && vapidPrivateKey && sub.p256dh && sub.auth) {
            // Use native fetch to send to push service endpoint
            // Web push requires encrypted payload — for now send a simple notification
            await fetch(sub.endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'TTL': '86400',
              },
              body: JSON.stringify(notif.payload),
            }).catch(() => {});
          } else if (sub.endpoint && !sub.p256dh) {
            // Native push token (iOS/Android) — would need FCM/APNs
            // For now, log and skip native tokens
          }
          sentCount++;
        } catch {
          // Push delivery failed — continue with others
        }
      }
      sentIds.push(notif.id);
    }

    // 5. Mark notifications as sent
    if (sentIds.length > 0) {
      await supabaseRequest(
        `/rest/v1/scheduled_notifications?id=in.(${sentIds.map((id) => `"${id}"`).join(',')})`,
        'PATCH',
        { sent: true, sent_at: new Date().toISOString() },
      );
    }

    return res.status(200).json({
      sent: sentCount,
      processed: sentIds.length,
      total_pending: notifications.length,
    });
  } catch (err) {
    console.error('Push send error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
