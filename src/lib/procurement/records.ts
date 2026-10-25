// =========================================================
// FRELUX Phase 3: procurement record and trail access.
//
// Thin, honest access layer over procurement_records and the
// append-only procurement_events trail. The database enforces
// the state machine and immutability; this module surfaces
// errors to professional UI states instead of fabricating
// progress.
// =========================================================

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { type ProcurementStatus, canTransition } from "./state-machine";

export interface ProcurementLineItem {
  description: string;
  quantity: number;
  unit: string;
}

export interface ProcurementRecord {
  id: string;
  project_ref: string | null;
  title: string;
  supplier: string;
  destination: string;
  line_items: ProcurementLineItem[];
  status: ProcurementStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProcurementEvent {
  id: string;
  record_id: string;
  from_status: ProcurementStatus | null;
  to_status: ProcurementStatus;
  actor_id: string | null;
  actor_role: "owner" | "admin" | "system";
  source: "app" | "import" | "api";
  line_items: ProcurementLineItem[];
  supplier: string;
  destination: string;
  notes: string | null;
  occurred_at: string;
}

export interface TransitionResult {
  ok: boolean;
  /** Honest reason for refusal, suitable for display. */
  reason: string;
}

export async function listProcurementRecords(): Promise<ProcurementRecord[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from("procurement_records")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) {
    if (import.meta.env.DEV)
      console.error("[procurement] listProcurementRecords:", error.message);
    return [];
  }
  return (data ?? []) as ProcurementRecord[];
}

export async function getProcurementTrail(
  recordId: string,
): Promise<ProcurementEvent[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from("procurement_events")
    .select("*")
    .eq("record_id", recordId)
    .order("occurred_at", { ascending: true });
  if (error) {
    if (import.meta.env.DEV)
      console.error("[procurement] getProcurementTrail:", error.message);
    return [];
  }
  return (data ?? []) as ProcurementEvent[];
}

export async function createProcurementRecord(input: {
  title: string;
  supplier: string;
  destination: string;
  lineItems: ProcurementLineItem[];
  projectRef?: string | null;
}): Promise<ProcurementRecord | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from("procurement_records")
    .insert({
      title: input.title.trim(),
      supplier: input.supplier.trim(),
      destination: input.destination.trim(),
      line_items: input.lineItems,
      project_ref: input.projectRef?.trim() || null,
    })
    .select("*")
    .maybeSingle();
  if (error || !data) {
    if (import.meta.env.DEV)
      console.error("[procurement] createProcurementRecord:", error?.message);
    return null;
  }
  return data as ProcurementRecord;
}

/**
 * Append one transition to the audit trail. The database is the
 * authority: it rejects stale from_status and impossible
 * transitions. The client-side check only produces a clean
 * refusal message; it never relaxes the server's rules.
 */
export async function appendProcurementEvent(
  record: ProcurementRecord,
  toStatus: ProcurementStatus,
  options?: { notes?: string; source?: "app" | "import" | "api" },
): Promise<TransitionResult> {
  if (!isSupabaseConfigured) {
    return {
      ok: false,
      reason: "Procurement tracking is unavailable right now.",
    };
  }
  if (!canTransition(record.status, toStatus)) {
    return {
      ok: false,
      reason: `A record cannot move from ${record.status.replace(/_/g, " ")} to ${toStatus.replace(/_/g, " ")} with an auditable trail.`,
    };
  }
  const { error } = await supabase.from("procurement_events").insert({
    record_id: record.id,
    from_status: record.status,
    to_status: toStatus,
    actor_role: "owner",
    source: options?.source ?? "app",
    line_items: record.line_items,
    supplier: record.supplier,
    destination: record.destination,
    notes: options?.notes?.trim() || null,
  });
  if (error) {
    if (import.meta.env.DEV)
      console.error("[procurement] appendProcurementEvent:", error.message);
    return {
      ok: false,
      reason:
        "The transition could not be recorded. The record's status was not changed.",
    };
  }
  return { ok: true, reason: "" };
}
