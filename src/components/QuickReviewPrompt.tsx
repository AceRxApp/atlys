import { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import type { Stop } from '../types';
import { saveReview } from '../supabase';

function compressPhoto(file: File, maxSize = 400, quality = 0.6): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function QuickReviewPrompt({ stop }: { stop: Stop }) {
  const { addQuickReview, setReviewPromptStopId, citySlug, user, dayPlan, checkIns, getTransportInfo, checkedInCount, totalStopsToday } = useApp();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [journalNote, setJournalNote] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const name = stop.place?.name || stop.event?.name || 'this stop';
  const placeId = stop.place?.placeId;

  // Post-stop closure: find next stop and compute stats
  const stopIndex = dayPlan.findIndex(s => s.id === stop.id);
  const nextStop = stopIndex >= 0 && stopIndex < dayPlan.length - 1 ? dayPlan[stopIndex + 1] : null;
  const nextStopName = nextStop ? (nextStop.place?.name || nextStop.event?.name || 'Next stop') : null;
  const nextStopTransport = nextStop ? getTransportInfo(stop, nextStop) : null;

  // Fun stat based on check-in count
  const getFunStat = () => {
    if (checkedInCount >= totalStopsToday) return 'You crushed every stop today!';
    if (checkedInCount >= 4) return 'Explorer level: seasoned traveler';
    if (checkedInCount === 3) return 'Hat trick! 3 stops explored';
    if (checkedInCount === 2) return 'Getting warmed up!';
    return 'First stop down!';
  };

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files).slice(0, 3 - photos.length)) {
      try {
        const compressed = await compressPhoto(file);
        setPhotos(prev => [...prev.slice(0, 2), compressed]);
      } catch { /* skip */ }
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSave = () => {
    addQuickReview(stop.id, rating, comment || undefined, photos.length > 0 ? photos : undefined, journalNote || undefined);

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

          {/* Mini recap stats */}
          <div className="flex justify-around py-2 px-3 mb-3 rounded-xl bg-bg-subtle/50 border border-border-subtle">
            <div className="text-center">
              <div className="text-sm font-bold text-status-green">{checkedInCount}/{totalStopsToday}</div>
              <div className="text-[10px] text-text-tertiary">visited</div>
            </div>
            <div className="w-px bg-border-subtle" />
            <div className="text-center px-2">
              <div className="text-[11px] font-semibold text-accent-amber">{getFunStat()}</div>
            </div>
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

          {/* Photo picker */}
          <div className="flex gap-2 mb-3">
            {photos.map((src, i) => (
              <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border-subtle">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-bg-modal-overlay text-white text-[10px] border-none cursor-pointer flex items-center justify-center"
                >{'\u2715'}</button>
              </div>
            ))}
            {photos.length < 3 && (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-16 h-16 rounded-lg border border-dashed border-border-medium bg-bg-subtle flex flex-col items-center justify-center cursor-pointer text-text-tertiary text-xs gap-0.5"
              >
                <span className="text-lg">{'\u{1F4F7}'}</span>
                <span>Add</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleAddPhoto} />
          </div>

          {/* Journal note */}
          <textarea
            placeholder="Add a note... (optional)"
            value={journalNote}
            onChange={e => setJournalNote(e.target.value)}
            maxLength={200}
            rows={2}
            className="input-field w-full mb-3 text-sm resize-none"
          />

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

          {/* Next stop teaser */}
          {nextStopName && (
            <div className="mt-4 pt-3 border-t border-border-subtle">
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-tertiary">Up next:</span>
                <span className="text-xs font-semibold text-text-primary truncate">{nextStopName}</span>
                {nextStopTransport && (
                  <span className="text-[11px] text-text-tertiary ml-auto shrink-0">
                    {nextStopTransport.emoji} {nextStopTransport.walkMinutes}min
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
