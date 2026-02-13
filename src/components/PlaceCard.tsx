import { memo } from 'react';
import { useApp } from '../context/AppContext';
import { Place, formatDistance, getHoursStatus } from '../services/places';
import { PriceDots, StarRating } from './ui';
import { DirectionsIcon, PhoneIcon, ShareIcon } from './icons';
import { COMMUNITY_TAGS } from '../data';
import { getNightRisk, isNightTime } from '../utils/safetyEngine';

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
        <div className="h-[160px] w-full relative overflow-hidden">
          <img src={place.photoUrl} alt={place.name} loading="lazy" decoding="async"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            className="w-full h-full object-cover block" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, transparent 60%, var(--bg-image-overlay))` }} />
          <div className={`absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold backdrop-blur-[8px] ${place.openNow ? 'bg-[rgba(34,197,94,0.2)] text-status-green' : 'bg-[rgba(239,68,68,0.2)] text-status-red'}`}>
            {hoursStatus.text}
          </div>
          {place.distance != null && (
            <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-bg-photo-button text-text-primary backdrop-blur-[8px]">
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
            <span className="px-2 py-[3px] bg-amber-tint-bg15 text-accent-amber rounded-[6px] text-[11px] font-medium">
              {place.categoryDisplay}
            </span>
          )}
          {place.reviewCount >= 200 && (
            <span className="px-2 py-[3px] bg-green-tint-bg text-status-green rounded-[6px] text-[10px] font-semibold">
              Popular
            </span>
          )}
          <PriceDots level={place.priceLevel} />
          {!place.photoUrl && place.distance != null && (
            <span className="text-[11px] text-text-secondary">{formatDistance(place.distance, useMiles)} {getDistanceReference()}</span>
          )}
          {!place.photoUrl && (
            <span className={`text-[11px] ${place.openNow ? 'text-status-green' : 'text-status-red'}`}>{hoursStatus.text}</span>
          )}
        </div>

        {/* Safety Indicators */}
        {getSafetyIndicators(place).length > 0 && (
          <div className="flex gap-1 flex-wrap mb-1.5">
            {getSafetyIndicators(place).map(ind => (
              <span key={ind} className="text-[10px] text-text-tertiary px-1.5 py-0.5 bg-bg-subtle rounded-[4px]">
                {ind}
              </span>
            ))}
          </div>
        )}

        {/* Night Risk Indicator (only shows at night) */}
        {isNightTime(weather?.sunset) && (() => {
          const risk = getNightRisk(place.category, place.rating, place.reviewCount, place.openNow);
          return (
            <div className="flex items-center gap-1 mb-1.5">
              <span className="text-[10px]">{risk.emoji}</span>
              <span className={`text-[10px] font-medium ${
                risk.level === 'low' ? 'text-status-green' : risk.level === 'moderate' ? 'text-accent-amber' : 'text-status-red'
              }`}>
                {risk.label}
              </span>
              <span className="text-[9px] text-text-muted">{'\u00B7'} {risk.tip}</span>
            </div>
          );
        })()}

        {/* Community Tags */}
        {placeTagsCache[place.placeId] && Object.entries(placeTagsCache[place.placeId]).filter(([, count]) => count >= 3).length > 0 && (
          <div className="flex gap-1 flex-wrap mb-1.5">
            {Object.entries(placeTagsCache[place.placeId]).filter(([, count]) => count >= 3).map(([tag]) => {
              const tagInfo = COMMUNITY_TAGS.find(t => t.id === tag);
              return tagInfo ? (
                <span key={tag} className="text-[10px] text-community-text px-1.5 py-0.5 bg-community-tint-bg rounded-[4px]">
                  {tagInfo.emoji} {tagInfo.label}
                </span>
              ) : null;
            })}
          </div>
        )}

        {/* Action Row */}
        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => { if (inPlan) { const stop = Object.values(tripDays).flat().find(s => s.place?.placeId === place.placeId); if (stop) removeFromPlan(stop.id); } else { addToPlan(place); } }}
            className={`flex-1 px-4 py-3 rounded-[10px] text-[13px] font-semibold cursor-pointer min-h-[44px] ${
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
          {place.phone && (
            <a href={`tel:${place.phone}`}
              aria-label="Call"
              className="px-4 py-3 rounded-[10px] bg-bg-subtle-strong text-text-secondary flex items-center justify-center no-underline min-h-[44px] min-w-[44px]">
              <PhoneIcon />
            </a>
          )}
          {(isReservable(place) || isBookable(place)) && (
            <a href={getBookingUrl(place)} target="_blank" rel="noopener noreferrer"
              className={`px-4 py-3 rounded-[10px] flex items-center justify-center no-underline text-[11px] font-semibold min-h-[44px] ${
                isReservable(place)
                  ? 'bg-[rgba(218,55,67,0.12)] text-[#DA3743] border border-[rgba(218,55,67,0.25)]'
                  : 'bg-green-tint-bg text-status-green border border-green-tint-border'
              }`}>
              {getBookingLabel(place)}
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
          <button onClick={() => sharePlace(place)}
            aria-label="Share"
            className="px-4 py-3 rounded-[10px] bg-bg-subtle-strong text-text-secondary border-none cursor-pointer flex items-center justify-center min-h-[44px] min-w-[44px]">
            <ShareIcon />
          </button>
        </div>
      </div>
    </div>
  );
});
