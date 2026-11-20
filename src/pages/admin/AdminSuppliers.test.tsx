import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminSuppliers from "@/pages/admin/AdminSuppliers";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn().mockImplementation((table: string) => {
      let mockData: unknown[] = [];
      if (table === "supplier_profiles") {
        mockData = [
          {
            id: "sup-1",
            company_name: "Lagos Sand & Granite Depot",
            slug: "lagos-sand-granite",
            verification_status: "verified",
            market: "NG",
            city: "Lagos",
            phone: "+2348011112222",
            email: "orders@lagossand.com",
            is_active: true,
            created_at: "2026-10-01T10:00:00Z",
          },
        ];
      } else if (table === "supplier_verification_events") {
        mockData = [];
      } else if (table === "marketplace_reports") {
        mockData = [];
      } else if (table === "supplier_inventory_items") {
        mockData = [];
      }

      return {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((fn) =>
          Promise.resolve(fn({ data: mockData, error: null })),
        ),
      };
    }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
    },
  },
}));

describe("AdminSuppliers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the suppliers administration overview", async () => {
    render(
      <MemoryRouter>
        <AdminSuppliers />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Supplier network/i);
    });
  });

  it("loads and displays verified supplier profiles", async () => {
    render(
      <MemoryRouter>
        <AdminSuppliers />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Lagos Sand & Granite Depot/i)).toBeDefined();
    });
  });
});
