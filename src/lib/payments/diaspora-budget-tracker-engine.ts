/**
 * Diaspora Escrow & Cross-Border Inflation Budget Tracker Engine
 *
 * Financial & Exchange Rate calculations for diaspora sponsor funding vs local on-site execution.
 *
 * Mathematical Matrix:
 * 1. Live Parallel vs Official FX Rate Gap:
 *    ProjectCost_Foreign = sum(LocalQuantities * UnitCost) / ParallelMarketRate
 * 2. Time-Weighted Material Inflation Multiplier:
 *    ProjectedCost = BaseCost * (1 + R_inflation)^(t / 12)
 * 3. Deviation & Variance Tracking:
 *    tracks budgeted foreign deposit vs local procurement burn.
 */

export interface DiasporaBudgetInput {
  sponsorBaseBudgetForeign: number; // e.g. 15000 USD
  sponsorCurrency: string; // e.g. "USD", "GBP", "EUR"
  localCurrency: string; // e.g. "NGN", "KES", "GHS"
  parallelExchangeRate: number; // e.g. 1600 NGN per 1 USD
  officialExchangeRate?: number; // e.g. 1450 NGN per 1 USD (to quantify bank gap)
  annualInflationRatePercent?: number; // e.g. 24% annual building material inflation
  timelineMonths?: number; // e.g. 6 months forward projection
  milestones: Array<{
    name: string;
    allocatedForeign: number;
    spentLocal: number;
    completed: boolean;
  }>;
}

export interface DiasporaBudgetSummary {
  sponsorBudgetForeign: number;
  parallelExchangeRate: number;
  officialExchangeRate?: number;
  exchangeRateGapPercent?: number;
  totalSentForeign: number;
  remainingBudgetForeign: number;
  totalSpentLocal: number;
  equivalentSpentForeign: number;
  inflationMultiplier: number;
  inflationAdjustedProjectedForeign: number;
  materialDeviationPercent: number; // variance between budget progress and spent progress
  isOverBudget: boolean;
  summaryText: string;
}

/**
 * Calculates time-weighted inflation projection.
 * Formula: BaseCost * (1 + R_inflation)^(t / 12)
 */
export function calculateInflationBuffer(
  baseCost: number,
  annualInflationRatePercent: number,
  months: number,
): number {
  if (baseCost <= 0 || months <= 0) return baseCost;
  const r = annualInflationRatePercent / 100;
  const timeFactor = months / 12;
  const multiplier = Math.pow(1 + r, timeFactor);
  return Math.round(baseCost * multiplier * 100) / 100;
}

/**
 * Computes complete diaspora escrow overview, variance, FX spread savings, and forward inflation buffer.
 */
export function calculateDiasporaBudgetTracker(
  input: DiasporaBudgetInput,
): DiasporaBudgetSummary {
  const {
    sponsorBaseBudgetForeign,
    sponsorCurrency,
    localCurrency,
    parallelExchangeRate,
    officialExchangeRate,
    annualInflationRatePercent = 20,
    timelineMonths = 6,
    milestones,
  } = input;

  if (parallelExchangeRate <= 0) {
    throw new RangeError("Exchange rate must be a positive number.");
  }

  const totalSentForeign = milestones.reduce((sum, m) => sum + (m.completed ? m.allocatedForeign : 0), 0);
  const remainingBudgetForeign = Math.max(0, sponsorBaseBudgetForeign - totalSentForeign);
  const totalSpentLocal = milestones.reduce((sum, m) => sum + m.spentLocal, 0);

  // Convert spent local back to foreign using parallel market rate
  const equivalentSpentForeign = Math.round((totalSpentLocal / parallelExchangeRate) * 100) / 100;

  // Rate gap
  let exchangeRateGapPercent: number | undefined;
  if (officialExchangeRate && officialExchangeRate > 0) {
    exchangeRateGapPercent = Math.round(((parallelExchangeRate - officialExchangeRate) / officialExchangeRate) * 1000) / 10;
  }

  // Inflation buffer forward projection
  const r = annualInflationRatePercent / 100;
  const timeFactor = timelineMonths / 12;
  const inflationMultiplier = Math.round(Math.pow(1 + r, timeFactor) * 1000) / 1000;
  const inflationAdjustedProjectedForeign = Math.round(sponsorBaseBudgetForeign * inflationMultiplier * 100) / 100;

  // Material deviation: difference between local spend in foreign terms vs foreign allocated for completed work
  const varianceForeign = equivalentSpentForeign - totalSentForeign;
  const materialDeviationPercent = totalSentForeign > 0
    ? Math.round((varianceForeign / totalSentForeign) * 1000) / 10
    : 0;

  const isOverBudget = equivalentSpentForeign > sponsorBaseBudgetForeign;

  const summaryText = `Budget ${sponsorBaseBudgetForeign.toLocaleString()} ${sponsorCurrency} tracked against ${localCurrency} at parallel rate ${parallelExchangeRate.toLocaleString()}. Sent: ${totalSentForeign.toLocaleString()} ${sponsorCurrency}, Spent on-site: ${totalSpentLocal.toLocaleString()} ${localCurrency} (${equivalentSpentForeign.toLocaleString()} ${sponsorCurrency} equivalent). Material deviation: ${materialDeviationPercent >= 0 ? "+" : ""}${materialDeviationPercent}%.`;

  return {
    sponsorBudgetForeign: sponsorBaseBudgetForeign,
    parallelExchangeRate,
    officialExchangeRate,
    exchangeRateGapPercent,
    totalSentForeign,
    remainingBudgetForeign,
    totalSpentLocal,
    equivalentSpentForeign,
    inflationMultiplier,
    inflationAdjustedProjectedForeign,
    materialDeviationPercent,
    isOverBudget,
    summaryText,
  };
}
