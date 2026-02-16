import { useState, useEffect, useCallback, useMemo, lazy, Suspense, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
import { Routes, Route, useLocation as useRouterLocation, useNavigate, useParams } from 'react-router-dom';
import { track } from '@vercel/analytics';
import { fetchEmailSignups, fetchAllCities, toggleCityActive } from './supabase';
import { hapticSelection } from './utils/haptics';
import type { Place } from './services/places';
import { useLocation as useGeoLocation } from './hooks/useLocation';
import type { AdminSignup } from './types';
import { CITY_COORDS, EMERGENCY_BY_COUNTRY } from './data';

import { AppContext } from './context/AppContext';
import { HomeIcon, DiscoverIcon, EventsIcon, PlanIcon, TasteLensIcon, ShieldIcon, GearIcon, CloseIcon, SearchIcon } from './components/icons';
import { SkeletonCard } from './components/ui';
import Footer from './components/Footer';

// Custom hooks (extracted logic)
import { useAuth } from './hooks/useAuth';
import { useLocationWeather } from './hooks/useLocationWeather';
import { usePlaces } from './hooks/usePlaces';
import { useEvents } from './hooks/useEvents';
import { useTripPlan } from './hooks/useTripPlan';
import { useStopRatings } from './hooks/useStopRatings';
import { useOfflineSave } from './hooks/useOfflineSave';

type Screen = 'home' | 'discover' | 'events' | 'currency' | 'plan' | 'tastelens';

// Lazy-loaded screens & modals
const HomeScreen = lazy(() => import('./screens/HomeScreen'));
const DiscoverScreen = lazy(() => import('./screens/DiscoverScreen'));
const EventsScreen = lazy(() => import('./screens/EventsScreen'));
const CurrencyScreen = lazy(() => import('./screens/CurrencyScreen'));
const PlanScreen = lazy(() => import('./screens/PlanScreen'));
const PlaceDetailModal = lazy(() => import('./components/PlaceDetailModal'));
const ProfileScreen = lazy(() => import('./screens/ProfileScreen'));
const AdminPanel = lazy(() => import('./screens/AdminPanel'));
const AboutScreen = lazy(() => import('./screens/AboutScreen'));
const PrivacyScreen = lazy(() => import('./screens/PrivacyScreen'));
const TermsScreen = lazy(() => import('./screens/TermsScreen'));
const ContactScreen = lazy(() => import('./screens/ContactScreen'));
const CityScreen = lazy(() => import('./screens/CityScreen'));
const ChatBot = lazy(() => import('./components/ChatBot'));
const SharedPlanScreen = lazy(() => import('./screens/SharedPlanScreen'));
const DishLensScreen = lazy(() => import('./screens/DishLensScreen'));

// ============================================================================
// DEEP LINK — /place/:placeId
// ============================================================================

function PlaceDeepLink() {
  const { placeId } = useParams<{ placeId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!placeId) { navigate('/', { replace: true }); return; }
    import('./services/places').then(({ getPlaceDetails }) => {
      getPlaceDetails(placeId).then(place => {
        if (place) {
          // Dispatch a custom event so App can pick it up
          window.dispatchEvent(new CustomEvent('nxstops:deeplink', { detail: place }));
          navigate('/', { replace: true });
        } else {
          setError(true);
          setLoading(false);
        }
      }).catch(() => { setError(true); setLoading(false); });
    });
  }, [placeId, navigate]);

  if (error) {
    return (
      <div className="text-center px-5 py-[60px]">
        <div className="text-[32px] mb-3">😕</div>
        <p className="text-[15px] mb-4">Place not found</p>
        <button onClick={() => navigate('/', { replace: true })}
          className="px-6 py-3 rounded-xl bg-accent-gradient text-[#0C0A09] font-semibold border-none cursor-pointer">
          Go Home
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center px-5 py-20">
        <div className="w-10 h-[3px] rounded-sm mx-auto animate-shimmer" style={{ background: 'linear-gradient(90deg, rgba(232,148,10,0.3) 25%, #E8940A 50%, rgba(232,148,10,0.3) 75%)', backgroundSize: '200% 100%' }} />
        <p className="text-[13px] text-[#A8A29E] mt-4">Loading place...</p>
      </div>
    );
  }

  return null;
}

// ============================================================================
// APP — thin composition shell: hooks + context + router + chrome
// ============================================================================

export default function App() {
  // --- Router integration ---
  const routerLocation = useRouterLocation();
  const navigate = useNavigate();

  const screen = (() => {
    const path = routerLocation.pathname.slice(1) || 'home';
    return (['home', 'discover', 'events', 'currency', 'plan', 'tastelens'].includes(path) ? path : 'home') as Screen;
  })();

  const isInfoPage = ['/about', '/privacy', '/terms', '/contact'].includes(routerLocation.pathname) || routerLocation.pathname.startsWith('/cities/');

  const setScreen = useCallback((s: string) => {
    navigate(s === 'home' ? '/' : `/${s}`);
  }, [navigate]);

  // --- Toast (shared across hooks) ---
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  // --- Geo location hook ---
  const loc = useGeoLocation();

  // --- Compose domain hooks ---
  const auth = useAuth(showToast, () => setScreen('home'));
  const location = useLocationWeather(loc);
  const events = useEvents({ useGps: location.useGps, loc, selectedCity: location.selectedCity, screen });

  // --- UI state (modals, onboarding, offline, time, notifications, admin) ---
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [showSafety, setShowSafety] = useState(false);
  const [showCulture, setShowCulture] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('nxstops_onboarded'));
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(
    () => sessionStorage.getItem('nxstops_notif_dismissed') !== 'true'
  );

  // Global search
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  // PWA install prompt
  const deferredInstallPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // AI Chatbox
  const [showChat, setShowChat] = useState(false);

  // TasteLens context (for navigating to TasteLens tab with restaurant context)
  const [dishLensContext, setDishLensContext] = useState<{ dish?: string; city?: string; restaurant?: string }>({});

  // GDPR consent
  const [showConsent, setShowConsent] = useState(() => !localStorage.getItem('nxstops_consent'));

  // Admin state
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminSignups, setAdminSignups] = useState<AdminSignup[]>([]);
  const [adminCities, setAdminCities] = useState<import('./types').City[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminTab, setAdminTab] = useState<'dashboard' | 'signups' | 'cities' | 'reports' | 'stops'>('dashboard');

  // Check admin status server-side when user changes
  useEffect(() => {
    if (!auth.user) { setIsAdmin(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await (await import('./supabase')).supabase.auth.getSession();
        if (!session?.access_token) return;
        const res = await fetch('/api/admin', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!cancelled && res.ok) {
          const { isAdmin: admin } = await res.json();
          setIsAdmin(admin);
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [auth.user]);

  // Auth gate — opens sign-in if not logged in, returns true if authed
  const requireAuth = useCallback((): boolean => {
    if (auth.user) return true;
    setShowProfile(true);
    return false;
  }, [auth.user]);

  // Places hook (needs selectedPlace, user, citySlug for reviews)
  const places = usePlaces({
    useGps: location.useGps, loc, selectedCity: location.selectedCity,
    searchRadius: location.searchRadius, screen, user: auth.user,
    selectedPlace, citySlug: location.citySlug, useMiles: location.useMiles,
    showToast, weather: location.weather,
  });

  // Trip plan hook
  const trip = useTripPlan({
    useGps: location.useGps, locCity: loc.city, selectedCity: location.selectedCity,
    cityLabel: location.cityLabel, citySlug: location.citySlug, useMiles: location.useMiles,
    showToast, requireAuth,
    lat: location.useGps ? loc.lat : (location.selectedCity ? (location.selectedCity.lat ?? CITY_COORDS[location.selectedCity.name.toLowerCase()]?.lat ?? null) : null),
    lng: location.useGps ? loc.lng : (location.selectedCity ? (location.selectedCity.lng ?? CITY_COORDS[location.selectedCity.name.toLowerCase()]?.lng ?? null) : null),
    weather: location.weather,
    travelGroup: places.travelGroup,
    events: events.events,
  });

  // --- Stop Ratings ---
  const stopRatings = useStopRatings(location.citySlug, auth.user);

  // --- Offline Save ---
  const offlineSave = useOfflineSave(
    trip.tripDays, location.citySlug,
    location.useGps ? loc.lat : (location.selectedCity ? (location.selectedCity.lat ?? CITY_COORDS[location.selectedCity.name.toLowerCase()]?.lat ?? null) : null),
    location.useGps ? loc.lng : (location.selectedCity ? (location.selectedCity.lng ?? CITY_COORDS[location.selectedCity.name.toLowerCase()]?.lng ?? null) : null),
  );

  // --- Reset photo index when selectedPlace changes ---
  useEffect(() => {
    if (selectedPlace) {
      setActivePhotoIndex(0);
      track('view_place_detail', { place: selectedPlace.name, category: selectedPlace.categoryDisplay || '' });
    }
  }, [selectedPlace]);

  // --- UI effects ---
  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  useEffect(() => {
    if (typeof Notification !== 'undefined') setNotificationPermission(Notification.permission);
  }, []);

  useEffect(() => {
    const i = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(i);
  }, []);

  // --- PWA install prompt ---
  useEffect(() => {
    const dismissed = sessionStorage.getItem('nxstops_install_dismissed');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (dismissed || isStandalone) return;
    const handler = (e: Event) => {
      e.preventDefault();
      deferredInstallPrompt.current = e as BeforeInstallPromptEvent;
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallApp = useCallback(async () => {
    const prompt = deferredInstallPrompt.current;
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      track('pwa_installed');
      showToast('App installed!');
    }
    deferredInstallPrompt.current = null;
    setShowInstallBanner(false);
  }, [showToast]);

  const dismissInstallBanner = useCallback(() => {
    setShowInstallBanner(false);
    sessionStorage.setItem('nxstops_install_dismissed', 'true');
  }, []);

  // --- Deep link listener ---
  useEffect(() => {
    const handler = (e: Event) => {
      const place = (e as CustomEvent).detail;
      if (place) setSelectedPlace(place);
    };
    window.addEventListener('nxstops:deeplink', handler);
    return () => window.removeEventListener('nxstops:deeplink', handler);
  }, []);

  // --- UI handlers ---
  const requestNotificationPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return;
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            ...(vapidKey ? { applicationServerKey: vapidKey } : {}),
          });
          import('./supabase').then(({ savePushSubscription }) => {
            savePushSubscription(subscription, location.citySlug).catch(() => {});
          });
        }
        showToast('Notifications enabled!');
      }
    } catch (err) {
      console.error('[NxStops] Notification permission error:', err);
    }
  }, [showToast, location.citySlug]);

  const dismissNotificationPrompt = useCallback(() => {
    setShowNotificationPrompt(false);
    sessionStorage.setItem('nxstops_notif_dismissed', 'true');
  }, []);

  const userName = auth.user?.user_metadata?.full_name
    ? (auth.user.user_metadata.full_name as string).split(' ')[0]
    : null;

  const getGreeting = (): string => {
    const h = currentTime.getHours();
    const name = userName ? `, ${userName}` : '';
    if (h < 12) return `Good morning${name}`;
    if (h < 17) return `Good afternoon${name}`;
    if (h < 21) return `Good evening${name}`;
    return `Good night${name}`;
  };

  const getTimeSuggestion = (): string => {
    const h = currentTime.getHours();
    if (h >= 6 && h < 11) return 'Perfect time for coffee & brunch';
    if (h >= 11 && h < 14) return 'Lunch spots & afternoon vibes';
    if (h >= 14 && h < 17) return 'Explore something new nearby';
    if (h >= 17 && h < 21) return 'Dinner & evening plans await';
    return 'Late night spots still open';
  };

  const getDistanceReference = (): string => {
    if (location.useGps && loc.hasLocation) return 'from you';
    if (location.selectedCity) return `from ${location.selectedCity.name} center`;
    return '';
  };

  const openAdmin = async () => {
    setShowAdmin(true);
    setAdminLoading(true);
    const [signups, allCities] = await Promise.all([fetchEmailSignups(), fetchAllCities()]);
    setAdminSignups(signups as AdminSignup[]);
    setAdminCities(allCities as import('./types').City[]);
    setAdminLoading(false);
  };

  const handleToggleCity = async (cityId: string, isActive: boolean) => {
    const ok = await toggleCityActive(cityId, !isActive);
    if (ok) {
      setAdminCities(prev => prev.map(c => c.id === cityId ? { ...c, is_active: !isActive } : c));
      showToast(`City ${!isActive ? 'activated' : 'deactivated'}`);
    }
  };

  // --------------------------------------------------------------------------
  // CONTEXT VALUE
  // --------------------------------------------------------------------------

  const contextValue = useMemo(() => ({
    // Router / navigation
    screen, setScreen,
    // Location & weather
    ...location,
    // Auth
    ...auth,
    // Places, search, reviews, saved, community
    ...places,
    // Events
    ...events,
    // Trip plan + crew
    ...trip,
    // Stop ratings
    ...stopRatings,
    // Offline save
    saveForOffline: offlineSave.saveForOffline,
    offlineSaved: offlineSave.isSaved,
    offlineSaving: offlineSave.isSaving,
    // UI state
    selectedPlace, setSelectedPlace, activePhotoIndex, setActivePhotoIndex,
    showSafety, setShowSafety,
    showProfile, setShowProfile, showAdmin, setShowAdmin, showCulture, setShowCulture,
    // Helpers
    showToast, getGreeting, getTimeSuggestion, getDistanceReference, currentTime,
    requireAuth,
    // Notifications
    showNotificationPrompt, notificationPermission, requestNotificationPermission, dismissNotificationPrompt,
    // Admin
    adminSignups, adminCities, adminLoading, adminTab, setAdminTab, openAdmin, handleToggleCity,
    // App state
    loading: location.loading, isOffline,
    // Onboarding
    showOnboarding, onboardingStep, setOnboardingStep, setShowOnboarding,
    // DishLens
    dishLensContext, setDishLensContext,
  }), [
    screen, setScreen, location, auth, places, events, trip, stopRatings, offlineSave,
    selectedPlace, activePhotoIndex,
    showSafety, showProfile, showAdmin, showCulture,
    showToast, getGreeting, getTimeSuggestion, getDistanceReference, currentTime, requireAuth,
    showNotificationPrompt, notificationPermission, requestNotificationPermission, dismissNotificationPrompt,
    adminSignups, adminCities, adminLoading, adminTab, openAdmin, handleToggleCity,
    isOffline, showOnboarding, onboardingStep,
    dishLensContext,
  ]);

  // ==========================================================================
  // LOADING SCREEN
  // ==========================================================================

  if (location.loading && location.cities.length === 0) {
    return (
      <div className="font-['DM_Sans',system-ui,sans-serif] bg-bg-body min-h-screen text-text-primary flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl font-bold mb-1 bg-accent-text-gradient bg-clip-text text-transparent">
            NxStops
          </div>
          <div className="text-[11px] text-text-tertiary tracking-[0.1em] uppercase mb-6">
            by Nav&eacute;
          </div>
          <div className="w-10 h-[3px] rounded-sm mx-auto animate-shimmer" style={{
            background: `linear-gradient(90deg, var(--amber-tint-border30) 25%, var(--accent-amber) 50%, var(--amber-tint-border30) 75%)`,
            backgroundSize: '200% 100%',
          }} />
        </div>
      </div>
    );
  }

  // ==========================================================================
  // ONBOARDING
  // ==========================================================================

  if (showOnboarding) {
    return (
      <div className="font-['DM_Sans',system-ui,sans-serif] bg-bg-body min-h-screen text-text-primary flex flex-col items-center justify-center max-w-[430px] mx-auto px-6 py-10">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="text-4xl font-bold mb-1 bg-accent-text-gradient bg-clip-text text-transparent">
            NxStops
          </div>
          <div className="text-[11px] text-text-tertiary tracking-[0.1em] uppercase mb-8">
            by Nav&eacute;
          </div>
          <p className="text-[17px] text-text-secondary leading-relaxed max-w-[300px] mb-2">
            Discover places, plan trips, and explore cities — wherever you are.
          </p>
        </div>
        <div className="w-full">
          <button
            onClick={() => { localStorage.setItem('nxstops_onboarded', 'true'); setShowOnboarding(false); track('onboarding_complete'); }}
            className="w-full p-4 rounded-[14px] border-none bg-accent-gradient text-text-on-accent text-base font-semibold cursor-pointer shadow-[0_4px_20px_var(--amber-tint-shadow)]">
            Get Started
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // MAIN RENDER
  // ==========================================================================

  return (
    <AppContext.Provider value={contextValue}>
      <div className="font-['DM_Sans',system-ui,sans-serif] bg-body-gradient min-h-screen text-text-primary max-w-[430px] mx-auto relative overflow-x-hidden">
        {/* Skip to content link for keyboard users */}
        <a href="#main-content" className="skip-link">Skip to content</a>

        {/* Offline banner */}
        {isOffline && (
          <div className="fixed top-0 left-0 right-0 bg-[#78716C] text-white text-xs text-center p-1.5 z-[9999] animate-offline-banner">
            You're offline — showing cached data
          </div>
        )}

        {/* Header */}
        {!isInfoPage && (
        <header className="sticky top-0 z-40 px-5 py-3 bg-bg-body/95 backdrop-blur-md border-b border-border-subtle/50">
          <div className="flex justify-between items-center">
            {/* Left: Logo + time */}
            <div className="flex items-center gap-3">
              <div>
                <div className="text-[22px] font-bold leading-tight bg-accent-text-gradient bg-clip-text text-transparent">
                  NxStops
                </div>
                <div className="text-[9px] text-text-tertiary tracking-[0.12em] uppercase leading-none mt-0.5">
                  by Nav&eacute;
                </div>
              </div>
              <div className="h-6 w-px bg-border-subtle/60 mx-0.5" />
              <div className="text-right">
                <div className="text-[13px] font-medium text-text-primary leading-tight">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="text-[9px] text-text-tertiary leading-none mt-0.5">
                  {currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
              </div>
            </div>

            {/* Right: Action icons */}
            <div className="flex items-center gap-1">
              <button onClick={() => { setShowGlobalSearch(true); setGlobalSearchQuery(''); }}
                aria-label="Search"
                className="bg-transparent border-none cursor-pointer p-2 rounded-xl min-h-[40px] min-w-[40px] flex items-center justify-center hover:bg-bg-subtle">
                <SearchIcon />
              </button>
              <button onClick={() => setShowSafety(true)}
                aria-label="Travel toolkit"
                className="bg-transparent border-none cursor-pointer p-2 rounded-xl min-h-[40px] min-w-[40px] flex items-center justify-center hover:bg-bg-subtle">
                <ShieldIcon />
              </button>
              {isAdmin && (
                <button onClick={openAdmin}
                  aria-label="Admin settings"
                  className="bg-transparent border-none cursor-pointer p-2 rounded-xl min-h-[40px] min-w-[40px] flex items-center justify-center hover:bg-bg-subtle">
                  <GearIcon />
                </button>
              )}
              <button onClick={() => setShowProfile(true)}
                aria-label="Open profile"
                className={`w-[36px] h-[36px] rounded-full border-2 border-amber-tint-border30 cursor-pointer flex items-center justify-center text-base p-0 text-text-secondary shrink-0 ml-1 ${!auth.user?.user_metadata?.avatar_url ? 'bg-bg-subtle-button' : ''}`}
                style={auth.user?.user_metadata?.avatar_url
                  ? { background: `url(${auth.user.user_metadata.avatar_url}) center/cover no-repeat` }
                  : undefined}>
                {!auth.user?.user_metadata?.avatar_url && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A8A29E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </header>
        )}

        {/* Content — routed screens */}
        <main id="main-content" className={isInfoPage ? 'p-0' : 'px-5 pb-[100px] pt-0'}>
          <Suspense fallback={<><SkeletonCard /><SkeletonCard /><SkeletonCard /></>}>
            <div key={routerLocation.pathname} className="page-enter">
              <Routes>
                <Route path="/" element={<HomeScreen />} />
                <Route path="/discover" element={<DiscoverScreen />} />
                <Route path="/events" element={<EventsScreen />} />
                <Route path="/currency" element={<CurrencyScreen />} />
                <Route path="/tastelens" element={<DishLensScreen />} />
                <Route path="/plan" element={<PlanScreen />} />
                <Route path="/about" element={<AboutScreen />} />
                <Route path="/privacy" element={<PrivacyScreen />} />
                <Route path="/terms" element={<TermsScreen />} />
                <Route path="/contact" element={<ContactScreen />} />
                <Route path="/cities/:slug" element={<CityScreen />} />
                <Route path="/place/:placeId" element={<PlaceDeepLink />} />
                <Route path="/trip/:slug" element={<SharedPlanScreen />} />
                <Route path="*" element={
                  <div className="text-center px-5 py-[60px]">
                    <div className="text-5xl mb-3">🗺️</div>
                    <h2 className="text-xl font-bold mb-2">Page Not Found</h2>
                    <p className="text-text-secondary text-sm mb-5">
                      This page doesn't exist. Let's get you back on track.
                    </p>
                    <button onClick={() => navigate('/', { replace: true })}
                      className="px-7 py-3 rounded-xl bg-accent-gradient text-text-on-accent font-semibold border-none cursor-pointer text-sm">
                      Go Home
                    </button>
                  </div>
                } />
              </Routes>
            </div>
          </Suspense>
          {!isInfoPage && <Footer />}
        </main>

        {/* Bottom Navigation */}
        {!isInfoPage && <nav aria-label="Main navigation" className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-bg-nav backdrop-blur-[24px] border-t border-border-nav flex justify-around pt-2 pb-7">
          {([
            { id: 'home' as Screen, icon: HomeIcon, label: 'Home' },
            { id: 'discover' as Screen, icon: DiscoverIcon, label: 'Discover' },
            { id: 'tastelens' as Screen, icon: TasteLensIcon, label: 'TasteLens' },
            { id: 'events' as Screen, icon: EventsIcon, label: 'Events' },
            { id: 'plan' as Screen, icon: PlanIcon, label: 'Plan' },
          ]).map(tab => {
            const isActive = screen === tab.id;
            const canNavigate = tab.id === 'home' || location.useGps || location.selectedCity;
            return (
              <button
                key={tab.id}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 bg-transparent border-none text-[10px] font-medium px-5 py-2 rounded-xl relative min-h-[48px] ${isActive ? 'text-text-primary' : canNavigate ? 'text-text-tertiary' : 'text-text-disabled'} ${canNavigate ? 'cursor-pointer opacity-100' : 'cursor-default opacity-40'}`}
                onClick={() => { if (canNavigate) { hapticSelection(); setScreen(tab.id); } }}
              >
                {isActive && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[44px] h-[44px] rounded-full pointer-events-none -z-1" style={{ background: 'radial-gradient(circle, rgba(232,148,10,0.2) 0%, transparent 70%)' }} />
                )}
                <tab.icon active={isActive} />
                <span style={{
                  background: isActive ? 'linear-gradient(135deg, #E8940A, #F5A623)' : 'none',
                  WebkitBackgroundClip: isActive ? 'text' : 'unset',
                  WebkitTextFillColor: isActive ? 'transparent' : undefined,
                }}>
                  {tab.label}
                </span>
                {tab.id === 'plan' && trip.totalStops > 0 && (
                  <span className="absolute top-0.5 right-2 bg-accent-gradient text-[#0C0A09] text-[9px] font-bold px-[5px] py-0.5 rounded-lg">
                    {trip.totalStops}
                  </span>
                )}
              </button>
            );
          })}
        </nav>}

        {/* Global Search Overlay */}
        {showGlobalSearch && (() => {
          const q = globalSearchQuery.toLowerCase().trim();
          const cityMatches = q.length >= 1
            ? location.cities.filter(c => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)).slice(0, 5)
            : [];
          const eventMatches = q.length >= 2
            ? events.events.filter(ev =>
                ev.name.toLowerCase().includes(q) ||
                ev.venue?.toLowerCase().includes(q) ||
                ev.category?.toLowerCase().includes(q)
              ).slice(0, 5)
            : [];
          return (
            <div className="fixed inset-0 bg-bg-body z-[200] flex flex-col max-w-[430px] mx-auto">
              {/* Search Header */}
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border-subtle">
                <input
                  autoFocus
                  type="text"
                  placeholder="Search cities, events, places..."
                  value={globalSearchQuery}
                  onChange={e => setGlobalSearchQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && globalSearchQuery.trim()) {
                      track('global_search', { query: globalSearchQuery.trim() });
                      places.setSearchQuery(globalSearchQuery.trim());
                      setShowGlobalSearch(false);
                      setScreen('discover');
                      setTimeout(() => places.handleSearch(), 100);
                    }
                  }}
                  className="flex-1 px-4 py-3.5 rounded-[14px] border border-border-strong bg-bg-subtle text-text-primary text-base outline-none"
                />
                <button
                  onClick={() => setShowGlobalSearch(false)}
                  className="bg-transparent border-none text-text-secondary text-sm font-medium cursor-pointer p-2.5"
                >
                  Cancel
                </button>
              </div>

              {/* Results */}
              <div className="flex-1 overflow-auto px-5 py-3">
                {!q && (
                  <div className="text-center pt-[60px]">
                    <div className="text-[32px] mb-2 opacity-50">&#x1F50D;</div>
                    <p className="text-text-tertiary text-sm">Search for a city, event, or place</p>
                  </div>
                )}

                {/* City Results */}
                {cityMatches.length > 0 && (
                  <div className="mb-5">
                    <div className="section-label">Cities</div>
                    {cityMatches.map(city => (
                      <button
                        key={city.id}
                        onClick={() => {
                          location.setSelectedCity(city);
                          location.setUseGps(false);
                          setShowGlobalSearch(false);
                          setScreen('discover');
                        }}
                        className="flex items-center gap-3 w-full p-3 rounded-xl border-none bg-bg-subtle cursor-pointer text-left mb-1.5"
                      >
                        <div className="w-10 h-10 rounded-[10px] shrink-0 bg-amber-tint-bg10 flex items-center justify-center text-lg">
                          &#x1F30D;
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-text-primary">{city.name}</div>
                          <div className="text-xs text-text-tertiary">{city.country}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Event Results */}
                {eventMatches.length > 0 && (
                  <div className="mb-5">
                    <div className="section-label">Events</div>
                    {eventMatches.map(ev => (
                      <button
                        key={ev.id}
                        onClick={() => {
                          setShowGlobalSearch(false);
                          setScreen('events');
                        }}
                        className="flex items-center gap-3 w-full p-3 rounded-xl border-none bg-bg-subtle cursor-pointer text-left mb-1.5"
                      >
                        <div className="w-10 h-10 rounded-[10px] shrink-0 bg-purple-tint-bg08 flex items-center justify-center text-lg">
                          &#x1F3AB;
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-text-primary whitespace-nowrap overflow-hidden text-ellipsis">{ev.name}</div>
                          <div className="text-xs text-text-tertiary">{ev.venue}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Search Places CTA */}
                {q.length >= 2 && (
                  <button
                    onClick={() => {
                      places.setSearchQuery(globalSearchQuery.trim());
                      setShowGlobalSearch(false);
                      setScreen('discover');
                      setTimeout(() => places.handleSearch(), 100);
                    }}
                    className="flex items-center gap-3 w-full p-3.5 rounded-[14px] cursor-pointer bg-accent-gradient border-none text-text-on-accent text-sm font-semibold"
                  >
                    <SearchIcon color="var(--text-on-accent)" />
                    Search places for &ldquo;{globalSearchQuery.trim()}&rdquo;
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {/* Floating AI Chat Button */}
        {!isInfoPage && !selectedPlace && !showChat && (
          <div className="fixed bottom-[90px] right-[calc(50%-195px)] z-50">
            <button
              onClick={() => setShowChat(true)}
              aria-label="Open AI travel assistant"
              className="w-[52px] h-[52px] rounded-full border-none cursor-pointer text-white text-[22px] flex items-center justify-center shadow-[0_4px_20px_rgba(196,138,90,0.4)]"
              style={{ background: 'linear-gradient(135deg, #C48A5A, #A06830)' }}
              title="AI Travel Assistant"
            >
              {'\u{2728}'}
            </button>
          </div>
        )}

        {/* Place Detail Modal */}
        {selectedPlace && (
          <Suspense fallback={null}>
            <PlaceDetailModal place={selectedPlace} />
          </Suspense>
        )}

        {/* Safety Toolkit Modal */}
        {showSafety && (
          <div className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Travel toolkit"
            onClick={() => setShowSafety(false)}>
            <div className="modal-sheet modal-sheet-body"
              onClick={e => e.stopPropagation()}>
              <div className="px-5 pt-6 pb-10">
                <div className="flex justify-between items-center mb-5">
                  <div>
                    <h2 className="text-xl font-bold mb-0.5">Travel Toolkit</h2>
                    <p className="text-text-tertiary text-xs">Stay connected & informed</p>
                  </div>
                  <button onClick={() => setShowSafety(false)}
                    aria-label="Close travel toolkit"
                    className="bg-transparent border-none text-text-tertiary cursor-pointer p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center">
                    <CloseIcon />
                  </button>
                </div>

                {/* Share My Location */}
                <button
                  onClick={async () => {
                    if (loc.lat && loc.lng) {
                      const url = `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
                      const text = `Here's my current location${loc.city ? ` in ${loc.city}` : ''}`;
                      if (navigator.share) {
                        await navigator.share({ title: 'My Location', text, url });
                      } else {
                        await navigator.clipboard.writeText(`${text}: ${url}`);
                        showToast('Location copied to clipboard');
                      }
                    } else {
                      showToast('Location not available \u{2014} enable GPS');
                    }
                  }}
                  className="card w-full cursor-pointer text-left flex items-center gap-3.5 border border-[rgba(34,197,94,0.15)]"
                  style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.03))' }}
                >
                  <div className="w-[44px] h-[44px] rounded-xl shrink-0 bg-[rgba(34,197,94,0.15)] flex items-center justify-center text-xl">
                    {'\u{1F4CD}'}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-[15px] text-text-primary">Share My Location</div>
                    <div className="text-xs text-text-secondary">Send your GPS pin to someone you trust</div>
                  </div>
                  <div className="text-[#34D399] text-lg">{'\u{2192}'}</div>
                </button>

                {/* Emergency Numbers */}
                {(() => {
                  const country = location.selectedCity?.country || (loc.city ? Object.keys(EMERGENCY_BY_COUNTRY).find(_c => {
                    const cityNames = Object.keys(CITY_COORDS);
                    return cityNames.some(cn => cn.toLowerCase().includes(loc.city?.toLowerCase() || ''));
                  }) : undefined);
                  const nums = country ? EMERGENCY_BY_COUNTRY[country] : null;
                  const displayCountry = location.selectedCity?.country || country || null;

                  return (
                    <div className="card mt-1">
                      <div className="section-label">
                        Emergency Numbers{displayCountry ? ` \u{2014} ${displayCountry}` : ''}
                      </div>
                      {nums ? (
                        <div className="flex gap-2.5">
                          <a href={`tel:${nums.emergency}`}
                            className="flex-1 p-3.5 rounded-xl text-center bg-red-tint-bg border border-red-tint-border text-status-red no-underline font-semibold text-base">
                            <div className="text-[11px] text-text-secondary font-normal mb-1">Emergency</div>
                            {nums.emergency}
                          </a>
                          <a href={`tel:${nums.police}`}
                            className="flex-1 p-3.5 rounded-xl text-center bg-[rgba(96,165,250,0.1)] border border-[rgba(96,165,250,0.15)] text-[#93C5FD] no-underline font-semibold text-base">
                            <div className="text-[11px] text-text-secondary font-normal mb-1">Police</div>
                            {nums.police}
                          </a>
                        </div>
                      ) : (
                        <p className="text-text-secondary text-[13px]">Select a city to see local emergency numbers</p>
                      )}
                    </div>
                  );
                })()}

                {/* Travel Tips */}
                <div className="card mt-1">
                  <div className="section-label">
                    Quick Tips
                  </div>
                  {[
                    { icon: '\u{1F50B}', tip: 'Keep your phone charged \u{2014} you\'ll need it for maps & rides' },
                    { icon: '\u{1F4F1}', tip: 'Download offline maps before heading out' },
                    { icon: '\u{1F3E8}', tip: 'Save your accommodation address \u{2014} show it to taxi drivers' },
                    { icon: '\u{1F4B3}', tip: 'Keep a small amount of local cash for emergencies' },
                    { icon: '\u{1F319}', tip: 'Stick to well-lit, busy streets at night' },
                    { icon: '\u{1F465}', tip: 'Look for places with lots of reviews \u{2014} popular spots are usually welcoming' },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-2.5 py-2" style={{ borderBottom: i < 5 ? '1px solid var(--bg-subtle-medium)' : 'none' }}>
                      <span className="text-base shrink-0">{item.icon}</span>
                      <span className="text-[13px] text-text-body leading-snug">{item.tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profile Screen */}
        {showProfile && (
          <Suspense fallback={null}>
            <ProfileScreen />
          </Suspense>
        )}

        {/* Admin Panel */}
        {showAdmin && (
          <Suspense fallback={null}>
            <AdminPanel />
          </Suspense>
        )}

        {/* AI Chatbox */}
        {showChat && (
          <Suspense fallback={null}>
            <ChatBot
              city={location.cityLabel || null}
              onClose={() => setShowChat(false)}
            />
          </Suspense>
        )}

        {/* TasteLens is now a routed tab screen — see /tastelens route above */}

        {/* PWA Install Banner */}
        {showInstallBanner && (
          <div className="fixed bottom-[90px] left-1/2 -translate-x-1/2 max-w-[400px] w-[calc(100%-40px)] bg-bg-surface border border-amber-tint-border30 rounded-2xl p-4 z-[250] shadow-[0_8px_30px_rgba(0,0,0,0.4)] animate-toast-in flex items-center gap-3">
            <div className="w-[44px] h-[44px] rounded-xl shrink-0 bg-accent-gradient flex items-center justify-center text-xl text-[#0C0A09] font-bold">
              N
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-text-primary">Add NxStops to Home Screen</div>
              <div className="text-xs text-text-secondary">Quick access, works offline</div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button onClick={dismissInstallBanner}
                className="px-3 py-2 rounded-[10px] bg-transparent border border-border-medium text-text-tertiary text-xs cursor-pointer">
                Later
              </button>
              <button onClick={handleInstallApp}
                className="px-3.5 py-2 rounded-[10px] bg-accent-gradient border-none text-[#0C0A09] text-xs font-semibold cursor-pointer">
                Install
              </button>
            </div>
          </div>
        )}

        {/* GDPR Consent Banner */}
        {showConsent && (
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 max-w-[430px] w-full bg-bg-surface border-t border-border-subtle px-5 py-4 z-[260] animate-slide-up">
            <p className="text-[13px] text-text-secondary leading-normal mb-3">
              We use cookies and location data to improve your experience. By continuing, you agree to our{' '}
              <a href="/privacy" className="text-accent-amber underline">Privacy Policy</a> and{' '}
              <a href="/terms" className="text-accent-amber underline">Terms</a>.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { localStorage.setItem('nxstops_consent', 'true'); setShowConsent(false); }}
                className="flex-1 p-3 rounded-xl border-none bg-accent-gradient text-[#0C0A09] text-sm font-semibold cursor-pointer">
                Accept
              </button>
              <button
                onClick={() => { localStorage.setItem('nxstops_consent', 'minimal'); setShowConsent(false); }}
                className="px-4 py-3 rounded-xl bg-transparent border border-border-medium text-text-secondary text-[13px] cursor-pointer">
                Essential only
              </button>
            </div>
          </div>
        )}

        {/* Toast */}
        <div aria-live="polite" aria-atomic="true" className={`fixed bottom-[100px] left-1/2 -translate-x-1/2 z-[300] ${toast ? 'pointer-events-auto' : 'pointer-events-none'}`}>
          {toast && (
            <div className={`backdrop-blur-[20px] rounded-xl px-5 py-3 text-sm font-medium animate-toast-in shadow-[0_8px_30px_rgba(0,0,0,0.3)] flex items-center gap-2 ${toast.type === 'error' ? 'bg-red-tint-bg border border-red-tint-border text-status-red' : 'bg-bg-toast border border-amber-tint-border20 text-text-primary'}`}>
              {toast.msg}
              <button onClick={() => setToast(null)}
                aria-label="Dismiss"
                className="bg-transparent border-none text-inherit cursor-pointer p-1 text-base leading-none opacity-60">
                ✕
              </button>
            </div>
          )}
        </div>
      </div>
    </AppContext.Provider>
  );
}
