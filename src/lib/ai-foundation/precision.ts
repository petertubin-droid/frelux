/**
 * Numeric hygiene for every engine the FRELUX API serves.
 *
 * An external model using an API key will repeat our numbers verbatim to its
 * own users. That makes float noise our problem: `12345.678000000002` becomes
 * someone's invoice line, and a `null` from a NaN becomes a silent zero in a
 * budget. So the boundary enforces three rules, once, for all engines:
 *
 *   1. Money is rounded to cents. Lines and totals are rounded independently
 *      and consistently, so a total always equals the sum of its lines.
 *   2. Quantities are rounded to three decimals, which is finer than any real
 *      material order and coarse enough to strip binary float artifacts.
 *   3. A non-finite value never leaves the engine. It is reported as an error,
 *      because a missing number in a construction estimate is worse than a
 *      refusal.
 *
 * Nothing here changes a formula. It only states the precision of an answer.
 */

/** Money is cents. A currency with three minor units would set this per call. */
export const MONEY_DECIMALS = 2;

/** Quantities: millimetre-level precision on metric areas and volumes. */
export const QUANTITY_DECIMALS = 3;

/**
 * Round half away from zero, with the epsilon correction that
 * `Math.round(1.005 * 100)` gets wrong (it lands on 100.49999999999999).
 */
export function roundTo(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** decimals;
  const scaled = value * factor;
  // Nudge by the smallest representable step before rounding so decimals that
  // sit exactly on a half boundary round the way a person expects.
  const nudged =
    Math.abs(scaled) < 1e12
      ? scaled + Math.sign(scaled) * Number.EPSILON * Math.abs(scaled)
      : scaled;
  const rounded = Math.round(nudged) / factor;
  // Normalise negative zero, which serialises as -0 and reads as a bug.
  return rounded === 0 ? 0 : rounded;
}

export function roundMoney(value: number): number {
  return roundTo(value, MONEY_DECIMALS);
}

export function roundQuantity(value: number): number {
  return roundTo(value, QUANTITY_DECIMALS);
}

export interface CostLineLike {
  label: string;
  amount: number;
}

export interface CostSummaryLike {
  total: number;
  currency: string;
  lines?: CostLineLike[];
  regionalDataAvailable: boolean;
}

export interface QuantityLineLike {
  label: string;
  quantity: number;
  unit: string;
}

export interface NumericAudit {
  /** Values that were not finite, named for the caller. */
  nonFinite: string[];
}

/**
 * Inspect a result and report non-finite numbers instead of letting them
 * become JSON nulls. Returns the list of offending fields, empty when clean.
 */
export function auditFinite(
  quantities: QuantityLineLike[],
  costs: CostSummaryLike | null,
): NumericAudit {
  const nonFinite: string[] = [];
  quantities.forEach((line, index) => {
    if (!Number.isFinite(line.quantity)) {
      nonFinite.push(`quantities[${index}] (${line.label})`);
    }
  });
  if (costs) {
    if (!Number.isFinite(costs.total)) nonFinite.push("costs.total");
    (costs.lines ?? []).forEach((line, index) => {
      if (!Number.isFinite(line.amount)) {
        nonFinite.push(`costs.lines[${index}] (${line.label})`);
      }
    });
  }
  return { nonFinite };
}

/** Round a quantity line, leaving label and unit untouched. */
export function normalizeQuantityLine<T extends QuantityLineLike>(line: T): T {
  return { ...line, quantity: roundQuantity(line.quantity) };
}

/**
 * Round a cost summary so the total equals the sum of the rounded lines.
 * When a total cannot be rebuilt from lines (engine reported only a total),
 * the reported total is still rounded, never recalculated.
 */
export function normalizeCostSummary<T extends CostSummaryLike>(costs: T): T {
  const lines = costs.lines?.map((line) => ({
    ...line,
    amount: roundMoney(line.amount),
  }));
  const reported = roundMoney(costs.total);
  let total = reported;
  if (lines?.length) {
    const lineSum = roundMoney(
      lines.reduce((sum, line) => sum + line.amount, 0),
    );
    // Reconcile only when the two already agree to the cent. A total that
    // legitimately covers more than its listed lines (Build-to-Roof reports a
    // grand total including labour while listing material lines) must never be
    // rewritten to the smaller figure.
    if (Math.abs(lineSum - reported) <= 0.01) total = lineSum;
  }
  return { ...costs, total, lines };
}
