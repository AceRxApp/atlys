import { useApp } from '../context/AppContext';
import { Place, formatDistance, getHoursStatus } from '../services/places';
import { PriceDots, StarRating } from './ui';
import { DirectionsIcon, PhoneIcon, ShareIcon } from './icons';
import { cardStyle } from '../styles/shared';
import { COMMUNITY_TAGS } from '../data';

export default function PlaceCard({ place }: { place: Place }) {
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
  } = useApp();

  const inPlan = isInPlan(place.placeId);
  const hoursStatus = getHoursStatus(place.hours, place.openNow);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`View details for ${place.name}`}
      style={{ ...cardStyle, padding: 0, overflow: 'hidden', opacity: place.openNow ? 1 : 0.6, cursor: 'pointer' }}
      onClick={() => setSelectedPlace(place)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedPlace(place); } }}
    >
      {/* Photo */}
      {place.photoUrl && (
        <div style={{
          height: '160px', width: '100%', position: 'relative',
          overflow: 'hidden',
        }}>
          <img src={place.photoUrl} alt={place.name} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 60%, rgba(12,10,9,0.9))' }} />
          <div style={{
            position: 'absolute', top: '10px', left: '10px',
            padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
            background: place.openNow ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
            color: place.openNow ? '#34D399' : '#F87171', backdropFilter: 'blur(8px)',
          }}>
            {hoursStatus.text}
          </div>
          {place.distance != null && (
            <div style={{
              position: 'absolute', top: '10px', right: '10px',
              padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 500,
              background: 'rgba(0,0,0,0.5)', color: '#FFFBEB', backdropFilter: 'blur(8px)',
            }}>
              {formatDistance(place.distance, useMiles)} {getDistanceReference()}
            </div>
          )}
        </div>
      )}

      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, flex: 1 }}>{place.name}</h3>
          {place.rating > 0 && <StarRating rating={place.rating} count={place.reviewCount} />}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
          {place.categoryDisplay && (
            <span style={{ padding: '3px 8px', background: 'rgba(245,158,11,0.12)', color: '#F59E0B', borderRadius: '6px', fontSize: '11px', fontWeight: 500 }}>
              {place.categoryDisplay}
            </span>
          )}
          {place.reviewCount >= 200 && (
            <span style={{ padding: '3px 8px', background: 'rgba(34,197,94,0.1)', color: '#34D399', borderRadius: '6px', fontSize: '10px', fontWeight: 600 }}>
              Popular
            </span>
          )}
          <PriceDots level={place.priceLevel} />
          {!place.photoUrl && place.distance != null && (
            <span style={{ fontSize: '11px', color: '#A8A29E' }}>{formatDistance(place.distance, useMiles)} {getDistanceReference()}</span>
          )}
          {!place.photoUrl && (
            <span style={{ fontSize: '11px', color: place.openNow ? '#34D399' : '#F87171' }}>{hoursStatus.text}</span>
          )}
        </div>

        {/* Safety Indicators */}
        {getSafetyIndicators(place).length > 0 && (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
            {getSafetyIndicators(place).map(ind => (
              <span key={ind} style={{ fontSize: '10px', color: '#78716C', padding: '2px 6px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                {ind}
              </span>
            ))}
          </div>
        )}

        {/* Community Tags */}
        {placeTagsCache[place.placeId] && Object.entries(placeTagsCache[place.placeId]).filter(([, count]) => count >= 3).length > 0 && (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
            {Object.entries(placeTagsCache[place.placeId]).filter(([, count]) => count >= 3).map(([tag]) => {
              const tagInfo = COMMUNITY_TAGS.find(t => t.id === tag);
              return tagInfo ? (
                <span key={tag} style={{ fontSize: '10px', color: '#D4A574', padding: '2px 6px', background: 'rgba(212,165,116,0.08)', borderRadius: '4px' }}>
                  {tagInfo.emoji} {tagInfo.label}
                </span>
              ) : null;
            })}
          </div>
        )}

        {/* Action Row */}
        <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
          <button
            onClick={() => { if (inPlan) { const stop = Object.values(tripDays).flat().find(s => s.place?.placeId === place.placeId); if (stop) removeFromPlan(stop.id); } else { addToPlan(place); } }}
            style={{
              flex: 1, padding: '12px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', minHeight: '44px',
              background: inPlan ? 'transparent' : 'linear-gradient(135deg, #F59E0B, #D97706)',
              color: inPlan ? '#F59E0B' : '#0C0A09',
              border: inPlan ? '1.5px solid #F59E0B' : 'none',
            }}
          >
            {inPlan ? '✓ Saved' : '+ Add'}
          </button>
          {place.googleMapsUrl && (
            <a href={place.googleMapsUrl} target="_blank" rel="noopener noreferrer"
              aria-label="Get directions"
              style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', color: '#A8A29E', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', minHeight: '44px', minWidth: '44px' }}>
              <DirectionsIcon />
            </a>
          )}
          {place.phone && (
            <a href={`tel:${place.phone}`}
              aria-label="Call"
              style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', color: '#A8A29E', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', minHeight: '44px', minWidth: '44px' }}>
              <PhoneIcon />
            </a>
          )}
          {(isReservable(place) || isBookable(place)) && (place.website || place.googleMapsUrl) && (
            <a href={getBookingUrl(place)} target="_blank" rel="noopener noreferrer"
              style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(34,197,94,0.1)', color: '#34D399', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: '11px', fontWeight: 600, border: '1px solid rgba(34,197,94,0.2)', minHeight: '44px' }}>
              {getBookingLabel(place)}
            </a>
          )}
          <button onClick={() => toggleSaved(place)}
            aria-label={isSaved(place.placeId) ? 'Remove from saved' : 'Save place'}
            style={{ padding: '12px 16px', borderRadius: '10px', background: isSaved(place.placeId) ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.06)', color: isSaved(place.placeId) ? '#F59E0B' : '#A8A29E', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', minHeight: '44px', minWidth: '44px' }}>
            {isSaved(place.placeId) ? '♥' : '♡'}
          </button>
          <button onClick={() => sharePlace(place)}
            aria-label="Share"
            style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', color: '#A8A29E', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '44px', minWidth: '44px' }}>
            <ShareIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
