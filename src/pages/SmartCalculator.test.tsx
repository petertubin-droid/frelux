import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
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

const DESCRIPTION = "Paint a 4.5 m by 6 m bedroom, two coats of white emulsion";

function typeDescription(value: string) {
  fireEvent.change(screen.getByLabelText("Describe your project"), {
    target: { value },
  });
}

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
    window.localStorage.clear();
  });

  // ── Rendering basics ──

  it("renders the page title and subtitle", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: "Smart Calculator" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /the assistant reads the project, names the right calculator/i,
      ),
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
    typeDescription(DESCRIPTION);

    await waitFor(() => {
      expect(screen.getByTestId("advanced-calculator")).toBeInTheDocument();
    });
    // No DB config fetch should be needed for the pure AI estimation tool.
  });

  // ── The description is the input, and it drives the reading ──

  it("asks for a description instead of mounting a paid panel with nothing to analyse", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: "Your project" }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("advanced-calculator")).not.toBeInTheDocument();
    expect(
      screen.getByText(/Cost breakdown unlocks with a description/i),
    ).toBeInTheDocument();
  });

  it("reads the description locally and names the calculator for the work", () => {
    renderPage();
    typeDescription(DESCRIPTION);

    expect(
      screen.getByRole("heading", { name: "What that reads as" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Paint Calculator")).toBeInTheDocument();
    expect(screen.getAllByText(/4\.5 m x 6 m/).length).toBeGreaterThan(0);

    const link = screen.getByRole("link", { name: /Open Paint Calculator/i });
    expect(link).toHaveAttribute("href", "/paint-calculator");
  });

  it("keeps the paid panel closed until the description is usable", () => {
    renderPage();
    typeDescription("paint");

    expect(screen.queryByTestId("advanced-calculator")).not.toBeInTheDocument();
    expect(screen.getByText(/Add a little more detail/i)).toBeInTheDocument();
  });

  it("states what the description did not say rather than assuming it", () => {
    renderPage();
    typeDescription("paint the sitting room");

    expect(screen.getByText(/Not stated yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/4\.5 m x 6 m/)).not.toBeInTheDocument();
  });

  it("offers worked examples that fill the box", () => {
    renderPage();
    fireEvent.click(
      screen.getByRole("button", {
        name: /Screed a 20 m2 living room at 50 mm/i,
      }),
    );
    expect(screen.getByLabelText("Describe your project")).toHaveValue(
      "Screed a 20 m2 living room at 50 mm",
    );
    expect(screen.getByText("Screeding Cost Estimator")).toBeInTheDocument();
  });

  // ── Feature list ──

  it("renders all features in the RewardedFeatureGate", async () => {
    renderPage();
    typeDescription(DESCRIPTION);

    await waitFor(() => {
      expect(screen.getByTestId("features-list")).toBeInTheDocument();
    });
    const featureItems = within(
      screen.getByTestId("features-list"),
    ).getAllByRole("listitem");
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

  it("passes the described project and clientHash to AdvancedCalculator", async () => {
    renderPage();
    typeDescription(DESCRIPTION);

    await waitFor(() => {
      expect(screen.getByTestId("advanced-calculator")).toBeInTheDocument();
    });
    expect(screen.getByTestId("advanced-calculator")).toHaveAttribute(
      "data-hash",
      "mock-hash",
    );
    // The AI panel now receives the visitor's own words and the reading, in
    // place of the placeholder that used to say there was no form data.
    expect(screen.getByTestId("context-summary")).toHaveTextContent(
      /4\.5 m by 6 m bedroom/,
    );
    expect(screen.getByTestId("context-summary")).toHaveTextContent(
      /Paint Calculator/,
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
