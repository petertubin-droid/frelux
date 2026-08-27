/**
 * Tests for the Space Engine (Feature 2 — Space Engine)
 *
 * Tests:
 * - Space creation and defaults
 * - Space calculation (area, openings, ceiling, waste, quantity)
 * - Repeated spaces (quantity multiplication)
 * - Different spaces remain independent
 * - Space grouping by type
 * - Space collection calculation and aggregation
 * - Bridge to existing measurement system
 * - Finish type filtering
 * - Space summary
 */

import { describe, it, expect } from "vitest";
import {
  createSpace,
  createOpening,
  createSpaceCollection,
  calculateSpace,
  calculateSpaceCollection,
  groupSpacesByType,
  spaceToMeasurementEntry,
  spaceCollectionToMeasurementProject,
  totalAreaByFinishType,
  spaceSummary,
  FINISH_TYPE_LABELS,
} from "../space-engine";
import type { Space } from "../space-engine";

describe("Space Creation", () => {
  it("creates a space with defaults", () => {
    const space = createSpace();
    expect(space.id).toBeDefined();
    expect(space.name).toBe("New Space");
    expect(space.type).toBe("other");
    expect(space.quantity).toBe(1);
    expect(space.includeCeiling).toBe(false);
    expect(space.surfaceType).toBe("wall");
    expect(space.finishType).toBe("none");
    expect(space.openings).toEqual([]);
  });

  it("creates a space with custom values", () => {
    const space = createSpace({
      name: "Master Bedroom",
      type: "bedroom",
      length: 12,
      width: 12,
      height: 10,
      unit: "feet",
      quantity: 1,
      finishType: "paint",
      surfaceType: "wall",
    });
    expect(space.name).toBe("Master Bedroom");
    expect(space.type).toBe("bedroom");
    expect(space.length).toBe(12);
    expect(space.width).toBe(12);
    expect(space.height).toBe(10);
    expect(space.unit).toBe("feet");
    expect(space.finishType).toBe("paint");
  });

  it("creates an opening with defaults", () => {
    const opening = createOpening();
    expect(opening.type).toBe("door");
    expect(opening.width).toBe(3);
    expect(opening.height).toBe(7);
    expect(opening.unit).toBe("feet");
    expect(opening.count).toBe(1);
  });
});

describe("Space Calculation — Single Room", () => {
  it("calculates wall area for a 12×12×10 ft room", () => {
    const space = createSpace({
      name: "Bedroom",
      type: "bedroom",
      length: 12,
      width: 12,
      height: 10,
      unit: "feet",
      surfaceType: "wall",
    });
    const result = calculateSpace(space);

    // Perimeter = 2 * (12 + 12) = 48 ft = 14.6304 m
    // Wall area = 48 * 10 = 480 ft² = 44.5934... m²
    expect(result.areaM2).toBeCloseTo(44.5934, 2);
    expect(result.totalAreaM2).toBeCloseTo(44.5934, 2);
    expect(result.quantity).toBe(1);
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it("calculates floor area", () => {
    const space = createSpace({
      name: "Living Room",
      type: "parlour",
      length: 15,
      width: 20,
      unit: "feet",
      surfaceType: "floor",
    });
    const result = calculateSpace(space);

    // 15 * 20 = 300 ft² = 27.8709... m²
    expect(result.areaM2).toBeCloseTo(27.8709, 2);
  });

  it("calculates ceiling area", () => {
    const space = createSpace({
      name: "Kitchen",
      type: "kitchen",
      length: 10,
      width: 12,
      unit: "feet",
      surfaceType: "ceiling",
    });
    const result = calculateSpace(space);

    // 10 * 12 = 120 ft² = 11.148... m²
    expect(result.areaM2).toBeCloseTo(11.1484, 2);
  });
});

describe("Repeated Spaces (Quantity)", () => {
  it("multiplies area by quantity", () => {
    const space = createSpace({
      name: "Bedroom",
      type: "bedroom",
      length: 12,
      width: 12,
      height: 10,
      unit: "feet",
      quantity: 2,
      surfaceType: "wall",
    });
    const result = calculateSpace(space);

    // One room ≈ 44.5934 m², two rooms ≈ 89.1868 m²
    expect(result.areaM2).toBeCloseTo(44.5934, 2);
    expect(result.totalAreaM2).toBeCloseTo(89.1868, 2);
    expect(result.quantity).toBe(2);
  });

  it("quantity=1 does not multiply", () => {
    const space = createSpace({
      name: "Bathroom",
      type: "bathroom",
      length: 6,
      width: 8,
      height: 8,
      unit: "feet",
      quantity: 1,
      surfaceType: "wall",
    });
    const result = calculateSpace(space);
    expect(result.areaM2).toBe(result.totalAreaM2);
  });
});

describe("Different Spaces Remain Independent", () => {
  it("bedroom and kitchen have different areas", () => {
    const bedroom = calculateSpace(
      createSpace({
        name: "Bedroom",
        type: "bedroom",
        length: 12,
        width: 12,
        height: 10,
        unit: "feet",
        surfaceType: "wall",
      }),
    );
    const kitchen = calculateSpace(
      createSpace({
        name: "Kitchen",
        type: "kitchen",
        length: 10,
        width: 12,
        height: 10,
        unit: "feet",
        surfaceType: "wall",
      }),
    );

    expect(bedroom.areaM2).not.toBeCloseTo(kitchen.areaM2, 1);
    expect(bedroom.name).toBe("Bedroom");
    expect(kitchen.name).toBe("Kitchen");
    expect(bedroom.type).toBe("bedroom");
    expect(kitchen.type).toBe("kitchen");
  });

  it("bathroom with 2 quantity is separate from bedroom with 2 quantity", () => {
    const bathroom = calculateSpace(
      createSpace({
        name: "Bathroom",
        type: "bathroom",
        length: 6,
        width: 8,
        height: 8,
        unit: "feet",
        quantity: 2,
        surfaceType: "wall",
      }),
    );
    const bedroom = calculateSpace(
      createSpace({
        name: "Bedroom",
        type: "bedroom",
        length: 12,
        width: 12,
        height: 10,
        unit: "feet",
        quantity: 2,
        surfaceType: "wall",
      }),
    );

    expect(bathroom.totalAreaM2).not.toBeCloseTo(bedroom.totalAreaM2, 0);
  });
});

describe("Openings (Doors and Windows)", () => {
  it("deducts a door from wall area", () => {
    const spaceNoOpening = createSpace({
      name: "Room",
      type: "bedroom",
      length: 12,
      width: 12,
      height: 10,
      unit: "feet",
      surfaceType: "wall",
    });
    const spaceWithDoor = createSpace({
      ...spaceNoOpening,
      openings: [
        createOpening({
          type: "door",
          width: 3,
          height: 7,
          count: 1,
          unit: "feet",
        }),
      ],
    });

    const noOpening = calculateSpace(spaceNoOpening);
    const withDoor = calculateSpace(spaceWithDoor);

    expect(withDoor.areaM2).toBeLessThan(noOpening.areaM2);
    // Door area = 3 * 7 = 21 ft² ≈ 1.951 m²
    const doorArea = noOpening.areaM2 - withDoor.areaM2;
    expect(doorArea).toBeCloseTo(1.95096, 2);
  });

  it("deducts multiple openings", () => {
    const space = createSpace({
      name: "Room",
      type: "bedroom",
      length: 12,
      width: 12,
      height: 10,
      unit: "feet",
      surfaceType: "wall",
      openings: [
        createOpening({
          type: "door",
          width: 3,
          height: 7,
          count: 1,
          unit: "feet",
        }),
        createOpening({
          type: "window",
          width: 4,
          height: 4,
          count: 2,
          unit: "feet",
        }),
      ],
    });
    const result = calculateSpace(space);
    // Door: 3*7=21 ft², Windows: 4*4*2=32 ft², Total deductions: 53 ft² ≈ 4.923 m²
    const noOpeningResult = calculateSpace({ ...space, openings: [] });
    const deductions = noOpeningResult.areaM2 - result.areaM2;
    expect(deductions).toBeCloseTo(4.9233, 1);
  });
});

describe("Ceiling Inclusion", () => {
  it("adds ceiling area when includeCeiling is true", () => {
    const withoutCeiling = calculateSpace(
      createSpace({
        name: "Room",
        type: "bedroom",
        length: 12,
        width: 12,
        height: 10,
        unit: "feet",
        surfaceType: "wall",
        includeCeiling: false,
      }),
    );
    const withCeiling = calculateSpace(
      createSpace({
        name: "Room",
        type: "bedroom",
        length: 12,
        width: 12,
        height: 10,
        unit: "feet",
        surfaceType: "wall",
        includeCeiling: true,
      }),
    );

    // Ceiling area = 12 * 12 = 144 ft² ≈ 13.378 m²
    expect(withCeiling.areaM2).toBeGreaterThan(withoutCeiling.areaM2);
    const ceilingArea = withCeiling.areaM2 - withoutCeiling.areaM2;
    expect(ceilingArea).toBeCloseTo(13.378, 1);
  });
});

describe("Space Grouping", () => {
  it("groups spaces by type", () => {
    const spaces: Space[] = [
      createSpace({
        name: "Bedroom 1",
        type: "bedroom",
        length: 12,
        width: 12,
        height: 10,
        unit: "feet",
        surfaceType: "wall",
      }),
      createSpace({
        name: "Bedroom 2",
        type: "bedroom",
        length: 10,
        width: 10,
        height: 10,
        unit: "feet",
        surfaceType: "wall",
      }),
      createSpace({
        name: "Kitchen",
        type: "kitchen",
        length: 10,
        width: 12,
        height: 10,
        unit: "feet",
        surfaceType: "wall",
      }),
      createSpace({
        name: "Bathroom",
        type: "bathroom",
        length: 6,
        width: 8,
        height: 8,
        unit: "feet",
        surfaceType: "wall",
      }),
    ];
    const groups = groupSpacesByType(spaces);

    expect(groups.length).toBe(3); // bedroom, kitchen, bathroom

    const bedroomGroup = groups.find((g) => g.label === "Bedroom");
    expect(bedroomGroup).toBeDefined();
    expect(bedroomGroup!.spaces.length).toBe(2);

    const kitchenGroup = groups.find((g) => g.label === "Kitchen");
    expect(kitchenGroup).toBeDefined();
    expect(kitchenGroup!.spaces.length).toBe(1);
  });
});

describe("Space Collection", () => {
  it("calculates total area for a collection of spaces", () => {
    const collection = createSpaceCollection("3-Bedroom House", "feet", [
      createSpace({
        name: "Master Bedroom",
        type: "bedroom",
        length: 12,
        width: 12,
        height: 10,
        unit: "feet",
        surfaceType: "wall",
        quantity: 1,
      }),
      createSpace({
        name: "Other Bedrooms",
        type: "bedroom",
        length: 10,
        width: 10,
        height: 10,
        unit: "feet",
        surfaceType: "wall",
        quantity: 2,
      }),
      createSpace({
        name: "Kitchen",
        type: "kitchen",
        length: 10,
        width: 12,
        height: 10,
        unit: "feet",
        surfaceType: "wall",
        quantity: 1,
      }),
      createSpace({
        name: "Bathrooms",
        type: "bathroom",
        length: 6,
        width: 8,
        height: 8,
        unit: "feet",
        surfaceType: "wall",
        quantity: 2,
      }),
      createSpace({
        name: "Corridor",
        type: "corridor",
        length: 20,
        width: 4,
        height: 10,
        unit: "feet",
        surfaceType: "wall",
        quantity: 1,
      }),
    ]);

    const result = calculateSpaceCollection(collection);

    expect(result.totalAreaM2).toBeGreaterThan(0);
    expect(result.spaceResults.length).toBe(5);
    expect(result.groupResults.length).toBe(4); // bedroom, kitchen, bathroom, corridor
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it("handles empty collection", () => {
    const collection = createSpaceCollection("Empty", "feet", []);
    const result = calculateSpaceCollection(collection);
    expect(result.totalAreaM2).toBe(0);
    expect(result.spaceResults.length).toBe(0);
  });

  it("groups correctly: 2 identical bedrooms + 1 different bedroom", () => {
    const collection = createSpaceCollection("Test House", "feet", [
      createSpace({
        name: "Bedroom A",
        type: "bedroom",
        length: 12,
        width: 12,
        height: 10,
        unit: "feet",
        surfaceType: "wall",
        quantity: 2,
      }),
      createSpace({
        name: "Bedroom B",
        type: "bedroom",
        length: 14,
        width: 14,
        height: 10,
        unit: "feet",
        surfaceType: "wall",
        quantity: 1,
      }),
    ]);

    const result = calculateSpaceCollection(collection);
    const bedroomGroup = result.groupResults.find((g) => g.label === "Bedroom");
    expect(bedroomGroup).toBeDefined();
    expect(bedroomGroup!.spaceResults.length).toBe(2);

    // Bedroom A (×2) should have double the area of one room
    const bedroomA = bedroomGroup!.spaceResults.find(
      (r) => r.name === "Bedroom A",
    )!;
    expect(bedroomA.quantity).toBe(2);
    expect(bedroomA.totalAreaM2).toBeCloseTo(bedroomA.areaM2 * 2, 4);

    // Bedroom B (×1) should be different
    const bedroomB = bedroomGroup!.spaceResults.find(
      (r) => r.name === "Bedroom B",
    )!;
    expect(bedroomB.quantity).toBe(1);
    expect(bedroomB.totalAreaM2).toBe(bedroomB.areaM2);
  });
});

describe("Bridge to Existing Measurement System", () => {
  it("converts a space to a measurement entry", () => {
    const space = createSpace({
      name: "Test Room",
      type: "bedroom",
      length: 12,
      width: 12,
      height: 10,
      unit: "feet",
      quantity: 2,
      surfaceType: "wall",
      finishType: "paint",
      openings: [
        createOpening({ type: "door", width: 3, height: 7, count: 1 }),
      ],
    });

    const entry = spaceToMeasurementEntry(space);
    expect(entry.length).toBe(12);
    expect(entry.width).toBe(12);
    expect(entry.height).toBe(10);
    expect(entry.unit).toBe("feet");
    expect(entry.quantity).toBe(2);
    expect(entry.spaceType).toBe("bedroom");
    expect(entry.surfaceType).toBe("wall");
    expect(entry.doors).toBe(1);
    expect(entry.description).toBe("Test Room");
  });

  it("converts a space collection to a measurement project", () => {
    const collection = createSpaceCollection("Test", "feet", [
      createSpace({
        name: "Room 1",
        type: "bedroom",
        length: 12,
        width: 12,
        height: 10,
        unit: "feet",
        surfaceType: "wall",
      }),
      createSpace({
        name: "Room 2",
        type: "kitchen",
        length: 10,
        width: 12,
        height: 10,
        unit: "feet",
        surfaceType: "wall",
      }),
    ]);

    const project = spaceCollectionToMeasurementProject(collection, "painting");
    expect(project.calculatorContext).toBe("painting");
    expect(project.projectMode).toBe("house_building");
    expect(project.sections.length).toBe(2); // bedroom + kitchen
    expect(project.preferredUnit).toBe("feet");
  });
});

describe("Finish Type Filtering", () => {
  it("filters spaces by finish type", () => {
    const results: {
      finishType: "paint" | "screeding";
      totalAreaM2: number;
    }[] = [
      { finishType: "paint", totalAreaM2: 50 },
      { finishType: "screeding", totalAreaM2: 30 },
      { finishType: "paint", totalAreaM2: 20 },
    ];

    const paintArea = totalAreaByFinishType(results, "paint");
    expect(paintArea).toBe(70);

    const screedingArea = totalAreaByFinishType(results, "screeding");
    expect(screedingArea).toBe(30);
  });
});

describe("Space Summary", () => {
  it("generates a summary by type", () => {
    const collection = createSpaceCollection("Test", "feet", [
      createSpace({
        name: "Bedroom 1",
        type: "bedroom",
        length: 12,
        width: 12,
        height: 10,
        unit: "feet",
        surfaceType: "wall",
        quantity: 1,
      }),
      createSpace({
        name: "Bedroom 2",
        type: "bedroom",
        length: 10,
        width: 10,
        height: 10,
        unit: "feet",
        surfaceType: "wall",
        quantity: 2,
      }),
      createSpace({
        name: "Kitchen",
        type: "kitchen",
        length: 10,
        width: 12,
        height: 10,
        unit: "feet",
        surfaceType: "wall",
        quantity: 1,
      }),
    ]);

    const result = calculateSpaceCollection(collection);
    const summary = spaceSummary(result.spaceResults);

    expect(summary.length).toBe(2); // bedroom + kitchen
    const bedroomSummary = summary.find((s) => s.type === "bedroom");
    expect(bedroomSummary).toBeDefined();
    expect(bedroomSummary!.count).toBe(2);
    expect(bedroomSummary!.label).toBe("Bedroom");
  });
});

describe("Waste Margin", () => {
  it("applies waste margin to space area", () => {
    const noWaste = calculateSpace(
      createSpace({
        name: "Room",
        type: "bedroom",
        length: 12,
        width: 12,
        height: 10,
        unit: "feet",
        surfaceType: "wall",
        wasteMarginPercent: 0,
      }),
    );
    const withWaste = calculateSpace(
      createSpace({
        name: "Room",
        type: "bedroom",
        length: 12,
        width: 12,
        height: 10,
        unit: "feet",
        surfaceType: "wall",
        wasteMarginPercent: 10,
      }),
    );

    expect(withWaste.areaM2).toBeGreaterThan(noWaste.areaM2);
    // 10% increase
    expect(withWaste.areaM2 / noWaste.areaM2).toBeCloseTo(1.1, 4);
  });
});

describe("Metres Input", () => {
  it("handles metre inputs correctly", () => {
    const space = createSpace({
      name: "Room",
      type: "bedroom",
      length: 4,
      width: 4,
      height: 3,
      unit: "meters",
      surfaceType: "wall",
    });
    const result = calculateSpace(space);

    // Perimeter = 2 * (4 + 4) = 16 m, area = 16 * 3 = 48 m²
    expect(result.areaM2).toBeCloseTo(48, 4);
    expect(result.normalizedLengthM).toBe(4);
  });
});

describe("Finish Type Labels", () => {
  it("has labels for all finish types", () => {
    expect(FINISH_TYPE_LABELS.paint).toBe("Paint");
    expect(FINISH_TYPE_LABELS.screeding).toBe("Screeding");
    expect(FINISH_TYPE_LABELS.tiling).toBe("Tiling");
    expect(FINISH_TYPE_LABELS.grafitex).toBe("Grafitex");
    expect(FINISH_TYPE_LABELS.pop).toBe("POP (Plaster of Paris)");
    expect(FINISH_TYPE_LABELS.tyrolene).toBe("Tyrolene");
    expect(FINISH_TYPE_LABELS.block).toBe("Block Work");
    expect(FINISH_TYPE_LABELS.none).toBe("No Finish");
    expect(FINISH_TYPE_LABELS.custom).toBe("Custom Finish");
  });
});
