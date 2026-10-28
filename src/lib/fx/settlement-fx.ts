// =========================================================
// FRELUX SETTLEMENT FX ENGINE (Phase 1, 2026-10-24)
//
// Roadmap gate (Quote and payment UX): settlement/checkout
// currency conversion may ONLY run once a payment provider,
// fee model, reconciliation path, exchange-rate source and
// legally required review are configured.
//
// Fail-closed behavior — every refusal is explicit:
//   * no active, fully reviewed settlement_fx_config row for
//     the market -> not_configured (conversion disabled);
//   * no direct or recorded-bridged rate in fx_rates -> the
//     quote keeps its own currency (unavailable), no rate is
//     invented, never a silent cross-rate;
//   * a rate older than the converter's MAX_AGE_MS -> stale,
//     FRELUX must refresh fx_rates.
//
// The only arithmetic here is deterministic: converted amount
// = quote amount x recorded composite rate; provider fee =
// fee_pct of the converted amount + fee_fixed. Everything
// else is provenance.
// =========================================================

import { supabase } from "@/lib/supabase";
import {
  convertWithRows,
  fetchFxRateRows,
  type FxConversion,
  type FxLeg,
} from "@/lib/fx/fx-converter";

export interface SettlementFxConfigRow {
  id: string;
  market_code: string;
  payment_provider: string;
  charge_currency: string;
  settlement_currency: string;
  fee_pct: number | string;
  fee_fixed: number | string;
  reconciliation_path: string;
  rate_source: string;
  reviewer_name: string;
  legal_review_date: string;
  next_review_date: string;
  is_active: boolean;
}

export type SettlementFxStatus =
  "converted" | "not_configured" | "unavailable" | "stale";

export interface SettlementFxResult {
  status: SettlementFxStatus;
  quoteCurrency: string;
  settlementCurrency: string | null;
  /** Quote amount that was converted. */
  quoteAmount: number;
  /** Converted amount before provider fees; null unless converted. */
  convertedAmount: number | null;
  /** Provider fee per the configured fee model; null unless converted. */
  providerFee: number | null;
  /** Converted amount + provider fee; null unless converted. */
  totalPayable: number | null;
  /** Composite rate actually applied; null unless converted. */
  appliedRate: number | null;
  /** Rate provenance legs actually used. */
  legs: FxLeg[];
  /** Intermediate currency when the rate was bridged. */
  via: string | null;
  /** Age of the oldest leg, in milliseconds. */
  oldestLegAgeMs: number | null;
  paymentProvider: string | null;
  reconciliationPath: string | null;
  reviewedBy: string | null;
  legalReviewDate: string | null;
  nextReviewDate: string | null;
  /** The underlying rate conversion, when one was attempted. */
  rateConversion: FxConversion | null;
  message: string;
}

/** Fetch the active settlement config for a market, or null. */
export async function fetchSettlementFxConfig(
  marketCode: string,
): Promise<SettlementFxConfigRow | null> {
  const code = (marketCode || "").trim().toUpperCase();
  if (!code) return null;
  const { data, error } = await supabase
    .from("settlement_fx_config")
    .select("*")
    .eq("market_code", code)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return (data as SettlementFxConfigRow) ?? null;
}

function feeOf(config: SettlementFxConfigRow, converted: number): number {
  const pct = Number(config.fee_pct) || 0;
  const fixed = Number(config.fee_fixed) || 0;
  return Math.round(((converted * pct) / 100 + fixed) * 100) / 100;
}

function refusal(
  status: SettlementFxStatus,
  message: string,
  quoteCurrency: string,
  quoteAmount: number,
  extra: Partial<SettlementFxResult> = {},
): SettlementFxResult {
  return {
    status,
    quoteCurrency,
    settlementCurrency: null,
    quoteAmount,
    convertedAmount: null,
    providerFee: null,
    totalPayable: null,
    appliedRate: null,
    legs: [],
    via: null,
    oldestLegAgeMs: null,
    paymentProvider: null,
    reconciliationPath: null,
    reviewedBy: null,
    legalReviewDate: null,
    nextReviewDate: null,
    rateConversion: null,
    message,
    ...extra,
  };
}

/**
 * Attempt a settlement conversion of a quote amount into the
 * market's configured settlement currency.
 *
 * Nothing is estimated: the rate must be recorded (provider +
 * timestamp provenance in fx_rates) and the config must pass
 * the roadmap's five-requirement gate.
 */
export async function resolveSettlementFx(input: {
  quoteAmount: number;
  quoteCurrency: string;
  marketCode: string;
}): Promise<SettlementFxResult> {
  const quoteCurrency = (input.quoteCurrency || "").trim().toUpperCase();
  const marketCode = (input.marketCode || "").trim().toUpperCase();

  const config = await fetchSettlementFxConfig(marketCode);
  if (!config) {
    return refusal(
      "not_configured",
      "Settlement currency conversion is not enabled for this market. " +
        "A payment provider, fee model, reconciliation path, exchange-rate " +
        "source and legal review must be configured before settlement " +
        "amounts can be quoted.",
      quoteCurrency,
      input.quoteAmount,
    );
  }

  const settlementCurrency = config.settlement_currency.trim().toUpperCase();
  if (settlementCurrency === quoteCurrency) {
    // Same currency: nothing to convert; fees still apply per the model.
    const fee = feeOf(config, input.quoteAmount);
    return {
      status: "converted",
      quoteCurrency,
      settlementCurrency,
      quoteAmount: input.quoteAmount,
      convertedAmount: input.quoteAmount,
      providerFee: fee,
      totalPayable: Math.round((input.quoteAmount + fee) * 100) / 100,
      appliedRate: 1,
      legs: [],
      via: null,
      oldestLegAgeMs: null,
      paymentProvider: config.payment_provider,
      reconciliationPath: config.reconciliation_path,
      reviewedBy: config.reviewer_name,
      legalReviewDate: config.legal_review_date,
      nextReviewDate: config.next_review_date,
      rateConversion: null,
      message:
        `Settled in ${settlementCurrency} (no conversion needed). ` +
        `Provider fee per the configured fee model.`,
    };
  }

  const rows = await fetchFxRateRows();
  const conversion = convertWithRows(
    rows,
    input.quoteAmount,
    quoteCurrency,
    settlementCurrency,
    { allowBridge: true },
  );

  if (conversion.status === "stale") {
    return refusal(
      "stale",
      conversion.message +
        " The quote keeps its own currency; no settlement amount is shown.",
      quoteCurrency,
      input.quoteAmount,
      {
        settlementCurrency,
        legs: conversion.legs,
        rateConversion: conversion,
        oldestLegAgeMs: conversion.oldestLegAgeMs ?? null,
      },
    );
  }
  if (conversion.status !== "ok" && conversion.status !== "bridged") {
    return refusal(
      "unavailable",
      conversion.message +
        " The quote keeps its own currency; no settlement amount is shown.",
      quoteCurrency,
      input.quoteAmount,
      {
        settlementCurrency,
        rateConversion: conversion,
      },
    );
  }

  const converted = conversion.result ?? 0;
  const fee = feeOf(config, converted);
  const totalPayable = Math.round((converted + fee) * 100) / 100;
  const oldest = conversion.oldestLegAgeMs ?? 0;
  return {
    status: "converted",
    quoteCurrency,
    settlementCurrency,
    quoteAmount: input.quoteAmount,
    convertedAmount: converted,
    providerFee: fee,
    totalPayable,
    appliedRate: conversion.compositeRate,
    legs: conversion.legs,
    via: conversion.via ?? null,
    oldestLegAgeMs: oldest,
    paymentProvider: config.payment_provider,
    reconciliationPath: config.reconciliation_path,
    reviewedBy: config.reviewer_name,
    legalReviewDate: config.legal_review_date,
    nextReviewDate: config.next_review_date,
    rateConversion: conversion,
    message:
      `Settlement in ${settlementCurrency} via ${config.payment_provider}: ` +
      conversion.message +
      ` Provider fee per the configured fee model (${config.fee_pct}% + ${config.fee_fixed} ${settlementCurrency}).`,
  };
}
