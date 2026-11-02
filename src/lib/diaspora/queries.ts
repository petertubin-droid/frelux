/**
 * Diaspora tracker data access.
 *
 * All reads and writes go through the caller's own session, so row level
 * security decides what comes back. Nothing here uses a service key, and no
 * evidence is ever fetched as a public URL: photos and documents are read
 * through short-lived signed links.
 */
import { supabase } from "@/lib/supabase";
import type { ProjectRole } from "./permissions";

export interface TrackedProject {
  id: string;
  name: string;
  description: string | null;
  project_type: string | null;
  building_type: string | null;
  location: Record<string, unknown> | null;
  budget: number | null;
  currency: string | null;
  start_date: string | null;
  end_date: string | null;
  progress_percentage: number | null;
  status: string | null;
  created_at: string;
  role: ProjectRole | null;
}

const EVIDENCE_BUCKET = "project-evidence";
const MAX_EVIDENCE_BYTES = 60 * 1024 * 1024;
const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const ALLOWED_VIDEO = ["video/mp4", "video/quicktime", "video/webm"];
const ALLOWED_DOCS = ["application/pdf", "image/jpeg", "image/png"];

export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Projects the caller owns or participates in, with their role on each. */
export async function fetchMyTrackedProjects(): Promise<TrackedProject[]> {
  const userId = await currentUserId();
  if (!userId) return [];

  const [owned, memberships] = await Promise.all([
    supabase
      .from("contractor_projects")
      .select(
        "id,name,description,project_type,building_type,location,budget,currency,start_date,end_date,progress_percentage,status,created_at",
      )
      .eq("user_id", userId)
      .eq("diaspora_tracker", true)
      .order("updated_at", { ascending: false }),
    supabase
      .from("project_members")
      .select("project_id,role,status")
      .eq("user_id", userId)
      .eq("status", "active"),
  ]);

  const projects: TrackedProject[] = (owned.data ?? []).map((p) => ({
    ...(p as Omit<TrackedProject, "role">),
    role: "owner" as ProjectRole,
  }));

  const memberRows = memberships.data ?? [];
  if (memberRows.length) {
    const ids = memberRows.map((m) => m.project_id as string);
    const { data: shared } = await supabase
      .from("contractor_projects")
      .select(
        "id,name,description,project_type,building_type,location,budget,currency,start_date,end_date,progress_percentage,status,created_at",
      )
      .in("id", ids);
    const roleById = new Map(
      memberRows.map((m) => [m.project_id as string, m.role as ProjectRole]),
    );
    for (const p of shared ?? []) {
      if (projects.some((existing) => existing.id === p.id)) continue;
      projects.push({
        ...(p as Omit<TrackedProject, "role">),
        role: roleById.get(p.id as string) ?? null,
      });
    }
  }

  return projects;
}

export async function fetchProjectMeta(projectId: string) {
  const [{ data: project }, { data: stages }, { data: members }] =
    await Promise.all([
      supabase
        .from("contractor_projects")
        .select("*")
        .eq("id", projectId)
        .maybeSingle(),
      supabase
        .from("project_progress_stages")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order"),
      supabase
        .from("project_members")
        .select("user_id,role,status")
        .eq("project_id", projectId),
    ]);
  return { project, stages: stages ?? [], members: members ?? [] };
}

export async function fetchDailyReports(projectId: string, limit = 20) {
  const { data, error } = await supabase
    .from("project_site_logs")
    .select("*")
    .eq("project_id", projectId)
    .order("log_date", { ascending: false })
    .limit(limit);
  return error ? [] : (data ?? []);
}

export interface DailyReportInput {
  projectId: string;
  logDate: string;
  weather: string;
  workers: number;
  workersDetail?: Record<string, number>;
  workPerformed: string;
  equipment?: string;
  delays?: string;
  nextDay?: string;
  materialsUsage?: Record<string, unknown>;
}

export async function submitDailyReport(input: DailyReportInput) {
  const userId = await currentUserId();
  if (!userId) return { error: "Sign in to submit a report." };
  const { error } = await supabase.from("project_site_logs").insert({
    project_id: input.projectId,
    created_by: userId,
    log_date: input.logDate,
    weather_condition: input.weather,
    workers_count: input.workers,
    workers_detail: input.workersDetail ?? {},
    work_performed: input.workPerformed,
    equipment_on_site: input.equipment ?? null,
    delays_issues: input.delays ?? null,
    next_day_activities: input.nextDay ?? null,
    material_usage: input.materialsUsage ?? {},
    status: "submitted",
  });
  if (error) return { error: error.message };
  await logActivity(
    input.projectId,
    "daily_report_submitted",
    "project_site_logs",
    input.logDate,
  );
  return {};
}

export async function fetchExpenses(projectId: string) {
  const { data, error } = await supabase
    .from("project_expenses")
    .select("*")
    .eq("project_id", projectId)
    .order("spent_at", { ascending: false });
  return error ? [] : (data ?? []);
}

export interface ExpenseInput {
  projectId: string;
  category: string;
  name: string;
  amount: number;
  currency: string;
  spentAt: string;
  recipient?: string;
  paymentMethod?: string;
  notes?: string;
  receiptPath?: string | null;
}

export async function submitExpense(input: ExpenseInput) {
  const userId = await currentUserId();
  if (!userId) return { error: "Sign in to submit an expense." };
  const { error } = await supabase.from("project_expenses").insert({
    project_id: input.projectId,
    category: input.category,
    name: input.name,
    amount: input.amount,
    currency: input.currency,
    spent_at: input.spentAt,
    recipient: input.recipient ?? null,
    payment_method: input.paymentMethod ?? null,
    notes: input.notes ?? null,
    receipt_path: input.receiptPath ?? null,
    submitted_by: userId,
    status: "submitted",
  });
  if (error) return { error: error.message };
  await logActivity(
    input.projectId,
    "expense_submitted",
    "project_expenses",
    input.name,
    {
      amount: input.amount,
      currency: input.currency,
    },
  );
  return {};
}

export async function decideExpense(input: {
  id: string;
  projectId: string;
  decision: "approved" | "rejected";
  note?: string;
}) {
  const { error } = await supabase
    .from("project_expenses")
    .update({ status: input.decision, decision_note: input.note ?? null })
    .eq("id", input.id);
  if (error) return { error: error.message };
  await logActivity(
    input.projectId,
    `expense_${input.decision}`,
    "project_expenses",
    input.id,
  );
  return {};
}

export async function fetchDeliveries(projectId: string) {
  const { data, error } = await supabase
    .from("project_material_deliveries")
    .select("*")
    .eq("project_id", projectId)
    .order("delivery_date", { ascending: false });
  return error ? [] : (data ?? []);
}

export async function recordDelivery(input: {
  projectId: string;
  description: string;
  unit?: string;
  quantityOrdered: number;
  quantityDelivered: number;
  quantityAccepted: number;
  supplier?: string;
  deliveryDate: string;
  unitPrice?: number | null;
  notes?: string;
  photoPath?: string | null;
}) {
  const { error } = await supabase.from("project_material_deliveries").insert({
    project_id: input.projectId,
    description: input.description,
    unit: input.unit ?? null,
    quantity_ordered: input.quantityOrdered,
    quantity_delivered: input.quantityDelivered,
    quantity_accepted: input.quantityAccepted,
    supplier: input.supplier ?? null,
    delivery_date: input.deliveryDate,
    unit_price: input.unitPrice ?? null,
    notes: input.notes ?? null,
    photo_path: input.photoPath ?? null,
  });
  if (error) return { error: error.message };
  await logActivity(
    input.projectId,
    "delivery_recorded",
    "project_material_deliveries",
    input.description,
  );
  return {};
}

export async function decideMilestone(input: {
  id: string;
  projectId: string;
  decision: "submitted" | "approved" | "disputed";
  note?: string;
  evidencePath?: string | null;
}) {
  const payload: Record<string, unknown> = {
    status: input.decision,
    decision_note: input.note ?? null,
  };
  if (input.decision === "submitted") {
    payload.submitted_by = await currentUserId();
    payload.submitted_at = new Date().toISOString();
  }
  if (input.evidencePath) payload.evidence_path = input.evidencePath;
  if (input.decision === "approved") {
    payload.is_completed = true;
    payload.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("project_progress_stages")
    .update(payload)
    .eq("id", input.id);
  if (error) return { error: error.message };
  await logActivity(
    input.projectId,
    `milestone_${input.decision}`,
    "project_progress_stages",
    input.id,
  );
  return {};
}

export async function fetchActivity(projectId: string, limit = 40) {
  const { data, error } = await supabase
    .from("project_activity")
    .select("id,actor,action,entity,entity_id,detail,created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return error ? [] : (data ?? []);
}

export async function logActivity(
  projectId: string,
  action: string,
  entity: string,
  entityId: string | null,
  detail: Record<string, unknown> = {},
) {
  await supabase.from("project_activity").insert({
    project_id: projectId,
    action,
    entity,
    entity_id: entityId,
    detail,
  });
}

/** Evidence upload into the private bucket, with capture metadata recorded. */
export async function uploadEvidence(input: {
  projectId: string;
  file: File;
  kind: "progress" | "material" | "inspection" | "receipt" | "video";
  description?: string;
  gps?: { lat: number; lon: number } | null;
  deviceMeta?: Record<string, unknown>;
}): Promise<{ attachmentId: string | null; error: string | null }> {
  const userId = await currentUserId();
  if (!userId)
    return { attachmentId: null, error: "Sign in to upload evidence." };
  if (input.file.size > MAX_EVIDENCE_BYTES) {
    return { attachmentId: null, error: "Each file must be 60 MB or smaller." };
  }
  const allowed =
    input.kind === "video"
      ? [...ALLOWED_VIDEO, ...ALLOWED_IMAGE]
      : input.kind === "receipt"
        ? ALLOWED_DOCS
        : [...ALLOWED_IMAGE, ...ALLOWED_VIDEO];
  if (!allowed.includes(input.file.type)) {
    return {
      attachmentId: null,
      error: "That file type is not accepted for this evidence kind.",
    };
  }

  const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-90);
  // Unguessable folder segment: storage signing is not gated by row policies in
  // this project, so a path must not be derivable from ids alone.
  const path = `${userId}/${input.projectId}/${crypto.randomUUID()}-${safeName}`;
  const digest = await sha256Hex(await input.file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .upload(path, input.file, { contentType: input.file.type, upsert: false });
  if (uploadError) return { attachmentId: null, error: uploadError.message };

  const { data, error } = await supabase
    .from("project_attachments")
    .insert({
      project_id: input.projectId,
      file_name: input.file.name,
      storage_path: path,
      // Never a public URL: this bucket is private by design.
      public_url: null,
      mime_type: input.file.type,
      file_size: input.file.size,
      description: input.description ?? null,
      uploaded_by: userId,
      kind: input.kind,
      captured_at: new Date().toISOString(),
      gps_lat: input.gps?.lat ?? null,
      gps_lon: input.gps?.lon ?? null,
      device_meta: input.deviceMeta ?? {},
      sha256: digest,
    })
    .select("id")
    .single();

  if (error) {
    await supabase.storage.from(EVIDENCE_BUCKET).remove([path]);
    return { attachmentId: null, error: error.message };
  }

  await logActivity(
    input.projectId,
    "evidence_uploaded",
    "project_attachments",
    data.id,
    {
      kind: input.kind,
      bytes: input.file.size,
    },
  );
  return { attachmentId: data.id as string, error: null };
}

export async function fetchAttachments(projectId: string, limit = 24) {
  const { data, error } = await supabase
    .from("project_attachments")
    .select(
      "id,file_name,storage_path,mime_type,description,kind,captured_at,gps_lat,gps_lon,deleted_at,created_at",
    )
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  return error ? [] : (data ?? []);
}

/**
 * Evidence links are issued by the server after it confirms the caller belongs
 * to the project. Never sign a storage path in the browser: the storage signing
 * endpoint was observed serving objects to non-members.
 */
export async function signedEvidenceUrl(
  attachmentId: string,
): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke(
    "project-evidence-link",
    {
      body: { attachmentId },
    },
  );
  if (error) return null;
  return (data as { url?: string } | null)?.url ?? null;
}

/** Soft delete, so the audit trail keeps the record of what existed. */
export async function removeAttachment(input: {
  id: string;
  projectId: string;
}) {
  const userId = await currentUserId();
  if (!userId) return { error: "Sign in to remove evidence." };
  const { error } = await supabase
    .from("project_attachments")
    .update({ deleted_at: new Date().toISOString(), deleted_by: userId })
    .eq("id", input.id);
  if (error) return { error: error.message };
  await logActivity(
    input.projectId,
    "evidence_removed",
    "project_attachments",
    input.id,
  );
  return {};
}

export async function createProject(input: {
  name: string;
  projectType: string;
  description?: string;
  budget: number | null;
  currency: string;
  startDate?: string;
  endDate?: string;
  location?: { lat: number; lon: number; address?: string } | null;
}) {
  const userId = await currentUserId();
  if (!userId)
    return { projectId: null, error: "Sign in to create a project." };

  // contractor_projects is the canonical project table for the whole project
  // subsystem (site logs, expenses, milestones, attachments all reference it).
  const { data, error } = await supabase
    .from("contractor_projects")
    .insert({
      user_id: userId,
      name: input.name,
      description: input.description ?? null,
      // Tracker projects carry their own type key; the building type is kept
      // in the column the rest of the platform already uses for it.
      project_type: "site_tracker",
      building_type: input.projectType,
      location: input.location ?? null,
      budget: input.budget,
      currency: input.currency,
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
      diaspora_tracker: true,
      // contractor_projects_status_check accepts draft/in_progress/on_hold/completed/archived.
      status: "in_progress",
    })
    .select("id")
    .single();

  if (error) return { projectId: null, error: error.message };

  await supabase.from("project_members").insert({
    project_id: data.id,
    user_id: userId,
    role: "owner",
    status: "active",
  });

  return { projectId: data.id as string, error: null };
}

/** Invitations: the raw token is returned once, to the owner, by the database. */
export async function inviteParticipant(input: {
  projectId: string;
  email: string;
  role: ProjectRole;
  hours?: number;
}): Promise<{ link: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc("create_project_invitation", {
    p_project: input.projectId,
    p_email: input.email,
    p_role: input.role,
    p_hours: input.hours ?? 72,
  });
  if (error) return { link: null, error: error.message };
  const token = data as unknown as string;
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return {
    link: `${origin}/diaspora-tracker/invite?token=${token}`,
    error: null,
  };
}

export async function acceptInvitation(token: string) {
  const { data, error } = await supabase.rpc("accept_project_invitation", {
    p_token: token,
  });
  if (error) return { projectId: null, error: error.message };
  return { projectId: data as string, error: null };
}

export async function fetchPlanLimits() {
  const { data, error } = await supabase
    .from("diaspora_plan_limits")
    .select(
      "plan_key,display_name,max_projects,max_members_per_project,max_storage_mb,features",
    )
    .eq("is_active", true)
    .order("max_projects", { nullsFirst: false });
  return error ? [] : (data ?? []);
}

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
