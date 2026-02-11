// Sentry Error Tracking
// TODO: Replace the DSN below with your Sentry DSN from https://sentry.io
// 1. Create a free account at sentry.io
// 2. Create a new React project
// 3. Copy the DSN and paste it below

import * as Sentry from '@sentry/react';

export function initSentry() {
  if (import.meta.env.PROD) {
    Sentry.init({
      dsn: '', // TODO: Add your Sentry DSN here
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.1,
    });
  }
}

export { Sentry };
