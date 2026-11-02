import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const { bridgeMock, unlockMock, fetchConfigMock, bridgeChainMock } = vi.hoisted(
  () => ({
    bridgeMock: vi.fn(),
    unlockMock: vi.fn(),
    fetchConfigMock: vi.fn(),
    bridgeChainMock: vi.fn(),
  }),
);

vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue({
    user_id: "test-user",
    balance: 150,
    total_earned: 150,
    total_spent: 0,
  }),
  getCreditTransactions: vi.fn().mockResolvedValue([]),
  getRewardedAdConfig: vi.fn().mockResolvedValue(null),
  getRewardedAdHistory: vi.fn().mockResolvedValue([]),
  verifyRewardedAd: vi.fn().mockResolvedValue({ success: false }),
  getAiFeatureCost: vi.fn().mockResolvedValue({
    id: "f1",
    feature_key: "test",
    feature_name: "Test Feature",
    description: "",
    credit_cost: 5,
    requires_credits: true,
    ad_unlock_enabled: true,
    ad_unlock_credits: 0,
    daily_usage_limit: 10,
    is_enabled: true,
    sort_order: 1,
  }),
  spendAiCredits: vi.fn().mockResolvedValue({ success: false }),
  unlockFeatureViaAd: (...args: unknown[]) => unlockMock(...args),
}));

vi.mock("@/lib/ad-config", () => ({
  logAdEvent: vi.fn().mockResolvedValue(undefined),
  hasRewardedAdProvider: vi.fn().mockResolvedValue(true),
  fetchAdConfig: (...args: unknown[]) => fetchConfigMock(...args),
}));

vi.mock("@/lib/rewarded-access", () => ({
  getClientHash: vi.fn().mockReturnValue("clienthash"),
  REWARDED_AD_BRIDGES: { monetag: (...args: unknown[]) => bridgeMock(...args) },
}));

vi.mock("@/lib/rewarded-bridges", () => ({
  getBridgedAdCandidates: (...args: unknown[]) => bridgeChainMock(...args),
}));

// vi.mock is hoisted - everything must be inside the factory
vi.mock("@/lib/supabase-lazy", () => {
  const mockSupabase = {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "test-user" } },
      }),
    },
  };
  return {
    getSupabase: vi.fn().mockResolvedValue(mockSupabase),
    isSupabaseConfigured: false,
  };
});

vi.mock("@/lib/seo", () => ({
  useSeo: vi.fn(),
  useBreadcrumbJsonLd: vi.fn(() => null),
}));

vi.mock("@/lib/credits-context", () => ({
  useCredits: vi.fn(() => ({
    wallet: { balance: 150 },
    streak: null,
    loading: false,
    refresh: vi.fn(),
    awardEvent: vi.fn(),
    trackActivity: vi.fn(),
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CreditsWallet", () => {
  it("renders without crashing", async () => {
    const { CreditsWallet } =
      await import("@/components/credits/CreditsWallet");
    const { container } = render(
      <MemoryRouter>
        <CreditsWallet userId="test-user" />
      </MemoryRouter>,
    );
    expect(container.innerHTML).not.toBe("");
  });
});

describe("AiFeatureGate", () => {
  it("renders the gate UI without crashing", async () => {
    const { AiFeatureGate } =
      await import("@/components/credits/CreditsWallet");
    const { container } = render(
      <MemoryRouter>
        <AiFeatureGate
          featureKey="test"
          featureName="test"
          onUnlocked={() => {}}
          onClose={() => {}}
        />
      </MemoryRouter>,
    );
    expect(container.innerHTML).not.toBe("");
  });

  it("Watch Ad to Unlock is honestly stubbed: no ad, no unlock, no silent grant", async () => {
    const { AiFeatureGate } =
      await import("@/components/credits/CreditsWallet");
    const onUnlocked = vi.fn();

    render(
      <MemoryRouter>
        <AiFeatureGate
          featureKey="test"
          featureName="test"
          onUnlocked={onUnlocked}
          onClose={() => {}}
        />
      </MemoryRouter>,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: /watch ad to unlock/i }),
    );

    // The honest stub: the unavailability message is shown, and no
    // unlock is ever requested until secure server verification exists.
    await waitFor(() => {
      expect(
        screen.getByText(/temporarily unavailable while secure server/i),
      ).toBeTruthy();
    });
    expect(unlockMock).not.toHaveBeenCalled();
    expect(onUnlocked).not.toHaveBeenCalled();
  });
});
