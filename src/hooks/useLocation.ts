import { useState, useEffect, useCallback } from 'react';

interface LocationState {
  lat: number | null;
  lng: number | null;
  city: string | null;
  loading: boolean;
  error: string | null;
  permissionDenied: boolean;
}

const INITIAL_STATE: LocationState = {
  lat: null,
  lng: null,
  city: null,
  loading: true,
  error: null,
  permissionDenied: false,
};

export function useLocation() {
  const [location, setLocation] = useState<LocationState>(INITIAL_STATE);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({
        ...prev,
        loading: false,
        error: 'Geolocation not supported',
      }));
      return;
    }

    setLocation(prev => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Reverse geocode to get city name using Google Maps Geocoding via our proxy
        let city: string | null = null;
        try {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&result_type=locality`
          );
          const data = await response.json();
          if (data.results?.[0]) {
            const cityComponent = data.results[0].address_components?.find(
              (c: { types: string[] }) => c.types.includes('locality')
            );
            city = cityComponent?.long_name || data.results[0].formatted_address;
          }
        } catch {
          // Reverse geocode failed — that's okay, we still have coords
        }

        setLocation({
          lat: latitude,
          lng: longitude,
          city,
          loading: false,
          error: null,
          permissionDenied: false,
        });
      },
      (error) => {
        setLocation({
          lat: null,
          lng: null,
          city: null,
          loading: false,
          error: error.message,
          permissionDenied: error.code === error.PERMISSION_DENIED,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // Cache for 5 minutes
      }
    );
  }, []);

  // Request location on mount
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return {
    ...location,
    requestLocation,
    hasLocation: location.lat !== null && location.lng !== null,
  };
}
