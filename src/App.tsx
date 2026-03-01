import { useState, useEffect, useCallback, useMemo, lazy, Suspense, useRef } from 'react';
import { API_URL } from './utils/api';

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
import { HomeIcon, DiscoverIcon, EventsIcon, TasteLensIcon, PlanIcon, ShieldIcon, GearIcon, CloseIcon, SearchIcon } from './components/icons';
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

// City-specific quick tips for the Travel Toolkit
const CITY_TIPS: Record<string, { icon: string; tip: string }[]> = {
  'new york': [
    { icon: '\u{1F687}', tip: 'Get a MetroCard or use OMNY tap-to-pay \u{2014} the subway is the fastest way around' },
    { icon: '\u{1F4B5}', tip: 'Tip 18-20% at restaurants and $1-2 per drink at bars' },
    { icon: '\u{1F6B6}', tip: 'Walk with purpose and stay aware of your surroundings, especially in quieter areas at night' },
    { icon: '\u{1F319}', tip: 'Avoid poorly lit side streets late at night \u{2014} stick to busy avenues like Broadway and 5th Ave' },
    { icon: '\u{1F4F1}', tip: 'Download the MTA app for real-time subway arrivals' },
    { icon: '\u{1F37D}\u{FE0F}', tip: 'Street food carts (halal, pretzels, hot dogs) are iconic and cheap \u{2014} try them' },
  ],
  'miami': [
    { icon: '\u{2600}\u{FE0F}', tip: 'Wear sunscreen year-round \u{2014} Miami sun is intense even on cloudy days' },
    { icon: '\u{1F697}', tip: 'A car is helpful outside South Beach \u{2014} rideshares can surge during events' },
    { icon: '\u{1F4B5}', tip: 'Many restaurants in tourist areas add automatic 18% gratuity' },
    { icon: '\u{1F319}', tip: 'South Beach and Wynwood are generally safe at night; be cautious in Overtown and Little Haiti late' },
    { icon: '\u{1F30A}', tip: 'Rip currents are real \u{2014} swim near lifeguard stations' },
    { icon: '\u{1F37D}\u{FE0F}', tip: 'Try Cuban coffee (colada) at a ventanita \u{2014} it\'s a local ritual' },
  ],
  'los angeles': [
    { icon: '\u{1F697}', tip: 'You need a car in LA \u{2014} distances between areas are huge. Budget for parking.' },
    { icon: '\u{1F319}', tip: 'Avoid walking alone at night in Downtown LA, Skid Row area, and parts of Hollywood Blvd' },
    { icon: '\u{2600}\u{FE0F}', tip: 'Bring layers \u{2014} coastal mornings can be foggy and cool, afternoons are warm' },
    { icon: '\u{1F37D}\u{FE0F}', tip: 'LA has the best tacos in the US \u{2014} street taco trucks are often better than restaurants' },
    { icon: '\u{1F4B5}', tip: 'Expect to pay $15-30 for parking in popular areas like Santa Monica and Hollywood' },
    { icon: '\u{1F3D6}\u{FE0F}', tip: 'Venice Beach boardwalk is lively but watch your belongings in crowded areas' },
  ],
  'london': [
    { icon: '\u{1F687}', tip: 'Get an Oyster card or use contactless payment on the Tube \u{2014} it\'s capped daily' },
    { icon: '\u{2614}', tip: 'Always carry an umbrella \u{2014} London weather changes fast' },
    { icon: '\u{1F4B7}', tip: 'Tipping isn\'t mandatory but 10-12.5% at restaurants is appreciated' },
    { icon: '\u{1F319}', tip: 'Central London is very safe at night; be more cautious in outer boroughs after dark' },
    { icon: '\u{1F6B6}', tip: 'Look RIGHT first when crossing streets \u{2014} traffic drives on the left' },
    { icon: '\u{1F37D}\u{FE0F}', tip: 'Borough Market and Camden Market have incredible street food at good prices' },
  ],
  'paris': [
    { icon: '\u{1F687}', tip: 'The M\u{00E9}tro is fast and cheap \u{2014} get a Navigo card for unlimited rides' },
    { icon: '\u{1F4B6}', tip: 'Service is included in restaurant bills (service compris) \u{2014} extra tip is optional' },
    { icon: '\u{1F319}', tip: 'Avoid the area around Gare du Nord and Ch\u{00E2}telet late at night; stay alert for pickpockets at tourist spots' },
    { icon: '\u{1F6B6}', tip: 'Walk as much as you can \u{2014} Paris is beautiful on foot and most arrondissements are walkable' },
    { icon: '\u{1F37D}\u{FE0F}', tip: 'Lunch menus (prix fixe) at restaurants are much cheaper than dinner \u{2014} eat your big meal at noon' },
    { icon: '\u{1F5E3}\u{FE0F}', tip: 'Start with "Bonjour" \u{2014} it goes a long way with locals' },
  ],
  'tokyo': [
    { icon: '\u{1F685}', tip: 'Get a Suica or Pasmo IC card for trains, buses, and even vending machines' },
    { icon: '\u{1F319}', tip: 'Tokyo is one of the safest major cities \u{2014} you can walk almost anywhere at night' },
    { icon: '\u{1F4B4}', tip: 'Japan is still cash-heavy \u{2014} carry yen, especially for small restaurants and shrines' },
    { icon: '\u{1F37D}\u{FE0F}', tip: 'Convenience store (konbini) food is surprisingly delicious and cheap' },
    { icon: '\u{1F6B6}', tip: 'Tipping is not customary and can be considered rude' },
    { icon: '\u{1F3E9}', tip: 'Remove shoes when entering homes, some restaurants, and temples' },
  ],
  'sarasota': [
    { icon: '\u{1F3D6}\u{FE0F}', tip: 'Siesta Key Beach is ranked #1 in the US \u{2014} go early to get parking' },
    { icon: '\u{1F697}', tip: 'A car is essential \u{2014} attractions are spread across the coast and mainland' },
    { icon: '\u{2600}\u{FE0F}', tip: 'Afternoon thunderstorms are common in summer \u{2014} plan outdoor activities for mornings' },
    { icon: '\u{1F37D}\u{FE0F}', tip: 'St. Armands Circle has upscale dining; downtown has great affordable spots too' },
    { icon: '\u{1F40A}', tip: 'Watch for wildlife \u{2014} alligators live in freshwater ponds and canals throughout Florida' },
    { icon: '\u{1F3A8}', tip: 'The Ringling Museum is a must-see and the grounds are stunning at sunset' },
  ],
  'atlanta': [
    { icon: '\u{1F697}', tip: 'Atlanta traffic is notorious \u{2014} use MARTA rail when possible and avoid rush hours' },
    { icon: '\u{1F37D}\u{FE0F}', tip: 'Don\'t miss the soul food \u{2014} fried chicken, collard greens, and peach cobbler are must-tries' },
    { icon: '\u{1F319}', tip: 'Midtown, Buckhead, and Virginia-Highland are safe for nightlife; be cautious in less-busy areas' },
    { icon: '\u{1F4B5}', tip: 'Tip 18-20% at restaurants \u{2014} Southern hospitality goes both ways' },
    { icon: '\u{1F333}', tip: 'The BeltLine is perfect for walking \u{2014} connects parks, art, and restaurants' },
    { icon: '\u{2600}\u{FE0F}', tip: 'Summers are hot and humid \u{2014} stay hydrated and plan indoor activities midday' },
  ],
  'chicago': [
    { icon: '\u{1F32C}\u{FE0F}', tip: 'It\'s called the Windy City for a reason \u{2014} dress in layers, especially near the lake' },
    { icon: '\u{1F687}', tip: 'The L train covers most of the city \u{2014} use the Ventra app for fares' },
    { icon: '\u{1F319}', tip: 'Stick to the Loop, River North, Lincoln Park, and Wicker Park at night; avoid the South and West sides after dark' },
    { icon: '\u{1F37D}\u{FE0F}', tip: 'Deep dish is iconic but locals actually eat more tavern-style thin crust pizza' },
    { icon: '\u{1F4B5}', tip: 'Architecture boat tours are worth every penny \u{2014} book in advance' },
    { icon: '\u{1F3D6}\u{FE0F}', tip: 'The lakefront trail is stunning \u{2014} 18 miles of free beaches, paths, and parks' },
  ],
  'accra': [
    { icon: '\u{1F695}', tip: 'Use Uber or Bolt \u{2014} negotiate taxi fares in advance as meters aren\'t common' },
    { icon: '\u{1F4B5}', tip: 'Carry Ghanaian cedis \u{2014} many local spots don\'t accept cards' },
    { icon: '\u{1F319}', tip: 'Osu and East Legon are vibrant at night; avoid isolated areas and be aware of your surroundings' },
    { icon: '\u{1F37D}\u{FE0F}', tip: 'Try waakye, jollof rice, and kelewele from local chop bars \u{2014} incredible flavors at low prices' },
    { icon: '\u{1F4A7}', tip: 'Drink bottled or filtered water only \u{2014} sachet water (pure water) is also safe' },
    { icon: '\u{1F30D}', tip: 'Ghanaians are warm and welcoming \u{2014} greetings matter, so always say hello first' },
  ],
  'dubai': [
    { icon: '\u{1F687}', tip: 'The Dubai Metro is clean, air-conditioned, and covers most tourist areas' },
    { icon: '\u{1F321}\u{FE0F}', tip: 'Summer temps hit 45\u{00B0}C+ \u{2014} plan outdoor activities for early morning or after sunset' },
    { icon: '\u{1F4B5}', tip: 'Tipping isn\'t expected but 10% at restaurants is appreciated' },
    { icon: '\u{1F319}', tip: 'Dubai is extremely safe at night \u{2014} crime rates are very low' },
    { icon: '\u{1F457}', tip: 'Dress modestly in malls and public areas \u{2014} cover shoulders and knees outside beach/pool areas' },
    { icon: '\u{1F37D}\u{FE0F}', tip: 'Al Dhiyafah Road in Satwa has incredible affordable food from every cuisine' },
  ],
};

const DEFAULT_TIPS: { icon: string; tip: string }[] = [
  { icon: '\u{1F50B}', tip: 'Keep your phone charged \u{2014} you\'ll need it for maps & rides' },
  { icon: '\u{1F4F1}', tip: 'Download offline maps before heading out' },
  { icon: '\u{1F3E8}', tip: 'Save your accommodation address \u{2014} show it to taxi drivers' },
  { icon: '\u{1F4B3}', tip: 'Keep a small amount of local cash for emergencies' },
  { icon: '\u{1F319}', tip: 'Stick to well-lit, busy streets at night and be aware of your surroundings' },
  { icon: '\u{1F465}', tip: 'Look for places with lots of reviews \u{2014} popular spots are usually welcoming' },
];

function getQuickTips(cityLabel: string): { icon: string; tip: string }[] {
  const key = cityLabel.toLowerCase().trim();
  return CITY_TIPS[key] || DEFAULT_TIPS;
}

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
const BrandsScreen = lazy(() => import('./screens/BrandsScreen'));
const BrandTripScreen = lazy(() => import('./screens/BrandTripScreen'));
const WorldCupScreen = lazy(() => import('./screens/WorldCupScreen'));
const WorldCupTripScreen = lazy(() => import('./screens/WorldCupTripScreen'));

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

  const isInfoPage = ['/about', '/privacy', '/terms', '/contact', '/brands', '/worldcup'].includes(routerLocation.pathname) || routerLocation.pathname.startsWith('/cities/') || routerLocation.pathname.startsWith('/brands/') || routerLocation.pathname.startsWith('/worldcup/');

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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => {
    try { return localStorage.getItem('nxstops_avatar_url'); } catch { return null; }
  });
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

  // GDPR consent — skip on native iOS/Android (no browser cookies in native apps)
  const [showConsent, setShowConsent] = useState(() => {
    if (localStorage.getItem('nxstops_consent')) return false;
    try {
      const { Capacitor } = require('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        // Auto-accept on native — no cookie banner needed
        localStorage.setItem('nxstops_consent', 'true');
        return false;
      }
    } catch { /* not in Capacitor */ }
    return true;
  });

  // Admin state
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminSignups, setAdminSignups] = useState<AdminSignup[]>([]);
  const [adminCities, setAdminCities] = useState<import('./types').City[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminTab, setAdminTab] = useState<'dashboard' | 'signups' | 'cities' | 'reports' | 'stops' | 'dish-images'>('dashboard');

  // Check admin status server-side when user changes
  useEffect(() => {
    if (!auth.user) { setIsAdmin(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await (await import('./supabase')).supabase.auth.getSession();
        if (!session?.access_token) return;
        const res = await fetch(`${API_URL}/api/admin`, {
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

  // Sync avatar state: localStorage is primary, Supabase user_metadata is backup (survives reinstall)
  useEffect(() => {
    const stored = localStorage.getItem('nxstops_avatar_url');
    if (stored && stored.startsWith('data:image/')) {
      // localStorage has avatar — use it
      setAvatarUrl(stored);
    } else if (auth.user?.user_metadata?.avatar_url) {
      const metaAvatar = auth.user.user_metadata.avatar_url as string;
      if (typeof metaAvatar === 'string' && metaAvatar.startsWith('data:image/')) {
        // No localStorage but Supabase has our base64 avatar — restore it (post-reinstall)
        localStorage.setItem('nxstops_avatar_url', metaAvatar);
        setAvatarUrl(metaAvatar);
      } else if (typeof metaAvatar === 'string' && metaAvatar.startsWith('http')) {
        // Old stale Google/CDN URL — clear it
        import('./supabase').then(({ supabase }) => {
          supabase.auth.updateUser({ data: { avatar_url: null } }).catch(() => {});
        });
        setAvatarUrl(null);
      }
    } else {
      setAvatarUrl(null);
    }
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
    places.places,
    events.events,
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
    // Avatar
    avatarUrl, setAvatarUrl,
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
    showSafety, showProfile, showAdmin, showCulture, avatarUrl,
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
    const onboardingSteps = [
      { emoji: '\u{1F30D}', title: 'Discover Any City', desc: 'Find restaurants, attractions, and hidden gems \u{2014} wherever you are in the world.' },
      { emoji: '\u{1F4CB}', title: 'Plan Your Day', desc: 'AI builds a personalized itinerary based on your vibe \u{2014} sightseeing, foodie, nightlife, and more.' },
      { emoji: '\u{1F37D}\u{FE0F}', title: 'TasteLens', desc: 'Scan any menu or type a dish name \u{2014} get instant info, dietary tags, allergens, and cultural context.' },
      { emoji: '\u{1F4B1}', title: 'Currency Converter', desc: 'Check live exchange rates and convert currencies on the go. Perfect for travel budgeting.' },
      { emoji: '\u{1F3AB}', title: 'Local Events', desc: 'Concerts, sports, festivals, and more \u{2014} happening near you or wherever you\u{2019}re headed.' },
    ];
    const step = onboardingSteps[onboardingStep] || onboardingSteps[0];
    const isLast = onboardingStep >= onboardingSteps.length - 1;

    return (
      <div className="font-['DM_Sans',system-ui,sans-serif] bg-bg-body min-h-screen text-text-primary flex flex-col items-center justify-center max-w-[430px] md:max-w-[768px] lg:max-w-[1024px] mx-auto px-6 py-10">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="text-4xl font-bold mb-1 bg-accent-text-gradient bg-clip-text text-transparent">
            NxStops
          </div>
          <div className="text-[11px] text-text-tertiary tracking-[0.1em] uppercase mb-10">
            by Nav&eacute;
          </div>
          <div className="text-[56px] mb-4">{step.emoji}</div>
          <h2 className="text-[22px] font-bold text-text-primary mb-2">{step.title}</h2>
          <p className="text-[15px] text-text-secondary leading-relaxed max-w-[300px] mb-6">{step.desc}</p>
          <div className="flex gap-2 mb-6">
            {onboardingSteps.map((_, i) => (
              <div key={i} className={`h-2 rounded-full transition-all ${i === onboardingStep ? 'bg-accent-amber w-5' : 'bg-border-medium w-2'}`} />
            ))}
          </div>
        </div>
        <div className="w-full flex flex-col gap-2.5">
          <button
            onClick={() => {
              if (isLast) { localStorage.setItem('nxstops_onboarded', 'true'); localStorage.setItem('nxstops_hint_home', '1'); setShowOnboarding(false); track('onboarding_complete'); }
              else { setOnboardingStep(onboardingStep + 1); }
            }}
            className="w-full p-4 rounded-[14px] border-none bg-accent-gradient text-text-on-accent text-base font-semibold cursor-pointer shadow-[0_4px_20px_var(--amber-tint-shadow)]">
            {isLast ? 'Get Started' : 'Next'}
          </button>
          {!isLast && (
            <button
              onClick={() => { localStorage.setItem('nxstops_onboarded', 'true'); localStorage.setItem('nxstops_hint_home', '1'); setShowOnboarding(false); track('onboarding_skipped'); }}
              className="w-full p-3 rounded-[14px] border border-border-subtle bg-transparent text-text-tertiary text-sm cursor-pointer">
              Skip
            </button>
          )}
        </div>
      </div>
    );
  }

  // ==========================================================================
  // MAIN RENDER
  // ==========================================================================

  return (
    <AppContext.Provider value={contextValue}>
      <div className="font-['DM_Sans',system-ui,sans-serif] bg-body-gradient min-h-screen text-text-primary max-w-[430px] md:max-w-[768px] lg:max-w-[1024px] mx-auto relative">
        {/* Skip to content link for keyboard users */}
        <a href="#main-content" className="skip-link">Skip to content</a>

        {/* iOS safe-area bar — solid bg behind status bar so content never shows through */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] md:max-w-[768px] lg:max-w-[1024px] z-50 bg-bg-body pointer-events-none" style={{ height: 'env(safe-area-inset-top, 0px)' }} />

        {/* Offline banner */}
        {isOffline && (
          <div className="fixed left-0 right-0 z-[9999] animate-offline-banner" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
            <div className="bg-[#78350F] text-[#FDE68A] text-[13px] text-center py-2.5 px-4 flex items-center justify-center gap-2 font-medium">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse shrink-0" />
              You're offline — showing cached data
            </div>
          </div>
        )}

        {/* Header — fixed/frozen, always visible below status bar */}
        {!isInfoPage && (
        <header className="fixed left-1/2 -translate-x-1/2 w-full max-w-[430px] md:max-w-[768px] lg:max-w-[1024px] z-40 px-5 py-3 bg-bg-body/95 backdrop-blur-md border-b border-border-subtle/50" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
          <div className="flex justify-between items-center">
            {/* Left: Logo + time */}
            <div className="flex items-center gap-3">
              <div>
                <div className="text-[22px] font-bold leading-tight bg-accent-text-gradient bg-clip-text text-transparent">
                  NxStops
                </div>
                <div className="text-[10px] text-text-tertiary tracking-[0.12em] uppercase leading-none mt-0.5">
                  by Nav&eacute;
                </div>
              </div>
              <div className="h-6 w-px bg-border-subtle/60 mx-0.5" />
              <div className="text-right">
                <div className="text-[13px] font-medium text-text-primary leading-tight">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="text-[10px] text-text-tertiary leading-none mt-0.5">
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
                className={`w-[36px] h-[36px] rounded-full border-2 border-amber-tint-border30 cursor-pointer flex items-center justify-center text-base p-0 text-text-secondary shrink-0 ml-1 overflow-hidden ${!avatarUrl ? 'bg-bg-subtle-button' : ''}`}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
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
        <main id="main-content" className={isInfoPage ? 'p-0' : 'px-5 md:px-8 lg:px-10 pb-[100px] overflow-x-hidden'} style={!isInfoPage ? { paddingTop: 'calc(env(safe-area-inset-top, 0px) + 64px)' } : undefined}>
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
                <Route path="/brands" element={<BrandsScreen />} />
                <Route path="/brands/:slug" element={<BrandTripScreen />} />
                <Route path="/worldcup" element={<WorldCupScreen />} />
                <Route path="/worldcup/:slug" element={<WorldCupTripScreen />} />
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
        {!isInfoPage && <nav aria-label="Main navigation" className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] md:max-w-[768px] lg:max-w-[1024px] bg-bg-nav backdrop-blur-[24px] border-t border-border-nav flex justify-around pt-2" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}>
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
                className={`flex flex-col items-center gap-1 bg-transparent border-none text-[11px] font-medium px-5 py-2 rounded-xl relative min-h-[48px] ${isActive ? 'text-text-primary' : canNavigate ? 'text-text-tertiary' : 'text-text-disabled'} ${canNavigate ? 'cursor-pointer opacity-100' : 'cursor-default opacity-40'}`}
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
                  <span className="absolute top-0.5 right-2 bg-accent-gradient text-[#0C0A09] text-[10px] font-bold px-[5px] py-0.5 rounded-lg">
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
            <div className="fixed inset-0 bg-bg-body z-[200] flex flex-col max-w-[430px] md:max-w-[768px] lg:max-w-[1024px] mx-auto">
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
              className="w-[42px] h-[42px] rounded-full border-none cursor-pointer text-white text-[17px] flex items-center justify-center shadow-[0_4px_16px_rgba(196,138,90,0.35)]"
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
                    Quick Tips {location.cityLabel ? `\u{2014} ${location.cityLabel}` : ''}
                  </div>
                  {getQuickTips(location.cityLabel || '').map((item, i, arr) => (
                    <div key={i} className="flex gap-2.5 py-2" style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--bg-subtle-medium)' : 'none' }}>
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
          <div className="fixed bottom-[90px] left-1/2 -translate-x-1/2 max-w-[400px] md:max-w-[600px] w-[calc(100%-40px)] bg-bg-surface border border-amber-tint-border30 rounded-2xl p-4 z-[250] shadow-[0_8px_30px_rgba(0,0,0,0.4)] animate-toast-in flex items-center gap-3">
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
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 max-w-[430px] md:max-w-[768px] lg:max-w-[1024px] w-full bg-bg-surface border-t border-border-subtle px-5 py-4 z-[260] animate-slide-up">
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
