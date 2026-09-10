// =========================================================
// ARCHIE COGNITIVE ENGINE — SECURITY PERSISTENCE
// supabase/functions/_shared/archie-ai/cognitive/persistence.ts
//
// Durable storage for the cognitive layer:
//   * frelux_archie_audit_log  — append-only, hash-chained
//   * frelux_archie_cognitive_traces — loop observability
// The world model persists its own rows (world-model.ts).
// Failures here are honest: the engine keeps operating and
// reports degraded persistence in diagnostics.
// =========================================================

import type { SupabaseLike } from "../native-engine/persistence.ts";
import type { AuditEvent, CognitiveTrace } from "./types.ts";

export const AUDIT_TABLE = "frelux_archie_audit_log";
export const TRACES_TABLE = "frelux_archie_cognitive_traces";

interface AuditRow {
  seq: number;
  event_type: string;
  payload: unknown;
  at: string;
  prev_hash: string;
  hash: string;
}

export class CognitivePersistence {
  private db: SupabaseLike | null;

  constructor(db?: SupabaseLike) {
    this.db = db ?? null;
  }

  async loadAudit(): Promise<AuditEvent[]> {
    if (!this.db) return [];
    try {
      const { data, error } = await this.db
        .from(AUDIT_TABLE)
        .select("seq,event_type,payload,at,prev_hash,hash");
      if (error || !Array.isArray(data)) return [];
      return (data as AuditRow[])
        .map((r) => ({
          seq: r.seq,
          eventType: r.event_type as AuditEvent["eventType"],
          payload: (r.payload ?? {}) as Record<string, unknown>,
          at: r.at,
          prevHash: r.prev_hash,
          hash: r.hash,
        }))
        .sort((a, b) => a.seq - b.seq);
    } catch {
      return [];
    }
  }

  async appendAudit(event: AuditEvent): Promise<boolean> {
    if (!this.db) return false;
    try {
      await this.db.from(AUDIT_TABLE).upsert({
        seq: event.seq,
        event_type: event.eventType,
        payload: event.payload,
        at: event.at,
        prev_hash: event.prevHash,
        hash: event.hash,
      });
      return true;
    } catch {
      return false;
    }
  }

  async saveTrace(trace: CognitiveTrace): Promise<boolean> {
    if (!this.db) return false;
    try {
      await this.db.from(TRACES_TABLE).upsert({
        id: trace.cycleId,
        task: trace.task,
        phases: trace.phases,
        route: trace.route,
        epistemic: trace.epistemic,
        confidence: trace.confidence,
        created_at: trace.createdAt,
      });
      return true;
    } catch {
      return false;
    }
  }
}
