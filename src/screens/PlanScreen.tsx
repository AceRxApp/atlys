import { useApp } from '../context/AppContext';
import { cardStyle } from '../styles/shared';
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

  const sortedDays = Object.keys(tripDays).map(Number).sort((a, b) => a - b);

  if (totalStops === 0 && !crewMode) {
    return (
      <div style={{ textAlign: 'center', paddingTop: '60px' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.6 }}>🗺️</div>
        <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>No stops yet</h2>
        <p style={{ color: '#A8A29E', fontSize: '14px', marginBottom: '24px', lineHeight: 1.5 }}>
          Explore places and tap &quot;+ Add&quot; to build your trip plan
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => setScreen('discover')}
            style={{
              background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#0C0A09',
              border: 'none', borderRadius: '14px', padding: '14px 28px',
              fontSize: '15px', fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(245,158,11,0.3)',
            }}
          >
            Start Exploring →
          </button>
          <button
            onClick={() => setShowJoinCrew(true)}
            style={{
              background: 'none', border: '1px solid rgba(255,255,255,0.1)',
              color: '#A8A29E', borderRadius: '14px', padding: '12px 24px',
              fontSize: '14px', cursor: 'pointer',
            }}
          >
            👥 Join a Crew
          </button>
        </div>
        {/* Inline Join Crew */}
        {showJoinCrew && (
          <div style={{ ...cardStyle, marginTop: '20px', padding: '16px', textAlign: 'left' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#FFFBEB' }}>Enter Crew Code</div>
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
                  border: '1px solid rgba(255,255,255,0.1)', background: '#0C0A09',
                  color: '#FFFBEB', fontSize: '18px', fontWeight: 700,
                  letterSpacing: '4px', textAlign: 'center', outline: 'none',
                }}
              />
              <button
                onClick={() => joinCrew()}
                disabled={crewSyncing || joinCrewInput.length < 4}
                style={{
                  padding: '12px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                  background: joinCrewInput.length >= 4 ? '#F59E0B' : 'rgba(255,255,255,0.06)',
                  color: joinCrewInput.length >= 4 ? '#0C0A09' : '#78716C',
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
                  border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                  color: '#78716C', cursor: 'pointer',
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
                border: crewMode ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.1)',
                background: crewMode ? 'rgba(245,158,11,0.12)' : 'transparent',
                color: crewMode ? '#F59E0B' : '#78716C', cursor: crewSyncing ? 'default' : 'pointer',
                opacity: crewSyncing ? 0.5 : 1,
              }}>
              {crewSyncing ? '...' : crewMode ? '👥 Crew On' : '👤 Solo'}
            </button>
          </div>
        </div>
        <p style={{ color: '#78716C', fontSize: '13px' }}>
          {cityLabel} · {totalStops} stop{totalStops !== 1 ? 's' : ''} · {dayCount} day{dayCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Join Crew Modal */}
      {showJoinCrew && (
        <div style={{
          ...cardStyle, marginBottom: '12px', padding: '16px',
          background: 'rgba(28,25,23,0.95)', border: '1px solid rgba(245,158,11,0.15)',
        }}>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px', color: '#FFFBEB' }}>Join a Crew</div>
          <p style={{ fontSize: '12px', color: '#A8A29E', marginBottom: '12px' }}>Enter the crew code shared with you</p>
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
                border: '1px solid rgba(255,255,255,0.1)', background: '#0C0A09',
                color: '#FFFBEB', fontSize: '18px', fontWeight: 700,
                letterSpacing: '4px', textAlign: 'center', outline: 'none',
                textTransform: 'uppercase',
              }}
            />
            <button onClick={joinCrew} disabled={crewSyncing || joinCrewInput.length < 4}
              style={{
                padding: '12px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                background: joinCrewInput.length >= 4 ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'rgba(255,255,255,0.06)',
                color: joinCrewInput.length >= 4 ? '#0C0A09' : '#78716C',
                fontSize: '14px', fontWeight: 600,
              }}>
              {crewSyncing ? '...' : 'Join'}
            </button>
          </div>
          <button onClick={() => { setShowJoinCrew(false); setJoinCrewInput(''); }}
            style={{ width: '100%', padding: '8px', marginTop: '8px', background: 'none', border: 'none', color: '#78716C', fontSize: '12px', cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      )}

      {/* Crew Mode Banner */}
      {crewMode && crewCode && (
        <div style={{
          ...cardStyle, marginBottom: '12px', padding: '16px',
          background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(217,119,6,0.05))',
          border: '1px solid rgba(245,158,11,0.2)',
        }}>
          <div style={{ fontSize: '11px', color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Share this code with your crew</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{
              flex: 1, fontSize: '28px', fontWeight: 700, letterSpacing: '6px', color: '#F59E0B',
              background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '10px 16px', textAlign: 'center',
              fontFamily: 'monospace',
            }}>{crewCode}</div>
            <button onClick={() => { navigator.clipboard.writeText(crewCode); showToast('Code copied!'); }}
              style={{
                padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(245,158,11,0.3)',
                background: 'rgba(245,158,11,0.1)', color: '#F59E0B', cursor: 'pointer',
                fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap',
              }}>
              Copy
            </button>
          </div>
          <button onClick={shareCrewPlan}
            style={{
              width: '100%', padding: '12px', borderRadius: '12px', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #F59E0B, #D97706)',
              color: '#0C0A09', fontSize: '14px', fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}>
            📤 Share Plan with Crew
          </button>
          <p style={{ fontSize: '11px', color: '#A8A29E', marginTop: '8px', lineHeight: 1.4, textAlign: 'center' }}>
            Your crew opens the app → Plan tab → &quot;Join Crew&quot; → enters the code above
          </p>
        </div>
      )}

      {/* Trip Weather Forecast */}
      {weather && weather.forecast.length > 0 && dayCount > 0 && (
        <div style={{ ...cardStyle, marginBottom: '12px', padding: '12px', background: 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(147,197,253,0.03))', border: '1px solid rgba(59,130,246,0.1)' }}>
          <div style={{ fontSize: '11px', color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Pack for your trip</div>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {weather.forecast.slice(0, dayCount).map((day, i) => (
              <div key={day.date} style={{ textAlign: 'center', minWidth: '60px', flexShrink: 0, padding: '6px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)' }}>
                <div style={{ fontSize: '10px', color: '#78716C', marginBottom: '2px' }}>Day {i + 1}</div>
                <div style={{ fontSize: '20px', marginBottom: '2px' }}>{day.emoji}</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#FFFBEB' }}>{day.high}°</div>
                <div style={{ fontSize: '10px', color: '#78716C' }}>{day.low}°</div>
                {day.precipChance > 30 && (
                  <div style={{ fontSize: '9px', color: '#93C5FD', marginTop: '2px' }}>💧 {day.precipChance}%</div>
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
                background: isActive ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'rgba(255,255,255,0.06)',
                color: isActive ? '#0C0A09' : '#A8A29E',
              }}>
              Day {day} ({stops.length})
            </button>
          );
        })}
        <button onClick={addDay}
          style={{
            padding: '8px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 600,
            border: '1px dashed rgba(255,255,255,0.15)', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            background: 'transparent', color: '#78716C',
          }}>
          + Day
        </button>
      </div>

      {/* Active day stops */}
      {dayPlan.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '32px 20px' }}>
          <p style={{ color: '#A8A29E', fontSize: '14px' }}>No stops on Day {activeDay} yet. Explore to add some!</p>
        </div>
      ) : (<>
        {dayPlan.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', padding: '6px 10px', borderRadius: '8px', background: 'rgba(245,158,11,0.06)' }}>
            <span style={{ fontSize: '12px' }}>↕️</span>
            <span style={{ fontSize: '11px', color: '#D97706', fontWeight: 500 }}>Tap the arrows to reorder your stops</span>
          </div>
        )}
        <div style={{ position: 'relative', paddingLeft: '32px' }}>
          {/* Vertical route line */}
          <div style={{
            position: 'absolute', left: '14px', top: '16px',
            bottom: '16px', width: '2px',
            background: 'linear-gradient(to bottom, #F59E0B, rgba(245,158,11,0.1))',
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
                    ? 'linear-gradient(135deg, #8B5CF6, #7C3AED)'
                    : 'linear-gradient(135deg, #F59E0B, #D97706)',
                  color: stop.type === 'event' ? '#FFFBEB' : '#0C0A09',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: 700, zIndex: 1,
                  boxShadow: '0 0 0 4px #0C0A09',
                }}>
                  {index + 1}
                </div>

                {/* Stop card */}
                <div style={{
                  ...cardStyle, marginBottom: 0, overflow: 'hidden',
                  border: stop.type === 'event'
                    ? '1px solid rgba(139,92,246,0.15)'
                    : '1px solid rgba(245,158,11,0.1)',
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
                          <p style={{ fontSize: '12px', color: '#A8A29E', marginBottom: '4px' }}>
                            {stop.place.categoryDisplay}
                            {stop.place.distance != null && ` · ${formatDistance(stop.place.distance, useMiles)} ${getDistanceReference()}`}
                          </p>
                          {stop.place.rating > 0 && (
                            <div style={{ fontSize: '12px' }}>
                              <span style={{ color: '#F59E0B' }}>★ {stop.place.rating.toFixed(1)}</span>
                              <span style={{ color: '#78716C' }}> ({stop.place.reviewCount})</span>
                            </div>
                          )}
                        </>
                      )}
                      {stop.type === 'event' && stop.event && (
                        <>
                          <p style={{ fontSize: '12px', color: '#C084FC', marginBottom: '4px' }}>
                            {formatEventDate(stop.event.date)}
                            {stop.event.time && ` · ${formatEventTime(stop.event.time)}`}
                          </p>
                          <p style={{ fontSize: '12px', color: '#A8A29E' }}>
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
                              background: 'rgba(245,158,11,0.1)', color: '#F59E0B',
                              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px',
                            }}>
                            <DirectionsIcon /> Go
                          </a>
                        )}
                        {stop.type === 'place' && stop.place?.phone && (
                          <a href={`tel:${stop.place.phone}`}
                            style={{
                              padding: '5px 10px', borderRadius: '8px', fontSize: '11px',
                              background: 'rgba(255,255,255,0.05)', color: '#A8A29E',
                              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px',
                            }}>
                            <PhoneIcon /> Call
                          </a>
                        )}
                        {stop.type === 'event' && stop.event?.url && (
                          <a href={stop.event.url} target="_blank" rel="noopener noreferrer"
                            style={{
                              padding: '5px 10px', borderRadius: '8px', fontSize: '11px',
                              background: 'rgba(139,92,246,0.1)', color: '#C084FC',
                              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px',
                            }}>
                            🎫 Tickets
                          </a>
                        )}
                        {/* Move to different day */}
                        {dayCount > 1 && (
                          <select
                            value=""
                            onChange={e => { if (e.target.value) moveStopToDay(stop.id, activeDay, Number(e.target.value)); }}
                            style={{
                              padding: '5px 8px', borderRadius: '8px', fontSize: '11px',
                              background: 'rgba(255,255,255,0.05)', color: '#78716C',
                              border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer',
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
                            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
                            color: '#F59E0B', cursor: 'pointer', fontSize: '14px', fontWeight: 700,
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
                          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
                          color: '#F87171', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
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
                            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
                            color: '#F59E0B', cursor: 'pointer', fontSize: '14px', fontWeight: 700,
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
                    background: 'rgba(255,255,255,0.02)', borderRadius: '10px',
                    border: '1px dashed rgba(255,255,255,0.06)',
                  }}>
                    <span style={{ fontSize: '16px' }}>{transport.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', color: '#A8A29E' }}>{transport.text}</div>
                      <div style={{ fontSize: '11px', color: '#57534E' }}>{transport.distance}</div>
                    </div>
                    <a href={transport.mapsUrl} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: '11px', color: '#F59E0B', textDecoration: 'none' }}>
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
              background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#0C0A09',
              border: 'none', borderRadius: '14px', padding: '14px',
              fontSize: '15px', fontWeight: 600, textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(245,158,11,0.3)',
            }}>
            <DirectionsIcon /> Get Day {activeDay} Route
          </a>
        )}

        <button onClick={sharePlan}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            background: 'rgba(255,255,255,0.06)', color: '#FFFBEB',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px',
            padding: '14px', fontSize: '15px', fontWeight: 500, cursor: 'pointer',
          }}>
          <ShareIcon /> Share Trip
        </button>

        {dayCount > 1 && (
          <button onClick={() => removeDay(activeDay)}
            style={{
              background: 'none', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171',
              fontSize: '13px', cursor: 'pointer', padding: '10px', borderRadius: '10px',
            }}>
            Delete Day {activeDay}
          </button>
        )}

        <button onClick={clearPlan}
          style={{
            background: 'none', border: 'none', color: '#78716C',
            fontSize: '13px', cursor: 'pointer', padding: '10px',
          }}>
          Clear all stops
        </button>
      </div>
    </div>
  );
}
