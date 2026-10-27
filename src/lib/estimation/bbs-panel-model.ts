/**
 * Bridges the bar bending schedule UI and the BS 8666 engine.
 *
 * The panel keeps every cell as the string the user typed, so a blank or a
 * half-typed number never becomes a silent zero. Parsing happens here, once,
 * and anything unparseable is reported as an issue attached to its bar mark.
 */
import type { CsvColumn } from "@/lib/export-utils";
import {
  buildBarBendingSchedule,
  type BbsBarInput,
  type BarBendingSchedule,
  type Bs8666ShapeCode,
} from "./reinforcement-engine";

export interface BbsDraftRow {
  mark: string;
  typeGrade: string;
  diameter: string;
  members: string;
  barsPerMember: string;
  shapeCode: Bs8666ShapeCode;
  dimA: string;
  dimB: string;
  dimC: string;
}

export const DEFAULT_BBS_DRAFT: BbsDraftRow[] = [
  {
    mark: "B1",
    typeGrade: "B500B (T)",
    diameter: "16",
    members: "1",
    barsPerMember: "3",
    shapeCode: "00",
    dimA: "4200",
    dimB: "",
    dimC: "",
  },
  {
    mark: "B2",
    typeGrade: "B500B (T)",
    diameter: "12",
    members: "1",
    barsPerMember: "2",
    shapeCode: "11",
    dimA: "1200",
    dimB: "400",
    dimC: "",
  },
  {
    mark: "L1",
    typeGrade: "B500A (R)",
    diameter: "8",
    members: "1",
    barsPerMember: "18",
    shapeCode: "51",
    dimA: "250",
    dimB: "450",
    dimC: "",
  },
];

function num(value: string): number {
  const trimmed = (value ?? "").trim();
  if (trimmed === "") return Number.NaN;
  const parsed = Number(trimmed.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export interface BbsDraftResult {
  schedule: BarBendingSchedule;
  /** Bars handed to the engine (rows with an unusable mark are omitted). */
  bars: BbsBarInput[];
  issues: string[];
}

/** Draft rows → engine input → schedule, with per-row issues surfaced. */
export function buildScheduleFromDraft(
  draft: readonly BbsDraftRow[],
): BbsDraftResult {
  const issues: string[] = [];
  const bars: BbsBarInput[] = [];

  draft.forEach((row, index) => {
    const mark = (row.mark ?? "").trim();
    if (!mark) {
      issues.push(
        `Row ${index + 1}: add a bar mark before this row can be scheduled.`,
      );
      return;
    }
    bars.push({
      barMark: mark,
      typeGrade: (row.typeGrade ?? "").trim(),
      diameterMm: num(row.diameter),
      members: num(row.members),
      barsPerMember: num(row.barsPerMember),
      shapeCode: row.shapeCode,
      dims: {
        a: num(row.dimA),
        ...(row.dimB.trim() === "" ? {} : { b: num(row.dimB) }),
        ...(row.dimC.trim() === "" ? {} : { c: num(row.dimC) }),
      },
    });
  });

  const schedule = buildBarBendingSchedule(bars);
  return {
    schedule,
    bars,
    issues: [...issues, ...schedule.errors, ...schedule.warnings],
  };
}

export const BBS_CSV_COLUMNS: CsvColumn[] = [
  { key: "barMark", header: "Bar mark" },
  { key: "typeGrade", header: "Type/grade" },
  { key: "sizeMm", header: "Size (mm)" },
  { key: "members", header: "No. of members" },
  { key: "barsPerMember", header: "No. of bars in each" },
  { key: "totalBars", header: "Total no. of bars" },
  { key: "lengthEachMm", header: "Length of each bar (mm)" },
  { key: "totalLengthM", header: "Total length (m)" },
  { key: "shapeCode", header: "Shape code" },
  { key: "dimA", header: "A (mm)" },
  { key: "dimB", header: "B (mm)" },
  { key: "dimC", header: "C (mm)" },
  { key: "dimD", header: "D (mm)" },
  { key: "weightKg", header: "Weight (kg)" },
];

/** Schedule → rows for downloadCsv, with blank cells left blank (never 0). */
export function bbsScheduleToCsvRows(
  schedule: BarBendingSchedule,
): Record<string, unknown>[] {
  return schedule.rows.map((row) => ({
    barMark: row.barMark,
    typeGrade: row.typeGrade,
    sizeMm: row.sizeMm,
    members: row.members,
    barsPerMember: row.barsPerMember,
    totalBars: row.totalBars,
    lengthEachMm: row.lengthEachMm ?? "",
    totalLengthM: row.totalLengthM ?? "",
    shapeCode: row.shapeCode,
    dimA: row.dims.a,
    dimB: row.dims.b ?? "",
    dimC: row.dims.c ?? "",
    dimD: row.dims.d ?? "",
    weightKg: row.weightKg ?? "",
  }));
}
