import { describe, expect, it } from "vitest";
import {
  BBS_CSV_COLUMNS,
  DEFAULT_BBS_DRAFT,
  bbsScheduleToCsvRows,
  buildScheduleFromDraft,
  type BbsDraftRow,
} from "./bbs-panel-model";

const row = (patch: Partial<BbsDraftRow> = {}): BbsDraftRow => ({
  mark: "B1",
  typeGrade: "B500B (T)",
  diameter: "16",
  members: "2",
  barsPerMember: "3",
  shapeCode: "00",
  dimA: "4200",
  dimB: "",
  dimC: "",
  ...patch,
});

describe("bbs panel model", () => {
  it("ships a usable default schedule", () => {
    const { schedule, issues } = buildScheduleFromDraft(DEFAULT_BBS_DRAFT);
    expect(issues).toEqual([]);
    expect(schedule.rows).toHaveLength(3);
    expect(schedule.totals.totalBars).toBe(3 + 2 + 18);
    expect(schedule.rows.every((r) => r.lengthEachMm !== null)).toBe(true);
  });

  it("parses typed cells into the engine input", () => {
    const { bars } = buildScheduleFromDraft([row()]);
    expect(bars[0]).toEqual({
      barMark: "B1",
      typeGrade: "B500B (T)",
      diameterMm: 16,
      members: 2,
      barsPerMember: 3,
      shapeCode: "00",
      dims: { a: 4200 },
    });
  });

  it("multiplies members by bars per member for the total", () => {
    const { schedule } = buildScheduleFromDraft([row()]);
    expect(schedule.rows[0].totalBars).toBe(6);
    expect(schedule.rows[0].totalLengthM).toBe(25.2);
  });

  it("never turns a blank cell into a zero dimension", () => {
    const { schedule, issues } = buildScheduleFromDraft([row({ dimA: "" })]);
    expect(schedule.rows[0].lengthEachMm).toBeNull();
    expect(issues.join(" ")).toContain("needs dimension A");
  });

  it("reports a row without a mark instead of scheduling it", () => {
    const { schedule, issues, bars } = buildScheduleFromDraft([
      row({ mark: "  " }),
    ]);
    expect(bars).toHaveLength(0);
    expect(schedule.rows).toHaveLength(0);
    expect(issues[0]).toContain("add a bar mark");
  });

  it("surfaces duplicate marks from the engine", () => {
    const { issues } = buildScheduleFromDraft([row(), row()]);
    expect(issues.join(" ")).toContain("Duplicate bar mark");
  });

  it("accepts thousands separators in dimensions", () => {
    const { schedule } = buildScheduleFromDraft([row({ dimA: "4,200" })]);
    expect(schedule.rows[0].lengthEachMm).toBe(4200);
  });

  it("exports every schedule column, leaving unknown cells blank", () => {
    const { schedule } = buildScheduleFromDraft([
      row(),
      row({
        mark: "B2",
        shapeCode: "11",
        dimA: "1000",
        dimB: "500",
        diameter: "12",
      }),
    ]);
    const rows = bbsScheduleToCsvRows(schedule);
    expect(BBS_CSV_COLUMNS).toHaveLength(14);
    expect(Object.keys(rows[0])).toEqual(BBS_CSV_COLUMNS.map((c) => c.key));
    expect(rows[0].dimB).toBe("");
    expect(rows[1].lengthEachMm).toBe(1475.1);
    expect(rows[1].dimB).toBe(500);
  });

  it("keeps a failing row visible in the export without invented length", () => {
    const { schedule } = buildScheduleFromDraft([row({ dimA: "" })]);
    const rows = bbsScheduleToCsvRows(schedule);
    expect(rows[0].lengthEachMm).toBe("");
    expect(rows[0].weightKg).toBe("");
    expect(rows[0].barMark).toBe("B1");
  });
});
