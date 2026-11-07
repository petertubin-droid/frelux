import { describe, it, expect } from "vitest";
import { resolveEffectiveCoats } from "@/lib/calc";

describe("resolveEffectiveCoats", () => {
  it("follows the configured default when nothing is selected", () => {
    expect(resolveEffectiveCoats(null, 1)).toBe(1);
    expect(resolveEffectiveCoats(undefined, 2)).toBe(2);
  });

  it("keeps an explicit user choice", () => {
    expect(resolveEffectiveCoats(3, 1)).toBe(3);
    expect(resolveEffectiveCoats(1, 2)).toBe(1);
  });

  it("never returns less than one coat", () => {
    expect(resolveEffectiveCoats(0, 1)).toBe(1);
    expect(resolveEffectiveCoats(-2, 1)).toBe(1);
    expect(resolveEffectiveCoats(Number.NaN, 2)).toBe(2);
  });

  it("clamps at the ten coat ceiling", () => {
    expect(resolveEffectiveCoats(25, 1)).toBe(10);
  });

  it("falls back to one coat when the stored default is unusable", () => {
    expect(resolveEffectiveCoats(null, 0)).toBe(1);
    expect(resolveEffectiveCoats(null, Number.NaN)).toBe(1);
  });
});
