/**
 * Security posture disclosure (Engine #12 — RBAC & clearance)
 *
 * Reads security_posture_reviews (live table, admin-written) and
 * reports the HONEST review state per audited surface. Same law as
 * the other Frelux review gates: the app never self-certifies.
 *  - No record for a surface: "not independently reviewed" (never
 *    invented as approved, never claimed compliant).
 *  - pending: the internal audit is disclosed as awaiting review.
 *  - approved: carries the reviewer, the date and the findings; the
 *    UI may say "independently reviewed" — nothing stronger.
 *  - rejected: disclosed verbatim as found deficient.
 */

import { supabase } from "@/lib/supabase";

/** The audited surfaces recorded by the 2026-10-21 internal audit. */
export const SECURITY_SURFACES = [
  "database_rls",
  "rpc_escalation",
  "workspace_rbac",
] as const;
export type SecuritySurface = (typeof SECURITY_SURFACES)[number];

export const SECURITY_SURFACE_LABELS: Record<SecuritySurface, string> = {
  database_rls: "Database row-level security",
  rpc_escalation: "Privileged database functions",
  workspace_rbac: "Workspace roles and member access",
};

export const NOT_INDEPENDENTLY_REVIEWED =
  "Not independently reviewed. An internal audit exists (docs/rbac-threat-model.md) but no qualified reviewer has signed off; treat every security claim accordingly.";

export interface SecurityPostureReview {
  surface: string;
  status: "pending" | "approved" | "rejected" | string;
  findings: string | null;
  reviewer_name: string | null;
  reviewed_at: string | null;
}

export interface SurfacePosture {
  surface: SecuritySurface | string;
  label: string;
  status: "approved" | "rejected" | "pending" | "unreviewed";
  /** Human sentence for the UI. Never claims more than the record. */
  disclosure: string;
  reviewer_name: string | null;
  reviewed_at: string | null;
  findings: string | null;
}

function labelFor(surface: string): string {
  return surface in SECURITY_SURFACE_LABELS
    ? SECURITY_SURFACE_LABELS[surface as SecuritySurface]
    : surface;
}

/** Deterministic per-record posture: the record alone decides the claim. */
export function postureFromReview(
  review: SecurityPostureReview | null,
  surface: string,
): SurfacePosture {
  const label = labelFor(surface);
  if (!review) {
    return {
      surface,
      label,
      status: "unreviewed",
      disclosure: `${label}: no review record exists. ${NOT_INDEPENDENTLY_REVIEWED}`,
      reviewer_name: null,
      reviewed_at: null,
      findings: null,
    };
  }
  if (review.status === "approved") {
    const date = review.reviewed_at
      ? new Date(review.reviewed_at).toISOString().slice(0, 10)
      : "an unknown date";
    return {
      surface,
      label,
      status: "approved",
      disclosure: `${label}: independently reviewed by ${review.reviewer_name ?? "an unnamed reviewer"} on ${date}.`,
      reviewer_name: review.reviewer_name,
      reviewed_at: review.reviewed_at,
      findings: review.findings,
    };
  }
  if (review.status === "rejected") {
    return {
      surface,
      label,
      status: "rejected",
      disclosure: `${label}: review found deficiencies. ${review.findings ?? ""}`.trim(),
      reviewer_name: review.reviewer_name,
      reviewed_at: review.reviewed_at,
      findings: review.findings,
    };
  }
  return {
    surface,
    label,
    status: "pending",
    disclosure: `${label}: internal audit recorded, awaiting independent review. ${NOT_INDEPENDENTLY_REVIEWED}`,
    reviewer_name: null,
    reviewed_at: null,
    findings: review.findings,
  };
}

/** Fetch the honest posture for every registered surface. */
export async function fetchSecurityPosture(): Promise<{
  data: SurfacePosture[];
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from("security_posture_reviews")
      .select("surface, status, findings, reviewer_name, reviewed_at");
    if (error) return { data: [], error: error.message };
    const bySurface = new Map<string, SecurityPostureReview>();
    for (const row of (data ?? []) as SecurityPostureReview[]) {
      bySurface.set(row.surface, row);
    }
    return {
      data: SECURITY_SURFACES.map((surface) =>
        postureFromReview(bySurface.get(surface) ?? null, surface),
      ),
      error: null,
    };
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to load security posture";
    return { data: [], error: msg };
  }
}
