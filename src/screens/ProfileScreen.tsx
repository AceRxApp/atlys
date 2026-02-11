import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { getCardStyle } from '../styles/shared';

export default function ProfileScreen() {
  const {
    user,
    setShowProfile,
    savedPlaces,
    setSelectedPlace,
    tripDays,
  } = useApp();
  const { theme } = useTheme();
  const cardStyle = getCardStyle(theme);

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const fullName = (user?.user_metadata?.full_name as string) || user?.email || 'Traveler';
  const profileTotalStops = Object.values(tripDays).reduce((sum, stops) => sum + stops.length, 0);
  const profileDayCount = Object.keys(tripDays).length;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-label="Profile"
      style={{
        position: 'fixed', inset: 0, background: theme.bg.modalOverlayDeep, zIndex: 1000,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={() => setShowProfile(false)}
    >
      <div
        className="modal-sheet"
        style={{
          background: theme.bg.surface, borderRadius: '24px 24px 0 0',
          maxWidth: '430px', width: '100%', maxHeight: '92vh', overflow: 'auto',
          border: `1px solid ${theme.border.subtle}`, borderBottom: 'none',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '24px 20px 40px' }}>
          {/* Header with close button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Profile</h2>
            <button
              onClick={() => setShowProfile(false)}
              aria-label="Close profile"
              style={{
                background: theme.bg.subtleStrong, border: 'none', borderRadius: '50%',
                width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: theme.text.secondary, fontSize: '18px',
              }}
            >
              ✕
            </button>
          </div>

          <div>
              {/* Avatar & Name */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{
                  width: '80px', height: '80px', borderRadius: '50%', marginBottom: '12px',
                  border: `3px solid ${theme.amberTint.border30}`, overflow: 'hidden',
                  background: `linear-gradient(135deg, ${theme.amberTint.border20}, ${theme.amberTint.border20})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={theme.accent.amber} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: theme.text.primary, marginBottom: '4px' }}>
                  {fullName}
                </div>
              </div>

              {/* Stats Row */}
              <div style={{
                display: 'flex', justifyContent: 'center', gap: '0',
                background: theme.bg.subtle, borderRadius: '16px',
                border: `1px solid ${theme.border.subtle}`, marginBottom: '24px', overflow: 'hidden',
              }}>
                {[
                  { value: savedPlaces.length, label: 'Saved' },
                  { value: profileTotalStops, label: 'Planned' },
                  { value: profileDayCount, label: 'Days' },
                ].map((stat, i) => (
                  <div key={stat.label} style={{
                    flex: 1, textAlign: 'center', padding: '16px 12px',
                    borderRight: i < 2 ? `1px solid ${theme.border.subtle}` : 'none',
                  }}>
                    <div style={{
                      fontSize: '22px', fontWeight: 700,
                      background: theme.accent.amberTextGradient,
                      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>
                      {stat.value}
                    </div>
                    <div style={{ fontSize: '11px', color: theme.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '4px' }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Saved Places Section */}
              {savedPlaces.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '11px', color: theme.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
                    Saved Places
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {savedPlaces.map(place => (
                      <button
                        key={place.placeId}
                        onClick={() => { setSelectedPlace(place); setShowProfile(false); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px', width: '100%',
                          padding: '12px', borderRadius: '12px', border: `1px solid ${theme.border.subtle}`,
                          background: theme.bg.subtle, cursor: 'pointer', textAlign: 'left',
                        }}
                      >
                        <div style={{
                          width: '44px', height: '44px', borderRadius: '10px', flexShrink: 0, overflow: 'hidden',
                          background: place.photoUrl
                            ? `url(${place.photoUrl}) center/cover no-repeat`
                            : theme.amberTint.bg10,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {!place.photoUrl && <span style={{ fontSize: '18px' }}>📍</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: theme.text.primary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {place.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            {place.rating > 0 && (
                              <span style={{ fontSize: '11px', color: theme.accent.amber }}>★ {place.rating.toFixed(1)}</span>
                            )}
                            {place.address && (
                              <span style={{ fontSize: '11px', color: theme.text.tertiary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {place.address.split(',')[0]}
                              </span>
                            )}
                          </div>
                        </div>
                        <span style={{ color: theme.text.tertiary, fontSize: '14px', flexShrink: 0 }}>›</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* My Trips Section */}
              {profileTotalStops > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '11px', color: theme.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
                    My Trips
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {Object.entries(tripDays).map(([day, stops]) => (
                      <div
                        key={day}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '12px 14px', borderRadius: '12px',
                          background: theme.bg.subtle, border: `1px solid ${theme.border.subtle}`,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '10px',
                            background: theme.amberTint.bg10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '14px', fontWeight: 700, color: theme.accent.amber,
                          }}>
                            {day}
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: theme.text.primary }}>Day {day}</div>
                            <div style={{ fontSize: '11px', color: theme.text.tertiary }}>
                              {stops.length} {stops.length === 1 ? 'stop' : 'stops'}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {stops.slice(0, 3).map((stop, i) => (
                            <div key={i} style={{
                              width: '24px', height: '24px', borderRadius: '6px', overflow: 'hidden',
                              background: (stop.place?.photoUrl)
                                ? `url(${stop.place.photoUrl}) center/cover no-repeat`
                                : theme.amberTint.bg15,
                              border: `1px solid ${theme.border.subtle}`,
                            }} />
                          ))}
                          {stops.length > 3 && (
                            <div style={{
                              width: '24px', height: '24px', borderRadius: '6px',
                              background: theme.bg.subtleStrong, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '9px', color: theme.text.tertiary, fontWeight: 600,
                            }}>
                              +{stops.length - 3}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
        </div>
      </div>
    </div>
  );
}
