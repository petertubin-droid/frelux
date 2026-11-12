import { describe, it, expect } from "vitest";
import {
  normaliseNameTokens,
  tokensAgree,
  scoreNameMatch,
  decideNameMatch,
} from "./name-match";

const thresholds = { autoApprove: 0.85, manualReview: 0.6 };

describe("name normalisation", () => {
  it("drops titles, accents and punctuation", () => {
    expect(normaliseNameTokens("  Chief Dr. Ànthony  O’kon-Effiong ")).toEqual([
      "ANTHONY",
      "OKON",
      "EFFIONG",
    ]);
  });
});

describe("name matching for bank accounts", () => {
  it("accepts the same name in a different case and order", () => {
    const result = scoreNameMatch(
      "ANTHONY OKON EFFIONG",
      "Effiong Anthony Okon",
    );
    expect(result.score).toBe(1);
  });

  it("accepts a bank name that adds a middle name", () => {
    const verdict = decideNameMatch(
      "ANTHONY EFFIONG",
      "ANTHONY OKON EFFIONG",
      thresholds,
    );
    expect(verdict.score).toBeGreaterThanOrEqual(0.85);
    expect(verdict.decision).toBe("verified");
  });

  it("accepts a name the bank truncated", () => {
    const verdict = decideNameMatch(
      "ANTHONY OKON EFFIONG",
      "ANTHONY OKON EFF",
      thresholds,
    );
    expect(verdict.decision).toBe("verified");
  });

  it("accepts a joined surname the bank printed as one word", () => {
    expect(scoreNameMatch("OKON EFFIONG", "OKONEFFIONG").score).toBe(1);
  });

  it("rejects a different person with one shared name", () => {
    const verdict = decideNameMatch(
      "ANTHONY OKON",
      "ANTHONY ADEBAYO",
      thresholds,
    );
    expect(verdict.score).toBeLessThan(0.6);
    expect(verdict.decision).toBe("rejected");
  });

  it("sends a partial overlap to a person rather than guessing", () => {
    const verdict = decideNameMatch(
      "ANTHONY OKON EFFIONG",
      "ANTHONY OKON BASSEY",
      thresholds,
    );
    expect(verdict.score).toBeGreaterThanOrEqual(0.6);
    expect(verdict.score).toBeLessThan(0.85);
    expect(verdict.decision).toBe("pending");
  });

  it("never auto accepts when a name is missing", () => {
    const verdict = decideNameMatch("ANTHONY OKON", "", thresholds);
    expect(verdict.decision).toBe("pending");
    expect(verdict.reason).toBe("missing_name");
  });

  it("refuses to call a three letter stub a match on its own", () => {
    expect(tokensAgree("AB", "ABIODUN")).toBe(false);
    expect(tokensAgree("OKO", "OKON")).toBe(true);
  });

  it("honours tightened thresholds", () => {
    const strict = decideNameMatch("ANTHONY OKON EFFIONG", "OKON EFFIONG", {
      autoApprove: 0.99,
      manualReview: 0.9,
    });
    expect(strict.decision).toBe("pending");
  });
});
