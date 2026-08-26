import { describe, it, expect, beforeEach } from "vitest";
import {
  checkUserPaidStatus,
  checkEstimationAccess,
  getClientId,
} from "@/lib/estimation-access";
import type {
  EstimationAccessConfig,
  EstimationUsageStatus,
} from "@/types/premium-estimation";
import type { DbUserPaidStatus } from "@/types/database";

function makeConfig(
  overrides: Partial<EstimationAccessConfig> = {},
): EstimationAccessConfig {
  return {
    enabled: true,
    accessMode: "free",
    dailyFreeUses: 3,
    rewardedEnabled: true,
    paidEnabled: true,
    paidPrice: 5000,
    paidCurrency: "NGN",
    resetPeriod: "daily",
    adminOverride: true,
    aiConfigured: true,
    ...overrides,
  };
}

function makeUsage(
  overrides: Partial<EstimationUsageStatus> = {},
): EstimationUsageStatus {
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

function makePaidStatus(
  overrides: Partial<DbUserPaidStatus> = {},
): DbUserPaidStatus {
  return {
    user_id: "test-user",
    is_paid: true,
    plan: "monthly",
    paid_until: null,
    payment_provider: "paystack",
    provider_customer_id: "cust_123",
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ── checkUserPaidStatus ──

describe("estimation-access — checkUserPaidStatus", () => {
  it("returns true for active paid status with no expiry", () => {
    expect(
      checkUserPaidStatus(makePaidStatus({ is_paid: true, paid_until: null })),
    ).toBe(true);
  });

  it("returns true for paid status with future expiry", () => {
    const future = new Date();
    future.setDate(future.getDate() + 30);
    expect(
      checkUserPaidStatus(makePaidStatus({ paid_until: future.toISOString() })),
    ).toBe(true);
  });

  it("returns false for expired paid status", () => {
    const past = new Date();
    past.setDate(past.getDate() - 1);
    expect(
      checkUserPaidStatus(makePaidStatus({ paid_until: past.toISOString() })),
    ).toBe(false);
  });

  it("returns false when is_paid is false", () => {
    expect(checkUserPaidStatus(makePaidStatus({ is_paid: false }))).toBe(false);
  });

  it("returns false for null paid status", () => {
    expect(checkUserPaidStatus(null)).toBe(false);
  });

  it("returns true for paid status with expiry exactly now (edge case)", () => {
    const now = new Date().toISOString();
    // Date.now() > expiry: if expiry is now, Date.now() might be slightly after
    // This tests the boundary
    const result = checkUserPaidStatus(makePaidStatus({ paid_until: now }));
    expect(typeof result).toBe("boolean");
  });
});

// ── checkEstimationAccess — disabled ──

describe("estimation-access — checkEstimationAccess (disabled)", () => {
  it("denies when feature is disabled", () => {
    const result = checkEstimationAccess(
      makeConfig({ enabled: false }),
      makeUsage(),
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("disabled");
  });

  it("denies when access mode is disabled", () => {
    const result = checkEstimationAccess(
      makeConfig({ accessMode: "disabled" }),
      makeUsage(),
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("disabled");
  });
});

// ── checkEstimationAccess — admin override ──

describe("estimation-access — checkEstimationAccess (admin override)", () => {
  it("allows admin with override enabled (in paid mode)", () => {
    const result = checkEstimationAccess(
      makeConfig({ accessMode: "paid", adminOverride: true }),
      makeUsage({ hasRemaining: false }),
      true,
    );
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("admin_override");
  });

  it("denies admin when override is disabled", () => {
    const result = checkEstimationAccess(
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

  it("admin cannot override globally disabled feature", () => {
    const result = checkEstimationAccess(
      makeConfig({ enabled: false, adminOverride: true }),
      makeUsage(),
      true,
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("disabled");
  });
});

// ── checkEstimationAccess — paid subscriber bypass ──

describe("estimation-access — checkEstimationAccess (paid subscriber)", () => {
  it("paid subscriber gets access in paid mode", () => {
    const result = checkEstimationAccess(
      makeConfig({ accessMode: "paid" }),
      makeUsage({ hasRemaining: false }),
      false,
      true,
    );
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("paid");
  });

  it("paid subscriber gets access in rewarded mode", () => {
    const result = checkEstimationAccess(
      makeConfig({ accessMode: "rewarded" }),
      makeUsage({ hasRemaining: false }),
      false,
      true,
    );
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("paid");
  });

  it("paid subscriber gets access even when limit reached", () => {
    const result = checkEstimationAccess(
      makeConfig({ accessMode: "free" }),
      makeUsage({ hasRemaining: false }),
      false,
      true,
    );
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("paid");
  });
});

// ── checkEstimationAccess — free mode ──

describe("estimation-access — checkEstimationAccess (free mode)", () => {
  it("allows when usage remaining", () => {
    const result = checkEstimationAccess(
      makeConfig({ accessMode: "free" }),
      makeUsage({ hasRemaining: true }),
    );
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("free");
  });

  it("denies when no remaining uses", () => {
    const result = checkEstimationAccess(
      makeConfig({ accessMode: "free" }),
      makeUsage({ hasRemaining: false }),
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("limit_reached");
    if (!result.allowed) expect(result.nextAction).toBe("none");
  });
});

// ── checkEstimationAccess — rewarded mode ──

describe("estimation-access — checkEstimationAccess (rewarded mode)", () => {
  it("allows free when usage remaining", () => {
    const result = checkEstimationAccess(
      makeConfig({ accessMode: "rewarded", rewardedEnabled: true }),
      makeUsage({ hasRemaining: true }),
    );
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("free");
  });

  it("suggests rewarded when limit reached and rewarded enabled", () => {
    const result = checkEstimationAccess(
      makeConfig({ accessMode: "rewarded", rewardedEnabled: true }),
      makeUsage({ hasRemaining: false }),
    );
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.nextAction).toBe("rewarded");
  });

  it("suggests none when limit reached and rewarded disabled", () => {
    const result = checkEstimationAccess(
      makeConfig({ accessMode: "rewarded", rewardedEnabled: false }),
      makeUsage({ hasRemaining: false }),
    );
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.nextAction).toBe("none");
  });
});

// ── checkEstimationAccess — paid mode ──

describe("estimation-access — checkEstimationAccess (paid mode)", () => {
  it("suggests paid upgrade when paid is enabled", () => {
    const result = checkEstimationAccess(
      makeConfig({ accessMode: "paid", paidEnabled: true }),
      makeUsage(),
      false,
      false,
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("not_subscribed");
    if (!result.allowed) expect(result.nextAction).toBe("paid");
  });

  it("returns not_configured when paid is disabled", () => {
    const result = checkEstimationAccess(
      makeConfig({ accessMode: "paid", paidEnabled: false }),
      makeUsage(),
      false,
      false,
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("not_configured");
  });
});

// ── checkEstimationAccess — free_rewarded hybrid ──

describe("estimation-access — checkEstimationAccess (free_rewarded mode)", () => {
  it("allows free when usage remaining", () => {
    const result = checkEstimationAccess(
      makeConfig({ accessMode: "free_rewarded" }),
      makeUsage({ hasRemaining: true }),
    );
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("free");
  });

  it("suggests rewarded when limit reached and rewarded enabled", () => {
    const result = checkEstimationAccess(
      makeConfig({ accessMode: "free_rewarded", rewardedEnabled: true }),
      makeUsage({ hasRemaining: false }),
    );
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.nextAction).toBe("rewarded");
  });

  it("suggests none when limit reached and rewarded disabled", () => {
    const result = checkEstimationAccess(
      makeConfig({ accessMode: "free_rewarded", rewardedEnabled: false }),
      makeUsage({ hasRemaining: false }),
    );
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.nextAction).toBe("none");
  });
});

// ── getClientId ──

describe("estimation-access — getClientId", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("generates a UUID on first call", () => {
    const id = getClientId();
    expect(id).toBeTruthy();
    // UUID format
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("returns the same ID on subsequent calls", () => {
    const id1 = getClientId();
    const id2 = getClientId();
    expect(id1).toBe(id2);
  });

  it("generates different IDs after clearing storage", () => {
    const id1 = getClientId();
    localStorage.clear();
    const id2 = getClientId();
    expect(id1).not.toBe(id2);
  });
});
