import { createClient } from '@supabase/supabase-js';
import type { Session } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hwtsyigwsucpefadznnp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3dHN5aWd3c3VjcGVmYWR6bm5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwODcwOTgsImV4cCI6MjA4NTY2MzA5OH0.EnqHcTqoPN1pfSEUggwm_mMUNWME8kNcih5EvB4JlD4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function fetchCities() {
  const { data, error } = await supabase
    .from('cities')
    .select('*')
    .eq('is_active', true)
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

// Save email signup to Supabase
export async function saveEmailSignup(email: string, city?: string) {
  const { error } = await supabase
    .from('email_signups')
    .insert({ email, city: city || null, signed_up_at: new Date().toISOString() });

  if (error) {
    console.error('Error saving email signup:', error);
    return false;
  }
  return true;
}

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================

export async function fetchEmailSignups() {
  const { data, error } = await supabase
    .from('email_signups')
    .select('*')
    .order('signed_up_at', { ascending: false });

  if (error) {
    console.error('Error fetching signups:', error);
    return [];
  }
  return data || [];
}

export async function fetchAllCities() {
  const { data, error } = await supabase
    .from('cities')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching all cities:', error);
    return [];
  }
  return data || [];
}

export async function toggleCityActive(cityId: string, isActive: boolean) {
  const { error } = await supabase
    .from('cities')
    .update({ is_active: isActive })
    .eq('id', cityId);

  if (error) {
    console.error('Error toggling city:', error);
    return false;
  }
  return true;
}

// ============================================================================
// AUTH FUNCTIONS
// ============================================================================

export async function authSignUp(email: string, password: string, name?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name || '' } },
  });
  return { data, error };
}

export async function authSignIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function authSignOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function authGetSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function authOnStateChange(callback: (session: Session | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
}
