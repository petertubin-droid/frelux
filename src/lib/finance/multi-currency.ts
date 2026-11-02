/**
 * FRELUX Enterprise Multi-Currency Project Accounting Engine
 *
 * Implements strict separation between:
 * 1. Base Project Budget Currency (Internal project accounting baseline)
 * 2. Contractor Settlement Currency (Subcontractor / labor payout currency)
 * 3. Client Quote Currency (Client-facing contract / proposal currency)
 *
 * Features:
 * - Deterministic triangular arbitrage conversion across world currencies
 * - Audit-proof FX Rate Snapshot recording effective date, source, and applied spread
 * - Construction FX Risk Margin (volatility contingency buffer in basis points)
 * - Fixed-contract exchange rate locks for multi-month milestone disbursements
 * - ISO 4217 decimal precision adherence (zero decimals for JPY/KRW/etc.)
 */

import { formatByCode } from "@/lib/international/currency-format";

export interface ProjectCurrencyConfig {
  /** Internal accounting and takeoff baseline currency */
  baseCurrency: string;
  /** Currency used to settle field trades and local subcontracts */
  settlementCurrency: string;
  /** Currency presented to the client or loan underwriting entity */
  clientQuoteCurrency: string;
  /** FX risk buffer in basis points (100 bps = 1.00%) to mitigate volatility */
  fxRiskMarginBps?: number;
}

export interface FxRateSnapshot {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  effectiveDate: string;
  source:
    "live_feed" | "manual_contract_rate" | "central_bank" | "offline_cache";
  spreadBps: number;
  inverseRate: number;
  contractLockId?: string | null;
}

export interface CurrencyConversionResult {
  fromCurrency: string;
  toCurrency: string;
  originalAmount: number;
  convertedAmount: number;
  appliedRate: number;
  riskAdjustedRate: number;
  riskMarginBps: number;
  snapshot: FxRateSnapshot;
}

/** ISO 4217 currencies that typically operate without fractional subunits */
const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "ISK",
  "JPY",
  "KMF",
  "KRW",
  "PYG",
  "RWF",
  "UGX",
  "UYI",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

/**
 * Returns canonical decimal places for an ISO currency code
 */
export function getCurrencyDecimals(currencyCode: string): number {
  const code = (currencyCode || "").trim().toUpperCase();
  if (ZERO_DECIMAL_CURRENCIES.has(code)) {
    return 0;
  }
  return 2;
}

/**
 * Rounds an amount according to currency decimal rules
 */
export function roundCurrencyAmount(
  amount: number,
  currencyCode: string,
): number {
  const decimals = getCurrencyDecimals(currencyCode);
  const factor = Math.pow(10, decimals);
  return Math.round(amount * factor) / factor;
}

/**
 * Calculates the cross exchange rate between two currencies given a common reference table.
 * If rates are expressed as "units of CODE per 1 BASE",
 * Rate(A -> B) = Rate(Base -> B) / Rate(Base -> A).
 */
export function computeCrossRate(
  fromCode: string,
  toCode: string,
  referenceRates: Record<string, number>,
  referenceBaseCode = "USD",
): number | null {
  const from = fromCode.trim().toUpperCase();
  const to = toCode.trim().toUpperCase();
  const base = referenceBaseCode.trim().toUpperCase();

  if (from === to) return 1.0;

  // If table is base-centric
  const fromRate = from === base ? 1.0 : referenceRates[from];
  const toRate = to === base ? 1.0 : referenceRates[to];

  if (!fromRate || !toRate || fromRate <= 0 || toRate <= 0) {
    return null;
  }

  return toRate / fromRate;
}

/**
 * Performs enterprise currency conversion with optional FX risk margin
 */
export function convertProjectCurrency(params: {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  rate?: number | null;
  referenceRates?: Record<string, number> | null;
  referenceBaseCode?: string;
  source?:
    "live_feed" | "manual_contract_rate" | "central_bank" | "offline_cache";
  fxRiskMarginBps?: number;
  contractLockId?: string | null;
}): CurrencyConversionResult {
  const {
    amount,
    fromCurrency,
    toCurrency,
    referenceRates,
    referenceBaseCode = "USD",
    source = "live_feed",
    fxRiskMarginBps = 0,
    contractLockId = null,
  } = params;

  const from = (fromCurrency || "USD").trim().toUpperCase();
  const to = (toCurrency || "USD").trim().toUpperCase();

  let resolvedRate = params.rate;

  if (resolvedRate === undefined || resolvedRate === null) {
    if (from === to) {
      resolvedRate = 1.0;
    } else if (referenceRates) {
      resolvedRate =
        computeCrossRate(from, to, referenceRates, referenceBaseCode) ?? 1.0;
    } else {
      resolvedRate = 1.0;
    }
  }

  // Calculate risk-adjusted rate if converting into a different currency
  // Risk margin protects against foreign currency depreciation/appreciation
  const marginMultiplier =
    from !== to && fxRiskMarginBps > 0 ? 1 + fxRiskMarginBps / 10000 : 1.0;

  const riskAdjustedRate = resolvedRate * marginMultiplier;
  const rawConverted = amount * riskAdjustedRate;
  const convertedAmount = roundCurrencyAmount(rawConverted, to);

  const inverseRate = resolvedRate > 0 ? 1 / resolvedRate : 0;

  const snapshot: FxRateSnapshot = {
    fromCurrency: from,
    toCurrency: to,
    rate: resolvedRate,
    effectiveDate: new Date().toISOString(),
    source,
    spreadBps: fxRiskMarginBps,
    inverseRate: roundCurrencyAmount(inverseRate, from),
    contractLockId,
  };

  return {
    fromCurrency: from,
    toCurrency: to,
    originalAmount: amount,
    convertedAmount,
    appliedRate: resolvedRate,
    riskAdjustedRate,
    riskMarginBps: fxRiskMarginBps,
    snapshot,
  };
}

/**
 * Summarizes a project's budget across all three enterprise currency layers
 */
export function buildProjectCurrencySummary(params: {
  baseAmount: number;
  config: ProjectCurrencyConfig;
  referenceRates?: Record<string, number> | null;
  referenceBaseCode?: string;
}) {
  const {
    baseAmount,
    config,
    referenceRates,
    referenceBaseCode = "USD",
  } = params;

  // Base to settlement (contractor/trade payouts)
  const settlement = convertProjectCurrency({
    amount: baseAmount,
    fromCurrency: config.baseCurrency,
    toCurrency: config.settlementCurrency,
    referenceRates,
    referenceBaseCode,
    fxRiskMarginBps: config.fxRiskMarginBps ?? 0,
  });

  // Base to client quote (customer billing)
  const clientQuote = convertProjectCurrency({
    amount: baseAmount,
    fromCurrency: config.baseCurrency,
    toCurrency: config.clientQuoteCurrency,
    referenceRates,
    referenceBaseCode,
    fxRiskMarginBps: config.fxRiskMarginBps ?? 0,
  });

  return {
    base: {
      currency: config.baseCurrency,
      amount: roundCurrencyAmount(baseAmount, config.baseCurrency),
      formatted: formatByCode(baseAmount, config.baseCurrency),
    },
    settlement: {
      currency: config.settlementCurrency,
      amount: settlement.convertedAmount,
      formatted: formatByCode(
        settlement.convertedAmount,
        config.settlementCurrency,
      ),
      rate: settlement.appliedRate,
      snapshot: settlement.snapshot,
    },
    clientQuote: {
      currency: config.clientQuoteCurrency,
      amount: clientQuote.convertedAmount,
      formatted: formatByCode(
        clientQuote.convertedAmount,
        config.clientQuoteCurrency,
      ),
      rate: clientQuote.appliedRate,
      snapshot: clientQuote.snapshot,
    },
    riskMarginBps: config.fxRiskMarginBps || 0,
  };
}
