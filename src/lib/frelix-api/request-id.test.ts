import { describe, expect, it } from "vitest";
import {
  REQUEST_ID_PATTERN,
  resolveRequestId,
} from "../../../supabase/functions/_shared/request-id";

const fake = () => "server-generated-id";

describe("request identity", () => {
  it("honours a well formed client request id so a retry can be recognised", () => {
    expect(resolveRequestId("8f3a1c2e-9b4d-4a71-9d1e-2b6c5f8a0d31", fake)).toBe(
      "8f3a1c2e-9b4d-4a71-9d1e-2b6c5f8a0d31",
    );
  });

  it("accepts a short opaque token a client already uses", () => {
    expect(resolveRequestId("retry-0001", fake)).toBe("retry-0001");
  });

  it("trims surrounding whitespace from a pasted header", () => {
    expect(resolveRequestId("  retry-0001  ", fake)).toBe("retry-0001");
  });

  it("generates an id when the header is absent", () => {
    expect(resolveRequestId(null, fake)).toBe("server-generated-id");
    expect(resolveRequestId(undefined, fake)).toBe("server-generated-id");
  });

  it("generates an id when the header is blank", () => {
    expect(resolveRequestId("   ", fake)).toBe("server-generated-id");
  });

  it("refuses client text that is too short to be unique", () => {
    expect(resolveRequestId("abc", fake)).toBe("server-generated-id");
  });

  it("refuses client text that is too long for the column", () => {
    expect(resolveRequestId("a".repeat(65), fake)).toBe("server-generated-id");
    expect(resolveRequestId("a".repeat(64), fake)).toBe("a".repeat(64));
  });

  it("refuses separators and control characters rather than storing them", () => {
    for (const value of [
      "retry/0001",
      "retry 0001",
      "retry\n0001",
      "retry\t0001",
      "retry0001;",
      "retr@y0001",
    ]) {
      expect(resolveRequestId(value, fake)).toBe("server-generated-id");
    }
  });

  it("allows every character class the pattern advertises", () => {
    expect(REQUEST_ID_PATTERN.test("Ab_9-Zz09")).toBe(true);
  });

  it("defaults to a real uuid when no generator is supplied", () => {
    const value = resolveRequestId(null);
    expect(value).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("never echoes an over long header back into the response", () => {
    expect(resolveRequestId("x".repeat(500), fake)).not.toContain("x");
  });
});
