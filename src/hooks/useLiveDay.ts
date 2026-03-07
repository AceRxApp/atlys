import { useState, useEffect, useCallback, useMemo } from 'react';
import { hapticImpact } from '../utils/haptics';
import type { Stop, StopCheckIn } from '../types';
import { PRICE_LEVEL_ESTIMATE } from '../data/constants';

export function useLiveDay(deps: {
  tripDays: Record<number, Stop[]>;
  activeDay: number;
  tripStartDate: string | null;
  dayCount: number;
  citySlug: string;
}) {
  const { tripDays, activeDay, tripStartDate, dayCount, citySlug } = deps;

  const storageKey = `nxstops_checkins_${citySlug}`;

  // Determine if today is a trip day
  const { isLiveDay, liveDayNumber } = useMemo(() => {
    if (!tripStartDate) return { isLiveDay: false, liveDayNumber: null };
    const startMs = new Date(tripStartDate + 'T00:00:00').getTime();
    const todayMs = new Date();
    todayMs.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((todayMs.getTime() - startMs) / 86400000);
    const dayNum = diffDays + 1;
    if (dayNum >= 1 && dayNum <= dayCount) {
      return { isLiveDay: true, liveDayNumber: dayNum };
    }
    return { isLiveDay: false, liveDayNumber: null };
  }, [tripStartDate, dayCount]);

  // Current day's stops (must be before checkIn callback)
  const dayPlan = tripDays[activeDay] || [];

  // Check-in state
  const [checkIns, setCheckIns] = useState<Record<string, StopCheckIn>>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });

  // Persist check-ins
  useEffect(() => {
    if (Object.keys(checkIns).length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(checkIns));
    } else {
      localStorage.removeItem(storageKey);
    }
  }, [checkIns, storageKey]);

  // Review prompt
  const [reviewPromptStopId, setReviewPromptStopId] = useState<string | null>(null);

  const checkIn = useCallback((stopId: string) => {
    hapticImpact('Medium');
    setCheckIns(prev => ({
      ...prev,
      [stopId]: {
        stopId,
        checkedInAt: new Date().toISOString(),
      },
    }));
    setReviewPromptStopId(stopId);

    // Schedule a next-stop nudge notification (30 min later)
    const currentIndex = dayPlan.findIndex(s => s.id === stopId);
    const nextStop = dayPlan[currentIndex + 1];
    if (nextStop && 'serviceWorker' in navigator && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const nextName = nextStop.place?.name || nextStop.event?.name || 'your next stop';
      setTimeout(() => {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification('Ready for your next stop?', {
            body: `Head to ${nextName} next!`,
            icon: '/logo-192.png',
            tag: 'next-stop',
          });
        }).catch(() => {});
      }, 30 * 60 * 1000); // 30 minutes
    }
  }, [dayPlan]);

  const addQuickReview = useCallback((stopId: string, rating: number, comment?: string, photos?: string[], journalNote?: string) => {
    setCheckIns(prev => {
      const existing = prev[stopId];
      if (!existing) return prev;
      return {
        ...prev,
        [stopId]: {
          ...existing,
          rating,
          comment,
          ...(photos && photos.length > 0 ? { photos } : {}),
          ...(journalNote ? { journalNote } : {}),
        },
      };
    });
    setReviewPromptStopId(null);
  }, []);

  const isCheckedIn = useCallback((stopId: string) => {
    return !!checkIns[stopId];
  }, [checkIns]);

  const getCheckIn = useCallback((stopId: string): StopCheckIn | null => {
    return checkIns[stopId] || null;
  }, [checkIns]);

  // Progress stats
  const checkedInCount = useMemo(() => {
    return dayPlan.filter(s => checkIns[s.id]).length;
  }, [dayPlan, checkIns]);

  const totalStopsToday = dayPlan.length;

  const progressPercent = totalStopsToday > 0
    ? Math.round((checkedInCount / totalStopsToday) * 100)
    : 0;

  const spentSoFar = useMemo(() => {
    return dayPlan
      .filter(s => checkIns[s.id])
      .reduce((sum, s) => {
        const ci = checkIns[s.id];
        if (ci.actualSpend && ci.actualSpend > 0) return sum + ci.actualSpend;
        if (s.estimatedSpend && s.estimatedSpend > 0) return sum + s.estimatedSpend;
        if (s.type === 'event') return sum + 20;
        const pl = s.place?.priceLevel ?? -1;
        return sum + (PRICE_LEVEL_ESTIMATE[pl] ?? 15);
      }, 0);
  }, [dayPlan, checkIns]);

  return {
    isLiveDay,
    liveDayNumber,
    checkIns,
    checkIn,
    addQuickReview,
    isCheckedIn,
    getCheckIn,
    checkedInCount,
    totalStopsToday,
    progressPercent,
    spentSoFar,
    reviewPromptStopId,
    setReviewPromptStopId,
  };
}
