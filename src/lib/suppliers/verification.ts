/**
 * Verification vocabulary.
 *
 * Each level names a check FRELUX actually ran. None of them certifies quality,
 * solvency or delivery reliability, and the public copy says so, because a
 * registered account must never read as a trustworthy one.
 */

import type { VerificationLevel } from "./types";

export interface VerificationLevelDefinition {
  level: VerificationLevel;
  rank: number;
  label: string;
  shortLabel: string;
  meaning: string;
  checked: string[];
  doesNotMean: string;
}

export const VERIFICATION_LEVELS: VerificationLevelDefinition[] = [
  {
    level: "unverified",
    rank: 0,
    label: "Registered, not verified",
    shortLabel: "Unverified",
    meaning:
      "The supplier created an account and entered their own details. Nothing has been checked by FRELUX.",
    checked: [],
    doesNotMean:
      "Registration is self-reported. Treat prices and claims here as unconfirmed until a higher level is shown.",
  },
  {
    level: "identity_checked",
    rank: 1,
    label: "Identity checked",
    shortLabel: "ID checked",
    meaning:
      "A named representative's identity was matched to the business phone and email on the account.",
    checked: [
      "Representative identity document",
      "Contact phone and email match",
    ],
    doesNotMean:
      "An identity check confirms who is operating the account, not that the business is registered or solvent.",
  },
  {
    level: "documents_reviewed",
    rank: 2,
    label: "Business documents reviewed",
    shortLabel: "Documents reviewed",
    meaning:
      "Business registration details (such as a CAC number) and tax details were reviewed against the documents supplied.",
    checked: [
      "Business registration document",
      "Tax identification where available",
      "Trading name matches the documents",
    ],
    doesNotMean:
      "Reviewed documents confirm the business exists on paper. They do not confirm stock, pricing accuracy or delivery record.",
  },
  {
    level: "address_checked",
    rank: 3,
    label: "Address checked",
    shortLabel: "Address checked",
    meaning:
      "The trading address or market location was verified, by visit or by location evidence accepted by FRELUX.",
    checked: [
      "Trading address or market stall location",
      "Supplier reachable at the published address",
    ],
    doesNotMean:
      "A verified address confirms a physical presence, not the size of the business or the quality of its materials.",
  },
  {
    level: "platform_verified",
    rank: 4,
    label: "Platform-verified supplier",
    shortLabel: "Platform verified",
    meaning:
      "Identity, business documents and address were all checked, and the catalogue was spot-checked against live stock and prices.",
    checked: [
      "Identity check",
      "Business documents review",
      "Address check",
      "Catalogue and price spot-check",
      "At least one trade reference",
    ],
    doesNotMean:
      "This is FRELUX's highest check. It is still not a warranty of material quality, warranty terms or on-time delivery; agree those in writing with the supplier.",
  },
];

export function verificationDefinition(
  level: VerificationLevel | string | null | undefined,
): VerificationLevelDefinition {
  return (
    VERIFICATION_LEVELS.find((entry) => entry.level === level) ??
    VERIFICATION_LEVELS[0]
  );
}

export function verificationLabels(): VerificationLevelDefinition[] {
  return VERIFICATION_LEVELS;
}

export function levelRank(
  level: VerificationLevel | string | null | undefined,
): number {
  return verificationDefinition(level).rank;
}

export function isAtLeast(
  level: VerificationLevel | string | null | undefined,
  minimum: VerificationLevel,
): boolean {
  return levelRank(level) >= levelRank(minimum);
}

/** Levels a supplier may request next; each builds on the one below it. */
export function requestableLevels(
  current: VerificationLevel | string | null | undefined,
): VerificationLevel[] {
  const rank = levelRank(current);
  return VERIFICATION_LEVELS.filter((entry) => entry.rank > rank).map(
    (entry) => entry.level,
  );
}

export function nextLevel(
  level: VerificationLevel | string | null | undefined,
): VerificationLevel | null {
  return requestableLevels(level)[0] ?? null;
}

/**
 * Requirements a supplier must satisfy before FRELUX will consider the next
 * level. Returned as plain statements so the dashboard can show the gap rather
 * than a vague "not verified".
 */
export function verificationRequirements(
  level: VerificationLevel,
  context: {
    hasBusinessRegNo?: boolean;
    hasTaxId?: boolean;
    hasAddress?: boolean;
    hasPhone?: boolean;
    hasEmail?: boolean;
    hasContactName?: boolean;
    priorLevel?: VerificationLevel | string | null;
    hasCategories?: boolean;
    hasListings?: boolean;
    latestPriceDaysOld?: number | null;
  },
): { requirement: string; met: boolean }[] {
  const reqs: { requirement: string; met: boolean }[] = [];
  const push = (requirement: string, met: boolean) =>
    reqs.push({ requirement, met });

  if (level === "identity_checked") {
    push("Contact phone number on the profile", Boolean(context.hasPhone));
    push("Business email on the profile", Boolean(context.hasEmail));
    push(
      "A named representative (contact name)",
      Boolean(context.hasContactName),
    );
  }
  if (level === "documents_reviewed") {
    push(
      "Business registration number supplied",
      Boolean(context.hasBusinessRegNo),
    );
    push(
      "Tax identification supplied where available",
      Boolean(context.hasTaxId),
    );
    push(
      "At least one product category selected",
      Boolean(context.hasCategories),
    );
  }
  if (level === "address_checked") {
    push(
      "Trading address or market location supplied",
      Boolean(context.hasAddress),
    );
    push(
      "At least one product listed in the catalogue",
      Boolean(context.hasListings),
    );
  }
  if (level === "platform_verified") {
    push(
      "Identity, business documents and address checks completed",
      isAtLeast(context.priorLevel, "address_checked"),
    );
    push("Catalogue published with prices", Boolean(context.hasListings));
    push(
      "Latest price update within 30 days",
      context.latestPriceDaysOld !== null &&
        context.latestPriceDaysOld !== undefined
        ? context.latestPriceDaysOld <= 30
        : false,
    );
  }
  return reqs;
}

/** The badge text shown in the directory. Never says "trusted". */
export function publicBadge(
  level: VerificationLevel | string | null | undefined,
): {
  label: string;
  tone: "neutral" | "info" | "positive";
} {
  switch (level) {
    case "platform_verified":
      return { label: "Platform verified", tone: "positive" };
    case "address_checked":
      return { label: "Address checked", tone: "info" };
    case "documents_reviewed":
      return { label: "Documents reviewed", tone: "info" };
    case "identity_checked":
      return { label: "ID checked", tone: "info" };
    default:
      return { label: "Unverified", tone: "neutral" };
  }
}
