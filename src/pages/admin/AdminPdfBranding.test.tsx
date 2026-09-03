import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn(() => ({ user: null, loading: false })) }));
vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getCreditTransactions: vi.fn().mockResolvedValue([]),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
  adminGetAllWallets: vi.fn().mockResolvedValue([]),
  adminGetAllTransactions: vi.fn().mockResolvedValue([]),
  adminGetAllFeatureCosts: vi.fn().mockResolvedValue([]),
  adminGetAllAdCreditEvents: vi.fn().mockResolvedValue([]),
  adminGetAllAiFeatureUsage: vi.fn().mockResolvedValue([]),
  adminGetRewardedAdConfig: vi.fn().mockResolvedValue(null),
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
vi.mock("@/lib/supabase", () => {
  // Build a chainable query object that returns { data: [], error: null } for any chain
  const chainable = {
    data: [],
    error: null,
    then: undefined, // prevent thenable detection
  };
  const methods = ["select", "eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "in", "is", "not", "or", "and", "order", "range", "limit", "single", "maybeSingle", "insert", "update", "delete", "upsert", "count", "head"];
  for (const m of methods) {
    (chainable as unknown)[m] = vi.fn(() => chainable);
  }
  const supabase = {
    from: vi.fn(() => chainable),
    channel: vi.fn(() => ({ on: vi.fn(() => ({ subscribe: vi.fn() })) })),
    removeChannel: vi.fn(),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    storage: {
      from: vi.fn(() => ({
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
        upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
        remove: vi.fn().mockResolvedValue({ data: {}, error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://example.com/test.png" } })),
      })),
    },
  };
  return { supabase, isSupabaseConfigured: true };
});

beforeEach(() => { vi.clearAllMocks(); });

async function renderPage() {
  const Comp = (await import("@/pages/admin/AdminPdfBranding")).default;
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Comp />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("AdminPdfBranding", () => {
  it("renders without crashing", async () => {
    const { container } = await renderPage();
    expect(container.innerHTML).not.toBe("");
  });
});
