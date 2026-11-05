/**
 * Identity verification status and the automatic review fallback.
 *
 * A submitted government ID is reviewed by an administrator. If no
 * administrator gets to it, the platform verifies it automatically once
 * the review window has passed (15 minutes minimum), and records that the
 * decision was automatic. This module is the client side of that
 * behaviour: constants, labels and the status read.
 */

import { getSupabase, isSupabaseConfigured } from "@/lib/supabase-lazy";

/** Minimum unreviewed time before the automatic fallback acts. */
export const IDENTITY_AUTO_VERIFY_MINUTES = 15;

export const IDENTITY_AUTO_VERIFY_NOTICE = `If no FRELUX administrator reviews your ID within ${IDENTITY_AUTO_VERIFY_MINUTES} minutes, it is verified automatically and marked as automatically verified.`;

export const IDENTITY_REVIEW_NOTICE =
  "Your ID is queued for review. You can continue; the account updates by itself when the review completes.";

export type IdentityReviewStatus =
  | "none"
  | "pending"
  | "approved"
  | "rejected"
  | "more_info"
  | "withdrawn"
  | "unknown";

export interface MyIdentityVerification {
  status: IdentityReviewStatus;
  documentType: string | null;
  submittedAt: string | null;
  autoVerified: boolean;
  verifiedAt: string | null;
  /** When the automatic fallback is expected to run. */
  autoVerifyAt: string | null;
}

export const EMPTY_IDENTITY_VERIFICATION: MyIdentityVerification = {
  status: "none",
  documentType: null,
  submittedAt: null,
  autoVerified: false,
  verifiedAt: null,
  autoVerifyAt: null,
};

/** Minutes left before the automatic review, 0 once it is due. */
export function minutesUntilAutoVerification(
  autoVerifyAt: string | null,
  now: Date = new Date(),
): number | null {
  if (!autoVerifyAt) return null;
  const target = new Date(autoVerifyAt).getTime();
  if (Number.isNaN(target)) return null;
  const diff = target - now.getTime();
  return diff <= 0 ? 0 : Math.ceil(diff / 60000);
}

export function isIdentityVerified(
  verification: MyIdentityVerification,
): boolean {
  return verification.status === "approved";
}

/** Human sentence for the current review state. */
export function identityReviewLabel(
  verification: MyIdentityVerification,
): string {
  switch (verification.status) {
    case "approved":
      return verification.autoVerified
        ? "Identity verified automatically after the review window."
        : "Identity verified by a FRELUX administrator.";
    case "pending": {
      const left = minutesUntilAutoVerification(verification.autoVerifyAt);
      if (left === null) return IDENTITY_REVIEW_NOTICE;
      if (left === 0) return "Automatic verification is due now.";
      return `Under review. Automatic verification in about ${left} minute${left === 1 ? "" : "s"} if no administrator reviews it first.`;
    }
    case "rejected":
      return "The submitted ID was rejected. Submit a valid document to try again.";
    case "more_info":
      return "An administrator needs more information about the submitted ID.";
    case "withdrawn":
      return "The identity submission was withdrawn.";
    case "none":
      return "No government ID has been submitted yet.";
    default:
      return IDENTITY_REVIEW_NOTICE;
  }
}

/** Read the signed-in professional's identity verification status. */
export async function fetchMyIdentityVerification(): Promise<MyIdentityVerification> {
  if (!isSupabaseConfigured) return EMPTY_IDENTITY_VERIFICATION;
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("get_my_identity_verification", {
    p_min_age: `${IDENTITY_AUTO_VERIFY_MINUTES} minutes`,
  });
  if (error || !data) return EMPTY_IDENTITY_VERIFICATION;
  const row = (Array.isArray(data) ? data[0] : data) as
    | {
        status?: string;
        document_type?: string | null;
        submitted_at?: string | null;
        auto_verified?: boolean | null;
        verified_at?: string | null;
        auto_verify_at?: string | null;
      }
    | undefined;
  if (!row) return EMPTY_IDENTITY_VERIFICATION;
  const status = (row.status ?? "unknown") as IdentityReviewStatus;
  return {
    status,
    documentType: row.document_type ?? null,
    submittedAt: row.submitted_at ?? null,
    autoVerified: Boolean(row.auto_verified),
    verifiedAt: row.verified_at ?? null,
    autoVerifyAt: row.auto_verify_at ?? null,
  };
}
