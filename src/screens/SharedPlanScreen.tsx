import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchSharedPlan } from '../supabase';
import type { Stop } from '../types';
import { formatDistance } from '../services/places';
import { haversineKm } from '../utils/transport';

const getStopName = (stop: Stop) =>
  stop.type === 'event' ? (stop.event?.name || 'Event') : (stop.place?.name || 'Place');

const getStopCategory = (stop: Stop) =>
  stop.type === 'event' ? (stop.event?.category || 'Event') : (stop.place?.categoryDisplay || '');

interface SharedPlanData {
  city_label: string;
  city_slug: string;
  trip_days: Record<string, Stop[]>;
  day_title: string | null;
  created_at: string;
  view_count: number;
}

export default function SharedPlanScreen() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<SharedPlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeDay, setActiveDay] = useState(1);

  useEffect(() => {
    if (!slug) { setError(true); setLoading(false); return; }
    fetchSharedPlan(slug).then(data => {
      if (data) {
        setPlan(data as SharedPlanData);
        const days = Object.keys(data.trip_days).map(Number).sort((a, b) => a - b);
        if (days.length > 0) setActiveDay(days[0]);
      } else {
        setError(true);
      }
      setLoading(false);
    });
  }, [slug]);

  useEffect(() => {
    if (plan) {
      document.title = `${plan.city_label} Trip Plan | NxStops`;
      return () => { document.title = 'NxStops'; };
    }
  }, [plan]);

  if (loading) {
    return (
      <div className="font-['DM_Sans',system-ui,sans-serif] bg-bg-body min-h-screen text-text-primary flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">{'\u2728'}</div>
          <div className="text-sm text-text-secondary">Loading trip plan...</div>
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="font-['DM_Sans',system-ui,sans-serif] bg-bg-body min-h-screen text-text-primary flex items-center justify-center">
        <div className="text-center px-6">
          <div className="text-4xl mb-3">{'\u{1F6AB}'}</div>
          <h2 className="text-lg font-bold mb-2">Plan not found</h2>
          <p className="text-sm text-text-secondary mb-6">This trip plan may have expired or doesn't exist.</p>
          <button onClick={() => navigate('/')}
            className="bg-accent-gradient text-text-on-accent border-none rounded-xl px-6 py-3 text-sm font-semibold cursor-pointer">
            Plan your own trip
          </button>
        </div>
      </div>
    );
  }

  const tripDays = plan.trip_days;
  const sortedDays = Object.keys(tripDays).map(Number).sort((a, b) => a - b);
  const dayPlan: Stop[] = tripDays[String(activeDay)] || [];
  const totalStops = Object.values(tripDays).flat().length;

  const getDistance = (a: Stop, b: Stop): string | null => {
    const aCoord = a.place ? { lat: a.place.lat, lng: a.place.lng } : null;
    const bCoord = b.place ? { lat: b.place.lat, lng: b.place.lng } : null;
    if (!aCoord?.lat || !aCoord?.lng || !bCoord?.lat || !bCoord?.lng) return null;
    const km = haversineKm(aCoord.lat, aCoord.lng, bCoord.lat, bCoord.lng);
    return formatDistance(km, false);
  };

  return (
    <div className="font-['DM_Sans',system-ui,sans-serif] bg-bg-body min-h-screen text-text-primary">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{'\u{1F30D}'}</span>
            <h1 className="text-xl font-bold">{plan.day_title || `${plan.city_label} Trip Plan`}</h1>
          </div>
          <p className="text-xs text-text-tertiary">
            {plan.city_label} · {totalStops} stop{totalStops !== 1 ? 's' : ''} · {sortedDays.length} day{sortedDays.length !== 1 ? 's' : ''}
            {' · '}Shared via NxStops
          </p>
        </div>

        {/* Day Tabs */}
        {sortedDays.length > 1 && (
          <div className="flex gap-2 overflow-x-auto scroll-hidden mb-4 pb-1">
            {sortedDays.map(day => {
              const count = (tripDays[String(day)] || []).length;
              return (
                <button key={day} onClick={() => setActiveDay(day)}
                  className={`shrink-0 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer border ${
                    day === activeDay
                      ? 'bg-accent-gradient text-text-on-accent border-transparent'
                      : 'bg-bg-elevated border-border-medium text-text-secondary'
                  }`}>
                  Day {day} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Stops */}
        {dayPlan.length === 0 ? (
          <div className="card text-center py-8 px-5">
            <div className="text-3xl mb-2">{'\u{1F4CB}'}</div>
            <p className="text-text-secondary text-sm">No stops for this day.</p>
          </div>
        ) : (
          <div className="relative pl-8">
            {/* Timeline line */}
            <div className="absolute left-[11px] top-4 bottom-4 w-0.5 rounded-full"
              style={{ background: 'linear-gradient(180deg, var(--accent-amber), var(--amber-tint-border30))' }} />

            {dayPlan.map((stop, index) => {
              const name = getStopName(stop);
              const category = getStopCategory(stop);
              const photoUrl = stop.place?.photoUrl || null;
              const rating = stop.place?.rating || 0;
              const reviewCount = stop.place?.reviewCount || 0;

              return (
                <div key={stop.id} className="mb-3">
                  {/* Numbered circle */}
                  <div className="absolute -left-0 w-6 h-6 rounded-full bg-accent-gradient flex items-center justify-center text-[11px] font-bold text-text-on-accent"
                    style={{ top: 'auto', position: 'relative', float: 'left', marginLeft: '-32px', marginTop: '14px' }}>
                    {index + 1}
                  </div>

                  {/* Stop card */}
                  <div className="card border border-amber-tint-bg10 p-3">
                    <div className="flex gap-3">
                      {photoUrl && (
                        <img src={photoUrl} alt={name}
                          className="w-16 h-16 rounded-xl shrink-0 object-cover" />
                      )}
                      <div className="flex-1 min-w-0">
                        {stop.timeSlot && (
                          <div className="text-[11px] font-semibold text-accent-amber uppercase tracking-wide mb-0.5">
                            {stop.timeSlot}
                          </div>
                        )}
                        <h3 className="text-sm font-semibold mb-0.5 truncate">{name}</h3>
                        <p className="text-xs text-text-secondary mb-0.5">
                          {category}
                          {stop.estimatedSpend ? ` · ~$${stop.estimatedSpend}` : ''}
                        </p>
                        {rating > 0 && (
                          <div className="text-xs">
                            <span className="text-accent-amber">{'\u2605'} {rating.toFixed(1)}</span>
                            <span className="text-text-tertiary"> ({reviewCount})</span>
                          </div>
                        )}
                        {stop.reason && (
                          <p className="text-[11px] text-text-tertiary mt-1 italic">
                            {'\u2728'} {stop.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Distance between stops */}
                  {index < dayPlan.length - 1 && (() => {
                    const dist = getDistance(stop, dayPlan[index + 1]);
                    if (!dist) return null;
                    return (
                      <div className="ml-0 mb-1 py-2 px-3 text-center">
                        <span className="text-[11px] text-text-tertiary">{'\u{1F6B6}'} {dist}</span>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}

        {/* CTA */}
        <div className="mt-8 text-center">
          <button onClick={() => navigate('/')}
            className="bg-accent-gradient text-text-on-accent border-none rounded-xl px-8 py-3.5 text-sm font-semibold cursor-pointer shadow-[0_4px_20px_var(--amber-tint-shadow)]">
            Plan your own trip {'\u2192'}
          </button>
          <p className="text-[11px] text-text-tertiary mt-3">
            Powered by <span className="font-semibold">NxStops</span>
          </p>
        </div>
      </div>
    </div>
  );
}
