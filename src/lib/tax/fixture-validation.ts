// =========================================================
// FRELUX TAX FIXTURE VALIDATION (Phase 1, 2026-10-24)
//
// Per-jurisdiction fixture validation by an accountable local
// reviewer. The fixture tests prove the deterministic engine
// reproduces the seeded data; this layer answers the human
// question: has an accountable local reviewer checked this
// market's fixture against local knowledge?
//
// Fail-closed honesty: a market with no validation record is
// PENDING. Nothing is ever auto-validated; a 'validated' state
// exists only as a human verdict in tax_rule_validations that
// passed the database's accountability gate.
// =========================================================

import { supabase } from "@/lib/supabase";

export interface TaxValidationRecord {
  id: string;
  market_code: string;
  rule_ref: string;
  verdict: "validated" | "rejected" | "needs_changes";
  reviewer_name: string;
  reviewer_role: string;
  reviewer_location: string;
  review_date: string;
  checklist: Record<string, boolean> | null;
  evidence_url: string | null;
  notes: string | null;
}

export interface TaxValidationState {
  /** pending until a human verdict exists. */
  state: "pending" | "validated" | "rejected" | "needs_changes";
  reviewerName: string | null;
  reviewerRole: string | null;
  reviewerLocation: string | null;
  reviewDate: string | null;
  evidenceUrl: string | null;
  notes: string | null;
}

const PENDING: TaxValidationState = {
  state: "pending",
  reviewerName: null,
  reviewerRole: null,
  reviewerLocation: null,
  reviewDate: null,
  evidenceUrl: null,
  notes: null,
};

/**
 * Latest validation record for a market, or null when no
 * accountable reviewer has recorded a verdict yet.
 */
export async function fetchLatestTaxValidation(
  marketCode: string,
): Promise<TaxValidationRecord | null> {
  const code = (marketCode || "").trim().toUpperCase();
  if (!code) return null;
  const { data, error } = await supabase
    .from("tax_rule_validations")
    .select("*")
    .eq("market_code", code)
    .order("review_date", { ascending: false })
    .limit(1);
  if (error) throw error;
  const rows = (data ?? []) as TaxValidationRecord[];
  return rows[0] ?? null;
}

/**
 * Validation state for a market's tax data. PENDING is the
 * honest default; it never invents a reviewer.
 */
export async function fetchTaxValidationState(
  marketCode: string,
): Promise<TaxValidationState> {
  const record = await fetchLatestTaxValidation(marketCode);
  if (!record) return PENDING;
  return {
    state: record.verdict,
    reviewerName: record.reviewer_name,
    reviewerRole: record.reviewer_role,
    reviewerLocation: record.reviewer_location,
    reviewDate: record.review_date,
    evidenceUrl: record.evidence_url,
    notes: record.notes,
  };
}

/** User-safe sentence for quote surfaces. */
export function validationStateMessage(v: TaxValidationState): string {
  switch (v.state) {
    case "validated":
      return (
        `Tax fixture validated by ${v.reviewerName}` +
        (v.reviewerRole
          ? ` (${v.reviewerRole}` +
            (v.reviewerLocation ? `, ${v.reviewerLocation}` : "") +
            ")"
          : "") +
        ` on ${v.reviewDate}.`
      );
    case "rejected":
      return (
        `Tax fixture rejected by ${v.reviewerName ?? "the reviewer"}` +
        ` on ${v.reviewDate}. The seeded rule requires correction.`
      );
    case "needs_changes":
      return (
        `Tax fixture review by ${v.reviewerName ?? "the reviewer"}` +
        ` on ${v.reviewDate} requested changes.`
      );
    default:
      return "Awaiting validation by an accountable local reviewer for this market.";
  }
}
