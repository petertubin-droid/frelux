// =========================================================
// Escrow rails
//
// Paystack is the Nigerian rail and speaks kobo. Flutterwave carries the
// international currencies and speaks major units. Everything inside
// escrow_contracts stays in integer minor units, so the conversion happens
// only at the provider edge.
// =========================================================

export type EscrowProvider = "paystack" | "flutterwave";

/** Currencies each rail can collect in. Both settle in two-decimal units. */
export const PROVIDER_CURRENCIES: Record<EscrowProvider, readonly string[]> = {
  paystack: ["NGN", "GHS", "ZAR", "KES", "USD"],
  // Only currencies with a two-decimal minor unit: the ledger stores minor
  // units, and a zero-decimal currency like XOF would be counted 100x wrong.
  flutterwave: ["USD", "GBP", "EUR", "GHS", "KES", "ZAR", "EGP"],
};

/**
 * Naira stays on Paystack: it is the rail with the live integration, local
 * settlement and the lowest cost for a Nigerian buyer. Everything else goes
 * through Flutterwave, which can collect and pay out internationally.
 */
export function providerForCurrency(currency: string): EscrowProvider {
  return currency.toUpperCase() === "NGN" ? "paystack" : "flutterwave";
}

export function currencyIsSupported(
  provider: EscrowProvider,
  currency: string,
): boolean {
  return PROVIDER_CURRENCIES[provider].includes(currency.toUpperCase());
}

/** 4,500,000 kobo becomes 45000.00 for a Flutterwave request. */
export function minorToMajor(minor: number): number {
  return Math.round(minor) / 100;
}

/** Flutterwave reports major units; escrow stores integer minor units. */
export function majorToMinor(amount: number | string): number | null {
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(value)) return null;
  const minor = Math.round(value * 100);
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
    ),
    currency:
      typeof data.currency === "string" ? data.currency.toUpperCase() : null,
    successful: data.status === "successful" || event === "charge.completed",
  };
}
