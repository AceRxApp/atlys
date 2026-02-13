-- User Contributed Stops (community-pinned discoveries)
CREATE TABLE IF NOT EXISTS user_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  description TEXT CHECK (char_length(description) <= 500),
  category TEXT NOT NULL CHECK (category IN (
    'cafe', 'restaurant', 'bar', 'park', 'viewpoint', 'market',
    'art', 'shop', 'landmark', 'food_truck', 'street_art', 'other'
  )),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  city_slug TEXT NOT NULL,
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  upvotes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_stops_city ON user_stops(city_slug, status);
CREATE INDEX IF NOT EXISTS idx_user_stops_user ON user_stops(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stops_status ON user_stops(status);

-- RLS
ALTER TABLE user_stops ENABLE ROW LEVEL SECURITY;

-- Anyone can see approved stops
CREATE POLICY "Anyone can view approved stops"
  ON user_stops FOR SELECT
  USING (status = 'approved' OR auth.uid() = user_id);

-- Authenticated users can create stops
CREATE POLICY "Users can create stops"
  ON user_stops FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending stops
CREATE POLICY "Users can update own pending stops"
  ON user_stops FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

-- Users can delete their own stops
CREATE POLICY "Users can delete own stops"
  ON user_stops FOR DELETE
  USING (auth.uid() = user_id);
