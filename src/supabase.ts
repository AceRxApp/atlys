import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Session } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { API_URL } from './utils/api';
import type { City } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Redirect URL for auth callbacks.
 * - Web: current origin (e.g. https://nxstops.com/)
 * - Native (Capacitor): custom URL scheme that iOS/Android can handle
 */
const AUTH_REDIRECT_URL = Capacitor.isNativePlatform()
  ? 'nxstops://auth-callback/'
  : `${window.location.origin}/`;

export async function fetchCities(): Promise<City[]> {
  const { data, error } = await supabase
    .from('cities')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching cities:', error);
    return [];
  }

  // Map center_lat/center_lng to lat/lng for fallback coordinate resolution
  const cities = (data || []).map((c: Record<string, unknown>) => ({
    ...c,
    lat: (c.center_lat ?? c.lat ?? null) as number | null,
    lng: (c.center_lng ?? c.lng ?? null) as number | null,
  })) as City[];

  // Deduplicate: if "Washington" and "Washington D.C." both exist, keep the more specific one
  const names = new Set(cities.map(c => c.name.toLowerCase()));
  return cities.filter(c => {
    const name = c.name.toLowerCase();
    for (const other of names) {
      if (other !== name && other.startsWith(name) && other.length > name.length) {
        return false; // a more specific version exists
      }
    }
    return true;
  });
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
  // For native apps, email verification links should open the web app (not localhost)
  const emailRedirect = Capacitor.isNativePlatform()
    ? 'https://nxstops.com/'
    : `${window.location.origin}/`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name || '' },
      emailRedirectTo: emailRedirect,
    },
  });
  return { data, error };
}

export async function authResendVerification(email: string) {
  const emailRedirect = Capacitor.isNativePlatform()
    ? 'https://nxstops.com/'
    : `${window.location.origin}/`;
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: emailRedirect },
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

export async function authSignInWithGoogle() {
  if (Capacitor.isNativePlatform()) {
    // Native: get OAuth URL without redirecting, then open in system browser
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: AUTH_REDIRECT_URL,
        skipBrowserRedirect: true,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (data?.url) {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url: data.url });
    }
    return { data, error };
  }
  // Web: normal redirect flow
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: AUTH_REDIRECT_URL,
      queryParams: { prompt: 'select_account' },
    },
  });
  return { data, error };
}

export async function authSignInWithApple() {
  if (Capacitor.isNativePlatform()) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: AUTH_REDIRECT_URL,
        skipBrowserRedirect: true,
      },
    });
    if (data?.url) {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url: data.url });
    }
    return { data, error };
  }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: { redirectTo: AUTH_REDIRECT_URL },
  });
  return { data, error };
}

export async function authResetPassword(email: string) {
  const emailRedirect = Capacitor.isNativePlatform()
    ? 'https://nxstops.com/'
    : `${window.location.origin}/`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: emailRedirect,
  });
  return { error };
}

/**
 * Compress image to a Blob for Supabase Storage upload (reviews, dish images).
 */
function compressImage(file: File, maxSize: number, quality: number): Promise<Blob> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let w = img.naturalWidth, h = img.naturalHeight;
          if (w > maxSize || h > maxSize) {
            if (w > h) { h = Math.round((h / w) * maxSize); w = maxSize; }
            else { w = Math.round((w / h) * maxSize); h = maxSize; }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(file); return; }
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob(
            blob => resolve(blob || file),
            'image/jpeg',
            quality,
          );
        } catch { resolve(file); }
      };
      img.onerror = () => resolve(file);
      img.src = reader.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

/**
 * Compress image to a square JPEG base64 data URL for avatar.
 * Uses createImageBitmap (reliable for large iOS photos) with FileReader fallback.
 */
async function compressToDataUrl(file: File, maxSize = 256, quality = 0.7): Promise<string> {
  const canvas = document.createElement('canvas');
  let imgWidth: number, imgHeight: number;
  let drawSource: CanvasImageSource;

  if (typeof createImageBitmap === 'function') {
    const bmp = await createImageBitmap(file);
    imgWidth = bmp.width;
    imgHeight = bmp.height;
    drawSource = bmp;
  } else {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Failed to load image'));
        image.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
    imgWidth = img.naturalWidth;
    imgHeight = img.naturalHeight;
    drawSource = img;
  }

  const cropSize = Math.min(imgWidth, imgHeight);
  const sx = (imgWidth - cropSize) / 2;
  const sy = (imgHeight - cropSize) / 2;
  const outSize = Math.min(cropSize, maxSize);
  canvas.width = outSize;
  canvas.height = outSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(drawSource, sx, sy, cropSize, cropSize, 0, 0, outSize, outSize);
  if ('close' in drawSource && typeof (drawSource as ImageBitmap).close === 'function') {
    (drawSource as ImageBitmap).close();
  }
  return canvas.toDataURL('image/jpeg', quality);
}

export async function uploadAvatar(_userId: string, file: File): Promise<{ url: string | null; error: string | null }> {
  try {
    // Compress to base64 data URL (~15-30KB for 256x256 JPEG)
    const dataUrl = await compressToDataUrl(file);

    // Store in localStorage for instant access
    localStorage.setItem('nxstops_avatar_url', dataUrl);

    // Verify the write actually persisted
    const stored = localStorage.getItem('nxstops_avatar_url');
    if (!stored || !stored.startsWith('data:image/')) {
      return { url: null, error: 'Failed to save photo — storage may be full or unavailable' };
    }

    // Also save to Supabase user_metadata so it survives app reinstalls
    try {
      await supabase.auth.updateUser({ data: { avatar_url: dataUrl } });
    } catch { /* non-critical — localStorage is the primary store */ }

    return { url: dataUrl, error: null };
  } catch (err) {
    console.error('Avatar processing error:', err);
    return { url: null, error: err instanceof Error ? err.message : 'Failed to process image' };
  }
}

export async function authGetSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function authOnStateChange(callback: (session: Session | null) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    // Only react to meaningful auth events — ignore INITIAL_SESSION
    // (we already handle that with getSession) and TOKEN_REFRESHED
    // (which doesn't change the user). This prevents race conditions
    // where INITIAL_SESSION fires with null after a successful login.
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
      callback(session);
    }
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
  photo_urls: string[] | null;
  created_at: string;
}

export async function uploadReviewPhotos(files: File[]): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || files.length === 0) return [];

  const urls: string[] = [];
  for (const file of files.slice(0, 3)) {
    const compressed = await compressImage(file, 800, 0.75);
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error } = await supabase.storage
      .from('review-photos')
      .upload(fileName, compressed, { contentType: 'image/jpeg' });
    if (error) {
      console.error('Review photo upload error:', error);
      continue;
    }
    const { data: urlData } = supabase.storage.from('review-photos').getPublicUrl(fileName);
    urls.push(urlData.publicUrl);
  }
  return urls;
}

export async function saveReview(
  placeId: string,
  citySlug: string,
  rating: number,
  reviewText: string,
  tags: string[],
  photoUrls?: string[]
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
      photo_urls: photoUrls && photoUrls.length > 0 ? photoUrls : null,
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

  const response = await fetch(`${API_URL}/api/user-actions?action=delete-account`, {
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

  const response = await fetch(`${API_URL}/api/user-actions?action=report`, {
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
  // Strip heavy fields (photos array, hours, etc.) to keep payload under Supabase limits
  const leanDays: Record<number, unknown[]> = {};
  for (const [day, stops] of Object.entries(tripDays)) {
    leanDays[Number(day)] = (stops as Record<string, unknown>[]).map(s => {
      const place = s.place as Record<string, unknown> | undefined;
      return {
        ...s,
        addedAt: s.addedAt instanceof Date ? s.addedAt.toISOString() : s.addedAt,
        place: place ? {
          ...place,
          photoNames: undefined,
          hours: undefined,
          reviews: undefined,
        } : undefined,
      };
    });
  }
  const { error } = await supabase.from('shared_plans').insert({
    slug, city_slug: citySlug, city_label: cityLabel,
    trip_days: leanDays, day_title: dayTitle || null,
    shared_by: user?.id || null,
  });
  if (error) { console.error('Error creating shared plan:', error.message, error.details, error.hint); return false; }
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
// Community Routes
// ---------------------------------------------------------------------------

export async function publishRoute(
  slug: string, category: string, creatorName: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('shared_plans')
    .update({ is_published: true, category, creator_name: creatorName })
    .eq('slug', slug);
  if (error) { console.error('Error publishing route:', error); return false; }
  return true;
}

export async function fetchCommunityRoutes(
  citySlug?: string, limit = 20,
): Promise<{
  slug: string; city_slug: string; city_label: string; day_title: string | null;
  trip_days: Record<number, unknown[]>; view_count: number; likes_count: number;
  category: string | null; creator_name: string | null; created_at: string;
}[]> {
  let query = supabase
    .from('shared_plans')
    .select('slug, city_slug, city_label, day_title, trip_days, view_count, likes_count, category, creator_name, created_at')
    .eq('is_published', true)
    .order('view_count', { ascending: false })
    .limit(limit);

  if (citySlug) {
    query = query.eq('city_slug', citySlug);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as {
    slug: string; city_slug: string; city_label: string; day_title: string | null;
    trip_days: Record<number, unknown[]>; view_count: number; likes_count: number;
    category: string | null; creator_name: string | null; created_at: string;
  }[];
}

export async function incrementRouteLikes(slug: string): Promise<void> {
  const { data } = await supabase
    .from('shared_plans')
    .select('likes_count')
    .eq('slug', slug)
    .single();
  if (data) {
    await supabase
      .from('shared_plans')
      .update({ likes_count: (data.likes_count || 0) + 1 })
      .eq('slug', slug);
  }
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

// ---------------------------------------------------------------------------
// Admin Dish Images — custom photos for niche dishes
// ---------------------------------------------------------------------------

export interface DishImageRecord {
  id: string;
  dish_name: string;
  restaurant: string | null;
  image_url: string;
  uploaded_by: string | null;
  created_at: string;
}

export async function uploadDishImage(
  dishName: string, file: File, restaurant?: string,
): Promise<{ url: string | null; error: string | null }> {
  const compressed = await compressImage(file, 800, 0.85);
  const slug = dishName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const restSlug = restaurant ? restaurant.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : 'general';
  const path = `${restSlug}/${slug}/${Date.now()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from('dish-images')
    .upload(path, compressed, { upsert: false, contentType: 'image/jpeg' });

  if (uploadError) {
    console.error('Dish image upload error:', uploadError);
    return { url: null, error: uploadError.message };
  }

  const { data: urlData } = supabase.storage.from('dish-images').getPublicUrl(path);
  const publicUrl = urlData.publicUrl;

  const { data: { user } } = await supabase.auth.getUser();

  const { error: insertError } = await supabase.from('dish_images').insert({
    dish_name: dishName.toLowerCase().trim(),
    restaurant: restaurant?.trim() || null,
    image_url: publicUrl,
    uploaded_by: user?.id || null,
  });

  if (insertError) {
    console.error('Dish image metadata insert error:', insertError);
    return { url: publicUrl, error: insertError.message };
  }

  return { url: publicUrl, error: null };
}

export async function fetchDishImages(): Promise<DishImageRecord[]> {
  const { data, error } = await supabase
    .from('dish_images')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching dish images:', error);
    return [];
  }
  return data || [];
}

export async function deleteDishImage(id: string, imageUrl: string): Promise<boolean> {
  // Extract storage path from URL
  const match = imageUrl.match(/dish-images\/(.+)$/);
  if (match) {
    await supabase.storage.from('dish-images').remove([match[1]]);
  }

  const { error } = await supabase
    .from('dish_images')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting dish image:', error);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// City Videos — admin-uploaded video clips per city
// ---------------------------------------------------------------------------

export interface CityVideoRecord {
  id: string;
  city_slug: string;
  video_url: string;
  thumbnail_url: string | null;
  caption: string;
  duration: number;
  sort_order: number;
  created_at: string;
}

export async function uploadCityVideo(
  citySlug: string,
  videoFile: File,
  caption: string,
  duration: number,
  thumbnailFile?: File,
): Promise<{ success: boolean; error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const slug = citySlug.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const ts = Date.now();
  const videoPath = `${slug}/${ts}-${videoFile.name.replace(/[^a-z0-9._-]/gi, '')}`;

  // Upload video to Supabase Storage
  const { error: videoErr } = await supabase.storage
    .from('city-videos')
    .upload(videoPath, videoFile, { upsert: false, contentType: videoFile.type || 'video/mp4' });

  if (videoErr) {
    console.error('City video upload error:', videoErr);
    return { success: false, error: videoErr.message };
  }

  const { data: videoUrlData } = supabase.storage.from('city-videos').getPublicUrl(videoPath);
  const videoUrl = videoUrlData.publicUrl;

  // Upload thumbnail if provided
  let thumbnailUrl: string | null = null;
  if (thumbnailFile) {
    const thumbPath = `${slug}/${ts}-thumb.jpg`;
    const compressed = await compressImage(thumbnailFile, 800, 0.85);
    const { error: thumbErr } = await supabase.storage
      .from('city-videos')
      .upload(thumbPath, compressed, { upsert: false, contentType: 'image/jpeg' });
    if (!thumbErr) {
      const { data: thumbUrlData } = supabase.storage.from('city-videos').getPublicUrl(thumbPath);
      thumbnailUrl = thumbUrlData.publicUrl;
    }
  }

  // Insert metadata row
  const { error: insertErr } = await supabase.from('city_videos').insert({
    city_slug: slug,
    video_url: videoUrl,
    thumbnail_url: thumbnailUrl,
    caption: caption.trim(),
    duration,
    uploaded_by: user.id,
  });

  if (insertErr) {
    console.error('City video metadata insert error:', insertErr);
    return { success: false, error: insertErr.message };
  }

  return { success: true, error: null };
}

export async function fetchCityVideos(citySlug?: string): Promise<CityVideoRecord[]> {
  let query = supabase
    .from('city_videos')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (citySlug) {
    query = query.eq('city_slug', citySlug.toLowerCase().replace(/\s+/g, '-'));
  }

  const { data, error } = await query.limit(100);
  if (error) {
    console.error('Error fetching city videos:', error);
    return [];
  }
  return data || [];
}

export async function deleteCityVideo(id: string, videoUrl: string, thumbnailUrl?: string | null): Promise<boolean> {
  // Remove video file from storage
  const videoMatch = videoUrl.match(/city-videos\/(.+)$/);
  if (videoMatch) {
    await supabase.storage.from('city-videos').remove([videoMatch[1]]);
  }
  // Remove thumbnail if exists
  if (thumbnailUrl) {
    const thumbMatch = thumbnailUrl.match(/city-videos\/(.+)$/);
    if (thumbMatch) {
      await supabase.storage.from('city-videos').remove([thumbMatch[1]]);
    }
  }

  const { error } = await supabase.from('city_videos').delete().eq('id', id);
  if (error) {
    console.error('Error deleting city video:', error);
    return false;
  }
  return true;
}
