import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RewardedFeatureGate } from "@/components/rewarded/RewardedFeatureGate";

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock useRewardedAccess
const mockUseRewardedAccess = vi.fn();
vi.mock("@/lib/rewarded-access", () => ({
  useRewardedAccess: (key: string) => mockUseRewardedAccess(key),
  formatExpiry: vi.fn((date: string) => `Expires at ${date}`),
}));

// Mock RewardedAdModal to avoid complex rendering
vi.mock("@/components/rewarded/RewardedAdModal", () => ({
  RewardedAdModal: () => <div data-testid="rewarded-modal">Modal</div>,
}));

function defaultAccess(overrides: Record<string, any> = {}) {
  return {
    loading: false,
    error: null,
    isUnlocked: false,
    expiresAt: null,
    showAdModal: false,
    adLoading: false,
    requestUnlock: vi.fn(),
    cancelUnlock: vi.fn(),
    watchAd: vi.fn(),
    closeOfferwall: vi.fn(),
    offerwallUrl: null,
    offerwallProviderName: null,
    adProviderUsed: null,
    config: { is_enabled: true },
    primaryProvider: { id: "p1", name: "AdGate" },
    fallbackProvider: null,
    ...overrides,
  };
}

const features = ["Advanced calc", "PDF export", "AI insights"];

describe("RewardedFeatureGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ isPaid: false });
    mockUseRewardedAccess.mockReturnValue(defaultAccess());
  });

  it("renders locked gate when not unlocked and not paid", () => {
    render(
      <RewardedFeatureGate
        toolKey="paint_calculator"
        featureName="Advanced Calculator"
        features={features}
      >
        {(access) => <div>Content unlocked: {String(access.isUnlocked)}</div>}
      </RewardedFeatureGate>,
    );
    expect(screen.getByText("Advanced Calculator")).toBeTruthy();
    expect(
      screen.getByText("Watch Ad to Unlock Advanced Calculator"),
    ).toBeTruthy();
  });

  it("renders children directly when user is paid", () => {
    mockUseAuth.mockReturnValue({ isPaid: true });
    mockUseRewardedAccess.mockReturnValue(defaultAccess());
    render(
      <RewardedFeatureGate
        toolKey="paint_calculator"
        featureName="Advanced Calculator"
        features={features}
      >
        {() => <div>Premium content</div>}
      </RewardedFeatureGate>,
    );
    expect(screen.getByText("Premium content")).toBeTruthy();
    expect(screen.queryByText("Watch Ad to Unlock")).toBeNull();
  });

  it("renders children when unlocked", () => {
    mockUseRewardedAccess.mockReturnValue(defaultAccess({ isUnlocked: true }));
    render(
      <RewardedFeatureGate
        toolKey="paint_calculator"
        featureName="Advanced Calculator"
        features={features}
      >
        {() => <div>Unlocked content</div>}
      </RewardedFeatureGate>,
    );
    expect(screen.getByText("Unlocked content")).toBeTruthy();
    expect(screen.queryByText("Watch Ad to Unlock")).toBeNull();
  });

  it("shows expiry info when unlocked with expiresAt", () => {
    mockUseRewardedAccess.mockReturnValue(
      defaultAccess({ isUnlocked: true, expiresAt: "2026-12-31T23:59:59Z" }),
    );
    render(
      <RewardedFeatureGate
        toolKey="paint_calculator"
        featureName="Advanced Calculator"
        features={features}
      >
        {() => <div>Content</div>}
      </RewardedFeatureGate>,
    );
    expect(screen.getByText(/Expires at/)).toBeTruthy();
  });

  it("shows loading spinner when access is loading", () => {
    mockUseRewardedAccess.mockReturnValue(defaultAccess({ loading: true }));
    render(
      <RewardedFeatureGate
        toolKey="paint_calculator"
        featureName="Advanced Calculator"
        features={features}
      >
        {() => <div>Content</div>}
      </RewardedFeatureGate>,
    );
    expect(screen.getByText("Loading…")).toBeTruthy();
  });

  it("shows error message when access has error", () => {
    mockUseRewardedAccess.mockReturnValue(
      defaultAccess({ error: "Network failed", isUnlocked: false }),
    );
    render(
      <RewardedFeatureGate
        toolKey="paint_calculator"
        featureName="Advanced Calculator"
        features={features}
      >
        {() => <div>Content</div>}
      </RewardedFeatureGate>,
    );
    expect(screen.getByText("Network failed")).toBeTruthy();
  });

  it("lists all features in locked state", () => {
    render(
      <RewardedFeatureGate
        toolKey="paint_calculator"
        featureName="Advanced Calculator"
        features={features}
      >
        {() => <div>Content</div>}
      </RewardedFeatureGate>,
    );
    features.forEach((f) => expect(screen.getByText(f)).toBeTruthy());
  });

  it("calls requestUnlock when unlock button is clicked", () => {
    const requestUnlock = vi.fn();
    mockUseRewardedAccess.mockReturnValue(defaultAccess({ requestUnlock }));
    render(
      <RewardedFeatureGate
        toolKey="paint_calculator"
        featureName="Advanced Calculator"
        features={features}
      >
        {() => <div>Content</div>}
      </RewardedFeatureGate>,
    );
    fireEvent.click(screen.getByText("Watch Ad to Unlock Advanced Calculator"));
    expect(requestUnlock).toHaveBeenCalled();
  });

  it("disables unlock button when feature is not enabled", () => {
    mockUseRewardedAccess.mockReturnValue(
      defaultAccess({ config: { is_enabled: false } }),
    );
    render(
      <RewardedFeatureGate
        toolKey="paint_calculator"
        featureName="Advanced Calculator"
        features={features}
      >
        {() => <div>Content</div>}
      </RewardedFeatureGate>,
    );
    const btn = screen
      .getByText("Watch Ad to Unlock Advanced Calculator")
      .closest("button")!;
    expect(btn.disabled).toBe(true);
    expect(
      screen.getByText("This feature is temporarily disabled."),
    ).toBeTruthy();
  });

  it("disables unlock button when no providers configured", () => {
    mockUseRewardedAccess.mockReturnValue(
      defaultAccess({
        primaryProvider: null,
        fallbackProvider: null,
        config: { is_enabled: true },
      }),
    );
    render(
      <RewardedFeatureGate
        toolKey="paint_calculator"
        featureName="Advanced Calculator"
        features={features}
      >
        {() => <div>Content</div>}
      </RewardedFeatureGate>,
    );
    const btn = screen
      .getByText("Watch Ad to Unlock Advanced Calculator")
      .closest("button")!;
    expect(btn.disabled).toBe(true);
    expect(
      screen.getByText("No ad provider is configured yet. Coming soon!"),
    ).toBeTruthy();
  });

  it("shows modal when showAdModal is true", () => {
    mockUseRewardedAccess.mockReturnValue(defaultAccess({ showAdModal: true }));
    render(
      <RewardedFeatureGate
        toolKey="paint_calculator"
        featureName="Advanced Calculator"
        features={features}
      >
        {() => <div>Content</div>}
      </RewardedFeatureGate>,
    );
    expect(screen.getByTestId("rewarded-modal")).toBeTruthy();
  });

  it("shows modal when adLoading is true", () => {
    mockUseRewardedAccess.mockReturnValue(defaultAccess({ adLoading: true }));
    render(
      <RewardedFeatureGate
        toolKey="paint_calculator"
        featureName="Advanced Calculator"
        features={features}
      >
        {() => <div>Content</div>}
      </RewardedFeatureGate>,
    );
    expect(screen.getByTestId("rewarded-modal")).toBeTruthy();
  });
});
