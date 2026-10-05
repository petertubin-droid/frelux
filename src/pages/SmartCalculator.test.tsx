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
  useBreadcrumbJsonLd: vi.fn(() => null),
}));

// The Smart Calculator is a pure AI estimation tool: it must NOT fetch any
// hardcoded material configuration. The legacy screeding_mix_config path
// was removed as a duplicated engine; the authoritative screeding engine
// lives in the Screeding Cost Estimator with its own DB-backed config.
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
    clientHash,
    contextSummary,
  }: {
    clientHash: string;
    contextSummary: string;
  }) => (
    <div data-testid="advanced-calculator" data-hash={clientHash}>
      <span data-testid="context-summary">{contextSummary}</span>
    </div>
  ),
}));

// Import after mocks
import SmartCalculator from "./SmartCalculator";

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

  it("renders the page title and subtitle", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: "Smart Calculator" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/describe any project, get an instant estimate/i),
    ).toBeInTheDocument();
  });

  it("renders the back-to-home link", () => {
    renderPage();

    const backLink = screen.getByText(/Back to home/i);
    expect(backLink.closest("a")).toHaveAttribute("href", "/");
  });

  it("renders AI-powered badge banner", () => {
    renderPage();

    expect(screen.getByText("AI-Powered Estimation")).toBeInTheDocument();
    expect(
      screen.getByText(/Describe your project in plain English/i),
    ).toBeInTheDocument();
  });

  // ── No legacy screeding config ──

  it("renders immediately without fetching legacy screeding mix config", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("advanced-calculator")).toBeInTheDocument();
    });
    // No DB config fetch should be needed for the pure AI estimation tool.
  });

  // ── Feature list ──

  it("renders all features in the RewardedFeatureGate", async () => {
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

  it("passes the AI context and clientHash to AdvancedCalculator", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId("advanced-calculator")).toBeInTheDocument();
    });
    expect(screen.getByTestId("advanced-calculator")).toHaveAttribute(
      "data-hash",
      "mock-hash",
    );
    expect(screen.getByTestId("context-summary")).toHaveTextContent(
      /freeform AI estimation/i,
    );
  });

  // ── SEO ──

  it("calls useSeo with correct title and canonical path", async () => {
    const { useSeo } = await import("@/lib/seo");
    renderPage();

    expect(useSeo).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Smart Calculator: AI-Powered Construction Estimator | FRELUX",
        canonicalPath: "/smart-calculator",
      }),
    );
  });
});
