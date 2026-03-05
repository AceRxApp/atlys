import { useState, useEffect, useCallback, useRef } from 'react';
import { track } from '@vercel/analytics';
import { useApp } from '../context/AppContext';
import { DirectionsIcon, ShareIcon, DragHandleIcon } from '../components/icons';
import ContextHint from '../components/ContextHint';
import { formatDistance, getHoursStatus, searchNearby, TYPE_TO_VIBE } from '../services/places';
import type { Place } from '../services/places';
import { generatePackingList } from '../utils/packingList';
import { findPivotAlternatives } from '../utils/surpriseFilter';
import type { PackingItem } from '../data/packingItems';
import { getNightRisk, getPlaceSafety, isNightTime } from '../utils/safetyEngine';
import { fetchTravelAdvisory, getAdvisoryDisplay } from '../services/travelAdvisory';
import type { TravelAdvisory } from '../services/travelAdvisory';
import type { Stop } from '../types';
import { BOOKING_SERVICES } from '../data/bookingLinks';
import { fixPhotoUrl } from '../utils/photoUrl';
import NativeImg from '../components/NativeImg';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import SortableStopCard from '../components/SortableStopCard';
import AddFromLinkModal from '../components/AddFromLinkModal';

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
  accent.addColorStop(0, '#E8940A');
  accent.addColorStop(1, '#C47D08');
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, W, 4);

  // Header
  ctx.fillStyle = '#E8940A';
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
    ctx.fillStyle = '#E8940A';
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
    reorderStops,
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
    weather, formatTemp,
    formatEventDate,
    formatEventTime,
    user,
    getDaySummary,
    travelGroup,
    pivotStop,
    places: allPlaces,
    requireAuth,
    lastPlanTitle,
    lastPlanVibe,
    shareAsLink,
    saveForOffline,
    offlineSaved,
    offlineSaving,
    setDishLensContext,
    setSelectedPlace,
    tripStartDate,
    setTripStartDate,
    selectedCity,
  } = useApp();

  const dateInputRef = useRef<HTMLInputElement>(null);
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);

  const sortedDays = Object.keys(tripDays).map(Number).sort((a, b) => a - b);

  /** Format a day number as a real date string when tripStartDate is set */
  const formatDayLabel = (day: number): string => {
    if (!tripStartDate) return `Day ${day}`;
    const start = new Date(tripStartDate + 'T00:00:00');
    start.setDate(start.getDate() + (day - 1));
    const weekday = start.toLocaleDateString('en-US', { weekday: 'short' });
    const month = start.toLocaleDateString('en-US', { month: 'short' });
    const date = start.getDate();
    return `${weekday}, ${month} ${date}`;
  };

  // --- Pack This state ---
  const allStops = Object.values(tripDays).flat();
  const packingItems = generatePackingList(
    allStops,
    weather?.forecast.slice(0, dayCount) || [],
    travelGroup,
    cityLabel,
  );
  const packStorageKey = `nxstops_pack_${citySlug}`;
  const [checkedItems, setCheckedItems] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(packStorageKey);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const [showPackList, setShowPackList] = useState(false);
  const [showWeatherForecast, setShowWeatherForecast] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Travel advisory state
  const [advisory, setAdvisory] = useState<TravelAdvisory | null>(null);
  useEffect(() => {
    if (!selectedCity?.country) { setAdvisory(null); return; }
    fetchTravelAdvisory(selectedCity.country).then(a => setAdvisory(a));
  }, [selectedCity?.country]);

  // --- Drag & drop sensors ---
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = dayPlan.findIndex(s => s.id === active.id);
    const newIndex = dayPlan.findIndex(s => s.id === over.id);
    reorderStops(oldIndex, newIndex);
  };

  // --- Pivot state ---
  const [pivotStopId, setPivotStopId] = useState<string | null>(null);
  const [pivotAlternatives, setPivotAlternatives] = useState<Place[]>([]);
  const [pivotIndex, setPivotIndex] = useState(0);
  const [pivotLoading, setPivotLoading] = useState(false);

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
    comfort: '\u{1F9F3} Comfort',
  };

  const daySummary = getDaySummary();

  if (totalStops === 0) {
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
            onClick={() => { if (!requireAuth()) return; setShowAddLinkModal(true); }}
            className="flex items-center gap-2 py-2.5 px-5 rounded-xl border border-dashed border-accent-amber text-accent-amber text-[13px] font-semibold cursor-pointer bg-transparent"
          >
            {'\u2795'} Quick Add
          </button>
        </div>
        {showAddLinkModal && <AddFromLinkModal onClose={() => setShowAddLinkModal(false)} />}
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
        </div>
        <p className="text-text-tertiary text-[13px]">
          {cityLabel} · {totalStops} stop{totalStops !== 1 ? 's' : ''} · {dayCount} day{dayCount !== 1 ? 's' : ''}
        </p>
        {/* Trip date picker */}
        <div className="relative mt-2 inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-border-medium bg-bg-subtle text-text-secondary text-xs font-medium cursor-pointer">
          <span>{'\u{1F4C5}'}</span>
          {tripStartDate
            ? <>Trip starts {new Date(tripStartDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              <span
                onClick={e => { e.stopPropagation(); setTripStartDate(null); }}
                className="ml-1 text-text-tertiary relative z-10"
              >{'\u2715'}</span>
            </>
            : 'Set trip date'}
          <input
            ref={dateInputRef}
            type="date"
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            value={tripStartDate || ''}
            onChange={e => setTripStartDate(e.target.value || null)}
          />
        </div>

        {/* Trip countdown */}
        {tripStartDate && (() => {
          const start = new Date(tripStartDate + 'T00:00:00');
          const today = new Date(); today.setHours(0, 0, 0, 0);
          const daysUntil = Math.floor((start.getTime() - today.getTime()) / 86400000);
          if (daysUntil > 0) return (
            <div className="mt-2 py-2 px-3 rounded-xl bg-amber-tint-bg10 border border-amber-tint-border20 text-center">
              <span className="text-sm font-semibold text-accent-amber">
                {'\u2708\uFE0F'} {daysUntil} {daysUntil === 1 ? 'day' : 'days'} until your trip!
              </span>
            </div>
          );
          if (daysUntil === 0) return (
            <div className="mt-2 py-2 px-3 rounded-xl bg-green-tint-bg border border-green-tint-border text-center">
              <span className="text-sm font-semibold text-status-green">{'\u{1F389}'} Your trip starts today!</span>
            </div>
          );
          return null;
        })()}
      </div>

      {/* Quick Add — add events, restaurants, or places manually */}
      <div
        onClick={() => { if (!requireAuth()) return; setShowAddLinkModal(true); }}
        className="mt-1 mb-3 inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-dashed border-accent-amber bg-amber-tint-bg06 text-accent-amber text-xs font-medium cursor-pointer"
      >
        <span>{'\u2795'}</span>
        Quick Add
      </div>

      <ContextHint
        storageKey="plan"
        title="Your Trip Plan"
        subtitle="Organize your perfect itinerary day by day."
        hints={[
          { emoji: '\u{2630}', title: 'Drag to reorder', description: 'Hold the drag handle on any stop and drag it to rearrange your route.' },
          { emoji: '\u{1F4C5}', title: 'Set trip date', description: 'Tap "Set trip date" to see real calendar dates on your day tabs instead of Day 1, Day 2.' },
          { emoji: '\u{1F504}', title: 'Swap alternatives', description: 'Tap "Swap" on any stop to see similar nearby spots and switch them in.' },
          { emoji: '\u{1F392}', title: 'Packing list', description: 'Auto-generated packing checklist based on your stops, weather, and travel group.' },
          { emoji: '\u{1F4F8}', title: 'Share & export', description: 'Share your plan as a link, text it to friends, or export as a shareable image.' },
        ]}
      />

      {/* Trip Weather Forecast (collapsed by default) */}
      {weather && weather.forecast.length > 0 && dayCount > 0 && (
        <div className="card mb-3 p-0 overflow-hidden border border-blue-tint-border"
          style={{ background: `linear-gradient(135deg, var(--blue-tint-bg), var(--bg-subtle))` }}>
          <button
            onClick={() => setShowWeatherForecast(!showWeatherForecast)}
            className="w-full py-3 px-4 bg-transparent border-none cursor-pointer flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">{weather.emoji}</span>
              <div className="text-left">
                <span className="text-sm font-semibold text-text-primary">{formatTemp(weather.temp)}</span>
                <span className="text-xs text-text-secondary ml-1.5">{weather.description}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-tertiary">{dayCount}-day forecast</span>
              <span className="text-text-tertiary text-sm" style={{ transform: showWeatherForecast ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                {'\u{25BC}'}
              </span>
            </div>
          </button>
          {showWeatherForecast && (
            <div className="px-3 pb-3">
              <div className="flex gap-2 overflow-x-auto scroll-hidden">
                {weather.forecast.slice(0, dayCount).map((day, i) => (
                  <div key={day.date} className="text-center min-w-[60px] shrink-0 p-1.5 rounded-[10px] bg-bg-subtle">
                    <div className="text-[11px] text-text-tertiary mb-0.5">{formatDayLabel(i + 1)}</div>
                    <div className="text-xl mb-0.5">{day.emoji}</div>
                    <div className="text-xs font-semibold text-text-primary">{formatTemp(day.high)}</div>
                    <div className="text-[11px] text-text-tertiary">{formatTemp(day.low)}</div>
                    {day.precipChance > 30 && (
                      <div className="text-[11px] text-status-blue mt-0.5">&#x1f4a7; {day.precipChance}%</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Travel Advisory Banner */}
      {advisory && (() => {
        const display = getAdvisoryDisplay(advisory);
        if (!display) return null;
        return (
          <a
            href={advisory.url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-start gap-2.5 mb-3 p-3 rounded-xl border no-underline ${display.bgClass} ${display.borderClass}`}
          >
            <span className="text-lg shrink-0 mt-0.5">{display.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className={`text-[13px] font-semibold ${display.color}`}>{display.label}</div>
              {advisory.summary && (
                <p className="text-[11px] text-text-secondary mt-0.5 leading-[1.4] line-clamp-2">{advisory.summary}</p>
              )}
              <span className="text-[11px] text-text-tertiary mt-1 inline-block">View full advisory →</span>
            </div>
          </a>
        );
      })()}

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
              {formatDayLabel(day)} ({stops.length})
            </button>
          );
        })}
        <button onClick={addDay}
          className="py-2 px-4 rounded-xl text-[13px] font-semibold border border-dashed border-border-dashed cursor-pointer whitespace-nowrap shrink-0 bg-transparent text-text-tertiary">
          + Day
        </button>
      </div>

      {/* Day Summary — at a glance before the stops */}
      {daySummary && dayPlan.length >= 2 && (
        <div className="card mb-3 p-3 border border-amber-tint-border15 flex justify-around text-center"
          style={{ background: `linear-gradient(135deg, var(--amber-tint-bg06), var(--bg-subtle))` }}>
          <div>
            <div className="text-[11px] text-text-tertiary mb-0.5">Distance</div>
            <div className="text-sm font-bold text-text-primary">{daySummary.distance}</div>
          </div>
          <div className="w-px bg-border-subtle" />
          <div>
            <div className="text-[11px] text-text-tertiary mb-0.5">{'\u{1F6B6}'} Walk</div>
            <div className="text-sm font-bold text-text-primary">{daySummary.totalWalkMin}m</div>
          </div>
          <div className="w-px bg-border-subtle" />
          <div>
            <div className="text-[11px] text-text-tertiary mb-0.5">{'\u{1F697}'} Drive</div>
            <div className="text-sm font-bold text-text-primary">{daySummary.totalDriveMin}m</div>
          </div>
        </div>
      )}

      {/* Day-of events banner */}
      {tripStartDate && (() => {
        const start = new Date(tripStartDate + 'T00:00:00');
        start.setDate(start.getDate() + (activeDay - 1));
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isToday = start.getTime() === today.getTime();
        if (!isToday) return null;
        const todayEvents = dayPlan.filter(s => s.type === 'event' && s.event?.date);
        if (todayEvents.length === 0) return null;
        return (
          <div className="mb-3 p-3 rounded-xl bg-purple-tint-bg08 border border-purple-tint-border15">
            <div className="text-[13px] font-semibold text-events-text mb-1">
              {'\u{1F3AF}'} {todayEvents.length} event{todayEvents.length !== 1 ? 's' : ''} today
            </div>
            {todayEvents.map(s => (
              <div key={s.id} className="text-[12px] text-text-secondary">
                {s.event!.name}{s.event!.time && s.event!.time !== 'TBD' ? ` — ${s.event!.time}` : ''}
              </div>
            ))}
          </div>
        );
      })()}

      {/* Active day stops */}
      {dayPlan.length === 0 ? (
        <div className="card text-center py-8 px-5">
          <p className="text-text-secondary text-sm">No stops on Day {activeDay} yet. Explore to add some!</p>
        </div>
      ) : (<>
        {dayPlan.length > 1 && (
          <div className="flex items-center gap-1.5 mb-2 py-1.5 px-2.5 rounded-lg bg-amber-tint-bg06">
            <span className="text-xs">{'\u2630'}</span>
            <span className="text-xs text-accent-amber-dark font-medium">Hold and drag to reorder your stops</span>
          </div>
        )}
        <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={dayPlan.map(s => s.id)} strategy={verticalListSortingStrategy}>
        <div className="relative pl-8">
          {/* Vertical route line */}
          <div
            className="absolute left-3.5 top-4 bottom-4 w-0.5 rounded-sm"
            style={{ background: `linear-gradient(to bottom, var(--accent-amber), var(--amber-tint-bg10))` }}
          />

          {dayPlan.map((stop, index) => (
            <SortableStopCard key={stop.id} id={stop.id}>
            {(listeners) => (<div>
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
                  {/* Top row: clickable content + drag controls */}
                  <div className="flex gap-3">
                    {/* Clickable area: image + info */}
                    <div className="flex gap-3 flex-1 min-w-0 cursor-pointer"
                      onClick={() => {
                        if (stop.type === 'place' && stop.place) setSelectedPlace(stop.place);
                      }}
                      role={stop.type === 'place' ? 'button' : undefined}
                      tabIndex={stop.type === 'place' ? 0 : undefined}
                      aria-label={stop.type === 'place' ? `View details for ${getStopName(stop)}` : undefined}
                    >
                      {stop.type === 'place' && stop.place?.photoUrl && (
                        <NativeImg src={fixPhotoUrl(stop.place.photoUrl)!} alt={stop.place.name} loading="lazy" decoding="async"
                          className="w-20 h-20 rounded-xl shrink-0 object-cover" />
                      )}
                      {stop.type === 'event' && stop.event?.imageUrl && (
                        <NativeImg src={stop.event.imageUrl} alt={stop.event.name} loading="lazy" decoding="async"
                          referrerPolicy="no-referrer"
                          className="w-20 h-20 rounded-xl shrink-0 object-cover" />
                      )}
                      <div className="flex-1 min-w-0">
                        {stop.timeSlot && (
                          <div className="text-[11px] font-semibold text-accent-amber uppercase tracking-[0.04em] mb-0.5">
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
                              {stop.place.priceLevel >= 0 ? (
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
                            {/* Hours status */}
                            {(() => {
                              const hs = getHoursStatus(stop.place.hours, stop.place.openNow);
                              return (
                                <div className="flex items-center gap-1.5 mt-1">
                                  <div className={`w-1.5 h-1.5 rounded-full ${stop.place.openNow ? 'bg-status-green' : 'bg-status-red'}`} />
                                  <span className={`text-[11px] font-medium ${
                                    hs.urgent ? 'text-status-red' : stop.place.openNow ? 'text-status-green' : 'text-status-red'
                                  }`}>
                                    {hs.text}
                                  </span>
                                  {hs.urgent && <span className="text-[10px] text-status-red font-semibold">Hurry!</span>}
                                </div>
                              );
                            })()}
                            {stop.reason && (
                              <p className="text-xs text-text-tertiary mt-1 italic leading-snug">{stop.reason}</p>
                            )}
                            {/* Safety indicator — always visible */}
                            {(() => {
                              const night = isNightTime(weather?.sunset);
                              const warning = getPlaceSafety(stop.place.category, stop.place.rating, stop.place.reviewCount, stop.place.openNow, night);
                              if (warning) {
                                return (
                                  <div className="flex items-center gap-1 mt-1">
                                    <span className="text-[11px]">{warning.emoji}</span>
                                    <span className={`text-[11px] font-medium ${warning.level === 'warning' ? 'text-status-red' : 'text-accent-amber'}`}>
                                      {warning.label}
                                    </span>
                                  </div>
                                );
                              }
                              if (night) {
                                const risk = getNightRisk(stop.place.category, stop.place.rating, stop.place.reviewCount, stop.place.openNow);
                                return (
                                  <div className="flex items-center gap-1 mt-1">
                                    <span className="text-[11px]">{risk.emoji}</span>
                                    <span className={`text-[11px] font-medium ${
                                      risk.level === 'low' ? 'text-status-green' : risk.level === 'moderate' ? 'text-accent-amber' : 'text-status-red'
                                    }`}>
                                      {risk.label}
                                    </span>
                                  </div>
                                );
                              }
                              if (stop.place.rating >= 4.0 && stop.place.reviewCount >= 50) {
                                return (
                                  <div className="flex items-center gap-1 mt-1">
                                    <span className="text-[11px]">{'\u{1F6E1}\u{FE0F}'}</span>
                                    <span className="text-[11px] font-medium text-status-green">Well-reviewed</span>
                                  </div>
                                );
                              }
                              return null;
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
                      </div>
                    </div>

                    {/* Right controls: drag handle + remove */}
                    <div className="flex flex-col gap-1 items-center justify-center min-w-[44px]">
                      <div {...listeners} className="cursor-grab active:cursor-grabbing touch-none p-2 rounded-lg bg-amber-tint-bg06 border border-amber-tint-border20"
                        aria-label="Drag to reorder">
                        <DragHandleIcon color="var(--accent-amber)" />
                      </div>
                      <button onClick={() => removeFromPlan(stop.id)}
                        aria-label="Remove stop"
                        className="bg-red-tint-bg border border-red-tint-border text-status-red cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-lg min-h-8 min-w-[44px] flex items-center justify-center">
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Mini actions */}
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {stop.type === 'place' && stop.place?.googleMapsUrl && (
                      <a href={stop.place.googleMapsUrl} target="_blank" rel="noopener noreferrer"
                        className="py-[5px] px-2.5 rounded-lg text-xs bg-amber-tint-bg10 text-accent-amber no-underline flex items-center gap-1">
                        <DirectionsIcon /> Go
                      </a>
                    )}
                    {stop.type === 'event' && stop.event?.url && (
                      <a href={stop.event.url} target="_blank" rel="noopener noreferrer"
                        className="py-[5px] px-2.5 rounded-lg text-xs bg-purple-tint-bg08 text-events-text no-underline flex items-center gap-1">
                        &#x1f3ab; Tickets
                      </a>
                    )}
                    {dayCount > 1 && (
                      <select
                        value=""
                        onChange={e => { if (e.target.value) moveStopToDay(stop.id, activeDay, Number(e.target.value)); }}
                        className="py-[5px] px-2 rounded-lg text-xs bg-bg-subtle-medium text-text-tertiary border border-border-medium cursor-pointer">
                        <option value="">Move to...</option>
                        {sortedDays.filter(d => d !== activeDay).map(d => (
                          <option key={d} value={d}>{formatDayLabel(d)}</option>
                        ))}
                      </select>
                    )}
                    {stop.type === 'place' && stop.place && /restaurant|cafe|bakery|bar|food|pizza|sushi|burger|coffee|tea|ice.cream|dessert|brunch|bistro|diner|grill|bbq|seafood|steak/i.test(stop.place.category || '') && (
                      <button
                        onClick={() => {
                          setDishLensContext({ dish: undefined, city: cityLabel, restaurant: stop.place!.name });
                          setScreen('tastelens');
                        }}
                        className="py-[5px] px-2.5 rounded-lg text-xs bg-amber-tint-bg10 text-accent-amber border border-amber-tint-border20 cursor-pointer flex items-center gap-1"
                      >
                        {'\u{1F37D}\u{FE0F}'} TasteLens
                      </button>
                    )}
                    {stop.type === 'place' && stop.place && (
                      <button
                        disabled={pivotLoading}
                        onClick={async () => {
                          // If already showing pivot for this stop, dismiss it
                          if (pivotStopId === stop.id) {
                            setPivotStopId(null);
                            setPivotAlternatives([]);
                            return;
                          }
                          const excludeIds = new Set(dayPlan.map(s => s.place?.placeId).filter(Boolean) as string[]);
                          const stopData = {
                            category: stop.place!.category,
                            lat: stop.place!.lat,
                            lng: stop.place!.lng,
                            priceLevel: stop.place!.priceLevel,
                            placeId: stop.place!.placeId,
                          };
                          // Try local alternatives first (instant, free)
                          let alternatives = findPivotAlternatives(allPlaces, stopData, excludeIds, 3, lastPlanVibe || undefined, stop.timeSlot);
                          // If none found locally, search Google Places for nearby similar places
                          if (alternatives.length === 0) {
                            setPivotLoading(true);
                            try {
                              // For food/stacked vibes, always search for food places
                              const isFoodPlan = lastPlanVibe === 'food' || lastPlanVibe === 'stacked';
                              const vibe = isFoodPlan ? 'eatsip' : (TYPE_TO_VIBE[stop.place!.category] || stop.place!.tags?.[0] || 'eatsip');
                              const googlePlaces = await searchNearby(
                                stop.place!.lat, stop.place!.lng,
                                [vibe],
                                2000,
                              );
                              alternatives = googlePlaces
                                .filter(p => !excludeIds.has(p.placeId) && p.placeId !== stop.place!.placeId)
                                .slice(0, 8);
                            } catch { /* ignore API errors */ }
                            setPivotLoading(false);
                          }
                          if (alternatives.length > 0) {
                            setPivotStopId(stop.id);
                            setPivotAlternatives(alternatives);
                            setPivotIndex(0);
                          } else {
                            showToast('No alternatives found nearby');
                          }
                          track('pivot_initiated', { place: stop.place!.name, day: String(activeDay) });
                        }}
                        className={`py-[5px] px-2.5 rounded-lg text-xs border cursor-pointer flex items-center gap-1 ${
                          pivotStopId === stop.id
                            ? 'bg-accent-amber text-text-on-accent border-accent-amber'
                            : 'bg-amber-tint-bg10 text-accent-amber border-amber-tint-border20'
                        }`}
                      >
                        {pivotLoading ? '\u23F3' : '\u{1F504}'} Swap
                      </button>
                    )}
                  </div>

                  {/* Inline Pivot — shows alternative below the stop */}
                  {pivotStopId === stop.id && pivotAlternatives.length > 0 && (() => {
                    const alt = pivotAlternatives[pivotIndex];
                    if (!alt) return null;
                    return (
                      <div className="mt-2 p-3 rounded-xl border border-amber-tint-border30 bg-amber-tint-bg06">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-accent-amber">{'\u{1F504}'} Alternative</span>
                          <span className="text-[11px] text-text-muted ml-auto">{pivotIndex + 1} of {pivotAlternatives.length}</span>
                        </div>
                        <div className="flex gap-3 items-center">
                          {/* Photo */}
                          <div className="w-14 h-14 rounded-xl shrink-0 overflow-hidden bg-bg-subtle-strong">
                            {alt.photoUrl ? (
                              <NativeImg src={fixPhotoUrl(alt.photoUrl)!} alt={alt.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xl text-text-tertiary">{'\u{1F4CD}'}</div>
                            )}
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-text-primary truncate">{alt.name}</div>
                            <div className="text-xs text-text-secondary mt-0.5">{alt.categoryDisplay || alt.category}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {alt.rating > 0 && (
                                <span className="text-xs text-accent-amber font-semibold">{'\u{2B50}'} {alt.rating.toFixed(1)}</span>
                              )}
                              {alt.priceLevel > 0 && (
                                <span className="text-xs text-text-tertiary">{'$'.repeat(alt.priceLevel)}</span>
                              )}
                              {alt.distance != null && (
                                <span className="text-[11px] text-text-muted">{formatDistance(alt.distance)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Actions */}
                        <div className="flex gap-2 mt-2.5">
                          <button
                            onClick={() => {
                              setPivotStopId(null);
                              setPivotAlternatives([]);
                            }}
                            className="py-2 px-3 rounded-lg text-xs font-medium bg-transparent border border-border-medium text-text-secondary cursor-pointer">
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              setPivotIndex((pivotIndex + 1) % pivotAlternatives.length);
                              track('pivot_next', { current: alt.name });
                            }}
                            className="flex-1 py-2 px-3 rounded-lg text-xs font-medium bg-bg-subtle-medium border border-border-medium text-text-primary cursor-pointer">
                            Next {'\u2192'}
                          </button>
                          <button
                            onClick={() => {
                              pivotStop(pivotStopId, alt);
                              track('pivot_swapped', { newPlace: alt.name });
                              setPivotStopId(null);
                              setPivotAlternatives([]);
                            }}
                            className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold bg-accent-gradient text-text-on-accent border-none cursor-pointer">
                            Swap {'\u2713'}
                          </button>
                        </div>
                      </div>
                    );
                  })()}
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
                        <div className="text-xs text-text-muted">{transport.distance}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a href={transport.walkMapsUrl} target="_blank" rel="noopener noreferrer"
                        className="flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-amber-tint-bg10 text-accent-amber no-underline text-center flex items-center justify-center gap-1">
                        {'\u{1F6B6}'} Walk {transport.walkMinutes}m
                      </a>
                      <a href={transport.driveMapsUrl} target="_blank" rel="noopener noreferrer"
                        className="flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-bg-subtle-medium text-text-secondary no-underline text-center flex items-center justify-center gap-1">
                        {'\u{1F697}'} Drive {transport.driveMinutes}m
                      </a>
                    </div>
                  </div>
                );
              })()}
            </div>)}
            </SortableStopCard>
          ))}
        </div>
        </SortableContext>
        </DndContext>
      </>)}

      {/* Pack This Checklist */}
      {allStops.length > 0 && packingItems.length > 0 && (
        <div className="card mt-3 p-0 overflow-hidden">
          <button
            onClick={() => setShowPackList(!showPackList)}
            className="w-full py-3.5 px-4 bg-transparent border-none cursor-pointer flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{'\u{1F392}'}</span>
              <span className="text-sm font-semibold text-text-primary">Packing List</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold py-0.5 px-2 rounded-[10px] ${
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
                  <div className="text-xs text-text-tertiary font-semibold mb-1.5 uppercase tracking-[0.05em]">
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


      {/* Pivot is now inline — see pivot card inside each stop */}

      {/* Action Buttons */}
      <div className="flex flex-col gap-2.5 mt-5">
        {/* Primary: Get Route + Share */}
        <div className="flex gap-2.5">
          {dayPlan.length > 0 && (
            <a href={getRouteUrl()} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-accent-gradient text-text-on-accent border-none rounded-[14px] p-3.5 text-[15px] font-semibold no-underline shadow-[0_4px_20px_var(--amber-tint-shadow)]">
              <DirectionsIcon /> Get Route
            </a>
          )}
          <button onClick={() => { if (!requireAuth()) return; shareAsLink(); }}
            aria-label="Share plan as link"
            className="flex-1 flex items-center justify-center gap-2 bg-bg-subtle-strong text-text-primary border border-border-medium rounded-[14px] p-3.5 text-[15px] font-semibold cursor-pointer">
            <ShareIcon /> Share
          </button>
        </div>

        {/* Secondary: Text + Export + Save */}
        <div className="flex gap-2">
          <button onClick={sharePlan}
            aria-label="Share plan via text message"
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl cursor-pointer border border-border-medium bg-bg-subtle text-text-secondary text-[13px] font-medium">
            {'\u{1F4AC}'} Text
          </button>
          {dayPlan.length > 0 && (
            <button onClick={() => { if (!requireAuth()) return; exportDayAsImage(dayPlan, activeDay, cityLabel); }}
              aria-label="Export day as image"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl cursor-pointer border border-border-medium bg-bg-subtle text-text-secondary text-[13px] font-medium">
              {'\u{1F4F8}'} Export
            </button>
          )}
          {totalStops > 0 && (
            <button
              onClick={saveForOffline}
              disabled={offlineSaving}
              aria-label={offlineSaved ? 'Plan saved for offline use' : 'Save plan for offline use'}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl border text-[13px] font-semibold min-h-[52px] transition-all duration-200 ${
                offlineSaving
                  ? 'bg-bg-subtle border-border-medium text-text-tertiary cursor-wait animate-pulse'
                  : offlineSaved
                    ? 'bg-green-tint-bg border-green-tint-border text-status-green cursor-pointer active:scale-[0.96]'
                    : 'bg-bg-subtle border-border-medium text-text-secondary cursor-pointer active:scale-[0.96] hover:border-accent-amber'
              }`}
            >
              {offlineSaving ? '\u{23F3} Saving...' : offlineSaved ? '\u{2705} Saved Offline' : '\u{1F4E5} Save Offline'}
            </button>
          )}
        </div>

        {/* Full trip route (multi-day only) */}
        {dayCount > 1 && totalStops >= 2 && getFullTripRouteUrl() && (
          <a href={getFullTripRouteUrl()} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-bg-subtle text-text-secondary border border-border-medium rounded-xl py-2.5 px-3 text-[13px] font-medium no-underline">
            <DirectionsIcon /> Full Trip Route ({totalStops} stops)
          </a>
        )}

        {/* Book Your Trip — affiliate links */}
        {totalStops > 0 && (
          <div className="mt-2 p-4 rounded-2xl bg-bg-elevated border border-border-subtle">
            <div className="text-xs font-semibold text-text-tertiary uppercase tracking-[0.05em] mb-3">Book Your Trip</div>
            <div className="flex gap-2 overflow-x-auto scroll-hidden pb-1">
              {BOOKING_SERVICES.map(s => (
                <a key={s.id} href={s.buildUrl(cityLabel)} target="_blank" rel="noopener noreferrer"
                  onClick={() => track('plan_booking_click', { service: s.id, city: cityLabel })}
                  className="flex flex-col items-center gap-1.5 min-w-[90px] shrink-0 py-3 px-2 rounded-xl bg-bg-subtle border border-border-subtle no-underline text-center">
                  <span className="text-xl">{s.emoji}</span>
                  <span className="text-xs font-semibold text-text-primary">{s.name}</span>
                  <span className="text-[11px] text-text-tertiary leading-tight">{s.description}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Danger zone */}
        <div className="flex items-center justify-center gap-4 pt-1">
          {dayCount > 1 && (
            <button onClick={() => removeDay(activeDay)}
              aria-label={`Delete day ${activeDay} from trip`}
              className="bg-transparent border-none text-status-red text-[13px] cursor-pointer p-1.5">
              Delete Day {activeDay}
            </button>
          )}
          {dayCount > 1 && <span className="text-border-subtle">|</span>}
          {showClearConfirm ? (
            <span className="flex items-center gap-2">
              <span className="text-[13px] text-status-red font-medium">Clear all stops?</span>
              <button onClick={() => { clearPlan(); setShowClearConfirm(false); }}
                className="bg-status-red text-white border-none text-[12px] font-semibold cursor-pointer py-1 px-2.5 rounded-lg">
                Yes, clear
              </button>
              <button onClick={() => setShowClearConfirm(false)}
                className="bg-transparent border border-border-medium text-text-secondary text-[12px] cursor-pointer py-1 px-2.5 rounded-lg">
                Cancel
              </button>
            </span>
          ) : (
            <button onClick={() => setShowClearConfirm(true)}
              aria-label="Clear all stops from plan"
              className="bg-transparent border-none text-text-tertiary text-[13px] cursor-pointer p-1.5">
              Clear all stops
            </button>
          )}
        </div>

        {/* Safety Disclaimer */}
        <div className="mt-6 mb-2 px-1">
          <p className="text-[11px] text-text-tertiary leading-[1.5] text-center">
            NxStops recommendations are for informational purposes only. Hours, safety data, and travel advisories may not be current. Always verify with venues directly and use your own judgment.
          </p>
        </div>
      </div>

      {/* Add from Link modal */}
      {showAddLinkModal && <AddFromLinkModal onClose={() => setShowAddLinkModal(false)} />}
    </div>
  );
}
