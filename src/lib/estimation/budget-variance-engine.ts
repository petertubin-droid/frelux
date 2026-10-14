/**
 * Budget variance engine — Estimate vs. Actual (roadmap Wave 1.1).
 *
 * PURE module: no I/O, no currency formatting, no market
 * assumptions. All amounts are plain numbers in the project's
 * own currency; the caller (UI/API) is responsible for
 * formatting with the project's currency and locale.
 *
 * Internationalization contract:
 * - No NGN/fallback currency logic here. Currency never enters
 *   the math; only the caller knows it.
 * - Categories mirror the contractor project cost model
 *   (material / labour / transport / misc) so the comparison is
 *   meaningful in every market without market-specific code.
 */

export type VarianceCategory = "material" | "labour" | "transport" | "misc";

export type VarianceStatus = "under" | "on_track" | "over";

export interface CategoryVariance {
  category: VarianceCategory;
  estimated: number;
  actual: number;
  /** actual - estimated; positive = overspend */
  delta: number;
  /** delta as a fraction of estimated (0 when estimated is 0) */
  deltaFraction: number;
  /** fraction of estimated budget spent (0 when estimated is 0) */
  usedFraction: number;
  status: VarianceStatus;
}

export interface BudgetVarianceResult {
  categories: CategoryVariance[];
  totalEstimated: number;
  totalActual: number;
  totalDelta: number;
  /** 0-1 fraction of the total estimated budget spent (0 when no budget) */
  totalUsedFraction: number;
  /** true when actual spend exceeds the estimated budget */
  overBudget: boolean;
  /** count of expense rows whose category is not budgeted (defensive) */
  unbudgetedCount: number;
}

export interface VarianceExpense {
  category: string;
  amount: number;
}

export interface VarianceInput {
  /** Estimated spend per category (from contractor_projects totals). */
  estimated: {
    material?: number;
    labour?: number;
    transport?: number;
    misc?: number;
  };
  /** Actual expense rows (project_expenses). */
  expenses: VarianceExpense[];
}

/** Thresholds: under 90% = under, 90-105% = on track, >105% = over. */
export const ON_TRACK_FRACTION = 0.9;
export const OVER_FRACTION = 1.05;

function safe(n: number | undefined): number {
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : 0;
}

function statusFor(usedFraction: number): VarianceStatus {
  if (usedFraction > OVER_FRACTION) return "over";
  if (usedFraction < ON_TRACK_FRACTION) return "under";
  return "on_track";
}

export function computeBudgetVariance(
  input: VarianceInput,
): BudgetVarianceResult {
  const categories: VarianceCategory[] = [
    "material",
    "labour",
    "transport",
    "misc",
  ];

  const actualByCategory = new Map<VarianceCategory, number>();
  let unbudgetedCount = 0;
  for (const expense of input.expenses ?? []) {
    const amount = safe(expense.amount);
    const category = expense.category as VarianceCategory;
    if (!categories.includes(category)) {
      unbudgetedCount += 1;
      continue;
    }
    actualByCategory.set(
      category,
      (actualByCategory.get(category) ?? 0) + amount,
    );
  }

  let totalEstimated = 0;
  let totalActual = 0;
  const rows: CategoryVariance[] = categories.map((category) => {
    const estimated = safe(input.estimated?.[category]);
    const actual = actualByCategory.get(category) ?? 0;
    totalEstimated += estimated;
    totalActual += actual;
    const delta = actual - estimated;
    const usedFraction = estimated > 0 ? actual / estimated : actual > 0 ? 1 : 0;
    // Spend against a zero budget is unbudgeted spend: "over",
    // regardless of the fraction thresholds.
    const status: VarianceStatus =
      estimated === 0 && actual > 0 ? "over" : statusFor(usedFraction);
    return {
      category,
      estimated,
      actual,
      delta,
      deltaFraction: estimated > 0 ? delta / estimated : 0,
      usedFraction,
      status,
    };
  });

  return {
    categories: rows,
    totalEstimated,
    totalActual,
    totalDelta: totalActual - totalEstimated,
    totalUsedFraction:
      totalEstimated > 0
        ? totalActual / totalEstimated
        : totalActual > 0
          ? 1
          : 0,
    overBudget: totalActual > totalEstimated && totalEstimated > 0,
    unbudgetedCount,
  };
}

/** Clamp helper for progress bars (UI never passes raw fractions to CSS). */
export function clampFraction(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
