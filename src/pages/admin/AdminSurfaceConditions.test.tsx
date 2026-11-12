import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  order: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({ supabase: { from: mocks.from } }));

const ROWS = [
  {
    id: "row-1",
    condition_key: "new_plastered",
    name: "New plaster",
    description: "Fresh plaster, still curing",
    requires_preparation: true,
    primer_recommended: true,
    is_active: true,
    sort_order: 1,
  },
  {
    id: "row-2",
    condition_key: "damp",
    name: "Damp affected",
    description: "Moisture visible",
    requires_preparation: true,
    primer_recommended: false,
    is_active: false,
    sort_order: 2,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.select.mockReturnValue({ order: mocks.order });
  mocks.update.mockReturnValue({ eq: mocks.eq });
  mocks.from.mockReturnValue({ select: mocks.select, update: mocks.update });
  mocks.order.mockResolvedValue({ data: ROWS, error: null });
  mocks.eq.mockResolvedValue({ error: null });
});

async function renderPage() {
  const Comp = (await import("@/pages/admin/AdminSurfaceConditions")).default;
  return render(
    <MemoryRouter>
      <Comp />
    </MemoryRouter>,
  );
}

describe("AdminSurfaceConditions", () => {
  it("shows the conditions the estimators actually read", async () => {
    await renderPage();
    expect(await screen.findByDisplayValue("New plaster")).toBeDefined();
    expect(screen.getByText("new_plastered")).toBeDefined();
    expect(screen.getByText("damp")).toBeDefined();
    // The old hardcoded list used keys that do not exist in the engine.
    expect(screen.queryByText("new_wall")).toBeNull();
    expect(screen.getByText(/1 active/)).toBeDefined();
  });

  it("saves only the edited row", async () => {
    await renderPage();
    const nameInput = await screen.findByDisplayValue("Damp affected");
    fireEvent.change(nameInput, { target: { value: "Damp walls" } });

    const saveButtons = screen.getAllByRole("button", { name: "Save" });
    // Row 2 is the one edited above.
    fireEvent.click(saveButtons[1]);

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    expect(mocks.update.mock.calls[0][0]).toMatchObject({
      name: "Damp walls",
      requires_preparation: true,
      primer_recommended: false,
      is_active: false,
      sort_order: 2,
    });
    expect(mocks.eq).toHaveBeenCalledWith("id", "row-2");
  });

  it("reports a failed read instead of looking empty", async () => {
    mocks.order.mockResolvedValue({ data: null, error: { message: "boom" } });
    await renderPage();
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Could not load surface conditions");
  });
});
