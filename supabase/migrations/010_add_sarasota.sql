-- Add Sarasota to the cities table so users can search + plan trips there.
-- The /cities/sarasota SEO landing page already exists, this makes it fully functional.
-- Run in Supabase SQL Editor.

INSERT INTO cities (name, country, region, slug, timezone, is_active)
VALUES ('Sarasota', 'USA', 'North America', 'sarasota', 'America/New_York', true)
ON CONFLICT (name) DO NOTHING;
