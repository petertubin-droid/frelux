import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

describe("useScrollReveal", () => {
  beforeEach(() => {
    // Clear matchMedia mock
    vi.restoreAllMocks();
  });

  it("returns a ref and isVisible boolean", () => {
    const { result } = renderHook(() => useScrollReveal());
    expect(result.current.ref).toBeDefined();
    expect(typeof result.current.isVisible).toBe("boolean");
  });

  it("defaults to not visible", () => {
    const { result } = renderHook(() => useScrollReveal());
    expect(result.current.isVisible).toBe(false);
  });

  it("respects reduced motion setting", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
    const { result } = renderHook(() => useScrollReveal());
    expect(result.current.ref).toBeDefined();
  });

  it("accepts custom threshold option", () => {
    const { result } = renderHook(() => useScrollReveal({ threshold: 0.5 }));
    expect(result.current.ref).toBeDefined();
  });

  it("accepts custom rootMargin option", () => {
    const { result } = renderHook(() => useScrollReveal({ rootMargin: 50 }));
    expect(result.current.ref).toBeDefined();
  });

  it("accepts once=false option", () => {
    const { result } = renderHook(() => useScrollReveal({ once: false }));
    expect(result.current.ref).toBeDefined();
  });
});
