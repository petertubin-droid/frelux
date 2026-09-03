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
}));
vi.mock("@/lib/achievements", () => ({ trackCalculation: vi.fn() }));
vi.mock("@/lib/rewards-integration", () => ({
  trackCalculationWithRewards: vi.fn(),
}));
vi.mock("@/lib/smart-defaults", () => ({ trackRecentTool: vi.fn() }));
vi.mock("@/lib/measurement", () => ({
  useEngineFeatures: vi.fn(() => ({
    assessConfidence: vi.fn(() => ({
      level: "high",
      score: 0.9,
      reasons: [],
    })),
    wasteResolution: vi.fn(() => "rule"),
    userWaste: null,
    setUserWaste: vi.fn(),
    buildExplanation: vi.fn(() => ({ sections: [] })),
    buildMaterialSummary: vi.fn(() => ({ entries: [], totals: {} })),
  })),
}));
vi.mock("@/lib/calculator-monitor", () => ({
  monitoredCalc: vi.fn((_n: string, fn: () => unknown) => fn()),
}));
vi.mock("@/lib/queries", () => ({ saveUserProject: vi.fn() }));
// Resolvable chain: supabase.from(...).select(...).eq(...).eq(...).order(...).limit(...)
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

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => makeChain()),
  },
}));
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
vi.mock("@/components/seo/SeoContent", () => ({
  PaintingEstimatorSeo: () => null,
}));
vi.mock("@/lib/use-calc-defaults", () => ({
  useCalcDefaults: vi.fn(() => ({ defaults: {}, rules: {} })),
}));

const { product, quality } = vi.hoisted(() => ({
  product: {
    id: "prod-1",
    name: "Frelux Emulsion",
    slug: "emulsion",
    category: "emulsion",
    is_active: true,
  },
  quality: {
    id: "qual-1",
    product_id: "prod-1",
    name: "Premium",
    slug: "premium",
    coverage: 10,
    coverage_unit: "m2_per_liter",
    ceiling_coverage: 10,
    is_active: true,
  },
}));

vi.mock("@/lib/estimation/queries", () => ({
  fetchEstimationProducts: vi.fn().mockResolvedValue({ data: [product] }),
  fetchProductQualityLevels: vi.fn().mockResolvedValue({ data: [quality] }),
  fetchActivePrice: vi.fn().mockResolvedValue({
    data: {
      id: "price-1",
      priceable_type: "quality",
      priceable_id: "qual-1",
      amount: 25000,
      currency: "NGN",
      effective_from: "2026-01-01",
      is_active: true,
    },
  }),
  fetchCalcRules: vi.fn().mockResolvedValue({ data: [] }),
  fetchColourConditions: vi.fn().mockResolvedValue({
    data: [
      {
        id: "cc-1",
        key: "new_unpainted",
        label: "New / Unpainted",
        extra_coats: 0,
        is_active: true,
      },
    ],
  }),
  fetchSurfaceConditions: vi.fn().mockResolvedValue({
    data: [
      {
        id: "sc-1",
        key: "new_plastered",
        label: "New / Plastered",
        waste_factor: 1.05,
        is_active: true,
      },
    ],
  }),
  createEstimate: vi.fn(),
  createEstimateItem: vi.fn(),
  createAdjustment: vi.fn(),
  createAuditLog: vi.fn(),
}));

import PaintingEstimator from "@/pages/PaintingEstimator";

function renderEstimator(embedded = true) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <PaintingEstimator embedded={embedded} />
      </ToastProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PaintingEstimator", () => {
  it("auto-selects the first paint type and quality after config loads", async () => {
    renderEstimator();

    const paintType = await screen.findByLabelText(/Paint Type/i);
    await waitFor(
      () => {
        expect((paintType as unknown as HTMLSelectElement).value).toBe(
          "prod-1",
        );
      },
      { timeout: 4000 },
    );
    const qualitySelect = screen.getByLabelText(/Quality Level/i);
    expect((qualitySelect as unknown as HTMLSelectElement).value).toBe(
      "qual-1",
    );
  });

  it("calculates an estimate with the prefilled default room", async () => {
    const user = userEvent.setup();
    renderEstimator();

    await screen.findByLabelText(/Paint Type/i);
    await waitFor(
      () =>
        expect(
          (screen.getByLabelText(/Paint Type/i) as unknown as HTMLSelectElement)
            .value,
        ).toBe("prod-1"),
      { timeout: 4000 },
    );

    await user.click(
      screen.getByRole("button", { name: /Calculate Estimate/i }),
    );

    // A result panel appears — the button works out of the box
    await waitFor(
      () => {
        expect(
          screen.getByRole("button", { name: /Save Estimate|Save/i }),
        ).toBeDefined();
      },
      { timeout: 4000 },
    );
  });

  it("shows clear validation feedback when a required field is missing", async () => {
    const user = userEvent.setup();
    renderEstimator();

    const paintType = await screen.findByLabelText(/Paint Type/i);
    await waitFor(
      () =>
        expect((paintType as unknown as HTMLSelectElement).value).toBe(
          "prod-1",
        ),
      { timeout: 4000 },
    );

    // Deselect quality to force a validation failure
    await user.selectOptions(screen.getByLabelText(/Quality Level/i), "");

    await user.click(
      screen.getByRole("button", { name: /Calculate Estimate/i }),
    );

    // Inline error alert appears instead of failing silently
    const alert = await screen.findByRole("alert", undefined, {
      timeout: 4000,
    });
    expect(alert.textContent).toMatch(/Quality level is required/i);
  });
});
