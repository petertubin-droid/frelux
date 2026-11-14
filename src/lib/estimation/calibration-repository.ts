/**
 * Calibration evidence access.
 *
 * Cloud first: a signed-in user writes to the `estimation_actuals` table, where
 * policies and a guard trigger decide who may verify a record. The device store
 * is the offline path, and the snapshot always says which one answered so the
 * interface never implies a review that did not happen.
 */

import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  createAuditEvent,
  sanitiseCalibrationFeedback,
  type AuditEvent,
  type CalibrationFeedback,
} from "./adaptive-calibration";
import {
  deleteCalibrationFeedback,
  getCalibrationFeedback,
  saveCalibrationFeedback,
  updateCalibrationFeedback,
} from "./calibration-storage";

export const ACTUALS_TABLE = "estimation_actuals";

export type CalibrationStorageMode = "cloud" | "device";

export interface CalibrationSnapshot {
  rows: CalibrationFeedback[];
  mode: CalibrationStorageMode;
  /** Present when the cloud read failed and the device copy answered instead. */
  error: string | null;
}

export interface CalibrationMutation {
  ok: boolean;
  mode: CalibrationStorageMode;
  reason: string | null;
}

interface ActualsRow {
  client_id: string;
  project_id: string;
  market_code: string;
  material_key: string;
  measure: string;
  unit: string;
  estimated_quantity: number | string;
  actual_quantity: number | string;
  context: string;
  evidence: string;
  evidence_reference: string | null;
  status: string;
  reviewer_id: string | null;
  reviewer_role: string | null;
  reviewed_at: string | null;
  recorded_at: string;
  source?: string | null;
}

function toRow(row: CalibrationFeedback): Record<string, unknown> {
  return {
    client_id: row.id,
    project_id: row.projectId,
    market_code: row.marketCode,
    material_key: row.materialKey,
    measure: row.measure,
    unit: row.unit,
    estimated_quantity: row.estimatedQuantity,
    actual_quantity: row.actualQuantity,
    context: row.context,
    evidence: row.evidence,
    evidence_reference: row.evidenceReference ?? null,
    status: row.status,
    reviewer_id: row.reviewerId ?? null,
    reviewer_role: row.reviewerRole ?? null,
    reviewed_at: row.reviewedAt ?? null,
    recorded_at: row.recordedAt,
  };
}

function fromRow(raw: unknown): CalibrationFeedback | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as ActualsRow;
  return sanitiseCalibrationFeedback({
    id: row.client_id,
    projectId: row.project_id,
    marketCode: row.market_code,
    materialKey: row.material_key,
    measure: row.measure,
    unit: row.unit,
    estimatedQuantity: Number(row.estimated_quantity),
    actualQuantity: Number(row.actual_quantity),
    context: row.context,
    evidence: row.evidence,
    evidenceReference: row.evidence_reference ?? undefined,
    status: row.status,
    reviewerId: row.reviewer_id ?? undefined,
    reviewerRole: row.reviewer_role ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    recordedAt: row.recorded_at,
    source: "cloud",
  });
}

/**
 * One shared snapshot. Every project row on the page asks for the same data, so
 * without this a page with twelve saved projects would make twelve round trips.
 */
const CACHE_TTL_MS = 15_000;
let cache: { at: number; snapshot: CalibrationSnapshot } | null = null;
let inflight: Promise<CalibrationSnapshot> | null = null;

export function invalidateCalibrationCache(): void {
  cache = null;
  inflight = null;
}

async function recordAudit(event: AuditEvent): Promise<void> {
  try {
    await supabase.from("calibration_audit_events").insert({
      entity_type: event.entityType,
      entity_key: event.entityKey,
      action: event.action,
      occurred_at: event.occurredAt,
      reason: event.reason,
      before: event.before ?? null,
      after: event.after ?? null,
    });
  } catch {
    // An audit write must never fail the user's own change.
  }
}

async function signedInUserId(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

async function readSnapshot(): Promise<CalibrationSnapshot> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.snapshot;
  if (inflight) return inflight;
  inflight = (async (): Promise<CalibrationSnapshot> => {
    const userId = await signedInUserId();
    if (!userId) {
      return { rows: getCalibrationFeedback(), mode: "device", error: null };
    }
    const { data, error } = await supabase
      .from(ACTUALS_TABLE)
      .select("*")
      .order("recorded_at", { ascending: false })
      .limit(1000);
    if (error) {
      return {
        rows: getCalibrationFeedback(),
        mode: "device",
        error: error.message,
      };
    }
    const rows = (data ?? [])
      .map(fromRow)
      .filter((row): row is CalibrationFeedback => row !== null);
    return { rows, mode: "cloud", error: null };
  })();
  try {
    const snapshot = await inflight;
    cache = { at: Date.now(), snapshot };
    return snapshot;
  } finally {
    inflight = null;
  }
}

/** Reads the evidence for a user, filtered to one project when asked. */
export async function loadCalibrationFeedback(
  projectId?: string,
): Promise<CalibrationSnapshot> {
  const snapshot = await readSnapshot();
  if (!projectId) return snapshot;
  return {
    ...snapshot,
    rows: snapshot.rows.filter((row) => row.projectId === projectId),
  };
}

export async function persistCalibrationFeedback(
  row: CalibrationFeedback,
): Promise<CalibrationMutation> {
  const userId = await signedInUserId();
  if (!userId) {
    const result = saveCalibrationFeedback(row);
    return {
      ok: result.ok,
      mode: "device",
      reason: result.reason ?? null,
    };
  }
  const { error } = await supabase
    .from(ACTUALS_TABLE)
    .insert(toRow({ ...row, source: "cloud" }));
  if (error) {
    if (error.code === "23505") {
      return { ok: false, mode: "cloud", reason: "duplicate" };
    }
    return { ok: false, mode: "cloud", reason: error.message };
  }
  invalidateCalibrationCache();
  await recordAudit(
    createAuditEvent({
      entityType: "calibration_candidate",
      entityKey: row.id,
      action: "proposed",
      actorId: userId,
      reason: `Recorded ${row.materialKey} actuals for ${row.marketCode}`,
      after: row,
    }),
  );
  return { ok: true, mode: "cloud", reason: null };
}

export interface ReviewInput {
  id: string;
  decision: "accepted" | "rejected" | "pending_review";
  reviewerId: string;
  reviewerRole: "owner" | "admin";
  reason: string;
}

/**
 * Records a review. Only an administrator can mark evidence as verified: an
 * owner approval is self attested, which is honest and still useful, and the
 * database enforces the same rule with a trigger.
 */
export async function reviewCalibrationFeedback(
  input: ReviewInput,
): Promise<CalibrationMutation> {
  const evidence =
    input.reviewerRole === "admin" && input.decision === "accepted"
      ? "admin_verified"
      : "self_attested";
  const userId = await signedInUserId();
  if (!userId) {
    const result = updateCalibrationFeedback(input.id, {
      status:
        input.decision === "pending_review" ? "pending_review" : input.decision,
      evidence,
      reviewerId:
        input.reviewerRole === "admin" ? input.reviewerId : "device_owner",
      reviewerRole: input.reviewerRole,
      reviewedAt: new Date().toISOString(),
    });
    return {
      ok: result.ok,
      mode: "device",
      reason: result.reason ?? null,
    };
  }
  const { error } = await supabase
    .from(ACTUALS_TABLE)
    .update({
      status: input.decision,
      evidence,
      reviewer_id: input.reviewerId,
      reviewer_role: input.reviewerRole,
      reviewed_at: new Date().toISOString(),
    })
    .eq("client_id", input.id);
  if (error) return { ok: false, mode: "cloud", reason: error.message };
  invalidateCalibrationCache();
  await recordAudit(
    createAuditEvent({
      entityType: "calibration_candidate",
      entityKey: input.id,
      action:
        input.decision === "accepted"
          ? "approved"
          : input.decision === "rejected"
            ? "rejected"
            : "proposed",
      actorId: userId,
      reason: input.reason,
      after: { decision: input.decision, evidence },
    }),
  );
  return { ok: true, mode: "cloud", reason: null };
}

export async function removeCalibrationFeedback(
  id: string,
  actorId = "device",
): Promise<CalibrationMutation> {
  const userId = await signedInUserId();
  if (!userId) {
    const result = deleteCalibrationFeedback(id, actorId);
    return { ok: result.ok, mode: "device", reason: result.reason ?? null };
  }
  const { error } = await supabase
    .from(ACTUALS_TABLE)
    .delete()
    .eq("client_id", id);
  if (error) return { ok: false, mode: "cloud", reason: error.message };
  invalidateCalibrationCache();
  await recordAudit(
    createAuditEvent({
      entityType: "calibration_candidate",
      entityKey: id,
      action: "record_deleted",
      actorId: userId,
      reason: "Actuals record removed",
    }),
  );
  return { ok: true, mode: "cloud", reason: null };
}
