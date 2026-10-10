import { describe, it, expect } from "vitest";
import {
  diffEstimates,
  formatDiffValue,
  MAJOR_CHANGE_PCT,
  type EstimateDiffField,
} from "@/lib/estimate-diff";
import type { DbEstimateHistory } from "@/types/database";

function make(overrides: Partial<DbEstimateHistory> = {}): DbEstimateHistory {
  return {
    id: "est-1",
    user_id: "u1",
    calculator_type: "paint",
    project_name: "Duplex Living Room",
    total_cost: 100000,
    material_cost: 60000,
    labour_cost: 40000,
    currency: "NGN",
    input_data: {},
    result_data: {},
    created_at: "2026-10-01T10:00:00Z",
    ...overrides,
  };
}

describe("estimate-diff", () => {
  it("reports no changes for identical estimates", () => {
    const report = diffEstimates(make(), make({ id: "est-2" }));
    expect(report.totals.every((f) => !f.changed)).toBe(true);
    expect(report.summary.direction).toBe("unchanged");
    expect(report.summary.changedFieldCount).toBe(0);
    expect(report.summary.totalDelta).toBe(0);
  });

  it("computes cost deltas and percentage changes", () => {
    const baseline = make();
    const target = make({
      id: "est-2",
      total_cost: 150000,
      material_cost: 90000,
      labour_cost: 60000,
    });
    const report = diffEstimates(baseline, target);
    const total = report.totals.find((f) => f.key === "total_cost")!;
    expect(total.changed).toBe(true);
    expect(total.delta).toBe(50000);
    expect(total.deltaPct).toBe(50);
    expect(report.summary.direction).toBe("increase");
    expect(report.summary.totalDeltaPct).toBe(50);
    expect(report.summary.changedFieldCount).toBe(3);
  });

  it("flags 5%+ cost swings as major and smaller ones as minor", () => {
    const report = diffEstimates(
      make(),
      make({
        id: "est-2",
        total_cost: make().total_cost! * (1 + MAJOR_CHANGE_PCT / 100),
      }),
    );
    expect(report.totals[0].severity).toBe("major");

    const minor = diffEstimates(
      make(),
      make({ id: "est-3", total_cost: 101000 }),
    );
    expect(minor.totals[0].severity).toBe("minor");
  });

  it("detects input and result data changes including missing keys", () => {
    const baseline = make({
      input_data: { wallHeight: 3, rooms: 2 },
      result_data: { litres: 20 },
    });
    const target = make({
      id: "est-2",
      input_data: { wallHeight: 3.5, rooms: 2, coats: 2 },
      result_data: { litres: 28 },
    });
    const report = diffEstimates(baseline, target);
    const wallHeight = report.inputs.find(
      (f) => f.key === "input_data.wallHeight",
    )!;
    expect(wallHeight.changed).toBe(true);
    expect(wallHeight.delta).toBeCloseTo(0.5);
    expect(wallHeight.severity).toBe("major"); // 3 -> 3.5 is a 16.7% swing

    const coats = report.inputs.find((f) => f.key === "input_data.coats")!;
    expect(coats.changed).toBe(true);
    expect(coats.before).toBeUndefined();

    const litres = report.results.find((f) => f.key === "result_data.litres")!;
    expect(litres.delta).toBe(8);
  });

  it("treats a 16.7% input change as major", () => {
    const baseline = make({ input_data: { wallHeight: 3 } });
    const target = make({ id: "x", input_data: { wallHeight: 3.5 } });
    const report = diffEstimates(baseline, target);
    const wallHeight = report.inputs.find(
      (f) => f.key === "input_data.wallHeight",
    )!;
    expect(wallHeight.severity).toBe("major");
  });

  it("compares nested object values as text and handles zero baselines", () => {
    const baseline = make({
      total_cost: 0,
      input_data: { room: { name: "Living", area: 12 } },
    });
    const target = make({
      id: "est-2",
      total_cost: 50000,
      input_data: { room: { name: "Living", area: 14 } },
    });
    const report = diffEstimates(baseline, target);
    const total = report.totals.find((f) => f.key === "total_cost")!;
    expect(total.deltaPct).toBeNull(); // cannot compute % from zero
    expect(report.summary.totalDeltaPct).toBeNull();
    const room = report.inputs.find((f) => f.key === "input_data.room")!;
    expect(room.kind).toBe("text");
    expect(room.changed).toBe(true);
  });

  it("formats currency, numbers and text values for display", () => {
    const currency: EstimateDiffField = {
      key: "total_cost",
      label: "Total Cost",
      kind: "currency",
      before: 100000,
      after: 150000,
      changed: true,
      delta: 50000,
      deltaPct: 50,
      severity: "major",
    };
    expect(formatDiffValue(currency, 150000)).toBe("₦150,000");
    expect(formatDiffValue(currency, null)).toBe("—");

    const number: EstimateDiffField = {
      key: "litres",
      label: "Litres",
      kind: "number",
      before: 20,
      after: 28,
      changed: true,
      delta: 8,
      deltaPct: 40,
      severity: "major",
    };
    expect(formatDiffValue(number, 28)).toBe("28");

    const text: EstimateDiffField = {
      key: "note",
      label: "Note",
      kind: "text",
      before: "a",
      after: "b".repeat(60),
      changed: true,
      delta: null,
      deltaPct: null,
      severity: "info",
    };
    const formatted = formatDiffValue(text, "b".repeat(100));
    expect(formatted.length).toBeLessThanOrEqual(80);
    expect(formatted.endsWith("…")).toBe(true);
  });
});
