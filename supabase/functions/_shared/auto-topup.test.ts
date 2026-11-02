import { describe, expect, it } from "vitest";
import {
  AUTOTOPUP_MAX_USD,
  AUTOTOPUP_MIN_USD,
  isProviderSuccess,
  shouldCharge,
  validateAutoTopupPrefs,
  type ChargeDecisionInput,
} from "./auto-topup.ts";

const NOW = new Date("2026-10-31T12:00:00Z");

function input(over: Partial<ChargeDecisionInput> = {}): ChargeDecisionInput {
  return {
    enabled: true,
    consentAt: "2026-10-01T00:00:00Z",
    cardId: "card-1",
    balanceUsd: 1,
    thresholdUsd: 5,
    consecutiveFailures: 0,
    lastAttemptAt: null,
    pendingAttempt: false,
    now: NOW,
    ...over,
  };
}

describe("auto top-up preferences", () => {
  it("accepts a sane threshold and amount", () => {
    expect(validateAutoTopupPrefs({ thresholdUsd: 5, amountUsd: 20 })).toEqual({
      ok: true,
      thresholdUsd: 5,
      amountUsd: 20,
    });
  });

  it("refuses a threshold that one charge would immediately retrigger", () => {
    const r = validateAutoTopupPrefs({ thresholdUsd: 20, amountUsd: 20 });
    expect(r.ok).toBe(false);
  });

  it("refuses amounts outside the automatic range", () => {
    expect(
      validateAutoTopupPrefs({
        thresholdUsd: 1,
        amountUsd: AUTOTOPUP_MIN_USD - 1,
      }).ok,
    ).toBe(false);
    expect(
      validateAutoTopupPrefs({
        thresholdUsd: 5,
        amountUsd: AUTOTOPUP_MAX_USD + 1,
      }).ok,
    ).toBe(false);
  });

  it("refuses sub-cent amounts rather than rounding a charge", () => {
    expect(
      validateAutoTopupPrefs({ thresholdUsd: 5, amountUsd: 20.005 }).ok,
    ).toBe(false);
  });
});

describe("charge decision", () => {
  it("charges only when balance is strictly below the threshold", () => {
    expect(shouldCharge(input({ balanceUsd: 4.99 }))).toEqual({ charge: true });
    expect(shouldCharge(input({ balanceUsd: 5 }))).toEqual({
      charge: false,
      reason: "balance is above the threshold",
    });
  });

  it("refuses without recorded consent", () => {
    expect(shouldCharge(input({ consentAt: null }))).toEqual({
      charge: false,
      reason: "no consent recorded for automatic charges",
    });
  });

  it("refuses without a saved card", () => {
    expect(shouldCharge(input({ cardId: null }))).toEqual({
      charge: false,
      reason: "no saved card",
    });
  });

  it("stops after repeated declines", () => {
    expect(shouldCharge(input({ consecutiveFailures: 2 }))).toEqual({
      charge: false,
      reason: "switched off after repeated declines",
    });
  });

  it("never runs two charges at once for one wallet", () => {
    expect(shouldCharge(input({ pendingAttempt: true }))).toEqual({
      charge: false,
      reason: "a charge is already in progress",
    });
  });

  it("respects the cooldown, so a failing sweep cannot hammer a card", () => {
    expect(
      shouldCharge(input({ lastAttemptAt: "2026-10-31T11:55:00Z" })),
    ).toMatchObject({ charge: false });
    expect(
      shouldCharge(input({ lastAttemptAt: "2026-10-31T11:40:00Z" })),
    ).toEqual({ charge: true });
  });

  it("treats an unparseable last attempt as eligible rather than blocked forever", () => {
    expect(shouldCharge(input({ lastAttemptAt: "not a date" }))).toEqual({
      charge: true,
    });
  });
});

describe("provider status", () => {
  it("counts only explicit success as money received", () => {
    expect(isProviderSuccess("successful")).toBe(true);
    expect(isProviderSuccess("SUCCESSFUL ")).toBe(true);
    for (const status of ["pending", "processing", "failed", "", null, 1])
      expect(isProviderSuccess(status)).toBe(false);
  });
});
