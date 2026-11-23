import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminPriceIndex from "@/pages/admin/AdminPriceIndex";
import { supabase } from "@/lib/supabase";
import * as priceQueries from "@/lib/price-index/queries";

const mockListings = [
  {
    material_id: "mat-1",
    name: "Portland Cement (50kg)",
    slug: "portland-cement-50kg",
    category: "masonry",
    sale_unit: "50kg bag",
    price: 8500,
    price_ngn: 8500,
    currency: "NGN",
    city_slug: "lagos",
    is_published: true,
    supplier_name: "Dangote Direct",
    price_kind: "retail",
    supporting_submissions: 4,
    effective_date: "2026-11-20",
    verification_status: "verified",
    price_source: "Invoice sample",
  },
  {
    material_id: "mat-1",
    name: "Portland Cement (50kg)",
    slug: "portland-cement-50kg",
    category: "masonry",
    sale_unit: "50kg bag",
    price: 9000,
    price_ngn: 9000,
    currency: "NGN",
    city_slug: "abuja",
    is_published: true,
    supplier_name: "Abuja Builders Depot",
    price_kind: "retail",
    supporting_submissions: 2,
    effective_date: "2026-11-21",
    verification_status: "verified",
    price_source: "Market visit",
  },
];

const mockSubmissions = [
  {
    id: "sub-1",
    material_id: "mat-1",
    item_name: "Portland Cement (50kg)",
    unit: "50kg bag",
    price: "8700",
    currency: "NGN",
    city_slug: "lagos",
    status: "pending",
    price_kind: "retail" as const,
    vendor: "Lekki Hardware",
    source_url: "https://example.com/receipt.pdf",
    created_at: "2026-11-22T08:00:00Z",
  },
  {
    id: "sub-2",
    material_id: "mat-1",
    item_name: "Portland Cement (50kg)",
    unit: "50kg bag",
    price: "8500",
    currency: "NGN",
    city_slug: "abuja",
    status: "approved",
    price_kind: "retail" as const,
    vendor: "Wuse Builders",
    source_url: null,
    created_at: "2026-11-20T10:00:00Z",
  },
];

const mockCities = [
  {
    slug: "lagos",
    name: "Lagos",
    state: "Lagos",
    country_code: "NG",
    is_active: true,
    sort_order: 1,
  },
  {
    slug: "abuja",
    name: "Abuja",
    state: "FCT",
    country_code: "NG",
    is_active: false,
    sort_order: 2,
  },
];

const mockAudit = [
  {
    id: "audit-1",
    action: "approve",
    entity: "price_submission",
    entity_id: "sub-2",
    note: "Verified with invoice receipt",
    created_at: "2026-11-21T09:00:00Z",
  },
];

const mockInvoke = vi
  .fn()
  .mockResolvedValue({ data: { ok: true }, error: null });

vi.mock("@/lib/supabase", () => ({
  supabase: {
    functions: {
      invoke: (...args: any[]) => mockInvoke(...args),
    },
  },
}));

vi.mock("@/lib/price-index/queries", () => ({
  fetchListings: vi.fn(),
  fetchPendingSubmissions: vi.fn(),
  fetchCities: vi.fn(),
  fetchAuditTrail: vi.fn(),
  categoryLabel: vi.fn((cat: string) => cat.toUpperCase()),
}));

describe("AdminPriceIndex", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue({ data: { ok: true }, error: null });
    vi.mocked(priceQueries.fetchListings).mockResolvedValue({
      listings: mockListings as any,
      error: null,
    });
    vi.mocked(priceQueries.fetchPendingSubmissions).mockResolvedValue({
      rows: mockSubmissions as any,
      error: null,
    });
    vi.mocked(priceQueries.fetchCities).mockResolvedValue({
      cities: mockCities as any,
      error: null,
    });
    vi.mocked(priceQueries.fetchAuditTrail).mockResolvedValue({
      rows: mockAudit as any,
      error: null,
    });
  });

  it("renders moderator panel, summary status counts, and audit trail rows", async () => {
    render(
      <MemoryRouter>
        <AdminPriceIndex />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /Material Price Index/i,
    );

    await waitFor(() => {
      expect(screen.getByText("1 pending")).toBeInTheDocument();
      expect(screen.getByText("1 approved")).toBeInTheDocument();
      expect(screen.getByText("Lekki Hardware")).toBeInTheDocument();
      expect(
        screen.getByText("Verified with invoice receipt"),
      ).toBeInTheDocument();
      expect(screen.getByText("· Lagos")).toBeInTheDocument();
      expect(screen.getByText("· FCT")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Disable" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Enable" }),
      ).toBeInTheDocument();
    });
  });

  it("filters submissions by status dropdown selection", async () => {
    render(
      <MemoryRouter>
        <AdminPriceIndex />
      </MemoryRouter>,
    );

    await screen.findByText("Lekki Hardware");
    const statusSelect = screen.getByLabelText("Status");

    // Switch to approved tab
    fireEvent.change(statusSelect, { target: { value: "approved" } });

    await waitFor(() => {
      expect(screen.getByText("Wuse Builders")).toBeInTheDocument();
      expect(screen.queryByText("Lekki Hardware")).not.toBeInTheDocument();
    });
  });

  it("approves a submission via price-index-review edge function", async () => {
    render(
      <MemoryRouter>
        <AdminPriceIndex />
      </MemoryRouter>,
    );

    await screen.findByText("Lekki Hardware");
    const approveBtn = screen.getByRole("button", { name: "Approve" });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("price-index-review", {
        body: {
          action: "approve",
          submission_id: "sub-1",
          note: null,
        },
      });
    });
  });

  it("prompts for note and rejects a submission", async () => {
    const promptSpy = vi.fn().mockReturnValue("Invoice date expired");
    window.prompt = promptSpy as any;

    render(
      <MemoryRouter>
        <AdminPriceIndex />
      </MemoryRouter>,
    );

    await screen.findByText("Lekki Hardware");
    const rejectBtn = screen.getByRole("button", { name: "Reject" });
    fireEvent.click(rejectBtn);

    expect(promptSpy).toHaveBeenCalledWith(
      "Reason for rejecting this price (shown in the audit trail)?",
    );
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("price-index-review", {
        body: {
          action: "reject",
          submission_id: "sub-1",
          note: "Invoice date expired",
        },
      });
    });
  });

  it("aborts rejection when prompt is cancelled", async () => {
    const promptSpy = vi.fn().mockReturnValue(null);
    window.prompt = promptSpy as any;

    render(
      <MemoryRouter>
        <AdminPriceIndex />
      </MemoryRouter>,
    );

    await screen.findByText("Lekki Hardware");
    const rejectBtn = screen.getByRole("button", { name: "Reject" });
    fireEvent.click(rejectBtn);

    expect(promptSpy).toHaveBeenCalled();
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("toggles city active state via edge function", async () => {
    render(
      <MemoryRouter>
        <AdminPriceIndex />
      </MemoryRouter>,
    );

    await screen.findByText("· Lagos");
    const disableBtn = screen.getByRole("button", { name: "Disable" });
    fireEvent.click(disableBtn);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("price-index-review", {
        body: {
          action: "toggle_city",
          city_slug: "lagos",
          is_active: false,
        },
      });
    });
  });

  it("displays cross-city comparison statistics when material is chosen", async () => {
    render(
      <MemoryRouter>
        <AdminPriceIndex />
      </MemoryRouter>,
    );

    await screen.findByText("Lekki Hardware");
    const materialSelect = screen.getByLabelText("Material");
    fireEvent.change(materialSelect, { target: { value: "mat-1" } });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Compare markets" }),
      ).toBeInTheDocument();
      // Should show row for Lagos and Abuja
      expect(
        screen.getAllByRole("cell", { name: "Lagos" }).length,
      ).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole("cell", { name: "Abuja" })).toBeInTheDocument();
    });
  });

  it("exports listings as CSV file download", async () => {
    const clickSpy = vi.fn();
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = origCreateElement(tag);
      if (tag === "a") {
        el.click = clickSpy;
      }
      return el;
    });

    render(
      <MemoryRouter>
        <AdminPriceIndex />
      </MemoryRouter>,
    );

    await screen.findByText("Lekki Hardware");
    const exportBtn = screen.getByRole("button", { name: /Export CSV/i });
    fireEvent.click(exportBtn);

    expect(clickSpy).toHaveBeenCalled();
  });

  it("renders load error message when queries fail", async () => {
    vi.mocked(priceQueries.fetchPendingSubmissions).mockResolvedValue({
      rows: [],
      error: "PostgreSQL read-only replica timeout",
    });

    render(
      <MemoryRouter>
        <AdminPriceIndex />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Price index data unavailable"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/PostgreSQL read-only replica timeout/),
      ).toBeInTheDocument();
    });
  });
});
