import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ─────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));

vi.mock("@/lib/seo", () => ({
  useSeo: vi.fn(() => null),
}));

vi.mock("@/lib/queries", () => ({
  fetchScreedingMixConfig: vi.fn(),
}));

vi.mock("@/components/rewarded/RewardedFeatureGate", () => ({
  RewardedFeatureGate: ({
    children,
    featureName,
    features,
  }: {
    children: (access: { clientHash: string }) => React.ReactNode;
    featureName: string;
    features: string[];
  }) => (
    <div data-testid="reward-gate">
      <span data-testid="feature-name">{featureName}</span>
      <ul data-testid="features-list">
        {features.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      {children({ clientHash: "mock-hash" })}
    </div>
  ),
}));

vi.mock("@/components/rewarded/AdvancedCalculator", () => ({
  AdvancedCalculator: ({
    config,
    clientHash,
  }: {
    config: unknown;
    clientHash: string;
  }) => (
    <div data-testid="advanced-calculator" data-hash={clientHash}>
      <span data-testid="config-currency">
        {(config as { currencySymbol?: string })?.currencySymbol ?? "₦"}
      </span>
    </div>
  ),
}));

// Import after mocks
import SmartCalculator from "./SmartCalculator";
import { fetchScreedingMixConfig } from "@/lib/queries";
import type { DbScreedingMixConfig } from "@/types/database";

function renderPage() {
  return render(
    <MemoryRouter>
      <SmartCalculator />
    </MemoryRouter>,
  );
}

// ─────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────

describe("SmartCalculator page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering basics ──

  it("renders the page title and subtitle", async () => {
    vi.mocked(fetchScreedingMixConfig).mockResolvedValue({
      data: null,
      error: null,
    });
    renderPage();

    expect(screen.getByText("Smart Calculator")).toBeInTheDocument();
    expect(
      screen.getByText(/describe any project, get an instant estimate/i),
    ).toBeInTheDocument();
  });

  it("renders the back-to-home link", async () => {
    vi.mocked(fetchScreedingMixConfig).mockResolvedValue({
      data: null,
      error: null,
    });
    renderPage();

    const backLink = screen.getByText(/Back to home/i);
    expect(backLink.closest("a")).toHaveAttribute("href", "/");
  });

  it("renders AI-powered badge banner", async () => {
    vi.mocked(fetchScreedingMixConfig).mockResolvedValue({
      data: null,
      error: null,
    });
    renderPage();

    expect(screen.getByText("AI-Powered Estimation")).toBeInTheDocument();
    expect(
      screen.getByText(/Describe your project in plain English/i),
    ).toBeInTheDocument();
  });

  // ── Loading state ──

  it("shows loading state while fetching config", () => {
    vi.mocked(fetchScreedingMixConfig).mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByText(/Loading Smart Calculator/i)).toBeInTheDocument();
  });

  // ── Config loading ──

  it("uses fallback config when fetch returns no data", async () => {
    vi.mocked(fetchScreedingMixConfig).mockResolvedValue({
      data: null,
      error: null,
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("reward-gate")).toBeInTheDocument();
    });
    expect(screen.getByTestId("reward-gate")).toHaveTextContent(
      "Smart Calculator",
    );
  });

  it("uses fallback config on fetch error", async () => {
    vi.mocked(fetchScreedingMixConfig).mockRejectedValue(new Error("network"));
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("reward-gate")).toBeInTheDocument();
    });
  });

  it("maps Supabase config fields correctly", async () => {
    vi.mocked(fetchScreedingMixConfig).mockResolvedValue({
      data: {
        id: "mix-usd-1",
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        paint_coverage_rate_m2_per_l: 10,
        paint_bucket_size_l: 4,
        paint_price_per_bucket: 12000,
        cement_consumption_ratio_kg_per_l: 2,
        cement_bag_size_kg: 50,
        cement_price_per_bag: 10000,
        default_mix_ratio: "3:1",
        labour_rate_per_sqm: 500,
        waste_percentage: 15,
        tax_vat_percentage: 5,
        currency: "USD",
        currency_symbol: "$",
      },
      error: null,
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("advanced-calculator")).toBeInTheDocument();
    });
    expect(screen.getByTestId("config-currency")).toHaveTextContent("$");
  });

  // ── Info banner ──

  it("renders info banner with project description", async () => {
    vi.mocked(fetchScreedingMixConfig).mockResolvedValue({
      data: null,
      error: null,
    });
    renderPage();

    expect(
      screen.getByText(/Describe your project in plain English/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/screeding, painting, tiling, POP ceiling/i),
    ).toBeInTheDocument();
  });

  // ── Feature list ──

  it("renders all features in the RewardedFeatureGate", async () => {
    vi.mocked(fetchScreedingMixConfig).mockResolvedValue({
      data: null,
      error: null,
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("features-list")).toBeInTheDocument();
    });
    const featureItems = screen.getAllByRole("listitem");
    expect(featureItems).toHaveLength(8);
    expect(
      screen.getByText("AI-powered estimation for any project type"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Describe your project in natural language"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Automatic material quantity calculation"),
    ).toBeInTheDocument();
    expect(screen.getByText("Line-item cost breakdown")).toBeInTheDocument();
    expect(
      screen.getByText("Save, duplicate and compare estimates"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Export professional PDF quotations"),
    ).toBeInTheDocument();
    expect(screen.getByText("Cost-saving recommendations")).toBeInTheDocument();
    expect(screen.getByText("Tax/VAT calculator")).toBeInTheDocument();
  });

  // ── AdvancedCalculator rendering ──

  it("passes config and clientHash to AdvancedCalculator", async () => {
    vi.mocked(fetchScreedingMixConfig).mockResolvedValue({
      data: null,
      error: null,
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("advanced-calculator")).toBeInTheDocument();
    });
    expect(screen.getByTestId("advanced-calculator")).toHaveAttribute(
      "data-hash",
      "mock-hash",
    );
  });

  it("renders AdvancedCalculator after config loads", async () => {
    vi.mocked(fetchScreedingMixConfig).mockResolvedValue({
      data: {
        id: "mix-ngn-1",
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        paint_coverage_rate_m2_per_l: 12,
        paint_bucket_size_l: 20,
        paint_price_per_bucket: 28000,
        cement_consumption_ratio_kg_per_l: 1.5,
        cement_bag_size_kg: 40,
        cement_price_per_bag: 9500,
        default_mix_ratio: "2:1",
        labour_rate_per_sqm: 0,
        waste_percentage: 10,
        tax_vat_percentage: 7.5,
        currency: "NGN",
        currency_symbol: "₦",
      },
      error: null,
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("advanced-calculator")).toBeInTheDocument();
    });
    expect(screen.getByTestId("config-currency")).toHaveTextContent("₦");
  });

  // ── Config fallback values ──

  it("uses fallback config for null optional fields in Supabase data", async () => {
    vi.mocked(fetchScreedingMixConfig).mockResolvedValue({
      data: {
        id: "mix-nulls-1",
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        paint_coverage_rate_m2_per_l: 12,
        paint_bucket_size_l: 20,
        paint_price_per_bucket: 28000,
        cement_consumption_ratio_kg_per_l: 1.5,
        cement_bag_size_kg: 40,
        cement_price_per_bag: 9500,
        default_mix_ratio: null,
        labour_rate_per_sqm: null,
        waste_percentage: null,
        tax_vat_percentage: null,
        currency: null,
        currency_symbol: null,
        // Nulls are intentional: the component must fall back to defaults.
        // The DB type declares these as non-null, hence the cast.
      } as unknown as DbScreedingMixConfig,
      error: null,
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("advanced-calculator")).toBeInTheDocument();
    });
    // Should fall back to "₦" and "NGN" when currency fields are null
    expect(screen.getByTestId("config-currency")).toHaveTextContent("₦");
  });

  // ── SEO ──

  it("calls useSeo with correct title and canonical path", async () => {
    const { useSeo } = await import("@/lib/seo");
    vi.mocked(fetchScreedingMixConfig).mockResolvedValue({
      data: null,
      error: null,
    });
    renderPage();

    expect(useSeo).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Smart Calculator — AI-Powered Construction Estimator | FRELUX",
        canonicalPath: "/smart-calculator",
      }),
    );
  });
});
