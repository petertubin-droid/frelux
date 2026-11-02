import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import CountUp from "@/components/ui/CountUp";

// Mock requestAnimationFrame
let rafCallbacks: ((ts: number) => void)[] = [];
const originalRAF = globalThis.requestAnimationFrame;

beforeEach(() => {
  rafCallbacks = [];
  globalThis.requestAnimationFrame = vi.fn((cb: (ts: number) => void) => {
    rafCallbacks.push(cb);
    return rafCallbacks.length;
  }) as unknown as typeof globalThis.requestAnimationFrame;
  globalThis.cancelAnimationFrame = vi.fn();
});

afterEach(() => {
  globalThis.requestAnimationFrame = originalRAF;
});

function _flushRAF(ts: number) {
  const callbacks = [...rafCallbacks];
  rafCallbacks = [];
  callbacks.forEach((cb) => cb(ts));
}

describe("CountUp", () => {
  it("renders a span with role timer", () => {
    render(<CountUp value={100} />);
    const el = screen.getByRole("timer");
    expect(el).toBeTruthy();
  });

  it("starts at 0", () => {
    render(<CountUp value={100} />);
    const el = screen.getByRole("timer");
    expect(el.textContent).toContain("0");
  });

  it("applies prefix and suffix", () => {
    render(<CountUp value={100} prefix="$" suffix="%" />);
    const el = screen.getByRole("timer");
    expect(el.textContent).toContain("$");
    expect(el.textContent).toContain("%");
  });

  it("respects decimals", () => {
    render(<CountUp value={0} decimals={2} />);
    const el = screen.getByRole("timer");
    expect(el.textContent).toContain("0.00");
  });

  it("applies custom className", () => {
    render(<CountUp value={10} className="my-class" />);
    const el = screen.getByRole("timer");
    expect(el.className).toContain("my-class");
  });

  it("has aria-live polite for accessibility", () => {
    render(<CountUp value={10} />);
    const el = screen.getByRole("timer");
    expect(el.getAttribute("aria-live")).toBe("polite");
  });
});
