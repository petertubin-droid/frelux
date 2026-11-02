import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn(() => ({ user: null, loading: false })) }));
vi.mock("@/lib/credits", () => ({ getCreditWallet: vi.fn().mockResolvedValue(null), getActivityStreak: vi.fn().mockResolvedValue(null), recordActivity: vi.fn().mockResolvedValue(true), REWARD_EVENTS: {} }));

beforeEach(() => { vi.clearAllMocks(); });

describe("ImageEstimator", () => {
  it("module exports something", async () => {
    const mod = await import("@/pages/ImageEstimator");
    expect(mod).toBeDefined();
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });
});

describe("describeVisionFailure", () => {
  it("never claims the service is undeployed", async () => {
    const { describeVisionFailure } = await import("@/pages/ImageEstimator");
    for (const body of [
      null,
      { code: "AI_BUSY" },
      { code: "INTERNAL_ERROR", error: "Gemini API error: 400" },
    ]) {
      expect(describeVisionFailure(body)).not.toMatch(/not yet deployed/i);
    }
  });

  it("maps known codes to actionable messages", async () => {
    const { describeVisionFailure } = await import("@/pages/ImageEstimator");
    expect(describeVisionFailure({ code: "AI_BUSY" })).toMatch(/busy/i);
    expect(describeVisionFailure({ code: "USAGE_LIMIT_REACHED" })).toMatch(
      /tomorrow/i,
    );
    expect(describeVisionFailure({ code: "NO_API_KEY" })).toMatch(
      /not configured/i,
    );
    expect(describeVisionFailure(null)).toMatch(/reach/i);
  });
});

