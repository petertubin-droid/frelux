/**
 * FRELUX Estimate Refresh Engine (Future Engine 6, part 2 —
 * "Inflation-Proof Estimating")
 *
 * Deterministic "current cost today" refresh for saved estimates.
 *
 * Saved estimate items already snapshot the price they were
 * quoted at (price_snapshot: price_type, ref_id, unit_price,
 * effective_date). This engine compares each item's snapshot
 * against TODAY'S active price for the same reference and
 * produces the refreshed total — so an old quote stays honest
 * as prices move.
 *
 * Philosophy (unchanged): the engine never guesses.
 * - No current price for an item → the line stays at its
 *   snapshot price, clearly flagged. It is never silently
 *   inflated, deflated, or carried forward.
 * - No currency conversion is ever performed. A current price
 *   in a different currency is ignored (with a warning), and
 *   the line stays at its snapshot price.
 * - Percent deltas are computed only from finite, non-zero
 *   bases; a zero base yields null, never a fake number.
 */

import type { EstimationCalcRule } from "@/types/estimation";

// ─────────────────────────────────────────────
// Contracts
// ─────────────────────────────────────────────

export interface RefreshItemInput {
  item_id: string;
  item_name: string;
  quantity: number;
  unit: string;
  /** Price the item was saved at (from price_snapshot, or the item's stored unit_price as a fallback) */
  snapshot_unit_price: number;
  snapshot_currency: string | null;
  snapshot_effective_date: string | null;
  /** Where to find today's price — from the item's price_snapshot; null = unrefreshable */
  price_type: string | null;
  ref_id: string | null;
}

export interface CurrentPriceRef {
  price: number;
  currency: string | null;
  effective_date: string | null;
}

export interface RefreshInput {
  estimate_ref: string;
  currency: string;
  items: RefreshItemInput[];
  /** Today's active prices, keyed `${price_type}:${ref_id}` */
  currentPrices: Record<string, CurrentPriceRef>;
  /** Active calc rules (calculator_type = 'estimate_refresh') */
  rules: EstimationCalcRule[];
}

export type LinePriceStatus =
  | "unchanged"
  | "price_changed"
  | "no_current_price"
  | "currency_mismatch"
  | "no_price_reference";

export interface RefreshedLine {
  item_id: string;
  item_name: string;
  quantity: number;
  unit: string;
  snapshot_unit_price: number;
  current_unit_price: number | null;
  price_status: LinePriceStatus;
  line_total_then: number;
  line_total_today: number;
  delta: number;
  delta_percent: number | null;
  current_effective_date: string | null;
  currency_mismatch: boolean;
}

export interface RefreshResult {
  ok: boolean;
  estimate_ref: string | null;
  currency: string | null;
  lines: RefreshedLine[];
  total_then: number;
  total_today: number;
  delta: number;
  delta_percent: number | null;
  changed_count: number;
  unchanged_count: number;
  missing_count: number;
  warnings: string[];
  steps: { label: string; detail: string }[];
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function roundMoney(v: number): number {
  return Math.round(v * 100) / 100;
}

function ruleDecimals(rules: EstimationCalcRule[]): number {
  const r = rules.find(
    (x) => x.rule_key === "rounding_decimals" && x.is_active !== false,
  );
  const v = Number((r?.rule_value as Record<string, unknown> | null)?.value);
  return Number.isFinite(v) ? Math.max(0, Math.min(6, Math.trunc(v))) : 2;
}

function priceKey(priceType: string, refId: string): string {
  return `${priceType}:${refId}`;
}

// ─────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────

export function refreshEstimate(input: RefreshInput): RefreshResult {
  const result: RefreshResult = {
    ok: false,
    estimate_ref: null,
    currency: null,
    lines: [],
    total_then: 0,
    total_today: 0,
    delta: 0,
    delta_percent: null,
    changed_count: 0,
    unchanged_count: 0,
    missing_count: 0,
    warnings: [],
    steps: [],
  };

  // ── 1. Validation ──
  const ref = input.estimate_ref?.trim();
  if (!ref) {
    result.warnings.push(
      "An estimate must be selected — the engine never refreshes without one.",
    );
    return result;
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    result.warnings.push(
      "The selected estimate has no line items, so there is nothing to refresh.",
    );
    return result;
  }
  const decimals = ruleDecimals(input.rules);
  void decimals; // money is always 2dp; the rule governs any finer display elsewhere

  // ── 2. Per-item refresh: today's price only when it genuinely exists ──
  let totalThen = 0;
  let totalToday = 0;

  for (const item of input.items) {
    const qty = Number(item.quantity);
    const snapPrice = Number(item.snapshot_unit_price);

    if (!Number.isFinite(qty) || qty <= 0) {
      result.warnings.push(
        `Line '${item.item_name}' has an invalid quantity and was excluded — the engine does not refresh malformed lines.`,
      );
      continue;
    }
    if (!Number.isFinite(snapPrice) || snapPrice < 0) {
      result.warnings.push(
        `Line '${item.item_name}' has an invalid stored price and was excluded — the engine does not refresh malformed lines.`,
      );
      continue;
    }

    const lineThen = roundMoney(qty * snapPrice);
    totalThen += lineThen;

    // Look up today's price — only via a real (price_type, ref_id) reference
    let currentPrice: number | null = null;
    let status: LinePriceStatus;
    let currentEffective: string | null = null;
    let currencyMismatch = false;

    if (item.price_type && item.ref_id) {
      const cur =
        input.currentPrices?.[priceKey(item.price_type, item.ref_id)] ?? null;
      if (cur && Number.isFinite(Number(cur.price)) && Number(cur.price) > 0) {
        // Never convert currencies — a mismatched price is not a price for this quote
        if (input.currency && cur.currency && cur.currency !== input.currency) {
          status = "currency_mismatch";
          currencyMismatch = true;
          result.warnings.push(
            `Today's price for '${item.item_name}' is in ${cur.currency}, not ${input.currency} — the line stays at its snapshot price. FRELUX never applies an exchange rate.`,
          );
        } else {
          currentPrice = Number(cur.price);
          currentEffective = cur.effective_date ?? null;
          status =
            Math.abs(currentPrice - snapPrice) < 0.005
              ? "unchanged"
              : "price_changed";
          if (status === "price_changed") {
            result.steps.push({
              label: `Price change — ${item.item_name}`,
              detail: `Snapshot ${snapPrice} → today ${currentPrice} (${input.currency}), effective ${currentEffective ?? "unknown date"} — from the active configured price, never a guess.`,
            });
          }
        }
      } else {
        status = "no_current_price";
        result.warnings.push(
          `No active price is configured today for '${item.item_name}' (${item.price_type} ${item.ref_id}) — the line stays at its snapshot price ${snapPrice}. FRELUX never extrapolates a missing price.`,
        );
      }
    } else {
      status = "no_price_reference";
      result.warnings.push(
        `Line '${item.item_name}' has no price reference in its snapshot — it cannot be refreshed and stays at its stored price.`,
      );
    }

    const priceForToday = currentPrice !== null ? currentPrice : snapPrice;
    const lineToday = roundMoney(qty * priceForToday);
    totalToday += lineToday;

    if (status === "price_changed") result.changed_count += 1;
    else if (status === "unchanged") result.unchanged_count += 1;
    else result.missing_count += 1;

    const delta = roundMoney(lineToday - lineThen);
    const deltaPercent =
      lineThen > 0
        ? roundMoney(((lineToday - lineThen) / lineThen) * 100)
        : null;

    result.lines.push({
      item_id: item.item_id,
      item_name: item.item_name,
      quantity: qty,
      unit: item.unit,
      snapshot_unit_price: snapPrice,
      current_unit_price: currentPrice,
      price_status: status,
      line_total_then: lineThen,
      line_total_today: lineToday,
      delta,
      delta_percent: deltaPercent,
      current_effective_date: currentEffective,
      currency_mismatch: currencyMismatch,
    });
  }

  // ── 3. Totals and the honest delta ──
  result.total_then = roundMoney(totalThen);
  result.total_today = roundMoney(totalToday);
  result.delta = roundMoney(totalToday - totalThen);
  result.delta_percent =
    result.total_then > 0
      ? roundMoney((result.delta / result.total_then) * 100)
      : null;

  if (result.lines.length === 0) {
    result.warnings.push("No valid lines remained to refresh.");
    return result;
  }

  result.ok = true;
  result.estimate_ref = ref;
  result.currency = input.currency || null;
  result.steps.push({
    label: "Totals",
    detail: `Quoted ${result.total_then} ${result.currency ?? ""} → current cost today ${result.total_today} ${result.currency ?? ""} (${result.delta >= 0 ? "+" : ""}${result.delta}, ${result.delta_percent !== null ? `${result.delta_percent}%` : "percentage not computable"}). ${result.missing_count} line${result.missing_count === 1 ? "" : "s"} stayed at their snapshot price because no current price exists — they are flagged, never guessed.`,
  });

  return result;
}
