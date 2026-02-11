import { useTheme } from '../context/ThemeContext';
import { getCardStyle } from '../styles/shared';

export const PriceDots = ({ level }: { level: number }) => {
  const { theme } = useTheme();
  if (level < 0) return null;
  return (
    <span style={{ color: theme.text.tertiary, fontSize: '12px', letterSpacing: '1px' }}>
      {Array.from({ length: 4 }, (_, i) => (
        <span key={i} style={{ color: i < level ? theme.accent.amber : theme.text.disabled }}>$</span>
      ))}
    </span>
  );
};

export const StarRating = ({ rating, count }: { rating: number; count: number }) => {
  const { theme } = useTheme();
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
      <span style={{ color: theme.accent.amber }}>★</span>
      <span style={{ color: theme.text.primary, fontWeight: 600 }}>{rating.toFixed(1)}</span>
      <span style={{ color: theme.text.tertiary, fontSize: '12px' }}>({count > 999 ? `${(count / 1000).toFixed(1)}k` : count})</span>
    </span>
  );
};

export const SkeletonCard = () => {
  const { theme } = useTheme();
  const cardStyle = getCardStyle(theme);
  return (
    <div style={{ ...cardStyle, height: '280px', overflow: 'hidden' }}>
      <div style={{ height: '160px', background: theme.skeleton.bg, borderRadius: '12px', marginBottom: '12px' }}>
        <div style={{
          width: '100%', height: '100%', borderRadius: '12px',
          background: `linear-gradient(90deg, ${theme.skeleton.bg} 25%, ${theme.skeleton.shimmer} 50%, ${theme.skeleton.bg} 75%)`,
          backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
        }} />
      </div>
      <div style={{ height: '16px', width: '60%', background: theme.bg.subtleMedium, borderRadius: '8px', marginBottom: '8px' }} />
      <div style={{ height: '12px', width: '40%', background: theme.skeleton.bg, borderRadius: '8px' }} />
    </div>
  );
};
