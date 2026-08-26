import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  reportError,
  captureError,
  captureSupabaseError,
  captureApiError,
  captureCalculatorError,
  captureAiError,
  capturePaymentError,
  captureMarketplaceError,
  captureAuthError,
  withErrorCapture,
} from "@/lib/errorMonitor";

// Mock console.error to avoid noise
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("errorMonitor — reportError", () => {
  it("does not throw on valid report", () => {
    expect(() =>
      reportError({
        error_type: "runtime",
        message: "Test error message",
      }),
    ).not.toThrow();
  });

  it("accepts severity override", () => {
    expect(() =>
      reportError({
        error_type: "runtime",
        message: "Test error",
        severity: "critical",
      }),
    ).not.toThrow();
  });
});

describe("errorMonitor — captureError", () => {
  it("captures Error instance", () => {
    expect(() => captureError(new Error("Something broke"))).not.toThrow();
  });

  it("captures string error", () => {
    expect(() => captureError("String error message")).not.toThrow();
  });

  it("captures null/undefined without throwing", () => {
    expect(() => captureError(null)).not.toThrow();
    expect(() => captureError(undefined)).not.toThrow();
  });

  it("accepts options", () => {
    expect(() =>
      captureError(new Error("API fail"), {
        error_type: "api_request",
        feature: "estimation",
        http_status: 500,
      }),
    ).not.toThrow();
  });
});

describe("errorMonitor — captureSupabaseError", () => {
  it("captures supabase error with message", () => {
    expect(() =>
      captureSupabaseError(
        { message: "Row not found", code: "PGRST116" },
        { table: "estimation_results" },
      ),
    ).not.toThrow();
  });

  it("captures supabase error with null code", () => {
    expect(() =>
      captureSupabaseError({ message: "Connection failed" }),
    ).not.toThrow();
  });
});

describe("errorMonitor — captureApiError", () => {
  it("captures API error with status code", () => {
    expect(() =>
      captureApiError(new Error("Not found"), { feature: "marketplace" }),
    ).not.toThrow();
  });

  it("captures without context", () => {
    expect(() => captureApiError(new Error("Server error"))).not.toThrow();
  });
});

describe("errorMonitor — captureCalculatorError", () => {
  it("captures calculator error", () => {
    expect(() =>
      captureCalculatorError("paint-calculator", new Error("Division by zero")),
    ).not.toThrow();
  });
});

describe("errorMonitor — captureAiError", () => {
  it("captures AI error", () => {
    expect(() =>
      captureAiError(new Error("Model timeout"), {
        feature: "color-assistant",
      }),
    ).not.toThrow();
  });
});

describe("errorMonitor — capturePaymentError", () => {
  it("captures payment error", () => {
    expect(() =>
      capturePaymentError(new Error("Charge failed"), { provider: "paystack" }),
    ).not.toThrow();
  });
});

describe("errorMonitor — captureMarketplaceError", () => {
  it("captures marketplace error", () => {
    expect(() =>
      captureMarketplaceError(new Error("Cart empty"), {
        operation: "checkout",
      }),
    ).not.toThrow();
  });
});

describe("errorMonitor — captureAuthError", () => {
  it("captures auth error", () => {
    expect(() =>
      captureAuthError(new Error("Invalid credentials"), {
        operation: "login",
      }),
    ).not.toThrow();
  });
});

describe("errorMonitor — withErrorCapture", () => {
  it("returns result on success", () => {
    const fn = (a: number, b: number) => a + b;
    const wrapped = withErrorCapture(fn, { feature: "test" });
    expect(wrapped(2, 3)).toBe(5);
  });

  it("returns fallback on sync error", () => {
    const fn = () => {
      throw new Error("Boom");
    };
    const wrapped = withErrorCapture(fn, { feature: "test" }, "fallback");
    expect(wrapped()).toBe("fallback");
  });

  it("returns undefined fallback when none provided", () => {
    const fn = () => {
      throw new Error("Boom");
    };
    const wrapped = withErrorCapture(fn, { feature: "test" });
    expect(wrapped()).toBeUndefined();
  });

  it("handles async functions", async () => {
    const fn = async () => {
      throw new Error("Async boom");
    };
    const wrapped = withErrorCapture(fn, { feature: "test" }, "async-fallback");
    await expect(wrapped()).resolves.toBe("async-fallback");
  });
});
