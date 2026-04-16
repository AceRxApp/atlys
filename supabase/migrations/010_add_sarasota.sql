-- Add Sarasota to the cities table so users can search + plan trips there.
-- The /cities/sarasota SEO landing page already exists, this makes it fully functional.
-- Run in Supabase SQL Editor.

INSERT INTO cities (name, country, region, slug, timezone, is_active)
SELECT 'Sarasota', 'USA', 'North America', 'sarasota', 'America/New_York', true
WHERE NOT EXISTS (
  SELECT 1 FROM cities WHERE name = 'Sarasota'
);
