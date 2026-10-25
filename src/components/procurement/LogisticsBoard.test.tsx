// ============================================================
// Phase 3 logistics board: honest rendering tests.
// ============================================================

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { ProcurementRecord } from "@/lib/procurement/records";

const base: ProcurementRecord = {
  id: "r1",
  project_ref: null,
  title: "Cement supply",
  supplier: "Dangote",
  destination: "Lagos site",
  line_items: [{ description: "Cement", quantity: 100, unit: "bags" }],
  status: "listed",
  created_by: "u1",
  created_at: "2026-10-25T00:00:00Z",
  updated_at: "2026-10-25T00:00:00Z",
};

const mocks = {
  list: vi.fn(),
  trail: vi.fn(),
  create: vi.fn(),
  append: vi.fn(),
};

vi.mock("@/lib/procurement/records", async (importOriginal) => {
  const orig =
    await importOriginal<typeof import("@/lib/procurement/records")>();
  return {
    ...orig,
    listProcurementRecords: (...a: unknown[]) => mocks.list(...a),
    getProcurementTrail: (...a: unknown[]) => mocks.trail(...a),
    createProcurementRecord: (...a: unknown[]) => mocks.create(...a),
    appendProcurementEvent: (...a: unknown[]) => mocks.append(...a),
  };
});

vi.mock("@/lib/seo", () => ({
  useSeo: () => undefined,
}));

import { LogisticsBoard } from "./LogisticsBoard";

function board() {
  return render(
    <MemoryRouter>
      <LogisticsBoard />
    </MemoryRouter>,
  );
}

describe("LogisticsBoard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue([]);
    mocks.trail.mockResolvedValue([]);
  });

  it("renders an honest empty state when there are no records", async () => {
    board();
    await waitFor(() =>
      expect(screen.getByText(/No procurement records here yet/i)).toBeTruthy(),
    );
  });

  it("renders a record with only its allowed transitions", async () => {
    mocks.list.mockResolvedValue([base]);
    board();
    await waitFor(() => expect(screen.getByText("Cement supply")).toBeTruthy());
    // listed -> quote_requested and cancelled are the only legal moves
    expect(
      screen.getByRole("button", { name: /mark quote requested/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /mark cancelled/i }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /mark delivered/i }),
    ).toBeNull();
    // line items render with quantity and unit
    expect(screen.getByText(/100 bags/)).toBeTruthy();
  });

  it("hides transition controls on terminal states", async () => {
    mocks.list.mockResolvedValue([{ ...base, status: "delivered" }]);
    board();
    await waitFor(() => expect(screen.getByText(/delivered/i)).toBeTruthy());
    expect(screen.queryByRole("button", { name: /mark/i })).toBeNull();
  });

  it("shows the refusal reason when a transition is rejected", async () => {
    mocks.list.mockResolvedValue([base]);
    mocks.append.mockResolvedValue({
      ok: false,
      reason:
        "A record cannot move from listed to delivered with an auditable trail.",
    });
    board();
    const btn = await screen.findByRole("button", {
      name: /mark quote requested/i,
    });
    btn.click();
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "cannot move from listed to delivered",
      ),
    );
    expect(mocks.append).toHaveBeenCalled();
  });

  it("renders the audit trail with provenance", async () => {
    mocks.list.mockResolvedValue([base]);
    mocks.trail.mockResolvedValue([
      {
        id: "e1",
        record_id: "r1",
        from_status: null,
        to_status: "listed",
        actor_id: null,
        actor_role: "system",
        source: "app",
        line_items: [],
        supplier: "Dangote",
        destination: "Lagos site",
        notes: "Record created",
        occurred_at: "2026-10-25T00:00:00Z",
      },
    ]);
    board();
    const toggle = await screen.findByRole("button", {
      name: /view audit trail/i,
    });
    toggle.click();
    await waitFor(() =>
      expect(screen.getByText(/Recorded as Listed/)).toBeTruthy(),
    );
    expect(screen.getByText(/actor: system/)).toBeTruthy();
    expect(screen.getByText(/note: Record created/)).toBeTruthy();
  });

  it("creates a record as listed from the form", async () => {
    mocks.create.mockResolvedValue({ ...base, id: "r2" });
    board();
    await userEvent.click(screen.getByRole("button", { name: /new record/i }));
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Title/i), "Rebar");
    await user.type(screen.getByLabelText(/Supplier/i), "LocalSteel");
    await user.type(screen.getByLabelText(/Destination/i), "Site B");
    await user.type(
      screen.getByLabelText(/Line items, one per line/i),
      "Rebar, 200, lengths",
    );
    await user.click(screen.getByRole("button", { name: /create as listed/i }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalled());
    const call = mocks.create.mock.calls[0][0];
    expect(call.title).toBe("Rebar");
    expect(call.lineItems[0]).toEqual({
      description: "Rebar",
      quantity: 200,
      unit: "lengths",
    });
  });
});
