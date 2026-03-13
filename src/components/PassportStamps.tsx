import { useMemo } from 'react';

interface TripHistoryEntry {
  city: string;
  totalStops: number;
  dayCount: number;
  categoryBreakdown: Record<string, number>;
  moments?: { photos: string[] }[];
  stops: { name: string; category?: string }[];
}

interface StopCheckIn {
  checkedInAt: string;
}

interface Stamp {
  id: string;
  emoji: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress: number;
  requirement: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

const RARITY_STYLES: Record<string, { bg: string; border: string; glow: string }> = {
  common: { bg: 'rgba(232,148,10,0.06)', border: 'rgba(232,148,10,0.15)', glow: 'none' },
  rare: { bg: 'rgba(72,120,192,0.08)', border: 'rgba(72,120,192,0.20)', glow: 'none' },
  epic: { bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.20)', glow: '0 0 8px rgba(168,85,247,0.15)' },
  legendary: { bg: 'rgba(232,148,10,0.12)', border: 'rgba(232,148,10,0.30)', glow: '0 0 12px rgba(232,148,10,0.25)' },
};

const RARITY_LABELS: Record<string, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

function computeStamps(
  tripHistory: TripHistoryEntry[],
  checkIns: Record<string, StopCheckIn>,
  totalDishes: number,
): Stamp[] {
  // Aggregate stats across all trips
  const allCities = new Set(tripHistory.map(t => t.city));
  const totalStops = tripHistory.reduce((sum, t) => sum + t.totalStops, 0);
  const totalDays = tripHistory.reduce((sum, t) => sum + t.dayCount, 0);
  const totalPhotos = tripHistory.reduce((sum, t) =>
    sum + (t.moments?.reduce((ps, m) => ps + m.photos.length, 0) || 0), 0);

  // Category aggregation
  const allCats: Record<string, number> = {};
  tripHistory.forEach(t => {
    Object.entries(t.categoryBreakdown).forEach(([cat, count]) => {
      allCats[cat] = (allCats[cat] || 0) + count;
    });
  });

  const foodCount = (allCats['restaurant'] || 0) + (allCats['cafe'] || 0) + (allCats['bakery'] || 0);
  const nightCount = (allCats['bar'] || 0) + (allCats['nightclub'] || 0);
  const cultureCount = (allCats['museum'] || 0) + (allCats['gallery'] || 0) + (allCats['temple'] || 0);
  const outdoorCount = (allCats['park'] || 0) + (allCats['beach'] || 0) + (allCats['hiking'] || 0);

  // Check-in times analysis
  const checkInTimes = Object.values(checkIns).map(c => new Date(c.checkedInAt).getHours());
  const nightCheckIns = checkInTimes.filter(h => h >= 21 || h < 4).length;
  const earlyCheckIns = checkInTimes.filter(h => h >= 5 && h < 8).length;

  const stamps: Stamp[] = [
    // City-based stamps
    {
      id: 'first-city',
      emoji: '\u{1F30D}',
      title: 'First Steps',
      description: 'Plan your first trip',
      unlocked: allCities.size >= 1,
      progress: Math.min(allCities.size, 1),
      requirement: 1,
      rarity: 'common',
    },
    {
      id: 'globetrotter',
      emoji: '\u{2708}\u{FE0F}',
      title: 'Globetrotter',
      description: 'Explore 5 different cities',
      unlocked: allCities.size >= 5,
      progress: Math.min(allCities.size, 5),
      requirement: 5,
      rarity: 'rare',
    },
    {
      id: 'world-traveler',
      emoji: '\u{1F30F}',
      title: 'World Traveler',
      description: 'Explore 10 different cities',
      unlocked: allCities.size >= 10,
      progress: Math.min(allCities.size, 10),
      requirement: 10,
      rarity: 'epic',
    },

    // Stop-based stamps
    {
      id: 'explorer',
      emoji: '\u{1F9ED}',
      title: 'Explorer',
      description: 'Visit 10 stops total',
      unlocked: totalStops >= 10,
      progress: Math.min(totalStops, 10),
      requirement: 10,
      rarity: 'common',
    },
    {
      id: 'trailblazer',
      emoji: '\u{1F525}',
      title: 'Trailblazer',
      description: 'Visit 50 stops total',
      unlocked: totalStops >= 50,
      progress: Math.min(totalStops, 50),
      requirement: 50,
      rarity: 'rare',
    },
    {
      id: 'legend',
      emoji: '\u{1F451}',
      title: 'Legend',
      description: 'Visit 100 stops total',
      unlocked: totalStops >= 100,
      progress: Math.min(totalStops, 100),
      requirement: 100,
      rarity: 'legendary',
    },

    // Food stamps
    {
      id: 'foodie',
      emoji: '\u{1F37D}\u{FE0F}',
      title: 'Foodie',
      description: 'Visit 10 restaurants or cafes',
      unlocked: foodCount >= 10,
      progress: Math.min(foodCount, 10),
      requirement: 10,
      rarity: 'common',
    },
    {
      id: 'taste-master',
      emoji: '\u{1F374}',
      title: 'Taste Master',
      description: 'Identify 15 dishes with TasteLens',
      unlocked: totalDishes >= 15,
      progress: Math.min(totalDishes, 15),
      requirement: 15,
      rarity: 'rare',
    },

    // Culture stamps
    {
      id: 'culture-vulture',
      emoji: '\u{1F3AD}',
      title: 'Culture Vulture',
      description: 'Visit 5 museums or galleries',
      unlocked: cultureCount >= 5,
      progress: Math.min(cultureCount, 5),
      requirement: 5,
      rarity: 'common',
    },

    // Nightlife stamps
    {
      id: 'night-owl',
      emoji: '\u{1F989}',
      title: 'Night Owl',
      description: 'Check in to 3 stops after 9 PM',
      unlocked: nightCheckIns >= 3,
      progress: Math.min(nightCheckIns, 3),
      requirement: 3,
      rarity: 'rare',
    },

    // Early bird
    {
      id: 'early-bird',
      emoji: '\u{1F305}',
      title: 'Early Bird',
      description: 'Check in to 3 stops before 8 AM',
      unlocked: earlyCheckIns >= 3,
      progress: Math.min(earlyCheckIns, 3),
      requirement: 3,
      rarity: 'rare',
    },

    // Outdoor stamps
    {
      id: 'nature-lover',
      emoji: '\u{1F3DE}\u{FE0F}',
      title: 'Nature Lover',
      description: 'Visit 5 parks or outdoor spots',
      unlocked: outdoorCount >= 5,
      progress: Math.min(outdoorCount, 5),
      requirement: 5,
      rarity: 'common',
    },

    // Photography
    {
      id: 'shutterbug',
      emoji: '\u{1F4F8}',
      title: 'Shutterbug',
      description: 'Take 10 trip photos',
      unlocked: totalPhotos >= 10,
      progress: Math.min(totalPhotos, 10),
      requirement: 10,
      rarity: 'common',
    },

    // Marathon
    {
      id: 'marathon',
      emoji: '\u{1F3C3}',
      title: 'Marathon Traveler',
      description: 'Plan a trip of 7+ days',
      unlocked: totalDays >= 7,
      progress: Math.min(totalDays, 7),
      requirement: 7,
      rarity: 'epic',
    },

    // Nightlife king
    {
      id: 'nightlife-king',
      emoji: '\u{1F378}',
      title: 'Nightlife King',
      description: 'Visit 5 bars or clubs',
      unlocked: nightCount >= 5,
      progress: Math.min(nightCount, 5),
      requirement: 5,
      rarity: 'rare',
    },
  ];

  return stamps;
}

interface PassportStampsProps {
  tripHistory: TripHistoryEntry[];
  checkIns: Record<string, StopCheckIn>;
  totalDishes: number;
  expanded?: boolean;
}

export default function PassportStamps({ tripHistory, checkIns, totalDishes, expanded = false }: PassportStampsProps) {
  const stamps = useMemo(() => computeStamps(tripHistory, checkIns, totalDishes), [tripHistory, checkIns, totalDishes]);

  const unlockedCount = stamps.filter(s => s.unlocked).length;
  const displayStamps = expanded ? stamps : stamps.slice(0, 9);

  return (
    <div className="rounded-2xl bg-bg-elevated border border-border-subtle overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{'\u{1F4D8}'}</span>
          <span className="text-sm font-bold text-text-primary">Passport Stamps</span>
        </div>
        <span className="text-xs text-text-tertiary">
          {unlockedCount}/{stamps.length} collected
        </span>
      </div>

      {/* Progress bar */}
      <div className="mx-4 mb-3 h-1.5 rounded-full bg-bg-subtle-strong overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${(unlockedCount / stamps.length) * 100}%`,
            background: 'linear-gradient(90deg, var(--accent-amber), var(--accent-amber-dark))',
          }}
        />
      </div>

      {/* Stamps grid */}
      <div className="grid grid-cols-3 gap-2 px-4 pb-4">
        {displayStamps.map(stamp => {
          const style = RARITY_STYLES[stamp.rarity];
          return (
            <div
              key={stamp.id}
              className={`relative text-center p-3 rounded-xl transition-all ${
                stamp.unlocked ? '' : 'opacity-40 grayscale'
              }`}
              style={{
                background: style.bg,
                border: `1px solid ${style.border}`,
                boxShadow: stamp.unlocked ? style.glow : 'none',
              }}
            >
              <div className="text-2xl mb-1">{stamp.unlocked ? stamp.emoji : '\u{1F512}'}</div>
              <div className="text-[10px] font-semibold text-text-primary truncate">{stamp.title}</div>
              {stamp.unlocked ? (
                <div className="text-[9px] mt-0.5 font-semibold" style={{ color: stamp.rarity === 'legendary' ? '#E8940A' : stamp.rarity === 'epic' ? '#A855F7' : stamp.rarity === 'rare' ? '#4878C0' : 'var(--text-tertiary)' }}>
                  {RARITY_LABELS[stamp.rarity]}
                </div>
              ) : (
                <div className="text-[9px] text-text-muted mt-0.5">
                  {stamp.progress}/{stamp.requirement}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
