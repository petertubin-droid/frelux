import { describe, expect, it } from "vitest";
import {
  FREE_DEVICE_ESTIMATE_LIMIT,
  classifySavedEstimateError,
  savedEstimateAllowanceStatus,
} from "@/lib/estimates/free-allowance";

describe("free saved-estimate allowance", () => {
  it("states the allowance before anything is saved", () => {
    const status = savedEstimateAllowanceStatus(0);
    expect(status.limit).toBe(FREE_DEVICE_ESTIMATE_LIMIT);
    expect(status.remaining).toBe(FREE_DEVICE_ESTIMATE_LIMIT);
    expect(status.exhausted).toBe(false);
    expect(status.message).toContain("of 2 saved estimates left");
  });

  it("counts down and then says the allowance is spent", () => {
    expect(savedEstimateAllowanceStatus(1).remaining).toBe(1);
    const spent = savedEstimateAllowanceStatus(2);
    expect(spent.remaining).toBe(0);
    expect(spent.exhausted).toBe(true);
    expect(spent.message).toMatch(/Delete one, or sign in/);
  });

  it("never reports a negative remainder when rows were already over the cap", () => {
    const status = savedEstimateAllowanceStatus(5);
    expect(status.remaining).toBe(0);
    expect(status.exhausted).toBe(true);
  });

  it("honours an allowance the admin changed", () => {
    const status = savedEstimateAllowanceStatus(2, 4);
    expect(status.remaining).toBe(2);
    expect(status.message).toContain("of 4 saved estimates");
  });

  it("treats nonsense counts as zero rather than NaN", () => {
    expect(savedEstimateAllowanceStatus(Number.NaN).used).toBe(0);
    expect(savedEstimateAllowanceStatus(-3).used).toBe(0);
    expect(savedEstimateAllowanceStatus(0, Number.NaN).limit).toBe(
      FREE_DEVICE_ESTIMATE_LIMIT,
    );
  });

  it("recognises the database's allowance refusal", () => {
    const result = classifySavedEstimateError(
      "Saved estimate allowance reached (2 saved estimates on this device). Delete one, or sign in to keep more.",
    );
    expect(result.limited).toBe(true);
    expect(result.message).toBe(
      "You can keep 2 saved estimates on this device.",
    );
    expect(result.nextStep).toMatch(/sign in/);
  });

  it("does not mistake a network failure for a spent allowance", () => {
    for (const error of [
      "Failed to fetch",
      "new row violates row-level security policy",
      "duplicate key value violates unique constraint",
      "",
      null,
      undefined,
    ]) {
      const result = classifySavedEstimateError(error);
      expect(result.limited).toBe(false);
      expect(result.nextStep).toBe("");
    }
  });

  it("only matches the allowance message at the start of the error", () => {
    expect(
      classifySavedEstimateError("Error: Saved estimate allowance reached")
        .limited,
    ).toBe(false);
  });
});
