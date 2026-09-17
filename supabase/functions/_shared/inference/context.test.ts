// =========================================================
// ARCHIE CONTEXT & INFERENCE ENGINE — CONTEXT TESTS
//
// Spec §22 (context tests): pronouns, references,
// previous-message context, domain context, temporal context,
// user constraints — plus the bounded-retrieval guarantee
// (never the whole conversation) and the user-premise vs
// verified-fact distinction.
// =========================================================

import { describe, it, expect } from "vitest";
import { buildContextModel } from "./context.ts";

const NOW = () => "2026-09-17T08:00:00.000Z";

describe("context — prior-message relevance (spec §3)", () => {
  it("loads only prior turns that share terms with the current message", () => {
    const ctx = buildContextModel(
      "Tell me more about the mortgage approval process",
      [
        { role: "owner", content: "Hello, good morning" },
        { role: "archie", content: "Hello! How can I help today?" },
        { role: "owner", content: "I want to ask the bank about a mortgage" },
        {
          role: "archie",
          content: "Sure — what would you like to know about the mortgage?",
        },
      ],
      { now: NOW },
    );
    const loaded = ctx.relevantPriorTurns.map((t) => t.index);
    expect(loaded).toContain(2); // shares "mortgage"
    expect(loaded).not.toContain(0); // greeting shares nothing
    expect(loaded).not.toContain(1);
    // bounded: never more than the cap
    expect(ctx.relevantPriorTurns.length).toBeLessThanOrEqual(3);
  });

  it("always loads the previous turn when the message references it (pronoun opener)", () => {
    const ctx = buildContextModel(
      "it — yes, exactly that one",
      [
        { role: "owner", content: "completely unrelated topic about pottery" },
        { role: "archie", content: "the pottery kiln fires at 1000 degrees" },
      ],
      { now: NOW },
    );
    expect(ctx.referencedPriorTurnLikely).toBe(true);
    const last = ctx.relevantPriorTurns.find((t) => t.index === 1);
    expect(last).toBeDefined();
    expect(last!.reason).toContain("immediately previous turn");
  });

  it("does NOT claim a reference when there is no history", () => {
    const ctx = buildContextModel("it works", [], { now: NOW });
    expect(ctx.referencedPriorTurnLikely).toBe(false);
    expect(ctx.relevantPriorTurns).toHaveLength(0);
  });

  it("is bounded even with a long history (spec §21)", () => {
    const history = Array.from({ length: 40 }, (_, i) => ({
      role: i % 2 ? "archie" : "owner",
      content: `turn ${i} talks about mortgages and banks`,
    }));
    const ctx = buildContextModel("mortgage rates at the bank", history, {
      now: NOW,
    });
    expect(ctx.relevantPriorTurns.length).toBeLessThanOrEqual(3);
    expect(ctx.temporal.priorTurnCount).toBe(40);
  });
});

describe("context — user constraints (spec §3)", () => {
  it("detects explicit constraint markers in the user message", () => {
    const ctx = buildContextModel(
      "Compare the loans but only fixed-rate ones, and never include variable rates",
      [],
      { now: NOW },
    );
    const markers = ctx.constraints.map((c) => c.text);
    expect(markers).toContain("only");
    expect(markers).toContain("never");
    expect(ctx.constraints.every((c) => c.source === "USER_MESSAGE")).toBe(
      true,
    );
  });

  it("does NOT invent constraints that were not written", () => {
    const ctx = buildContextModel("What is a mortgage?", [], { now: NOW });
    expect(ctx.constraints).toHaveLength(0);
  });
});

describe("context — temporal context (spec §12)", () => {
  it("records the turn time and the honest stored-knowledge note", () => {
    const ctx = buildContextModel("hello", [], {
      now: NOW,
      sourceLabel: "OEWN 2026-dev-bff3181",
    });
    expect(ctx.temporal.now).toBe("2026-09-17T08:00:00.000Z");
    expect(ctx.temporal.note).toContain("2026-dev-bff3181");
    expect(ctx.temporal.note).toContain(
      "never treated as automatically current",
    );
  });
});

describe("context — user premises vs verified facts (spec §14)", () => {
  it("labels unavailability statements as USER_PROVIDED assumptions — never facts", () => {
    const ctx = buildContextModel("The bank's ATM is unavailable today", [], {
      now: NOW,
    });
    expect(ctx.userPremises.length).toBeGreaterThan(0);
    for (const p of ctx.userPremises) {
      expect(p.knowledgeStatus).toBe("USER_PROVIDED");
      expect(p.source).toBe("USER_PROVIDED");
      expect(p.kind).toBe("ASSUMPTION");
      expect(p.statement).toContain("the user states");
    }
  });

  it("does NOT create premises for messages without availability statements", () => {
    const ctx = buildContextModel("What is the weather?", [], { now: NOW });
    expect(ctx.userPremises).toHaveLength(0);
  });

  it("carries unresolved ambiguities from the previous turn", () => {
    const ctx = buildContextModel("ok thanks", [], {
      carriedAmbiguities: ["bank"],
      now: NOW,
    });
    expect(ctx.unresolvedAmbiguities).toEqual(["bank"]);
  });
});
