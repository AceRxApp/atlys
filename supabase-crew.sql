-- NxStops Crew Mode — Shared Trip Plans (Real-time Collaborative)
-- Paste this into Supabase SQL Editor (Dashboard > SQL Editor > New Query > Run)

-- ============================================================================
-- CREW TRIPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS crew_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_code TEXT UNIQUE NOT NULL,
  city_slug TEXT NOT NULL,
  city_label TEXT NOT NULL,
  trip_days JSONB NOT NULL DEFAULT '{"1": []}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  member_count INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crew_trips_code ON crew_trips(crew_code);

ALTER TABLE crew_trips ENABLE ROW LEVEL SECURITY;

-- Anyone can read crew trips (needed for joining via code)
CREATE POLICY "Anyone can view crew trips" ON crew_trips
  FOR SELECT USING (true);

-- Authenticated users can create crew trips
CREATE POLICY "Authenticated users can create crew trips" ON crew_trips
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Anyone authenticated can update crew trips (collaborative editing)
CREATE POLICY "Authenticated users can update crew trips" ON crew_trips
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Only creator can delete
CREATE POLICY "Creator can delete crew trips" ON crew_trips
  FOR DELETE USING (auth.uid() = created_by);

-- Enable Realtime for crew_trips
ALTER PUBLICATION supabase_realtime ADD TABLE crew_trips;
