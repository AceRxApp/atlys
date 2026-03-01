import { useState, useCallback } from 'react';

interface HintItem {
  emoji: string;
  title: string;
  description: string;
}

interface Props {
  /** Unique key for localStorage persistence */
  storageKey: string;
  /** Screen/tab title shown at top */
  title: string;
  /** Subtitle text */
  subtitle: string;
  /** List of feature hints to display */
  hints: HintItem[];
}

/**
 * Contextual first-visit hint card.
 * Shows once per screen, dismissible, persisted to localStorage.
 */
export default function ContextHint({ storageKey, title, subtitle, hints }: Props) {
  const key = `nxstops_hint_${storageKey}`;
  const [visible, setVisible] = useState(() => !localStorage.getItem(key));

  const dismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(key, '1');
  }, [key]);

  if (!visible) return null;

  return (
    <div className="card p-4 mb-4 border border-amber-tint-border20 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, var(--amber-tint-bg10), var(--bg-subtle))' }}>
      <button onClick={dismiss}
        className="absolute top-3 right-3 text-text-tertiary bg-transparent border-none cursor-pointer text-xs p-1">
        {'\u2715'}
      </button>

      <div className="text-[11px] text-accent-amber uppercase tracking-wider font-bold mb-1.5">{title}</div>
      <p className="text-[13px] text-text-body leading-relaxed m-0 mb-3">{subtitle}</p>

      <div className="space-y-2.5">
        {hints.map((hint, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-tint-bg15 border border-amber-tint-border20 flex items-center justify-center shrink-0">
              <span className="text-sm">{hint.emoji}</span>
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-text-primary leading-tight">{hint.title}</div>
              <div className="text-xs text-text-tertiary leading-relaxed mt-0.5">{hint.description}</div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={dismiss}
        className="w-full mt-3 py-2 rounded-xl bg-accent-gradient text-text-on-accent text-[13px] font-semibold border-none cursor-pointer">
        Got it
      </button>
    </div>
  );
}
