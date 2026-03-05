import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { track } from '@vercel/analytics';
import { API_URL } from '../utils/api';
import { useApp } from '../context/AppContext';
import type { EventItem } from '../types';
import NativeImg from './NativeImg';

interface Props {
  onClose: () => void;
}

const CATEGORIES = ['Event', 'Restaurant', 'Pop-up', 'Concert', 'Activity', 'Bar', 'Shop', 'Attraction'];

export default function AddFromLinkModal({ onClose }: Props) {
  const {
    addEventToPlanOnDay, isEventInPlan,
    tripStartDate, setTripStartDate, dayCount, activeDay, setActiveDay,
    citySlug, showToast, user,
  } = useApp();

  const [name, setName] = useState('');
  const [link, setLink] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [category, setCategory] = useState('Event');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(activeDay);
  const [extracting, setExtracting] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus({ preventScroll: true });
  }, []);

  // Match event date to trip day
  const matchDay = useCallback((eventDate: string): number => {
    if (!tripStartDate || !eventDate) return activeDay;
    const start = new Date(tripStartDate + 'T00:00:00').getTime();
    const event = new Date(eventDate + 'T00:00:00').getTime();
    const diff = Math.floor((event - start) / 86400000);
    if (diff >= 0 && diff < dayCount) return diff + 1;
    return activeDay;
  }, [tripStartDate, dayCount, activeDay]);

  // Try to auto-fill from link (best effort, silent failure)
  const handleLinkBlur = useCallback(async () => {
    const trimmed = link.trim();
    if (!trimmed) return;
    let parsedUrl: URL;
    try { parsedUrl = new URL(trimmed); } catch { return; }

    // Skip extraction for social media — just let users type the name
    const host = parsedUrl.hostname.toLowerCase();
    if (host.includes('instagram.com') || host.includes('tiktok.com') || host.includes('pinterest.com') || host.includes('facebook.com') || host.includes('x.com') || host.includes('twitter.com')) return;

    // Only auto-fill if name is still empty
    if (name.trim()) return;

    setExtracting(true);
    try {
      const resp = await fetch(`${API_URL}/api/user-actions?action=extract-link&url=${encodeURIComponent(trimmed)}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.name && !name.trim()) setName(data.name);
        if (data.date && !date) {
          setDate(data.date);
          setSelectedDay(matchDay(data.date));
        }
        if (data.time && data.time !== 'TBD' && !time) setTime(data.time);
        if (data.venue && !venue) setVenue(data.venue);
        if (data.category && data.category !== 'Event') setCategory(data.category);
        if (data.imageUrl) setImageUrl(data.imageUrl);
      }
    } catch {
      // Silent failure — user can fill in manually
    }
    setExtracting(false);
  }, [link, name, date, time, venue, matchDay]);

  const handleAdd = useCallback(() => {
    const finalName = name.trim();
    if (!finalName) return;

    const eventItem: EventItem = {
      id: crypto.randomUUID(),
      name: finalName,
      date: date || '',
      time: time || 'TBD',
      venue: venue || '',
      venueAddress: '',
      imageUrl,
      url: link.trim() || '',
      category,
      source: 'link',
      lat: null,
      lng: null,
    };

    if (isEventInPlan(eventItem.id)) {
      showToast('Already in your plan');
      return;
    }

    // Determine the correct day for this event
    let targetDay = selectedDay;
    if (date) {
      if (!tripStartDate) {
        // No trip date set — auto-set it to the event date so Day 1 = event day
        setTripStartDate(date);
        targetDay = 1;
      } else {
        const startMs = new Date(tripStartDate + 'T00:00:00').getTime();
        const eventMs = new Date(date + 'T00:00:00').getTime();
        const diff = Math.floor((eventMs - startMs) / 86400000) + 1;
        if (diff >= 1) targetDay = diff;
      }
    }

    if (targetDay !== activeDay) setActiveDay(targetDay);
    addEventToPlanOnDay(eventItem, targetDay);

    // Schedule smart reminder
    if (date && user) {
      import('../supabase').then(({ scheduleNotification }) => {
        scheduleNotification(
          'event_reminder',
          date,
          citySlug,
          {
            title: `\u{1F3AB} ${finalName} today!`,
            body: `${time || 'Today'} at ${venue || 'your saved spot'}`,
            url: link.trim(),
          },
        );
      }).catch(() => {});
    }

    track('quick_add_completed', {
      category,
      day: String(selectedDay),
      hasLink: String(!!link.trim()),
      hasDate: String(!!date),
    });

    onClose();
  }, [name, link, date, time, venue, category, imageUrl, selectedDay, activeDay, setActiveDay, addEventToPlanOnDay, isEventInPlan, showToast, user, citySlug, onClose, tripStartDate, setTripStartDate]);

  // Day labels
  const dayLabels = Array.from({ length: dayCount }, (_, i) => {
    const day = i + 1;
    if (!tripStartDate) return `Day ${day}`;
    const start = new Date(tripStartDate + 'T00:00:00');
    start.setDate(start.getDate() + i);
    const wd = start.toLocaleDateString('en-US', { weekday: 'short' });
    const mo = start.toLocaleDateString('en-US', { month: 'short' });
    return `Day ${day}: ${wd}, ${mo} ${start.getDate()}`;
  });

  return createPortal(
    <div
      className="fixed inset-0 bg-bg-modal-overlay-deep z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-bg-surface rounded-2xl max-w-[500px] w-full border border-border-subtle overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-5 pt-5 pb-3"
          style={{ background: 'linear-gradient(180deg, var(--amber-tint-bg15) 0%, transparent 100%)' }}>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-bg-subtle border-none flex items-center justify-center cursor-pointer text-text-tertiary text-sm"
            aria-label="Close"
          >
            {'\u2715'}
          </button>
          <h3 className="text-lg font-bold text-text-primary mb-0.5">
            {'\u2795'} Quick Add
          </h3>
          <p className="text-[13px] text-text-secondary">
            Add an event, restaurant, or place to your plan
          </p>
        </div>

        <div className="px-5 pb-5">
          {/* Image preview (from link extraction) */}
          {imageUrl && (
            <div className="mt-3 rounded-xl overflow-hidden mb-3">
              <NativeImg
                src={imageUrl}
                alt=""
                className="w-full h-[120px] object-cover"
                referrerPolicy="no-referrer"
                onError={() => setImageUrl(null)}
              />
            </div>
          )}

          <div className="mt-3 flex flex-col gap-3">
            {/* Name (required) */}
            <div>
              <label className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wide mb-1 block">
                Name *
              </label>
              <input
                ref={nameRef}
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && name.trim() && handleAdd()}
                placeholder="e.g. Rooftop Jazz Night, Taco Stand..."
                className="w-full py-3 px-4 rounded-xl border border-border-medium bg-bg-subtle text-text-primary text-[15px] outline-none focus:border-accent-amber placeholder:text-text-tertiary"
              />
            </div>

            {/* Link (optional) */}
            <div>
              <label className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wide mb-1 block">
                Link <span className="font-normal normal-case">(optional — auto-fills details)</span>
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={link}
                  onChange={e => setLink(e.target.value)}
                  onBlur={handleLinkBlur}
                  placeholder="Paste a URL..."
                  className="w-full py-3 px-4 rounded-xl border border-border-medium bg-bg-subtle text-text-primary text-[15px] outline-none focus:border-accent-amber placeholder:text-text-tertiary"
                />
                {extracting && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-border-medium border-t-accent-amber rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wide mb-1 block">
                Category
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-[13px] font-medium border cursor-pointer transition-colors ${
                      category === cat
                        ? 'bg-accent-amber text-text-on-accent border-accent-amber'
                        : 'bg-bg-subtle text-text-secondary border-border-medium'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Date & Time row */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wide mb-1 block">
                  Date <span className="font-normal normal-case">(optional)</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={e => {
                    setDate(e.target.value);
                    if (e.target.value) setSelectedDay(matchDay(e.target.value));
                  }}
                  className="w-full py-3 px-4 rounded-xl border border-border-medium bg-bg-subtle text-text-primary text-[14px] outline-none focus:border-accent-amber"
                />
              </div>
              <div className="flex-1">
                <label className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wide mb-1 block">
                  Time <span className="font-normal normal-case">(optional)</span>
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full py-3 px-4 rounded-xl border border-border-medium bg-bg-subtle text-text-primary text-[14px] outline-none focus:border-accent-amber"
                />
              </div>
            </div>

            {/* Venue */}
            <div>
              <label className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wide mb-1 block">
                Venue <span className="font-normal normal-case">(optional)</span>
              </label>
              <input
                type="text"
                value={venue}
                onChange={e => setVenue(e.target.value)}
                placeholder="e.g. Brooklyn Mirage, Central Park..."
                className="w-full py-3 px-4 rounded-xl border border-border-medium bg-bg-subtle text-text-primary text-[15px] outline-none focus:border-accent-amber placeholder:text-text-tertiary"
              />
            </div>

            {/* Day selector */}
            {dayCount > 1 && (
              <div>
                <label className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wide mb-1 block">
                  Add to
                </label>
                <select
                  value={selectedDay}
                  onChange={e => setSelectedDay(Number(e.target.value))}
                  className="w-full py-2.5 px-3 rounded-xl border border-border-medium bg-bg-subtle text-text-primary text-[14px] outline-none"
                >
                  {dayLabels.map((label, i) => (
                    <option key={i + 1} value={i + 1}>{label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 mt-1">
              <button
                onClick={handleAdd}
                disabled={!name.trim()}
                className="flex-1 py-3 px-4 rounded-xl bg-accent-gradient text-text-on-accent border-none text-[15px] font-semibold cursor-pointer shadow-[0_4px_20px_var(--amber-tint-shadow)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Add to Plan
              </button>
              <button
                onClick={onClose}
                className="py-3 px-4 rounded-xl bg-bg-subtle border border-border-medium text-text-tertiary text-[14px] font-medium cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
