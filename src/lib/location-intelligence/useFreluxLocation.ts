/**
 * FRELUX LOCATION INTELLIGENCE, useFreluxLocation hook
 *
 * The ONE canonical location state machine behind the LocationCard
 * widget and any future surface. Every capture path (GPS, search, map
 * pin, manual) funnels into the same canonical FreluxLocation record.
 *
 * Privacy rules implemented here:
 * - Location is only captured on explicit user action. Never on mount,
 *   never continuous (no watchPosition).
 * - After a permission denial, the denial is remembered (localStorage)
 *   and "Use My Location" will not re-prompt the browser until the
 *   user explicitly chooses to retry.
 * - Reverse geocoding is optional: when it fails, coordinates + accuracy
 *   are kept and the state records that address services were
 *   unavailable. No address is ever fabricated.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FreluxLocation,
  emptyLocation,
  sanitizeLocationRecord,
  validateFreluxLocation,
} from "./model";
import {
  locationProviderRegistry,
  locationFromSearchCandidate,
  type SearchCandidate,
} from "./providers";

// ============================================================
// Widget states (explicit, exhaustive)
// ============================================================

export type LocationState =
  | "not_set" // Location not set
  | "detecting" // Detecting location
  | "permission_requested" // Permission dialog showing
  | "found" // Location found (any source), record staged
  | "permission_denied" // Permission denied
  | "unavailable" // GPS unavailable / errored
  | "saved"; // Location persisted to the project

export interface ReverseGeocodeStatus {
  attempted: boolean;
  ok: boolean;
  message: string | null;
}

export interface FreluxLocationApi {
  state: LocationState;
  location: FreluxLocation | null;
  /** True when a valid record is staged (found or saved). */
  hasLocation: boolean;
  error: string | null;
  reverseGeocode: ReverseGeocodeStatus;
  /** Search (forward geocoding), null provider means unavailable. */
  searchEnabled: boolean;
  searchResults: SearchCandidate[];
  searching: boolean;
  searchError: string | null;
  /** Map pin selection, null provider means unavailable. */
  mapEnabled: boolean;
  /** Denial memory: true after the user has denied permission once. */
  permissionDeniedRemembered: boolean;
  /** True when persistence reported success ("Location saved"). */
  lastSavedAt: string | null;

  // Actions
  useMyLocation: (opts?: { highAccuracy?: boolean }) => Promise<void>;
  retryPermission: () => void;
  search: (query: string) => Promise<void>;
  selectSearchResult: (candidate: SearchCandidate) => void;
  setMapPin: (lat: number, lng: number) => void;
  setManualLocation: (input: {
    latitude?: number | null;
    longitude?: number | null;
    formatted_address?: string | null;
    country?: string | null;
    country_code?: string | null;
    region?: string | null;
    city?: string | null;
    postcode?: string | null;
  }) => boolean;
  clearLocation: () => void;
  /** Persistence layer calls this after a successful save ("Location saved"). */
  markSaved: () => void;
  /**
   * Stage a previously persisted canonical record (project reload).
   * Provenance (source, verification, captured_at) is preserved exactly.
   * persisted=true marks the widget as "saved"; false stages it as "found".
   */
  hydrateLocation: (
    record: Record<string, unknown>,
    persisted?: boolean,
  ) => void;
}

const DENIED_KEY = "frelux_location_permission_denied";

function loadDeniedMemory(): boolean {
  try {
    return localStorage.getItem(DENIED_KEY) === "1";
  } catch {
    return false;
  }
}

export function useFreluxLocation(): FreluxLocationApi {
  const [state, setState] = useState<LocationState>("not_set");
  const [location, setLocation] = useState<FreluxLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reverseGeocode, setReverseGeocode] = useState<ReverseGeocodeStatus>({
    attempted: false,
    ok: false,
    message: null,
  });
  const [searchResults, setSearchResults] = useState<SearchCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [permissionDeniedRemembered, setPermissionDeniedRemembered] =
    useState<boolean>(
      () => typeof window !== "undefined" && loadDeniedMemory(),
    );
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const geoProvider = locationProviderRegistry.getGeolocation();
  const reverseProvider = locationProviderRegistry.getReverseGeocoding();
  const forwardProvider = locationProviderRegistry.getForwardGeocoding();
  const mapProvider = locationProviderRegistry.getMap();

  /** Apply a newly captured record; used by every capture path. */
  const applyRecord = useCallback((loc: FreluxLocation) => {
    const { valid, issues } = validateFreluxLocation(loc);
    if (!valid) {
      setState("unavailable");
      setError(
        issues.includes("invalid_coordinates")
          ? "The captured coordinates are invalid. Try again or enter the location manually."
          : "This location is incomplete. Add a country or coordinates.",
      );
      return;
    }
    setLocation(loc);
    setError(null);
    setState("found");
  }, []);

  const useMyLocation = useCallback(
    async (opts?: { highAccuracy?: boolean }) => {
      setError(null);
      setSearchResults([]);

      // Respect remembered denial, never re-prompt without explicit retry.
      if (permissionDeniedRemembered) {
        setState("permission_denied");
        setError(
          "Location permission was previously denied. Enter your location manually, or retry permission below.",
        );
        return;
      }

      setState("detecting");

      const result = await geoProvider.getPosition({
        highAccuracy: opts?.highAccuracy,
      });
      if (!mounted.current) return;

      if (!result.ok || !result.location) {
        if (result.error === "permission_denied") {
          try {
            localStorage.setItem(DENIED_KEY, "1");
          } catch {
            /* non-critical */
          }
          setPermissionDeniedRemembered(true);
          setState("permission_denied");
          setError(
            "Location permission denied. You can still search for your location or enter it manually.",
          );
        } else if (result.error === "unsupported") {
          setState("unavailable");
          setError(
            result.message ??
              "Location detection is not supported on this device.",
          );
        } else {
          setState("unavailable");
          setError(
            result.error === "timeout"
              ? "Location request timed out. Check your GPS or enter the location manually."
              : "Location unavailable. Check your device settings, or search / enter your location manually.",
          );
        }
        return;
      }

      // GPS succeeded. Reverse geocoding is optional, attempt it.
      const record = result.location;
      const reverser = reverseProvider;
      if (!reverser) {
        setReverseGeocode({
          attempted: false,
          ok: false,
          message:
            "Address lookup services are not configured. Coordinates are kept exactly as detected.",
        });
        applyRecord(record);
        return;
      }

      const geo = await reverser.reverseGeocode(
        record.latitude!,
        record.longitude!,
      );
      if (!mounted.current) return;
      if (geo.ok && geo.location) {
        setReverseGeocode({
          attempted: true,
          ok: true,
          message: "Address verified by the configured geocoding provider.",
        });
        applyRecord({ ...record, ...geo.location });
      } else {
        setReverseGeocode({
          attempted: true,
          ok: false,
          message:
            geo.error ??
            "Reverse geocoding unavailable, showing coordinates only.",
        });
        applyRecord(record);
      }
    },
    [geoProvider, reverseProvider, permissionDeniedRemembered, applyRecord],
  );

  /** Explicit user action clears denial memory and allows one re-prompt. */
  const retryPermission = useCallback(() => {
    try {
      localStorage.removeItem(DENIED_KEY);
    } catch {
      /* non-critical */
    }
    setPermissionDeniedRemembered(false);
    setState("not_set");
    setError(null);
  }, []);

  const search = useCallback(
    async (query: string) => {
      if (!forwardProvider) {
        setSearchError(
          "Location search is unavailable, no search provider configured.",
        );
        return;
      }
      setSearching(true);
      setSearchError(null);
      const res = await forwardProvider.search(query);
      if (!mounted.current) return;
      setSearching(false);
      if (!res.ok) {
        setSearchResults([]);
        setSearchError(
          res.error ??
            "Search failed. Try again or enter the location manually.",
        );
      } else {
        setSearchResults(res.candidates);
        if (res.candidates.length === 0) {
          setSearchError(
            "No matching locations found. Try a different search or enter the location manually.",
          );
        }
      }
    },
    [forwardProvider],
  );

  const selectSearchResult = useCallback(
    (candidate: SearchCandidate) => {
      setSearchResults([]);
      setSearchError(null);
      setReverseGeocode({
        attempted: false,
        ok: false,
        message: null,
      });
      applyRecord(locationFromSearchCandidate(candidate));
    },
    [applyRecord],
  );

  /** Map pin selection, only reachable when a map provider is configured. */
  const setMapPin = useCallback(
    (lat: number, lng: number) => {
      if (!mapProvider) return;
      applyRecord({
        ...emptyLocation("map_pin"),
        latitude: lat,
        longitude: lng,
      });
    },
    [mapProvider, applyRecord],
  );

  /**
   * Manual entry. Accepts coordinates and/or text fields; the user's
   * input is trusted as user_confirmed, never guessed.
   */
  const setManualLocation = useCallback(
    (input: {
      latitude?: number | null;
      longitude?: number | null;
      formatted_address?: string | null;
      country?: string | null;
      country_code?: string | null;
      region?: string | null;
      city?: string | null;
      postcode?: string | null;
    }): boolean => {
      const record = sanitizeLocationRecord({
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        formatted_address: input.formatted_address ?? null,
        country: input.country ?? null,
        country_code: input.country_code ?? input.country ?? null,
        region: input.region ?? null,
        city: input.city ?? null,
        postcode: input.postcode ?? null,
        source: "manual",
        verification: "user_confirmed",
      } as unknown as Record<string, unknown>);
      const { valid, issues } = validateFreluxLocation(record);
      if (!valid) {
        setError(
          issues.includes("needs_country_or_coordinates")
            ? "Enter at least the coordinates or the country."
            : "The coordinates entered are invalid.",
        );
        return false;
      }
      setError(null);
      setReverseGeocode({ attempted: false, ok: false, message: null });
      applyRecord(record);
      return true;
    },
    [applyRecord],
  );

  const hydrateLocation = useCallback(
    (record: Record<string, unknown>, persisted = true) => {
      const loc2 = sanitizeLocationRecord(record);
      const { valid, issues } = validateFreluxLocation(loc2);
      if (!valid) {
        setError(
          `The saved location is incomplete (${issues.join(", ")}) and was not loaded.`,
        );
        return;
      }
      setLocation(loc2);
      setError(null);
      setSearchResults([]);
      setSearchError(null);
      setReverseGeocode({ attempted: false, ok: false, message: null });
      if (persisted) {
        setLastSavedAt(loc2.captured_at);
        setState("saved");
      } else {
        setState("found");
      }
    },
    [],
  );

  const clearLocation = useCallback(() => {
    setLocation(null);
    setError(null);
    setSearchResults([]);
    setSearchError(null);
    setReverseGeocode({ attempted: false, ok: false, message: null });
    setLastSavedAt(null);
    setState("not_set");
  }, []);

  // ---- Saved-state marking (persistence layer calls markSaved) ----
  const markSaved = useCallback(() => {
    setLastSavedAt(new Date().toISOString());
    setState("saved");
  }, []);

  return useMemo(
    () => ({
      state,
      location,
      hasLocation: !!location,
      error,
      reverseGeocode,
      searchEnabled: !!forwardProvider,
      searchResults,
      searching,
      searchError,
      mapEnabled: !!mapProvider,
      permissionDeniedRemembered,
      lastSavedAt,
      useMyLocation,
      retryPermission,
      search,
      selectSearchResult,
      setMapPin,
      setManualLocation,
      clearLocation,
      markSaved,
      hydrateLocation,
    }),
    [
      state,
      location,
      error,
      reverseGeocode,
      forwardProvider,
      searchResults,
      searching,
      searchError,
      mapProvider,
      permissionDeniedRemembered,
      lastSavedAt,
      useMyLocation,
      retryPermission,
      search,
      selectSearchResult,
      setMapPin,
      setManualLocation,
      clearLocation,
      markSaved,
      hydrateLocation,
    ],
  );
}
