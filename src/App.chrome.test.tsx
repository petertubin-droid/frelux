import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

/**
 * Chrome coverage at the route level.
 *
 * The layout-coverage test proves the route table is shaped correctly; this one
 * proves the result in the DOM: a Building Services calculator, mounted through
 * the real router, must come with the site header and the footer around it.
 * That was the actual complaint, so it is checked the way a visitor sees it.
 */

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false, profile: null })),
  AuthProvider: ({ children }: { children?: ReactNode }) => children,
}));

vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));

vi.mock("@/lib/queries", () => ({
  logAnalyticsEvent: vi.fn().mockResolvedValue(null),
  fetchPopMaterials: vi.fn().mockResolvedValue({ data: [], error: null }),
  fetchSiteSettings: vi.fn().mockResolvedValue({ data: null, error: null }),
  saveUserProject: vi.fn().mockResolvedValue({ data: null, error: null }),
  fetchTools: vi.fn().mockResolvedValue({ data: [], error: null }),
}));

vi.mock("@/lib/labour", () => ({
  fetchLabourCategories: vi.fn().mockResolvedValue([]),
  fetchLabourSettings: vi.fn().mockResolvedValue(null),
  createInitialLabourConfig: vi.fn(() => ({
    includeLabour: false,
    pricingMethod: "fixed",
    fixedAmount: 0,
    perSqmRate: 0,
    perRoomRate: 0,
    roomCount: 1,
    dailyRate: 0,
    dayCount: 1,
    customAmount: 0,
    categoryId: null,
  })),
  calculateLabourCost: vi.fn().mockReturnValue(0),
  DEFAULT_LABOUR_CONFIG: {
    includeLabour: false,
    pricingMethod: "fixed",
    fixedAmount: 0,
    perSqmRate: 0,
    perRoomRate: 0,
    roomCount: 1,
    dailyRate: 0,
    dayCount: 1,
    customAmount: 0,
    categoryId: null,
  },
  PRICING_METHOD_LABELS: {
    fixed: "Fixed",
    perSqm: "Per sqm",
    perRoom: "Per room",
    daily: "Daily",
    custom: "Custom",
  },
}));

/** Mount the app the way main.tsx does, at a given path. */
async function renderAt(path: string) {
  window.history.pushState({}, "", path);
  const { default: App } = await import("@/App");
  const { ThemeProvider } = await import("@/lib/theme");
  const { LanguageProvider } = await import("@/lib/i18n");
  const { CurrencyProvider } =
    await import("@/lib/international/currency-context");
  const { DisplayPreferencesProvider } =
    await import("@/lib/display-preferences");
  const { AccessibilityProvider } = await import("@/lib/accessibility");
  const { BrandingProvider } = await import("@/lib/branding");

  return render(
    <ThemeProvider>
      <LanguageProvider>
        <CurrencyProvider>
          <DisplayPreferencesProvider>
            <AccessibilityProvider>
              <BrandingProvider>
                <App />
              </BrandingProvider>
            </AccessibilityProvider>
          </DisplayPreferencesProvider>
        </CurrencyProvider>
      </LanguageProvider>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  window.history.pushState({}, "", "/");
});

describe("calculator pages carry the site chrome", () => {
  it("gives a Building Services calculator a header and a footer", async () => {
    await renderAt("/drainage-calculator");

    // Header: the site banner exists and holds the primary navigation.
    const banner = await screen.findByRole("banner", {}, { timeout: 8000 });
    expect(banner).toBeTruthy();
    expect(banner.querySelector("nav")).not.toBeNull();

    // Footer: the site footer exists and is not empty.
    const footer = await waitFor(
      () => {
        const el = document.querySelector("footer");
        expect(el).not.toBeNull();
        return el as HTMLElement;
      },
      { timeout: 8000 },
    );
    expect(footer.textContent?.trim().length ?? 0).toBeGreaterThan(40);
  }, 20000);

  it("gives the other public pages a header and a footer", async () => {
    const { unmount } = await renderAt("/case-studies");
    expect(
      await screen.findByRole("banner", {}, { timeout: 8000 }),
    ).toBeTruthy();
    expect(document.querySelector("footer")).not.toBeNull();
    unmount();
  }, 20000);

  it("keeps the chrome on an ordinary tool page too", async () => {
    await renderAt("/paint-calculator");
    expect(
      await screen.findByRole("banner", {}, { timeout: 8000 }),
    ).toBeTruthy();
    expect(document.querySelector("footer")).not.toBeNull();
  }, 20000);
});
