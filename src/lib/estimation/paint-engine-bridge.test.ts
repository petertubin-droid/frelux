import { describe, it, expect } from "vitest";
import {
  createEngineConfig,
  calculatorInputToEngineInput,
} from "./paint-engine-bridge";

describe("estimation/paint-engine-bridge", () => {
  it("createEngineConfig creates config from calc and db data", () => {
    const config = createEngineConfig(
      { coverageRate: 10, containerSizes: [4, 20] },
      { product: null, quality: null, price: null },
    );
    expect(config).toBeTruthy();
  });

  it("createEngineConfig handles undefined optional fields", () => {
    const config = createEngineConfig({}, {});
    expect(config).toBeTruthy();
  });

  it("calculatorInputToEngineInput maps fields correctly", () => {
    const input = {
      length: 5,
      width: 4,
      wallHeight: 3,
      unit: "meters",
      doors: 2,
      doorDims: { width: 0.9, height: 2.1 },
      windows: 3,
      windowDims: { width: 1.2, height: 1.5 },
    } as any;
    const result = calculatorInputToEngineInput(input);
    expect(result.length).toBe(5);
    expect(result.width).toBe(4);
    expect(result.height).toBe(3);
    expect(result.unit).toBe("meters");
    expect(result.doors.length).toBe(1);
    expect(result.doors[0].quantity).toBe(2);
    expect(result.windows.length).toBe(1);
  });

  it("calculatorInputToEngineInput handles zero doors/windows", () => {
    const input = {
      length: 5,
      width: 4,
      wallHeight: 3,
      unit: "feet",
      doors: 0,
      doorDims: { width: 0.9, height: 2.1 },
      windows: 0,
      windowDims: { width: 1.2, height: 1.5 },
    } as any;
    const result = calculatorInputToEngineInput(input);
    expect(result.doors).toEqual([]);
    expect(result.windows).toEqual([]);
  });
});
