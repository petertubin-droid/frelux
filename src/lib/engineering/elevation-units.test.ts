/**
 * Guards for the elevation page's presentation units.
 *
 * The conversions are the whole point of the module, so they are tested against
 * the exact factors rather than against themselves: 3.048 m is definitionally
 * 10 ft, one square metre is 10.76391 square feet, one cubic metre is
 * 35.314666 cubic feet and one kilogram is 2.2046226 pounds.
 *
 * The CSV and summary tests pin the two honesty rules that are easy to lose in a
 * refactor: quantities are converted with the same rules the page shows, and any
 * text that travels without the amber notice must still say the figures are not a
 * design check.
 */

import { describe, expect, it } from "vitest";
import {
  buildElevationCsvRows,
  buildElevationSummaryLines,
  buildElevationSummaryText,
  cubicMetresToFeet,
  feetToMetres,
  formatMeasure,
  kilogramsToPounds,
  lengthForDisplay,
  lengthFromDisplay,
  lengthStep,
  lengthUnitLabel,
  metresToFeet,
  squareMetresToFeet,
} from "./elevation-units";
import {
  calculateMathematicalElevation,
  DEFAULT_PLAN_INPUT,
} from "./mathematical-elevation-engine";

const result = calculateMathematicalElevation(DEFAULT_PLAN_INPUT);

describe("elevation unit conversions", () => {
  it("converts the three length, area and volume factors exactly", () => {
    expect(metresToFeet(3.048)).toBeCloseTo(10, 10);
    expect(feetToMetres(10)).toBeCloseTo(3.048, 10);
    expect(squareMetresToFeet(1)).toBeCloseTo(10.76391, 5);
    expect(cubicMetresToFeet(1)).toBeCloseTo(35.314666, 5);
    expect(kilogramsToPounds(1)).toBeCloseTo(2.2046226, 6);
  });

  it("round trips a user-typed length through the input boundary", () => {
    const entered = 32.5;
    const metres = lengthFromDisplay(entered, "imperial");
    expect(lengthForDisplay(metres, "imperial")).toBeCloseTo(entered, 10);
    // The engine must never see feet.
    expect(metres).toBeCloseTo(9.906, 3);
  });

  it("leaves metric mode untouched in both directions", () => {
    expect(lengthForDisplay(9.906, "metric")).toBe(9.906);
    expect(lengthFromDisplay(9.906, "metric")).toBe(9.906);
    expect(lengthUnitLabel("metric")).toBe("m");
    expect(lengthUnitLabel("imperial")).toBe("ft");
    expect(lengthStep("metric", 0.1)).toBe(0.1);
    expect(lengthStep("imperial", 0.1)).toBeCloseTo(0.33, 2);
  });
});

describe("formatMeasure", () => {
  it("formats each supported measure in both systems", () => {
    expect(formatMeasure(3.048, "m", "metric").text).toBe("3.05 m");
    expect(formatMeasure(3.048, "m", "imperial").text).toBe("10.00 ft");
    expect(formatMeasure(1, "m2", "imperial").text).toBe("10.76 sq ft");
    expect(formatMeasure(1, "m3", "imperial").text).toBe("35.31 cu ft");
    expect(formatMeasure(1, "kg", "imperial").text).toBe("2.20 lb");
    // The engine writes both ASCII and superscript suffixes.
    expect(formatMeasure(1, "m²", "imperial").unit).toBe("sq ft");
    expect(formatMeasure(1, "m³", "metric").unit).toBe("m³");
  });

  it("keeps engineering units in SI rather than inventing a conversion", () => {
    const pressure = formatMeasure(150, "kPa", "imperial");
    expect(pressure.unit).toBe("kPa");
    expect(pressure.text).toBe("150.00 kPa");
    expect(formatMeasure(30, "m/s", "imperial").text).toBe("30.00 m/s");
  });

  it("says not entered instead of printing a fabricated zero", () => {
    expect(formatMeasure(null, "m", "metric").text).toBe("not assessed");
    expect(formatMeasure(Number.NaN, "m", "metric").text).toBe("not entered");
    expect(formatMeasure(Number.POSITIVE_INFINITY, "m3", "imperial").text).toBe(
      "not entered",
    );
  });
});

describe("buildElevationCsvRows", () => {
  it("emits one row per scheduled material with converted quantities", () => {
    const metric = buildElevationCsvRows(result, "metric");
    const imperial = buildElevationCsvRows(result, "imperial");
    expect(metric.length).toBe(result.five_d_bim.materials.length);
    expect(imperial.length).toBe(metric.length);

    const metricConcrete = metric.find(
      (row) => row.unit === "m3" || row.unit === "m³",
    );
    const imperialConcrete = imperial.find((row) => row.unit === "cu ft");
    expect(metricConcrete).toBeDefined();
    expect(imperialConcrete).toBeDefined();
    // 1 m3 is 35.314666 ft3, so the imperial figure must be larger.
    expect(
      Number(imperialConcrete!.quantity.replace(/,/g, "")),
    ).toBeGreaterThan(Number(metricConcrete!.quantity.replace(/,/g, "")));
  });

  it("leaves counts and bags alone because they have no imperial equivalent", () => {
    const metric = buildElevationCsvRows(result, "metric");
    const imperial = buildElevationCsvRows(result, "imperial");
    const metricBlocks = metric.filter((row) =>
      row.item.toLowerCase().includes("block"),
    );
    for (const row of metricBlocks) {
      const same = imperial.find((other) => other.item === row.item);
      expect(same?.quantity).toBe(row.quantity);
      expect(same?.unit).toBe(row.unit);
    }
  });

  it("adds a totals row only when a rate was entered", () => {
    expect(
      buildElevationCsvRows(result, "metric").some(
        (row) => row.level === "Total",
      ),
    ).toBe(false);

    const first = result.five_d_bim.materials[0];
    const rows = buildElevationCsvRows(
      result,
      "metric",
      { [first.item]: 10 },
      "NGN",
    );
    const total = rows[rows.length - 1];
    expect(total.level).toBe("Total");
    expect(total.unit).toBe("NGN");
    expect(total.item).toContain("1 of");
    expect(Number(total.amount.replace(/,/g, ""))).toBeCloseTo(
      first.quantity * 10,
      2,
    );
  });
});

describe("buildElevationSummaryLines", () => {
  it("states the unit system and the assumption boundary", () => {
    const imperial = buildElevationSummaryText(result, "imperial");
    expect(imperial).toContain("Imperial display");
    expect(imperial).toContain("pressure, wind speed and line load stay SI");
    expect(imperial).toContain("ft");
    expect(imperial).toContain("Not a design check");
    expect(imperial).toContain("no structural design");
    // The page's own prohibitions must survive into the exported text.
    expect(imperial.toLowerCase()).toContain(
      "quantities are simplified illustrations",
    );
    expect(imperial).not.toContain("—");
  });

  it("names every level so a reader can match the page", () => {
    const lines = buildElevationSummaryLines(result, "metric");
    for (const level of [
      "L1 Foundation",
      "L2 Ground slab",
      "L3 Walls",
      "L4 Ring beam",
      "L5 Roof",
    ]) {
      expect(lines.some((line) => line.startsWith(level))).toBe(true);
    }
    expect(lines.some((line) => line.startsWith("Indicative totals:"))).toBe(
      true,
    );
    expect(
      lines.some((line) => line.includes("Programme: not estimated")),
    ).toBe(true);
  });

  it("reports screening flags it actually raised, and none when clean", () => {
    const clean = buildElevationSummaryLines(result, "metric");
    const flagLines = clean.filter((line) => line.startsWith("Flag:"));
    expect(flagLines.length).toBe(result.discrepancies.length);
    for (const flag of result.discrepancies) {
      expect(flagLines.some((line) => line.includes(flag.title))).toBe(true);
    }
    expect(clean.some((line) => line.startsWith("Screening flags:"))).toBe(
      true,
    );
  });
});
