import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminPaintEngineTest from "./AdminPaintEngineTest";

const mockProducts = [
  {
    id: "prod-1",
    name: "Standard Emulsion",
    category: "emulsion",
    standard_pack_size: 20,
    is_active: true,
    sort_order: 1,
  },
];

const mockQualities = [
  {
    id: "qual-1",
    product_id: "prod-1",
    name: "Standard Quality",
    coverage: 10,
    coverage_unit: "m2_per_liter",
    ceiling_coverage: 8,
    ceiling_coverage_unit: "m2_per_liter",
    is_active: true,
    sort_order: 1,
  },
];

const mockPrices = [
  {
    id: "price-1",
    price_type: "quality",
    ref_id: "qual-1",
    price: 32000,
    currency: "NGN",
    is_active: true,
  },
];

const mockRules = [
  {
    id: "rule-1",
    rule_key: "ceiling_quantity_per_room",
    rule_value: { litres: 5 },
    is_active: true,
  },
];

const mockColourConditions = [
  {
    id: "cc-1",
    condition_key: "previously_painted_same",
    name: "Same Colour",
    sort_order: 1,
    is_active: true,
  },
];

const mockSurfaceConditions = [
  {
    id: "sc-1",
    condition_key: "previously_painted_sound",
    name: "Sound Surface",
    sort_order: 1,
    is_active: true,
  },
];

function createChainQuery(data: any) {
  const obj: any = {
    order: vi.fn().mockImplementation(() => obj),
    select: vi.fn().mockImplementation(() => obj),
    eq: vi.fn().mockImplementation(() => obj),
    then: (resolve: any) => resolve({ data, error: null }),
  };
  return obj;
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "estimation_products")
        return createChainQuery(mockProducts);
      if (table === "estimation_product_quality")
        return createChainQuery(mockQualities);
      if (table === "estimation_prices") return createChainQuery(mockPrices);
      if (table === "estimation_calc_rules") return createChainQuery(mockRules);
      if (table === "estimation_colour_conditions")
        return createChainQuery(mockColourConditions);
      if (table === "estimation_surface_conditions")
        return createChainQuery(mockSurfaceConditions);
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
      <AdminPaintEngineTest />
    </MemoryRouter>,
  );
}

describe("AdminPaintEngineTest", () => {
  it("renders page header and paint calculation test bench", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /Paint Calculation Engine, Test Calculation/i,
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/Coverage Configuration for Standard Emulsion/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Calculate Test/i }),
    ).toBeInTheDocument();
  });

  it("displays room dimensions and inputs", async () => {
    renderPage();

    expect(await screen.findByText("Paint Type")).toBeInTheDocument();
    expect(screen.getByText("Length")).toBeInTheDocument();
    expect(screen.getByText("Width")).toBeInTheDocument();
    expect(screen.getByText("Height")).toBeInTheDocument();
    expect(screen.getByText("Doors")).toBeInTheDocument();
    expect(screen.getByText("Windows")).toBeInTheDocument();
  });

  it("runs calculate test and renders calculation results", async () => {
    renderPage();

    await screen.findByText(/Coverage Configuration for Standard Emulsion/);
    const calcBtn = screen.getByRole("button", { name: /Calculate Test/i });
    fireEvent.click(calcBtn);

    expect(
      await screen.findByRole("heading", {
        level: 3,
        name: "Calculation Results",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Hide Steps" }),
    ).toBeInTheDocument();
  });

  it("toggles step-by-step breakdown display", async () => {
    renderPage();

    await screen.findByText(/Coverage Configuration for Standard Emulsion/);
    const calcBtn = screen.getByRole("button", { name: /Calculate Test/i });
    fireEvent.click(calcBtn);

    const toggleStepsBtn = await screen.findByRole("button", {
      name: "Hide Steps",
    });
    fireEvent.click(toggleStepsBtn);

    expect(
      await screen.findByRole("button", { name: "Show Steps" }),
    ).toBeInTheDocument();
  });
});
