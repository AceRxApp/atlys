-- ============================================================================
-- API Keys table — Developer access with approval flow and paid tiers
-- Run this in Supabase SQL Editor
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  developer_email TEXT NOT NULL,
  developer_name TEXT,
  app_name TEXT NOT NULL,
  app_description TEXT,
  -- Status: pending (waiting for admin), approved, revoked, suspended
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'revoked', 'suspended')),
  -- Tier: free (100 req/mo), basic (5k req/mo), pro (50k req/mo)
  tier TEXT NOT NULL DEFAULT 'free'
    CHECK (tier IN ('free', 'basic', 'pro')),
  -- Stripe billing for paid tiers
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  -- Usage tracking
  monthly_limit INTEGER NOT NULL DEFAULT 100,
  monthly_usage INTEGER NOT NULL DEFAULT 0,
  usage_reset_at TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ
);

-- Index for fast key lookups (every API request hits this)
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys (key);

-- Index for admin listing by status
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys (status);

-- Index for finding keys by developer email
CREATE INDEX IF NOT EXISTS idx_api_keys_email ON api_keys (developer_email);

-- RLS: Only service role can access this table (server-side only)
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- No public policies — all access goes through service role key on server
-- This ensures API keys are never exposed to the client

-- ============================================================================
-- Function to auto-reset monthly usage on the 1st of each month
-- ============================================================================
CREATE OR REPLACE FUNCTION reset_api_key_usage()
RETURNS void AS $$
BEGIN
  UPDATE api_keys
  SET monthly_usage = 0,
      usage_reset_at = date_trunc('month', now()) + interval '1 month'
  WHERE usage_reset_at <= now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- API key usage log for detailed analytics (optional, can enable later)
-- ============================================================================
CREATE TABLE IF NOT EXISTS api_key_usage_log (
  id BIGSERIAL PRIMARY KEY,
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  status_code INTEGER,
  response_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_key_usage_log_key ON api_key_usage_log (api_key_id, created_at DESC);

ALTER TABLE api_key_usage_log ENABLE ROW LEVEL SECURITY;
