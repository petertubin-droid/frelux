import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminEstimationEstimates from "@/pages/admin/AdminEstimationEstimates";
import { supabase } from "@/lib/supabase";

vi.mock("@/lib/i18n", () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

const estimate = {
  id: "est-1",
  estimate_ref: "FRL-2026-0042",
  calculator_type: "painting",
  status: "calculated",
  project_description: "Three bedroom repaint",
  created_at: "2026-11-20T09:00:00Z",
  total: 185000,
  currency_code: "NGN",
  // The row renders this without a guard, so a record missing it throws.
  labour_status: "not_included",
};

const items = [
  {
    id: "item-1",
    estimate_id: "est-1",
    item_name: "Emulsion, 20 L bucket",
    item_type: "material",
    required_qty: 4,
    practical_qty: 4,
    unit: "bucket",
    unit_price: 46000,
    total_price: 184000,
    source: "engine",
    notes: null,
    sort_order: 0,
    created_at: "2026-11-20T09:00:00Z",
  },
];

const fromCalls: Array<{ table: string; eqs: Array<[string, unknown]> }> = [];

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      const record = { table, eqs: [] as Array<[string, unknown]> };
      fromCalls.push(record);
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.order = () => chain;
      chain.range = () => chain;
      chain.or = () => chain;
      chain.limit = () => chain;
      chain.eq = (column: string, value: unknown) => {
        record.eqs.push([column, value]);
        return chain;
      };
      chain.then = (resolve: (value: unknown) => unknown) => {
        const payload =
          table === "estimation_estimate_items"
            ? { data: items, error: null }
            : { data: [estimate], error: null, count: 1 };
        return Promise.resolve(payload).then(resolve);
      };
      return chain;
    }),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminEstimationEstimates />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  fromCalls.length = 0;
});

describe("AdminEstimationEstimates", () => {
  it("lists the estimates it loaded", async () => {
    renderPage();
    expect(await screen.findByText("FRL-2026-0042")).toBeInTheDocument();
    expect(screen.getByText("Three bedroom repaint")).toBeInTheDocument();
  });

  it("filters by calculator on the server, not in the browser", async () => {
    renderPage();
    await screen.findByText("FRL-2026-0042");
    fromCalls.length = 0;

    fireEvent.change(screen.getByLabelText("Filter estimates by calculator"), {
      target: { value: "tile" },
    });

    await waitFor(() => {
      const filtered = fromCalls.filter((call) =>
        call.eqs.some(
          ([column, value]) => column === "calculator_type" && value === "tile",
        ),
      );
      expect(filtered.length).toBeGreaterThan(0);
    });
  });

  it("filters by status alongside the calculator", async () => {
    renderPage();
    await screen.findByText("FRL-2026-0042");
    fromCalls.length = 0;

    fireEvent.change(screen.getByLabelText("Filter estimates by status"), {
      target: { value: "shared" },
    });

    await waitFor(() => {
      const filtered = fromCalls.filter((call) =>
        call.eqs.some(
          ([column, value]) => column === "status" && value === "shared",
        ),
      );
      expect(filtered.length).toBeGreaterThan(0);
    });
  });

  it("loads the line items of the row that was opened, once", async () => {
    renderPage();
    await screen.findByText("FRL-2026-0042");
    fromCalls.length = 0;

    const row = screen
      .getByText("FRL-2026-0042")
      .closest('[role="button"]') as HTMLElement;
    fireEvent.click(row);

    await waitFor(() => {
      const itemCalls = fromCalls.filter(
        (call) => call.table === "estimation_estimate_items",
      );
      expect(itemCalls.length).toBe(1);
      expect(itemCalls[0].eqs).toContainEqual(["estimate_id", "est-1"]);
    });
    expect(
      await screen.findByText(/Emulsion, 20 L bucket/),
    ).toBeInTheDocument();
  });

  it("does not refetch items when the same row is reopened", async () => {
    renderPage();
    await screen.findByText("FRL-2026-0042");
    fromCalls.length = 0;

    const row = screen
      .getByText("FRL-2026-0042")
      .closest('[role="button"]') as HTMLElement;
    fireEvent.click(row);
    await screen.findByText(/Emulsion, 20 L bucket/);
    fireEvent.click(row);
    fireEvent.click(row);

    await waitFor(() => {
      const itemCalls = fromCalls.filter(
        (call) => call.table === "estimation_estimate_items",
      );
      expect(itemCalls.length).toBe(1);
    });
  });
});
