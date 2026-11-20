import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminFinance from "@/pages/admin/AdminFinance";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: vi.fn().mockImplementation((fn: string) => {
      if (fn === "admin_money_summary") {
        return Promise.resolve({
          data: {
            topups_by_currency: [
              { currency: "NGN", topups: 42, amount_minor: 125000000 },
              { currency: "USD", topups: 8, amount_minor: 48000 },
            ],
            purchases_by_currency: [],
            escrow_by_currency: [
              {
                currency: "NGN",
                contracts: 5,
                contracted_minor: 50000000,
                held_minor: 25000000,
                released_minor: 20000000,
                refunded_minor: 5000000,
                fee_minor: 1250000,
              },
            ],
            orders_by_currency: [],
            tokens: { buyers: 15, tokens: 3200 },
            credits: { balances: 1800, grants: 2500, consumed: 700, accounts: 12 },
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

    expect(screen.getByText(/Money, in one place/i)).toBeDefined();
  });

  it("loads and displays multi-currency summary totals", async () => {
    render(
      <MemoryRouter>
        <AdminFinance />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("NGN")).toBeDefined();
      expect(screen.getByText("USD")).toBeDefined();
    });
  });
});
