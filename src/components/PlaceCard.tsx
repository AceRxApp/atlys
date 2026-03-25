import { memo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Place, formatDistance, getHoursStatus } from '../services/places';
import { StarRating } from './ui';
import { DirectionsIcon, PhoneIcon, ShareIcon } from './icons';
import { COMMUNITY_TAGS } from '../data';
import { getNightRisk, isNightTime, getPlaceSafety } from '../utils/safetyEngine';
import { fixPhotoUrl } from '../utils/photoUrl';
import NativeImg from './NativeImg';

export default memo(function PlaceCard({ place }: { place: Place }) {
  const {
    isInPlan,
    addToPlan,
    removeFromPlan,
    tripDays,
    setSelectedPlace,
    toggleSaved,
    isSaved,
    sharePlace,
    isReservable,
    isBookable,
    getBookingUrl,
    getBookingLabel,
    getSafetyIndicators,
    getDistanceReference,
    useMiles,
    placeTagsCache,
    weather,
  } = useApp();

  const inPlan = isInPlan(place.placeId);
  const hoursStatus = getHoursStatus(place.hours, place.openNow);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`View details for ${place.name}`}
      className={`card !p-0 overflow-hidden cursor-pointer ${place.openNow ? 'opacity-100' : 'opacity-60'}`}
      onClick={() => setSelectedPlace(place)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedPlace(place); } }}
    >
      {/* Photo */}
      {place.photoUrl && (
        <div className="h-[160px] md:h-[200px] w-full relative overflow-hidden">
          <NativeImg src={fixPhotoUrl(place.photoUrl)!} alt={place.name} loading="lazy" decoding="async"
            className="w-full h-full object-cover block" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, transparent 60%, var(--bg-image-overlay))` }} />
          <div className={`absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg text-xs font-semibold backdrop-blur-[8px] ${place.openNow ? 'bg-[rgba(34,197,94,0.2)] text-status-green' : 'bg-[rgba(239,68,68,0.2)] text-status-red'}`}>
            {hoursStatus.text}
          </div>
          {place.distance != null && (
            <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-bg-photo-button text-text-primary backdrop-blur-[8px]">
              {formatDistance(place.distance, useMiles)} {getDistanceReference()}
            </div>
          )}
        </div>
      )}

      <div className="px-4 py-3.5">
        <div className="flex justify-between items-start mb-1.5">
          <h3 className="text-base font-semibold m-0 flex-1">{place.name}</h3>
          {place.rating > 0 && <StarRating rating={place.rating} count={place.reviewCount} />}
        </div>

        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          {place.categoryDisplay && (
            <span className="px-2 py-[3px] bg-amber-tint-bg15 text-accent-amber rounded-[6px] text-xs font-medium">
              {place.categoryDisplay}
            </span>
          )}
          {place.reviewCount >= 200 && (
            <span className="px-2 py-[3px] bg-green-tint-bg text-status-green rounded-[6px] text-[11px] font-semibold">
              Popular
            </span>
          )}
          {!place.photoUrl && place.distance != null && (
            <span className="text-xs text-text-secondary">{formatDistance(place.distance, useMiles)} {getDistanceReference()}</span>
          )}
          {!place.photoUrl && (
            <span className={`text-xs ${place.openNow ? 'text-status-green' : 'text-status-red'}`}>{hoursStatus.text}</span>
          )}
        </div>

        {/* Safety Indicators */}
        {getSafetyIndicators(place).length > 0 && (
          <div className="flex gap-1 flex-wrap mb-1.5">
            {getSafetyIndicators(place).map(ind => (
              <span key={ind} className="text-[11px] text-text-tertiary px-1.5 py-0.5 bg-bg-subtle rounded-[4px]">
                {ind}
              </span>
            ))}
          </div>
        )}

        {/* Safety Warning (always shown when applicable) */}
        {(() => {
          const night = isNightTime(weather?.sunset);
          const warning = getPlaceSafety(place.category, place.rating, place.reviewCount, place.openNow, night);
          if (warning) return (
            <div className={`flex items-center gap-1.5 mb-1.5 px-2 py-1.5 rounded-lg ${
              warning.level === 'warning' ? 'bg-red-tint-bg' : 'bg-amber-tint-bg10'
            }`}>
              <span className="text-[12px]">{warning.emoji}</span>
              <span className={`text-[11px] font-semibold ${
                warning.level === 'warning' ? 'text-status-red' : 'text-accent-amber'
              }`}>
                {warning.label}
              </span>
              <span className="text-[11px] text-text-muted">{'\u00B7'} {warning.message}</span>
            </div>
          );
          // Night risk indicator (only at night, no warning)
          if (night) {
            const risk = getNightRisk(place.category, place.rating, place.reviewCount, place.openNow);
            return (
              <div className="flex items-center gap-1 mb-1.5">
                <span className="text-[11px]">{risk.emoji}</span>
                <span className={`text-[11px] font-medium ${
                  risk.level === 'low' ? 'text-status-green' : risk.level === 'moderate' ? 'text-accent-amber' : 'text-status-red'
                }`}>
                  {risk.label}
                </span>
                <span className="text-[11px] text-text-muted">{'\u00B7'} {risk.tip}</span>
              </div>
            );
          }
          return null;
        })()}

        {/* Community Tags */}
        {placeTagsCache[place.placeId] && Object.entries(placeTagsCache[place.placeId]).filter(([, count]) => count >= 3).length > 0 && (
          <div className="flex gap-1 flex-wrap mb-1.5">
            {Object.entries(placeTagsCache[place.placeId]).filter(([, count]) => count >= 3).map(([tag]) => {
              const tagInfo = COMMUNITY_TAGS.find(t => t.id === tag);
              return tagInfo ? (
                <span key={tag} className="text-[11px] text-community-text px-1.5 py-0.5 bg-community-tint-bg rounded-[4px]">
                  {tagInfo.emoji} {tagInfo.label}
                </span>
              ) : null;
            })}
          </div>
        )}

        {/* Action Row — 2 primary + overflow */}
        <PlaceActions place={place} inPlan={inPlan} />
      </div>
    </div>
  );
});

/* Compact action bar: Add + Directions visible, rest behind "..." */
function PlaceActions({ place, inPlan }: { place: Place; inPlan: boolean }) {
  const [open, setOpen] = useState(false);
  const {
    addToPlan, removeFromPlan, tripDays,
    toggleSaved, isSaved, sharePlace,
    isReservable, isBookable, getBookingUrl, getBookingLabel,
  } = useApp();

  return (
    <div className="relative flex gap-2" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => {
          if (inPlan) {
            const stop = Object.values(tripDays).flat().find(s => s.place?.placeId === place.placeId);
            if (stop) removeFromPlan(stop.id);
          } else { addToPlan(place); }
        }}
        className={`flex-1 px-4 py-3 rounded-[10px] text-[13px] font-semibold cursor-pointer min-h-[44px] active:scale-[0.95] transition-transform ${
          inPlan
            ? 'bg-transparent text-accent-amber border-[1.5px] border-accent-amber'
            : 'bg-accent-gradient text-text-on-accent border-none'
        }`}
      >
        {inPlan ? '\u2713 Saved' : '+ Add'}
      </button>

      {place.googleMapsUrl && (
        <a href={place.googleMapsUrl} target="_blank" rel="noopener noreferrer"
          aria-label="Get directions"
          className="px-4 py-3 rounded-[10px] bg-bg-subtle-strong text-text-secondary flex items-center justify-center no-underline min-h-[44px] min-w-[44px]">
          <DirectionsIcon />
        </a>
      )}

      <button onClick={() => toggleSaved(place)}
        aria-label={isSaved(place.placeId) ? 'Remove from saved' : 'Save place'}
        className={`px-4 py-3 rounded-[10px] border-none cursor-pointer flex items-center justify-center text-base min-h-[44px] min-w-[44px] ${
          isSaved(place.placeId)
            ? 'bg-amber-tint-bg15 text-accent-amber'
            : 'bg-bg-subtle-strong text-text-secondary'
        }`}>
        {isSaved(place.placeId) ? '\u2665' : '\u2661'}
      </button>

      {/* Overflow "..." */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="More actions"
        className="px-3 py-3 rounded-[10px] bg-bg-subtle-strong text-text-secondary border-none cursor-pointer flex items-center justify-center min-h-[44px] min-w-[44px] text-lg font-bold"
      >
        ···
      </button>

      {open && (
        <div className="absolute right-0 bottom-full mb-1 z-50 min-w-[160px] rounded-xl bg-bg-card border border-border-medium shadow-lg overflow-hidden animate-enter-scale">
          {place.phone && (
            <a href={`tel:${place.phone}`}
              className="flex items-center gap-2.5 px-3.5 py-3 text-[13px] text-text-primary no-underline hover:bg-bg-subtle">
              <PhoneIcon /> Call
            </a>
          )}
          {(isReservable(place) || isBookable(place)) && (
            <a href={getBookingUrl(place)} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-3.5 py-3 text-[13px] text-text-primary no-underline hover:bg-bg-subtle">
              {isReservable(place) ? '🍽️' : '🎟️'} {getBookingLabel(place)}
            </a>
          )}
          <button
            onClick={() => { sharePlace(place); setOpen(false); }}
            className="flex items-center gap-2.5 px-3.5 py-3 text-[13px] text-text-primary bg-transparent border-none cursor-pointer w-full text-left hover:bg-bg-subtle">
            <ShareIcon /> Share
          </button>
        </div>
      )}
    </div>
  );
}
