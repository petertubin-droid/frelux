import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import {
  BUILDING_SIZE_STORAGE_KEY,
  BuildingSizeProvider,
  parseStoredBuilding,
  useBuildingSize,
} from "./building-size-context";
import { draftsToSchedule, scheduleTotals } from "./building-schedule";
import type { RoomDraft } from "./building-presets";

const drafts: RoomDraft[] = [
  {
    id: "r1",
    spaceType: "bedroom",
    label: "Bedroom",
    length: 4,
    width: 3.5,
    height: 2.7,
    quantity: 1,
    doors: 1,
    windows: 1,
  },
];

function applied(label = "Test house") {
  const schedule = draftsToSchedule(drafts, "meters", { label });
  return {
    schedule,
    totals: scheduleTotals(schedule),
    label,
    unit: "meters" as const,
    drafts,
  };
}

function Probe() {
  const { building, setBuilding, clear } = useBuildingSize();
  return (
    <div>
      <span data-testid="label">{building?.label ?? "none"}</span>
      <span data-testid="walls">{building?.totals.netWallAreaM2 ?? 0}</span>
      <button type="button" onClick={() => setBuilding(applied())}>
        set
      </button>
      <button type="button" onClick={clear}>
        clear
      </button>
    </div>
  );
}

describe("shared building size", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("holds the building in memory and persists it", () => {
    render(
      <BuildingSizeProvider>
        <Probe />
      </BuildingSizeProvider>,
    );
    expect(screen.getByTestId("label").textContent).toBe("none");
    act(() => screen.getByText("set").click());
    expect(screen.getByTestId("label").textContent).toBe("Test house");
    const stored = window.localStorage.getItem(BUILDING_SIZE_STORAGE_KEY);
    expect(parseStoredBuilding(stored)?.label).toBe("Test house");
  });

  it("reopens the last building after a reload", () => {
    window.localStorage.setItem(
      BUILDING_SIZE_STORAGE_KEY,
      JSON.stringify(applied("Saved house")),
    );
    render(
      <BuildingSizeProvider>
        <Probe />
      </BuildingSizeProvider>,
    );
    expect(screen.getByTestId("label").textContent).toBe("Saved house");
    expect(Number(screen.getByTestId("walls").textContent)).toBeGreaterThan(0);
  });

  it("clears the stored building", () => {
    render(
      <BuildingSizeProvider>
        <Probe />
      </BuildingSizeProvider>,
    );
    act(() => screen.getByText("set").click());
    act(() => screen.getByText("clear").click());
    expect(screen.getByTestId("label").textContent).toBe("none");
    expect(window.localStorage.getItem(BUILDING_SIZE_STORAGE_KEY)).toBeNull();
  });

  it("discards a corrupted stored value instead of trusting it", () => {
    expect(parseStoredBuilding("{not json")).toBeNull();
    expect(parseStoredBuilding(JSON.stringify({ label: "x" }))).toBeNull();
    const broken = applied();
    expect(
      parseStoredBuilding(
        JSON.stringify({ ...broken, totals: { ...broken.totals, netWallAreaM2: "wide" } }),
      ),
    ).toBeNull();
  });

  it("works inertly without a provider", () => {
    render(<Probe />);
    act(() => screen.getByText("set").click());
    expect(screen.getByTestId("label").textContent).toBe("none");
  });
});
