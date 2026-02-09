-- NxStops Community Features — Reviews & Place Tags
-- Paste this into Supabase SQL Editor (Dashboard > SQL Editor > New Query > Run)

-- ============================================================================
-- REVIEWS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  place_id TEXT NOT NULL,
  city_slug TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_place_id ON reviews(place_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews" ON reviews
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews" ON reviews
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- PLACE TAGS TABLE (community-sourced ownership/attribute tags)
-- ============================================================================

CREATE TABLE IF NOT EXISTS place_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id TEXT NOT NULL,
  city_slug TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(place_id, user_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_place_tags_place_id ON place_tags(place_id);
CREATE INDEX IF NOT EXISTS idx_place_tags_tag ON place_tags(tag);

ALTER TABLE place_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tags" ON place_tags
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can add tags" ON place_tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);
