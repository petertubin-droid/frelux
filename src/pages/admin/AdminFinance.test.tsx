import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminFinance from "@/pages/admin/AdminFinance";

vi.mock("@/lib/marketplace-disputes", () => ({
  DISPUTE_CATEGORIES: {},
  loadOpenDisputes: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: vi.fn().mockImplementation((fn: string) => {
      if (fn === "admin_money_summary") {
        return Promise.resolve({
          data: {
            window_days: 30,
            subscriptions: [
              { currency: "NGN", purchases: 10, buyers: 8, amount_minor: 5000000 },
            ],
            token_packs: [{ purchases: 5, tokens: 250, amount_minor: 125000 }],
            token_packs_pending: 0,
            api_wallet: [{ topups: 4, amount_usd: 120 }],
            api_wallet_refused: 0,
            escrow: [
              {
                currency: "NGN",
                held_minor: 25000000,
                released_minor: 10000000,
                contracts: 2,
              },
            ],
            escrow_open_contracts: 2,
            marketplace: [
              {
                currency: "NGN",
                orders: 3,
                agreed_value: 300000,
                completed: 2,
                disputed: 1,
              },
            ],
            daily: [],
            ai_credits: [
              { type: "earn", entries: 50, credits: 1000 },
              { type: "spend", entries: 30, credits: 600 },
            ],
          },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    }),
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((fn) =>
        Promise.resolve(fn({ data: [], error: null })),
      ),
    }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
    },
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-1" } } }),
    },
  },
}));

describe("AdminFinance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the finance and money summary overview", async () => {
    render(
      <MemoryRouter>
        <AdminFinance />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Every stream that takes or holds money/i)).toBeDefined();
  });

  it("loads and displays multi-currency summary totals", async () => {
    render(
      <MemoryRouter>
        <AdminFinance />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Token packs/i)).toBeDefined();
      expect(screen.getByText(/API wallet top-ups/i)).toBeDefined();
      expect(screen.getByText(/Escrow held/i)).toBeDefined();
    });
  });
});
