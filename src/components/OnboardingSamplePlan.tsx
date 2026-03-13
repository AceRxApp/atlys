import { useState, useEffect } from 'react';

interface OnboardingSamplePlanProps {
  onGetStarted: () => void;
}

interface SampleStop {
  id: number;
  name: string;
  description: string;
  timeSlot: string;
  category: string;
  categoryLabel: string;
  rating: number;
  gradientFrom: string;
  gradientTo: string;
  walkMinutes: number | null; // walking time TO next stop, null for last
}

const SAMPLE_STOPS: SampleStop[] = [
  {
    id: 1,
    name: 'Caf\u00e9 de Flore',
    description: 'Iconic Parisian caf\u00e9',
    timeSlot: 'Morning Coffee',
    category: 'cafe',
    categoryLabel: 'Caf\u00e9',
    rating: 4.6,
    gradientFrom: '#78350F',
    gradientTo: '#451A03',
    walkMinutes: 12,
  },
  {
    id: 2,
    name: "Mus\u00e9e d'Orsay",
    description: 'Impressionist masterpieces',
    timeSlot: 'Late Morning',
    category: 'museum',
    categoryLabel: 'Museum',
    rating: 4.8,
    gradientFrom: '#1E3A5F',
    gradientTo: '#0C1929',
    walkMinutes: 18,
  },
  {
    id: 3,
    name: 'Le Comptoir du Panth\u00e9on',
    description: 'Classic French bistro',
    timeSlot: 'Lunch',
    category: 'restaurant',
    categoryLabel: 'Restaurant',
    rating: 4.5,
    gradientFrom: '#4A1942',
    gradientTo: '#1A0A18',
    walkMinutes: 25,
  },
  {
    id: 4,
    name: 'Sacr\u00e9-C\u0153ur Basilica',
    description: 'Stunning views of Paris',
    timeSlot: 'Afternoon',
    category: 'tourist_attraction',
    categoryLabel: 'Attraction',
    rating: 4.7,
    gradientFrom: '#1C4532',
    gradientTo: '#0B1F17',
    walkMinutes: null,
  },
];

const CATEGORY_ICONS: Record<string, string> = {
  cafe: '\u2615',
  museum: '\uD83C\uDFDB\uFE0F',
  restaurant: '\uD83C\uDF7D\uFE0F',
  tourist_attraction: '\u26EA',
};

export default function OnboardingSamplePlan({ onGetStarted }: OnboardingSamplePlanProps) {
  const [visibleStops, setVisibleStops] = useState<number[]>([]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    SAMPLE_STOPS.forEach((stop, index) => {
      const timer = setTimeout(() => {
        setVisibleStops(prev => [...prev, stop.id]);
      }, (index + 1) * 600);
      timers.push(timer);
    });

    return () => {
      timers.forEach(t => clearTimeout(t));
    };
  }, []);

  return (
    <div className="w-full max-w-[440px] mx-auto px-4 py-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-tint-bg15 mb-3">
          <span className="text-xs font-semibold text-accent-amber">AI-Generated Sample</span>
        </div>
        <h2 className="text-xl font-bold text-text-primary mb-1">
          A Day in Paris, France
        </h2>
        <p className="text-sm text-text-secondary">
          4 stops \u00B7 curated by NxStops AI
        </p>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical route line */}
        <div
          className="absolute left-[19px] top-[28px] w-[2px] bg-border-subtle"
          style={{
            height: 'calc(100% - 56px)',
            background: 'linear-gradient(to bottom, var(--accent-amber), var(--border-subtle) 80%, transparent)',
          }}
        />

        {/* Stop cards */}
        <div className="flex flex-col gap-0">
          {SAMPLE_STOPS.map((stop, index) => {
            const isVisible = visibleStops.includes(stop.id);

            return (
              <div key={stop.id}>
                {/* Stop card row */}
                <div
                  className="flex gap-3 items-start transition-all duration-500 ease-out"
                  style={{
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
                  }}
                >
                  {/* Timeline node */}
                  <div className="relative z-10 shrink-0 w-[40px] flex flex-col items-center pt-1">
                    <div
                      className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-sm font-bold border-2"
                      style={{
                        background: 'var(--bg-surface)',
                        borderColor: 'var(--accent-amber)',
                        color: 'var(--accent-amber)',
                      }}
                    >
                      {stop.id}
                    </div>
                  </div>

                  {/* Card */}
                  <div className="flex-1 rounded-2xl bg-bg-elevated border border-border-subtle overflow-hidden mb-2">
                    {/* Placeholder image with gradient */}
                    <div
                      className="h-[90px] w-full relative overflow-hidden"
                      style={{
                        background: `linear-gradient(135deg, ${stop.gradientFrom} 0%, ${stop.gradientTo} 100%)`,
                      }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl opacity-40">{CATEGORY_ICONS[stop.category] || '\uD83D\uDCCD'}</span>
                      </div>
                      {/* Time slot badge */}
                      <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[rgba(0,0,0,0.45)] text-white backdrop-blur-[6px]">
                        {stop.timeSlot}
                      </div>
                    </div>

                    {/* Card content */}
                    <div className="px-3.5 py-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-[15px] font-semibold text-text-primary leading-tight m-0">
                          {stop.name}
                        </h3>
                        <span className="inline-flex items-center gap-1 text-[13px] shrink-0">
                          <span className="text-accent-amber">{'\u2605'}</span>
                          <span className="text-text-primary font-semibold">{stop.rating.toFixed(1)}</span>
                        </span>
                      </div>
                      <p className="text-[13px] text-text-secondary m-0 mb-1.5">
                        {stop.description}
                      </p>
                      <span className="inline-block px-2 py-[3px] bg-amber-tint-bg15 text-accent-amber rounded-[6px] text-xs font-medium">
                        {stop.categoryLabel}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Walking time between stops */}
                {stop.walkMinutes !== null && (
                  <div
                    className="flex items-center gap-2 ml-[19px] pl-[22px] py-1.5 transition-all duration-500 ease-out"
                    style={{
                      opacity: isVisible ? 0.7 : 0,
                      transform: isVisible ? 'translateY(0)' : 'translateY(8px)',
                      transitionDelay: '200ms',
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--text-tertiary)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M13 4v3l-3 4 3 4v5" />
                      <circle cx="12" cy="2" r="1.5" fill="var(--text-tertiary)" stroke="none" />
                      <path d="M9 11l-2 7" />
                      <path d="M15 11l2 7" />
                    </svg>
                    <span className="text-[12px] text-text-tertiary font-medium">
                      {stop.walkMinutes} min walk
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA Section */}
      <div className="mt-6 text-center">
        <button
          onClick={onGetStarted}
          className="w-full py-3.5 px-6 rounded-[14px] border-none bg-accent-gradient text-text-on-accent text-[15px] font-semibold cursor-pointer shadow-[0_4px_20px_var(--amber-tint-shadow)] active:scale-[0.98] transition-transform"
        >
          Create your own plan {'\u2014'} it's free
        </button>
        <p className="text-[12px] text-text-tertiary mt-2.5 mb-0">
          No account needed for your first plan
        </p>
      </div>
    </div>
  );
}
