import { describe, it, expect } from "vitest";
import {
  calculateMeasurementEntry,
  calculateMeasurementGroup,
  calculateMeasurementSection,
  calculateMeasurementProject,
} from "./hierarchy";
import type {
  MeasurementEntry,
  MeasurementGroup,
  MeasurementSection,
  MeasurementProject,
} from "./types";

describe("measurement/hierarchy", () => {
  it("calculateMeasurementEntry computes wall area (2 × length × height)", () => {
    const entry: MeasurementEntry = {
      id: "e1",
      surfaceType: "wall",
      length: 5,
      height: 3,
      unit: "meters",
      quantity: 1,
    };
    const result = calculateMeasurementEntry(entry);
    expect(result.entryId).toBe("e1");
    // Wall = 2 × length × height = 2 × 5 × 3 = 30
    expect(result.areaM2).toBe(30);
    expect(result.totalAreaM2).toBe(30);
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it("calculateMeasurementEntry computes floor area (length × width)", () => {
    const entry: MeasurementEntry = {
      id: "e2",
      surfaceType: "floor",
      length: 4,
      width: 3,
      unit: "meters",
      quantity: 1,
    };
    const result = calculateMeasurementEntry(entry);
    expect(result.areaM2).toBe(12);
    expect(result.totalAreaM2).toBe(12);
  });

  it("calculateMeasurementEntry computes ceiling area (length × width)", () => {
    const entry: MeasurementEntry = {
      id: "e3",
      surfaceType: "ceiling",
      length: 4,
      width: 3,
      unit: "meters",
      quantity: 1,
    };
    const result = calculateMeasurementEntry(entry);
    expect(result.areaM2).toBe(12);
  });

  it("calculateMeasurementEntry handles quantity multiplier", () => {
    const entry: MeasurementEntry = {
      id: "e4",
      surfaceType: "wall",
      length: 5,
      height: 3,
      unit: "meters",
      quantity: 3,
    };
    const result = calculateMeasurementEntry(entry);
    // areaM2 = 2×5×3 = 30, totalAreaM2 = 30 × 3 = 90
    expect(result.areaM2).toBe(30);
    expect(result.totalAreaM2).toBe(90);
  });

  it("calculateMeasurementEntry converts feet to meters", () => {
    const entry: MeasurementEntry = {
      id: "e5",
      surfaceType: "wall",
      length: 10, // 10 feet = 3.048m
      height: 10, // 10 feet = 3.048m
      unit: "feet",
      quantity: 1,
    };
    const result = calculateMeasurementEntry(entry);
    // 2 × 3.048 × 3.048 = 18.58
    expect(result.areaM2).toBeCloseTo(18.581, 1);
  });

  it("calculateMeasurementEntry computes exterior surface", () => {
    const entry: MeasurementEntry = {
      id: "e6",
      surfaceType: "exterior",
      length: 10,
      height: 3,
      unit: "meters",
      quantity: 1,
    };
    const result = calculateMeasurementEntry(entry);
    expect(result.areaM2).toBe(30);
  });

  it("calculateMeasurementEntry computes fence partition area", () => {
    const entry: MeasurementEntry = {
      id: "e7",
      surfaceType: "fence",
      length: 10,
      height: 2,
      unit: "meters",
      quantity: 1,
      partitionCount: 3,
    };
    const result = calculateMeasurementEntry(entry);
    expect(result.areaM2).toBe(60);
  });

  it("calculateMeasurementEntry defaults quantity to 1", () => {
    const entry: MeasurementEntry = {
      id: "e8",
      surfaceType: "floor",
      length: 4,
      width: 3,
      unit: "meters",
      quantity: 0, // should be treated as 1
    } as unknown as never;
    const result = calculateMeasurementEntry(entry);
    expect(result.totalAreaM2).toBe(12);
  });

  it("calculateMeasurementGroup uses entry.totalAreaM2", () => {
    const group: MeasurementGroup = {
      id: "g1",
      label: "Test Group",
      entry: {
        id: "e1",
        surfaceType: "wall",
        length: 5,
        height: 3,
        unit: "meters",
        quantity: 2,
      },
    };
    const result = calculateMeasurementGroup(group);
    expect(result.groupId).toBe("g1");
    expect(result.totalAreaM2).toBe(60); // 30 × 2
    expect(result.entryResult).toBeTruthy();
  });

  it("calculateMeasurementSection sums groups", () => {
    const section: MeasurementSection = {
      id: "s1",
      label: "Section 1",
      groups: [
        {
          id: "g1",
          label: "G1",
          entry: {
            id: "e1",
            surfaceType: "wall",
            length: 5,
            height: 3,
            unit: "meters",
            quantity: 1,
          },
        },
        {
          id: "g2",
          label: "G2",
          entry: {
            id: "e2",
            surfaceType: "floor",
            length: 4,
            width: 3,
            unit: "meters",
            quantity: 1,
          },
        },
      ],
    };
    const result = calculateMeasurementSection(section);
    expect(result.sectionId).toBe("s1");
    expect(result.totalAreaM2).toBe(42); // 30 + 12
    expect(result.groupResults.length).toBe(2);
  });

  it("calculateMeasurementProject sums sections", () => {
    const project: MeasurementProject = {
      id: "p1",
      calculatorContext: "painting" as unknown as never,
      projectMode: "single" as unknown as never,
      sections: [
        {
          id: "s1",
          label: "S1",
          groups: [
            {
              id: "g1",
              label: "G1",
              entry: {
                id: "e1",
                surfaceType: "wall",
                length: 5,
                height: 3,
                unit: "meters",
                quantity: 1,
              },
            },
          ],
        },
      ],
      preferredUnit: "meters",
    } as unknown as never;
    const result = calculateMeasurementProject(project);
    expect(result.projectId).toBe("p1");
    expect(result.totalAreaM2).toBe(30);
    expect(result.sectionResults.length).toBe(1);
  });

  it("calculateMeasurementProject handles empty sections", () => {
    const project: MeasurementProject = {
      id: "p2",
      calculatorContext: "painting" as unknown as never,
      projectMode: "single" as unknown as never,
      sections: [],
      preferredUnit: "meters",
    } as unknown as never;
    const result = calculateMeasurementProject(project);
    expect(result.totalAreaM2).toBe(0);
  });
});
