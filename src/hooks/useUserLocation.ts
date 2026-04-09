import { useState, useEffect, useCallback } from 'react';

interface UserLocation {
  latitude: number;
  longitude: number;
}

interface UseUserLocationReturn {
  location: UserLocation | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

const STORAGE_KEY = 'match-golf-user-location';
const CACHE_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Gets the user's GPS coordinates for sorting course search results by proximity.
 * Caches in sessionStorage so we only prompt once per session.
 * Falls back gracefully — if denied, course search still works without sorting.
 */
export function useUserLocation(): UseUserLocationReturn {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLocation = useCallback(() => {
    // Check sessionStorage cache first
    try {
      const cached = sessionStorage.getItem(STORAGE_KEY);
      if (cached) {
        const { lat, lng, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_MAX_AGE_MS) {
          setLocation({ latitude: lat, longitude: lng });
          return;
        }
      }
    } catch {
      // Ignore parse errors
    }

    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setLocation(loc);
        setIsLoading(false);
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
            lat: loc.latitude,
            lng: loc.longitude,
            timestamp: Date.now(),
          }));
        } catch {
          // Storage full
        }
      },
      () => {
        // User denied or error — not a problem, just skip location features
        setIsLoading(false);
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: CACHE_MAX_AGE_MS },
    );
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  return { location, isLoading, error, refresh: fetchLocation };
}

/**
 * Haversine distance in miles between two lat/lng points.
 */
export function distanceMiles(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
