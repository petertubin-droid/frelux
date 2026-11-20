import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminSupplierLedger from "@/pages/admin/AdminSupplierLedger";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "supplier_bills") {
        return {
          select: vi.fn().mockReturnValue({
            then: vi.fn().mockImplementation((fn) =>
              Promise.resolve(
                fn({
                  data: [
                    {
                      id: "bill-1",
                      supplier_name: "Lafarge Cement Nigeria",
                      currency: "NGN",
                      amount: 850000,
                      paid_amount: 500000,
                      issued_at: "2026-11-01T00:00:00Z",
                      due_at: "2026-11-25T00:00:00Z",
                      status: "open",
                    },
                  ],
                  error: null,
                }),
              ),
            ),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((fn) => Promise.resolve(fn({ data: [], error: null }))),
      };
    }),
  },
}));

describe("AdminSupplierLedger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders supplier ledger title and header", async () => {
    render(
      <MemoryRouter>
        <AdminSupplierLedger />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Supplier Ledger/i)).toBeDefined();
  });

  it("loads and displays payables card and supplier balances", async () => {
    render(
      <MemoryRouter>
        <AdminSupplierLedger />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Lafarge Cement Nigeria/i)).toBeDefined();
    });
  });
});
