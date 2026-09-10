import { describe, expect, it } from "vitest";
// =========================================================
// Evidence-quality learning gates (audit H1/H2, plan Phase 3).
// Gratitude is acknowledgement, NOT verification. Only an
// explicit owner confirmation that names what is being
// confirmed counts as success evidence. Repetition alone can
// never promote a fact to validated.
// =========================================================

import { FactStore } from "@studio-shared/archie-ai/native-engine/knowledge.ts";
import { OutcomeLearner } from "@studio-shared/archie-ai/native-engine/learning.ts";
import { ArchieNativeEngine } from "@studio-shared/archie-ai/native-engine/engine.ts";

describe("learning evidence gates (H1)", () => {
  it("acknowledged outcomes are recorded but reinforce nothing", async () => {
    const store = new FactStore();
    const { fact } = await store.assert({
      subject: "screeding",
      predicate: "thickness",
      object: "40 mm",
      confidence: 0.5,
      provenance: { source: "owner-taught" },
      status: "candidate",
    });
    const learner = new OutcomeLearner(store);
    for (let i = 0; i < 5; i++) {
      await learner.record({
        kind: "acknowledged",
        task: "owner said thanks",
        contributing: [fact.id],
      });
    }
    const after = store.get(fact.id)!;
    expect(learner.count()).toBe(5);
    expect(after.validatedCount).toBe(0); // zero reinforcement
    expect(after.confidence).toBe(0.5);
    // owner-taught facts carry exactly their own authority
    // event — acknowledgement adds none.
    expect((after.verifiedBy ?? []).join()).toBe("owner-taught");
    expect(after.status).toBe("candidate");
  });

  it("an explicit owner confirmation IS a verification event and promotes", async () => {
    const store = new FactStore();
    const { fact } = await store.assert({
      subject: "screeding",
      predicate: "thickness",
      object: "40 mm",
      confidence: 0.55,
      provenance: { source: "owner-taught" },
      status: "candidate",
    });
    const learner = new OutcomeLearner(store);
    await learner.record({
      kind: "success",
      task: "owner: confirm that screeding thickness",
      contributing: [fact.id],
    });
    await learner.record({
      kind: "success",
      task: "owner: confirm again",
      contributing: [fact.id],
    });
    const after = store.get(fact.id)!;
    expect(after.validatedCount).toBeGreaterThanOrEqual(2);
    expect((after.verifiedBy ?? []).length).toBeGreaterThanOrEqual(2);
    expect(
      (after.verifiedBy ?? []).some((v) => /^owner-confirm:/.test(v)),
    ).toBe(true);
    expect(after.status).toBe("validated");
  });

  it("gratitude after an answer does NOT promote the cited facts", async () => {
    const engine = new ArchieNativeEngine();
    // Teach a candidate fact first.
    await engine.converse("remember that market cement price is 8500 naira");
    const taught = engine
      .store()
      .list()
      .find((f) => f.subject.includes("market-cement"));
    expect(taught).toBeDefined();

    // Ask about it so the answer cites the fact…
    await engine.converse("what is market cement price");
    const before = engine.store().get(taught!.id)!;

    // …then thank ARCHIE repeatedly. Politeness must not
    // reinforce or promote anything.
    for (let i = 0; i < 3; i++) {
      await engine.converse("thanks, good answer");
    }
    const after = engine.store().get(taught!.id)!;
    expect(after.confidence).toBeCloseTo(before.confidence, 5);
    expect(after.validatedCount).toBe(before.validatedCount);
  });

  it("an explicit confirmation DOES reinforce the cited facts", async () => {
    const engine = new ArchieNativeEngine();
    await engine.converse("remember that market sand price is 3200 naira");
    const taught = engine
      .store()
      .list()
      .find((f) => f.subject.includes("market-sand"));
    expect(taught).toBeDefined();
    await engine.converse("what is market sand price");
    const before = engine.store().get(taught!.id)!;
    const confBefore = before.confidence;

    await engine.converse("I confirm that market sand price is correct");
    const after = engine.store().get(taught!.id)!;
    expect(after.confidence).toBeGreaterThan(confBefore);
    expect(after.verifiedBy?.some((v) => v.startsWith("owner-confirm:"))).toBe(
      true,
    );
  });
});
