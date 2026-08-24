import { useState, useCallback, useEffect } from 'react';

// ============================================================
// Location hook — privacy-first geolocation
// ============================================================
// - Only requests location on explicit user action ("Use My Location")
// - Never requests permanent/continuous access (no watchPosition)
// - Stores approximate location in sessionStorage, not localStorage
// - Does not expose precise coordinates publicly
// - Provides manual selection as fallback

export interface UserLocation {
  latitude: number;
  longitude: number;
  source: 'gps' | 'manual';
  label?: string; // human-readable label, e.g. "Port Harcourt, Rivers"
  city?: string;
  state?: string;
  accuracy?: number; // accuracy in meters from GPS
}

const SESSION_KEY = 'frelux_user_location';

function loadFromSession(): UserLocation | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserLocation;
  } catch {
    return null;
  }
}

function saveToSession(loc: UserLocation) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(loc));
  } catch { /* non-critical */ }
}

function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch { /* non-critical */ }
}

// Reverse geocode using OpenStreetMap Nominatim (free, no API key needed)
// This gives us city/state from coordinates — approximate, not precise
async function reverseGeocode(lat: number, lng: number): Promise<{ city?: string; state?: string; label?: string }> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    if (!res.ok) return {};
    const data = await res.json();
    const addr = data?.address ?? {};
    const city = addr.city || addr.town || addr.county || addr.state_district || '';
    const state = addr.state || '';
    const label = [city, state].filter(Boolean).join(', ') || data?.display_name?.split(',').slice(0, 2).join(',').trim() || '';
    return { city: city || undefined, state: state || undefined, label: label || undefined };
  } catch {
    return {};
  }
}

export function useLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Load from session on mount
  useEffect(() => {
    const saved = loadFromSession();
    if (saved) setLocation(saved);
  }, []);

  const detect = useCallback(async () => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported by your browser. Please select your location manually.');
      return;
    }

    setLoading(true);
    setError(null);

    // Use getCurrentPosition — one-time request, no continuous tracking
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;

        // Reverse geocode for human-readable label
        const geo = await reverseGeocode(latitude, longitude);

        const userLoc: UserLocation = {
          latitude,
          longitude,
          source: 'gps',
          accuracy,
          city: geo.city,
          state: geo.state,
          label: geo.label,
        };

        setLocation(userLoc);
        saveToSession(userLoc);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionDenied(true);
          setError('Location permission denied. You can select your location manually instead.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError('Location unavailable. Please select your location manually.');
        } else if (err.code === err.TIMEOUT) {
          setError('Location request timed out. Please try again or select manually.');
        } else {
          setError('Could not detect your location. Please select manually.');
        }
      },
      {
        enableHighAccuracy: false, // approximate location only
        timeout: 10000,
        maximumAge: 300000, // accept cached position up to 5 min old
      }
    );
  }, []);

  const setManual = useCallback((loc: Omit<UserLocation, 'source'>) => {
    const userLoc: UserLocation = { ...loc, source: 'manual' };
    setLocation(userLoc);
    saveToSession(userLoc);
    setError(null);
    setPermissionDenied(false);
  }, []);

  const clear = useCallback(() => {
    setLocation(null);
    clearSession();
    setError(null);
  }, []);

  return {
    location,
    loading,
    error,
    permissionDenied,
    detect,
    setManual,
    clear,
  };
}

// ============================================================
// Distance utilities
// ============================================================
export const DISTANCE_FILTERS = [
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 25, label: '25 km' },
  { value: 50, label: '50 km' },
] as const;

export type DistanceFilter = typeof DISTANCE_FILTERS[number]['value'];

// Haversine distance in km (client-side fallback)
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Format distance for display
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}
