/**
 * A supplier price held for a period, and whether it may be quoted.
 *
 * FRELUX prices are indicative: they come from published listings and price
 * submissions, and they lag the market. A tender cannot be priced on an
 * indicative figure when the supplier has already quoted a firm rate with an
 * expiry, so a vendor lock is kept separately and used only while it is inside
 * its validity window.
 *
 * Three rules:
 *  1. A lock is used only inside its own window. An expired lock is not a
 *     slightly old price, it is no longer a price, and quoting it would put a
 *     number the supplier has withdrawn into a tender.
 *  2. A lock is used only in its own currency and its own market. Applying a
 *     dollar quote to a naira book is a wrong number, not a conversion.
 *  3. A lock that cannot be used says why, so the interface can show the real
 *     reason instead of an unexplained indicative price.
 */

export type VendorLockReason =
  | "applied"
  | "no_lock"
  | "expired"
  | "pending"
  | "currency_mismatch"
  | "market_mismatch"
  | "material_mismatch"
  | "malformed";

export interface VendorPriceLock {
  id?: string;
  market: string;
  materialSlug: string;
  supplierName: string;
  /** The supplier's reference: quote number, contract line, feed id. */
  supplierRef?: string | null;
  lockedPrice: number;
  currency: string;
  unit: string;
  /** ISO timestamps. */
  validFrom: string;
  validTo: string;
  /** "quote" | "contract" | "feed" */
  source?: string | null;
  notes?: string | null;
}

export type VendorLockState = "active" | "pending" | "expired" | "malformed";

function time(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

/** Where a lock sits relative to a moment, judged only by its own window. */
export function lockState(
  lock: VendorPriceLock,
  at: string | Date = new Date(),
): VendorLockState {
  const from = time(lock.validFrom);
  const to = time(lock.validTo);
  const now = at instanceof Date ? at.getTime() : time(at);
  if (from === null || to === null || now === null || to <= from)
    return "malformed";
  if (now < from) return "pending";
  if (now >= to) return "expired";
  return "active";
}

export interface VendorLockSelection {
  lock: VendorPriceLock | null;
  reason: VendorLockReason;
}

/**
 * Picks the lock a quote may use, or explains why none may.
 *
 * Among usable locks the most recently effective one wins: a supplier's newer
 * quote supersedes their older one even if both are still inside their windows.
 * Nothing is ever chosen across a market or a currency boundary.
 */
export function selectVendorLock(
  locks: VendorPriceLock[],
  query: {
    market: string;
    materialSlug: string;
    currency?: string | null;
    at?: string | Date;
  },
): VendorLockSelection {
  const market = (query.market ?? "").trim().toUpperCase();
  const slug = (query.materialSlug ?? "").trim();
  const currency = (query.currency ?? "").trim().toUpperCase();
  const at = query.at ?? new Date();

  if (!market || !slug) return { lock: null, reason: "no_lock" };

  const forMaterial = locks.filter(
    (lock) => (lock.materialSlug ?? "").trim() === slug,
  );
  if (forMaterial.length === 0)
    return { lock: null, reason: "material_mismatch" };

  const forMarket = forMaterial.filter(
    (lock) => (lock.market ?? "").trim().toUpperCase() === market,
  );
  if (forMarket.length === 0) return { lock: null, reason: "market_mismatch" };

  const forCurrency = currency
    ? forMarket.filter(
        (lock) => (lock.currency ?? "").trim().toUpperCase() === currency,
      )
    : forMarket;
  if (forCurrency.length === 0)
    return { lock: null, reason: "currency_mismatch" };

  const states = forCurrency.map((lock) => ({
    lock,
    state: lockState(lock, at),
  }));
  const active = states
    .filter((entry) => entry.state === "active")
    .sort(
      (a, b) => (time(b.lock.validFrom) ?? 0) - (time(a.lock.validFrom) ?? 0),
    );

  if (active.length > 0) return { lock: active[0].lock, reason: "applied" };

  if (states.some((entry) => entry.state === "expired")) {
    return { lock: null, reason: "expired" };
  }
  if (states.some((entry) => entry.state === "pending")) {
    return { lock: null, reason: "pending" };
  }
  return { lock: null, reason: "malformed" };
}

/** The sentence shown beside a quoted locked price. */
export function vendorLockNotice(lock: VendorPriceLock): string {
  const until = (lock.validTo ?? "").slice(0, 10);
  const ref = lock.supplierRef ? ` (ref ${lock.supplierRef})` : "";
  return `Supplier price locked at ${lock.currency} ${lock.lockedPrice.toLocaleString("en", { maximumFractionDigits: 2 })} per ${lock.unit} by ${lock.supplierName}${ref}, held until ${until}. Firm while it lasts.`;
}

/** Why a lock could not be used, in the visitor's words. */
export function vendorLockReasonText(reason: VendorLockReason): string {
  switch (reason) {
    case "applied":
      return "";
    case "expired":
      return "The supplier price lock for this material has expired, so the price shown is FRELUX's indicative figure. Ask the supplier to re-confirm before you tender.";
    case "pending":
      return "A supplier price lock for this material starts later, so it is not used yet.";
    case "currency_mismatch":
      return "A supplier lock exists but is quoted in another currency, so it was not applied to this estimate.";
    case "market_mismatch":
      return "Supplier locks exist for this material in other markets, not in yours.";
    case "material_mismatch":
      return "No supplier price lock is held for this material.";
    case "malformed":
      return "A supplier price lock exists but its dates are unusable, so it was ignored.";
    default:
      return "";
  }
}
