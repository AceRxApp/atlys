import { useState, useEffect, memo } from 'react';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();
const blobCache = new Map<string, string>();

/**
 * Drop-in <img> replacement that works on Capacitor iOS.
 * WKWebView blocks cross-origin <img src> requests, but fetch() works.
 * This component fetches the image via JS and renders a blob URL.
 * On web, it renders a normal <img> tag.
 */
const NativeImg = memo(function NativeImg(
  props: React.ImgHTMLAttributes<HTMLImageElement>
) {
  const { src, ...rest } = props;
  const [blobSrc, setBlobSrc] = useState<string | undefined>(() => {
    if (!isNative || !src) return src;
    return blobCache.get(src) || undefined;
  });
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!src || !isNative) { setBlobSrc(src); return; }
    if (blobCache.has(src)) { setBlobSrc(blobCache.get(src)); return; }

    // Already a blob/data URL — use directly
    if (src.startsWith('blob:') || src.startsWith('data:')) { setBlobSrc(src); return; }

    let cancelled = false;
    setBlobSrc(undefined);
    setFailed(false);

    fetch(src)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.blob(); })
      .then(blob => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        blobCache.set(src, url);
        setBlobSrc(url);
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        // Fire onError so parent components can react (e.g. show fallback)
        if (rest.onError) rest.onError({} as React.SyntheticEvent<HTMLImageElement>);
      });

    return () => { cancelled = true; };
  }, [src]);

  // When the image fails, render a subtle fallback placeholder instead of null
  // so parent layout doesn't collapse to a blank space
  if (failed) {
    return (
      <div
        className={rest.className as string}
        style={{ ...rest.style as object, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <span style={{ fontSize: '1.25rem', opacity: 0.35 }}>{'\u{1F4CD}'}</span>
      </div>
    );
  }
  if (!blobSrc && isNative) {
    // Loading placeholder
    return <div className={rest.className as string} style={{ ...rest.style as object, background: 'var(--bg-elevated)' }} />;
  }

  return <img {...rest} src={blobSrc} onError={(e) => { setFailed(true); if (rest.onError) rest.onError(e); }} />;
});

export default NativeImg;
