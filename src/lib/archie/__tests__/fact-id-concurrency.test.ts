import { describe, expect, it } from "vitest";
// =========================================================
// Fact-ID concurrency safety (audit H3, plan Phase 0).
// The legacy id scheme (Date.now + per-isolate counter)
// collided across concurrent isolates. New ids must be
// globally unique under heavy parallel assertion, and no
// fact may be lost.
// =========================================================

import { FactStore } from "@studio-shared/archie-ai/native-engine/knowledge.ts";

function mkFact(subject: string, i: number) {
  return {
    subject: `concurrency-${subject}`,
    predicate: "stress",
    object: `value-${i}`,
    confidence: 0.5,
    provenance: { source: "seed" as const },
    status: "candidate" as const,
  };
}

describe("fact-id concurrency (H3)", () => {
  it("500 parallel asserts produce 500 unique ids and 500 stored facts", async () => {
    const store = new FactStore();
    const results = await Promise.all(
      Array.from({ length: 500 }, (_, i) =>
        store.assert(mkFact("a", i)),
      ),
    );
    const ids = results.map((r) => r.fact.id);
    expect(new Set(ids).size).toBe(500);
    expect(store.count()).toBe(500);
    expect(store.list().every((f) => f.id.startsWith("fact_"))).toBe(true);
  });

  it("ids are not timestamp+counter derived (collision-proof format)", async () => {
    const store = new FactStore();
    const r = await store.assert(mkFact("b", 0));
    // UUID v4 shape: 8-4-4-4-12 hex, version nibble 4.
    expect(r.fact.id).toMatch(
      /^fact_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

});
