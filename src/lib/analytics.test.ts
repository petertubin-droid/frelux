import { describe, it, expect } from "vitest";
import { track } from "@/lib/analytics";

describe("analytics, track", () => {
  it("does not throw when called with valid event", () => {
    expect(() => track("calculator_started")).not.toThrow();
  });

  it("accepts params object", () => {
    expect(() =>
      track("calculator_completed", { tool: "paint", duration: 120 }),
    ).not.toThrow();
  });

  it("does not throw with undefined params", () => {
    expect(() => track("whatsapp_clicked", undefined)).not.toThrow();
  });
});
