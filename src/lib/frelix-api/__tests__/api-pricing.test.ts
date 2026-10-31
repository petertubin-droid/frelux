import { describe, expect, it } from "vitest";
import {
  billingHeaders,
  decideBilling,
  exhaustedMessage,
  isBillableStatus,
  limitsFromPlanConfig,
} from "@/lib/frelix-api/api-pricing";

const developer = limitsFromPlanConfig({
  monthlyQuota: 20000,
  aiRequestsMonthly: 1500,
  gracePercent: 5,
  overagePerRequestUsd: 0.0012,
  overagePerAiRequestUsd: 0.006,
  effectivePerRequestUsd: 0.00095,
});

const freeTier = limitsFromPlanConfig({
  monthlyQuota: 1000,
  aiRequestsMonthly: 100,
  gracePercent: 5,
  overagePerRequestUsd: null,
  overagePerAiRequestUsd: null,
});

describe("plan limits", () => {
  it("reads the allowance and the grace band from configuration", () => {
    expect(developer.included).toBe(20000);
    expect(developer.gracePercent).toBe(5);
    expect(developer.overagePerRequestUsd).toBe(0.0012);
  });

  it("falls back to a 5 percent grace band when a plan omits it", () => {
    expect(limitsFromPlanConfig({ monthlyQuota: 100 }).gracePercent).toBe(5);
  });

  it("treats missing quotas as zero rather than unlimited", () => {
    expect(limitsFromPlanConfig({}).included).toBe(0);
    expect(limitsFromPlanConfig(null).included).toBe(0);
  });
});

describe("billing a single request", () => {
  it("charges nothing inside the allowance", () => {
    const decision = decideBilling({
      limits: developer,
      usedThisMonth: 19998,
      isAi: false,
      balanceUsd: 0,
    });
    expect(decision.state).toBe("included");
    expect(decision.chargeUsd).toBe(0);
    expect(decision.allowed).toBe(true);
  });

  it("lets a batch finish inside the grace band even with no balance", () => {
    // 20,000 included plus 1,000 grace means request 20,500 is still allowed.
    const decision = decideBilling({
      limits: developer,
      usedThisMonth: 20499,
      isAi: false,
      balanceUsd: 0,
    });
    expect(decision.state).toBe("grace");
    expect(decision.allowed).toBe(true);
    // 21,000 is the end of the band, so 500 requests remain after this one.
    expect(decision.graceRemaining).toBe(500);
  });

  it("bills overage from the balance once the grace band is spent", () => {
    const decision = decideBilling({
      limits: developer,
      usedThisMonth: 21000,
      isAi: false,
      balanceUsd: 10,
    });
    expect(decision.state).toBe("overage");
    expect(decision.chargeUsd).toBeCloseTo(0.0012, 6);
    expect(decision.allowed).toBe(true);
  });

  it("bills AI overage at the AI rate, not the request rate", () => {
    const decision = decideBilling({
      limits: developer,
      usedThisMonth: 21000,
      isAi: true,
      balanceUsd: 10,
    });
    expect(decision.chargeUsd).toBeCloseTo(0.006, 6);
  });

  it("refuses only when grace and balance are both gone", () => {
    const decision = decideBilling({
      limits: developer,
      usedThisMonth: 21000,
      isAi: false,
      balanceUsd: 0.0001,
    });
    expect(decision.state).toBe("exhausted");
    expect(decision.allowed).toBe(false);
    expect(decision.chargeUsd).toBe(0);
  });

  it("never lets an unpaid plan accrue a debt", () => {
    const inGrace = decideBilling({
      limits: freeTier,
      usedThisMonth: 1040,
      isAi: false,
      balanceUsd: 0,
    });
    expect(inGrace.state).toBe("grace");
    expect(inGrace.allowed).toBe(true);

    const beyond = decideBilling({
      limits: freeTier,
      usedThisMonth: 1050,
      isAi: false,
      balanceUsd: 500,
    });
    expect(beyond.state).toBe("exhausted");
    expect(beyond.allowed).toBe(false);
    // A balance does not buy past a plan with no overage rate.
    expect(beyond.chargeUsd).toBe(0);
  });
});

describe("what gets billed", () => {
  it("bills successful responses only", () => {
    expect(isBillableStatus(200)).toBe(true);
    expect(isBillableStatus(202)).toBe(true);
    expect(isBillableStatus(400)).toBe(false);
    expect(isBillableStatus(402)).toBe(false);
    expect(isBillableStatus(429)).toBe(false);
    expect(isBillableStatus(500)).toBe(false);
  });
});

describe("headers an integrator plans from", () => {
  it("publishes quota, grace, cost and balance on every call", () => {
    const decision = decideBilling({
      limits: developer,
      usedThisMonth: 21000,
      isAi: false,
      balanceUsd: 42.5,
    });
    const headers = billingHeaders({
      limits: developer,
      decision,
      usedThisMonth: decision.usedAfter,
      balanceUsd: 42.5,
      monthCostUsd: 1.23456,
    });
    expect(headers["X-Frelux-Quota-Included"]).toBe("20000");
    expect(headers["X-Frelux-Quota-Remaining"]).toBe("0");
    expect(headers["X-Frelux-Billing-State"]).toBe("overage");
    expect(headers["X-Frelux-Request-Cost-Usd"]).toBe("0.0012");
    expect(headers["X-Frelux-Month-Cost-Usd"]).toBe("1.2346");
    expect(headers["X-Frelux-Balance-Usd"]).toBe("42.5000");
  });

  it("explains a refusal with numbers instead of a bare 402", () => {
    const message = exhaustedMessage(developer);
    expect(message).toContain("20000");
    expect(message).toContain("grace band");
    expect(message).toContain("never billed");
  });
});
