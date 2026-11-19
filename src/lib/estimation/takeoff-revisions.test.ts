import { describe, expect, it } from "vitest";
import type {
  TakeoffMark,
  TakeoffProjectExport,
} from "@/lib/estimation/blueprint-takeoff-project";
import { compareTakeoffRevisions } from "@/lib/estimation/takeoff-revisions";

function mark(overrides: Partial<TakeoffMark> = {}): TakeoffMark {
  return {
    id: "m1",
    page: 1,
    type: "area",
    category: "masonry",
    label: "Wall A",
    points: [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 3 },
    ],
    quantity: 30,
    unit: "m²",
    color: "#000",
    ...overrides,
  };
}

function project(
  overrides: Partial<TakeoffProjectExport> = {},
): TakeoffProjectExport {
  return {
    format: "frelux-blueprint-takeoff",
    version: 1,
    exportedAt: "2026-11-01T00:00:00.000Z",
    sourceFileName: "arch-rev-A.pdf",
    sourceFileIncluded: false,
    marketCode: "NG",
    pageCount: 2,
    scalesByPage: { 1: 20, 2: 20 },
    marks: [mark()],
    summary: {
      totalLinearM: 0,
      totalAreaM2: 30,
      totalCount: 0,
      byCategory: {} as TakeoffProjectExport["summary"]["byCategory"],
    },
    limitations: [],
    ...overrides,
  };
}

describe("compareTakeoffRevisions", () => {
  it("reports an unchanged mark as unchanged with a zero delta", () => {
    const result = compareTakeoffRevisions(project(), project());
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0].status).toBe("unchanged");
    expect(result.changes[0].delta).toBe(0);
    expect(result.totals.delta["m²"]).toBe(0);
    expect(result.incomparableCount).toBe(0);
  });

  it("reports an increased quantity with its delta and percentage", () => {
    const result = compareTakeoffRevisions(
      project(),
      project({ marks: [mark({ quantity: 36 })] }),
    );
    const change = result.changes[0];
    expect(change.status).toBe("increased");
    expect(change.delta).toBe(6);
    expect(change.deltaPercent).toBe(20);
    expect(result.totals.delta["m²"]).toBe(6);
    expect(result.auditTrail.join(" ")).toContain("30 -> 36 m² (+6, +20%)");
  });

  it("refuses to compare quantities across a calibration change", () => {
    const result = compareTakeoffRevisions(
      project(),
      project({
        scalesByPage: { 1: 25, 2: 20 },
        marks: [mark({ quantity: 36 })],
      }),
    );
    expect(result.scaleChecks[0].status).toBe("changed");
    expect(result.scaleChecks[0].comparable).toBe(false);
    expect(result.changes[0].comparable).toBe(false);
    expect(result.incomparableCount).toBe(1);
    expect(result.warnings.join(" ")).toMatch(/Calibration changed on p\.1/);
    expect(result.auditTrail.join(" ")).toContain("not comparable");
  });

  it("reports added and removed marks", () => {
    const result = compareTakeoffRevisions(
      project({ marks: [mark()] }),
      project({
        marks: [
          mark({ id: "m2", label: "Wall B", quantity: 12 }),
          mark({
            id: "m3",
            label: "Skirting",
            type: "linear",
            unit: "m",
            quantity: 18,
          }),
        ],
      }),
    );
    const statuses = result.changes.map((c) => `${c.label}:${c.status}`);
    // Ordered by sheet then label, so the log reads in drawing order.
    expect(statuses).toEqual([
      "Skirting:added",
      "Wall A:removed",
      "Wall B:added",
    ]);
    expect(result.totals.previous["m²"]).toBe(30);
    expect(result.totals.current["m²"]).toBe(12);
  });

  it("keeps units apart in the totals instead of adding metres to square metres", () => {
    const result = compareTakeoffRevisions(
      project({
        marks: [
          mark({ id: "a", quantity: 30, unit: "m²" }),
          mark({ id: "b", label: "Skirting", unit: "m", quantity: 18 }),
        ],
      }),
      project({
        marks: [
          mark({ id: "a", quantity: 30, unit: "m²" }),
          mark({ id: "b", label: "Skirting", unit: "m", quantity: 22 }),
        ],
      }),
    );
    expect(result.totals.current["m²"]).toBe(30);
    expect(result.totals.current.m).toBe(22);
    expect(result.totals.delta.m).toBe(4);
    expect(result.totals.delta["m²"]).toBe(0);
  });

  it("flags a mark whose unit changed rather than reporting a delta", () => {
    const result = compareTakeoffRevisions(
      project({ marks: [mark({ unit: "m²", quantity: 30 })] }),
      project({ marks: [mark({ unit: "m", quantity: 30 })] }),
    );
    expect(result.changes[0].comparable).toBe(false);
    expect(result.changes[0].delta).toBe(0);
    expect(result.changes[0].deltaPercent).toBeNull();
  });

  it("does not guess between two marks that share a label on one sheet", () => {
    const result = compareTakeoffRevisions(
      project({
        marks: [
          mark({
            id: "old-1",
            label: "Window",
            type: "count",
            unit: "items",
            quantity: 2,
          }),
          mark({
            id: "old-2",
            label: "Window",
            type: "count",
            unit: "items",
            quantity: 3,
          }),
        ],
      }),
      project({
        marks: [
          mark({
            id: "new-1",
            label: "Window",
            type: "count",
            unit: "items",
            quantity: 4,
          }),
        ],
      }),
    );
    // The ambiguous previous pair is not paired with the new mark: one added,
    // two removed, rather than an invented 2 -> 4 change.
    expect(result.changes.filter((c) => c.status === "added")).toHaveLength(1);
    expect(result.changes.filter((c) => c.status === "removed")).toHaveLength(
      2,
    );
  });

  it("pairs a re-exported project whose mark ids were regenerated", () => {
    const result = compareTakeoffRevisions(
      project({ marks: [mark({ id: "old-id", quantity: 30 })] }),
      project({ marks: [mark({ id: "new-id", quantity: 33 })] }),
    );
    expect(result.changes[0].status).toBe("increased");
    expect(result.changes[0].delta).toBe(3);
  });

  it("warns about sheet count, market and source-file changes", () => {
    const result = compareTakeoffRevisions(
      project(),
      project({
        pageCount: 3,
        marketCode: "GB",
        sourceFileName: "arch-rev-B.pdf",
        exportedAt: "2026-11-10T00:00:00.000Z",
      }),
    );
    const warnings = result.warnings.join(" ");
    expect(warnings).toMatch(/Sheet count changed from 2 to 3/);
    expect(warnings).toMatch(/Market changed from NG to GB/);
    expect(warnings).toMatch(/arch-rev-A\.pdf.*arch-rev-B\.pdf/);
  });

  it("flags sheets with no usable calibration", () => {
    const result = compareTakeoffRevisions(
      project(),
      project({ scalesByPage: { 1: 20 } }),
    );
    const page2 = result.scaleChecks.find((c) => c.page === 2);
    expect(page2?.status).toBe("missing_after");
    expect(page2?.comparable).toBe(false);
    expect(result.warnings.join(" ")).toMatch(/No usable scale on p\.2/);
  });

  it("is deterministic for identical inputs", () => {
    const a = project();
    const b = project({ marks: [mark({ quantity: 41 })] });
    expect(compareTakeoffRevisions(a, b)).toEqual(
      compareTakeoffRevisions(a, b),
    );
  });
});
