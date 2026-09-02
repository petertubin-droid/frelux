import { describe, it, expect, beforeEach } from "vitest";
import { render, renderHook, act } from "@testing-library/react";
import { AccessibilityProvider, useAccessibility } from "@/lib/accessibility";

function wrapper({ children }: { children: React.ReactNode }) {
  return <AccessibilityProvider>{children}</AccessibilityProvider>;
}

describe("AccessibilityProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove(
      "accessibility-mode",
      "large-text",
      "reduced-motion",
    );
  });

  it("defaults all settings to false", () => {
    const { result } = renderHook(() => useAccessibility(), { wrapper });
    expect(result.current.highContrast).toBe(false);
    expect(result.current.largeText).toBe(false);
    expect(result.current.reducedMotion).toBe(false);
  });

  it("reads stored high contrast from localStorage", () => {
    localStorage.setItem("frelux_a11y_hc", "true");
    const { result } = renderHook(() => useAccessibility(), { wrapper });
    expect(result.current.highContrast).toBe(true);
  });

  it("reads stored large text from localStorage", () => {
    localStorage.setItem("frelux_a11y_large", "true");
    const { result } = renderHook(() => useAccessibility(), { wrapper });
    expect(result.current.largeText).toBe(true);
  });

  it("reads stored reduced motion from localStorage", () => {
    localStorage.setItem("frelux_a11y_motion", "true");
    const { result } = renderHook(() => useAccessibility(), { wrapper });
    expect(result.current.reducedMotion).toBe(true);
  });

  it("toggleHighContrast flips the value", () => {
    const { result } = renderHook(() => useAccessibility(), { wrapper });
    act(() => result.current.toggleHighContrast());
    expect(result.current.highContrast).toBe(true);
  });

  it("toggleLargeText flips the value", () => {
    const { result } = renderHook(() => useAccessibility(), { wrapper });
    act(() => result.current.toggleLargeText());
    expect(result.current.largeText).toBe(true);
  });

  it("toggleReducedMotion flips the value", () => {
    const { result } = renderHook(() => useAccessibility(), { wrapper });
    act(() => result.current.toggleReducedMotion());
    expect(result.current.reducedMotion).toBe(true);
  });

  it("adds accessibility-mode class when high contrast is on", () => {
    localStorage.setItem("frelux_a11y_hc", "true");
    renderHook(() => useAccessibility(), { wrapper });
    expect(
      document.documentElement.classList.contains("accessibility-mode"),
    ).toBe(true);
  });

  it("adds large-text class when large text is on", () => {
    localStorage.setItem("frelux_a11y_large", "true");
    renderHook(() => useAccessibility(), { wrapper });
    expect(document.documentElement.classList.contains("large-text")).toBe(
      true,
    );
  });

  it("adds reduced-motion class when reduced motion is on", () => {
    localStorage.setItem("frelux_a11y_motion", "true");
    renderHook(() => useAccessibility(), { wrapper });
    expect(document.documentElement.classList.contains("reduced-motion")).toBe(
      true,
    );
  });

  it("persists highContrast to localStorage", () => {
    const { result } = renderHook(() => useAccessibility(), { wrapper });
    act(() => result.current.toggleHighContrast());
    expect(localStorage.getItem("frelux_a11y_hc")).toBe("true");
  });

  it("renders children", () => {
    const { getByText } = render(
      <AccessibilityProvider>
        <span>Child</span>
      </AccessibilityProvider>,
    );
    expect(getByText("Child")).toBeTruthy();
  });
});
