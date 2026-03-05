import { API_URL } from './api';

/** Ensure photo URLs are absolute — fixes relative /api/ URLs on iOS/Capacitor */
export function fixPhotoUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('/api/')) return `${API_URL}${url}`;
  return url;
}
