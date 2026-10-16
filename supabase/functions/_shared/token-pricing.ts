// =========================================================
// Token Purchase Pricing Guard (shared edge-function module)
//
// SECURITY: token prices are ALWAYS resolved server-side from
// token_purchase_packs (pack definitions) plus
// token_purchase_prices (per-currency, per-pack). The
// client-supplied amount is never trusted, mirroring
// subscription-pricing.ts (audit H1, 2026-09-10).
//
// Packs (2026-10-16): the shop sells multiple bundles. Pack 1
// ("starter") mirrors the legacy token_purchase_config row; every
// edge function falls back to that config if the packs table is
// unavailable, so a failed/rolled-back migration cannot break the
// existing single-pack flow.
// =========================================================

import { currencyMinorUnits, majorToMinor } from "./currency-units.ts";

export interface TokenPriceRow {
  pack_id?: number;
  currency_code: string;
  price_minor: number;
  is_active: boolean;
}

export interface TokenConfigRow {
  token_amount: number;
  price_kobo: number;
  is_enabled: boolean;
}

/** A row from token_purchase_packs (or the legacy config as pack 1). */
export interface TokenPackRow {
  id: number;
  key?: string;
  name?: string;
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
 * Maps the legacy single-pack config row onto a pack-1 definition. Used
 * as the fallback when token_purchase_packs is empty or unreadable.
 */
export function configAsPack(config: TokenConfigRow): TokenPackRow {
  return {
    id: 1,
    key: "starter",
    name: "Starter Pack",
    token_amount: config.token_amount,
    price_kobo: config.price_kobo,
    is_enabled: config.is_enabled,
  };
}

/**
 * Resolves the canonical server-side price for one pack in the
 * requested currency. NGN always comes from the pack's own naira
 * price; any other currency needs an active row in
 * token_purchase_prices for THAT pack — no fallback, no guessing (a
 * missing price means "this pack is not chargeable in that currency
 * yet", and the caller must fall back to the NGN flow).
 */
export function resolvePackPrice(
  pack: TokenPackRow,
  priceRows: TokenPriceRow[],
  currency: string,
): TokenPriceResolution | null {
  if (!pack || !pack.is_enabled) return null;
  const code = String(currency ?? "").toUpperCase();
  if (!code) return null;

  if (code === "NGN") {
    const price = Number(pack.price_kobo);
    if (!Number.isFinite(price) || price <= 0) return null;
    return {
      currency: "NGN",
      priceMinor: Math.round(price),
      tokens: pack.token_amount,
    };
  }

  const row = priceRows.find(
    (r) =>
      String(r.currency_code).toUpperCase() === code &&
      r.is_active === true &&
      (r.pack_id ?? 1) === pack.id,
  );
  if (!row) return null;
  const price = Number(row.price_minor);
  if (!Number.isFinite(price) || price <= 0) return null;
  return {
    currency: code,
    priceMinor: Math.round(price),
    tokens: pack.token_amount,
  };
}

/**
 * Resolves the canonical server-side price for a token purchase in the
 * requested currency, single-pack era compatibility: maps the legacy
 * config onto pack 1 and resolves against price rows (pack_id
 * defaults to 1 for legacy rows).
 */
export function resolveTokenPrice(
  config: TokenConfigRow,
  priceRows: TokenPriceRow[],
  currency: string,
): TokenPriceResolution | null {
  return resolvePackPrice(configAsPack(config), priceRows, currency);
}

export type TokenValidationReason = "TOKENS_NOT_CONFIGURED" | "AMOUNT_MISMATCH";

/**
 * Validates that a completed transaction's paid amount equals the
 * canonical server-side price for the pack and currency it claims.
 * Flutterwave reports major units, so the paid amount is converted to
 * minor units first. A signed mismatched charge must never credit
 * tokens.
 */
export function validatePackPayment(input: {
  pack: TokenPackRow;
  priceRows: TokenPriceRow[];
  currency: string;
  /** Amount PAID, in the transaction currency's major units. */
  amountPaidMajor: number;
}):
  | { ok: true; resolution: TokenPriceResolution }
  | { ok: false; reason: TokenValidationReason } {
  const resolution = resolvePackPrice(
    input.pack,
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

/** Legacy single-pack validation (pack 1). */
export function validateTokenPayment(input: {
  config: TokenConfigRow;
  priceRows: TokenPriceRow[];
  currency: string;
  amountPaidMajor: number;
}):
  | { ok: true; resolution: TokenPriceResolution }
  | { ok: false; reason: TokenValidationReason } {
  return validatePackPayment({
    pack: configAsPack(input.config),
    priceRows: input.priceRows,
    currency: input.currency,
    amountPaidMajor: input.amountPaidMajor,
  });
}

/**
 * Loads the pack definitions for an edge function, with the legacy
 * single-pack fallback. Returns enabled packs sorted for display.
 * The pack requested by the caller (meta/body pack_id, default 1)
 * must exist and be enabled.
 */
export function pickPack(
  packs: TokenPackRow[],
  packId: number | undefined,
): TokenPackRow | null {
  const id = Number(packId) > 0 ? Math.floor(Number(packId)) : 1;
  return packs.find((p) => p.id === id && p.is_enabled) ?? null;
}

/** Minor units for a currency (re-export convenience). */
export { currencyMinorUnits };
