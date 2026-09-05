import { describe, it, expect } from "vitest";
import { getSafeError } from "./safeError";

describe("getSafeError", () => {
  it("returns fallback for non-Error values", () => {
    expect(getSafeError(null)).toBe("Something went wrong. Please try again.");
    expect(getSafeError("string")).toBe(
      "Something went wrong. Please try again.",
    );
    expect(getSafeError(undefined, "Custom fallback")).toBe("Custom fallback");
  });

  it("passes through short user-friendly messages", () => {
    expect(
      getSafeError(new Error("Message should be at least 10 characters")),
    ).toBe("Message should be at least 10 characters");
  });

  it("returns fallback for long messages with stack traces", () => {
    const longMsg = "x".repeat(200);
    expect(getSafeError(new Error(longMsg), "Failed")).toBe("Failed");
  });

  it("returns fallback for 'relation does not exist' errors", () => {
    expect(
      getSafeError(new Error('relation "public.foo" does not exist')),
    ).toBe("Something went wrong. Please try again.");
  });

  it("returns permission message for permission denied", () => {
    expect(getSafeError(new Error("permission denied for table users"))).toBe(
      "You don't have permission to do that.",
    );
  });

  it("returns session expired for JWT errors", () => {
    expect(getSafeError(new Error("JWT expired"))).toBe(
      "Your session has expired. Please sign in again.",
    );
  });

  it("returns rate limit message", () => {
    expect(getSafeError(new Error("rate limit exceeded"))).toBe(
      "Too many requests. Please wait a moment and try again.",
    );
  });

  it("returns network error message", () => {
    expect(getSafeError(new Error("network request failed"))).toBe(
      "Network error. Check your connection and try again.",
    );
  });

  it("returns timeout message", () => {
    expect(getSafeError(new Error("timeout of 30000ms exceeded"))).toBe(
      "The request timed out. Please try again.",
    );
  });

  it("returns fallback for multi-line stack trace messages", () => {
    const stackMsg =
      "TypeError: x is undefined\n    at Object.run (file.ts:1:2)\n    at main (index.ts:5:3)";
    expect(getSafeError(new Error(stackMsg))).toBe(
      "Something went wrong. Please try again.",
    );
  });

  it("extracts .message from plain error-shaped objects (e.g. Supabase PostgrestError), not '[object Object]'", () => {
    // Supabase's PostgrestError is a plain object, not `instanceof Error`.
    // Without special handling, String(err) on it produces "[object Object]".
    const postgrestError = {
      message: "permission denied for table foo",
      code: "42501",
      details: null,
      hint: null,
    };
    expect(getSafeError(postgrestError)).toBe(
      "You don't have permission to do that.",
    );

    const genericPlainError = { message: "Something specific went wrong" };
    expect(getSafeError(genericPlainError)).toBe(
      "Something specific went wrong",
    );
  });
});
