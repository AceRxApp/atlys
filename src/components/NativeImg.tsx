import { useState, useEffect, useRef, memo } from 'react';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();
const blobCache = new Map<string, string>();

interface NativeImgProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Defer loading until the image scrolls near the viewport. Default true for native, false for web. */
  lazy?: boolean;
}

/**
 * Drop-in <img> replacement that works on Capacitor iOS.
 * WKWebView blocks cross-origin <img src> requests, but fetch() works.
 * This component fetches the image via JS and renders a blob URL.
 * On web, it renders a normal <img> tag.
 *
 * Lazy loading:
 *   - Web: respects `loading="lazy"` attribute natively (passed through via ...rest)
 *   - Native: uses IntersectionObserver to defer fetch() until image is near viewport
 */
const NativeImg = memo(function NativeImg(props: NativeImgProps) {
  const { src, lazy = isNative, ...rest } = props;
  const [blobSrc, setBlobSrc] = useState<string | undefined>(() => {
    if (!isNative || !src) return src;
    return blobCache.get(src) || undefined;
  });
  const [failed, setFailed] = useState(false);
  const [inView, setInView] = useState(!lazy || !!blobCache.get(src || ''));
  const containerRef = useRef<HTMLDivElement | HTMLImageElement | null>(null);

  // IntersectionObserver — defer loading until image is near viewport
  useEffect(() => {
    if (!lazy || inView || !containerRef.current) return;
    const el = containerRef.current;
    // Observer with a 200px rootMargin so images start loading just before they enter the screen
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [lazy, inView]);

  useEffect(() => {
    if (!src || !isNative) { setBlobSrc(src); return; }
    if (!inView) return; // Wait until in view
    if (blobCache.has(src)) { setBlobSrc(blobCache.get(src)); return; }
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
        if (rest.onError) rest.onError({} as React.SyntheticEvent<HTMLImageElement>);
      });

    return () => { cancelled = true; };
  }, [src, inView]);

  // When the image fails, render a subtle fallback placeholder
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
    // Loading placeholder (also serves as the IntersectionObserver target when lazy)
    return (
      <div
        ref={containerRef as React.RefObject<HTMLDivElement>}
        className={rest.className as string}
        style={{ ...rest.style as object, background: 'var(--bg-elevated)' }}
      />
    );
  }

  return (
    <img
      {...rest}
      ref={containerRef as React.RefObject<HTMLImageElement>}
      loading={rest.loading ?? (lazy ? 'lazy' : undefined)}
      decoding={rest.decoding ?? 'async'}
      src={blobSrc}
      onError={(e) => { setFailed(true); if (rest.onError) rest.onError(e); }}
    />
  );
});

export default NativeImg;
