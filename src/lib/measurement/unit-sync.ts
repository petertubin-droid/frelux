// =========================================================
// Global unit synchronisation
//
// One rule, applied everywhere: a measurement belongs to the person entering
// it, not to the calculator. Switching feet to metres changes the label and
// the number on screen, never the wall being measured. Every calculator then
// works in SI, so two people entering the same room in different units get
// the same material list.
//
// Conversions reuse the exact constants already defined in
// src/lib/measurement/units.ts and src/lib/convert/units.ts instead of
// restating them, so there is one place where a factor can be wrong.
// =========================================================

import {
  AREA_LABELS,
  AREA_TO_M2,
  LENGTH_TO_M,
  MASS_LABELS,
  MASS_TO_KG,
  VOLUME_LABELS,
  VOLUME_TO_L,
  type AreaUnit,
  type LengthUnit as ConvertLengthUnit,
  type MassUnit,
  type VolumeUnit,
} from "@/lib/convert/units";
import {
  IMPERIAL_LENGTH_UNITS,
  METRIC_LENGTH_UNITS,
  fromMeters,
  lengthUnitShort,
  lengthUnitSystem,
  toMeters,
  type LengthUnit,
} from "./units";

export type UnitSystem = "metric" | "imperial";

/** Every dimension the engine converts. Mixing them is refused, never guessed. */
export type Dimension = "length" | "area" | "volume" | "mass";

export interface UnitDescriptor {
  unit: ConvertLengthUnit | AreaUnit | VolumeUnit | MassUnit;
  dimension: Dimension;
  system: UnitSystem;
  label: string;
  short: string;
  /** How many SI base units one of this unit is worth. */
  factor: number;
  /** SI base unit for the dimension, for display of normalised values. */
  si: string;
}

const METRIC_AREA: AreaUnit[] = ["mm2", "cm2", "m2", "hectare"];
const IMPERIAL_AREA: AreaUnit[] = ["ft2", "yd2", "acre"];
const METRIC_VOLUME: VolumeUnit[] = ["ml", "l", "m3"];
const IMPERIAL_VOLUME: VolumeUnit[] = ["ft3", "gal_us", "gal_imp"];
const METRIC_MASS: MassUnit[] = ["g", "kg", "tonne"];
const IMPERIAL_MASS: MassUnit[] = ["lb", "ton_us", "ton_imp"];

const AREA_SHORT: Record<AreaUnit, string> = {
  mm2: "mm²",
  cm2: "cm²",
  m2: "m²",
  ft2: "ft²",
  yd2: "yd²",
  acre: "ac",
  hectare: "ha",
};

const VOLUME_SHORT: Record<VolumeUnit, string> = {
  ml: "ml",
  l: "L",
  m3: "m³",
  ft3: "ft³",
  gal_us: "US gal",
  gal_imp: "imp gal",
};

const MASS_SHORT: Record<MassUnit, string> = {
  g: "g",
  kg: "kg",
  tonne: "t",
  lb: "lb",
  ton_us: "US ton",
  ton_imp: "imp ton",
};

const SI_BASE: Record<Dimension, string> = {
  length: "m",
  area: "m²",
  volume: "L",
  mass: "kg",
};

function descriptors(): UnitDescriptor[] {
  const all: UnitDescriptor[] = [];
  const push = (
    units: readonly string[],
    dimension: Dimension,
    system: UnitSystem,
    factors: Record<string, number>,
    labels: Record<string, string>,
    shorts: Record<string, string>,
  ) => {
    units.forEach((unit) => {
      all.push({
        unit: unit as UnitDescriptor["unit"],
        dimension,
        system,
        label: labels[unit] ?? unit,
        short: shorts[unit] ?? unit,
        factor: factors[unit],
        si: SI_BASE[dimension],
      });
    });
  };

  const lengthFactors = LENGTH_TO_M as Record<string, number>;
  const lengthLabels = Object.fromEntries(
    (Object.keys(LENGTH_TO_M) as ConvertLengthUnit[]).map((unit) => [
      unit,
      unit,
    ]),
  ) as Record<string, string>;
  const lengthShorts = {
    mm: "mm",
    cm: "cm",
    m: "m",
    km: "km",
    in: "in",
    ft: "ft",
    yd: "yd",
    mi: "mi",
  } as Record<string, string>;
  push(
    LENGTH_ENTRY_UNITS.filter((u) => u.system === "metric").map((u) => u.unit),
    "length",
    "metric",
    lengthFactors,
    lengthLabels,
    lengthShorts,
  );
  push(
    LENGTH_ENTRY_UNITS.filter((u) => u.system === "imperial").map(
      (u) => u.unit,
    ),
    "length",
    "imperial",
    lengthFactors,
    lengthLabels,
    lengthShorts,
  );

  push(
    METRIC_AREA,
    "area",
    "metric",
    AREA_TO_M2 as Record<string, number>,
    AREA_LABELS as Record<string, string>,
    AREA_SHORT,
  );
  push(
    IMPERIAL_AREA,
    "area",
    "imperial",
    AREA_TO_M2 as Record<string, number>,
    AREA_LABELS as Record<string, string>,
    AREA_SHORT,
  );
  push(
    METRIC_VOLUME,
    "volume",
    "metric",
    VOLUME_TO_L as Record<string, number>,
    VOLUME_LABELS as Record<string, string>,
    VOLUME_SHORT,
  );
  push(
    IMPERIAL_VOLUME,
    "volume",
    "imperial",
    VOLUME_TO_L as Record<string, number>,
    VOLUME_LABELS as Record<string, string>,
    VOLUME_SHORT,
  );
  push(
    METRIC_MASS,
    "mass",
    "metric",
    MASS_TO_KG as Record<string, number>,
    MASS_LABELS as Record<string, string>,
    MASS_SHORT,
  );
  push(
    IMPERIAL_MASS,
    "mass",
    "imperial",
    MASS_TO_KG as Record<string, number>,
    MASS_LABELS as Record<string, string>,
    MASS_SHORT,
  );

  return all;
}

/** The entry units the interface offers, keyed to the convert module codes. */
const LENGTH_ENTRY_UNITS: { unit: ConvertLengthUnit; system: UnitSystem }[] = [
  { unit: "mm", system: "metric" },
  { unit: "cm", system: "metric" },
  { unit: "m", system: "metric" },
  { unit: "km", system: "metric" },
  { unit: "in", system: "imperial" },
  { unit: "ft", system: "imperial" },
  { unit: "yd", system: "imperial" },
  { unit: "mi", system: "imperial" },
];

export const UNIT_CATALOG: UnitDescriptor[] = descriptors();

export function findUnit(unit: string): UnitDescriptor | null {
  return UNIT_CATALOG.find((entry) => entry.unit === unit) ?? null;
}

export function unitsFor(
  dimension: Dimension,
  system?: UnitSystem,
): UnitDescriptor[] {
  return UNIT_CATALOG.filter(
    (entry) =>
      entry.dimension === dimension && (!system || entry.system === system),
  );
}

/**
 * Converts a value within one dimension. Refuses to mix dimensions rather than
 * inventing a density or a depth, which is the mistake that produces confident
 * nonsense in construction estimating.
 */
export function convertUnitValue(
  value: number,
  from: string,
  to: string,
): number {
  if (!Number.isFinite(value))
    throw new Error("Cannot convert a non-numeric value.");
  const source = findUnit(from);
  const target = findUnit(to);
  if (!source || !target)
    throw new Error(`Unknown unit: ${source ? to : from}`);
  if (source.dimension !== target.dimension) {
    throw new Error(
      `Cannot convert ${source.dimension} to ${target.dimension} without a rate.`,
    );
  }
  return (value * source.factor) / target.factor;
}

/** Value expressed in the dimension's SI base unit. */
export function toSIVolumeOrBase(
  value: number,
  from: string,
): { value: number; si: string } {
  const source = findUnit(from);
  if (!source) throw new Error(`Unknown unit: ${from}`);
  return { value: value * source.factor, si: source.si };
}

/** Switching systems keeps the physical quantity, not the typed number. */
export function switchUnit(value: number, from: string, to: string): number {
  if (from === to) return value;
  return convertUnitValue(value, from, to);
}

/**
 * The unit that represents a system for a dimension. Used when a visitor flips
 * the global metric/imperial preference and every field follows.
 */
export function preferredUnit(
  system: UnitSystem,
  dimension: Dimension,
): string {
  const table: Record<Dimension, Record<UnitSystem, string>> = {
    length: { metric: "m", imperial: "ft" },
    area: { metric: "m2", imperial: "ft2" },
    volume: { metric: "l", imperial: "gal_us" },
    mass: { metric: "kg", imperial: "lb" },
  };
  return table[dimension][system];
}

/** Rewrites an entry's numbers when its unit changes, so the wall stays put. */
export function convertEntryDimensions<
  T extends {
    length: number;
    width?: number;
    height?: number;
    depth?: number;
    unit: LengthUnit;
  },
>(entry: T, nextUnit: LengthUnit): T {
  if (entry.unit === nextUnit) return entry;
  const convert = (value: number | undefined) =>
    value === undefined || !Number.isFinite(value)
      ? value
      : fromMeters(toMeters(value, entry.unit), nextUnit);
  return {
    ...entry,
    unit: nextUnit,
    length: convert(entry.length) as number,
    ...(entry.width === undefined
      ? {}
      : { width: convert(entry.width) as number }),
    ...(entry.height === undefined
      ? {}
      : { height: convert(entry.height) as number }),
    ...(entry.depth === undefined
      ? {}
      : { depth: convert(entry.depth) as number }),
  };
}

/** Grouped options for a select, metric first then imperial. */
export function groupedLengthUnitOptions(): {
  metric: { unit: LengthUnit; label: string; short: string }[];
  imperial: { unit: LengthUnit; label: string; short: string }[];
} {
  const shape = (unit: LengthUnit) => ({
    unit,
    label: lengthUnitLabelSafe(unit),
    short: lengthUnitShort(unit),
  });
  return {
    metric: METRIC_LENGTH_UNITS.map(shape),
    imperial: IMPERIAL_LENGTH_UNITS.map(shape),
  };
}

function lengthUnitLabelSafe(unit: LengthUnit): string {
  const descriptor = findUnit(unitToConvertCode(unit));
  return descriptor
    ? descriptor.label.length <= 3
      ? descriptor.short
      : descriptor.label
    : unit;
}

/** Maps the measurement-layer unit names to the convert module codes. */
export function unitToConvertCode(unit: LengthUnit): ConvertLengthUnit {
  const map: Record<LengthUnit, ConvertLengthUnit> = {
    millimeters: "mm",
    centimeters: "cm",
    meters: "m",
    kilometers: "km",
    inches: "in",
    feet: "ft",
    yards: "yd",
    miles: "mi",
  };
  return map[unit];
}

/** Which system an entry unit belongs to. */
export function systemOfEntryUnit(unit: LengthUnit): UnitSystem {
  return lengthUnitSystem(unit);
}

/** The unit a country's preference suggests for entry fields. */
export function entryUnitForSystem(system: UnitSystem): LengthUnit {
  return system === "imperial" ? "feet" : "meters";
}

/** Copy-ready text, e.g. "6.096 m (20 ft)". */
export function copyMeasurement(
  value: number,
  unit: string,
  digits = 3,
): string {
  const descriptor = findUnit(unit);
  if (!descriptor) return `${value} ${unit}`;
  const rounded = Number(value.toFixed(digits));
  return `${rounded} ${descriptor.short}`;
}
