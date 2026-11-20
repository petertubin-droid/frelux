/**
 * BOQ pricing (shared)
 *
 * Turns a quantity-only bill of quantities into priced lines using the
 * market's own unit prices. The rules, in line with the platform's
 * no-silent-fallback mandate:
 *
 *  - a missing price is reported as unpriced, never estimated from
 *    another market, another material, or a "typical" figure;
 *  - quantities are never rounded by this module — purchasing rounding
 *    belongs to the engine that knows the packaging;
 *  - every line keeps its unit so the price can be checked against a
 *    supplier quote.
 */

export interface PriceableBoqLine {
  code: string;
  description: string;
  quantity: number;
  unit: string;
}

export interface BoqPriceMap {
  /** Unit price per BOQ code, in the market's currency. Null/undefined = unpriced. */
  [code: string]: number | null | undefined;
}

export interface PricedBoqLine {
  code: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number | null;
  line_total: number | null;
}

export interface PricedBoq {
  lines: PricedBoqLine[];
  /** Sum of the lines that could be priced. */
  priced_subtotal: number;
  priced_lines_count: number;
  unpriced_lines_count: number;
  /** Codes with no usable price, in BOQ order. */
  unpriced: string[];
  /** True only when every line carries a price. */
  complete: boolean;
}

function money(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * Price a BOQ. Lines whose price is absent, null, non-finite or negative
 * stay unpriced and are listed by code — the caller decides how to
 * disclose them; this function never invents a number.
 */
export function priceBoq(
  boq: PriceableBoqLine[],
  priceMap: BoqPriceMap | null | undefined,
): PricedBoq {
  const lines: PricedBoqLine[] = [];
  const unpriced: string[] = [];
  let subtotal = 0;

  for (const item of boq) {
    const raw = priceMap ? priceMap[item.code] : null;
    const price =
      typeof raw === "number" && Number.isFinite(raw) && raw >= 0 ? raw : null;
    const quantity = Number.isFinite(item.quantity) ? item.quantity : 0;

    if (price === null) {
      unpriced.push(item.code);
      lines.push({ ...item, quantity, unit_price: null, line_total: null });
      continue;
    }

    const lineTotal = money(quantity * price);
    subtotal += lineTotal;
    lines.push({
      ...item,
      quantity,
      unit_price: price,
      line_total: lineTotal,
    });
  }

  return {
    lines,
    priced_subtotal: money(subtotal),
    priced_lines_count: lines.length - unpriced.length,
    unpriced_lines_count: unpriced.length,
    unpriced,
    complete: unpriced.length === 0 && lines.length > 0,
  };
}
