export interface WallpaperWallInput {
  id: string;
  label: string;
  widthM: number;
  heightM: number;
  doors: number;
  windows: number;
}

export interface WallpaperEstimateInput {
  walls: WallpaperWallInput[];
  rollWidthM: number;
  rollLengthM: number;
  stockFormat: "roll" | "fixed-panel";
  unitsPerPackage: number;
  openingDoorWidthM: number;
  openingDoorHeightM: number;
  openingWindowWidthM: number;
  openingWindowHeightM: number;
  pattern: "random" | "straight" | "drop";
  patternRepeatM: number;
  trimAllowanceM: number;
  wasteRate: number;
  extraRoll: boolean;
  rollPrice: number;
  labourPerRoll: number;
  adhesivePerRolls: number;
  adhesivePackPrice: number;
  adhesiveRequired: boolean;
}

export interface WallpaperEstimateResult {
  grossAreaM2: number;
  openingAreaM2: number;
  netAreaM2: number;
  strips: number;
  rolls: number;
  packages: number;
  adhesivePacks: number;
  adhesiveCost: number;
  materialCost: number;
  labourCost: number;
  totalCost: number;
  invalidWall?: string;
}

/**
 * Estimate roll yield by cutting full-height drops from each roll, then
 * first-fit-decreasing pack the cuts so usable offcuts can serve shorter walls.
 * Opening deductions are shown in the area total; full drops remain in the
 * cut schedule because openings do not reliably provide usable full-height
 * strips. This is a planning estimate, not a guaranteed cutting plan.
 */
export function calculateWallpaperEstimate(
  input: WallpaperEstimateInput,
): WallpaperEstimateResult {
  let grossAreaM2 = 0;
  let openingAreaM2 = 0;
  let strips = 0;
  const drops: number[] = [];
  if (
    !Number.isFinite(input.rollWidthM) || input.rollWidthM <= 0 ||
    !Number.isFinite(input.rollLengthM) || input.rollLengthM <= 0 ||
    !Number.isInteger(input.unitsPerPackage) || input.unitsPerPackage < 1 || input.unitsPerPackage > 1000 ||
    !Number.isFinite(input.wasteRate) || input.wasteRate < 0 || input.wasteRate > 1 ||
    !Number.isFinite(input.patternRepeatM) || input.patternRepeatM < 0 || input.patternRepeatM > 10 ||
    !Number.isFinite(input.trimAllowanceM) || input.trimAllowanceM < 0 || input.trimAllowanceM > 5 ||
    !Number.isFinite(input.rollPrice) || input.rollPrice < 0 ||
    !Number.isFinite(input.labourPerRoll) || input.labourPerRoll < 0 ||
    !Number.isInteger(input.adhesivePerRolls) || input.adhesivePerRolls < 1 ||
    !Number.isFinite(input.adhesivePackPrice) || input.adhesivePackPrice < 0 ||
    !Number.isFinite(input.openingDoorWidthM) || input.openingDoorWidthM <= 0 ||
    !Number.isFinite(input.openingDoorHeightM) || input.openingDoorHeightM <= 0 ||
    !Number.isFinite(input.openingWindowWidthM) || input.openingWindowWidthM <= 0 ||
    !Number.isFinite(input.openingWindowHeightM) || input.openingWindowHeightM <= 0 ||
    input.walls.length === 0 || input.walls.length > 100
  ) return emptyResult({ invalidWall: "calculator inputs" });

  for (const wall of input.walls) {
    if (
      !Number.isFinite(wall.widthM) ||
      !Number.isFinite(wall.heightM) ||
      wall.widthM <= 0 || wall.widthM > 1000 ||
      wall.heightM <= 0 || wall.heightM > 1000 ||
      !Number.isInteger(wall.doors) || wall.doors < 0 ||
      !Number.isInteger(wall.windows) || wall.windows < 0
    ) {
      return emptyResult({ invalidWall: wall.label });
    }
    const gross = wall.widthM * wall.heightM;
    const openings =
      wall.doors * input.openingDoorWidthM * input.openingDoorHeightM +
      wall.windows * input.openingWindowWidthM * input.openingWindowHeightM;
    if (openings > gross) return emptyResult({ invalidWall: wall.label });
    grossAreaM2 += gross;
    openingAreaM2 += openings;

    const baseStrips = Math.ceil(wall.widthM / input.rollWidthM);
    const wasteStrips = Math.ceil(baseStrips * (1 + input.wasteRate));
    strips += wasteStrips;
    if (drops.length + wasteStrips > 20_000) {
      return emptyResult({ invalidWall: "the requested wall area is too large to estimate safely" });
    }
    const repeat = input.pattern === "random" ? 0 : input.patternRepeatM;
    for (let i = 0; i < wasteStrips; i++) {
      // A half-drop shifts alternate strips by half a repeat. The exact cut
      // sequence still depends on the product and installer, so this remains
      // a conservative takeoff rather than a cutting diagram.
      const matchOffset = input.pattern === "drop" && i % 2 === 1 ? repeat / 2 : 0;
      const requiredLength = wall.heightM + input.trimAllowanceM + matchOffset;
      const cutLength = repeat > 0
        ? Math.ceil(requiredLength / repeat) * repeat
        : requiredLength;
      drops.push(cutLength);
    }
  }

  // A numbered mural panel is a fixed-size printed piece, not continuous
  // stock: a short offcut from one numbered panel cannot supply another panel.
  // Ordinary wallpaper is cut from continuous rolls, where offcuts may be used.
  let stockUnits: number;
  if (input.stockFormat === "fixed-panel") {
    if (drops.some((drop) => drop > input.rollLengthM)) {
      return emptyResult({ invalidWall: "A mural panel is shorter than the wall height plus trimming allowance." });
    }
    stockUnits = drops.length;
  } else {
    const remaining: number[] = [];
    for (const drop of drops.sort((a, b) => b - a)) {
      if (drop > input.rollLengthM) return emptyResult({ invalidWall: "A wallpaper drop is longer than the selected roll." });
      const availableRoll = remaining.findIndex((length) => length + 1e-9 >= drop);
      if (availableRoll >= 0) remaining[availableRoll] -= drop;
      else remaining.push(input.rollLengthM - drop);
    }
    stockUnits = remaining.length;
  }

  const rolls = stockUnits + (input.extraRoll && stockUnits > 0 ? 1 : 0);
  const netAreaM2 = Math.max(0, grossAreaM2 - openingAreaM2);
  const packages = Math.ceil(rolls / input.unitsPerPackage);
  // A contingency roll/panel is purchased but not installed in this estimate.
  const adhesivePacks = input.adhesiveRequired && stockUnits > 0
    ? Math.ceil(stockUnits / input.adhesivePerRolls)
    : 0;
  const adhesiveCost = adhesivePacks * input.adhesivePackPrice;
  const materialCost = packages * input.rollPrice + adhesiveCost;
  const labourCost = stockUnits * input.labourPerRoll;
  return {
    grossAreaM2,
    openingAreaM2,
    netAreaM2,
    strips,
    rolls,
    packages,
    adhesivePacks,
    adhesiveCost,
    materialCost,
    labourCost,
    totalCost: materialCost + labourCost,
  };
}

function emptyResult(extra: Pick<WallpaperEstimateResult, "invalidWall"> = {}) {
  return {
    grossAreaM2: 0,
    openingAreaM2: 0,
    netAreaM2: 0,
    strips: 0,
    rolls: 0,
    packages: 0,
    adhesivePacks: 0,
    adhesiveCost: 0,
    materialCost: 0,
    labourCost: 0,
    totalCost: 0,
    ...extra,
  };
}
