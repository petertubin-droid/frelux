import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));
vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));

// --- Table-aware, chainable Supabase mock ---------------------------
type Row = Record<string, unknown>;

const equipmentRow: Row = {
  id: "pop-tower",
  market: "NG",
  workflow: "nigeria",
  category: "equipment",
  name: "Scaffold tower hire",
  description: null,
  unit: "day",
  coverage_rate: 0,
  coverage_unit: "day",
  quantity_basis: "per_day",
  per_worker_rate: null,
  per_day_rate: 1,
  split_unit_price: null,
  package_size: 1,
  package_unit: "day",
  unit_price: 15000,
  labour_rate_per_sqm: 0,
  is_optional: false,
  currency: "NGN",
  is_active: true,
  sort_order: 1,
  created_at: "",
  updated_at: "",
};

// A consumable row, so the list has both kinds and the editor opens on the
// area basis for it.
const cementRow: Row = {
  ...equipmentRow,
  id: "pop-cement",
  category: "primary",
  name: "POP Cement",
  unit: "bag",
  coverage_rate: 10,
  coverage_unit: "m²",
  quantity_basis: "area",
  per_day_rate: null,
  package_unit: "bag",
  unit_price: 3500,
  sort_order: 2,
};

function tableData(table: string): Row[] {
  if (table === "pop_materials") return [equipmentRow, cementRow];
  return [];
}

const eqResults = vi.fn().mockResolvedValue({ error: null });

function buildChain(table: string) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(() =>
    Promise.resolve({ data: tableData(table)[0] ?? null, error: null }),
  );
  chain.then = (resolve: (v: unknown) => unknown) =>
    resolve({ data: tableData(table), error: null });
  chain.update = vi.fn(() => chain);
  chain.delete = vi.fn(() => ({ eq: eqResults }));
  chain.insert = vi.fn().mockResolvedValue({ error: null });
  chain.upsert = vi.fn().mockResolvedValue({ error: null });
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn((table: string) => buildChain(table)),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function renderPage() {
  const Comp = (await import("@/pages/admin/AdminPopMaterials")).default;
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Comp />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("AdminPopMaterials equipment lines", () => {
  it("shows hire as a day rate, so an admin sees what is billed", async () => {
    await renderPage();
    // The list summary has to read as hire, not as a coverage figure: a
    // day rate mislabelled as coverage would be entered as one.
    expect(await screen.findByText(/per\s+day/)).toBeInTheDocument();
    expect(screen.getByText(/a day/)).toBeInTheDocument();
  });

  it("swaps coverage for hire units when the basis is per day", async () => {
    const user = userEvent.setup();
    await renderPage();

    // The list groups by category, so target the hire row by name rather
    // than by position.
    await user.click(
      await screen.findByRole("button", { name: "Edit Scaffold tower hire" }),
    );

    // Anchor to the start of the accessible name: the field hints are part of
    // that name, and an unanchored match on "coverage" binds to the wrong
    // control.
    const basis = await screen.findByRole("combobox", {
      name: /^Quantity basis/,
    });
    expect(basis).toHaveValue("per_day");
    expect(screen.getByLabelText(/^Hire units per day/)).toHaveValue(1);
    // Coverage has no meaning for hire, so it must not be offered.
    expect(screen.queryByLabelText(/^Coverage Rate/)).not.toBeInTheDocument();

    // Switching to area brings coverage back and hides the hire units.
    await user.selectOptions(basis, "area");
    await waitFor(() =>
      expect(screen.getByLabelText(/^Coverage Rate/)).toBeInTheDocument(),
    );
    expect(
      screen.queryByLabelText(/^Hire units per day/),
    ).not.toBeInTheDocument();
  });

  it("offers equipment as a category", async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(
      await screen.findByRole("button", { name: "Edit Scaffold tower hire" }),
    );

    const category = await screen.findByRole("combobox", {
      name: /^Category/,
    });
    expect(
      screen.getByRole("option", { name: "equipment" }),
    ).toBeInTheDocument();
    expect(category).toHaveValue("equipment");
  });
});
