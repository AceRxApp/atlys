import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { fetchCommunityRoutes, incrementRouteLikes } from '../supabase';
import { hapticImpact } from '../utils/haptics';

interface CommunityRoute {
  slug: string;
  city_slug: string;
  city_label: string;
  day_title: string | null;
  trip_days: Record<number, unknown[]>;
  view_count: number;
  likes_count: number;
  category: string | null;
  creator_name: string | null;
  created_at: string;
}

const CATEGORY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'date-night', label: 'Date Night' },
  { id: 'foodie', label: 'Foodie' },
  { id: '24hr', label: '24hr' },
  { id: 'nightlife', label: 'Nightlife' },
  { id: 'culture', label: 'Culture' },
  { id: 'adventure', label: 'Adventure' },
];

const CATEGORY_EMOJIS: Record<string, string> = {
  'date-night': '\u{1F496}',
  'foodie': '\u{1F37D}\u{FE0F}',
  '24hr': '\u{23F0}',
  'nightlife': '\u{1F319}',
  'culture': '\u{1F3DB}\u{FE0F}',
  'adventure': '\u{1F33F}',
};

function countStops(tripDays: Record<number, unknown[]>): number {
  return Object.values(tripDays).reduce((sum, stops) => sum + stops.length, 0);
}

export default function CommunityRoutesSection({ citySlug }: { citySlug: string }) {
  const { setScreen, setTripDays, showToast, setCitySlug } = useApp();

  const [routes, setRoutes] = useState<CommunityRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [likedSlugs, setLikedSlugs] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('nxstops_liked_routes');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchCommunityRoutes(citySlug, 20)
      .then(data => {
        if (!cancelled) setRoutes(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [citySlug]);

  const filteredRoutes = filter === 'all'
    ? routes
    : routes.filter(r => r.category === filter);

  const handleLike = (slug: string) => {
    hapticImpact('Light');
    setLikedSlugs(prev => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
        incrementRouteLikes(slug).catch(() => {});
      }
      try {
        localStorage.setItem('nxstops_liked_routes', JSON.stringify([...next]));
      } catch { /* storage full */ }
      return next;
    });
  };

  const handleUseRoute = (route: CommunityRoute) => {
    hapticImpact('Medium');
    // Copy trip_days into plan
    setTripDays(route.trip_days as Record<number, never[]>);
    if (route.city_slug && route.city_slug !== citySlug) {
      setCitySlug(route.city_slug);
    }
    setScreen('plan');
    showToast('Route copied to your plan!');
  };

  if (loading) {
    return (
      <div className="mt-6">
        <div className="text-base font-bold text-text-primary mb-3">Community Routes</div>
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-accent-amber border-t-transparent rounded-full animate-spin" />
          <span className="ml-2.5 text-xs text-text-tertiary">Loading routes...</span>
        </div>
      </div>
    );
  }

  if (routes.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="text-base font-bold text-text-primary mb-3">Community Routes</div>

      {/* Category filter chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-2.5 mb-3 scrollbar-hide">
        {CATEGORY_FILTERS.map(cat => (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.id)}
            className={`shrink-0 px-3 py-2 rounded-full text-xs font-medium border cursor-pointer min-h-[36px] ${
              filter === cat.id
                ? 'bg-accent-gradient text-text-on-accent border-accent-amber'
                : 'bg-bg-elevated text-text-secondary border-border-subtle'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Route cards — horizontal scroll */}
      {filteredRoutes.length === 0 ? (
        <p className="text-xs text-text-tertiary py-4">No routes in this category yet</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {filteredRoutes.map(route => {
            const stopCount = countStops(route.trip_days);
            const dayCount = Object.keys(route.trip_days).length;
            const isLiked = likedSlugs.has(route.slug);

            return (
              <div
                key={route.slug}
                className="card min-w-[200px] max-w-[220px] shrink-0 p-3 border border-border-subtle"
              >
                {/* Category chip */}
                {route.category && (
                  <div className="flex items-center gap-1 mb-2">
                    <span className="text-xs">{CATEGORY_EMOJIS[route.category] || '\u{1F4CD}'}</span>
                    <span className="text-[11px] text-accent-amber font-medium capitalize">
                      {route.category.replace('-', ' ')}
                    </span>
                  </div>
                )}

                {/* Title */}
                <div className="text-[13px] font-semibold text-text-primary mb-1 truncate">
                  {route.day_title || route.city_label || 'Untitled Route'}
                </div>

                {/* Meta */}
                <div className="text-[11px] text-text-tertiary mb-2">
                  {route.city_label} {'\u00B7'} {stopCount} stop{stopCount !== 1 ? 's' : ''} {'\u00B7'} {dayCount} day{dayCount !== 1 ? 's' : ''}
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-3 mb-3 text-[11px] text-text-muted">
                  <span>{'\u{1F441}'} {route.view_count || 0}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleLike(route.slug); }}
                    className={`bg-transparent border-none cursor-pointer p-0 text-[11px] ${isLiked ? 'text-status-red' : 'text-text-muted'}`}
                  >
                    {isLiked ? '\u{2764}\u{FE0F}' : '\u{1F90D}'} {(route.likes_count || 0) + (isLiked ? 1 : 0)}
                  </button>
                  {route.creator_name && (
                    <span className="ml-auto truncate">by {route.creator_name}</span>
                  )}
                </div>

                {/* Use Route button */}
                <button
                  onClick={() => handleUseRoute(route)}
                  className="w-full py-2.5 rounded-xl btn-primary text-xs font-semibold cursor-pointer"
                >
                  Use This Route
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
