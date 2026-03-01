import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import type { User } from '@supabase/supabase-js';
import { API_URL } from '../utils/api';

// ---------------------------------------------------------------------------
// Free tier limits (per calendar month)
// ---------------------------------------------------------------------------
const FREE_LIMITS = {
  plan_my_day: 3,
  tastelens: 5,
} as const;

type Feature = keyof typeof FREE_LIMITS;

// ---------------------------------------------------------------------------
// localStorage usage tracking for free tier
// ---------------------------------------------------------------------------
function getMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getUsage(feature: Feature): number {
  const key = `nxstops_usage_${feature}_${getMonthKey()}`;
  return parseInt(localStorage.getItem(key) || '0', 10);
}

function incrementUsage(feature: Feature): number {
  const key = `nxstops_usage_${feature}_${getMonthKey()}`;
  const current = getUsage(feature);
  const next = current + 1;
  localStorage.setItem(key, String(next));
  return next;
}

function getRemaining(feature: Feature): number {
  return Math.max(0, FREE_LIMITS[feature] - getUsage(feature));
}

// ---------------------------------------------------------------------------
// Subscription types
// ---------------------------------------------------------------------------
export interface SubscriptionState {
  plan: 'free' | 'pro_monthly' | 'pro_yearly';
  status: 'active' | 'inactive' | 'past_due' | 'canceled';
  isPro: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  loading: boolean;
}

export function useSubscription(user: User | null) {
  const [sub, setSub] = useState<SubscriptionState>({
    plan: 'free',
    status: 'inactive',
    isPro: false,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
    loading: true,
  });

  // Fetch subscription from Supabase
  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSub({ plan: 'free', status: 'inactive', isPro: false, cancelAtPeriodEnd: false, currentPeriodEnd: null, loading: false });
      return;
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .select('plan, status, cancel_at_period_end, current_period_end')
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      setSub({ plan: 'free', status: 'inactive', isPro: false, cancelAtPeriodEnd: false, currentPeriodEnd: null, loading: false });
      return;
    }

    const isPro = data.status === 'active' && ['pro_monthly', 'pro_yearly', 'monthly', 'yearly'].includes(data.plan);
    setSub({
      plan: data.plan,
      status: data.status,
      isPro,
      cancelAtPeriodEnd: data.cancel_at_period_end || false,
      currentPeriodEnd: data.current_period_end || null,
      loading: false,
    });
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Check if a feature can be used (pro = unlimited, free = check limits)
  const canUseFeature = useCallback((feature: Feature): boolean => {
    if (sub.isPro) return true;
    return getRemaining(feature) > 0;
  }, [sub.isPro]);

  // Record a feature usage and return whether it was allowed
  const useFeature = useCallback((feature: Feature): boolean => {
    if (sub.isPro) return true;
    if (getRemaining(feature) <= 0) return false;
    incrementUsage(feature);
    return true;
  }, [sub.isPro]);

  // Get remaining uses for a feature
  const getRemainingUses = useCallback((feature: Feature): number => {
    if (sub.isPro) return Infinity;
    return getRemaining(feature);
  }, [sub.isPro]);

  // Get the limit for a feature
  const getLimit = useCallback((feature: Feature): number => {
    return FREE_LIMITS[feature];
  }, []);

  // Create checkout session and redirect
  const startCheckout = useCallback(async (plan: 'monthly' | 'yearly') => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not signed in');

    const res = await fetch(`${API_URL}/api/stripe?action=checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ plan }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Checkout failed' }));
      throw new Error(data.error || 'Checkout failed');
    }

    const { url } = await res.json();
    window.location.href = url;
  }, []);

  // Open billing portal
  const manageBilling = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not signed in');

    const res = await fetch(`${API_URL}/api/stripe?action=billing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Failed' }));
      throw new Error(data.error || 'Failed to open billing');
    }

    const { url } = await res.json();
    window.location.href = url;
  }, []);

  return {
    ...sub,
    canUseFeature,
    useFeature,
    getRemainingUses,
    getLimit,
    startCheckout,
    manageBilling,
    refreshSubscription: fetchSubscription,
  };
}
