import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";

const monetag = {
  id: "m1",
  slug: "monetag",
  is_active: true,
  credentials: { zone_id: "9876543" },
  settings: {},
};
const placement = {
  id: "p1",
  placement_key: "calculator_push",
  placement_name: "Monetag in-page push",
  display_rules: { mobile: true, desktop: true },
};

const fetchAdConfig = vi.fn();
const canServeProviderAds = vi.fn();
const shouldLoadAdSdks = vi.fn();

vi.mock("@/lib/ad-config", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/ad-config")>("@/lib/ad-config");
  return { ...actual, fetchAdConfig: () => fetchAdConfig() };
});
vi.mock("@/lib/ad-consent", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/ad-consent")>(
      "@/lib/ad-consent",
    );
  return {
    ...actual,
    canServeProviderAds: (slug: string) => canServeProviderAds(slug),
    onConsentChange: () => () => {},
  };
});
vi.mock("@/lib/network", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/network")>("@/lib/network");
  return { ...actual, shouldLoadAdSdks: () => shouldLoadAdSdks() };
});

const authState = { isPaid: false, loading: false };
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ ...authState }),
}));

import { MonetagInPagePush } from "./MonetagInPagePush";

const pushScript = () =>
  document.querySelector("script[data-frelux-monetag-push]");

describe("MonetagInPagePush", () => {
  beforeEach(() => {
    authState.isPaid = false;
    authState.loading = false;
    sessionStorage.clear();
    document.head.innerHTML = "";
    fetchAdConfig.mockResolvedValue({
      providers: [monetag],
      placements: [placement],
    });
    canServeProviderAds.mockReturnValue(true);
    shouldLoadAdSdks.mockReturnValue(true);
  });
  afterEach(() => vi.clearAllMocks());

  it("renders nothing and loads no script before consent", async () => {
    canServeProviderAds.mockReturnValue(false);
    render(<MonetagInPagePush />);
    await waitFor(() => expect(fetchAdConfig).not.toHaveBeenCalled());
    expect(pushScript()).toBeNull();
  });

  it("skips injection on Save-Data / slow links", async () => {
    shouldLoadAdSdks.mockReturnValue(false);
    render(<MonetagInPagePush />);
    await waitFor(() => expect(fetchAdConfig).not.toHaveBeenCalled());
    expect(pushScript()).toBeNull();
  });

  it("injects the push zone once consent and placement allow it", async () => {
    render(<MonetagInPagePush />);
    await waitFor(() => expect(pushScript()).not.toBeNull());
    expect(pushScript()?.getAttribute("data-zone")).toBe("9876543");
  });

  it("does nothing when the placement is switched off in admin", async () => {
    fetchAdConfig.mockResolvedValue({
      providers: [monetag],
      placements: [
        { ...placement, display_rules: { mobile: false, desktop: false } },
      ],
    });
    render(<MonetagInPagePush />);
    await waitFor(() => expect(fetchAdConfig).toHaveBeenCalled());
    expect(pushScript()).toBeNull();
  });

  it("injects nothing for a paid subscriber", async () => {
    authState.isPaid = true;
    render(<MonetagInPagePush />);
    await waitFor(() => expect(fetchAdConfig).not.toHaveBeenCalled());
    expect(pushScript()).toBeNull();
  });

  it("waits for the entitlement instead of assuming a free viewer", async () => {
    authState.loading = true;
    render(<MonetagInPagePush />);
    await waitFor(() => expect(fetchAdConfig).not.toHaveBeenCalled());
    expect(pushScript()).toBeNull();
  });

  it("shows at most once per session", async () => {
    sessionStorage.setItem("frelux_monetag_push_shown", "1");
    render(<MonetagInPagePush />);
    await waitFor(() => expect(fetchAdConfig).toHaveBeenCalled());
    expect(pushScript()).toBeNull();
  });
});
