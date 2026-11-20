// =========================================================
// SHARED OPENINGS MODEL
//
// Before this module there were three different opening shapes: build-to-roof
// carried { type: door|window, width, height, count } in metres, paint carried
// { width, height, quantity } in the calculator's display unit, and
// wall-finishing carried its own variant. Every engine therefore deducted
// openings its own way, and a door that was 0.9 m in one calculator could be
// read as 0.9 ft in another.
//
// This is the single source of truth for opening geometry and deduction:
//   - categories that match how buildings are actually described: windows,
//     internal doors, and entrance/security doors
//   - any number of size groups per category, because a toilet window is not
//     the same size as a living room window
//   - one deduction policy (the tiered one paint already used), so a wall
//     deducts the same area whatever calculator asks
//   - regional default sizes, so a template or a new project starts from
//     dimensions that are normal where the user is building
//
// Dimensions are canonical millimetres here. Calculators that work in metres
// convert at the edge, once.
// =========================================================

export type OpeningCategory = "window" | "internal_door" | "entrance_door";

export const OPENING_CATEGORIES: readonly OpeningCategory[] = [
  "window",
  "internal_door",
  "entrance_door",
] as const;

export const OPENING_CATEGORY_LABELS: Record<OpeningCategory, string> = {
  window: "Windows",
  internal_door: "Internal doors",
  entrance_door: "Entrance / security doors",
};

export interface OpeningGroup {
  category: OpeningCategory;
  /** Free text, e.g. "Toilet window", "Bathroom door". */
  label?: string;
  widthMm: number;
  heightMm: number;
  count: number;
  /**
   * Optional identity and location. Arithmetic ignores all of these; they exist
   * so a schedule can be compared between revisions and read floor by floor
   * instead of being an anonymous count.
   */
  id?: string;
  level?: string;
  room?: string;
  /** Height of the sill above finished floor, for window schedules. */
  sillMm?: number;
  /**
   * Depth of the reveal on this opening. EIFS clads the returns, so a deeper
   * reveal adds area; engines that do not clad reveals ignore it.
   */
  revealDepthMm?: number;
}

export interface NormalisedOpening extends OpeningGroup {
  areaM2: number;
}

export interface CategoryTotals {
  count: number;
  areaM2: number;
}

export interface OpeningTotals {
  groups: NormalisedOpening[];
  byCategory: Record<OpeningCategory, CategoryTotals>;
  totalCount: number;
  totalAreaM2: number;
  /** Sum of (2 x height + width) per opening, used for reveals and trims. */
  revealPerimeterM: number;
}

/**
 * Physical bounds. Below 200 mm is not an opening, and above these limits is a
 * data-entry slip rather than a design: 6 m is wider than any standard door or
 * window unit and 4 m taller than a storey.
 */
export const OPENING_LIMITS = {
  minWidthMm: 200,
  maxWidthMm: 6000,
  minHeightMm: 200,
  maxHeightMm: 4000,
  maxCountPerGroup: 500,
} as const;

export interface NormaliseResult {
  groups: OpeningGroup[];
  warnings: string[];
}

function clampInt(value: unknown, min: number, max: number): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/**
 * Accept anything that looks like an opening list and return canonical groups.
 *
 * `metres` exists for the legacy build-to-roof shape, whose width and height
 * were stored in metres. It is explicit rather than guessed from the magnitude,
 * because guessing would silently treat a 0.9 m door as 0.9 mm or a 900 mm door
 * as 900 m.
 */
export function normaliseOpenings(
  raw: unknown,
  options: { metres?: boolean } = {},
): NormaliseResult {
  const warnings: string[] = [];
  if (!Array.isArray(raw)) return { groups: [], warnings };

  const groups: OpeningGroup[] = [];
  for (const entry of raw as Array<Record<string, unknown>>) {
    if (!entry || typeof entry !== "object") continue;

    const rawCategory = String(entry.category ?? entry.type ?? "window");
    const category: OpeningCategory =
      rawCategory === "internal_door" || rawCategory === "internaldoor"
        ? "internal_door"
        : rawCategory === "entrance_door" ||
            rawCategory === "security_door" ||
            rawCategory === "entrance"
          ? "entrance_door"
          : rawCategory === "door"
            ? // A bare "door" is an internal door: an entrance door is never
              // described as just a door in a schedule.
              "internal_door"
            : "window";

    const scale = options.metres ? 1000 : 1;
    const widthRaw = entry.widthMm ?? entry.width ?? 0;
    const heightRaw = entry.heightMm ?? entry.height ?? 0;
    const widthMm = Math.round(Number(widthRaw) * scale);
    const heightMm = Math.round(Number(heightRaw) * scale);
    const count = Math.round(Number(entry.count ?? entry.quantity ?? 0));

    if (!Number.isFinite(widthMm) || widthMm <= 0) continue;
    if (!Number.isFinite(heightMm) || heightMm <= 0) continue;
    if (!Number.isFinite(count) || count <= 0) continue;

    const clampedWidth = clampInt(
      widthMm,
      OPENING_LIMITS.minWidthMm,
      OPENING_LIMITS.maxWidthMm,
    );
    const clampedHeight = clampInt(
      heightMm,
      OPENING_LIMITS.minHeightMm,
      OPENING_LIMITS.maxHeightMm,
    );
    const clampedCount = clampInt(count, 1, OPENING_LIMITS.maxCountPerGroup);

    if (clampedWidth !== widthMm)
      warnings.push(
        `Opening width ${widthMm} mm is outside ${OPENING_LIMITS.minWidthMm}-${OPENING_LIMITS.maxWidthMm} mm and was clamped.`,
      );
    if (clampedHeight !== heightMm)
      warnings.push(
        `Opening height ${heightMm} mm is outside ${OPENING_LIMITS.minHeightMm}-${OPENING_LIMITS.maxHeightMm} mm and was clamped.`,
      );
    if (clampedCount !== count)
      warnings.push(`Opening count ${count} was clamped to ${clampedCount}.`);

    groups.push({
      category,
      label: typeof entry.label === "string" ? entry.label : undefined,
      widthMm: clampedWidth,
      heightMm: clampedHeight,
      count: clampedCount,
      id: typeof entry.id === "string" ? entry.id : undefined,
      level: typeof entry.level === "string" ? entry.level : undefined,
      room: typeof entry.room === "string" ? entry.room : undefined,
      sillMm:
        Number(entry.sillMm) >= 0 && Number.isFinite(Number(entry.sillMm))
          ? Math.round(Number(entry.sillMm))
          : undefined,
      revealDepthMm:
        Number(entry.revealDepthMm) > 0 &&
        Number.isFinite(Number(entry.revealDepthMm))
          ? Math.round(Number(entry.revealDepthMm))
          : undefined,
    });
  }

  return { groups, warnings };
}

/** Canonical totals for a list of groups. */
export function openingTotals(groups: OpeningGroup[]): OpeningTotals {
  const byCategory: Record<OpeningCategory, CategoryTotals> = {
    window: { count: 0, areaM2: 0 },
    internal_door: { count: 0, areaM2: 0 },
    entrance_door: { count: 0, areaM2: 0 },
  };
  const normalised: NormalisedOpening[] = [];
  let totalCount = 0;
  let totalArea = 0;
  let revealPerimeter = 0;

  for (const g of groups) {
    const w = g.widthMm / 1000;
    const h = g.heightMm / 1000;
    const area = w * h;
    normalised.push({ ...g, areaM2: round3(area) });
    byCategory[g.category].count += g.count;
    byCategory[g.category].areaM2 = round3(
      byCategory[g.category].areaM2 + area * g.count,
    );
    totalCount += g.count;
    totalArea += area * g.count;
    revealPerimeter += (2 * h + w) * g.count;
  }

  return {
    groups: normalised,
    byCategory,
    totalCount,
    totalAreaM2: round3(totalArea),
    revealPerimeterM: round3(revealPerimeter),
  };
}

export interface TradeDeduction {
  deductionM2: number;
  revealAdditionM2: number;
  small: number;
  partial: number;
  full: number;
}

/**
 * The deduction policy every calculator uses.
 *
 * Taken from what the paint engine already did, because it reflects how a
 * tradesperson actually measures: an opening of 0.5 m2 or less is not deducted
 * (the reveal work offsets it), between 0.5 and 3 m2 is deducted at 85% to allow
 * for the reveal, and above 3 m2 is deducted in full with the reveal added back.
 *
 * One policy matters more than which policy: two calculators deducting the same
 * door differently is the defect this module exists to remove.
 */
export function tradeDeduction(
  groups: OpeningGroup[],
  revealDepthMm = 0,
): TradeDeduction {
  const out: TradeDeduction = {
    deductionM2: 0,
    revealAdditionM2: 0,
    small: 0,
    partial: 0,
    full: 0,
  };
  const revealM = Math.max(0, revealDepthMm) / 1000;

  for (const g of groups) {
    const w = g.widthMm / 1000;
    const h = g.heightMm / 1000;
    const area = w * h;
    // A per-opening reveal depth wins: a door in a thick wall has a deeper
    // return than a window in the same wall.
    const groupRevealM =
      g.revealDepthMm && g.revealDepthMm > 0 ? g.revealDepthMm / 1000 : revealM;
    for (let i = 0; i < g.count; i += 1) {
      if (area <= 0.5) {
        out.small += 1;
      } else if (area <= 3) {
        out.partial += 1;
        out.deductionM2 += 0.85 * area;
      } else {
        out.full += 1;
        out.deductionM2 += area;
        out.revealAdditionM2 += (2 * h + w) * groupRevealM;
      }
    }
  }

  out.deductionM2 = round3(out.deductionM2);
  out.revealAdditionM2 = round3(out.revealAdditionM2);
  return out;
}

/**
 * Structural deduction: the whole opening is a void in the wall.
 *
 * A finishing trade deducts 85% between 0.5 and 3 m2 because the reveal work
 * offsets part of it, but a block wall is not built where a window goes, so
 * structural takeoffs deduct in full. Both policies live here so the
 * difference is a stated choice rather than two engines quietly disagreeing.
 */
export function structuralDeduction(groups: OpeningGroup[]): TradeDeduction {
  const out: TradeDeduction = {
    deductionM2: 0,
    revealAdditionM2: 0,
    small: 0,
    partial: 0,
    full: 0,
  };
  for (const g of groups) {
    const area = (g.widthMm / 1000) * (g.heightMm / 1000);
    out.full += g.count;
    out.deductionM2 += area * g.count;
  }
  out.deductionM2 = round3(out.deductionM2);
  return out;
}

export type DeductionPolicy = "structural" | "trade";

/** Net area under either policy. Structural ignores reveals. */
export function netAreaAfterOpenings(
  grossAreaM2: number,
  groups: OpeningGroup[],
  options: { policy?: DeductionPolicy; revealDepthMm?: number } = {},
): { netAreaM2: number; deduction: TradeDeduction } {
  const policy = options.policy ?? "trade";
  const deduction =
    policy === "structural"
      ? structuralDeduction(groups)
      : tradeDeduction(groups, options.revealDepthMm ?? 0);
  const net = Math.max(
    0,
    grossAreaM2 - deduction.deductionM2 + deduction.revealAdditionM2,
  );
  return { netAreaM2: round3(net), deduction };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

// =========================================================
// Regional defaults
//
// These are TYPICAL PRACTICE, not code. Building codes set minimums (IRC R311
// and Part M among others) and a buyer's schedule always governs; the point of
// these figures is that a template or a fresh project starts from dimensions
// that are normal in the user's market instead of one market's numbers.
//
// Markets are grouped by the convention they actually build to rather than
// given invented per-country values, and each family names its basis.
// =========================================================

export type OpeningSizeConvention =
  | "imperial_na"
  | "metric_uk"
  | "metric_au"
  | "metric_ng"
  | "metric_in"
  | "metric_eu";

export interface OpeningSizeDefaults {
  window: { widthMm: number; heightMm: number };
  internal_door: { widthMm: number; heightMm: number };
  entrance_door: { widthMm: number; heightMm: number };
}

export const OPENING_SIZE_DEFAULTS: Record<
  OpeningSizeConvention,
  OpeningSizeDefaults
> = {
  // 30 in x 80 in internal, 36 in x 80 in entrance, 48 in x 60 in window.
  imperial_na: {
    internal_door: { widthMm: 762, heightMm: 2032 },
    entrance_door: { widthMm: 914, heightMm: 2032 },
    window: { widthMm: 1219, heightMm: 1524 },
  },
  // 2 ft 6 in internal, 2 ft 9 in entrance, 1200 x 1200 window.
  metric_uk: {
    internal_door: { widthMm: 762, heightMm: 1981 },
    entrance_door: { widthMm: 838, heightMm: 1981 },
    window: { widthMm: 1200, heightMm: 1200 },
  },
  metric_au: {
    internal_door: { widthMm: 820, heightMm: 2040 },
    entrance_door: { widthMm: 920, heightMm: 2040 },
    window: { widthMm: 1200, heightMm: 1200 },
  },
  metric_ng: {
    internal_door: { widthMm: 750, heightMm: 2100 },
    entrance_door: { widthMm: 900, heightMm: 2100 },
    window: { widthMm: 1200, heightMm: 1200 },
  },
  metric_in: {
    internal_door: { widthMm: 750, heightMm: 2100 },
    entrance_door: { widthMm: 1050, heightMm: 2100 },
    window: { widthMm: 1200, heightMm: 1200 },
  },
  // 860 mm internal is the common German/Scandinavian leaf; 985 mm entrance.
  metric_eu: {
    internal_door: { widthMm: 860, heightMm: 2010 },
    entrance_door: { widthMm: 985, heightMm: 2100 },
    window: { widthMm: 1200, heightMm: 1350 },
  },
};

/** Markets that build to each convention. Everything else uses metric_eu. */
export const MARKET_OPENING_CONVENTION: Record<string, OpeningSizeConvention> =
  {
    US: "imperial_na",
    CA: "imperial_na",
    GB: "metric_uk",
    IE: "metric_uk",
    AU: "metric_au",
    NZ: "metric_au",
    NG: "metric_ng",
    GH: "metric_ng",
    KE: "metric_ng",
    ZA: "metric_ng",
    IN: "metric_in",
    PK: "metric_in",
    BD: "metric_in",
    DE: "metric_eu",
    FR: "metric_eu",
    NL: "metric_eu",
    ES: "metric_eu",
    IT: "metric_eu",
    PT: "metric_eu",
    AE: "metric_eu",
    SA: "metric_eu",
    TR: "metric_eu",
    CN: "metric_eu",
    MX: "metric_eu",
    BR: "metric_eu",
  };

export function openingConventionForMarket(
  marketCode: string | undefined | null,
): OpeningSizeConvention {
  if (!marketCode) return "metric_eu";
  return MARKET_OPENING_CONVENTION[marketCode.toUpperCase()] ?? "metric_eu";
}

export function openingDefaultsForMarket(
  marketCode: string | undefined | null,
): OpeningSizeDefaults {
  return OPENING_SIZE_DEFAULTS[openingConventionForMarket(marketCode)];
}

/**
 * A starting schedule for a market: one group per category at the market's
 * typical size. Callers override counts and add size groups as the building
 * requires.
 */
export function defaultOpeningGroups(
  marketCode: string | undefined | null,
  counts: Partial<Record<OpeningCategory, number>> = {
    window: 6,
    internal_door: 4,
    entrance_door: 1,
  },
): OpeningGroup[] {
  const defaults = openingDefaultsForMarket(marketCode);
  const groups: OpeningGroup[] = [];
  for (const category of OPENING_CATEGORIES) {
    const count = Math.max(0, Math.round(Number(counts[category] ?? 0)));
    if (count === 0) continue;
    groups.push({
      category,
      label: OPENING_CATEGORY_LABELS[category],
      widthMm: defaults[category].widthMm,
      heightMm: defaults[category].heightMm,
      count,
    });
  }
  return groups;
}

// =========================================================
// Legacy adapters
//
// Each calculator grew its own opening shape before this module existed. These
// read those shapes into the canonical model so an engine can accept the shared
// schedule without breaking a saved draft or template that still holds the old
// one. They are read-only: nothing here writes back to the legacy shape.
// =========================================================

/** Paint's shape: width and height in the calculator's display unit. */
export interface LegacyDisplayOpening {
  quantity?: number;
  count?: number;
  width?: number;
  height?: number;
}

/** Drywall and EIFS shape: metres, with a quantity or count. */
export interface LegacyMetreOpening {
  widthM?: number;
  heightM?: number;
  quantity?: number;
  count?: number;
  label?: string;
  category?: OpeningCategory;
}

export type LengthUnit = "mm" | "cm" | "m" | "ft" | "in";

const TO_MM: Record<LengthUnit, number> = {
  mm: 1,
  cm: 10,
  m: 1000,
  ft: 304.8,
  in: 25.4,
};

/**
 * Convert a list measured in metres (drywall, EIFS) into canonical groups.
 *
 * The category defaults to window because these engines never recorded one;
 * callers that know better pass it explicitly.
 */
export function fromMetreOpenings(
  list: LegacyMetreOpening[] | undefined | null,
  defaultCategory: OpeningCategory = "window",
): OpeningGroup[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((o) => Number(o?.widthM) > 0 && Number(o?.heightM) > 0)
    .map((o) => ({
      category: o.category ?? defaultCategory,
      label: o.label,
      widthMm: Math.round(Number(o.widthM) * 1000),
      heightMm: Math.round(Number(o.heightM) * 1000),
      count: Math.max(1, Math.round(Number(o.quantity ?? o.count ?? 1))),
    }));
}

/**
 * Convert a list measured in a display unit (paint) into canonical groups.
 * A unit of feet is not a detail: 3 ft read as 3 m triples the opening.
 */
export function fromDisplayOpenings(
  list: LegacyDisplayOpening[] | undefined | null,
  unit: LengthUnit = "m",
  defaultCategory: OpeningCategory = "window",
): OpeningGroup[] {
  if (!Array.isArray(list)) return [];
  const factor = TO_MM[unit] ?? 1000;
  return list
    .filter((o) => Number(o?.width) > 0 && Number(o?.height) > 0)
    .map((o) => ({
      category: defaultCategory,
      widthMm: Math.round(Number(o.width) * factor),
      heightMm: Math.round(Number(o.height) * factor),
      count: Math.max(1, Math.round(Number(o.quantity ?? o.count ?? 1))),
    }));
}

/**
 * The groups an engine should price with: the shared schedule when the caller
 * supplied one, otherwise the legacy list converted, otherwise nothing.
 *
 * Precedence is explicit rather than merged, because adding the two would
 * double every opening a user re-entered in the new shape.
 */
/**
 * Canonical groups in the metre shape the system engines already use
 * internally. One conversion point, so an engine keeps its tested internals and
 * still accepts the shared schedule.
 */
export function toMetreOpenings(groups: OpeningGroup[]): Array<{
  widthM: number;
  heightM: number;
  count: number;
  label?: string;
  revealDepthMm?: number;
}> {
  return groups.map((g) => ({
    widthM: g.widthMm / 1000,
    heightM: g.heightMm / 1000,
    count: g.count,
    label: g.label,
    revealDepthMm: g.revealDepthMm,
  }));
}

export function resolveOpenings(
  openingGroups: OpeningGroup[] | undefined | null,
  legacy: OpeningGroup[] | undefined | null,
): OpeningGroup[] {
  if (Array.isArray(openingGroups) && openingGroups.length > 0) {
    return normaliseOpenings(openingGroups).groups;
  }
  return legacy ?? [];
}
