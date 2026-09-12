// =========================================================
// ARCHIE NATIVE ENGINE — PERSISTENCE ADAPTERS
//
// Durable knowledge + outcome persistence for the native
// engine (tables frelux_archie_native_facts and
// frelux_archie_native_outcomes — RLS-guarded, service-role
// only, seeded by migration
// 20260912120000_archie_native_engine.sql). The adapter is
// structural: it accepts any Supabase-shaped client, so the
// same code serves edge functions and the app.
// =========================================================

import type { Fact, LearningOutcome } from "./types.ts";
import { PersistenceLike, PersistedFactRow } from "./knowledge.ts";
import type { OutcomePersistence } from "./learning.ts";

/** Minimal structural shape of the Supabase client the
 *  adapter needs. supabase-js satisfies this structurally;
 *  call sites pass `db as unknown as SupabaseLike`. */
export interface SupabaseLike {
  from(table: string): {
    select(
      query: string,
    ): PromiseLike<{ data: unknown[] | null; error: unknown }>;
    insert(rows: unknown): PromiseLike<{ error: unknown }>;
    update(patch: unknown): {
      eq(column: string, value: unknown): PromiseLike<{ error: unknown }>;
    };
    upsert(rows: unknown): PromiseLike<{ error: unknown }>;
  };
}

export const FACTS_TABLE = "frelux_archie_native_facts";
export const OUTCOMES_TABLE = "frelux_archie_native_outcomes";
export const EPISODIC_TABLE = "frelux_archie_episodic_turns";
export const COUNTERS_TABLE = "frelux_archie_engine_counters";

/** A persisted episodic turn (plan P7): prior-session
 *  context grouped by conversation id. */
export interface EpisodicTurnRow {
  id: string;
  conversation_id: string;
  role: "owner" | "archie";
  text: string;
  turn_at: string;
}

function rowFromFact(fact: Fact): Record<string, unknown> {
  return {
    id: fact.id,
    subject: fact.subject,
    predicate: fact.predicate,
    object: fact.object,
    qualifiers: fact.qualifiers ?? null,
    confidence: fact.confidence,
    provenance: fact.provenance,
    status: fact.status,
    validated_count: fact.validatedCount,
    verified_by: fact.verifiedBy ?? [],
    created_at: fact.createdAt,
  };
}

/** Supabase-backed persistence for facts + outcomes. */
export class SupabasePersistence
  implements PersistenceLike, OutcomePersistence
{
  constructor(private db: SupabaseLike) {}

  async loadFacts(): Promise<PersistedFactRow[]> {
    const { data, error } = await this.db
      .from(FACTS_TABLE)
      .select(
        "id,subject,predicate,object,qualifiers,confidence,provenance,status,validated_count,verified_by,created_at",
      );
    if (error) return [];
    const rows = (data ?? []) as PersistedFactRow[];
    // Hydrate the most recent 500 facts.
    return rows
      .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
      .slice(0, 500);
  }

  async saveFact(fact: Fact): Promise<void> {
    const { error } = await this.db
      .from(FACTS_TABLE)
      .insert([rowFromFact(fact)]);
    if (error) {
      // The row exists from a previous session — update instead.
      await this.db
        .from(FACTS_TABLE)
        .update({
          confidence: fact.confidence,
          status: fact.status,
          validated_count: fact.validatedCount,
          verified_by: fact.verifiedBy ?? [],
        })
        .eq("id", fact.id);
    }
  }

  async saveFacts(facts: Fact[]): Promise<void> {
    for (const fact of facts.slice(0, 500)) {
      await this.db
        .from(FACTS_TABLE)
        .update({
          confidence: fact.confidence,
          status: fact.status,
          validated_count: fact.validatedCount,
          verified_by: fact.verifiedBy ?? [],
        })
        .eq("id", fact.id);
    }
  }

  /** REMEDIATION batch 4 (2026-09-13): claim-based
   *  single-writer lock via DB RPC (pooled-connection safe).
   *  FAIL-OPEN by design: a client without rpc (in-memory
   *  mocks) or an errored claim keeps the historical unlocked
   *  behavior — locking is mutual exclusion between writers,
   *  never a reason consolidation stops happening. */
  async tryLock(
    scope: string,
    holder: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    const rpc = (
      this.db as SupabaseLike & {
        rpc?: (
          fn: string,
          args?: Record<string, unknown>,
        ) => PromiseLike<{ data: unknown; error: unknown }>;
      }
    ).rpc;
    if (typeof rpc !== "function") return true;
    const { data, error } = await rpc.call(this.db, "frelux_try_engine_lock", {
      p_scope: scope,
      p_holder: holder,
      p_ttl_seconds: ttlSeconds,
    });
    if (error) return true;
    return data !== false;
  }

  async releaseLock(scope: string, holder: string): Promise<void> {
    const rpc = (
      this.db as SupabaseLike & {
        rpc?: (
          fn: string,
          args?: Record<string, unknown>,
        ) => PromiseLike<{ data: unknown; error: unknown }>;
      }
    ).rpc;
    if (typeof rpc !== "function") return;
    await rpc.call(this.db, "frelux_release_engine_lock", {
      p_scope: scope,
      p_holder: holder,
    });
  }

  async loadOutcomes(): Promise<LearningOutcome[]> {
    const { data, error } = await this.db
      .from(OUTCOMES_TABLE)
      .select("id,kind,task,contributing,timestamp");
    if (error) return [];
    return ((data ?? []) as LearningOutcome[]).slice(0, 200);
  }

  async saveOutcome(outcome: LearningOutcome): Promise<void> {
    await this.db.from(OUTCOMES_TABLE).insert([
      {
        id: outcome.id,
        kind: outcome.kind,
        task: outcome.task,
        contributing: outcome.contributing,
        timestamp: outcome.timestamp,
      },
    ]);
  }
}

// ---------------------------------------------------------
// EPISODIC MEMORY + CROSS-ISOLATE COUNTERS (plan P7)
// ---------------------------------------------------------

/** Supabase-backed episodic-turn persistence. */
export class EpisodicPersistence {
  constructor(private db: SupabaseLike) {}

  /** Most recent turns across conversations (hydration
   *  happens once per isolate, at boot). */
  async loadEpisodicTurns(limit = 200): Promise<EpisodicTurnRow[]> {
    const { data, error } = await this.db
      .from(EPISODIC_TABLE)
      .select("id,conversation_id,role,text,turn_at");
    if (error) return [];
    const rows = (data ?? []) as EpisodicTurnRow[];
    return rows
      .sort((a, b) => (b.turn_at ?? "").localeCompare(a.turn_at ?? ""))
      .slice(0, limit);
  }

  /** Persist one turn. Best-effort: a failed write never
   *  breaks the conversation — the next turn retries. */
  async saveEpisodicTurn(turn: {
    conversationId: string;
    role: "owner" | "archie";
    text: string;
    at: number;
  }): Promise<void> {
    await this.db.from(EPISODIC_TABLE).insert([
      {
        id: `epi_${crypto.randomUUID()}`,
        conversation_id: turn.conversationId,
        role: turn.role,
        text: turn.text.slice(0, 4000),
        turn_at: new Date(turn.at).toISOString(),
      },
    ]);
  }
}

/** Cross-isolate engine counters. Read-modify-write upsert:
 *  under concurrent isolates the LAST write wins — the
 *  numbers are diagnostics, not accounting, and this is
 *  stated plainly rather than hidden behind an atomic RPC
 *  (which the structural adapter contract does not carry). */
export class CounterPersistence {
  constructor(private db: SupabaseLike) {}

  async loadCounters(): Promise<Record<string, number>> {
    const { data, error } = await this.db
      .from(COUNTERS_TABLE)
      .select("key,value");
    if (error) return {};
    const out: Record<string, number> = {};
    for (const row of (data ?? []) as Array<{ key: string; value: number }>) {
      out[row.key] = Number(row.value) || 0;
    }
    return out;
  }

  async saveCounters(counters: Record<string, number>): Promise<void> {
    const rows = Object.entries(counters).map(([key, value]) => ({
      key,
      value,
      updated_at: new Date().toISOString(),
    }));
    if (rows.length === 0) return;
    await this.db.from(COUNTERS_TABLE).upsert(rows);
  }
}
