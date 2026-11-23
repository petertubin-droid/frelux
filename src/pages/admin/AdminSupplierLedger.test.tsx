/**
 * AdminSupplierLedger conformance (admin coverage tranche 3 / Tier 1 money, 2026-11-23).
 *
 * Asserts column allowlist on select, multi-currency isolation, refresh action,
 * safe refusal on read error (no partial balances shown), and empty state.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminSupplierLedger from "@/pages/admin/AdminSupplierLedger";
import { supabase } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const mockBills = [
  {
    id: "bill-1",
    supplier_name: "Dangote Cement Plc",
    currency: "NGN",
    amount: 1000000,
    paid_amount: 400000,
    issued_at: "2026-11-01T00:00:00Z",
    due_at: "2026-11-30T00:00:00Z",
    status: "open",
  },
  {
    id: "bill-2",
    supplier_name: "Caterpillar West Africa",
    currency: "USD",
    amount: 5000,
    paid_amount: 2000,
    issued_at: "2026-11-01T00:00:00Z",
    due_at: "2026-11-20T00:00:00Z",
    status: "open",
  },
];

describe("AdminSupplierLedger", () => {
  let selectMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    selectMock = vi.fn().mockResolvedValue({
      data: mockBills,
      error: null,
    });
    vi.mocked(supabase.from).mockReturnValue({
      select: selectMock,
    } as any);
  });

  it("selects only the eight allowed ledger columns from supplier_bills", async () => {
    render(
      <MemoryRouter>
        <AdminSupplierLedger />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith("supplier_bills");
      expect(selectMock).toHaveBeenCalledWith(
        "id, supplier_name, currency, amount, paid_amount, issued_at, due_at, status",
      );
    });
  });

  it("renders distinct cards for each currency to avoid cross-currency aggregation", async () => {
    render(
      <MemoryRouter>
        <AdminSupplierLedger />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("NGN owed")).toBeInTheDocument();
      expect(screen.getByText("USD owed")).toBeInTheDocument();
      expect(screen.getByText("Dangote Cement Plc")).toBeInTheDocument();
      expect(screen.getByText("Caterpillar West Africa")).toBeInTheDocument();
    });
  });

  it("re-reads the ledger when Refresh is clicked", async () => {
    render(
      <MemoryRouter>
        <AdminSupplierLedger />
      </MemoryRouter>,
    );

    await screen.findByText("NGN owed");
    expect(selectMock).toHaveBeenCalledTimes(1);

    const refreshBtn = screen.getByRole("button", { name: /Refresh/i });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(selectMock).toHaveBeenCalledTimes(2);
    });
  });

  it("surfaces read failure and conceals balances rather than showing partial amounts", async () => {
    selectMock.mockResolvedValueOnce({
      data: null,
      error: { message: "Permission denied on supplier_bills" },
    });

    render(
      <MemoryRouter>
        <AdminSupplierLedger />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Bills unavailable")).toBeInTheDocument();
      expect(
        screen.getByText(/Supplier bills could not be read, so no balance is shown rather than a partial one/i),
      ).toBeInTheDocument();
      expect(screen.queryByText("NGN owed")).not.toBeInTheDocument();
    });
  });

  it("shows empty state when no supplier bills exist", async () => {
    selectMock.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    render(
      <MemoryRouter>
        <AdminSupplierLedger />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("No supplier bills recorded")).toBeInTheDocument();
    });
  });
});
