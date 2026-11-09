/**
 * The takeoff engine through the commercial API contract.
 *
 * These tests execute the registered engine exactly as the gateway does, so what
 * is asserted here is what an integrator receives: quantities per line, a refusal
 * with a reason instead of zeros, and no cost invented by a quantity engine.
 */
import { describe, expect, it } from "vitest";
import {
  executeEngine,
  getEngineDescriptor,
  listEngines,
} from "../engines-registry";

const schedule = {
  rooms: [
    {
      id: "r1",
      label: "Bedroom",
      walls: [{ id: "w1", length: 4, height: 2.7 }],
      floor: { id: "f1", length: 4, width: 3.5 },
    },
    {
      id: "r2",
      label: "Sitting",
      walls: [{ id: "w2", length: 5, height: 2.7 }],
      floor: { id: "f2", length: 5, width: 4.5 },
    },
  ],
};

describe("takeoff engine registration", () => {
  it("is discoverable by id", () => {
    const descriptor = getEngineDescriptor("takeoff");
    expect(descriptor).toBeTruthy();
    expect(descriptor?.authoritative).toBe(true);
    expect(descriptor?.domain).toBe("estimation");
  });

  it("appears in the advertised engine list", () => {
    expect(listEngines().map((engine) => engine.id)).toContain("takeoff");
  });
});

describe("takeoff through executeEngine", () => {
  it("returns quantities for every measurable line", async () => {
    const result = await executeEngine("takeoff", schedule);
    expect(result.ok).toBe(true);
    expect(result.engine).toBe("takeoff");

    const blockwork = result.quantities.find((line) =>
      line.label.includes("Blockwork measured area"),
    );
    // (4 + 5) walls x 2.7 m is 24.3 m2 of wall.
    expect(blockwork?.quantity).toBeCloseTo(24.3, 2);
    expect(blockwork?.unit).toBe("m2");

    const floor = result.quantities.find((line) =>
      line.label.includes("Floor tiling measured area"),
    );
    // 4 x 3.5 + 5 x 4.5 is 36.5 m2 of floor.
    expect(floor?.quantity).toBeCloseTo(36.5, 2);
  });

  it("never asserts a cost it cannot justify", async () => {
    const result = await executeEngine("takeoff", schedule);
    expect(result.costs).toBeNull();
  });

  it("keeps every quantity finite and positive", async () => {
    const result = await executeEngine("takeoff", schedule);
    for (const line of result.quantities) {
      expect(Number.isFinite(line.quantity)).toBe(true);
      expect(line.quantity).toBeGreaterThan(0);
    }
  });

  it("carries the working and the warnings in raw", async () => {
    const result = await executeEngine("takeoff", schedule);
    const raw = result.raw as {
      lines: { derivation: { formula: string }; assumed: boolean }[];
      warnings: string[];
      totals: { unit: string; quantity: number }[];
      assumedLineCount: number;
    };
    expect(raw.lines.length).toBe(result.quantities.length);
    expect(raw.lines[0].derivation.formula.length).toBeGreaterThan(5);
    expect(Array.isArray(raw.warnings)).toBe(true);
    expect(typeof raw.assumedLineCount).toBe("number");
    expect(raw.totals.some((total) => total.unit === "m2")).toBe(true);
  });

  it("honours a restricted scope list", async () => {
    const result = await executeEngine("takeoff", {
      ...schedule,
      scopes: ["paint"],
    });
    expect(result.ok).toBe(true);
    expect(
      result.quantities.every((line) => line.label.startsWith("Paint")),
    ).toBe(true);
  });

  it("refuses unknown scopes by name instead of silently ignoring them", async () => {
    const result = await executeEngine("takeoff", {
      ...schedule,
      scopes: ["blockwork", "roofing"],
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/roofing/);
    expect(result.quantities).toEqual([]);
  });

  it("refuses an empty scope array", async () => {
    const result = await executeEngine("takeoff", { ...schedule, scopes: [] });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/non-empty/i);
  });

  it("refuses a request with no rooms", async () => {
    const result = await executeEngine("takeoff", {});
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/at least one room/i);
    expect(result.quantities).toEqual([]);
  });

  it("refuses a schedule where nothing was measured, quoting the engine", async () => {
    const result = await executeEngine("takeoff", {
      rooms: [{ id: "r1", walls: [{ id: "w1", length: 0, height: 0 }] }],
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/nothing was measurable/i);
  });

  it("refuses a malformed specs object rather than ignoring it", async () => {
    const result = await executeEngine("takeoff", { ...schedule, specs: [] });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/specs must be an object/i);
  });

  it("applies a material override it was given", async () => {
    const withThinBlocks = await executeEngine("takeoff", {
      ...schedule,
      scopes: ["blockwork"],
      specs: { blockwork: { blockLengthMm: 300, blockHeightMm: 200 } },
    });
    const standard = await executeEngine("takeoff", {
      ...schedule,
      scopes: ["blockwork"],
    });
    const count = (result: typeof withThinBlocks) =>
      result.quantities.find((line) => line.label.includes("Blocks for"))
        ?.quantity ?? 0;
    // A 300 x 200 block covers less face than a 450 x 225 block.
    expect(count(withThinBlocks)).toBeGreaterThan(count(standard));
  });

  it("accepts millimetre input exactly as the studio does", async () => {
    const result = await executeEngine("takeoff", {
      rooms: [
        {
          walls: [
            { id: "w1", length: 4000, height: 2700, unit: "mm" },
            { id: "w2", length: 4000, height: 2700, unit: "mm" },
          ],
        },
      ],
      scopes: ["blockwork"],
    });
    const area = result.quantities.find((line) =>
      line.label.includes("measured area"),
    );
    // Two 4 m walls at 2.7 m is 21.6 m2.
    expect(area?.quantity).toBeCloseTo(21.6, 2);
  });
});
