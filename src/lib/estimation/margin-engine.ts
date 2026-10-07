/**
 * FRELUX Profit Margin & Markup Engine (Future Engine 8)
 *
 * Deterministic client price and profit from a base cost and
 * an admin-configured margin preset, with the markup-vs-
 * margin distinction made explicit.
 *
 * Philosophy (unchanged): the basis is explicit on every preset
 * and shown in every breakdown step. VAT is added only from a
 * configured rule - never invented - and a missing VAT rule
 * produces a warning and no line, never a guess.
 */

import type { EstimationCalcRule } from "@/types/estimation";

// ─────────────────────────────────────────────
// Contracts
// ─────────────────────────────────────────────

export type MarginBasis = "markup_on_cost" | "margin_on_price";

export interface MarginInput {
  /** Base cost of the work (naira) */
  base_cost: number;
  /** Margin percent (> 0) */
  margin_percent: number;
  /** Explicit basis - never guessed */
  basis: MarginBasis;
  /** Active calc rules (calculator_type = 'margin') */
  rules: EstimationCalcRule[];
}

export interface MarginResult {
  ok: boolean;
  basis: MarginBasis | null;
  base_cost: number | null;
  margin_percent: number | null;
  profit: number | null;
  /** Price before VAT (cost + profit) */
  priced_subtotal: number | null;
  /** The equivalent percent the other basis would produce - informational only */
  equivalent_other_basis_percent: number | null;
  vat_rate: number | null;
  vat_amount: number | null;
  quote_total: number | null;
  warnings: string[];
  steps: { label: string; detail: string }[];
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function roundTo(v: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(v * f) / f;
}

function ruleNumber(rules: EstimationCalcRule[], key: string): number | null {
  const r = rules.find((x) => x.rule_key === key && x.is_active !== false);
  const v = Number((r?.rule_value as Record<string, unknown> | null)?.value);
  return r && Number.isFinite(v) ? v : null;
}

// ─────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────

export function calculateMargin(input: MarginInput): MarginResult {
  const result: MarginResult = {
    ok: false,
    basis: null,
    base_cost: null,
    margin_percent: null,
    profit: null,
    priced_subtotal: null,
    equivalent_other_basis_percent: null,
    vat_rate: null,
    vat_amount: null,
    quote_total: null,
    warnings: [],
    steps: [],
  };

  // ── 1. Validate the inputs ──
  const cost = Number(input.base_cost);
  const marginPercent = Number(input.margin_percent);

  if (!Number.isFinite(cost) || cost <= 0) {
    result.warnings.push(
      "Base cost must be a positive number: the engine never prices a zero or invalid cost.",
    );
    return result;
  }
  if (!Number.isFinite(marginPercent) || marginPercent <= 0) {
    result.warnings.push(
      "Margin percent must be positive: the engine never prices at or below cost without an explicit percent.",
    );
    return result;
  }

  const basis: MarginBasis = input.basis;
  if (basis !== "markup_on_cost" && basis !== "margin_on_price") {
    result.warnings.push(
      "Margin basis must be 'markup_on_cost' or 'margin_on_price': the engine never guesses which one you meant.",
    );
    return result;
  }

  // margin_on_price: percent must be < 100 or the price is undefined
  if (basis === "margin_on_price" && marginPercent >= 100) {
    result.warnings.push(
      "A margin-on-price percent of 100 or more is mathematically impossible (price would be undefined): the line was refused.",
    );
    return result;
  }

  const decimals = Math.max(
    0,
    Math.min(6, ruleNumber(input.rules, "rounding_decimals") ?? 2),
  );

  // ── 2. Deterministic pricing chain - every step labelled with its basis ──
  let profit: number;
  let subtotal: number;

  if (basis === "markup_on_cost") {
    // profit = cost × %, price = cost + profit
    profit = roundTo((cost * marginPercent) / 100, decimals);
    subtotal = roundTo(cost + profit, decimals);
    result.steps.push({
      label: "Markup on cost",
      detail: `₦${cost.toLocaleString()} × ${marginPercent}% = ₦${profit.toLocaleString()} profit (markup on cost: the percent applies to the COST).`,
    });
  } else {
    // price = cost ÷ (1 − %), profit = price − cost
    subtotal = roundTo(cost / (1 - marginPercent / 100), decimals);
    profit = roundTo(subtotal - cost, decimals);
    result.steps.push({
      label: "Margin on price",
      detail: `₦${cost.toLocaleString()} ÷ (1 − ${marginPercent}%) = ₦${subtotal.toLocaleString()} price (margin on price: the percent applies to the PRICE), profit ₦${profit.toLocaleString()}.`,
    });
  }

  // Informational cross-check: the same money as the other basis would need
  const equivalent =
    basis === "markup_on_cost"
      ? roundTo((profit / subtotal) * 100, decimals) // markup expressed as margin-on-price
      : roundTo((profit / cost) * 100, decimals); // margin-on-price expressed as markup

  // ── 3. VAT only from a configured rule - never invented ──
  let vatRate = ruleNumber(input.rules, "vat_rate");
  let vatAmount: number | null = null;
  let quoteTotal = subtotal;

  if (vatRate !== null && (vatRate < 0 || vatRate >= 100)) {
    vatRate = null;
    result.warnings.push(
      "The configured VAT rate was outside 0–99 and was ignored: invalid configuration is never silently applied. The quote is produced without a VAT line.",
    );
  }
  if (vatRate === null) {
    result.warnings.push(
      "No VAT rate is configured (Admin → Estimation Config & Rules → vat_rate for margin). The quote is produced without a VAT line rather than guessing one.",
    );
  } else {
    vatAmount = roundTo((subtotal * vatRate) / 100, decimals);
    quoteTotal = roundTo(subtotal + vatAmount, decimals);
    result.steps.push({
      label: "VAT",
      detail:
        vatAmount > 0
          ? `₦${subtotal.toLocaleString()} × ${vatRate}% = ₦${vatAmount.toLocaleString()} VAT (configured rate, never guessed).`
          : `Configured VAT rate is 0%: no VAT line.`,
    });
  }

  result.steps.push({
    label: "Quote total",
    detail: `₦${quoteTotal.toLocaleString()} (payable by the client).`,
  });

  result.ok = true;
  result.basis = basis;
  result.base_cost = roundTo(cost, decimals);
  result.margin_percent = marginPercent;
  result.profit = profit;
  result.priced_subtotal = subtotal;
  result.equivalent_other_basis_percent = equivalent;
  result.vat_rate = vatRate;
  result.vat_amount = vatAmount;
  result.quote_total = quoteTotal;

  return result;
}
