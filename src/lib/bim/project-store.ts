/**
 * Engine-1A #1 (BIM/CAD): cloud project persistence.
 *
 * Closes the "model lives only in the browser tab" gap: a BIM project, its
 * revision chain and the active revision are stored in Supabase so a session
 * can be resumed, audited and shared between devices.
 *
 * What is persisted is the DATA the viewer produced (element index per
 * revision: GlobalId -> part count + IFC type), never the IFC file or the
 * geometry. The file stays on the user's device and is re-parsed locally, so
 * a stored revision is always traceable to the file the user still holds.
 *
 * Scope discipline:
 *  - No silent overwrite: appending a revision whose label already exists in
 *    the project is refused with a typed error, not merged.
 *  - The revision chain is validated with the same buildRevisionChain rules the
 *    viewer uses (parent missing / cycle / duplicate id are refused).
 *  - Every failure returns a typed result; nothing throws past the caller and
 *    no error is swallowed.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { IfcModelElement } from "./ifc-model-loader";
import {
  buildRevisionChain,
  type IfcModelRevision,
  type RevisionElementEntry,
} from "./model-revisions";

export type BimProjectStatus = "draft" | "issued" | "archived";

export interface BimProjectRecord {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  market: string | null;
  status: BimProjectStatus;
  active_revision_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BimRevisionRecord {
  id: string;
  project_id: string;
  label: string;
  issued_at: string;
  parent_revision_id: string | null;
  element_index: Record<string, RevisionElementEntry>;
  element_count: number;
  source_file_name: string | null;
  schema_name: string | null;
  notes: string | null;
}

export interface ProjectBundle {
  project: BimProjectRecord;
  revisions: IfcModelRevision[];
  /** the revision the viewer should open first */
  active_revision: IfcModelRevision | null;
}

export type StoreErrorCode =
  | "not_configured"
  | "not_authenticated"
  | "invalid_input"
  | "duplicate_label"
  | "broken_chain"
  | "not_found"
  | "db_error";

export interface StoreError {
  ok: false;
  code: StoreErrorCode;
  message: string;
}

export type StoreResult<T> = { ok: true; data: T } | StoreError;

export interface SaveProjectInput {
  name: string;
  description?: string | null;
  market?: string | null;
  status?: BimProjectStatus;
}

export interface AppendRevisionInput {
  projectId: string;
  label: string;
  issuedAt?: string;
  parentRevisionId?: string | null;
  elementIndex: Record<string, RevisionElementEntry>;
  sourceFileName?: string | null;
  schemaName?: string | null;
  notes?: string | null;
}

const ISO_MARKET = /^[A-Z]{2}$/;

function fail(code: StoreErrorCode, message: string): StoreError {
  return { ok: false, code, message };
}

/** Validates project input before it reaches the database. */
export function validateProjectInput(
  input: SaveProjectInput,
): StoreResult<SaveProjectInput> {
  const name = (input.name ?? "").trim();
  if (name.length === 0) {
    return fail("invalid_input", "Project name is required.");
  }
  if (name.length > 120) {
    return fail(
      "invalid_input",
      "Project name must be 120 characters or fewer.",
    );
  }
  const market = input.market ?? null;
  if (market !== null && !ISO_MARKET.test(market)) {
    return fail(
      "invalid_input",
      "Market must be an ISO 3166-1 alpha-2 code (e.g. GB, NG) or null.",
    );
  }
  return {
    ok: true,
    data: {
      name,
      description: input.description ?? null,
      market,
      status: input.status ?? "draft",
    },
  };
}

/**
 * Converts loader output into the stored element index. Elements without a
 * GlobalId are skipped (they cannot be re-identified on the next issue), and
 * the count of skipped elements is returned so the caller can say so.
 */
export function buildElementIndex(elements: IfcModelElement[]): {
  index: Record<string, RevisionElementEntry>;
  skipped: number;
} {
  const index: Record<string, RevisionElementEntry> = {};
  let skipped = 0;
  for (const el of elements) {
    if (!el.globalId) {
      skipped++;
      continue;
    }
    index[el.globalId] = {
      parts: el.geometry.length,
      ...(el.ifcClass ? { type: el.ifcClass } : {}),
    };
  }
  return { index, skipped };
}

/** Maps a stored revision row to the viewer's revision shape. */
export function toRevision(record: BimRevisionRecord): IfcModelRevision {
  return {
    id: record.id,
    model_id: record.project_id,
    label: record.label,
    issued_at: record.issued_at,
    parent_revision_id: record.parent_revision_id,
    element_index: record.element_index ?? {},
    ...(record.notes ? { notes: record.notes } : {}),
  };
}

/**
 * Assembles a project bundle and validates the stored chain. A stored chain
 * that no longer validates (missing parent, cycle) is reported as broken
 * instead of being shown as a clean history.
 */
export function buildProjectBundle(
  project: BimProjectRecord,
  revisions: BimRevisionRecord[],
): StoreResult<ProjectBundle> {
  const chain = buildRevisionChain(project.id, revisions.map(toRevision));
  if (!chain.ok) {
    return fail(
      "broken_chain",
      `Stored revision chain is invalid: ${chain.errors.join(" ")}`,
    );
  }
  const active =
    chain.chain.find((r) => r.id === project.active_revision_id) ?? null;
  return {
    ok: true,
    data: { project, revisions: chain.chain, active_revision: active },
  };
}

function dbError(message: string, detail?: string): StoreError {
  return fail("db_error", detail ? `${message}: ${detail}` : message);
}

async function requireUserId(
  supabase: SupabaseClient,
): Promise<StoreResult<string>> {
  const { data, error } = await supabase.auth.getUser();
  if (error) return dbError("Could not read the signed-in user", error.message);
  const id = data?.user?.id;
  if (!id) return fail("not_authenticated", "Sign in to save BIM projects.");
  return { ok: true, data: id };
}

/** Creates a project owned by the signed-in user. */
export async function saveProject(
  supabase: SupabaseClient,
  input: SaveProjectInput,
): Promise<StoreResult<BimProjectRecord>> {
  const valid = validateProjectInput(input);
  if (!valid.ok) return valid;
  const user = await requireUserId(supabase);
  if (!user.ok) return user;

  const { data, error } = await supabase
    .from("bim_projects")
    .insert({
      owner_id: user.data,
      created_by: user.data,
      name: valid.data.name,
      description: valid.data.description,
      market: valid.data.market,
      status: valid.data.status,
    })
    .select()
    .single();
  if (error) return dbError("Could not create the project", error.message);
  return { ok: true, data: data as BimProjectRecord };
}

/** Lists the signed-in user's projects, newest first. */
export async function listProjects(
  supabase: SupabaseClient,
): Promise<StoreResult<BimProjectRecord[]>> {
  const user = await requireUserId(supabase);
  if (!user.ok) return user;
  const { data, error } = await supabase
    .from("bim_projects")
    .select("*")
    .eq("owner_id", user.data)
    .order("updated_at", { ascending: false });
  if (error) return dbError("Could not list projects", error.message);
  return { ok: true, data: (data ?? []) as BimProjectRecord[] };
}

/** Loads one project with its revision chain. */
export async function loadProject(
  supabase: SupabaseClient,
  projectId: string,
): Promise<StoreResult<ProjectBundle>> {
  const { data: project, error: pErr } = await supabase
    .from("bim_projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();
  if (pErr) return dbError("Could not load the project", pErr.message);
  if (!project)
    return fail("not_found", "Project not found or not accessible.");

  const { data: revisions, error: rErr } = await supabase
    .from("bim_model_revisions")
    .select("*")
    .eq("project_id", projectId)
    .order("issued_at", { ascending: true });
  if (rErr) return dbError("Could not load revisions", rErr.message);

  return buildProjectBundle(
    project as BimProjectRecord,
    (revisions ?? []) as BimRevisionRecord[],
  );
}

/**
 * Appends a revision to a project and makes it the active one.
 * Refuses duplicate labels and parent ids that are not in the project.
 */
export async function appendRevision(
  supabase: SupabaseClient,
  input: AppendRevisionInput,
): Promise<StoreResult<BimRevisionRecord>> {
  const label = (input.label ?? "").trim();
  if (label.length === 0)
    return fail("invalid_input", "Revision label is required.");

  const { data: existing, error: exErr } = await supabase
    .from("bim_model_revisions")
    .select("id, label, parent_revision_id")
    .eq("project_id", input.projectId);
  if (exErr) return dbError("Could not read existing revisions", exErr.message);

  const rows = (existing ?? []) as Array<{ id: string; label: string }>;
  if (rows.some((r) => r.label === label)) {
    return fail(
      "duplicate_label",
      `Revision "${label}" already exists in this project.`,
    );
  }
  if (
    input.parentRevisionId &&
    !rows.some((r) => r.id === input.parentRevisionId)
  ) {
    return fail(
      "invalid_input",
      "Parent revision does not belong to this project.",
    );
  }

  const elementCount = Object.keys(input.elementIndex).length;
  const { data, error } = await supabase
    .from("bim_model_revisions")
    .insert({
      project_id: input.projectId,
      label,
      issued_at: input.issuedAt ?? new Date().toISOString(),
      parent_revision_id: input.parentRevisionId ?? null,
      element_index: input.elementIndex,
      element_count: elementCount,
      source_file_name: input.sourceFileName ?? null,
      schema_name: input.schemaName ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) return dbError("Could not save the revision", error.message);

  const revision = data as BimRevisionRecord;
  const { error: uErr } = await supabase
    .from("bim_projects")
    .update({ active_revision_id: revision.id })
    .eq("id", input.projectId);
  if (uErr) {
    // The revision exists; the pointer did not move. Say so rather than
    // reporting a clean save.
    return dbError(
      "Revision saved but the project's active revision was not updated",
      uErr.message,
    );
  }
  return { ok: true, data: revision };
}

/** Deletes a project and, by cascade, its revisions. */
export async function deleteProject(
  supabase: SupabaseClient,
  projectId: string,
): Promise<StoreResult<{ id: string }>> {
  const { error } = await supabase
    .from("bim_projects")
    .delete()
    .eq("id", projectId);
  if (error) return dbError("Could not delete the project", error.message);
  return { ok: true, data: { id: projectId } };
}
