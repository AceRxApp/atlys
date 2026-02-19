import { useCallback, useState } from 'react';
import { track } from '@vercel/analytics';
import { useApp } from '../context/AppContext';
import { useModalA11y } from '../hooks/useModalA11y';
import { CloseIcon, DirectionsIcon, PhoneIcon, WebsiteIcon, ShareIcon } from './icons';
import { PriceDots, StarRating } from './ui';
import { formatDistance, getHoursStatus } from '../services/places';
import { COMMUNITY_TAGS } from '../data';
import { submitReport } from '../supabase';
import { getPlaceBookingUrl } from '../data/bookingLinks';
import CurrencyMiniConverter from './CurrencyMiniConverter';
import type { Place } from '../services/places';

export default function PlaceDetailModal({ place }: { place: Place }) {
  const {
    setSelectedPlace,
    isInPlan,
    addToPlan,
    removeFromPlan,
    tripDays,
    toggleSaved,
    isSaved,
    sharePlace,
    isReservable,
    isBookable,
    getBookingUrl,
    getSafetyIndicators,
    getDistanceReference,
    useMiles,
    placeTagsCache,
    activePhotoIndex,
    setActivePhotoIndex,
    placeReviews,
    showReviewForm,
    setShowReviewForm,
    reviewRating,
    setReviewRating,
    reviewText,
    setReviewText,
    reviewTags,
    setReviewTags,
    reviewSubmitting,
    handleSubmitReview,
    reviewPhotos,
    setReviewPhotos,
    user,
    requireAuth,
    setDishLensContext,
    setScreen,
    cityLabel,
  } = useApp();
  const closeModal = useCallback(() => setSelectedPlace(null), [setSelectedPlace]);
  const modalRef = useModalA11y(true, closeModal);

  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState<string>('');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [showCurrencyConverter, setShowCurrencyConverter] = useState(false);

  const hoursStatus = getHoursStatus(place.hours, place.openNow);
  const inPlan = isInPlan(place.placeId);

  // Build photo URLs from photoNames (up to 10)
  const galleryPhotos = (place.photoNames || []).slice(0, 10).map(
    (name) => `/api/places?action=photo&name=${encodeURIComponent(name)}&maxWidth=800`
  );
  const hasMultiplePhotos = galleryPhotos.length > 1;

  const goToPhoto = (dir: 'prev' | 'next') => {
    if (dir === 'prev' && activePhotoIndex > 0) setActivePhotoIndex(activePhotoIndex - 1);
    if (dir === 'next' && activePhotoIndex < galleryPhotos.length - 1) setActivePhotoIndex(activePhotoIndex + 1);
  };

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      className="modal-backdrop modal-overlay outline-none"
      role="dialog"
      aria-modal="true"
      aria-label={`Details for ${place.name}`}
      onClick={closeModal}
    >
      <div
        className="modal-sheet modal-sheet-body !max-h-[90vh] overflow-x-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Photo Gallery / Hero */}
        {galleryPhotos.length > 0 && (
          <div className="relative w-full h-[250px] rounded-t-3xl overflow-hidden bg-bg-elevated">
            {/* Sliding photo strip */}
            <div
              className="flex h-full transition-transform duration-[350ms] ease-out"
              style={{
                width: `${galleryPhotos.length * 100}%`,
                transform: `translateX(-${activePhotoIndex * (100 / galleryPhotos.length)}%)`,
              }}
            >
              {galleryPhotos.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`${place.name} photo ${i + 1} of ${galleryPhotos.length}`}
                  loading="lazy"
                  decoding="async"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  className="h-full object-cover block shrink-0"
                  style={{ width: `${100 / galleryPhotos.length}%` }}
                />
              ))}
            </div>

            {/* Gradient overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: `linear-gradient(to bottom, transparent 50%, var(--bg-surface))` }}
            />

            {/* Tap zones for prev/next */}
            {hasMultiplePhotos && (
              <>
                {activePhotoIndex > 0 && (
                  <button onClick={() => goToPhoto('prev')}
                    aria-label="Previous photo"
                    className="absolute left-0 top-0 w-[40%] h-full bg-transparent border-none cursor-pointer z-[1]" />
                )}
                {activePhotoIndex < galleryPhotos.length - 1 && (
                  <button onClick={() => goToPhoto('next')}
                    aria-label="Next photo"
                    className="absolute right-0 top-0 w-[40%] h-full bg-transparent border-none cursor-pointer z-[1]" />
                )}
              </>
            )}

            {/* Prev/Next arrow buttons */}
            {hasMultiplePhotos && activePhotoIndex > 0 && (
              <button onClick={() => goToPhoto('prev')}
                aria-label="Previous photo"
                className="absolute left-3 top-1/2 -translate-y-1/2 z-[2] bg-bg-photo-button backdrop-blur-[8px] border-none rounded-full w-9 h-9 flex items-center justify-center cursor-pointer text-text-primary text-base font-bold">
                &#8249;
              </button>
            )}
            {hasMultiplePhotos && activePhotoIndex < galleryPhotos.length - 1 && (
              <button onClick={() => goToPhoto('next')}
                aria-label="Next photo"
                className="absolute right-3 top-1/2 -translate-y-1/2 z-[2] bg-bg-photo-button backdrop-blur-[8px] border-none rounded-full w-9 h-9 flex items-center justify-center cursor-pointer text-text-primary text-base font-bold">
                &#8250;
              </button>
            )}

            {/* Close button */}
            <button onClick={() => setSelectedPlace(null)}
              aria-label="Close"
              className="absolute top-3 right-3 z-[3] bg-bg-photo-button border-none rounded-full w-9 h-9 flex items-center justify-center cursor-pointer text-text-primary backdrop-blur-[8px]">
              <CloseIcon />
            </button>

            {/* Photo counter + dots */}
            {hasMultiplePhotos && (
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-[2] flex gap-[5px] items-center bg-bg-photo-counter rounded-xl px-2.5 py-1 backdrop-blur-[8px]">
                {galleryPhotos.map((_, i) => (
                  <button
                    key={i}
                    aria-label={`Go to photo ${i + 1}`}
                    onClick={() => setActivePhotoIndex(i)}
                    className={`h-2 rounded-[4px] border-none p-0 cursor-pointer transition-all duration-200 ease-in-out ${
                      i === activePhotoIndex
                        ? 'w-3.5 bg-accent-amber'
                        : 'w-2 bg-[rgba(255,255,255,0.4)]'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="px-5 pt-5 pb-[120px]">
          {galleryPhotos.length === 0 && (
            <div className="flex justify-end mb-3">
              <button onClick={() => setSelectedPlace(null)}
                aria-label="Close"
                className="bg-transparent border-none text-text-tertiary cursor-pointer p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center">
                <CloseIcon />
              </button>
            </div>
          )}

          {/* Name */}
          <h2 className="text-2xl font-bold mb-2">{place.name}</h2>

          {/* Meta row */}
          <div className="flex items-center gap-2.5 flex-wrap mb-3">
            {place.categoryDisplay && (
              <span className="px-2.5 py-1 bg-amber-tint-bg15 text-accent-amber rounded-lg text-xs font-medium">
                {place.categoryDisplay}
              </span>
            )}
            {place.rating > 0 && <StarRating rating={place.rating} count={place.reviewCount} />}
            <PriceDots level={place.priceLevel} />
          </div>

          {/* Hours status */}
          <div className={`inline-flex items-center gap-1.5 py-2 px-3.5 rounded-[10px] mb-4 border ${
            place.openNow
              ? 'bg-green-tint-bg border-green-tint-border'
              : 'bg-red-tint-bg border-red-tint-border'
          }`}>
            <div className={`w-2 h-2 rounded-full ${place.openNow ? 'bg-status-green' : 'bg-status-red'}`} />
            <span className={`text-[13px] font-medium ${place.openNow ? 'text-status-green' : 'text-status-red'}`}>
              {hoursStatus.text}
            </span>
            {hoursStatus.urgent && (
              <span className="text-xs text-status-red font-semibold">Hurry!</span>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-4 gap-2 mb-5">
            {place.googleMapsUrl && (
              <a href={place.googleMapsUrl} target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-bg-subtle-medium text-text-secondary no-underline text-xs">
                <DirectionsIcon />
                Directions
              </a>
            )}
            {place.phone && (
              <a href={`tel:${place.phone}`}
                className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-bg-subtle-medium text-text-secondary no-underline text-xs">
                <PhoneIcon />
                Call
              </a>
            )}
            {place.website && (
              <a href={place.website} target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-bg-subtle-medium text-text-secondary no-underline text-xs">
                <WebsiteIcon />
                Website
              </a>
            )}
            <button onClick={() => toggleSaved(place)}
              aria-label={isSaved(place.placeId) ? 'Remove from saved' : 'Save place'}
              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl min-h-[44px] border-none cursor-pointer text-xs ${
                isSaved(place.placeId)
                  ? 'bg-amber-tint-bg15 text-accent-amber'
                  : 'bg-bg-subtle-medium text-text-secondary'
              }`}>
              <span className="text-base">{isSaved(place.placeId) ? '\u2665' : '\u2661'}</span>
              {isSaved(place.placeId) ? 'Saved' : 'Save'}
            </button>
            <button onClick={() => sharePlace(place)}
              aria-label="Share place"
              className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-bg-subtle-medium text-text-secondary border-none cursor-pointer text-xs min-h-[44px]">
              <ShareIcon />
              Share
            </button>
            <button onClick={() => setShowCurrencyConverter(!showCurrencyConverter)}
              aria-label="Currency converter"
              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-none cursor-pointer text-xs min-h-[44px] ${
                showCurrencyConverter ? 'bg-amber-tint-bg15 text-accent-amber' : 'bg-bg-subtle-medium text-text-secondary'
              }`}>
              <span className="text-base">{'\u{1F4B1}'}</span>
              Currency
            </button>
            {/restaurant|cafe|bakery|bar|food|pizza|sushi|burger|coffee|tea|ice.cream|dessert|brunch|bistro|diner|grill|bbq|seafood|steak/i.test(place.category || '') && (
              <button onClick={() => {
                setDishLensContext({ dish: undefined, city: cityLabel, restaurant: place.name });
                setSelectedPlace(null); // close modal first
                setScreen('tastelens');
              }}
                aria-label="Open TasteLens for this restaurant"
                className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-amber-tint-bg10 text-accent-amber border-none cursor-pointer text-xs min-h-[44px]">
                <span className="text-base">{'\u{1F37D}\u{FE0F}'}</span>
                TasteLens
              </button>
            )}
            <button onClick={() => {
              if (!requireAuth()) return;
              setShowReportForm(true);
            }}
              aria-label="Report place"
              className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-bg-subtle-medium text-text-secondary border-none cursor-pointer text-xs min-h-[44px]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                <line x1="4" y1="22" x2="4" y2="15" />
              </svg>
              Report
            </button>
          </div>

          {/* Currency Mini Converter */}
          {showCurrencyConverter && (
            <div className="mb-4">
              <CurrencyMiniConverter cityName={cityLabel} onClose={() => setShowCurrencyConverter(false)} />
            </div>
          )}

          {/* Reserve / Book */}
          {(isReservable(place) || isBookable(place)) && (
            <div className="mb-4">
              <a href={getBookingUrl(place)} target="_blank" rel="noopener noreferrer"
                onClick={() => track('booking_click', { place: place.name, category: place.categoryDisplay || '', type: isReservable(place) ? 'opentable' : 'book' })}
                className={`flex items-center justify-center gap-2 w-full p-3.5 rounded-xl box-border no-underline text-sm font-semibold ${
                  isReservable(place)
                    ? 'border border-[rgba(218,55,67,0.25)] text-[#DA3743]'
                    : 'bg-green-tint-bg border border-green-tint-border text-status-green'
                }`}
                style={isReservable(place) ? { background: 'linear-gradient(135deg, rgba(218,55,67,0.12), rgba(218,55,67,0.05))' } : undefined}>
                {isReservable(place) ? 'Reserve on OpenTable' : 'Book Tickets'}
              </a>
              {place.googleMapsUrl && (
                <a href={place.googleMapsUrl} target="_blank" rel="noopener noreferrer"
                  className="block text-center mt-2 text-text-secondary text-xs no-underline">
                  View on Google Maps
                </a>
              )}
            </div>
          )}

          {/* Experience Booking (tours, activities) */}
          {(() => {
            const booking = getPlaceBookingUrl(place.name, place.category, '');
            if (!booking || isReservable(place) || isBookable(place)) return null;
            return (
              <div className="mb-4">
                <a href={booking.url} target="_blank" rel="noopener noreferrer"
                  onClick={() => track('detail_booking_click', { place: place.name, service: booking.service })}
                  className="flex items-center justify-center gap-2 w-full p-3.5 rounded-xl box-border no-underline text-sm font-semibold bg-green-tint-bg border border-green-tint-border text-status-green">
                  {'\u{1F3AF}'} {booking.label} on {booking.service}
                </a>
              </div>
            );
          })()}

          {/* Address */}
          {place.address && (
            <div className="mb-4">
              <div className="section-label !mb-1.5">Address</div>
              <a href={place.googleMapsUrl} target="_blank" rel="noopener noreferrer"
                className="text-text-primary text-sm no-underline leading-[1.4]">
                {place.address}
              </a>
            </div>
          )}

          {/* Editorial Summary */}
          {place.editorialSummary && (
            <div className="mb-4">
              <div className="section-label !mb-1.5">About</div>
              <p className="text-text-body text-sm leading-relaxed">{place.editorialSummary}</p>
            </div>
          )}

          {/* Hours */}
          {place.hours.length > 0 && (
            <div className="mb-4">
              <div className="section-label !mb-1.5">Hours</div>
              {place.hours.map((h, i) => {
                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const today = days[new Date().getDay()];
                const isToday = h.startsWith(today);
                return (
                  <div key={i} className={`text-[13px] py-1 ${isToday ? 'text-text-primary font-semibold' : 'text-text-tertiary font-normal'}`}>
                    {h}
                    {isToday && <span className="text-accent-amber ml-2 text-xs">Today</span>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Distance */}
          {place.distance != null && (
            <div className="mb-4">
              <div className="section-label !mb-1.5">Distance</div>
              <p className="text-text-primary text-sm">{formatDistance(place.distance, useMiles)} {getDistanceReference()}</p>
            </div>
          )}

          {/* Good to Know (Safety) */}
          {getSafetyIndicators(place).length > 0 && (
            <div className="mb-4">
              <div className="section-label !mb-1.5">Good to know</div>
              <div className="flex gap-1.5 flex-wrap">
                {getSafetyIndicators(place).map(ind => (
                  <span key={ind} className="text-xs text-text-secondary px-2.5 py-1 bg-bg-subtle rounded-lg">
                    {ind}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Community Tags */}
          {placeTagsCache[place.placeId] && Object.keys(placeTagsCache[place.placeId]).length > 0 && (
            <div className="mb-4">
              <div className="section-label !mb-1.5">Community Tags</div>
              <div className="flex gap-1.5 flex-wrap">
                {Object.entries(placeTagsCache[place.placeId]).map(([tag, count]) => {
                  const tagInfo = COMMUNITY_TAGS.find(t => t.id === tag);
                  return tagInfo ? (
                    <span key={tag} className="text-xs text-community-text px-2.5 py-1 bg-community-tint-bg rounded-lg">
                      {tagInfo.emoji} {tagInfo.label} ({count})
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Reviews Section */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2.5">
              <div className="section-label !mb-0">Community Reviews</div>
              {!showReviewForm && (
                <button onClick={() => { if (!requireAuth()) return; setShowReviewForm(true); }}
                  className="bg-transparent border border-amber-tint-border30 text-accent-amber rounded-lg px-3 py-[5px] text-xs cursor-pointer">
                  Leave a Review
                </button>
              )}
            </div>

            {/* Review Form */}
            {showReviewForm && user && (
              <div className="card !border-amber-tint-border15 mb-3">
                {/* Star Rating */}
                <div className="flex gap-2 mb-3">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star} onClick={() => setReviewRating(star)}
                      aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                      className={`bg-transparent border-none text-2xl cursor-pointer p-2 min-h-[44px] min-w-[44px] flex items-center justify-center ${
                        star <= reviewRating ? 'text-accent-amber' : 'text-text-disabled'
                      }`}>
                      &#9733;
                    </button>
                  ))}
                </div>

                {/* Review Text */}
                <textarea
                  placeholder="Share your experience (optional)"
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                  className="w-full p-3 rounded-[10px] border border-border-strong bg-bg-input text-text-primary text-sm resize-y min-h-[60px] box-border outline-none"
                />

                {/* Photo Upload */}
                <div className="mt-2.5 mb-2.5">
                  <div className="text-xs text-text-tertiary mb-1.5">Add photos (up to 3):</div>
                  <div className="flex gap-2 flex-wrap">
                    {reviewPhotos.map((file, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border-medium">
                        <img src={URL.createObjectURL(file)} alt={`Review photo ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => setReviewPhotos(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-[rgba(0,0,0,0.6)] border-none text-white text-[11px] cursor-pointer flex items-center justify-center"
                          aria-label={`Remove photo ${i + 1}`}
                        >
                          &#10005;
                        </button>
                      </div>
                    ))}
                    {reviewPhotos.length < 3 && (
                      <label className="w-16 h-16 rounded-lg border-2 border-dashed border-border-medium flex flex-col items-center justify-center cursor-pointer text-text-tertiary hover:border-accent-amber hover:text-accent-amber transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                        <span className="text-[11px] mt-0.5">Add</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (!file.type.startsWith('image/')) return;
                            if (file.size > 10 * 1024 * 1024) return;
                            setReviewPhotos(prev => [...prev, file]);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Community Tags */}
                <div className="mt-2.5 mb-2.5">
                  <div className="text-xs text-text-tertiary mb-1.5">Tag this place:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMUNITY_TAGS.map(tag => {
                      const selected = reviewTags.includes(tag.id);
                      return (
                        <button key={tag.id}
                          onClick={() => setReviewTags(selected ? reviewTags.filter(t => t !== tag.id) : [...reviewTags, tag.id])}
                          className={`px-2.5 py-1 rounded-xl text-xs cursor-pointer ${
                            selected
                              ? 'border border-community-tint-border40 bg-community-tint-bg12 text-community-text'
                              : 'border border-border-medium bg-transparent text-text-tertiary'
                          }`}>
                          {tag.emoji} {tag.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit */}
                <div className="flex gap-2">
                  <button onClick={handleSubmitReview}
                    disabled={reviewRating === 0 || reviewSubmitting}
                    className={`flex-1 p-2.5 rounded-[10px] border-none text-[13px] font-semibold cursor-pointer ${
                      reviewRating > 0
                        ? 'bg-accent-gradient text-text-on-accent'
                        : 'bg-bg-subtle-strong text-text-tertiary'
                    } ${reviewSubmitting ? 'opacity-60' : 'opacity-100'}`}>
                    {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                  </button>
                  <button onClick={() => { setShowReviewForm(false); setReviewRating(0); setReviewText(''); setReviewTags([]); setReviewPhotos([]); }}
                    className="px-4 p-2.5 rounded-[10px] border border-border-medium bg-transparent text-text-tertiary text-[13px] cursor-pointer">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Existing Reviews */}
            {placeReviews.length > 0 ? (
              placeReviews.slice(0, 5).map(review => (
                <div key={review.id} className="card !mb-2">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-accent-amber text-[13px]">
                      {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                    </span>
                    <span className="text-text-muted text-xs">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {review.review_text && (
                    <p className="text-text-body text-[13px] leading-[1.4] mb-1.5">{review.review_text}</p>
                  )}
                  {review.photo_urls && review.photo_urls.length > 0 && (
                    <div className="flex gap-1.5 mb-1.5 overflow-x-auto">
                      {review.photo_urls.map((url, pi) => (
                        <img
                          key={pi}
                          src={url}
                          alt={`Review photo ${pi + 1}`}
                          className="w-20 h-20 rounded-lg object-cover shrink-0 border border-border-subtle"
                          loading="lazy"
                        />
                      ))}
                    </div>
                  )}
                  {review.tags && review.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {review.tags.map(tag => {
                        const tagInfo = COMMUNITY_TAGS.find(t => t.id === tag);
                        return tagInfo ? (
                          <span key={tag} className="text-[11px] text-community-text px-1.5 py-0.5 bg-community-tint-bg rounded-[4px]">
                            {tagInfo.emoji} {tagInfo.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-text-muted text-[13px]">No reviews yet. Be the first!</p>
            )}
          </div>
          {/* Report Form */}
          {showReportForm && (
            <div className="card !border-red-tint-border mb-4 mx-5">
              <div className="section-label !mb-2">Report this place</div>
              <div className="flex flex-col gap-2 mb-3">
                {[
                  { value: 'spam', label: 'Spam or fake' },
                  { value: 'inappropriate', label: 'Inappropriate content' },
                  { value: 'misinformation', label: 'Wrong information' },
                  { value: 'harassment', label: 'Harassment' },
                  { value: 'other', label: 'Other' },
                ].map(opt => (
                  <button key={opt.value}
                    onClick={() => setReportReason(opt.value)}
                    className={`text-left px-3 py-2.5 rounded-[10px] text-[13px] cursor-pointer ${
                      reportReason === opt.value
                        ? 'bg-red-tint-bg border border-red-tint-border text-status-red font-medium'
                        : 'bg-bg-subtle border border-border-subtle text-text-secondary'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
              <textarea
                placeholder="Additional details (optional)"
                value={reportDetails}
                onChange={e => setReportDetails(e.target.value)}
                className="w-full p-3 rounded-[10px] border border-border-strong bg-bg-input text-text-primary text-sm resize-y min-h-[50px] box-border outline-none mb-3"
              />
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    if (!reportReason) return;
                    setReportSubmitting(true);
                    const result = await submitReport('place', place.placeId, reportReason as 'spam' | 'inappropriate' | 'harassment' | 'misinformation' | 'other', reportDetails);
                    setReportSubmitting(false);
                    if (result.success) {
                      setShowReportForm(false);
                      setReportReason('');
                      setReportDetails('');
                    }
                  }}
                  disabled={!reportReason || reportSubmitting}
                  className={`flex-1 py-2.5 rounded-[10px] border-none text-[13px] font-semibold cursor-pointer ${
                    reportReason ? 'bg-status-red text-white' : 'bg-bg-subtle-strong text-text-tertiary'
                  } ${reportSubmitting ? 'opacity-60' : 'opacity-100'}`}>
                  {reportSubmitting ? 'Submitting...' : 'Submit Report'}
                </button>
                <button onClick={() => { setShowReportForm(false); setReportReason(''); setReportDetails(''); }}
                  className="px-4 py-2.5 rounded-[10px] border border-border-medium bg-transparent text-text-tertiary text-[13px] cursor-pointer">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Bottom Bar */}
        <div
          className="fixed bottom-0 left-1/2 -translate-x-1/2 max-w-[430px] w-full px-5 pt-4 pb-8 border-t border-border-subtle"
          style={{ background: `linear-gradient(to top, var(--bg-surface), var(--bg-surface-alpha))` }}
        >
          <button
            onClick={() => {
              if (inPlan) {
                const stop = Object.values(tripDays).flat().find(s => s.place?.placeId === place.placeId);
                if (stop) removeFromPlan(stop.id);
              } else {
                addToPlan(place);
              }
            }}
            className={`w-full p-4 rounded-[14px] text-base font-semibold cursor-pointer ${
              inPlan
                ? 'bg-transparent text-accent-amber border-2 border-accent-amber shadow-none'
                : 'bg-accent-gradient text-text-on-accent border-none shadow-[0_4px_20px_var(--amber-tint-shadow)]'
            }`}
          >
            {inPlan ? '\u2713 In Your Plan \u2014 Remove' : '+ Add to Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}
