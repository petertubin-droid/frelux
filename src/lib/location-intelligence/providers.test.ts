import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  BrowserGeolocationProvider,
  NominatimReverseGeocoder,
  NominatimForwardGeocoder,
  locationProviderRegistry,
  locationFromSearchCandidate,
} from "./providers";

// ============================================================
// Browser geolocation (native, free) — mocked navigator API
// ============================================================

function mockGeolocation(overrides: Partial<Geolocation> = {}) {
  const g: Geolocation = {
    getCurrentPosition: vi.fn(),
    watchPosition: vi.fn(),
    clearWatch: vi.fn(),
    ...overrides,
  } as unknown as Geolocation;
  Object.defineProperty(navigator, "geolocation", {
    value: g,
    configurable: true,
    writable: true,
  });
  return g;
}

describe("BrowserGeolocationProvider", () => {
  const provider = new BrowserGeolocationProvider();

  it("returns a canonical GPS record on success", async () => {
    const g = mockGeolocation({
      getCurrentPosition: (success: (pos: GeolocationPosition) => void) => {
        success({
          coords: { latitude: 6.6, longitude: 3.35, accuracy: 41 },
          timestamp: Date.now(),
        } as GeolocationPosition);
      },
    });
    void g;
    const res = await provider.getPosition();
    expect(res.ok).toBe(true);
    expect(res.location?.source).toBe("gps");
    expect(res.location?.latitude).toBe(6.6);
    expect(res.location?.accuracy_m).toBe(41);
    expect(res.location?.country_code).toBeNull(); // never inferred
  });

  it("maps PERMISSION_DENIED to permission_denied", async () => {
    mockGeolocation({
      getCurrentPosition: (
        _success: (pos: GeolocationPosition) => void,
        error: (err: GeolocationPositionError) => void,
      ) => {
        error({
          code: 1,
          message: "User denied Geolocation",
        } as GeolocationPositionError);
      },
    });
    const res = await provider.getPosition();
    expect(res.ok).toBe(false);
    expect(res.error).toBe("permission_denied");
  });

  it("maps POSITION_UNAVAILABLE and TIMEOUT", async () => {
    mockGeolocation({
      getCurrentPosition: (
        _success: (pos: GeolocationPosition) => void,
        error: (err: GeolocationPositionError) => void,
      ) => {
        error({ code: 2, message: "unavailable" } as GeolocationPositionError);
      },
    });
    expect((await provider.getPosition()).error).toBe("unavailable");
    mockGeolocation({
      getCurrentPosition: (
        _success: (pos: GeolocationPosition) => void,
        error: (err: GeolocationPositionError) => void,
      ) => {
        error({ code: 3, message: "timeout" } as GeolocationPositionError);
      },
    });
    expect((await provider.getPosition()).error).toBe("timeout");
  });

  it("reports unsupported when the browser has no geolocation", async () => {
    Object.defineProperty(navigator, "geolocation", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    const res = await provider.getPosition();
    expect(res.ok).toBe(false);
    expect(res.error).toBe("unsupported");
  });
});

// ============================================================
// Nominatim (free, keyless, optional) — mocked fetch
// ============================================================

describe("NominatimReverseGeocoder", () => {
  const geo = new NominatimReverseGeocoder();
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("maps a Nominatim response to provider-verified fields", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        display_name: "17 Marina Rd, Lagos, Nigeria",
        osm_id: 12345,
        address: {
          country: "Nigeria",
          country_code: "ng",
          state: "Lagos State",
          city: "Lagos",
          postcode: "101001",
        },
      }),
    });
    const res = await geo.reverseGeocode(6.45, 3.4);
    expect(res.ok).toBe(true);
    expect(res.location?.country_code).toBe("NG");
    expect(res.location?.verification).toBe("provider_verified");
    expect(res.location?.formatted_address).toContain("Marina");
  });

  it("degrades honestly when the service is down", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("network down"));
    const res = await geo.reverseGeocode(6.45, 3.4);
    expect(res.ok).toBe(false);
    expect(res.error).toContain("unavailable");
  });

  it("degrades honestly on HTTP errors", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({}),
    });
    const res = await geo.reverseGeocode(6.45, 3.4);
    expect(res.ok).toBe(false);
    expect(res.error).toContain("503");
  });
});

describe("NominatimForwardGeocoder", () => {
  const geo = new NominatimForwardGeocoder();
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("returns provider-verified search candidates", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          lat: "6.5244",
          lon: "3.3792",
          display_name: "Ikeja, Lagos, Nigeria",
          osm_id: 777,
          address: { country: "Nigeria", country_code: "NG", state: "Lagos" },
        },
      ],
    });
    const res = await geo.search("Ikeja");
    expect(res.ok).toBe(true);
    expect(res.candidates).toHaveLength(1);
    expect(res.candidates[0].country_code).toBe("NG");

    const loc = locationFromSearchCandidate(res.candidates[0]);
    expect(loc.source).toBe("search");
    expect(loc.verification).toBe("provider_verified");
    expect(loc.city ?? loc.region).toBeTruthy();
  });

  it("returns empty for short queries without calling the API", async () => {
    const res = await geo.search("a");
    expect(res.candidates).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("degrades honestly when search fails", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    const res = await geo.search("Somewhere");
    expect(res.ok).toBe(false);
    expect(res.candidates).toHaveLength(0);
  });
});

// ============================================================
// Registry — provider swap without touching callers
// ============================================================

describe("locationProviderRegistry", () => {
  it("defaults to free/native providers with no map provider", () => {
    const status = locationProviderRegistry.describe();
    expect(status.geolocation.kind).toBe("native");
    expect(status.reverseGeocoding?.kind).toBe("free");
    expect(status.forwardGeocoding?.kind).toBe("free");
    expect(status.map).toBeNull();
  });

  it("allows swapping providers (future external services) without code changes", () => {
    const original = locationProviderRegistry.getReverseGeocoding();
    locationProviderRegistry.setReverseGeocodingProvider(null);
    expect(locationProviderRegistry.getReverseGeocoding()).toBeNull();
    expect(locationProviderRegistry.describe().reverseGeocoding).toBeNull();
    // restore for other tests
    locationProviderRegistry.setReverseGeocodingProvider(original!);
  });
});
