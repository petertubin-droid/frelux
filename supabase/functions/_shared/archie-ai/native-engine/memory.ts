// =========================================================
// ARCHIE NATIVE ENGINE — CONTEXT & WORKING MEMORY
//
// Real context management: conversation turns are vectorized
// with the shared TF-IDF index and retrieved by salience
// (relevance × recency). No external embedding API — the
// vectors are computed in-engine.
// =========================================================

import { TfIdfIndex, cosine, memoryTurnFromText, tokenize } from "./nlu.ts";
import type { Fact, RetrievedContext } from "./types.ts";

export class ContextMemory {
  private turns: MemoryTurnInternal[] = [];
  private index = new TfIdfIndex();

  addTurn(role: "owner" | "archie", text: string, at = Date.now()): void {
    this.turns.push(memoryTurnFromText(role, text, this.index, at));
  }

  /** Seed from provider-neutral conversation turns. */
  seedFromTurns(
    turns: Array<{ role: "owner" | "archie"; text: string }>,
  ): void {
    for (const t of turns) this.addTurn(t.role, t.text);
  }

  size(): number {
    return this.turns.length;
  }

  /** Salience = cosine(relevance) + recency decay. Real math. */
  retrieve(query: string, k = 4, now = Date.now()): RetrievedContext {
    const qv = this.index.vectorize(tokenize(query));
    const horizon = 1000 * 60 * 60 * 24; // 24h recency horizon
    const ranked = this.turns
      .map((turn) => {
        const relevance = cosine(qv, turn.vector);
        const ageMs = Math.max(0, now - turn.at);
        const recency = Math.max(0, 1 - ageMs / horizon);
        return { turn, salience: relevance * 0.7 + recency * 0.3 };
      })
      .filter((r) => r.salience > 0)
      .sort((a, b) => b.salience - a.salience);
    return {
      salientTurns: ranked.slice(0, k).map((r) => r.turn),
      salientFacts: [],
    };
  }
}

interface MemoryTurnInternal {
  role: "owner" | "archie";
  text: string;
  at: number;
  vector: Map<string, number>;
}

// Re-export for the engine's public typing.
export type { MemoryTurnInternal };

/** Rank knowledge facts against a query — TF-IDF over the
 *  fact's textual surface. Used by the engine's retrieval. */
export function rankFacts(query: string, facts: Fact[], k = 6): Fact[] {
  const index = new TfIdfIndex();
  const factTokens = facts.map((f) => {
    const surface = `${f.subject} ${f.predicate} ${JSON.stringify(f.object)}`;
    const tokens = tokenize(surface);
    index.addDoc(tokens);
    return tokens;
  });
  const qv = index.vectorize(tokenize(query));
  return facts
    .map((f, i) => ({ f, score: cosine(qv, index.vectorize(factTokens[i])) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((r) => r.f);
}
