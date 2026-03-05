import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();
const cache = new Map<string, string>();

/**
 * On native (Capacitor), WKWebView blocks cross-origin <img> tags.
 * This hook fetches the image via fetch() (which works) and returns a blob URL.
 * On web, it returns the original URL unchanged.
 */
export function useNativeImage(url: string | null | undefined): string | null {
  const [blobUrl, setBlobUrl] = useState<string | null>(() => {
    if (!url) return null;
    if (!isNative) return url;
    return cache.get(url) || null;
  });

  useEffect(() => {
    if (!url) { setBlobUrl(null); return; }
    if (!isNative) { setBlobUrl(url); return; }
    if (cache.has(url)) { setBlobUrl(cache.get(url)!); return; }

    let cancelled = false;
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.blob(); })
      .then(blob => {
        if (cancelled) return;
        const objectUrl = URL.createObjectURL(blob);
        cache.set(url, objectUrl);
        setBlobUrl(objectUrl);
      })
      .catch(() => { if (!cancelled) setBlobUrl(null); });

    return () => { cancelled = true; };
  }, [url]);

  return blobUrl;
}

/** Batch-fetch multiple images. Returns blob URLs (native) or original URLs (web). */
export function useNativeImages(urls: string[]): (string | null)[] {
  const [blobUrls, setBlobUrls] = useState<(string | null)[]>(() =>
    urls.map(u => (!isNative ? u : cache.get(u) || null))
  );

  useEffect(() => {
    if (!isNative) { setBlobUrls(urls); return; }

    let cancelled = false;
    Promise.all(
      urls.map(async (url) => {
        if (cache.has(url)) return cache.get(url)!;
        try {
          const r = await fetch(url);
          if (!r.ok) return null;
          const blob = await r.blob();
          const objectUrl = URL.createObjectURL(blob);
          cache.set(url, objectUrl);
          return objectUrl;
        } catch { return null; }
      })
    ).then(results => { if (!cancelled) setBlobUrls(results); });

    return () => { cancelled = true; };
  }, [urls.join(',')]);

  return blobUrls;
}
