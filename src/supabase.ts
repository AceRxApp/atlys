import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Session } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

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
    options: {
      data: { full_name: name || '' },
      emailRedirectTo: `${window.location.origin}/`,
    },
  });
  return { data, error };
}

export async function authResendVerification(email: string) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: `${window.location.origin}/` },
  });
  return { error };
}

export async function authSignIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function authSignOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function authResetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/`,
  });
  return { error };
}

async function compressImage(file: File, maxSize = 512, quality = 0.8): Promise<File> {
  if (file.size <= 100_000) return file;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], file.name, { type: 'image/jpeg' }) : file),
        'image/jpeg',
        quality,
      );
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

export async function uploadAvatar(userId: string, file: File): Promise<{ url: string | null; error: string | null }> {
  const compressed = await compressImage(file);
  const path = `${userId}/avatar.jpg`;

  // Upload compressed image to Supabase Storage (overwrites if exists)
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, compressed, { upsert: true, contentType: 'image/jpeg' });

  if (uploadError) {
    console.error('Avatar upload error:', uploadError);
    return { url: null, error: uploadError.message };
  }

  // Get public URL
  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
  const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`; // cache-bust

  // Save to user metadata
  const { error: updateError } = await supabase.auth.updateUser({
    data: { avatar_url: publicUrl },
  });

  if (updateError) {
    console.error('Avatar metadata update error:', updateError);
    return { url: publicUrl, error: updateError.message };
  }

  return { url: publicUrl, error: null };
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

// ============================================================================
// REVIEWS & COMMUNITY TAGS
// ============================================================================

export interface Review {
  id: string;
  user_id: string;
  place_id: string;
  city_slug: string;
  rating: number;
  review_text: string | null;
  tags: string[];
  created_at: string;
}

export async function saveReview(
  placeId: string,
  citySlug: string,
  rating: number,
  reviewText: string,
  tags: string[]
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('Error saving review: user not authenticated');
    return { success: false, error: { message: 'Not authenticated' } };
  }

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      place_id: placeId,
      city_slug: citySlug,
      user_id: user.id,
      rating,
      review_text: reviewText || null,
      tags,
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving review:', error);
    return { success: false, error };
  }

  // Also insert community tags
  if (tags.length > 0) {
    const tagRows = tags.map(tag => ({
      place_id: placeId,
      city_slug: citySlug,
      user_id: user.id,
      tag,
    }));
    await supabase.from('place_tags').upsert(tagRows, { onConflict: 'place_id,user_id,tag' });
  }

  return { success: true, data };
}

export async function fetchReviews(placeId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('place_id', placeId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }
  return data || [];
}

export async function fetchPlaceTagCounts(placeIds: string[]): Promise<Record<string, Record<string, number>>> {
  if (placeIds.length === 0) return {};

  const { data, error } = await supabase
    .from('place_tags')
    .select('place_id, tag')
    .in('place_id', placeIds);

  if (error) {
    console.error('Error fetching tag counts:', error);
    return {};
  }

  const result: Record<string, Record<string, number>> = {};
  for (const row of data || []) {
    if (!result[row.place_id]) result[row.place_id] = {};
    result[row.place_id][row.tag] = (result[row.place_id][row.tag] || 0) + 1;
  }
  return result;
}

// ============================================================================
// CREW MODE — SHARED TRIP PLANS
// ============================================================================

export interface CrewTrip {
  id: string;
  crew_code: string;
  city_slug: string;
  city_label: string;
  trip_days: Record<string, unknown[]>;
  created_by: string | null;
  member_count: number;
  updated_at: string;
  created_at: string;
}

export async function createCrewTrip(
  crewCode: string,
  citySlug: string,
  cityLabel: string,
  tripDays: Record<number, unknown[]>
): Promise<CrewTrip | null> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('crew_trips')
    .insert({
      crew_code: crewCode,
      city_slug: citySlug,
      city_label: cityLabel,
      trip_days: tripDays,
      created_by: user?.id ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating crew trip:', error);
    return null;
  }
  return data;
}

export async function loadCrewTrip(crewCode: string): Promise<CrewTrip | null> {
  const { data, error } = await supabase
    .from('crew_trips')
    .select('*')
    .eq('crew_code', crewCode)
    .single();

  if (error) {
    console.error('Error loading crew trip:', error);
    return null;
  }
  return data;
}

export async function updateCrewTripDays(
  crewCode: string,
  tripDays: Record<number, unknown[]>
): Promise<boolean> {
  const { error } = await supabase
    .from('crew_trips')
    .update({ trip_days: tripDays, updated_at: new Date().toISOString() })
    .eq('crew_code', crewCode);

  if (error) {
    console.error('Error updating crew trip:', error);
    return false;
  }
  return true;
}

export function subscribeToCrewTrip(
  crewCode: string,
  onUpdate: (tripDays: Record<string, unknown[]>) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`crew_${crewCode}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'crew_trips',
        filter: `crew_code=eq.${crewCode}`,
      },
      (payload) => {
        if (payload.new && (payload.new as CrewTrip).trip_days) {
          onUpdate((payload.new as CrewTrip).trip_days);
        }
      }
    )
    .subscribe();

  return channel;
}

export function unsubscribeFromCrewTrip(channel: RealtimeChannel) {
  supabase.removeChannel(channel);
}

// ============================================================================
// ACCOUNT DELETION
// ============================================================================

export async function deleteAccount(): Promise<{ success: boolean; error?: string }> {
  const session = await authGetSession();
  if (!session) return { success: false, error: 'Not authenticated' };

  const response = await fetch('/api/account-delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    return { success: false, error: data.error || 'Failed to delete account' };
  }

  // Sign out locally after server-side deletion
  await supabase.auth.signOut();
  return { success: true };
}

// ============================================================================
// SAVED PLACES SYNC
// ============================================================================

export async function fetchSavedPlaces(): Promise<{ place_id: string; place_data: Record<string, unknown> }[]> {
  const { data, error } = await supabase
    .from('saved_places')
    .select('place_id, place_data')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching saved places:', error);
    return [];
  }
  return data || [];
}

export async function upsertSavedPlaces(places: { placeId: string; data: Record<string, unknown> }[]): Promise<boolean> {
  if (places.length === 0) return true;
  const rows = places.map(p => ({
    place_id: p.placeId,
    place_data: p.data,
  }));
  const { error } = await supabase
    .from('saved_places')
    .upsert(rows, { onConflict: 'user_id,place_id' });

  if (error) {
    console.error('Error upserting saved places:', error);
    return false;
  }
  return true;
}

export async function deleteSavedPlace(placeId: string): Promise<boolean> {
  const { error } = await supabase
    .from('saved_places')
    .delete()
    .eq('place_id', placeId);

  if (error) {
    console.error('Error deleting saved place:', error);
    return false;
  }
  return true;
}

// ============================================================================
// CONTENT REPORTS
// ============================================================================

export async function submitReport(
  contentType: 'review' | 'place_tag' | 'place',
  contentId: string,
  reason: 'spam' | 'inappropriate' | 'harassment' | 'misinformation' | 'other',
  details?: string
): Promise<{ success: boolean; error?: string }> {
  const session = await authGetSession();
  if (!session) return { success: false, error: 'Not authenticated' };

  const response = await fetch('/api/report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ content_type: contentType, content_id: contentId, reason, details }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    return { success: false, error: data.error || 'Failed to submit report' };
  }

  return { success: true };
}

export async function fetchReports(): Promise<{ id: string; reporter_id: string; content_type: string; content_id: string; reason: string; details: string | null; status: string; created_at: string }[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching reports:', error);
    return [];
  }
  return data || [];
}

export async function updateReportStatus(reportId: string, status: 'resolved' | 'dismissed'): Promise<boolean> {
  const { error } = await supabase
    .from('reports')
    .update({ status, resolved_at: new Date().toISOString() })
    .eq('id', reportId);

  if (error) {
    console.error('Error updating report:', error);
    return false;
  }
  return true;
}

export async function deleteReviewById(reviewId: string): Promise<boolean> {
  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId);

  if (error) {
    console.error('Error deleting review:', error);
    return false;
  }
  return true;
}

// =============================================================================
// USER CONTRIBUTED STOPS
// =============================================================================

export interface UserStop {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  category: string;
  lat: number;
  lng: number;
  city_slug: string;
  photo_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  upvotes: number;
  created_at: string;
}

export async function createUserStop(stop: {
  name: string;
  description?: string;
  category: string;
  lat: number;
  lng: number;
  city_slug: string;
}): Promise<{ success: boolean; data?: UserStop; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('user_stops')
    .insert({
      user_id: session.user.id,
      name: stop.name.trim(),
      description: stop.description?.trim() || null,
      category: stop.category,
      lat: stop.lat,
      lng: stop.lng,
      city_slug: stop.city_slug,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating user stop:', error);
    return { success: false, error: error.message };
  }
  return { success: true, data };
}

export async function fetchUserStops(citySlug: string): Promise<UserStop[]> {
  const { data, error } = await supabase
    .from('user_stops')
    .select('*')
    .eq('city_slug', citySlug)
    .order('upvotes', { ascending: false });

  if (error) {
    console.error('Error fetching user stops:', error);
    return [];
  }
  return data || [];
}

export async function fetchPendingStops(): Promise<UserStop[]> {
  const { data, error } = await supabase
    .from('user_stops')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching pending stops:', error);
    return [];
  }
  return data || [];
}

export async function updateStopStatus(stopId: string, status: 'approved' | 'rejected'): Promise<boolean> {
  const { error } = await supabase
    .from('user_stops')
    .update({ status })
    .eq('id', stopId);

  if (error) {
    console.error('Error updating stop status:', error);
    return false;
  }
  return true;
}

export async function deleteUserStop(stopId: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_stops')
    .delete()
    .eq('id', stopId);

  if (error) {
    console.error('Error deleting user stop:', error);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Stop Ratings
// ---------------------------------------------------------------------------

export async function saveStopRating(placeId: string, citySlug: string, rating: 'up' | 'down'): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase.from('stop_ratings').upsert({
    user_id: user.id, place_id: placeId, city_slug: citySlug, rating,
  }, { onConflict: 'user_id,place_id,city_slug' });
  if (error) { console.error('Error saving stop rating:', error); return false; }
  return true;
}

// ---------------------------------------------------------------------------
// Shared Plans
// ---------------------------------------------------------------------------

export async function createSharedPlan(
  slug: string, citySlug: string, cityLabel: string,
  tripDays: Record<number, unknown[]>, dayTitle?: string,
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('shared_plans').insert({
    slug, city_slug: citySlug, city_label: cityLabel,
    trip_days: tripDays, day_title: dayTitle || null,
    shared_by: user?.id || null,
  });
  if (error) { console.error('Error creating shared plan:', error); return false; }
  return true;
}

export async function fetchSharedPlan(slug: string) {
  const { data, error } = await supabase
    .from('shared_plans')
    .select('*')
    .eq('slug', slug)
    .single();
  if (error || !data) return null;
  // Increment view count (fire and forget)
  supabase.from('shared_plans').update({ view_count: (data.view_count || 0) + 1 }).eq('slug', slug).then(() => {});
  return data;
}

// ---------------------------------------------------------------------------
// Push Subscriptions
// ---------------------------------------------------------------------------

export async function savePushSubscription(
  subscription: PushSubscription, citySlug?: string,
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const keys = subscription.toJSON().keys;
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: user.id, endpoint: subscription.endpoint,
    p256dh: keys?.p256dh || '', auth: keys?.auth || '',
    city_slug: citySlug || null,
  }, { onConflict: 'user_id,endpoint' });
  if (error) { console.error('Error saving push subscription:', error); return false; }
  return true;
}

export async function scheduleNotification(
  triggerType: string, triggerDate: string, citySlug: string,
  payload: { title: string; body: string; url: string },
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase.from('scheduled_notifications').insert({
    user_id: user.id, trigger_type: triggerType, trigger_date: triggerDate,
    city_slug: citySlug, payload,
  });
  if (error) { console.error('Error scheduling notification:', error); return false; }
  return true;
}
