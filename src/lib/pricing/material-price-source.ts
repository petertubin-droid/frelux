/**
 * Where a price in an estimate came from, and how much to trust it.
 *
 * Two rules drive this module:
 *
 *  1. No calculator ships its own material price. A price is either one the
 *     user typed or one FRELUX holds, and the two are never blended by
 *     accident.
 *  2. A FRELUX price is labelled as indicative until it has been verified, so
 *     a quote never reads as a supplier's confirmed figure.
 *
 * When FRELUX holds nothing for a market, the resolver returns no value rather
 * than a plausible-looking number. The caller then has to ask for a custom
 * price, which is the honest outcome.
 */

import {
  lockState,
  vendorLockNotice,
  vendorLockReasonText,
  type VendorLockReason,
  type VendorPriceLock,
} from "@/lib/pricing/vendor-lock";

export type PriceSource = "frelux" | "custom" | "vendor-lock";

export type FreluxPriceStatus = "verified" | "indicative" | "unavailable";

export const FRELUX_PRICE_NOTICE =
  "FRELUX prices are indicative. They come from published listings and price submissions, are not confirmed by a supplier, and can lag the market, so check the price before you order.";

export const CUSTOM_PRICE_NOTICE =
  "You entered this price, so the estimate uses it exactly as typed.";

export interface ResolvePriceArgs {
  source: PriceSource;
  /** What the user typed, in the calculator's currency. */
  customValue: number | null | undefined;
  /** What FRELUX holds for this market, if anything. */
  freluxValue: number | null | undefined;
  /** True only when the FRELUX price has passed verification. */
  freluxVerified?: boolean;
  /**
   * A supplier price held for a period, if one was found for this material,
   * market and currency. Used only while it is inside its own window.
   */
  vendorLock?: VendorPriceLock | null;
  /** The moment to judge the lock against; defaults to now. */
  at?: string | Date;
}

export interface ResolvedPrice {
  value: number | null;
  source: PriceSource;
  status: FreluxPriceStatus;
  notice: string;
  /** True when the calculator must ask for a custom price before it can total. */
  needsCustomPrice: boolean;
  /** Why a supplier lock was or was not used, when one was offered. */
  vendorLockReason?: VendorLockReason;
  /** The lock that was applied, so the quote can cite it. */
  appliedLock?: VendorPriceLock | null;
}

export function freluxPriceStatus(
  value: number | null | undefined,
  verified = false,
): FreluxPriceStatus {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return "unavailable";
  }
  return verified ? "verified" : "indicative";
}

export function resolveMaterialPrice({
  source,
  customValue,
  freluxValue,
  freluxVerified = false,
  vendorLock = null,
  at = new Date(),
}: ResolvePriceArgs): ResolvedPrice {
  // A firm supplier figure beats an indicative one, but only inside its own
  // window: an expired lock is a withdrawn price, not an old one.
  if (vendorLock && source !== "custom") {
    const state = lockState(vendorLock, at);
    if (
      state === "active" &&
      Number.isFinite(vendorLock.lockedPrice) &&
      vendorLock.lockedPrice > 0
    ) {
      return {
        value: vendorLock.lockedPrice,
        source: "vendor-lock",
        status: "verified",
        notice: vendorLockNotice(vendorLock),
        needsCustomPrice: false,
        vendorLockReason: "applied",
        appliedLock: vendorLock,
      };
    }
    const reason: VendorLockReason =
      state === "expired"
        ? "expired"
        : state === "pending"
          ? "pending"
          : "malformed";
    const fallback = resolveMaterialPrice({
      source,
      customValue,
      freluxValue,
      freluxVerified,
    });
    return {
      ...fallback,
      notice: `${vendorLockReasonText(reason)} ${fallback.notice}`.trim(),
      vendorLockReason: reason,
      appliedLock: null,
    };
  }

  if (source === "custom") {
    const typed =
      customValue === null ||
      customValue === undefined ||
      !Number.isFinite(customValue)
        ? null
        : customValue;
    const usable = typed !== null && typed > 0;
    return {
      value: usable ? typed : null,
      source: "custom",
      status: usable ? "verified" : "unavailable",
      notice: usable
        ? CUSTOM_PRICE_NOTICE
        : "Enter your own price to include this material in the total.",
      needsCustomPrice: !usable,
    };
  }

  const status = freluxPriceStatus(freluxValue, freluxVerified);
  return {
    value: status === "unavailable" ? null : Number(freluxValue),
    source: "frelux",
    status,
    notice:
      status === "unavailable"
        ? "FRELUX has no price for this material in your market, so nothing is included until you enter your own."
        : FRELUX_PRICE_NOTICE,
    needsCustomPrice: status === "unavailable",
  };
}

/** Short label for a badge next to a price. */
export function priceStatusLabel(status: FreluxPriceStatus): string {
  if (status === "verified") return "Verified";
  if (status === "indicative") return "Indicative";
  return "No price";
}
