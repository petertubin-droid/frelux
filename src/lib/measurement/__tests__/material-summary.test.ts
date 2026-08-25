/**
 * Tests for the Project Material Summary (Feature 10)
 */

import { describe, it, expect } from "vitest";
import {
  createMaterialLineItem,
  groupByCategory,
  buildMaterialSummary,
  requirementsFromProject,
  summaryFromProject,
  materialSummaryToText,
} from "../material-summary";
import { createMaterialSpec, type MaterialSpec } from "../material-engine";
import {
  createConstructionProject,
  createProjectElement,
  calculateConstructionProject,
} from "../project-engine";
import { createSpace, type FinishType } from "../space-engine";

describe("Material Line Item", () => {
  it("creates a line item from a requirement", () => {
    const paint = createMaterialSpec({
      productName: "Premium Emulsion",
      brand: "Dulux",
      category: "paint",
      quantityUnit: "buckets",
      coverage: { type: "area", value: 35, coats: 2, unit: "m2" },
      application: "paint",
      isApproved: true,
    });

    const line = createMaterialLineItem({
      material: paint,
      areaM2: 100,
      coats: 2,
      wastePercent: 5,
      source: "Master Bedroom",
      finishType: "paint",
    });

    expect(line.materialName).toBe("Premium Emulsion");
    expect(line.brand).toBe("Dulux");
    expect(line.category).toBe("paint");
    expect(line.purchaseQuantity).toBe(3); // 100/35*1.05 ≈ 3
    expect(line.alreadyHaveQuantity).toBe(0);
    expect(line.buyQuantity).toBe(3);
  });

  it("subtracts already-have from purchase quantity", () => {
    const paint = createMaterialSpec({
      productName: "Test",
      quantityUnit: "buckets",
      coverage: { type: "area", value: 50, unit: "m2" },
    });

    const line = createMaterialLineItem(
      {
        material: paint,
        areaM2: 100,
        coats: 1,
        wastePercent: 0,
        source: "Room",
        finishType: "paint",
      },
      1,
    ); // already have 1 bucket

    // 100/50 = 2 buckets needed, have 1, buy 1
    expect(line.purchaseQuantity).toBe(2);
    expect(line.alreadyHaveQuantity).toBe(1);
    expect(line.buyQuantity).toBe(1);
  });

  it("buy quantity is never negative", () => {
    const paint = createMaterialSpec({
      productName: "Test",
      quantityUnit: "buckets",
      coverage: { type: "area", value: 100, unit: "m2" },
    });

    const line = createMaterialLineItem(
      {
        material: paint,
        areaM2: 50,
        coats: 1,
        wastePercent: 0,
        source: "Room",
        finishType: "paint",
      },
      5,
    ); // already have 5 but only need 1

    expect(line.purchaseQuantity).toBe(1);
    expect(line.buyQuantity).toBe(0); // max(0, 1-5)
  });
});

describe("Category Grouping", () => {
  it("groups line items by category", () => {
    const paint = createMaterialSpec({
      productName: "Paint",
      category: "paint",
      quantityUnit: "buckets",
      coverage: { type: "area", value: 50, unit: "m2" },
    });
    const cement = createMaterialSpec({
      productName: "Cement",
      category: "cement",
      quantityUnit: "bags",
      coverage: { type: "area", value: 10, unit: "m2" },
    });
    const paint2 = createMaterialSpec({
      productName: "Primer",
      category: "paint",
      quantityUnit: "buckets",
      coverage: { type: "area", value: 40, unit: "m2" },
    });

    const lines = [
      createMaterialLineItem({
        material: paint,
        areaM2: 100,
        coats: 1,
        wastePercent: 0,
        source: "A",
        finishType: "paint",
      }),
      createMaterialLineItem({
        material: cement,
        areaM2: 50,
        coats: 1,
        wastePercent: 0,
        source: "B",
        finishType: "screeding",
      }),
      createMaterialLineItem({
        material: paint2,
        areaM2: 80,
        coats: 1,
        wastePercent: 0,
        source: "C",
        finishType: "paint",
      }),
    ];

    const subtotals = groupByCategory(lines);
    expect(subtotals.length).toBe(2);

    const paintSubtotal = subtotals.find((s) => s.category === "paint");
    expect(paintSubtotal).toBeDefined();
    expect(paintSubtotal!.lines.length).toBe(2);

    const cementSubtotal = subtotals.find((s) => s.category === "cement");
    expect(cementSubtotal).toBeDefined();
    expect(cementSubtotal!.lines.length).toBe(1);
  });

  it("calculates subtotals correctly", () => {
    const paint = createMaterialSpec({
      productName: "A",
      category: "paint",
      quantityUnit: "buckets",
      coverage: { type: "area", value: 50, unit: "m2" },
    });
    const lines = [
      createMaterialLineItem({
        material: paint,
        areaM2: 50,
        coats: 1,
        wastePercent: 0,
        source: "A",
        finishType: "paint",
      }),
      createMaterialLineItem({
        material: paint,
        areaM2: 100,
        coats: 1,
        wastePercent: 0,
        source: "B",
        finishType: "paint",
      }),
    ];

    const subtotals = groupByCategory(lines);
    expect(subtotals[0].totalPurchaseQuantity).toBe(3); // 1 + 2
    expect(subtotals[0].totalAreaM2).toBe(150);
  });
});

describe("Build Material Summary", () => {
  it("builds a summary from requirements", () => {
    const paint = createMaterialSpec({
      productName: "Paint",
      category: "paint",
      quantityUnit: "buckets",
      coverage: { type: "area", value: 35, coats: 2, unit: "m2" },
      isApproved: true,
    });
    const tiles = createMaterialSpec({
      productName: "Tiles",
      category: "tiles",
      quantityUnit: "cartons",
      coverage: { type: "area", value: 1.44, unit: "m2" },
      isApproved: true,
    });

    const summary = buildMaterialSummary("Test Project", [
      {
        material: paint,
        areaM2: 100,
        coats: 2,
        wastePercent: 5,
        source: "Bedroom",
        finishType: "paint",
      },
      {
        material: tiles,
        areaM2: 30,
        coats: 1,
        wastePercent: 10,
        source: "Kitchen",
        finishType: "tiling",
      },
    ]);

    expect(summary.projectName).toBe("Test Project");
    expect(summary.lineItems.length).toBe(2);
    expect(summary.categorySubtotals.length).toBe(2);
    expect(summary.totalLines).toBe(2);
  });

  it("applies already-have quantities", () => {
    const paint = createMaterialSpec({
      productName: "Paint",
      category: "paint",
      quantityUnit: "buckets",
      coverage: { type: "area", value: 50, unit: "m2" },
    });
    const alreadyHave = new Map([[paint.id, 1]]);

    const summary = buildMaterialSummary(
      "Test",
      [
        {
          material: paint,
          areaM2: 100,
          coats: 1,
          wastePercent: 0,
          source: "Room",
          finishType: "paint",
        },
      ],
      alreadyHave,
    );

    expect(summary.lineItems[0].alreadyHaveQuantity).toBe(1);
    expect(summary.lineItems[0].buyQuantity).toBe(1); // need 2, have 1
  });
});

describe("Summary from Project", () => {
  it("builds summary from a project result", () => {
    const project = createConstructionProject("Test House", "feet");
    project.elements = [
      createProjectElement("Walls", "interior", "painting", [
        createSpace({
          name: "Bedroom",
          type: "bedroom",
          length: 12,
          width: 12,
          height: 10,
          unit: "feet",
          surfaceType: "wall",
          finishType: "paint",
        }),
      ]),
      createProjectElement("Floors", "interior", "tiling", [
        createSpace({
          name: "Kitchen",
          type: "kitchen",
          length: 10,
          width: 12,
          unit: "feet",
          surfaceType: "floor",
          finishType: "tiling",
        }),
      ]),
    ];
    const result = calculateConstructionProject(project);

    const paint = createMaterialSpec({
      productName: "Paint",
      category: "paint",
      quantityUnit: "buckets",
      coverage: { type: "area", value: 50, unit: "m2" },
    });
    const tiles = createMaterialSpec({
      productName: "Tiles",
      category: "tiles",
      quantityUnit: "cartons",
      coverage: { type: "area", value: 1.44, unit: "m2" },
    });

    const materialMap = new Map<string, MaterialSpec>([
      ["paint", paint],
      ["tiling", tiles],
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const summary = summaryFromProject(
      result,
      materialMap as Map<any, MaterialSpec>,
      10,
    );
    expect(summary.projectName).toBe("Test House");
    expect(summary.lineItems.length).toBe(2);
    expect(summary.categorySubtotals.length).toBe(2);
  });

  it("skips elements with zero area", () => {
    const project = createConstructionProject("Empty", "feet");
    project.elements = [];
    const result = calculateConstructionProject(project);

    const summary = summaryFromProject(result, new Map(), 10);
    expect(summary.lineItems.length).toBe(0);
  });
});

describe("Summary Formatting", () => {
  it("formats summary as readable text", () => {
    const paint = createMaterialSpec({
      productName: "Test Paint",
      brand: "Dulux",
      category: "paint",
      quantityUnit: "buckets",
      coverage: { type: "area", value: 50, unit: "m2" },
    });
    const summary = buildMaterialSummary("Test", [
      {
        material: paint,
        areaM2: 100,
        coats: 1,
        wastePercent: 0,
        source: "Room",
        finishType: "paint",
      },
    ]);

    const text = materialSummaryToText(summary);
    expect(text).toContain("MATERIAL SUMMARY: Test");
    expect(text).toContain("Test Paint");
    expect(text).toContain("Dulux");
  });
});
