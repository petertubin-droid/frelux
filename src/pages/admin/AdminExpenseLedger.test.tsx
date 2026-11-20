import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminExpenseLedger from "@/pages/admin/AdminExpenseLedger";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((fn) =>
        Promise.resolve(
          fn({
            data: [
              {
                id: "exp-1",
                project_id: "proj-1",
                amount: 450000,
                currency: "NGN",
                category: "materials",
                expense_date: "2026-11-15",
                vendor: "Dangote Direct Depot",
                description: "50 bags cement delivery",
                receipt_url: null,
                created_at: "2026-11-15T10:00:00Z",
              },
              {
                id: "exp-2",
                project_id: "proj-2",
                amount: 1200,
                currency: "USD",
                category: "equipment",
                expense_date: "2026-11-18",
                vendor: "Caterpillar Rental",
                description: "Excavator daily rental",
                receipt_url: null,
                created_at: "2026-11-18T14:00:00Z",
              },
            ],
            error: null,
          }),
        ),
      ),
    }),
  },
}));

describe("AdminExpenseLedger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the expense ledger header and controls", async () => {
    render(
      <MemoryRouter>
        <AdminExpenseLedger />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Company Expense Ledger/i)).toBeDefined();
    expect(screen.getByText(/Every recorded project expense/i)).toBeDefined();
  });

  it("renders currency summary cards for loaded expenses", async () => {
    render(
      <MemoryRouter>
        <AdminExpenseLedger />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("NGN")).toBeDefined();
      expect(screen.getByText("USD")).toBeDefined();
      expect(screen.getByText(/Dangote Direct Depot/i)).toBeDefined();
      expect(screen.getByText(/Caterpillar Rental/i)).toBeDefined();
    });
  });
});
