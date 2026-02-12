-- Fix crew_trips RLS — restrict UPDATE to authenticated users, DELETE to creator only
-- Run in Supabase SQL Editor (Dashboard > SQL Editor > New Query > Run)

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Anyone can create crew trips" ON crew_trips;
DROP POLICY IF EXISTS "Anyone can update crew trips" ON crew_trips;
DROP POLICY IF EXISTS "Anyone can delete crew trips" ON crew_trips;

-- Keep open SELECT (needed so anyone can look up a crew code to join)
-- "Anyone can view crew trips" policy already exists — leave it

-- Only logged-in users can create crew trips
CREATE POLICY "Authenticated users can create crew trips" ON crew_trips
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Only logged-in users can update crew trips (collaborative editing)
CREATE POLICY "Authenticated users can update crew trips" ON crew_trips
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Only the creator can delete a crew trip
CREATE POLICY "Creator can delete crew trips" ON crew_trips
  FOR DELETE USING (auth.uid() = created_by);
