import { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Stop } from '../types';
import { saveReview } from '../supabase';

export default function QuickReviewPrompt({ stop }: { stop: Stop }) {
  const { addQuickReview, setReviewPromptStopId, citySlug, user } = useApp();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const name = stop.place?.name || stop.event?.name || 'this stop';
  const placeId = stop.place?.placeId;

  const handleSave = () => {
    addQuickReview(stop.id, rating, comment || undefined);

    // Also save to Supabase if it's a place with a rating
    if (placeId && rating > 0 && user) {
      saveReview(placeId, citySlug, rating, comment || '', []).catch(() => {});
    }
  };

  const handleSkip = () => {
    setReviewPromptStopId(null);
  };

  return (
    <div className="fixed inset-0 bg-bg-modal-overlay-deep z-[999] flex items-end justify-center" onClick={handleSkip}>
      <div
        className="bg-bg-surface rounded-t-3xl max-w-[430px] w-full border border-border-subtle border-b-0"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-8">
          {/* Handle bar */}
          <div className="flex justify-center mb-4">
            <div className="w-10 h-1 rounded-full bg-border-medium" />
          </div>

          <div className="text-center mb-4">
            <div className="text-lg font-semibold text-text-primary">How was {name}?</div>
            <div className="text-xs text-text-tertiary mt-0.5">Quick rating helps us plan better</div>
          </div>

          {/* Star rating */}
          <div className="flex justify-center gap-2 mb-4">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                onClick={() => setRating(rating === star ? 0 : star)}
                className="bg-transparent border-none cursor-pointer p-1 text-2xl"
                aria-label={`${star} star${star !== 1 ? 's' : ''}`}
              >
                {star <= rating ? '\u{2B50}' : '\u{2606}'}
              </button>
            ))}
          </div>

          {/* Optional comment */}
          <input
            type="text"
            placeholder="Quick thought (optional)"
            value={comment}
            onChange={e => setComment(e.target.value)}
            maxLength={120}
            className="input-field w-full mb-4 text-sm"
          />

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="flex-1 py-3 rounded-xl bg-transparent border border-border-medium text-text-secondary text-sm cursor-pointer"
            >
              Skip
            </button>
            <button
              onClick={handleSave}
              disabled={rating === 0}
              className="flex-1 py-3 rounded-xl btn-primary text-sm font-semibold cursor-pointer disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
