// =========================================================
// Construction measurement conversion
//
// Every constant here is an exact legal or defined value, not a rounded
// convenience: an inch is 0.0254 m, a US gallon is 3.785411784 L, an acre is
// 4046.8564224 m². Conversions run in the base unit (metres, square metres,
// litres, kilograms) so a chain of conversions never compounds rounding.
//
// Weight and volume are deliberately NOT interchangeable without a material
// density. "Tonnes to bags" is meaningless until you say which material and
// how heavy one bag is, so those helpers require both and never assume.
// =========================================================

export type LengthUnit = "mm" | "cm" | "m" | "km" | "in" | "ft" | "yd";
export type AreaUnit =
  "mm2" | "cm2" | "m2" | "ft2" | "yd2" | "acre" | "hectare";
export type VolumeUnit = "ml" | "l" | "m3" | "ft3" | "gal_us" | "gal_imp";
export type MassUnit = "g" | "kg" | "tonne" | "lb" | "ton_us" | "ton_imp";

export const LENGTH_TO_M: Record<LengthUnit, number> = {
  mm: 0.001,
  cm: 0.01,
  m: 1,
  km: 1000,
  in: 0.0254,
  ft: 0.3048,
  yd: 0.9144,
};

export const AREA_TO_M2: Record<AreaUnit, number> = {
  mm2: 0.000001,
  cm2: 0.0001,
  m2: 1,
  ft2: 0.09290304,
  yd2: 0.83612736,
  acre: 4046.8564224,
  hectare: 10000,
};

export const VOLUME_TO_L: Record<VolumeUnit, number> = {
  ml: 0.001,
  l: 1,
  m3: 1000,
  ft3: 28.316846592,
  gal_us: 3.785411784,
  gal_imp: 4.54609,
};

export const MASS_TO_KG: Record<MassUnit, number> = {
  g: 0.001,
  kg: 1,
  tonne: 1000,
  lb: 0.45359237,
  ton_us: 907.18474,
  ton_imp: 1016.0469088,
};

export const LENGTH_LABELS: Record<LengthUnit, string> = {
  mm: "Millimetres (mm)",
  cm: "Centimetres (cm)",
  m: "Metres (m)",
  km: "Kilometres (km)",
  in: "Inches (in)",
  ft: "Feet (ft)",
  yd: "Yards (yd)",
};

export const AREA_LABELS: Record<AreaUnit, string> = {
  mm2: "Square millimetres (mm²)",
  cm2: "Square centimetres (cm²)",
  m2: "Square metres (m²)",
  ft2: "Square feet (ft²)",
  yd2: "Square yards (yd²)",
  acre: "Acres",
  hectare: "Hectares",
};

export const VOLUME_LABELS: Record<VolumeUnit, string> = {
  ml: "Millilitres (ml)",
  l: "Litres (L)",
  m3: "Cubic metres (m³)",
  ft3: "Cubic feet (ft³)",
  gal_us: "US gallons",
  gal_imp: "Imperial gallons",
};

export const MASS_LABELS: Record<MassUnit, string> = {
  g: "Grams (g)",
  kg: "Kilograms (kg)",
  tonne: "Metric tonnes (t)",
  lb: "Pounds (lb)",
  ton_us: "US short tons",
  ton_imp: "Imperial long tons",
};

/**
 * Reads a number the way a site measurement arrives: possibly empty, possibly
 * with a thousand separator or a stray space. Returns null rather than
 * guessing when the value is not a usable non-negative number.
 */
export function parseMeasurement(
  input: string | number | null | undefined,
): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") {
    return Number.isFinite(input) && input >= 0 ? input : null;
  }
  const cleaned = input.trim().replace(/,/g, "");
  if (cleaned === "") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

function convertWith<T extends string>(
  value: number,
  from: T,
  to: T,
  table: Record<T, number>,
): number | null {
  if (!Number.isFinite(value) || value < 0) return null;
  const fromFactor = table[from];
  const toFactor = table[to];
  if (!fromFactor || !toFactor) return null;
  // Convert into the base unit, then out again. One division, one
  // multiplication, no repeated rounding through intermediate units.
  return (value * fromFactor) / toFactor;
}

export const convertLength = (
  value: number,
  from: LengthUnit,
  to: LengthUnit,
) => convertWith(value, from, to, LENGTH_TO_M);

export const convertArea = (value: number, from: AreaUnit, to: AreaUnit) =>
  convertWith(value, from, to, AREA_TO_M2);

export const convertVolume = (
  value: number,
  from: VolumeUnit,
  to: VolumeUnit,
) => convertWith(value, from, to, VOLUME_TO_L);

export const convertMass = (value: number, from: MassUnit, to: MassUnit) =>
  convertWith(value, from, to, MASS_TO_KG);

/** Feet and inches as one reading, e.g. 5 ft 6 in, which is how tape measures read on site. */
export function feetInchesToMetres(
  feet: number,
  inches: number,
): number | null {
  if (
    !Number.isFinite(feet) ||
    !Number.isFinite(inches) ||
    feet < 0 ||
    inches < 0
  )
    return null;
  return feet * LENGTH_TO_M.ft + inches * LENGTH_TO_M["in"];
}

export function metresToFeetInches(
  metres: number,
): { feet: number; inches: number } | null {
  if (!Number.isFinite(metres) || metres < 0) return null;
  const totalInches = metres / LENGTH_TO_M["in"];
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches - feet * 12;
  return { feet, inches };
}

// ---------------------------------------------------------------- land

export interface PlotSize {
  id: string;
  label: string;
  width: number;
  depth: number;
  unit: "ft" | "m";
}

/**
 * Nigerian plot sizes are local conventions, not a legal unit, so they are
 * presets with their real dimensions stated. 60 x 120 ft is the Lagos
 * standard (often quoted as 648 m² after allowance); 50 x 100 ft is the
 * older mainland size.
 */
export const PLOT_PRESETS: PlotSize[] = [
  {
    id: "50x100ft",
    label: "50 x 100 ft (464.5 m²)",
    width: 50,
    depth: 100,
    unit: "ft",
  },
  {
    id: "60x120ft",
    label: "60 x 120 ft (669 m²)",
    width: 60,
    depth: 120,
    unit: "ft",
  },
  {
    id: "100x100ft",
    label: "100 x 100 ft (929 m²)",
    width: 100,
    depth: 100,
    unit: "ft",
  },
];

/** Area of a measured plot, in square metres and the other area units. */
export function plotAreaM2(
  width: number,
  depth: number,
  unit: "ft" | "m",
): number | null {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(depth) ||
    width <= 0 ||
    depth <= 0
  )
    return null;
  const factor = unit === "ft" ? LENGTH_TO_M.ft : 1;
  return width * factor * depth * factor;
}

export function plotAreaFromPreset(id: string): number | null {
  const preset = PLOT_PRESETS.find((p) => p.id === id);
  if (!preset) return null;
  return plotAreaM2(preset.width, preset.depth, preset.unit);
}

/** How many plots of a given size fit inside a stated land area. */
export function plotsPerAcre(plotArea: number): number | null {
  if (!Number.isFinite(plotArea) || plotArea <= 0) return null;
  return AREA_TO_M2.acre / plotArea;
}

// ---------------------------------------------------------------- materials

export interface MaterialDensity {
  id: string;
  label: string;
  /** Typical loose or solid bulk density in kg per cubic metre. */
  densityKgM3: number;
  /** Typical bag weight used when the material is sold in bags. */
  bagKg?: number;
  note: string;
}

/**
 * Bulk densities are typical values for loose delivered material, not
 * laboratory constants. A supplier's stock, moisture and compaction move them,
 * which is why the tool states the figure it used and lets it be edited.
 */
export const MATERIAL_DENSITIES: MaterialDensity[] = [
  {
    id: "sharp-sand",
    label: "Sharp sand",
    densityKgM3: 1600,
    bagKg: 50,
    note: "Loose, damp river sand as delivered by tipper.",
  },
  {
    id: "plaster-sand",
    label: "Plaster sand",
    densityKgM3: 1520,
    bagKg: 50,
    note: "Finer, screened sand for rendering.",
  },
  {
    id: "granite",
    label: "Granite (chippings)",
    densityKgM3: 1650,
    bagKg: 50,
    note: "Crushed 3/4 inch aggregate, loose.",
  },
  {
    id: "laterite",
    label: "Laterite / filling",
    densityKgM3: 1800,
    bagKg: 50,
    note: "Compacted red earth fill.",
  },
  {
    id: "cement",
    label: "Cement (loose)",
    densityKgM3: 1440,
    bagKg: 50,
    note: "Bulk cement powder; bags are 50 kg in Nigeria.",
  },
  {
    id: "timber-hardwood",
    label: "Timber, hardwood",
    densityKgM3: 900,
    note: "Solid sawn hardwood, air dried.",
  },
  {
    id: "timber-softwood",
    label: "Timber, softwood",
    densityKgM3: 750,
    note: "Solid sawn softwood, air dried.",
  },
  {
    id: "steel",
    label: "Steel",
    densityKgM3: 7850,
    note: "Solid steel, for reference on sections and plate.",
  },
  {
    id: "ballast",
    label: "Ballast / mixed aggregate",
    densityKgM3: 1750,
    bagKg: 50,
    note: "Sand and gravel mix.",
  },
  {
    id: "water",
    label: "Water",
    densityKgM3: 1000,
    note: "For batching reference.",
  },
];

export function findMaterial(id: string): MaterialDensity | null {
  return MATERIAL_DENSITIES.find((m) => m.id === id) ?? null;
}

/** Mass of a volume of a named material. Density must be supplied. */
export function volumeToMassKg(
  volumeM3: number,
  densityKgM3: number,
): number | null {
  if (
    !Number.isFinite(volumeM3) ||
    !Number.isFinite(densityKgM3) ||
    volumeM3 < 0 ||
    densityKgM3 <= 0
  ) {
    return null;
  }
  return volumeM3 * densityKgM3;
}

/** Volume occupied by a mass of a named material. Density must be supplied. */
export function massToVolumeM3(
  massKg: number,
  densityKgM3: number,
): number | null {
  if (
    !Number.isFinite(massKg) ||
    !Number.isFinite(densityKgM3) ||
    massKg < 0 ||
    densityKgM3 <= 0
  ) {
    return null;
  }
  return massKg / densityKgM3;
}

export interface BagResult {
  /** Bags implied by the mass, before rounding up for purchase. */
  exact: number;
  /** Whole bags you would actually order. */
  toBuy: number;
  bagKg: number;
  leftoverKg: number;
}

/**
 * Bags from a mass. Requires the bag weight: a "bag" is 50 kg of cement, but a
 * bag of sand can be anything, so there is no honest default.
 */
export function bagsFromMass(massKg: number, bagKg: number): BagResult | null {
  if (
    !Number.isFinite(massKg) ||
    !Number.isFinite(bagKg) ||
    massKg < 0 ||
    bagKg <= 0
  )
    return null;
  const exact = massKg / bagKg;
  const toBuy = Math.ceil(exact - 1e-9);
  return {
    exact,
    toBuy,
    bagKg,
    leftoverKg: Math.max(0, toBuy * bagKg - massKg),
  };
}

// ---------------------------------------------------------------- paint

export interface BucketPlan {
  sizeLitres: number;
  count: number;
}

export interface PaintBucketResult {
  /** Cheapest-in-litres combination of standard buckets that covers the need. */
  best: BucketPlan[];
  totalLitres: number;
  leftoverLitres: number;
  /** Each bucket size on its own, for suppliers who only stock one size. */
  perSize: { sizeLitres: number; exact: number; toBuy: number }[];
}

/**
 * Paint is sold in 4 L, 10 L and 20 L buckets in Nigeria. Picking the fewest
 * litres you must actually buy beats rounding one size up: 24 L is better
 * served by 20 + 4 than by two 20 L buckets.
 */
export function paintBuckets(
  litres: number,
  sizes: number[] = [20, 10, 4],
): PaintBucketResult | null {
  if (!Number.isFinite(litres) || litres < 0 || sizes.length === 0) return null;
  const ordered = [...sizes].sort((a, b) => b - a);
  const perSize = ordered.map((size) => {
    const exact = size > 0 ? litres / size : 0;
    return { sizeLitres: size, exact, toBuy: Math.ceil(exact - 1e-9) };
  });

  // Search every combination of at most a few buckets per size and keep the
  // plan with the least waste, then the fewest buckets.
  let best: BucketPlan[] = [];
  let bestTotal = Number.POSITIVE_INFINITY;
  let bestCount = Number.POSITIVE_INFINITY;
  const maxPerSize = Math.ceil(litres / Math.min(...ordered)) + 1;

  const walk = (
    index: number,
    remaining: number,
    plan: BucketPlan[],
    total: number,
    count: number,
  ) => {
    if (remaining <= 1e-9) {
      if (
        total < bestTotal - 1e-9 ||
        (Math.abs(total - bestTotal) <= 1e-9 && count < bestCount)
      ) {
        bestTotal = total;
        bestCount = count;
        best = plan.filter((p) => p.count > 0);
      }
      return;
    }
    if (index >= ordered.length) return;
    const size = ordered[index];
    for (let n = 0; n <= maxPerSize; n += 1) {
      const nextTotal = total + n * size;
      if (nextTotal > bestTotal + 1e-9) break;
      walk(
        index + 1,
        remaining - n * size,
        n > 0 ? [...plan, { sizeLitres: size, count: n }] : plan,
        nextTotal,
        count + n,
      );
    }
  };

  walk(0, litres, [], 0, 0);
  return {
    best,
    totalLitres: bestTotal,
    leftoverLitres: Math.max(0, bestTotal - litres),
    perSize,
  };
}

// ---------------------------------------------------------------- roofing

/**
 * Roof area from the plan (footprint) area and pitch. A pitched roof covers
 * more than its footprint by exactly 1 / cos(pitch).
 */
export function roofAreaFromPlan(
  planAreaM2: number,
  pitchDegrees: number,
): number | null {
  if (!Number.isFinite(planAreaM2) || planAreaM2 < 0) return null;
  if (!Number.isFinite(pitchDegrees) || pitchDegrees < 0 || pitchDegrees >= 90)
    return null;
  const radians = (pitchDegrees * Math.PI) / 180;
  return planAreaM2 / Math.cos(radians);
}

/** Pitch in degrees from rise and run measured on site. */
export function roofPitchDegrees(rise: number, run: number): number | null {
  if (!Number.isFinite(rise) || !Number.isFinite(run) || rise < 0 || run <= 0)
    return null;
  return (Math.atan(rise / run) * 180) / Math.PI;
}

// ---------------------------------------------------------------- display

/**
 * Readable output: enough significant digits to be useful, no floating point
 * noise such as 0.30000000000000004, and plain notation for the ranges a site
 * measurement lives in.
 */
export function formatNumber(value: number | null, maxDecimals = 4): string {
  if (value === null || !Number.isFinite(value)) return "n/a";
  if (value === 0) return "0";
  const abs = Math.abs(value);
  if (abs >= 1e12) return value.toExponential(4);
  const rounded = Number(value.toFixed(maxDecimals));
  const text = rounded.toString();
  return text;
}

/** Unit price of paint per litre, useful once a bucket plan is known. */
export function litresPerSqm(
  coverageSqmPerLitre: number,
  coats = 2,
): number | null {
  if (!Number.isFinite(coverageSqmPerLitre) || coverageSqmPerLitre <= 0)
    return null;
  if (!Number.isFinite(coats) || coats <= 0) return null;
  return 1 / (coverageSqmPerLitre * coats);
}

// =========================================================
// Universal conversion
//
// One registry of every unit the tool knows, tagged with the dimension it
// measures, so any unit can be offered against any other. Same-dimension
// conversions are exact. Crossing dimensions is only allowed where the
// arithmetic is honest: a square has one side, a cube has one side, a slab has
// a depth, and a load has a density. Where a missing dimension is required the
// result says which one instead of inventing an answer.
// =========================================================

export type Dimension = "length" | "area" | "volume" | "mass";

export const DIMENSION_LABELS: Record<Dimension, string> = {
  length: "Length",
  area: "Area",
  volume: "Volume",
  mass: "Weight",
};

export interface UniversalUnit {
  id: string;
  label: string;
  dimension: Dimension;
  /** Factor into the dimension's base unit: m, m², L, kg. */
  factor: number;
}

export const UNIVERSAL_UNITS: UniversalUnit[] = [
  {
    id: "len-mm",
    label: "Millimetres (mm)",
    dimension: "length",
    factor: LENGTH_TO_M.mm,
  },
  {
    id: "len-cm",
    label: "Centimetres (cm)",
    dimension: "length",
    factor: LENGTH_TO_M.cm,
  },
  {
    id: "len-m",
    label: "Metres (m)",
    dimension: "length",
    factor: LENGTH_TO_M.m,
  },
  {
    id: "len-km",
    label: "Kilometres (km)",
    dimension: "length",
    factor: LENGTH_TO_M.km,
  },
  {
    id: "len-in",
    label: "Inches (in)",
    dimension: "length",
    factor: LENGTH_TO_M.in,
  },
  {
    id: "len-ft",
    label: "Feet (ft)",
    dimension: "length",
    factor: LENGTH_TO_M.ft,
  },
  {
    id: "len-yd",
    label: "Yards (yd)",
    dimension: "length",
    factor: LENGTH_TO_M.yd,
  },

  {
    id: "area-mm2",
    label: "Square millimetres (mm²)",
    dimension: "area",
    factor: AREA_TO_M2.mm2,
  },
  {
    id: "area-cm2",
    label: "Square centimetres (cm²)",
    dimension: "area",
    factor: AREA_TO_M2.cm2,
  },
  {
    id: "area-m2",
    label: "Square metres (m²)",
    dimension: "area",
    factor: AREA_TO_M2.m2,
  },
  {
    id: "area-ft2",
    label: "Square feet (ft²)",
    dimension: "area",
    factor: AREA_TO_M2.ft2,
  },
  {
    id: "area-yd2",
    label: "Square yards (yd²)",
    dimension: "area",
    factor: AREA_TO_M2.yd2,
  },
  {
    id: "area-acre",
    label: "Acres",
    dimension: "area",
    factor: AREA_TO_M2.acre,
  },
  {
    id: "area-hectare",
    label: "Hectares",
    dimension: "area",
    factor: AREA_TO_M2.hectare,
  },
  {
    id: "area-plot-50x100",
    label: "Plot, 50 x 100 ft",
    dimension: "area",
    factor: 464.5152,
  },
  {
    id: "area-plot-60x120",
    label: "Plot, 60 x 120 ft",
    dimension: "area",
    factor: 668.901888,
  },
  {
    id: "area-plot-100x100",
    label: "Plot, 100 x 100 ft",
    dimension: "area",
    factor: 929.0304,
  },

  {
    id: "vol-ml",
    label: "Millilitres (ml)",
    dimension: "volume",
    factor: VOLUME_TO_L.ml,
  },
  {
    id: "vol-l",
    label: "Litres (L)",
    dimension: "volume",
    factor: VOLUME_TO_L.l,
  },
  {
    id: "vol-m3",
    label: "Cubic metres (m³)",
    dimension: "volume",
    factor: VOLUME_TO_L.m3,
  },
  {
    id: "vol-ft3",
    label: "Cubic feet (ft³)",
    dimension: "volume",
    factor: VOLUME_TO_L.ft3,
  },
  {
    id: "vol-gal-us",
    label: "US gallons",
    dimension: "volume",
    factor: VOLUME_TO_L.gal_us,
  },
  {
    id: "vol-gal-imp",
    label: "Imperial gallons",
    dimension: "volume",
    factor: VOLUME_TO_L.gal_imp,
  },

  { id: "mass-g", label: "Grams (g)", dimension: "mass", factor: MASS_TO_KG.g },
  {
    id: "mass-kg",
    label: "Kilograms (kg)",
    dimension: "mass",
    factor: MASS_TO_KG.kg,
  },
  {
    id: "mass-tonne",
    label: "Metric tonnes (t)",
    dimension: "mass",
    factor: MASS_TO_KG.tonne,
  },
  {
    id: "mass-lb",
    label: "Pounds (lb)",
    dimension: "mass",
    factor: MASS_TO_KG.lb,
  },
  {
    id: "mass-ton-us",
    label: "US short tons",
    dimension: "mass",
    factor: MASS_TO_KG.ton_us,
  },
  {
    id: "mass-ton-imp",
    label: "Imperial long tons",
    dimension: "mass",
    factor: MASS_TO_KG.ton_imp,
  },
];

export function findUniversalUnit(id: string): UniversalUnit | null {
  return UNIVERSAL_UNITS.find((unit) => unit.id === id) ?? null;
}

export interface UniversalOptions {
  /** Depth in metres, used when crossing between area and volume. */
  depthM?: number;
  /** Density in kg per cubic metre, used when crossing between volume and weight. */
  densityKgM3?: number;
}

export interface UniversalResult {
  /** Null when the pair cannot be converted with what is known. */
  value: number | null;
  /** Plain sentence explaining how the answer was reached. */
  explanation: string;
  /** Another measurement the user must supply before this pair works. */
  needs?: "depth" | "density";
  error?: string;
}

const NO_VALUE = "Enter a number to convert.";

export function convertUniversal(
  amount: number,
  fromId: string,
  toId: string,
  options: UniversalOptions = {},
): UniversalResult {
  const from = findUniversalUnit(fromId);
  const to = findUniversalUnit(toId);
  if (!from || !to) {
    return {
      value: null,
      explanation: "",
      error: "Choose a unit on both sides.",
    };
  }
  if (!Number.isFinite(amount) || amount < 0) {
    return { value: null, explanation: "" };
  }

  // Same dimension: one ratio, exact constants, no intermediates to drift.
  if (from.dimension === to.dimension) {
    const value = (amount * from.factor) / to.factor;
    return {
      value,
      explanation: `1 ${unitShort(from)} = ${formatNumber(from.factor / to.factor, 8)} ${unitShort(to)}`,
    };
  }

  const pair = [from.dimension, to.dimension].sort().join(">");

  // A square and a cube each have a single side, which is enough to cross.
  if (pair === "area>length") {
    if (from.dimension === "length") {
      const sideM = amount * from.factor;
      const value = (sideM * sideM) / to.factor;
      return {
        value,
        explanation: "Treated as a square: area = length x length.",
      };
    }
    const areaM2 = amount * from.factor;
    const sideM = Math.sqrt(areaM2);
    const value = sideM / to.factor;
    return {
      value,
      explanation: "Treated as a square: length = square root of area.",
    };
  }

  if (pair === "length>volume") {
    if (from.dimension === "length") {
      const sideM = amount * from.factor;
      const value = (sideM * sideM * sideM * 1000) / to.factor;
      return {
        value,
        explanation: "Treated as a cube: volume = length x length x length.",
      };
    }
    const volumeL = amount * from.factor;
    const sideM = Math.cbrt(volumeL / 1000);
    const value = sideM / to.factor;
    return {
      value,
      explanation: "Treated as a cube: length = cube root of volume.",
    };
  }

  if (pair === "area>volume") {
    const depth = options.depthM;
    if (!Number.isFinite(depth ?? NaN) || (depth ?? 0) <= 0) {
      return {
        value: null,
        explanation:
          "Area becomes volume only once you say how deep the layer is.",
        needs: "depth",
        error: "Add a depth to convert between area and volume.",
      };
    }
    if (from.dimension === "area") {
      const volumeL = amount * from.factor * (depth as number) * 1000;
      return {
        value: volumeL / to.factor,
        explanation: `Volume = area x depth. Depth used: ${formatNumber(depth as number, 3)} m.`,
      };
    }
    const areaM2 = (amount * from.factor) / 1000 / (depth as number);
    return {
      value: areaM2 / to.factor,
      explanation: `Area = volume / depth. Depth used: ${formatNumber(depth as number, 3)} m.`,
    };
  }

  if (
    pair === "mass>volume" ||
    pair === "area>mass" ||
    pair === "length>mass"
  ) {
    if (from.dimension !== "volume" && to.dimension !== "volume") {
      return {
        value: null,
        explanation:
          "Weight needs a volume and a density, and this pair has no volume.",
        needs: "density",
        error:
          "Weight conversions need a volume first. Use the Materials tab for tonnes of sand or granite.",
      };
    }
    const density = options.densityKgM3;
    if (!Number.isFinite(density ?? NaN) || (density ?? 0) <= 0) {
      return {
        value: null,
        explanation:
          "Volume becomes weight only through the density of the material.",
        needs: "density",
        error: "Add a density to convert between volume and weight.",
      };
    }
    if (from.dimension === "volume") {
      const massKg = ((amount * from.factor) / 1000) * (density as number);
      return {
        value: massKg / to.factor,
        explanation: `Weight = volume x density. Density used: ${formatNumber(density as number, 0)} kg/m³.`,
      };
    }
    const volumeL = ((amount * from.factor) / (density as number)) * 1000;
    return {
      value: volumeL / to.factor,
      explanation: `Volume = weight / density. Density used: ${formatNumber(density as number, 0)} kg/m³.`,
    };
  }

  return {
    value: null,
    explanation:
      "These two units measure different things, so they cannot be swapped directly.",
    error:
      "Pick units of the same kind, or add the dimension the conversion needs.",
  };
}

/** Short symbol for a universal unit, used inside explanations. */
export function unitShort(unit: UniversalUnit): string {
  return unit.id.replace(/^(len|area|vol|mass)-/, "").replace(/-/g, " ");
}

export const EMPTY_CONVERSION_HINT = NO_VALUE;
