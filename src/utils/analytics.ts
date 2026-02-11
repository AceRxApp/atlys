// Google Analytics wrapper
// TODO: Replace G-XXXXXXXXXX with your GA4 Measurement ID from https://analytics.google.com

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

export function trackEvent(name: string, params?: Record<string, string>) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', name, params);
  }
}

export function trackScreenView(screenName: string) {
  trackEvent('screen_view', { screen_name: screenName });
}
