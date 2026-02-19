import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { track } from '@vercel/analytics';
import { searchNearby, textSearchPlaces, isChain } from '../services/places';
import type { Place } from '../services/places';
import { saveReview, fetchReviews, fetchPlaceTagCounts, fetchSavedPlaces, upsertSavedPlaces, deleteSavedPlace, fetchUserStops, createUserStop, uploadReviewPhotos } from '../supabase';
import type { Review, UserStop } from '../supabase';
import type { User } from '@supabase/supabase-js';
import type { City, Vibe, QuickFilter, TravelGroup, CommunityTag } from '../types';
import {
  CITY_COORDS, NIGHTLIFE_TYPES, GIRLY_TYPES, GIRLY_KEYWORDS, BOYS_EXCLUDE_TYPES,
  RESERVABLE_TYPES, BOOKABLE_TYPES,
} from '../data';
import { hapticImpact, hapticNotification } from '../utils/haptics';
import { scorePlaceByPreference, getPreferences } from '../utils/preferences';

interface LocState {
  lat: number | null;
  lng: number | null;
  city: string | null;
  hasLocation: boolean;
}

interface WeatherState {
  code: number;
  sunset?: string;
}

export function usePlaces(deps: {
  useGps: boolean;
  loc: LocState;
  selectedCity: City | null;
  searchRadius: number;
  screen: string;
  user: User | null;
  selectedPlace: Place | null;
  citySlug: string;
  useMiles: boolean;
  showToast: (msg: string) => void;
  weather?: WeatherState | null;
}) {
  const { useGps, loc, selectedCity, searchRadius, screen, user, selectedPlace, citySlug, useMiles, showToast, weather } = deps;

  // --- Places ---
  const [places, setPlaces] = useState<Place[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesError, setPlacesError] = useState(false);
  const [selectedVibes, setSelectedVibesRaw] = useState<Vibe[]>([]);
  const toggleVibe = useCallback((vibe: Vibe) => {
    setSelectedVibesRaw(prev => {
      const has = prev.includes(vibe);
      const next = has ? prev.filter(v => v !== vibe) : [...prev, vibe];
      if (!has) track('vibe_selected', { vibe });
      return next;
    });
  }, []);
  const setSelectedVibes = useCallback((vibes: Vibe[]) => {
    setSelectedVibesRaw(vibes);
  }, []);
  const [quickFilters, setQuickFilters] = useState<QuickFilter[]>(['open']);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [activeMapPin, setActiveMapPin] = useState<string | null>(null);

  // --- Community ---
  const [communityFilters, setCommunityFilters] = useState<CommunityTag[]>([]);
  const [placeTagsCache, setPlaceTagsCache] = useState<Record<string, Record<string, number>>>({});
  const [travelGroup, setTravelGroup] = useState<TravelGroup | null>(() => {
    return (sessionStorage.getItem('nxstops_travel_group') as TravelGroup) || null;
  });

  // --- Saved ---
  const [savedPlaces, setSavedPlaces] = useState<Place[]>(() => {
    try {
      const saved = localStorage.getItem('nxstops_saved_places');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // --- Search ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // --- Abort controller for race condition prevention ---
  const fetchAbortRef = useRef<AbortController | null>(null);

  // --- Reviews ---
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewTags, setReviewTags] = useState<CommunityTag[]>([]);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [placeReviews, setPlaceReviews] = useState<Review[]>([]);
  const [reviewPhotos, setReviewPhotos] = useState<File[]>([]);

  // --------------------------------------------------------------------------
  // Effects
  // --------------------------------------------------------------------------

  // Fetch places (with AbortController to prevent race conditions)
  const fetchPlaces = useCallback(async () => {
    let lat: number | undefined, lng: number | undefined;
    if (useGps && loc.lat && loc.lng) { lat = loc.lat; lng = loc.lng; }
    else if (selectedCity) {
      const c = CITY_COORDS[selectedCity.name.toLowerCase()];
      if (c) { lat = c.lat; lng = c.lng; }
    }
    if (!lat || !lng) return;

    // Cancel any in-flight request
    if (fetchAbortRef.current) fetchAbortRef.current.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    setPlacesLoading(true);
    setPlacesError(false);
    try {
      const results = await searchNearby(lat, lng, selectedVibes, searchRadius);
      // Only update state if this request wasn't cancelled
      if (!controller.signal.aborted) {
        setPlaces(results);
        if (results.length === 0 && selectedVibes.length === 0) setPlacesError(true);
        setPlacesLoading(false);
      }
    } catch {
      if (!controller.signal.aborted) {
        setPlacesError(true);
        setPlacesLoading(false);
      }
    }
  }, [useGps, loc.lat, loc.lng, selectedCity, selectedVibes, searchRadius]);

  useEffect(() => {
    if (screen === 'discover' && (useGps || selectedCity)) fetchPlaces();
  }, [screen, fetchPlaces, useGps, selectedCity]);

  // Load community tags
  useEffect(() => {
    if (places.length === 0) return;
    const ids = places.map(p => p.placeId);
    fetchPlaceTagCounts(ids).then(setPlaceTagsCache);
  }, [places]);

  // Load reviews when selectedPlace changes
  useEffect(() => {
    if (!selectedPlace) { setPlaceReviews([]); setShowReviewForm(false); return; }
    fetchReviews(selectedPlace.placeId).then(setPlaceReviews);
  }, [selectedPlace]);

  // Persist saved places to localStorage
  useEffect(() => {
    localStorage.setItem('nxstops_saved_places', JSON.stringify(savedPlaces));
  }, [savedPlaces]);

  // Cloud sync: pull saved places when user logs in
  const hasSynced = useRef(false);
  useEffect(() => {
    if (!user || hasSynced.current) return;
    hasSynced.current = true;
    fetchSavedPlaces().then(cloudPlaces => {
      if (cloudPlaces.length === 0 && savedPlaces.length > 0) {
        // Push local to cloud on first login
        upsertSavedPlaces(savedPlaces.map(p => ({ placeId: p.placeId, data: p as unknown as Record<string, unknown> })));
      } else if (cloudPlaces.length > 0) {
        // Merge: cloud wins for conflicts, add local-only places
        const cloudMap = new Map(cloudPlaces.map(cp => [cp.place_id, cp.place_data as unknown as Place]));
        const localOnly = savedPlaces.filter(p => !cloudMap.has(p.placeId));
        const merged = [...cloudMap.values(), ...localOnly];
        setSavedPlaces(merged);
        if (localOnly.length > 0) {
          upsertSavedPlaces(localOnly.map(p => ({ placeId: p.placeId, data: p as unknown as Record<string, unknown> })));
        }
      }
    }).catch(() => { /* silently fail — local still works */ });
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist travel group
  useEffect(() => {
    if (travelGroup) sessionStorage.setItem('nxstops_travel_group', travelGroup);
    else sessionStorage.removeItem('nxstops_travel_group');
  }, [travelGroup]);

  // --------------------------------------------------------------------------
  // Filtered places
  // --------------------------------------------------------------------------

  const INDOOR_TYPES = ['museum', 'art_gallery', 'movie_theater', 'bowling_alley', 'library', 'book_store', 'cafe', 'coffee_shop', 'restaurant', 'bar', 'spa', 'shopping_mall', 'performing_arts_theater', 'aquarium', 'casino', 'bakery', 'ice_cream_shop'];
  const OUTDOOR_SCENIC_TYPES = ['park', 'hiking_area', 'national_park', 'tourist_attraction', 'garden', 'zoo', 'beach', 'campground', 'playground'];
  const QUICK_VISIT_TYPES = ['cafe', 'coffee_shop', 'bakery', 'ice_cream_shop', 'park', 'art_gallery', 'book_store', 'market', 'bar', 'restaurant', 'museum', 'florist', 'gift_shop', 'sandwich_shop', 'tourist_attraction', 'library', 'spa', 'brunch_restaurant', 'breakfast_restaurant', 'juice_shop', 'dessert_shop'];

  const filteredPlaces = useMemo(() => places.filter(place => {
    for (const f of quickFilters) {
      switch (f) {
        case 'open': if (!place.openNow) return false; break;
        case 'walking': if (place.distance !== null && place.distance > 1) return false; break;
        case 'topRated': if (place.rating < 4.5) return false; break;
        case 'budget': if (place.priceLevel > 2 && place.priceLevel !== -1) return false; break;
        case 'family': if (NIGHTLIFE_TYPES.includes(place.category)) return false; if (place.rating > 0 && place.rating < 3.5) return false; break;
        case 'solo': if (place.reviewCount < 50) return false; if (place.rating > 0 && place.rating < 3.8) return false; break;
        case 'chainBreaker': if (isChain(place.name)) return false; break;
        case '15min': if (!place.openNow) return false; if (place.distance !== null && place.distance > 2) return false; if (!QUICK_VISIT_TYPES.includes(place.category)) return false; break;
        case 'lateNight': {
          if (!place.openNow) return false;
          // Check if place is open late (parse hours for closing time after 11 PM)
          const closesLate = place.hours.some(h => {
            const match = h.match(/–\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            if (!match) return h.toLowerCase().includes('open 24 hours');
            const [, hr, , ampm] = match;
            const hour24 = ampm.toUpperCase() === 'AM' ? (parseInt(hr) === 12 ? 0 : parseInt(hr)) : (parseInt(hr) === 12 ? 12 : parseInt(hr) + 12);
            return hour24 >= 23 || hour24 <= 4; // Closes after 11 PM or early morning
          });
          if (!closesLate) return false;
          break;
        }
        case 'rainyDay': if (!INDOOR_TYPES.includes(place.category)) return false; break;
        case 'goldenHour': if (!place.openNow) return false; if (!OUTDOOR_SCENIC_TYPES.includes(place.category)) return false; if (place.distance !== null && place.distance > 5) return false; break;
      }
    }
    if (travelGroup) {
      const nameLower = place.name.toLowerCase();
      const summaryLower = (place.editorialSummary || '').toLowerCase();
      const combined = nameLower + ' ' + summaryLower;
      switch (travelGroup) {
        case 'girls':
        case 'bachelorette': {
          if (['gym', 'church', 'library'].includes(place.category)) return false;
          const isGirlyType = GIRLY_TYPES.includes(place.category);
          const hasGirlyVibe = GIRLY_KEYWORDS.some(kw => combined.includes(kw));
          if (!isGirlyType && !hasGirlyVibe && place.rating > 0 && place.rating < 4.0) return false;
          break;
        }
        case 'family': {
          if (NIGHTLIFE_TYPES.includes(place.category)) return false;
          if (place.rating > 0 && place.rating < 3.5) return false;
          break;
        }
        case 'boys':
        case 'friends': {
          if (travelGroup === 'boys' && BOYS_EXCLUDE_TYPES.includes(place.category)) return false;
          if (['library', 'church'].includes(place.category)) return false;
          break;
        }
        case 'solo': {
          if (place.reviewCount < 20) return false;
          if (place.rating > 0 && place.rating < 3.5) return false;
          break;
        }
        case 'couple': break;
      }
    }
    if (communityFilters.length > 0) {
      const tags = placeTagsCache[place.placeId];
      if (tags) {
        const hasMatch = communityFilters.some(f => (tags[f] || 0) >= 1);
        if (!hasMatch) return false;
      } else {
        const cat = place.category;
        const nameLower = place.name.toLowerCase();
        const catDisplay = place.categoryDisplay.toLowerCase();
        for (const filter of communityFilters) {
          let matches = false;
          switch (filter) {
            case 'kid-friendly':
              matches = ['park', 'playground', 'museum', 'zoo', 'aquarium', 'amusement_park', 'bowling_alley', 'movie_theater', 'ice_cream_shop', 'pizza_restaurant', 'library'].includes(cat)
                || /\b(kid|child|family|play|fun|arcade|trampoline|zoo|aquarium|disney|museum)\b/i.test(nameLower + ' ' + catDisplay);
              break;
            case 'baby-friendly':
              matches = ['park', 'cafe', 'coffee_shop', 'restaurant', 'shopping_mall', 'library', 'museum'].includes(cat)
                || /\b(family|cafe|coffee|park|garden|library)\b/i.test(nameLower + ' ' + catDisplay);
              break;
            case 'wheelchair-accessible':
              matches = !(/\b(trail|hike|climb|rooftop|boat|kayak|surf)\b/i.test(nameLower + ' ' + catDisplay));
              break;
            case 'solo-friendly':
              matches = place.rating >= 4.0 && place.reviewCount >= 50
                && ['cafe', 'coffee_shop', 'restaurant', 'bar', 'park', 'museum', 'library', 'bookstore', 'art_gallery'].includes(cat);
              break;
            case 'lgbtq-friendly':
              matches = place.rating >= 4.0 && ['cafe', 'coffee_shop', 'bar', 'restaurant', 'art_gallery', 'bookstore', 'park', 'museum', 'night_club', 'spa'].includes(cat);
              break;
            default:
              matches = true;
              break;
          }
          if (!matches) return false;
        }
      }
    }
    return true;
  }), [places, quickFilters, travelGroup, communityFilters, placeTagsCache]);

  // --------------------------------------------------------------------------
  // Personalized "For You" picks based on preference learning
  // --------------------------------------------------------------------------

  const forYouPlaces = useMemo(() => {
    const prefs = getPreferences();
    // Need at least some data to personalize
    if (prefs.tripCount === 0 && Object.keys(prefs.likedCategories).length === 0) return [];

    const swappedSet = new Set(prefs.swappedAwayIds);
    const scored = filteredPlaces
      .filter(p => !swappedSet.has(p.placeId)) // exclude places user has swapped away
      .map(p => ({
        place: p,
        score: scorePlaceByPreference(p.category, p.priceLevel, p.rating),
      }))
      .filter(item => item.score >= 60) // only show strong matches
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, 10).map(item => item.place);
  }, [filteredPlaces]);

  // --------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    let lat: number | undefined, lng: number | undefined;
    if (useGps && loc.lat && loc.lng) { lat = loc.lat; lng = loc.lng; }
    else if (selectedCity) {
      const c = CITY_COORDS[selectedCity.name.toLowerCase()];
      if (c) { lat = c.lat; lng = c.lng; }
    }
    if (!lat || !lng) return;
    setIsSearching(true);
    track('search', { query: searchQuery.trim() });
    const results = await textSearchPlaces(searchQuery.trim(), lat, lng);
    setSearchResults(results);
    setIsSearching(false);
    setShowSearch(true);
  }, [searchQuery, useGps, loc.lat, loc.lng, selectedCity]);

  // Dismiss search and merge results into the main Discover list
  const dismissSearch = useCallback(() => {
    if (searchResults.length > 0) {
      setPlaces(prev => {
        const existingIds = new Set(prev.map(p => p.placeId));
        const newPlaces = searchResults.filter(p => !existingIds.has(p.placeId));
        return [...newPlaces, ...prev];
      });
    }
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  }, [searchResults]);

  const isSaved = (placeId: string) => savedPlaces.some(p => p.placeId === placeId);
  const toggleSaved = (place: Place) => {
    hapticImpact(isSaved(place.placeId) ? 'Light' : 'Medium');
    if (isSaved(place.placeId)) {
      setSavedPlaces(prev => prev.filter(p => p.placeId !== place.placeId));
      showToast('Removed from saved');
      track('unsave_place', { place: place.name });
      if (user) deleteSavedPlace(place.placeId);
    } else {
      setSavedPlaces(prev => [...prev, place]);
      showToast('Saved for later');
      track('save_place', { place: place.name, category: place.categoryDisplay || '' });
      if (user) upsertSavedPlaces([{ placeId: place.placeId, data: place as unknown as Record<string, unknown> }]);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedPlace || reviewRating === 0 || !user) return;
    setReviewSubmitting(true);
    // Upload photos first if any
    let photoUrls: string[] = [];
    if (reviewPhotos.length > 0) {
      photoUrls = await uploadReviewPhotos(reviewPhotos);
    }
    const result = await saveReview(selectedPlace.placeId, citySlug, reviewRating, reviewText, reviewTags, photoUrls.length > 0 ? photoUrls : undefined);
    if (result.success) {
      hapticNotification('Success');
      showToast('Review submitted!');
      setShowReviewForm(false);
      setReviewRating(0);
      setReviewText('');
      setReviewTags([]);
      setReviewPhotos([]);
      const updated = await fetchReviews(selectedPlace.placeId);
      setPlaceReviews(updated);
      const ids = places.map(p => p.placeId);
      if (ids.length > 0) fetchPlaceTagCounts(ids).then(setPlaceTagsCache);
    } else {
      showToast('Failed to submit review — please try again');
    }
    setReviewSubmitting(false);
  };

  const sharePlace = async (place: Place) => {
    hapticImpact('Light');
    const deepLink = `https://nxstops.com/place/${encodeURIComponent(place.placeId)}`;
    try {
      // Use native Capacitor Share on mobile for better native sheet
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const { Share } = await import('@capacitor/share');
        await Share.share({ title: place.name, text: `Check out ${place.name} on NxStops`, url: deepLink, dialogTitle: 'Share this place' });
        return;
      }
    } catch { /* fall through to web share */ }
    if (navigator.share) {
      await navigator.share({ title: place.name, text: `Check out ${place.name} on NxStops`, url: deepLink });
    } else {
      await navigator.clipboard.writeText(deepLink);
      showToast('Link copied');
    }
  };

  // Helpers
  const isReservable = (place: Place): boolean => RESERVABLE_TYPES.includes(place.category);
  const isBookable = (place: Place): boolean => BOOKABLE_TYPES.includes(place.category);

  const getBookingUrl = (place: Place): string => {
    // For restaurants, link to OpenTable search
    if (RESERVABLE_TYPES.includes(place.category)) {
      const term = encodeURIComponent(place.name);
      const city = place.address ? encodeURIComponent(place.address.split(',').slice(-2).join(',').trim()) : '';
      return `https://www.opentable.com/s?term=${term}&covers=2${city ? `&queryUnderstandingType=location&rawQuery=${term}+${city}` : ''}`;
    }
    if (place.website) return place.website;
    const q = encodeURIComponent(`${place.name} ${place.address ? place.address.split(',')[0] : ''} tickets`);
    return `https://www.google.com/search?q=${q}`;
  };

  const getBookingLabel = (place: Place): string => {
    if (RESERVABLE_TYPES.includes(place.category)) return 'OpenTable';
    return 'Book';
  };

  const getSafetyIndicators = (place: Place): string[] => {
    const indicators: string[] = [];
    if (place.rating >= 4.3 && place.reviewCount >= 100) indicators.push('Well-reviewed');
    if (place.reviewCount >= 500) indicators.push('Popular spot');
    if (NIGHTLIFE_TYPES.includes(place.category)) indicators.push('Night venue');
    if ((isReservable(place) || isBookable(place)) && place.rating >= 4.0) indicators.push('Reserve ahead');
    return indicators;
  };

  return {
    places, setPlaces, filteredPlaces, forYouPlaces, placesLoading, placesError, fetchPlaces,
    selectedVibes, toggleVibe, setSelectedVibes, quickFilters, setQuickFilters,
    viewMode, setViewMode, activeMapPin, setActiveMapPin,
    communityFilters, setCommunityFilters, placeTagsCache, travelGroup, setTravelGroup,
    savedPlaces, toggleSaved, isSaved,
    searchQuery, setSearchQuery, searchResults, isSearching, showSearch, setShowSearch, handleSearch, dismissSearch,
    placeReviews, showReviewForm, setShowReviewForm,
    reviewRating, setReviewRating, reviewText, setReviewText, reviewTags, setReviewTags,
    reviewSubmitting, handleSubmitReview, reviewPhotos, setReviewPhotos,
    sharePlace,
    isReservable, isBookable, getBookingUrl, getBookingLabel, getSafetyIndicators,
  };
}
