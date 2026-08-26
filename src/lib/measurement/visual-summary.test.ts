import { describe, it, expect } from "vitest";
import {
  buildAreaChart,
  buildFinishTypeChart,
  buildDetailTable,
  buildMaterialChart,
} from "./visual-summary";

function makeResult() {
  return {
    projectId: "p1",
    name: "Test",
    elementResults: [
      {
        elementId: "e1",
        name: "Living Room",
        elementType: "interior_space",
        primaryCalculator: "painting",
        spaceResults: [],
        totalAreaM2: 60,
        steps: [],
      },
      {
        elementId: "e2",
        name: "Kitchen",
        elementType: "interior_space",
        primaryCalculator: "tiling",
        spaceResults: [],
        totalAreaM2: 40,
        steps: [],
      },
    ],
    totalAreaM2: 100,
    areaByFinishType: { paint: 60, tile: 40 },
    areaByElementType: { interior_space: 100 },
    allSpaceResults: [],
    steps: [],
  } as any;
}

describe("measurement/visual-summary", () => {
  it("buildAreaChart creates bars from elements", () => {
    const chart = buildAreaChart(makeResult());
    expect(chart.bars.length).toBe(2);
    expect(chart.bars[0].label).toBe("Living Room");
    expect(chart.bars[0].unit).toBe("m²");
    expect(chart.bars[0].percent).toBe(60);
  });

  it("buildAreaChart handles zero total", () => {
    const r = makeResult();
    r.totalAreaM2 = 0;
    const chart = buildAreaChart(r);
    expect(chart.bars.every((b) => b.percent === 0)).toBe(true);
  });

  it("buildFinishTypeChart creates bars from finish types", () => {
    const chart = buildFinishTypeChart(makeResult());
    expect(chart.bars.length).toBe(2);
    expect(chart.bars[0].label).toBe("paint");
    expect(chart.bars[0].percent).toBe(60);
  });

  it("buildDetailTable creates rows for each element", () => {
    const table = buildDetailTable(makeResult());
    expect(table.rows.length).toBe(2);
    expect(table.rows[0].cells[0]).toBe("Living Room");
  });

  it("buildMaterialChart creates bars from summary", () => {
    const summary = {
      categorySubtotals: [
        { category: "paint", totalBuyQuantity: 5, quantityUnit: "bucket" },
        { category: "cement", totalBuyQuantity: 10, quantityUnit: "bag" },
      ],
    } as any;
    const chart = buildMaterialChart(summary);
    expect(chart.bars.length).toBe(2);
    expect(chart.bars[0].label).toBe("paint");
    expect(chart.bars[0].percent).toBeCloseTo(33.3, 0);
  });
});
