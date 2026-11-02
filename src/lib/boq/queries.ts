/**
 * BOQ studio persistence.
 *
 * Documents live on the existing `boq_quotes` table (column `boq_document`),
 * so ownership policies, the quote list and the revision history keep working
 * without a second BOQ store. Templates and the section library are
 * admin-managed configuration tables.
 */

import { supabase } from "@/lib/supabase";
import type {
  BoqSectionLibraryRow,
  BoqStudioDocument,
  BoqTemplateRow,
} from "./types";
import type { RawSourceRecord } from "./imports";

export interface BoqDocumentRow {
  id: string;
  quote_ref: string;
  title: string;
  client_name: string;
  project_location: string | null;
  currency: string;
  status: string;
  revision: number;
  boq_document: BoqStudioDocument | null;
  template_slug: string | null;
  measurement_system: string | null;
  market_code: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchTemplates(): Promise<{
  templates: BoqTemplateRow[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("boq_templates")
    .select("*")
    .eq("is_active", true)
    .order("name");
  return {
    templates: (data ?? []) as BoqTemplateRow[],
    error: error?.message ?? null,
  };
}

export async function fetchAllTemplates(): Promise<{
  templates: BoqTemplateRow[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("boq_templates")
    .select("*")
    .order("name");
  return {
    templates: (data ?? []) as BoqTemplateRow[],
    error: error?.message ?? null,
  };
}

export async function saveTemplate(
  input: Partial<BoqTemplateRow> & { slug: string; name: string },
) {
  const payload = { ...input, updated_at: new Date().toISOString() };
  if (input.id) {
    const { error } = await supabase
      .from("boq_templates")
      .update(payload)
      .eq("id", input.id);
    return { error: error?.message ?? null };
  }
  const { error } = await supabase.from("boq_templates").insert(payload);
  return { error: error?.message ?? null };
}

export async function fetchSectionLibrary(
  standard = "Commercial",
): Promise<{ sections: BoqSectionLibraryRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from("boq_section_library")
    .select("*")
    .eq("standard", standard)
    .eq("is_active", true)
    .order("sort_order");
  return {
    sections: (data ?? []) as BoqSectionLibraryRow[],
    error: error?.message ?? null,
  };
}

export async function fetchAllSections(): Promise<{
  sections: BoqSectionLibraryRow[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("boq_section_library")
    .select("*")
    .order("standard")
    .order("sort_order");
  return {
    sections: (data ?? []) as BoqSectionLibraryRow[],
    error: error?.message ?? null,
  };
}

export async function saveSection(
  input: Partial<BoqSectionLibraryRow> & { code: string; title: string },
) {
  const payload = { ...input, updated_at: new Date().toISOString() };
  if (input.id) {
    const { error } = await supabase
      .from("boq_section_library")
      .update(payload)
      .eq("id", input.id);
    return { error: error?.message ?? null };
  }
  const { error } = await supabase.from("boq_section_library").insert(payload);
  return { error: error?.message ?? null };
}

export async function fetchDocuments(
  userId: string,
): Promise<{ documents: BoqDocumentRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from("boq_quotes")
    .select("*")
    .eq("user_id", userId)
    .not("boq_document", "is", null)
    .order("updated_at", { ascending: false })
    .limit(50);
  return {
    documents: (data ?? []) as BoqDocumentRow[],
    error: error?.message ?? null,
  };
}

export async function fetchDocument(
  id: string,
): Promise<{ document: BoqDocumentRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from("boq_quotes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return {
    document: (data as BoqDocumentRow | null) ?? null,
    error: error?.message ?? null,
  };
}

/** Creates or updates the document row and snapshots the revision it replaced. */
export async function saveDocument(input: {
  id?: string | null;
  userId: string;
  document: BoqStudioDocument;
  status?: string;
  /** Compiled commercial summary, kept on the quote row for the quote list. */
  totals?: Record<string, unknown> | null;
}): Promise<{ id: string | null; error: string | null }> {
  const doc = { ...input.document, updated_at: new Date().toISOString() };
  // boq_quotes requires items/totals/rates_snapshot; the studio's own payload
  // is boq_document, so the quote-view columns get an explicit, honest echo.
  const flatItems = doc.sections.flatMap((section) =>
    section.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_cost: item.material_rate + item.labour_rate + item.plant_rate,
      source_estimate_ref: item.source?.ref ?? "manual entry",
      source_calculator_type: item.source?.calculator ?? null,
    })),
  );
  const row = {
    user_id: input.userId,
    quote_ref: doc.reference || `BOQ-${Date.now()}`,
    title: doc.title || "Untitled BOQ",
    client_name: doc.client.name || "",
    project_location: doc.client.address ?? null,
    currency: doc.currency,
    status: input.status ?? "draft",
    revision: doc.revision,
    boq_document: doc,
    template_slug: doc.template_slug,
    measurement_system: doc.measurement_system,
    market_code: doc.market_code,
    items: flatItems,
    totals: input.totals ?? {},
    rates_snapshot: {
      commercials: doc.commercials,
      template: doc.template_slug,
      sourced: "boq-studio",
    },
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await supabase
      .from("boq_quotes")
      .update(row)
      .eq("id", input.id);
    return { id: input.id, error: error?.message ?? null };
  }

  const { data, error } = await supabase
    .from("boq_quotes")
    .insert(row)
    .select("id")
    .single();
  return {
    id: (data as { id: string } | null)?.id ?? null,
    error: error?.message ?? null,
  };
}

/** Append-only snapshot, reusing the quote revision table. */
export async function snapshotRevision(input: {
  quoteId: string;
  userId: string;
  document: BoqStudioDocument;
  totals: Record<string, unknown> | null;
}) {
  // The revision table numbers snapshots from 1 and holds one row per version,
  // so document revision 0 (first issue) is stored as version 1 and a re-save of
  // an unchanged revision is not recorded twice.
  const version = Math.max(1, input.document.revision);
  const { error } = await supabase.from("boq_quote_revisions").insert({
    quote_id: input.quoteId,
    user_id: input.userId,
    version,
    quote_ref: input.document.reference,
    items: input.document.sections,
    totals: input.totals,
    rates_snapshot: {
      commercials: input.document.commercials,
      template: input.document.template_slug,
      sourced: "boq-studio",
    },
    note: `Revision ${input.document.revision} saved from BOQ Studio`,
  });
  if (error && /duplicate key|unique/i.test(error.message)) {
    return { error: null };
  }
  return { error: error?.message ?? null };
}

/**
 * Saved calculator results available to import. Three tables are read because
 * different calculators save in different places; all quota is already the
 * calculator's own, nothing here recalculates.
 */
export async function fetchImportSources(
  userId: string,
  limit = 40,
): Promise<{
  records: RawSourceRecord[];
  error: string | null;
}> {
  const [calcs, estimates, advanced] = await Promise.all([
    supabase
      .from("project_calculations")
      .select(
        "id, calculator_slug, calc_title, materials, result_summary, project_id, created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("estimation_estimates")
      .select(
        "id, estimate_ref, calculator_type, calculated_quantities, currency, project_description, created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("advanced_estimates")
      .select("id, tool_key, title, estimate_data, currency, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  const error =
    calcs.error?.message ??
    estimates.error?.message ??
    advanced.error?.message ??
    null;

  const records: RawSourceRecord[] = [
    ...(calcs.data ?? []).map((r) => ({
      source_table: "project_calculations" as const,
      ref: r.id as string,
      calculator_slug: (r.calculator_slug as string) ?? "unknown",
      title: (r.calc_title as string) ?? "Saved calculation",
      created_at: r.created_at as string,
      materials: r.materials,
      project_id: (r.project_id as string) ?? null,
    })),
    ...(estimates.data ?? []).map((r) => ({
      source_table: "estimation_estimates" as const,
      ref: r.id as string,
      calculator_slug: (r.calculator_type as string) ?? "unknown",
      calculator_type: (r.calculator_type as string) ?? null,
      title:
        (r.project_description as string) ??
        (r.estimate_ref as string) ??
        "Saved estimate",
      created_at: r.created_at as string,
      currency: (r.currency as string) ?? null,
      calculated_quantities: r.calculated_quantities,
    })),
    ...(advanced.data ?? []).map((r) => ({
      source_table: "advanced_estimates" as const,
      ref: r.id as string,
      calculator_slug: (r.tool_key as string) ?? "unknown",
      title: (r.title as string) ?? "Saved estimate",
      created_at: r.created_at as string,
      currency: (r.currency as string) ?? null,
      estimate_data: r.estimate_data,
    })),
  ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  return { records, error };
}
