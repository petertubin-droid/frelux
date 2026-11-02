import { describe, expect, it } from "vitest";
import {
  calculateWholeLifeCarbon,
  isRicsModule,
  moduleGroup,
} from "../whole-life-carbon";

describe("RICS module helpers", () => {
  it("validates RICS/EN 15978 module codes", () => {
    for (const m of ["A1", "A3", "A4", "A5", "B1", "B7", "C1", "C4", "D"]) {
      expect(isRicsModule(m)).toBe(true);
    }
    expect(isRicsModule("A9")).toBe(false);
    expect(isRicsModule("product stage")).toBe(false);
    expect(isRicsModule("d")).toBe(false); // case-sensitive codes
  });

  it("maps modules to their stage groups", () => {
    expect(moduleGroup("A2")).toBe("product_stage");
    expect(moduleGroup("A4")).toBe("construction");
    expect(moduleGroup("B5")).toBe("use");
    expect(moduleGroup("C3")).toBe("end_of_life");
    expect(moduleGroup("D")).toBe("beyond_boundary");
  });
});

describe("calculateWholeLifeCarbon", () => {
  it("buckets emissions into the EN 15978 headline aggregates", () => {
    const r = calculateWholeLifeCarbon({
      lines: [
        { label: "Cement", module: "A1", kg_co2e: 100000 },
        { label: "Cement transport", module: "A2", kg_co2e: 5000 },
        { label: "Steel manufacture", module: "A3", kg_co2e: 80000 },
        { label: "Site delivery", module: "A4", kg_co2e: 12000 },
        { label: "Installation waste", module: "A5", kg_co2e: 3000 },
        { label: "Replacement", module: "B4", kg_co2e: 10000 },
        { label: "Operational energy", module: "B6", kg_co2e: 45000 },
        { label: "Demolition", module: "C1", kg_co2e: 2000 },
        { label: "Landfill", module: "C4", kg_co2e: 4000 },
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.upfrontCarbon).toBe(200000); // A1+A2+A3+A4+A5
    expect(r.useStageEmbodied).toBe(10000); // B1-B5
    expect(r.operationalInUse).toBe(45000); // B6-B7
    expect(r.endOfLife).toBe(6000); // C1-C4
    expect(r.totalExcludingD).toBe(261000);
    expect(r.moduleD).toBe(0);
    expect(r.wholeLifeTotal).toBe(261000);
    expect(r.warnings).toHaveLength(0);
    expect(r.modules.map((m) => m.module)).toEqual([
      "A1", "A2", "A3", "A4", "A5", "B4", "B6", "C1", "C4",
    ]);
  });

  it("reports module D separately so a negative entry cannot flatter the total", () => {
    const r = calculateWholeLifeCarbon({
      lines: [
        { label: "Concrete", module: "A1", kg_co2e: 100000 },
        { label: "Recycled steel credit", module: "D", kg_co2e: -15000 },
      ],
    });
    expect(r.moduleD).toBe(-15000);
    expect(r.totalExcludingD).toBe(100000);
    expect(r.wholeLifeTotal).toBe(85000);
    expect(r.steps.some((s) => s.label === "D Beyond the boundary")).toBe(true);
    expect(r.disclosures.join(" ")).toContain("never merged silently");
  });

  it("assumes A1–A3 product stage for module-less product lines and says so", () => {
    const r = calculateWholeLifeCarbon({
      lines: [{ label: "Paint", kg_co2e: 500 }],
    });
    expect(r.ok).toBe(true);
    expect(r.groupTotals.product_stage).toBe(500);
    expect(r.upfrontCarbon).toBe(500);
    expect(r.warnings.join(" ")).toContain("assumed into the A1–A3 product stage");
  });

  it("refuses unknown module codes instead of guessing", () => {
    const r = calculateWholeLifeCarbon({
      lines: [
        { label: "Known", module: "A1", kg_co2e: 100 },
        { label: "Unknown", module: "X9", kg_co2e: 999 },
      ],
    });
    expect(r.upfrontCarbon).toBe(100);
    expect(r.warnings.join(" ")).toContain("unknown lifecycle module");
    expect(r.warnings.join(" ")).toContain("excluded instead of guessed");
    expect(r.totalExcludingD).toBe(100);
  });

  it("flags embodied-only assessments honestly (Buy Clean vs full WLCA)", () => {
    const r = calculateWholeLifeCarbon({
      lines: [{ label: "Concrete", module: "A1", kg_co2e: 1000 }],
    });
    expect(r.disclosures.join(" ")).toContain("embodied-only assessment");
    expect(r.disclosures.join(" ")).toContain("NOT a complete whole life assessment");
  });

  it("refuses a non-numeric emission value", () => {
    const r = calculateWholeLifeCarbon({
      // @ts-expect-error deliberate malformed input
      lines: [{ label: "Broken", module: "A1", kg_co2e: "lots" }],
    });
    expect(r.warnings.join(" ")).toContain("non-numeric");
  });

  it("returns ok: false for empty input", () => {
    const r = calculateWholeLifeCarbon({ lines: [] });
    expect(r.ok).toBe(false);
    expect(r.warnings.join(" ")).toContain("No lifecycle lines");
  });
});
