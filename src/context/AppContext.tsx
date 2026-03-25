import { createContext, useContext } from 'react';
import type { City, EventItem, Stop, AdminSignup, Vibe, QuickFilter, TravelGroup, CommunityTag, PlanDuration, TripHistoryEntry, StopCheckIn, Achievement, ItineraryAlert, Reservation } from '../types';
import type { Place } from '../services/places';
import type { CuratedPicksResult } from '../services/autoPlan';
import type { Review } from '../supabase';
import type { User } from '@supabase/supabase-js';

// ============================================================================
// APP CONTEXT TYPE
// ============================================================================

export interface AppContextType {
  // --- Core ---
  screen: string; // derived from route path
  setScreen: (s: string) => void; // navigates via router
  cities: City[];
  selectedCity: City | null;
  setSelectedCity: (city: City | null) => void;
  places: Place[];
  setPlaces: (places: Place[]) => void;
  filteredPlaces: Place[];
  forYouPlaces: Place[];
  placesLoading: boolean;
  placesError: boolean;
  useGps: boolean;
  setUseGps: (v: boolean) => void;
  searchRadius: number;
  setSearchRadius: React.Dispatch<React.SetStateAction<number>>;

  // --- Location ---
  loc: {
    lat: number | null;
    lng: number | null;
    city: string | null;
    loading: boolean;
    error: string | null;
    permissionDenied: boolean;
    requestLocation: () => void;
    hasLocation: boolean;
  };

  // --- Trip ---
  tripDays: Record<number, Stop[]>;
  setTripDays: React.Dispatch<React.SetStateAction<Record<number, Stop[]>>>;
  activeDay: number;
  setActiveDay: (day: number) => void;
  dayPlan: Stop[];
  totalStops: number;
  dayCount: number;
  setActiveDayStops: (updater: Stop[] | ((prev: Stop[]) => Stop[])) => void;

  // --- Trip handlers ---
  addToPlan: (place: Place) => void;
  removeFromPlan: (stopId: string) => void;
  isInPlan: (placeId: string) => boolean;
  clearPlan: () => void;
  movePlanStop: (index: number, direction: 'up' | 'down') => void;
  reorderStops: (oldIndex: number, newIndex: number) => void;
  addDay: () => void;
  removeDay: (day: number) => void;
  moveStopToDay: (stopId: string, fromDay: number, toDay: number) => void;
  getRouteUrl: () => string;
  getFullTripRouteUrl: () => string;
  sharePlan: () => Promise<void>;
  addEventToPlan: (event: EventItem) => void;
  addEventToPlanOnDay: (event: EventItem, day: number) => void;
  isEventInPlan: (eventId: string) => boolean;
  pivotStop: (oldStopId: string, newPlace: Place) => void;
  shareAsLink: () => Promise<string | null>;

  // --- Stop Ratings ---
  rateStop: (stopId: string, placeId: string, rating: 'up' | 'down') => void;
  getRating: (stopId: string) => 'up' | 'down' | null;

  // --- Offline Save ---
  saveForOffline: () => Promise<void>;
  offlineSaved: boolean;
  offlineSaving: boolean;

  // --- Spend ---
  estimatedSpend: number;

  // --- Events ---
  events: EventItem[];
  eventsLoading: boolean;
  eventsError: boolean;
  eventsViewMode: 'list' | 'map';
  setEventsViewMode: (mode: 'list' | 'map') => void;
  eventCategoryFilter: string;
  setEventCategoryFilter: (filter: string) => void;

  // --- UI ---
  selectedVibes: Vibe[];
  toggleVibe: (vibe: Vibe) => void;
  setSelectedVibes: (vibes: Vibe[]) => void;
  quickFilters: QuickFilter[];
  setQuickFilters: React.Dispatch<React.SetStateAction<QuickFilter[]>>;
  viewMode: 'list' | 'map' | 'lume';
  setViewMode: (mode: 'list' | 'map' | 'lume') => void;
  activeMapPin: string | null;
  setActiveMapPin: (id: string | null) => void;
  activeEventPin: string | null;
  setActiveEventPin: (id: string | null) => void;

  // --- Place Detail ---
  selectedPlace: Place | null;
  setSelectedPlace: (place: Place | null) => void;
  activePhotoIndex: number;
  setActivePhotoIndex: (index: number) => void;
  placeReviews: Review[];
  showReviewForm: boolean;
  setShowReviewForm: (show: boolean) => void;
  reviewRating: number;
  setReviewRating: (rating: number) => void;
  reviewText: string;
  setReviewText: (text: string) => void;
  reviewTags: CommunityTag[];
  setReviewTags: React.Dispatch<React.SetStateAction<CommunityTag[]>>;
  reviewSubmitting: boolean;
  handleSubmitReview: () => Promise<void>;
  reviewPhotos: File[];
  setReviewPhotos: React.Dispatch<React.SetStateAction<File[]>>;

  // --- Auth ---
  user: User | null;
  authLoading: boolean;
  refreshUser: () => Promise<void>;

  // --- Search ---
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: Place[];
  isSearching: boolean;
  showSearch: boolean;
  setShowSearch: (show: boolean) => void;
  handleSearch: () => Promise<void>;
  dismissSearch: () => void;

  // --- City info ---
  cityLabel: string;
  citySlug: string;
  useMiles: boolean;
  useCelsius: boolean;
  setUseCelsius: (v: boolean) => void;
  formatTemp: (fahrenheit: number) => string;
  weather: {
    temp: number;
    high: number;
    low: number;
    code: number;
    description: string;
    emoji: string;
    sunset?: string;
    forecast: {
      date: string;
      high: number;
      low: number;
      code: number;
      emoji: string;
      description: string;
      precipChance: number;
    }[];
  } | null;

  // --- Helpers ---
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  getSafetyIndicators: (place: Place) => string[];
  getDistanceReference: () => string;
  getTransportInfo: (fromStop: Stop, toStop: Stop) => {
    emoji: string;
    text: string;
    distance: string;
    walkMinutes: number;
    driveMinutes: number;
    km: number;
    walkMapsUrl: string;
    driveMapsUrl: string;
    mapsUrl: string;
  } | null;
  getDaySummary: () => {
    totalKm: number;
    totalWalkMin: number;
    totalDriveMin: number;
    distance: string;
  } | null;
  isReservable: (place: Place) => boolean;
  isBookable: (place: Place) => boolean;
  getBookingUrl: (place: Place) => string;
  getBookingLabel: (place: Place) => string;
  getGreeting: () => string;
  getTimeSuggestion: () => string;
  currentTime: Date;

  // --- Community ---
  communityFilters: CommunityTag[];
  setCommunityFilters: React.Dispatch<React.SetStateAction<CommunityTag[]>>;
  placeTagsCache: Record<string, Record<string, number>>;
  travelGroup: TravelGroup | null;
  setTravelGroup: (group: TravelGroup | null) => void;

  // --- Saved ---
  savedPlaces: Place[];
  toggleSaved: (place: Place) => void;
  isSaved: (placeId: string) => boolean;

  // --- Modals ---
  showSafety: boolean;
  setShowSafety: (show: boolean) => void;
  showProfile: boolean;
  setShowProfile: (show: boolean) => void;
  showAdmin: boolean;
  setShowAdmin: (show: boolean) => void;
  showCulture: boolean;
  setShowCulture: (show: boolean) => void;

  // --- Avatar ---
  avatarUrl: string | null;
  setAvatarUrl: (url: string | null) => void;

  // --- Notifications ---
  showNotificationPrompt: boolean;
  notificationPermission: NotificationPermission;
  requestNotificationPermission: () => Promise<void>;
  dismissNotificationPrompt: () => void;

  // --- Admin ---
  adminSignups: AdminSignup[];
  adminCities: City[];
  adminLoading: boolean;
  adminTab: 'dashboard' | 'signups' | 'users' | 'cities' | 'reports' | 'stops' | 'dish-images' | 'videos' | 'health' | 'api-keys';
  setAdminTab: (tab: 'dashboard' | 'signups' | 'users' | 'cities' | 'reports' | 'stops' | 'dish-images' | 'videos' | 'health' | 'api-keys') => void;
  adminUsers: { id: string; email?: string; created_at: string; last_sign_in_at: string | null; confirmed_at: string | null; user_metadata: Record<string, unknown> }[];
  adminHealth: { name: string; status: 'ok' | 'error'; detail?: string; ms?: number }[];
  openAdmin: () => Promise<void>;
  handleToggleCity: (cityId: string, isActive: boolean) => Promise<void>;

  // --- Misc ---
  loading: boolean;
  isOffline: boolean;
  sharePlace: (place: Place) => Promise<void>;
  formatEventDate: (dateStr: string) => string;
  formatEventTime: (timeStr: string) => string;
  getMapCenter: () => { lat: number; lng: number };
  MAPS_API_KEY: string;

  // --- Onboarding ---
  showOnboarding: boolean;
  onboardingStep: number;
  setOnboardingStep: (step: number) => void;
  setShowOnboarding: (show: boolean) => void;

  // --- TasteLens ---
  dishLensContext: { dish?: string; city?: string; restaurant?: string };
  setDishLensContext: (ctx: { dish?: string; city?: string; restaurant?: string }) => void;
  dishHistory: { name: string; category: string; city: string; restaurant: string; spiceLevel: number; dietaryTags: string[]; culturalNote: string; identifiedAt: string }[];
  addDishToHistory: (dish: { name: string; category: string; city: string; restaurant: string; spiceLevel: number; dietaryTags: string[]; culturalNote: string }) => void;

  // --- Auth gate ---
  requireAuth: () => boolean;

  // --- Auth handlers ---
  handleSignIn: () => Promise<void>;
  handleSignUp: () => Promise<void>;
  handleSignOut: () => Promise<void>;
  handleResetPassword: () => Promise<void>;
  handleResendVerification: () => Promise<void>;
  authScreen: 'signin' | 'signup' | 'reset' | 'verify';
  setAuthScreen: (screen: 'signin' | 'signup' | 'reset' | 'verify') => void;
  authEmail: string;
  setAuthEmail: (email: string) => void;
  authPassword: string;
  setAuthPassword: (password: string) => void;
  authConfirmPassword: string;
  setAuthConfirmPassword: (password: string) => void;
  authName: string;
  setAuthName: (name: string) => void;
  authError: string | null;
  authSubmitting: boolean;
  acceptedTerms: boolean;
  setAcceptedTerms: (accepted: boolean) => void;

  // --- Auto Day Planner ---
  autoPlanLoading: boolean;
  autoPlanError: string | null;
  lastPlanTitle: string | null;
  lastPlanVibe: string | null;
  lastPlanHeadline: string | null;
  lastPlanDuration: string | null;
  planMyDay: (mood: string, duration: PlanDuration, vibe?: string, subVibe?: string) => Promise<boolean>;
  curatedPicks: CuratedPicksResult | null;
  curatedLoading: boolean;
  curatedVibe: string | null;
  curatedError: string | null;
  loadCuratedPicks: (vibe: string) => Promise<boolean>;
  clearCuratedPicks: () => void;
  tripStartDate: string | null;
  setTripStartDate: (date: string | null) => void;
  tripHistory: TripHistoryEntry[];
  clearTripHistory: () => void;
  deleteTripHistoryEntry: (entryId: string) => void;

  // --- Wrap Up ---
  wrapUpOpen: boolean;
  startWrapUp: () => void;
  dismissWrapUp: () => void;
  confirmClearPlan: (ratings: Record<string, 'up' | 'down'>) => void;

  // --- Live Day ---
  isLiveDay: boolean;
  liveDayNumber: number | null;
  checkIn: (stopId: string) => void;
  addQuickReview: (stopId: string, rating: number, comment?: string, photos?: string[], journalNote?: string) => void;
  isCheckedIn: (stopId: string) => boolean;
  getCheckIn: (stopId: string) => StopCheckIn | null;
  checkedInCount: number;
  totalStopsToday: number;
  progressPercent: number;
  spentSoFar: number;
  currentStreak: number;
  reviewPromptStopId: string | null;
  setReviewPromptStopId: (id: string | null) => void;
  checkIns: Record<string, StopCheckIn>;

  // --- Logistics ---
  reservations: Reservation[];
  tickets: { id: string; name: string; url?: string; reference?: string }[];
  hotel: { name: string; address: string; checkIn: string; checkOut: string } | null;
  transitPass: { type: string; reference: string } | null;
  addReservation: (name: string, dateTime: string, confirmationNumber: string, notes?: string) => void;
  removeReservation: (id: string) => void;
  addTicket: (name: string, url?: string, reference?: string) => void;
  removeTicket: (id: string) => void;
  setHotel: (hotel: { name: string; address: string; checkIn: string; checkOut: string } | null) => void;
  setTransitPass: (transitPass: { type: string; reference: string } | null) => void;
  clearLogistics: () => void;

  // --- City Progress & Achievements ---
  categoryProgress: Record<string, number>;
  achievements: Achievement[];
  totalCitiesExplored: number;
  totalPlacesVisited: number;

  // --- Itinerary Alerts ---
  itineraryAlerts: ItineraryAlert[];
  dismissAlert: (id: string) => void;

  // --- Explore Mode ---
  exploreActive: boolean;
  currentStopIndex: number;
  currentExploreStop: Stop | null;
  nextExploreStop: Stop | null;
  nextStopDistance: string | null;
  nextStopWalkMin: number | null;
  nextStopDriveMin: number | null;
  shouldLeaveNow: boolean;
  leaveByMessage: string | null;
  tripComplete: boolean;
  startExplore: () => void;
  stopExplore: () => void;

  // --- City slug setter ---
  setCitySlug: (slug: string) => void;

  // --- Fetch triggers ---
  fetchPlaces: () => Promise<void>;
  fetchEventsData: () => Promise<void>;
}

// ============================================================================
// CREATE CONTEXT
// ============================================================================

export const AppContext = createContext<AppContextType | null>(null);

// ============================================================================
// useApp HOOK
// ============================================================================

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppContext.Provider');
  }
  return context;
}
