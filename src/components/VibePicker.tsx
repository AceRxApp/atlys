import { useState } from 'react';

interface VibePickerProps {
  onPickVibe: (vibe: string) => void;
  loading?: boolean;
  cityName?: string;
  onManual?: () => void;
  compact?: boolean;
}

interface Vibe {
  id: string;
  emoji: string;
  label: string;
  tagline: string;
  gradient: string;
}

// Retired the old mood grid (Greatest Hits, Indulge, After Dark, Escape,
// Luxe, Under the Radar) for modes that answer "what would it feel like to
// experience this city," not "what mood are you in." Each still runs on an
// already-rebalanced backend vibe internally.
// A fourth mode, I'm Moving Here, runs on the new `movinghere` backend vibe —
// the only one of the four whose vibe key did not already exist. Its day is a
// normal local day: food belongs in it, but it must not read as a food tour.
const VIBES: Vibe[] = [
  { id: 'wander', emoji: '\u{1F6B6}', label: 'Discover This City', tagline: 'Neighborhoods, streets & local life', gradient: 'from-slate-700/40 to-slate-900/20' },
  { id: 'starthare', emoji: '\u{1F5FA}\u{FE0F}', label: 'A Weekend Here', tagline: 'A well-rounded day of highlights', gradient: 'from-sky-900/40 to-indigo-900/20' },
  { id: 'undertheradar', emoji: '\u{1F4CD}', label: 'Interesting Neighborhoods', tagline: 'Hidden gems & local favorites', gradient: 'from-emerald-900/40 to-teal-900/20' },
  { id: 'movinghere', emoji: '\u{1F511}', label: 'I’m Moving Here', tagline: 'A normal day as a local', gradient: 'from-cyan-900/40 to-slate-900/20' },
];

export default function VibePicker({ onPickVibe, loading = false, cityName, onManual, compact = false }: VibePickerProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const handleToggle = (vibeId: string) => {
    if (loading) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(vibeId)) {
        next.delete(vibeId);
      } else {
        if (next.size >= 2) {
          // Max 2 vibes — remove the oldest one
          const first = next.values().next().value;
          if (first) next.delete(first);
        }
        next.add(vibeId);
      }
      return next;
    });
  };

  const handleGo = () => {
    if (loading || selected.size === 0) return;
    // Send as comma-separated if multiple, single string if one
    const vibeStr = Array.from(selected).join(',');
    onPickVibe(vibeStr);
  };

  // Compact mode: smaller cards in a horizontal scroll or tight grid
  if (compact) {
    return (
      <div className="w-full px-3 py-4">
        <p className="text-[13px] text-text-secondary text-center mb-3">
          Pick a vibe for this day
        </p>
        <div className="grid grid-cols-2 gap-2">
          {VIBES.map((vibe) => {
            const isSelected = selected.has(vibe.id);
            return (
              <button
                key={vibe.id}
                type="button"
                onClick={() => handleToggle(vibe.id)}
                disabled={loading}
                className={`
                  relative rounded-xl border text-center py-3 px-2
                  transition-all duration-200 ease-out cursor-pointer
                  active:scale-[0.97]
                  ${isSelected ? 'border-accent-amber' : 'border-border-subtle'}
                  ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                style={{ background: 'var(--bg-elevated)' }}
              >
                <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${vibe.gradient} pointer-events-none`} />
                <div className="relative z-10">
                  <span className="text-[22px] leading-none">{vibe.emoji}</span>
                  <span className="block text-[11px] font-semibold text-text-primary mt-1">{vibe.label}</span>
                </div>
                {isSelected && (
                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center z-10"
                    style={{ background: 'var(--accent-amber)' }}>
                    <span className="text-[10px] font-bold" style={{ color: 'var(--text-on-accent)' }}>{'\u2713'}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        {selected.size > 0 && (
          <button
            type="button"
            onClick={handleGo}
            disabled={loading}
            className="mt-3 w-full py-2.5 rounded-xl font-semibold text-[14px] cursor-pointer border-none transition-all duration-200"
            style={{ background: 'var(--accent-amber)', color: 'var(--text-on-accent)' }}
          >
            {loading ? 'Building your day...' : `Plan my ${selected.size > 1 ? 'blended ' : ''}day`}
          </button>
        )}
      </div>
    );
  }

  // Full mode
  return (
    <div className="w-full max-w-[430px] mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-[22px] font-bold text-text-primary mb-1.5">
          How do you want to explore?
        </h2>
        <p className="text-[12px] text-text-tertiary">
          Pick up to 2 to blend
        </p>
        {cityName && (
          <p className="text-sm text-text-secondary mt-1">
            {cityName} has something for everyone
          </p>
        )}
      </div>

      {/* Vibe grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {VIBES.map((vibe) => {
          const isSelected = selected.has(vibe.id);
          const isLoadingThis = loading && isSelected;

          return (
            <button
              key={vibe.id}
              type="button"
              onClick={() => handleToggle(vibe.id)}
              disabled={loading}
              className={`
                relative min-h-[112px] rounded-2xl border text-left p-3
                flex flex-col justify-between
                transition-all duration-200 ease-out
                cursor-pointer
                active:scale-[0.97]
                ${isLoadingThis
                  ? 'border-accent-amber animate-pulse'
                  : isSelected
                    ? 'border-accent-amber'
                    : 'border-border-subtle'
                }
                ${loading && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              style={{
                background: 'var(--bg-elevated)',
              }}
            >
              {/* Gradient overlay */}
              <div
                className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${vibe.gradient} pointer-events-none`}
              />

              {/* Content */}
              <div className="relative z-10 flex flex-col gap-1">
                <span className="text-[22px] leading-none">{vibe.emoji}</span>
                <span className="text-[13px] font-semibold text-text-primary leading-tight">
                  {vibe.label}
                </span>
                <span className="text-[11px] text-text-tertiary leading-snug">
                  {vibe.tagline}
                </span>
              </div>

              {/* Check badge for selected */}
              {isSelected && !isLoadingThis && (
                <div className="absolute top-3 right-3 z-10 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--accent-amber)' }}>
                  <span className="text-[12px] font-bold" style={{ color: 'var(--text-on-accent)' }}>{'\u2713'}</span>
                </div>
              )}

              {/* Loading spinner for selected card */}
              {isLoadingThis && (
                <div className="absolute top-3 right-3 z-10">
                  <div
                    className="w-5 h-5 rounded-full border-2 border-transparent"
                    style={{
                      borderTopColor: 'var(--accent-amber)',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Go button */}
      {selected.size > 0 && !loading && (
        <div className="mt-5">
          <button
            type="button"
            onClick={handleGo}
            className="w-full py-3.5 rounded-2xl font-bold text-[16px] cursor-pointer border-none transition-all duration-200 active:scale-[0.98]"
            style={{ background: 'var(--accent-amber)', color: 'var(--text-on-accent)' }}
          >
            {selected.size === 1
              ? `Plan my ${VIBES.find(v => v.id === Array.from(selected)[0])?.label || ''} day`
              : `Blend ${Array.from(selected).map(id => VIBES.find(v => v.id === id)?.emoji || '').join(' + ')}`
            }
          </button>
        </div>
      )}

      {/* Manual link */}
      {onManual && (
        <div className="text-center mt-6">
          <button
            type="button"
            onClick={onManual}
            disabled={loading}
            className="text-[13px] text-text-tertiary hover:text-accent-amber transition-colors bg-transparent border-none cursor-pointer"
          >
            or add places manually &rarr;
          </button>
        </div>
      )}

      {/* Inline keyframes for the spinner */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
