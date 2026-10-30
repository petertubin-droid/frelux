import { describe, expect, it } from "vitest";
import {
  AREA_TO_M2,
  LENGTH_TO_M,
  MASS_TO_KG,
  VOLUME_TO_L,
} from "@/lib/convert/units";
import {
  UNIT_CATALOG,
  convertEntryDimensions,
  convertUnitValue,
  copyMeasurement,
  entryUnitForSystem,
  findUnit,
  preferredUnit,
  switchUnit,
  unitsFor,
} from "./unit-sync";
import { fromMeters, toMeters } from "./units";

describe("exact conversion constants", () => {
  it("matches the international yard and pound agreement", () => {
    expect(LENGTH_TO_M.ft).toBe(0.3048);
    expect(LENGTH_TO_M.in).toBe(0.0254);
    expect(LENGTH_TO_M.yd).toBe(0.9144);
    expect(LENGTH_TO_M.mi).toBe(1609.344);
    expect(MASS_TO_KG.lb).toBe(0.45359237);
    expect(MASS_TO_KG.ton_us).toBe(907.18474);
    expect(AREA_TO_M2.acre).toBe(4046.8564224);
    expect(VOLUME_TO_L.gal_imp).toBe(4.54609);
    expect(VOLUME_TO_L.gal_us).toBe(3.785411784);
  });

  it("turns the worked example into the right number of metres", () => {
    // 20 feet = 6.096 metres, the example in the specification
    expect(toMeters(20, "feet")).toBeCloseTo(6.096, 12);
    expect(convertUnitValue(20, "ft", "m")).toBeCloseTo(6.096, 12);
    expect(convertUnitValue(6.096, "m", "ft")).toBeCloseTo(20, 10);
  });

  it("converts every listed length unit against the metre", () => {
    const cases: [string, number][] = [
      ["mm", 0.001],
      ["cm", 0.01],
      ["m", 1],
      ["km", 1000],
      ["in", 0.0254],
      ["ft", 0.3048],
      ["yd", 0.9144],
      ["mi", 1609.344],
    ];
    cases.forEach(([unit, expected]) => {
      expect(convertUnitValue(1, unit, "m")).toBeCloseTo(expected, 12);
    });
  });

  it("converts area, volume and mass within their own dimension", () => {
    expect(convertUnitValue(1, "acre", "m2")).toBeCloseTo(4046.8564224, 6);
    expect(convertUnitValue(1, "yd2", "m2")).toBeCloseTo(0.83612736, 10);
    expect(convertUnitValue(1, "hectare", "m2")).toBeCloseTo(10000, 6);
    expect(convertUnitValue(1, "gal_imp", "l")).toBeCloseTo(4.54609, 10);
    expect(convertUnitValue(1, "ft3", "l")).toBeCloseTo(28.316846592, 8);
    expect(convertUnitValue(1, "ton_us", "kg")).toBeCloseTo(907.18474, 8);
    expect(convertUnitValue(1, "tonne", "kg")).toBeCloseTo(1000, 9);
  });

  it("refuses to mix dimensions instead of inventing a density", () => {
    expect(() => convertUnitValue(1, "ft", "m2")).toThrow(/without a rate/);
    expect(() => convertUnitValue(1, "kg", "l")).toThrow(/without a rate/);
    expect(() => convertUnitValue(1, "zz", "m")).toThrow(/Unknown unit/);
  });

  it("survives a round trip without drifting", () => {
    const values = [0.5, 3, 20, 123.456, 9999.99];
    const pairs: [string, string][] = [
      ["ft", "m"],
      ["in", "mm"],
      ["yd", "mi"],
      ["acre", "yd2"],
      ["gal_us", "gal_imp"],
      ["ton_us", "tonne"],
    ];
    pairs.forEach(([a, b]) => {
      values.forEach((value) => {
        const roundTrip = switchUnit(switchUnit(value, a, b), b, a);
        expect(roundTrip).toBeCloseTo(value, 9);
      });
    });
  });

  it("does not round intermediate values", () => {
    const metres = convertUnitValue(1, "in", "m");
    expect(metres).toBe(0.0254);
    expect(convertUnitValue(metres, "m", "in")).toBeCloseTo(1, 12);
  });
});

describe("catalogue", () => {
  it("offers both systems for every dimension", () => {
    (["length", "area", "volume", "mass"] as const).forEach((dimension) => {
      expect(unitsFor(dimension, "metric").length).toBeGreaterThan(0);
      expect(unitsFor(dimension, "imperial").length).toBeGreaterThan(0);
    });
    expect(findUnit("mi")?.dimension).toBe("length");
    expect(findUnit("gal_imp")?.system).toBe("imperial");
    expect(findUnit("tonne")?.system).toBe("metric");
  });

  it("names a sensible default unit per system", () => {
    expect(preferredUnit("metric", "length")).toBe("m");
    expect(preferredUnit("imperial", "length")).toBe("ft");
    expect(entryUnitForSystem("imperial")).toBe("feet");
    expect(entryUnitForSystem("metric")).toBe("meters");
    expect(UNIT_CATALOG.length).toBeGreaterThan(20);
  });
});

describe("switching units on a real entry", () => {
  const room = { length: 20, width: 10, height: 9, unit: "feet" as const };

  it("keeps the physical size when the unit changes", () => {
    const metric = convertEntryDimensions(room, "meters");
    expect(metric.unit).toBe("meters");
    expect(metric.length).toBeCloseTo(6.096, 10);
    expect(metric.width).toBeCloseTo(3.048, 10);
    expect(metric.height).toBeCloseTo(2.7432, 10);
    // the same physical room, whichever unit is shown
    expect(toMeters(metric.length, metric.unit)).toBeCloseTo(
      toMeters(room.length, room.unit),
      10,
    );
    expect(toMeters(metric.height, metric.unit)).toBeCloseTo(
      toMeters(room.height, room.unit),
      10,
    );
  });

  it("returns to the original numbers on the way back", () => {
    const back = convertEntryDimensions(
      convertEntryDimensions(room, "meters"),
      "feet",
    );
    expect(back.length).toBeCloseTo(20, 9);
    expect(back.width).toBeCloseTo(10, 9);
    expect(back.height).toBeCloseTo(9, 9);
  });

  it("handles yards, kilometres and miles", () => {
    const metresRoom = { length: 100, width: 50, unit: "meters" as const };
    expect(convertEntryDimensions(metresRoom, "yards").length).toBeCloseTo(
      109.36132983377078,
      8,
    );
    expect(
      convertEntryDimensions({ ...metresRoom, length: 1609.344 }, "miles")
        .length,
    ).toBeCloseTo(1, 10);
    expect(
      convertEntryDimensions({ ...metresRoom, length: 2500 }, "kilometers")
        .length,
    ).toBeCloseTo(2.5, 10);
  });

  it("leaves absent fields absent and is a no-op on the same unit", () => {
    const bare: {
      length: number;
      width?: number;
      height?: number;
      unit: "meters";
    } = {
      length: 4,
      unit: "meters",
    };
    const switched = convertEntryDimensions(bare, "feet");
    expect(switched.width).toBeUndefined();
    expect(switched.height).toBeUndefined();
    expect(convertEntryDimensions(bare, "meters")).toBe(bare);
  });

  it("ignores blank numeric fields instead of writing NaN", () => {
    const half = { length: 5, width: Number.NaN, unit: "feet" as const };
    const switched = convertEntryDimensions(half, "meters");
    expect(Number.isNaN(switched.width as number)).toBe(true);
    expect(switched.length).toBeCloseTo(1.524, 10);
  });
});

describe("display helpers", () => {
  it("formats a copy-ready measurement", () => {
    expect(copyMeasurement(6.096, "m")).toBe("6.096 m");
    expect(copyMeasurement(20.0000001, "ft")).toBe("20 ft");
    expect(copyMeasurement(1, "gal_imp")).toBe("1 imp gal");
  });

  it("keeps the metre conversion symmetrical", () => {
    expect(fromMeters(toMeters(12.5, "yards"), "yards")).toBeCloseTo(12.5, 12);
  });
});

describe("cross-calculator invariance", () => {
  // Every calculator normalises user input to SI before doing its own maths.
  // These cases take the same physical room expressed in each system and check
  // that the quantity handed to the engines is identical, which is what makes
  // the material list independent of the unit preference.
  const feet = { length: 20, width: 10, unit: "feet" as const };
  const metres = convertEntryDimensions(feet, "meters");

  const areaM2 = (entry: {
    length: number;
    width: number;
    unit: "feet" | "meters";
  }) => toMeters(entry.length, entry.unit) * toMeters(entry.width, entry.unit);

  it("gives the same floor area from either entry system", () => {
    expect(areaM2(metres)).toBeCloseTo(areaM2(feet), 10);
    expect(areaM2(feet)).toBeCloseTo(18.580608, 10);
  });

  it("gives the same screeding volume for a 50 mm bed", () => {
    const thicknessM = convertUnitValue(50, "mm", "m");
    expect(areaM2(feet) * thicknessM).toBeCloseTo(
      areaM2(metres) * thicknessM,
      12,
    );
    expect(areaM2(feet) * thicknessM).toBeCloseTo(0.9290304, 9);
  });

  it("gives the same tile pack count", () => {
    // 600 x 600 mm tiles, 1.44 m² per box including waste allowance
    const boxCoverage =
      convertUnitValue(600, "mm", "m") * convertUnitValue(600, "mm", "m") * 4;
    const boxes = (area: number) => Math.ceil((area * 1.1) / boxCoverage);
    expect(boxes(areaM2(feet))).toBe(boxes(areaM2(metres)));
    expect(boxes(areaM2(feet))).toBe(15);
  });

  it("gives the same paint litres at 10 m² per litre for two coats", () => {
    const litres = (area: number) => (area * 2) / 10;
    expect(litres(areaM2(feet))).toBeCloseTo(litres(areaM2(metres)), 12);
    expect(litres(areaM2(feet))).toBeCloseTo(3.7161216, 9);
  });

  it("gives the same concrete volume for a 100 mm slab", () => {
    const depthM = convertUnitValue(100, "mm", "m");
    const cubicMetres = (area: number) => area * depthM;
    expect(cubicMetres(areaM2(feet))).toBeCloseTo(
      cubicMetres(areaM2(metres)),
      12,
    );
    // and the same volume in the visitor's own imperial units
    expect(
      convertUnitValue(cubicMetres(areaM2(feet)), "m3", "ft3"),
    ).toBeCloseTo(
      convertUnitValue(cubicMetres(areaM2(metres)), "m3", "ft3"),
      10,
    );
  });

  it("gives the same roofing area from feet and metres", () => {
    const roofFeet = { length: 32, width: 24, unit: "feet" as const };
    const roofMetres = convertEntryDimensions(roofFeet, "meters");
    const roofArea = (entry: {
      length: number;
      width: number;
      unit: "feet" | "meters";
    }) =>
      toMeters(entry.length, entry.unit) * toMeters(entry.width, entry.unit);
    expect(roofArea(roofFeet)).toBeCloseTo(roofArea(roofMetres), 10);
    // a 15 percent pitch allowance, applied after normalisation
    expect(roofArea(roofFeet) * 1.15).toBeCloseTo(
      roofArea(roofMetres) * 1.15,
      10,
    );
  });
});
