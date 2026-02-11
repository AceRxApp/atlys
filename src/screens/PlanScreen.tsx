import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { getCardStyle } from '../styles/shared';
import { DirectionsIcon, PhoneIcon, ShareIcon } from '../components/icons';
import { formatDistance } from '../services/places';
import type { Stop } from '../types';

// Local helpers (not on context)
const getStopName = (stop: Stop) =>
  stop.type === 'event' ? (stop.event?.name || 'Event') : (stop.place?.name || 'Place');

const getStopCategory = (stop: Stop) =>
  stop.type === 'event' ? (stop.event?.category || 'Event') : (stop.place?.categoryDisplay || '');

export default function PlanScreen() {
  const {
    tripDays,
    setTripDays,
    activeDay,
    setActiveDay,
    dayPlan,
    totalStops,
    dayCount,
    addDay,
    removeDay,
    moveStopToDay,
    movePlanStop,
    removeFromPlan,
    getRouteUrl,
    sharePlan,
    clearPlan,
    setScreen,
    cityLabel,
    citySlug,
    useMiles,
    getDistanceReference,
    getTransportInfo,
    showToast,
    weather,
    crewMode,
    crewCode,
    crewSyncing,
    joinCrewInput,
    setJoinCrewInput,
    showJoinCrew,
    setShowJoinCrew,
    formatEventDate,
    formatEventTime,
    startCrewMode,
    stopCrewMode,
    joinCrew,
    shareCrewPlan,
    user,
  } = useApp();

  const { theme } = useTheme();
  const cardStyle = getCardStyle(theme);

  const sortedDays = Object.keys(tripDays).map(Number).sort((a, b) => a - b);

  if (totalStops === 0 && !crewMode) {
    return (
      <div style={{ textAlign: 'center', paddingTop: '60px' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.6 }}>&#x1f5fa;&#xfe0f;</div>
        <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>No stops yet</h2>
        <p style={{ color: theme.text.secondary, fontSize: '14px', marginBottom: '24px', lineHeight: 1.5 }}>
          Explore places and tap &quot;+ Add&quot; to build your trip plan
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => setScreen('discover')}
            style={{
              background: theme.accent.amberGradient, color: theme.text.onAccent,
              border: 'none', borderRadius: '14px', padding: '14px 28px',
              fontSize: '15px', fontWeight: 600, cursor: 'pointer',
              boxShadow: `0 4px 20px ${theme.amberTint.shadow}`,
            }}
          >
            Start Exploring →
          </button>
          <button
            onClick={() => setShowJoinCrew(true)}
            style={{
              background: 'none', border: `1px solid ${theme.border.strong}`,
              color: theme.text.secondary, borderRadius: '14px', padding: '12px 24px',
              fontSize: '14px', cursor: 'pointer',
            }}
          >
            &#x1f465; Join a Crew
          </button>
        </div>
        {/* Inline Join Crew */}
        {showJoinCrew && (
          <div style={{ ...cardStyle, marginTop: '20px', padding: '16px', textAlign: 'left' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: theme.text.primary }}>Enter Crew Code</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="e.g. X7K3NP"
                value={joinCrewInput}
                onChange={e => setJoinCrewInput(e.target.value.toUpperCase())}
                onKeyDown={e => {
                  if (e.key === 'Enter' && joinCrewInput.length >= 4) {
                    joinCrew();
                  }
                }}
                maxLength={6}
                style={{
                  flex: 1, padding: '12px', borderRadius: '10px',
                  border: `1px solid ${theme.border.strong}`, background: theme.bg.input,
                  color: theme.text.primary, fontSize: '18px', fontWeight: 700,
                  letterSpacing: '4px', textAlign: 'center', outline: 'none',
                }}
              />
              <button
                onClick={() => joinCrew()}
                disabled={crewSyncing || joinCrewInput.length < 4}
                style={{
                  padding: '12px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                  background: joinCrewInput.length >= 4 ? theme.accent.amber : theme.border.subtle,
                  color: joinCrewInput.length >= 4 ? theme.text.onAccent : theme.text.tertiary,
                  fontSize: '14px', fontWeight: 600,
                }}>
                {crewSyncing ? '...' : 'Join'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>
            Your Trip Plan
          </h1>
          {/* Crew Toggle */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {!crewMode && (
              <button onClick={() => setShowJoinCrew(true)}
                style={{
                  padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                  border: `1px solid ${theme.border.strong}`, background: 'transparent',
                  color: theme.text.tertiary, cursor: 'pointer',
                }}>
                Join Crew
              </button>
            )}
            <button
              onClick={crewMode ? stopCrewMode : startCrewMode}
              disabled={crewSyncing}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                border: crewMode ? `1px solid ${theme.amberTint.border30}` : `1px solid ${theme.border.strong}`,
                background: crewMode ? theme.amberTint.bg15 : 'transparent',
                color: crewMode ? theme.accent.amber : theme.text.tertiary, cursor: crewSyncing ? 'default' : 'pointer',
                opacity: crewSyncing ? 0.5 : 1,
              }}>
              {crewSyncing ? '...' : crewMode ? '&#x1f465; Crew On' : '&#x1f464; Solo'}
            </button>
          </div>
        </div>
        <p style={{ color: theme.text.tertiary, fontSize: '13px' }}>
          {cityLabel} · {totalStops} stop{totalStops !== 1 ? 's' : ''} · {dayCount} day{dayCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Join Crew Modal */}
      {showJoinCrew && (
        <div style={{
          ...cardStyle, marginBottom: '12px', padding: '16px',
          background: theme.bg.toast, border: `1px solid ${theme.amberTint.border15}`,
        }}>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px', color: theme.text.primary }}>Join a Crew</div>
          <p style={{ fontSize: '12px', color: theme.text.secondary, marginBottom: '12px' }}>Enter the crew code shared with you</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="e.g. X7K3NP"
              value={joinCrewInput}
              onChange={e => setJoinCrewInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && joinCrew()}
              maxLength={6}
              style={{
                flex: 1, padding: '12px 14px', borderRadius: '10px',
                border: `1px solid ${theme.border.strong}`, background: theme.bg.input,
                color: theme.text.primary, fontSize: '18px', fontWeight: 700,
                letterSpacing: '4px', textAlign: 'center', outline: 'none',
                textTransform: 'uppercase',
              }}
            />
            <button onClick={joinCrew} disabled={crewSyncing || joinCrewInput.length < 4}
              style={{
                padding: '12px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                background: joinCrewInput.length >= 4 ? theme.accent.amberGradient : theme.border.subtle,
                color: joinCrewInput.length >= 4 ? theme.text.onAccent : theme.text.tertiary,
                fontSize: '14px', fontWeight: 600,
              }}>
              {crewSyncing ? '...' : 'Join'}
            </button>
          </div>
          <button onClick={() => { setShowJoinCrew(false); setJoinCrewInput(''); }}
            style={{ width: '100%', padding: '8px', marginTop: '8px', background: 'none', border: 'none', color: theme.text.tertiary, fontSize: '12px', cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      )}

      {/* Crew Mode Banner */}
      {crewMode && crewCode && (
        <div style={{
          ...cardStyle, marginBottom: '12px', padding: '16px',
          background: `linear-gradient(135deg, ${theme.amberTint.bg10}, ${theme.amberTint.bg06})`,
          border: `1px solid ${theme.amberTint.border20}`,
        }}>
          <div style={{ fontSize: '11px', color: theme.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Share this code with your crew</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{
              flex: 1, fontSize: '28px', fontWeight: 700, letterSpacing: '6px', color: theme.accent.amber,
              background: theme.bg.photoCounter, borderRadius: '10px', padding: '10px 16px', textAlign: 'center',
              fontFamily: 'monospace',
            }}>{crewCode}</div>
            <button onClick={() => { navigator.clipboard.writeText(crewCode); showToast('Code copied!'); }}
              style={{
                padding: '12px 14px', borderRadius: '10px', border: `1px solid ${theme.amberTint.border30}`,
                background: theme.amberTint.bg10, color: theme.accent.amber, cursor: 'pointer',
                fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap',
              }}>
              Copy
            </button>
          </div>
          <button onClick={shareCrewPlan}
            style={{
              width: '100%', padding: '12px', borderRadius: '12px', border: 'none', cursor: 'pointer',
              background: theme.accent.amberGradient,
              color: theme.text.onAccent, fontSize: '14px', fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}>
            &#x1f4e4; Share Plan with Crew
          </button>
          <p style={{ fontSize: '11px', color: theme.text.secondary, marginTop: '8px', lineHeight: 1.4, textAlign: 'center' }}>
            Your crew opens the app → Plan tab → &quot;Join Crew&quot; → enters the code above
          </p>
        </div>
      )}

      {/* Trip Weather Forecast */}
      {weather && weather.forecast.length > 0 && dayCount > 0 && (
        <div style={{ ...cardStyle, marginBottom: '12px', padding: '12px', background: `linear-gradient(135deg, ${theme.blueTint.bg}, ${theme.bg.subtle})`, border: `1px solid ${theme.blueTint.border}` }}>
          <div style={{ fontSize: '11px', color: theme.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Pack for your trip</div>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {weather.forecast.slice(0, dayCount).map((day, i) => (
              <div key={day.date} style={{ textAlign: 'center', minWidth: '60px', flexShrink: 0, padding: '6px', borderRadius: '10px', background: theme.bg.subtle }}>
                <div style={{ fontSize: '10px', color: theme.text.tertiary, marginBottom: '2px' }}>Day {i + 1}</div>
                <div style={{ fontSize: '20px', marginBottom: '2px' }}>{day.emoji}</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: theme.text.primary }}>{day.high}°</div>
                <div style={{ fontSize: '10px', color: theme.text.tertiary }}>{day.low}°</div>
                {day.precipChance > 30 && (
                  <div style={{ fontSize: '9px', color: theme.status.blue, marginTop: '2px' }}>&#x1f4a7; {day.precipChance}%</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Day Tabs */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '12px', scrollbarWidth: 'none' }}>
        {sortedDays.map(day => {
          const stops = tripDays[day] || [];
          const isActive = activeDay === day;
          return (
            <button key={day} onClick={() => setActiveDay(day)}
              style={{
                padding: '8px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 600,
                border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                background: isActive ? theme.accent.amberGradient : theme.bg.subtleStrong,
                color: isActive ? theme.text.onAccent : theme.text.secondary,
              }}>
              Day {day} ({stops.length})
            </button>
          );
        })}
        <button onClick={addDay}
          style={{
            padding: '8px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 600,
            border: `1px dashed ${theme.border.dashed}`, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            background: 'transparent', color: theme.text.tertiary,
          }}>
          + Day
        </button>
      </div>

      {/* Active day stops */}
      {dayPlan.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '32px 20px' }}>
          <p style={{ color: theme.text.secondary, fontSize: '14px' }}>No stops on Day {activeDay} yet. Explore to add some!</p>
        </div>
      ) : (<>
        {dayPlan.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', padding: '6px 10px', borderRadius: '8px', background: theme.amberTint.bg06 }}>
            <span style={{ fontSize: '12px' }}>&#x2195;&#xfe0f;</span>
            <span style={{ fontSize: '11px', color: theme.accent.amberDark, fontWeight: 500 }}>Tap the arrows to reorder your stops</span>
          </div>
        )}
        <div style={{ position: 'relative', paddingLeft: '32px' }}>
          {/* Vertical route line */}
          <div style={{
            position: 'absolute', left: '14px', top: '16px',
            bottom: '16px', width: '2px',
            background: `linear-gradient(to bottom, ${theme.accent.amber}, ${theme.amberTint.bg10})`,
            borderRadius: '1px',
          }} />

          {dayPlan.map((stop, index) => (
            <div key={stop.id}>
              <div style={{ position: 'relative', marginBottom: index < dayPlan.length - 1 ? '4px' : '16px' }}>
                {/* Stop number circle */}
                <div style={{
                  position: 'absolute', left: '-32px', top: '16px',
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: stop.type === 'event'
                    ? `linear-gradient(135deg, ${theme.events.gradientStart}, ${theme.events.gradientEnd})`
                    : theme.accent.amberGradient,
                  color: stop.type === 'event' ? theme.text.primary : theme.text.onAccent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: 700, zIndex: 1,
                  boxShadow: `0 0 0 4px ${theme.bg.body}`,
                }}>
                  {index + 1}
                </div>

                {/* Stop card */}
                <div style={{
                  ...cardStyle, marginBottom: 0, overflow: 'hidden',
                  border: stop.type === 'event'
                    ? `1px solid ${theme.purpleTint.border15}`
                    : `1px solid ${theme.amberTint.bg10}`,
                }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {stop.type === 'place' && stop.place?.photoUrl && (
                      <div style={{
                        width: '80px', height: '80px', borderRadius: '12px', flexShrink: 0,
                        background: `url(${stop.place.photoUrl})`,
                        backgroundSize: 'cover', backgroundPosition: 'center',
                      }} />
                    )}
                    {stop.type === 'event' && stop.event?.imageUrl && (
                      <div style={{
                        width: '80px', height: '80px', borderRadius: '12px', flexShrink: 0,
                        background: `url(${stop.event.imageUrl})`,
                        backgroundSize: 'cover', backgroundPosition: 'center',
                      }} />
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {getStopName(stop)}
                      </h3>
                      {stop.type === 'place' && stop.place && (
                        <>
                          <p style={{ fontSize: '12px', color: theme.text.secondary, marginBottom: '4px' }}>
                            {stop.place.categoryDisplay}
                            {stop.place.distance != null && ` · ${formatDistance(stop.place.distance, useMiles)} ${getDistanceReference()}`}
                          </p>
                          {stop.place.rating > 0 && (
                            <div style={{ fontSize: '12px' }}>
                              <span style={{ color: theme.accent.amber }}>★ {stop.place.rating.toFixed(1)}</span>
                              <span style={{ color: theme.text.tertiary }}> ({stop.place.reviewCount})</span>
                            </div>
                          )}
                        </>
                      )}
                      {stop.type === 'event' && stop.event && (
                        <>
                          <p style={{ fontSize: '12px', color: theme.events.text, marginBottom: '4px' }}>
                            {formatEventDate(stop.event.date)}
                            {stop.event.time && ` · ${formatEventTime(stop.event.time)}`}
                          </p>
                          <p style={{ fontSize: '12px', color: theme.text.secondary }}>
                            {stop.event.venue}
                          </p>
                        </>
                      )}

                      {/* Mini actions */}
                      <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                        {stop.type === 'place' && stop.place?.googleMapsUrl && (
                          <a href={stop.place.googleMapsUrl} target="_blank" rel="noopener noreferrer"
                            style={{
                              padding: '5px 10px', borderRadius: '8px', fontSize: '11px',
                              background: theme.amberTint.bg10, color: theme.accent.amber,
                              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px',
                            }}>
                            <DirectionsIcon /> Go
                          </a>
                        )}
                        {stop.type === 'place' && stop.place?.phone && (
                          <a href={`tel:${stop.place.phone}`}
                            style={{
                              padding: '5px 10px', borderRadius: '8px', fontSize: '11px',
                              background: theme.bg.subtleMedium, color: theme.text.secondary,
                              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px',
                            }}>
                            <PhoneIcon /> Call
                          </a>
                        )}
                        {stop.type === 'event' && stop.event?.url && (
                          <a href={stop.event.url} target="_blank" rel="noopener noreferrer"
                            style={{
                              padding: '5px 10px', borderRadius: '8px', fontSize: '11px',
                              background: theme.purpleTint.bg08, color: theme.events.text,
                              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px',
                            }}>
                            &#x1f3ab; Tickets
                          </a>
                        )}
                        {/* Move to different day */}
                        {dayCount > 1 && (
                          <select
                            value=""
                            onChange={e => { if (e.target.value) moveStopToDay(stop.id, activeDay, Number(e.target.value)); }}
                            style={{
                              padding: '5px 8px', borderRadius: '8px', fontSize: '11px',
                              background: theme.bg.subtleMedium, color: theme.text.tertiary,
                              border: `1px solid ${theme.border.medium}`, cursor: 'pointer',
                            }}>
                            <option value="">Move to...</option>
                            {sortedDays.filter(d => d !== activeDay).map(d => (
                              <option key={d} value={d}>Day {d}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    {/* Right controls: reorder + remove */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', justifyContent: 'center', minWidth: '44px' }}>
                      {index > 0 && (
                        <button onClick={() => movePlanStop(index, 'up')}
                          aria-label="Move up"
                          style={{
                            background: theme.amberTint.bg10, border: `1px solid ${theme.amberTint.border20}`,
                            color: theme.accent.amber, cursor: 'pointer', fontSize: '14px', fontWeight: 700,
                            padding: '6px 10px', borderRadius: '8px',
                            minHeight: '36px', minWidth: '44px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px',
                          }}>
                          ↑
                        </button>
                      )}
                      <button onClick={() => removeFromPlan(stop.id)}
                        aria-label="Remove stop"
                        style={{
                          background: theme.redTint.bg, border: `1px solid ${theme.redTint.border}`,
                          color: theme.status.red, cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                          padding: '6px 8px', borderRadius: '8px',
                          minHeight: '32px', minWidth: '44px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                        ✕
                      </button>
                      {index < dayPlan.length - 1 && (
                        <button onClick={() => movePlanStop(index, 'down')}
                          aria-label="Move down"
                          style={{
                            background: theme.amberTint.bg10, border: `1px solid ${theme.amberTint.border20}`,
                            color: theme.accent.amber, cursor: 'pointer', fontSize: '14px', fontWeight: 700,
                            padding: '6px 10px', borderRadius: '8px',
                            minHeight: '36px', minWidth: '44px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px',
                          }}>
                          ↓
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Transportation between stops */}
              {index < dayPlan.length - 1 && (() => {
                const transport = getTransportInfo(stop, dayPlan[index + 1]);
                if (!transport) return null;
                return (
                  <div style={{
                    marginLeft: '0', marginBottom: '4px', padding: '8px 12px',
                    display: 'flex', alignItems: 'center', gap: '10px',
                    background: theme.bg.subtle, borderRadius: '10px',
                    border: `1px dashed ${theme.border.subtle}`,
                  }}>
                    <span style={{ fontSize: '16px' }}>{transport.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', color: theme.text.secondary }}>{transport.text}</div>
                      <div style={{ fontSize: '11px', color: theme.text.muted }}>{transport.distance}</div>
                    </div>
                    <a href={transport.mapsUrl} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: '11px', color: theme.accent.amber, textDecoration: 'none' }}>
                      Directions
                    </a>
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      </>)}

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
        {dayPlan.length > 0 && (
          <a href={getRouteUrl()} target="_blank" rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              background: theme.accent.amberGradient, color: theme.text.onAccent,
              border: 'none', borderRadius: '14px', padding: '14px',
              fontSize: '15px', fontWeight: 600, textDecoration: 'none',
              boxShadow: `0 4px 20px ${theme.amberTint.shadow}`,
            }}>
            <DirectionsIcon /> Get Day {activeDay} Route
          </a>
        )}

        <button onClick={sharePlan}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            background: theme.bg.subtleStrong, color: theme.text.primary,
            border: `1px solid ${theme.border.medium}`, borderRadius: '14px',
            padding: '14px', fontSize: '15px', fontWeight: 500, cursor: 'pointer',
          }}>
          <ShareIcon /> Share Trip
        </button>

        {dayCount > 1 && (
          <button onClick={() => removeDay(activeDay)}
            style={{
              background: 'none', border: `1px solid ${theme.redTint.borderStrong}`, color: theme.status.red,
              fontSize: '13px', cursor: 'pointer', padding: '10px', borderRadius: '10px',
            }}>
            Delete Day {activeDay}
          </button>
        )}

        <button onClick={clearPlan}
          style={{
            background: 'none', border: 'none', color: theme.text.tertiary,
            fontSize: '13px', cursor: 'pointer', padding: '10px',
          }}>
          Clear all stops
        </button>
      </div>
    </div>
  );
}
