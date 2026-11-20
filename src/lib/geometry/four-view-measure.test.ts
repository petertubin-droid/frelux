import { describe, it, expect } from "vitest";
import { emptyFace, measureFace } from "./four-view-measure";

describe("measureFace", () => {
  /** The default handles: a wall spanning 76% of the photo's width, 65% of its height. */
  function face(overrides: Partial<ReturnType<typeof emptyFace>> = {}) {
    return { ...emptyFace(), image: "data:image/png;base64,AA", ...overrides };
  }

  it("turns one stated length into millimetres for the whole elevation", () => {
    const geometry = measureFace(face({ referenceMm: "12000" }));
    // The reference is the wall width, so the width is exactly the stated length.
    expect(geometry.widthMm).toBeCloseTo(12000, 6);
    // 650 rectified px against a 760 px width: 650 / 760 x 12000.
    expect(geometry.eaveHeightMm).toBeCloseTo((650 / 760) * 12000, 4);
    expect(geometry.ready).toBe(true);
  });

  it("scales from the eave height when that is the known length", () => {
    const geometry = measureFace(
      face({ referenceMm: "3000", referenceMode: "height" }),
    );
    expect(geometry.eaveHeightMm).toBeCloseTo(3000, 6);
    expect(geometry.widthMm).toBeCloseTo((760 / 650) * 3000, 4);
  });

  it("measures a ridge above the eave as a positive rise", () => {
    const geometry = measureFace(
      face({
        referenceMm: "12000",
        ridge: { x: 0.5, y: 0.05 },
      }),
    );
    expect(geometry.roofRiseMm).not.toBeNull();
    expect(geometry.roofRiseMm!).toBeGreaterThan(0);
  });

  it("measures each opening in millimetres and its offset along the wall", () => {
    const geometry = measureFace(
      face({
        referenceMm: "12000",
        openings: [
          {
            id: "o1",
            kind: "door",
            rect: { x: 0.2, y: 0.5, w: 0.1, h: 0.35 },
          },
        ],
      }),
    );
    expect(geometry.openings).toHaveLength(1);
    const door = geometry.openings[0];
    expect(door.kind).toBe("door");
    expect(door.widthMm).toBeCloseTo((100 / 760) * 12000, 3);
    expect(door.heightMm).toBeCloseTo((350 / 650) * (650 / 760) * 12000, 3);
    expect(door.offsetMm).toBeCloseTo((80 / 760) * 12000, 3);
    expect(door.areaMm2).toBeGreaterThan(0);
  });

  it("is not ready without a photograph or a stated length", () => {
    const noPhoto = measureFace(face({ image: null, referenceMm: "12000" }));
    expect(noPhoto.ready).toBe(false);
    expect(noPhoto.problems.join(" ")).toMatch(/No photograph loaded/);

    const noLength = measureFace(face({ referenceMm: "" }));
    expect(noLength.ready).toBe(false);
    expect(noLength.problems.join(" ")).toMatch(/known length in millimetres/);
  });

  it("refuses a degenerate quad instead of dividing by it", () => {
    const collapsed = face({
      referenceMm: "12000",
      quad: [
        { x: 0.5, y: 0.5 },
        { x: 0.5, y: 0.5 },
        { x: 0.5, y: 0.5 },
        { x: 0.5, y: 0.5 },
      ],
    });
    const geometry = measureFace(collapsed);
    expect(geometry.matrix).toBeNull();
    expect(geometry.ready).toBe(false);
  });
});
