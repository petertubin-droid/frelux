import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SubscriptionGate } from "@/components/subscription/SubscriptionGate";

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock isPremiumEnabled
vi.mock("@/lib/premium-access", () => ({
  isPremiumEnabled: vi.fn(() => Promise.resolve(true)),
}));

// Mock subscription helpers
vi.mock("@/lib/subscription", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/subscription")>();
  return {
    ...actual,
    formatSubscriptionStatus: vi.fn(() => "Active — 30 days remaining"),
    FEATURE_LABELS: {
      engineering_calculators: "Engineering Calculators",
      ai_photo_estimator: "AI Photo Estimator",
      construction_sequence: "Construction Sequence Planner",
      structural_calculator: "Structural Calculator",
      foundation_calculator: "Foundation Calculator",
      pdf_export: "PDF Export",
      pro_connect_messaging: "Pro Connect Messaging",
    } as unknown,
    getFeatureMinPlan: vi.fn((feature: string) => {
      if (feature === "free") return "free";
      if (feature === "pdf_export") return "basic";
      return "pro";
    }),
  };
});

// Mock PremiumBadge
vi.mock("@/components/ui/PremiumBadge", () => ({
  PremiumBadge: () => <span data-testid="premium-badge">Crown</span>,
}));

function renderGate(props: Parameters<typeof SubscriptionGate>[0]) {
  return render(
    <MemoryRouter>
      <SubscriptionGate {...props} />
    </MemoryRouter>,
  );
}

describe("SubscriptionGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      isAdmin: false,
      isPaid: false,
      paidStatus: null,
      user: null,
    });
  });

  it("renders children when admin", () => {
    mockUseAuth.mockReturnValue({
      isAdmin: true,
      isPaid: false,
      paidStatus: null,
      user: { id: "1" },
    });
    renderGate({
      feature: "engineering_calculators",
      children: <div>Admin content</div>,
    });
    expect(screen.getByText("Admin content")).toBeTruthy();
  });

  it("renders children when user is paid with sufficient plan", () => {
    mockUseAuth.mockReturnValue({
      isAdmin: false,
      isPaid: true,
      paidStatus: {
        plan: "pro",
        paid_until: new Date(Date.now() + 30 * 86400000).toISOString(),
      },
      user: { id: "1" },
    });
    renderGate({
      feature: "engineering_calculators",
      children: <div>Paid content</div>,
    });
    expect(screen.getByText("Paid content")).toBeTruthy();
  });

  it("shows paywall when user is not paid", async () => {
    mockUseAuth.mockReturnValue({
      isAdmin: false,
      isPaid: false,
      paidStatus: null,
      user: { id: "1" },
    });
    renderGate({
      feature: "engineering_calculators",
      children: <div>Hidden content</div>,
    });
    await waitFor(() =>
      expect(screen.getByText("Engineering Calculators")).toBeTruthy(),
    );
    expect(screen.queryByText("Hidden content")).toBeNull();
    expect(screen.getByText("Upgrade")).toBeTruthy();
  });

  it("shows login link when user is not authenticated", async () => {
    mockUseAuth.mockReturnValue({
      isAdmin: false,
      isPaid: false,
      paidStatus: null,
      user: null,
    });
    renderGate({
      feature: "engineering_calculators",
      children: <div>Hidden</div>,
    });
    await waitFor(() =>
      expect(screen.getByText("Sign in to Subscribe")).toBeTruthy(),
    );
  });

  it("shows fallback when provided and user lacks access", () => {
    mockUseAuth.mockReturnValue({
      isAdmin: false,
      isPaid: false,
      paidStatus: null,
      user: null,
    });
    renderGate({
      feature: "engineering_calculators",
      children: <div>Hidden</div>,
      fallback: <div>Custom fallback</div>,
    });
    expect(screen.getByText("Custom fallback")).toBeTruthy();
    expect(screen.queryByText("Upgrade")).toBeNull();
  });

  it("shows plan requirement in paywall text", async () => {
    mockUseAuth.mockReturnValue({
      isAdmin: false,
      isPaid: false,
      paidStatus: null,
      user: { id: "1" },
    });
    renderGate({
      feature: "engineering_calculators",
      children: <div>Hidden</div>,
    });
    await waitFor(() =>
      expect(screen.getByText(/plan or higher/i)).toBeTruthy(),
    );
  });

  it("shows feature list in paywall", async () => {
    mockUseAuth.mockReturnValue({
      isAdmin: false,
      isPaid: false,
      paidStatus: null,
      user: { id: "1" },
    });
    renderGate({
      feature: "engineering_calculators",
      children: <div>Hidden</div>,
    });
    await waitFor(() =>
      expect(
        screen.getByText("All engineering calculators & estimators"),
      ).toBeTruthy(),
    );
    expect(
      screen.getByText("AI Photo Estimator with vision analysis"),
    ).toBeTruthy();
  });

  it("allows free features for paid users", () => {
    mockUseAuth.mockReturnValue({
      isAdmin: false,
      isPaid: true,
      paidStatus: {
        plan: "free",
        paid_until: new Date(Date.now() + 30 * 86400000).toISOString(),
      },
      user: { id: "1" },
    });
    renderGate({ feature: "free" as unknown, children: <div>Free content</div> });
    expect(screen.getByText("Free content")).toBeTruthy();
  });

  it("blocks free features for unpaid users", async () => {
    mockUseAuth.mockReturnValue({
      isAdmin: false,
      isPaid: false,
      paidStatus: null,
      user: { id: "1" },
    });
    renderGate({ feature: "free" as unknown, children: <div>Free content</div> });
    await waitFor(() => expect(screen.queryByText("Free content")).toBeNull());
  });

  it("blocks basic plan user from pro features", async () => {
    mockUseAuth.mockReturnValue({
      isAdmin: false,
      isPaid: true,
      paidStatus: {
        plan: "basic",
        paid_until: new Date(Date.now() + 30 * 86400000).toISOString(),
      },
      user: { id: "1" },
    });
    renderGate({
      feature: "engineering_calculators",
      children: <div>Pro content</div>,
    });
    await waitFor(() => expect(screen.getByText("Upgrade")).toBeTruthy());
    expect(screen.queryByText("Pro content")).toBeNull();
  });

  it("allows basic plan user to access basic features", () => {
    mockUseAuth.mockReturnValue({
      isAdmin: false,
      isPaid: true,
      paidStatus: {
        plan: "basic",
        paid_until: new Date(Date.now() + 30 * 86400000).toISOString(),
      },
      user: { id: "1" },
    });
    renderGate({ feature: "pdf_export", children: <div>Basic feature</div> });
    expect(screen.getByText("Basic feature")).toBeTruthy();
  });
});
