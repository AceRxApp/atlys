import { useMemo } from 'react';
import type { Stop } from '../types';

// Outdoor categories that benefit from golden hour
const OUTDOOR_KEYWORDS = [
  'park', 'garden', 'beach', 'waterfront', 'pier', 'marina', 'viewpoint',
  'hiking', 'trail', 'nature', 'rooftop', 'terrace', 'outdoor', 'plaza',
  'bridge', 'lake', 'river', 'mountain', 'scenic', 'monument', 'landmark',
  'promenade', 'boardwalk', 'harbor', 'lookout', 'observatory',
];

function isOutdoorStop(stop: Stop): boolean {
  const cat = (stop.place?.category || stop.event?.category || '').toLowerCase();
  const name = (stop.place?.name || stop.event?.name || '').toLowerCase();
  return OUTDOOR_KEYWORDS.some(kw => cat.includes(kw) || name.includes(kw));
}

/**
 * Approximate sunset time based on latitude and day of year.
 * Returns hours in 24h format (e.g., 18.5 = 6:30 PM).
 * Uses a simplified solar calculation.
 */
function estimateSunsetHour(lat: number, dayOfYear: number): number {
  // Solar declination (approximate)
  const decl = 23.45 * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81));
  const declRad = (decl * Math.PI) / 180;
  const latRad = (lat * Math.PI) / 180;
  
  // Hour angle at sunset
  const cosH = -Math.tan(latRad) * Math.tan(declRad);
  // Clamp for extreme latitudes (midnight sun / polar night)
  const clampedCosH = Math.max(-1, Math.min(1, cosH));
  const hourAngle = Math.acos(clampedCosH) * (180 / Math.PI);
  
  // Convert to hours (15 degrees = 1 hour)
  const sunsetUTC = 12 + hourAngle / 15;
  
  // Return local solar time (approximation — doesn't account for timezone offset perfectly)
  return sunsetUTC;
}

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

function formatTime(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
}

interface GoldenHourCardProps {
  dayPlan: Stop[];
  cityLat?: number;
  timezoneOffset?: number; // hours offset from UTC (e.g., -5 for EST)
  onReorderSuggestion?: (stopId: string, suggestedTime: string) => void;
}

export default function GoldenHourCard({ dayPlan, cityLat, timezoneOffset = 0, onReorderSuggestion }: GoldenHourCardProps) {
  const goldenHour = useMemo(() => {
    if (!cityLat) return null;

    const dayOfYear = getDayOfYear();
    const sunsetSolar = estimateSunsetHour(cityLat, dayOfYear);
    
    // Adjust from solar time to local time (rough approximation)
    const sunsetLocal = sunsetSolar + timezoneOffset;
    const goldenStart = sunsetLocal - 1; // Golden hour starts ~1hr before sunset
    
    return {
      sunsetTime: formatTime(sunsetLocal),
      goldenStart: formatTime(goldenStart),
      goldenStartHour: goldenStart,
      sunsetHour: sunsetLocal,
    };
  }, [cityLat, timezoneOffset]);

  const outdoorStops = useMemo(() => {
    return dayPlan.filter(isOutdoorStop);
  }, [dayPlan]);

  // Check if we're near golden hour (within 3 hours)
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  
  if (!goldenHour || outdoorStops.length === 0) return null;
  
  // Only show if golden hour is upcoming (within next 4 hours) or happening now
  const hoursUntilGolden = goldenHour.goldenStartHour - currentHour;
  if (hoursUntilGolden < -1.5 || hoursUntilGolden > 4) return null;
  
  const isNow = hoursUntilGolden <= 0 && hoursUntilGolden > -1.5;
  const isSoon = hoursUntilGolden > 0 && hoursUntilGolden <= 1.5;

  return (
    <div className={`rounded-2xl border overflow-hidden mb-3 ${
      isNow 
        ? 'bg-amber-tint-bg15 border-amber-tint-border30' 
        : 'bg-bg-elevated border-border-subtle'
    }`}>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-base">{isNow ? '\u{1F305}' : '\u{1F307}'}</span>
            <div>
              <div className="text-xs font-bold text-text-primary">
                {isNow ? 'Golden Hour — NOW' : 'Golden Hour Coming'}
              </div>
              <div className="text-[10px] text-text-tertiary">
                {goldenHour.goldenStart} – {goldenHour.sunsetTime}
              </div>
            </div>
          </div>
          {isSoon && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-tint-bg10 text-accent-amber animate-pulse">
              {Math.round(hoursUntilGolden * 60)}min away
            </span>
          )}
        </div>

        {/* Suggested outdoor stops */}
        <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1.5">
          Best for golden hour
        </div>
        <div className="flex flex-col gap-1.5">
          {outdoorStops.slice(0, 3).map(stop => {
            const name = stop.place?.name || stop.event?.name || 'Stop';
            return (
              <div key={stop.id} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-bg-subtle border border-border-subtle">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs">{'\u{2728}'}</span>
                  <span className="text-xs font-medium text-text-primary truncate">{name}</span>
                </div>
                {onReorderSuggestion && (
                  <button
                    onClick={() => onReorderSuggestion(stop.id, goldenHour.goldenStart)}
                    className="text-[10px] font-semibold text-accent-amber bg-transparent border-none cursor-pointer shrink-0 ml-2"
                  >
                    Move here
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
