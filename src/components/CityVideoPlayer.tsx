import { useState, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// CityVideoPlayer — in-app video playback for city content
// ---------------------------------------------------------------------------
// Renders a horizontal carousel of self-hosted video clips.
// Each card shows a thumbnail; tapping opens an inline player overlay.
// Videos are mp4/HLS hosted on Cloudflare Stream, Supabase Storage, or similar.

export interface CityVideoClip {
  url: string;          // Direct mp4 URL or HLS stream
  thumbnail?: string;   // Poster image (if not set, shows play icon over gradient)
  caption: string;      // Short title
  duration?: number;    // Duration in seconds (displayed as badge)
}

interface Props {
  cityName: string;
  videos: CityVideoClip[];
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function CityVideoPlayer({ cityName, videos }: Props) {
  const [activeVideo, setActiveVideo] = useState<CityVideoClip | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const closePlayer = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setActiveVideo(null);
  }, []);

  const openVideo = useCallback((clip: CityVideoClip) => {
    setActiveVideo(clip);
  }, []);

  if (videos.length === 0) return null;

  return (
    <div className="mb-3">
      {/* Section header */}
      <div className="text-[13px] font-bold text-text-primary mb-2 flex items-center gap-2">
        <span>🎥</span> Explore {cityName}
        <span className="text-[11px] font-normal text-text-tertiary">
          ({videos.length} {videos.length === 1 ? 'video' : 'videos'})
        </span>
      </div>

      {/* Video card carousel */}
      <div className="flex gap-2.5 overflow-x-auto scroll-hidden pb-1">
        {videos.map((clip, i) => (
          <button
            key={i}
            onClick={() => openVideo(clip)}
            className="shrink-0 rounded-xl overflow-hidden border border-border-subtle cursor-pointer relative group"
            style={{ width: 160, height: 200, background: 'linear-gradient(135deg, #1a1a1a, #2d2d2d)' }}
            aria-label={`Play video: ${clip.caption}`}
          >
            {/* Thumbnail */}
            {clip.thumbnail ? (
              <img
                src={clip.thumbnail}
                alt={clip.caption}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, rgba(232,148,10,0.15), rgba(245,166,35,0.08))' }}>
                <span className="text-3xl opacity-40">🎬</span>
              </div>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.85))' }} />

            {/* Play button center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-sm"
                style={{ background: 'rgba(232,148,10,0.85)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#000" stroke="none">
                  <polygon points="6 3 20 12 6 21 6 3"/>
                </svg>
              </div>
            </div>

            {/* Duration badge */}
            {clip.duration && (
              <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
                {formatDuration(clip.duration)}
              </div>
            )}

            {/* Caption at bottom */}
            <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 pt-4">
              <div className="text-[12px] font-semibold text-white leading-tight line-clamp-2">
                {clip.caption}
              </div>
              <div className="text-[10px] text-white/50 mt-0.5">NxStops</div>
            </div>
          </button>
        ))}
      </div>

      {/* Fullscreen video player overlay */}
      {activeVideo && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.95)' }}
          onClick={closePlayer}
        >
          {/* Close button */}
          <button
            onClick={closePlayer}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center border-none cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
            aria-label="Close video"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Video caption */}
          <div className="absolute top-4 left-4 right-16 z-10">
            <div className="text-white text-sm font-semibold">{activeVideo.caption}</div>
            <div className="text-white/50 text-xs mt-0.5">{cityName}</div>
          </div>

          {/* Video element */}
          <video
            ref={videoRef}
            src={activeVideo.url}
            poster={activeVideo.thumbnail}
            controls
            autoPlay
            playsInline
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-[85vh] rounded-lg"
            style={{ outline: 'none' }}
          />
        </div>
      )}
    </div>
  );
}
