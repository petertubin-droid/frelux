/**
 * Shared shapes for the specialty takeoff calculators
 * (retaining wall, soffit/gutter, conduit & wiring, structural steel).
 *
 * All four are the same kind of tool: a few measurements plus a visible rule
 * produce a physical shopping list, and each line is priced from the shared
 * material database when a price exists. Nothing here estimates, guesses or
 * interpolates a price: an unpriced line keeps its quantity, loses its money,
 * and says so.
 *
 * Tax is never inferred. Every result carries tax_status
 * "tax_not_determined" so a consumer cannot mistake the subtotal for a
 * tax-inclusive figure.
 */

export type QuantitySource = "user_provided" | "rule_derived" | "missing";

export interface SpecialtyLine {
  key: string;
  label: string;
  material_slug: string;
  quantity: number | null;
  quantity_source: QuantitySource;
  unit: string;
  detail: string;
  unit_price: number | null;
  line_total: number | null;
}

export interface SpecialtyStep {
  label: string;
  detail: string;
}

export type TaxStatus = "tax_not_determined";

export interface SpecialtyResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  steps: SpecialtyStep[];
  lines: SpecialtyLine[];
  priced_subtotal: number;
  material_subtotal: number | null;
  labour_total: number;
  grand_total: number | null;
  incomplete: boolean;
  missing: string[];
  tax_status: TaxStatus;
}

export type SpecialtyPriceMap = Record<string, number | null>;

export const TAX_NOT_DETERMINED: TaxStatus = "tax_not_determined";

export function money(v: number): number {
  return Math.round(v * 100) / 100;
}

/** Quantities are whole units unless the line says otherwise. */
export function ceilQty(v: number): number {
  return Math.ceil(money(v));
}

export interface PricedLines {
  lines: SpecialtyLine[];
  priced_subtotal: number;
  material_subtotal: number | null;
  missing: string[];
}

/**
 * Attach prices to quantities. A missing price leaves line_total null and the
 * material subtotal null as well: a partial total presented as a total is how
 * estimating tools mislead people.
 */
export function priceLines(
  lines: SpecialtyLine[],
  prices: SpecialtyPriceMap,
): PricedLines {
  const missing: string[] = [];
  let priced = 0;
  let complete = true;

  const priced_lines = lines.map((line) => {
    if (line.quantity === null) {
      complete = false;
      missing.push(`${line.label} (quantity missing)`);
      return { ...line, unit_price: null, line_total: null };
    }
    const unit_price = prices[line.material_slug] ?? null;
    if (unit_price === null) {
      complete = false;
      missing.push(line.label);
      return { ...line, unit_price: null, line_total: null };
    }
    const line_total = money(line.quantity * unit_price);
    priced += line_total;
    return { ...line, unit_price, line_total };
  });

  return {
    lines: priced_lines,
    priced_subtotal: money(priced),
    material_subtotal: complete ? money(priced) : null,
    missing,
  };
}

export function unpricedWarnings(missing: string[]): string[] {
  if (missing.length === 0) return [];
  return [
    `${missing.length} item(s) have no configured price: ${missing.join(", ")}. Their quantities are shown and no price was invented. Enter your supplier price to cost them.`,
  ];
}

export function emptyResult(errors: string[]): SpecialtyResult {
  return {
    ok: false,
    errors,
    warnings: [],
    steps: [],
    lines: [],
    priced_subtotal: 0,
    material_subtotal: null,
    labour_total: 0,
    grand_total: null,
    incomplete: true,
    missing: [],
    tax_status: TAX_NOT_DETERMINED,
  };
}

/** Rules arrive from the admin calc rules table; blank rules fall back to the printed defaults. */
export interface CalcRuleLike {
  rule_key: string;
  rule_value?: { value?: unknown } | null;
  is_active?: boolean | null;
}

export function ruleNumber(rows: CalcRuleLike[], key: string): number | null {
  const row = rows.find(
    (r) =>
      r.rule_key === key &&
      (r.is_active === undefined ||
        r.is_active === true ||
        r.is_active === null),
  );
  const n = Number(row?.rule_value?.value);
  return Number.isFinite(n) && n > 0 ? n : null;
}
