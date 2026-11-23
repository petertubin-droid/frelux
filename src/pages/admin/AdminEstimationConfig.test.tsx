import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminEstimationConfig from "./AdminEstimationConfig";
import { supabase } from "@/lib/supabase";

const mockUnits = [
  {
    id: "unit-1",
    name: "Square Meter",
    symbol: "sqm",
    category: "area",
    sort_order: 1,
    is_active: true,
  },
  {
    id: "unit-2",
    name: "Linear Meter",
    symbol: "lm",
    category: "length",
    sort_order: 2,
    is_active: false,
  },
];

let unitsList = [...mockUnits];
let unitsError: any = null;
const updateEqMock = vi.fn().mockResolvedValue({ error: null });
const deleteEqMock = vi.fn().mockResolvedValue({ error: null });
const insertMock = vi.fn().mockResolvedValue({ error: null });

function createChainQuery(data: any) {
  let isOrQuery = false;
  const obj: any = {
    order: vi.fn().mockImplementation(() => obj),
    select: vi.fn().mockImplementation(() => obj),
    or: vi.fn().mockImplementation(() => {
      isOrQuery = true;
      return obj;
    }),
    neq: vi.fn().mockImplementation(() => obj),
    then: (resolve: any) => {
      if (isOrQuery) {
        return resolve({ data: [], error: null });
      }
      return resolve({ data: unitsError ? null : data, error: unitsError });
    },
  };
  return obj;
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn((table: string) => ({
      select: vi.fn().mockImplementation(() => {
        if (table === "estimation_units") return createChainQuery(unitsList);
        return createChainQuery([]);
      }),
      update: vi.fn().mockImplementation(() => ({
        eq: updateEqMock,
      })),
      delete: vi.fn().mockImplementation(() => ({
        eq: deleteEqMock,
      })),
      insert: insertMock,
    })),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  unitsList = [...mockUnits];
  unitsError = null;
  window.confirm = vi.fn().mockReturnValue(true);
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminEstimationConfig />
    </MemoryRouter>,
  );
}

describe("AdminEstimationConfig", () => {
  it("renders Estimation Config header, tabs, and units list", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /Estimation Config/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Units" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Pack Sizes" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Square Meter")).toBeInTheDocument();
    expect(screen.getByText("sqm")).toBeInTheDocument();
    expect(screen.getByText("Linear Meter")).toBeInTheDocument();
  });

  it("switches tabs between Units, Pack Sizes, and Calc Rules", async () => {
    renderPage();

    await screen.findByText("Square Meter");
    const packSizesTab = screen.getByRole("button", { name: "Pack Sizes" });
    fireEvent.click(packSizesTab);

    expect(
      await screen.findByRole("heading", { level: 2, name: "Pack Sizes" }),
    ).toBeInTheDocument();

    const calcRulesTab = screen.getByRole("button", { name: "Calc Rules" });
    fireEvent.click(calcRulesTab);

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Calculation Rules",
      }),
    ).toBeInTheDocument();
  });

  it("toggles unit active state and calls supabase update", async () => {
    renderPage();

    await screen.findByText("Square Meter");
    const toggle = screen.getByLabelText("Active: Square Meter");
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(updateEqMock).toHaveBeenCalledWith("id", "unit-1");
    });
  });

  it("deletes a unit after confirmation and calls supabase delete", async () => {
    renderPage();

    await screen.findByText("Square Meter");
    const deleteBtn = screen.getByLabelText("Delete unit Square Meter");
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('Delete unit "Square Meter"'),
      );
      expect(deleteEqMock).toHaveBeenCalledWith("id", "unit-1");
    });
  });

  it("validates required fields on Add Unit modal", async () => {
    renderPage();

    await screen.findByText("Square Meter");
    const addBtn = screen.getByRole("button", { name: /Add unit/i });
    fireEvent.click(addBtn);

    expect(
      await screen.findByRole("heading", { name: "Add unit" }),
    ).toBeInTheDocument();

    // Click Save without filling name or symbol
    const saveBtn = screen.getByRole("button", { name: "Save" });
    fireEvent.click(saveBtn);

    expect(await screen.findByText("Name is required")).toBeInTheDocument();
  });

  it("creates a new unit with valid inputs", async () => {
    renderPage();

    await screen.findByText("Square Meter");
    const addBtn = screen.getByRole("button", { name: /Add unit/i });
    fireEvent.click(addBtn);

    await screen.findByRole("heading", { name: "Add unit" });

    fireEvent.change(
      screen.getByPlaceholderText("e.g. litres, kilograms, bags"),
      { target: { value: "Cubic Meter" } },
    );
    fireEvent.change(screen.getByPlaceholderText("e.g. L, kg, bag"), {
      target: { value: "cbm" },
    });

    const saveBtn = screen.getByRole("button", { name: "Save" });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Cubic Meter",
          symbol: "cbm",
        }),
      );
    });
  });

  it("displays error banner when loading units fails", async () => {
    unitsError = { message: "Database connection failed for units" };
    renderPage();

    expect(
      await screen.findByText("Database connection failed for units"),
    ).toBeInTheDocument();
  });
});
