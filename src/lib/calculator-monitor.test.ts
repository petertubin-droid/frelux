import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/errorMonitor", () => ({
  captureCalculatorError: vi.fn(),
}));

import {
  monitoredCalc,
  monitoredCalcAsync,
  safeCalc,
  CALCULATOR_NAMES,
} from "./calculator-monitor";
import { captureCalculatorError } from "@/lib/errorMonitor";

describe("calculator-monitor", () => {
  it("monitoredCalc returns result on success", () => {
    const result = monitoredCalc("Test", () => 42);
    expect(result).toBe(42);
  });

  it("monitoredCalc captures and rethrows on error", () => {
    expect(() =>
      monitoredCalc("Test", () => {
        throw new Error("fail");
      }),
    ).toThrow("fail");
    expect(captureCalculatorError).toHaveBeenCalled();
  });

  it("monitoredCalcAsync returns result on success", async () => {
    const result = await monitoredCalcAsync("Test", async () => 42);
    expect(result).toBe(42);
  });

  it("monitoredCalcAsync captures and rethrows on error", async () => {
    await expect(
      monitoredCalcAsync("Test", async () => {
        throw new Error("fail");
      }),
    ).rejects.toThrow("fail");
    expect(captureCalculatorError).toHaveBeenCalled();
  });

  it("safeCalc returns result on success", () => {
    const result = safeCalc("Test", () => 42, 0);
    expect(result).toBe(42);
  });

  it("safeCalc returns fallback on error", () => {
    const result = safeCalc(
      "Test",
      () => {
        throw new Error("fail");
      },
      99,
    );
    expect(result).toBe(99);
    expect(captureCalculatorError).toHaveBeenCalled();
  });

  it("CALCULATOR_NAMES has entries for all calculators", () => {
    expect(Object.keys(CALCULATOR_NAMES).length).toBeGreaterThan(10);
    expect(CALCULATOR_NAMES.PAINTING).toBe("Painting Calculator");
    expect(CALCULATOR_NAMES.TILES).toBe("Tile Calculator");
  });
});
