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

  it("renders null for Monetag without per-placement ad unit ID (global tag handles it)", async () => {
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
          ad_unit_ids: {},
          display_rules: { mobile: true, desktop: true },
        },
      ] as never,
    });
    vi.mocked(adConfig.getProvidersForPlacement).mockReturnValue([provider]);

    const { container } = await renderAdSlot();

    // Monetag with no per-placement ad unit ID renders nothing —
    // the global tag.min.js in Layout.tsx handles Monetag display ads.
    await waitFor(() => {
      expect(
        container.querySelector('[data-ad-provider="monetag"]'),
      ).toBeNull();
    });
  });

  it("renders Monetag container when per-placement ad unit ID is configured", async () => {
    const provider = makeMonetagProvider();
    const adConfig = await import("@/lib/ad-config");
    // Override getAdUnitId to return the per-placement zone for this provider
    vi.mocked(adConfig.getAdUnitId).mockReturnValue("zone-999");
    vi.mocked(adConfig.fetchAdConfig).mockResolvedValue({
      providers: [provider],
      placements: [
        {
          id: "pl-1",
          placement_key: "test-slot",
          placement_type: "banner",
          is_active: true,
          provider_ids: ["prov-monetag"],
          ad_unit_ids: { "prov-monetag": "zone-999" },
          display_rules: { mobile: true, desktop: true },
        },
      ] as never,
    });
    vi.mocked(adConfig.getProvidersForPlacement).mockReturnValue([provider]);

    const { container } = await renderAdSlot();

    // Monetag container renders with the per-placement zone ID
    await waitFor(() => {
      const el = container.querySelector('[data-ad-provider="monetag"]');
      expect(el).not.toBeNull();
      expect(el?.getAttribute("data-zone")).toBe("zone-999");
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

  it("renders Monetag Native Banner container when native_banner_zone_id is configured", async () => {
    const provider = {
      ...(makeMonetagProvider() as unknown as Record<string, unknown>),
      credentials: { zone_id: "1234567", native_banner_zone_id: "7654321" },
    } as never;
    const adConfig = await import("@/lib/ad-config");
    vi.mocked(adConfig.getAdUnitId).mockReturnValue(null);
    vi.mocked(adConfig.fetchAdConfig).mockResolvedValue({
      providers: [provider],
      placements: [
        {
          id: "pl-1",
          placement_key: "test-slot",
          placement_type: "banner",
          is_active: true,
          provider_ids: ["prov-monetag"],
          ad_unit_ids: {},
          display_rules: { mobile: true, desktop: true },
        },
      ] as never,
    });
    vi.mocked(adConfig.getProvidersForPlacement).mockReturnValue([provider]);

    const { container } = await renderAdSlot();

    // In-page container renders with the native zone, and the SDK tag is
    // injected with that zone (not the site-wide display zone).
    await waitFor(() => {
      const el = container.querySelector('[data-ad-provider="monetag"]');
      expect(el).not.toBeNull();
      expect(el?.getAttribute("data-zone")).toBe("7654321");
    });
    await waitFor(() => {
      const tag = document.head.querySelector('script[src*="quge5.com"]');
      expect(tag).not.toBeNull();
      expect(tag?.getAttribute("data-zone")).toBe("7654321");
    });
    expect(logAdEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "impression" }),
    );
  });

  it("hides visual ads when display_ads_enabled is false, but still logs impressions", async () => {
    // Adsterra resolves in-slot (so the impression is real — the slot
    // was allocated), while the visual render is suppressed. Monetag
    // without a zone resolves "none" and logs nothing (no false
    // impressions) — that behavior is covered above.
    resetAdsterraPageStateForTests();
    const provider = makeAdsterraProvider(
      { key: "2fc239403361cb893fa79b52b1d98332" },
      { display_ads_enabled: false },
    ) as never;
    const adConfig = await import("@/lib/ad-config");
    vi.mocked(adConfig.fetchAdConfig).mockResolvedValue({
      providers: [provider],
      placements: [
        {
          id: "pl-1",
          placement_key: "test-slot",
          placement_type: "banner",
          is_active: true,
          provider_ids: ["prov-adsterra"],
          ad_unit_ids: {},
          display_rules: { mobile: true, desktop: true },
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

// ── Adsterra banner integration ──────────────────────────────────────

function makeAdsterraProvider(
  credentials: Record<string, unknown> = {},
  settings: Record<string, unknown> = {},
) {
  return {
    id: "prov-adsterra",
    name: "Adsterra",
    slug: "adsterra",
    provider_type: "display",
    is_active: true,
    priority: 11,
    credentials,
    settings,
    is_system: true,
    created_at: "",
    updated_at: "",
  } as never;
}

import {
  extractAdsterraZoneKey,
  getAdsterraServeDomain,
  resolveAdsterraSize,
  renderAdsterraBanner,
  renderAdsterraNativeBanner,
  resetAdsterraPageStateForTests,
} from "@/components/ui/AdSlot";

describe("Adsterra helpers", () => {
  beforeEach(() => resetAdsterraPageStateForTests());

  const prov = makeAdsterraProvider();

  it("defaults the serve domain to highperformanceformat.com", () => {
    expect(getAdsterraServeDomain(prov)).toBe("www.highperformanceformat.com");
  });

  it("uses a valid configured serve domain", () => {
    const p = makeAdsterraProvider({
      serve_domain: "pl12345678.profitabledisplaynetwork.com",
    });
    expect(getAdsterraServeDomain(p)).toBe(
      "pl12345678.profitabledisplaynetwork.com",
    );
  });

  it("rejects non-hostname serve domains (injection safety)", () => {
    const p = makeAdsterraProvider({ serve_domain: "https://evil.example/x" });
    expect(getAdsterraServeDomain(p)).toBe("www.highperformanceformat.com");
  });

  it("extracts a bare 32-hex zone key unchanged", () => {
    expect(extractAdsterraZoneKey("2fc239403361cb893fa79b52b1d98332")).toBe(
      "2fc239403361cb893fa79b52b1d98332",
    );
  });

  it("extracts the zone key from a pasted dashboard snippet", () => {
    const snippet =
      '<script async="async" data-cfasync="false" src="https://pl31194884.profitableratecpmnetwork.com/60c8524034bf047ff03e21ffec6aa01b/invoke.js"></script> <div id="container-60c8524034bf047ff03e21ffec6aa01b"></div>';
    expect(extractAdsterraZoneKey(snippet)).toBe(
      "60c8524034bf047ff03e21ffec6aa01b",
    );
  });

  it("returns empty for garbage / empty unit values", () => {
    expect(extractAdsterraZoneKey("")).toBe("");
    expect(extractAdsterraZoneKey(null)).toBe("");
    expect(extractAdsterraZoneKey("not-a-key")).toBe("");
    expect(extractAdsterraZoneKey("<script>alert(1)</script>")).toBe("");
  });

  it("sizes sidebars 300x250, bottoms 728x90 desktop / 320x50 mobile", () => {
    expect(resolveAdsterraSize(prov, "home_sidebar")).toEqual({
      width: 300,
      height: 250,
    });
    Object.defineProperty(window, "innerWidth", {
      value: 1200,
      configurable: true,
    });
    expect(resolveAdsterraSize(prov, "calculator_bottom")).toEqual({
      width: 728,
      height: 90,
    });
    Object.defineProperty(window, "innerWidth", {
      value: 390,
      configurable: true,
    });
    expect(resolveAdsterraSize(prov, "calculator_bottom")).toEqual({
      width: 320,
      height: 50,
    });
    expect(resolveAdsterraSize(prov, "learn_in_article")).toEqual({
      width: 300,
      height: 250,
    });
  });

  it("honours a per-placement banner_sizes override", () => {
    const p = makeAdsterraProvider(
      {},
      {
        banner_sizes: { home_sidebar: "160x600" },
      },
    );
    expect(resolveAdsterraSize(p, "home_sidebar")).toEqual({
      width: 160,
      height: 600,
    });
    expect(resolveAdsterraSize(p, "other_slot")).toEqual({
      width: 300,
      height: 250,
    });
  });
});

describe("AdSlot — Adsterra rendering", () => {
  beforeEach(async () => {
    resetAdsterraPageStateForTests();
    // mockReturnValue from earlier tests survives clearAllMocks — reset it
    const adConfig = await import("@/lib/ad-config");
    vi.mocked(adConfig.getAdUnitId).mockReturnValue(null);
  });

  it("renders the adsterra container and calls the banner injector with the resolved size", async () => {
    const provider = makeAdsterraProvider({ key: "a".repeat(32) });
    const adConfig = await import("@/lib/ad-config");
    vi.mocked(adConfig.fetchAdConfig).mockResolvedValue({
      providers: [provider],
      placements: [
        {
          id: "pl-1",
          placement_key: "test-slot",
          placement_type: "banner",
          is_active: true,
          provider_ids: ["prov-adsterra"],
          ad_unit_ids: {},
          display_rules: { mobile: true, desktop: true },
        },
      ] as never,
    });
    vi.mocked(adConfig.getProvidersForPlacement).mockReturnValue([provider]);

    // Spy the injector — appending a real srcdoc iframe makes happy-dom
    // attempt an async page load that surfaces as an unhandled rejection
    // in unrelated test files. The injector itself is unit-tested below
    // against a detached container (no document connection, no page load).
    const AdSlotModule = await import("@/components/ui/AdSlot");
    const injectSpy = vi
      .spyOn(AdSlotModule.adsterraInjector, "renderBanner")
      .mockImplementation(() => {});

    const { container } = await renderAdSlot();

    await waitFor(() => {
      const slot = container.querySelector('[data-ad-provider="adsterra"]');
      expect(slot).not.toBeNull();
      expect(slot!.getAttribute("data-ad-zone")).toBe("a".repeat(32));
      expect(injectSpy).toHaveBeenCalled();
      const calls = injectSpy.mock.calls;
      const arg = calls[calls.length - 1][2];
      expect(arg).toEqual({ key: "a".repeat(32), slotKey: "test-slot" });
    });
    injectSpy.mockRestore();
  });

  it("builds the official atOptions/invoke.js srcdoc (captured, never connected)", () => {
    const host = document.createElement("div");
    // happy-dom refuses to attach srcdoc iframes — capture instead of connect
    const appended: unknown[] = [];
    (host as unknown as Record<string, unknown>).appendChild = (c: unknown) => {
      appended.push(c);
      return c;
    };
    const provider = makeAdsterraProvider({ key: "a".repeat(32) });
    renderAdsterraBanner(host as unknown as HTMLElement, provider, {
      key: "a".repeat(32),
      slotKey: "home_sidebar",
    });
    expect(appended).toHaveLength(1);
    const iframe = appended[0] as HTMLIFrameElement;
    expect(iframe.getAttribute("srcdoc")).toContain("atOptions");
    expect(iframe.getAttribute("srcdoc")).toContain(
      `'key' : '${"a".repeat(32)}'`,
    );
    expect(iframe.getAttribute("srcdoc")).toContain("'format' : 'iframe'");
    expect(iframe.getAttribute("srcdoc")).toContain("'height' : 250");
    expect(iframe.getAttribute("srcdoc")).toContain("'width' : 300");
    expect(iframe.getAttribute("srcdoc")).toContain(
      `https://www.highperformanceformat.com/${"a".repeat(32)}/invoke.js`,
    );
    // injection safety — key never lands outside the hex-guarded srcdoc
    expect(iframe.getAttribute("srcdoc")).not.toContain("evil");
  });

  it("refuses non-hex zone keys (injection safety)", () => {
    const host = document.createElement("div");
    const appended: unknown[] = [];
    (host as unknown as Record<string, unknown>).appendChild = (c: unknown) => {
      appended.push(c);
      return c;
    };
    const provider = makeAdsterraProvider({ key: "evil<script>" });
    renderAdsterraBanner(host as unknown as HTMLElement, provider, {
      key: "evil<script>",
      slotKey: "home_sidebar",
    });
    expect(appended).toHaveLength(0); // guard rejects before any iframe is built
  });

  it("routes slots to the native renderer when the resolved key matches the native credential", async () => {
    const nativeKey = "b".repeat(32);
    const provider = makeAdsterraProvider({
      key: "a".repeat(32),
      native_banner_key: nativeKey,
    });
    const adConfig = await import("@/lib/ad-config");
    vi.mocked(adConfig.fetchAdConfig).mockResolvedValue({
      providers: [provider],
      placements: [
        {
          id: "pl-1",
          placement_key: "test-slot",
          name: "Test",
          page_target: "all",
          position: "content",
          is_active: true,
          provider_ids: ["prov-adsterra"],
          ad_unit_ids: { "prov-adsterra": nativeKey },
          display_rules: { mobile: true, desktop: true },
        },
      ] as never,
    });
    vi.mocked(adConfig.getProvidersForPlacement).mockReturnValue([provider]);
    // The placement maps this provider to the native zone key
    vi.mocked(adConfig.getAdUnitId).mockReturnValue(nativeKey);

    const AdSlotModule = await import("@/components/ui/AdSlot");
    const nativeSpy = vi
      .spyOn(AdSlotModule.adsterraInjector, "renderNativeBanner")
      .mockImplementation(() => {});
    const bannerSpy = vi
      .spyOn(AdSlotModule.adsterraInjector, "renderBanner")
      .mockImplementation(() => {});

    const { container } = await renderAdSlot();
    await waitFor(() => {
      const slot = container.querySelector('[data-ad-provider="adsterra"]');
      expect(slot).not.toBeNull();
    });
    expect(nativeSpy).toHaveBeenCalledTimes(1);
    expect(bannerSpy).not.toHaveBeenCalled();
    expect(nativeSpy.mock.calls[0][2]).toEqual({
      key: nativeKey,
      slotKey: "test-slot",
    });
    nativeSpy.mockRestore();
    bannerSpy.mockRestore();
  });

  it("injects native.js into the slot container (captured, never connected)", () => {
    const host = document.createElement("div");
    const appended: unknown[] = [];
    (host as unknown as Record<string, unknown>).appendChild = (c: unknown) => {
      appended.push(c);
      return c;
    };
    const provider = makeAdsterraProvider({
      native_banner_key: "b".repeat(32),
    });
    renderAdsterraNativeBanner(host as unknown as HTMLElement, provider, {
      key: "b".repeat(32),
      slotKey: "home_sidebar",
    });
    expect(appended).toHaveLength(1);
    const script = appended[0] as HTMLScriptElement;
    expect(script.getAttribute("src")).toBe(
      `https://www.highperformanceformat.com/${"b".repeat(32)}/native.js`,
    );
    expect(script.getAttribute("data-cfasync")).toBe("false");
    expect(script.getAttribute("data-adsterra-native")).toBe("true");
    // invalid key → no injection at all
    const host2 = document.createElement("div");
    const appended2: unknown[] = [];
    (host2 as unknown as Record<string, unknown>).appendChild = (
      c: unknown,
    ) => {
      appended2.push(c);
      return c;
    };
    renderAdsterraNativeBanner(host2 as unknown as HTMLElement, provider, {
      key: "evil<script>",
      slotKey: "home_sidebar",
    });
    expect(appended2).toHaveLength(0);
  });

  it("renders nothing without a zone key (stays dormant until Admin adds it)", async () => {
    const provider = makeAdsterraProvider({ key: "" });
    const adConfig = await import("@/lib/ad-config");
    vi.mocked(adConfig.fetchAdConfig).mockResolvedValue({
      providers: [provider],
      placements: [
        {
          id: "pl-1",
          placement_key: "test-slot",
          placement_type: "banner",
          is_active: true,
          provider_ids: ["prov-adsterra"],
          ad_unit_ids: {},
          display_rules: { mobile: true, desktop: true },
        },
      ] as never,
    });
    vi.mocked(adConfig.getProvidersForPlacement).mockReturnValue([provider]);

    const { container } = await renderAdSlot();
    await waitFor(() => {
      expect(
        container.querySelector('[data-ad-provider="adsterra"]'),
      ).toBeNull();
    });
  });
});
