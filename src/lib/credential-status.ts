/**
 * FRELUX PRO CREDENTIALS — PHASE 2: status semantics
 *
 * One authority for credential status meaning, transitions and
 * public labeling, shared by the worker submission flow, the
 * reviewer console and the public Pro Connect cards.
 *
 * Roadmap non-negotiables enforced here:
 *  - Legacy statuses are first-class and NEVER remapped.
 *  - Legacy 'verified' is document-reviewed, NOT registry-verified:
 *    it never maps to verified_by_source.
 *  - Public surfaces show jurisdiction-scoped status and
 *    last-checked date, distinguishing "document reviewed" from
 *    "registry verified"; never an unqualified global
 *    "compliant" badge.
 *  - Failed/unavailable registry lookups end in pending or
 *    unable_to_verify — never verified.
 */

import type { CredentialVerificationStatus } from "@/types/pro-connect";

/** Statuses visible on public Pro Connect cards. */
export const PUBLIC_VISIBLE_STATUSES: readonly CredentialVerificationStatus[] =
  [
    "verified_by_source",
    "verified_by_reviewer",
    // legacy rows keep their exact value; still publicly listed
    "verified",
  ] as const;

/** True when the credential may appear on a public profile card. */
export function isPubliclyVisible(
  status: CredentialVerificationStatus,
): boolean {
  return PUBLIC_VISIBLE_STATUSES.includes(status);
}

export type CredentialPublicLabel =
  "registry_verified" | "document_reviewed" | "not_verified";

/**
 * Public verification label. Mirrors the pro_credentials_public
 * view: registry-verified ONLY for verified_by_source; legacy
 * 'verified' and verified_by_reviewer are document-reviewed.
 */
export function publicCredentialLabel(
  status: CredentialVerificationStatus,
): CredentialPublicLabel {
  if (status === "verified_by_source") return "registry_verified";
  if (status === "verified_by_reviewer" || status === "verified")
    return "document_reviewed";
  return "not_verified";
}

/** Actor roles that can perform a transition. */
export type CredentialActorRole = "worker" | "admin";

/**
 * Allowed status transitions. Workers control their own submission
 * lifecycle only; every verification outcome (verify, reject,
 * suspend, revoke) is admin/reviewer-only — mirroring the DB
 * trigger that refuses owner changes to verification fields.
 */
const TRANSITIONS: Partial<
  Record<
    CredentialVerificationStatus,
    Partial<
      Record<CredentialVerificationStatus, readonly CredentialActorRole[]>
    >
  >
> = {
  unverified: { submitted: ["worker", "admin"] },
  submitted: {
    pending_review: ["admin"],
    rejected: ["admin"],
  },
  pending: {
    pending_review: ["admin"],
    rejected: ["admin"],
    verified_by_reviewer: ["admin"],
  },
  pending_review: {
    verified_by_source: ["admin"],
    verified_by_reviewer: ["admin"],
    rejected: ["admin"],
    unable_to_verify: ["admin"],
    submitted: ["admin"], // only a reviewer sends it back; workers wait for the decision
  },
  verified_by_source: {
    expired: ["admin"],
    suspended: ["admin"],
    revoked: ["admin"],
  },
  verified_by_reviewer: {
    expired: ["admin"],
    suspended: ["admin"],
    revoked: ["admin"],
    verified_by_source: ["admin"], // registry confirmation later
  },
  verified: {
    // legacy verified rows are NEVER silently promoted by workers;
    // only an admin decision can move them forward.
    verified_by_source: ["admin"],
    expired: ["admin"],
    suspended: ["admin"],
    revoked: ["admin"],
  },
  rejected: { submitted: ["worker"] },
  unable_to_verify: { pending_review: ["admin"], submitted: ["worker"] },
  expired: { submitted: ["worker"], pending_review: ["admin"] },
  suspended: { pending_review: ["admin"], revoked: ["admin"] },
  revoked: { pending_review: ["admin"] },
};

/**
 * True when `role` may move a credential from `from` to `to`.
 * Unknown transitions are refused (fail closed).
 */
export function canTransition(
  from: CredentialVerificationStatus,
  to: CredentialVerificationStatus,
  role: CredentialActorRole,
): boolean {
  const allowed = TRANSITIONS[from]?.[to];
  return allowed !== undefined && allowed.includes(role);
}

/** True when the status means "an accountable check succeeded". */
export function isVerifiedStatus(
  status: CredentialVerificationStatus,
): boolean {
  return (
    status === "verified_by_source" ||
    status === "verified_by_reviewer" ||
    status === "verified"
  );
}
