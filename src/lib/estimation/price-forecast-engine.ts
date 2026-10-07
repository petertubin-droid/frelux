/**
 * FRELUX Material Price Forecasting Engine (Future Engine 4)
 *
 * Trend-aware price projections built ONLY from recorded price
 * history (material_price_history). The engine runs a
 * deterministic least-squares linear regression over the
 * recorded points and projects the fitted trend forward.
 *
 * Philosophy (unchanged): the engine never invents inflation
 * rates or market guesses. It refuses when history is too thin,
 * clamps the horizon to the configured maximum, and warns on
 * short histories - every projection is traceable to recorded
 * prices.
 */

import type { EstimationCalcRule } from "@/types/estimation";

// ─────────────────────────────────────────────
// Contracts
// ─────────────────────────────────────────────

export interface ForecastPoint {
  /** ISO date of the recorded price */
  date: string;
  price: number;
}

export interface PriceForecastInput {
  /** Recorded price points (any order; engine sorts chronologically) */
  history: ForecastPoint[];
  /** Projection horizon in months */
  horizon_months: number;
  /** Active calc rules (calculator_type = 'price_forecast') */
  rules: EstimationCalcRule[];
}

export interface PriceForecastResult {
  ok: boolean;
  current_price: number | null;
  projected_price: number | null;
  /** Projected price is clamped at 0 - prices don't go negative */
  horizon_months: number | null;
  /** Mean absolute monthly change of the fitted trend */
  monthly_change: number | null;
  monthly_change_percent: number | null;
  trend: "rising" | "falling" | "flat" | null;
  history_points: number;
  history_span_days: number | null;
  warnings: string[];
  steps: { label: string; detail: string }[];
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

function ruleNumber(
  rules: EstimationCalcRule[],
  key: string,
  fallback: number,
): number {
  const r = rules.find((x) => x.rule_key === key && x.is_active !== false);
  const v = Number((r?.rule_value as Record<string, unknown> | null)?.value);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

function money(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * Least-squares linear regression over (days, price).
 * Returns slope (price per day) and intercept.
 */
function linearFit(points: { t: number; y: number }[]): {
  slope: number;
  intercept: number;
} {
  const n = points.length;
  const sumT = points.reduce((s, p) => s + p.t, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumTT = points.reduce((s, p) => s + p.t * p.t, 0);
  const sumTY = points.reduce((s, p) => s + p.t * p.y, 0);
  const denom = n * sumTT - sumT * sumT;
  const slope = denom === 0 ? 0 : (n * sumTY - sumT * sumY) / denom;
  const intercept = (sumY - slope * sumT) / n;
  return { slope, intercept };
}

// ─────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────

export function forecastMaterialPrice(
  input: PriceForecastInput,
): PriceForecastResult {
  const result: PriceForecastResult = {
    ok: false,
    current_price: null,
    projected_price: null,
    horizon_months: null,
    monthly_change: null,
    monthly_change_percent: null,
    trend: null,
    history_points: 0,
    history_span_days: null,
    warnings: [],
    steps: [],
  };

  // ── 1. Normalise history: chronological, valid points only ──
  const points = input.history
    .filter((h) => Number.isFinite(h.price) && h.price >= 0 && h.date)
    .map((h) => ({
      date: h.date,
      price: Number(h.price),
      ts: Date.parse(h.date),
    }))
    .filter((h) => Number.isFinite(h.ts))
    .sort((a, b) => a.ts - b.ts);
  result.history_points = points.length;

  const minPoints = ruleNumber(input.rules, "min_history_points", 3);
  if (points.length < minPoints) {
    result.warnings.push(
      `Only ${points.length} recorded price point${points.length === 1 ? "" : "s"}: at least ${minPoints} are required for a forecast. The engine does not guess a trend from thin history.`,
    );
    return result;
  }

  const horizonWanted = Number(input.horizon_months);
  if (!Number.isFinite(horizonWanted) || horizonWanted <= 0) {
    result.warnings.push(
      "Forecast horizon must be a positive number of months.",
    );
    return result;
  }

  const maxMonths = ruleNumber(input.rules, "max_forecast_months", 12);
  const horizon = Math.min(horizonWanted, maxMonths);
  if (horizonWanted > maxMonths) {
    result.warnings.push(
      `Requested horizon ${horizonWanted} months exceeds the configured maximum: the forecast was clamped to ${maxMonths} months.`,
    );
  }
  result.horizon_months = horizon;

  const current = points[points.length - 1];
  result.current_price = money(current.price);

  // ── 2. History span (for confidence warnings) ──
  const lastTs = points[points.length - 1].ts;
  const firstTs = points[0].ts;
  const spanDays = Math.round((lastTs - firstTs) / DAY_MS);
  result.history_span_days = spanDays;
  const shortDays = ruleNumber(input.rules, "short_history_days", 30);
  if (spanDays < shortDays) {
    result.warnings.push(
      `Recorded history spans only ${spanDays} day${spanDays === 1 ? "" : "s"}: this is a short series, treat the projection as low confidence.`,
    );
  }

  // ── 3. Deterministic least-squares fit over days since first point ──
  const fitPoints = points.map((p) => ({
    t: (p.ts - firstTs) / DAY_MS,
    y: p.price,
  }));
  const { slope, intercept } = linearFit(fitPoints);

  // ── 4. Project the fitted trend to the horizon ──
  const currentDay = (lastTs - firstTs) / DAY_MS;
  const futureDay = currentDay + horizon * (365.25 / 12);
  let projected = intercept + slope * futureDay;
  // Prices never go negative - clamp at 0 with a warning, never a silent guess.
  if (projected < 0) {
    projected = 0;
    result.warnings.push(
      "The fitted trend falls below zero at this horizon: the projection was clamped to 0. Treat a long-term falling trend with caution.",
    );
  }
  projected = money(projected);
  result.projected_price = projected;

  const change = projected - current.price;
  const monthlyChange = money((slope * 365.25) / 12);
  result.monthly_change = monthlyChange;
  result.monthly_change_percent = money((monthlyChange / current.price) * 100);
  result.trend =
    Math.abs(slope) < 1e-9 ? "flat" : slope > 0 ? "rising" : "falling";

  result.steps.push({
    label: "Fitted trend",
    detail: `Least-squares fit over ${points.length} recorded points (${spanDays} days): ${monthlyChange >= 0 ? "+" : ""}${monthlyChange}/month (${result.monthly_change_percent}%).`,
  });
  result.steps.push({
    label: "Projection",
    detail: `Trend projected ${horizon} month${horizon === 1 ? "" : "s"} forward from ${money(current.price)} → ${projected} (${change >= 0 ? "+" : ""}${money(change)}).`,
  });
  result.steps.push({
    label: "Basis",
    detail:
      "Projection is computed ONLY from recorded price history: no external inflation or market assumptions are applied.",
  });

  result.ok = true;
  return result;
}
