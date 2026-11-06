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
  openingDoorWidthM: number;
  openingDoorHeightM: number;
  openingWindowWidthM: number;
  openingWindowHeightM: number;
  pattern: "random" | "straight" | "drop";
  patternRepeatM: number;
  wasteRate: number;
  extraRoll: boolean;
  rollPrice: number;
  labourPerRoll: number;
  adhesivePerRolls: number;
}

export interface WallpaperEstimateResult {
  grossAreaM2: number;
  openingAreaM2: number;
  netAreaM2: number;
  strips: number;
  rolls: number;
  adhesivePacks: number;
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
    !Number.isFinite(input.wasteRate) || input.wasteRate < 0 || input.wasteRate > 1 ||
    !Number.isFinite(input.patternRepeatM) || input.patternRepeatM < 0 ||
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
    const repeat = input.patternRepeatM;
    for (let i = 0; i < wasteStrips; i++) {
      const matchOffset = input.pattern === "drop" && i % 2 === 1 ? repeat / 2 : 0;
      const cutLength = repeat > 0
        ? Math.ceil((wall.heightM + matchOffset) / repeat) * repeat
        : wall.heightM;
      drops.push(cutLength);
    }
  }

  // First-fit decreasing cut list: each roll is a length of stock, not a
  // theoretical area yield. The result is therefore more useful for tall walls.
  const remaining: number[] = [];
  for (const drop of drops.sort((a, b) => b - a)) {
    if (drop > input.rollLengthM) return emptyResult({ invalidWall: "A wallpaper drop is longer than the selected roll." });
    const availableRoll = remaining.findIndex((length) => length + 1e-9 >= drop);
    if (availableRoll >= 0) remaining[availableRoll] -= drop;
    else remaining.push(input.rollLengthM - drop);
  }

  const rolls = remaining.length + (input.extraRoll && remaining.length > 0 ? 1 : 0);
  const netAreaM2 = Math.max(0, grossAreaM2 - openingAreaM2);
  const adhesivePacks = rolls > 0 && input.adhesivePerRolls > 0
    ? Math.ceil(rolls / input.adhesivePerRolls)
    : 0;
  const materialCost = rolls * Math.max(0, input.rollPrice);
  const labourCost = rolls * Math.max(0, input.labourPerRoll);
  return {
    grossAreaM2,
    openingAreaM2,
    netAreaM2,
    strips,
    rolls,
    adhesivePacks,
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
    adhesivePacks: 0,
    materialCost: 0,
    labourCost: 0,
    totalCost: 0,
    ...extra,
  };
}
