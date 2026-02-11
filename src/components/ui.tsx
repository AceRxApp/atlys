import { cardStyle } from '../styles/shared';

export const PriceDots = ({ level }: { level: number }) => {
  if (level < 0) return null;
  return (
    <span style={{ color: '#78716C', fontSize: '12px', letterSpacing: '1px' }}>
      {Array.from({ length: 4 }, (_, i) => (
        <span key={i} style={{ color: i < level ? '#F59E0B' : '#3a3632' }}>$</span>
      ))}
    </span>
  );
};

export const StarRating = ({ rating, count }: { rating: number; count: number }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
    <span style={{ color: '#F59E0B' }}>★</span>
    <span style={{ color: '#FFFBEB', fontWeight: 600 }}>{rating.toFixed(1)}</span>
    <span style={{ color: '#78716C', fontSize: '12px' }}>({count > 999 ? `${(count / 1000).toFixed(1)}k` : count})</span>
  </span>
);

export const SkeletonCard = () => (
  <div style={{ ...cardStyle, height: '280px', overflow: 'hidden' }}>
    <div style={{ height: '160px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', marginBottom: '12px' }}>
      <div style={{
        width: '100%', height: '100%', borderRadius: '12px',
        background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%)',
        backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
      }} />
    </div>
    <div style={{ height: '16px', width: '60%', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '8px' }} />
    <div style={{ height: '12px', width: '40%', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }} />
  </div>
);
