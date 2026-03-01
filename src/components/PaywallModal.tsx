import { useState } from 'react';

interface PaywallModalProps {
  feature: 'plan_my_day' | 'tastelens';
  remaining: number;
  limit: number;
  onClose: () => void;
  onUpgrade: (plan: 'monthly' | 'yearly') => Promise<void>;
  requiresAuth: boolean;
  onSignIn: () => void;
}

const FEATURE_LABELS: Record<string, { name: string; icon: string; desc: string }> = {
  plan_my_day: {
    name: 'AI Day Planner',
    icon: '\u2728',
    desc: 'Get unlimited AI-powered day plans with personalized stops, vibes, and itineraries.',
  },
  tastelens: {
    name: 'TasteLens',
    icon: '\uD83C\uDF7D\uFE0F',
    desc: 'Get unlimited AI dish analysis with nutritional info, allergens, pairings, and cultural notes.',
  },
};

export default function PaywallModal({ feature, remaining, limit, onClose, onUpgrade, requiresAuth, onSignIn }: PaywallModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<'yearly' | 'monthly'>('yearly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const info = FEATURE_LABELS[feature];
  const isOutOfUses = remaining <= 0;

  const handleUpgrade = async () => {
    if (requiresAuth) {
      onSignIn();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onUpgrade(selectedPlan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-bg-modal-overlay-deep z-[1100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-bg-surface rounded-2xl max-w-[400px] w-full border border-border-subtle overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-5 pt-6 pb-4 text-center"
          style={{ background: 'linear-gradient(180deg, var(--amber-tint-bg15) 0%, transparent 100%)' }}>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-bg-subtle border-none flex items-center justify-center cursor-pointer text-text-tertiary text-sm"
            aria-label="Close"
          >
            ✕
          </button>
          <div className="text-4xl mb-2">{info.icon}</div>
          <h3 className="text-lg font-bold text-text-primary mb-1">
            {isOutOfUses ? `You've used all ${limit} free ${info.name} uses` : `${info.name} — Free Tier`}
          </h3>
          <p className="text-sm text-text-secondary">
            {isOutOfUses
              ? 'Upgrade to NxStops Pro for unlimited access'
              : `${remaining} of ${limit} free uses left this month`}
          </p>
        </div>

        {/* Plan selection */}
        <div className="px-5 pb-2">
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setSelectedPlan('yearly')}
              className={`flex-1 py-3 px-3 rounded-xl cursor-pointer text-left relative ${
                selectedPlan === 'yearly'
                  ? 'bg-amber-tint-bg15 border-[2px] border-accent-amber'
                  : 'bg-bg-subtle border-[2px] border-border-subtle'
              }`}
            >
              <div className="absolute -top-2.5 right-2 px-2 py-0.5 rounded-full bg-accent-amber text-[10px] font-bold text-text-on-accent">
                SAVE 50%
              </div>
              <div className="text-sm font-bold text-text-primary">Yearly</div>
              <div className="text-lg font-bold bg-accent-text-gradient">$29.99</div>
              <div className="text-xs text-text-tertiary">$2.50/mo</div>
            </button>
            <button
              onClick={() => setSelectedPlan('monthly')}
              className={`flex-1 py-3 px-3 rounded-xl cursor-pointer text-left ${
                selectedPlan === 'monthly'
                  ? 'bg-amber-tint-bg15 border-[2px] border-accent-amber'
                  : 'bg-bg-subtle border-[2px] border-border-subtle'
              }`}
            >
              <div className="text-sm font-bold text-text-primary mt-1">Monthly</div>
              <div className="text-lg font-bold bg-accent-text-gradient">$4.99</div>
              <div className="text-xs text-text-tertiary">/month</div>
            </button>
          </div>

          {/* Features list */}
          <div className="mb-4">
            <div className="text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wider">
              Pro includes
            </div>
            {[
              'Unlimited AI Day Plans',
              'Unlimited TasteLens scans',
              'Priority plan generation',
              'Early access to new features',
            ].map(feat => (
              <div key={feat} className="flex items-center gap-2 py-1.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-sm text-text-primary">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="px-5 pb-5">
          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-tint-bg border border-red-tint-border text-status-red text-xs mb-3">
              {error}
            </div>
          )}
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="btn-primary w-full py-3.5 text-[15px] font-semibold"
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Redirecting to checkout...' : requiresAuth ? 'Sign in to upgrade' : `Upgrade to Pro — ${selectedPlan === 'yearly' ? '$29.99/yr' : '$4.99/mo'}`}
          </button>
          {!isOutOfUses && (
            <button
              onClick={onClose}
              className="w-full mt-2 py-2.5 bg-transparent border-none text-text-tertiary text-sm cursor-pointer"
            >
              Continue with free plan ({remaining} uses left)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
