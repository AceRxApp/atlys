import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Routes, Route, useLocation as useRouterLocation, useNavigate, Navigate } from 'react-router-dom';
import { fetchEmailSignups, fetchAllCities, toggleCityActive } from './supabase';
import { formatDistance } from './services/places';
import type { Place } from './services/places';
import { useLocation as useGeoLocation } from './hooks/useLocation';
import type { AdminSignup } from './types';
import { CITY_COORDS, EMERGENCY_BY_COUNTRY, ADMIN_EMAIL } from './data';
import { getCardStyle } from './styles/shared';
import { AppContext } from './context/AppContext';
import { useTheme } from './context/ThemeContext';
import { HomeIcon, DiscoverIcon, EventsIcon, PlanIcon, ShieldIcon, GearIcon, CloseIcon } from './components/icons';
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
  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
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

  // Admin state
  const [adminSignups, setAdminSignups] = useState<AdminSignup[]>([]);
  const [adminCities, setAdminCities] = useState<import('./types').City[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminTab, setAdminTab] = useState<'dashboard' | 'signups' | 'cities'>('dashboard');

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
    showToast,
  });

  // --- Reset photo index when selectedPlace changes ---
  useEffect(() => {
    if (selectedPlace) setActivePhotoIndex(0);
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

  const handleSurpriseMe = () => {
    const result = places.handleSurpriseMe();
    if (result) setSurprisePlace(result);
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

  const contextValue = {
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
    surprisePlace, setSurprisePlace, showSafety, setShowSafety,
    showProfile, setShowProfile, showAdmin, setShowAdmin, showCulture, setShowCulture,
    // Helpers
    showToast, getGreeting, getTimeSuggestion, getDistanceReference, currentTime,
    handleSurpriseMe,
    // Notifications
    showNotificationPrompt, notificationPermission, requestNotificationPermission, dismissNotificationPrompt,
    // Admin
    adminSignups, adminCities, adminLoading, adminTab, setAdminTab, openAdmin, handleToggleCity,
    // App state
    loading: location.loading, isOffline,
    // Onboarding
    showOnboarding, onboardingStep, setOnboardingStep, setShowOnboarding,
  };

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
            onClick={() => { localStorage.setItem('nxstops_onboarded', 'true'); setShowOnboarding(false); }}
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
          @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
          }
        `}</style>

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
        <main style={{ padding: isInfoPage ? '0' : '0 20px 100px' }}>
          <Suspense fallback={<><SkeletonCard /><SkeletonCard /><SkeletonCard /></>}>
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
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
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

        {/* Surprise Me Floating Button */}
        {!isInfoPage && screen === 'discover' && places.places.length > 0 && !surprisePlace && !selectedPlace && (
          <button
            onClick={handleSurpriseMe}
            aria-label="Surprise me with a random place"
            style={{
              position: 'fixed', bottom: '90px', right: 'calc(50% - 195px)',
              width: '52px', height: '52px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #F59E0B, #D97706)',
              border: 'none', cursor: 'pointer', color: '#0C0A09',
              fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(245,158,11,0.4)', zIndex: 50,
            }}
            title="Surprise Me"
          >
            {'\u{1F3B2}'}
          </button>
        )}

        {/* Surprise Me Modal */}
        {surprisePlace && (
          <div className="modal-backdrop"
            role="dialog"
            aria-label="Surprise place recommendation"
            style={{ position: 'fixed', inset: 0, background: theme.bg.modalOverlay, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
            onClick={() => setSurprisePlace(null)}>
            <div className="modal-sheet"
              style={{ background: theme.bg.surface, borderRadius: '20px', maxWidth: '380px', width: '100%', overflow: 'hidden', border: `1px solid ${theme.amberTint.border20}` }}
              onClick={e => e.stopPropagation()}>
              {surprisePlace.photoUrl && (
                <div style={{
                  height: '180px', width: '100%',
                  background: `linear-gradient(to bottom, transparent 50%, ${theme.bg.surface}), url(${surprisePlace.photoUrl})`,
                  backgroundSize: 'cover', backgroundPosition: 'center',
                }} />
              )}
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '14px', color: theme.accent.amber, marginBottom: '4px', fontWeight: 500 }}>Surprise!</div>
                <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '6px' }}>{surprisePlace.name}</h2>
                <p style={{ color: theme.text.secondary, fontSize: '13px', marginBottom: '4px' }}>
                  {surprisePlace.categoryDisplay}{surprisePlace.distance != null && ` \u{00B7} ${formatDistance(surprisePlace.distance, location.useMiles)}`}
                </p>
                {surprisePlace.rating > 0 && (
                  <p style={{ color: '#F59E0B', fontSize: '14px', marginBottom: '16px' }}>
                    {'\u{2605}'} {surprisePlace.rating.toFixed(1)} ({surprisePlace.reviewCount} reviews)
                  </p>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => { trip.addToPlan(surprisePlace); setSurprisePlace(null); }}
                    style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#0C0A09', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                    + Add to Plan
                  </button>
                  {surprisePlace.googleMapsUrl && (
                    <a href={surprisePlace.googleMapsUrl} target="_blank" rel="noopener noreferrer"
                      style={{ flex: 1, padding: '12px', borderRadius: '12px', background: theme.bg.subtleButton, color: theme.text.primary, fontSize: '14px', fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
                      Directions
                    </a>
                  )}
                </div>
                <button
                  onClick={() => { setSurprisePlace(null); handleSurpriseMe(); }}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', marginTop: '8px', background: 'none', border: `1px solid ${theme.border.strong}`, color: theme.text.secondary, fontSize: '13px', cursor: 'pointer' }}>
                  {'\u{1F3B2}'} Try another
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

        {/* Toast */}
        {toast && (
          <div style={{
            position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)',
            background: theme.bg.toast, backdropFilter: 'blur(20px)',
            border: `1px solid ${theme.amberTint.border20}`, borderRadius: '12px',
            padding: '12px 20px', fontSize: '14px', fontWeight: 500, color: theme.text.primary,
            zIndex: 300, animation: 'toastIn 0.3s ease-out',
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
          }}>
            {toast}
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
}
