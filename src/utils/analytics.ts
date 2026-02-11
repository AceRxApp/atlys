// Google Analytics wrapper
// GA4 Measurement ID: G-LNFFL06W4Z

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
