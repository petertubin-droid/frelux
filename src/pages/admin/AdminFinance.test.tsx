import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminFinance from "@/pages/admin/AdminFinance";

const updateSpy = vi.fn();
const eqSpy = vi.fn();
const invokeSpy = vi.fn();
const rpcSpy = vi.fn();
const loadOpenDisputesSpy = vi.fn();

vi.mock("@/lib/marketplace-disputes", () => ({
  // The page calls .find on this, so the mock must be the array shape.
  DISPUTE_CATEGORIES: [
    { value: "work_quality", label: "The work is not what we agreed" },
    { value: "not_delivered", label: "Submitted, but not actually done" },
    { value: "scope", label: "The scope or price changed" },
    { value: "payment", label: "A problem with the payment" },
    { value: "other", label: "Something else" },
  ],
  loadOpenDisputes: () => loadOpenDisputesSpy(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: (fn: string, args?: unknown) => rpcSpy(fn, args),
    from: (table: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        order: () => chain,
        limit: () => chain,
        update: (payload: unknown) => {
          updateSpy(table, payload);
          return chain;
        },
        eq: (column: string, value: unknown) => {
          eqSpy(table, column, value);
          return chain;
        },
        then: (fn: (value: unknown) => unknown) =>
          Promise.resolve(fn({ data: [], error: null })),
      };
      return chain;
    },
    functions: {
      invoke: (name: string, opts?: unknown) => invokeSpy(name, opts),
    },
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-1" } } }),
    },
  },
}));

const summary = {
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
};

const escrowedDispute = {
  id: "dispute-1",
  order_id: "order-1",
  status: "open",
  category: "not_delivered",
  detail: "Never arrived",
  seller_response: null,
  created_at: "2026-11-20T09:00:00Z",
  order: {
    id: "order-1",
    agreed_price: 250000,
    currency: "NGN",
    escrow_contract_id: "escrow-9",
  },
};

const unescrowedDispute = {
  ...escrowedDispute,
  id: "dispute-2",
  detail: "Paid outside escrow",
  order: { ...escrowedDispute.order, id: "order-2", escrow_contract_id: null },
};

function renderFinance() {
  return render(
    <MemoryRouter>
      <AdminFinance />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  rpcSpy.mockResolvedValue({ data: summary, error: null });
  loadOpenDisputesSpy.mockResolvedValue([]);
  invokeSpy.mockResolvedValue({ data: { success: true }, error: null });
});

describe("AdminFinance", () => {
  it("shows every money stream from the summary function", async () => {
    renderFinance();
    await waitFor(() => {
      expect(screen.getByText(/Token packs/i)).toBeDefined();
      expect(screen.getByText(/API wallet top-ups/i)).toBeDefined();
      expect(screen.getByText(/Escrow held/i)).toBeDefined();
    });
  });

  it("asks the summary function for the selected window", async () => {
    renderFinance();
    await waitFor(() =>
      expect(rpcSpy).toHaveBeenCalledWith("admin_money_summary", {
        p_days: 30,
      }),
    );
  });

  it("refunds an escrowed dispute from escrow and records the amount in minor units", async () => {
    loadOpenDisputesSpy.mockResolvedValue([escrowedDispute]);
    renderFinance();

    fireEvent.click(
      await screen.findByRole("button", { name: /Refund buyer/i }),
    );

    await waitFor(() =>
      expect(invokeSpy).toHaveBeenCalledWith("escrow-release", {
        body: { contract_id: "escrow-9", action: "refund" },
      }),
    );

    expect(updateSpy).toHaveBeenCalledWith(
      "marketplace_order_disputes",
      expect.objectContaining({
        status: "refunded",
        // 250,000 NGN becomes 25,000,000 minor units, not 250,000.
        refund_amount_minor: 25000000,
        resolved_by: "admin-1",
      }),
    );
    // The write must only land while the row is still open, so two admins
    // clicking refund cannot both succeed.
    expect(eqSpy).toHaveBeenCalledWith(
      "marketplace_order_disputes",
      "status",
      "open",
    );
  });

  it("refuses to refund an order that was never funded through escrow", async () => {
    loadOpenDisputesSpy.mockResolvedValue([unescrowedDispute]);
    renderFinance();

    fireEvent.click(
      await screen.findByRole("button", { name: /Refund buyer/i }),
    );

    await waitFor(() =>
      expect(screen.getByText(/never funded through escrow/i)).toBeDefined(),
    );
    expect(invokeSpy).not.toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("dismissing sends the order back to the client for review", async () => {
    loadOpenDisputesSpy.mockResolvedValue([escrowedDispute]);
    renderFinance();

    fireEvent.click(
      await screen.findByRole("button", { name: /Close, release normally/i }),
    );

    await waitFor(() =>
      expect(updateSpy).toHaveBeenCalledWith(
        "marketplace_order_disputes",
        expect.objectContaining({ status: "dismissed" }),
      ),
    );
    expect(updateSpy).toHaveBeenCalledWith("marketplace_orders", {
      status: "client_review",
    });
  });

  it("names the real cause when the summary function is missing", async () => {
    rpcSpy.mockResolvedValue({
      data: null,
      error: { message: "function admin_money_summary does not exist" },
    });
    renderFinance();
    await waitFor(() =>
      expect(
        screen.getByText(/summary function has not been applied/i),
      ).toBeDefined(),
    );
  });

  it("keeps the money totals when disputes fail to load", async () => {
    loadOpenDisputesSpy.mockRejectedValue(new Error("network down"));
    renderFinance();

    await waitFor(() =>
      expect(
        screen.getByText(/Open disputes could not be loaded/i),
      ).toBeDefined(),
    );
    expect(screen.getByText(/Escrow held/i)).toBeDefined();
  });
});
