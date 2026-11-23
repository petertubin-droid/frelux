import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminMarketPrices from "@/pages/admin/AdminMarketPrices";
import { supabase } from "@/lib/supabase";

vi.mock("@/lib/i18n", () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

const marketRow = {
  market: "NG",
  market_name: "Nigeria",
  currency_code: "NGN",
  material_count: 12,
  prices_awaiting_verification: 3,
  failing_sources: 1,
  open_alerts: 2,
  last_scan_at: "2026-11-22T08:00:00Z",
};

const insertSpy = vi.fn();
const invokeSpy = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: vi.fn(),
    functions: { invoke: (...args: unknown[]) => invokeSpy(...args) },
    from: vi.fn((table: string) => {
      if (table === "market_price_observations") {
        return {
          insert: (payload: unknown) => {
            insertSpy(payload);
            return Promise.resolve({ error: null });
          },
        };
      }
      const chain: Record<string, unknown> = {};
      for (const method of [
        "select",
        "order",
        "limit",
        "eq",
        "in",
        "like",
        "gte",
        "not",
        "is",
      ]) {
        chain[method] = () => chain;
      }
      chain.then = (resolve: (value: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(resolve);
      return chain;
    }),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminMarketPrices />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(supabase.rpc).mockResolvedValue({
    data: [marketRow],
    error: null,
  } as never);
  invokeSpy.mockResolvedValue({
    data: {
      scanned: 4,
      observations_filed: 9,
      prices_updated: 3,
      markets_scanned: 2,
    },
    error: null,
  });
});

describe("AdminMarketPrices", () => {
  it("records a supplier quotation with the market's own currency", async () => {
    renderPage();
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /Supplier quote/ }));
    fireEvent.change(screen.getByPlaceholderText("cement-50kg"), {
      target: { value: "  cement-50kg " },
    });
    fireEvent.change(screen.getByPlaceholderText("8500"), {
      target: { value: "8500" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save quotation/ }));

    await waitFor(() => expect(insertSpy).toHaveBeenCalledTimes(1));
    expect(insertSpy).toHaveBeenCalledWith({
      market: "NG",
      material_slug: "cement-50kg",
      brand: "",
      specification: "",
      unit: "",
      price: 8500,
      // The currency comes from the market row, not from a hardcoded default.
      currency: "NGN",
      supplier_name: null,
      supplier_location: null,
      source_format: "quote",
      extraction: "admin_quotation",
      confidence: "high",
    });
  });

  it("keeps a supplier name and location when they are given", async () => {
    renderPage();
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /Supplier quote/ }));
    fireEvent.change(screen.getByPlaceholderText("cement-50kg"), {
      target: { value: "cement-50kg" },
    });
    fireEvent.change(screen.getByPlaceholderText("BuildCo"), {
      target: { value: " BuildCo Ltd " },
    });
    fireEvent.change(screen.getByPlaceholderText("Lagos"), {
      target: { value: "Lagos" },
    });
    fireEvent.change(screen.getByPlaceholderText("8500"), {
      target: { value: "9200" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save quotation/ }));

    await waitFor(() => expect(insertSpy).toHaveBeenCalledTimes(1));
    expect(insertSpy.mock.calls[0][0]).toMatchObject({
      supplier_name: "BuildCo Ltd",
      supplier_location: "Lagos",
      price: 9200,
    });
  });

  it("refuses a quotation with no price", async () => {
    renderPage();
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /Supplier quote/ }));
    fireEvent.change(screen.getByPlaceholderText("cement-50kg"), {
      target: { value: "cement-50kg" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save quotation/ }));

    expect(
      await screen.findByText(/A market, a material and a positive price/),
    ).toBeInTheDocument();
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("surfaces a rejected observation instead of reporting a save", async () => {
    renderPage();
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalled());

    // The insert path is replaced for this case only.
    vi.mocked(supabase.from).mockImplementationOnce(
      () =>
        ({
          insert: () =>
            Promise.resolve({ error: { message: "row level security" } }),
        }) as never,
    );

    fireEvent.click(screen.getByRole("button", { name: /Supplier quote/ }));
    fireEvent.change(screen.getByPlaceholderText("cement-50kg"), {
      target: { value: "cement-50kg" },
    });
    fireEvent.change(screen.getByPlaceholderText("8500"), {
      target: { value: "8500" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save quotation/ }));

    expect(await screen.findByText(/row level security/)).toBeInTheDocument();
  });

  it("asks the scan function for the markets and reports what it did", async () => {
    renderPage();
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /Scan due markets/ }));

    await waitFor(() => expect(invokeSpy).toHaveBeenCalledTimes(1));
    expect(invokeSpy).toHaveBeenCalledWith("price-intel-scan", {
      body: { trigger: "admin", force: true, market: undefined },
    });
    expect(
      await screen.findByText(/9 observation\(s\), 3 price update\(s\)/),
    ).toBeInTheDocument();
  });

  it("reports a scan that could not start", async () => {
    invokeSpy.mockResolvedValue({
      data: null,
      error: new Error("scan offline"),
    });
    renderPage();
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /Scan due markets/ }));

    expect(await screen.findByText(/scan offline/)).toBeInTheDocument();
  });
});
