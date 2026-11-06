/**
 * One description of how well a price is evidenced.
 *
 * Production data makes this necessary: of 1369 rows in market_material_prices,
 * 1366 carry verification_status 'unverified', none carry last_verified_at, and
 * nine carry a source URL or supplier. Forty markets hold prices while three
 * markets hold any observation at all. A surface that answers "what does cement
 * cost here" must not let those rows read as confirmed local prices, and a
 * row that claims 'verified' without a date has nothing to check the claim
 * against, so the claim is treated as unverified.
 *
 * Age matters independently of the status column: a price confirmed a year ago
 * is last-known evidence, not a current quote. Nothing in the estimation or
 * supplier paths compared a stamp against today before this module existed.
 */

export const DAY_MS = 86_400_000;

/** Beyond this, a stamp stops describing the current market. */
export const STALE_AFTER_DAYS = 90;

/** Beyond this, a verified stamp is still honest but worth dating in copy. */
export const AGING_AFTER_DAYS = 45;

export type PriceEvidenceState =
  "verified" | "stale" | "observed" | "unverified" | "no_data";

export interface PriceProvenanceInput {
  verificationStatus?: string | null;
  lastVerifiedAt?: string | null;
  lastScannedAt?: string | null;
  sourceUrl?: string | null;
  supplierName?: string | null;
  observationsCount?: number | null;
}

export interface PriceProvenance {
  state: PriceEvidenceState;
  /** Short label for a badge or a line of body copy. */
  label: string;
  /** One sentence of supporting detail, safe to render under the label. */
  detail: string;
  tone: "positive" | "caution" | "neutral";
  asOf: string | null;
  ageDays: number | null;
  /** True when a source URL, supplier or observation backs the number. */
  sourced: boolean;
  /** True only when the price is verified now, not merely once verified. */
  isVerified: boolean;
}

export function ageInDays(
  stamp: string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!stamp) return null;
  const then = new Date(stamp).getTime();
  if (!Number.isFinite(then)) return null;
  return Math.max(0, Math.floor((now.getTime() - then) / DAY_MS));
}

function agePhrase(ageDays: number | null): string {
  if (ageDays === null) return "with no date recorded";
  if (ageDays === 0) return "today";
  if (ageDays === 1) return "yesterday";
  return `${ageDays} days ago`;
}

export function describePriceProvenance(
  input: PriceProvenanceInput,
  now: Date = new Date(),
): PriceProvenance {
  const status = (input.verificationStatus ?? "").trim().toLowerCase();
  const asOf = input.lastVerifiedAt ?? input.lastScannedAt ?? null;
  const ageDays = ageInDays(asOf, now);
  const observations = Math.max(0, Number(input.observationsCount ?? 0));
  const sourced =
    Boolean(input.sourceUrl) || Boolean(input.supplierName) || observations > 0;

  const base = { asOf, ageDays, sourced };

  if (status === "no_data" || status === "none") {
    return {
      ...base,
      state: "no_data",
      label: "No local price on record",
      detail:
        "Nothing has been collected for this material in this market, so no price is shown rather than an invented one.",
      tone: "neutral",
      isVerified: false,
    };
  }

  // A status of verified without a date cannot be checked, so it is demoted.
  const claimsVerified = status === "verified" && asOf !== null;

  if (claimsVerified) {
    if (ageDays !== null && ageDays > STALE_AFTER_DAYS) {
      return {
        ...base,
        state: "stale",
        label: "Last known price, not verified now",
        detail: `The last verification was ${agePhrase(ageDays)}. Treat it as a guide, not a quote.`,
        tone: "caution",
        isVerified: false,
      };
    }
    const aging = ageDays !== null && ageDays > AGING_AFTER_DAYS;
    return {
      ...base,
      state: "verified",
      label: "Verified locally",
      detail: `Verification date ${agePhrase(ageDays)}.`,
      tone: aging ? "caution" : "positive",
      isVerified: true,
    };
  }

  if (status === "stale" || (ageDays !== null && ageDays > STALE_AFTER_DAYS)) {
    return {
      ...base,
      state: "stale",
      label: "Last known price, not verified now",
      detail: `The last evidence is ${agePhrase(ageDays)}. Treat it as a guide, not a quote.`,
      tone: "caution",
      isVerified: false,
    };
  }

  if (observations > 0) {
    return {
      ...base,
      state: "observed",
      label: "Observed, awaiting verification",
      detail: `${observations} observation${observations === 1 ? "" : "s"} recorded, none reviewed yet.`,
      tone: "neutral",
      isVerified: false,
    };
  }

  if (sourced) {
    return {
      ...base,
      state: "observed",
      label: "Source recorded, not verified",
      detail: `A source is attached${ageDays === null ? "" : ` from ${agePhrase(ageDays)}`}, but no reviewer has confirmed the price.`,
      tone: "neutral",
      isVerified: false,
    };
  }

  return {
    ...base,
    state: "unverified",
    label: "Indicative price, no source recorded",
    detail:
      "No observation, supplier or source URL backs this number, so it is an estimate for orientation only.",
    tone: "caution",
    isVerified: false,
  };
}
