import { useMemo } from 'react';

interface LocalRhythmProps {
  category: string;
  name: string;
  hours?: string[];
  compact?: boolean;
}

interface TimeHint {
  bestTime: string;
  reason: string;
  emoji: string;
  avoidTime?: string;
}

/**
 * Heuristic-based "best time to visit" hints.
 * Uses category + typical local patterns to suggest optimal visit times.
 * These are general travel wisdom, not live data.
 */
function getTimeHint(category: string, name: string, hours?: string[]): TimeHint | null {
  const cat = category.toLowerCase();
  const n = name.toLowerCase();

  // Restaurants
  if (/restaurant|bistro|diner|grill|steakhouse/i.test(cat)) {
    return {
      bestTime: '1:30 – 2:30 PM or after 8:30 PM',
      reason: 'Locals eat late — skip the tourist rush',
      emoji: '\u{1F559}',
      avoidTime: '12 – 1 PM, 6 – 7:30 PM',
    };
  }

  // Cafes & bakeries
  if (/cafe|coffee|bakery|tea house/i.test(cat)) {
    return {
      bestTime: '7:30 – 9 AM or 2 – 3 PM',
      reason: 'Fresh pastries early, quiet lull in the afternoon',
      emoji: '\u{2615}',
      avoidTime: '9:30 – 11 AM',
    };
  }

  // Bars & nightlife
  if (/bar|pub|brewery|wine bar|cocktail/i.test(cat)) {
    return {
      bestTime: '5 – 7 PM for happy hour',
      reason: 'Best deals and a local crowd before it gets packed',
      emoji: '\u{1F378}',
    };
  }

  if (/nightclub|club|lounge/i.test(cat)) {
    return {
      bestTime: '11 PM – 1 AM',
      reason: 'Locals show up late — arrive before midnight',
      emoji: '\u{1F3B6}',
      avoidTime: 'Before 10 PM (empty)',
    };
  }

  // Museums & galleries
  if (/museum|gallery|art center|exhibition/i.test(cat)) {
    return {
      bestTime: 'Weekday mornings or last 2 hours',
      reason: 'Smallest crowds, some offer discounted late entry',
      emoji: '\u{1F3DB}\u{FE0F}',
      avoidTime: 'Weekend afternoons, holidays',
    };
  }

  // Markets
  if (/market|bazaar|souk|flea market/i.test(cat)) {
    return {
      bestTime: 'Early morning (8 – 10 AM)',
      reason: 'Freshest produce, best selection, fewer crowds',
      emoji: '\u{1F6D2}',
      avoidTime: 'Midday heat',
    };
  }

  // Parks & nature
  if (/park|garden|botanical|nature|trail|hiking/i.test(cat)) {
    return {
      bestTime: 'Early morning or golden hour',
      reason: 'Best light for photos, cooler temperatures',
      emoji: '\u{1F333}',
      avoidTime: '11 AM – 3 PM (peak sun)',
    };
  }

  // Beaches
  if (/beach|waterfront|coast|seaside/i.test(cat)) {
    return {
      bestTime: 'Before 10 AM or after 4 PM',
      reason: 'Softer sun, fewer crowds, better for swimming',
      emoji: '\u{1F3D6}\u{FE0F}',
      avoidTime: '12 – 3 PM (peak UV)',
    };
  }

  // Viewpoints & landmarks
  if (/viewpoint|lookout|observation|tower|bridge|monument/i.test(cat)) {
    return {
      bestTime: 'Sunset or early morning',
      reason: 'Magical light and thinner crowds',
      emoji: '\u{1F305}',
    };
  }

  // Temples & religious sites
  if (/temple|church|mosque|shrine|cathedral|monastery/i.test(cat)) {
    return {
      bestTime: 'Early morning (avoid service times)',
      reason: 'Peaceful atmosphere, best for contemplation',
      emoji: '\u{26E9}\u{FE0F}',
      avoidTime: 'Service/prayer times',
    };
  }

  // Shopping
  if (/shopping|mall|store|boutique/i.test(cat)) {
    return {
      bestTime: 'Weekday mornings',
      reason: 'Full stock, attentive staff, no weekend rush',
      emoji: '\u{1F6CD}\u{FE0F}',
      avoidTime: 'Saturday afternoon',
    };
  }

  // Spa & wellness
  if (/spa|wellness|yoga|massage|onsen|hammam/i.test(cat)) {
    return {
      bestTime: 'Midweek, mid-morning',
      reason: 'Quietest sessions, easier to book',
      emoji: '\u{1F9D6}',
    };
  }

  return null;
}

export default function LocalRhythm({ category, name, hours, compact = true }: LocalRhythmProps) {
  const hint = useMemo(() => getTimeHint(category, name, hours), [category, name, hours]);

  if (!hint) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 mt-1">
        <span className="text-[10px]">{hint.emoji}</span>
        <span className="text-[10px] text-text-tertiary italic">
          Best: {hint.bestTime}
        </span>
      </div>
    );
  }

  return (
    <div className="mt-2 p-2.5 rounded-xl bg-bg-subtle border border-border-subtle">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xs">{hint.emoji}</span>
        <span className="text-[11px] font-semibold text-text-primary">Local Rhythm</span>
      </div>
      <div className="text-[11px] text-text-secondary mb-0.5">
        Best time: <span className="font-semibold text-accent-amber">{hint.bestTime}</span>
      </div>
      <div className="text-[10px] text-text-tertiary italic">{hint.reason}</div>
      {hint.avoidTime && (
        <div className="text-[10px] text-text-muted mt-0.5">
          Avoid: {hint.avoidTime}
        </div>
      )}
    </div>
  );
}
