import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hwtsyigwsucpefadznnp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3dHN5aWd3c3VjcGVmYWR6bm5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwODcwOTgsImV4cCI6MjA4NTY2MzA5OH0.EnqHcTqoPN1pfSEUggwm_mMUNWME8kNcih5EvB4JlD4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function fetchCities() {
  const { data, error } = await supabase
    .from('cities')
    .select('*')
    .eq('is_active', true)
    .order('region')
    .order('name');
  
  if (error) {
    console.error('Error fetching cities:', error);
    return [];
  }
  return data || [];
}

export async function fetchPlacesByCity(cityId: string) {
  const { data, error } = await supabase
    .from('places')
    .select('*')
    .eq('city_id', cityId)
    .eq('is_active', true)
    .order('popularity_score', { ascending: false });
  
  if (error) {
    console.error('Error fetching places:', error);
    return [];
  }
  return data || [];
}
