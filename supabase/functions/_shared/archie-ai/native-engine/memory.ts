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
  // Two buffers prevent DUPLICATE memories: `seeded` is the
  // authoritative conversation history and is REPLACED
  // wholesale on every seedFromTurns call (the engine
  // re-seeds each request); `live` holds turns added during
  // this session. Retrieval ranks both.
  private seeded: MemoryTurnInternal[] = [];
  private live: MemoryTurnInternal[] = [];
  private index = new TfIdfIndex();

  addTurn(role: "owner" | "archie", text: string, at = Date.now()): void {
    this.live.push(memoryTurnFromText(role, text, this.index, at));
  }

  /** Seed from provider-neutral conversation turns. Replaces
   *  the previous seed — never accumulates duplicates when
   *  the caller re-seeds the same history each request. */
  seedFromTurns(
    turns: Array<{ role: "owner" | "archie"; text: string }>,
  ): void {
    const now = Date.now();
    this.seeded = turns.map((t, i) =>
      memoryTurnFromText(
        t.role,
        t.text,
        this.index,
        now - (turns.length - i) * 60_000,
      ),
    );
  }

  size(): number {
    return this.seeded.length + this.live.length;
  }

  /** Salience = cosine(relevance) + recency decay. Real math. */
  retrieve(query: string, k = 4, now = Date.now()): RetrievedContext {
    const qv = this.index.vectorize(tokenize(query));
    const horizon = 1000 * 60 * 60 * 24; // 24h recency horizon
    const turns = [...this.seeded, ...this.live];
    const ranked = turns
      .map((turn) => {
        const relevance = cosine(qv, turn.vector);
        const ageMs = Math.max(0, now - turn.at);
        const recency = Math.max(0, 1 - ageMs / horizon);
        return { turn, relevance, salience: relevance * 0.7 + recency * 0.3 };
      })
      .filter((r) => r.salience > 0)
      .sort((a, b) => b.salience - a.salience);
    return {
      salientTurns: ranked
        .slice(0, k)
        .map((r) => ({ ...r.turn, relevance: r.relevance })),
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
