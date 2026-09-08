import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LocationCard from "@/components/location/LocationCard";
import { locationProviderRegistry } from "@/lib/location-intelligence/providers";
import { emptyLocation } from "@/lib/location-intelligence/model";
import type { GeolocationResult } from "@/lib/location-intelligence/providers";

// ---- mock providers (registry seam, no network, no navigator) ----
class MockGeo {
  next: GeolocationResult = {
    ok: true,
    location: { ...emptyLocation("gps"), latitude: 6.5244, longitude: 3.3792, accuracy_m: 35 },
  };
  async getPosition(): Promise<GeolocationResult> {
    return this.next;
  }
}
class MockReverse {
  next = { ok: false, error: "Reverse geocoding unavailable (network error)." };
  async reverseGeocode() {
    return this.next;
  }
}
class MockForward {
  next = { ok: true, candidates: [] };
  async search() {
    return this.next;
  }
}

// mock supabase-lazy (regional resolution)
vi.mock("@/lib/supabase-lazy", () => ({
  getSupabase: vi.fn(async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              country_code: "NG",
              country_name: "Nigeria",
              currency_code: "NGN",
              currency_symbol: "₦",
              default_measurement_system: "mixed",
              default_length_unit: "meters",
              default_area_unit: "sqm",
              local_terminology: {},
              profile_version: "1.0.0",
              status: "active",
            },
          }),
        }),
      }),
    }),
  })),
}));

describe("LocationCard", () => {
  let geo: MockGeo;
  let reverse: MockReverse;
  let forward: MockForward;

  beforeEach(() => {
    geo = new MockGeo();
    reverse = new MockReverse();
    forward = new MockForward();
    locationProviderRegistry.setGeolocationProvider(geo as never);
    locationProviderRegistry.setReverseGeocodingProvider(reverse as never);
    locationProviderRegistry.setForwardGeocodingProvider(forward as never);
    locationProviderRegistry.setMapProvider(null);
    localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders not_set state and offers GPS + search, no map provider shown as configured", () => {
    render(<LocationCard />);
    expect(screen.getByTestId("state-not-set")).toBeTruthy();
    expect(screen.getByTestId("use-my-location")).toBeTruthy();
    expect(screen.getByTestId("open-search")).toBeTruthy();
  });

  it("detecting → found: shows coordinates + accuracy + reverse-geocode-unavailable honesty", async () => {
    render(<LocationCard />);
    fireEvent.click(screen.getByTestId("use-my-location"));
    await waitFor(() =>
      expect(screen.getByTestId("state-found")).toBeTruthy(),
    );
    expect(screen.getByText(/6\.52440/)).toBeTruthy();
    expect(screen.getByText(/± 35 m/)).toBeTruthy();
    expect(screen.getByTestId("reverse-unavailable")).toBeTruthy();
    expect(screen.getByText(/No address was guessed/)).toBeTruthy();
  });

  it("permission denied state offers manual fallback and retry, without blocking", async () => {
    geo.next = { ok: false, error: "permission_denied" };
    render(<LocationCard />);
    fireEvent.click(screen.getByTestId("use-my-location"));
    await waitFor(() =>
      expect(screen.getByTestId("state-permission-denied")).toBeTruthy(),
    );
    expect(screen.getByTestId("denied-manual-fallback")).toBeTruthy();
    expect(screen.getByTestId("retry-permission")).toBeTruthy();
    expect(screen.getByTestId("denied-search-fallback")).toBeTruthy();
  });

  it("unavailable state offers retry + manual fallback", async () => {
    geo.next = { ok: false, error: "unavailable" };
    render(<LocationCard />);
    fireEvent.click(screen.getByTestId("use-my-location"));
    await waitFor(() => expect(screen.getByTestId("state-unavailable")).toBeTruthy());
    expect(screen.getByTestId("retry-detect")).toBeTruthy();
    expect(screen.getByTestId("unavailable-manual-fallback")).toBeTruthy();
  });

  it("GPS + reverse geocode success → regional panel shows resolved context", async () => {
    reverse.next = {
      ok: true,
      location: { country: "Nigeria", country_code: "NG", verification: "provider_verified" },
    } as never;
    render(<LocationCard />);
    fireEvent.click(screen.getByTestId("use-my-location"));
    await waitFor(() =>
      expect(screen.getByText(/Regional data available/)).toBeTruthy(),
    );
    expect(screen.getByText(/NGN/)).toBeTruthy();
    expect(screen.getByText(/mixed/)).toBeTruthy();
  });

  it("manual fallback entry works end-to-end", () => {
    render(<LocationCard />);
    fireEvent.click(screen.getByTestId("open-search")); // opens editing
    fireEvent.change(screen.getByTestId("manual-lat"), { target: { value: "33.57" } });
    fireEvent.change(screen.getByTestId("manual-lng"), { target: { value: "-7.59" } });
    fireEvent.change(screen.getByTestId("manual-country"), { target: { value: "ma" } });
    fireEvent.click(screen.getByTestId("manual-submit"));
    expect(screen.getByTestId("state-found")).toBeTruthy();
    expect(screen.getByText(/Entered manually/)).toBeTruthy();
  });

  it("search flow with results → select → found", async () => {
    forward.next = {
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
          place_id: null,
        },
      ],
    } as never;
    render(<LocationCard />);
    fireEvent.click(screen.getByTestId("open-search"));
    fireEvent.change(screen.getByTestId("search-input"), { target: { value: "Abuja" } });
    fireEvent.submit(screen.getByTestId("search-input").closest("form")!);
    await waitFor(() => expect(screen.getByTestId("search-results")).toBeTruthy());
    fireEvent.click(screen.getByTestId("search-result-0"));
    expect(screen.getByTestId("state-found")).toBeTruthy();
    expect(screen.getByText(/Abuja/)).toBeTruthy();
  });

  it("save flow: onSave called, saved state shown; change-location available", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<LocationCard onSave={onSave} />);
    fireEvent.click(screen.getByTestId("use-my-location"));
    await waitFor(() => expect(screen.getByTestId("save-location")).toBeTruthy());
    fireEvent.click(screen.getByTestId("save-location"));
    await waitFor(() => expect(screen.getByTestId("state-saved")).toBeTruthy());
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]?.latitude).toBe(6.5244);
    expect(screen.getByTestId("change-location")).toBeTruthy();
  });

  it("hydrates a saved project location on reload (saved state, provenance kept)", async () => {
    const onSave = vi.fn();
    render(
      <LocationCard
        onSave={onSave}
        initialLocation={
          {
            latitude: 6.5,
            longitude: 3.4,
            source: "search",
            verification: "provider_verified",
            captured_at: "2026-09-07T08:00:00Z",
            country_code: "NG",
          } as never
        }
      />,
    );
    await waitFor(() => expect(screen.getByTestId("state-saved")).toBeTruthy());
    expect(screen.getByText(/Search/)).toBeTruthy(); // provenance label preserved
  });

  it("declares map pin unavailable when no map provider is configured", () => {
    render(<LocationCard />);
    fireEvent.click(screen.getByTestId("open-search"));
    expect(
      screen.getByText(/Map pin selection is unavailable/),
    ).toBeTruthy();
  });
});
