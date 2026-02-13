export const PriceDots = ({ level }: { level: number }) => {
  if (level < 0) return null;
  return (
    <span className="text-text-tertiary text-xs tracking-[1px]">
      {Array.from({ length: 4 }, (_, i) => (
        <span key={i} className={i < level ? 'text-accent-amber' : 'text-text-disabled'}>$</span>
      ))}
    </span>
  );
};

export const StarRating = ({ rating, count }: { rating: number; count: number }) => {
  return (
    <span className="inline-flex items-center gap-1 text-[13px]">
      <span className="text-accent-amber">★</span>
      <span className="text-text-primary font-semibold">{rating.toFixed(1)}</span>
      <span className="text-text-tertiary text-xs">({count > 999 ? `${(count / 1000).toFixed(1)}k` : count})</span>
    </span>
  );
};

export const SkeletonCard = () => {
  return (
    <div className="card h-[280px] overflow-hidden">
      <div className="h-[160px] bg-skeleton-bg rounded-xl mb-3">
        <div
          className="w-full h-full rounded-xl animate-shimmer"
          style={{
            background: `linear-gradient(90deg, var(--skeleton-bg) 25%, var(--skeleton-shimmer) 50%, var(--skeleton-bg) 75%)`,
            backgroundSize: '200% 100%',
          }}
        />
      </div>
      <div className="h-4 w-[60%] bg-bg-subtle-medium rounded-lg mb-2" />
      <div className="h-3 w-[40%] bg-skeleton-bg rounded-lg" />
    </div>
  );
};
