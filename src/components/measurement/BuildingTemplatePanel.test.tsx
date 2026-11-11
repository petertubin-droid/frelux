import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BuildingTemplatePanel } from "./BuildingTemplatePanel";
import {
  defaultPresetUnit,
  getBuildingPresets,
  presetToRoomDrafts,
} from "@/lib/measurement/building-presets";
import { draftsToSchedule, scheduleTotals } from "@/lib/measurement/building-schedule";

describe("BuildingTemplatePanel", () => {
  it("uses net wall area from the shared schedule for editable building templates", () => {
    const onChange = vi.fn();
    render(
      <MemoryRouter>
        <BuildingTemplatePanel marketCode="NG" surface="wall" onChange={onChange} />
      </MemoryRouter>,
    );
    const preset = getBuildingPresets("NG").find((item) =>
      item.rooms.some((room) => room.doors > 0 || room.windows > 0),
    );
    expect(preset).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/building type/i), {
      target: { value: preset!.id },
    });
    const drafts = presetToRoomDrafts(preset!, defaultPresetUnit("NG"));
    const expected = scheduleTotals(draftsToSchedule(drafts, "feet")).netWallAreaM2;
    expect(onChange).toHaveBeenLastCalledWith(expected);
    expect(screen.getByText(/assumed standard sizes/i)).toBeTruthy();
  });

  it("lets users add a custom room and updates the selected surface area", () => {
    const onChange = vi.fn();
    render(
      <MemoryRouter>
        <BuildingTemplatePanel marketCode="GB" surface="floor" onChange={onChange} />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText(/building type/i), {
      target: { value: "custom" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add custom room/i }));
    expect(screen.getByLabelText(/room type for custom room 1/i)).toBeTruthy();
    expect(onChange).toHaveBeenLastCalledWith(9);
    fireEvent.change(screen.getByLabelText(/room type for custom room 1/i), {
      target: { value: "Workshop" },
    });
    fireEvent.change(screen.getByLabelText(/length \(m\)/i), {
      target: { value: "4" },
    });
    expect(screen.getByLabelText(/room type for workshop/i)).toBeTruthy();
    expect(onChange).toHaveBeenLastCalledWith(12);
  });

  it("subtracts added opening counts from wall area and leaves floor area unaffected", () => {
    const wallOnChange = vi.fn();
    const { unmount } = render(
      <MemoryRouter>
        <BuildingTemplatePanel marketCode="GB" surface="wall" onChange={wallOnChange} />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText(/building type/i), {
      target: { value: "custom" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add custom room/i }));
    const grossWall = wallOnChange.mock.calls[wallOnChange.mock.calls.length - 1]?.[0] as number;
    fireEvent.change(screen.getByLabelText(/doors per room/i), {
      target: { value: "1" },
    });
    const netWall = wallOnChange.mock.calls[wallOnChange.mock.calls.length - 1]?.[0] as number;
    expect(netWall).toBeLessThan(grossWall);
    unmount();

    const floorOnChange = vi.fn();
    render(
      <MemoryRouter>
        <BuildingTemplatePanel marketCode="GB" surface="floor" onChange={floorOnChange} />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText(/building type/i), {
      target: { value: "custom" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add custom room/i }));
    const floorBefore = floorOnChange.mock.calls[floorOnChange.mock.calls.length - 1]?.[0] as number;
    expect(floorBefore).toBe(9);
  });
});
