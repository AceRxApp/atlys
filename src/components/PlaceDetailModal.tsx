import { track } from '@vercel/analytics';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { getCardStyle } from '../styles/shared';
import { CloseIcon, DirectionsIcon, PhoneIcon, WebsiteIcon, ShareIcon } from './icons';
import { PriceDots, StarRating } from './ui';
import { formatDistance, getHoursStatus } from '../services/places';
import { COMMUNITY_TAGS } from '../data';
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
    user,
  } = useApp();
  const { theme } = useTheme();
  const cardStyle = getCardStyle(theme);

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
      className="modal-backdrop"
      role="dialog"
      aria-label={`Details for ${place.name}`}
      style={{
        position: 'fixed', inset: 0, background: theme.bg.modalOverlay, zIndex: 100,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={() => setSelectedPlace(null)}
    >
      <div
        className="modal-sheet"
        style={{
          background: theme.bg.surface, borderRadius: '24px 24px 0 0',
          maxWidth: '430px', width: '100%', maxHeight: '90vh',
          overflowY: 'auto', overflowX: 'hidden',
          border: `1px solid ${theme.border.subtle}`, borderBottom: 'none',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Photo Gallery / Hero */}
        {galleryPhotos.length > 0 && (
          <div style={{ position: 'relative', width: '100%', height: '250px', borderRadius: '24px 24px 0 0', overflow: 'hidden', background: theme.bg.elevated }}>
            {/* Sliding photo strip */}
            <div style={{
              display: 'flex', width: `${galleryPhotos.length * 100}%`, height: '100%',
              transform: `translateX(-${activePhotoIndex * (100 / galleryPhotos.length)}%)`,
              transition: 'transform 0.35s ease-out',
            }}>
              {galleryPhotos.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`${place.name} photo ${i + 1}`}
                  loading="lazy"
                  decoding="async"
                  style={{
                    width: `${100 / galleryPhotos.length}%`, height: '100%',
                    objectFit: 'cover', display: 'block', flexShrink: 0,
                  }}
                />
              ))}
            </div>

            {/* Gradient overlay */}
            <div style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(to bottom, transparent 50%, ${theme.bg.surface})`,
              pointerEvents: 'none',
            }} />

            {/* Tap zones for prev/next */}
            {hasMultiplePhotos && (
              <>
                {activePhotoIndex > 0 && (
                  <button onClick={() => goToPhoto('prev')}
                    aria-label="Previous photo"
                    style={{
                      position: 'absolute', left: 0, top: 0, width: '40%', height: '100%',
                      background: 'transparent', border: 'none', cursor: 'pointer', zIndex: 1,
                    }} />
                )}
                {activePhotoIndex < galleryPhotos.length - 1 && (
                  <button onClick={() => goToPhoto('next')}
                    aria-label="Next photo"
                    style={{
                      position: 'absolute', right: 0, top: 0, width: '40%', height: '100%',
                      background: 'transparent', border: 'none', cursor: 'pointer', zIndex: 1,
                    }} />
                )}
              </>
            )}

            {/* Prev/Next arrow buttons */}
            {hasMultiplePhotos && activePhotoIndex > 0 && (
              <button onClick={() => goToPhoto('prev')}
                aria-label="Previous photo"
                style={{
                  position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 2,
                  background: theme.bg.photoButton, backdropFilter: 'blur(8px)', border: 'none',
                  borderRadius: '50%', width: '36px', height: '36px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: theme.text.primary, fontSize: '16px', fontWeight: 700,
                }}>
                ‹
              </button>
            )}
            {hasMultiplePhotos && activePhotoIndex < galleryPhotos.length - 1 && (
              <button onClick={() => goToPhoto('next')}
                aria-label="Next photo"
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 2,
                  background: theme.bg.photoButton, backdropFilter: 'blur(8px)', border: 'none',
                  borderRadius: '50%', width: '36px', height: '36px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: theme.text.primary, fontSize: '16px', fontWeight: 700,
                }}>
                ›
              </button>
            )}

            {/* Close button */}
            <button onClick={() => setSelectedPlace(null)}
              aria-label="Close"
              style={{
                position: 'absolute', top: '12px', right: '12px', zIndex: 3,
                background: theme.bg.photoButton, border: 'none',
                borderRadius: '50%', width: '36px', height: '36px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: theme.text.primary, backdropFilter: 'blur(8px)',
              }}>
              <CloseIcon />
            </button>

            {/* Photo counter + dots */}
            {hasMultiplePhotos && (
              <div style={{
                position: 'absolute', bottom: '10px', left: '50%',
                transform: 'translateX(-50%)', zIndex: 2,
                display: 'flex', gap: '5px', alignItems: 'center',
                background: theme.bg.photoCounter, borderRadius: '12px', padding: '4px 10px',
                backdropFilter: 'blur(8px)',
              }}>
                {galleryPhotos.map((_, i) => (
                  <button
                    key={i}
                    aria-label={`Go to photo ${i + 1}`}
                    onClick={() => setActivePhotoIndex(i)}
                    style={{
                      width: i === activePhotoIndex ? '14px' : '8px',
                      height: '8px',
                      borderRadius: '4px',
                      background: i === activePhotoIndex ? theme.accent.amber : 'rgba(255,255,255,0.4)',
                      border: 'none', padding: 0, cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div style={{ padding: '20px 20px 120px' }}>
          {galleryPhotos.length === 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
              <button onClick={() => setSelectedPlace(null)}
                aria-label="Close"
                style={{ background: 'none', border: 'none', color: theme.text.tertiary, cursor: 'pointer', padding: '10px', minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CloseIcon />
              </button>
            </div>
          )}

          {/* Name */}
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>{place.name}</h2>

          {/* Meta row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {place.categoryDisplay && (
              <span style={{ padding: '4px 10px', background: theme.amberTint.bg15, color: theme.accent.amber, borderRadius: '8px', fontSize: '12px', fontWeight: 500 }}>
                {place.categoryDisplay}
              </span>
            )}
            {place.rating > 0 && <StarRating rating={place.rating} count={place.reviewCount} />}
            <PriceDots level={place.priceLevel} />
          </div>

          {/* Hours status */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', borderRadius: '10px', marginBottom: '16px',
            background: place.openNow ? theme.greenTint.bg : theme.redTint.bg,
            border: `1px solid ${place.openNow ? theme.greenTint.border : theme.redTint.border}`,
          }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: place.openNow ? theme.status.green : theme.status.red,
            }} />
            <span style={{ fontSize: '13px', fontWeight: 500, color: place.openNow ? theme.status.green : theme.status.red }}>
              {hoursStatus.text}
            </span>
            {hoursStatus.urgent && (
              <span style={{ fontSize: '11px', color: theme.status.red, fontWeight: 600 }}>Hurry!</span>
            )}
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '20px' }}>
            {place.googleMapsUrl && (
              <a href={place.googleMapsUrl} target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                  padding: '12px 8px', borderRadius: '12px', background: theme.bg.subtleMedium,
                  color: theme.text.secondary, textDecoration: 'none', fontSize: '11px',
                }}>
                <DirectionsIcon />
                Directions
              </a>
            )}
            {place.phone && (
              <a href={`tel:${place.phone}`}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                  padding: '12px 8px', borderRadius: '12px', background: theme.bg.subtleMedium,
                  color: theme.text.secondary, textDecoration: 'none', fontSize: '11px',
                }}>
                <PhoneIcon />
                Call
              </a>
            )}
            {place.website && (
              <a href={place.website} target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                  padding: '12px 8px', borderRadius: '12px', background: theme.bg.subtleMedium,
                  color: theme.text.secondary, textDecoration: 'none', fontSize: '11px',
                }}>
                <WebsiteIcon />
                Website
              </a>
            )}
            <button onClick={() => toggleSaved(place)}
              aria-label={isSaved(place.placeId) ? 'Remove from saved' : 'Save place'}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                padding: '12px 8px', borderRadius: '12px', minHeight: '44px',
                background: isSaved(place.placeId) ? theme.amberTint.bg15 : theme.bg.subtleMedium,
                color: isSaved(place.placeId) ? theme.accent.amber : theme.text.secondary, border: 'none', cursor: 'pointer', fontSize: '11px',
              }}>
              <span style={{ fontSize: '16px' }}>{isSaved(place.placeId) ? '♥' : '♡'}</span>
              {isSaved(place.placeId) ? 'Saved' : 'Save'}
            </button>
            <button onClick={() => sharePlace(place)}
              aria-label="Share place"
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                padding: '12px 8px', borderRadius: '12px', background: theme.bg.subtleMedium,
                color: theme.text.secondary, border: 'none', cursor: 'pointer', fontSize: '11px', minHeight: '44px',
              }}>
              <ShareIcon />
              Share
            </button>
          </div>

          {/* Reserve / Book */}
          {(isReservable(place) || isBookable(place)) && (
            <div style={{ marginBottom: '16px' }}>
              <a href={getBookingUrl(place)} target="_blank" rel="noopener noreferrer"
                onClick={() => track('booking_click', { place: place.name, category: place.categoryDisplay || '', type: isReservable(place) ? 'reserve' : 'book' })}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  width: '100%', padding: '14px', borderRadius: '12px', boxSizing: 'border-box',
                  background: theme.greenTint.bg, border: `1px solid ${theme.greenTint.border}`,
                  color: theme.status.green, textDecoration: 'none', fontSize: '14px', fontWeight: 600,
                }}>
                {isReservable(place) ? 'Reserve a Table' : 'Book Tickets'}
              </a>
              {place.googleMapsUrl && (
                <a href={place.googleMapsUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'block', textAlign: 'center', marginTop: '8px', color: theme.text.secondary, fontSize: '12px', textDecoration: 'none' }}>
                  View on Google Maps
                </a>
              )}
            </div>
          )}

          {/* Address */}
          {place.address && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: theme.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Address</div>
              <a href={place.googleMapsUrl} target="_blank" rel="noopener noreferrer"
                style={{ color: theme.text.primary, fontSize: '14px', textDecoration: 'none', lineHeight: 1.4 }}>
                {place.address}
              </a>
            </div>
          )}

          {/* Editorial Summary */}
          {place.editorialSummary && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: theme.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>About</div>
              <p style={{ color: theme.text.body, fontSize: '14px', lineHeight: 1.5 }}>{place.editorialSummary}</p>
            </div>
          )}

          {/* Hours */}
          {place.hours.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: theme.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Hours</div>
              {place.hours.map((h, i) => {
                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const today = days[new Date().getDay()];
                const isToday = h.startsWith(today);
                return (
                  <div key={i} style={{
                    fontSize: '13px', padding: '4px 0',
                    color: isToday ? theme.text.primary : theme.text.tertiary,
                    fontWeight: isToday ? 600 : 400,
                  }}>
                    {h}
                    {isToday && <span style={{ color: theme.accent.amber, marginLeft: '8px', fontSize: '11px' }}>Today</span>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Distance */}
          {place.distance != null && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: theme.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Distance</div>
              <p style={{ color: theme.text.primary, fontSize: '14px' }}>{formatDistance(place.distance, useMiles)} {getDistanceReference()}</p>
            </div>
          )}

          {/* Good to Know (Safety) */}
          {getSafetyIndicators(place).length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: theme.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Good to know</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {getSafetyIndicators(place).map(ind => (
                  <span key={ind} style={{ fontSize: '12px', color: theme.text.secondary, padding: '4px 10px', background: theme.bg.subtle, borderRadius: '8px' }}>
                    {ind}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Community Tags */}
          {placeTagsCache[place.placeId] && Object.keys(placeTagsCache[place.placeId]).length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: theme.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Community Tags</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {Object.entries(placeTagsCache[place.placeId]).map(([tag, count]) => {
                  const tagInfo = COMMUNITY_TAGS.find(t => t.id === tag);
                  return tagInfo ? (
                    <span key={tag} style={{ fontSize: '12px', color: theme.community.text, padding: '4px 10px', background: theme.communityTint.bg, borderRadius: '8px' }}>
                      {tagInfo.emoji} {tagInfo.label} ({count})
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Reviews Section */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', color: theme.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Community Reviews</div>
              {user && !showReviewForm && (
                <button onClick={() => setShowReviewForm(true)}
                  style={{ background: 'none', border: `1px solid ${theme.amberTint.border30}`, color: theme.accent.amber, borderRadius: '8px', padding: '5px 12px', fontSize: '11px', cursor: 'pointer' }}>
                  Leave a Review
                </button>
              )}
            </div>

            {/* Review Form */}
            {showReviewForm && user && (
              <div style={{ ...cardStyle, marginBottom: '12px', border: `1px solid ${theme.amberTint.border15}` }}>
                {/* Star Rating */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star} onClick={() => setReviewRating(star)}
                      aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                      style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', padding: '8px', color: star <= reviewRating ? theme.accent.amber : theme.text.disabled, minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      ★
                    </button>
                  ))}
                </div>

                {/* Review Text */}
                <textarea
                  placeholder="Share your experience (optional)"
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '10px', border: `1px solid ${theme.border.strong}`,
                    background: theme.bg.input, color: theme.text.primary, fontSize: '14px', resize: 'vertical',
                    minHeight: '60px', boxSizing: 'border-box', outline: 'none',
                  }}
                />

                {/* Community Tags */}
                <div style={{ marginTop: '10px', marginBottom: '10px' }}>
                  <div style={{ fontSize: '11px', color: theme.text.tertiary, marginBottom: '6px' }}>Tag this place:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {COMMUNITY_TAGS.map(tag => {
                      const selected = reviewTags.includes(tag.id);
                      return (
                        <button key={tag.id}
                          onClick={() => setReviewTags(selected ? reviewTags.filter(t => t !== tag.id) : [...reviewTags, tag.id])}
                          style={{
                            padding: '4px 10px', borderRadius: '12px', fontSize: '11px',
                            border: selected ? `1px solid ${theme.communityTint.border40}` : `1px solid ${theme.border.medium}`,
                            background: selected ? theme.communityTint.bg12 : 'transparent',
                            color: selected ? theme.community.text : theme.text.tertiary, cursor: 'pointer',
                          }}>
                          {tag.emoji} {tag.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleSubmitReview}
                    disabled={reviewRating === 0 || reviewSubmitting}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
                      background: reviewRating > 0 ? theme.accent.amberGradient : theme.bg.subtleStrong,
                      color: reviewRating > 0 ? theme.text.onAccent : theme.text.tertiary,
                      fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: reviewSubmitting ? 0.6 : 1,
                    }}>
                    {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                  </button>
                  <button onClick={() => { setShowReviewForm(false); setReviewRating(0); setReviewText(''); setReviewTags([]); }}
                    style={{ padding: '10px 16px', borderRadius: '10px', border: `1px solid ${theme.border.medium}`, background: 'none', color: theme.text.tertiary, fontSize: '13px', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Existing Reviews */}
            {placeReviews.length > 0 ? (
              placeReviews.slice(0, 5).map(review => (
                <div key={review.id} style={{ ...cardStyle, marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ color: theme.accent.amber, fontSize: '13px' }}>
                      {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                    </span>
                    <span style={{ color: theme.text.muted, fontSize: '11px' }}>
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {review.review_text && (
                    <p style={{ color: theme.text.body, fontSize: '13px', lineHeight: 1.4, marginBottom: '6px' }}>{review.review_text}</p>
                  )}
                  {review.tags && review.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {review.tags.map(tag => {
                        const tagInfo = COMMUNITY_TAGS.find(t => t.id === tag);
                        return tagInfo ? (
                          <span key={tag} style={{ fontSize: '10px', color: theme.community.text, padding: '2px 6px', background: theme.communityTint.bg, borderRadius: '4px' }}>
                            {tagInfo.emoji} {tagInfo.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p style={{ color: theme.text.muted, fontSize: '13px' }}>No reviews yet. Be the first!</p>
            )}
          </div>
        </div>

        {/* Sticky Bottom Bar */}
        <div style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          maxWidth: '430px', width: '100%', padding: '16px 20px 32px',
          background: `linear-gradient(to top, ${theme.bg.surface}, ${theme.bg.surfaceAlpha})`,
          borderTop: `1px solid ${theme.border.subtle}`,
        }}>
          <button
            onClick={() => {
              if (inPlan) {
                const stop = Object.values(tripDays).flat().find(s => s.place?.placeId === place.placeId);
                if (stop) removeFromPlan(stop.id);
              } else {
                addToPlan(place);
              }
            }}
            style={{
              width: '100%', padding: '16px', borderRadius: '14px',
              fontSize: '16px', fontWeight: 600, cursor: 'pointer',
              background: inPlan ? 'transparent' : theme.accent.amberGradient,
              color: inPlan ? theme.accent.amber : theme.text.onAccent,
              border: inPlan ? `2px solid ${theme.accent.amber}` : 'none',
              boxShadow: inPlan ? 'none' : `0 4px 20px ${theme.amberTint.shadow}`,
            }}
          >
            {inPlan ? '✓ In Your Plan — Remove' : '+ Add to Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}
