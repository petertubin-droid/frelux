// =========================================================
// PREDICTIVE INTELLIGENCE, COPILOT RISK-QUESTION TESTS (§20)
//
// The deterministic intent classifier that fronts the risk
// answering surface — regex intent mapping is pinned so the
// Copilot's fallthrough contract (unmatched → null) holds.
// =========================================================
import { describe, it, expect } from "vitest";
import { classifyRiskQuestion } from "./copilot-integration";

describe("classifyRiskQuestion", () => {
  it("biggest-risks intent", () => {
    expect(
      classifyRiskQuestion("What are the biggest risks on this project?"),
    ).toBe("biggest_risks");
    expect(classifyRiskQuestion("what is the main issue we have?")).toBe(
      "biggest_risks",
    );
  });

  it("budget intent", () => {
    expect(classifyRiskQuestion("Are we likely to exceed the budget?")).toBe(
      "budget_exceeded",
    );
    expect(classifyRiskQuestion("budget over 80 percent, any risk?")).toBe(
      "budget_exceeded",
    );
  });

  it("materials intent", () => {
    expect(classifyRiskQuestion("Which materials should we secure next?")).toBe(
      "materials_next",
    );
    expect(classifyRiskQuestion("what should I buy next?")).toBe(
      "materials_next",
    );
  });

  it("schedule intent", () => {
    expect(classifyRiskQuestion("are we behind schedule?")).toBe(
      "behind_schedule",
    );
    expect(classifyRiskQuestion("any delay expected?")).toBe("behind_schedule");
  });

  it("what-changed intent", () => {
    expect(classifyRiskQuestion("what changed since the last update?")).toBe(
      "what_changed",
    );
    expect(classifyRiskQuestion("any changes since the previous report?")).toBe(
      "what_changed",
    );
  });

  it("cost-increase intent", () => {
    expect(classifyRiskQuestion("why did the cost increase so much?")).toBe(
      "why_cost_increasing",
    );
  });

  it("unmatched questions return null (Copilot falls through)", () => {
    expect(classifyRiskQuestion("what colour should the walls be?")).toBeNull();
    expect(classifyRiskQuestion("hello there")).toBeNull();
  });

  it("matching is case-insensitive", () => {
    expect(classifyRiskQuestion("WHY IS THE PRICE INCREASING?")).toBe(
      "why_cost_increasing",
    );
  });
});
