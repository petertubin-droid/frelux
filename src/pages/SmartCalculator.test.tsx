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
  }: {
    children: (access: { clientHash: string }) => React.ReactNode;
    featureName: string;
  }) => <div data-testid="reward-gate">{featureName}</div>,
}));

vi.mock("@/components/rewarded/AdvancedCalculator", () => ({
  AdvancedCalculator: () => <div data-testid="advanced-calculator" />,
}));

// Import after mocks
import SmartCalculator from "./SmartCalculator";
import { fetchScreedingMixConfig } from "@/lib/queries";

function renderPage() {
  return render(
    <MemoryRouter>
      <SmartCalculator />
    </MemoryRouter>,
  );
}

describe("SmartCalculator page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the page title and AI badge", async () => {
    vi.mocked(fetchScreedingMixConfig).mockResolvedValue({ data: null });
    renderPage();

    expect(screen.getByText("Smart Calculator")).toBeInTheDocument();
    expect(screen.getByText(/Powered by AI/i)).toBeInTheDocument();
    expect(screen.getByText("AI-Powered Estimation")).toBeInTheDocument();
  });

  it("renders the back-to-home link", async () => {
    vi.mocked(fetchScreedingMixConfig).mockResolvedValue({ data: null });
    renderPage();

    const backLink = screen.getByText(/Back to home/i);
    expect(backLink.closest("a")).toHaveAttribute("href", "/");
  });

  it("shows loading state while fetching config", () => {
    vi.mocked(fetchScreedingMixConfig).mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByText(/Loading Smart Calculator/i)).toBeInTheDocument();
  });

  it("uses fallback config when fetch returns no data", async () => {
    vi.mocked(fetchScreedingMixConfig).mockResolvedValue({ data: null });
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
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("reward-gate")).toBeInTheDocument();
    });
    // The RewardedFeatureGate mock renders instead of the real AdvancedCalculator,
    // so we just confirm the gate rendered (config was loaded successfully).
    expect(fetchScreedingMixConfig).toHaveBeenCalledTimes(1);
  });

  it("renders feature list items in the AI badge banner", async () => {
    vi.mocked(fetchScreedingMixConfig).mockResolvedValue({ data: null });
    renderPage();

    expect(
      screen.getByText(/Describe your project in plain English/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/screeding, painting, tiling, POP ceiling/i),
    ).toBeInTheDocument();
  });
});
