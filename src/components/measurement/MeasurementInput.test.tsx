import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MeasurementInput } from "@/components/measurement/MeasurementInput";
import type {
  MeasurementProject,
  MeasurementEntry,
} from "@/lib/measurement/types";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn(() => ({ user: null, loading: false })) }));

beforeEach(() => { vi.clearAllMocks(); });

function makeProject(quantity = 1): MeasurementProject {
  const entry: MeasurementEntry = {
    id: "entry-1",
    surfaceType: "wall",
    spaceType: "bedroom",
    length: 3,
    width: 4,
    height: 2.5,
    unit: "meters",
    quantity,
  };
  return {
    id: "proj-1",
    calculatorContext: "screeding",
    projectMode: "single_room",
    preferredUnit: "meters",
    sections: [
      { id: "sec-1", label: "Room", groups: [{ id: "g-1", label: "Bedroom 1", entry }] },
    ],
  };
}

const noop = () => {};
const validation = { valid: true, errors: [], warnings: [] };

function renderInput(project: MeasurementProject, onUpdate = vi.fn()) {
  render(
    <MeasurementInput
      project={project}
      context="screeding"
      validation={validation}
      onProjectModeChange={noop}
      onAddMeasurement={noop}
      onUpdateMeasurement={(_groupId, updates) => onUpdate(updates)}
      onRemoveMeasurement={noop}
    />,
  );
  return onUpdate;
}

describe("MeasurementInput", () => {
  it("module exports something", async () => {
    const mod = await import("@/components/measurement/MeasurementInput");
    expect(mod).toBeDefined();
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it("quantity field can be cleared without snapping back to 1", () => {
    const onUpdate = renderInput(makeProject());
    const qty = screen.getByLabelText(/quantity/i);

    expect(qty).toHaveValue(1);

    // Clear the field: it should stay empty, not force a sticky "1".
    fireEvent.change(qty, { target: { value: "" } });
    expect(qty).toHaveValue(null);
    expect(onUpdate).not.toHaveBeenCalled();

    // Typing a new number commits it.
    fireEvent.change(qty, { target: { value: "3" } });
    expect(onUpdate).toHaveBeenCalledWith({ quantity: 3 });

    // Blurring an unfinished draft restores the last valid quantity.
    fireEvent.change(qty, { target: { value: "0" } });
    expect(onUpdate).not.toHaveBeenCalledTimes(2);
    fireEvent.blur(qty);
    expect(screen.getByLabelText(/quantity/i)).toHaveValue(1);
  });

  it("does not re-commit an unchanged quantity", () => {
    const onUpdate = renderInput(makeProject(2));
    const qty = screen.getByLabelText(/quantity/i);
    fireEvent.change(qty, { target: { value: "2" } });
    expect(onUpdate).not.toHaveBeenCalled();
  });
});
