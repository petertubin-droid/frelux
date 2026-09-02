import { describe, it, expect } from "vitest";
import { SPACE_TYPE_LABELS, DEFAULT_SPACE_TYPES, SURFACE_TYPE_LABELS } from "@/lib/measurement/types";

describe("measurement types", () => {
  it("SPACE_TYPE_LABELS has labels for all space types", () => {
    expect(SPACE_TYPE_LABELS.bedroom).toBe("Bedroom");
    expect(SPACE_TYPE_LABELS.kitchen).toBe("Kitchen");
    expect(SPACE_TYPE_LABELS.bathroom).toBe("Bathroom");
  });

  it("DEFAULT_SPACE_TYPES includes bedroom", () => {
    expect(DEFAULT_SPACE_TYPES).toContain("bedroom");
    expect(DEFAULT_SPACE_TYPES.length).toBeGreaterThan(0);
  });

  it("SURFACE_TYPE_LABELS has labels for all surface types", () => {
    expect(SURFACE_TYPE_LABELS.wall).toBe("Wall");
    expect(SURFACE_TYPE_LABELS.ceiling).toBeTruthy();
    expect(SURFACE_TYPE_LABELS.floor).toBeTruthy();
    expect(SURFACE_TYPE_LABELS.exterior).toBeTruthy();
    expect(SURFACE_TYPE_LABELS.fence).toBeTruthy();
  });
});
