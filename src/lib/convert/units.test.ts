import { describe, expect, it } from "vitest";
import {
  AREA_TO_M2,
  convertUniversal,
  bagsFromMass,
  convertArea,
  convertLength,
  convertMass,
  convertVolume,
  feetInchesToMetres,
  findMaterial,
  formatNumber,
  massToVolumeM3,
  metresToFeetInches,
  paintBuckets,
  parseMeasurement,
  plotAreaFromPreset,
  plotAreaM2,
  plotsPerAcre,
  roofAreaFromPlan,
  roofPitchDegrees,
  volumeToMassKg,
} from "./units";

describe("measurement conversion", () => {
  it("uses exact length constants", () => {
    expect(convertLength(1, "in", "mm")).toBeCloseTo(25.4, 10);
    expect(convertLength(1, "ft", "m")).toBeCloseTo(0.3048, 10);
    expect(convertLength(1, "yd", "ft")).toBeCloseTo(3, 10);
    expect(convertLength(1000, "mm", "m")).toBeCloseTo(1, 10);
    expect(convertLength(2.5, "km", "m")).toBeCloseTo(2500, 10);
  });

  it("round trips without drift", () => {
    const there = convertLength(12.7, "ft", "mm");
    expect(there).not.toBeNull();
    expect(convertLength(there as number, "mm", "ft")).toBeCloseTo(12.7, 9);
  });

  it("converts areas including land", () => {
    expect(convertArea(1, "acre", "m2")).toBeCloseTo(4046.8564224, 6);
    expect(convertArea(1, "hectare", "acre")).toBeCloseTo(2.4710538147, 8);
    expect(convertArea(1, "ft2", "m2")).toBeCloseTo(0.09290304, 10);
    expect(AREA_TO_M2.hectare).toBe(10000);
  });

  it("distinguishes US and imperial gallons", () => {
    expect(convertVolume(1, "gal_us", "l")).toBeCloseTo(3.785411784, 9);
    expect(convertVolume(1, "gal_imp", "l")).toBeCloseTo(4.54609, 9);
    expect(convertVolume(1, "m3", "ft3")).toBeCloseTo(35.314666721, 6);
  });

  it("distinguishes US short tons from imperial long tons", () => {
    expect(convertMass(1, "ton_us", "kg")).toBeCloseTo(907.18474, 6);
    expect(convertMass(1, "ton_imp", "kg")).toBeCloseTo(1016.0469088, 6);
    expect(convertMass(1, "tonne", "kg")).toBeCloseTo(1000, 9);
    expect(convertMass(1, "lb", "kg")).toBeCloseTo(0.45359237, 10);
  });

  it("reads feet and inches as one tape measurement", () => {
    expect(feetInchesToMetres(5, 6)).toBeCloseTo(1.6764, 6);
    const back = metresToFeetInches(1.6764);
    expect(back?.feet).toBe(5);
    expect(back?.inches).toBeCloseTo(6, 3);
  });
});

describe("land plots", () => {
  it("sizes the standard Nigerian plots", () => {
    expect(plotAreaFromPreset("50x100ft")).toBeCloseTo(464.5152, 3);
    expect(plotAreaFromPreset("60x120ft")).toBeCloseTo(668.901888, 3);
  });

  it("accepts custom dimensions in feet or metres", () => {
    expect(plotAreaM2(18.3, 36.6, "m")).toBeCloseTo(669.78, 2);
    expect(plotAreaM2(50, 100, "ft")).toBeCloseTo(464.5152, 3);
  });

  it("works out how many plots fit an acre", () => {
    const plot = plotAreaFromPreset("60x120ft") as number;
    expect(plotsPerAcre(plot)).toBeCloseTo(6.05, 2);
  });

  it("refuses impossible dimensions", () => {
    expect(plotAreaM2(0, 100, "ft")).toBeNull();
    expect(plotAreaM2(-5, 100, "ft")).toBeNull();
  });
});

describe("material weight and volume", () => {
  it("converts tonnes of sand to cubic metres with a stated density", () => {
    const sand = findMaterial("sharp-sand");
    expect(sand).not.toBeNull();
    const m3 = massToVolumeM3(20_000, sand!.densityKgM3);
    expect(m3).toBeCloseTo(12.5, 6);
    expect(volumeToMassKg(m3 as number, sand!.densityKgM3)).toBeCloseTo(
      20_000,
      6,
    );
  });

  it("counts cement bags from a mass and a bag weight", () => {
    const bags = bagsFromMass(1000, 50);
    expect(bags?.exact).toBe(20);
    expect(bags?.toBuy).toBe(20);
    expect(bags?.leftoverKg).toBe(0);
  });

  it("rounds bags up for purchase without overstating them", () => {
    const bags = bagsFromMass(1010, 50);
    expect(bags?.toBuy).toBe(21);
    expect(bags?.leftoverKg).toBeCloseTo(40, 6);
  });

  it("will not convert mass to volume without a density or bag weight", () => {
    expect(massToVolumeM3(1000, 0)).toBeNull();
    expect(bagsFromMass(1000, 0)).toBeNull();
  });
});

describe("paint buckets", () => {
  it("prefers 20 L plus 4 L over two 20 L buckets", () => {
    const plan = paintBuckets(24);
    expect(plan?.totalLitres).toBe(24);
    expect(plan?.leftoverLitres).toBeCloseTo(0, 9);
    expect(plan?.best).toEqual([
      { sizeLitres: 20, count: 1 },
      { sizeLitres: 4, count: 1 },
    ]);
  });

  it("handles exact large quantities", () => {
    const plan = paintBuckets(60);
    expect(plan?.totalLitres).toBe(60);
    expect(plan?.best).toEqual([{ sizeLitres: 20, count: 3 }]);
  });

  it("reports each bucket size on its own", () => {
    const plan = paintBuckets(26);
    expect(plan?.perSize.find((p) => p.sizeLitres === 20)?.toBuy).toBe(2);
    expect(plan?.perSize.find((p) => p.sizeLitres === 10)?.toBuy).toBe(3);
    expect(plan?.perSize.find((p) => p.sizeLitres === 4)?.toBuy).toBe(7);
  });
});

describe("roofing", () => {
  it("raises plan area by the pitch", () => {
    expect(roofAreaFromPlan(100, 0)).toBeCloseTo(100, 9);
    expect(roofAreaFromPlan(100, 30)).toBeCloseTo(115.4700538, 6);
  });

  it("reads pitch from rise and run", () => {
    expect(roofPitchDegrees(1, 1)).toBeCloseTo(45, 6);
    expect(roofPitchDegrees(0.5, 1)).toBeCloseTo(26.5650512, 6);
  });

  it("rejects a flat or impossible roof", () => {
    expect(roofPitchDegrees(1, 0)).toBeNull();
    expect(roofAreaFromPlan(100, 90)).toBeNull();
  });
});

describe("input handling", () => {
  it("accepts decimals and thousand separators", () => {
    expect(parseMeasurement("1,250.75")).toBe(1250.75);
    expect(parseMeasurement("0.5")).toBe(0.5);
    expect(parseMeasurement(12)).toBe(12);
  });

  it("rejects empty, negative and non numeric input", () => {
    expect(parseMeasurement("")).toBeNull();
    expect(parseMeasurement("   ")).toBeNull();
    expect(parseMeasurement("-3")).toBeNull();
    expect(parseMeasurement("abc")).toBeNull();
    expect(parseMeasurement(null)).toBeNull();
  });

  it("formats without floating point noise", () => {
    expect(formatNumber(0.1 + 0.2)).toBe("0.3");
    expect(formatNumber(25.4)).toBe("25.4");
    expect(formatNumber(null)).toBe("n/a");
    expect(formatNumber(1234.56789, 2)).toBe("1234.57");
  });
});

describe("universal conversion across every unit", () => {
  it("converts any length into any other length", () => {
    expect(convertUniversal(12, "len-ft", "len-in").value).toBeCloseTo(144, 9);
    expect(convertUniversal(1, "len-yd", "len-mm").value).toBeCloseTo(914.4, 9);
    expect(convertUniversal(2.5, "len-km", "len-m").value).toBeCloseTo(2500, 9);
  });

  it("converts land units including plots", () => {
    expect(
      convertUniversal(1, "area-plot-60x120", "area-m2").value,
    ).toBeCloseTo(668.901888, 4);
    expect(
      convertUniversal(1, "area-acre", "area-plot-50x100").value,
    ).toBeCloseTo(8.71, 2);
    expect(convertUniversal(1, "area-hectare", "area-acre").value).toBeCloseTo(
      2.4710538147,
      8,
    );
    expect(
      convertUniversal(1, "area-plot-100x100", "area-ft2").value,
    ).toBeCloseTo(10000, 4);
  });

  it("squares a length to reach an area and takes the root back", () => {
    expect(convertUniversal(10, "len-m", "area-m2").value).toBeCloseTo(100, 9);
    expect(convertUniversal(100, "area-m2", "len-m").value).toBeCloseTo(10, 9);
    expect(convertUniversal(6, "len-ft", "area-m2").value).toBeCloseTo(
      3.34450944,
      6,
    );
  });

  it("cubes a length to reach a volume and roots it back", () => {
    expect(convertUniversal(2, "len-m", "vol-l").value).toBeCloseTo(8000, 6);
    expect(convertUniversal(8, "vol-m3", "len-m").value).toBeCloseTo(2, 9);
  });

  it("crosses area and volume only with a depth", () => {
    const missing = convertUniversal(50, "area-m2", "vol-m3");
    expect(missing.value).toBeNull();
    expect(missing.needs).toBe("depth");
    expect(missing.error).toMatch(/depth/i);

    const withDepth = convertUniversal(50, "area-m2", "vol-m3", {
      depthM: 0.1,
    });
    expect(withDepth.value).toBeCloseTo(5, 9);
    expect(withDepth.explanation).toMatch(/depth used/i);

    const backwards = convertUniversal(5, "vol-m3", "area-m2", { depthM: 0.1 });
    expect(backwards.value).toBeCloseTo(50, 9);
  });

  it("crosses volume and weight only with a density", () => {
    const missing = convertUniversal(1000, "vol-l", "mass-kg");
    expect(missing.value).toBeNull();
    expect(missing.needs).toBe("density");

    expect(
      convertUniversal(1000, "vol-l", "mass-kg", { densityKgM3: 1000 }).value,
    ).toBeCloseTo(1000, 9);
    expect(
      convertUniversal(20, "mass-tonne", "vol-m3", { densityKgM3: 1600 }).value,
    ).toBeCloseTo(12.5, 9);
    expect(
      convertUniversal(1, "vol-m3", "mass-tonne", { densityKgM3: 1650 }).value,
    ).toBeCloseTo(1.65, 9);
  });

  it("refuses pairs that measure different things", () => {
    const result = convertUniversal(5, "len-ft", "mass-kg");
    expect(result.value).toBeNull();
    expect(result.error).toBeTruthy();
    expect(convertUniversal(5, "volume-nonsense", "len-m").error).toBeTruthy();
  });

  it("handles zero, and rejects negative amounts", () => {
    expect(convertUniversal(0, "len-ft", "len-m").value).toBe(0);
    expect(convertUniversal(-2, "len-ft", "len-m").value).toBeNull();
  });
});
