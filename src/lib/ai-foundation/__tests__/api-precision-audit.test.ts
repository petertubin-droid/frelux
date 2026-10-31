import { describe, expect, it } from "vitest";
import {
  executeEngine,
  listEngines,
} from "@/lib/ai-foundation/engines-registry";
import {
  QUANTITY_DECIMALS,
  MONEY_DECIMALS,
  roundMoney,
  roundTo,
} from "@/lib/ai-foundation/precision";

/**
 * The API contract audit.
 *
 * These tests exist because of who reads the numbers: an external model holding
 * a FRELUX API key will repeat them to its own users without inspection. So the
 * guarantees have to hold uniformly, not per calculator:
 *
 *   every registered engine refuses bad input instead of returning NaN
 *   every registered engine returns the same numbers twice
 *   money arrives with at most two decimals, quantities with at most three
 *   a zero divisor is caught, never escaped as a null
 */

const tileInput = {
  surfaceType: "floor" as const,
  method: "traditional" as const,
  length: 5,
  width: 4,
  unit: "meters" as const,
  tileWidthMm: 600,
  tileHeightMm: 600,
  tilesPerBox: 4,
  tilePricePerBox: 12500,
  wasteMargin: 10,
  currency: "NGN",
};

function decimalsOf(value: number): number {
  const text = String(value);
  if (!text.includes(".")) return 0;
  return text.split(".")[1].replace(/0+$/, "").length;
}

describe("precision primitives", () => {
  it("rounds money the way a person expects on a half boundary", () => {
    // Naive Math.round(1.005 * 100) lands on 100.49999999999999 and loses a cent.
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(2.675)).toBe(2.68);
    expect(roundMoney(12345.678)).toBe(12345.68);
  });

  it("strips binary float noise from accumulated sums", () => {
    const drift = 0.1 + 0.2 + 0.3; // 0.6000000000000001
    expect(roundMoney(drift)).toBe(0.6);
  });

  it("normalises negative zero so it never serialises as -0", () => {
    expect(Object.is(roundMoney(-0), 0)).toBe(true);
    expect(Object.is(roundMoney(-0.001), 0)).toBe(true);
  });

  it("keeps quantities at three decimals", () => {
    expect(roundTo(20 / 3, QUANTITY_DECIMALS)).toBe(6.667);
    expect(roundTo(2.0004999, QUANTITY_DECIMALS)).toBe(2);
  });

  it("leaves non-finite values visible rather than quietly zeroing them", () => {
    expect(roundMoney(Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY);
    expect(Number.isNaN(roundMoney(Number.NaN))).toBe(true);
  });
});

describe("every registered engine honours the API contract", () => {
  const engines = listEngines();

  it("registers a non-trivial set of engines", () => {
    expect(engines.length).toBeGreaterThanOrEqual(15);
  });

  it("describes each engine well enough for a model to choose one", () => {
    for (const engine of engines) {
      expect(engine.id).toMatch(/^[a-z0-9_]+$/);
      expect(engine.title.length).toBeGreaterThan(5);
      expect(engine.domain.length).toBeGreaterThan(2);
      expect(engine.authoritative).toBe(true);
      expect(engine.creditedAs.length).toBeGreaterThan(10);
    }
  });

  it("refuses empty input with a message instead of throwing or returning NaN", async () => {
    for (const engine of engines) {
      const result = await executeEngine(engine.id, {});
      expect(result.engine).toBe(engine.id);
      if (!result.ok) {
        expect(result.error?.length ?? 0).toBeGreaterThan(5);
        expect(result.quantities).toEqual([]);
        expect(result.costs).toBeNull();
      } else {
        // An engine that accepts empty input must still return real numbers.
        for (const line of result.quantities) {
          expect(Number.isFinite(line.quantity)).toBe(true);
        }
        if (result.costs)
          expect(Number.isFinite(result.costs.total)).toBe(true);
      }
    }
  });

  it("rejects unknown engines rather than guessing a result", async () => {
    await expect(
      executeEngine("no_such_engine", { length: 5 }),
    ).rejects.toThrow(/not registered/i);
  });
});

describe("tile engine, accuracy against hand calculation", () => {
  it("computes the surface area exactly", async () => {
    // 5 m by 4 m is 20 m² and must not arrive as 19.999999999999996.
    const result = await executeEngine("tile_estimate", tileInput);
    expect(result.ok).toBe(true);
    const area = result.quantities.find(
      (line) => line.label === "Surface area",
    );
    expect(area?.quantity).toBe(20);
    expect(area?.unit).toBe("m²");
  });

  it("needs the hand-calculated tile count for a 600 mm tile", async () => {
    // 0.36 m² per tile, so 20 m² is 55.56 tiles, 10 percent waste gives 61.1,
    // and tiles are whole: 62.
    const result = await executeEngine("tile_estimate", tileInput);
    const tiles = result.quantities.find(
      (line) => line.label === "Tiles needed",
    );
    expect(tiles?.quantity).toBe(62);
    const boxes = result.quantities.find(
      (line) => line.label === "Boxes needed",
    );
    expect(boxes?.quantity).toBe(16); // 62 tiles at 4 per box, rounded up
  });

  it("returns identical numbers on a second run", async () => {
    const first = await executeEngine("tile_estimate", tileInput);
    const second = await executeEngine("tile_estimate", tileInput);
    expect(second.quantities).toEqual(first.quantities);
    expect(second.costs).toEqual(first.costs);
  });

  it("catches a zero package size instead of dividing by zero", async () => {
    const result = await executeEngine("tile_estimate", {
      ...tileInput,
      tilesPerBox: 0,
    });
    // Either the engine rejects the divisor itself or the precision boundary
    // catches the Infinity. What must never happen is a null in a JSON client.
    if (result.ok) {
      for (const line of result.quantities) {
        expect(Number.isFinite(line.quantity)).toBe(true);
      }
    } else {
      expect(result.error).toBeTruthy();
    }
  });
});

describe("money never leaks float noise", () => {
  it("reports cost amounts with at most two decimals", async () => {
    const result = await executeEngine("tile_estimate", tileInput);
    expect(result.costs).not.toBeNull();
    expect(decimalsOf(result.costs!.total)).toBeLessThanOrEqual(MONEY_DECIMALS);
    for (const line of result.costs!.lines ?? []) {
      expect(decimalsOf(line.amount)).toBeLessThanOrEqual(MONEY_DECIMALS);
    }
  });

  it("keeps a total consistent with its lines when they describe the same money", async () => {
    const result = await executeEngine("tile_estimate", tileInput);
    const lines = result.costs!.lines ?? [];
    if (lines.length > 0) {
      const sum = roundMoney(lines.reduce((s, l) => s + l.amount, 0));
      // This engine's total is exactly its lines, so they must agree to the cent.
      expect(Math.abs(result.costs!.total - sum)).toBeLessThanOrEqual(0.01);
    }
  });

  it("prices a known tile order exactly", async () => {
    // 4 boxes needed, 12,500 per box.
    const result = await executeEngine("tile_estimate", tileInput);
    expect(result.costs!.currency).toBe("NGN");
    expect(result.costs!.total).toBe(200000);
  });
});

describe("quantities carry precision but no float artifacts", () => {
  it("keeps every quantity at three decimals or fewer", async () => {
    const result = await executeEngine("tile_estimate", tileInput);
    for (const line of result.quantities) {
      expect(decimalsOf(line.quantity)).toBeLessThanOrEqual(QUANTITY_DECIMALS);
    }
  });
});

describe("engines that report priced lines hold the same money contract", () => {
  const fixtures: Array<{ id: string; input: Record<string, unknown> }> = [
    {
      id: "painting_project",
      input: {
        length: 5,
        width: 4,
        wallHeight: 3,
        doors: 2,
        windows: 2,
        coats: 2,
        projectType: "room",
      },
    },
  ];

  // Engines such as screeding_system read their rates from a database config
  // row, so they are exercised against live configuration rather than here;
  // the empty-input contract test above still covers their refusal path.
  for (const { id, input } of fixtures) {
    it(`${id} returns finite, cent-rounded money and repeats itself`, async () => {
      const first = await executeEngine(id, input);
      expect(first.engine).toBe(id);
      expect(first.ok).toBe(true);

      if (first.costs) {
        expect(Number.isFinite(first.costs.total)).toBe(true);
        expect(decimalsOf(first.costs.total)).toBeLessThanOrEqual(
          MONEY_DECIMALS,
        );
        for (const line of first.costs.lines ?? []) {
          expect(Number.isFinite(line.amount)).toBe(true);
          expect(decimalsOf(line.amount)).toBeLessThanOrEqual(MONEY_DECIMALS);
        }
      }
      for (const line of first.quantities) {
        expect(Number.isFinite(line.quantity)).toBe(true);
        expect(decimalsOf(line.quantity)).toBeLessThanOrEqual(
          QUANTITY_DECIMALS,
        );
      }

      const second = await executeEngine(id, input);
      expect(second.quantities).toEqual(first.quantities);
      expect(second.costs).toEqual(first.costs);
    });
  }
});

describe("config-dependent engines fail cleanly without their database row", () => {
  // screeding_system and pop_ceiling read rates from configuration. In an
  // environment without that row the only acceptable behaviour is a stated
  // failure. A NaN or an Infinity reaching an API consumer would be read as a
  // free material quantity, which is the one error a budget must never have.
  for (const [id, input] of [
    ["screeding_system", { areaM2: 120 }],
    ["pop_ceiling", { areaM2: 40 }],
  ] as const) {
    it(`${id} either answers with finite numbers or refuses with a reason`, async () => {
      const result = await executeEngine(id, input);
      if (result.ok) {
        for (const line of result.quantities) {
          expect(Number.isFinite(line.quantity)).toBe(true);
        }
        if (result.costs)
          expect(Number.isFinite(result.costs.total)).toBe(true);
      } else {
        expect(result.error?.length ?? 0).toBeGreaterThan(10);
        expect(result.quantities).toEqual([]);
      }
    });
  }
});
