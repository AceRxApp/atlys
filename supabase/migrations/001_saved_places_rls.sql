-- ============================================================================
-- saved_places table + RLS policies
-- Run this in your Supabase SQL editor
-- ============================================================================

-- Create table (if not already created)
CREATE TABLE IF NOT EXISTS saved_places (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL,
  place_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, place_id)
);

-- Enable RLS
ALTER TABLE saved_places ENABLE ROW LEVEL SECURITY;

-- Users can only read their own saved places
CREATE POLICY "Users can read own saved places"
  ON saved_places FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own saved places
CREATE POLICY "Users can insert own saved places"
  ON saved_places FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own saved places
CREATE POLICY "Users can update own saved places"
  ON saved_places FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own saved places
CREATE POLICY "Users can delete own saved places"
  ON saved_places FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_saved_places_user_id ON saved_places(user_id);

-- ============================================================================
-- Also ensure reviews table has RLS (if not already set)
-- ============================================================================

ALTER TABLE IF EXISTS reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'Anyone can read reviews') THEN
    CREATE POLICY "Anyone can read reviews" ON reviews FOR SELECT USING (true);
  END IF;
END $$;

-- Authenticated users can insert reviews
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'Authenticated users can insert reviews') THEN
    CREATE POLICY "Authenticated users can insert reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- ============================================================================
-- Also ensure place_tags table has RLS
-- ============================================================================

ALTER TABLE IF EXISTS place_tags ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'place_tags' AND policyname = 'Anyone can read place tags') THEN
    CREATE POLICY "Anyone can read place tags" ON place_tags FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'place_tags' AND policyname = 'Authenticated users can insert place tags') THEN
    CREATE POLICY "Authenticated users can insert place tags" ON place_tags FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
