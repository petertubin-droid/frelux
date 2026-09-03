import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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

// Mock supabase with controllable data
const mockData: Record<string, any[]> = {
  screeding_system_config: [],
};

vi.mock("@/lib/supabase", () => {
  function makeChain(table: string, filters: Record<string, any> = {}) {
    const chain: any = {
      _table: table,
      _filters: filters,
      _data: null as any,
      _error: null as any,
      get data() {
        return this._data;
      },
      get error() {
        return this._error;
      },
    };

    // Filter methods
    for (const m of ["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "in", "is", "not"]) {
      chain[m] = vi.fn((col: string, val: any) => makeChain(table, { ...filters, [col]: val }));
    }
    for (const m of ["or", "and"]) {
      chain[m] = vi.fn(() => makeChain(table, filters));
    }
    chain.order = vi.fn(() => makeChain(table, filters));
    chain.range = vi.fn(() => makeChain(table, filters));
    chain.limit = vi.fn(() => makeChain(table, filters));
    chain.select = vi.fn(() => chain);

    function getFilteredRows() {
      let rows = mockData[table] || [];
      for (const [col, val] of Object.entries(filters)) {
        rows = rows.filter((r: any) => r[col] === val);
      }
      return rows;
    }

    // When awaited without single/maybeSingle, return array
    chain.then = function(resolve: any, reject: any) {
      const rows = getFilteredRows();
      return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
    };

    chain.maybeSingle = vi.fn(() => {
      const rows = getFilteredRows();
      return Promise.resolve({ data: rows[0] || null, error: null });
    });
    chain.single = vi.fn(() => {
      const rows = getFilteredRows();
      return Promise.resolve({ data: rows[0] || null, error: null });
    });
    chain.update = vi.fn((data: Record<string, unknown>) => {
      const rows = getFilteredRows();
      for (const row of rows) Object.assign(row, data);
      return Promise.resolve({ data: null, error: null });
    });

    return chain;
  }

  const supabase = {
    from: vi.fn((table: string) => makeChain(table)),
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
  return { supabase };
});

beforeEach(() => {
  vi.clearAllMocks();
  // Reset mock data with default configs
  mockData.screeding_system_config = [
    { ...mockPuttyDbConfig },
    { ...mockMixDbConfig },
  ];
});

const mockPuttyDbConfig = {
  id: "putty-1",
  system_type: "putty",
  display_name: "Putty",
  description: "Professional Putty screeding calculation.",
  coverage_area_m2: 12,
  coverage_unit: "m²",
  default_coats: 2,
  waste_percentage: 0,
  currency: "NGN",
  currency_symbol: "₦",
  putty_name: "Putty",
  putty_quantity: 2,
  putty_unit: "bucket",
  putty_price_per_unit: 12000,
  paint_name: null,
  paint_quantity: null,
  paint_unit: null,
  paint_price_per_unit: null,
  cement_name: null,
  cement_quantity: null,
  cement_unit: null,
  cement_price_per_unit: null,
  rounding_rule: "ceil",
  is_active: true,
  sort_order: 0,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const mockMixDbConfig = {
  id: "mix-1",
  system_type: "white_cement_paint",
  display_name: "White Cement + Screeding Paint",
  description: "Combined White Cement and Screeding Paint calculation.",
  coverage_area_m2: 20,
  coverage_unit: "m²",
  default_coats: 2,
  waste_percentage: 20,
  currency: "NGN",
  currency_symbol: "₦",
  putty_name: null,
  putty_quantity: null,
  putty_unit: null,
  putty_price_per_unit: null,
  paint_name: "Screeding Paint",
  paint_quantity: 2,
  paint_unit: "bucket",
  paint_price_per_unit: 25000,
  cement_name: "White Cement",
  cement_quantity: 1,
  cement_unit: "bag",
  cement_price_per_unit: 7500,
  rounding_rule: "ceil",
  is_active: true,
  sort_order: 1,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

async function renderAdmin() {
  const Comp = (await import("@/pages/admin/AdminScreedingMaterials")).default;
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Comp />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("AdminScreedingMaterials — Configuration", () => {
  it("renders without crashing", async () => {
    const { container } = await renderAdmin();
    expect(container.innerHTML).not.toBe("");
  });

  it("shows Putty tab", async () => {
    await renderAdmin();
    await waitFor(() => {
      expect(screen.getByText("Putty")).toBeTruthy();
    });
  });

  it("shows White Cement + Paint tab", async () => {
    await renderAdmin();
    await waitFor(() => {
      expect(screen.getByText("White Cement + Paint")).toBeTruthy();
    });
  });

  it("shows Screeding Engine Configuration title", async () => {
    await renderAdmin();
    await waitFor(() => {
      expect(screen.getByText("Screeding Engine Configuration")).toBeTruthy();
    });
  });

  it("displays Putty coverage area from config", async () => {
    await renderAdmin();
    await waitFor(() => {
      // The coverage area input should show 12
      const inputs = screen.getAllByDisplayValue("12");
      expect(inputs.length).toBeGreaterThan(0);
    });
  });

  it("displays Putty price from config", async () => {
    await renderAdmin();
    await waitFor(() => {
      const inputs = screen.getAllByDisplayValue("12000");
      expect(inputs.length).toBeGreaterThan(0);
    });
  });

  it("can switch to White Cement + Paint tab and see its config", async () => {
    await renderAdmin();
    await waitFor(() => {
      expect(screen.getByText("White Cement + Paint")).toBeTruthy();
    });

    // Click the White Cement + Paint tab
    const tabButton = screen.getByText("White Cement + Paint");
    fireEvent.click(tabButton);

    // Should show the White Cement section
    await waitFor(() => {
      expect(screen.getByText("White Cement")).toBeTruthy();
    });
  });
});
