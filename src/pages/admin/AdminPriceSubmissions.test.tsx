import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminPriceSubmissions from "@/pages/admin/AdminPriceSubmissions";
import { supabase } from "@/lib/supabase";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));

vi.mock("@/lib/i18n", () => ({
  useLanguage: () => ({ t: (s: string) => s }),
}));

const mockSubmissions = [
  {
    id: "sub-1",
    market: "NG",
    region: "Lagos - Ikeja",
    item_name: "Dangote 3X 42.5R Cement",
    unit: "50kg bag",
    price: 8500,
    currency: "NGN",
    vendor: "Alaba Building Supply",
    status: "pending",
    created_at: "2026-11-20T09:00:00Z",
    material_slug: null,
    verification_count: 2,
    applied_price: null,
    applied_at: null,
    source_url: "https://example.com/receipt.jpg",
  },
  {
    id: "sub-2",
    market: "NG",
    region: "Abuja - Garki",
    item_name: "Sharp Sand",
    unit: "trip 20t",
    price: 95000,
    currency: "NGN",
    vendor: null,
    status: "community_verified",
    created_at: "2026-11-21T11:00:00Z",
    material_slug: "sharp_sand_20t",
    verification_count: 5,
    applied_price: null,
    applied_at: null,
    source_url: null,
  },
];

const mockMaterials = [
  {
    id: "mat-1",
    name: "Dangote 42.5R Portland Cement",
    slug: "portland_cement_dangote",
  },
  { id: "mat-2", name: "Sharp Sand 20 Ton", slug: "sharp_sand_20t" },
];

const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }));
const mockInsertMaybeSingle = vi
  .fn()
  .mockResolvedValue({ data: { id: "price-inserted-1" }, error: null });
const mockInsertSelect = vi.fn(() => ({ maybeSingle: mockInsertMaybeSingle }));
const mockInsert = vi.fn(() => ({ select: mockInsertSelect }));
const mockRpc = vi.fn().mockResolvedValue({ data: 3, error: null });

vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
    from: vi.fn((table: string) => {
      if (table === "price_submissions") {
        return {
          select: vi.fn().mockImplementation((_cols, opts) => {
            if (opts?.head) {
              return {
                eq: vi
                  .fn()
                  .mockResolvedValue({
                    count: mockSubmissions.length,
                    error: null,
                  }),
                then: (fn: any) =>
                  Promise.resolve(
                    fn({ count: mockSubmissions.length, error: null }),
                  ),
              };
            }
            return {
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockReturnValue({
                  eq: vi
                    .fn()
                    .mockResolvedValue({ data: mockSubmissions, error: null }),
                  then: (fn: any) =>
                    Promise.resolve(fn({ data: mockSubmissions, error: null })),
                }),
              }),
            };
          }),
          update: mockUpdate,
        };
      }
      if (table === "estimation_materials") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi
                .fn()
                .mockResolvedValue({ data: mockMaterials, error: null }),
            }),
          }),
        };
      }
      if (table === "estimation_prices") {
        return {
          insert: mockInsert,
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
      };
    }),
  },
}));

describe("AdminPriceSubmissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateEq.mockResolvedValue({ error: null });
    mockInsertMaybeSingle.mockResolvedValue({
      data: { id: "price-inserted-1" },
      error: null,
    });
    mockRpc.mockResolvedValue({ data: 3, error: null });
  });

  it("renders header and lists pending submissions with vendor and price details", async () => {
    render(
      <MemoryRouter>
        <AdminPriceSubmissions />
      </MemoryRouter>,
    );

    expect(screen.getByText("Community Price Submissions")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Dangote 3X 42.5R Cement")).toBeInTheDocument();
      expect(
        screen.getByText(/Lagos - Ikeja · NG · 8,500 NGN \/ 50kg bag/),
      ).toBeInTheDocument();
      expect(
        screen.getByText("vendor: Alaba Building Supply"),
      ).toBeInTheDocument();
      expect(screen.getByText("Sharp Sand")).toBeInTheDocument();
      expect(screen.getByText("Consensus")).toBeInTheDocument();
    });
  });

  it("refuses promotion without selecting a price-book material first", async () => {
    render(
      <MemoryRouter>
        <AdminPriceSubmissions />
      </MemoryRouter>,
    );

    await screen.findByText("Dangote 3X 42.5R Cement");
    const approveButtons = screen.getAllByRole("button", {
      name: /Approve into price book/i,
    });
    fireEvent.click(approveButtons[0]);

    await waitFor(() => {
      expect(
        screen.getByText(
          'Pick the price-book item for "Dangote 3X 42.5R Cement" first.',
        ),
      ).toBeInTheDocument();
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });

  it("promotes submission into price book with correct market currency and updates status", async () => {
    render(
      <MemoryRouter>
        <AdminPriceSubmissions />
      </MemoryRouter>,
    );

    await screen.findByText("Dangote 3X 42.5R Cement");
    const materialSelects = screen.getAllByLabelText(
      "Select approved material for price submission",
    );
    fireEvent.change(materialSelects[0], { target: { value: "mat-1" } });

    const approveButtons = screen.getAllByRole("button", {
      name: /Approve into price book/i,
    });
    fireEvent.click(approveButtons[0]);

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          price_type: "material",
          ref_id: "mat-1",
          price: 8500,
          currency: "NGN",
          market: "NG",
          origin: "community",
          scan_confidence: "manual",
        }),
      );
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "approved",
          applied_price: 8500,
          applied_price_id: "price-inserted-1",
        }),
      );
      expect(mockUpdateEq).toHaveBeenCalledWith("id", "sub-1");
    });
  });

  it("updates status to rejected upon clicking Reject", async () => {
    render(
      <MemoryRouter>
        <AdminPriceSubmissions />
      </MemoryRouter>,
    );

    await screen.findByText("Dangote 3X 42.5R Cement");
    const rejectButtons = screen.getAllByRole("button", { name: /^Reject$/i });
    fireEvent.click(rejectButtons[0]);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ status: "rejected" });
      expect(mockUpdateEq).toHaveBeenCalledWith("id", "sub-1");
    });
  });

  it("runs apply_community_prices verification RPC and displays count notice", async () => {
    render(
      <MemoryRouter>
        <AdminPriceSubmissions />
      </MemoryRouter>,
    );

    await screen.findByText("Dangote 3X 42.5R Cement");
    const sweepButton = screen.getByRole("button", {
      name: /Apply agreed reports/i,
    });
    fireEvent.click(sweepButton);

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith("apply_community_prices", {});
      expect(
        screen.getByText("3 prices updated from agreed reports."),
      ).toBeInTheDocument();
    });
  });

  it("handles empty state gracefully when no submissions exist", async () => {
    vi.mocked(supabase.from).mockImplementationOnce(
      (_table: string) =>
        ({
          select: vi.fn().mockImplementation((_cols, opts) => {
            if (opts?.head) {
              return {
                eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
                then: (fn: any) =>
                  Promise.resolve(fn({ count: 0, error: null })),
              };
            }
            return {
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ data: [], error: null }),
                  then: (fn: any) =>
                    Promise.resolve(fn({ data: [], error: null })),
                }),
              }),
            };
          }),
          update: mockUpdate,
        }) as any,
    );

    render(
      <MemoryRouter>
        <AdminPriceSubmissions />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Nothing here")).toBeInTheDocument();
      expect(
        screen.getByText("No submissions in this view."),
      ).toBeInTheDocument();
    });
  });
});
