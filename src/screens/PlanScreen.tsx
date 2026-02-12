import { useState, useEffect, useCallback } from 'react';
import { track } from '@vercel/analytics';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { getCardStyle } from '../styles/shared';
import { DirectionsIcon, PhoneIcon, ShareIcon } from '../components/icons';
import { formatDistance } from '../services/places';
import type { Place } from '../services/places';
import { generatePackingList } from '../utils/packingList';
import { findPivotAlternatives } from '../utils/surpriseFilter';
import { PRICE_LEVEL_ESTIMATE, BURN_RATE_PRESETS } from '../data/constants';
import BookingLinks from '../components/BookingLinks';
import type { PackingItem } from '../data/packingItems';
import type { Stop } from '../types';

// Local helpers (not on context)
const getStopName = (stop: Stop) =>
  stop.type === 'event' ? (stop.event?.name || 'Event') : (stop.place?.name || 'Place');

const getStopCategory = (stop: Stop) =>
  stop.type === 'event' ? (stop.event?.category || 'Event') : (stop.place?.categoryDisplay || '');

/** Generate a shareable itinerary image using Canvas API */
function exportDayAsImage(stops: Stop[], dayNum: number, cityName: string) {
  const W = 720;
  const pad = 40;
  const lineH = 48;
  const headerH = 140;
  const footerH = 60;
  const H = headerH + stops.length * lineH + footerH + pad;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1C1917');
  bg.addColorStop(1, '#0C0A09');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Amber accent line
  const accent = ctx.createLinearGradient(0, 0, W, 0);
  accent.addColorStop(0, '#F59E0B');
  accent.addColorStop(1, '#D97706');
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, W, 4);

  // Header
  ctx.fillStyle = '#F59E0B';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText('NXSTOPS', pad, 44);

  ctx.fillStyle = '#FAFAF9';
  ctx.font = 'bold 28px system-ui, sans-serif';
  ctx.fillText(`Day ${dayNum} — ${cityName}`, pad, 88);

  ctx.fillStyle = '#A8A29E';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText(`${stops.length} stop${stops.length !== 1 ? 's' : ''}`, pad, 116);

  // Stops
  stops.forEach((stop, i) => {
    const y = headerH + i * lineH;
    // Number circle
    ctx.beginPath();
    ctx.arc(pad + 14, y + 22, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#F59E0B';
    ctx.fill();
    ctx.fillStyle = '#0C0A09';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${i + 1}`, pad + 14, y + 27);
    ctx.textAlign = 'left';

    // Name
    ctx.fillStyle = '#FAFAF9';
    ctx.font = '600 16px system-ui, sans-serif';
    const name = getStopName(stop);
    ctx.fillText(name.length > 40 ? name.slice(0, 37) + '...' : name, pad + 42, y + 20);

    // Category
    ctx.fillStyle = '#78716C';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(getStopCategory(stop), pad + 42, y + 38);

    // Divider
    if (i < stops.length - 1) {
      ctx.strokeStyle = '#292524';
      ctx.beginPath();
      ctx.moveTo(pad + 42, y + lineH - 2);
      ctx.lineTo(W - pad, y + lineH - 2);
      ctx.stroke();
    }
  });

  // Footer
  const fy = headerH + stops.length * lineH + 20;
  ctx.fillStyle = '#57534E';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('Built with nxstops.com', pad, fy + 16);

  // Share / download
  track('trip_export', { day: String(dayNum), stops: String(stops.length), city: cityName });
  canvas.toBlob(blob => {
    if (!blob) return;
    const file = new File([blob], `nxstops-day${dayNum}.png`, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      navigator.share({ files: [file], title: `NxStops — Day ${dayNum}` });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, 'image/png');
}

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
    getFullTripRouteUrl,
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
    getDaySummary,
    travelGroup,
    pivotStop,
    places: allPlaces,
    dayBudgets,
    setDayBudget,
    activeDayBudget,
    estimatedSpend,
    budgetRemaining,
    budgetPercentUsed,
    isOverBudget,
    requireAuth,
  } = useApp();

  const { theme } = useTheme();
  const cardStyle = getCardStyle(theme);

  const sortedDays = Object.keys(tripDays).map(Number).sort((a, b) => a - b);

  // --- Pack This state ---
  const allStops = Object.values(tripDays).flat();
  const packingItems = generatePackingList(
    allStops,
    weather?.forecast.slice(0, dayCount) || [],
    travelGroup,
  );
  const packStorageKey = `nxstops_pack_${citySlug}`;
  const [checkedItems, setCheckedItems] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(packStorageKey);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const [showPackList, setShowPackList] = useState(false);

  // --- Budget / Pivot state ---
  const [showBurnRatePicker, setShowBurnRatePicker] = useState(false);
  const [pivotStopId, setPivotStopId] = useState<string | null>(null);
  const [pivotAlternatives, setPivotAlternatives] = useState<Place[]>([]);
  const [pivotReason, setPivotReason] = useState<'closed' | 'not_feeling_it' | null>(null);

  useEffect(() => {
    localStorage.setItem(packStorageKey, JSON.stringify([...checkedItems]));
  }, [checkedItems, packStorageKey]);

  const togglePackItem = useCallback((label: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }, []);

  const groupedPackItems = packingItems.reduce<Record<string, PackingItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const categoryLabels: Record<string, string> = {
    essentials: '\u{1F392} Essentials',
    weather: '\u{2601}\u{FE0F} Weather',
    activities: '\u{1F3AF} Activities',
    group: '\u{1F465} Group',
    comfort: '\u{2728} Comfort',
  };

  const daySummary = getDaySummary();

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
              {crewSyncing ? '...' : crewMode ? '\u{1F465} Crew On' : '\u{1F464} Solo'}
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

      {/* Burn Rate Budget Bar */}
      <div style={{
        ...cardStyle, marginBottom: '12px', padding: '14px',
        background: isOverBudget
          ? `linear-gradient(135deg, ${theme.redTint.bg}, ${theme.bg.subtle})`
          : `linear-gradient(135deg, ${theme.greenTint?.bg || 'rgba(34,197,94,0.06)'}, ${theme.bg.subtle})`,
        border: `1px solid ${isOverBudget ? theme.redTint.border : (theme.greenTint?.border || 'rgba(34,197,94,0.15)')}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '14px' }}>{'\u{1F4B0}'}</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: theme.text.primary }}>
              Day {activeDay} Budget
            </span>
          </div>
          <button
            onClick={() => setShowBurnRatePicker(!showBurnRatePicker)}
            style={{
              padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
              border: `1px solid ${theme.amberTint.border20}`,
              background: theme.amberTint.bg10, color: theme.accent.amber,
              cursor: 'pointer',
            }}
          >
            {activeDayBudget === -1 ? '\u{1F680} No Limit' : `$${activeDayBudget}`}
          </button>
        </div>

        {activeDayBudget > 0 && (
          <>
            <div style={{
              height: '6px', borderRadius: '3px', background: theme.bg.subtleMedium,
              overflow: 'hidden', marginBottom: '6px',
            }}>
              <div style={{
                height: '100%', borderRadius: '3px',
                width: `${Math.min(100, budgetPercentUsed)}%`,
                background: isOverBudget
                  ? theme.status.red
                  : budgetPercentUsed > 75
                    ? theme.accent.amber
                    : (theme.status?.green || '#22C55E'),
                transition: 'width 0.3s ease',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: theme.text.secondary }}>
                ~${estimatedSpend} estimated
              </span>
              <span style={{
                color: isOverBudget ? theme.status.red : (theme.status?.green || '#22C55E'),
                fontWeight: 600,
              }}>
                {isOverBudget
                  ? `$${Math.abs(Math.round(budgetRemaining))} over`
                  : `$${Math.round(budgetRemaining)} left`}
              </span>
            </div>
          </>
        )}

        {activeDayBudget === -1 && (
          <div style={{ fontSize: '11px', color: theme.text.tertiary }}>
            No budget set — tap to set a burn rate for today
          </div>
        )}
      </div>

      {/* Burn Rate Picker */}
      {showBurnRatePicker && (
        <div style={{ ...cardStyle, marginBottom: '12px', padding: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: theme.text.primary, marginBottom: '10px' }}>
            Set your burn rate for Day {activeDay}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {BURN_RATE_PRESETS.map(preset => {
              const isActive = activeDayBudget === preset.value;
              return (
                <button key={preset.value}
                  onClick={() => { setDayBudget(activeDay, preset.value); setShowBurnRatePicker(false); }}
                  style={{
                    padding: '12px 8px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center',
                    border: isActive ? `2px solid ${theme.accent.amber}` : `1px solid ${theme.border.strong}`,
                    background: isActive ? theme.amberTint.bg15 : theme.bg.subtle,
                  }}>
                  <div style={{ fontSize: '16px', marginBottom: '2px' }}>{preset.emoji}</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: theme.text.primary }}>{preset.label}</div>
                  <div style={{ fontSize: '10px', color: theme.text.tertiary }}>{preset.desc}</div>
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <input
              type="number"
              placeholder="Custom $"
              min="0"
              style={{
                flex: 1, padding: '10px', borderRadius: '10px',
                border: `1px solid ${theme.border.strong}`, background: theme.bg.input,
                color: theme.text.primary, fontSize: '14px',
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const val = parseInt((e.target as HTMLInputElement).value);
                  if (!isNaN(val) && val >= 0) {
                    setDayBudget(activeDay, val);
                    setShowBurnRatePicker(false);
                  }
                }
              }}
            />
          </div>
        </div>
      )}

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
                      <img src={stop.place.photoUrl} alt={stop.place.name} loading="lazy" decoding="async"
                        style={{ width: '80px', height: '80px', borderRadius: '12px', flexShrink: 0, objectFit: 'cover' }} />
                    )}
                    {stop.type === 'event' && stop.event?.imageUrl && (
                      <img src={stop.event.imageUrl} alt={stop.event.name} loading="lazy" decoding="async"
                        style={{ width: '80px', height: '80px', borderRadius: '12px', flexShrink: 0, objectFit: 'cover' }} />
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {getStopName(stop)}
                      </h3>
                      {stop.type === 'place' && stop.place && (
                        <>
                          <p style={{ fontSize: '12px', color: theme.text.secondary, marginBottom: '4px' }}>
                            {stop.place.categoryDisplay}
                            {stop.place.priceLevel >= 0 && (
                              <span style={{ color: stop.place.priceLevel >= 3 ? theme.accent.amber : theme.text.tertiary }}>
                                {' '}· ~${PRICE_LEVEL_ESTIMATE[stop.place.priceLevel] ?? 15}
                              </span>
                            )}
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
                        {/* Pivot button */}
                        {stop.type === 'place' && stop.place && (
                          <button
                            onClick={() => {
                              const excludeIds = new Set(dayPlan.map(s => s.place?.placeId).filter(Boolean) as string[]);
                              const stopData = {
                                category: stop.place!.category,
                                lat: stop.place!.lat,
                                lng: stop.place!.lng,
                                priceLevel: stop.place!.priceLevel,
                                placeId: stop.place!.placeId,
                              };
                              const alternatives = findPivotAlternatives(allPlaces, stopData, excludeIds);
                              if (alternatives.length > 0) {
                                setPivotStopId(stop.id);
                                setPivotAlternatives(alternatives);
                                setPivotReason(null);
                              } else {
                                showToast('No alternatives found nearby');
                              }
                              track('pivot_initiated', { place: stop.place!.name, day: String(activeDay) });
                            }}
                            style={{
                              padding: '5px 10px', borderRadius: '8px', fontSize: '11px',
                              background: theme.amberTint.bg10, color: theme.accent.amber,
                              border: `1px solid ${theme.amberTint.border20}`,
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                            }}
                          >
                            {'\u{1F504}'} Pivot
                          </button>
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
                    marginLeft: '0', marginBottom: '4px', padding: '10px 12px',
                    background: theme.bg.subtle, borderRadius: '10px',
                    border: `1px dashed ${theme.border.subtle}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '16px' }}>{transport.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', color: theme.text.secondary }}>{transport.text}</div>
                        <div style={{ fontSize: '11px', color: theme.text.muted }}>{transport.distance}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <a href={transport.walkMapsUrl} target="_blank" rel="noopener noreferrer"
                        style={{
                          flex: 1, padding: '6px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                          background: theme.amberTint.bg10, color: theme.accent.amber,
                          textDecoration: 'none', textAlign: 'center',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                        }}>
                        {'\u{1F6B6}'} Walk {transport.walkMinutes}m
                      </a>
                      <a href={transport.driveMapsUrl} target="_blank" rel="noopener noreferrer"
                        style={{
                          flex: 1, padding: '6px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                          background: theme.bg.subtleMedium, color: theme.text.secondary,
                          textDecoration: 'none', textAlign: 'center',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                        }}>
                        {'\u{1F697}'} Drive {transport.driveMinutes}m
                      </a>
                    </div>
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      </>)}

      {/* Day Summary */}
      {daySummary && dayPlan.length >= 2 && (
        <div style={{
          ...cardStyle, marginTop: '12px', padding: '14px',
          background: `linear-gradient(135deg, ${theme.amberTint.bg06}, ${theme.bg.subtle})`,
          border: `1px solid ${theme.amberTint.border15}`,
          display: 'flex', justifyContent: 'space-around', textAlign: 'center',
        }}>
          <div>
            <div style={{ fontSize: '11px', color: theme.text.tertiary, marginBottom: '2px' }}>Total Distance</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: theme.text.primary }}>{daySummary.distance}</div>
          </div>
          <div style={{ width: '1px', background: theme.border.subtle }} />
          <div>
            <div style={{ fontSize: '11px', color: theme.text.tertiary, marginBottom: '2px' }}>{'\u{1F6B6}'} Walking</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: theme.text.primary }}>{daySummary.totalWalkMin}m</div>
          </div>
          <div style={{ width: '1px', background: theme.border.subtle }} />
          <div>
            <div style={{ fontSize: '11px', color: theme.text.tertiary, marginBottom: '2px' }}>{'\u{1F697}'} Driving</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: theme.text.primary }}>{daySummary.totalDriveMin}m</div>
          </div>
        </div>
      )}

      {/* Pack This Checklist */}
      {allStops.length > 0 && packingItems.length > 0 && (
        <div style={{ ...cardStyle, marginTop: '12px', padding: '0', overflow: 'hidden' }}>
          <button
            onClick={() => setShowPackList(!showPackList)}
            style={{
              width: '100%', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>{'\u{1F392}'}</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: theme.text.primary }}>Pack This</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px',
                background: checkedItems.size === packingItems.length ? theme.greenTint?.bg || 'rgba(34,197,94,0.1)' : theme.amberTint.bg10,
                color: checkedItems.size === packingItems.length ? theme.status?.green || '#22C55E' : theme.accent.amber,
              }}>
                {checkedItems.size}/{packingItems.length}
              </span>
              <span style={{ color: theme.text.tertiary, fontSize: '14px', transform: showPackList ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                {'\u{25BC}'}
              </span>
            </div>
          </button>
          {showPackList && (
            <div style={{ padding: '0 16px 16px' }}>
              {Object.entries(groupedPackItems).map(([cat, items]) => (
                <div key={cat} style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', color: theme.text.tertiary, fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {categoryLabels[cat] || cat}
                  </div>
                  {items.map(item => {
                    const checked = checkedItems.has(item.label);
                    return (
                      <button
                        key={item.label}
                        onClick={() => togglePackItem(item.label)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                          padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer',
                          opacity: checked ? 0.5 : 1,
                        }}>
                        <div style={{
                          width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
                          border: checked ? 'none' : `2px solid ${theme.border.strong}`,
                          background: checked ? theme.accent.amberGradient : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '12px', color: '#0C0A09',
                        }}>
                          {checked && '\u{2713}'}
                        </div>
                        <span style={{
                          fontSize: '13px', color: theme.text.primary,
                          textDecoration: checked ? 'line-through' : 'none',
                        }}>
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Book Your Trip */}
      {cityLabel && totalStops > 0 && (
        <BookingLinks cityName={cityLabel} theme={theme} cardStyle={cardStyle} />
      )}

      {/* Pivot Modal */}
      {pivotStopId && pivotAlternatives.length > 0 && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}
          onClick={() => { setPivotStopId(null); setPivotAlternatives([]); setPivotReason(null); }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '440px', maxHeight: '85vh', overflowY: 'auto',
              background: theme.bg.primary, borderRadius: '20px 20px 0 0',
              padding: '24px 20px', paddingBottom: '40px',
            }}
          >
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '28px', marginBottom: '4px' }}>{'\u{1F504}'}</div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: theme.text.primary, margin: '0 0 4px 0' }}>
                Plan B
              </h3>
              <p style={{ fontSize: '13px', color: theme.text.secondary, margin: 0 }}>
                Pick an alternative — your day stays on track
              </p>
            </div>

            {/* Reason buttons */}
            {!pivotReason && (
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                {[
                  { key: 'closed' as const, label: "It's closed", emoji: '\u{1F6AA}' },
                  { key: 'not_feeling_it' as const, label: 'Not feeling it', emoji: '\u{1F645}' },
                ].map(r => (
                  <button
                    key={r.key}
                    onClick={() => {
                      setPivotReason(r.key);
                      track('pivot_reason', { reason: r.key, stopId: pivotStopId });
                    }}
                    style={{
                      flex: 1, padding: '12px', borderRadius: '12px', cursor: 'pointer',
                      background: theme.bg.subtleStrong, border: `1px solid ${theme.border.medium}`,
                      color: theme.text.primary, fontSize: '13px', fontWeight: 500,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    }}
                  >
                    {r.emoji} {r.label}
                  </button>
                ))}
              </div>
            )}

            {/* Alternative cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pivotAlternatives.map(alt => (
                <div
                  key={alt.placeId}
                  style={{
                    ...cardStyle,
                    display: 'flex', gap: '12px', alignItems: 'center',
                    padding: '14px',
                  }}
                >
                  {/* Photo */}
                  <div style={{
                    width: '64px', height: '64px', borderRadius: '12px', flexShrink: 0,
                    overflow: 'hidden', background: theme.bg.subtleStrong,
                  }}>
                    {alt.photoUrl ? (
                      <img src={alt.photoUrl} alt={alt.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{
                        width: '100%', height: '100%', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: '24px', color: theme.text.tertiary,
                      }}>
                        {'\u{1F4CD}'}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '14px', fontWeight: 600, color: theme.text.primary,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {alt.name}
                    </div>
                    <div style={{ fontSize: '12px', color: theme.text.secondary, marginTop: '2px' }}>
                      {alt.categoryDisplay || alt.category}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      {alt.rating > 0 && (
                        <span style={{ fontSize: '11px', color: theme.accent.amber, fontWeight: 600 }}>
                          {'\u{2B50}'} {alt.rating.toFixed(1)}
                        </span>
                      )}
                      <span style={{ fontSize: '11px', color: theme.text.tertiary }}>
                        {'$'.repeat(Math.max(1, alt.priceLevel))}
                      </span>
                      <span style={{ fontSize: '11px', color: theme.status.green }}>
                        ~${PRICE_LEVEL_ESTIMATE[alt.priceLevel] ?? 15}
                      </span>
                    </div>
                  </div>

                  {/* Swap button */}
                  <button
                    onClick={() => {
                      pivotStop(pivotStopId, alt);
                      track('pivot_swapped', { newPlace: alt.name, reason: pivotReason || 'unknown' });
                      setPivotStopId(null);
                      setPivotAlternatives([]);
                      setPivotReason(null);
                    }}
                    style={{
                      padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
                      background: theme.accent.amberGradient, color: theme.text.onAccent,
                      border: 'none', fontSize: '12px', fontWeight: 600,
                      whiteSpace: 'nowrap', flexShrink: 0,
                    }}
                  >
                    Swap
                  </button>
                </div>
              ))}
            </div>

            {/* Dismiss */}
            <button
              onClick={() => { setPivotStopId(null); setPivotAlternatives([]); setPivotReason(null); }}
              style={{
                width: '100%', marginTop: '16px', padding: '14px',
                background: 'none', border: `1px solid ${theme.border.medium}`,
                borderRadius: '12px', color: theme.text.secondary,
                fontSize: '14px', fontWeight: 500, cursor: 'pointer',
              }}
            >
              Keep original
            </button>
          </div>
        </div>
      )}

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

        {dayCount > 1 && totalStops >= 2 && getFullTripRouteUrl() && (
          <a href={getFullTripRouteUrl()} target="_blank" rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              background: theme.bg.subtleStrong, color: theme.text.primary,
              border: `1px solid ${theme.border.medium}`, borderRadius: '14px',
              padding: '14px', fontSize: '14px', fontWeight: 500, textDecoration: 'none',
            }}>
            <DirectionsIcon /> Full Trip Route ({totalStops} stops)
          </a>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={sharePlan}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              background: theme.bg.subtleStrong, color: theme.text.primary,
              border: `1px solid ${theme.border.medium}`, borderRadius: '14px',
              padding: '14px', fontSize: '15px', fontWeight: 500, cursor: 'pointer',
            }}>
            <ShareIcon /> Share Trip
          </button>
          {dayPlan.length > 0 && (
            <button onClick={() => { if (!requireAuth()) return; exportDayAsImage(dayPlan, activeDay, cityLabel); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '14px 20px', borderRadius: '14px', cursor: 'pointer',
                border: `1px solid ${theme.border.medium}`,
                background: theme.bg.subtleStrong, color: theme.text.primary,
                fontSize: '14px', fontWeight: 500, flexShrink: 0,
              }}>
              📸 Export
            </button>
          )}
        </div>

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
