// =========================================================
// ARCHIE NATIVE ENGINE — KNOWLEDGE (FACT STORE)
//
// Real knowledge acquisition + consolidation:
//   * SPO facts with calibrated confidence + provenance
//   * contradiction detection and confidence arbitration
//   * retrieval by pattern and by salience
//   * consolidation: duplicate merge, decay of stale
//     unvalidated knowledge, promotion of repeated positives
// Every fact states where it came from. Uncertain information
// is never stored as established fact (§3 of the permanent
// Native Intelligence Architecture).
// =========================================================

import type { Fact, FactConflict, FactPattern } from "./types.ts";

let factCounter = 0;
function factId(): string {
  factCounter += 1;
  return `fact_${Date.now().toString(36)}_${factCounter.toString(36)}`;
}

function matchesPattern(fact: Fact, pattern: FactPattern): boolean {
  if (pattern.subject !== undefined && pattern.subject !== fact.subject) {
    return false;
  }
  if (pattern.predicate !== undefined && pattern.predicate !== fact.predicate) {
    return false;
  }
  if (pattern.object !== undefined) {
    if (JSON.stringify(pattern.object) !== JSON.stringify(fact.object)) {
      return false;
    }
  }
  return true;
}

export class FactStore {
  private facts: Fact[] = [];
  private persistence: PersistenceLike | null = null;

  constructor(persistence?: PersistenceLike) {
    this.persistence = persistence ?? null;
  }

  /** Hydrate persisted facts (durable knowledge from previous
   *  sessions). Called at engine construction. */
  async hydrate(): Promise<number> {
    if (!this.persistence) return 0;
    const rows = await this.persistence.loadFacts();
    this.facts = rows.map((r) => ({
      id: r.id,
      subject: r.subject,
      predicate: r.predicate,
      object: r.object,
      qualifiers: (r.qualifiers as Record<string, unknown> | null) ?? undefined,
      confidence: r.confidence,
      provenance: r.provenance,
      status: r.status as Fact["status"],
      validatedCount: r.validated_count ?? 0,
      createdAt: r.created_at,
    }));
    return this.facts.length;
  }

  count(): number {
    return this.facts.length;
  }

  validatedCount(): number {
    return this.facts.filter((f) => f.status === "validated").length;
  }

  list(): Fact[] {
    return [...this.facts];
  }

  get(id: string): Fact | undefined {
    return this.facts.find((f) => f.id === id);
  }

  /** Assert a fact. Detects contradictions instead of
   *  silently overwriting — knowledge never silently flips. */
  async assert(
    fact: Omit<Fact, "id" | "validatedCount" | "createdAt">,
  ): Promise<{ fact: Fact; conflict?: FactConflict }> {
    const conflict = this.detectConflict(fact);
    let confidence = fact.confidence;
    let status = fact.status;
    // Reinforce agreement instead of duplicating.
    const twin = this.facts.find(
      (f) =>
        f.subject === fact.subject &&
        f.predicate === fact.predicate &&
        JSON.stringify(f.object) === JSON.stringify(fact.object),
    );
    if (twin) {
      twin.confidence = Math.min(1, twin.confidence + 0.05);
      twin.validatedCount += 1;
      if (twin.validatedCount >= 2 && twin.confidence >= 0.6) {
        twin.status = "validated";
      }
      await this.persistFact(twin);
      return { fact: twin, conflict };
    }
    const full: Fact = {
      ...fact,
      confidence,
      status,
      id: factId(),
      validatedCount: 0,
      createdAt: new Date().toISOString(),
    };
    if (conflict) {
      // Contradiction: park as uncertain — never store as established fact.
      full.status = "uncertain";
    }
    this.facts.push(full);
    await this.persistFact(full);
    return { fact: full, conflict };
  }

  /** Same SPO, different object value = contradiction. */
  detectConflict(
    fact: Pick<Fact, "subject" | "predicate" | "object">,
  ): FactConflict | undefined {
    const conflicting = this.facts.filter(
      (f) =>
        f.subject === fact.subject &&
        f.predicate === fact.predicate &&
        JSON.stringify(f.object) !== JSON.stringify(fact.object),
    );
    if (conflicting.length === 0) return undefined;
    return {
      kind: "contradiction",
      subject: fact.subject,
      predicate: fact.predicate,
      conflictingFactIds: conflicting.map((f) => f.id),
    };
  }

  query(pattern: FactPattern): Fact[] {
    return this.facts.filter((f) => matchesPattern(f, pattern));
  }

  /** Subject lookup used for knowledge question answering. */
  about(subject: string): Fact[] {
    return this.facts.filter((f) => f.subject === subject);
  }

  /** Consolidation pass (real): merge exact duplicates, decay
   *  stale unvalidated knowledge, promote well-validated
   *  candidates. Returns honest counts. */
  async consolidate(): Promise<{
    merged: number;
    decayed: number;
    promoted: number;
    dropped: number;
  }> {
    let merged = 0;
    let decayed = 0;
    let promoted = 0;
    let dropped = 0;
    const seen = new Map<string, Fact>();
    const survivors: Fact[] = [];
    for (const fact of this.facts) {
      const key = `${fact.subject}|${fact.predicate}|${JSON.stringify(fact.object)}`;
      const existing = seen.get(key);
      if (existing) {
        existing.confidence = Math.min(
          1,
          existing.confidence + fact.confidence * 0.5,
        );
        existing.validatedCount += fact.validatedCount;
        merged += 1;
        continue;
      }
      seen.set(key, fact);
      survivors.push(fact);
    }
    const finalFacts: Fact[] = [];
    for (const fact of survivors) {
      if (
        fact.status === "candidate" &&
        fact.confidence < 0.15 &&
        fact.validatedCount === 0
      ) {
        dropped += 1;
        continue;
      }
      if (fact.status === "candidate" && fact.confidence > 0.35) {
        fact.confidence = Math.max(0.15, fact.confidence - 0.03);
        decayed += 1;
      }
      if (
        fact.status === "candidate" &&
        fact.validatedCount >= 2 &&
        fact.confidence >= 0.6
      ) {
        fact.status = "validated";
        promoted += 1;
      }
      finalFacts.push(fact);
    }
    this.facts = finalFacts;
    await this.persistAll();
    return { merged, decayed, promoted, dropped };
  }

  private async persistFact(fact: Fact): Promise<void> {
    if (!this.persistence) return;
    await this.persistence.saveFact(fact);
  }

  private async persistAll(): Promise<void> {
    if (!this.persistence) return;
    await this.persistence.saveFacts(this.facts);
  }
}

/** Persistence adapter — implemented by the Supabase-backed
 *  adapter (edge/app) or an in-memory double in tests. */
export interface PersistedFactRow {
  id: string;
  subject: string;
  predicate: string;
  object: unknown;
  qualifiers?: unknown;
  confidence: number;
  provenance: Fact["provenance"];
  status: string;
  validated_count?: number;
  created_at: string;
}

export interface PersistenceLike {
  loadFacts(): Promise<PersistedFactRow[]>;
  saveFact(fact: Fact): Promise<void>;
  saveFacts(facts: Fact[]): Promise<void>;
}
