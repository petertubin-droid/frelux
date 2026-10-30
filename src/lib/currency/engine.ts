// Currency conversion for estimates, with every number traceable.
//
// The rules this module enforces:
//  - An estimate keeps the currency and prices it was priced in. Converting
//    produces a view; it never rewrites the original.
//  - A rate is only used when it was actually recorded, and the rate, its
//    timestamp and where it came from travel with the converted number.
//  - A converted figure is never presented as a local material price. It is an
//    arithmetic view of the original at a dated rate.

import { currencyMeta } from "./catalogue";

export type RateSource = "database" | "provider" | "bundled" | "manual";

export interface RateQuote {
  base: string;
  quote: string;
  rate: number;
  provider: string;
  fetchedAt: string;
}

export interface RateTable {
  source: RateSource;
  /** When this table was assembled, ISO 8601. */
  fetchedAt: string;
  quotes: readonly RateQuote[];
}

/** A rate older than this is shown as stale but still converts. */
export const STALE_AFTER_MS = 48 * 60 * 60 * 1000;
/** A rate older than this refuses to convert unless the caller insists. */
export const REFUSE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export type ConversionStatus =
  "ok" | "bridged" | "fallback" | "stale" | "unavailable";

export interface Conversion {
  status: ConversionStatus;
  from: string;
  to: string;
  amount: number;
  /** Converted amount, or null when the engine refuses. */
  result: number | null;
  /** Rate actually applied, original units per display unit. */
  effectiveRate: number | null;
  /** Timestamp of the oldest rate leg used, ISO 8601. */
  rateTimestamp: string | null;
  source: RateSource;
  /** Intermediate currency when the pair was crossed through USD. */
  via: string | null;
  ageMs: number | null;
  message: string;
}

export interface ConvertOptions {
  /** Use rates past REFUSE_AFTER_MS anyway. Off by default. */
  allowStale?: boolean;
  /** Injectable clock, milliseconds. */
  now?: number;
  /** Currency to cross through. */
  pivot?: string;
}

const PIVOT = "USD";

function round(value: number, dp: number): number {
  const factor = 10 ** dp;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function quoteFor(
  table: RateTable,
  base: string,
  quote: string,
): RateQuote | null {
  return table.quotes.find((q) => q.base === base && q.quote === quote) ?? null;
}

/**
 * How many `quote` units one `base` unit buys. A recorded direct quote wins; a
 * recorded leg through USD is used next and reported as a bridge; a leg through
 * USD recorded the other way round is inverted rather than guessed.
 */
export function resolveRate(
  table: RateTable,
  base: string,
  quote: string,
): {
  rate: number;
  quote: RateQuote;
  inverted: boolean;
  via: string | null;
} | null {
  const direct = quoteFor(table, base, quote);
  if (direct)
    return { rate: direct.rate, quote: direct, inverted: false, via: null };

  const inverse = quoteFor(table, quote, base);
  if (inverse && inverse.rate > 0) {
    return {
      rate: 1 / inverse.rate,
      quote: inverse,
      inverted: true,
      via: null,
    };
  }

  const legOne = quoteFor(table, base, PIVOT) ?? (base === PIVOT ? null : null);
  const legTwo = quoteFor(table, PIVOT, quote);
  if (legOne && legTwo) {
    const quoteRow = {
      ...legTwo,
      fetchedAt: olderOf(legOne.fetchedAt, legTwo.fetchedAt),
    };
    return {
      rate: legOne.rate * legTwo.rate,
      quote: quoteRow,
      inverted: false,
      via: PIVOT,
    };
  }
  const inverseOne = quoteFor(table, PIVOT, base);
  const inverseTwo = quoteFor(table, quote, PIVOT);
  if (inverseOne && inverseTwo && inverseOne.rate > 0 && inverseTwo.rate > 0) {
    const quoteRow = {
      ...inverseTwo,
      fetchedAt: olderOf(inverseOne.fetchedAt, inverseTwo.fetchedAt),
    };
    return {
      rate: 1 / (inverseOne.rate * inverseTwo.rate),
      quote: quoteRow,
      inverted: true,
      via: PIVOT,
    };
  }
  return null;
}

function olderOf(a: string, b: string): string {
  return new Date(a).getTime() <= new Date(b).getTime() ? a : b;
}

export function convert(
  amount: number,
  from: string,
  to: string,
  table: RateTable,
  options: ConvertOptions = {},
): Conversion {
  const base = (from || "").toUpperCase();
  const quote = (to || "").toUpperCase();
  const now = options.now ?? Date.now();
  const common = { from: base, to: quote, amount, source: table.source };

  if (!Number.isFinite(amount)) {
    return {
      ...common,
      status: "unavailable",
      result: null,
      effectiveRate: null,
      rateTimestamp: null,
      via: null,
      ageMs: null,
      message: "The amount is not a number",
    };
  }
  if (base === quote) {
    return {
      ...common,
      status: "ok",
      result: amount,
      effectiveRate: 1,
      rateTimestamp: table.fetchedAt,
      via: null,
      ageMs: 0,
      message: "Already in this currency",
    };
  }

  const resolved = resolveRate(table, base, quote);
  if (!resolved) {
    return {
      ...common,
      status: "unavailable",
      result: null,
      effectiveRate: null,
      rateTimestamp: null,
      via: null,
      ageMs: null,
      message: `No recorded rate for ${base}/${quote}`,
    };
  }

  const ageMs = Math.max(0, now - new Date(resolved.quote.fetchedAt).getTime());
  const effectiveRate = round(resolved.rate, 8);
  const result = round(amount * resolved.rate, 6);
  const status: ConversionStatus =
    ageMs > REFUSE_AFTER_MS && !options.allowStale
      ? "stale"
      : table.source === "bundled"
        ? "fallback"
        : resolved.via
          ? "bridged"
          : "ok";

  const message =
    status === "stale"
      ? `The ${base}/${quote} rate is ${Math.floor(ageMs / 86_400_000)} days old, so it is not applied. Refresh rates to convert.`
      : status === "fallback"
        ? `Converted at a saved ${base}/${quote} rate because live rates could not be reached`
        : resolved.via
          ? `Converted through ${resolved.via} using two recorded rates`
          : `Converted at the recorded ${base}/${quote} rate`;

  return {
    ...common,
    status,
    result: status === "stale" ? null : result,
    effectiveRate,
    rateTimestamp: resolved.quote.fetchedAt,
    via: resolved.via,
    ageMs,
    message,
  };
}

export interface MoneyFormatOptions {
  decimals?: number;
  /** Use "." for decimals and "," for thousands, or the reverse. */
  decimalComma?: boolean;
  /** Show the ISO code after the amount as well as the symbol. */
  withCode?: boolean;
}

function group(digits: string, separator: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

/**
 * Formats an amount without depending on the host locale, so the same estimate
 * reads identically everywhere. Symbol first, then grouped digits.
 */
export function formatMoney(
  amount: number,
  code: string,
  options: MoneyFormatOptions = {},
): string {
  const meta = currencyMeta(code);
  const decimals = options.decimals ?? meta.decimals;
  const negative = amount < 0;
  const fixed = Math.abs(round(amount, decimals)).toFixed(decimals);
  const [whole, fraction] = fixed.split(".");
  const thousands = options.decimalComma ? "." : ",";
  const decimalPoint = options.decimalComma ? "," : ".";
  const number = fraction
    ? `${group(whole, thousands)}${decimalPoint}${fraction}`
    : group(whole, thousands);
  const body = `${meta.symbol}${number}`;
  return `${negative ? "-" : ""}${body}${options.withCode ? ` ${meta.code}` : ""}`;
}

export function describeConversion(conversion: Conversion): string {
  if (conversion.result === null) return conversion.message;
  const from = currencyMeta(conversion.from);
  const to = currencyMeta(conversion.to);
  const rate = formatMoney(conversion.effectiveRate ?? 0, conversion.to, {
    decimals: (conversion.effectiveRate ?? 0) >= 1 ? 2 : 6,
  });
  const when = conversion.rateTimestamp
    ? formatTimestamp(conversion.rateTimestamp)
    : "no timestamp";
  return `1 ${from.code} = ${rate.replace(to.symbol, "").trim()} ${to.code} as of ${when}`;
}

export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown";
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`;
}

// ---------------------------------------------------------------------------
// Estimates and reports
// ---------------------------------------------------------------------------

export interface PricedLine {
  label: string;
  amount: number;
}

export interface PricedEstimate {
  /** The currency the estimate was priced in. Never reassigned. */
  currency: string;
  total: number;
  lines?: readonly PricedLine[];
  /** When the prices themselves were captured. */
  pricedAt?: string;
}

export interface DisplayLine extends PricedLine {
  originalCurrency: string;
  converted: number | null;
}

export interface EstimateView {
  original: PricedEstimate;
  displayCurrency: string;
  conversion: Conversion;
  lines: DisplayLine[];
  convertedTotal: number | null;
}

/**
 * A converted view of an estimate. The estimate passed in is returned untouched
 * under `original`, so a display-currency change can never rewrite a price.
 */
export function viewEstimate(
  estimate: PricedEstimate,
  displayCurrency: string,
  table: RateTable,
  options: ConvertOptions = {},
): EstimateView {
  const conversion = convert(
    estimate.total,
    estimate.currency,
    displayCurrency,
    table,
    options,
  );
  const lines: DisplayLine[] = (estimate.lines ?? []).map((line) => {
    const lineConversion = convert(
      line.amount,
      estimate.currency,
      displayCurrency,
      table,
      options,
    );
    return {
      ...line,
      originalCurrency: estimate.currency,
      converted: lineConversion.result,
    };
  });
  return {
    original: estimate,
    displayCurrency: displayCurrency.toUpperCase(),
    conversion,
    lines,
    convertedTotal: conversion.result,
  };
}
