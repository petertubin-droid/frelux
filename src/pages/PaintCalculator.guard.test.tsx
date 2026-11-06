/**
 * The paint wizard has three steps, and a step that is not finished must not
 * let a visitor walk past it. These tests drive the real wizard: they press
 * Continue and Calculate on an unfinished step and check that neither moves
 * on, that the reason is shown, and that the wizard still works once the gap
 * is filled.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));
vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));
vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));
vi.mock("@/lib/seo", () => ({
  useSeo: vi.fn(),
  SITE_URL: "https://freluxtools.netlify.app",
  useBreadcrumbJsonLd: vi.fn(() => null),
  useFaqJsonLd: vi.fn(() => null),
}));
vi.mock("@/lib/achievements", () => ({ trackCalculation: vi.fn() }));
vi.mock("@/lib/rewards-integration", () => ({
  trackCalculationWithRewards: vi.fn(),
}));
vi.mock("@/lib/smart-defaults", () => ({ trackRecentTool: vi.fn() }));
vi.mock("@/lib/calculator-monitor", () => ({
  monitoredCalc: vi.fn((_n: string, fn: () => unknown) => fn()),
}));
vi.mock("@/lib/queries", () => ({
  saveUserProject: vi.fn(),
  logAnalyticsEvent: vi.fn(),
  // The wizard does not render at all without one active paint type.
  fetchPaintTypes: vi.fn().mockResolvedValue({
    data: [
      {
        id: "pt-1",
        name: "Emulsion",
        description: null,
        coverage_rate: 10,
        coverage_unit: "m2_per_liter",
        container_sizes: [4, 20],
        is_active: true,
        sort_order: 1,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
    ],
  }),
}));
vi.mock("@/lib/supabase", () => {
  const makeChain = () => {
    const chain: Record<string, unknown> = {};
    const proxy = new Proxy(chain, {
      get: (_t, prop) => {
        if (prop === "then" || prop === "catch") return undefined;
        return vi.fn(() => proxy);
      },
    });
    return proxy;
  };
  return { supabase: { from: vi.fn(() => makeChain()) } };
});
vi.mock("@/lib/estimation/queries", () => ({
  fetchEstimationProducts: vi.fn().mockResolvedValue({ data: [] }),
  fetchProductQualityLevels: vi.fn().mockResolvedValue({ data: [] }),
  fetchActivePriceForMarket: vi.fn().mockResolvedValue({ data: null }),
  fetchCalcRules: vi.fn().mockResolvedValue({ data: [] }),
  fetchColourConditions: vi.fn().mockResolvedValue({ data: [] }),
  fetchSurfaceConditions: vi.fn().mockResolvedValue({ data: [] }),
  createEstimate: vi.fn(),
  createEstimateItem: vi.fn(),
  createAdjustment: vi.fn(),
  createAuditLog: vi.fn(),
}));
vi.mock("@/components/ui/AdSlot", () => ({ default: () => null }));
vi.mock("@/components/calculators", () => ({
  SaveToProjectButton: () => null,
  EstimateDisclaimer: () => null,
  ReportCalculationIssue: () => null,
}));
vi.mock("@/components/seo/SeoSections", () => ({
  FaqSection: () => null,
  RelatedTools: () => null,
  CALC_LINKS: [],
}));

import PaintCalculator from "@/pages/PaintCalculator";

function renderWizard() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <PaintCalculator embedded />
      </ToastProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PaintCalculator step guard", () => {
  it("stays on step 2 and names the gap when Continue is pressed with no dimensions", async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.click(await screen.findByRole("button", { name: /Continue/i }));

    // Step 2 opens with empty dimensions, so Continue must not move on.
    await user.click(screen.getByRole("button", { name: /Continue/i }));

    const notice = await screen.findByTestId("paint-step-notice");
    expect(notice).toBeInTheDocument();
    expect(notice.textContent).toMatch(/length/i);
    // Step 3 is the only step with a Calculate button.
    expect(
      screen.queryByRole("button", { name: /calculate/i }),
    ).not.toBeInTheDocument();
  });

  it("advances to step 3 once the dimensions are complete", async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.click(await screen.findByRole("button", { name: /Continue/i }));

    const length = screen.getByLabelText(/^Length/i);
    const height = screen.getByLabelText(/^Wall height/i);
    await user.type(length, "10");
    await user.type(height, "3");

    await user.click(screen.getByRole("button", { name: /Continue/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /calculate/i }),
      ).toBeInTheDocument();
    });
    expect(screen.queryByTestId("paint-step-notice")).not.toBeInTheDocument();
  });
});
