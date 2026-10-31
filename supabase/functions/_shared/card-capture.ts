// =========================================================
// Turning a settled card payment into a reusable token.
//
// Flutterwave's verification response carries data.card.token for card
// payments. That token is what makes unattended top-ups possible without this
// app ever holding a card number, which keeps the site out of card-data scope.
//
// Parsing is strict: a token that does not look like a provider token is
// dropped rather than stored, because a garbage token would fail every future
// charge and switch auto top-up off for no good reason.
// =========================================================

export interface CapturedCard {
  token: string;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function fourDigits(value: unknown): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return /^[0-9]{4}$/.test(text) ? text : null;
}

/** "09/32" or "09/2032" into a month and a four-digit year. */
export function parseExpiry(
  value: unknown,
): { month: number; year: number } | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{1,2})\s*\/\s*(\d{2}|\d{4})$/.exec(value.trim());
  if (!match) return null;
  const month = Number(match[1]);
  if (month < 1 || month > 12) return null;
  const rawYear = Number(match[2]);
  const year = match[2].length === 2 ? 2000 + rawYear : rawYear;
  return { month, year };
}

/**
 * Read a card token out of a verification payload, or nothing.
 *
 * Requires the transaction itself to be successful. A token from a failed
 * payment is a card the customer tried and the issuer refused, and it must
 * never become the card we charge later.
 */
export function extractCardToken(payload: unknown): CapturedCard | null {
  const root = asRecord(payload);
  const data = asRecord(root?.data);
  if (!data) return null;
  if (
    typeof data.status === "string" &&
    data.status.toLowerCase() !== "successful"
  )
    return null;

  const card = asRecord(data.card);
  const token = typeof card?.token === "string" ? card.token.trim() : "";
  // Provider tokens look like flw-t1nf-<hex>-<suffix>. Anything else is not a
  // token and must not be stored as one.
  if (!/^flw-t1nf-[0-9a-f]{32}-[a-z0-9]+$/i.test(token)) return null;

  const expiry = parseExpiry(card?.expiry);
  const expMonth =
    expiry?.month ??
    (typeof card?.expiry_month === "number" ? card.expiry_month : null);
  const expYear =
    expiry?.year ??
    (typeof card?.expiry_year === "number" ? card.expiry_year : null);

  return {
    token,
    brand: typeof card?.card_type === "string" ? card.card_type : null,
    last4: fourDigits(card?.last_4digits),
    expMonth: expMonth && expMonth >= 1 && expMonth <= 12 ? expMonth : null,
    expYear: expYear && expYear > 2000 ? expYear : null,
  };
}

/**
 * Whether the card itself expires soon, so the owner can be told before a
 * charge fails. Distinct from token age: provider tokens last one year from
 * creation regardless of the card's own expiry date.
 */
export function cardExpiresSoon(
  expMonth: number | null,
  expYear: number | null,
  now: Date,
): boolean {
  if (!expMonth || !expYear) return false;
  const end = new Date(Date.UTC(expYear, expMonth, 1));
  const days = (end.getTime() - now.getTime()) / 86_400_000;
  return days <= 45;
}
