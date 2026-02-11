import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { Place, formatDistance, getHoursStatus } from '../services/places';
import { PriceDots, StarRating } from './ui';
import { DirectionsIcon, PhoneIcon, ShareIcon } from './icons';
import { getCardStyle } from '../styles/shared';
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
  const { theme } = useTheme();
  const cardStyle = getCardStyle(theme);

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
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, transparent 60%, ${theme.bg.imageOverlay})` }} />
          <div style={{
            position: 'absolute', top: '10px', left: '10px',
            padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
            background: place.openNow ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
            color: place.openNow ? theme.status.green : theme.status.red, backdropFilter: 'blur(8px)',
          }}>
            {hoursStatus.text}
          </div>
          {place.distance != null && (
            <div style={{
              position: 'absolute', top: '10px', right: '10px',
              padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 500,
              background: theme.bg.photoButton, color: theme.text.primary, backdropFilter: 'blur(8px)',
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
            <span style={{ padding: '3px 8px', background: theme.amberTint.bg15, color: theme.accent.amber, borderRadius: '6px', fontSize: '11px', fontWeight: 500 }}>
              {place.categoryDisplay}
            </span>
          )}
          {place.reviewCount >= 200 && (
            <span style={{ padding: '3px 8px', background: theme.greenTint.bg, color: theme.status.green, borderRadius: '6px', fontSize: '10px', fontWeight: 600 }}>
              Popular
            </span>
          )}
          <PriceDots level={place.priceLevel} />
          {!place.photoUrl && place.distance != null && (
            <span style={{ fontSize: '11px', color: theme.text.secondary }}>{formatDistance(place.distance, useMiles)} {getDistanceReference()}</span>
          )}
          {!place.photoUrl && (
            <span style={{ fontSize: '11px', color: place.openNow ? theme.status.green : theme.status.red }}>{hoursStatus.text}</span>
          )}
        </div>

        {/* Safety Indicators */}
        {getSafetyIndicators(place).length > 0 && (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
            {getSafetyIndicators(place).map(ind => (
              <span key={ind} style={{ fontSize: '10px', color: theme.text.tertiary, padding: '2px 6px', background: theme.bg.subtle, borderRadius: '4px' }}>
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
                <span key={tag} style={{ fontSize: '10px', color: theme.community.text, padding: '2px 6px', background: theme.communityTint.bg, borderRadius: '4px' }}>
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
              background: inPlan ? 'transparent' : theme.accent.amberGradient,
              color: inPlan ? theme.accent.amber : theme.text.onAccent,
              border: inPlan ? `1.5px solid ${theme.accent.amber}` : 'none',
            }}
          >
            {inPlan ? '✓ Saved' : '+ Add'}
          </button>
          {place.googleMapsUrl && (
            <a href={place.googleMapsUrl} target="_blank" rel="noopener noreferrer"
              aria-label="Get directions"
              style={{ padding: '12px 16px', borderRadius: '10px', background: theme.bg.subtleStrong, color: theme.text.secondary, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', minHeight: '44px', minWidth: '44px' }}>
              <DirectionsIcon />
            </a>
          )}
          {place.phone && (
            <a href={`tel:${place.phone}`}
              aria-label="Call"
              style={{ padding: '12px 16px', borderRadius: '10px', background: theme.bg.subtleStrong, color: theme.text.secondary, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', minHeight: '44px', minWidth: '44px' }}>
              <PhoneIcon />
            </a>
          )}
          {(isReservable(place) || isBookable(place)) && (place.website || place.googleMapsUrl) && (
            <a href={getBookingUrl(place)} target="_blank" rel="noopener noreferrer"
              style={{ padding: '12px 16px', borderRadius: '10px', background: theme.greenTint.bg, color: theme.status.green, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: '11px', fontWeight: 600, border: `1px solid ${theme.greenTint.border}`, minHeight: '44px' }}>
              {getBookingLabel(place)}
            </a>
          )}
          <button onClick={() => toggleSaved(place)}
            aria-label={isSaved(place.placeId) ? 'Remove from saved' : 'Save place'}
            style={{ padding: '12px 16px', borderRadius: '10px', background: isSaved(place.placeId) ? theme.amberTint.bg15 : theme.bg.subtleStrong, color: isSaved(place.placeId) ? theme.accent.amber : theme.text.secondary, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', minHeight: '44px', minWidth: '44px' }}>
            {isSaved(place.placeId) ? '♥' : '♡'}
          </button>
          <button onClick={() => sharePlace(place)}
            aria-label="Share"
            style={{ padding: '12px 16px', borderRadius: '10px', background: theme.bg.subtleStrong, color: theme.text.secondary, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '44px', minWidth: '44px' }}>
            <ShareIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
