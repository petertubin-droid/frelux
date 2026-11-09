/**
 * Dimension string reader.
 *
 * Plan text extracted from a PDF arrives as annotations, not as geometry:
 * "3600 x 4200", "3.60 x 4.20 m", "3,60 x 4,20", sometimes with the unit on the
 * next span. This reads those strings into numbers and states what it assumed.
 *
 * The reader is deliberately conservative. A pair is returned only when both
 * dimensions are plausible for a building element, and the unit is reported so
 * a review screen can show what was taken from the drawing rather than what was
 * guessed. Nothing here invents a third dimension or a scale.
 */

import type { LengthUnit, Opening } from "./types";

export interface DimensionPair {
  raw: string;
  length: number;
  width: number;
  unit: LengthUnit;
  /** The unit was inferred from magnitude rather than read from the text. */
  unitInferred: boolean;
}

export interface DimensionParseResult {
  pairs: DimensionPair[];
  /** Numbers that looked like single dimensions rather than pairs. */
  singles: { raw: string; value: number; unit: LengthUnit }[];
  rejected: string[];
}

const NUMBER = String.raw`\d+(?:[.,]\d+)?`;
const SEPARATOR = String.raw`\s*(?:x|×|\*|by)\s*`;
const UNIT = String.raw`\s*(mm|cm|m|ft|in|'|")?\b`;

const PAIR_RE = new RegExp(
  String.raw`(${NUMBER})\s*(mm|cm|m|ft|in|'|")?${SEPARATOR}(${NUMBER})${UNIT}`,
  "gi",
);

const UNIT_MAP: Record<string, LengthUnit> = {
  mm: "mm",
  cm: "mm",
  m: "m",
  ft: "ft",
  "'": "ft",
  in: "in",
  '"': "in",
};

/** Below this a value cannot be a building dimension in metres. */
const MIN_METRES = 0.1;
/** Above this a value cannot be a building dimension in millimetres. */
const MAX_MM = 100_000;

const normaliseNumber = (value: string): number =>
  Number(value.replace(",", "."));

/**
 * A value of 100 or more in an unlabelled pair is read as millimetres, because
 * no room in a building is 900 metres long and no wall is 3.6 millimetres.
 */
const inferUnit = (
  length: number,
  width: number,
  stated: string | undefined,
): { unit: LengthUnit; inferred: boolean } => {
  if (stated) {
    const mapped = UNIT_MAP[stated.toLowerCase()];
    if (mapped) {
      if (stated.toLowerCase() === "cm") return { unit: "m", inferred: false };
      return { unit: mapped, inferred: false };
    }
  }
  const largest = Math.max(length, width);
  if (largest >= 100) return { unit: "mm", inferred: true };
  return { unit: "m", inferred: true };
};

const toMillimetres = (value: number, unit: LengthUnit): number => {
  switch (unit) {
    case "mm":
      return value;
    case "m":
      return value * 1000;
    case "ft":
      return value * 304.8;
    case "in":
      return value * 25.4;
    default:
      return value;
  }
};

export function parseDimensions(text: string): DimensionParseResult {
  const pairs: DimensionPair[] = [];
  const singles: { raw: string; value: number; unit: LengthUnit }[] = [];
  const rejected: string[] = [];
  if (!text) return { pairs, singles, rejected };

  for (const match of text.matchAll(PAIR_RE)) {
    const raw = match[0].trim();
    const statedFirst = match[2];
    const statedSecond = match[4];
    const unitKey = (statedSecond ?? statedFirst)?.toLowerCase();
    const stated = unitKey === "cm" ? "cm" : unitKey;

    // "3.6 m x 4.2" gives centimetres only for the first value; resolve each
    // side separately, then require they agree.
    let lengthValue = normaliseNumber(match[1]);
    let widthValue = normaliseNumber(match[3]);
    const statedLengthUnit = statedFirst
      ? UNIT_MAP[statedFirst.toLowerCase()]
      : undefined;
    const statedWidthUnit = statedSecond
      ? UNIT_MAP[statedSecond.toLowerCase()]
      : undefined;

    if (statedFirst?.toLowerCase() === "cm") lengthValue = lengthValue * 10;
    if (statedSecond?.toLowerCase() === "cm") widthValue = widthValue * 10;

    const { unit, inferred } = inferUnit(lengthValue, widthValue, stated);
    const effectiveLengthUnit = statedLengthUnit ?? unit;
    const effectiveWidthUnit = statedWidthUnit ?? unit;

    const lengthMm = toMillimetres(lengthValue, effectiveLengthUnit);
    const widthMm = toMillimetres(widthValue, effectiveWidthUnit);

    const plausible =
      lengthMm >= MIN_METRES * 1000 &&
      widthMm >= MIN_METRES * 1000 &&
      lengthMm <= MAX_MM &&
      widthMm <= MAX_MM;

    if (!plausible) {
      rejected.push(raw);
      continue;
    }

    pairs.push({
      raw,
      length: round3(lengthMm / 1000),
      width: round3(widthMm / 1000),
      unit: "m",
      unitInferred: inferred,
    });
  }

  // A single annotated dimension (a wall length on its own) is useful, but only
  // when it did not already belong to a pair.
  const pairSpans = new Set(pairs.map((pair) => pair.raw));
  const SINGLE_RE = new RegExp(
    String.raw`(?<![\d.,x×*])(${NUMBER})\s*(mm|cm|m)?(?![\d.,])`,
    "gi",
  );
  for (const match of text.matchAll(SINGLE_RE)) {
    const raw = match[0].trim();
    if (pairSpans.has(raw) || raw.length < 2) continue;
    const value = normaliseNumber(match[1]);
    const stated = match[2]?.toLowerCase();
    const unit: LengthUnit = stated
      ? stated === "cm"
        ? "m"
        : (UNIT_MAP[stated] ?? "m")
      : value >= 100
        ? "mm"
        : "m";
    const valueMm = toMillimetres(stated === "cm" ? value * 10 : value, unit);
    if (valueMm < MIN_METRES * 1000 || valueMm > MAX_MM) continue;
    singles.push({ raw, value: round3(valueMm / 1000), unit: "m" });
  }

  return { pairs, singles, rejected };
}

const round3 = (value: number): number => Math.round(value * 1000) / 1000;

const OPENING_WORDS = ["door", "window", "opening", "gate", "arch", "shutter"];

/**
 * Reads opening annotations such as "Door D2 900 x 2100" into openings. An
 * opening without a readable label is still returned, because the size is the
 * part that matters for a deduction; the label is cosmetic.
 */
export function parseOpenings(text: string): Opening[] {
  const openings: Opening[] = [];
  if (!text) return openings;

  const segments = text.split(/[\n;]+/);
  let index = 0;
  for (const segment of segments) {
    const lower = segment.toLowerCase();
    if (!OPENING_WORDS.some((word) => lower.includes(word))) continue;
    const { pairs } = parseDimensions(segment);
    for (const pair of pairs) {
      index += 1;
      const labelMatch = segment.match(/\b([A-Z]{1,3}\d{1,3})\b/);
      openings.push({
        id: `opening-${index}`,
        label: labelMatch?.[1] ?? segment.trim().slice(0, 40),
        width: pair.length,
        height: pair.width,
        unit: "m",
      });
    }
  }
  return openings;
}
