// =========================================================
// Token Purchase Pricing Guard (shared edge-function module)
//
// SECURITY: token prices are ALWAYS resolved server-side from
// token_purchase_config (NGN, kobo) or token_purchase_prices (every
// other currency, minor units). The client-supplied amount is never
// trusted, mirroring subscription-pricing.ts (audit H1, 2026-09-10).
// =========================================================

import { currencyMinorUnits, majorToMinor } from "./currency-units.ts";

export interface TokenPriceRow {
  currency_code: string;
  price_minor: number;
  is_active: boolean;
}

export interface TokenConfigRow {
  token_amount: number;
  price_kobo: number;
  is_enabled: boolean;
}

export interface TokenPriceResolution {
  /** Active currency code to charge in ("NGN" or a configured currency). */
  currency: string;
  /** Price in that currency's MINOR units (kobo for NGN). */
  priceMinor: number;
  /** Tokens in the pack. */
  tokens: number;
}

/**
 * Resolves the canonical server-side price for a token purchase in the
 * requested currency. NGN always comes from token_purchase_config; any
 * other currency needs an active row in token_purchase_prices — no
 * fallback, no guessing (a missing price means "not chargeable in that
 * currency yet", and the caller must fall back to the NGN flow).
 */
export function resolveTokenPrice(
  config: TokenConfigRow,
  priceRows: TokenPriceRow[],
  currency: string,
): TokenPriceResolution | null {
  if (!config || !config.is_enabled) return null;
  const code = String(currency ?? "").toUpperCase();
  if (!code) return null;

  if (code === "NGN") {
    const price = Number(config.price_kobo);
    if (!Number.isFinite(price) || price <= 0) return null;
    return {
      currency: "NGN",
      priceMinor: Math.round(price),
      tokens: config.token_amount,
    };
  }

  const row = priceRows.find(
    (r) =>
      String(r.currency_code).toUpperCase() === code && r.is_active === true,
  );
  if (!row) return null;
  const price = Number(row.price_minor);
  if (!Number.isFinite(price) || price <= 0) return null;
  return {
    currency: code,
    priceMinor: Math.round(price),
    tokens: config.token_amount,
  };
}

export type TokenValidationReason = "TOKENS_NOT_CONFIGURED" | "AMOUNT_MISMATCH";

/**
 * Validates that a completed transaction's paid amount equals the
 * canonical server-side price for the currency it claims. Flutterwave
 * reports major units, so the paid amount is converted to minor units
 * first. A signed mismatched charge must never credit tokens.
 */
export function validateTokenPayment(input: {
  config: TokenConfigRow;
  priceRows: TokenPriceRow[];
  currency: string;
  /** Amount PAID, in the transaction currency's major units. */
  amountPaidMajor: number;
}):
  | { ok: true; resolution: TokenPriceResolution }
  | { ok: false; reason: TokenValidationReason } {
  const resolution = resolveTokenPrice(
    input.config,
    input.priceRows,
    input.currency,
  );
  if (!resolution) {
    return { ok: false, reason: "TOKENS_NOT_CONFIGURED" };
  }
  const paidMinor = majorToMinor(
    Number(input.amountPaidMajor) || 0,
    resolution.currency,
  );
  if (paidMinor !== resolution.priceMinor) {
    return { ok: false, reason: "AMOUNT_MISMATCH" };
  }
  return { ok: true, resolution };
}

/** Minor units for a currency (re-export convenience). */
export { currencyMinorUnits };
