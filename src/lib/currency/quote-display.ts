// The converted block that appears on quotes, invoices and budget reports.
//
// A report is priced in one currency and that stays true. This block is a second
// reading of the same figures at a dated rate, and it says so on its face.

import {
  activeCurrencyCode,
  preferredDisplayCurrency,
} from "./active-currency";
import {
  formatMoney,
  describeConversion,
  convert,
  type RateTable,
} from "./engine";
import { rateCache } from "./rates";

export interface QuotedTotal {
  label: string;
  amount: number;
  strong?: boolean;
}

export interface QuoteDisplay {
  currency: string;
  /** "1 USD = 1,346.22 NGN as of 30 Oct 2026 17:20 UTC" */
  rateLine: string;
  totals: Array<{ label: string; value: string; strong?: boolean }>;
  note: string;
  /** True when the rate came from the saved snapshot rather than a fresh read. */
  fromSnapshot: boolean;
}

/**
 * Builds the converted block, or nothing at all. If any figure refuses to
 * convert (no recorded rate, or a rate too old to trust) the whole block is
 * withheld rather than printed with a hole in it.
 */
export function buildQuoteDisplay(params: {
  totals: readonly QuotedTotal[];
  fromCurrency: string;
  toCurrency: string;
  table: RateTable;
  now?: number;
  allowStale?: boolean;
}): QuoteDisplay | null {
  const from = params.fromCurrency.toUpperCase();
  const to = params.toCurrency.toUpperCase();
  if (!from || !to || from === to) return null;
  if (!params.totals.length) return null;

  const converted: QuoteDisplay["totals"] = [];
  const options = { now: params.now, allowStale: params.allowStale };
  for (const total of params.totals) {
    if (!Number.isFinite(total.amount)) return null;
    const result = convert(total.amount, from, to, params.table, options);
    if (result.result === null) return null;
    converted.push({
      label: total.label,
      value: formatMoney(result.result, to),
      strong: total.strong,
    });
  }

  const headline = convert(
    params.totals.find((t) => t.strong)?.amount ??
      params.totals[params.totals.length - 1].amount,
    from,
    to,
    params.table,
    options,
  );

  return {
    currency: to,
    rateLine: describeConversion(headline),
    totals: converted,
    note: `Converted for comparison at the rate above. This document is priced in ${from}, and these figures are not a local material price in ${to}.`,
    fromSnapshot: headline.status === "fallback",
  };
}

/**
 * Pulls an amount out of a formatted money string, so existing quote builders
 * that hand over pre-formatted totals can still offer a converted view.
 */
export function parseMoneyText(text: string): number | null {
  const cleaned = text.replace(/[^0-9.,-]/g, "").trim();
  if (!cleaned) return null;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalised = cleaned;
  if (lastComma > lastDot) {
    normalised = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    normalised = cleaned.replace(/,/g, "");
  }
  const value = Number(normalised);
  return Number.isFinite(value) ? value : null;
}

/**
 * A converted block derived from whatever the report already prints, using the
 * rates the app has cached. Returns null whenever it cannot be done honestly:
 * no cached rates, no readable totals, or the same currency.
 */
export function autoDisplayForReport(
  totals: readonly { label: string; value: string; strong?: boolean }[],
): QuoteDisplay | null {
  if (!totals.length) return null;
  const from = activeCurrencyCode();
  const to = preferredDisplayCurrency(from);
  if (from === to) return null;
  const parsed: QuotedTotal[] = [];
  for (const total of totals) {
    const amount = parseMoneyText(total.value);
    if (amount === null) return null;
    parsed.push({ label: total.label, amount, strong: total.strong });
  }
  const table = cachedRateTable();
  if (!table) return null;
  return buildQuoteDisplay({
    totals: parsed,
    fromCurrency: from,
    toCurrency: to,
    table,
  });
}

/** Reads the app's rate cache without triggering a load. */
function cachedRateTable(): RateTable | null {
  try {
    return rateCache().peek();
  } catch {
    return null;
  }
}
