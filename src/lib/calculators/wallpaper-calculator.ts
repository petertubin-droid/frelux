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

/** Per-wall view of the takeoff, so a schedule can be read and exported
 *  without recomputing the width-to-strip arithmetic in the UI. */
export interface WallpaperWallTakeoff {
  id: string;
  label: string;
  widthM: number;
  heightM: number;
  /** Wall width after fully glazed openings are removed. */
  effectiveWidthM: number;
  installableDrops: number;
  allowanceDrops: number;
  drops: number;
  /** Longest cut for this wall; alternate half-drop cuts are half a repeat longer. */
  cutLengthM: number;
  openingAreaM2: number;
  /** Area of floor-to-ceiling openings that also removed strips. */
  fullHeightOpeningM2: number;
}

export interface WallpaperEstimateResult {
  grossAreaM2: number;
  openingAreaM2: number;
  netAreaM2: number;
  /** Every drop that must be cut, including the waste allowance. */
  strips: number;
  installableDrops: number;
  allowanceDrops: number;
  rolls: number;
  packages: number;
  adhesivePacks: number;
  adhesiveCost: number;
  materialCost: number;
  labourCost: number;
  totalCost: number;
  /** Coverage of the units that are actually hung, spare excluded. */
  installedCoverageM2: number;
  /** Coverage of everything purchased, spare included. */
  purchasedCoverageM2: number;
  /** Purchased coverage minus net wall area: pattern, trimming and strip ends. */
  patternLossM2: number;
  walls: WallpaperWallTakeoff[];
  invalidWall?: string;
}

/** A cut allowance of this size or less below a wall is trimming, not an
 *  opening that frees a strip. */
const FLOOR_TO_CEILING_TOLERANCE_M = 0.2;
const EPSILON = 1e-9;

/**
 * Estimates wallpaper from measured walls and the package that will be bought.
 *
 * Method:
 *  1. Each wall needs ceil(width / roll width) drops. An opening removes a drop
 *     only when it reaches the ceiling, because wallpaper cannot pass behind it;
 *     a door or window with wall above it still needs the strips that run past
 *     it. Openings always reduce the net area that is reported.
 *  2. Each drop is cut to the wall height plus the trimming allowance, rounded
 *     up to the pattern repeat for a straight match. A half-drop match adds half
 *     a repeat to every second drop, which is the published cutting rule and is
 *     why alternate cuts differ in length.
 *  3. Cuts are packed into packages largest first, so an offcut can serve a
 *     shorter wall. Numbered mural panels are counted one per drop, since a
 *     printed panel cannot be cut from another panel.
 *  4. A waste allowance adds drops, not fractions of a drop, and the optional
 *     spare is bought but neither hung nor charged labour.
 */
export function calculateWallpaperEstimate(
  input: WallpaperEstimateInput,
): WallpaperEstimateResult {
  let grossAreaM2 = 0;
  let openingAreaM2 = 0;
  let installableDrops = 0;
  let allowanceDrops = 0;
  const drops: number[] = [];
  const wallTakeoffs: WallpaperWallTakeoff[] = [];
  if (
    !Number.isFinite(input.rollWidthM) ||
    input.rollWidthM <= 0 ||
    !Number.isFinite(input.rollLengthM) ||
    input.rollLengthM <= 0 ||
    !Number.isInteger(input.unitsPerPackage) ||
    input.unitsPerPackage < 1 ||
    input.unitsPerPackage > 1000 ||
    !Number.isFinite(input.wasteRate) ||
    input.wasteRate < 0 ||
    input.wasteRate > 1 ||
    !Number.isFinite(input.patternRepeatM) ||
    input.patternRepeatM < 0 ||
    input.patternRepeatM > 10 ||
    !Number.isFinite(input.trimAllowanceM) ||
    input.trimAllowanceM < 0 ||
    input.trimAllowanceM > 5 ||
    !Number.isFinite(input.rollPrice) ||
    input.rollPrice < 0 ||
    !Number.isFinite(input.labourPerRoll) ||
    input.labourPerRoll < 0 ||
    !Number.isInteger(input.adhesivePerRolls) ||
    input.adhesivePerRolls < 1 ||
    !Number.isFinite(input.adhesivePackPrice) ||
    input.adhesivePackPrice < 0 ||
    !Number.isFinite(input.openingDoorWidthM) ||
    input.openingDoorWidthM <= 0 ||
    !Number.isFinite(input.openingDoorHeightM) ||
    input.openingDoorHeightM <= 0 ||
    !Number.isFinite(input.openingWindowWidthM) ||
    input.openingWindowWidthM <= 0 ||
    !Number.isFinite(input.openingWindowHeightM) ||
    input.openingWindowHeightM <= 0 ||
    input.walls.length === 0 ||
    input.walls.length > 100
  )
    return emptyResult({ invalidWall: "calculator inputs" });

  const isPanel = input.stockFormat === "fixed-panel";
  // A mural panel is printed to its finished size and cannot be trimmed from a
  // longer piece, so neither the trimming allowance nor a repeat applies to it.
  const repeat =
    isPanel || input.pattern === "random" ? 0 : input.patternRepeatM;
  const baseCut = input.rollLengthM;

  for (const wall of input.walls) {
    if (
      !Number.isFinite(wall.widthM) ||
      !Number.isFinite(wall.heightM) ||
      wall.widthM <= 0 ||
      wall.widthM > 1000 ||
      wall.heightM <= 0 ||
      wall.heightM > 1000 ||
      !Number.isInteger(wall.doors) ||
      wall.doors < 0 ||
      !Number.isInteger(wall.windows) ||
      wall.windows < 0
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

    // Only a floor-to-ceiling opening frees a strip. Anything with wall above it
    // keeps its drop: the strip has to pass the opening and is cut around it.
    const ceilingThreshold = wall.heightM - FLOOR_TO_CEILING_TOLERANCE_M;
    let fullHeightWidth = 0;
    let fullHeightArea = 0;
    if (input.openingDoorHeightM >= ceilingThreshold) {
      fullHeightWidth += wall.doors * input.openingDoorWidthM;
      fullHeightArea +=
        wall.doors * input.openingDoorWidthM * input.openingDoorHeightM;
    }
    if (input.openingWindowHeightM >= ceilingThreshold) {
      fullHeightWidth += wall.windows * input.openingWindowWidthM;
      fullHeightArea +=
        wall.windows * input.openingWindowWidthM * input.openingWindowHeightM;
    }
    const effectiveWidth = Math.max(0, wall.widthM - fullHeightWidth);
    const wallInstalled =
      effectiveWidth > 0
        ? Math.ceil(effectiveWidth / input.rollWidthM - EPSILON)
        : 0;
    const wallAllowance = Math.ceil(wallInstalled * input.wasteRate - EPSILON);
    const wallDrops = wallInstalled + wallAllowance;
    installableDrops += wallInstalled;
    allowanceDrops += wallAllowance;

    if (drops.length + wallDrops > 20_000) {
      return emptyResult({
        invalidWall: "the requested wall area is too large to estimate safely",
      });
    }

    let longestCut = 0;
    for (let i = 0; i < wallDrops; i++) {
      const cut = isPanel
        ? wall.heightM
        : cutLengthFor({
            wallHeightM: wall.heightM,
            trimAllowanceM: input.trimAllowanceM,
            repeat,
            pattern: input.pattern,
            dropIndex: i,
          });
      if (!isPanel && cut > baseCut) {
        return emptyResult({
          invalidWall: "A wallpaper drop is longer than the selected roll.",
        });
      }
      longestCut = Math.max(longestCut, cut);
      drops.push(cut);
    }

    wallTakeoffs.push({
      id: wall.id,
      label: wall.label,
      widthM: wall.widthM,
      heightM: wall.heightM,
      effectiveWidthM: effectiveWidth,
      installableDrops: wallInstalled,
      allowanceDrops: wallAllowance,
      drops: wallDrops,
      cutLengthM: longestCut,
      openingAreaM2: openings,
      fullHeightOpeningM2: fullHeightArea,
    });
  }

  const installedDrops = drops.length - allowanceDrops;
  void installedDrops;

  let stockUnits: number;
  if (isPanel) {
    if (drops.some((drop) => drop > input.rollLengthM + EPSILON)) {
      return emptyResult({
        invalidWall: "A mural panel is shorter than the wall height.",
      });
    }
    stockUnits = drops.length;
  } else {
    const remaining: number[] = [];
    for (const drop of drops.sort((a, b) => b - a)) {
      const availableRoll = remaining.findIndex(
        (length) => length + EPSILON >= drop,
      );
      if (availableRoll >= 0) remaining[availableRoll] -= drop;
      else remaining.push(input.rollLengthM - drop);
    }
    stockUnits = remaining.length;
  }

  const rolls = stockUnits + (input.extraRoll && stockUnits > 0 ? 1 : 0);
  const netAreaM2 = Math.max(0, grossAreaM2 - openingAreaM2);
  const packages = Math.ceil(rolls / input.unitsPerPackage);
  const adhesivePacks =
    input.adhesiveRequired && stockUnits > 0
      ? Math.ceil(stockUnits / input.adhesivePerRolls)
      : 0;
  const adhesiveCost = adhesivePacks * input.adhesivePackPrice;
  const materialCost = packages * input.rollPrice + adhesiveCost;
  const labourCost = stockUnits * input.labourPerRoll;
  // A roll is paid for at its full width and length; a panel at its printed size.
  const unitCoverageM2 = input.rollWidthM * input.rollLengthM;
  const installedCoverageM2 = stockUnits * unitCoverageM2;
  const purchasedCoverageM2 = rolls * unitCoverageM2;

  return {
    grossAreaM2,
    openingAreaM2,
    netAreaM2,
    strips: drops.length,
    installableDrops,
    allowanceDrops,
    rolls,
    packages,
    adhesivePacks,
    adhesiveCost,
    materialCost,
    labourCost,
    totalCost: materialCost + labourCost,
    installedCoverageM2,
    purchasedCoverageM2,
    patternLossM2: Math.max(0, purchasedCoverageM2 - netAreaM2),
    walls: wallTakeoffs,
  };
}

/** Cut length for one drop.
 *
 *  Straight match: the whole repeat must fit, so the cut rounds up to a repeat.
 *  Half-drop match: alternate drops are shifted half a repeat, so they need half
 *  a repeat beyond that rounded length. Adding the shift before rounding, as an
 *  earlier version did, hides it whenever rounding already covered it and
 *  produces cuts that are too short to reach the match.
 */
export function cutLengthFor(options: {
  wallHeightM: number;
  trimAllowanceM: number;
  repeat: number;
  pattern: WallpaperEstimateInput["pattern"];
  dropIndex: number;
}): number {
  const required = options.wallHeightM + options.trimAllowanceM;
  if (options.repeat <= 0) return roundToMillimetre(required);
  const rounded =
    Math.ceil(required / options.repeat - EPSILON) * options.repeat;
  const shift =
    options.pattern === "drop" && options.dropIndex % 2 === 1
      ? options.repeat / 2
      : 0;
  return roundToMillimetre(rounded + shift);
}

function roundToMillimetre(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function emptyResult(
  extra: Pick<WallpaperEstimateResult, "invalidWall"> = {},
): WallpaperEstimateResult {
  return {
    grossAreaM2: 0,
    openingAreaM2: 0,
    netAreaM2: 0,
    strips: 0,
    installableDrops: 0,
    allowanceDrops: 0,
    rolls: 0,
    packages: 0,
    adhesivePacks: 0,
    adhesiveCost: 0,
    materialCost: 0,
    labourCost: 0,
    totalCost: 0,
    installedCoverageM2: 0,
    purchasedCoverageM2: 0,
    patternLossM2: 0,
    walls: [],
    ...extra,
  };
}
