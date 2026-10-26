/**
 * FRELUX BOQ / Quote Generator Engine (Future Engine 2)
 *
 * Deterministic Bill of Quantities assembly from saved estimates.
 *
 * Philosophy (unchanged): the engine never guesses. Commercial
 * rates (VAT, contingency) come from estimation_calc_rules
 * (admin-editable). A quote without configured rates is produced
 * without those lines plus a warning - never with an assumed rate.
 * Every line item carries its source reference, so a quote is
 * replayable and auditable end-to-end.
 */

import { formatByCode } from "@/lib/international/currency-format";
import { SITE_URL } from "@/lib/seo";
import type { EstimationCalcRule } from "@/types/estimation";

// ─────────────────────────────────────────────
// Input / output contracts
// ─────────────────────────────────────────────

/** Quote-currency money formatting — never a single-market default. */
function fmt(currency: string, amount: number): string {
  return formatByCode(amount || 0, currency || "XXX", { decimals: 0 });
}

export interface BoqLineItem {
  description: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  /** Where this line came from: an estimate ref or 'manual entry' */
  source_estimate_ref: string;
  source_calculator_type?: string | null;
}

export interface BoqInput {
  title: string;
  client_name: string;
  client_contact?: string | null;
  project_location?: string | null;
  currency: string;
  items: BoqLineItem[];
  /** Active calc rules loaded from the database (calculator_type = 'boq') */
  rules: EstimationCalcRule[];
  /** Admin-overrides applied at generation time; when provided they
   *  replace the DB defaults and are recorded in rates_snapshot. */
  contingency_override?: number | null;
  vat_override?: number | null;
  /**
   * Audit fix F10 (2026-10-26): market volatility buffer for FX-sensitive
   * materials (cement, rebar, copper) in volatile markets. 0-25%. Kept as
   * its OWN transparent line — never folded silently into contingency.
   */
  volatility_buffer_pct?: number | null;
  /**
   * Audit fix F10: the effective date of the price snapshot the items
   * were priced from (e.g. the oldest imported estimate's created_at).
   * When provided, the result carries a staleness classification
   * (fresh ≤14d / aging 15-45d / stale >45d) with an explicit advisory.
   */
  price_date?: string | null;
}

export interface BoqTotals {
  subtotal: number;
  contingency_rate: number | null;
  contingency_amount: number | null;
  volatility_buffer_pct: number | null;
  volatility_amount: number | null;
  vat_rate: number | null;
  vat_amount: number | null;
  grand_total: number;
}

export interface BoqResult {
  ok: boolean;
  totals: BoqTotals | null;
  /** F10: staleness classification of the underlying price snapshot. */
  price_staleness: {
    status: "fresh" | "aging" | "stale";
    days_old: number;
    label: string;
    advisory: string | null;
  } | null;
  line_totals: { item: BoqLineItem; line_total: number }[];
  warnings: string[];
  steps: { label: string; detail: string }[];
  rates_snapshot: Record<string, unknown> | null;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function money(v: number): number {
  return Math.round(v * 100) / 100;
}

function ruleRate(rules: EstimationCalcRule[], key: string): number | null {
  const rule = rules.find((r) => r.rule_key === key && r.is_active !== false);
  if (!rule) return null;
  const rate = Number(
    (rule.rule_value as Record<string, unknown> | null)?.rate,
  );
  return Number.isFinite(rate) && rate >= 0 ? rate : null;
}

// ─────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────

export function generateBoq(input: BoqInput): BoqResult {
  const result: BoqResult = {
    ok: false,
    totals: null,
    price_staleness: null,
    line_totals: [],
    warnings: [],
    steps: [],
    rates_snapshot: null,
  };

  // ── 0. Validation ──
  if (!input.title.trim()) {
    result.warnings.push("A quote title is required.");
    return result;
  }
  if (!input.client_name.trim()) {
    result.warnings.push("A client name is required.");
    return result;
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    result.warnings.push(
      "A quote needs at least one line item. Import saved estimates or add manual lines.",
    );
    return result;
  }

  // ── 1. Line items (deterministic: quantity × unit cost, 2dp) ──
  const line_totals: { item: BoqLineItem; line_total: number }[] = [];
  for (const item of input.items) {
    if (!item.description?.trim()) {
      result.warnings.push("Every line item needs a description.");
      return result;
    }
    const q = Number(item.quantity);
    const uc = Number(item.unit_cost);
    if (!Number.isFinite(q) || q <= 0) {
      result.warnings.push(
        `Quantity for '${item.description}' must be a positive number.`,
      );
      return result;
    }
    if (!Number.isFinite(uc) || uc < 0) {
      result.warnings.push(
        `Unit cost for '${item.description}' must be zero or positive.`,
      );
      return result;
    }
    if (!item.source_estimate_ref?.trim()) {
      result.warnings.push(
        `Line '${item.description}' has no source reference: every BOQ line must be traceable to its estimate.`,
      );
      return result;
    }
    line_totals.push({ item, line_total: money(q * uc) });
  }
  result.line_totals = line_totals;

  // ── 2. Subtotal ──
  const subtotal = money(line_totals.reduce((s, l) => s + l.line_total, 0));
  result.steps.push({
    label: "Subtotal",
    detail: `${line_totals.length} line item(s) sum to ${fmt(input.currency, subtotal)}.`,
  });

  // ── 3. Contingency (DB-configured default or explicit override; never guessed) ──
  const contingencyRate =
    input.contingency_override !== null &&
    input.contingency_override !== undefined
      ? input.contingency_override
      : ruleRate(input.rules, "contingency_rate");
  if (
    contingencyRate !== null &&
    (contingencyRate < 0 || contingencyRate >= 100)
  ) {
    result.warnings.push("Contingency rate must be between 0 and 100.");
    return result;
  }
  if (contingencyRate === null) {
    result.warnings.push(
      "No contingency rate is configured (Admin → Estimation Config & Rules → contingency_rate for BOQ). " +
        "The quote is produced without a contingency line rather than guessing one.",
    );
  }
  const contingencyAmount =
    contingencyRate !== null && contingencyRate > 0
      ? money((subtotal * contingencyRate) / 100)
      : contingencyRate === 0
        ? 0
        : null;
  if (contingencyRate !== null) {
    result.steps.push({
      label: "Contingency",
      detail: contingencyAmount
        ? `${contingencyRate}% of subtotal = ${fmt(input.currency, contingencyAmount)}.`
        : `Configured rate is 0%: no contingency line.`,
    });
  }

  // ── 3b. Market volatility buffer (audit fix F10) ──
  // Optional, user-set 0-25%: a separate transparent line for FX-sensitive
  // materials in volatile markets — never folded into contingency silently.
  let volatilityRate: number | null = null;
  let volatilityAmount: number | null = null;
  const requestedVolatility = input.volatility_buffer_pct ?? null;
  if (requestedVolatility !== null) {
    if (requestedVolatility < 0 || requestedVolatility > 25) {
      result.warnings.push(
        "Market volatility buffer must be between 0% and 25%: the quote was generated without it.",
      );
    } else if (requestedVolatility > 0) {
      volatilityRate = requestedVolatility;
      volatilityAmount = money((subtotal * requestedVolatility) / 100);
      result.steps.push({
        label: "Market volatility buffer",
        detail: `${requestedVolatility}% of subtotal ${fmt(input.currency, subtotal)} = ${fmt(input.currency, volatilityAmount)} (FX-sensitive materials contingency).`,
      });
    } else {
      volatilityRate = 0;
      volatilityAmount = 0;
    }
  }

  // ── 4. VAT (DB-configured default or explicit override; never guessed) ──
  const baseForVat =
    subtotal + (contingencyAmount ?? 0) + (volatilityAmount ?? 0);
  const vatRate =
    input.vat_override !== null && input.vat_override !== undefined
      ? input.vat_override
      : ruleRate(input.rules, "vat_rate");
  if (vatRate !== null && (vatRate < 0 || vatRate >= 100)) {
    result.warnings.push("VAT rate must be between 0 and 100.");
    return result;
  }
  if (vatRate === null) {
    result.warnings.push(
      "No VAT rate is configured (Admin → Estimation Config & Rules → vat_rate for BOQ). " +
        "The quote is produced without a VAT line rather than guessing one.",
    );
  }
  const vatAmount =
    vatRate !== null && vatRate > 0
      ? money((baseForVat * vatRate) / 100)
      : vatRate === 0
        ? 0
        : null;
  if (vatRate !== null) {
    result.steps.push({
      label: "VAT",
      detail: vatAmount
        ? `${vatRate}% of ${fmt(input.currency, baseForVat)} = ${fmt(input.currency, vatAmount)}.`
        : `Configured rate is 0%: no VAT line.`,
    });
  }

  // ── 5. Grand total ──
  const grandTotal = money(baseForVat + (vatAmount ?? 0));
  result.steps.push({
    label: "Grand total",
    detail: `${fmt(input.currency, grandTotal)} (payable by ${input.client_name}).`,
  });

  result.totals = {
    subtotal,
    contingency_rate: contingencyRate,
    contingency_amount: contingencyAmount,
    volatility_buffer_pct: volatilityRate,
    volatility_amount: volatilityAmount,
    vat_rate: vatRate,
    vat_amount: vatAmount,
    grand_total: grandTotal,
  };

  // ── Price staleness (audit fix F10) ──
  if (input.price_date) {
    const daysOld = Math.max(
      0,
      Math.floor(
        (Date.now() - new Date(input.price_date).getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );
    let status: "fresh" | "aging" | "stale";
    let advisory: string | null = null;
    if (daysOld <= 14) {
      status = "fresh";
    } else if (daysOld <= 45) {
      status = "aging";
      advisory =
        "Price snapshot is over 14 days old. High-inflation materials (cement, rebar) may have moved.";
    } else {
      status = "stale";
      advisory =
        "Price snapshot is over 45 days old. Run /estimate-refresh before committing this quote.";
    }
    result.price_staleness = {
      status,
      days_old: daysOld,
      label: `Price snapshot ${daysOld}d old`,
      advisory,
    };
    result.steps.push({
      label: "Price staleness",
      detail: `${status.toUpperCase()}: the price snapshot behind this quote is ${daysOld} day(s) old.${advisory ? " " + advisory : ""}`,
    });
    if (status !== "fresh") {
      result.warnings.push(
        `PRICE STALENESS (${status.toUpperCase()}): the snapshot is ${daysOld} day(s) old.${advisory ? " " + advisory : ""}`,
      );
    }
  }
  result.rates_snapshot = {
    contingency_rate: contingencyRate,
    vat_rate: vatRate,
    volatility_buffer_pct: volatilityRate,
    contingency_source:
      input.contingency_override !== null &&
      input.contingency_override !== undefined
        ? "override"
        : contingencyRate !== null
          ? "calc_rules"
          : null,
    vat_source:
      input.vat_override !== null && input.vat_override !== undefined
        ? "override"
        : vatRate !== null
          ? "calc_rules"
          : null,
  };
  result.ok = true;
  return result;
}

/** Builds a printable client-ready BOQ document (used by the page's PDF export). */
export function boqToHtml(
  input: BoqInput,
  result: BoqResult,
  quoteRef: string,
): string {
  const t = result.totals!;
  const rows = result.line_totals
    .map(
      (l, i) =>
        `<tr><td>${i + 1}</td><td>${l.item.description}<br/><small>Source: ${l.item.source_estimate_ref}</small></td><td>${l.item.quantity.toLocaleString()} ${l.item.unit}</td><td>${fmt(input.currency, l.item.unit_cost)}</td><td><b>${fmt(input.currency, l.line_total)}</b></td></tr>`,
    )
    .join("");
  const optLine = (
    label: string,
    rate: number | null,
    amount: number | null,
  ) =>
    rate === null || amount === null
      ? ""
      : `<tr><td colspan="4">${label} (${rate}%)</td><td>${fmt(input.currency, amount)}</td></tr>`;
  return `<!DOCTYPE html><html><head><title>BOQ ${quoteRef}: ${input.title}</title><style>
    body{font-family:system-ui,sans-serif;padding:32px;color:#111}
    .doc-head{display:flex;align-items:center;gap:14px;border-bottom:3px solid #7C3AED;padding-bottom:14px}
    .doc-head img{width:44px;height:44px;border-radius:8px}
    .doc-head h1{font-size:20px;margin:0;letter-spacing:1px}h2{font-size:13px;font-weight:600;margin-top:4px;color:#555}
    .biz{margin-left:auto;text-align:right;font-size:10px;line-height:1.5;color:#555}
    .meta{display:flex;justify-content:space-between;margin-top:20px;font-size:12px}
    table{width:100%;border-collapse:collapse;font-size:12px;margin-top:16px}
    th,td{border:1px solid #ddd;padding:7px 9px;text-align:left;vertical-align:top}
    th{background:#f5f5f5}
    .grand td{background:#111;color:#fff;font-weight:700}
    .warn{font-size:10px;color:#b45309;margin-top:12px}
    .disclaimer{font-size:9.5px;color:#777;margin-top:18px;border-top:1px solid #ddd;padding-top:10px;line-height:1.6}
    .disclaimer b{color:#555}
    @media print{body{padding:12px}}
  </style></head><body>
    <div class="doc-head">
      <img src="${SITE_URL}/logo-mark.png" alt="FRELUX logo" onerror="this.remove()"/>
      <div>
        <h1>FRELUX</h1>
        <h2>Bill of Quantities: ${input.title}</h2>
      </div>
      <div class="biz">
        <b>FRELUX SMART CALC</b><br/>
        WhatsApp: +234 906 361 2439<br/>
        Email: frenzyanthony39@gmail.com
      </div>
    </div>
    <div class="meta">
      <div><b>Quote Ref:</b> ${quoteRef}<br/><b>Client:</b> ${input.client_name}${input.client_contact ? `<br/><b>Contact:</b> ${input.client_contact}` : ""}</div>
      <div>${input.project_location ? `<b>Project:</b> ${input.project_location}<br/>` : ""}<b>Date:</b> ${new Date().toISOString().slice(0, 10)}</div>
    </div>
    <table>
      <tr><th>#</th><th>Description</th><th>Qty</th><th>Unit cost</th><th>Amount</th></tr>
      ${rows}
      <tr><td colspan="4">Subtotal</td><td><b>${fmt(input.currency, t.subtotal)}</b></td></tr>
      ${optLine("Contingency", t.contingency_rate, t.contingency_amount)}
      ${optLine("VAT", t.vat_rate, t.vat_amount)}
      <tr class="grand"><td colspan="4">GRAND TOTAL</td><td>${fmt(input.currency, t.grand_total)}</td></tr>
    </table>
    ${result.warnings.length ? `<p class="warn">Note: ${result.warnings.join(" ")}</p>` : ""}
    <div class="disclaimer">
      <b>About this document.</b> This bill of quantities was generated by FRELUX from database-verified calculation results, and every line is traceable to its source estimate. Quantities, rates, and totals are planning approximations intended for budgeting and quote comparison. Confirm final quantities and prices with your supplier or contractor before purchase or contract signature. Quote reference: ${quoteRef}. Generated: ${new Date().toISOString().slice(0, 10)}.
    </div>
  </body></html>`;
}
