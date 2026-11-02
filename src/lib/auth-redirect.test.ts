import { describe, expect, it } from "vitest";
import { getSafeAuthRedirect } from "@/lib/auth-redirect";

describe("getSafeAuthRedirect", () => {
  it("keeps local application paths and query/hash", () => {
    expect(getSafeAuthRedirect("/pro-connect/register?step=2#form")).toBe(
      "/pro-connect/register?step=2#form",
    );
  });

  it.each([
    "https://attacker.example/path",
    "//attacker.example/path",
    "/\\attacker.example",
    "javascript:alert(1)",
    "",
    null,
  ])("falls back for unsafe redirect %s", (value) => {
    expect(getSafeAuthRedirect(value)).toBe("/dashboard");
  });
});
