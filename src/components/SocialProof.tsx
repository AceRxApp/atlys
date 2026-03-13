import { useState, useEffect } from 'react';

const TESTIMONIALS = [
  { name: 'Sarah M.', city: 'Tokyo', text: 'Found the best ramen spot I never would have discovered on my own', avatar: 'S' },
  { name: 'James L.', city: 'Paris', text: 'The AI planned a perfect day — every stop was walkable and amazing', avatar: 'J' },
  { name: 'Priya K.', city: 'Barcelona', text: 'Saved hours of research. Just picked a vibe and went!', avatar: 'P' },
  { name: 'Marco R.', city: 'New York', text: 'Better than any guidebook. It knew exactly what was open and nearby', avatar: 'M' },
  { name: 'Aisha T.', city: 'Dubai', text: 'The food recommendations were spot-on every single time', avatar: 'A' },
];

export default function SocialProof() {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIdx(prev => (prev + 1) % TESTIMONIALS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const t = TESTIMONIALS[activeIdx];

  return (
    <div className="mb-5">
      {/* Stats bar */}
      <div className="flex items-center justify-center gap-4 mb-3">
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-2">
            {['S', 'J', 'P', 'M', 'A'].map((letter, i) => (
              <div key={i}
                className="w-6 h-6 rounded-full border-2 border-bg-surface flex items-center justify-center text-[10px] font-bold text-white"
                style={{ background: `hsl(${30 + i * 25}, 70%, ${45 + i * 5}%)`, zIndex: 5 - i }}
              >
                {letter}
              </div>
            ))}
          </div>
          <span className="text-xs text-text-secondary font-medium">2,400+ trips planned</span>
        </div>
        <div className="w-px h-4 bg-border-subtle" />
        <div className="flex items-center gap-1">
          <span className="text-accent-amber text-xs">{'\u2605\u2605\u2605\u2605\u2605'}</span>
          <span className="text-xs text-text-secondary font-medium">4.8</span>
        </div>
      </div>

      {/* Rotating testimonial */}
      <div className="relative overflow-hidden h-[72px]">
        <div
          className="absolute inset-0 flex items-center transition-opacity duration-500"
          key={activeIdx}
        >
          <div className="w-full px-4 py-3 rounded-xl border border-border-subtle bg-bg-elevated">
            <div className="flex items-start gap-2.5">
              <div
                className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
                style={{ background: `hsl(${30 + activeIdx * 25}, 70%, 45%)` }}
              >
                {t.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-text-primary leading-snug">&ldquo;{t.text}&rdquo;</p>
                <p className="text-[11px] text-text-tertiary mt-0.5">{t.name} — {t.city}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dots indicator */}
      <div className="flex justify-center gap-1 mt-2">
        {TESTIMONIALS.map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
              i === activeIdx ? 'bg-accent-amber' : 'bg-border-subtle'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
