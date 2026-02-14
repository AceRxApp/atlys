import { useState, useEffect, useCallback } from 'react';
import { track } from '@vercel/analytics';
import { useApp } from '../context/AppContext';
import { DirectionsIcon, PhoneIcon, ShareIcon } from '../components/icons';
import { formatDistance } from '../services/places';
import type { Place } from '../services/places';
import { generatePackingList } from '../utils/packingList';
import { findPivotAlternatives } from '../utils/surpriseFilter';
import { getPlaceBookingUrl } from '../data/bookingLinks';
import type { PackingItem } from '../data/packingItems';
import CurrencyWidget from '../components/CurrencyWidget';
import { getNightRisk, isNightTime } from '../utils/safetyEngine';
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
    requireAuth,
    lastPlanTitle,
    estimatedSpend,
    rateStop,
    getRating,
    shareAsLink,
    saveForOffline,
    offlineSaved,
    offlineSaving,
  } = useApp();


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

  // --- Pivot state ---
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
      <div className="text-center pt-[60px]">
        <div className="text-[64px] mb-4 opacity-60">&#x1f5fa;&#xfe0f;</div>
        <h2 className="text-[22px] font-bold mb-2">No stops yet</h2>
        <p className="text-text-secondary text-sm mb-6 leading-normal">
          Explore places and tap &quot;+ Add&quot; to build your trip plan
        </p>
        <div className="flex flex-col gap-2.5 items-center">
          <button
            onClick={() => setScreen('discover')}
            className="bg-accent-gradient text-text-on-accent border-none rounded-[14px] py-3.5 px-7 text-[15px] font-semibold cursor-pointer shadow-[0_4px_20px_var(--amber-tint-shadow)]"
          >
            Start Exploring →
          </button>
          <button
            onClick={() => setShowJoinCrew(true)}
            className="bg-transparent border border-border-strong text-text-secondary rounded-[14px] py-3 px-6 text-sm cursor-pointer"
          >
            &#x1f465; Join a Crew
          </button>
        </div>
        {/* Inline Join Crew */}
        {showJoinCrew && (
          <div className="card mt-5 p-4 text-left">
            <div className="text-sm font-semibold mb-2 text-text-primary">Enter Crew Code</div>
            <div className="flex gap-2">
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
                className="flex-1 p-3 rounded-[10px] border border-border-strong bg-bg-input text-text-primary text-lg font-bold tracking-[4px] text-center outline-none"
              />
              <button
                onClick={() => joinCrew()}
                disabled={crewSyncing || joinCrewInput.length < 4}
                className={`py-3 px-5 rounded-[10px] border-none cursor-pointer text-sm font-semibold ${
                  joinCrewInput.length >= 4
                    ? 'bg-accent-amber text-text-on-accent'
                    : 'bg-border-subtle text-text-tertiary'
                }`}>
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
      <div className="mb-4">
        <div className="flex justify-between items-center">
          <h1 className="text-[22px] font-bold mb-1">
            {lastPlanTitle || 'Your Trip Plan'}
          </h1>
          {/* Crew Toggle */}
          <div className="flex gap-1.5">
            {!crewMode && (
              <button onClick={() => setShowJoinCrew(true)}
                className="py-1.5 px-3 rounded-[20px] text-[11px] font-semibold border border-border-strong bg-transparent text-text-tertiary cursor-pointer">
                Join Crew
              </button>
            )}
            <button
              onClick={crewMode ? stopCrewMode : startCrewMode}
              disabled={crewSyncing}
              className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-[20px] text-xs font-semibold cursor-pointer ${
                crewMode
                  ? 'border border-amber-tint-border30 bg-amber-tint-bg15 text-accent-amber'
                  : 'border border-border-strong bg-transparent text-text-tertiary'
              } ${crewSyncing ? 'opacity-50 cursor-default' : ''}`}>
              {crewSyncing ? '...' : crewMode ? '\u{1F465} Crew On' : '\u{1F464} Solo'}
            </button>
          </div>
        </div>
        <p className="text-text-tertiary text-[13px]">
          {cityLabel} · {totalStops} stop{totalStops !== 1 ? 's' : ''} · {dayCount} day{dayCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Join Crew Modal */}
      {showJoinCrew && (
        <div className="card mb-3 p-4 bg-bg-toast border border-amber-tint-border15">
          <div className="text-sm font-semibold mb-2.5 text-text-primary">Join a Crew</div>
          <p className="text-xs text-text-secondary mb-3">Enter the crew code shared with you</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. X7K3NP"
              value={joinCrewInput}
              onChange={e => setJoinCrewInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && joinCrew()}
              maxLength={6}
              className="flex-1 py-3 px-3.5 rounded-[10px] border border-border-strong bg-bg-input text-text-primary text-lg font-bold tracking-[4px] text-center outline-none uppercase"
            />
            <button onClick={joinCrew} disabled={crewSyncing || joinCrewInput.length < 4}
              className={`py-3 px-5 rounded-[10px] border-none cursor-pointer text-sm font-semibold ${
                joinCrewInput.length >= 4
                  ? 'bg-accent-gradient text-text-on-accent'
                  : 'bg-border-subtle text-text-tertiary'
              }`}>
              {crewSyncing ? '...' : 'Join'}
            </button>
          </div>
          <button onClick={() => { setShowJoinCrew(false); setJoinCrewInput(''); }}
            className="w-full p-2 mt-2 bg-transparent border-none text-text-tertiary text-xs cursor-pointer">
            Cancel
          </button>
        </div>
      )}

      {/* Crew Mode Banner */}
      {crewMode && crewCode && (
        <div className="card mb-3 p-4 border border-amber-tint-border20"
          style={{ background: `linear-gradient(135deg, var(--amber-tint-bg10), var(--amber-tint-bg06))` }}>
          <div className="text-[11px] text-text-tertiary uppercase tracking-[0.08em] mb-1.5">Share this code with your crew</div>
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="flex-1 text-[28px] font-bold tracking-[6px] text-accent-amber bg-bg-photo-counter rounded-[10px] py-2.5 px-4 text-center font-mono">
              {crewCode}
            </div>
            <button onClick={() => { navigator.clipboard.writeText(crewCode); showToast('Code copied!'); }}
              className="py-3 px-3.5 rounded-[10px] border border-amber-tint-border30 bg-amber-tint-bg10 text-accent-amber cursor-pointer text-[13px] font-semibold whitespace-nowrap">
              Copy
            </button>
          </div>
          <button onClick={shareCrewPlan}
            className="w-full p-3 rounded-xl border-none cursor-pointer bg-accent-gradient text-text-on-accent text-sm font-semibold flex items-center justify-center gap-1.5">
            &#x1f4e4; Share Plan with Crew
          </button>
          <p className="text-[11px] text-text-secondary mt-2 leading-snug text-center">
            Your crew opens the app → Plan tab → &quot;Join Crew&quot; → enters the code above
          </p>
        </div>
      )}

      {/* Trip Weather Forecast */}
      {weather && weather.forecast.length > 0 && dayCount > 0 && (
        <div className="card mb-3 p-3 border border-blue-tint-border"
          style={{ background: `linear-gradient(135deg, var(--blue-tint-bg), var(--bg-subtle))` }}>
          <div className="text-[11px] text-text-tertiary uppercase tracking-[0.08em] mb-2">Pack for your trip</div>
          <div className="flex gap-2 overflow-x-auto scroll-hidden">
            {weather.forecast.slice(0, dayCount).map((day, i) => (
              <div key={day.date} className="text-center min-w-[60px] shrink-0 p-1.5 rounded-[10px] bg-bg-subtle">
                <div className="text-[10px] text-text-tertiary mb-0.5">Day {i + 1}</div>
                <div className="text-xl mb-0.5">{day.emoji}</div>
                <div className="text-xs font-semibold text-text-primary">{day.high}°</div>
                <div className="text-[10px] text-text-tertiary">{day.low}°</div>
                {day.precipChance > 30 && (
                  <div className="text-[9px] text-status-blue mt-0.5">&#x1f4a7; {day.precipChance}%</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Day Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-3 scroll-hidden">
        {sortedDays.map(day => {
          const stops = tripDays[day] || [];
          const isActive = activeDay === day;
          return (
            <button key={day} onClick={() => setActiveDay(day)}
              className={`py-2 px-4 rounded-xl text-[13px] font-semibold border-none cursor-pointer whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-accent-gradient text-text-on-accent'
                  : 'bg-bg-subtle-strong text-text-secondary'
              }`}>
              Day {day} ({stops.length})
            </button>
          );
        })}
        <button onClick={addDay}
          className="py-2 px-4 rounded-xl text-[13px] font-semibold border border-dashed border-border-dashed cursor-pointer whitespace-nowrap shrink-0 bg-transparent text-text-tertiary">
          + Day
        </button>
      </div>

      {/* Estimated Day Cost */}
      {dayPlan.length > 0 && estimatedSpend > 0 && (
        <div className="card mb-3 p-3.5 border border-amber-tint-border15"
          style={{ background: `linear-gradient(135deg, var(--amber-tint-bg06), var(--bg-subtle))` }}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{'\u{1F4B0}'}</span>
              <span className="text-xs font-semibold text-text-primary">Estimated Day Cost</span>
            </div>
            <span className="text-lg font-bold text-accent-amber">~${estimatedSpend}</span>
          </div>
          <div className="text-[11px] text-text-tertiary mt-1">
            Based on {dayPlan.length} stop{dayPlan.length !== 1 ? 's' : ''} · per person
          </div>
        </div>
      )}

      {/* Currency Converter */}
      {dayPlan.length > 0 && <CurrencyWidget cityName={cityLabel} />}

      {/* Active day stops */}
      {dayPlan.length === 0 ? (
        <div className="card text-center py-8 px-5">
          <p className="text-text-secondary text-sm">No stops on Day {activeDay} yet. Explore to add some!</p>
        </div>
      ) : (<>
        {dayPlan.length > 1 && (
          <div className="flex items-center gap-1.5 mb-2 py-1.5 px-2.5 rounded-lg bg-amber-tint-bg06">
            <span className="text-xs">&#x2195;&#xfe0f;</span>
            <span className="text-[11px] text-accent-amber-dark font-medium">Tap the arrows to reorder your stops</span>
          </div>
        )}
        <div className="relative pl-8">
          {/* Vertical route line */}
          <div
            className="absolute left-3.5 top-4 bottom-4 w-0.5 rounded-sm"
            style={{ background: `linear-gradient(to bottom, var(--accent-amber), var(--amber-tint-bg10))` }}
          />

          {dayPlan.map((stop, index) => (
            <div key={stop.id}>
              <div className={`relative ${index < dayPlan.length - 1 ? 'mb-1' : 'mb-4'}`}>
                {/* Stop number circle */}
                <div
                  className={`absolute -left-8 top-4 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold z-[1] ${
                    stop.type === 'event'
                      ? 'bg-events-gradient text-text-primary'
                      : 'bg-accent-gradient text-text-on-accent'
                  }`}
                  style={{ boxShadow: `0 0 0 4px var(--bg-body)` }}
                >
                  {index + 1}
                </div>

                {/* Stop card */}
                <div className={`card mb-0 overflow-hidden ${
                  stop.type === 'event'
                    ? 'border border-purple-tint-border15'
                    : 'border border-amber-tint-bg10'
                }`}>
                  <div className="flex gap-3">
                    {stop.type === 'place' && stop.place?.photoUrl && (
                      <img src={stop.place.photoUrl} alt={stop.place.name} loading="lazy" decoding="async"
                        className="w-20 h-20 rounded-xl shrink-0 object-cover" />
                    )}
                    {stop.type === 'event' && stop.event?.imageUrl && (
                      <img src={stop.event.imageUrl} alt={stop.event.name} loading="lazy" decoding="async"
                        className="w-20 h-20 rounded-xl shrink-0 object-cover" />
                    )}

                    <div className="flex-1 min-w-0">
                      {/* Time slot from auto-planner */}
                      {stop.timeSlot && (
                        <div className="text-[10px] font-semibold text-accent-amber uppercase tracking-[0.04em] mb-0.5">
                          {stop.timeSlot}
                        </div>
                      )}
                      <h3 className="text-[15px] font-semibold mb-1 overflow-hidden text-ellipsis whitespace-nowrap">
                        {getStopName(stop)}
                      </h3>
                      {stop.type === 'place' && stop.place && (
                        <>
                          <p className="text-xs text-text-secondary mb-1">
                            {stop.place.categoryDisplay}
                            {stop.estimatedSpend && stop.estimatedSpend > 0 ? (
                              <span className="text-accent-amber"> · ~${stop.estimatedSpend}</span>
                            ) : stop.place.priceLevel >= 0 ? (
                              <span className={stop.place.priceLevel >= 3 ? 'text-accent-amber' : 'text-text-tertiary'}>
                                {' '}· {'$'.repeat(Math.max(1, stop.place.priceLevel))}
                              </span>
                            ) : null}
                            {stop.place.distance != null && ` · ${formatDistance(stop.place.distance, useMiles)} ${getDistanceReference()}`}
                          </p>
                          {stop.place.rating > 0 && (
                            <div className="text-xs">
                              <span className="text-accent-amber">{'\u2605'} {stop.place.rating.toFixed(1)}</span>
                              <span className="text-text-tertiary"> ({stop.place.reviewCount})</span>
                            </div>
                          )}
                          {/* AI reason */}
                          {stop.reason && (
                            <p className="text-[11px] text-text-tertiary mt-1 italic leading-snug">{'\u2728'} {stop.reason}</p>
                          )}
                          {/* Night risk (only at night) */}
                          {isNightTime(weather?.sunset) && (() => {
                            const risk = getNightRisk(stop.place.category, stop.place.rating, stop.place.reviewCount, stop.place.openNow);
                            return (
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-[10px]">{risk.emoji}</span>
                                <span className={`text-[10px] font-medium ${
                                  risk.level === 'low' ? 'text-status-green' : risk.level === 'moderate' ? 'text-accent-amber' : 'text-status-red'
                                }`}>
                                  {risk.label}
                                </span>
                              </div>
                            );
                          })()}
                        </>
                      )}
                      {stop.type === 'event' && stop.event && (
                        <>
                          <p className="text-xs text-events-text mb-1">
                            {formatEventDate(stop.event.date)}
                            {stop.event.time && ` · ${formatEventTime(stop.event.time)}`}
                          </p>
                          <p className="text-xs text-text-secondary">
                            {stop.event.venue}
                          </p>
                        </>
                      )}

                      {/* Mini actions */}
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {stop.type === 'place' && stop.place?.googleMapsUrl && (
                          <a href={stop.place.googleMapsUrl} target="_blank" rel="noopener noreferrer"
                            className="py-[5px] px-2.5 rounded-lg text-[11px] bg-amber-tint-bg10 text-accent-amber no-underline flex items-center gap-1">
                            <DirectionsIcon /> Go
                          </a>
                        )}
                        {stop.type === 'place' && stop.place?.phone && (
                          <a href={`tel:${stop.place.phone}`}
                            className="py-[5px] px-2.5 rounded-lg text-[11px] bg-bg-subtle-medium text-text-secondary no-underline flex items-center gap-1">
                            <PhoneIcon /> Call
                          </a>
                        )}
                        {stop.type === 'event' && stop.event?.url && (
                          <a href={stop.event.url} target="_blank" rel="noopener noreferrer"
                            className="py-[5px] px-2.5 rounded-lg text-[11px] bg-purple-tint-bg08 text-events-text no-underline flex items-center gap-1">
                            &#x1f3ab; Tickets
                          </a>
                        )}
                        {/* Move to different day */}
                        {dayCount > 1 && (
                          <select
                            value=""
                            onChange={e => { if (e.target.value) moveStopToDay(stop.id, activeDay, Number(e.target.value)); }}
                            className="py-[5px] px-2 rounded-lg text-[11px] bg-bg-subtle-medium text-text-tertiary border border-border-medium cursor-pointer">
                            <option value="">Move to...</option>
                            {sortedDays.filter(d => d !== activeDay).map(d => (
                              <option key={d} value={d}>Day {d}</option>
                            ))}
                          </select>
                        )}
                        {/* Contextual booking link */}
                        {stop.type === 'place' && stop.place && (() => {
                          const booking = getPlaceBookingUrl(stop.place!.name, stop.place!.category, cityLabel);
                          if (!booking) return null;
                          return (
                            <a href={booking.url} target="_blank" rel="noopener noreferrer"
                              onClick={() => track('plan_booking_click', { place: stop.place!.name, service: booking.service })}
                              className="py-[5px] px-2.5 rounded-lg text-[11px] bg-green-tint-bg text-status-green no-underline flex items-center gap-1 border border-green-tint-border">
                              {'\u{1F517}'} {booking.label}
                            </a>
                          );
                        })()}
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
                            className="py-[5px] px-2.5 rounded-lg text-[11px] bg-amber-tint-bg10 text-accent-amber border border-amber-tint-border20 cursor-pointer flex items-center gap-1"
                          >
                            {'\u{1F504}'} Pivot
                          </button>
                        )}
                        {/* Thumbs up/down */}
                        <button
                          onClick={() => {
                            const pid = stop.place?.placeId || stop.event?.id || '';
                            rateStop(stop.id, pid, 'up');
                          }}
                          className={`py-[5px] px-2.5 rounded-lg text-[11px] cursor-pointer flex items-center gap-1 border ${
                            getRating(stop.id) === 'up'
                              ? 'bg-green-tint-bg border-green-tint-border text-status-green'
                              : 'bg-bg-subtle-medium border-border-subtle text-text-tertiary'
                          }`}
                        >
                          {'\u{1F44D}'}
                        </button>
                        <button
                          onClick={() => {
                            const pid = stop.place?.placeId || stop.event?.id || '';
                            rateStop(stop.id, pid, 'down');
                            if (getRating(stop.id) !== 'down') showToast('Tap Pivot to swap this stop');
                          }}
                          className={`py-[5px] px-2.5 rounded-lg text-[11px] cursor-pointer flex items-center gap-1 border ${
                            getRating(stop.id) === 'down'
                              ? 'bg-red-tint-bg border-red-tint-border text-status-red'
                              : 'bg-bg-subtle-medium border-border-subtle text-text-tertiary'
                          }`}
                        >
                          {'\u{1F44E}'}
                        </button>
                      </div>
                    </div>

                    {/* Right controls: reorder + remove */}
                    <div className="flex flex-col gap-1 items-center justify-center min-w-[44px]">
                      {index > 0 && (
                        <button onClick={() => movePlanStop(index, 'up')}
                          aria-label="Move up"
                          className="bg-amber-tint-bg10 border border-amber-tint-border20 text-accent-amber cursor-pointer text-sm font-bold py-1.5 px-2.5 rounded-lg min-h-9 min-w-[44px] flex items-center justify-center gap-0.5">
                          ↑
                        </button>
                      )}
                      <button onClick={() => removeFromPlan(stop.id)}
                        aria-label="Remove stop"
                        className="bg-red-tint-bg border border-red-tint-border text-status-red cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-lg min-h-8 min-w-[44px] flex items-center justify-center">
                        ✕
                      </button>
                      {index < dayPlan.length - 1 && (
                        <button onClick={() => movePlanStop(index, 'down')}
                          aria-label="Move down"
                          className="bg-amber-tint-bg10 border border-amber-tint-border20 text-accent-amber cursor-pointer text-sm font-bold py-1.5 px-2.5 rounded-lg min-h-9 min-w-[44px] flex items-center justify-center gap-0.5">
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
                  <div className="ml-0 mb-1 py-2.5 px-3 bg-bg-subtle rounded-[10px] border border-dashed border-border-subtle">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <span className="text-base">{transport.emoji}</span>
                      <div className="flex-1">
                        <div className="text-xs text-text-secondary">{transport.text}</div>
                        <div className="text-[11px] text-text-muted">{transport.distance}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a href={transport.walkMapsUrl} target="_blank" rel="noopener noreferrer"
                        className="flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-semibold bg-amber-tint-bg10 text-accent-amber no-underline text-center flex items-center justify-center gap-1">
                        {'\u{1F6B6}'} Walk {transport.walkMinutes}m
                      </a>
                      <a href={transport.driveMapsUrl} target="_blank" rel="noopener noreferrer"
                        className="flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-semibold bg-bg-subtle-medium text-text-secondary no-underline text-center flex items-center justify-center gap-1">
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
        <div className="card mt-3 p-3.5 border border-amber-tint-border15 flex justify-around text-center"
          style={{ background: `linear-gradient(135deg, var(--amber-tint-bg06), var(--bg-subtle))` }}>
          <div>
            <div className="text-[11px] text-text-tertiary mb-0.5">Total Distance</div>
            <div className="text-base font-bold text-text-primary">{daySummary.distance}</div>
          </div>
          <div className="w-px bg-border-subtle" />
          <div>
            <div className="text-[11px] text-text-tertiary mb-0.5">{'\u{1F6B6}'} Walking</div>
            <div className="text-base font-bold text-text-primary">{daySummary.totalWalkMin}m</div>
          </div>
          <div className="w-px bg-border-subtle" />
          <div>
            <div className="text-[11px] text-text-tertiary mb-0.5">{'\u{1F697}'} Driving</div>
            <div className="text-base font-bold text-text-primary">{daySummary.totalDriveMin}m</div>
          </div>
        </div>
      )}

      {/* Pack This Checklist */}
      {allStops.length > 0 && packingItems.length > 0 && (
        <div className="card mt-3 p-0 overflow-hidden">
          <button
            onClick={() => setShowPackList(!showPackList)}
            className="w-full py-3.5 px-4 bg-transparent border-none cursor-pointer flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{'\u{1F392}'}</span>
              <span className="text-sm font-semibold text-text-primary">Pack This</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-semibold py-0.5 px-2 rounded-[10px] ${
                checkedItems.size === packingItems.length
                  ? 'bg-green-tint-bg text-status-green'
                  : 'bg-amber-tint-bg10 text-accent-amber'
              }`}>
                {checkedItems.size}/{packingItems.length}
              </span>
              <span
                className="text-text-tertiary text-sm transition-transform duration-200"
                style={{ transform: showPackList ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                {'\u{25BC}'}
              </span>
            </div>
          </button>
          {showPackList && (
            <div className="px-4 pb-4">
              {Object.entries(groupedPackItems).map(([cat, items]) => (
                <div key={cat} className="mb-3">
                  <div className="text-[11px] text-text-tertiary font-semibold mb-1.5 uppercase tracking-[0.05em]">
                    {categoryLabels[cat] || cat}
                  </div>
                  {items.map(item => {
                    const checked = checkedItems.has(item.label);
                    return (
                      <button
                        key={item.label}
                        onClick={() => togglePackItem(item.label)}
                        className={`flex items-center gap-2.5 w-full py-2 bg-transparent border-none cursor-pointer ${
                          checked ? 'opacity-50' : 'opacity-100'
                        }`}>
                        <div className={`w-5 h-5 rounded-md shrink-0 flex items-center justify-center text-xs ${
                          checked
                            ? 'bg-accent-gradient text-[#0C0A09] border-none'
                            : 'bg-transparent border-2 border-border-strong'
                        }`}>
                          {checked && '\u{2713}'}
                        </div>
                        <span className={`text-[13px] text-text-primary ${checked ? 'line-through' : ''}`}>
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


      {/* Pivot Modal */}
      {pivotStopId && pivotAlternatives.length > 0 && (
        <div
          className="fixed inset-0 bg-[rgba(0,0,0,0.6)] backdrop-blur-[8px] z-[1000] flex items-end justify-center"
          onClick={() => { setPivotStopId(null); setPivotAlternatives([]); setPivotReason(null); }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-[440px] max-h-[85vh] overflow-y-auto bg-bg-surface rounded-t-[20px] pt-6 px-5 pb-10"
          >
            {/* Header */}
            <div className="text-center mb-5">
              <div className="text-[28px] mb-1">{'\u{1F504}'}</div>
              <h3 className="text-lg font-bold text-text-primary mb-1">
                Plan B
              </h3>
              <p className="text-[13px] text-text-secondary">
                Pick an alternative — your day stays on track
              </p>
            </div>

            {/* Reason buttons */}
            {!pivotReason && (
              <div className="flex gap-2.5 mb-5">
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
                    className="flex-1 p-3 rounded-xl cursor-pointer bg-bg-subtle-strong border border-border-medium text-text-primary text-[13px] font-medium flex items-center justify-center gap-1.5"
                  >
                    {r.emoji} {r.label}
                  </button>
                ))}
              </div>
            )}

            {/* Alternative cards */}
            <div className="flex flex-col gap-3">
              {pivotAlternatives.map(alt => (
                <div
                  key={alt.placeId}
                  className="card flex gap-3 items-center p-3.5"
                >
                  {/* Photo */}
                  <div className="w-16 h-16 rounded-xl shrink-0 overflow-hidden bg-bg-subtle-strong">
                    {alt.photoUrl ? (
                      <img src={alt.photoUrl} alt={alt.name}
                        className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl text-text-tertiary">
                        {'\u{1F4CD}'}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-text-primary whitespace-nowrap overflow-hidden text-ellipsis">
                      {alt.name}
                    </div>
                    <div className="text-xs text-text-secondary mt-0.5">
                      {alt.categoryDisplay || alt.category}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {alt.rating > 0 && (
                        <span className="text-[11px] text-accent-amber font-semibold">
                          {'\u{2B50}'} {alt.rating.toFixed(1)}
                        </span>
                      )}
                      <span className="text-[11px] text-text-tertiary">
                        {'$'.repeat(Math.max(1, alt.priceLevel))}
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
                    className="py-2.5 px-3.5 rounded-[10px] cursor-pointer bg-accent-gradient text-text-on-accent border-none text-xs font-semibold whitespace-nowrap shrink-0"
                  >
                    Swap
                  </button>
                </div>
              ))}
            </div>

            {/* Dismiss */}
            <button
              onClick={() => { setPivotStopId(null); setPivotAlternatives([]); setPivotReason(null); }}
              className="w-full mt-4 p-3.5 bg-transparent border border-border-medium rounded-xl text-text-secondary text-sm font-medium cursor-pointer"
            >
              Keep original
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-2.5 mt-5">
        {dayPlan.length > 0 && (
          <a href={getRouteUrl()} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-accent-gradient text-text-on-accent border-none rounded-[14px] p-3.5 text-[15px] font-semibold no-underline shadow-[0_4px_20px_var(--amber-tint-shadow)]">
            <DirectionsIcon /> Get Day {activeDay} Route
          </a>
        )}

        {dayCount > 1 && totalStops >= 2 && getFullTripRouteUrl() && (
          <a href={getFullTripRouteUrl()} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-bg-subtle-strong text-text-primary border border-border-medium rounded-[14px] p-3.5 text-sm font-medium no-underline">
            <DirectionsIcon /> Full Trip Route ({totalStops} stops)
          </a>
        )}

        {/* Save for Offline */}
        {totalStops > 0 && (
          <button
            onClick={saveForOffline}
            disabled={offlineSaving || offlineSaved}
            className={`flex items-center justify-center gap-2 rounded-[14px] p-3.5 text-sm font-medium cursor-pointer border ${
              offlineSaved
                ? 'bg-green-tint-bg border-green-tint-border text-status-green'
                : offlineSaving
                ? 'bg-bg-subtle-strong border-border-medium text-text-tertiary opacity-60'
                : 'bg-bg-subtle-strong border-border-medium text-text-primary'
            }`}
          >
            {offlineSaved ? '\u{2705} Saved Offline' : offlineSaving ? 'Saving...' : '\u{1F4E5} Save for Offline'}
          </button>
        )}

        {/* Share buttons */}
        <div className="flex gap-2.5">
          <button onClick={() => { if (!requireAuth()) return; shareAsLink(); }}
            className="flex-1 flex items-center justify-center gap-2 bg-accent-gradient text-text-on-accent border-none rounded-[14px] p-3.5 text-[15px] font-semibold cursor-pointer shadow-[0_4px_20px_var(--amber-tint-shadow)]">
            <ShareIcon /> Share Link
          </button>
          <button onClick={sharePlan}
            className="flex items-center justify-center gap-1.5 p-3.5 px-5 rounded-[14px] cursor-pointer border border-border-medium bg-bg-subtle-strong text-text-primary text-sm font-medium shrink-0">
            Text
          </button>
          {dayPlan.length > 0 && (
            <button onClick={() => { if (!requireAuth()) return; exportDayAsImage(dayPlan, activeDay, cityLabel); }}
              className="flex items-center justify-center gap-1.5 p-3.5 px-5 rounded-[14px] cursor-pointer border border-border-medium bg-bg-subtle-strong text-text-primary text-sm font-medium shrink-0">
              📸
            </button>
          )}
        </div>

        {dayCount > 1 && (
          <button onClick={() => removeDay(activeDay)}
            className="bg-transparent border border-red-tint-border-strong text-status-red text-[13px] cursor-pointer p-2.5 rounded-[10px]">
            Delete Day {activeDay}
          </button>
        )}

        <button onClick={clearPlan}
          className="bg-transparent border-none text-text-tertiary text-[13px] cursor-pointer p-2.5">
          Clear all stops
        </button>
      </div>
    </div>
  );
}
