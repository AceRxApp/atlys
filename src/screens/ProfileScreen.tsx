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
  const { theme, themePreference, setThemePreference } = useTheme();
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

              {/* Theme Section */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '11px', color: theme.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
                  Theme
                </div>
                <div style={{
                  display: 'flex', gap: '8px', marginBottom: '10px',
                }}>
                  {([
                    { key: 'light' as const, label: 'Light', icon: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="5" />
                        <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                        <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                      </svg>
                    )},
                    { key: 'sunset' as const, label: 'Sunset', icon: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 18a5 5 0 0 0-10 0" />
                        <line x1="12" y1="9" x2="12" y2="2" />
                        <line x1="4.22" y1="10.22" x2="5.64" y2="11.64" />
                        <line x1="1" y1="18" x2="3" y2="18" />
                        <line x1="21" y1="18" x2="23" y2="18" />
                        <line x1="18.36" y1="11.64" x2="19.78" y2="10.22" />
                        <line x1="23" y1="22" x2="1" y2="22" />
                        <polyline points="8 6 12 2 16 6" />
                      </svg>
                    )},
                    { key: 'dark' as const, label: 'Dark', icon: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                      </svg>
                    )},
                  ]).map(({ key, label, icon }) => {
                    const isActive = themePreference === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setThemePreference(key)}
                        style={{
                          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                          padding: '12px 8px', borderRadius: '12px', cursor: 'pointer',
                          background: isActive ? theme.amberTint.bg15 : theme.bg.subtle,
                          border: `1.5px solid ${isActive ? theme.accent.amber : theme.border.subtle}`,
                          color: isActive ? theme.accent.amber : theme.text.secondary,
                        }}
                      >
                        <span style={{ display: 'flex', stroke: 'currentColor' }}>{icon}</span>
                        <span style={{ fontSize: '12px', fontWeight: isActive ? 600 : 500 }}>{label}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setThemePreference('auto')}
                  style={{
                    width: '100%', padding: '10px', borderRadius: '10px', cursor: 'pointer',
                    background: themePreference === 'auto' ? theme.amberTint.bg15 : theme.bg.subtle,
                    border: `1.5px solid ${themePreference === 'auto' ? theme.accent.amber : theme.border.subtle}`,
                    color: themePreference === 'auto' ? theme.accent.amber : theme.text.secondary,
                    fontSize: '12px', fontWeight: themePreference === 'auto' ? 600 : 500,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Auto (changes with time of day)
                </button>
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
