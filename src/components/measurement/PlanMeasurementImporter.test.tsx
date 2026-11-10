import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ConstructionExtractionResult } from "@/lib/construction-extraction";

const extraction = { result: null as ConstructionExtractionResult | null, error: null as Error | null };

vi.mock("@/lib/construction-extraction", async () => {
  const actual = await vi.importActual<typeof import("@/lib/construction-extraction")>(
    "@/lib/construction-extraction",
  );
  return {
    ...actual,
    requestConstructionExtraction: vi.fn(async () => {
      if (extraction.error) throw extraction.error;
      return extraction.result;
    }),
  };
});

const setBuilding = vi.fn();
vi.mock("@/lib/measurement/building-size-context", () => ({
  useBuildingSize: () => ({ building: null, setBuilding, clear: vi.fn() }),
}));

import { PlanMeasurementImporter } from "./PlanMeasurementImporter";

const field = (key: string, value: number, unit: string, over: Record<string, unknown> = {}) => ({
  key,
  label: key,
  value,
  unit,
  confidence: 0.95,
  verification: "ai_detected" as const,
  source: "dimension_annotation" as const,
  ...over,
});

const fullPlan = (): ConstructionExtractionResult => ({
  documentKind: "architectural_plan",
  fields: [
    field("building_length", 18, "m"),
    field("building_width", 12, "m"),
    field("floor_to_floor_height", 3, "m"),
    field("number_of_floors", 1, "floors"),
    field("doors_count", 6, "count"),
    field("windows_count", 8, "count"),
    field("door_width", 0.9, "m"),
    field("door_height", 2.1, "m"),
    field("window_width", 1.2, "m"),
    field("window_height", 1.5, "m"),
  ],
  notes: [],
  warnings: [],
  processedAt: "2026-11-10T06:00:00.000Z",
});

const chooseFile = async (name = "plan.png") => {
  const input = screen.getByLabelText("Plan file") as HTMLInputElement;
  const file = new File(["x"], name, { type: "image/png" });
  fireEvent.change(input, { target: { files: [file] } });
  // The file is read asynchronously; reading before it lands would analyse an
  // empty document, which is not what these cases are testing.
  await screen.findByText(new RegExp(`${name} selected`));
};

describe("reading a plan into the measured building", () => {
  beforeEach(() => {
    extraction.result = fullPlan();
    extraction.error = null;
    setBuilding.mockClear();
  });

  it("shows the measurements it read, with the document unit as evidence", async () => {
    render(<PlanMeasurementImporter />);
    await chooseFile();
    fireEvent.click(screen.getByRole("button", { name: "Read measurements" }));

    expect(await screen.findByText("Building length")).toBeDefined();
    expect(screen.getByText(/18\.00 m/)).toBeDefined();
    expect(screen.getByText("Building width")).toBeDefined();
    expect(screen.getByText(/12\.00 m/)).toBeDefined();
  });

  it("fills the building only when the person asks it to", async () => {
    render(<PlanMeasurementImporter />);
    await chooseFile();
    fireEvent.click(screen.getByRole("button", { name: "Read measurements" }));
    await screen.findByText("Building length");

    expect(setBuilding).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Fill the measured building" }));

    expect(setBuilding).toHaveBeenCalledTimes(1);
    const building = setBuilding.mock.calls[0][0];
    expect(building.schedule.rooms).toHaveLength(1);
    // 2(18+12) x 3 = 180 gross, less 6 doors (11.34) and 8 windows (14.4).
    expect(building.totals.netWallAreaM2).toBeCloseTo(154.26, 6);
    expect(screen.getByRole("status").textContent).toMatch(/Net wall area 154\.26 m²/);
  });

  it("refuses a photograph and says why nothing was filled", async () => {
    extraction.result = { ...fullPlan(), documentKind: "building_photo" };
    render(<PlanMeasurementImporter />);
    await chooseFile("site.jpg");
    fireEvent.click(screen.getByRole("button", { name: "Read measurements" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/photograph cannot give dimensions/i);
    expect(screen.queryByRole("button", { name: "Fill the measured building" })).toBeNull();
  });

  it("holds the fill back until assumed values are checked", async () => {
    extraction.result = {
      ...fullPlan(),
      fields: fullPlan().fields.filter(
        (f) => !["door_width", "door_height", "number_of_floors"].includes(f.key),
      ),
    };
    render(<PlanMeasurementImporter />);
    await chooseFile();
    fireEvent.click(screen.getByRole("button", { name: "Read measurements" }));
    await screen.findByText("Building length");

    const fill = screen.getByRole("button", { name: "Fill the measured building" }) as HTMLButtonElement;
    expect(fill.disabled).toBe(true);

    fireEvent.click(screen.getByLabelText("I have checked these against the drawing."));
    expect(fill.disabled).toBe(false);

    fireEvent.click(fill);
    await waitFor(() => expect(setBuilding).toHaveBeenCalledTimes(1));
  });

  it("reports a service failure without filling anything", async () => {
    const { ConstructionExtractionError } = await import("@/lib/construction-extraction");
    extraction.error = new ConstructionExtractionError("Extraction unavailable right now.", "FUNCTION_UNAVAILABLE");
    render(<PlanMeasurementImporter />);
    await chooseFile();
    fireEvent.click(screen.getByRole("button", { name: "Read measurements" }));

    expect((await screen.findByRole("alert")).textContent).toMatch(/unavailable right now/i);
    expect(setBuilding).not.toHaveBeenCalled();
  });
});

describe("rooms reaching the measured building", () => {
  const room = (over: Record<string, unknown> = {}) => ({
    label: "Bedroom 1",
    lengthM: 4,
    widthM: 3.5,
    heightM: null,
    doors: 1,
    windows: 1,
    source: "dimension_annotation" as const,
    confidence: 0.92,
    ...over,
  });

  beforeEach(() => {
    extraction.result = {
      ...fullPlan(),
      rooms: [
        room({ label: "Kitchen", lengthM: 3.6, widthM: 2.8 }),
        room({ label: "Bedroom 1" }),
      ],
    };
    extraction.error = null;
    setBuilding.mockClear();
  });

  it("lists the rooms it read before anything is filled", async () => {
    render(<PlanMeasurementImporter />);
    await chooseFile();
    fireEvent.click(screen.getByRole("button", { name: "Read measurements" }));

    expect(await screen.findByText("Rooms on the drawing")).toBeDefined();
    expect(screen.getByText("Kitchen")).toBeDefined();
    expect(screen.getByText(/3\.60 by 2\.80 m/)).toBeDefined();
    expect(setBuilding).not.toHaveBeenCalled();
  });

  it("fills the rooms as separate spaces and says what the wall area counts", async () => {
    render(<PlanMeasurementImporter />);
    await chooseFile();
    fireEvent.click(screen.getByRole("button", { name: "Read measurements" }));
    await screen.findByText("Rooms on the drawing");

    fireEvent.click(screen.getByRole("button", { name: "Fill the measured rooms" }));

    const building = setBuilding.mock.calls[0][0];
    expect(building.schedule.rooms).toHaveLength(2);
    expect(building.drafts.map((d: { label: string }) => d.label)).toEqual(["Kitchen", "Bedroom 1"]);
    // 34.71 for the kitchen plus 41.31 for the bedroom, per floor at 3 m.
    expect(building.totals.netWallAreaM2).toBeCloseTo(76.02, 6);
    expect(screen.getByRole("status").textContent).toMatch(/2 rooms inside a 18\.00 m by 12\.00 m footprint/);
  });

  it("holds the fill until a room it refused has been acknowledged", async () => {
    extraction.result = {
      ...fullPlan(),
      rooms: [room(), room({ label: "Store", source: "visual_estimate", confidence: 0.6 })],
    };
    render(<PlanMeasurementImporter />);
    await chooseFile();
    fireEvent.click(screen.getByRole("button", { name: "Read measurements" }));
    await screen.findByText("Rooms on the drawing");

    const fill = screen.getByRole("button", { name: "Fill the measured rooms" }) as HTMLButtonElement;
    expect(fill.disabled).toBe(true);
    expect(screen.getByText(/1 room could not be read/)).toBeDefined();

    fireEvent.click(screen.getByLabelText("I have checked these against the drawing."));
    expect(fill.disabled).toBe(false);
    fireEvent.click(fill);

    // Only the readable room reaches the schedule.
    const building = setBuilding.mock.calls[0][0];
    expect(building.schedule.rooms).toHaveLength(1);
  });
});
