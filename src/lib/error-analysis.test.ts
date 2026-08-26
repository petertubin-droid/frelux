import { describe, it, expect } from "vitest";
import { buildErrorContext } from "@/lib/error-analysis";

const mockError = {
  id: "err-123",
  message: "Test error",
  error_type: "runtime",
  severity: "high",
  stack_trace: "Error: Test\\n  at foo (bar.ts:1)",
  route: "/paint-calculator",
  feature: "estimation",
  calculator: "paint",
  http_status: null,
  service: null,
  browser: "Chrome",
  operating_system: "Windows",
  device_type: "desktop",
  app_version: "1.0.0",
  occurrence_count: 3,
  first_seen: "2026-08-01T00:00:00Z",
  last_seen: "2026-08-26T00:00:00Z",
  metadata: { extra: "info" },
};

describe("error-analysis — buildErrorContext", () => {
  it("returns object with errorId", () => {
    const ctx = buildErrorContext(mockError);
    expect(ctx.errorId).toBe("err-123");
  });

  it("returns object with errorData", () => {
    const ctx = buildErrorContext(mockError);
    expect(ctx.errorData).toBeDefined();
    expect(ctx.errorData.message).toBe("Test error");
    expect(ctx.errorData.error_type).toBe("runtime");
    expect(ctx.errorData.severity).toBe("high");
  });

  it("preserves stack trace", () => {
    const ctx = buildErrorContext(mockError);
    expect(ctx.errorData.stack_trace).toBe(mockError.stack_trace);
  });

  it("preserves route and feature", () => {
    const ctx = buildErrorContext(mockError);
    expect(ctx.errorData.route).toBe("/paint-calculator");
    expect(ctx.errorData.feature).toBe("estimation");
  });

  it("preserves browser and OS info", () => {
    const ctx = buildErrorContext(mockError);
    expect(ctx.errorData.browser).toBe("Chrome");
    expect(ctx.errorData.operating_system).toBe("Windows");
  });

  it("preserves occurrence count and timestamps", () => {
    const ctx = buildErrorContext(mockError);
    expect(ctx.errorData.occurrence_count).toBe(3);
    expect(ctx.errorData.first_seen).toBe("2026-08-01T00:00:00Z");
    expect(ctx.errorData.last_seen).toBe("2026-08-26T00:00:00Z");
  });

  it("handles null metadata", () => {
    const ctx = buildErrorContext({ ...mockError, metadata: {} });
    expect(ctx.errorData.metadata).toBeDefined();
  });

  it("handles null optional fields", () => {
    const ctx = buildErrorContext({
      ...mockError,
      http_status: null,
      service: null,
      calculator: null,
      feature: null,
      route: null,
      stack_trace: null,
    });
    expect(ctx.errorData.http_status).toBeNull();
    expect(ctx.errorData.service).toBeNull();
    expect(ctx.errorData.calculator).toBeNull();
    expect(ctx.errorData.feature).toBeNull();
    expect(ctx.errorData.route).toBeNull();
    expect(ctx.errorData.stack_trace).toBeNull();
  });
});
