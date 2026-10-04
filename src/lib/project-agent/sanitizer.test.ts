import { describe, it, expect } from "vitest";
import { sanitizeAuditValue } from "@/lib/project-agent/sanitizer";

describe("sanitizeAuditValue", () => {
  it("redacts secret-looking keys at the top level", () => {
    const out = sanitizeAuditValue({
      password: "hunter2",
      name: "room",
    }) as Record<string, unknown>;
    expect(out.password).toBe("[REDACTED]");
    expect(out.name).toBe("room");
  });
  it("redacts recursively in nested objects and arrays", () => {
    const out = sanitizeAuditValue({
      api_key: "k",
      nested: { token: "t", ok: "z" },
      arr: [{ session_id: "s", keep: 1 }],
    }) as Record<string, any>;
    expect(out.api_key).toBe("[REDACTED]");
    expect(out.nested.token).toBe("[REDACTED]");
    expect(out.nested.ok).toBe("z");
    expect(out.arr[0].session_id).toBe("[REDACTED]");
    expect(out.arr[0].keep).toBe(1);
  });
  it("leaves primitives untouched", () => {
    expect(sanitizeAuditValue(5)).toBe(5);
    expect(sanitizeAuditValue("plain")).toBe("plain");
    expect(sanitizeAuditValue(null)).toBe(null);
  });
  it("is deterministic and pure (input not mutated)", () => {
    const input = { secret: "x" };
    sanitizeAuditValue(input);
    expect(input.secret).toBe("x");
    expect((sanitizeAuditValue({ secret: "x" }) as any).secret).toBe(
      "[REDACTED]",
    );
  });
});
