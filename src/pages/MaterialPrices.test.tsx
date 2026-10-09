import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

type Call = { method: string; args: unknown[] };

const METHODS = [
  "select",
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "like",
  "ilike",
  "in",
  "is",
  "not",
  "or",
  "and",
  "order",
  "range",
  "limit",
  "single",
  "maybeSingle",
  "textSearch",
];

const mockTables = {
  __prices: [] as Record<string, unknown>[],
  __materials: [] as Record<string, unknown>[],
  __history: [] as Record<string, unknown>[],
};

function makeBuilder(table: string) {
  const calls: Call[] = [];
  const builder: Record<string, unknown> = {
    then: (
      onFulfilled: (r: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => {
      let data: unknown;
      if (table === "estimation_prices") data = mockTables.__prices;
      else if (table === "estimation_materials") data = mockTables.__materials;
      else if (table === "material_price_history") data = mockTables.__history;
      else data = [];
      return Promise.resolve({ data, error: null }).then(
        onFulfilled,
        onRejected,
      );
    },
  };
  for (const m of METHODS) {
    builder[m] = vi.fn((...args: unknown[]) => {
      calls.push({ method: m, args });
      return builder;
    });
  }
  return builder;
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn((table: string) => makeBuilder(table)),
  },
}));

vi.mock("@/components/ui/AdSlot", () => ({
  default: () => null,
}));

import MaterialPrices from "@/pages/MaterialPrices";

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <MaterialPrices />
      </ToastProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockTables.__prices = [
    {
      ref_id: "m-1",
      price: "7.99",
      currency: "GBP",
      effective_date: "2026-10-05",
      price_source: "B&Q",
      is_active: true,
    },
    {
      ref_id: "m-2",
      price: "15500",
      currency: "NGN",
      effective_date: "2026-08-22",
      price_source: null,
      is_active: true,
    },
  ];
  mockTables.__materials = [
    {
      id: "m-1",
      name: "Cement (25kg)",
      category: "cement",
      pack_size: "25kg bag",
    },
    { id: "m-2", name: "Cement", category: "cement", pack_size: null },
  ];
  mockTables.__history = [];
});

describe("MaterialPrices", () => {
  it("renders the joined price book grouped by category", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Cement (25kg)")).toBeInTheDocument();
    });
    // Both rows visible, with formatted prices
    expect(screen.getByText("Cement (25kg)")).toBeInTheDocument();
    expect(screen.getByText("£7.99")).toBeInTheDocument();
    expect(screen.getByText("₦15,500")).toBeInTheDocument();
    // Movement hint appears while history is empty
    expect(
      screen.getByText(
        /Movement arrows will appear here as prices are updated/i,
      ),
    ).toBeInTheDocument();
  });

  it("filters by currency chip", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText("Cement (25kg)")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "GBP" }));
    expect(screen.getByText("Cement (25kg)")).toBeInTheDocument();
    expect(screen.queryByText("₦15,500")).not.toBeInTheDocument();
  });

  it("shows a movement percentage when history exists", async () => {
    mockTables.__history = [
      {
        material_name: "Cement (25kg)",
        old_price: 8.99,
        new_price: 7.99,
        created_at: "2026-10-05T00:00:00Z",
      },
    ];
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("11%")).toBeInTheDocument();
    });
  });
});
