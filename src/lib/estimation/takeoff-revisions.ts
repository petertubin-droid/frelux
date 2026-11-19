/**
 * Revision comparison for blueprint takeoff projects.
 *
 * When an architect issues a revised drawing set, a tender cannot simply be
 * re-measured: the estimator has to show what changed, on which sheet, and
 * whether the two numbers are even comparable. This module compares two
 * exported takeoff projects and answers exactly that.
 *
 * Rules it will not bend:
 *
 *  - quantities are only summed within the same unit. Metres and square metres
 *    are never added together, because a total that mixes them is nonsense;
 *  - a measurement on a page whose calibration changed is reported as
 *    incomparable rather than as a delta. Two different px-per-metre figures
 *    measure two different drawings, and subtracting them invents a change;
 *  - a mark that cannot be matched is reported as added or removed, never
 *    silently paired with a different mark that happens to sit nearby.
 */

import type {
  TakeoffCategory,
  TakeoffMark,
  TakeoffProjectExport,
} from "./blueprint-takeoff-project";

export type ScaleStatus =
  "unchanged" | "changed" | "missing_before" | "missing_after" | "both_missing";

export interface ScaleCheck {
  page: number;
  previousScale: number | null;
  currentScale: number | null;
  status: ScaleStatus;
  /** False when the page cannot be compared across the two revisions. */
  comparable: boolean;
}

export type MarkStatus =
  "added" | "removed" | "increased" | "decreased" | "unchanged";

export interface MarkChange {
  /** Mark id in the current revision, or the previous id for a removal. */
  id: string;
  label: string;
  category: TakeoffCategory;
  page: number;
  unit: string;
  previousQuantity: number | null;
  currentQuantity: number | null;
  delta: number;
  deltaPercent: number | null;
  status: MarkStatus;
  /** False when the page's calibration changed, so no delta can be trusted. */
  comparable: boolean;
}

export interface UnitTotals {
  m: number;
  "m²": number;
  items: number;
}

export interface TakeoffRevisionComparison {
  previous: {
    exportedAt: string;
    sourceFileName: string;
    marketCode: string;
    pageCount: number;
  };
  current: {
    exportedAt: string;
    sourceFileName: string;
    marketCode: string;
    pageCount: number;
  };
  scaleChecks: ScaleCheck[];
  changes: MarkChange[];
  totals: {
    previous: UnitTotals;
    current: UnitTotals;
    delta: UnitTotals;
  };
  /** Marks whose quantities cannot be compared across the revisions. */
  incomparableCount: number;
  /** Lines an estimator can paste into a tender query or drawing-issue log. */
  auditTrail: string[];
  /** Honest gaps: what this comparison cannot tell you. */
  warnings: string[];
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

function emptyTotals(): UnitTotals {
  return { m: 0, "m²": 0, items: 0 };
}

function totalFor(marks: TakeoffMark[]): UnitTotals {
  const totals = emptyTotals();
  for (const mark of marks) {
    const key = mark.unit as keyof UnitTotals;
    if (key in totals && Number.isFinite(mark.quantity)) {
      totals[key] = round3(totals[key] + mark.quantity);
    }
  }
  return totals;
}

function scaleOn(project: TakeoffProjectExport, page: number): number | null {
  const raw = project.scalesByPage?.[page];
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function checkScales(
  previous: TakeoffProjectExport,
  current: TakeoffProjectExport,
): ScaleCheck[] {
  const pages = new Set<number>([
    ...Object.keys(previous.scalesByPage ?? {}).map(Number),
    ...Object.keys(current.scalesByPage ?? {}).map(Number),
  ]);
  const checks: ScaleCheck[] = [];
  for (const page of [...pages].sort((a, b) => a - b)) {
    const before = scaleOn(previous, page);
    const after = scaleOn(current, page);
    let status: ScaleStatus;
    if (before === null && after === null) status = "both_missing";
    else if (before === null) status = "missing_before";
    else if (after === null) status = "missing_after";
    else if (Math.abs(before - after) < 1e-9) status = "unchanged";
    else status = "changed";
    checks.push({
      page,
      previousScale: before,
      currentScale: after,
      status,
      comparable: status === "unchanged",
    });
  }
  return checks;
}

/** Marks are paired by id; a re-export with fresh ids is paired by identity. */
function keyOf(mark: TakeoffMark): string {
  return `${mark.page}|${mark.category}|${mark.label.trim().toLowerCase()}`;
}

function indexMarks(marks: TakeoffMark[]) {
  const byId = new Map<string, TakeoffMark>();
  const byKey = new Map<string, TakeoffMark[]>();
  for (const mark of marks) {
    byId.set(mark.id, mark);
    const key = keyOf(mark);
    const list = byKey.get(key) ?? [];
    list.push(mark);
    byKey.set(key, list);
  }
  return { byId, byKey };
}

function describe(change: MarkChange): string {
  const where = `p.${change.page} ${change.label}`;
  if (change.status === "added") {
    return `Added: ${where} = ${change.currentQuantity} ${change.unit}`;
  }
  if (change.status === "removed") {
    return `Removed: ${where} (was ${change.previousQuantity} ${change.unit})`;
  }
  const sign = change.delta > 0 ? "+" : "";
  const pct =
    change.deltaPercent === null
      ? ""
      : `, ${change.deltaPercent > 0 ? "+" : ""}${change.deltaPercent}%`;
  return `Changed: ${where} ${change.previousQuantity} -> ${change.currentQuantity} ${change.unit} (${sign}${change.delta}${pct})`;
}

/**
 * Compare a previous takeoff export with the current one.
 *
 * Deterministic: the same two exports always produce the same comparison, with
 * changes ordered by page, then label, then id.
 */
export function compareTakeoffRevisions(
  previous: TakeoffProjectExport,
  current: TakeoffProjectExport,
): TakeoffRevisionComparison {
  const scaleChecks = checkScales(previous, current);
  const comparablePage = new Map(
    scaleChecks.map((check) => [check.page, check.comparable]),
  );
  const isComparable = (page: number) => comparablePage.get(page) ?? false;

  const before = indexMarks(previous.marks ?? []);
  const after = indexMarks(current.marks ?? []);
  const usedPrevious = new Set<string>();
  const changes: MarkChange[] = [];

  for (const mark of current.marks ?? []) {
    const match =
      before.byId.get(mark.id) ?? takeUnique(before, mark, usedPrevious);
    if (!match) {
      changes.push({
        id: mark.id,
        label: mark.label,
        category: mark.category,
        page: mark.page,
        unit: mark.unit,
        previousQuantity: null,
        currentQuantity: mark.quantity,
        delta: mark.quantity,
        deltaPercent: null,
        status: "added",
        comparable: isComparable(mark.page),
      });
      continue;
    }
    usedPrevious.add(match.id);
    const delta = round3(mark.quantity - match.quantity);
    const sameUnit = mark.unit === match.unit;
    const changed = Math.abs(delta) > 1e-9 || !sameUnit;
    changes.push({
      id: mark.id,
      label: mark.label,
      category: mark.category,
      page: mark.page,
      unit: mark.unit,
      previousQuantity: match.quantity,
      currentQuantity: mark.quantity,
      delta: sameUnit ? delta : 0,
      deltaPercent:
        sameUnit && match.quantity > 0
          ? round3((delta / match.quantity) * 100)
          : null,
      status: !changed ? "unchanged" : delta > 0 ? "increased" : "decreased",
      comparable: isComparable(mark.page) && sameUnit,
    });
  }

  for (const mark of previous.marks ?? []) {
    // usedPrevious records every previous mark this revision paired with, so
    // anything left is genuinely gone. An ambiguous mark that could not be
    // paired stays a removal rather than silently disappearing.
    if (usedPrevious.has(mark.id)) continue;
    changes.push({
      id: mark.id,
      label: mark.label,
      category: mark.category,
      page: mark.page,
      unit: mark.unit,
      previousQuantity: mark.quantity,
      currentQuantity: null,
      delta: round3(-mark.quantity),
      deltaPercent: -100,
      status: "removed",
      comparable: isComparable(mark.page),
    });
  }

  changes.sort(
    (a, b) =>
      a.page - b.page ||
      a.label.localeCompare(b.label) ||
      a.id.localeCompare(b.id),
  );

  const totalsPrevious = totalFor(previous.marks ?? []);
  const totalsCurrent = totalFor(current.marks ?? []);

  const warnings: string[] = [];
  const changedPages = scaleChecks.filter((c) => c.status === "changed");
  if (changedPages.length) {
    warnings.push(
      `Calibration changed on ${changedPages.map((c) => `p.${c.page}`).join(", ")}. Quantities on those sheets are reported as incomparable rather than as a delta: a different px-per-metre figure measures a different drawing.`,
    );
  }
  const missingScale = scaleChecks.filter(
    (c) => c.status === "missing_after" || c.status === "both_missing",
  );
  if (missingScale.length) {
    warnings.push(
      `No usable scale on ${missingScale.map((c) => `p.${c.page}`).join(", ")} in the current revision, so its measurements are not verifiable.`,
    );
  }
  if (previous.pageCount !== current.pageCount) {
    warnings.push(
      `Sheet count changed from ${previous.pageCount} to ${current.pageCount}. New sheets appear as added marks; a re-issued sheet with the same page number is compared in place.`,
    );
  }
  if (previous.marketCode !== current.marketCode) {
    warnings.push(
      `Market changed from ${previous.marketCode} to ${current.marketCode}. Quantities are unaffected, but any pricing derived from them is not comparable.`,
    );
  }
  if (previous.sourceFileName !== current.sourceFileName) {
    warnings.push(
      `Source file changed from "${previous.sourceFileName}" to "${current.sourceFileName}". Confirm the drawing issue matches the sheet it is compared against.`,
    );
  }
  const incomparable = changes.filter((c) => !c.comparable).length;
  if (incomparable > 0) {
    warnings.push(
      `${incomparable} mark(s) cannot be compared across the two revisions; they are listed with their status but no trusted delta.`,
    );
  }

  const auditTrail = [
    `Compared "${previous.sourceFileName}" (${previous.exportedAt}, ${previous.pageCount} sheet(s)) with "${current.sourceFileName}" (${current.exportedAt}, ${current.pageCount} sheet(s)).`,
    ...scaleChecks.map((check) => {
      if (check.status === "unchanged") {
        return `p.${check.page} calibration unchanged at ${check.currentScale}.`;
      }
      if (check.status === "changed") {
        return `p.${check.page} calibration changed ${check.previousScale} -> ${check.currentScale}: measurements on this sheet are not comparable.`;
      }
      if (check.status === "missing_after") {
        return `p.${check.page} has no usable calibration in the current revision (was ${check.previousScale}).`;
      }
      if (check.status === "missing_before") {
        return `p.${check.page} was uncalibrated in the previous revision and is ${check.currentScale} now.`;
      }
      return `p.${check.page} is uncalibrated in both revisions.`;
    }),
    ...changes
      .filter((change) => change.status !== "unchanged")
      .map((change) =>
        change.comparable
          ? describe(change)
          : `${describe(change)} [not comparable: calibration or unit changed]`,
      ),
    `Totals: length ${totalsPrevious.m} -> ${totalsCurrent.m} m, area ${totalsPrevious["m²"]} -> ${totalsCurrent["m²"]} m², count ${totalsPrevious.items} -> ${totalsCurrent.items} items.`,
  ];

  return {
    previous: {
      exportedAt: previous.exportedAt,
      sourceFileName: previous.sourceFileName,
      marketCode: previous.marketCode,
      pageCount: previous.pageCount,
    },
    current: {
      exportedAt: current.exportedAt,
      sourceFileName: current.sourceFileName,
      marketCode: current.marketCode,
      pageCount: current.pageCount,
    },
    scaleChecks,
    changes,
    totals: {
      previous: totalsPrevious,
      current: totalsCurrent,
      delta: {
        m: round3(totalsCurrent.m - totalsPrevious.m),
        "m²": round3(totalsCurrent["m²"] - totalsPrevious["m²"]),
        items: round3(totalsCurrent.items - totalsPrevious.items),
      },
    },
    incomparableCount: incomparable,
    auditTrail,
    warnings,
  };
}

/**
 * Pair an unmatched mark with a unique previous mark of the same identity.
 * Two marks sharing a label on the same sheet are ambiguous, so neither is
 * paired: guessing which one moved would invent a change.
 */
function takeUnique(
  index: ReturnType<typeof indexMarks>,
  mark: TakeoffMark,
  used: Set<string>,
): TakeoffMark | null {
  const candidates = (index.byKey.get(keyOf(mark)) ?? []).filter(
    (candidate) => !used.has(candidate.id),
  );
  return candidates.length === 1 ? candidates[0] : null;
}
