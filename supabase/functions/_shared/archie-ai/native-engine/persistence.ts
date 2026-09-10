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
