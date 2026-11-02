import { supabase, isSupabaseConfigured } from "./supabase";
import type {
  DbCaseStudy,
  DbGalleryEntry,
  DbGalleryImage,
} from "@/types/database";

// =========================================================
// Before/After Case Studies (workspace item 9)
//
// Case studies are built DIRECTLY on the existing gallery system.
// The gallery entry (gallery_entries + gallery_images) remains the
// media, category, location and moderation layer; a case study row
// adds the editorial story (headline, scope, challenges, outcome,
// materials, duration, budget) and references the entry 1:1.
//
// Publishing rule: a case study only renders publicly when BOTH
// is_published = true AND its gallery entry is approved/featured
// and public. The app layer enforces the second condition (the
// gallery policies already restrict reads to approved entries).
// =========================================================

export interface CaseStudyView {
  caseStudy: DbCaseStudy;
  entry: DbGalleryEntry;
  images: DbGalleryImage[];
  /** First "before" image, null when the entry has none. */
  beforeImage: DbGalleryImage | null;
  /** First "after" image, null when the entry has none. */
  afterImage: DbGalleryImage | null;
}

type JoinedRow = DbCaseStudy & { gallery_entry: DbGalleryEntry | null };

function toView(
  caseStudy: DbCaseStudy,
  entry: DbGalleryEntry,
  images: DbGalleryImage[],
): CaseStudyView {
  const before = images.find((i) => i.image_type === "before") ?? null;
  const after = images.find((i) => i.image_type === "after") ?? null;
  return { caseStudy, entry, images, beforeImage: before, afterImage: after };
}

async function fetchImagesForEntries(
  entryIds: string[],
): Promise<Record<string, DbGalleryImage[]>> {
  if (entryIds.length === 0) return {};
  const { data, error } = await supabase
    .from("gallery_images")
    .select("*")
    .in("gallery_entry_id", entryIds)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  const grouped: Record<string, DbGalleryImage[]> = {};
  for (const img of (data ?? []) as DbGalleryImage[]) {
    (grouped[img.gallery_entry_id] ??= []).push(img);
  }
  return grouped;
}

/** Published case studies for the public /case-studies pages (approved gallery entries only). */
export async function fetchPublishedCaseStudies(
  limit = 60,
): Promise<CaseStudyView[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from("case_studies")
    .select("*, gallery_entry:gallery_entries(*)")
    .eq("is_published", true)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as JoinedRow[];

  // Defensive filter: only entries that are approved/featured AND public.
  const publishable = rows.filter(
    (r) =>
      r.gallery_entry !== null &&
      r.gallery_entry.is_public &&
      (r.gallery_entry.status === "approved" ||
        r.gallery_entry.status === "featured"),
  ) as (JoinedRow & { gallery_entry: DbGalleryEntry })[];

  const grouped = await fetchImagesForEntries(
    publishable.map((r) => r.gallery_entry.id),
  );
  return publishable.map((r) =>
    toView(
      r as DbCaseStudy,
      r.gallery_entry,
      grouped[r.gallery_entry.id] ?? [],
    ),
  );
}

/** A single published case study by id (public detail page). */
export async function fetchCaseStudyById(
  id: string,
): Promise<CaseStudyView | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from("case_studies")
    .select("*, gallery_entry:gallery_entries(*)")
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as unknown as JoinedRow | null;
  if (!row || !row.gallery_entry) return null;
  const entry = row.gallery_entry;
  if (
    !entry.is_public ||
    (entry.status !== "approved" && entry.status !== "featured")
  ) {
    return null;
  }
  const grouped = await fetchImagesForEntries([entry.id]);
  return toView(row as DbCaseStudy, entry, grouped[entry.id] ?? []);
}

// ---------------------------------------------------------
// Admin surface (admins manage the catalogue)
// ---------------------------------------------------------

export interface CaseStudyAdminRow {
  caseStudy: DbCaseStudy | null; // null until a case study is written for the entry
  entry: DbGalleryEntry;
  images: DbGalleryImage[];
}

/** All gallery entries that can carry a case study (approved or featured), with any existing case study. */
export async function fetchAdminCaseStudyRows(): Promise<CaseStudyAdminRow[]> {
  if (!isSupabaseConfigured) return [];
  const { data: entries, error } = await supabase
    .from("gallery_entries")
    .select("*")
    .in("status", ["approved", "featured"])
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const { data: studies, error: studiesError } = await supabase
    .from("case_studies")
    .select("*");
  if (studiesError) throw new Error(studiesError.message);

  const byEntry = new Map<string, DbCaseStudy>();
  for (const cs of (studies ?? []) as DbCaseStudy[])
    byEntry.set(cs.gallery_entry_id, cs);

  const rows: CaseStudyAdminRow[] = ((entries ?? []) as DbGalleryEntry[]).map(
    (entry) => ({
      caseStudy: byEntry.get(entry.id) ?? null,
      entry,
      images: [],
    }),
  );
  const grouped = await fetchImagesForEntries(rows.map((r) => r.entry.id));
  return rows.map((r) => ({ ...r, images: grouped[r.entry.id] ?? [] }));
}

export interface CaseStudyInput {
  gallery_entry_id: string;
  headline: string;
  summary: string;
  project_scope?: string | null;
  challenges?: string | null;
  outcome?: string | null;
  materials_used?: string[];
  project_duration?: string | null;
  budget?: number | null;
  is_published?: boolean;
}

/** Create or update the case study attached to a gallery entry (admin). */
export async function upsertCaseStudy(
  input: CaseStudyInput,
): Promise<DbCaseStudy> {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured");
  const payload = {
    gallery_entry_id: input.gallery_entry_id,
    headline: input.headline,
    summary: input.summary,
    project_scope: input.project_scope ?? null,
    challenges: input.challenges ?? null,
    outcome: input.outcome ?? null,
    materials_used: input.materials_used ?? [],
    project_duration: input.project_duration ?? null,
    budget: input.budget ?? null,
    is_published: input.is_published ?? false,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("case_studies")
    .upsert(payload, { onConflict: "gallery_entry_id" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as DbCaseStudy;
}

/** Publish or unpublish a case study (admin). */
export async function setCaseStudyPublished(
  id: string,
  isPublished: boolean,
): Promise<void> {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured");
  const { error } = await supabase
    .from("case_studies")
    .update({ is_published: isPublished, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** Delete a case study (admin). The gallery entry itself is untouched. */
export async function deleteCaseStudy(id: string): Promise<void> {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured");
  const { error } = await supabase.from("case_studies").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
