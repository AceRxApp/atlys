import { Capacitor } from '@capacitor/core';

/**
 * API base URL — empty on web (relative URLs), full production URL on native.
 * Capacitor iOS/Android serve bundled assets locally, so API calls need
 * an absolute URL to reach the Vercel backend.
 */
export const API_URL = Capacitor.isNativePlatform() ? 'https://nxstops.com' : '';
