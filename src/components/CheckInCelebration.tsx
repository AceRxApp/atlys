import { useEffect, useState, useCallback } from 'react';

const COLORS = ['#E8940A', '#22C55E', '#3B82F6', '#EC4899', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4'];

interface Particle {
  id: number;
  color: string;
  tx: number;
  ty: number;
  delay: number;
  size: number;
  rotation: number;
}

interface Props {
  message: string;
  streak: number;
  onDone: () => void;
}

export default function CheckInCelebration({ message, streak, onDone }: Props) {
  const [particles] = useState<Particle[]>(() =>
    Array.from({ length: 28 }, (_, i) => ({
      id: i,
      color: COLORS[i % COLORS.length],
      tx: (Math.random() - 0.5) * 340,
      ty: -(Math.random() * 250 + 80),
      delay: Math.random() * 0.4,
      size: Math.random() * 6 + 4,
      rotation: Math.random() * 720,
    }))
  );

  const stableDone = useCallback(onDone, [onDone]);

  useEffect(() => {
    const timer = setTimeout(stableDone, 2500);
    return () => clearTimeout(timer);
  }, [stableDone]);

  return (
    <div className="fixed inset-0 z-[1001] pointer-events-none flex items-center justify-center">
      {/* Confetti particles */}
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute"
          style={{
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            borderRadius: p.id % 3 === 0 ? '50%' : '2px',
            '--confetti-x': `${p.tx}px`,
            '--confetti-y': `${p.ty}px`,
            '--confetti-r': `${p.rotation}deg`,
            animation: `confetti-burst 1.6s ease-out ${p.delay}s forwards`,
            opacity: 0,
          } as React.CSSProperties}
        />
      ))}

      {/* Celebration badge */}
      <div
        className="bg-bg-elevated/95 backdrop-blur-md rounded-2xl px-6 py-4 border border-green-tint-border text-center"
        style={{
          animation: 'celebration-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          boxShadow: '0 8px 32px rgba(34, 197, 94, 0.25)',
        }}
      >
        <div className="text-3xl mb-1">{streak >= 3 ? '\u{1F525}' : '\u{2705}'}</div>
        <div className="text-sm font-bold text-text-primary">{message}</div>
        {streak >= 2 && (
          <div className="text-xs text-accent-amber font-semibold mt-1">
            {streak} stop streak!
          </div>
        )}
      </div>
    </div>
  );
}
