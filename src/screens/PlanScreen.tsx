import { useState, useEffect, useCallback, useRef, useMemo, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { track } from '@vercel/analytics';
import { useApp } from '../context/AppContext';
import { DirectionsIcon, ShareIcon, DragHandleIcon } from '../components/icons';
import ContextHint from '../components/ContextHint';
import { formatDistance, getHoursStatus, searchNearby, TYPE_TO_VIBE } from '../services/places';
import type { Place } from '../services/places';
import { generatePackingList } from '../utils/packingList';
import { findPivotAlternatives } from '../utils/surpriseFilter';
import type { PackingItem } from '../data/packingItems';
// Safety engine removed from compact cards — details shown in PlaceDetailModal
import { fetchTravelAdvisory, getAdvisoryDisplay } from '../services/travelAdvisory';
import type { TravelAdvisory } from '../services/travelAdvisory';
import type { Stop } from '../types';
import { BOOKING_SERVICES } from '../data/bookingLinks';
import { fixPhotoUrl } from '../utils/photoUrl';
import NativeImg from '../components/NativeImg';
import PlanLoadingAnimation from '../components/PlanLoadingAnimation';
import { FlightLine } from '../components/FlightCard';
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
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import SortableStopCard from '../components/SortableStopCard';
import AddFromLinkModal from '../components/AddFromLinkModal';
import QuickReviewPrompt from '../components/QuickReviewPrompt';
import NearbyDiscoveries from '../components/NearbyDiscoveries';
import LogisticsPanel from '../components/LogisticsPanel';
import ItineraryAlertBanner from '../components/ItineraryAlertBanner';
import ChatBot from '../components/ChatBot';
import GoldenHourCard from '../components/GoldenHourCard';
// LocalRhythm removed — collection view uses compact cards
import VibePicker from '../components/VibePicker';
import CuratedPicks from '../components/CuratedPicks';
import { useTripNotifications } from '../hooks/useTripNotifications';

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
    lastPlanHeadline,
    lastPlanDuration,
    autoPlanLoading,
    flights,
    originAirport,
    destinationAirport,
    googleFlightsUrl,
    shareAsLink,
    saveForOffline,
    offlineSaved,
    offlineSaving,
    setDishLensContext,
    setSelectedPlace,
    tripStartDate,
    setTripStartDate,
    selectedCity,
    isLiveDay,
    liveDayNumber,
    checkIn,
    isCheckedIn,
    checkedInCount,
    totalStopsToday,
    progressPercent,
    spentSoFar,
    reviewPromptStopId,
    // New features
    itineraryAlerts,
    dismissAlert,
    addToPlan,
    checkIns,
    currentStreak,
    curatedPicks,
    curatedLoading,
    curatedVibe,
    curatedError,
    loadCuratedPicks,
    clearCuratedPicks,
  } = useApp();

  // Compute trip phase for context-aware UI
  type TripPhase = 'planning' | 'pretrip' | 'live' | 'posttrip';
  const tripPhase: TripPhase = (() => {
    if (!tripStartDate) return 'planning';
    const start = new Date(tripStartDate + 'T00:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today.getTime() - start.getTime()) / 86400000);
    const dayNum = diffDays + 1;
    if (dayNum >= 1 && dayNum <= dayCount) return 'live';
    if (dayNum > dayCount) return 'posttrip';
    return 'pretrip';
  })();

  const dateInputRef = useRef<HTMLInputElement>(null);
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);

  // Place IDs already in the active day's plan (for curated picks "Added" state)
  const addedPlaceIds = useMemo(
    () => new Set(dayPlan.map(s => s.place?.placeId).filter(Boolean) as string[]),
    [dayPlan],
  );

  // Schedule trip notifications when date is set
  const notifications = useTripNotifications();
  useEffect(() => {
    if (tripStartDate && cityLabel && totalStops > 0) {
      notifications.scheduleTripReminder(tripStartDate, cityLabel, totalStops);
      notifications.scheduleEveningReminder(tripStartDate, cityLabel);
    } else {
      notifications.cancelAllReminders();
    }
  }, [tripStartDate, cityLabel, totalStops]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Nearby discoveries toggle
  const [expandedNearby, setExpandedNearby] = useState<string | null>(null);
  const [expandedStopActions, setExpandedStopActions] = useState<string | null>(null);
  // Chat FAB
  const [showChat, setShowChat] = useState(false);
  // Logistics panel
  const [showLogistics, setShowLogistics] = useState(false);

  const handleCheckIn = useCallback((stopId: string) => {
    checkIn(stopId);
  }, [checkIn]);

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

  // Lock the plan view while AI is generating — don't show stale/partial content
  if (autoPlanLoading) {
    return (
      <PlanLoadingAnimation
        cityName={cityLabel || 'your city'}
        vibe={lastPlanVibe || 'Explore'}
      />
    );
  }

  // Early return: no stops AND no curated picks loaded → show VibePicker as primary CTA
  if (totalStops === 0 && !curatedPicks) {
    return (
      <div className="overscroll-contain">
        {/* Empty state illustration */}
        <div className="text-center pt-4 pb-2 animate-enter-up">
          <div className="text-[48px] mb-2">{'\u{1F30D}'}</div>
          <h2 className="font-heading text-[20px] font-bold text-text-primary mb-1">
            {cityLabel ? `Plan your ${cityLabel} trip` : 'Start your adventure'}
          </h2>
          <p className="text-[13px] text-text-tertiary">
            Pick a vibe and we'll curate the perfect day for you
          </p>
        </div>

        <VibePicker
          onPickVibe={loadCuratedPicks}
          loading={curatedLoading}
          cityName={cityLabel || undefined}
          onManual={() => setScreen('discover')}
        />

        {curatedError && (
          <div className="mt-3 p-3 rounded-xl bg-red-tint-bg border border-red-tint-border text-center">
            <p className="text-sm text-status-red font-medium">{curatedError}</p>
            <button
              onClick={() => curatedVibe && loadCuratedPicks(curatedVibe)}
              className="mt-2 text-xs text-text-secondary underline bg-transparent border-none cursor-pointer"
            >
              Try again
            </button>
          </div>
        )}

        <div className="text-center mt-6 animate-enter-up" style={{ animationDelay: '200ms' }}>
          <div className="relative mx-auto mb-4 px-4 py-3 rounded-2xl" style={{ background: 'var(--bg-elevated)' }}>
            <p className="text-text-secondary text-[13px] leading-relaxed">
              Or explore and tap <span className="text-accent-amber font-semibold">+ Add</span> to build your plan manually
            </p>
          </div>
          <div className="flex flex-col gap-2.5 items-center">
            <button
              onClick={() => setScreen('discover')}
              className="bg-accent-gradient text-text-on-accent border-none rounded-[14px] py-3.5 px-7 text-[15px] font-semibold cursor-pointer shadow-[0_4px_20px_var(--amber-tint-shadow)] active:scale-[0.97] transition-transform"
            >
              Start Exploring
            </button>
            <button
              onClick={() => { if (!requireAuth()) return; setShowAddLinkModal(true); }}
              className="flex items-center gap-2 py-2.5 px-5 rounded-xl border border-dashed border-accent-amber text-accent-amber text-[13px] font-semibold cursor-pointer bg-transparent active:scale-[0.97] transition-transform"
            >
              {'\u2795'} Quick Add from Link
            </button>
          </div>
        </div>
        {showAddLinkModal && <AddFromLinkModal onClose={() => setShowAddLinkModal(false)} />}
      </div>
    );
  }

  return (
    <div className="overscroll-contain">
      {/* Header */}
      <div className="mb-4">
        <div className="flex justify-between items-center">
          <h1 className="font-heading text-[22px] font-bold mb-1">
            {lastPlanTitle || 'Your Trip Plan'}
          </h1>
        </div>
        <p className="text-text-tertiary text-[13px]">
          {cityLabel} · {totalStops} stop{totalStops !== 1 ? 's' : ''} · {dayCount} day{dayCount !== 1 ? 's' : ''}
        </p>
        {lastPlanHeadline && (
          <p className="text-sm text-text-secondary italic mt-1.5 leading-snug">
            {lastPlanHeadline}
          </p>
        )}
        {/* Flight info */}
        {flights && flights.length > 0 && originAirport && destinationAirport && (
          <div className="mt-2">
            <FlightLine
              flights={flights}
              originAirport={originAirport}
              destinationAirport={destinationAirport}
              googleFlightsUrl={googleFlightsUrl}
            />
          </div>
        )}
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

      {/* Quick Add — planning & pre-trip only */}
      {(tripPhase === 'planning' || tripPhase === 'pretrip') && (
        <div
          onClick={() => { if (!requireAuth()) return; setShowAddLinkModal(true); }}
          className="mt-1 mb-3 inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-dashed border-accent-amber bg-amber-tint-bg06 text-accent-amber text-xs font-medium cursor-pointer"
        >
          <span>{'\u2795'}</span>
          Quick Add
        </div>
      )}

      {/* Context hints — planning phase only */}
      {tripPhase === 'planning' && (
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
      )}

      {/* Trip Weather Forecast — pretrip & live only */}
      {(tripPhase === 'pretrip' || tripPhase === 'live') && weather && weather.forecast.length > 0 && dayCount > 0 && (
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

      {/* Travel Advisory Banner — pretrip & live only */}
      {(tripPhase === 'pretrip' || tripPhase === 'live') && advisory && (() => {
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

      {/* Logistics Panel moved to fixed footer — see portal below */}

      {/* Post-trip summary card — only show if user actually checked in to stops */}
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

      {/* Itinerary Alerts */}
      {itineraryAlerts.length > 0 && (
        <ItineraryAlertBanner
          alerts={itineraryAlerts}
          onDismiss={dismissAlert}
          onAction={(alert) => {
            if (alert.action?.actionType === 'reorder' && alert.stopId) {
              const idx = dayPlan.findIndex(s => s.id === alert.stopId);
              if (idx > 0) reorderStops(idx, 0);
              dismissAlert(alert.id);
            } else if (alert.action?.actionType === 'remove' && alert.stopId) {
              removeFromPlan(alert.stopId);
              dismissAlert(alert.id);
            } else {
              dismissAlert(alert.id);
            }
          }}
        />
      )}

      {/* Day-of events — grouped with alerts above */}
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

      {/* Day Summary — planning, pretrip, posttrip (replaced by live progress bar during live) */}
      {tripPhase !== 'live' && daySummary && dayPlan.length >= 2 && (
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

      {/* ── Curated Picks browsing feed (stays visible while user adds places) ── */}
      {curatedPicks && (
        <div className="mb-4">
          <CuratedPicks
            sections={curatedPicks.sections}
            vibeLabel={curatedPicks.vibeLabel}
            cityName={cityLabel || 'your city'}
            onAddPlace={(place) => addToPlan(place)}
            addedPlaceIds={addedPlaceIds}
            onViewPlace={(place) => setSelectedPlace(place)}
          />

          {/* Switch vibe / go back */}
          <div className="flex items-center gap-3 mt-2">
            <div className="flex-1 h-px bg-border-subtle" />
            <button
              onClick={clearCuratedPicks}
              className="text-[12px] text-text-tertiary hover:text-accent-amber transition-colors bg-transparent border-none cursor-pointer"
            >
              Change vibe
            </button>
            <div className="flex-1 h-px bg-border-subtle" />
          </div>
        </div>
      )}

      {/* ── Vibe Picker when day is empty and no curated picks loaded ── */}
      {dayPlan.length === 0 && !curatedPicks && (
        <VibePicker
          onPickVibe={loadCuratedPicks}
          loading={curatedLoading}
          cityName={cityLabel || undefined}
          onManual={() => setScreen('discover')}
          compact={totalStops > 0}
        />
      )}

      {/* Active day stops */}
      {dayPlan.length === 0 ? (
        !curatedPicks ? null : (
          /* Show "or add manually" below curated picks when no stops yet */
          <div className="flex gap-2 mt-1 mb-4 justify-center">
            <button onClick={() => setScreen('discover')}
              className="py-2 px-4 rounded-xl text-[13px] font-semibold bg-bg-subtle text-text-secondary border border-border-medium cursor-pointer">
              Explore Places
            </button>
            <button onClick={() => { if (!requireAuth()) return; setShowAddLinkModal(true); }}
              className="py-2 px-4 rounded-xl text-[13px] font-semibold bg-transparent text-accent-amber border border-dashed border-accent-amber cursor-pointer">
              Quick Add
            </button>
          </div>
        )
      ) : (<>
        {/* Live Day progress bar */}
        {isLiveDay && (
          <div className="mb-3 p-3 rounded-xl bg-green-tint-bg border border-green-tint-border">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold text-status-green flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-status-green animate-pulse" />
                Live Day {liveDayNumber}
              </span>
              <span className="text-xs text-text-secondary flex items-center gap-2">
                {currentStreak >= 3 && (
                  <span className="text-accent-amber font-semibold">{'\u{1F525}'} {currentStreak} streak</span>
                )}
                {checkedInCount}/{totalStopsToday} visited
              </span>
            </div>
            <div className="h-2 rounded-full bg-bg-subtle-strong overflow-hidden">
              <div
                className="h-full rounded-full bg-status-green transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Collection header */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-[13px] text-text-secondary">
            {dayPlan.length} {dayPlan.length === 1 ? 'spot' : 'spots'} to hit
            {dayPlan.length > 1 && <span className="text-text-tertiary"> {'\u00b7'} drag to reorder</span>}
          </p>
        </div>

        {/* Golden Hour Card */}
        {dayPlan.length > 0 && selectedCity?.lat && (
          <GoldenHourCard
            dayPlan={dayPlan}
            cityLat={selectedCity.lat}
            timezoneOffset={(() => {
              try {
                const now = new Date();
                const utc = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
                const local = new Date(now.toLocaleString('en-US', { timeZone: selectedCity.timezone || undefined }));
                return (local.getTime() - utc.getTime()) / 3600000;
              } catch { return -(new Date().getTimezoneOffset() / 60); }
            })()}
          />
        )}

        <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={dayPlan.map(s => s.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 gap-2.5">
          {dayPlan.map((stop, index) => {
            const stopName = getStopName(stop);
            const stopCategory = getStopCategory(stop);
            const photoUrl = stop.type === 'place' ? stop.place?.photoUrl : stop.event?.imageUrl;
            const stopRating = stop.type === 'place' ? (stop.place?.rating || 0) : 0;

            return (
              <Fragment key={stop.id}>
                <SortableStopCard id={stop.id}>
                {(listeners) => (
                  <div className={`rounded-2xl overflow-hidden border card-edge-glow ${
                    stop.type === 'event' ? 'border-purple-tint-border15' : 'border-border-subtle'
                  } bg-bg-elevated ${index > 0 ? 'route-connector' : ''}`}>
                    {/* Photo */}
                    <div className="relative h-[100px] w-full cursor-pointer"
                      onClick={() => { if (stop.type === 'place' && stop.place) setSelectedPlace(stop.place); }}
                      role="button" tabIndex={0}>
                      {/* Signature stop number badge */}
                      <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-md flex items-center justify-center z-10 text-[10px] font-bold font-heading" style={{ background: '#F59E0B', color: '#0A0A0A' }}>
                        {index + 1}
                      </div>
                      {photoUrl ? (
                        <>
                          <NativeImg src={fixPhotoUrl(photoUrl)!} alt={stopName} loading="lazy" decoding="async"
                            className="w-full h-full object-cover" />
                          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 20%, rgba(0,0,0,0.75))' }} />
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl"
                          style={{ background: stop.type === 'event' ? 'var(--events-gradient)' : 'linear-gradient(135deg, var(--amber-tint-bg15), var(--bg-subtle))' }}>
                          {stop.type === 'event' ? '\u{1F3AB}' : '\u{1F4CD}'}
                        </div>
                      )}
                      {stop.timeSlot && !(isLiveDay && isCheckedIn(stop.id)) && (
                        <div className="absolute top-1.5 left-8 text-[9px] font-bold text-white/90 uppercase tracking-wider bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-sm">
                          {stop.timeSlot}
                        </div>
                      )}
                      {isLiveDay && isCheckedIn(stop.id) && (
                        <div className="absolute top-1.5 left-8 bg-status-green text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          {'\u2713'} Visited
                        </div>
                      )}
                      <div className="absolute top-1.5 right-1.5 flex gap-1" onClick={e => e.stopPropagation()}>
                        <div {...listeners} className="cursor-grab active:cursor-grabbing touch-none p-1 rounded bg-black/40 backdrop-blur-sm">
                          <DragHandleIcon color="white" />
                        </div>
                        <button onClick={() => removeFromPlan(stop.id)}
                          className="bg-black/40 backdrop-blur-sm border-none text-white cursor-pointer text-[10px] p-1 rounded min-h-[22px] min-w-[22px] flex items-center justify-center">
                          {'\u2715'}
                        </button>
                      </div>
                      <div className="absolute bottom-1.5 left-2 right-2">
                        <h3 className="text-[13px] font-bold text-white leading-tight drop-shadow-sm line-clamp-2">
                          {stopName}
                        </h3>
                      </div>
                    </div>
                    {/* Info */}
                    <div className="p-2.5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[11px] text-text-tertiary truncate">{stopCategory}</span>
                        {stopRating > 0 && (
                          <span className="text-[11px] text-accent-amber shrink-0">{'\u2605'} {stopRating.toFixed(1)}</span>
                        )}
                      </div>
                      {stop.bestTime && stop.bestTime !== 'any' && (() => {
                        const bestLabel: Record<string, string> = {
                          morning: 'Best in the morning',
                          midday: 'Best at midday',
                          afternoon: 'Best in the afternoon',
                          sunset: 'Best at sunset',
                          evening: 'Best in the evening',
                          night: 'Best at night',
                        };
                        const bestIcon: Record<string, string> = {
                          morning: '\u2615',
                          midday: '\u{1F31E}',
                          afternoon: '\u{1F33F}',
                          sunset: '\u{1F305}',
                          evening: '\u{1F377}',
                          night: '\u{1F31C}',
                        };
                        return (
                          <div className="inline-flex items-center gap-1 mb-1 text-[9px] font-semibold text-accent-amber bg-amber-tint-bg10 border border-amber-tint-border px-1.5 py-[2px] rounded">
                            <span>{bestIcon[stop.bestTime]}</span>
                            <span>{bestLabel[stop.bestTime]}</span>
                          </div>
                        );
                      })()}
                      {stop.type === 'place' && stop.place && (() => {
                        const hs = getHoursStatus(stop.place.hours, stop.place.openNow);
                        return (
                          <div className="flex items-center gap-1 mb-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${stop.place.openNow ? 'bg-status-green' : 'bg-status-red'}`} />
                            <span className={`text-[10px] font-medium ${
                              hs.urgent ? 'text-status-red' : stop.place.openNow ? 'text-status-green' : 'text-status-red'
                            }`}>
                              {hs.text}
                            </span>
                            {hs.urgent && <span className="text-[9px] text-status-red font-semibold">Hurry!</span>}
                          </div>
                        );
                      })()}
                      {stop.type === 'event' && stop.event && (
                        <div className="text-[10px] text-events-text mb-1">
                          {formatEventDate(stop.event.date)}{stop.event.time && <>{' \u00b7 '}{formatEventTime(stop.event.time)}</>}
                        </div>
                      )}
                      {stop.knownFor && (
                        <p className="text-[10px] text-text-tertiary italic leading-snug line-clamp-2 mb-1">{stop.knownFor}</p>
                      )}
                      {stop.reason && !stop.knownFor && (
                        <p className="text-[10px] text-text-tertiary italic leading-snug line-clamp-1 mb-1">{stop.reason}</p>
                      )}
                      {/* Actions */}
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {isLiveDay && !isCheckedIn(stop.id) && (
                          <button onClick={() => handleCheckIn(stop.id)}
                            className="py-[3px] px-1.5 rounded text-[10px] bg-green-tint-bg text-status-green border border-green-tint-border cursor-pointer font-semibold active:scale-[0.93] transition-transform">
                            {'\u{1F4CD}'} Check In
                          </button>
                        )}
                        {stop.type === 'place' && stop.place?.googleMapsUrl && (
                          <a href={stop.place.googleMapsUrl} target="_blank" rel="noopener noreferrer"
                            className="py-[3px] px-1.5 rounded text-[10px] bg-amber-tint-bg10 text-accent-amber no-underline flex items-center gap-0.5">
                            <DirectionsIcon /> Go
                          </a>
                        )}
                        {stop.type === 'event' && stop.event?.url && (
                          <a href={stop.event.url} target="_blank" rel="noopener noreferrer"
                            className="py-[3px] px-1.5 rounded text-[10px] bg-purple-tint-bg08 text-events-text no-underline">
                            {'\u{1F3AB}'} Tix
                          </a>
                        )}
                        {stop.type === 'place' && stop.place && /restaurant|cafe|bakery|bar|food|pizza|sushi|burger|coffee|tea|ice.cream|dessert|brunch|bistro|diner|grill|bbq|seafood|steak/i.test(stop.place.category || '') && (
                          <button
                            onClick={() => {
                              setDishLensContext({ dish: undefined, city: cityLabel, restaurant: stop.place!.name });
                              setScreen('tastelens');
                            }}
                            className="py-[3px] px-1.5 rounded text-[10px] bg-amber-tint-bg10 text-accent-amber border border-amber-tint-border20 cursor-pointer">
                            TasteLens
                          </button>
                        )}
                        <button
                          onClick={() => setExpandedNearby(expandedNearby === stop.id ? null : stop.id)}
                          className={`py-[3px] px-1.5 rounded text-[10px] border cursor-pointer ${
                            expandedNearby === stop.id
                              ? 'bg-accent-amber text-text-on-accent border-accent-amber'
                              : 'bg-amber-tint-bg10 text-accent-amber border-amber-tint-border20'
                          }`}>
                          Nearby
                        </button>
                        {stop.type === 'place' && stop.place && (
                          <button
                            disabled={pivotLoading}
                            onClick={async () => {
                              if (pivotStopId === stop.id) {
                                setPivotStopId(null); setPivotAlternatives([]); return;
                              }
                              const excludeIds = new Set(dayPlan.map(s => s.place?.placeId).filter(Boolean) as string[]);
                              const stopData = {
                                category: stop.place!.category, lat: stop.place!.lat, lng: stop.place!.lng,
                                priceLevel: stop.place!.priceLevel, placeId: stop.place!.placeId,
                              };
                              let alternatives = findPivotAlternatives(allPlaces, stopData, excludeIds, 3, lastPlanVibe || undefined, stop.timeSlot);
                              if (alternatives.length === 0) {
                                setPivotLoading(true);
                                try {
                                  const isFoodPlan = lastPlanVibe === 'food' || lastPlanVibe === 'indulge' || lastPlanVibe === 'stacked';
                                  const OUTDOOR_CATEGORIES = ['park','hiking_area','national_park','garden','beach','campground','playground','zoo','marina'];
                                  const isOutdoor = OUTDOOR_CATEGORIES.includes(stop.place!.category);
                                  const vibe = isFoodPlan ? 'eatsip' : isOutdoor ? 'thespot' : (TYPE_TO_VIBE[stop.place!.category] || stop.place!.tags?.[0] || 'thespot');
                                  const googlePlaces = await searchNearby(stop.place!.lat, stop.place!.lng, [vibe], 2000);
                                  let filtered = googlePlaces.filter(p => !excludeIds.has(p.placeId) && p.placeId !== stop.place!.placeId);
                                  // Prefer same category, then same group
                                  const SWAP_GROUP: Record<string, string> = {
                                    restaurant:'food',cafe:'food',bakery:'food',coffee_shop:'food',diner:'food',bistro:'food',
                                    bar:'drink',wine_bar:'drink',pub:'drink',cocktail_bar:'drink',brewery:'drink',
                                    museum:'culture',art_gallery:'culture',library:'culture',
                                    historic_site:'landmark',monument:'landmark',landmark:'landmark',historical_landmark:'landmark',tourist_attraction:'landmark',
                                    park:'outdoor',garden:'outdoor',beach:'outdoor',hiking_area:'outdoor',national_park:'outdoor',
                                    night_club:'nightlife',lounge:'nightlife',spa:'wellness',gym:'wellness',
                                    shopping_mall:'shopping',market:'shopping',boutique:'shopping',
                                  };
                                  const stopCat = stop.place!.category;
                                  const stopGrp = SWAP_GROUP[stopCat] || stopCat;
                                  const sameCat = filtered.filter(p => p.category === stopCat);
                                  const sameGrp = filtered.filter(p => (SWAP_GROUP[p.category] || p.category) === stopGrp);
                                  if (sameCat.length >= 3) filtered = sameCat;
                                  else if (sameGrp.length >= 3) filtered = sameGrp;
                                  alternatives = filtered.slice(0, 8);
                                } catch { /* ignore */ }
                                setPivotLoading(false);
                              }
                              if (alternatives.length > 0) {
                                setPivotStopId(stop.id); setPivotAlternatives(alternatives); setPivotIndex(0);
                              } else { showToast('No alternatives found nearby'); }
                              track('pivot_initiated', { place: stop.place!.name, day: String(activeDay) });
                            }}
                            className={`py-[3px] px-1.5 rounded text-[10px] border cursor-pointer ${
                              pivotStopId === stop.id
                                ? 'bg-accent-amber text-text-on-accent border-accent-amber'
                                : 'bg-amber-tint-bg10 text-accent-amber border-amber-tint-border20'
                            }`}>
                            {pivotLoading ? '\u23F3' : '\u{1F504}'} Swap
                          </button>
                        )}
                        {dayCount > 1 && (
                          <select value=""
                            onChange={e => { if (e.target.value) moveStopToDay(stop.id, activeDay, Number(e.target.value)); }}
                            className="py-[3px] px-1.5 rounded text-[10px] bg-bg-subtle-medium text-text-tertiary border border-border-medium cursor-pointer">
                            <option value="">Move...</option>
                            {sortedDays.filter(d => d !== activeDay).map(d => (
                              <option key={d} value={d}>{formatDayLabel(d)}</option>
                            ))}
                          </select>
                        )}
                      </div>
                      {/* Inline Pivot */}
                      {pivotStopId === stop.id && pivotAlternatives.length > 0 && (() => {
                        const alt = pivotAlternatives[pivotIndex];
                        if (!alt) return null;
                        return (
                          <div className="mt-2 p-2 rounded-xl border border-amber-tint-border30 bg-amber-tint-bg06">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span className="text-[10px] font-semibold text-accent-amber">{'\u{1F504}'} Alternative</span>
                              <span className="text-[10px] text-text-muted ml-auto">{pivotIndex + 1}/{pivotAlternatives.length}</span>
                            </div>
                            <div className="flex gap-2 items-center">
                              <div className="w-10 h-10 rounded-lg shrink-0 overflow-hidden bg-bg-subtle-strong">
                                {alt.photoUrl ? (
                                  <NativeImg src={fixPhotoUrl(alt.photoUrl)!} alt={alt.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-sm text-text-tertiary">{'\u{1F4CD}'}</div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] font-semibold text-text-primary truncate">{alt.name}</div>
                                <div className="text-[10px] text-text-secondary">{alt.categoryDisplay || alt.category}</div>
                                {alt.rating > 0 && <span className="text-[10px] text-accent-amber">{'\u2605'} {alt.rating.toFixed(1)}</span>}
                              </div>
                            </div>
                            <div className="flex gap-1.5 mt-2">
                              <button onClick={() => { setPivotStopId(null); setPivotAlternatives([]); }}
                                className="py-1 px-2 rounded text-[10px] font-medium bg-transparent border border-border-medium text-text-secondary cursor-pointer">Cancel</button>
                              <button onClick={() => { setPivotIndex((pivotIndex + 1) % pivotAlternatives.length); track('pivot_next', { current: alt.name }); }}
                                className="flex-1 py-1 px-2 rounded text-[10px] font-medium bg-bg-subtle-medium border border-border-medium text-text-primary cursor-pointer">Next {'\u2192'}</button>
                              <button onClick={() => { pivotStop(pivotStopId, alt); track('pivot_swapped', { newPlace: alt.name }); setPivotStopId(null); setPivotAlternatives([]); }}
                                className="flex-1 py-1 px-2 rounded text-[10px] font-semibold bg-accent-gradient text-text-on-accent border-none cursor-pointer">Swap {'\u2713'}</button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    {/* Nearby Discoveries — full width within card */}
                    {expandedNearby === stop.id && (
                      <div className="px-2.5 pb-2.5">
                        <NearbyDiscoveries stop={stop} />
                      </div>
                    )}
                  </div>
                )}
                </SortableStopCard>
              </Fragment>
            );
          })}
        </div>
        </SortableContext>
        </DndContext>
      </>)}

      {/* Pack This Checklist — pretrip only */}
      {tripPhase === 'pretrip' && allStops.length > 0 && packingItems.length > 0 && (
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


      {/* ═══════════════════════════════════════════════════════════════
          SHARE & EXPORT — planning, pretrip, posttrip (hidden during live)
          ══════════════════════════════════════════════════════════════ */}
      {tripPhase !== 'live' && <div className="flex flex-col gap-2.5 mt-5">
        <div className="font-heading text-xs font-semibold text-text-tertiary uppercase tracking-[0.05em]">Share & Export</div>

        {/* Primary: Get Route + Share */}
        <div className="flex gap-2.5">
          {dayPlan.length > 0 && (
            <a href={getRouteUrl()} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-accent-gradient text-text-on-accent border-none rounded-[14px] p-3.5 text-[15px] font-semibold no-underline shadow-[0_4px_20px_var(--amber-tint-shadow)] active:scale-[0.97] transition-transform">
              <DirectionsIcon /> Get Route
            </a>
          )}
          <button onClick={() => { if (!requireAuth()) return; shareAsLink(); }}
            aria-label="Share plan as link"
            className="flex-1 flex items-center justify-center gap-2 bg-bg-subtle-strong text-text-primary border border-border-medium rounded-[14px] p-3.5 text-[15px] font-semibold cursor-pointer active:scale-[0.97] transition-transform">
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
          {totalStops >= 3 && user && (
            <button
              onClick={async () => {
                if (!requireAuth()) return;
                const slug = await shareAsLink();
                if (slug) {
                  const { publishRoute } = await import('../supabase');
                  const ok = await publishRoute(slug, 'adventure', user.user_metadata?.name || 'Traveler');
                  showToast(ok ? 'Route published to community!' : 'Could not publish route');
                }
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl cursor-pointer border border-amber-tint-border20 bg-amber-tint-bg10 text-accent-amber text-[13px] font-semibold"
            >
              {'\u{1F30D}'} Publish
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

        {/* Save Offline — pretrip only */}
        {tripPhase === 'pretrip' && totalStops > 0 && (
          <button
            onClick={saveForOffline}
            disabled={offlineSaving}
            aria-label={offlineSaved ? 'Plan saved for offline use' : 'Save plan for offline use'}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-[13px] font-semibold transition-all duration-200 ${
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
      </div>}

      {/* ═══════════════════════════════════════════════════════════════
          TRIP RESOURCES — pretrip only
          ══════════════════════════════════════════════════════════════ */}
      {tripPhase === 'pretrip' && totalStops > 0 && (
        <div className="mt-4 p-4 rounded-2xl bg-bg-elevated border border-border-subtle">
          <div className="font-heading text-xs font-semibold text-text-tertiary uppercase tracking-[0.05em] mb-3">Book Your Trip</div>
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

      {/* ═══════════════════════════════════════════════════════════════
          MANAGE — planning & pretrip only
          ══════════════════════════════════════════════════════════════ */}
      {(tripPhase === 'planning' || tripPhase === 'pretrip') && <div className="mt-6">
        <div className="flex items-center justify-center gap-4 pt-1">
          {dayCount > 1 && (
            <button onClick={() => {
                if (window.confirm(`Delete Day ${activeDay}? This will remove all stops for this day.`)) {
                  removeDay(activeDay);
                }
              }}
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

        <div className="mt-4 mb-2 px-1">
          <p className="text-[11px] text-text-tertiary leading-[1.5] text-center">
            NxStops recommendations are for informational purposes only. Hours, safety data, and travel advisories may not be current. Always verify with venues directly and use your own judgment.
          </p>
        </div>
      </div>}

      {/* Add from Link modal */}
      {showAddLinkModal && <AddFromLinkModal onClose={() => setShowAddLinkModal(false)} />}

      {/* Live Day summary bar — portal to escape .page-enter transform */}
      {isLiveDay && checkedInCount > 0 && createPortal(
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+70px)] left-1/2 -translate-x-1/2 max-w-[400px] w-[calc(100%-40px)] z-30">
          <div className="bg-bg-elevated/95 backdrop-blur-md rounded-2xl border border-green-tint-border py-3 px-4 flex items-center justify-around shadow-lg">
            <div className="text-center">
              <div className="text-sm font-bold text-status-green">{checkedInCount}/{totalStopsToday}</div>
              <div className="text-[11px] text-text-tertiary">visited</div>
            </div>
            <div className="w-px h-6 bg-border-subtle" />
            <div className="text-center">
              <div className="text-sm font-bold text-text-primary">~${spentSoFar}</div>
              <div className="text-[11px] text-text-tertiary">spent</div>
            </div>
            <div className="w-px h-6 bg-border-subtle" />
            <div className="text-center">
              <div className="text-sm font-bold text-text-primary">{progressPercent}%</div>
              <div className="text-[11px] text-text-tertiary">complete</div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Quick review prompt — portal to escape .page-enter transform */}
      {reviewPromptStopId && (() => {
        const stop = dayPlan.find(s => s.id === reviewPromptStopId);
        if (!stop) return null;
        return createPortal(<QuickReviewPrompt stop={stop} />, document.body);
      })()}

      {/* Logistics footer bar — pretrip & live only */}
      {(tripPhase === 'pretrip' || tripPhase === 'live') && totalStops > 0 && createPortal(
        <LogisticsPanel />,
        document.body
      )}

      {/* Chat FAB — not during posttrip */}
      {tripPhase !== 'posttrip' && totalStops > 0 && createPortal(
        <button
          onClick={() => setShowChat(true)}
          className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+80px)] right-2 w-10 h-10 rounded-2xl border-none cursor-pointer flex items-center justify-center z-40 opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Open AI assistant"
          style={{ background: 'linear-gradient(135deg, #E8940A, #D85A18)', boxShadow: '0 2px 8px rgba(232,148,10,0.3)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="white" opacity="0.95" /></svg>
        </button>,
        document.body
      )}

      {/* ChatBot modal with plan context */}
      {showChat && createPortal(
        <ChatBot
          city={cityLabel}
          onClose={() => setShowChat(false)}
          planContext={{
            stops: dayPlan.map(s => ({
              name: getStopName(s),
              category: getStopCategory(s),
              timeSlot: s.timeSlot,
            })),
            city: cityLabel,
            timeOfDay: new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening',
          }}
          onModification={(mod) => {
            showToast(`AI suggests: ${mod.action} ${mod.placeType || ''}`);
          }}
        />,
        document.body
      )}
    </div>
  );
}
