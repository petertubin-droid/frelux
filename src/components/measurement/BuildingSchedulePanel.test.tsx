import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { BuildingSchedulePanel, type AppliedBuilding } from "./BuildingSchedulePanel";
import {
  getBuildingPresets,
  type RoomDraft,
} from "@/lib/measurement/building-presets";

const setup = (marketCode = "NG") => {
  const onChange = vi.fn<(value: AppliedBuilding | null) => void>();
  const onClear = vi.fn();
  render(
    <BuildingSchedulePanel marketCode={marketCode} onChange={onChange} onClear={onClear} />,
  );
  return { onChange, onClear };
};

const lastApplied = (onChange: ReturnType<typeof vi.fn>): AppliedBuilding =>
  onChange.mock.calls[onChange.mock.calls.length - 1][0] as AppliedBuilding;

describe("building schedule panel", () => {
  it("offers the market's building types", () => {
    setup("NG");
    const presets = getBuildingPresets("NG");
    expect(screen.getByLabelText(/building type/i)).toBeTruthy();
    expect(presets.length).toBeGreaterThan(0);
    expect(screen.getByRole("option", { name: presets[0].label })).toBeTruthy();
  });

  it("emits a whole schedule when a building type is chosen", () => {
    const { onChange } = setup("NG");
    const preset = getBuildingPresets("NG")[0];
    fireEvent.change(screen.getByLabelText(/building type/i), {
      target: { value: preset.id },
    });

    const applied = lastApplied(onChange);
    expect(applied.label).toBe(preset.label);
    expect(applied.schedule.rooms.length).toBeGreaterThan(0);
    // Every emitted room is a real room with four walls.
    for (const room of applied.schedule.rooms) {
      expect(room.walls).toHaveLength(4);
    }
    expect(applied.totals.grossWallAreaM2).toBeGreaterThan(0);
  });

  it("recomputes the totals when a room is resized", () => {
    const { onChange } = setup("NG");
    const preset = getBuildingPresets("NG")[0];
    fireEvent.change(screen.getByLabelText(/building type/i), {
      target: { value: preset.id },
    });
    const before = lastApplied(onChange).totals.grossWallAreaM2;

    const lengthInputs = screen.getAllByLabelText(/length in ft/i);
    fireEvent.change(lengthInputs[0], { target: { value: "40" } });

    const after = lastApplied(onChange).totals.grossWallAreaM2;
    expect(after).not.toBe(before);
  });

  it("multiplies identical rooms into the schedule", () => {
    const { onChange } = setup("NG");
    const preset = getBuildingPresets("NG")[0];
    fireEvent.change(screen.getByLabelText(/building type/i), {
      target: { value: preset.id },
    });
    const first = lastApplied(onChange);
    const roomCountBefore = first.totals.roomCount;

    const identical = screen.getAllByLabelText(/identical copies of/i);
    fireEvent.change(identical[0], { target: { value: "4" } });

    const after = lastApplied(onChange);
    expect(after.totals.roomCount).toBeGreaterThan(roomCountBefore);
  });

  it("adds a custom room of the user's own size", () => {
    const { onChange } = setup("NG");
    fireEvent.click(screen.getByRole("button", { name: /add a room/i }));
    const applied = lastApplied(onChange);
    expect(applied.schedule.rooms).toHaveLength(1);
    // Nigeria reads in feet, so a new room starts at 10 ft, which is 3.048 m.
    expect(applied.schedule.rooms[0].walls?.[0].length).toBeCloseTo(3.048, 3);
  });

  it("clears the building and tells the calculator to fall back", () => {
    const { onChange, onClear } = setup("NG");
    const preset = getBuildingPresets("NG")[0];
    fireEvent.change(screen.getByLabelText(/building type/i), {
      target: { value: preset.id },
    });
    fireEvent.click(screen.getByRole("button", { name: /clear building/i }));
    expect(onClear).toHaveBeenCalled();
  });

  it("says which opening sizes it assumed", () => {
    setup("NG");
    const preset = getBuildingPresets("NG")[0];
    fireEvent.change(screen.getByLabelText(/building type/i), {
      target: { value: preset.id },
    });
    expect(screen.getByText(/standard sizes, a door at 0.9/i)).toBeTruthy();
  });

  it("warns when an opening cannot fit any wall of its room", () => {
    const tiny: RoomDraft[] = [
      {
        id: "r1",
        spaceType: "store",
        label: "Store",
        length: 0.8,
        width: 0.5,
        height: 2.7,
        quantity: 1,
        doors: 0,
        windows: 1,
      },
    ];
    render(
      <BuildingSchedulePanel
        marketCode="NG"
        initialDrafts={tiny}
        onChange={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByRole("status").textContent).toMatch(
      /1 opening wider or larger than any wall/i,
    );
  });
});
