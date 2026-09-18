// =========================================================
// AI FOUNDATION, RISK-ANSWERS TESTS (Phase 4 §20)
//
// The Copilot risk-question surface contract:
//   * non-risk questions return null (caller falls through)
//   * deterministic answers come from the REAL predictive
//     analysis — never invented here
//   * missing project / failed analysis → honest unavailable
//     reasons, never fabricated data
//   * cache provenance (fromCache) is relayed, not guessed
// =========================================================
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/predictive-intelligence", () => ({
  classifyRiskQuestion: vi.fn(),
  answerRiskQuestion: vi.fn(),
  buildPredictiveContextForAi: vi.fn(),
  getProjectAnalysis: vi.fn(),
}));

import {
  classifyRiskQuestion,
  answerRiskQuestion,
  buildPredictiveContextForAi,
  getProjectAnalysis,
} from "@/lib/predictive-intelligence";
import { answerProjectRiskQuestion } from "@/lib/ai-foundation/risk-answers";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("answerProjectRiskQuestion", () => {
  it("returns null for non-risk questions and never loads the project", async () => {
    vi.mocked(classifyRiskQuestion).mockReturnValue(null);
    const res = await answerProjectRiskQuestion(
      "proj-1",
      "what colour is the sky?",
    );
    expect(res).toBeNull();
    expect(getProjectAnalysis).not.toHaveBeenCalled();
  });

  it("reports project_not_found when the project has no analysis", async () => {
    vi.mocked(classifyRiskQuestion).mockReturnValue("budget_exceeded");
    vi.mocked(getProjectAnalysis).mockResolvedValue(null);
    const res = await answerProjectRiskQuestion("proj-x", "any cashflow risk?");
    expect(res).toEqual({
      question: "any cashflow risk?",
      matched: true,
      unavailableReason: "project_not_found",
    });
  });

  it("reports analysis_failed when the analysis throws", async () => {
    vi.mocked(classifyRiskQuestion).mockReturnValue("behind_schedule");
    vi.mocked(getProjectAnalysis).mockRejectedValue(new Error("db down"));
    const res = await answerProjectRiskQuestion("proj-1", "any delay risk?");
    expect(res).toEqual({
      question: "any delay risk?",
      matched: true,
      unavailableReason: "analysis_failed",
    });
  });

  it("relays the deterministic answer and the AI context verbatim", async () => {
    const analysis = { predictions: [] };
    vi.mocked(classifyRiskQuestion).mockReturnValue("why_cost_increasing");
    vi.mocked(getProjectAnalysis).mockResolvedValue({
      analysis: analysis as never,
      fromCache: false,
    });
    vi.mocked(answerRiskQuestion).mockReturnValue({
      answer: "Cost risk: 2 over-budget trades (deterministic).",
    } as never);
    vi.mocked(buildPredictiveContextForAi).mockReturnValue(
      "COST: 2 trades over budget; total variance ₦120,000.",
    );
    const res = await answerProjectRiskQuestion("proj-1", "are costs okay?");
    expect(res).not.toBeNull();
    if (res && res.matched && "answer" in res) {
      expect(res.answer).toBe(
        "Cost risk: 2 over-budget trades (deterministic).",
      );
      expect(res.aiContext).toBe(
        "COST: 2 trades over budget; total variance ₦120,000.",
      );
      expect(res.fromCache).toBe(false);
    } else {
      throw new Error("expected a successful risk answer");
    }
    // the deterministic answer MUST come from the real analysis object
    expect(answerRiskQuestion).toHaveBeenCalledWith(
      "why_cost_increasing",
      analysis,
    );
  });

  it("relays cache provenance honestly (fromCache=true)", async () => {
    vi.mocked(classifyRiskQuestion).mockReturnValue("budget_exceeded");
    vi.mocked(getProjectAnalysis).mockResolvedValue({
      analysis: {} as never,
      fromCache: true,
    });
    vi.mocked(answerRiskQuestion).mockReturnValue({ answer: "ok" } as never);
    vi.mocked(buildPredictiveContextForAi).mockReturnValue("ctx");
    const res = await answerProjectRiskQuestion("proj-1", "cashflow risk?");
    if (res && res.matched && "answer" in res) expect(res.fromCache).toBe(true);
    else throw new Error("expected a successful risk answer");
  });
});
