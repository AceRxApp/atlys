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

        // Reverse geocode via server-side proxy (keeps API key hidden)
        let city: string | null = null;
        try {
          const response = await fetch(
            `/api/places?action=geocode&lat=${latitude}&lng=${longitude}`
          );
          const data = await response.json();
          city = data.city || null;
        } catch {
          // Reverse geocode failed — still have coords
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
        const isTimeout = error.code === error.TIMEOUT;
        setLocation({
          lat: null,
          lng: null,
          city: null,
          loading: false,
          error: isTimeout ? 'Location request timed out' : error.message,
          permissionDenied: error.code === error.PERMISSION_DENIED,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return {
    ...location,
    requestLocation,
    hasLocation: location.lat !== null && location.lng !== null,
  };
}
