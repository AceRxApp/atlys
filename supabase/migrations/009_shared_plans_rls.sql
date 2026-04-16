-- Fix: Create shared_plans table + RLS policies
-- This fixes the "Failed to create share link" error on the Plan tab.
-- Run this in the Supabase SQL Editor.

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS shared_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  city_slug text,
  city_label text NOT NULL,
  day_title text,
  trip_days jsonb NOT NULL,
  shared_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  view_count integer NOT NULL DEFAULT 0,
  likes_count integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  category text,
  creator_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast slug lookups (used for sharing)
CREATE INDEX IF NOT EXISTS shared_plans_slug_idx ON shared_plans (slug);

-- Index for community routes listing (published plans, sorted by date)
CREATE INDEX IF NOT EXISTS shared_plans_published_idx ON shared_plans (is_published, created_at DESC) WHERE is_published = true;

-- Enable Row Level Security
ALTER TABLE shared_plans ENABLE ROW LEVEL SECURITY;

-- Drop any existing conflicting policies (safe if they don't exist)
DROP POLICY IF EXISTS "Allow anonymous read of shared plans" ON shared_plans;
DROP POLICY IF EXISTS "Allow anyone to insert shared plans" ON shared_plans;
DROP POLICY IF EXISTS "Allow owners to update their shared plans" ON shared_plans;
DROP POLICY IF EXISTS "shared_plans_select_policy" ON shared_plans;
DROP POLICY IF EXISTS "shared_plans_insert_policy" ON shared_plans;
DROP POLICY IF EXISTS "shared_plans_update_policy" ON shared_plans;

-- SELECT: anyone can view shared plans (they're meant to be public via the slug link)
CREATE POLICY "shared_plans_select_policy"
  ON shared_plans FOR SELECT
  USING (true);

-- INSERT: anyone (signed-in or anonymous) can create a shared plan
CREATE POLICY "shared_plans_insert_policy"
  ON shared_plans FOR INSERT
  WITH CHECK (true);

-- UPDATE: owners can update their own plans; anon-created plans (shared_by = NULL)
-- can also be updated by anyone (needed because Publish runs right after Share)
CREATE POLICY "shared_plans_update_policy"
  ON shared_plans FOR UPDATE
  USING (
    shared_by IS NULL
    OR shared_by = auth.uid()
  );
