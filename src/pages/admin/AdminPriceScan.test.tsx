import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminPriceScan from "./AdminPriceScan";

const {
  mockSources,
  mockCandidates,
  updateEqMock,
  insertMock,
  invokeMock,
  state,
} = vi.hoisted(() => {
  const mockSources = [
    {
      id: "source-1",
      market: "US",
      material_slug: "us-quikrete-concrete-80lb",
      retailer: "Home Depot",
      label: "Quikrete 80lb Bag",
      product_url: "https://homedepot.com/p/quikrete",
      expected_unit: "bag",
      currency: "USD",
      is_active: true,
      last_scanned_at: "2026-11-01T10:00:00Z",
    },
  ];

  const mockCandidates = [
    {
      id: "cand-1",
      source_id: "source-1",
      market: "US",
      material_slug: "us-quikrete-concrete-80lb",
      retailer: "Home Depot",
      product_url: "https://homedepot.com/p/quikrete",
      product_name: "Quikrete 80 lb. Concrete Mix",
      scraped_price: 6.45,
      currency: "USD",
      unit: "bag",
      extraction: "json-ld",
      confidence: "high",
      scrape_error: null,
      status: "pending",
      reviewed_at: null,
      created_at: "2026-11-01T10:05:00Z",
    },
  ];

  const state = {
    fetchError: null as any,
    sourcesList: [...mockSources],
    candidatesList: [...mockCandidates],
  };

  return {
    mockSources,
    mockCandidates,
    updateEqMock: vi.fn().mockResolvedValue({ error: null }),
    insertMock: vi.fn().mockResolvedValue({ error: null }),
    invokeMock: vi.fn().mockResolvedValue({
      data: { candidate: { status: "pending", scrape_error: null } },
      error: null,
    }),
    state,
  };
});

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "price_scan_sources") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: state.fetchError ? null : state.sourcesList,
                error: state.fetchError,
              }),
            }),
          }),
          insert: insertMock,
        };
      }
      if (table === "price_scan_candidates") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: state.fetchError ? null : state.candidatesList,
                error: state.fetchError,
              }),
            }),
            count: 1,
            then: (resolve: any) => resolve({ count: 1, error: null }),
          }),
          update: vi.fn().mockImplementation(() => ({
            eq: updateEqMock,
          })),
        };
      }
      if (table === "estimation_materials") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: { id: "mat-1" }, error: null }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    }),
    functions: {
      invoke: invokeMock,
    },
  },
  getFunctionErrorMessage: vi.fn().mockResolvedValue("Function error"),
}));

vi.mock("@/lib/estimation/queries", () => ({
  createOrUpdatePrice: vi.fn().mockResolvedValue({
    data: { id: "applied-price-1" },
    error: null,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.sourcesList = [...mockSources];
  state.candidatesList = [...mockCandidates];
  state.fetchError = null;
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminPriceScan />
    </MemoryRouter>,
  );
}

describe("AdminPriceScan", () => {
  it("renders page header and scan sources", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", { level: 1, name: /Price Scan/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Quikrete 80lb Bag")).toBeInTheDocument();
    expect(
      screen.getByText(/Home Depot · US · us-quikrete-concrete-80lb/),
    ).toBeInTheDocument();
  });

  it("toggles and submits Add Source form", async () => {
    renderPage();

    await screen.findByText("Quikrete 80lb Bag");
    const addBtn = screen.getByRole("button", { name: /Add source/i });
    fireEvent.click(addBtn);

    const slugInput = screen.getByLabelText("Material slug");
    fireEvent.change(slugInput, { target: { value: "test-slug" } });

    const retailerInput = screen.getByLabelText("Retailer");
    fireEvent.change(retailerInput, { target: { value: "Lowes" } });

    const urlInput = screen.getByLabelText("Product URL");
    fireEvent.change(urlInput, { target: { value: "https://lowes.com/item" } });

    const saveBtn = screen.getByRole("button", { name: /Save source/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalled();
    });
  });

  it("triggers a scan of a source via Edge Function", async () => {
    renderPage();

    await screen.findByText("Quikrete 80lb Bag");
    const scanBtn = screen.getByRole("button", { name: "Scan" });
    fireEvent.click(scanBtn);

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith("price-scan", {
        body: { source_id: "source-1" },
      });
      expect(screen.getByTestId("scan-notice")).toBeInTheDocument();
    });
  });

  it("displays pending scan candidates and approves candidate", async () => {
    renderPage();

    expect(
      await screen.findByText(/Quikrete 80 lb\. Concrete Mix: 6\.45 USD/),
    ).toBeInTheDocument();
    const approveBtn = screen.getByRole("button", { name: /Approve & apply/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(updateEqMock).toHaveBeenCalledWith("id", "cand-1");
    });
  });

  it("rejects a pending candidate", async () => {
    renderPage();

    await screen.findByText(/Quikrete 80 lb\. Concrete Mix: 6\.45 USD/);
    const rejectBtn = screen.getByRole("button", { name: "Reject" });
    fireEvent.click(rejectBtn);

    await waitFor(() => {
      expect(updateEqMock).toHaveBeenCalledWith("id", "cand-1");
    });
  });

  it("displays error alert when initial fetch fails", async () => {
    state.fetchError = new Error("Database connection error");
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Database connection error",
    );
  });
});
