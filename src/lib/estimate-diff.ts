import type { DbEstimateHistory } from "@/types/database";

// =========================================================
// Saved Estimate Diff (workspace item 6)
//
// Pure diff engine for two saved estimate records. No I/O:
// given a baseline and a target estimate history row, produce a
// structured report of what changed: cost totals with deltas and
// percentages, plus a field-by-field diff of the saved inputs and
// results. The UI layer renders this report as a comparison panel
// in Estimate Analytics ("what changed since my last estimate").
// =========================================================

export type EstimateDiffSeverity = "major" | "minor" | "info";
export type EstimateDiffKind = "currency" | "number" | "text";

/** Cost-percentage change at or above which a change is flagged "major". */
export const MAJOR_CHANGE_PCT = 5;

export interface EstimateDiffField {
  /** Dotted key, e.g. "total_cost" or "input_data.wallHeight". */
  key: string;
  /** Human label, e.g. "Total Cost". */
  label: string;
  kind: EstimateDiffKind;
  before: unknown;
  after: unknown;
  changed: boolean;
  /** Numeric delta (after - before) for currency/number fields. */
  delta: number | null;
  /** Percent change for numeric fields (null when before is 0/unknown). */
  deltaPct: number | null;
  severity: EstimateDiffSeverity;
}

export interface EstimateDiffSummary {
  totalBefore: number;
  totalAfter: number;
  totalDelta: number;
  totalDeltaPct: number | null;
  direction: "increase" | "decrease" | "unchanged";
  changedFieldCount: number;
}

export interface EstimateDiffReport {
  baseline: {
    id: string;
    createdAt: string;
    projectName: string;
    calculatorType: string;
  };
  target: {
    id: string;
    createdAt: string;
    projectName: string;
    calculatorType: string;
  };
  totals: EstimateDiffField[];
  inputs: EstimateDiffField[];
  results: EstimateDiffField[];
  summary: EstimateDiffSummary;
}

function humanizeKey(key: string): string {
  return key
    .replace(/[_.]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value !== "object") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function numOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function pctChange(before: number, after: number): number | null {
  if (before === 0) return null; // cannot express a % from zero
  return ((after - before) / Math.abs(before)) * 100;
}

function classify(pct: number | null): EstimateDiffSeverity {
  if (pct !== null && Math.abs(pct) >= MAJOR_CHANGE_PCT) return "major";
  return "minor";
}

function currencyField(
  key: string,
  label: string,
  before: number | null,
  after: number | null,
): EstimateDiffField {
  const beforeNum = before ?? 0;
  const afterNum = after ?? 0;
  const changed = beforeNum !== afterNum;
  const pct = changed ? pctChange(beforeNum, afterNum) : null;
  return {
    key,
    label,
    kind: "currency",
    before: before,
    after: after,
    changed,
    delta: changed ? afterNum - beforeNum : null,
    deltaPct: pct,
    severity: changed ? classify(pct) : "info",
  };
}

function dataField(
  prefix: string,
  key: string,
  before: unknown,
  after: unknown,
): EstimateDiffField {
  const beforeStr = stableStringify(before);
  const afterStr = stableStringify(after);
  const changed = beforeStr !== afterStr;
  const beforeNum = numOrNull(before);
  const afterNum = numOrNull(after);
  const bothNumbers = beforeNum !== null && afterNum !== null;
  const kind: EstimateDiffKind = bothNumbers ? "number" : "text";
  const pct = changed && bothNumbers ? pctChange(beforeNum, afterNum) : null;
  return {
    key: `${prefix}.${key}`,
    label: humanizeKey(key),
    kind,
    before,
    after,
    changed,
    delta: changed && bothNumbers ? afterNum - beforeNum : null,
    deltaPct: pct,
    severity: changed ? (kind === "number" ? classify(pct) : "info") : "info",
  };
}

function diffData(
  prefix: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): EstimateDiffField[] {
  const keys = Array.from(
    new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]),
  );
  return keys
    .sort()
    .map((key) => dataField(prefix, key, before?.[key], after?.[key]));
}

/**
 * Diff two saved estimate history rows.
 * `baseline` is the earlier/previous estimate, `target` the newer one.
 * The function is pure: same inputs always produce the same report.
 */
export function diffEstimates(
  baseline: DbEstimateHistory,
  target: DbEstimateHistory,
): EstimateDiffReport {
  const totals: EstimateDiffField[] = [
    currencyField(
      "total_cost",
      "Total Cost",
      baseline.total_cost,
      target.total_cost,
    ),
    currencyField(
      "material_cost",
      "Material Cost",
      baseline.material_cost,
      target.material_cost,
    ),
    currencyField(
      "labour_cost",
      "Labour Cost",
      baseline.labour_cost,
      target.labour_cost,
    ),
  ];

  const inputs = diffData(
    "input_data",
    baseline.input_data ?? {},
    target.input_data ?? {},
  );
  const results = diffData(
    "result_data",
    baseline.result_data ?? {},
    target.result_data ?? {},
  );

  const totalBefore = baseline.total_cost ?? 0;
  const totalAfter = target.total_cost ?? 0;
  const totalDelta = totalAfter - totalBefore;
  const totalDeltaPct =
    totalBefore !== 0 ? (totalDelta / Math.abs(totalBefore)) * 100 : null;

  const changedFieldCount =
    totals.filter((f) => f.changed).length +
    inputs.filter((f) => f.changed).length +
    results.filter((f) => f.changed).length;

  return {
    baseline: {
      id: baseline.id,
      createdAt: baseline.created_at,
      projectName:
        baseline.project_name ?? humanizeKey(baseline.calculator_type),
      calculatorType: baseline.calculator_type,
    },
    target: {
      id: target.id,
      createdAt: target.created_at,
      projectName: target.project_name ?? humanizeKey(target.calculator_type),
      calculatorType: target.calculator_type,
    },
    totals,
    inputs,
    results,
    summary: {
      totalBefore,
      totalAfter,
      totalDelta,
      totalDeltaPct,
      direction:
        totalDelta > 0 ? "increase" : totalDelta < 0 ? "decrease" : "unchanged",
      changedFieldCount,
    },
  };
}

/** Format helper shared by the UI and tests. */
export function formatDiffValue(
  field: EstimateDiffField,
  value: unknown,
): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field.kind === "currency") {
    const n = numOrNull(value);
    return n === null ? "—" : `₦${n.toLocaleString()}`;
  }
  if (field.kind === "number") return String(value);
  const s = stableStringify(value);
  return s.length > 80 ? `${s.slice(0, 77)}…` : s;
}
