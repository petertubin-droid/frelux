import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminSuppliers from "@/pages/admin/AdminSuppliers";

const { mockInvoke } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
}));

const mockSupplier = {
  id: "sup-1",
  company_name: "Lagos Sand & Granite Depot",
  slug: "lagos-sand-granite",
  verification_status: "verified",
  verification_level: "physical_audit",
  market: "NG",
  city: "Lagos",
  phone: "+2348011112222",
  email: "orders@lagossand.com",
  is_active: true,
  is_featured: false,
  subscription_plan: "free",
  created_at: "2026-10-01T10:00:00Z",
};

const mockListing = {
  id: "list-1",
  supplier_id: "sup-1",
  product_name: "Sharp Sand (20-Tonne Tipper)",
  category: "aggregates",
  unit_price: 180000,
  currency: "NGN",
  unit: "trip",
  specification: "Clean washed river sand",
  listing_status: "pending",
  is_active: true,
  created_at: "2026-10-02T10:00:00Z",
};

const mockEvent = {
  id: "event-1",
  supplier_id: "sup-1",
  requested_level: "tier_1_verified",
  action: "submitted",
  evidence_ref: "CAC Registration RC-982173",
  note: "Uploaded company documentation",
  created_at: "2026-10-05T10:00:00Z",
};

const mockReport = {
  id: "rep-1",
  supplier_id: "sup-1",
  report_type: "short_delivery",
  reason: "Order delivered with less volume than paid for",
  description: "Expected 20 tonnes but received ~14 tonnes",
  status: "open",
  created_at: "2026-10-06T10:00:00Z",
};

vi.mock("@/lib/supabase", () => {
  return {
    supabase: {
      from: vi.fn((table: string) => {
        let data: any[] = [];
        if (table === "supplier_profiles") data = [mockSupplier];
        else if (table === "supplier_inventory_items") data = [mockListing];
        else if (table === "supplier_verification_events") data = [mockEvent];
        else if (table === "marketplace_reports") data = [mockReport];
        else if (table === "supplier_plans") data = [];

        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          then: (fn: any) => Promise.resolve(fn({ data, error: null })),
        };
      }),
      functions: {
        invoke: mockInvoke,
      },
    },
  };
});

describe("AdminSuppliers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue({
      data: { ok: true },
      error: null,
    });
  });

  it("renders the suppliers administration overview, stats, and lists", async () => {
    render(
      <MemoryRouter>
        <AdminSuppliers />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Supplier/i);
      expect(screen.getAllByText(/Lagos Sand & Granite Depot/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Sharp Sand \(20-Tonne Tipper\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Verification queue/i)).toBeInTheDocument();
    });
  });

  it("approves verification via supplier-ops edge function", async () => {
    render(
      <MemoryRouter>
        <AdminSuppliers />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Verification queue/i })).toBeInTheDocument();
    });

    const queueHeading = screen.getByRole("heading", { name: /Verification queue/i });
    const queueSection = queueHeading.closest("section")!;
    const approveBtn = within(queueSection).getByRole("button", { name: /^Approve$/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("supplier-ops", {
        body: {
          action: "review_verification",
          event_id: "event-1",
          decision: "approve",
        },
      });
      expect(screen.getByText("Verification approved.")).toBeInTheDocument();
    });
  });

  it("rejects verification request via supplier-ops", async () => {
    render(
      <MemoryRouter>
        <AdminSuppliers />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Verification queue/i })).toBeInTheDocument();
    });

    const queueHeading = screen.getByRole("heading", { name: /Verification queue/i });
    const queueSection = queueHeading.closest("section")!;
    const rejectBtn = within(queueSection).getByRole("button", { name: /^Reject$/i });
    fireEvent.click(rejectBtn);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("supplier-ops", {
        body: {
          action: "review_verification",
          event_id: "event-1",
          decision: "reject",
        },
      });
    });
  });

  it("moderates pending listings with approve decision", async () => {
    render(
      <MemoryRouter>
        <AdminSuppliers />
      </MemoryRouter>,
    );

    await screen.findByText(/Sharp Sand \(20-Tonne Tipper\)/i);
    const listingsHeading = screen.getByRole("heading", { name: /Listing moderation/i });
    const listingsSection = listingsHeading.closest("section")!;
    const approveBtn = within(listingsSection).getByRole("button", { name: /^Approve$/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("supplier-ops", {
        body: {
          action: "moderate_listing",
          listing_id: "list-1",
          decision: "approve",
        },
      });
      expect(screen.getByText("Listing published.")).toBeInTheDocument();
    });
  });

  it("resolves complaints and dispute reports", async () => {
    render(
      <MemoryRouter>
        <AdminSuppliers />
      </MemoryRouter>,
    );

    await screen.findByText(/Order delivered with less volume than paid for/i);
    const resolveBtn = screen.getByRole("button", { name: /^Resolve$/i });
    fireEvent.click(resolveBtn);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("supplier-ops", {
        body: {
          action: "resolve_report",
          report_id: "rep-1",
          status: "resolved",
        },
      });
      expect(screen.getByText("Report resolved.")).toBeInTheDocument();
    });
  });

  it("surfaces error when supplier-ops function call fails", async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { ok: false, error: "Caller lacks admin verification permissions" },
      error: null,
    });

    render(
      <MemoryRouter>
        <AdminSuppliers />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Verification queue/i })).toBeInTheDocument();
    });

    const queueHeading = screen.getByRole("heading", { name: /Verification queue/i });
    const queueSection = queueHeading.closest("section")!;
    const approveBtn = within(queueSection).getByRole("button", { name: /^Approve$/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Caller lacks admin verification permissions"),
      ).toBeInTheDocument();
    });
  });
});
