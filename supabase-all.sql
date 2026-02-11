-- ============================================================================
-- NxStops — Complete Database Setup
-- Paste this ENTIRE script into Supabase SQL Editor and click Run
-- Safe to re-run: uses IF NOT EXISTS and skips duplicates
-- ============================================================================


-- ============================================================================
-- 1. REVIEWS TABLE
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

DO $$ BEGIN
  CREATE POLICY "Anyone can view reviews" ON reviews
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can create reviews" ON reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own reviews" ON reviews
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own reviews" ON reviews
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================================
-- 2. PLACE TAGS TABLE (community-sourced ownership/attribute tags)
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

DO $$ BEGIN
  CREATE POLICY "Anyone can view tags" ON place_tags
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can add tags" ON place_tags
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================================
-- 3. CREW TRIPS TABLE (collaborative trip planning)
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

DO $$ BEGIN
  CREATE POLICY "Anyone can view crew trips" ON crew_trips
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Anyone can create crew trips" ON crew_trips
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Anyone can update crew trips" ON crew_trips
    FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Anyone can delete crew trips" ON crew_trips
    FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enable Realtime for crew_trips (ignore error if already added)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE crew_trips;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================================
-- 4. SEED ALL CITIES (skips cities that already exist)
-- ============================================================================

INSERT INTO cities (name, country, region, slug, timezone, is_active)
SELECT name, country, region, slug, timezone, true
FROM (VALUES
  ('Abuja', 'Nigeria', 'Africa', 'abuja', 'Africa/Lagos'),
  ('Aburi', 'Ghana', 'Africa', 'aburi', 'Africa/Accra'),
  ('Accra', 'Ghana', 'Africa', 'accra', 'Africa/Accra'),
  ('Addis Ababa', 'Ethiopia', 'Africa', 'addis-ababa', 'Africa/Addis_Ababa'),
  ('Abu Dhabi', 'UAE', 'Middle East', 'abu-dhabi', 'Asia/Dubai'),
  ('Amman', 'Jordan', 'Middle East', 'amman', 'Asia/Amman'),
  ('Amsterdam', 'Netherlands', 'Europe', 'amsterdam', 'Europe/Amsterdam'),
  ('Aruba', 'Aruba', 'Caribbean', 'aruba', 'America/Aruba'),
  ('Athens', 'Greece', 'Europe', 'athens', 'Europe/Athens'),
  ('Atlanta', 'USA', 'North America', 'atlanta', 'America/New_York'),
  ('Auckland', 'New Zealand', 'Oceania', 'auckland', 'Pacific/Auckland'),
  ('Austin', 'USA', 'North America', 'austin', 'America/Chicago'),
  ('Bali', 'Indonesia', 'Asia', 'bali', 'Asia/Makassar'),
  ('Bangkok', 'Thailand', 'Asia', 'bangkok', 'Asia/Bangkok'),
  ('Barcelona', 'Spain', 'Europe', 'barcelona', 'Europe/Madrid'),
  ('Beijing', 'China', 'Asia', 'beijing', 'Asia/Shanghai'),
  ('Beirut', 'Lebanon', 'Middle East', 'beirut', 'Asia/Beirut'),
  ('Belize City', 'Belize', 'Central America', 'belize-city', 'America/Belize'),
  ('Berlin', 'Germany', 'Europe', 'berlin', 'Europe/Berlin'),
  ('Bogota', 'Colombia', 'South America', 'bogota', 'America/Bogota'),
  ('Boston', 'USA', 'North America', 'boston', 'America/New_York'),
  ('Bronx', 'USA', 'North America', 'bronx', 'America/New_York'),
  ('Brooklyn', 'USA', 'North America', 'brooklyn', 'America/New_York'),
  ('Bridgetown', 'Barbados', 'Caribbean', 'bridgetown', 'America/Barbados'),
  ('Brisbane', 'Australia', 'Oceania', 'brisbane', 'Australia/Brisbane'),
  ('Brussels', 'Belgium', 'Europe', 'brussels', 'Europe/Brussels'),
  ('Budapest', 'Hungary', 'Europe', 'budapest', 'Europe/Budapest'),
  ('Buenos Aires', 'Argentina', 'South America', 'buenos-aires', 'America/Argentina/Buenos_Aires'),
  ('Calgary', 'Canada', 'North America', 'calgary', 'America/Edmonton'),
  ('Cancun', 'Mexico', 'North America', 'cancun', 'America/Cancun'),
  ('Cape Coast', 'Ghana', 'Africa', 'cape-coast', 'Africa/Accra'),
  ('Cape Town', 'South Africa', 'Africa', 'cape-town', 'Africa/Johannesburg'),
  ('Cartagena', 'Colombia', 'South America', 'cartagena', 'America/Bogota'),
  ('Casablanca', 'Morocco', 'Africa', 'casablanca', 'Africa/Casablanca'),
  ('Charleston', 'USA', 'North America', 'charleston', 'America/New_York'),
  ('Charlotte', 'USA', 'North America', 'charlotte', 'America/New_York'),
  ('Chiang Mai', 'Thailand', 'Asia', 'chiang-mai', 'Asia/Bangkok'),
  ('Chicago', 'USA', 'North America', 'chicago', 'America/Chicago'),
  ('Colombo', 'Sri Lanka', 'Asia', 'colombo', 'Asia/Colombo'),
  ('Copenhagen', 'Denmark', 'Europe', 'copenhagen', 'Europe/Copenhagen'),
  ('Curacao', 'Curacao', 'Caribbean', 'curacao', 'America/Curacao'),
  ('Cusco', 'Peru', 'South America', 'cusco', 'America/Lima'),
  ('Dakar', 'Senegal', 'Africa', 'dakar', 'Africa/Dakar'),
  ('Dallas', 'USA', 'North America', 'dallas', 'America/Chicago'),
  ('Dar es Salaam', 'Tanzania', 'Africa', 'dar-es-salaam', 'Africa/Dar_es_Salaam'),
  ('Delhi', 'India', 'Asia', 'delhi', 'Asia/Kolkata'),
  ('Denver', 'USA', 'North America', 'denver', 'America/Denver'),
  ('Detroit', 'USA', 'North America', 'detroit', 'America/Detroit'),
  ('Doha', 'Qatar', 'Middle East', 'doha', 'Asia/Qatar'),
  ('Dubai', 'UAE', 'Middle East', 'dubai', 'Asia/Dubai'),
  ('Dublin', 'Ireland', 'Europe', 'dublin', 'Europe/Dublin'),
  ('Edinburgh', 'UK', 'Europe', 'edinburgh', 'Europe/London'),
  ('Essaouira', 'Morocco', 'Africa', 'essaouira', 'Africa/Casablanca'),
  ('Fiji', 'Fiji', 'Oceania', 'fiji', 'Pacific/Fiji'),
  ('Florence', 'Italy', 'Europe', 'florence', 'Europe/Rome'),
  ('Gold Coast', 'Australia', 'Oceania', 'gold-coast', 'Australia/Brisbane'),
  ('Guatemala City', 'Guatemala', 'Central America', 'guatemala-city', 'America/Guatemala'),
  ('Hanoi', 'Vietnam', 'Asia', 'hanoi', 'Asia/Ho_Chi_Minh'),
  ('Havana', 'Cuba', 'Caribbean', 'havana', 'America/Havana'),
  ('Helsinki', 'Finland', 'Europe', 'helsinki', 'Europe/Helsinki'),
  ('Ho Chi Minh City', 'Vietnam', 'Asia', 'ho-chi-minh-city', 'Asia/Ho_Chi_Minh'),
  ('Hong Kong', 'China', 'Asia', 'hong-kong', 'Asia/Hong_Kong'),
  ('Honolulu', 'USA', 'North America', 'honolulu', 'Pacific/Honolulu'),
  ('Houston', 'USA', 'North America', 'houston', 'America/Chicago'),
  ('Istanbul', 'Turkey', 'Europe', 'istanbul', 'Europe/Istanbul'),
  ('Jaipur', 'India', 'Asia', 'jaipur', 'Asia/Kolkata'),
  ('Jakarta', 'Indonesia', 'Asia', 'jakarta', 'Asia/Jakarta'),
  ('Johannesburg', 'South Africa', 'Africa', 'johannesburg', 'Africa/Johannesburg'),
  ('Kampala', 'Uganda', 'Africa', 'kampala', 'Africa/Kampala'),
  ('Kathmandu', 'Nepal', 'Asia', 'kathmandu', 'Asia/Kathmandu'),
  ('Kigali', 'Rwanda', 'Africa', 'kigali', 'Africa/Kigali'),
  ('Kingston', 'Jamaica', 'Caribbean', 'kingston', 'America/Jamaica'),
  ('Krakow', 'Poland', 'Europe', 'krakow', 'Europe/Warsaw'),
  ('Kuala Lumpur', 'Malaysia', 'Asia', 'kuala-lumpur', 'Asia/Kuala_Lumpur'),
  ('Kumasi', 'Ghana', 'Africa', 'kumasi', 'Africa/Accra'),
  ('Kyoto', 'Japan', 'Asia', 'kyoto', 'Asia/Tokyo'),
  ('La Paz', 'Bolivia', 'South America', 'la-paz', 'America/La_Paz'),
  ('Lagos', 'Nigeria', 'Africa', 'lagos', 'Africa/Lagos'),
  ('Lekki', 'Nigeria', 'Africa', 'lekki', 'Africa/Lagos'),
  ('Las Vegas', 'USA', 'North America', 'las-vegas', 'America/Los_Angeles'),
  ('Lima', 'Peru', 'South America', 'lima', 'America/Lima'),
  ('Lisbon', 'Portugal', 'Europe', 'lisbon', 'Europe/Lisbon'),
  ('London', 'UK', 'Europe', 'london', 'Europe/London'),
  ('Los Angeles', 'USA', 'North America', 'los-angeles', 'America/Los_Angeles'),
  ('Luanda', 'Angola', 'Africa', 'luanda', 'Africa/Luanda'),
  ('Madrid', 'Spain', 'Europe', 'madrid', 'Europe/Madrid'),
  ('Manila', 'Philippines', 'Asia', 'manila', 'Asia/Manila'),
  ('Maputo', 'Mozambique', 'Africa', 'maputo', 'Africa/Maputo'),
  ('Marrakech', 'Morocco', 'Africa', 'marrakech', 'Africa/Casablanca'),
  ('Mauritius', 'Mauritius', 'Africa', 'mauritius', 'Indian/Mauritius'),
  ('Medellin', 'Colombia', 'South America', 'medellin', 'America/Bogota'),
  ('Melbourne', 'Australia', 'Oceania', 'melbourne', 'Australia/Melbourne'),
  ('Memphis', 'USA', 'North America', 'memphis', 'America/Chicago'),
  ('Mexico City', 'Mexico', 'North America', 'mexico-city', 'America/Mexico_City'),
  ('Miami', 'USA', 'North America', 'miami', 'America/New_York'),
  ('Milan', 'Italy', 'Europe', 'milan', 'Europe/Rome'),
  ('Minneapolis', 'USA', 'North America', 'minneapolis', 'America/Chicago'),
  ('Montego Bay', 'Jamaica', 'Caribbean', 'montego-bay', 'America/Jamaica'),
  ('Montevideo', 'Uruguay', 'South America', 'montevideo', 'America/Montevideo'),
  ('Montreal', 'Canada', 'North America', 'montreal', 'America/Toronto'),
  ('Mumbai', 'India', 'Asia', 'mumbai', 'Asia/Kolkata'),
  ('Munich', 'Germany', 'Europe', 'munich', 'Europe/Berlin'),
  ('Muscat', 'Oman', 'Middle East', 'muscat', 'Asia/Muscat'),
  ('Nairobi', 'Kenya', 'Africa', 'nairobi', 'Africa/Nairobi'),
  ('Nashville', 'USA', 'North America', 'nashville', 'America/Chicago'),
  ('Nassau', 'Bahamas', 'Caribbean', 'nassau', 'America/Nassau'),
  ('New Orleans', 'USA', 'North America', 'new-orleans', 'America/Chicago'),
  ('New York', 'USA', 'North America', 'new-york', 'America/New_York'),
  ('Nice', 'France', 'Europe', 'nice', 'Europe/Paris'),
  ('Ocho Rios', 'Jamaica', 'Caribbean', 'ocho-rios', 'America/Jamaica'),
  ('Orlando', 'USA', 'North America', 'orlando', 'America/New_York'),
  ('Osaka', 'Japan', 'Asia', 'osaka', 'Asia/Tokyo'),
  ('Oslo', 'Norway', 'Europe', 'oslo', 'Europe/Oslo'),
  ('Ottawa', 'Canada', 'North America', 'ottawa', 'America/Toronto'),
  ('Panama City', 'Panama', 'Central America', 'panama-city', 'America/Panama'),
  ('Paris', 'France', 'Europe', 'paris', 'Europe/Paris'),
  ('Perth', 'Australia', 'Oceania', 'perth', 'Australia/Perth'),
  ('Philadelphia', 'USA', 'North America', 'philadelphia', 'America/New_York'),
  ('Phnom Penh', 'Cambodia', 'Asia', 'phnom-penh', 'Asia/Phnom_Penh'),
  ('Phoenix', 'USA', 'North America', 'phoenix', 'America/Phoenix'),
  ('Plainfield', 'USA', 'North America', 'plainfield', 'America/Chicago'),
  ('Pittsburgh', 'USA', 'North America', 'pittsburgh', 'America/New_York'),
  ('Portland', 'USA', 'North America', 'portland', 'America/Los_Angeles'),
  ('Porto', 'Portugal', 'Europe', 'porto', 'Europe/Lisbon'),
  ('Prague', 'Czech Republic', 'Europe', 'prague', 'Europe/Prague'),
  ('Punta Cana', 'Dominican Republic', 'Caribbean', 'punta-cana', 'America/Santo_Domingo'),
  ('Quebec City', 'Canada', 'North America', 'quebec-city', 'America/Toronto'),
  ('Queenstown', 'New Zealand', 'Oceania', 'queenstown', 'Pacific/Auckland'),
  ('Quito', 'Ecuador', 'South America', 'quito', 'America/Guayaquil'),
  ('Rio de Janeiro', 'Brazil', 'South America', 'rio-de-janeiro', 'America/Sao_Paulo'),
  ('Riyadh', 'Saudi Arabia', 'Middle East', 'riyadh', 'Asia/Riyadh'),
  ('Rome', 'Italy', 'Europe', 'rome', 'Europe/Rome'),
  ('San Antonio', 'USA', 'North America', 'san-antonio', 'America/Chicago'),
  ('San Diego', 'USA', 'North America', 'san-diego', 'America/Los_Angeles'),
  ('San Francisco', 'USA', 'North America', 'san-francisco', 'America/Los_Angeles'),
  ('San Jose', 'Costa Rica', 'Central America', 'san-jose-cr', 'America/Costa_Rica'),
  ('San Juan', 'Puerto Rico', 'Caribbean', 'san-juan', 'America/Puerto_Rico'),
  ('Santiago', 'Chile', 'South America', 'santiago', 'America/Santiago'),
  ('Santorini', 'Greece', 'Europe', 'santorini', 'Europe/Athens'),
  ('Santo Domingo', 'Dominican Republic', 'Caribbean', 'santo-domingo', 'America/Santo_Domingo'),
  ('Sao Paulo', 'Brazil', 'South America', 'sao-paulo', 'America/Sao_Paulo'),
  ('Savannah', 'USA', 'North America', 'savannah', 'America/New_York'),
  ('Seattle', 'USA', 'North America', 'seattle', 'America/Los_Angeles'),
  ('Seoul', 'South Korea', 'Asia', 'seoul', 'Asia/Seoul'),
  ('Seville', 'Spain', 'Europe', 'seville', 'Europe/Madrid'),
  ('Shanghai', 'China', 'Asia', 'shanghai', 'Asia/Shanghai'),
  ('Siem Reap', 'Cambodia', 'Asia', 'siem-reap', 'Asia/Phnom_Penh'),
  ('Singapore', 'Singapore', 'Asia', 'singapore', 'Asia/Singapore'),
  ('St. Louis', 'USA', 'North America', 'st-louis', 'America/Chicago'),
  ('St. Lucia', 'St. Lucia', 'Caribbean', 'st-lucia', 'America/St_Lucia'),
  ('Stockholm', 'Sweden', 'Europe', 'stockholm', 'Europe/Stockholm'),
  ('Sydney', 'Australia', 'Oceania', 'sydney', 'Australia/Sydney'),
  ('Taipei', 'Taiwan', 'Asia', 'taipei', 'Asia/Taipei'),
  ('Tampa', 'USA', 'North America', 'tampa', 'America/New_York'),
  ('Tel Aviv', 'Israel', 'Middle East', 'tel-aviv', 'Asia/Jerusalem'),
  ('Tokyo', 'Japan', 'Asia', 'tokyo', 'Asia/Tokyo'),
  ('Toronto', 'Canada', 'North America', 'toronto', 'America/Toronto'),
  ('Trinidad', 'Trinidad and Tobago', 'Caribbean', 'trinidad', 'America/Port_of_Spain'),
  ('Tulum', 'Mexico', 'North America', 'tulum', 'America/Cancun'),
  ('Vancouver', 'Canada', 'North America', 'vancouver', 'America/Vancouver'),
  ('Venice', 'Italy', 'Europe', 'venice', 'Europe/Rome'),
  ('Volta Region', 'Ghana', 'Africa', 'volta-region', 'Africa/Accra'),
  ('Vienna', 'Austria', 'Europe', 'vienna', 'Europe/Vienna'),
  ('Warsaw', 'Poland', 'Europe', 'warsaw', 'Europe/Warsaw'),
  ('Washington', 'USA', 'North America', 'washington', 'America/New_York'),
  ('Zanzibar', 'Tanzania', 'Africa', 'zanzibar', 'Africa/Dar_es_Salaam'),
  ('Zurich', 'Switzerland', 'Europe', 'zurich', 'Europe/Zurich')
) AS new_cities(name, country, region, slug, timezone)
WHERE NOT EXISTS (
  SELECT 1 FROM cities WHERE cities.name = new_cities.name
);
