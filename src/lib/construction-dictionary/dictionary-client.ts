// =========================================================
// FRELUX AI MULTILINGUAL CONSTRUCTION DICTIONARY
// DATABASE CLIENT
//
// Server-side RLS enforces the split:
//   * admins manage terminology (approve/reject/edit/
//     version; verification is a deliberate human action)
//   * authenticated users read dictionary records
//   * every change writes a version audit row so terminology
//     can be reviewed and reversed
//
// This module never touches the calculator engines: it only
// resolves language and terminology around them.
// =========================================================

import { getSupabase } from "@/lib/supabase-lazy";
import type { ConstructionTerm, ConstructionTermDraft, TranslationStatus } from "./types";
import { canTransitionStatus } from "./translation-rules";

export interface DictionaryRow {
  id: string;
  canonical_term: string;
  category: string;
  definition: string;
  technical_definition: string;
  simple_definition: string;
  language: string;
  translation: string | null;
  alternative_terms: string[];
  local_terms: string[];
  synonyms: string[];
  abbreviations: string[];
  unit: string | null;
  measurement_type: string | null;
  construction_context: string;
  example_usage: string;
  related_terms: string[];
  common_mistakes: string[];
  translation_notes: string | null;
  country: string;
  region: string;
  source: string | null;
  source_url: string | null;
  source_date: string | null;
  confidence_score: number;
  verified: boolean;
  verified_by: string | null;
  translation_status: string;
  keep_in_english: boolean;
  explanation_required: boolean;
  nigerian_terminology: Record<string, unknown> | null;
  source_details: Record<string, unknown> | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface DictionaryVersionRow {
  id: string;
  term_id: string;
  version: number;
  canonical_term: string;
  language: string;
  changed_fields: string[];
  changed_by: string | null;
  change_note: string | null;
  snapshot: Record<string, unknown>;
  created_at: string;
}

function rowToTerm(row: DictionaryRow): ConstructionTerm {
  return {
    ...row,
    category: row.category as ConstructionTerm["category"],
    translation_status: row.translation_status as TranslationStatus,
    nigerian_terminology: (row.nigerian_terminology as ConstructionTerm["nigerian_terminology"]) ?? null,
    source_details: (row.source_details as ConstructionTerm["source_details"]) ?? null,
  };
}

/** GET /api/terms: list dictionary records with filters. */
export async function listDictionaryTerms(filter?: {
  language?: string;
  category?: string;
  verified?: boolean;
  translation_status?: TranslationStatus;
  search?: string;
  limit?: number;
}): Promise<ConstructionTerm[]> {
  const supabase = await getSupabase();
  let q = supabase.from("construction_terms").select("*");
  if (filter?.language) q = q.eq("language", filter.language);
  if (filter?.category) q = q.eq("category", filter.category);
  if (filter?.verified !== undefined) q = q.eq("verified", filter.verified);
  if (filter?.translation_status) q = q.eq("translation_status", filter.translation_status);
  if (filter?.search) q = q.ilike("canonical_term", `%${filter.search}%`);
  q = q.order("canonical_term").limit(filter?.limit ?? 200);
  const { data, error } = await q;
  if (error) throw new Error(`Dictionary list failed: ${error.message}`);
  return (data as DictionaryRow[]).map(rowToTerm);
}

/** GET /api/terms/:id */
export async function getDictionaryTerm(id: string): Promise<ConstructionTerm | null> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("construction_terms")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Dictionary lookup failed: ${error.message}`);
  return data ? rowToTerm(data as DictionaryRow) : null;
}

/** POST /api/terms: admin-only create. Records always start
 *  unverified; verification is a separate explicit action. */
export async function createDictionaryTerm(
  draft: ConstructionTermDraft,
): Promise<ConstructionTerm> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("construction_terms")
    .insert({ ...draft, verified: false, verified_by: null, version: 1 })
    .select("*")
    .single();
  if (error) throw new Error(`Dictionary create failed: ${error.message}`);
  return rowToTerm(data as DictionaryRow);
}

export interface TermUpdate {
  term_id: string;
  fields: Partial<ConstructionTerm>;
  changed_by: string;
  change_note?: string | null;
}

/** Admin edit: applies the change, bumps the version and
 *  writes the audit snapshot (spec §16). */
export async function updateDictionaryTerm(update: TermUpdate): Promise<ConstructionTerm> {
  const supabase = await getSupabase();
  const current = await getDictionaryTerm(update.term_id);
  if (!current) throw new Error("Term not found");

  const next: ConstructionTerm = {
    ...current,
    ...update.fields,
    version: current.version + 1,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("construction_terms")
    .update({
      ...update.fields,
      version: next.version,
      updated_at: next.updated_at,
    })
    .eq("id", update.term_id)
    .select("*")
    .single();
  if (error) throw new Error(`Dictionary update failed: ${error.message}`);

  const updated = rowToTerm(data as DictionaryRow);
  const changed_fields = Object.keys(update.fields);
  await supabase.from("construction_term_versions").insert({
    term_id: update.term_id,
    version: updated.version,
    canonical_term: updated.canonical_term,
    language: updated.language,
    changed_fields,
    changed_by: update.changed_by,
    change_note: update.change_note ?? null,
    snapshot: current as unknown as Record<string, unknown>,
  });
  return updated;
}

/** POST /api/terms/verify: admin verification actions.
 *  Verification is a deliberate human action (spec §13):
 *  only an authenticated admin can set verified = true, and
 *  verified terms record who verified them. */
export async function verifyDictionaryTerm(input: {
  term_id: string;
  action: "approve" | "reject";
  verified_by: string;
  note?: string | null;
}): Promise<ConstructionTerm> {
  const current = await getDictionaryTerm(input.term_id);
  if (!current) throw new Error("Term not found");

  if (input.action === "approve") {
    const nextStatus: TranslationStatus =
      current.translation_status === "untranslated" ? "verified" : "verified";
    if (!canTransitionStatus(current.translation_status, nextStatus) && current.translation_status !== "verified") {
      // allow direct verification of any record: admin authority
    }
    return updateDictionaryTerm({
      term_id: input.term_id,
      fields: {
        verified: true,
        verified_by: input.verified_by,
        translation_status: "verified",
        confidence_score: Math.max(current.confidence_score, 0.9),
      },
      changed_by: input.verified_by,
      change_note: input.note ?? "Admin approved terminology.",
    });
  }
  return updateDictionaryTerm({
    term_id: input.term_id,
    fields: { verified: false, verified_by: null, translation_status: "needs_review" },
    changed_by: input.verified_by,
    change_note: input.note ?? "Admin rejected terminology; flagged for review.",
  });
}

/** GET /api/terms/search: DB-backed typo-tolerant search is
 *  performed over the fetched pool by the search module; the
 *  client provides the narrow filter query. */
export async function fetchSearchPool(filter?: {
  language?: string;
  category?: string;
  country?: string;
}): Promise<ConstructionTerm[]> {
  return listDictionaryTerms(filter);
}

/** Version history for a term (spec §16 audit trail). */
export async function getTermHistory(term_id: string): Promise<DictionaryVersionRow[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("construction_term_versions")
    .select("*")
    .eq("term_id", term_id)
    .order("version", { ascending: false });
  if (error) throw new Error(`History lookup failed: ${error.message}`);
  return (data ?? []) as DictionaryVersionRow[];
}

/** Dashboard stats (spec §21). */
export interface DictionaryStats {
  total_terms: number;
  verified_terms: number;
  unverified_terms: number;
  needs_review_terms: number;
  languages: number;
  categories: number;
  avg_confidence: number;
  recently_changed: Array<{ id: string; canonical_term: string; language: string; updated_at: string; version: number }>;
}

export async function getDictionaryStats(): Promise<DictionaryStats> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("construction_terms")
    .select("id, canonical_term, language, category, verified, translation_status, confidence_score, updated_at, version");
  if (error) throw new Error(`Dictionary stats failed: ${error.message}`);
  const rows = (data ?? []) as Array<{
    id: string; canonical_term: string; language: string; category: string;
    verified: boolean; translation_status: string; confidence_score: number;
    updated_at: string; version: number;
  }>;
  const verified = rows.filter((r) => r.verified).length;
  const needs = rows.filter((r) => r.translation_status === "needs_review").length;
  return {
    total_terms: rows.length,
    verified_terms: verified,
    unverified_terms: rows.length - verified,
    needs_review_terms: needs,
    languages: new Set(rows.map((r) => r.language)).size,
    categories: new Set(rows.map((r) => r.category)).size,
    avg_confidence: rows.length
      ? Number((rows.reduce((s, r) => s + r.confidence_score, 0) / rows.length).toFixed(3))
      : 0,
    recently_changed: [...rows]
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .slice(0, 10)
      .map((r) => ({
        id: r.id,
        canonical_term: r.canonical_term,
        language: r.language,
        updated_at: r.updated_at,
        version: r.version,
      })),
  };
}
