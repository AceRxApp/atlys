import { useState, useRef, useEffect, useCallback } from 'react';
import { useTasteLens, type TasteLensResult, type DishImage } from '../hooks/useDishLens';
import { useApp } from '../context/AppContext';
import { API_URL } from '../utils/api';
import { useSubscription } from '../hooks/useSubscription';
import PaywallModal from '../components/PaywallModal';

// ---------- Intro Guide (first-time users) ----------
function TasteLensIntro({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="card p-4 mb-4 border border-amber-tint-border20 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, var(--amber-tint-bg10), var(--bg-subtle))' }}>
      <div className="flex items-center gap-2.5 mb-2">
        <span className="text-2xl">{'\u{1F37D}\u{FE0F}'}</span>
        <div className="flex-1">
          <h3 className="text-base font-bold text-text-primary m-0">TasteLens</h3>
        </div>
        <button onClick={onDismiss}
          className="text-text-tertiary bg-transparent border-none cursor-pointer text-xs p-1">
          {'\u2715'}
        </button>
      </div>
      <p className="text-[13px] text-text-body leading-relaxed m-0 mb-3">
        Snap a menu, type a dish name, or search any food to get photos, calories, allergens, and more.
      </p>
      <button onClick={onDismiss}
        className="w-full py-2.5 rounded-xl bg-accent-gradient text-text-on-accent text-sm font-semibold border-none cursor-pointer">
        Got it
      </button>
    </div>
  );
}

// ---------- Persistent "How to use" hint ----------
function HowToUseHint() {
  return (
    <div className="card p-3.5 mb-4 border border-border-subtle">
      <div className="text-[11px] text-accent-amber uppercase tracking-wider font-bold mb-2.5">4 ways to use TasteLens</div>
      <div className="space-y-2">
        <div className="flex items-start gap-2.5">
          <span className="text-sm shrink-0 mt-px">{'\u{1F4F7}'}</span>
          <div>
            <span className="text-xs font-semibold text-text-primary">Take a photo</span>
            <span className="text-xs text-text-tertiary"> — point your camera at a restaurant menu</span>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <span className="text-sm shrink-0 mt-px">{'\u{1F5BC}\u{FE0F}'}</span>
          <div>
            <span className="text-xs font-semibold text-text-primary">Upload a photo</span>
            <span className="text-xs text-text-tertiary"> — pick a saved menu image from your gallery</span>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <span className="text-sm shrink-0 mt-px">{'\u{1F4CD}'}</span>
          <div>
            <span className="text-xs font-semibold text-text-primary">Type a dish + restaurant</span>
            <span className="text-xs text-text-tertiary"> — get a breakdown from a specific restaurant</span>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <span className="text-sm shrink-0 mt-px">{'\u{1F50D}'}</span>
          <div>
            <span className="text-xs font-semibold text-text-primary">Search any food</span>
            <span className="text-xs text-text-tertiary"> — type any dish to learn what it is</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const SPICE_LABELS = ['Not spicy', 'Mild', 'Medium', 'Spicy', 'Very spicy', 'Extreme'];
const SPICE_COLORS = ['text-text-muted', 'text-status-green', 'text-accent-amber', 'text-orange-400', 'text-status-red', 'text-red-600'];

const TAG_COLORS: Record<string, string> = {
  vegetarian: 'bg-green-tint-bg text-status-green border-green-tint-border',
  vegan: 'bg-green-tint-bg text-status-green border-green-tint-border',
  'gluten-free': 'bg-blue-tint-bg text-blue-400 border-blue-tint-border',
  'dairy-free': 'bg-blue-tint-bg text-blue-400 border-blue-tint-border',
  'nut-free': 'bg-amber-tint-bg10 text-accent-amber border-amber-tint-border20',
  halal: 'bg-green-tint-bg text-status-green border-green-tint-border',
  kosher: 'bg-purple-tint-bg08 text-events-text border-purple-tint-border',
  pescatarian: 'bg-blue-tint-bg text-blue-400 border-blue-tint-border',
  'contains-alcohol': 'bg-red-tint-bg text-status-red border-red-tint-border',
};

// ---------- Hero Image Gallery (swipeable) ----------
function DishHero({ images, name }: { images: DishImage[]; name: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());

  const validImages = images.filter(img => !failedUrls.has(img.url));

  // Track which image is in view via scroll position
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;
    const itemWidth = el.offsetWidth;
    const idx = Math.round(scrollLeft / itemWidth);
    setActiveIdx(Math.min(idx, validImages.length - 1));
  }, [validImages.length]);

  if (validImages.length === 0) {
    return (
      <div className="w-full h-[220px] rounded-2xl bg-amber-tint-bg06 flex flex-col items-center justify-center mb-4">
        <span className="text-5xl mb-2">{'\u{1F37D}\u{FE0F}'}</span>
        <span className="text-xs text-text-tertiary">No photo available</span>
      </div>
    );
  }

  // Single image — no scroll needed
  if (validImages.length === 1) {
    const img = validImages[0];
    return (
      <div className="relative mb-4">
        <img
          src={img.url}
          alt={img.alt || name}
          className="w-full h-[220px] rounded-2xl object-cover"
          loading="eager"
          referrerPolicy="no-referrer"
          onError={() => setFailedUrls(prev => new Set(prev).add(img.url))}
        />
        <div className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent 60%, var(--bg-body))' }} />
        {img.photographer && (
          <div className="absolute top-3 right-3 text-[11px] text-white/70 bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-sm">
            {img.source} / {img.photographer}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative mb-4">
      {/* Scrollable image strip */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="dish-hero-scroll flex overflow-x-auto rounded-2xl"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <style>{`.dish-hero-scroll::-webkit-scrollbar { display: none; }`}</style>
        {validImages.map((img, i) => (
          <div
            key={img.url}
            className="shrink-0 w-full relative"
            style={{ scrollSnapAlign: 'start' }}
          >
            <img
              src={img.url}
              alt={img.alt || name}
              className="w-full h-[220px] object-cover"
              loading={i === 0 ? 'eager' : 'lazy'}
              referrerPolicy="no-referrer"
              onError={() => setFailedUrls(prev => new Set(prev).add(img.url))}
            />
            {/* Source attribution per image */}
            {img.photographer && (
              <div className="absolute top-3 right-3 text-[11px] text-white/70 bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-sm">
                {img.source} / {img.photographer}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent 60%, var(--bg-body))' }} />

      {/* Dot indicators */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-[2]">
        {validImages.map((_, i) => (
          <div key={i}
            className={`h-2 rounded-full transition-all ${
              i === activeIdx ? 'w-4 bg-accent-amber' : 'w-2 bg-[rgba(255,255,255,0.5)]'
            }`} />
        ))}
      </div>

      {/* Photo count badge */}
      <div className="absolute top-3 left-3 text-[11px] text-white/80 bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-sm z-[2]">
        {activeIdx + 1} / {validImages.length}
      </div>
    </div>
  );
}

// ---------- Spice Meter ----------
function SpiceMeter({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className={`w-2.5 h-5 rounded-sm ${i < level ? 'bg-status-red' : 'bg-bg-subtle'}`} />
        ))}
      </div>
      <span className={`text-xs font-medium ${SPICE_COLORS[level] || 'text-text-muted'}`}>
        {SPICE_LABELS[level] || 'Unknown'}
      </span>
    </div>
  );
}

// ---------- Result Card (Visual-First) ----------
function ResultCard({
  result, images, restaurant, onReset,
}: {
  result: TasteLensResult;
  images: DishImage[];
  restaurant?: string;
  onReset: () => void;
}) {
  return (
    <div className="space-y-3">
      {/* Hero Image */}
      <DishHero images={images} name={result.name} />

      {/* Dish Name + Restaurant Badge */}
      <div>
        <h3 className="text-xl font-bold text-text-primary m-0">{result.name}</h3>
        {restaurant && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-tint-bg15 text-accent-amber font-semibold">
              {restaurant}
            </span>
            <span className="text-xs text-text-tertiary capitalize">{result.category}</span>
          </div>
        )}
        {!restaurant && (
          <span className="text-xs text-text-tertiary capitalize">{result.category}</span>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-text-body leading-relaxed m-0">{result.description}</p>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="card p-3 text-center">
          <div className="text-[11px] text-text-tertiary uppercase tracking-wider mb-1">Calories</div>
          <span className="text-base font-bold text-text-primary">{result.calories || 'N/A'}</span>
        </div>
        <div className="card p-3 text-center">
          <div className="text-[11px] text-text-tertiary uppercase tracking-wider mb-1">Serving</div>
          <span className="text-xs font-semibold text-text-primary">{result.servingSize || 'Standard'}</span>
        </div>
      </div>

      {/* Spice Level */}
      {result.spiceLevel > 0 && (
        <div className="card p-3">
          <div className="text-[11px] text-text-tertiary uppercase tracking-wider mb-1.5">Spice Level</div>
          <SpiceMeter level={result.spiceLevel} />
        </div>
      )}

      {/* Pairings — "Goes well with" */}
      {result.pairings && result.pairings.length > 0 && (
        <div className="card p-4" style={{ background: 'linear-gradient(135deg, var(--amber-tint-bg06), var(--bg-subtle))' }}>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-sm">{'\u{1F37D}\u{FE0F}'}</span>
            <span className="text-xs font-semibold text-text-primary uppercase tracking-wider">Pair it with</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {result.pairings.map(p => (
              <span key={p} className="text-[12px] font-medium px-3 py-1.5 rounded-xl bg-amber-tint-bg15 text-accent-amber border border-amber-tint-border20">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Dietary Tags */}
      {result.dietaryTags.length > 0 && (
        <div className="card p-4">
          <div className="section-label mb-2">Dietary Info</div>
          <div className="flex flex-wrap gap-1.5">
            {result.dietaryTags.map(tag => (
              <span key={tag}
                className={`text-xs font-medium px-2.5 py-1 rounded-full border ${TAG_COLORS[tag] || 'bg-bg-subtle text-text-secondary border-border-subtle'}`}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Allergens */}
      {result.allergens.length > 0 && (
        <div className="card p-4 border border-red-tint-border" style={{ background: 'linear-gradient(135deg, var(--red-tint-bg), var(--bg-subtle))' }}>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-sm">{'\u26A0\uFE0F'}</span>
            <span className="text-xs font-semibold text-status-red uppercase tracking-wider">Allergens</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {result.allergens.map(a => (
              <span key={a} className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-tint-bg text-status-red border border-red-tint-border capitalize">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Translation */}
      {result.translation && (
        <div className="card p-4" style={{ background: 'linear-gradient(135deg, var(--purple-tint-bg08), var(--bg-subtle))' }}>
          <div className="flex items-start gap-2">
            <span className="text-base shrink-0">{'\u{1F30D}'}</span>
            <div>
              <div className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1">Translation ({result.translation.language})</div>
              <p className="text-sm text-text-body leading-relaxed m-0">
                <span className="italic">{result.translation.original}</span> = <span className="font-semibold">{result.translation.english}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cultural Note */}
      {result.culturalNote && (
        <div className="card p-4" style={{ background: 'linear-gradient(135deg, var(--amber-tint-bg06), var(--bg-subtle))' }}>
          <div className="flex items-start gap-2">
            <span className="text-base shrink-0">{'\u{1F4A1}'}</span>
            <p className="text-sm text-text-body leading-relaxed m-0 italic">{result.culturalNote}</p>
          </div>
        </div>
      )}

      {/* Try another */}
      <button onClick={onReset}
        className="w-full py-3 rounded-xl border border-border-medium bg-transparent text-text-secondary text-sm font-medium cursor-pointer">
        {'\u{1F50D}'} Analyze Another Dish
      </button>
    </div>
  );
}

// ---------- Main TasteLens Screen (Tab) ----------
export default function DishLensScreen() {
  const { dishLensContext, setDishLensContext, cityLabel, user, setShowProfile, setAuthScreen } = useApp();
  const subscription = useSubscription(user);

  const restaurant = dishLensContext.restaurant;
  const city = dishLensContext.city || cityLabel || undefined;
  const initialDish = dishLensContext.dish;

  const [dishName, setDishName] = useState(initialDish || '');
  const { loading, result, images, error, analyzeDish, reset } = useTasteLens();
  const [menuDishes, setMenuDishes] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(() => !localStorage.getItem('nxstops_tastelens_seen'));
  const [showPaywall, setShowPaywall] = useState(false);

  const dismissIntro = useCallback(() => {
    setShowIntro(false);
    localStorage.setItem('nxstops_tastelens_seen', '1');
  }, []);

  // If context changes (e.g. navigated from a restaurant), update initial dish
  useEffect(() => {
    if (dishLensContext.dish) {
      setDishName(dishLensContext.dish);
    }
  }, [dishLensContext.dish]);

  const handleAnalyze = () => {
    const name = dishName.trim();
    if (!name) return;
    // Require sign-in
    if (!user) {
      setShowProfile(true);
      setAuthScreen('signup');
      return;
    }
    // Check free tier usage
    if (!subscription.canUseFeature('tastelens')) {
      setShowPaywall(true);
      return;
    }
    subscription.useFeature('tastelens');
    analyzeDish(name, restaurant, city);
  };

  // Gated version for dish buttons (menu scan results)
  const handleAnalyzeDish = (dish: string) => {
    // Require sign-in
    if (!user) {
      setShowProfile(true);
      setAuthScreen('signup');
      return;
    }
    if (!subscription.canUseFeature('tastelens')) {
      setShowPaywall(true);
      return;
    }
    subscription.useFeature('tastelens');
    setDishName(dish);
    analyzeDish(dish, restaurant, city);
  };

  const handleReset = () => {
    reset();
    setDishName('');
    setScanError(null);
    // Keep menuDishes so user can pick another
  };

  const handleClearContext = () => {
    setDishLensContext({});
    reset();
    setDishName('');
    setMenuDishes([]);
    setScanError(null);
  };

  // Resize image on canvas to keep upload small (iPad-safe with memory cleanup)
  const resizeImage = (file: File, maxWidth = 1200): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          try {
            // Cap dimensions to avoid iPad WKWebView canvas memory limits
            const maxPixels = 4096 * 4096;
            let w = img.width;
            let h = img.height;
            if (w * h > maxPixels) {
              const ratio = Math.sqrt(maxPixels / (w * h));
              w = Math.floor(w * ratio);
              h = Math.floor(h * ratio);
            }
            const scale = Math.min(1, maxWidth / w);
            const canvas = document.createElement('canvas');
            canvas.width = Math.floor(w * scale);
            canvas.height = Math.floor(h * scale);
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject(new Error('Canvas not supported')); return; }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            // Free canvas memory immediately (critical on iPad)
            canvas.width = 0;
            canvas.height = 0;
            resolve(dataUrl);
          } catch (err) {
            reject(new Error('Failed to process image. Try a smaller photo.'));
          }
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleMenuScan = async (file: File) => {
    setScanning(true);
    setScanError(null);
    setMenuDishes([]);
    try {
      const base64 = await resizeImage(file);
      const res = await fetch(`${API_URL}/api/dishlens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Scan failed' }));
        throw new Error(data.error || 'Scan failed');
      }
      const data = await res.json();
      if (data.dishes?.length > 0) {
        setMenuDishes(data.dishes);
      } else {
        setScanError('No dishes found. Try a clearer photo of the menu.');
      }
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Failed to scan menu');
    } finally {
      setScanning(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (file) handleMenuScan(file);
    } catch (err) {
      setScanError('Could not access the selected file. Please try again.');
    }
    // Reset so the same file can be selected again
    e.target.value = '';
  };

  const openCamera = () => {
    try { cameraInputRef.current?.click(); }
    catch { setScanError('Camera is not available on this device.'); }
  };

  const openGallery = () => {
    try { galleryInputRef.current?.click(); }
    catch { setScanError('Could not open photo library.'); }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between pt-4 pb-3">
        <div>
          <h2 className="text-xl font-bold text-text-primary m-0 flex items-center gap-2">
            {'\u{1F37D}\u{FE0F}'} TasteLens
          </h2>
          {restaurant ? (
            <p className="text-xs text-accent-amber m-0 mt-0.5 font-medium">{restaurant}</p>
          ) : (
            <p className="text-xs text-text-tertiary m-0 mt-0.5">Scan a menu, type a dish, or explore any food</p>
          )}
        </div>
        {restaurant && (
          <button onClick={handleClearContext}
            className="text-xs text-text-tertiary bg-bg-subtle border border-border-subtle rounded-lg px-3 py-1.5 cursor-pointer">
            Clear restaurant
          </button>
        )}
      </div>

      <div className="pb-4">
        {/* Intro guide for first-time users */}
        {showIntro && !result && !loading && (
          <TasteLensIntro onDismiss={dismissIntro} />
        )}

        {/* Persistent compact hint for returning users */}
        {!showIntro && !result && !loading && !restaurant && menuDishes.length === 0 && (
          <HowToUseHint />
        )}

        {result ? (
          /* Result */
          <ResultCard
            result={result}
            images={images}
            restaurant={restaurant}
            onReset={handleReset}
          />
        ) : (
          /* Input */
          <div>
            {/* Restaurant context banner */}
            {restaurant && (
              <div className="card p-3 mb-3 border border-amber-tint-border15"
                style={{ background: 'linear-gradient(135deg, var(--amber-tint-bg06), var(--bg-subtle))' }}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{'\u{1F4CD}'}</span>
                  <div>
                    <div className="text-sm font-semibold text-text-primary">{restaurant}</div>
                    <div className="text-xs text-text-tertiary">Type any menu item to see it visually</div>
                  </div>
                </div>
              </div>
            )}

            {/* Scan Menu — Camera + Upload (separate inputs for iPad compatibility) */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="mb-3">
              <div className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">
                {'\u{1F4F7}'} Scan a menu
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={openCamera}
                  disabled={scanning || loading}
                  className="card p-3.5 border border-dashed border-amber-tint-border20 cursor-pointer flex flex-col items-center gap-2 text-center"
                  style={{ background: 'linear-gradient(135deg, var(--amber-tint-bg06), var(--bg-subtle))' }}
                >
                  <div className="w-10 h-10 rounded-xl bg-accent-gradient flex items-center justify-center">
                    <span className="text-lg">{'\u{1F4F7}'}</span>
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-text-primary">
                      {scanning ? 'Scanning...' : 'Take Photo'}
                    </div>
                    <div className="text-[11px] text-text-tertiary mt-0.5">
                      Point at a menu
                    </div>
                  </div>
                </button>
                <button
                  onClick={openGallery}
                  disabled={scanning || loading}
                  className="card p-3.5 border border-dashed border-amber-tint-border20 cursor-pointer flex flex-col items-center gap-2 text-center"
                  style={{ background: 'linear-gradient(135deg, var(--amber-tint-bg06), var(--bg-subtle))' }}
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-tint-bg15 border border-amber-tint-border20 flex items-center justify-center">
                    <span className="text-lg">{'\u{1F5BC}\u{FE0F}'}</span>
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-text-primary">
                      {scanning ? 'Scanning...' : 'Upload Photo'}
                    </div>
                    <div className="text-[11px] text-text-tertiary mt-0.5">
                      From your gallery
                    </div>
                  </div>
                </button>
              </div>
              {scanning && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className="w-4 h-4 border-2 border-accent-amber border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-text-tertiary">Reading menu items...</span>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-border-subtle" />
              <span className="text-xs text-text-muted font-medium">OR TYPE A DISH</span>
              <div className="flex-1 h-px bg-border-subtle" />
            </div>

            {/* Scan Error */}
            {scanError && (
              <div className="card p-3 mb-3 border border-red-tint-border bg-red-tint-bg">
                <p className="text-xs text-status-red m-0">{scanError}</p>
              </div>
            )}

            {/* Scanned Menu Dishes */}
            {menuDishes.length > 0 && !loading && !result && (
              <div className="card p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{'\u{1F4CB}'}</span>
                    <span className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                      {menuDishes.length} dishes found
                    </span>
                  </div>
                  <button
                    onClick={() => setMenuDishes([])}
                    className="text-xs text-text-tertiary bg-transparent border-none cursor-pointer underline"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {menuDishes.map(dish => (
                    <button key={dish}
                      onClick={() => handleAnalyzeDish(dish)}
                      className="px-3 py-2 rounded-xl text-xs font-medium border border-amber-tint-border20 bg-amber-tint-bg06 text-text-primary cursor-pointer transition-all active:scale-95"
                    >
                      {dish}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Type a dish */}
            <div className="card p-4 mb-4">
              {restaurant ? (
                <div className="mb-2">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-sm">{'\u{1F4CD}'}</span>
                    <span className="text-[13px] font-semibold text-text-primary">
                      {menuDishes.length > 0 ? 'Or type a dish name' : `What are you ordering at ${restaurant}?`}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-tertiary m-0 ml-6">
                    Type any item from their menu to see what it looks like, calories, allergens & more
                  </p>
                </div>
              ) : (
                <div className="mb-2">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-sm">{'\u{1F50D}'}</span>
                    <span className="text-[13px] font-semibold text-text-primary">
                      {menuDishes.length > 0 ? 'Or type a dish name' : 'Search any dish or food'}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-tertiary m-0 ml-6">
                    Type any food — like "Pad Thai" or "Croissant" — to see what it is, calories, dietary info & more
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={dishName}
                  onChange={e => setDishName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAnalyze(); }}
                  placeholder={restaurant ? 'e.g. Big Mac, Chicken Nuggets...' : 'e.g. Pad Thai, Ramen, Tacos...'}
                  className="input-field flex-1"
                  maxLength={200}
                  autoFocus={menuDishes.length === 0}
                />
                <button onClick={handleAnalyze}
                  disabled={!dishName.trim() || loading}
                  className={`px-4 py-2.5 rounded-xl border-none text-sm font-semibold shrink-0 ${
                    dishName.trim() && !loading
                      ? 'bg-accent-gradient text-text-on-accent cursor-pointer'
                      : 'bg-bg-subtle text-text-muted cursor-not-allowed'
                  }`}>
                  {loading ? '...' : '\u{1F50D}'}
                </button>
              </div>
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex flex-col items-center py-10">
                <div className="text-4xl mb-3 animate-pulse">{'\u{1F37D}\u{FE0F}'}</div>
                <div className="w-12 h-[3px] rounded-sm mb-3 animate-shimmer"
                  style={{ background: 'linear-gradient(90deg, var(--amber-tint-border30) 25%, var(--accent-amber) 50%, var(--amber-tint-border30) 75%)', backgroundSize: '200% 100%' }} />
                <p className="text-sm text-text-tertiary">
                  {restaurant ? `Finding ${dishName} at ${restaurant}...` : 'Analyzing dish...'}
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="card p-4 border border-red-tint-border bg-red-tint-bg">
                <p className="text-sm text-status-red m-0">{error}</p>
                <button onClick={handleAnalyze}
                  className="mt-2 text-xs text-accent-amber bg-transparent border-none cursor-pointer underline">
                  Try Again
                </button>
              </div>
            )}

            {/* Quick suggestions */}
            {!loading && !error && !result && menuDishes.length === 0 && (
              <div className="mt-3">
                <div className="section-label mb-2">
                  {restaurant ? 'Popular items' : 'Try these dishes'}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(restaurant
                    ? ['Burger', 'Fries', 'Chicken Sandwich', 'Milkshake', 'Salad', 'Wings']
                    : ['Pad Thai', 'Ramen', 'Croissant', 'Tacos al Pastor', 'Biryani', 'Pho']
                  ).map(dish => (
                    <button key={dish}
                      onClick={() => handleAnalyzeDish(dish)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border-subtle bg-bg-subtle text-text-secondary cursor-pointer">
                      {dish}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Paywall Modal */}
      {showPaywall && (
        <PaywallModal
          feature="tastelens"
          remaining={subscription.getRemainingUses('tastelens')}
          limit={subscription.getLimit('tastelens')}
          onClose={() => setShowPaywall(false)}
          onUpgrade={subscription.startCheckout}
          requiresAuth={!user}
          onSignIn={() => { setShowPaywall(false); setShowProfile(true); setAuthScreen('signup'); }}
        />
      )}
    </div>
  );
}
