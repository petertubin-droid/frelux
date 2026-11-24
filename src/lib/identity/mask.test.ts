import { describe, expect, it } from "vitest";
import { isFullyMasked, maskIdentityNumber } from "./mask";

describe("maskIdentityNumber", () => {
  it("keeps only the last four digits of an 11-digit NIN", () => {
    expect(maskIdentityNumber("12345678901")).toBe("•••••••8901");
  });

  it("masks a value that is not longer than the visible tail in full", () => {
    // A four-character ID shown as its last four characters would be shown
    // entirely, which is the opposite of masking.
    expect(maskIdentityNumber("AB12")).toBe("••••");
    expect(isFullyMasked("AB12")).toBe(true);
  });

  it("leaves an empty value empty rather than inventing dots", () => {
    expect(maskIdentityNumber("")).toBe("");
    expect(maskIdentityNumber(null)).toBe("");
    expect(maskIdentityNumber(undefined)).toBe("");
    expect(isFullyMasked("")).toBe(false);
  });

  it("keeps the visible length equal to the stored length", () => {
    // The badge is a hint that a value exists, not a substitute for it, so the
    // masked string must not silently change the length an operator sees.
    for (const value of ["12345678901", "X1234567", "123456789"]) {
      expect(maskIdentityNumber(value)).toHaveLength(value.length);
    }
  });
});
