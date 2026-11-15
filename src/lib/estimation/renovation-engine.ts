// =========================================================
// FRELUX renovation engine.
//
// A renovation is not a smaller new build. Somebody is already living in the
// thing: finishes have to come off before anything goes back, the backing
// behind those finishes is unknown until it is opened, the property may be
// occupied while the work runs, and a large share of the cost sits in
// preliminaries (protection, access, waste removal, approvals) rather than in
// the trades themselves.
//
// This engine measures that work and nothing else. It derives quantities from
// geometry and declared scope, states every assumption it makes, and refuses
// to invent what it was not told:
//
//   * No prices, no rates, no money fields at all. Pricing, tax and margin are
//     resolved by the pricing gateway and the jurisdictional tax engine, both
//     of which need verified data this engine does not have.
//   * No hidden percentages. Waste, protection and contingency appear as their
//     own lines with a basis string, so a quantity surveyor can argue with the
//     number instead of hunting for it.
//   * Anything assumed rather than measured is marked `derived_convention` or
//     `unverified_allowance`, and anything unquantifiable becomes a warning or
//     a blocker instead of a silent zero.
//
// Shared conventions are imported rather than restated: dry volume factors and
// the paint surface and layout waste profiles live in `site-conditions.ts`, and
// the mix expansion (cement bags, sand volume) comes from the wall finishing
// quantity engine, so the same renovation never gets two different answers from
// two calculators.
// =========================================================

import type { MixComponent } from "@/types/wallfinishing";
import { mixComponentQuantity } from "@/lib/wallfinishing/quantity-engine";
import { calculateDemolitionTakeoff } from "@/lib/estimation/demolition-standalone-engine";
import { LITRES_PER_US_GALLON } from "@/lib/estimation/paint-engine";
import { ALL_MARKET_CODES } from "@/lib/international/capability-registry";
import {
  FT_TO_M,
  fromMeters,
  fromSqMeters,
  lengthUnitSystem,
  toMeters,
  toSqMeters,
  type AreaUnit,
  type LengthUnit,
} from "@/lib/measurement/units";
import {
  MORTAR_DRY_VOLUME_FACTOR,
  PAINT_SURFACE_FACTORS,
  resolveLayoutWastePercent,
  type LayoutComplexityKey,
} from "@/lib/estimation/site-conditions";

/**
 * The paint surface table in `site-conditions.ts` is the single owner of
 * coverage multipliers. The keys below are its keys, so a renovation cannot
 * drift from the paint estimator it shares.
 */
export type RenovationPaintSurface = keyof typeof PAINT_SURFACE_FACTORS;

/**
 * Older calculators and imports use porosity names for the same surfaces.
 * Aliases are mapped explicitly; an unrecognised surface is reported rather
 * than silently treated as a standard one.
 */
export const PAINT_SURFACE_ALIASES: Readonly<
  Record<string, RenovationPaintSurface>
> = Object.freeze({
  raw_plaster: "new_plaster",
  bare_plaster: "new_plaster",
  new_plastered: "new_plaster",
  repaint: "smooth",
  previously_painted: "smooth",
  sealed: "smooth",
  unrendered_block: "rough",
});

export function resolveRenovationPaintSurface(surface?: string | null): {
  key: RenovationPaintSurface | null;
  factor: number;
  recognised: boolean;
} {
  const raw = (surface ?? "").trim().toLowerCase();
  if (!raw) return { key: null, factor: 1, recognised: true };
  const direct = (PAINT_SURFACE_FACTORS as Record<string, { factor: number }>)[
    raw
  ];
  if (direct) {
    return {
      key: raw as RenovationPaintSurface,
      factor: direct.factor,
      recognised: true,
    };
  }
  const alias = PAINT_SURFACE_ALIASES[raw];
  if (alias) {
    return {
      key: alias,
      factor: PAINT_SURFACE_FACTORS[alias].factor,
      recognised: true,
    };
  }
  return { key: null, factor: 1, recognised: false };
}

/** One imperial foot in metres. Rooms may be entered in either system. */
export const FEET_TO_METRES = FT_TO_M;

/** Exact cubic conversion, derived from the one foot factor. */
export const CUBIC_METRES_TO_CUBIC_FEET = 1 / FT_TO_M ** 3;

/** A standard internal door leaf, used when deducting skirting at openings. */
export const DOOR_LEAF_WIDTH_M = 0.9;

/** Default render or plaster thickness when the specification is silent. */
export const DEFAULT_PLASTER_THICKNESS_MM = 15;

/** Default cement and sand screed thickness. */
export const DEFAULT_SCREED_THICKNESS_MM = 50;

/** Default paint coats on a renovation repaint. */
export const DEFAULT_PAINT_COATS = 2;

/** Site loss on paint. Clamped so a wild entry cannot break the mix. */
export const PAINT_WASTAGE_PERCENT = 10;
export const PAINT_WASTAGE_BOUNDS = { min: 5, max: 20 } as const;

/** Site loss on plaster and render, before the dry volume factor. */
export const PLASTER_WASTAGE_PERCENT = 5;

/** Site loss on screed. */
export const SCREED_WASTAGE_PERCENT = 5;

/** Debris thickness by stripped element, metres. Used for skip volumes only. */
export const STRIP_OUT_THICKNESS_M = Object.freeze({
  wallTiles: 0.012,
  floorTiles: 0.012,
  screed: 0.05,
  plaster: 0.015,
  ceilingPop: 0.012,
  ceilingBoard: 0.01,
  timberFloor: 0.02,
  carpet: 0.005,
  vinyl: 0.003,
});

/** Render mix behind stripped finishes: 1 cement to 4 sand by volume. */
export const RENDER_MIX: MixComponent[] = [
  { role: "concrete-mix", parts: 1 },
  { role: "sand", parts: 4 },
];

/** Screed mix: 1 cement to 3 sand, semi dry. */
export const SCREED_MIX: MixComponent[] = [
  { role: "concrete-mix", parts: 1 },
  { role: "sand", parts: 3 },
];

/**
 * Productivity penalties for working in an occupied or awkward property. These
 * are multipliers on labour, never on quantities, and they are clamped: a
 * renovation in an occupied third floor flat without a lift is slower, but it
 * does not become three times slower because a form said so.
 */
export const ACCESS_FACTOR_BOUNDS = { min: 1, max: 1.35 } as const;
export const OCCUPIED_PENALTY = 0.15;
export const UPPER_FLOOR_PENALTY = 0.1;
export const HIGH_FLOOR_EXTRA_PENALTY = 0.05;

export type RenovationRoomUse =
  | "living"
  | "bedroom"
  | "kitchen"
  | "bathroom"
  | "wc"
  | "corridor"
  | "stair"
  | "store"
  | "balcony"
  | "external"
  | "other";

export type RenovationTrade =
  | "strip_out"
  | "making_good"
  | "plaster_render"
  | "screed"
  | "tiling"
  | "flooring"
  | "painting"
  | "ceiling"
  | "joinery"
  | "electrical"
  | "plumbing"
  | "preliminaries"
  | "statutory"
  | "contingency";

export type RenovationCostClass =
  "material" | "labour" | "plant" | "preliminaries" | "allowance" | "statutory";

/**
 * How a line is treated by the tax engine. No rate lives here: a renovation
 * supply is taxed by category and jurisdiction, and in markets where the rule
 * is not verified the tax engine returns unavailable rather than a guess.
 */
export type RenovationTaxClass =
  "works" | "materials" | "professional_fees" | "statutory";

export type RenovationProvenance =
  "measured" | "user_provided" | "derived_convention" | "unverified_allowance";

export interface RenovationScopeLine {
  id: string;
  trade: RenovationTrade;
  roomId: string | null;
  roomName: string | null;
  description: string;
  /** Null when the quantity cannot be derived from what was supplied. */
  quantity: number | null;
  /**
   * The net quantity plus this line's own waste allowance, to three places.
   * Net plus a stated percentage is stated twice so no pricing layer has to
   * guess whether a quantity already includes waste.
   */
  quantityWithWaste: number | null;
  unit: string;
  /** The arithmetic in words, for the calculation drawer. */
  basis: string;
  wastePercent: number;
  wasteReason: string | null;
  costClass: RenovationCostClass;
  taxClass: RenovationTaxClass;
  provenance: RenovationProvenance;
  flags: string[];
}

/** Length units accepted for room dimensions. */
export type RenovationLengthUnit = LengthUnit | "m" | "ft";

export interface RenovationRoomInput {
  id: string;
  name?: string;
  use: RenovationRoomUse;
  length: number;
  width: number;
  height: number;
  /** Entry units. Everything is measured in metres internally. */
  /** Any length unit the app supports: metres, feet, inches, yards and so on. */
  unit?: RenovationLengthUnit;
  /** Opening area in square metres. Always metric, whatever the room unit. */
  openingAreaM2?: number;
  /** Opening area stated in `openingAreaUnit`; imperial rooms usually say sqft. */
  openingArea?: number;
  openingAreaUnit?: AreaUnit;
  doorCount?: number;
  windowCount?: number;
  layout?: LayoutComplexityKey;
  existing?: {
    wallFinish?: "paint" | "tiles" | "wallpaper" | "render" | "none";
    floorFinish?: "tiles" | "screed" | "timber" | "carpet" | "vinyl" | "none";
    ceilingFinish?: "pop" | "plasterboard" | "paint" | "none";
    wallCondition?: RenovationPaintSurface;
  };
  work?: {
    stripOut?: {
      wallFinish?: boolean;
      floorFinish?: boolean;
      ceiling?: boolean;
      joinery?: boolean;
    };
    plaster?: boolean | { patchesOnly?: boolean; thicknessMm?: number };
    paint?:
      | boolean
      | {
          walls?: boolean;
          ceiling?: boolean;
          coats?: number;
          surface?: RenovationPaintSurface;
          ceilingSurface?: RenovationPaintSurface;
        };
    screed?: boolean | { thicknessMm?: number };
    tiling?: {
      floor?: boolean;
      walls?: boolean;
      skirting?: boolean;
      tileWidthMm?: number;
      tileHeightMm?: number;
      tilesPerBox?: number;
      adhesiveCoverageM2PerBag?: number;
    };
    flooring?: boolean | { material?: string };
    ceiling?: boolean | { type?: "pop" | "plasterboard" | "pvc" };
    demolishPartitions?: {
      areaM2: number;
      thicknessMm?: number;
      loadBearing?: boolean;
    };
    joinery?: {
      doors?: number;
      windows?: number;
      wardrobeRunM?: number;
      kitchenRunM?: number;
    };
    electrical?: {
      lightPoints?: number;
      socketPoints?: number;
      switchPoints?: number;
      circuits?: number;
    };
    plumbing?: {
      wcPoints?: number;
      basinPoints?: number;
      showerPoints?: number;
      sinkPoints?: number;
      appliancePoints?: number;
    };
  };
}

export interface RenovationProjectInput {
  marketCode: string;
  /** Carried through untouched. The engine formats nothing. */
  currencyCode?: string | null;
  measurementSystem?: "metric" | "imperial";
  /** Works run around a household that stays in residence. */
  occupied?: boolean;
  /** 0 is ground floor, 1 is first floor. */
  floorLevel?: number;
  liftAvailable?: boolean;
  /** Explicit protection area. Derived from floor area when occupied and absent. */
  protectionAreaM2?: number | null;
  /** Capacity of the waste container the market actually uses. */
  debrisContainerM3?: number | null;
  /** Contingency is never defaulted. Absent means not set. */
  contingencyPercent?: number | null;
  approvals?: {
    required: boolean;
    /** Free text note from the user, e.g. which consent applies. */
    note?: string;
  } | null;
  /** Pre-2000 buildings need an asbestos survey before certain strip out. */
  yearBuilt?: number | null;
  defaults?: {
    plasterThicknessMm?: number;
    screedThicknessMm?: number;
    paintCoats?: number;
    /** Product coverage. Absent means litres cannot be derived. */
    coverageM2PerLitre?: number | null;
    tileWidthMm?: number;
    tileHeightMm?: number;
    tilesPerBox?: number;
    adhesiveCoverageM2PerBag?: number | null;
  };
  rooms: RenovationRoomInput[];
}

export interface RenovationRoomMetrics {
  id: string;
  name: string;
  use: RenovationRoomUse;
  floorAreaM2: number;
  perimeterM: number;
  wallAreaGrossM2: number;
  openingAreaM2: number;
  wallAreaNetM2: number;
  ceilingAreaM2: number;
  skirtingLengthM: number;
  /** The unit the dimensions were entered in, so a page can label its inputs. */
  unit: RenovationLengthUnit | null;
}

export interface RenovationLabourFactor {
  factor: number;
  /** Penalties are for labour only. Quantities are never scaled by them. */
  appliesTo: "labour_only";
  reasons: string[];
  clamped: boolean;
  /** Inputs that could not be resolved and therefore were not charged. */
  unknowns: string[];
}

export interface RenovationEngineResult {
  marketCode: string;
  currencyCode: string | null;
  measurementSystem: "metric" | "imperial";
  rooms: RenovationRoomMetrics[];
  lines: RenovationScopeLine[];
  labourFactor: RenovationLabourFactor;
  debris: {
    inPlaceVolumeM3: number;
    looseVolumeM3: number;
    bulkingFactor: number;
    containerLoads: number | null;
    containerCapacityM3: number | null;
  };
  quantitiesByUnit: Record<string, number>;
  assumptions: string[];
  warnings: string[];
  flags: string[];
  readiness: {
    status: "incomplete" | "measured" | "complete_for_pricing";
    blockers: string[];
  };
}

// --- small helpers -------------------------------------------------------

function round(value: number, places = 3): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function positive(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Neutralises a leading character that a spreadsheet would evaluate. Free text
 * from a user reaches descriptions and basis strings, so it is defused once,
 * here, rather than at every export.
 */
function spreadsheetSafe(text: string): string {
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Every length unit the app supports, plus the two letters this engine has
 * always accepted. Normalised through the shared measurement system, so a foot
 * is 0.3048 m here for the same reason it is everywhere else.
 */
function resolveLengthUnit(unit?: RenovationLengthUnit | null): LengthUnit {
  if (!unit) return "meters";
  if (unit === "m") return "meters";
  if (unit === "ft") return "feet";
  return unit;
}

function isImperialUnit(unit?: RenovationLengthUnit | null): boolean {
  return lengthUnitSystem(resolveLengthUnit(unit)) === "imperial";
}

function toMetres(
  value: number,
  unit: RenovationLengthUnit | null | undefined,
): number {
  return toMeters(value, resolveLengthUnit(unit));
}

function tileArea(row: {
  tileWidthMm?: number;
  tileHeightMm?: number;
}): number | null {
  const w = positive(row.tileWidthMm);
  const h = positive(row.tileHeightMm);
  return w > 0 && h > 0 ? (w / 1000) * (h / 1000) : null;
}

function line(
  partial: Omit<
    RenovationScopeLine,
    "wastePercent" | "wasteReason" | "flags" | "quantityWithWaste"
  > &
    Partial<
      Pick<RenovationScopeLine, "wastePercent" | "wasteReason" | "flags">
    > & {
      /** The unrounded figure, so the buy quantity is not built on a rounding. */
      exactQuantity?: number | null;
    },
): RenovationScopeLine {
  const { exactQuantity, ...rest } = partial;
  const merged: RenovationScopeLine = {
    wastePercent: rest.wastePercent ?? 0,
    wasteReason: rest.wasteReason ?? null,
    flags: rest.flags ?? [],
    quantityWithWaste: null,
    ...rest,
  };
  // Every quantity is net. The buy or allow figure is stated beside it, so a
  // consumer can never apply waste twice, and it is derived from the exact
  // figure rather than from the rounded display value.
  const basis = exactQuantity ?? merged.quantity;
  merged.quantityWithWaste =
    basis === null || basis === undefined
      ? null
      : // Never below the figure shown: a tiny net quantity can round up past
        // its own buy figure, and a line that buys less than it measures reads
        // as an error on a page.
        Math.max(
          round(basis * (1 + merged.wastePercent / 100), 3),
          merged.quantity ?? 0,
        );
  return merged;
}

/** Debris thickness for an existing finish, or null when it has none. */
function stripThickness(
  kind:
    | "wallTiles"
    | "floorTiles"
    | "screed"
    | "plaster"
    | "ceilingPop"
    | "ceilingBoard"
    | "timberFloor"
    | "carpet"
    | "vinyl",
): number {
  return STRIP_OUT_THICKNESS_M[kind];
}

export function roomMetrics(room: RenovationRoomInput): RenovationRoomMetrics {
  const unit = room.unit ?? "m";
  const lengthM = toMetres(positive(room.length), unit);
  const widthM = toMetres(positive(room.width), unit);
  const heightM = toMetres(positive(room.height), unit);
  const floorAreaM2 = lengthM * widthM;
  const perimeterM = 2 * (lengthM + widthM);
  const wallAreaGrossM2 = perimeterM * heightM;
  const requestedOpening =
    room.openingArea !== undefined && Number.isFinite(Number(room.openingArea))
      ? toSqMeters(
          positive(room.openingArea),
          room.openingAreaUnit ?? (isImperialUnit(unit) ? "sqft" : "sqm"),
        )
      : positive(room.openingAreaM2);
  const openingAreaM2 = Math.min(requestedOpening, wallAreaGrossM2);
  const wallAreaNetM2 = Math.max(0, wallAreaGrossM2 - openingAreaM2);
  const doorCount = Math.max(0, Math.round(positive(room.doorCount)));
  const skirtingLengthM = Math.max(
    0,
    perimeterM - doorCount * DOOR_LEAF_WIDTH_M,
  );
  return {
    id: room.id,
    name: room.name?.trim() || room.id,
    use: room.use,
    floorAreaM2: round(floorAreaM2),
    perimeterM: round(perimeterM),
    wallAreaGrossM2: round(wallAreaGrossM2),
    openingAreaM2: round(openingAreaM2),
    wallAreaNetM2: round(wallAreaNetM2),
    ceilingAreaM2: round(floorAreaM2),
    skirtingLengthM: round(skirtingLengthM),
    unit: room.unit ?? null,
  };
}

/**
 * Labour multiplier for occupancy and access. Clamped, explained, and never
 * applied to a quantity.
 */
export function renovationLabourFactor(input: {
  occupied?: boolean;
  floorLevel?: number;
  liftAvailable?: boolean;
}): RenovationLabourFactor {
  const reasons: string[] = [];
  const unknowns: string[] = [];
  let factor = 1;

  if (input.occupied === true) {
    factor += OCCUPIED_PENALTY;
    reasons.push(
      "Property occupied during the works: protection and sequencing slow each trade (plus 15 percent on labour).",
    );
  } else if (input.occupied === undefined) {
    unknowns.push(
      "Occupancy was not stated, so no productivity penalty has been applied.",
    );
  }

  const level = Number(input.floorLevel);
  const floorLevel =
    Number.isFinite(level) && level > 0 ? Math.round(level) : 0;
  if (floorLevel >= 1 && input.liftAvailable !== true) {
    factor += UPPER_FLOOR_PENALTY;
    reasons.push(
      `Work is above ground floor (level ${floorLevel}) without a lift: materials are carried (plus 10 percent on labour).`,
    );
    if (floorLevel >= 3) {
      factor += HIGH_FLOOR_EXTRA_PENALTY;
      reasons.push(
        `Level ${floorLevel} is three floors or more up: additional handling (plus 5 percent on labour).`,
      );
    }
  } else if (floorLevel >= 1 && input.liftAvailable === true) {
    reasons.push(
      "A lift is available, so no vertical handling penalty applies.",
    );
  }

  const clampedFactor = clamp(
    factor,
    ACCESS_FACTOR_BOUNDS.min,
    ACCESS_FACTOR_BOUNDS.max,
  );
  return {
    factor: round(clampedFactor, 3),
    appliesTo: "labour_only",
    reasons,
    clamped: clampedFactor !== round(factor, 3),
    unknowns,
  };
}

export function calculateRenovation(
  input: RenovationProjectInput,
): RenovationEngineResult {
  const lines: RenovationScopeLine[] = [];
  const assumptions: string[] = [];
  const warnings: string[] = [];
  const blockers: string[] = [];
  const flags = new Set<string>();
  const rooms: RenovationRoomMetrics[] = [];

  const marketCode = (input.marketCode ?? "").trim().toUpperCase();
  if (!marketCode || marketCode.length !== 2) {
    blockers.push(
      "A two letter market code is required before anything is measured.",
    );
  } else if (!(ALL_MARKET_CODES as readonly string[]).includes(marketCode)) {
    // Quantities are still measurable, but nothing downstream can price or tax
    // a market the registry does not hold. Say so instead of letting it through.
    warnings.push(
      `Market ${marketCode} is not in the FRELUX market registry, so pricing, tax and cost codes cannot be resolved for it. The quantities below are still valid.`,
    );
    flags.add("market_not_in_registry");
  }

  const rawCurrency = (input.currencyCode ?? "").trim().toUpperCase();
  const currencyCode = rawCurrency || null;
  if (rawCurrency && !/^[A-Z]{3}$/.test(rawCurrency)) {
    warnings.push(
      `Currency "${input.currencyCode}" is not a three letter ISO 4217 code. It has been carried through for display only and no conversion has been applied.`,
    );
  }

  const defaults = input.defaults ?? {};
  const plasterThicknessMm =
    positive(defaults.plasterThicknessMm) || DEFAULT_PLASTER_THICKNESS_MM;
  const screedThicknessMm =
    positive(defaults.screedThicknessMm) || DEFAULT_SCREED_THICKNESS_MM;
  const paintCoats = Math.max(
    1,
    Math.round(positive(defaults.paintCoats) || DEFAULT_PAINT_COATS),
  );
  const coverage = positive(defaults.coverageM2PerLitre);
  const paintWaste = clamp(
    PAINT_WASTAGE_PERCENT,
    PAINT_WASTAGE_BOUNDS.min,
    PAINT_WASTAGE_BOUNDS.max,
  );

  const roomInputs = Array.isArray(input.rooms) ? input.rooms : [];
  if (roomInputs.length === 0) {
    blockers.push("No rooms have been added, so there is nothing to measure.");
  }

  const debrisItems: Array<{
    type: "wall" | "slab" | "floor" | "roof";
    lengthM: number;
    widthM: number;
    thicknessM: number;
    quantity?: number;
  }> = [];

  const usedRoomIds = new Set<string>();
  for (const room of roomInputs) {
    const metrics = roomMetrics(room);
    if (usedRoomIds.has(metrics.id)) {
      let suffix = 2;
      let candidate = `${metrics.id}#${suffix}`;
      while (usedRoomIds.has(candidate)) {
        suffix += 1;
        candidate = `${metrics.id}#${suffix}`;
      }
      warnings.push(
        `Room id "${metrics.id}" was used more than once and has been treated as "${candidate}" so its lines stay unique.`,
      );
      metrics.id = candidate;
    }
    usedRoomIds.add(metrics.id);
    rooms.push(metrics);
    const unit = room.unit ?? "m";
    if (metrics.floorAreaM2 <= 0 || metrics.wallAreaGrossM2 <= 0) {
      blockers.push(
        `Room ${metrics.name} has no measurable floor or wall area. Its dimensions cannot be zero.`,
      );
      continue;
    }
    if (isImperialUnit(unit)) {
      assumptions.push(
        `Room ${metrics.name} was entered in feet and converted at ${FEET_TO_METRES} m per foot.`,
      );
    }
    if (positive(room.openingAreaM2) > metrics.wallAreaGrossM2) {
      warnings.push(
        `Room ${metrics.name}: the stated opening area is larger than the wall, so openings were capped at the wall area.`,
      );
    }

    const existing = room.existing ?? {};
    const work = room.work ?? {};
    const roomName = metrics.name;

    // --- strip out ------------------------------------------------------
    const stripOut = work.stripOut ?? {};
    const stripWall =
      stripOut.wallFinish === true &&
      (existing.wallFinish === "tiles" ||
        existing.wallFinish === "render" ||
        existing.wallFinish === "wallpaper" ||
        existing.wallFinish === "paint");
    const stripFloor =
      stripOut.floorFinish === true &&
      existing.floorFinish &&
      existing.floorFinish !== "none";
    const stripCeiling =
      stripOut.ceiling === true &&
      existing.ceilingFinish &&
      existing.ceilingFinish !== "none";

    /** Area that needs new backing plaster because the finish took it with it. */
    let strippedNeedsRenderM2 = 0;
    /** Area that only needs surface preparation: paint and paper come off clean. */
    let strippedNeedsPrepM2 = 0;

    if (stripOut.wallFinish === true && !existing.wallFinish) {
      warnings.push(
        `Room ${roomName}: strip out of the wall finish was requested but the existing finish was not stated, so it has not been measured.`,
      );
    }

    if (stripWall) {
      const areaM2 = metrics.wallAreaNetM2;
      // Tiles and render come off with the backing; paint and paper do not.
      if (existing.wallFinish === "tiles" || existing.wallFinish === "render") {
        strippedNeedsRenderM2 += areaM2;
      } else {
        strippedNeedsPrepM2 += areaM2;
      }
      if (existing.wallFinish === "tiles") {
        lines.push(
          line({
            id: `${metrics.id}-strip-wall-tiles`,
            trade: "strip_out",
            roomId: metrics.id,
            roomName,
            description: "Hack off existing wall tiling",
            quantity: round(areaM2, 2),
            unit: "m2",
            basis: `Wall finish area ${metrics.wallAreaNetM2} m2 (perimeter x height less openings).`,
            costClass: "labour",
            taxClass: "works",
            provenance: "measured",
            flags: ["debris_arising"],
          }),
        );
        // The demolition take off multiplies three lengths, so one square
        // metre of wall is passed as length = area, width = 1 m, and the
        // thickness of the tile bed.
        debrisItems.push({
          type: "wall",
          lengthM: areaM2,
          widthM: 1,
          thicknessM: stripThickness("wallTiles"),
        });
      } else {
        lines.push(
          line({
            id: `${metrics.id}-strip-wall-finish`,
            trade: "strip_out",
            roomId: metrics.id,
            roomName,
            description:
              "Remove existing wall finish and prepare to receive new finish",
            quantity: round(areaM2, 2),
            unit: "m2",
            basis: `Wall finish area ${metrics.wallAreaNetM2} m2.`,
            costClass: "labour",
            taxClass: "works",
            provenance: "measured",
          }),
        );
      }
    }

    if (stripFloor) {
      const finish = existing.floorFinish as
        "tiles" | "screed" | "timber" | "carpet" | "vinyl";
      const thicknessM =
        finish === "tiles"
          ? stripThickness("floorTiles")
          : finish === "screed"
            ? stripThickness("screed")
            : finish === "timber"
              ? stripThickness("timberFloor")
              : finish === "carpet"
                ? stripThickness("carpet")
                : stripThickness("vinyl");
      lines.push(
        line({
          id: `${metrics.id}-strip-floor`,
          trade: "strip_out",
          roomId: metrics.id,
          roomName,
          description: `Take up existing ${finish} floor finish`,
          quantity: round(metrics.floorAreaM2, 2),
          unit: "m2",
          basis: `Floor area ${metrics.floorAreaM2} m2, at ${Math.round(thicknessM * 1000)} mm thickness for debris volume only.`,
          costClass: "labour",
          taxClass: "works",
          provenance: "measured",
          flags: ["debris_arising"],
        }),
      );
      const lengthM = toMetres(positive(room.length), unit);
      const widthM = toMetres(positive(room.width), unit);
      if (lengthM > 0 && widthM > 0) {
        debrisItems.push({
          type: "floor",
          lengthM,
          widthM,
          thicknessM,
        });
      }
    }

    if (stripCeiling) {
      const kind =
        existing.ceilingFinish === "pop" ? "ceilingPop" : "ceilingBoard";
      lines.push(
        line({
          id: `${metrics.id}-strip-ceiling`,
          trade: "strip_out",
          roomId: metrics.id,
          roomName,
          description: `Take down existing ${existing.ceilingFinish} ceiling`,
          quantity: round(metrics.ceilingAreaM2, 2),
          unit: "m2",
          basis: `Ceiling area ${metrics.ceilingAreaM2} m2.`,
          costClass: "labour",
          taxClass: "works",
          provenance: "measured",
          flags: ["debris_arising"],
        }),
      );
      debrisItems.push({
        type: "slab",
        lengthM: toMetres(positive(room.length), unit),
        widthM: toMetres(positive(room.width), unit),
        thicknessM: stripThickness(kind),
      });
    }

    if (stripOut.joinery === true) {
      const statedDoors = Math.max(
        0,
        Math.round(positive(room.work?.joinery?.doors)),
      );
      const doors = Math.max(
        0,
        statedDoors || Math.round(positive(room.doorCount)),
      );
      if (doors > 0) {
        lines.push(
          line({
            id: `${metrics.id}-strip-doors`,
            trade: "strip_out",
            roomId: metrics.id,
            roomName,
            description: "Remove existing door leaf and frame",
            quantity: doors,
            unit: "nr",
            basis: `${doors} door(s) stated for this room.`,
            costClass: "labour",
            taxClass: "works",
            provenance: "user_provided",
          }),
        );
      } else {
        warnings.push(
          `Room ${roomName}: joinery strip out was requested but no door count was given.`,
        );
      }
    }

    // --- making good ----------------------------------------------------
    // Paint and paper come off clean: the wall needs preparation, not render.
    // Tiles and render take the backing with them, so that area is re-rendered.
    if (strippedNeedsPrepM2 > 0) {
      lines.push(
        line({
          id: `${metrics.id}-make-good-prep`,
          trade: "making_good",
          roomId: metrics.id,
          roomName,
          description: "Prepare stripped wall surface to receive new finish",
          quantity: round(strippedNeedsPrepM2, 2),
          unit: "m2",
          basis: `${round(strippedNeedsPrepM2, 2)} m2 of existing paint or paper removed, filled, abraded and sealed. No render is measured because the backing is untouched.`,
          costClass: "labour",
          taxClass: "works",
          provenance: "derived_convention",
          flags: ["verify_substrate_condition"],
        }),
      );
    }

    if (strippedNeedsRenderM2 > 0) {
      const strippedWallAreaM2 = strippedNeedsRenderM2;
      const thicknessM = plasterThicknessMm / 1000;
      const wetVolumeM3 = strippedWallAreaM2 * thicknessM;
      const dryVolumeM3 = wetVolumeM3 * MORTAR_DRY_VOLUME_FACTOR;
      lines.push(
        line({
          id: `${metrics.id}-make-good`,
          trade: "making_good",
          roomId: metrics.id,
          roomName,
          description:
            "Make good backing to stripped walls to receive new finish",
          quantity: round(strippedWallAreaM2, 2),
          unit: "m2",
          basis: `All ${round(strippedWallAreaM2, 2)} m2 of stripped wall is re-rendered at ${plasterThicknessMm} mm. The true patch extent is only known once the finish is off.`,
          costClass: "labour",
          taxClass: "works",
          provenance: "derived_convention",
          flags: ["verify_patch_extent_on_site"],
        }),
      );
      lines.push(
        line({
          id: `${metrics.id}-make-good-mortar`,
          trade: "making_good",
          roomId: metrics.id,
          roomName,
          description: "Render mortar for making good (dry volume)",
          quantity: round(dryVolumeM3, 3),
          unit: "m3",
          basis: `${round(strippedWallAreaM2, 2)} m2 x ${thicknessM} m = ${round(wetVolumeM3, 3)} m3 wet, x ${MORTAR_DRY_VOLUME_FACTOR} dry factor = ${round(dryVolumeM3, 3)} m3.`,
          costClass: "material",
          taxClass: "materials",
          provenance: "measured",
        }),
      );
      for (const component of mixComponentQuantity(dryVolumeM3, RENDER_MIX)) {
        lines.push(
          line({
            id: `${metrics.id}-make-good-${component.component.role}`,
            trade: "making_good",
            roomId: metrics.id,
            roomName,
            description:
              component.component.role === "concrete-mix"
                ? "Cement for making good mortar"
                : "Sand for making good mortar",
            quantity: round(component.quantity, 3),
            unit: component.unit,
            basis: component.formula,
            costClass: "material",
            taxClass: "materials",
            provenance: "measured",
          }),
        );
      }
    }

    // --- partition removal ----------------------------------------------
    if (work.demolishPartitions) {
      const partitions = work.demolishPartitions;
      const partArea = positive(partitions.areaM2);
      const thicknessMm = positive(partitions.thicknessMm) || 100;
      if (partArea > 0) {
        lines.push(
          line({
            id: `${metrics.id}-partition-removal`,
            trade: "strip_out",
            roomId: metrics.id,
            roomName,
            description: "Remove non load bearing partition",
            quantity: round(partArea, 2),
            unit: "m2",
            basis: `${round(partArea, 2)} m2 of partition stated by the user at ${thicknessMm} mm for debris volume.`,
            costClass: "labour",
            taxClass: "works",
            provenance: "user_provided",
            flags: ["confirm_partition_is_non_loadbearing", "debris_arising"],
          }),
        );
        debrisItems.push({
          type: "wall",
          lengthM: partArea,
          widthM: 1,
          thicknessM: thicknessMm / 1000,
        });
        if (partitions.loadBearing !== false) {
          warnings.push(
            `Room ${roomName}: partition removal has not been confirmed as non load bearing. A structural check and any beam or pier are not included.`,
          );
        }
      } else {
        warnings.push(
          `Room ${roomName}: partition removal was requested without an area.`,
        );
      }
    }

    // --- new plaster / render -------------------------------------------
    if (work.plaster) {
      const plasterSpec = typeof work.plaster === "object" ? work.plaster : {};
      const patchesOnly = plasterSpec.patchesOnly === true;
      const thicknessMm =
        positive(plasterSpec.thicknessMm) || plasterThicknessMm;
      const areaM2 = metrics.wallAreaNetM2;
      const wetVolumeM3 = areaM2 * (thicknessMm / 1000);
      const dryVolumeM3 = wetVolumeM3 * MORTAR_DRY_VOLUME_FACTOR;
      lines.push(
        line({
          id: `${metrics.id}-plaster`,
          trade: "plaster_render",
          roomId: metrics.id,
          roomName,
          description: patchesOnly
            ? "Patch plaster to walls (localised repair)"
            : "Plaster or render to walls",
          quantity: round(areaM2, 2),
          unit: "m2",
          basis: `${metrics.wallAreaNetM2} m2 net wall area at ${thicknessMm} mm${patchesOnly ? ", measured as a patch allowance over the whole wall" : ""}.`,
          wastePercent: PLASTER_WASTAGE_PERCENT,
          wasteReason: `Site loss on mortar (${PLASTER_WASTAGE_PERCENT} percent).`,
          costClass: "labour",
          taxClass: "works",
          provenance: patchesOnly ? "derived_convention" : "measured",
          flags: patchesOnly ? ["verify_patch_extent_on_site"] : [],
        }),
      );
      lines.push(
        line({
          id: `${metrics.id}-plaster-mortar`,
          trade: "plaster_render",
          roomId: metrics.id,
          roomName,
          description: "Plaster mortar (dry volume)",
          quantity: round(dryVolumeM3, 3),
          unit: "m3",
          basis: `${round(areaM2, 2)} m2 x ${(thicknessMm / 1000).toFixed(3)} m = ${round(wetVolumeM3, 3)} m3 wet, x ${MORTAR_DRY_VOLUME_FACTOR} = ${round(dryVolumeM3, 3)} m3 dry.`,
          costClass: "material",
          taxClass: "materials",
          provenance: "measured",
        }),
      );
      for (const component of mixComponentQuantity(dryVolumeM3, RENDER_MIX)) {
        lines.push(
          line({
            id: `${metrics.id}-plaster-${component.component.role}`,
            trade: "plaster_render",
            roomId: metrics.id,
            roomName,
            description:
              component.component.role === "concrete-mix"
                ? "Cement for plaster"
                : "Sand for plaster",
            quantity: round(component.quantity, 3),
            unit: component.unit,
            basis: component.formula,
            costClass: "material",
            taxClass: "materials",
            provenance: "measured",
          }),
        );
      }
    }

    // --- screed ---------------------------------------------------------
    if (work.screed) {
      const screedSpec = typeof work.screed === "object" ? work.screed : {};
      const thicknessMm = positive(screedSpec.thicknessMm) || screedThicknessMm;
      const wetVolumeM3 = metrics.floorAreaM2 * (thicknessMm / 1000);
      const dryVolumeM3 = wetVolumeM3 * MORTAR_DRY_VOLUME_FACTOR;
      lines.push(
        line({
          id: `${metrics.id}-screed`,
          trade: "screed",
          roomId: metrics.id,
          roomName,
          description: "Cement and sand screed to floor",
          quantity: round(metrics.floorAreaM2, 2),
          unit: "m2",
          basis: `Floor area ${metrics.floorAreaM2} m2 at ${thicknessMm} mm.`,
          wastePercent: SCREED_WASTAGE_PERCENT,
          wasteReason: "Site loss on screed (5 percent).",
          costClass: "labour",
          taxClass: "works",
          provenance: "measured",
        }),
      );
      lines.push(
        line({
          id: `${metrics.id}-screed-volume`,
          trade: "screed",
          roomId: metrics.id,
          roomName,
          description: "Screed (dry volume)",
          quantity: round(dryVolumeM3, 3),
          unit: "m3",
          basis: `${round(metrics.floorAreaM2, 2)} m2 x ${(thicknessMm / 1000).toFixed(3)} m = ${round(wetVolumeM3, 3)} m3 wet, x ${MORTAR_DRY_VOLUME_FACTOR} = ${round(dryVolumeM3, 3)} m3 dry.`,
          costClass: "material",
          taxClass: "materials",
          provenance: "measured",
        }),
      );
      for (const component of mixComponentQuantity(dryVolumeM3, SCREED_MIX)) {
        lines.push(
          line({
            id: `${metrics.id}-screed-${component.component.role}`,
            trade: "screed",
            roomId: metrics.id,
            roomName,
            description:
              component.component.role === "concrete-mix"
                ? "Cement for screed"
                : "Sand for screed",
            quantity: round(component.quantity, 3),
            unit: component.unit,
            basis: component.formula,
            costClass: "material",
            taxClass: "materials",
            provenance: "measured",
          }),
        );
      }
    }

    // --- tiling ---------------------------------------------------------
    if (work.tiling) {
      const tiling = work.tiling;
      const layoutWaste = resolveLayoutWastePercent(room.layout);
      const tileSpec = {
        tileWidthMm:
          positive(tiling.tileWidthMm) || positive(defaults.tileWidthMm),
        tileHeightMm:
          positive(tiling.tileHeightMm) || positive(defaults.tileHeightMm),
      };
      const perTile = tileArea(tileSpec);
      const tilesPerBox = Math.max(
        0,
        Math.round(
          positive(tiling.tilesPerBox) || positive(defaults.tilesPerBox),
        ),
      );
      const adhesiveCoverage =
        positive(tiling.adhesiveCoverageM2PerBag) ||
        positive(defaults.adhesiveCoverageM2PerBag);

      const surfaces: Array<{
        key: "floor" | "walls";
        areaM2: number;
        label: string;
      }> = [];
      if (tiling.floor === true) {
        surfaces.push({
          key: "floor",
          areaM2: metrics.floorAreaM2,
          label: "Floor tiling",
        });
      }
      if (tiling.walls === true) {
        surfaces.push({
          key: "walls",
          areaM2: metrics.wallAreaNetM2,
          label: "Wall tiling",
        });
      }

      for (const surface of surfaces) {
        // Net area is the measured quantity; the buy figure is carried as
        // waste plus rounding, never folded into the quantity.
        const areaToBuy = surface.areaM2 * (1 + layoutWaste / 100);
        lines.push(
          line({
            id: `${metrics.id}-tile-${surface.key}`,
            trade: "tiling",
            roomId: metrics.id,
            roomName,
            description: surface.label,
            quantity: round(surface.areaM2, 2),
            exactQuantity: surface.areaM2,
            unit: "m2",
            basis: `${surface.areaM2} m2 measured net. With ${layoutWaste} percent cutting waste for ${room.layout ?? "standard_residential"} layout, buy ${round(areaToBuy, 2)} m2.`,
            wastePercent: layoutWaste,
            wasteReason: `Cutting and breakage for ${room.layout ?? "standard_residential"} layout.`,
            costClass: "material",
            taxClass: "materials",
            provenance: "measured",
          }),
        );

        if (perTile && perTile > 0) {
          const tiles = Math.ceil(areaToBuy / perTile);
          lines.push(
            line({
              id: `${metrics.id}-tile-${surface.key}-count`,
              trade: "tiling",
              roomId: metrics.id,
              roomName,
              description: `${surface.label} tile count`,
              quantity: tiles,
              unit: "nr",
              basis: `${round(areaToBuy, 2)} m2 ÷ ${round(perTile, 4)} m2 per tile = ${tiles} tiles.`,
              costClass: "material",
              taxClass: "materials",
              provenance: "measured",
            }),
          );
          if (tilesPerBox > 0) {
            const boxes = Math.ceil(tiles / tilesPerBox);
            lines.push(
              line({
                id: `${metrics.id}-tile-${surface.key}-boxes`,
                trade: "tiling",
                roomId: metrics.id,
                roomName,
                description: `${surface.label} boxes to buy`,
                quantity: boxes,
                unit: "box",
                basis: `${tiles} tiles ÷ ${tilesPerBox} per box = ${boxes} boxes, rounded up.`,
                costClass: "material",
                taxClass: "materials",
                provenance: "measured",
              }),
            );
          } else {
            warnings.push(
              `Room ${roomName}: tiles per box was not given, so no box count was raised for ${surface.label.toLowerCase()}.`,
            );
          }
        } else if (tiling.floor === true || tiling.walls === true) {
          warnings.push(
            `Room ${roomName}: tile size was not given, so ${surface.label.toLowerCase()} is measured in m2 only.`,
          );
        }

        if (adhesiveCoverage > 0) {
          // Adhesive is laid on the tiles bought, not on the measured area,
          // so the cutting waste is carried into the bag count.
          const bags = Math.ceil(areaToBuy / adhesiveCoverage);
          lines.push(
            line({
              id: `${metrics.id}-tile-${surface.key}-adhesive`,
              trade: "tiling",
              roomId: metrics.id,
              roomName,
              description: "Tile adhesive",
              quantity: bags,
              unit: "bag",
              basis: `${round(areaToBuy, 2)} m2 to buy ÷ ${adhesiveCoverage} m2 per bag = ${bags} bags, rounded up.`,
              costClass: "material",
              taxClass: "materials",
              provenance: "measured",
            }),
          );
        }
      }

      if (tiling.skirting === true) {
        lines.push(
          line({
            id: `${metrics.id}-tile-skirting`,
            trade: "tiling",
            roomId: metrics.id,
            roomName,
            description: "Tiled skirting",
            quantity: metrics.skirtingLengthM,
            unit: "m",
            basis: `Perimeter ${metrics.perimeterM} m less ${Math.max(0, Math.round(positive(room.doorCount)))} door opening(s) at ${DOOR_LEAF_WIDTH_M} m.`,
            wastePercent: layoutWaste,
            wasteReason: "Cuts at corners and openings.",
            costClass: "material",
            taxClass: "materials",
            provenance: "measured",
          }),
        );
      }
    }

    // --- other flooring --------------------------------------------------
    if (work.flooring) {
      const flooringSpec =
        typeof work.flooring === "object" ? work.flooring : {};
      const layoutWaste = resolveLayoutWastePercent(room.layout);
      lines.push(
        line({
          id: `${metrics.id}-flooring`,
          trade: "flooring",
          roomId: metrics.id,
          roomName,
          description: flooringSpec.material
            ? flooringSpec.material
            : "New floor finish",
          quantity: round(metrics.floorAreaM2, 2),
          exactQuantity: metrics.floorAreaM2,
          unit: "m2",
          basis: `${metrics.floorAreaM2} m2 measured net. With ${layoutWaste} percent waste for the stated layout, buy ${round(metrics.floorAreaM2 * (1 + layoutWaste / 100), 2)} m2.`,
          wastePercent: layoutWaste,
          wasteReason: "Cutting and setting out waste.",
          costClass: "material",
          taxClass: "materials",
          provenance: "measured",
        }),
      );
      lines.push(
        line({
          id: `${metrics.id}-skirting`,
          trade: "flooring",
          roomId: metrics.id,
          roomName,
          description: "Skirting",
          quantity: round(metrics.skirtingLengthM * (1 + layoutWaste / 100), 2),
          unit: "m",
          basis: `Skirting run ${metrics.skirtingLengthM} m with ${layoutWaste} percent cutting waste.`,
          wastePercent: layoutWaste,
          wasteReason: "Mitres and short lengths.",
          costClass: "material",
          taxClass: "materials",
          provenance: "measured",
        }),
      );
    }

    // --- painting --------------------------------------------------------
    if (work.paint) {
      const paintSpec = typeof work.paint === "object" ? work.paint : {};
      const statedCoats = positive(paintSpec.coats);
      const coats = Math.max(1, Math.round(statedCoats || paintCoats));
      if (statedCoats > 4) {
        warnings.push(
          `Room ${roomName}: ${statedCoats} coats were stated. Four is the practical maximum for a renovation, so check the number rather than ordering against it.`,
        );
      }
      // A wall that has just been plastered or had its tiles hacked off behaves
      // like bare plaster, whatever it used to be. Using the old surface
      // description there would under order paint by about a third of a coat.
      const wallsResurfaced =
        Boolean(work.plaster) || strippedNeedsRenderM2 > 0;
      const ceilingResurfaced =
        Boolean(work.ceiling) ||
        (stripOut.ceiling === true && Boolean(existing.ceilingFinish));
      const statedSurface = paintSpec.surface ?? existing.wallCondition;
      const resolvedSurface = resolveRenovationPaintSurface(statedSurface);
      if (!resolvedSurface.recognised) {
        warnings.push(
          `Room ${roomName}: the wall surface "${statedSurface}" is not a known surface, so no absorption factor was applied. Choose new plaster, screeded, smooth, textured or rough.`,
        );
      }
      const surfaces: Array<{ key: string; areaM2: number; label: string }> =
        [];
      if (paintSpec.walls !== false) {
        surfaces.push({
          key: "walls",
          areaM2: metrics.wallAreaNetM2,
          label: "Paint to walls",
        });
      }
      if (paintSpec.ceiling === true) {
        surfaces.push({
          key: "ceiling",
          areaM2: metrics.ceilingAreaM2,
          label: "Paint to ceiling",
        });
      }

      for (const surfaceRow of surfaces) {
        const isCeiling = surfaceRow.key === "ceiling";
        const resurfaced = isCeiling ? ceilingResurfaced : wallsResurfaced;
        const stated =
          (isCeiling
            ? (paintSpec.ceilingSurface ?? undefined)
            : statedSurface) ?? undefined;
        const effectiveSurface =
          stated ?? (resurfaced ? "new_plaster" : undefined);
        const surfaceFactor =
          resolveRenovationPaintSurface(effectiveSurface).factor;
        if (!stated && resurfaced) {
          assumptions.push(
            `Room ${roomName}: the ${isCeiling ? "ceiling" : "walls"} are newly finished, so the fresh plaster coverage factor has been applied rather than a repaint rate.`,
          );
        }
        const paintedArea = surfaceRow.areaM2 * coats;
        lines.push(
          line({
            id: `${metrics.id}-paint-${surfaceRow.key}`,
            trade: "painting",
            roomId: metrics.id,
            roomName,
            description: `${surfaceRow.label}, ${coats} coat${coats === 1 ? "" : "s"}`,
            quantity: round(paintedArea, 2),
            unit: "m2",
            basis: `${surfaceRow.areaM2} m2 x ${coats} coats = ${round(paintedArea, 2)} m2 of paint application.`,
            wastePercent: paintWaste,
            wasteReason: `Roller and tray loss, plus touching up (${paintWaste} percent).`,
            costClass: "labour",
            taxClass: "works",
            provenance: "measured",
          }),
        );

        if (coverage > 0) {
          // The surface factor adjusts coverage per litre, not litres: on bare
          // plaster one litre covers 0.75 of what it covers on a sealed wall,
          // so the same area needs more paint. Dividing by the factor is what
          // makes fresh plaster cost more than a repaint.
          const effectiveCoverage = coverage * surfaceFactor;
          // Litres are net; the ten percent loss is carried as the line's
          // own waste allowance and repeated in quantityWithWaste.
          const litres = paintedArea / effectiveCoverage;
          lines.push(
            line({
              id: `${metrics.id}-paint-${surfaceRow.key}-litres`,
              trade: "painting",
              roomId: metrics.id,
              roomName,
              description: `${surfaceRow.label} paint quantity`,
              quantity: round(litres, 1),
              exactQuantity: litres,
              unit: "L",
              basis: `${round(paintedArea, 2)} m2 ÷ (${coverage} m2 per litre x ${surfaceFactor} surface factor) = ${round(litres, 1)} L net, plus ${paintWaste} percent loss = ${round(litres * (1 + paintWaste / 100), 1)} L to buy.`,
              wastePercent: paintWaste,
              wasteReason: `Roller and tray loss, plus touching up (${paintWaste} percent).`,
              costClass: "material",
              taxClass: "materials",
              provenance: "measured",
              flags: effectiveSurface ? [`surface_${effectiveSurface}`] : [],
            }),
          );
        } else {
          warnings.push(
            `Room ${roomName}: paint coverage was not configured, so litres were not derived. The area is measured and ready.`,
          );
        }
      }

      if (
        (resolvedSurface.key === "new_plaster" ||
          resolvedSurface.key === "rough") &&
        stripOut.ceiling !== true
      ) {
        assumptions.push(
          "New plaster absorbs more paint than a sealed wall, so the coverage factor for fresh plaster has been applied rather than the repaint rate.",
        );
      }
    }

    // --- ceiling ---------------------------------------------------------
    if (work.ceiling) {
      const ceilingSpec = typeof work.ceiling === "object" ? work.ceiling : {};
      const type = ceilingSpec.type ?? "plasterboard";
      lines.push(
        line({
          id: `${metrics.id}-ceiling`,
          trade: "ceiling",
          roomId: metrics.id,
          roomName,
          description: `New ${type} ceiling`,
          quantity: round(metrics.ceilingAreaM2, 2),
          unit: "m2",
          basis: `Ceiling area ${metrics.ceilingAreaM2} m2.`,
          wastePercent: type === "pvc" ? 8 : 5,
          wasteReason: "Board cutting and perimeter setting out.",
          costClass: "material",
          taxClass: "materials",
          provenance: "measured",
        }),
      );
      lines.push(
        line({
          id: `${metrics.id}-ceiling-trim`,
          trade: "ceiling",
          roomId: metrics.id,
          roomName,
          description: "Ceiling perimeter trim or cove",
          quantity: metrics.perimeterM,
          unit: "m",
          basis: `Room perimeter ${metrics.perimeterM} m.`,
          wastePercent: 5,
          wasteReason: "Cuts at corners.",
          costClass: "material",
          taxClass: "materials",
          provenance: "measured",
        }),
      );
      if (type === "pop") {
        flags.add("pop_ceiling_needs_specialist_crew");
      }
    }

    // --- joinery ---------------------------------------------------------
    if (work.joinery) {
      const joinery = work.joinery;
      const doors = Math.max(0, Math.round(positive(joinery.doors)));
      const windows = Math.max(0, Math.round(positive(joinery.windows)));
      const wardrobe = positive(joinery.wardrobeRunM);
      const kitchen = positive(joinery.kitchenRunM);
      if (doors > 0) {
        lines.push(
          line({
            id: `${metrics.id}-joinery-doors`,
            trade: "joinery",
            roomId: metrics.id,
            roomName,
            description: "New internal door, frame and ironmongery",
            quantity: doors,
            unit: "nr",
            basis: `${doors} door(s) stated.`,
            costClass: "material",
            taxClass: "materials",
            provenance: "user_provided",
          }),
        );
      }
      if (windows > 0) {
        lines.push(
          line({
            id: `${metrics.id}-joinery-windows`,
            trade: "joinery",
            roomId: metrics.id,
            roomName,
            description: "Replace window, frame and glazing",
            quantity: windows,
            unit: "nr",
            basis: `${windows} window(s) stated. Size, glazing specification and any structural opening work are confirmed at survey.`,
            costClass: "material",
            taxClass: "materials",
            provenance: "user_provided",
            flags: ["verify_window_schedule"],
          }),
        );
      }
      if (wardrobe > 0) {
        lines.push(
          line({
            id: `${metrics.id}-joinery-wardrobe`,
            trade: "joinery",
            roomId: metrics.id,
            roomName,
            description: "Fitted wardrobe run",
            quantity: round(wardrobe, 2),
            unit: "m",
            basis: `${wardrobe} m of run stated by the user.`,
            costClass: "material",
            taxClass: "materials",
            provenance: "user_provided",
          }),
        );
      }
      if (kitchen > 0) {
        lines.push(
          line({
            id: `${metrics.id}-joinery-kitchen`,
            trade: "joinery",
            roomId: metrics.id,
            roomName,
            description: "Kitchen units, base and wall run",
            quantity: round(kitchen, 2),
            unit: "m",
            basis: `${kitchen} m of run stated by the user. Unit build up is priced by the kitchen estimator.`,
            costClass: "material",
            taxClass: "materials",
            provenance: "user_provided",
            flags: ["resolve_units_via_kitchen_estimator"],
          }),
        );
      }
    }

    // --- electrical ------------------------------------------------------
    if (work.electrical) {
      const electrical = work.electrical;
      const points: Array<{
        key: string;
        label: string;
        count: number;
        unit: string;
      }> = [
        {
          key: "lights",
          label: "Lighting point, first and second fix",
          count: positive(electrical.lightPoints),
          unit: "nr",
        },
        {
          key: "sockets",
          label: "Socket outlet, first and second fix",
          count: positive(electrical.socketPoints),
          unit: "nr",
        },
        {
          key: "switches",
          label: "Switch point",
          count: positive(electrical.switchPoints),
          unit: "nr",
        },
        {
          key: "circuits",
          label: "New circuit from the board",
          count: positive(electrical.circuits),
          unit: "nr",
        },
      ];
      for (const point of points) {
        if (point.count <= 0) continue;
        lines.push(
          line({
            id: `${metrics.id}-elec-${point.key}`,
            trade: "electrical",
            roomId: metrics.id,
            roomName,
            description: point.label,
            quantity: Math.round(point.count),
            unit: point.unit,
            basis: `${Math.round(point.count)} stated for this room.`,
            costClass: "labour",
            taxClass: "works",
            provenance: "user_provided",
            flags: ["requires_competent_person"],
          }),
        );
      }
    }

    // --- plumbing --------------------------------------------------------
    if (work.plumbing) {
      const plumbing = work.plumbing;
      const points: Array<{ key: string; label: string; count: number }> = [
        {
          key: "wc",
          label: "WC point, supply and waste",
          count: positive(plumbing.wcPoints),
        },
        {
          key: "basin",
          label: "Basin point, supply and waste",
          count: positive(plumbing.basinPoints),
        },
        {
          key: "shower",
          label: "Shower or bath point, supply and waste",
          count: positive(plumbing.showerPoints),
        },
        {
          key: "sink",
          label: "Kitchen sink point, supply and waste",
          count: positive(plumbing.sinkPoints),
        },
        {
          key: "appliance",
          label: "Appliance point, supply and waste",
          count: positive(plumbing.appliancePoints),
        },
      ];
      for (const point of points) {
        if (point.count <= 0) continue;
        lines.push(
          line({
            id: `${metrics.id}-plumb-${point.key}`,
            trade: "plumbing",
            roomId: metrics.id,
            roomName,
            description: point.label,
            quantity: Math.round(point.count),
            unit: "nr",
            basis: `${Math.round(point.count)} stated for this room.`,
            costClass: "labour",
            taxClass: "works",
            provenance: "user_provided",
            flags: ["requires_competent_person"],
          }),
        );
      }
    }

    // First fix leaves chases, boxes and pipe runs to be made good, and that
    // is work nobody measures until it is discovered. Name it rather than
    // quietly leave it out.
    const servicesPoints =
      positive(work.electrical?.lightPoints) +
      positive(work.electrical?.socketPoints) +
      positive(work.electrical?.switchPoints) +
      positive(work.electrical?.circuits) +
      positive(work.plumbing?.wcPoints) +
      positive(work.plumbing?.basinPoints) +
      positive(work.plumbing?.showerPoints) +
      positive(work.plumbing?.sinkPoints) +
      positive(work.plumbing?.appliancePoints);
    if (servicesPoints > 0) {
      flags.add("service_chases_patching_not_measured");
      assumptions.push(
        `Room ${roomName}: making good to chases, boxes and pipe runs for ${servicesPoints} service point(s) is not measured. It depends on the route taken on site.`,
      );
    }

    if (
      (room.use === "bathroom" ||
        room.use === "wc" ||
        room.use === "kitchen") &&
      (work.tiling || work.plumbing)
    ) {
      flags.add("wet_area_waterproofing_unmeasured");
    }
  }

  // --- project level ----------------------------------------------------

  const totalFloorAreaM2 = rooms.reduce(
    (sum, room) => sum + room.floorAreaM2,
    0,
  );
  const totalCeilingAreaM2 = rooms.reduce(
    (sum, room) => sum + room.ceilingAreaM2,
    0,
  );

  const labourFactor = renovationLabourFactor({
    occupied: input.occupied,
    floorLevel: input.floorLevel,
    liftAvailable: input.liftAvailable,
  });

  // Debris and waste removal.
  const demolition = calculateDemolitionTakeoff({
    marketCode,
    items: debrisItems.filter((item) => item.lengthM > 0 && item.widthM > 0),
    skipCapacityM3: positive(input.debrisContainerM3) || undefined,
  });
  const looseVolumeM3 = round(demolition.looseDebrisVolumeM3, 3);
  const containerCapacityM3 = positive(input.debrisContainerM3) || null;
  const containerLoads = demolition.estimatedSkipLoads;

  if (looseVolumeM3 > 0) {
    lines.push(
      line({
        id: "project-strip-out-arisings",
        trade: "preliminaries",
        roomId: null,
        roomName: null,
        description: "Strip out arisings to be removed from site",
        quantity: looseVolumeM3,
        unit: "m3",
        basis: `In place volume ${round(demolition.inPlaceVolumeM3, 3)} m3, bulked to ${looseVolumeM3} m3 loose for removal.`,
        wastePercent: 0,
        wasteReason: null,
        costClass: "plant",
        taxClass: "works",
        provenance: "measured",
        flags: ["disposal_charges_not_priced"],
      }),
    );
    if (containerCapacityM3 && containerLoads !== null) {
      lines.push(
        line({
          id: "project-waste-containers",
          trade: "preliminaries",
          roomId: null,
          roomName: null,
          description: "Waste container loads",
          quantity: containerLoads,
          unit: "load",
          basis: `${looseVolumeM3} m3 ÷ ${containerCapacityM3} m3 container at 85 percent effective fill = ${containerLoads} loads.`,
          costClass: "plant",
          taxClass: "works",
          provenance: "measured",
        }),
      );
    } else if (looseVolumeM3 > 0) {
      warnings.push(
        "No waste container capacity was given, so the arisings are measured in cubic metres only. Confirm how waste is removed in this market before pricing.",
      );
    }
  }

  // Protection of retained finishes.
  if (input.occupied === true) {
    const protection = positive(input.protectionAreaM2) || totalFloorAreaM2;
    if (protection > 0) {
      lines.push(
        line({
          id: "project-protection",
          trade: "preliminaries",
          roomId: null,
          roomName: null,
          description: "Protect retained floors, stairs and fittings",
          quantity: round(protection, 2),
          unit: "m2",
          basis: positive(input.protectionAreaM2)
            ? `${round(protection, 2)} m2 of protection stated.`
            : `${round(protection, 2)} m2 of floor area protected by default because the property is occupied.`,
          costClass: "preliminaries",
          taxClass: "works",
          provenance: positive(input.protectionAreaM2)
            ? "user_provided"
            : "derived_convention",
        }),
      );
    }
  } else if (input.occupied === false) {
    assumptions.push(
      "The property is empty during the works, so no protection of retained finishes has been measured.",
    );
  }

  // Cleaning and handover.
  if (totalFloorAreaM2 > 0) {
    lines.push(
      line({
        id: "project-final-clean",
        trade: "preliminaries",
        roomId: null,
        roomName: null,
        description: "Builders clean at handover",
        quantity: round(totalFloorAreaM2 + totalCeilingAreaM2, 2),
        unit: "m2",
        basis: `Floor area ${round(totalFloorAreaM2, 2)} m2 plus ceiling area ${round(totalCeilingAreaM2, 2)} m2 cleaned at completion.`,
        costClass: "labour",
        taxClass: "works",
        provenance: "measured",
      }),
    );
  }

  // Approvals. Never priced here, always flagged for verification.
  if (input.approvals?.required === true) {
    lines.push(
      line({
        id: "project-approvals",
        trade: "statutory",
        roomId: null,
        roomName: null,
        description: "Statutory approval and inspection allowance",
        quantity: 1,
        unit: "item",
        basis: `Approvals stated as required${input.approvals.note ? `: ${input.approvals.note}` : ""}. Fees are set by the authority and are not derived by this engine.`,
        costClass: "statutory",
        taxClass: "statutory",
        provenance: "unverified_allowance",
        flags: ["verify_fee_with_authority"],
      }),
    );
  } else if (input.approvals === null || input.approvals === undefined) {
    warnings.push(
      "It has not been stated whether the work needs statutory approval. Structural, drainage and layout changes usually do, and the fee is not included.",
    );
    blockers.push("Approval requirement not stated.");
  } else if (input.approvals.required === false) {
    assumptions.push(
      "The work has been stated as not requiring statutory approval. Confirm this with the local authority before relying on it.",
    );
  }

  // Asbestos and hazardous materials: older buildings, certain strip out.
  const yearBuilt = Number(input.yearBuilt);
  const touchingOlderFabric =
    (Number.isFinite(yearBuilt) && yearBuilt > 0 && yearBuilt < 2000) ||
    (!Number.isFinite(yearBuilt) && debrisItems.length > 0);
  if (debrisItems.length > 0 && touchingOlderFabric) {
    flags.add("asbestos_survey_before_strip_out");
    assumptions.push(
      "The building may predate the asbestos ban, so an asbestos survey is assumed before any strip out of ceilings, boards or textured coatings. No removal cost is included.",
    );
    if (!Number.isFinite(yearBuilt)) {
      warnings.push(
        "Year built was not given. The age assumption behind the asbestos warning is unconfirmed.",
      );
    }
  }

  // Contingency: only when the user sets it.
  const contingencyPercent = Number(input.contingencyPercent);
  if (
    Number.isFinite(contingencyPercent) &&
    (contingencyPercent < 0 || contingencyPercent > 25)
  ) {
    warnings.push(
      `A contingency of ${round(contingencyPercent, 2)} percent is outside the normal range for a renovation. It has been carried as stated because it is the user's number, and it is applied by the estimating layer.`,
    );
  }
  if (Number.isFinite(contingencyPercent) && contingencyPercent > 0) {
    lines.push(
      line({
        id: "project-contingency",
        trade: "contingency",
        roomId: null,
        roomName: null,
        description: "Contingency for unknown conditions",
        quantity: round(contingencyPercent, 2),
        unit: "%",
        basis: `${round(contingencyPercent, 2)} percent stated by the user, applied to the priced works by the estimating layer.`,
        costClass: "allowance",
        taxClass: "works",
        provenance: "user_provided",
        flags: ["applied_outside_engine"],
      }),
    );
  } else {
    warnings.push(
      "No contingency has been set. Renovations open up unknown conditions, so a contingency is normally carried.",
    );
  }

  // Quantities by unit, for a quick sanity read.
  const quantitiesByUnit: Record<string, number> = {};
  for (const row of lines) {
    if (row.quantity === null || !Number.isFinite(row.quantity)) continue;
    quantitiesByUnit[row.unit] = round(
      (quantitiesByUnit[row.unit] ?? 0) + row.quantity,
      3,
    );
  }

  const hasMeasurableLines = lines.some(
    (row) => row.provenance === "measured" && (row.quantity ?? 0) > 0,
  );
  if (!hasMeasurableLines && roomInputs.length > 0) {
    blockers.push(
      "Rooms are present but no scope was selected, so there is nothing measurable yet.",
    );
  }
  if (coverage <= 0 && lines.some((row) => row.trade === "painting")) {
    blockers.push(
      "Paint coverage is not configured, so paint litres are missing.",
    );
  }

  const status: RenovationEngineResult["readiness"]["status"] =
    blockers.length > 0
      ? "incomplete"
      : warnings.length > 0
        ? "measured"
        : "complete_for_pricing";

  return {
    marketCode,
    currencyCode,
    measurementSystem:
      input.measurementSystem ??
      (rooms.some((room) => isImperialUnit(room.unit)) ? "imperial" : "metric"),
    rooms,
    lines,
    labourFactor,
    debris: {
      inPlaceVolumeM3: round(demolition.inPlaceVolumeM3, 3),
      looseVolumeM3,
      bulkingFactor: round(
        demolition.inPlaceVolumeM3 > 0
          ? demolition.looseDebrisVolumeM3 / demolition.inPlaceVolumeM3
          : 1,
        2,
      ),
      containerLoads: containerLoads ?? null,
      containerCapacityM3,
    },
    quantitiesByUnit,
    assumptions: [...new Set(assumptions)],
    warnings: [...new Set(warnings)],
    flags: [...flags],
    readiness: { status, blockers },
  };
}

/**
 * A quantities only schedule for export. Deliberately excludes money: rates and
 * tax are resolved downstream, so a CSV can never imply a price that was not
 * verified.
 */
export function renovationScopeRegister(
  result: RenovationEngineResult,
  options: { system?: "metric" | "imperial" } = {},
): Array<{
  trade: RenovationTrade;
  tradeLabel: string;
  room: string;
  description: string;
  quantity: number | null;
  quantityWithWaste: number | null;
  unit: string;
  basis: string;
  wastePercent: number;
  provenance: RenovationProvenance;
}> {
  const system = options.system ?? "metric";
  return result.lines.map((row) => {
    const shown =
      row.quantity === null
        ? { quantity: null, unit: row.unit }
        : convertRenovationQuantity(row.quantity, row.unit, system);
    const withWaste =
      row.quantityWithWaste === null
        ? { quantity: null, unit: row.unit }
        : convertRenovationQuantity(row.quantityWithWaste, row.unit, system);
    return {
      trade: row.trade,
      tradeLabel: RENOVATION_TRADE_LABELS[row.trade],
      // User supplied wording can land in a cell, so anything a spreadsheet
      // would run as a formula is defused before it leaves the engine.
      room: spreadsheetSafe(row.roomName ?? "Whole project"),
      description: spreadsheetSafe(row.description),
      quantity: shown.quantity,
      quantityWithWaste: withWaste.quantity,
      unit: shown.unit,
      // The arithmetic stays metric so the register can always be checked.
      basis: spreadsheetSafe(row.basis),
      wastePercent: row.wastePercent,
      provenance: row.provenance,
    };
  });
}

/** Trade order for presentation and for a BOQ that reads like a bill. */
export const RENOVATION_TRADE_ORDER: readonly RenovationTrade[] = Object.freeze(
  [
    "preliminaries",
    "statutory",
    "strip_out",
    "making_good",
    "plaster_render",
    "screed",
    "tiling",
    "flooring",
    "ceiling",
    "joinery",
    "painting",
    "electrical",
    "plumbing",
    "contingency",
  ],
);

export interface RenovationTradeGroup {
  trade: RenovationTrade;
  lines: RenovationScopeLine[];
  /** Quantities per unit inside this trade, never mixed across units. */
  quantities: Array<{ unit: string; quantity: number }>;
  itemCount: number;
  flagged: string[];
}

/**
 * Groups the measured work by trade so a schedule, a page or a BOQ section can
 * present it in a conventional order without recomputing anything.
 */
export function groupRenovationByTrade(
  result: RenovationEngineResult,
): RenovationTradeGroup[] {
  const groups: RenovationTradeGroup[] = [];
  for (const trade of RENOVATION_TRADE_ORDER) {
    const rows = result.lines.filter((row) => row.trade === trade);
    if (rows.length === 0) continue;
    const totals = new Map<string, number>();
    for (const row of rows) {
      if (row.quantity === null || !Number.isFinite(row.quantity)) continue;
      totals.set(row.unit, (totals.get(row.unit) ?? 0) + row.quantity);
    }
    groups.push({
      trade,
      lines: rows,
      quantities: [...totals.entries()].map(([unit, quantity]) => ({
        unit,
        quantity: Math.round(quantity * 1000) / 1000,
      })),
      itemCount: rows.length,
      flagged: [...new Set(rows.flatMap((row) => row.flags))],
    });
  }
  return groups;
}

/** One label per trade, so a page, a schedule and a translation share a key. */
export const RENOVATION_TRADE_LABELS: Readonly<
  Record<RenovationTrade, string>
> = Object.freeze({
  preliminaries: "Preliminaries",
  statutory: "Statutory approvals",
  strip_out: "Strip out and demolition",
  making_good: "Making good",
  plaster_render: "Plaster and render",
  screed: "Screed",
  tiling: "Tiling",
  flooring: "Flooring",
  ceiling: "Ceilings",
  joinery: "Joinery",
  painting: "Painting and decorating",
  electrical: "Electrical",
  plumbing: "Plumbing",
  contingency: "Contingency",
});

/**
 * Converts a measured quantity for display in an imperial market. Conversion
 * happens at presentation only: the engine, and every downstream calculation,
 * stays metric so two users never get different totals from rounding.
 */
export function convertRenovationQuantity(
  quantity: number,
  unit: string,
  system: "metric" | "imperial",
): { quantity: number; unit: string } {
  if (system === "metric" || !Number.isFinite(quantity))
    return { quantity, unit };
  switch (unit) {
    case "m2":
      return {
        quantity: round(fromSqMeters(quantity, "sqft"), 2),
        unit: "sq ft",
      };
    case "m3":
      return {
        quantity: round(quantity * CUBIC_METRES_TO_CUBIC_FEET, 3),
        unit: "cu ft",
      };
    case "m":
      return { quantity: round(fromMeters(quantity, "feet"), 2), unit: "ft" };
    case "L":
      return {
        quantity: round(quantity / LITRES_PER_US_GALLON, 2),
        unit: "US gal",
      };
    default:
      return { quantity, unit };
  }
}

/** Quantities per unit, optionally shown in imperial units. */
export function renovationTotalsByUnit(
  result: RenovationEngineResult,
  system: "metric" | "imperial" = "metric",
  options: { includeWaste?: boolean } = {},
): Array<{ unit: string; quantity: number }> {
  const totals = new Map<string, number>();
  for (const row of result.lines) {
    const value = options.includeWaste ? row.quantityWithWaste : row.quantity;
    if (value === null || !Number.isFinite(value)) continue;
    const shown = convertRenovationQuantity(value, row.unit, system);
    totals.set(shown.unit, (totals.get(shown.unit) ?? 0) + shown.quantity);
  }
  return [...totals.entries()].map(([unit, quantity]) => ({
    unit,
    quantity: round(quantity, 3),
  }));
}
