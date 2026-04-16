-- Fix: RLS policies for shared_plans table
-- This fixes the "Failed to create share link" error on the Plan tab.
-- Run this in the Supabase SQL Editor.

-- Enable RLS (safe to run if already enabled)
ALTER TABLE shared_plans ENABLE ROW LEVEL SECURITY;

-- Drop any existing conflicting policies
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
-- This is intentional — unauthenticated users should be able to share too
CREATE POLICY "shared_plans_insert_policy"
  ON shared_plans FOR INSERT
  WITH CHECK (true);

-- UPDATE: owners can update their own plans (for publishing, etc.)
-- Plans with shared_by = NULL (anonymous) can be updated by anyone with the slug
CREATE POLICY "shared_plans_update_policy"
  ON shared_plans FOR UPDATE
  USING (
    shared_by IS NULL
    OR shared_by = auth.uid()
  );
