/**
 * FRELUX Engine #5, M1: deterministic compliance checklist generator.
 *
 * Source of truth is the LIVE construction_standards registry (every row
 * web-verified with citation). The generator is DETERMINISTIC: the same
 * registry rows + the same requested engines produce the same checklist,
 * ordered by domain then ref. It never invents a standard, never claims
 * compliance, and discloses every engine with no standard on file as an
 * honest unknown.
 *
 * HONESTY CONTRACT (mirrors the i18n mandate — no invented claims):
 *  - A checklist item cites the EXACT ref, title, authority and verified
 *    date from the registry row. No paraphrasing of the requirement.
 *  - Confidence 'low'/'medium' items are flagged "pending verification".
 *  - Engines requested with no matching registry row appear in `unknowns`
 *    with a disclosure — never a fabricated entry.
 *  - The output NEVER says "compliant". It lists applicable standards and
 *    their review status; verification of execution is always human.
 */

import { supabase } from "@/lib/supabase";

export interface ConstructionStandardRow {
  id: string;
  market_code: string;
  domain: string;
  ref: string;
  title: string;
  authority: string;
  evidence_type: string;
  coverage_spec: string | null;
  applies_to: { engines?: string[] } | null;
  notes: string;
  confidence: "high" | "medium" | "low";
  evidence_url: string | null;
  verified_date: string;
}

export interface ComplianceReviewRow {
  id: string;
  market_code: string;
  domain: string;
  ref: string;
  review_status: "pending" | "approved" | "rejected";
  reviewer_name: string | null;
  reviewer_credentials: string | null;
  review_notes: string | null;
  reviewed_at: string | null;
}

export type ChecklistItemStatus =
  | "applicable" // standard applies; cite it
  | "pending_verification" // applies but low/medium confidence
  | "unknown"; // no standard on file for this engine

export interface ChecklistItem {
  /** Stable key: market-domain-ref (or 'unknown-engine' for gaps). */
  key: string;
  marketCode: string;
  domain: string;
  ref: string | null;
  title: string;
  authority: string | null;
  evidenceType: string | null;
  coverageSpec: string | null;
  appliesToEngines: string[];
  confidence: "high" | "medium" | "low" | null;
  evidenceUrl: string | null;
  verifiedDate: string | null;
  /** Exact citation string, safe to show verbatim. */
  citation: string;
  notes: string | null;
  status: ChecklistItemStatus;
  review: {
    status: "pending" | "approved" | "rejected" | "none";
    reviewerName: string | null;
    reviewedAt: string | null;
  };
}

export interface ComplianceChecklist {
  marketCode: string;
  requestedEngines: string[];
  /** Items grouped by domain, sorted by ref within each group. */
  items: ChecklistItem[];
  /** Engines requested with no matching standard — honest disclosure. */
  unknowns: string[];
  /** True when the market has NO registry rows at all. */
  noStandardsOnFile: boolean;
  /** Never-certify disclaimer, always present. */
  disclaimer: string;
}

const NEVER_CERTIFY_DISCLAIMER =
  "This checklist cites applicable standards only. It does not certify " +
  "compliance: verification of execution is always a human, expert " +
  "responsibility. No AI-only compliance certification is implied.";

function enginesOf(row: ConstructionStandardRow): string[] {
  const e = row.applies_to?.engines;
  return Array.isArray(e) ? e.filter((x) => typeof x === "string") : [];
}

function citationFor(row: ConstructionStandardRow): string {
  const date = row.verified_date ?? "";
  return `${row.ref} — ${row.title} (${row.authority}, verified ${date})`;
}

/** Fetch the live registry rows for a market, newest verified_date first. */
export async function fetchStandardsForMarket(
  marketCode: string,
): Promise<ConstructionStandardRow[]> {
  const cc = (marketCode || "").trim().toUpperCase();
  if (!cc) return [];
  const { data, error } = await supabase
    .from("construction_standards")
    .select("*")
    .eq("market_code", cc)
    .order("verified_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ConstructionStandardRow[];
}

/** Fetch the expert-review rows for a market (the review gate). */
export async function fetchComplianceReviews(
  marketCode: string,
): Promise<ComplianceReviewRow[]> {
  const cc = (marketCode || "").trim().toUpperCase();
  if (!cc) return [];
  const { data, error } = await supabase
    .from("compliance_reviews")
    .select("*")
    .eq("market_code", cc)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ComplianceReviewRow[];
}

/**
 * Generate a deterministic compliance checklist for a market + the set of
 * engines involved in a project. Same inputs + same registry rows =>
 * same output (items sorted by domain, then ref). Unknowns are
 * disclosed; nothing is invented; nothing is certified.
 */
export function buildChecklistFromRows(
  rows: ConstructionStandardRow[],
  reviews: ComplianceReviewRow[],
  marketCode: string,
  requestedEngines: string[],
): ComplianceChecklist {
  const cc = (marketCode || "").trim().toUpperCase();
  const engines = Array.from(new Set((requestedEngines ?? []).map((e) => e.trim()).filter(Boolean)));
  const reviewByRef = new Map<string, ComplianceReviewRow>();
  for (const r of reviews) {
    reviewByRef.set(`${r.domain}|${r.ref}`, r);
  }

  const items: ChecklistItem[] = [];
  const covered = new Set<string>();

  for (const row of rows) {
    const rowEngines = enginesOf(row);
    const matches = engines.length === 0 || rowEngines.some((e) => engines.includes(e));
    if (!matches) continue;
    for (const e of rowEngines) {
      if (engines.length === 0 || engines.includes(e)) covered.add(e);
    }
    const review = reviewByRef.get(`${row.domain}|${row.ref}`);
    const lowConfidence = row.confidence === "low" || row.confidence === "medium";
    items.push({
      key: `${cc}-${row.domain}-${row.ref}`,
      marketCode: cc,
      domain: row.domain,
      ref: row.ref,
      title: row.title,
      authority: row.authority,
      evidenceType: row.evidence_type,
      coverageSpec: row.coverage_spec,
      appliesToEngines: rowEngines,
      confidence: row.confidence,
      evidenceUrl: row.evidence_url,
      verifiedDate: row.verified_date,
      citation: citationFor(row),
      notes: row.notes,
      status: lowConfidence ? "pending_verification" : "applicable",
      review: {
        status: review?.review_status ?? "none",
        reviewerName: review?.reviewer_name ?? null,
        reviewedAt: review?.reviewed_at ?? null,
      },
    });
  }

  // Deterministic ordering: domain asc, then ref asc.
  items.sort((a, b) =>
    a.domain === b.domain
      ? (a.ref ?? "").localeCompare(b.ref ?? "")
      : a.domain.localeCompare(b.domain),
  );

  const unknowns = engines.filter((e) => !covered.has(e)).sort();

  return {
    marketCode: cc,
    requestedEngines: engines,
    items,
    unknowns,
    noStandardsOnFile: rows.length === 0,
    disclaimer: NEVER_CERTIFY_DISCLAIMER,
  };
}

/** DB-backed convenience wrapper. */
export async function generateComplianceChecklist(
  marketCode: string,
  requestedEngines: string[],
): Promise<ComplianceChecklist> {
  const [rows, reviews] = await Promise.all([
    fetchStandardsForMarket(marketCode),
    fetchComplianceReviews(marketCode),
  ]);
  return buildChecklistFromRows(rows, reviews, marketCode, requestedEngines);
}
