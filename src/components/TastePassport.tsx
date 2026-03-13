import { useMemo } from 'react';

interface DishEntry {
  name: string;
  category: string;
  city: string;
  restaurant: string;
  spiceLevel: number;
  dietaryTags: string[];
  culturalNote: string;
  identifiedAt: string;
}

interface TastePassportProps {
  dishes: DishEntry[];
}

export default function TastePassport({ dishes }: TastePassportProps) {
  // Compute taste stats from dish history
  const stats = useMemo(() => {
    if (dishes.length === 0) return null;

    // Unique cuisines tried (based on category)
    const cuisines = new Set(dishes.map(d => d.category).filter(Boolean));
    
    // Cities where dishes were tried
    const cities = new Set(dishes.map(d => d.city).filter(Boolean));
    
    // Average spice tolerance (0-5)
    const avgSpice = dishes.reduce((sum, d) => sum + (d.spiceLevel || 0), 0) / dishes.length;
    
    // Top cuisine by count
    const cuisineCounts: Record<string, number> = {};
    dishes.forEach(d => {
      if (d.category) cuisineCounts[d.category] = (cuisineCounts[d.category] || 0) + 1;
    });
    const topCuisines = Object.entries(cuisineCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    // Dietary profile
    const tagCounts: Record<string, number> = {};
    dishes.forEach(d => d.dietaryTags?.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }));
    const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    
    // Adventurousness score: unique cuisines / total dishes (0-1)
    const adventurousness = Math.min(1, cuisines.size / Math.max(1, dishes.length) * 2);
    
    // Taste title based on profile
    let tasteTitle = 'Curious Foodie';
    if (avgSpice >= 3.5) tasteTitle = 'Spice Warrior';
    else if (cuisines.size >= 8) tasteTitle = 'Global Palate';
    else if (adventurousness > 0.7) tasteTitle = 'Adventurous Eater';
    else if (topTags.some(([tag]) => tag === 'vegetarian' || tag === 'vegan')) tasteTitle = 'Plant Explorer';
    else if (dishes.length >= 20) tasteTitle = 'Seasoned Foodie';
    
    return {
      totalDishes: dishes.length,
      cuisineCount: cuisines.size,
      cityCount: cities.size,
      avgSpice: Math.round(avgSpice * 10) / 10,
      topCuisines,
      topTags,
      adventurousness,
      tasteTitle,
    };
  }, [dishes]);

  if (!stats) {
    return (
      <div className="p-4 rounded-2xl bg-bg-subtle border border-border-subtle text-center">
        <div className="text-2xl mb-2">{'\u{1F374}'}</div>
        <div className="text-sm font-semibold text-text-primary mb-1">Your Taste Passport</div>
        <div className="text-xs text-text-tertiary">
          Use TasteLens to identify dishes and build your flavor profile across cities
        </div>
      </div>
    );
  }

  // Spice meter visual (5 dots)
  const spiceDots = Array.from({ length: 5 }, (_, i) => i < Math.round(stats.avgSpice));

  return (
    <div className="rounded-2xl bg-bg-elevated border border-border-subtle overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{'\u{1F374}'}</span>
            <span className="text-sm font-bold text-text-primary">Taste Passport</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-tint-bg10 text-accent-amber border border-amber-tint-border20">
            {stats.tasteTitle}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-px bg-border-subtle">
        {[
          { value: stats.totalDishes, label: 'Dishes' },
          { value: stats.cuisineCount, label: 'Cuisines' },
          { value: stats.cityCount, label: 'Cities' },
        ].map(stat => (
          <div key={stat.label} className="bg-bg-elevated text-center py-3">
            <div className="text-lg font-bold text-accent-amber">{stat.value}</div>
            <div className="text-[10px] text-text-tertiary uppercase tracking-wider">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Spice tolerance */}
      <div className="px-4 py-3 flex items-center justify-between border-t border-border-subtle">
        <span className="text-xs text-text-secondary">Spice Tolerance</span>
        <div className="flex gap-1">
          {spiceDots.map((active, i) => (
            <span key={i} className={`text-sm ${active ? '' : 'opacity-20'}`}>
              {'\u{1F336}\u{FE0F}'}
            </span>
          ))}
        </div>
      </div>

      {/* Top cuisines */}
      {stats.topCuisines.length > 0 && (
        <div className="px-4 pb-3">
          <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-2">Top Cuisines</div>
          <div className="flex flex-wrap gap-1.5">
            {stats.topCuisines.map(([cuisine, count]) => (
              <span key={cuisine} className="px-2.5 py-1 rounded-full bg-amber-tint-bg06 border border-amber-tint-border15 text-xs text-text-secondary">
                {cuisine} <span className="text-accent-amber font-semibold">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Adventurousness bar */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-text-tertiary uppercase tracking-wider">Adventurousness</span>
          <span className="text-xs font-semibold text-accent-amber">{Math.round(stats.adventurousness * 100)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-bg-subtle-strong overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${stats.adventurousness * 100}%`,
              background: 'linear-gradient(90deg, var(--accent-amber), var(--accent-amber-dark))',
            }}
          />
        </div>
      </div>
    </div>
  );
}
