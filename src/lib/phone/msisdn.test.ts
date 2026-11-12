import { describe, expect, it } from "vitest";
import { toE164 } from "./msisdn";

describe("toE164", () => {
  it("replaces a Nigerian trunk zero with 234", () => {
    expect(toE164("0816 123 4567", "NG")).toBe("2348161234567");
    expect(toE164("0916-123-4567", "NG")).toBe("2349161234567");
  });

  it("keeps an already international number", () => {
    expect(toE164("+234 816 123 4567", "NG")).toBe("2348161234567");
  });

  it("handles the 00 international prefix", () => {
    expect(toE164("0044 7700 900123", "GB")).toBe("447700900123");
  });

  it("adds the dial code when the trunk zero is missing", () => {
    expect(toE164("8161234567", "NG")).toBe("2348161234567");
  });

  it("refuses a local number with no country to place it in", () => {
    expect(toE164("08161234567", null)).toBeNull();
    expect(toE164("08161234567", "ZZ")).toBeNull();
  });

  it("refuses input that cannot be a phone number", () => {
    expect(toE164("", "NG")).toBeNull();
    expect(toE164(null, "NG")).toBeNull();
    expect(toE164("12345", "NG")).toBeNull();
  });

  it("works for the other markets on the platform", () => {
    expect(toE164("07700900123", "GB")).toBe("447700900123");
    expect(toE164("0412 345 678", "AU")).toBe("61412345678");
    expect(toE164("0712 345 678", "KE")).toBe("254712345678");
  });
});
