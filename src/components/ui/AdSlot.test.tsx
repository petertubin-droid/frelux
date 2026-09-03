import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false, isPaid: false })),
}));

const logAdEvent = vi.fn();

vi.mock("@/lib/ad-config", async () => {
  const actual =
    await vi.importActual<Record<string, unknown>>("@/lib/ad-config");
  return {
    ...actual,
    fetchAdConfig: vi.fn(),
    getProvidersForPlacement: vi.fn(),
    getAdUnitId: vi.fn(() => null),
    shouldDisplayPlacement: vi.fn(() => true),
    logAdEvent: (...args: unknown[]) => logAdEvent(...args),
  };
});

vi.mock("@/lib/supabase-lazy", () => ({
  getSupabase: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  })),
}));

beforeEach(async () => {
  vi.clearAllMocks();
  // Reset the auth mock — individual tests may override isPaid
  const { useAuth } = await import("@/lib/auth");
  vi.mocked(useAuth).mockReturnValue({
    user: null,
    loading: false,
    isPaid: false,
  } as never);
  // Clean out any scripts injected by previous renders
  document.head
    .querySelectorAll("script[data-zone], script[src*='quge5.com']")
    .forEach((el) => el.remove());
  // Clear the per-session impression dedup so each test logs fresh impressions
  try {
    sessionStorage.clear();
  } catch {
    // private mode — ignore
  }
});

function makeMonetagProvider(settings: Record<string, unknown> = {}) {
  return {
    id: "prov-monetag",
    name: "Monetag",
    slug: "monetag",
    provider_type: "display",
    is_active: true,
    priority: 1,
    credentials: { zone_id: "1234567" },
    settings,
    is_system: true,
    created_at: "",
    updated_at: "",
  } as never;
}

async function renderAdSlot(props: Record<string, unknown> = {}) {
  const AdSlot = (await import("@/components/ui/AdSlot")).default;
  return render(
    <MemoryRouter>
      <AdSlot slotKey="test-slot" {...props} />
    </MemoryRouter>,
  );
}

describe("AdSlot", () => {
  it("renders null for paid users", async () => {
    const { useAuth } = await import("@/lib/auth");
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      isPaid: true,
    } as never);
    const { container } = await renderAdSlot();
    expect(container.innerHTML).toBe("");
  });

  it("resolves Monetag, injects its tag script, and logs an impression by default", async () => {
    const provider = makeMonetagProvider();
    const adConfig = await import("@/lib/ad-config");
    vi.mocked(adConfig.fetchAdConfig).mockResolvedValue({
      providers: [provider],
      placements: [
        {
          id: "pl-1",
          placement_key: "test-slot",
          placement_type: "banner",
          is_active: true,
          provider_ids: ["prov-monetag"],
          ad_units: {},
          display_rules: { mobile: true, desktop: true },
          page_target: "all",
          position: "content",
        },
      ] as never,
    });
    vi.mocked(adConfig.getProvidersForPlacement).mockReturnValue([provider]);

    const { container } = await renderAdSlot();

    // Monetag container renders
    await waitFor(() => {
      expect(
        container.querySelector('[data-ad-provider="monetag"]'),
      ).not.toBeNull();
    });
    // Tag script injected
    await waitFor(() => {
      expect(
        document.head.querySelector('script[src*="quge5.com"]'),
      ).not.toBeNull();
    });
    // Impression logged
    expect(logAdEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "impression" }),
    );
  });

  it("hides visual ads when display_ads_enabled is false, but still logs impressions", async () => {
    const provider = makeMonetagProvider({ display_ads_enabled: false });
    const adConfig = await import("@/lib/ad-config");
    vi.mocked(adConfig.fetchAdConfig).mockResolvedValue({
      providers: [provider],
      placements: [
        {
          id: "pl-1",
          placement_key: "test-slot",
          placement_type: "banner",
          is_active: true,
          provider_ids: ["prov-monetag"],
          ad_units: {},
          display_rules: { mobile: true, desktop: true },
          page_target: "all",
          position: "content",
        },
      ] as never,
    });
    vi.mocked(adConfig.getProvidersForPlacement).mockReturnValue([provider]);

    const { container } = await renderAdSlot();

    // Impression still logged (analytics keep counting)
    await waitFor(() => {
      expect(logAdEvent).toHaveBeenCalledWith(
        expect.objectContaining({ event_type: "impression" }),
      );
    });
    // But nothing visual renders — only the hidden reserved zone
    await waitFor(() => {
      expect(
        container.querySelector('[data-ad-reserved="test-slot"]'),
      ).not.toBeNull();
    });
    expect(container.querySelector('[data-ad-provider="monetag"]')).toBeNull();
    // And no third-party ad script is injected
    expect(document.head.querySelector('script[src*="quge5.com"]')).toBeNull();
  });
});
