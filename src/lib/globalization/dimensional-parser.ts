import type { ExtendedLengthUnit } from "@/lib/measurement/extended-units";
export interface DimensionalParseOptions {
  defaultUnit: ExtendedLengthUnit;
  allowNegative?: boolean;
  minMm?: number;
  maxMm?: number;
}
export type DimensionalParseResult =
  | {
      ok: true;
      original: string;
      millimeters: number;
      parsedUnit: string;
      usedDefaultUnit: boolean;
      warnings: string[];
    }
  | { ok: false; original: string; errors: string[]; incomplete: boolean };
const FACTORS: Record<string, number> = {
  mm: 1,
  yd: 914.4,
  yard: 914.4,
  yards: 914.4,
  km: 1000000,
  kilometer: 1000000,
  kilometers: 1000000,
  mi: 1609344,
  mile: 1609344,
  miles: 1609344,
  millimeter: 1,
  millimeters: 1,
  cm: 10,
  centimeter: 10,
  centimeters: 10,
  m: 1000,
  meter: 1000,
  meters: 1000,
  in: 25.4,
  inch: 25.4,
  inches: 25.4,
  '"': 25.4,
  ft: 304.8,
  foot: 304.8,
  feet: 304.8,
  "'": 304.8,
};
const UNIT: Record<ExtendedLengthUnit, string> = {
  millimeters: "mm",
  centimeters: "cm",
  meters: "m",
  inches: "in",
  feet: "ft",
  yards: "yd",
  kilometers: "km",
  miles: "mi",
};
function parseNumber(text: string): number | null {
  const s = text.trim();
  const mixed = s.match(/^([+-]?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  const fraction = s.match(/^([+-]?\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const whole = Number(mixed[1]),
      n = Number(mixed[2]),
      d = Number(mixed[3]);
    return d > 0 && n < d ? Math.sign(whole) * (Math.abs(whole) + n / d) : null;
  }
  if (fraction) {
    const n = Number(fraction[1]),
      d = Number(fraction[2]);
    return d > 0 && Math.abs(n) < d ? n / d : null;
  }
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
export function parseDimensionalInput(
  input: string,
  options: DimensionalParseOptions,
): DimensionalParseResult {
  const original = input,
    text = input
      .trim()
      .toLowerCase()
      .replace(/\u2044/g, "/");
  const fail = (
    message: string,
    incomplete = false,
  ): DimensionalParseResult => ({
    ok: false,
    original,
    errors: [message],
    incomplete,
  });
  if (!text) return fail("Enter a measurement.", true);
  if (/[\d],[\d]/.test(text))
    return fail(
      "Use a decimal point; comma decimal separators are ambiguous here.",
    );
  if (/\/$/.test(text)) return fail("Complete the fraction denominator.", true);
  let mm = 0,
    parsedUnit: string[] = [],
    usedDefaultUnit = false;
  const feetMatch = text.match(/^([^']+)\s*'\s*(.*?)\s*(?:"|in|inch|inches)?$/);
  if (feetMatch) {
    const feet = parseNumber(feetMatch[1]);
    if (feet === null) return fail("Feet value is malformed.");
    const inchText = feetMatch[2].trim();
    let inches = 0;
    if (inchText) {
      const parsed = parseNumber(inchText);
      if (parsed === null) return fail("Inches value is malformed.");
      if (parsed < 0 || parsed >= 12)
        return fail(
          "In feet-and-inches notation, inches must be from 0 up to (but not including) 12.",
        );
      inches = parsed;
    }
    mm = feet * 304.8 + inches * 25.4;
    parsedUnit = ["ft", ...(inchText ? ["in"] : [])];
  } else {
    const parts: Array<{ n: number; unit: string }> = [];
    const re =
      /([+-]?(?:\d+\s+\d+\s*\/\s*\d+|\d+\s*\/\s*\d+|\d+(?:\.\d*)?|\.\d+))\s*(millimeters?|mm|centimeters?|cm|meters?|m|inches?|inch|in|feet|foot|ft|['"])/gy;
    let pos = 0;
    while (pos < text.length) {
      while (text[pos] === " ") pos++;
      re.lastIndex = pos;
      const match = re.exec(text);
      if (!match) break;
      const n = parseNumber(match[1]);
      let unit = match[2];
      if (unit === "'") unit = "ft";
      if (unit === '"') unit = "in";
      if (n === null || !FACTORS[unit])
        return fail("Measurement contains a malformed number or fraction.");
      parts.push({
        n,
        unit:
          unit.startsWith("foot") || unit === "feet"
            ? "ft"
            : unit.startsWith("inch") || unit === "inches"
              ? "in"
              : unit,
      });
      pos = re.lastIndex;
    }
    const tail = text.slice(pos).trim();
    if (parts.length && !tail) {
      if (new Set(parts.map((part) => part.unit)).size !== parts.length)
        return fail("A unit is repeated; enter each measurement unit once.");
      if (parts.some((part) => part.n < 0) && !options.allowNegative)
        return fail("Negative dimensions are not allowed.");
      mm = parts.reduce((sum, part) => sum + part.n * FACTORS[part.unit], 0);
      parsedUnit = parts.map((part) => part.unit);
    } else {
      const match = text.match(
        /^([+-]?(?:\d+\s+\d+\s*\/\s*\d+|\d+\s*\/\s*\d+|\d+(?:\.\d*)?|\.\d+))\s*([a-z"]+)?$/,
      );
      if (!match)
        return fail(
          "Use a number with an optional unit (for example 2500 mm, 2.5 m, or 5 7/8 in).",
          /^[+-]?(?:\d+\s*)?$/.test(text),
        );
      const n = parseNumber(match[1]);
      if (n === null) return fail("The measurement or fraction is invalid.");
      const rawUnit = match[2] ?? "";
      if (rawUnit && !FACTORS[rawUnit])
        return fail(`Unsupported unit: ${rawUnit}.`);
      const unit = rawUnit.replace(/s$/, "");
      if (n < 0 && !options.allowNegative)
        return fail("Negative dimensions are not allowed.");
      const factor = rawUnit
        ? FACTORS[rawUnit]
        : (
            {
              millimeters: 1,
              centimeters: 10,
              meters: 1000,
              inches: 25.4,
              feet: 304.8,
              yards: 914.4,
              kilometers: 1000000,
              miles: 1609344,
            } as Record<ExtendedLengthUnit, number>
          )[options.defaultUnit];
      mm = n * factor;
      parsedUnit = [unit || UNIT[options.defaultUnit]];
      usedDefaultUnit = !rawUnit;
    }
  }
  if (mm < 0 && !options.allowNegative)
    return fail("Negative dimensions are not allowed.");
  if (!Number.isFinite(mm)) return fail("Measurement must be finite.");
  if (options.minMm !== undefined && mm < options.minMm)
    return fail(`Measurement must be at least ${options.minMm} mm.`);
  if (options.maxMm !== undefined && mm > options.maxMm)
    return fail(`Measurement must not exceed ${options.maxMm} mm.`);
  return {
    ok: true,
    original,
    millimeters: mm,
    parsedUnit: parsedUnit.join(" + "),
    usedDefaultUnit,
    warnings: [],
  };
}
