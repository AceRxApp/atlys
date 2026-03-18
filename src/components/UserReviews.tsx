import { useState, useEffect, useCallback } from 'react';
import { saveReview, fetchReviews as fetchSupabaseReviews } from '../supabase';
import type { Review } from '../supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UserReview {
  id: string;
  placeId: string;
  placeName: string;
  userId: string;
  userName: string;
  rating: number;
  text: string;
  createdAt: string;
}

interface UserReviewsProps {
  placeId: string;
  placeName: string;
  citySlug?: string;
  userId?: string;
  userName?: string;
}

// ─── localStorage helpers (fallback for offline / unauthenticated) ──────────

const STORAGE_KEY = 'nxstops_user_reviews';

function loadLocalReviews(): UserReview[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistLocalReviews(reviews: UserReview[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
  } catch {
    /* storage full — silently fail */
  }
}

/** Convert a Supabase Review row into our local UserReview shape */
function supabaseToLocal(r: Review): UserReview {
  return {
    id: r.id,
    placeId: r.place_id,
    placeName: '',
    userId: r.user_id,
    userName: r.user_id.slice(0, 8),
    rating: r.rating,
    text: r.review_text || '',
    createdAt: r.created_at,
  };
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = ((hash % 360) + 360) % 360;
  return `hsl(${hue}, 65%, 45%)`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function TappableStars({
  value,
  onChange,
  size = 'lg',
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: 'sm' | 'lg';
}) {
  const starSize = size === 'lg' ? 'text-2xl min-h-[44px] min-w-[44px] p-1' : 'text-[13px] p-0';
  const interactive = !!onChange;

  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) =>
        interactive ? (
          <button
            key={star}
            type="button"
            onClick={() => onChange!(value === star ? 0 : star)}
            aria-label={`${star} star${star !== 1 ? 's' : ''}`}
            className={`bg-transparent border-none cursor-pointer ${starSize} flex items-center justify-center ${
              star <= value ? 'text-accent-amber' : 'text-text-disabled'
            }`}
          >
            &#9733;
          </button>
        ) : (
          <span
            key={star}
            className={`${starSize} ${star <= value ? 'text-accent-amber' : 'text-text-disabled'}`}
          >
            &#9733;
          </span>
        ),
      )}
    </span>
  );
}

function AverageRatingBadge({ reviews }: { reviews: UserReview[] }) {
  if (reviews.length === 0) return null;
  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <span className="text-accent-amber text-sm">&#9733;</span>
        <span className="text-text-primary text-sm font-semibold">{avg.toFixed(1)}</span>
      </div>
      <span className="text-text-tertiary text-xs">
        ({reviews.length} NxStops review{reviews.length !== 1 ? 's' : ''})
      </span>
    </div>
  );
}

function ReviewItem({ review }: { review: UserReview }) {
  const initial = (review.userName || '?')[0].toUpperCase();

  return (
    <div className="flex items-start gap-2.5 py-3 border-b border-border-subtle last:border-b-0">
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
        style={{ background: avatarColor(review.userName) }}
      >
        {initial}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[13px] font-semibold text-text-primary truncate">
            {review.userName}
          </span>
          <span className="text-[11px] text-text-tertiary shrink-0">
            {timeAgo(review.createdAt)}
          </span>
        </div>
        <TappableStars value={review.rating} size="sm" />
        {review.text && (
          <p className="text-[13px] text-text-secondary leading-snug mt-1 break-words">
            {review.text}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function UserReviews({ placeId, placeName, citySlug, userId, userName }: UserReviewsProps) {
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formRating, setFormRating] = useState(0);
  const [formText, setFormText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load reviews — Supabase first, merge with any local-only reviews
  const refreshReviews = useCallback(async () => {
    // 1. Fetch from Supabase
    let supabaseReviews: UserReview[] = [];
    try {
      const rows = await fetchSupabaseReviews(placeId);
      supabaseReviews = rows.map(supabaseToLocal);
    } catch { /* offline or error — fall back to local */ }

    // 2. Load local reviews for this place
    const localAll = loadLocalReviews();
    const localForPlace = localAll.filter((r) => r.placeId === placeId);

    // 3. Merge: Supabase reviews take priority, add any local-only ones
    const supabaseIds = new Set(supabaseReviews.map((r) => r.id));
    const supabaseUserIds = new Set(supabaseReviews.map((r) => r.userId));
    const localOnly = localForPlace.filter(
      (r) => !supabaseIds.has(r.id) && !supabaseUserIds.has(r.userId),
    );
    const merged = [...supabaseReviews, ...localOnly]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setReviews(merged);
  }, [placeId]);

  useEffect(() => {
    refreshReviews();
  }, [refreshReviews]);

  // Check if the current user already reviewed this place
  const existingReview = userId
    ? reviews.find((r) => r.userId === userId)
    : undefined;

  const handleSubmit = async () => {
    if (formRating === 0 || !userId || !userName) return;

    setSubmitting(true);

    const newReview: UserReview = {
      id: generateId(),
      placeId,
      placeName,
      userId,
      userName,
      rating: formRating,
      text: formText.trim(),
      createdAt: new Date().toISOString(),
    };

    // 1. Always save locally as fallback
    const all = loadLocalReviews();
    const idx = all.findIndex((r) => r.placeId === placeId && r.userId === userId);
    if (idx !== -1) {
      all[idx] = newReview;
    } else {
      all.unshift(newReview);
    }
    persistLocalReviews(all);

    // 2. Sync to Supabase (best effort — works offline too via local fallback)
    if (citySlug) {
      try {
        await saveReview(placeId, citySlug, formRating, formText.trim(), []);
      } catch { /* offline — local save still succeeded */ }
    }

    // Reset form
    setFormRating(0);
    setFormText('');
    setShowForm(false);
    setSubmitting(false);
    refreshReviews();
  };

  const handleCancel = () => {
    setFormRating(0);
    setFormText('');
    setShowForm(false);
  };

  const charCount = formText.length;

  return (
    <div className="mb-4">
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="section-label !mb-0">NxStops Reviews</div>
        {!showForm && userId && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-transparent border border-amber-tint-border30 text-accent-amber rounded-lg px-3 py-[5px] text-xs cursor-pointer"
          >
            {existingReview ? 'Edit Review' : 'Write a Review'}
          </button>
        )}
      </div>

      {/* Average rating badge */}
      <AverageRatingBadge reviews={reviews} />

      {/* Inline review form */}
      {showForm && userId && userName && (
        <div className="mt-3 p-4 rounded-xl bg-bg-elevated border border-amber-tint-border15">
          <div className="text-[13px] font-semibold text-text-primary mb-2">
            {existingReview ? 'Update your review' : 'Your review'}
          </div>

          {/* Star rating */}
          <div className="flex items-center gap-1 mb-3">
            <TappableStars value={formRating} onChange={setFormRating} size="lg" />
            {formRating > 0 && (
              <span className="text-xs text-text-tertiary ml-1">
                {['', 'Poor', 'Fair', 'Good', 'Great', 'Amazing'][formRating]}
              </span>
            )}
          </div>

          {/* Text area */}
          <div className="relative mb-3">
            <textarea
              placeholder="Share your experience (optional, max 200 chars)"
              value={formText}
              onChange={(e) => {
                if (e.target.value.length <= 200) setFormText(e.target.value);
              }}
              maxLength={200}
              rows={3}
              className="w-full p-3 rounded-[10px] border border-border-strong bg-bg-input text-text-primary text-sm resize-none box-border outline-none"
            />
            <span
              className={`absolute bottom-2 right-3 text-[11px] ${
                charCount > 180 ? 'text-status-red' : 'text-text-tertiary'
              }`}
            >
              {charCount}/200
            </span>
          </div>

          {/* Photo placeholder */}
          <div className="flex items-center gap-2 mb-3 p-2.5 rounded-lg border border-dashed border-border-medium bg-bg-subtle">
            <span className="text-lg text-text-disabled">&#128247;</span>
            <span className="text-xs text-text-tertiary">Photo upload coming soon</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={formRating === 0 || submitting}
              className={`flex-1 py-2.5 rounded-[10px] border-none text-[13px] font-semibold cursor-pointer ${
                formRating > 0
                  ? 'bg-accent-gradient text-text-on-accent'
                  : 'bg-bg-subtle-strong text-text-tertiary'
              } ${submitting ? 'opacity-60' : 'opacity-100'}`}
            >
              {submitting
                ? 'Saving...'
                : existingReview
                  ? 'Update Review'
                  : 'Submit Review'}
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2.5 rounded-[10px] border border-border-medium bg-transparent text-text-tertiary text-[13px] cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Not logged in nudge */}
      {showForm && !userId && (
        <div className="mt-3 p-4 rounded-xl bg-bg-elevated border border-border-subtle text-center">
          <p className="text-sm text-text-secondary">Sign in to leave a review</p>
        </div>
      )}

      {/* Review list */}
      {reviews.length > 0 ? (
        <div className="mt-3">
          {reviews.map((review) => (
            <ReviewItem key={review.id} review={review} />
          ))}
        </div>
      ) : (
        !showForm && (
          <div className="mt-3 py-6 text-center rounded-xl bg-bg-elevated border border-border-subtle">
            <div className="text-2xl mb-2">&#9734;</div>
            <p className="text-sm text-text-secondary font-medium">Be the first to review!</p>
            <p className="text-xs text-text-tertiary mt-1">
              Share your experience at {placeName}
            </p>
          </div>
        )
      )}
    </div>
  );
}
