import { useState, useEffect } from 'react';

interface PlanLoadingAnimationProps {
  cityName: string;
  vibe: string;
}

// Real backend phases with approximate timing (ms since start):
//   0-2000ms:  Finding spots nearby (Google Places parallel fetch ~2-5s)
//   2000-4500ms: Picking the best picks (server-side filtering ~0.5s, buffer)
//   4500ms+:   Crafting your itinerary (OpenAI/Gemini generating JSON ~3-10s)
//   When complete: done (handled by parent unmount)
interface Phase {
  label: (city: string, vibe: string) => string;
  icon: string;
  enterAt: number; // ms since start when this phase becomes active
}

const PHASES: Phase[] = [
  {
    label: (city) => `Scouting top spots in ${city}`,
    icon: '\u{1F50D}',
    enterAt: 0,
  },
  {
    label: (_city, vibe) => `Picking the best ${vibe.toLowerCase()} picks`,
    icon: '\u{2728}',
    enterAt: 2200,
  },
  {
    label: () => `Crafting your itinerary`,
    icon: '\u{1F4DD}',
    enterAt: 4500,
  },
];

// Rotating city facts / tips shown during the slowest phase (AI generation)
// Keeps the user engaged while the model is writing their plan
const CITY_TIPS = [
  'Good plans take seconds. Great ones take a few more.',
  'Matching stops to the best time of day...',
  'Weaving in neighborhood transitions...',
  'Checking opening hours for every stop...',
  'Almost there — finalizing your day.',
];

export default function PlanLoadingAnimation({ cityName, vibe }: PlanLoadingAnimationProps) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [tipIdx, setTipIdx] = useState(0);

  // Tick elapsed time every 100ms for smooth phase transitions
  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - start);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Rotate through tips during the slow AI phase
  useEffect(() => {
    if (elapsedMs < 4500) return;
    const interval = setInterval(() => {
      setTipIdx((prev) => (prev + 1) % CITY_TIPS.length);
    }, 2600);
    return () => clearInterval(interval);
  }, [elapsedMs >= 4500]);

  // Determine the current active phase based on elapsed time
  const currentPhaseIdx = PHASES.reduce(
    (acc, phase, idx) => (elapsedMs >= phase.enterAt ? idx : acc),
    0,
  );

  // Progress bar fills smoothly — slower in the final phase because AI is the bottleneck
  // 0-2.2s: 0% → 35%
  // 2.2-4.5s: 35% → 65%
  // 4.5s+: 65% → 95% (caps at 95% to avoid false "done" feel; parent unmounts on real done)
  const progressPercent =
    elapsedMs < 2200
      ? (elapsedMs / 2200) * 35
      : elapsedMs < 4500
        ? 35 + ((elapsedMs - 2200) / 2300) * 30
        : Math.min(95, 65 + ((elapsedMs - 4500) / 8000) * 30);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      {/* Header text */}
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-text-primary mb-1">
          Planning your day in {cityName}
        </h2>
        <p className="text-sm text-text-tertiary">
          {vibe} itinerary
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs mb-8">
        <div className="h-1.5 w-full rounded-full bg-bg-subtle-medium overflow-hidden">
          <div
            className="h-full rounded-full relative overflow-hidden"
            style={{
              width: `${progressPercent}%`,
              transition: 'width 300ms ease-out',
              background: 'linear-gradient(90deg, var(--accent-amber-dark), var(--accent-amber))',
            }}
          >
            {/* Shimmer overlay on the progress bar */}
            <div
              className="absolute inset-0 animate-shimmer"
              style={{
                background:
                  'linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.3) 50%, transparent 75%)',
                backgroundSize: '200% 100%',
              }}
            />
          </div>
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[11px] text-text-muted">
            {Math.round(progressPercent)}%
          </span>
          <span className="text-[11px] text-text-muted">
            {Math.floor(elapsedMs / 1000)}s
          </span>
        </div>
      </div>

      {/* Phase list */}
      <div className="w-full max-w-xs space-y-3">
        {PHASES.map((phase, index) => {
          const isCompleted = index < currentPhaseIdx;
          const isCurrent = index === currentPhaseIdx;
          const isFuture = index > currentPhaseIdx;

          return (
            <div
              key={index}
              className={`flex items-center gap-3 transition-all duration-500 ${
                isFuture ? 'opacity-30' : 'opacity-100'
              }`}
              style={{
                animation: index <= currentPhaseIdx ? `fadeInUp 0.4s ease-out ${index * 0.08}s both` : 'none',
              }}
            >
              {/* Status indicator */}
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0">
                {isCompleted ? (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, var(--accent-amber), var(--accent-amber-dark))',
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#0C0A09"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                ) : isCurrent ? (
                  <div className="relative w-7 h-7 flex items-center justify-center">
                    {/* Pulsing ring */}
                    <div
                      className="absolute inset-0 rounded-full opacity-30"
                      style={{
                        background: 'var(--accent-amber)',
                        animation: 'pulse 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                      }}
                    />
                    {/* Solid dot */}
                    <div
                      className="w-3.5 h-3.5 rounded-full relative z-10"
                      style={{ background: 'var(--accent-amber)' }}
                    />
                  </div>
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full bg-bg-subtle-strong mx-auto" />
                )}
              </div>

              {/* Icon and label */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base shrink-0">{phase.icon}</span>
                <span
                  className={`text-sm leading-snug ${
                    isCompleted
                      ? 'text-text-secondary'
                      : isCurrent
                        ? 'text-text-primary font-semibold'
                        : 'text-text-disabled'
                  }`}
                >
                  {phase.label(cityName, vibe)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rotating tip during the slow AI phase — so the user sees activity */}
      {elapsedMs >= 4500 && (
        <div className="mt-8 max-w-xs text-center">
          <p
            className="text-xs text-text-tertiary italic transition-opacity duration-500"
            key={tipIdx}
            style={{ animation: 'fadeInUp 0.5s ease-out' }}
          >
            {CITY_TIPS[tipIdx]}
          </p>
        </div>
      )}

      {/* Bottom shimmer decoration */}
      <div className="mt-6 w-full max-w-xs">
        <div
          className="h-px w-full animate-shimmer rounded-full"
          style={{
            background:
              'linear-gradient(90deg, var(--border-subtle) 25%, var(--accent-amber) 50%, var(--border-subtle) 75%)',
            backgroundSize: '200% 100%',
          }}
        />
      </div>

      {/* Inline keyframes for the pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
