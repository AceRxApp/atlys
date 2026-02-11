import { useState, useEffect, useCallback } from 'react';
import { track } from '@vercel/analytics';
import { searchNearby, textSearchPlaces } from '../services/places';
import type { Place } from '../services/places';
import { saveReview, fetchReviews, fetchPlaceTagCounts } from '../supabase';
import type { Review } from '../supabase';
import type { User } from '@supabase/supabase-js';
import type { City, Vibe, QuickFilter, TravelGroup, CommunityTag } from '../types';
import {
  CITY_COORDS, NIGHTLIFE_TYPES, GIRLY_TYPES, GIRLY_KEYWORDS, BOYS_EXCLUDE_TYPES,
  RESERVABLE_TYPES, BOOKABLE_TYPES,
} from '../data';

interface LocState {
  lat: number | null;
  lng: number | null;
  city: string | null;
  hasLocation: boolean;
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
}) {
  const { useGps, loc, selectedCity, searchRadius, screen, user, selectedPlace, citySlug, useMiles, showToast } = deps;

  // --- Places ---
  const [places, setPlaces] = useState<Place[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesError, setPlacesError] = useState(false);
  const [selectedVibe, setSelectedVibe] = useState<Vibe | null>(null);
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

  // --- Reviews ---
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewTags, setReviewTags] = useState<CommunityTag[]>([]);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [placeReviews, setPlaceReviews] = useState<Review[]>([]);

  // --------------------------------------------------------------------------
  // Effects
  // --------------------------------------------------------------------------

  // Fetch places
  const fetchPlaces = useCallback(async () => {
    let lat: number | undefined, lng: number | undefined;
    if (useGps && loc.lat && loc.lng) { lat = loc.lat; lng = loc.lng; }
    else if (selectedCity) {
      const c = CITY_COORDS[selectedCity.name.toLowerCase()];
      if (c) { lat = c.lat; lng = c.lng; }
    }
    if (!lat || !lng) return;
    setPlacesLoading(true);
    setPlacesError(false);
    try {
      const vibes = selectedVibe ? [selectedVibe] : [];
      const results = await searchNearby(lat, lng, vibes, searchRadius);
      setPlaces(results);
      if (results.length === 0 && !selectedVibe) setPlacesError(true);
    } catch {
      setPlacesError(true);
    }
    setPlacesLoading(false);
  }, [useGps, loc.lat, loc.lng, selectedCity, selectedVibe, searchRadius]);

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

  // Persist saved places
  useEffect(() => {
    localStorage.setItem('nxstops_saved_places', JSON.stringify(savedPlaces));
  }, [savedPlaces]);

  // Persist travel group
  useEffect(() => {
    if (travelGroup) sessionStorage.setItem('nxstops_travel_group', travelGroup);
    else sessionStorage.removeItem('nxstops_travel_group');
  }, [travelGroup]);

  // --------------------------------------------------------------------------
  // Filtered places
  // --------------------------------------------------------------------------

  const filteredPlaces = places.filter(place => {
    for (const f of quickFilters) {
      switch (f) {
        case 'open': if (!place.openNow) return false; break;
        case 'walking': if (place.distance !== null && place.distance > 1) return false; break;
        case 'topRated': if (place.rating < 4.5) return false; break;
        case 'budget': if (place.priceLevel > 2 && place.priceLevel !== -1) return false; break;
        case 'family': if (NIGHTLIFE_TYPES.includes(place.category)) return false; if (place.rating > 0 && place.rating < 3.5) return false; break;
        case 'solo': if (place.reviewCount < 50) return false; if (place.rating > 0 && place.rating < 3.8) return false; break;
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
  });

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

  const isSaved = (placeId: string) => savedPlaces.some(p => p.placeId === placeId);
  const toggleSaved = (place: Place) => {
    if (isSaved(place.placeId)) {
      setSavedPlaces(prev => prev.filter(p => p.placeId !== place.placeId));
      showToast('Removed from saved');
      track('unsave_place', { place: place.name });
    } else {
      setSavedPlaces(prev => [...prev, place]);
      showToast('Saved for later');
      track('save_place', { place: place.name, category: place.categoryDisplay || '' });
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedPlace || reviewRating === 0 || !user) return;
    setReviewSubmitting(true);
    const result = await saveReview(selectedPlace.placeId, citySlug, reviewRating, reviewText, reviewTags);
    if (result.success) {
      showToast('Review submitted!');
      setShowReviewForm(false);
      setReviewRating(0);
      setReviewText('');
      setReviewTags([]);
      const updated = await fetchReviews(selectedPlace.placeId);
      setPlaceReviews(updated);
      const ids = places.map(p => p.placeId);
      if (ids.length > 0) fetchPlaceTagCounts(ids).then(setPlaceTagsCache);
    } else {
      showToast('Failed to submit review');
    }
    setReviewSubmitting(false);
  };

  const sharePlace = async (place: Place) => {
    if (navigator.share) {
      await navigator.share({ title: place.name, text: `Check out ${place.name} on NxStops`, url: place.googleMapsUrl });
    } else if (place.googleMapsUrl) {
      await navigator.clipboard.writeText(place.googleMapsUrl);
      showToast('Link copied');
    }
  };

  const handleSurpriseMe = () => {
    const open = places.filter(p => p.openNow);
    if (open.length === 0) { showToast('No open places found'); return; }
    return open[Math.floor(Math.random() * open.length)];
  };

  // Helpers
  const isReservable = (place: Place): boolean => RESERVABLE_TYPES.includes(place.category);
  const isBookable = (place: Place): boolean => BOOKABLE_TYPES.includes(place.category);

  const getBookingUrl = (place: Place): string => {
    if (place.website) return place.website;
    const q = encodeURIComponent(`${place.name} ${place.address ? place.address.split(',')[0] : ''} reservation`);
    return `https://www.google.com/search?q=${q}`;
  };

  const getBookingLabel = (place: Place): string => {
    if (RESERVABLE_TYPES.includes(place.category)) return 'Reserve';
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
    places, setPlaces, filteredPlaces, placesLoading, placesError, fetchPlaces,
    selectedVibe, setSelectedVibe, quickFilters, setQuickFilters,
    viewMode, setViewMode, activeMapPin, setActiveMapPin,
    communityFilters, setCommunityFilters, placeTagsCache, travelGroup, setTravelGroup,
    savedPlaces, toggleSaved, isSaved,
    searchQuery, setSearchQuery, searchResults, isSearching, showSearch, setShowSearch, handleSearch,
    placeReviews, showReviewForm, setShowReviewForm,
    reviewRating, setReviewRating, reviewText, setReviewText, reviewTags, setReviewTags,
    reviewSubmitting, handleSubmitReview,
    sharePlace, handleSurpriseMe,
    isReservable, isBookable, getBookingUrl, getBookingLabel, getSafetyIndicators,
  };
}
