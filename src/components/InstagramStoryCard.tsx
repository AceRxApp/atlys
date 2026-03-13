import { useRef, useEffect, useCallback, useState } from 'react';

interface InstagramStoryCardProps {
  cityName: string;
  dateRange: string;
  stopsCount: number;
  totalDistanceKm: number;
  cuisineCount: number;
  photoCount: number;
  personality: string;
  personalitySub: string;
  topStops: { name: string; category: string }[];
  onClose: () => void;
}

// ---- Canvas drawing constants ----

/** Logical dimensions matching Instagram Story 9:16 ratio */
const W = 1080;
const H = 1920;

/** Horizontal padding from edges */
const PAD = 72;

/** Right edge boundary */
const RIGHT = W - PAD;

/** Usable content width */
const CONTENT_W = W - PAD * 2;

// ---- Colors ----
const COLOR_AMBER = '#E8940A';
const COLOR_AMBER_DIM = '#C47D08';
const COLOR_WHITE = '#FAFAF9';
const COLOR_MUTED = '#A8A29E';
const COLOR_SUBTLE = '#78716C';
const COLOR_DIVIDER = '#292524';
const COLOR_CARD_BG = 'rgba(255,255,255,0.04)';
const COLOR_CARD_BORDER = 'rgba(255,255,255,0.08)';

// ---- Helpers ----

/** Draw a rounded rectangle path (no fill/stroke) */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/** Draw a 4-pointed sparkle at (cx, cy) */
function drawSparkle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.quadraticCurveTo(cx + size * 0.15, cy - size * 0.15, cx + size, cy);
  ctx.quadraticCurveTo(cx + size * 0.15, cy + size * 0.15, cx, cy + size);
  ctx.quadraticCurveTo(cx - size * 0.15, cy + size * 0.15, cx - size, cy);
  ctx.quadraticCurveTo(cx - size * 0.15, cy - size * 0.15, cx, cy - size);
  ctx.closePath();
  ctx.fill();
}

/** Truncate text to fit within maxWidth, appending ellipsis */
function truncateText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(truncated + '...').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '...';
}

// ---- Main draw function ----

function drawStoryCard(
  canvas: HTMLCanvasElement,
  props: Omit<InstagramStoryCardProps, 'onClose'>,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = W;
  canvas.height = H;

  // --- Background gradient ---
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1C1917');
  bg.addColorStop(0.6, '#131110');
  bg.addColorStop(1, '#0C0A09');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // --- Subtle radial glow behind top section ---
  const glow = ctx.createRadialGradient(W / 2, 200, 0, W / 2, 200, 600);
  glow.addColorStop(0, 'rgba(232,148,10,0.06)');
  glow.addColorStop(1, 'rgba(232,148,10,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, 800);

  // --- Amber accent bar at top ---
  const accentGrad = ctx.createLinearGradient(0, 0, W, 0);
  accentGrad.addColorStop(0, COLOR_AMBER);
  accentGrad.addColorStop(1, COLOR_AMBER_DIM);
  ctx.fillStyle = accentGrad;
  ctx.fillRect(0, 0, W, 8);

  // --- NxStops branding with sparkle ---
  let y = 80;

  // Sparkle icon
  drawSparkle(ctx, PAD + 12, y - 2, 10, COLOR_AMBER);
  drawSparkle(ctx, PAD + 4, y - 12, 5, 'rgba(232,148,10,0.5)');

  ctx.fillStyle = COLOR_AMBER;
  ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
  ctx.fillText('NxStops', PAD + 30, y);

  // --- Date range ---
  y = 140;
  ctx.fillStyle = COLOR_MUTED;
  ctx.font = '26px system-ui, -apple-system, sans-serif';
  ctx.fillText(props.dateRange, PAD, y);

  // --- City name (large, bold, white) ---
  y = 220;
  ctx.fillStyle = COLOR_WHITE;
  ctx.font = 'bold 80px system-ui, -apple-system, sans-serif';
  const cityText = truncateText(ctx, props.cityName, CONTENT_W);
  ctx.fillText(cityText, PAD, y);

  // --- Thin divider ---
  y = 260;
  ctx.strokeStyle = COLOR_DIVIDER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(RIGHT, y);
  ctx.stroke();

  // ============================
  // STATS GRID (2x2)
  // ============================
  y = 300;
  const statBoxW = (CONTENT_W - 24) / 2;
  const statBoxH = 140;
  const gap = 24;

  const stats = [
    { value: String(props.stopsCount), label: 'STOPS VISITED' },
    { value: `${props.totalDistanceKm.toFixed(1)} km`, label: 'DISTANCE WALKED' },
    { value: String(props.cuisineCount), label: 'CUISINE TYPES' },
    { value: String(props.photoCount), label: 'PHOTOS TAKEN' },
  ];

  stats.forEach((stat, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const sx = PAD + col * (statBoxW + gap);
    const sy = y + row * (statBoxH + gap);

    // Card background
    ctx.fillStyle = COLOR_CARD_BG;
    roundRect(ctx, sx, sy, statBoxW, statBoxH, 20);
    ctx.fill();

    // Card border
    ctx.strokeStyle = COLOR_CARD_BORDER;
    ctx.lineWidth = 1;
    roundRect(ctx, sx, sy, statBoxW, statBoxH, 20);
    ctx.stroke();

    // Value
    ctx.fillStyle = COLOR_AMBER;
    ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
    ctx.fillText(stat.value, sx + 28, sy + 65);

    // Label
    ctx.fillStyle = COLOR_SUBTLE;
    ctx.font = '18px system-ui, -apple-system, sans-serif';
    ctx.fillText(stat.label, sx + 28, sy + 105);
  });

  // ============================
  // TRAVEL PERSONALITY
  // ============================
  y = 300 + 2 * (statBoxH + gap) + 30;

  const personalityBoxH = 160;
  // Background card
  const persGrad = ctx.createLinearGradient(PAD, y, RIGHT, y + personalityBoxH);
  persGrad.addColorStop(0, 'rgba(232,148,10,0.08)');
  persGrad.addColorStop(1, 'rgba(232,148,10,0.02)');
  ctx.fillStyle = persGrad;
  roundRect(ctx, PAD, y, CONTENT_W, personalityBoxH, 24);
  ctx.fill();

  // Border
  ctx.strokeStyle = 'rgba(232,148,10,0.2)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, PAD, y, CONTENT_W, personalityBoxH, 24);
  ctx.stroke();

  // Section label
  ctx.fillStyle = COLOR_SUBTLE;
  ctx.font = '16px system-ui, -apple-system, sans-serif';
  ctx.fillText('YOUR TRAVEL PERSONALITY', PAD + 32, y + 38);

  // Personality title
  ctx.fillStyle = COLOR_AMBER;
  ctx.font = 'bold 44px system-ui, -apple-system, sans-serif';
  ctx.fillText(truncateText(ctx, props.personality, CONTENT_W - 64), PAD + 32, y + 90);

  // Personality subtitle
  ctx.fillStyle = COLOR_MUTED;
  ctx.font = '24px system-ui, -apple-system, sans-serif';
  ctx.fillText(truncateText(ctx, props.personalitySub, CONTENT_W - 64), PAD + 32, y + 130);

  // ============================
  // TOP 3 STOPS
  // ============================
  y += personalityBoxH + 50;

  // Section header
  ctx.fillStyle = COLOR_SUBTLE;
  ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
  ctx.fillText('TOP STOPS', PAD, y);
  y += 36;

  const topStops = props.topStops.slice(0, 3);
  topStops.forEach((stop, i) => {
    const rowH = 72;
    const ry = y + i * rowH;

    // Number circle
    const circleR = 20;
    const cx = PAD + circleR;
    const cy = ry + 10;
    ctx.fillStyle = COLOR_AMBER;
    ctx.beginPath();
    ctx.arc(cx, cy, circleR, 0, Math.PI * 2);
    ctx.fill();

    // Number text inside circle
    ctx.fillStyle = '#1C1917';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    const numStr = String(i + 1);
    const numW = ctx.measureText(numStr).width;
    ctx.fillText(numStr, cx - numW / 2, cy + 8);

    // Stop name
    ctx.fillStyle = COLOR_WHITE;
    ctx.font = '28px system-ui, -apple-system, sans-serif';
    const nameX = PAD + circleR * 2 + 20;
    ctx.fillText(truncateText(ctx, stop.name, CONTENT_W - circleR * 2 - 30), nameX, ry + 4);

    // Category
    ctx.fillStyle = COLOR_SUBTLE;
    ctx.font = '20px system-ui, -apple-system, sans-serif';
    ctx.fillText(truncateText(ctx, stop.category, CONTENT_W - circleR * 2 - 30), nameX, ry + 36);
  });

  // ============================
  // FOOTER
  // ============================

  // "Planned with NxStops" text
  const footerY = H - 130;
  ctx.fillStyle = COLOR_SUBTLE;
  ctx.font = '22px system-ui, -apple-system, sans-serif';
  ctx.fillText('Planned with NxStops', PAD, footerY);

  // QR placeholder box (right side of footer)
  const qrSize = 100;
  const qrX = RIGHT - qrSize;
  const qrY = footerY - 70;

  ctx.strokeStyle = COLOR_SUBTLE;
  ctx.lineWidth = 2;
  roundRect(ctx, qrX, qrY, qrSize, qrSize, 12);
  ctx.stroke();

  // QR inner grid pattern (decorative)
  ctx.fillStyle = COLOR_SUBTLE;
  const cellSize = 10;
  const gridPad = 16;
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 7; col++) {
      // Create a pattern that looks QR-ish: corners + scattered
      const isCornerRegion =
        (row < 3 && col < 3) ||
        (row < 3 && col > 4) ||
        (row > 4 && col < 3);
      const isCenter = row === 3 && col === 3;
      const isScattered = (row + col) % 3 === 0;

      if (isCornerRegion || isCenter || isScattered) {
        ctx.fillRect(
          qrX + gridPad + col * cellSize,
          qrY + gridPad + row * cellSize,
          cellSize - 2,
          cellSize - 2,
        );
      }
    }
  }

  // "nxstops.com" below QR
  ctx.fillStyle = COLOR_MUTED;
  ctx.font = '16px system-ui, -apple-system, sans-serif';
  const urlText = 'nxstops.com';
  const urlW = ctx.measureText(urlText).width;
  ctx.fillText(urlText, qrX + (qrSize - urlW) / 2, qrY + qrSize + 24);

  // --- Amber accent bar at bottom ---
  ctx.fillStyle = accentGrad;
  ctx.fillRect(0, H - 8, W, 8);
}

// ---- Component ----

export default function InstagramStoryCard(props: InstagramStoryCardProps) {
  const {
    cityName,
    dateRange,
    stopsCount,
    totalDistanceKm,
    cuisineCount,
    photoCount,
    personality,
    personalitySub,
    topStops,
    onClose,
  } = props;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

  // Draw the card whenever props change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawStoryCard(canvas, {
      cityName,
      dateRange,
      stopsCount,
      totalDistanceKm,
      cuisineCount,
      photoCount,
      personality,
      personalitySub,
      topStops,
    });
  }, [cityName, dateRange, stopsCount, totalDistanceKm, cuisineCount, photoCount, personality, personalitySub, topStops]);

  /** Convert canvas to Blob */
  const getBlob = useCallback((): Promise<Blob | null> => {
    return new Promise(resolve => {
      const canvas = canvasRef.current;
      if (!canvas) return resolve(null);
      canvas.toBlob(blob => resolve(blob), 'image/png');
    });
  }, []);

  /** Build a filename based on the city */
  const getFilename = useCallback(() => {
    const slug = cityName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return `nxstops-story-${slug}.png`;
  }, [cityName]);

  /** Download handler */
  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      const blob = await getBlob();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = getFilename();
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }, [getBlob, getFilename]);

  /** Share handler — uses Web Share API if available, else falls back to download */
  const handleShare = useCallback(async () => {
    setSharing(true);
    try {
      const blob = await getBlob();
      if (!blob) return;
      const file = new File([blob], getFilename(), { type: 'image/png' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `My ${cityName} Trip — NxStops`,
        });
      } else {
        // Fallback to download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = getFilename();
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // User cancelled share dialog — do nothing
    } finally {
      setSharing(false);
    }
  }, [getBlob, getFilename, cityName]);

  return (
    <div
      className="fixed inset-0 bg-bg-modal-overlay-deep z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="flex flex-col items-center gap-4 max-h-[95vh] animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-bg-subtle border border-border-subtle flex items-center justify-center cursor-pointer z-10"
          aria-label="Close"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Canvas — scaled to fit screen while preserving 9:16 aspect ratio */}
        <div className="overflow-hidden rounded-2xl shadow-2xl" style={{ maxHeight: 'calc(95vh - 80px)' }}>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="block"
            style={{
              width: 'min(340px, 80vw)',
              height: `calc(min(340px, 80vw) * ${H / W})`,
            }}
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 w-full max-w-[340px]">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 py-3 rounded-xl bg-bg-subtle border border-border-subtle text-text-primary text-sm font-semibold cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {downloading ? 'Saving...' : 'Download'}
          </button>
          <button
            onClick={handleShare}
            disabled={sharing}
            className="flex-1 py-3 rounded-xl text-sm font-semibold cursor-pointer flex items-center justify-center gap-2 border-none disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #E8940A, #D85A18)',
              color: '#fff',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            {sharing ? 'Sharing...' : 'Share'}
          </button>
        </div>
      </div>
    </div>
  );
}
