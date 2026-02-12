import { useState, useEffect, useCallback, useMemo, lazy, Suspense, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
import { Routes, Route, useLocation as useRouterLocation, useNavigate, useParams } from 'react-router-dom';
import { track } from '@vercel/analytics';
import { fetchEmailSignups, fetchAllCities, toggleCityActive } from './supabase';
import { formatDistance } from './services/places';
import type { Place } from './services/places';
import { useLocation as useGeoLocation } from './hooks/useLocation';
import type { AdminSignup, BudgetTier } from './types';
import { CITY_COORDS, EMERGENCY_BY_COUNTRY, ADMIN_EMAIL } from './data';
import { filterBudgetAwarePlaces } from './utils/surpriseFilter';
import { getCardStyle } from './styles/shared';
import { AppContext } from './context/AppContext';
import { useTheme } from './context/ThemeContext';
import { HomeIcon, DiscoverIcon, EventsIcon, PlanIcon, ShieldIcon, GearIcon, CloseIcon, SearchIcon } from './components/icons';
import { SkeletonCard } from './components/ui';
import Footer from './components/Footer';

// Custom hooks (extracted logic)
import { useAuth } from './hooks/useAuth';
import { useLocationWeather } from './hooks/useLocationWeather';
import { usePlaces } from './hooks/usePlaces';
import { useEvents } from './hooks/useEvents';
import { useTripPlan } from './hooks/useTripPlan';

type Screen = 'home' | 'discover' | 'events' | 'plan';

// Lazy-loaded screens & modals
const HomeScreen = lazy(() => import('./screens/HomeScreen'));
const DiscoverScreen = lazy(() => import('./screens/DiscoverScreen'));
const EventsScreen = lazy(() => import('./screens/EventsScreen'));
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
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>😕</div>
        <p style={{ fontSize: '15px', marginBottom: '16px' }}>Place not found</p>
        <button onClick={() => navigate('/', { replace: true })}
          style={{ padding: '12px 24px', borderRadius: '12px', background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#0C0A09', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
          Go Home
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ width: '40px', height: '3px', borderRadius: '2px', margin: '0 auto', background: 'linear-gradient(90deg, rgba(245,158,11,0.3) 25%, #F59E0B 50%, rgba(245,158,11,0.3) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
        <p style={{ fontSize: '13px', color: '#A8A29E', marginTop: '16px' }}>Loading place...</p>
      </div>
    );
  }

  return null;
}

// ============================================================================
// APP — thin composition shell: hooks + context + router + chrome
// ============================================================================

export default function App() {
  const { theme } = useTheme();
  const cardStyle = getCardStyle(theme);

  // --- Router integration ---
  const routerLocation = useRouterLocation();
  const navigate = useNavigate();

  const screen = (() => {
    const path = routerLocation.pathname.slice(1) || 'home';
    return (['home', 'discover', 'events', 'plan'].includes(path) ? path : 'home') as Screen;
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
  const [surprisePlace, setSurprisePlace] = useState<Place | null>(null);
  const [surprisePlaces, setSurprisePlaces] = useState<Place[]>([]);
  const [showBudgetPicker, setShowBudgetPicker] = useState(false);
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

  // GDPR consent
  const [showConsent, setShowConsent] = useState(() => !localStorage.getItem('nxstops_consent'));

  // Admin state
  const [adminSignups, setAdminSignups] = useState<AdminSignup[]>([]);
  const [adminCities, setAdminCities] = useState<import('./types').City[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminTab, setAdminTab] = useState<'dashboard' | 'signups' | 'cities'>('dashboard');

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
    showToast,
  });

  // Trip plan hook
  const trip = useTripPlan({
    useGps: location.useGps, locCity: loc.city, selectedCity: location.selectedCity,
    cityLabel: location.cityLabel, citySlug: location.citySlug, useMiles: location.useMiles,
    showToast, requireAuth,
  });

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
          await registration.pushManager.subscribe({ userVisibleOnly: true });
        }
        showToast('Notifications enabled!');
      }
    } catch (err) {
      console.error('[NxStops] Notification permission error:', err);
    }
  }, [showToast]);

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

  const handleSurpriseMe = (budgetTier?: BudgetTier) => {
    if (!auth.user) { setShowProfile(true); return; }
    if (!budgetTier) {
      setShowBudgetPicker(true);
      return;
    }
    // If a burn rate is set, use budget-aware filtering
    if (trip.activeDayBudget > 0 && trip.budgetRemaining < Infinity) {
      const results = filterBudgetAwarePlaces(
        places.places,
        trip.budgetRemaining,
        places.selectedVibe,
      );
      if (results.length > 0) {
        setSurprisePlaces(results);
        setShowBudgetPicker(false);
        track('surprise_me', { budget: budgetTier, burnRate: String(trip.activeDayBudget) });
        return;
      }
    }
    const results = places.handleSurpriseMe(budgetTier);
    if (results.length > 0) {
      setSurprisePlaces(results);
      setShowBudgetPicker(false);
      track('surprise_me', { budget: budgetTier, count: String(results.length) });
    }
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
    // UI state
    selectedPlace, setSelectedPlace, activePhotoIndex, setActivePhotoIndex,
    surprisePlace, setSurprisePlace, surprisePlaces, setSurprisePlaces,
    showBudgetPicker, setShowBudgetPicker,
    showSafety, setShowSafety,
    showProfile, setShowProfile, showAdmin, setShowAdmin, showCulture, setShowCulture,
    // Helpers
    showToast, getGreeting, getTimeSuggestion, getDistanceReference, currentTime,
    handleSurpriseMe, requireAuth,
    // Notifications
    showNotificationPrompt, notificationPermission, requestNotificationPermission, dismissNotificationPrompt,
    // Admin
    adminSignups, adminCities, adminLoading, adminTab, setAdminTab, openAdmin, handleToggleCity,
    // App state
    loading: location.loading, isOffline,
    // Onboarding
    showOnboarding, onboardingStep, setOnboardingStep, setShowOnboarding,
  }), [
    screen, setScreen, location, auth, places, events, trip,
    selectedPlace, activePhotoIndex, surprisePlace, surprisePlaces, showBudgetPicker,
    showSafety, showProfile, showAdmin, showCulture,
    showToast, getGreeting, getTimeSuggestion, getDistanceReference, currentTime, handleSurpriseMe, requireAuth,
    showNotificationPrompt, notificationPermission, requestNotificationPermission, dismissNotificationPrompt,
    adminSignups, adminCities, adminLoading, adminTab, openAdmin, handleToggleCity,
    isOffline, showOnboarding, onboardingStep,
  ]);

  // ==========================================================================
  // LOADING SCREEN
  // ==========================================================================

  if (location.loading && location.cities.length === 0) {
    return (
      <div style={{
        fontFamily: "'DM Sans', system-ui, sans-serif",
        background: theme.bg.body, minHeight: '100vh', color: theme.text.primary,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '36px', fontWeight: 700, marginBottom: '4px',
            background: theme.accent.amberTextGradient,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            NxStops
          </div>
          <div style={{ fontSize: '11px', color: theme.text.tertiary, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '24px' }}>
            by Nav&eacute;
          </div>
          <div style={{
            width: '40px', height: '3px', borderRadius: '2px', margin: '0 auto',
            background: `linear-gradient(90deg, ${theme.amberTint.border30} 25%, ${theme.accent.amber} 50%, ${theme.amberTint.border30} 75%)`,
            backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
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
      <div style={{
        fontFamily: "'DM Sans', system-ui, sans-serif",
        background: theme.bg.body, minHeight: '100vh', color: theme.text.primary,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        maxWidth: '430px', margin: '0 auto', padding: '40px 24px',
      }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{
            fontSize: '36px', fontWeight: 700, marginBottom: '4px',
            background: theme.accent.amberTextGradient,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            NxStops
          </div>
          <div style={{ fontSize: '11px', color: theme.text.tertiary, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '32px' }}>
            by Nav&eacute;
          </div>
          <p style={{ fontSize: '17px', color: theme.text.secondary, lineHeight: 1.6, maxWidth: '300px', marginBottom: '8px' }}>
            Discover places, plan trips, and explore cities — wherever you are.
          </p>
        </div>
        <div style={{ width: '100%' }}>
          <button
            onClick={() => { localStorage.setItem('nxstops_onboarded', 'true'); setShowOnboarding(false); track('onboarding_complete'); }}
            style={{
              width: '100%', padding: '16px', borderRadius: '14px', border: 'none',
              background: theme.accent.amberGradient,
              color: theme.text.onAccent, fontSize: '16px', fontWeight: 600, cursor: 'pointer',
              boxShadow: `0 4px 20px ${theme.amberTint.shadow}`,
            }}>
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
      <div style={{
        fontFamily: "'DM Sans', system-ui, sans-serif",
        background: theme.bg.bodyGradient,
        minHeight: '100vh', color: theme.text.primary,
        maxWidth: '430px', margin: '0 auto', position: 'relative', overflow: 'hidden',
      }}>
        {/* Animations */}
        <style>{`
          @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
          @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
          @keyframes toastIn { from { opacity: 0; transform: translateY(16px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
          @keyframes offlineBannerIn { from { opacity: 0; transform: translateY(-100%); } to { opacity: 1; transform: translateY(0); } }
          .modal-sheet { animation: slideUp 0.3s ease-out; }
          .modal-backdrop { animation: fadeIn 0.2s ease-out; }
          .photo-gallery-scroll::-webkit-scrollbar { display: none; }
          *:focus-visible { outline: 2px solid #F59E0B; outline-offset: 2px; }
          button:focus-visible { outline: 2px solid #F59E0B; outline-offset: 2px; }
          a:focus-visible { outline: 2px solid #F59E0B; outline-offset: 2px; }
          input:focus-visible { outline: 2px solid #F59E0B; outline-offset: 2px; }
          .skip-link { position: absolute; top: -100px; left: 16px; z-index: 10000; padding: 12px 24px; background: #F59E0B; color: #0C0A09; font-weight: 700; font-size: 14px; border-radius: 0 0 12px 12px; text-decoration: none; transition: top 0.2s; }
          .skip-link:focus { top: 0; }
          @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
          }
        `}</style>

        {/* Skip to content link for keyboard users */}
        <a href="#main-content" className="skip-link">Skip to content</a>

        {/* Offline banner */}
        {isOffline && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0,
            background: '#78716C', color: '#FFFFFF',
            fontSize: '12px', textAlign: 'center', padding: '6px',
            zIndex: 9999, animation: 'offlineBannerIn 0.3s ease-out',
          }}>
            You're offline — showing cached data
          </div>
        )}

        {/* Header */}
        {!isInfoPage && (
        <header style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{
              fontSize: '22px', fontWeight: 700,
              background: theme.accent.amberTextGradient,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              NxStops
            </div>
            <div style={{ fontSize: '10px', color: theme.text.tertiary, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              by Nav&eacute;
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14px', color: theme.text.primary }}>
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div style={{ fontSize: '10px', color: theme.text.tertiary }}>
                {currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
            </div>
            <button onClick={() => { setShowGlobalSearch(true); setGlobalSearchQuery(''); }}
              aria-label="Search"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px', borderRadius: '10px', minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SearchIcon />
            </button>
            <button onClick={() => setShowSafety(true)}
              aria-label="Travel toolkit"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px', borderRadius: '10px', minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldIcon />
            </button>
            {auth.user?.email === ADMIN_EMAIL && (
              <button onClick={openAdmin}
                aria-label="Admin settings"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px', borderRadius: '10px', minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GearIcon />
              </button>
            )}
            <button onClick={() => setShowProfile(true)}
              aria-label="Open profile"
              style={{
                width: '44px', height: '44px', borderRadius: '50%', border: `2px solid ${theme.amberTint.border30}`,
                background: auth.user?.user_metadata?.avatar_url
                  ? `url(${auth.user.user_metadata.avatar_url}) center/cover no-repeat`
                  : theme.bg.subtleButton,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px', padding: 0, color: theme.text.secondary, flexShrink: 0,
              }}>
              {!auth.user?.user_metadata?.avatar_url && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A8A29E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )}
            </button>
          </div>
        </header>
        )}

        {/* Content — routed screens */}
        <main id="main-content" style={{ padding: isInfoPage ? '0' : '0 20px 100px' }}>
          <Suspense fallback={<><SkeletonCard /><SkeletonCard /><SkeletonCard /></>}>
            <div key={routerLocation.pathname} className="page-enter">
              <Routes>
                <Route path="/" element={<HomeScreen />} />
                <Route path="/discover" element={<DiscoverScreen />} />
                <Route path="/events" element={<EventsScreen />} />
                <Route path="/plan" element={<PlanScreen />} />
                <Route path="/about" element={<AboutScreen />} />
                <Route path="/privacy" element={<PrivacyScreen />} />
                <Route path="/terms" element={<TermsScreen />} />
                <Route path="/contact" element={<ContactScreen />} />
                <Route path="/cities/:slug" element={<CityScreen />} />
                <Route path="/place/:placeId" element={<PlaceDeepLink />} />
                <Route path="*" element={
                  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>🗺️</div>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Page Not Found</h2>
                    <p style={{ color: theme.text.secondary, fontSize: '14px', marginBottom: '20px' }}>
                      This page doesn't exist. Let's get you back on track.
                    </p>
                    <button onClick={() => navigate('/', { replace: true })}
                      style={{ padding: '12px 28px', borderRadius: '12px', background: theme.accent.amberGradient, color: theme.text.onAccent, fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: '14px' }}>
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
        {!isInfoPage && <nav aria-label="Main navigation" style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: '430px',
          background: theme.bg.nav, backdropFilter: 'blur(24px)',
          borderTop: `1px solid ${theme.border.nav}`,
          display: 'flex', justifyContent: 'space-around',
          padding: '8px 0 28px',
        }}>
          {([
            { id: 'home' as Screen, icon: HomeIcon, label: 'Home' },
            { id: 'discover' as Screen, icon: DiscoverIcon, label: 'Discover' },
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
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                  background: 'none', border: 'none',
                  color: isActive ? theme.text.primary : canNavigate ? theme.text.tertiary : theme.text.disabled,
                  fontSize: '10px', fontWeight: 500, cursor: canNavigate ? 'pointer' : 'default',
                  padding: '8px 20px', borderRadius: '12px', position: 'relative',
                  opacity: canNavigate ? 1 : 0.4, minHeight: '48px',
                }}
                onClick={() => canNavigate && setScreen(tab.id)}
              >
                {isActive && (
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '44px', height: '44px',
                    background: 'radial-gradient(circle, rgba(245,158,11,0.2) 0%, transparent 70%)',
                    borderRadius: '50%', pointerEvents: 'none', zIndex: -1,
                  }} />
                )}
                <tab.icon active={isActive} />
                <span style={{
                  background: isActive ? 'linear-gradient(135deg, #F59E0B, #FBBF24)' : 'none',
                  WebkitBackgroundClip: isActive ? 'text' : 'unset',
                  WebkitTextFillColor: isActive ? 'transparent' : undefined,
                }}>
                  {tab.label}
                </span>
                {tab.id === 'plan' && trip.totalStops > 0 && (
                  <span style={{
                    position: 'absolute', top: '2px', right: '8px',
                    background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                    color: '#0C0A09', fontSize: '9px', fontWeight: 700,
                    padding: '2px 5px', borderRadius: '8px',
                  }}>
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
            <div
              style={{
                position: 'fixed', inset: 0, background: theme.bg.body, zIndex: 200,
                display: 'flex', flexDirection: 'column', maxWidth: '430px', margin: '0 auto',
              }}
            >
              {/* Search Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', borderBottom: `1px solid ${theme.border.subtle}` }}>
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
                  style={{
                    flex: 1, padding: '14px 16px', borderRadius: '14px',
                    border: `1px solid ${theme.border.strong}`, background: theme.bg.subtle,
                    color: theme.text.primary, fontSize: '16px', outline: 'none',
                  }}
                />
                <button
                  onClick={() => setShowGlobalSearch(false)}
                  style={{
                    background: 'none', border: 'none', color: theme.text.secondary,
                    fontSize: '14px', fontWeight: 500, cursor: 'pointer', padding: '10px',
                  }}
                >
                  Cancel
                </button>
              </div>

              {/* Results */}
              <div style={{ flex: 1, overflow: 'auto', padding: '12px 20px' }}>
                {!q && (
                  <div style={{ textAlign: 'center', paddingTop: '60px' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.5 }}>&#x1F50D;</div>
                    <p style={{ color: theme.text.tertiary, fontSize: '14px' }}>Search for a city, event, or place</p>
                  </div>
                )}

                {/* City Results */}
                {cityMatches.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '11px', color: theme.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Cities</div>
                    {cityMatches.map(city => (
                      <button
                        key={city.id}
                        onClick={() => {
                          location.setSelectedCity(city);
                          location.setUseGps(false);
                          setShowGlobalSearch(false);
                          setScreen('discover');
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px', width: '100%',
                          padding: '12px', borderRadius: '12px', border: 'none',
                          background: theme.bg.subtle, cursor: 'pointer', textAlign: 'left',
                          marginBottom: '6px',
                        }}
                      >
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                          background: theme.amberTint.bg10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '18px',
                        }}>
                          &#x1F30D;
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: theme.text.primary }}>{city.name}</div>
                          <div style={{ fontSize: '12px', color: theme.text.tertiary }}>{city.country}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Event Results */}
                {eventMatches.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '11px', color: theme.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Events</div>
                    {eventMatches.map(ev => (
                      <button
                        key={ev.id}
                        onClick={() => {
                          setShowGlobalSearch(false);
                          setScreen('events');
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px', width: '100%',
                          padding: '12px', borderRadius: '12px', border: 'none',
                          background: theme.bg.subtle, cursor: 'pointer', textAlign: 'left',
                          marginBottom: '6px',
                        }}
                      >
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                          background: theme.purpleTint.bg08, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '18px',
                        }}>
                          &#x1F3AB;
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: theme.text.primary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.name}</div>
                          <div style={{ fontSize: '12px', color: theme.text.tertiary }}>{ev.venue}</div>
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
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', width: '100%',
                      padding: '14px', borderRadius: '14px', cursor: 'pointer',
                      background: theme.accent.amberGradient, border: 'none',
                      color: theme.text.onAccent, fontSize: '14px', fontWeight: 600,
                    }}
                  >
                    <SearchIcon color={theme.text.onAccent} />
                    Search places for &ldquo;{globalSearchQuery.trim()}&rdquo;
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {/* Floating Action Buttons */}
        {!isInfoPage && !selectedPlace && !showBudgetPicker && !surprisePlaces.length && !showChat && (
          <div style={{
            position: 'fixed', bottom: '90px', right: 'calc(50% - 195px)',
            display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 50,
          }}>
            {/* Surprise Me (Discover only) */}
            {screen === 'discover' && places.places.length > 0 && (
              <button
                onClick={() => handleSurpriseMe()}
                aria-label="Surprise me with a random place"
                style={{
                  width: '52px', height: '52px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                  border: 'none', cursor: 'pointer', color: '#0C0A09',
                  fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 20px rgba(245,158,11,0.4)',
                }}
                title="Surprise Me"
              >
                {'\u{1F3B2}'}
              </button>
            )}
            {/* AI Chat Button */}
            <button
              onClick={() => setShowChat(true)}
              aria-label="Open AI travel assistant"
              style={{
                width: '52px', height: '52px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
                border: 'none', cursor: 'pointer', color: '#FFFFFF',
                fontSize: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(139,92,246,0.4)',
              }}
              title="AI Travel Assistant"
            >
              {'\u{2728}'}
            </button>
          </div>
        )}

        {/* Budget Picker Bottom Sheet */}
        {showBudgetPicker && (
          <div className="modal-backdrop"
            role="dialog" aria-modal="true" aria-label="Pick your budget"
            style={{ position: 'fixed', inset: 0, background: theme.bg.modalOverlay, zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
            onClick={() => setShowBudgetPicker(false)}>
            <div className="modal-sheet"
              style={{ background: theme.bg.surface, borderRadius: '24px 24px 0 0', maxWidth: '430px', width: '100%', padding: '24px 20px 40px', border: `1px solid ${theme.border.subtle}`, borderBottom: 'none' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>{'\u{1F3B2}'}</div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>Surprise Me</h2>
                <p style={{ color: theme.text.secondary, fontSize: '13px' }}>Pick a budget and we'll find 3 surprise spots</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                {([
                  { tier: 'any' as BudgetTier, label: 'Any', desc: 'All prices' },
                  { tier: 'free' as BudgetTier, label: 'Free', desc: 'No cost' },
                  { tier: '$' as BudgetTier, label: '$', desc: 'Budget' },
                  { tier: '$$' as BudgetTier, label: '$$', desc: 'Moderate' },
                  { tier: '$$$' as BudgetTier, label: '$$$', desc: 'Upscale' },
                  { tier: '$$$$' as BudgetTier, label: '$$$$', desc: 'Luxury' },
                ]).map(opt => (
                  <button key={opt.tier}
                    onClick={() => handleSurpriseMe(opt.tier)}
                    style={{
                      padding: '16px 8px', borderRadius: '14px', border: `1px solid ${theme.border.strong}`,
                      background: theme.bg.subtle, cursor: 'pointer', textAlign: 'center',
                    }}>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: theme.accent.amber, marginBottom: '2px' }}>{opt.label}</div>
                    <div style={{ fontSize: '11px', color: theme.text.tertiary }}>{opt.desc}</div>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowBudgetPicker(false)}
                style={{ width: '100%', padding: '12px', marginTop: '16px', background: 'none', border: 'none', color: theme.text.tertiary, fontSize: '14px', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Surprise Me 3-Card Modal */}
        {surprisePlaces.length > 0 && (
          <div className="modal-backdrop"
            role="dialog" aria-modal="true" aria-label="Surprise place recommendations"
            style={{ position: 'fixed', inset: 0, background: theme.bg.modalOverlay, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
            onClick={() => setSurprisePlaces([])}>
            <div className="modal-sheet"
              style={{ background: theme.bg.surface, borderRadius: '20px', maxWidth: '400px', width: '100%', overflow: 'hidden', border: `1px solid ${theme.amberTint.border20}`, maxHeight: '85vh', overflowY: 'auto' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '14px', color: theme.accent.amber, marginBottom: '4px', fontWeight: 500 }}>{'\u{1F3B2}'} Surprise!</div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>We picked {surprisePlaces.length} for you</h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                  {surprisePlaces.map((sp, i) => (
                    <div key={sp.placeId} style={{
                      ...cardStyle, marginBottom: 0, overflow: 'hidden',
                      border: `1px solid ${theme.amberTint.border20}`,
                    }}>
                      {sp.photoUrl && (
                        <div style={{ height: '120px', width: '100%', position: 'relative', overflow: 'hidden', borderRadius: '12px 12px 0 0', margin: '-16px -16px 12px' }}>
                          <img src={sp.photoUrl} alt={sp.name} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          <div style={{ position: 'absolute', top: '8px', left: '8px', background: theme.accent.amberGradient, color: '#0C0A09', fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: '8px' }}>
                            #{i + 1}
                          </div>
                        </div>
                      )}
                      <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>{sp.name}</h3>
                      <p style={{ color: theme.text.secondary, fontSize: '12px', marginBottom: '4px' }}>
                        {sp.categoryDisplay}
                        {sp.priceLevel > 0 && ` · ${'$'.repeat(sp.priceLevel)}`}
                        {sp.distance != null && ` · ${formatDistance(sp.distance, location.useMiles)}`}
                      </p>
                      {sp.rating > 0 && (
                        <p style={{ color: theme.accent.amber, fontSize: '13px', marginBottom: '10px' }}>
                          {'\u{2605}'} {sp.rating.toFixed(1)} ({sp.reviewCount})
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => { trip.addToPlan(sp); showToast(`Added ${sp.name}`); }}
                          style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: theme.accent.amberGradient, color: '#0C0A09', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                          + Add
                        </button>
                        <button
                          onClick={() => { setSurprisePlaces([]); setSelectedPlace(sp); }}
                          style={{ flex: 1, padding: '10px', borderRadius: '10px', border: `1px solid ${theme.border.strong}`, background: 'transparent', color: theme.text.secondary, fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                          Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => { setSurprisePlaces([]); handleSurpriseMe(); }}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', marginTop: '16px', background: 'none', border: `1px solid ${theme.border.strong}`, color: theme.text.secondary, fontSize: '13px', cursor: 'pointer' }}>
                  {'\u{1F3B2}'} Try different budget
                </button>
                <button
                  onClick={() => setSurprisePlaces([])}
                  style={{ width: '100%', padding: '10px', marginTop: '8px', background: 'none', border: 'none', color: theme.text.tertiary, fontSize: '13px', cursor: 'pointer' }}>
                  Close
                </button>
              </div>
            </div>
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
          <div className="modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label="Travel toolkit"
            style={{ position: 'fixed', inset: 0, background: theme.bg.modalOverlay, zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
            onClick={() => setShowSafety(false)}>
            <div className="modal-sheet"
              style={{ background: theme.bg.surface, borderRadius: '24px 24px 0 0', maxWidth: '430px', width: '100%', maxHeight: '85vh', overflow: 'auto', border: `1px solid ${theme.border.subtle}`, borderBottom: 'none' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ padding: '24px 20px 40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '2px' }}>Travel Toolkit</h2>
                    <p style={{ color: theme.text.tertiary, fontSize: '12px' }}>Stay connected & informed</p>
                  </div>
                  <button onClick={() => setShowSafety(false)}
                    aria-label="Close travel toolkit"
                    style={{ background: 'none', border: 'none', color: theme.text.tertiary, cursor: 'pointer', padding: '10px', minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                  style={{
                    ...cardStyle, width: '100%', cursor: 'pointer', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: '14px',
                    background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.03))',
                    border: '1px solid rgba(34,197,94,0.15)',
                  }}
                >
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                    background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '20px',
                  }}>
                    {'\u{1F4CD}'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: theme.text.primary }}>Share My Location</div>
                    <div style={{ fontSize: '12px', color: theme.text.secondary }}>Send your GPS pin to someone you trust</div>
                  </div>
                  <div style={{ color: '#34D399', fontSize: '18px' }}>{'\u{2192}'}</div>
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
                    <div style={{ ...cardStyle, marginTop: '4px' }}>
                      <div style={{ fontSize: '11px', color: theme.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
                        Emergency Numbers{displayCountry ? ` \u{2014} ${displayCountry}` : ''}
                      </div>
                      {nums ? (
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <a href={`tel:${nums.emergency}`}
                            style={{
                              flex: 1, padding: '14px', borderRadius: '12px', textAlign: 'center',
                              background: theme.redTint.bg, border: `1px solid ${theme.redTint.border}`,
                              color: theme.status.red, textDecoration: 'none', fontWeight: 600, fontSize: '16px',
                            }}>
                            <div style={{ fontSize: '11px', color: theme.text.secondary, fontWeight: 400, marginBottom: '4px' }}>Emergency</div>
                            {nums.emergency}
                          </a>
                          <a href={`tel:${nums.police}`}
                            style={{
                              flex: 1, padding: '14px', borderRadius: '12px', textAlign: 'center',
                              background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.15)',
                              color: '#93C5FD', textDecoration: 'none', fontWeight: 600, fontSize: '16px',
                            }}>
                            <div style={{ fontSize: '11px', color: theme.text.secondary, fontWeight: 400, marginBottom: '4px' }}>Police</div>
                            {nums.police}
                          </a>
                        </div>
                      ) : (
                        <p style={{ color: theme.text.secondary, fontSize: '13px' }}>Select a city to see local emergency numbers</p>
                      )}
                    </div>
                  );
                })()}

                {/* Travel Tips */}
                <div style={{ ...cardStyle, marginTop: '4px' }}>
                  <div style={{ fontSize: '11px', color: theme.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
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
                    <div key={i} style={{ display: 'flex', gap: '10px', padding: '8px 0', borderBottom: i < 5 ? `1px solid ${theme.bg.subtleMedium}` : 'none' }}>
                      <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.icon}</span>
                      <span style={{ fontSize: '13px', color: theme.text.body, lineHeight: 1.4 }}>{item.tip}</span>
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

        {/* PWA Install Banner */}
        {showInstallBanner && (
          <div style={{
            position: 'fixed', bottom: '90px', left: '50%', transform: 'translateX(-50%)',
            maxWidth: '400px', width: 'calc(100% - 40px)',
            background: theme.bg.surface, border: `1px solid ${theme.amberTint.border30}`,
            borderRadius: '16px', padding: '16px', zIndex: 250,
            boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
            animation: 'toastIn 0.3s ease-out',
            display: 'flex', alignItems: 'center', gap: '12px',
          }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
              background: theme.accent.amberGradient,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', color: '#0C0A09', fontWeight: 700,
            }}>
              N
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: theme.text.primary }}>Add NxStops to Home Screen</div>
              <div style={{ fontSize: '12px', color: theme.text.secondary }}>Quick access, works offline</div>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              <button onClick={dismissInstallBanner}
                style={{ padding: '8px 12px', borderRadius: '10px', background: 'none', border: `1px solid ${theme.border.medium}`, color: theme.text.tertiary, fontSize: '12px', cursor: 'pointer' }}>
                Later
              </button>
              <button onClick={handleInstallApp}
                style={{ padding: '8px 14px', borderRadius: '10px', background: theme.accent.amberGradient, border: 'none', color: '#0C0A09', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                Install
              </button>
            </div>
          </div>
        )}

        {/* GDPR Consent Banner */}
        {showConsent && (
          <div style={{
            position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            maxWidth: '430px', width: '100%',
            background: theme.bg.surface, borderTop: `1px solid ${theme.border.subtle}`,
            padding: '16px 20px', zIndex: 260,
            animation: 'slideUp 0.3s ease-out',
          }}>
            <p style={{ fontSize: '13px', color: theme.text.secondary, lineHeight: 1.5, marginBottom: '12px' }}>
              We use cookies and location data to improve your experience. By continuing, you agree to our{' '}
              <a href="/privacy" style={{ color: theme.accent.amber, textDecoration: 'underline' }}>Privacy Policy</a> and{' '}
              <a href="/terms" style={{ color: theme.accent.amber, textDecoration: 'underline' }}>Terms</a>.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => { localStorage.setItem('nxstops_consent', 'true'); setShowConsent(false); }}
                style={{
                  flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
                  background: theme.accent.amberGradient, color: '#0C0A09',
                  fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                }}>
                Accept
              </button>
              <button
                onClick={() => { localStorage.setItem('nxstops_consent', 'minimal'); setShowConsent(false); }}
                style={{
                  padding: '12px 16px', borderRadius: '12px',
                  background: 'none', border: `1px solid ${theme.border.medium}`,
                  color: theme.text.secondary, fontSize: '13px', cursor: 'pointer',
                }}>
                Essential only
              </button>
            </div>
          </div>
        )}

        {/* Toast */}
        <div aria-live="polite" aria-atomic="true" style={{ position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)', zIndex: 300, pointerEvents: toast ? 'auto' : 'none' }}>
          {toast && (
            <div style={{
              background: toast.type === 'error' ? theme.redTint.bg : theme.bg.toast,
              backdropFilter: 'blur(20px)',
              border: `1px solid ${toast.type === 'error' ? theme.redTint.border : theme.amberTint.border20}`,
              borderRadius: '12px',
              padding: '12px 20px', fontSize: '14px', fontWeight: 500,
              color: toast.type === 'error' ? theme.status.red : theme.text.primary,
              animation: 'toastIn 0.3s ease-out',
              boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              {toast.msg}
              <button onClick={() => setToast(null)}
                aria-label="Dismiss"
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '4px', fontSize: '16px', lineHeight: 1, opacity: 0.6 }}>
                ✕
              </button>
            </div>
          )}
        </div>
      </div>
    </AppContext.Provider>
  );
}
