/**
 * Site intelligence data access.
 *
 * Reads rely on row level security: an owner sees their own sites and reports,
 * a reviewer sees what they are entitled to review, everyone sees the public
 * soil classifications and sourced regional profiles. No query here widens that.
 */
import { supabase } from "@/lib/supabase";
import type {
  GeotechReport,
  ProjectSite,
  SoilClassification,
  SoilSource,
} from "./types";

export async function fetchSoilClassifications(): Promise<SoilClassification[]> {
  const { data, error } = await supabase
    .from("soil_classifications")
    .select(
      "id,slug,code,name,name_fr,summary,engineering_notes,implication,drainage_flag,dewatering_flag,ground_improvement_flag,investigation_priority,sort_order",
    )
    .eq("is_active", true)
    .order("sort_order");
  if (error) return [];
  return (data ?? []) as SoilClassification[];
}

export async function fetchMyProjects(): Promise<
  { id: string; name: string }[]
> {
  const { data } = await supabase
    .from("user_projects")
    .select("id,name")
    .order("updated_at", { ascending: false })
    .limit(50);
  return (data ?? []) as { id: string; name: string }[];
}

export async function fetchSites(): Promise<ProjectSite[]> {
  const { data, error } = await supabase
    .from("project_sites")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as ProjectSite[];
}

export async function saveSite(input: {
  id?: string;
  label: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  country_code?: string | null;
  city_slug?: string | null;
  project_id?: string | null;
  soil_classification_id?: string | null;
  soil_source?: SoilSource;
  screening?: Record<string, unknown>;
  notes?: string | null;
}): Promise<{ site: ProjectSite | null; error: string | null }> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return { site: null, error: "Sign in to save a site." };

  const payload = {
    ...input,
    user_id: userId,
    soil_source: input.soil_source ?? "user_selection",
    screening: input.screening ?? {},
  };

  const { data, error } = input.id
    ? await supabase.from("project_sites").update(payload).eq("id", input.id).select().single()
    : await supabase.from("project_sites").insert(payload).select().single();

  if (error) return { site: null, error: error.message };
  return { site: data as ProjectSite, error: null };
}

export async function deleteSite(id: string): Promise<string | null> {
  const { error } = await supabase.from("project_sites").delete().eq("id", id);
  return error?.message ?? null;
}

export async function fetchReports(siteId?: string | null): Promise<GeotechReport[]> {
  let query = supabase
    .from("geotechnical_reports")
    .select("*")
    .order("created_at", { ascending: false });
  if (siteId) query = query.eq("project_site_id", siteId);
  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as GeotechReport[];
}

const MAX_REPORT_BYTES = 25 * 1024 * 1024;
const ALLOWED_REPORT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export interface ReportUploadInput {
  siteId: string;
  file: File;
  reportType: GeotechReport["report_type"];
  title: string;
  preparedBy?: string;
  reportDate?: string;
  findings?: string;
  bearingCapacityKpa?: number | null;
  groundwaterDepthM?: number | null;
  boreholeCount?: number | null;
}

/**
 * Upload a geotechnical document to the private plan-documents bucket.
 *
 * The file is validated here for a fast, useful error, and the database row is
 * created only for the signed-in owner. The bucket is private, so a download
 * needs a signed URL.
 */
export async function uploadReport(
  input: ReportUploadInput,
): Promise<{ report: GeotechReport | null; error: string | null }> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return { report: null, error: "Sign in to attach a report." };
  if (input.file.size > MAX_REPORT_BYTES) {
    return { report: null, error: "Reports must be 25 MB or smaller." };
  }
  if (!ALLOWED_REPORT_TYPES.includes(input.file.type)) {
    return { report: null, error: "Attach a PDF, image, or Word document." };
  }

  const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const path = `${userId}/geotech/${input.siteId}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("plan-documents")
    .upload(path, input.file, { contentType: input.file.type, upsert: false });
  if (uploadError) return { report: null, error: uploadError.message };

  const { data, error } = await supabase
    .from("geotechnical_reports")
    .insert({
      project_site_id: input.siteId,
      user_id: userId,
      report_type: input.reportType,
      title: input.title,
      storage_path: path,
      original_filename: input.file.name,
      report_date: input.reportDate || null,
      prepared_by: input.preparedBy || null,
      findings: input.findings || null,
      bearing_capacity_kpa: input.bearingCapacityKpa ?? null,
      groundwater_depth_m: input.groundwaterDepthM ?? null,
      borehole_count: input.boreholeCount ?? null,
    })
    .select()
    .single();

  if (error) {
    // Do not leave an orphaned file behind if the record cannot be written.
    await supabase.storage.from("plan-documents").remove([path]);
    return { report: null, error: error.message };
  }
  return { report: data as GeotechReport, error: null };
}

export async function signedReportUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from("plan-documents")
    .createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}

/** Reviewers only: verification runs server-side, where the role is checked. */
export async function reviewReport(input: {
  reportId: string;
  decision: "verify" | "reject";
  note?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke("geotech-review", {
    body: input,
  });
  if (error) return { ok: false, error: error.message };
  if (data && data.ok === false) return { ok: false, error: data.error };
  return { ok: true };
}
