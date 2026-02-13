import { useRef } from 'react';
import { Capacitor } from '@capacitor/core';

const RATING_STORAGE_KEY = 'nxstops_rating_prompted';
const ACTIONS_KEY = 'nxstops_positive_actions';
const ACTIONS_THRESHOLD = 8;

/**
 * Tracks positive user interactions and prompts for an app store review
 * after a threshold is reached. Uses the native in-app review dialog
 * (SKStoreReviewController on iOS, Google In-App Review on Android).
 * Only prompts once.
 */
export function useAppRating() {
  const prompted = useRef(false);

  const trackPositiveAction = () => {
    if (!Capacitor.isNativePlatform()) return;
    if (localStorage.getItem(RATING_STORAGE_KEY)) return;
    if (prompted.current) return;

    const count = parseInt(localStorage.getItem(ACTIONS_KEY) || '0', 10) + 1;
    localStorage.setItem(ACTIONS_KEY, String(count));

    if (count >= ACTIONS_THRESHOLD) {
      prompted.current = true;
      localStorage.setItem(RATING_STORAGE_KEY, 'true');
      requestNativeReview();
    }
  };

  return { trackPositiveAction };
}

async function requestNativeReview() {
  try {
    const { InAppReview } = await import('@capacitor-community/in-app-review');
    await InAppReview.requestReview();
  } catch (err) {
    console.error('[Rating] Native review request failed:', err);
  }
}
