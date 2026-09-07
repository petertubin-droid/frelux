import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useFreluxLocation } from "./useFreluxLocation";
import {
  BrowserGeolocationProvider,
  locationProviderRegistry,
  type GeolocationProvider,
  type GeolocationResult,
  type ReverseGeocodeResult,
  type ForwardGeocodeResult,
  type SearchCandidate,
} from "./providers";
import { emptyLocation } from "./model";

// ---- Test providers injected through the registry seam ----

class MockGeoProvider implements GeolocationProvider {
  readonly id = "mock-geo";
  readonly label = "Mock";
  next: GeolocationResult = { ok: true, location: { ...emptyLocation("gps"), latitude: 6.5, longitude: 3.4, accuracy_m: 30 } };
  calls = 0;
  async getPosition(): Promise<GeolocationResult> {
    this.calls++;
    return this.next;
  }
}

class MockReverse {
  next: ReverseGeocodeResult = {
    ok: true,
    location: { country: "Nigeria", country_code: "NG", city: "Lagos", verification: "provider_verified" },
  };
  async reverseGeocode(): Promise<ReverseGeocodeResult> {
    return this.next;
  }
}

class MockForward {
  next: ForwardGeocodeResult = {
    ok: true,
    candidates: [
      {
        latitude: 9.07,
        longitude: 7.49,
        formatted_address: "Abuja, Nigeria",
        country: "Nigeria",
        country_code: "NG",
        region: "FCT",
        city: "Abuja",
        postcode: null,
        place_id: "osm-1",
      } as SearchCandidate,
    ],
  };
  async search(): Promise<ForwardGeocodeResult> {
    return this.next;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProvider = any;

describe("useFreluxLocation", () => {
  let geo: MockGeoProvider;
  let reverse: MockReverse;
  let forward: MockForward;

  beforeEach(() => {
    geo = new MockGeoProvider();
    reverse = new MockReverse();
    forward = new MockForward();
    locationProviderRegistry.setGeolocationProvider(geo as AnyProvider);
    locationProviderRegistry.setReverseGeocodingProvider(reverse as AnyProvider);
    locationProviderRegistry.setForwardGeocodingProvider(forward as AnyProvider);
    locationProviderRegistry.setMapProvider(null);
    localStorage.clear();
  });

  afterEach(() => {
    locationProviderRegistry.setGeolocationProvider(new BrowserGeolocationProvider());
    locationProviderRegistry.setReverseGeocodingProvider(new NominatimReverseGeocoderPublic());
    locationProviderRegistry.setForwardGeocodingProvider(new NominatimForwardGeocoderPublic());
  });

  it("starts in not_set and never requests location on mount", () => {
    const { result } = renderHook(() => useFreluxLocation());
    expect(result.current.state).toBe("not_set");
    expect(geo.calls).toBe(0); // privacy: explicit action only
  });

  it("GPS granted → canonical record with reverse-geocoded country", async () => {
    const { result } = renderHook(() => useFreluxLocation());
    await act(async () => {
      await result.current.useMyLocation();
    });
    expect(result.current.state).toBe("found");
    expect(result.current.location?.source).toBe("gps");
    expect(result.current.location?.latitude).toBe(6.5);
    expect(result.current.location?.accuracy_m).toBe(30);
    expect(result.current.location?.country_code).toBe("NG");
    expect(result.current.reverseGeocode.ok).toBe(true);
  });

  it("GPS without reverse geocoding keeps coordinates; nothing fabricated", async () => {
    reverse.next = { ok: false, error: "Reverse geocoding unavailable (offline)." };
    const { result } = renderHook(() => useFreluxLocation());
    await act(async () => {
      await result.current.useMyLocation();
    });
    expect(result.current.state).toBe("found");
    expect(result.current.location?.country_code).toBeNull();
    expect(result.current.reverseGeocode.ok).toBe(false);
    expect(result.current.reverseGeocode.message).toContain("unavailable");
  });

  it("GPS permission denied → denied state + remembered, no re-prompt", async () => {
    geo.next = { ok: false, error: "permission_denied" };
    const { result } = renderHook(() => useFreluxLocation());
    await act(async () => {
      await result.current.useMyLocation();
    });
    expect(result.current.state).toBe("permission_denied");
    expect(result.current.permissionDeniedRemembered).toBe(true);
    expect(localStorage.getItem("frelux_location_permission_denied")).toBe("1");

    // Second request must NOT re-prompt the browser
    const callsBefore = geo.calls;
    await act(async () => {
      await result.current.useMyLocation();
    });
    expect(geo.calls).toBe(callsBefore); // provider never called again
    expect(result.current.state).toBe("permission_denied");

    // Explicit retry clears the memory
    act(() => result.current.retryPermission());
    expect(result.current.permissionDeniedRemembered).toBe(false);
    geo.next = { ok: true, location: { ...emptyLocation("gps"), latitude: 6.5, longitude: 3.4 } };
    await act(async () => {
      await result.current.useMyLocation();
    });
    expect(result.current.state).toBe("found");
  });

  it("GPS unavailable / timeout → unavailable state with manual fallback intact", async () => {
    geo.next = { ok: false, error: "unavailable" };
    const { result } = renderHook(() => useFreluxLocation());
    await act(async () => {
      await result.current.useMyLocation();
    });
    expect(result.current.state).toBe("unavailable");
    expect(result.current.error).toBeTruthy();
  });

  it("search → provider-verified record (source: search)", async () => {
    const { result } = renderHook(() => useFreluxLocation());
    await act(async () => {
      await result.current.search("Abuja");
    });
    expect(result.current.searchResults).toHaveLength(1);
    act(() => result.current.selectSearchResult(result.current.searchResults[0]));
    expect(result.current.state).toBe("found");
    expect(result.current.location?.source).toBe("search");
    expect(result.current.location?.verification).toBe("provider_verified");
    expect(result.current.location?.city).toBe("Abuja");
  });

  it("search failure → error surfaced, manual still possible", async () => {
    forward.next = { ok: false, candidates: [], error: "Search unavailable (network error)." };
    const { result } = renderHook(() => useFreluxLocation());
    await act(async () => {
      await result.current.search("Abuja");
    });
    expect(result.current.searchError).toContain("unavailable");
    expect(result.current.state).toBe("not_set");
  });

  it("map pin when a provider is configured", async () => {
    locationProviderRegistry.setMapProvider({ id: "mock-map", label: "Mock Map" } as AnyProvider);
    const { result } = renderHook(() => useFreluxLocation());
    expect(result.current.mapEnabled).toBe(true);
    act(() => result.current.setMapPin(52.37, 4.9));
    expect(result.current.state).toBe("found");
    expect(result.current.location?.source).toBe("map_pin");
  });

  it("manual fallback with coordinates", () => {
    const { result } = renderHook(() => useFreluxLocation());
    act(() =>
      result.current.setManualLocation({
        latitude: 33.57,
        longitude: -7.59,
        country_code: "MA",
        city: "Casablanca",
      }),
    );
    expect(result.current.state).toBe("found");
    expect(result.current.location?.source).toBe("manual");
    expect(result.current.location?.verification).toBe("user_confirmed");
  });

  it("manual fallback with country only (region-level)", () => {
    const { result } = renderHook(() => useFreluxLocation());
    act(() => result.current.setManualLocation({ country_code: "KE", region: "Nairobi" }));
    expect(result.current.state).toBe("found");
  });

  it("manual entry with neither coords nor country is rejected honestly", () => {
    const { result } = renderHook(() => useFreluxLocation());
    let ok = false;
    act(() => {
      ok = result.current.setManualLocation({ city: "Nowhere" });
    });
    expect(ok).toBe(false);
    expect(result.current.state).toBe("not_set");
  });

  it("markSaved → saved state (persistence round-trip marker)", async () => {
    const { result } = renderHook(() => useFreluxLocation());
    await act(async () => {
      await result.current.useMyLocation();
    });
    act(() => result.current.markSaved());
    expect(result.current.state).toBe("saved");
    expect(result.current.lastSavedAt).toBeTruthy();
  });

  it("hydrateLocation preserves provenance on project reload", () => {
    const { result } = renderHook(() => useFreluxLocation());
    act(() =>
      result.current.hydrateLocation(
        {
          latitude: 6.5,
          longitude: 3.4,
          source: "search",
          verification: "provider_verified",
          captured_at: "2026-09-07T08:00:00Z",
          country_code: "NG",
        },
        true,
      ),
    );
    expect(result.current.state).toBe("saved");
    expect(result.current.location?.source).toBe("search"); // not overwritten
    expect(result.current.location?.verification).toBe("provider_verified");
  });

  it("clearLocation returns to not_set", async () => {
    const { result } = renderHook(() => useFreluxLocation());
    await act(async () => {
      await result.current.useMyLocation();
    });
    act(() => result.current.clearLocation());
    expect(result.current.state).toBe("not_set");
    expect(result.current.location).toBeNull();
  });

  it("invalid captured coordinates are rejected, not staged", async () => {
    geo.next = { ok: true, location: { ...emptyLocation("gps"), latitude: 999, longitude: 3.4 } };
    const { result } = renderHook(() => useFreluxLocation());
    await act(async () => {
      await result.current.useMyLocation();
    });
    expect(result.current.state).toBe("unavailable");
    expect(result.current.error).toContain("invalid");
  });

  it("waitFor-style async settle works", async () => {
    const { result } = renderHook(() => useFreluxLocation());
    act(() => {
      void result.current.useMyLocation();
    });
    await waitFor(() => expect(result.current.state).toBe("found"));
  });
});

// Restore helpers (imported lazily to avoid hoisting issues with mocks)
import {
  NominatimReverseGeocoder,
  NominatimForwardGeocoder,
} from "./providers";
class NominatimReverseGeocoderPublic extends NominatimReverseGeocoder {}
class NominatimForwardGeocoderPublic extends NominatimForwardGeocoder {}
