// =========================================================
// Escrow rails
//
// Paystack is the Nigerian rail and speaks kobo. Flutterwave carries the
// international currencies and speaks major units. Everything inside
// escrow_contracts stays in integer minor units, so the conversion happens
// only at the provider edge.
// =========================================================

import {
  CHARGEABLE_CURRENCIES,
  currencyExponent,
  railForCurrency,
  railsForCurrency,
  type PaymentRail,
} from "./currency-registry.ts";

export type EscrowProvider = PaymentRail;

/** Currencies each rail can collect in, from the one registry. */
export const PROVIDER_CURRENCIES: Record<EscrowProvider, readonly string[]> = {
  paystack: CHARGEABLE_CURRENCIES.filter((c) =>
    railsForCurrency(c).includes("paystack"),
  ),
  flutterwave: CHARGEABLE_CURRENCIES.filter((c) =>
    railsForCurrency(c).includes("flutterwave"),
  ),
};

/**
 * Naira stays on Paystack: it is the live integration, settles locally and
 * costs a Nigerian buyer least. Every other chargeable currency goes through
 * Flutterwave, which collects and pays out internationally.
 */
export function providerForCurrency(currency: string): EscrowProvider {
  return railForCurrency(currency) ?? "flutterwave";
}

export function currencyIsSupported(
  provider: EscrowProvider,
  currency: string,
): boolean {
  return railsForCurrency(currency).includes(provider);
}

/** Escrow stores integer minor units; Flutterwave reports major units. */
export function minorToMajor(amountMinor: number, currency?: string): number {
  return amountMinor / 10 ** currencyExponent(currency);
}

export function majorToMinor(
  amount: number | string,
  currency?: string,
): number | null {
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(value)) return null;
  const minor = Math.round(value * 10 ** currencyExponent(currency));
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null;
}

export interface FlutterwaveEvent {
  kind: "charge" | "refund" | "other";
  reference: string | null;
  transactionId: string | null;
  /** Integer minor units, converted from Flutterwave's major-unit amount. */
  amountMinor: number | null;
  currency: string | null;
  successful: boolean;
}

/**
 * Reads a Flutterwave webhook body into the same shape the Paystack planner
 * uses, so both rails share one set of funding rules.
 */
export function classifyFlutterwaveEvent(body: unknown): FlutterwaveEvent {
  const root = (body ?? {}) as Record<string, unknown>;
  const event = typeof root.event === "string" ? root.event : "";
  const data = (root.data ?? {}) as Record<string, unknown>;

  const kind: FlutterwaveEvent["kind"] = event.includes("refund")
    ? "refund"
    : event === "charge.completed" || event === "charge.failed"
      ? "charge"
      : "other";

  const reference =
    typeof data.tx_ref === "string" && data.tx_ref.length > 0
      ? data.tx_ref
      : null;

  return {
    kind,
    reference,
    transactionId:
      data.id === undefined || data.id === null ? null : String(data.id),
    amountMinor: majorToMinor(
      typeof data.amount === "number" ? data.amount : String(data.amount ?? ""),
      typeof data.currency === "string" ? data.currency : null,
    ),
    currency:
      typeof data.currency === "string" ? data.currency.toUpperCase() : null,
    successful: data.status === "successful" || event === "charge.completed",
  };
}
