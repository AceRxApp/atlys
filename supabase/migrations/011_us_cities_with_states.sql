-- Migration: Add state suffix to existing US city names + add 31 mid-sized US cities
-- Why: Users couldn't distinguish "Greenville SC" from "Greenville NC" etc.
-- Run in Supabase SQL Editor.

-- ─── PART 1: Update existing US city names to include state ─────────────────
-- Slugs stay the same so existing /cities/<slug> URLs and shared plans don't break.

UPDATE cities SET name = 'Atlanta, GA' WHERE slug = 'atlanta';
UPDATE cities SET name = 'Austin, TX' WHERE slug = 'austin';
UPDATE cities SET name = 'Boston, MA' WHERE slug = 'boston';
UPDATE cities SET name = 'Bronx, NY' WHERE slug = 'bronx';
UPDATE cities SET name = 'Brooklyn, NY' WHERE slug = 'brooklyn';
UPDATE cities SET name = 'Charleston, SC' WHERE slug = 'charleston';
UPDATE cities SET name = 'Charlotte, NC' WHERE slug = 'charlotte';
UPDATE cities SET name = 'Chicago, IL' WHERE slug = 'chicago';
UPDATE cities SET name = 'Dallas, TX' WHERE slug = 'dallas';
UPDATE cities SET name = 'Denver, CO' WHERE slug = 'denver';
UPDATE cities SET name = 'Detroit, MI' WHERE slug = 'detroit';
UPDATE cities SET name = 'Honolulu, HI' WHERE slug = 'honolulu';
UPDATE cities SET name = 'Houston, TX' WHERE slug = 'houston';
UPDATE cities SET name = 'Las Vegas, NV' WHERE slug = 'las-vegas';
UPDATE cities SET name = 'Los Angeles, CA' WHERE slug = 'los-angeles';
UPDATE cities SET name = 'Memphis, TN' WHERE slug = 'memphis';
UPDATE cities SET name = 'Miami, FL' WHERE slug = 'miami';
UPDATE cities SET name = 'Minneapolis, MN' WHERE slug = 'minneapolis';
UPDATE cities SET name = 'Nashville, TN' WHERE slug = 'nashville';
UPDATE cities SET name = 'New Orleans, LA' WHERE slug = 'new-orleans';
UPDATE cities SET name = 'New York, NY' WHERE slug = 'new-york';
UPDATE cities SET name = 'Orlando, FL' WHERE slug = 'orlando';
UPDATE cities SET name = 'Philadelphia, PA' WHERE slug = 'philadelphia';
UPDATE cities SET name = 'Phoenix, AZ' WHERE slug = 'phoenix';
UPDATE cities SET name = 'Pittsburgh, PA' WHERE slug = 'pittsburgh';
UPDATE cities SET name = 'Plainfield, NJ' WHERE slug = 'plainfield';
UPDATE cities SET name = 'Portland, OR' WHERE slug = 'portland';
UPDATE cities SET name = 'San Antonio, TX' WHERE slug = 'san-antonio';
UPDATE cities SET name = 'San Diego, CA' WHERE slug = 'san-diego';
UPDATE cities SET name = 'San Francisco, CA' WHERE slug = 'san-francisco';
UPDATE cities SET name = 'Sarasota, FL' WHERE slug = 'sarasota';
UPDATE cities SET name = 'Savannah, GA' WHERE slug = 'savannah';
UPDATE cities SET name = 'Seattle, WA' WHERE slug = 'seattle';
UPDATE cities SET name = 'St. Louis, MO' WHERE slug = 'st-louis';
UPDATE cities SET name = 'Tampa, FL' WHERE slug = 'tampa';
UPDATE cities SET name = 'Washington, DC' WHERE slug = 'washington';

-- ─── PART 2: Insert 31 new mid-sized US cities ──────────────────────────────

INSERT INTO cities (name, country, region, slug, timezone, is_active)
SELECT name, country, region, slug, timezone, true
FROM (VALUES
  ('Albuquerque, NM', 'USA', 'North America', 'albuquerque-nm', 'America/Denver'),
  ('Asheville, NC', 'USA', 'North America', 'asheville-nc', 'America/New_York'),
  ('Birmingham, AL', 'USA', 'North America', 'birmingham-al', 'America/Chicago'),
  ('Boise, ID', 'USA', 'North America', 'boise-id', 'America/Boise'),
  ('Boulder, CO', 'USA', 'North America', 'boulder-co', 'America/Denver'),
  ('Buffalo, NY', 'USA', 'North America', 'buffalo-ny', 'America/New_York'),
  ('Burlington, VT', 'USA', 'North America', 'burlington-vt', 'America/New_York'),
  ('Chattanooga, TN', 'USA', 'North America', 'chattanooga-tn', 'America/New_York'),
  ('Cincinnati, OH', 'USA', 'North America', 'cincinnati-oh', 'America/New_York'),
  ('Cleveland, OH', 'USA', 'North America', 'cleveland-oh', 'America/New_York'),
  ('Des Moines, IA', 'USA', 'North America', 'des-moines-ia', 'America/Chicago'),
  ('Greenville, SC', 'USA', 'North America', 'greenville-sc', 'America/New_York'),
  ('Hartford, CT', 'USA', 'North America', 'hartford-ct', 'America/New_York'),
  ('Indianapolis, IN', 'USA', 'North America', 'indianapolis-in', 'America/Indianapolis'),
  ('Key West, FL', 'USA', 'North America', 'key-west-fl', 'America/New_York'),
  ('Knoxville, TN', 'USA', 'North America', 'knoxville-tn', 'America/New_York'),
  ('Louisville, KY', 'USA', 'North America', 'louisville-ky', 'America/Kentucky/Louisville'),
  ('Madison, WI', 'USA', 'North America', 'madison-wi', 'America/Chicago'),
  ('Milwaukee, WI', 'USA', 'North America', 'milwaukee-wi', 'America/Chicago'),
  ('Naples, FL', 'USA', 'North America', 'naples-fl', 'America/New_York'),
  ('Providence, RI', 'USA', 'North America', 'providence-ri', 'America/New_York'),
  ('Raleigh, NC', 'USA', 'North America', 'raleigh-nc', 'America/New_York'),
  ('Richmond, VA', 'USA', 'North America', 'richmond-va', 'America/New_York'),
  ('Salt Lake City, UT', 'USA', 'North America', 'salt-lake-city-ut', 'America/Denver'),
  ('Sedona, AZ', 'USA', 'North America', 'sedona-az', 'America/Phoenix'),
  ('Spokane, WA', 'USA', 'North America', 'spokane-wa', 'America/Los_Angeles'),
  ('St. Augustine, FL', 'USA', 'North America', 'st-augustine-fl', 'America/New_York'),
  ('St. Petersburg, FL', 'USA', 'North America', 'st-petersburg-fl', 'America/New_York'),
  ('Tucson, AZ', 'USA', 'North America', 'tucson-az', 'America/Phoenix'),
  ('Tulsa, OK', 'USA', 'North America', 'tulsa-ok', 'America/Chicago'),
  ('Wilmington, DE', 'USA', 'North America', 'wilmington-de', 'America/New_York')
) AS new_cities(name, country, region, slug, timezone)
WHERE NOT EXISTS (
  SELECT 1 FROM cities WHERE cities.slug = new_cities.slug
);
