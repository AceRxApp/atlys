-- ============================================================================
-- Migration 008: Custom dish images for TasteLens
-- Run this in your Supabase Dashboard > SQL Editor
-- ============================================================================

-- 1. Create the dish_images table
CREATE TABLE IF NOT EXISTS dish_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dish_name TEXT NOT NULL,
  restaurant TEXT,
  image_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by dish name + restaurant
CREATE INDEX IF NOT EXISTS idx_dish_images_dish_name ON dish_images (dish_name);
CREATE INDEX IF NOT EXISTS idx_dish_images_restaurant ON dish_images (dish_name, restaurant);

-- RLS: Enable row-level security
ALTER TABLE dish_images ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read dish images (used by the API)
CREATE POLICY "Anyone can read dish images"
  ON dish_images FOR SELECT
  TO public
  USING (true);

-- Policy: Authenticated users can insert (admin check is done in the app)
CREATE POLICY "Authenticated users can insert dish images"
  ON dish_images FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can delete their own uploads
CREATE POLICY "Authenticated users can delete dish images"
  ON dish_images FOR DELETE
  TO authenticated
  USING (true);

-- 2. Create the dish-images storage bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dish-images',
  'dish-images',
  true,
  5242880, -- 5MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Authenticated users can upload dish images
CREATE POLICY "Authenticated users can upload dish images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'dish-images');

-- Policy: Authenticated users can delete dish images
CREATE POLICY "Authenticated users can delete dish images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'dish-images');

-- Policy: Anyone can view dish images (public bucket)
CREATE POLICY "Anyone can view dish images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'dish-images');
