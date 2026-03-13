import { useState, useEffect } from 'react';

interface PlanLoadingAnimationProps {
  cityName: string;
  vibe: string;
}

const STEPS = [
  { label: 'Scanning top-rated spots...', icon: '\u{1F4CD}' },
  { label: 'Checking what\u2019s open now...', icon: '\u{1F552}' },
  { label: 'Weaving in local events...', icon: '\u{1F3AB}' },
  { label: 'Optimizing your route...', icon: '\u{1F5FA}\u{FE0F}' },
  { label: 'Adding hidden gems...', icon: '\u{1F48E}' },
  { label: 'Finalizing your perfect day...', icon: '\u{2728}' },
];

const STEP_INTERVAL_MS = 2500;

export default function PlanLoadingAnimation({ cityName, vibe }: PlanLoadingAnimationProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (currentStep >= STEPS.length - 1) return;

    const timer = setTimeout(() => {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }, STEP_INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [currentStep]);

  const progressPercent = ((currentStep + 1) / STEPS.length) * 100;

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
            className="h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden"
            style={{
              width: `${progressPercent}%`,
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
            Step {currentStep + 1} of {STEPS.length}
          </span>
          <span className="text-[11px] text-text-muted">
            {Math.round(progressPercent)}%
          </span>
        </div>
      </div>

      {/* Step list */}
      <div className="w-full max-w-xs space-y-3">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isFuture = index > currentStep;

          return (
            <div
              key={index}
              className={`flex items-center gap-3 transition-all duration-500 ${
                isFuture ? 'opacity-30' : 'opacity-100'
              }`}
              style={{
                animation: index <= currentStep ? `fadeInUp 0.4s ease-out ${index * 0.08}s both` : 'none',
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
                <span className="text-base shrink-0">{step.icon}</span>
                <span
                  className={`text-sm leading-snug ${
                    isCompleted
                      ? 'text-text-secondary'
                      : isCurrent
                        ? 'text-text-primary font-semibold'
                        : 'text-text-disabled'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom shimmer decoration */}
      <div className="mt-10 w-full max-w-xs">
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
