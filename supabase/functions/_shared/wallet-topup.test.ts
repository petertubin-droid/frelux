import { describe, expect, it } from "vitest";
import {
  TOPUP_MAX_USD,
  TOPUP_MIN_USD,
  buildTopupTxRef,
  decideCredit,
  isWalletTopupRef,
  validateTopupAmount,
} from "./wallet-topup.ts";

const rejected = (v: unknown) => {
  const r = validateTopupAmount(v);
  expect(r.ok).toBe(false);
  return (r as { error: string }).error;
};

describe("top-up amounts", () => {
  it("accepts an amount inside the range", () => {
    expect(validateTopupAmount(25)).toEqual({ ok: true, amountUsd: 25 });
    expect(validateTopupAmount("20.50")).toEqual({ ok: true, amountUsd: 20.5 });
  });

  it("accepts the exact boundaries", () => {
    expect(validateTopupAmount(TOPUP_MIN_USD).ok).toBe(true);
    expect(validateTopupAmount(TOPUP_MAX_USD).ok).toBe(true);
  });

  it("refuses amounts outside the range", () => {
    expect(rejected(4.99)).toMatch(/Minimum top-up is \$5/);
    expect(rejected(TOPUP_MAX_USD + 1)).toMatch(/Maximum top-up/);
    expect(rejected(0)).toMatch(/positive/);
    expect(rejected(-20)).toMatch(/positive/);
  });

  it("refuses values that are not numbers instead of coercing them", () => {
    // "20abc" must not become 20: the caller would be charged a figure
    // different from the one they typed.
    expect(rejected("20abc")).toMatch(/must be a number/);
    expect(rejected("")).toMatch(/required/);
    expect(rejected(null)).toMatch(/required/);
    expect(rejected(Number.NaN)).toMatch(/must be a number/);
    expect(rejected(Number.POSITIVE_INFINITY)).toMatch(/must be a number/);
    expect(rejected({ amount: 20 })).toMatch(/must be a number/);
  });

  it("refuses sub-cent precision rather than truncating the charge", () => {
    expect(rejected(20.001)).toMatch(/at most 2 decimals/);
    expect(rejected(10.005)).toMatch(/at most 2 decimals/);
  });
});

describe("top-up references", () => {
  it("round-trips through the prefix the webhook routes on", () => {
    const ref = buildTopupTxRef(
      "8f14e45f-ceea-467a-9d1b-000000000000",
      1_700_000_000_000,
    );
    expect(ref).toBe("FLW_WALLETTOPUP_8f14e45f_1700000000000");
    expect(isWalletTopupRef(ref)).toBe(true);
  });

  it("does not claim other charges", () => {
    expect(isWalletTopupRef("FLW_pro_monthly_abc_123")).toBe(false);
    expect(isWalletTopupRef(null)).toBe(false);
    expect(isWalletTopupRef("flw_wallettopup_x")).toBe(false);
  });
});

describe("crediting a settled charge", () => {
  const quote = { expectedUsd: 25, expectedCurrency: "USD" };

  it("credits a charge that matches the quote", () => {
    expect(
      decideCredit({ ...quote, paidAmount: 25, paidCurrency: "USD" }),
    ).toEqual({ credit: true, amountUsd: 25 });
  });

  it("treats a half-cent difference as settlement rounding", () => {
    expect(
      decideCredit({ ...quote, paidAmount: 25.004, paidCurrency: "USD" }),
    ).toEqual({ credit: true, amountUsd: 25 });
  });

  it("refuses a charge that collected a different amount", () => {
    const r = decideCredit({ ...quote, paidAmount: 2500, paidCurrency: "USD" });
    expect(r.credit).toBe(false);
    expect((r as { reason: string }).reason).toMatch(/Paid 2500 USD/);
  });

  it("refuses a charge settled in another currency instead of converting it", () => {
    const r = decideCredit({ ...quote, paidAmount: 25, paidCurrency: "NGN" });
    expect(r.credit).toBe(false);
    expect((r as { reason: string }).reason).toMatch(/Settled in NGN/);
  });

  it("refuses when either side of the comparison is missing", () => {
    expect(
      decideCredit({ ...quote, paidAmount: null, paidCurrency: "USD" }).credit,
    ).toBe(false);
    expect(
      decideCredit({
        expectedUsd: undefined,
        paidAmount: 25,
        paidCurrency: "USD",
      }).credit,
    ).toBe(false);
  });
});
