/**
 * FRELUX LOCATION INTELLIGENCE — Provider Adapters
 *
 * Every external location capability is behind a provider interface so
 * providers can be swapped or added without touching the canonical model
 * or any calling code:
 *
 *   - GeolocationProvider    — device position (native browser API default)
 *   - ReverseGeocodingProvider — coordinates → address
 *   - ForwardGeocodingProvider — text search → candidates
 *   - MapProvider            — interactive map / pin selection
 *
 * FREE-FIRST: the default geolocation provider is the browser's native
 * W3C Geolocation API — no key, no cost. The default geocoding provider
 * is OpenStreetMap Nominatim (free, keyless); it is OPTIONAL — GPS and
 * manual entry work with no provider at all.
 *
 * NO SECRETS: providers that require API keys read them from build-time
 * env (VITE_*) which must be publishable/restricted keys, or — better —
 * through a backend proxy. The registry never embeds secret keys.
 * External paid providers (Google Maps etc.) are NEVER activated
 * silently: they must be explicitly configured via env and their
 * status is surfaced to the UI.
 */

import {
  FreluxLocation,
  fromGeolocationPosition,
  normalizeCountryCode,
  emptyLocation,
} from "./model";

// ============================================================
// Provider interfaces
// ============================================================

export interface GeolocationResult {
  ok: boolean;
  location?: FreluxLocation;
  error?: "permission_denied" | "unavailable" | "timeout" | "unsupported";
  message?: string;
}

export interface GeolocationProvider {
  readonly id: string;
  readonly label: string;
  /** One-shot position request. Never continuous tracking. */
  getPosition(options?: { highAccuracy?: boolean }): Promise<GeolocationResult>;
}

export interface ReverseGeocodeResult {
  ok: boolean;
  location?: Partial<FreluxLocation>; // only the provider-verified fields
  error?: string;
}

export interface ReverseGeocodingProvider {
  readonly id: string;
  readonly label: string;
  reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult>;
}

export interface SearchCandidate {
  /** Provider-verified canonical fields for one search hit. */
  latitude: number;
  longitude: number;
  formatted_address: string;
  country: string | null;
  country_code: string | null;
  region: string | null;
  city: string | null;
  postcode: string | null;
  place_id: string | null;
}

export interface ForwardGeocodeResult {
  ok: boolean;
  candidates: SearchCandidate[];
  error?: string;
}

export interface ForwardGeocodingProvider {
  readonly id: string;
  readonly label: string;
  /** Autocomplete-friendly text search. */
  search(query: string): Promise<ForwardGeocodeResult>;
}

export interface MapProvider {
  readonly id: string;
  readonly label: string;
  /** Component the LocationCard renders for pin selection, when configured. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  MapPickerComponent?: any;
}

// ============================================================
// Native browser geolocation (default, free, keyless)
// ============================================================

const GEO_OPTIONS = { timeout: 12000, maximumAge: 5 * 60 * 1000 };

export class BrowserGeolocationProvider implements GeolocationProvider {
  readonly id = "browser-geolocation";
  readonly label = "Browser Geolocation (native)";

  private static mapErrorCode(code: number): GeolocationResult["error"] {
    if (code === 1) return "permission_denied";
    if (code === 2) return "unavailable";
    if (code === 3) return "timeout";
    return "unavailable";
  }

  async getPosition(
    options?: { highAccuracy?: boolean },
  ): Promise<GeolocationResult> {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return {
        ok: false,
        error: "unsupported",
        message:
          "This browser does not support location detection. Enter your location manually.",
      };
    }

    return new Promise<GeolocationResult>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ ok: true, location: fromGeolocationPosition(pos) }),
        (err) =>
          resolve({
            ok: false,
            error: BrowserGeolocationProvider.mapErrorCode(err.code),
            message: err.message || undefined,
          }),
        {
          ...GEO_OPTIONS,
          enableHighAccuracy: options?.highAccuracy ?? false,
        },
      );
    });
  }
}

// ============================================================
// OpenStreetMap Nominatim (free, keyless geocoding — optional)
// ============================================================

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const NOMINATIM_HEADERS = { "Accept-Language": "en" };

/**
 * Nominatim reverse geocoder. Free and keyless, but OPTIONAL — if the
 * request fails (offline, blocked, rate-limited) the caller keeps the
 * raw GPS coordinates and the UI shows "reverse geocoding unavailable".
 * This class never throws.
 */
export class NominatimReverseGeocoder implements ReverseGeocodingProvider {
  readonly id = "nominatim";
  readonly label = "OpenStreetMap Nominatim (free)";

  async reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
    try {
      const url = `${NOMINATIM_BASE}/reverse?format=json&lat=${encodeURIComponent(
        lat,
      )}&lon=${encodeURIComponent(lng)}&zoom=16&addressdetails=1`;
      const res = await fetch(url, { headers: NOMINATIM_HEADERS });
      if (!res.ok) return { ok: false, error: `Reverse geocoding unavailable (HTTP ${res.status})` };
      const data = await res.json();
      if (!data || (!data.address && !data.display_name)) {
        return { ok: false, error: "No address data returned for these coordinates." };
      }
      const a = data.address ?? {};
      return {
        ok: true,
        location: {
          formatted_address: typeof data.display_name === "string" ? data.display_name : null,
          country: a.country ?? null,
          country_code: normalizeCountryCode(a.country_code ?? null),
          region: a.state ?? a.county ?? null,
          city: a.city ?? a.town ?? a.village ?? a.municipality ?? a.suburb ?? null,
          postcode: a.postcode ?? null,
          place_id: data.osm_id ? String(data.osm_id) : null,
          verification: "provider_verified",
        },
      };
    } catch {
      return { ok: false, error: "Reverse geocoding unavailable (network error)." };
    }
  }
}

/**
 * Nominatim forward geocoder (address / city / area / postcode search).
 * Free and keyless. Never throws; failure surfaces as an empty result
 * with an error message.
 */
export class NominatimForwardGeocoder implements ForwardGeocodingProvider {
  readonly id = "nominatim";
  readonly label = "OpenStreetMap Nominatim (free)";

  async search(query: string): Promise<ForwardGeocodeResult> {
    const q = query.trim();
    if (q.length < 2) return { ok: true, candidates: [] };
    try {
      const url = `${NOMINATIM_BASE}/search?format=json&addressdetails=1&limit=6&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: NOMINATIM_HEADERS });
      if (!res.ok) return { ok: false, candidates: [], error: `Search unavailable (HTTP ${res.status})` };
      const data = await res.json();
      if (!Array.isArray(data)) return { ok: false, candidates: [], error: "Invalid search response." };
      const candidates: SearchCandidate[] = [];
      for (const item of data) {
        const a = item.address ?? {};
        if (typeof item.lat !== "string" || typeof item.lon !== "string") continue;
        candidates.push({
          latitude: Number.parseFloat(item.lat),
          longitude: Number.parseFloat(item.lon),
          formatted_address: typeof item.display_name === "string" ? item.display_name : "",
          country: a.country ?? null,
          country_code: normalizeCountryCode(a.country_code ?? null),
          region: a.state ?? a.county ?? null,
          city: a.city ?? a.town ?? a.village ?? a.municipality ?? null,
          postcode: a.postcode ?? null,
          place_id: item.osm_id ? String(item.osm_id) : null,
        });
      }
      return { ok: true, candidates };
    } catch {
      return { ok: false, candidates: [], error: "Search unavailable (network error)." };
    }
  }
}

// ============================================================
// Provider registry
// ============================================================

/**
 * Build a search-selected canonical location from a provider candidate.
 * All fields come from the provider result — nothing is invented.
 */
export function locationFromSearchCandidate(
  candidate: SearchCandidate,
): FreluxLocation {
  return {
    ...emptyLocation("search"),
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    formatted_address: candidate.formatted_address || null,
    country: candidate.country,
    country_code: candidate.country_code,
    region: candidate.region,
    city: candidate.city,
    postcode: candidate.postcode,
    place_id: candidate.place_id,
    verification: "provider_verified",
  };
}

export interface LocationProviderStatus {
  geolocation: { id: string; label: string; kind: "native" | "external" };
  reverseGeocoding: { id: string; label: string; kind: "free" | "external" | "none" } | null;
  forwardGeocoding: { id: string; label: string; kind: "free" | "external" | "none" } | null;
  map: { id: string; label: string; kind: "free" | "external" } | null;
}

/**
 * The provider registry. Default configuration is 100% free and keyless:
 * native geolocation + OSM Nominatim geocoding, no map provider.
 *
 * Future external providers (Google Maps, Mapbox, …) slot in by
 * replacing registry entries — the canonical model, hook, and UI never
 * change. Such providers MUST be configured explicitly via env and are
 * surfaced with their status; paid services are never silently active.
 */
class LocationProviderRegistry {
  private geolocationProvider: GeolocationProvider =
    new BrowserGeolocationProvider();
  private reverseProvider: ReverseGeocodingProvider =
    new NominatimReverseGeocoder();
  private forwardProvider: ForwardGeocodingProvider =
    new NominatimForwardGeocoder();
  private mapProvider: MapProvider | null = null;

  /** Test/extension seam — swap any provider at runtime. */
  setGeolocationProvider(p: GeolocationProvider) { this.geolocationProvider = p; }
  setReverseGeocodingProvider(p: ReverseGeocodingProvider | null) { this.reverseProvider = p; }
  setForwardGeocodingProvider(p: ForwardGeocodingProvider | null) { this.forwardProvider = p; }
  setMapProvider(p: MapProvider | null) { this.mapProvider = p; }

  getGeolocation(): GeolocationProvider { return this.geolocationProvider; }
  getReverseGeocoding(): ReverseGeocodingProvider | null { return this.reverseProvider; }
  getForwardGeocoding(): ForwardGeocodingProvider | null { return this.forwardProvider; }
  getMap(): MapProvider | null { return this.mapProvider; }

  /** Human-readable provider status for the UI / admin surface. */
  describe(): LocationProviderStatus {
    return {
      geolocation: {
        id: this.geolocationProvider.id,
        label: this.geolocationProvider.label,
        kind: "native",
      },
      reverseGeocoding: this.reverseProvider
        ? { id: this.reverseProvider.id, label: this.reverseProvider.label, kind: "free" }
        : null,
      forwardGeocoding: this.forwardProvider
        ? { id: this.forwardProvider.id, label: this.forwardProvider.label, kind: "free" }
        : null,
      map: this.mapProvider
        ? { id: this.mapProvider.id, label: this.mapProvider.label, kind: "external" }
        : null,
    };
  }
}

export const locationProviderRegistry = new LocationProviderRegistry();
