import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));
vi.mock("@/lib/token-purchase", () => ({
  adminGetTokenPurchaseConfig: vi.fn().mockResolvedValue({ id: "tok-1", is_enabled: true, token_price_kobo: 1000 }),
  adminUpdateTokenPurchaseConfig: vi.fn().mockResolvedValue(true),
  adminGetTokenPurchases: vi.fn().mockResolvedValue([]),
  adminGetTokenPrices: vi.fn().mockResolvedValue([]),
  adminSaveTokenPrice: vi.fn().mockResolvedValue(true),
  formatNaira: vi.fn((kobo: number) => `₦${kobo / 100}`),
  formatMinor: vi.fn((m: number, c: string) => `${c} ${m}`),
}));
vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getCreditTransactions: vi.fn().mockResolvedValue([]),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
  adminGetAllWallets: vi.fn().mockResolvedValue([]),
  adminGetAllTransactions: vi.fn().mockResolvedValue([]),
  adminGetAllFeatureCosts: vi.fn().mockResolvedValue([{ id: "feat-1", feature_name: "Floor Plan AI", feature_key: "floor_plan", is_enabled: true, credit_cost: 5 }]),
  adminGetAllAdCreditEvents: vi.fn().mockResolvedValue([]),
  adminGetAllAiFeatureUsage: vi.fn().mockResolvedValue([]),
  adminGetRewardedAdConfig: vi.fn().mockResolvedValue({ id: "cfg-1", credits_per_ad: 5, daily_earn_limit: 10, is_enabled: true }),
  adminAdjustCredits: vi.fn().mockResolvedValue({ error: null }),
  adminAdjustCreditsV2: vi.fn().mockResolvedValue({ error: null }),
  adminUpdateFeatureCost: vi.fn().mockResolvedValue({ error: null }),
  adminUpdateAdConfig: vi.fn().mockResolvedValue({ error: null }),
  adminUpdateReward: vi.fn().mockResolvedValue({ error: null }),
  adminUpdateSettings: vi.fn().mockResolvedValue({ error: null }),
  adminSeedRewards: vi.fn().mockResolvedValue({ error: null }),
  getRewardCatalogue: vi.fn().mockResolvedValue([]),
  getRewardSettings: vi.fn().mockResolvedValue(null),
  getRewardRedemptions: vi.fn().mockResolvedValue([]),
  getCurrentWeeklyMission: vi.fn().mockResolvedValue(null),
  getMissionProgress: vi.fn().mockResolvedValue(null),
  getRewardedAdConfig: vi.fn().mockResolvedValue(null),
  getRewardedAdHistory: vi.fn().mockResolvedValue([]),
  getUnusedRewardGrantCount: vi.fn().mockResolvedValue(0),
  awardCredits: vi.fn().mockResolvedValue({ error: null }),
  redeemReward: vi.fn().mockResolvedValue({ error: null }),
  spendAiCredits: vi.fn().mockResolvedValue({ error: null }),
  unlockFeatureViaAd: vi.fn().mockResolvedValue({ error: null }),
  verifyRewardedAd: vi.fn().mockResolvedValue({ error: null }),
  getAiFeatureCost: vi.fn().mockResolvedValue(null),
  getAiFeatureCosts: vi.fn().mockResolvedValue([]),
  getAiFeatureUsageToday: vi.fn().mockResolvedValue(0),
  generateReferenceId: vi.fn().mockReturnValue("ref-123"),
  getDailyRefId: vi.fn().mockReturnValue("daily-ref-123"),
  AI_CREDIT_COST: 10,
  CREDITS_PER_AD: 5,
  MAX_ADS_PER_DAY: 10,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function renderPage() {
  const Comp = (await import("@/pages/admin/AdminCreditsAds")).default;
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Comp />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("AdminCreditsAds", () => {
  it("renders overview metrics and header after loading", async () => {
    const { findByText } = await renderPage();
    expect(await findByText(/FRELUX Credits wallet/)).toBeDefined();
    expect(await findByText("Total Issued")).toBeDefined();
    expect(await findByText("System Status")).toBeDefined();
  });

  it("switches to AI Feature Costs tab and shows features", async () => {
    const { findByRole, findByText, findByDisplayValue } = await renderPage();
    const tabBtn = await findByRole("button", { name: "AI Feature Costs" });
    fireEvent.click(tabBtn);
    expect(await findByDisplayValue("Floor Plan AI")).toBeDefined();
  });

  it("switches to Ad Config tab and displays controls", async () => {
    const { findByRole, findByText, findByDisplayValue } = await renderPage();
    const tabBtn = await findByRole("button", { name: "Ad Config" });
    fireEvent.click(tabBtn);
    expect(await findByText("Rewarded Ad Credit Configuration")).toBeDefined();
  });

  it("switches to Token Shop tab and displays token pricing", async () => {
    const { findByRole, findByText, findByDisplayValue } = await renderPage();
    const tabBtn = await findByRole("button", { name: "Token Shop" });
    fireEvent.click(tabBtn);
    expect(await findByText("Token Purchase Configuration (Paystack)")).toBeDefined();
  });
});
