import { describe, it, expect, beforeEach } from "vitest";
import {
  checkAiAccess,
  getClientId,
  requestRewardedAccess,
  type AiAccessConfig,
  type AiUsageStatus,
} from "@/lib/ai-access";

function makeConfig(overrides: Partial<AiAccessConfig> = {}): AiAccessConfig {
  return {
    aiEnabled: true,
    accessMode: "free",
    dailyFreeUses: 3,
    rewardedEnabled: true,
    paidEnabled: true,
    paidPrice: 1000,
    paidCurrency: "NGN",
    resetPeriod: "daily",
    adminOverride: true,
    ...overrides,
  };
}

function makeUsage(overrides: Partial<AiUsageStatus> = {}): AiUsageStatus {
  return {
    usedToday: 0,
    remaining: 3,
    limit: 3,
    resetPeriod: "daily",
    hasRemaining: true,
    isAuthenticated: true,
    ...overrides,
  };
}

describe("ai-access — checkAiAccess (disabled mode)", () => {
  it("denies access when AI is globally disabled", () => {
    const result = checkAiAccess(makeConfig({ aiEnabled: false }), makeUsage());
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("disabled");
  });

  it("denies access when access mode is disabled", () => {
    const result = checkAiAccess(
      makeConfig({ accessMode: "disabled" }),
      makeUsage(),
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("disabled");
  });
});

describe("ai-access — checkAiAccess (admin override)", () => {
  it("allows access for admin with override enabled (overriding paid mode)", () => {
    const result = checkAiAccess(
      makeConfig({ accessMode: "paid", adminOverride: true }),
      makeUsage({ hasRemaining: false }),
      true,
    );
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("admin_override");
  });

  it("denies admin when override is disabled (in paid mode)", () => {
    const result = checkAiAccess(
      makeConfig({
        accessMode: "paid",
        adminOverride: false,
        paidEnabled: false,
      }),
      makeUsage({ hasRemaining: false }),
      true,
    );
    expect(result.allowed).toBe(false);
  });

  it("admin cannot override globally disabled AI", () => {
    const result = checkAiAccess(
      makeConfig({ aiEnabled: false, adminOverride: true }),
      makeUsage(),
      true,
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("disabled");
  });
});

describe("ai-access — checkAiAccess (free mode)", () => {
  it("allows access when usage remaining", () => {
    const result = checkAiAccess(
      makeConfig({ accessMode: "free" }),
      makeUsage({ hasRemaining: true }),
    );
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("free");
  });

  it("denies access when no remaining uses", () => {
    const result = checkAiAccess(
      makeConfig({ accessMode: "free" }),
      makeUsage({ hasRemaining: false }),
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("limit_reached");
    if (!result.allowed) {
      expect(result.nextAction).toBe("none");
    }
  });
});

describe("ai-access — checkAiAccess (rewarded mode)", () => {
  it("allows free access when usage remaining", () => {
    const result = checkAiAccess(
      makeConfig({ accessMode: "rewarded", rewardedEnabled: true }),
      makeUsage({ hasRemaining: true }),
    );
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("free");
  });

  it("suggests rewarded ads when limit reached and rewarded enabled", () => {
    const result = checkAiAccess(
      makeConfig({ accessMode: "rewarded", rewardedEnabled: true }),
      makeUsage({ hasRemaining: false }),
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("limit_reached");
    if (!result.allowed) {
      expect(result.nextAction).toBe("rewarded");
    }
  });

  it("suggests none when limit reached and rewarded disabled", () => {
    const result = checkAiAccess(
      makeConfig({ accessMode: "rewarded", rewardedEnabled: false }),
      makeUsage({ hasRemaining: false }),
    );
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.nextAction).toBe("none");
    }
  });
});

describe("ai-access — checkAiAccess (paid mode)", () => {
  it("suggests paid upgrade when paid is enabled", () => {
    const result = checkAiAccess(
      makeConfig({ accessMode: "paid", paidEnabled: true }),
      makeUsage(),
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("limit_reached");
    if (!result.allowed) {
      expect(result.nextAction).toBe("paid");
    }
  });

  it("returns not_configured when paid is disabled", () => {
    const result = checkAiAccess(
      makeConfig({ accessMode: "paid", paidEnabled: false }),
      makeUsage(),
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("not_configured");
  });
});

describe("ai-access — checkAiAccess (free_rewarded mode)", () => {
  it("allows free access when usage remaining", () => {
    const result = checkAiAccess(
      makeConfig({ accessMode: "free_rewarded" }),
      makeUsage({ hasRemaining: true }),
    );
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("free");
  });

  it("suggests rewarded when limit reached and rewarded enabled", () => {
    const result = checkAiAccess(
      makeConfig({ accessMode: "free_rewarded", rewardedEnabled: true }),
      makeUsage({ hasRemaining: false }),
    );
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.nextAction).toBe("rewarded");
    }
  });

  it("suggests none when limit reached and rewarded disabled", () => {
    const result = checkAiAccess(
      makeConfig({ accessMode: "free_rewarded", rewardedEnabled: false }),
      makeUsage({ hasRemaining: false }),
    );
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.nextAction).toBe("none");
    }
  });
});

describe("ai-access — getClientId", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("generates a client ID on first call", () => {
    const id = getClientId();
    expect(id).toBeTruthy();
    expect(id.length).toBeGreaterThan(0);
  });

  it("returns the same ID on subsequent calls", () => {
    const id1 = getClientId();
    const id2 = getClientId();
    expect(id1).toBe(id2);
  });

  it("generates different IDs across sessions (after clearing storage)", () => {
    const id1 = getClientId();
    localStorage.clear();
    const id2 = getClientId();
    expect(id1).not.toBe(id2);
  });
});

describe("ai-access — requestRewardedAccess", () => {
  it("returns not granted when no provider configured", async () => {
    const result = await requestRewardedAccess();
    expect(result.granted).toBe(false);
    expect(result.reason).toContain("configured");
  });
});
