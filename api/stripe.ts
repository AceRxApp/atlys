import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders, checkRateLimit, getClientIp } from './_lib/cors.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
);

const PRICE_IDS: Record<string, string> = {
  monthly: process.env.STRIPE_PRICE_ID_MONTHLY || '',
  yearly: process.env.STRIPE_PRICE_ID_YEARLY || '',
};

// API tier pricing (set these in Vercel env vars after creating Stripe products)
const API_TIER_PRICE_IDS: Record<string, string> = {
  basic: process.env.STRIPE_API_BASIC_PRICE_ID || '',
  pro: process.env.STRIPE_API_PRO_PRICE_ID || '',
};

const API_TIER_LIMITS: Record<string, number> = {
  free: 100,
  basic: 5000,
  pro: 50000,
};

function mapPlan(priceId: string): string {
  if (priceId === process.env.STRIPE_PRICE_ID_MONTHLY) return 'pro_monthly';
  if (priceId === process.env.STRIPE_PRICE_ID_YEARLY) return 'pro_yearly';
  return 'pro_monthly';
}

function getAppUrl(req: VercelRequest): string {
  return process.env.VERCEL_ENV === 'production'
    ? 'https://nxstops.com'
    : (req.headers.origin as string || 'http://localhost:5173');
}

async function getAuthUser(req: VercelRequest) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.slice(7));
  if (error || !user) return null;
  return user;
}

// =========================================================================
// Route: ?action=checkout | ?action=billing | webhook (no action, POST from Stripe)
// =========================================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = req.query.action as string | undefined;

  // Webhook — Stripe sends POST without action param, identified by stripe-signature header
  if (req.headers['stripe-signature']) {
    return handleWebhook(req, res);
  }

  // CORS for non-webhook routes
  const corsOk = setCorsHeaders(res, req.headers.origin as string | undefined, 'POST, OPTIONS');
  if (!corsOk) return res.status(403).json({ error: 'Origin not allowed' });
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const ip = getClientIp(req.headers);
  if (!(await checkRateLimit(ip, 10, 60_000))) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  if (action === 'checkout') return handleCheckout(req, res);
  if (action === 'billing') return handleBilling(req, res);
  if (action === 'api-checkout') return handleApiCheckout(req, res);
  return res.status(400).json({ error: 'Invalid action' });
}

// =========================================================================
// Create Checkout Session
// =========================================================================
async function handleCheckout(req: VercelRequest, res: VercelResponse) {
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Sign in required' });

  const { plan } = req.body as { plan?: string };
  if (!plan || !PRICE_IDS[plan]) {
    return res.status(400).json({ error: 'Invalid plan. Use "monthly" or "yearly"' });
  }

  try {
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    let customerId = existing?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabase.from('subscriptions').upsert({
        user_id: user.id,
        stripe_customer_id: customerId,
        plan: 'free',
        status: 'inactive',
      }, { onConflict: 'user_id' });
    }

    const appUrl = getAppUrl(req);
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
      success_url: `${appUrl}/?upgraded=true`,
      cancel_url: `${appUrl}/?upgrade_canceled=true`,
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    const message = err instanceof Error ? err.message : 'Failed to create checkout session';
    return res.status(500).json({ error: message });
  }
}

// =========================================================================
// Manage Billing (Customer Portal)
// =========================================================================
async function handleBilling(req: VercelRequest, res: VercelResponse) {
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Sign in required' });

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single();

  if (!sub?.stripe_customer_id) {
    return res.status(404).json({ error: 'No subscription found' });
  }

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: getAppUrl(req),
    });
    return res.status(200).json({ url: portalSession.url });
  } catch (err) {
    console.error('Billing portal error:', err);
    return res.status(500).json({ error: 'Failed to open billing portal' });
  }
}

// =========================================================================
// API Key Tier Checkout — Developers upgrading to paid API tier
// =========================================================================
async function handleApiCheckout(req: VercelRequest, res: VercelResponse) {
  const { api_key, tier } = req.body as { api_key?: string; tier?: string };
  if (!api_key || !tier || !API_TIER_PRICE_IDS[tier]) {
    return res.status(400).json({ error: 'api_key and tier (basic or pro) are required' });
  }

  try {
    // Look up the API key
    const { data: keyRow, error: keyErr } = await supabase
      .from('api_keys')
      .select('id, developer_email, status, stripe_customer_id')
      .eq('key', api_key)
      .limit(1)
      .maybeSingle();

    if (keyErr || !keyRow) {
      return res.status(404).json({ error: 'API key not found' });
    }
    if (keyRow.status !== 'approved') {
      return res.status(403).json({ error: 'API key must be approved before upgrading' });
    }

    // Create or reuse Stripe customer
    let customerId = keyRow.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: keyRow.developer_email,
        metadata: { api_key_id: keyRow.id, type: 'api_developer' },
      });
      customerId = customer.id;
      await supabase.from('api_keys')
        .update({ stripe_customer_id: customerId })
        .eq('id', keyRow.id);
    }

    const appUrl = getAppUrl(req);
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: API_TIER_PRICE_IDS[tier], quantity: 1 }],
      success_url: `${appUrl}/developers?upgraded=true`,
      cancel_url: `${appUrl}/developers?upgrade_canceled=true`,
      subscription_data: {
        metadata: { api_key_id: keyRow.id, tier, type: 'api_tier' },
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('API tier checkout error:', err);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
}

// =========================================================================
// Stripe Webhook
// =========================================================================
export const config = { api: { bodyParser: false } };

async function getRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

async function handleWebhook(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  let event: Stripe.Event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

          // Check if this is an API tier subscription
          if (subscription.metadata.type === 'api_tier') {
            const apiKeyId = subscription.metadata.api_key_id;
            const tier = subscription.metadata.tier || 'basic';
            if (apiKeyId) {
              await supabase.from('api_keys').update({
                tier,
                monthly_limit: API_TIER_LIMITS[tier] || 5000,
                stripe_subscription_id: subscription.id,
              }).eq('id', apiKeyId);
            }
            break;
          }

          // Regular user subscription
          const userId = subscription.metadata.supabase_user_id;
          const priceId = subscription.items.data[0]?.price?.id || '';
          const start = subscription.items.data[0]?.created
            ? new Date(subscription.items.data[0].created * 1000).toISOString()
            : new Date().toISOString();

          await supabase.from('subscriptions').upsert({
            user_id: userId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscription.id,
            plan: mapPlan(priceId),
            status: 'active',
            current_period_start: start,
            current_period_end: subscription.cancel_at
              ? new Date(subscription.cancel_at * 1000).toISOString()
              : null,
            cancel_at_period_end: subscription.cancel_at_period_end,
          }, { onConflict: 'user_id' });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.supabase_user_id;
        if (!userId) break;

        const priceId = subscription.items.data[0]?.price?.id || '';
        const status = subscription.status === 'active' || subscription.status === 'trialing'
          ? 'active' : subscription.status;

        await supabase.from('subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: subscription.customer as string,
          stripe_subscription_id: subscription.id,
          plan: mapPlan(priceId),
          status,
          cancel_at_period_end: subscription.cancel_at_period_end,
        }, { onConflict: 'user_id' });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        // Handle API tier cancellation
        if (subscription.metadata.type === 'api_tier') {
          const apiKeyId = subscription.metadata.api_key_id;
          if (apiKeyId) {
            await supabase.from('api_keys').update({
              tier: 'free',
              monthly_limit: API_TIER_LIMITS.free,
              stripe_subscription_id: null,
            }).eq('id', apiKeyId);
          }
          break;
        }

        // Regular user subscription cancellation
        const userId = subscription.metadata.supabase_user_id;
        if (!userId) break;

        await supabase.from('subscriptions').update({
          status: 'canceled',
          plan: 'free',
          cancel_at_period_end: false,
        }).eq('user_id', userId);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as unknown as Record<string, unknown>;
        const subId = invoice.subscription as string | undefined;
        if (subId) {
          await supabase.from('subscriptions').update({
            status: 'past_due',
          }).eq('stripe_subscription_id', subId);
        }
        break;
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}
