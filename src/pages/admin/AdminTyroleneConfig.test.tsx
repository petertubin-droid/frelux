import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminTyroleneConfig from "./AdminTyroleneConfig";

const mockRules = [
  {
    id: "rule-part-1",
    rule_key: "standard_partition_dimensions",
    calculator_type: "tyrolene",
    rule_value: { width: 3.5, height: 3.0 },
    is_active: true,
  },
  {
    id: "rule-ratio-1",
    rule_key: "material_ratio",
    calculator_type: "tyrolene",
    rule_value: {
      partitions_per_ratio: 4,
      materials: [
        { slug: "cement", quantity: 2, unit: "bags" },
        { slug: "sand", quantity: 1, unit: "ton" },
      ],
    },
    is_active: true,
  },
];

const mockMaterials = [
  { id: "mat-1", slug: "cement", name: "Cement", unit: "bags", sort_order: 1 },
  { id: "mat-2", slug: "sand", name: "Sharp Sand", unit: "ton", sort_order: 2 },
];

const mockPrices = [
  {
    id: "p-1",
    ref_id: "mat-1",
    price_type: "material",
    price: 8500,
    is_active: true,
  },
  {
    id: "p-2",
    ref_id: "mat-2",
    price_type: "material",
    price: 15000,
    is_active: true,
  },
];

const mockProdRules = [
  {
    id: "pr-1",
    product_category: "tyrolene",
    location_rule: "outside_owerri",
    min_quantity: 12,
    unit: "partitions",
    is_active: true,
  },
];

const updateEqMock = vi.fn().mockResolvedValue({ error: null });
const insertMock = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnValue({
    single: vi.fn().mockResolvedValue({ data: { id: "new-id" }, error: null }),
  }),
});

function createChainQuery(data: any) {
  const obj: any = {
    order: vi.fn().mockImplementation(() => obj),
    select: vi.fn().mockImplementation(() => obj),
    eq: vi.fn().mockImplementation(() => obj),
    in: vi.fn().mockImplementation(() => obj),
    limit: vi.fn().mockImplementation(() => obj),
    maybeSingle: vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve({
          data: Array.isArray(data) ? data[0] : data,
          error: null,
        }),
      ),
    then: (resolve: any) => resolve({ data, error: null }),
  };
  return obj;
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "estimation_calc_rules") {
        return {
          select: vi.fn().mockImplementation(() => createChainQuery(mockRules)),
          update: vi.fn().mockImplementation(() => ({
            eq: updateEqMock,
          })),
          insert: insertMock,
        };
      }
      if (table === "estimation_materials") {
        return createChainQuery(mockMaterials);
      }
      if (table === "estimation_prices") {
        return createChainQuery(mockPrices);
      }
      if (table === "estimation_production_rules") {
        return {
          select: vi
            .fn()
            .mockImplementation(() => createChainQuery(mockProdRules)),
          update: vi.fn().mockImplementation(() => ({
            eq: updateEqMock,
          })),
          insert: insertMock,
        };
      }
      if (table === "estimation_audit_log") {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return createChainQuery([]);
    }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminTyroleneConfig />
    </MemoryRouter>,
  );
}

describe("AdminTyroleneConfig", () => {
  it("renders page header and navigation tabs", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /Tyrolene Config/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Standard Partition/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Material Ratio/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Material Prices/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Production/i }),
    ).toBeInTheDocument();
  });

  it("loads and displays standard partition dimensions", async () => {
    renderPage();

    expect(await screen.findByDisplayValue("3.5")).toBeInTheDocument();
    expect(screen.getByDisplayValue("3")).toBeInTheDocument();
    expect(
      screen.getByText(/Standard partition area: 10\.50m²/),
    ).toBeInTheDocument();
  });

  it("saves updated partition dimensions", async () => {
    renderPage();

    const widthInput = await screen.findByDisplayValue("3.5");
    fireEvent.change(widthInput, { target: { value: "4.0" } });

    const saveBtn = screen.getByRole("button", { name: /Save Dimensions/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateEqMock).toHaveBeenCalled();
      expect(
        screen.getByText("Standard partition dimensions saved."),
      ).toBeInTheDocument();
    });
  });

  it("displays validation error when partition dimension is non-positive", async () => {
    renderPage();

    const widthInput = await screen.findByDisplayValue("3.5");
    fireEvent.change(widthInput, { target: { value: "-1" } });

    const saveBtn = screen.getByRole("button", { name: /Save Dimensions/i });
    fireEvent.click(saveBtn);

    expect(
      await screen.findByText("Width and height must be positive numbers."),
    ).toBeInTheDocument();
  });

  it("switches to Material Ratio tab and displays partitions per ratio", async () => {
    renderPage();

    await screen.findByDisplayValue("3.5");
    const ratioTabBtn = screen.getByRole("button", { name: /Material Ratio/i });
    fireEvent.click(ratioTabBtn);

    expect(
      await screen.findByText(/FRELUX verified material ratio/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Save Ratio/i }),
    ).toBeInTheDocument();
  });

  it("switches to Production tab and displays outside Owerri minimum", async () => {
    renderPage();

    await screen.findByDisplayValue("3.5");
    const prodTabBtn = screen.getByRole("button", { name: /Production/i });
    fireEvent.click(prodTabBtn);

    expect(await screen.findByDisplayValue("12")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });
});
