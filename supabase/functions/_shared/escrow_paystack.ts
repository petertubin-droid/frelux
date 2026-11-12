// =========================================================
// Escrow dispatch for Paystack webhooks
//
// One module decides what an incoming Paystack event means for escrow, so the
// primary `paystack-webhook` and the older `escrow-webhook` cannot drift apart.
// Nothing here touches the network or the database: the caller passes the raw
// body, the signature and the contract row, and gets a decision back.
//
// Rules that matter:
//  - An event is escrow only when its reference is an escrow contract code AND
//    that contract exists. An ordinary subscription or marketplace reference
//    can never create escrow state.
//  - Funding needs the contract to still be awaiting payment, the amount to
//    match the contract total exactly, and the currency to match.
//  - A successful charge holds funds. It never releases them.
// =========================================================

/** Escrow contract codes are minted as ESC-XXXXXXXX. */
export const ESCROW_REFERENCE_PREFIX = "ESC-";

export interface PaystackChargeData {
  reference?: string;
  amount?: number | string;
  currency?: string;
  status?: string;
  id?: number | string;
  metadata?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface EscrowContractRow {
  id: string;
  status: string;
  total_minor: number | string;
  currency: string;
  held_minor?: number | string;
  provider_transaction_id?: string | null;
  provider?: string | null;
}

export type EscrowFundingDecision =
  | { action: "fund"; transactionId: string; amountMinor: number }
  | { action: "duplicate"; reason: string }
  | { action: "reject"; reason: string };

export type EscrowRefundDecision =
  | { action: "refund"; amountMinor: number }
  | { action: "duplicate"; reason: string }
  | { action: "reject"; reason: string };

export function escrowReferenceOf(data: PaystackChargeData): string | null {
  const reference = typeof data.reference === "string" ? data.reference : "";
  return reference.startsWith(ESCROW_REFERENCE_PREFIX) ? reference : null;
}

/** Paystack signs the raw body with HMAC-SHA512 keyed by the secret key. */
export async function verifyPaystackSignature(
  rawBody: string,
  signature: string | null | undefined,
  secrets: (string | null | undefined)[],
): Promise<boolean> {
  if (!signature) return false;
  const candidates = secrets.filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  if (candidates.length === 0) return false;

  const encoder = new TextEncoder();
  for (const secret of candidates) {
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"],
    );
    const signed = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(rawBody),
    );
    const hash = Array.from(new Uint8Array(signed))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    if (timingSafeEqual(hash, signature)) return true;
  }
  return false;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1)
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function toMinor(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isSafeInteger(n) && n > 0 ? n : null;
}

export function planEscrowFunding(
  contract: EscrowContractRow,
  data: PaystackChargeData,
  event: { provider?: "paystack" | "flutterwave" } = {},
): EscrowFundingDecision {
  if (
    contract.provider &&
    event.provider &&
    contract.provider !== event.provider
  )
    return {
      action: "reject",
      reason: `Contract collects on ${contract.provider}, not ${event.provider}`,
    };

  const transactionId =
    data.id === undefined || data.id === null ? "" : String(data.id);
  if (!transactionId)
    return { action: "reject", reason: "Event has no transaction id" };

  if (data.status !== "success")
    return {
      action: "reject",
      reason: `Charge is ${data.status ?? "not successful"}`,
    };

  if (contract.provider_transaction_id === transactionId)
    return {
      action: "duplicate",
      reason: "This transaction already funded the contract",
    };

  if (contract.provider_transaction_id)
    return {
      action: "reject",
      reason: "Contract was funded by a different transaction",
    };

  if (contract.status !== "pending_payment")
    return { action: "reject", reason: `Contract is ${contract.status}` };

  const amountMinor = toMinor(data.amount);
  if (amountMinor === null)
    return { action: "reject", reason: "Charge amount is missing or invalid" };

  if (amountMinor !== Number(contract.total_minor))
    return {
      action: "reject",
      reason: `Charge of ${amountMinor} does not match the contract total of ${contract.total_minor}`,
    };

  const currency = (data.currency ?? "").toUpperCase();
  if (currency !== contract.currency.toUpperCase())
    return {
      action: "reject",
      reason: `Charge currency ${currency || "unknown"} does not match ${contract.currency}`,
    };

  return { action: "fund", transactionId, amountMinor };
}

export function planEscrowRefund(
  contract: EscrowContractRow,
  data: PaystackChargeData,
): EscrowRefundDecision {
  const transactionId =
    data.id === undefined || data.id === null ? "" : String(data.id);
  const held = Number(contract.held_minor ?? 0);
  const released = Number(
    (contract as { released_minor?: number }).released_minor ?? 0,
  );
  const refunded = Number(
    (contract as { refunded_minor?: number }).refunded_minor ?? 0,
  );

  if (!contract.provider_transaction_id)
    return { action: "reject", reason: "Contract holds no funded transaction" };
  if (transactionId && contract.provider_transaction_id !== transactionId)
    return {
      action: "reject",
      reason: "Refund belongs to a different transaction",
    };

  const refundable = held - released - refunded;
  if (refundable <= 0)
    return { action: "duplicate", reason: "Nothing left to refund" };

  const amountMinor = toMinor(data.amount);
  const amount =
    amountMinor === null ? refundable : Math.min(amountMinor, refundable);
  return { action: "refund", amountMinor: amount };
}
