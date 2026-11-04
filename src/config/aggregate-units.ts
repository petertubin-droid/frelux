/**
 * How sand and other loose aggregates are actually bought and measured.
 *
 * A cubic metre is not a unit anyone buys sand in on a Nigerian site: you buy
 * a trip from a tipper, and the gang measures it out by wheelbarrow or head
 * pan. The United Kingdom buys a bulk bag or a tonne, the United States buys a
 * cubic yard. Every calculator that prices sand has to speak the local unit or
 * its quantities are meaningless, so the table lives here once and the
 * calculators read it.
 *
 * Volumes are approximations of a heaped measure, kept conservative and
 * published with their source so a reader can check the figure rather than
 * trust it. Where a source disagrees with site practice, the note says so.
 */

export type AggregateUnitKey =
  | "cubicmetre"
  | "trip"
  | "wheelbarrow"
  | "headpan"
  | "bulkbag"
  | "tonne"
  | "shortton"
  | "cubicyard"
  | "bag25kg";

export interface AggregateUnitOption {
  key: AggregateUnitKey;
  /** What a supplier calls it, e.g. "Trip (10 tonne tipper)". */
  label: string;
  /** Short form for quantity lines, e.g. "trips". */
  plural: string;
  /** Cubic metres of loose sand in one of these. */
  cubicMetres: number;
  /** Where the figure comes from, or why it is a site convention. */
  note: string;
  sourceId?: string;
}

export interface AggregateSource {
  id: string;
  claim: string;
  url: string;
}

export const AGGREGATE_SOURCES: AggregateSource[] = [
  {
    id: "wheelbarrow-capacity",
    claim: "A standard builders wheelbarrow holds about 80 litres, 0.08 m³.",
    url: "https://barrowmixconcrete.com/how-many-wheelbarrows-in-a-cubic-metre/",
  },
  {
    id: "headpan-per-wheelbarrow",
    claim: "Site practice in Nigeria: 4 head pans fill one wheelbarrow.",
    url: "https://engineersforum.com.ng/2021/07/25/cement-sand-and-granite-concrete-mix-explained/",
  },
  {
    id: "trip-headpans",
    claim:
      "One lorry trip of fine sand measures about 218 head pans, or 55 wheelbarrows, at 4 head pans per barrow.",
    url: "https://www.researchgate.net/publication/330525973_THE_QUANTITIES_OF_MATERIALS_IN_ONE_CUBIC_METER_OF_CONCRETE_USING_DIFFERENT_MIX_RATIOS",
  },
  {
    id: "headpan-volume",
    claim: "A head pan measures about 0.017 m³.",
    url: "https://www.nairaland.com/3969367/how-many-wheelbarrow-sand-granite",
  },
  {
    id: "trip-size",
    claim:
      "Nigerian tipper trips are sold by tipper size: a 10 tonne tipper carries about 6.25 m³ of sharp sand.",
    url: "https://www.facebook.com/groups/595582771739008/posts/1568330144464261/",
  },
];

/** Loose sharp sand, damp, compacted in the truck: about 1.6 tonnes per m³. */
export const SAND_TONNES_PER_CUBIC_METRE = 1.6;

const HEAD_PAN_M3 = 0.017;
/**
 * Four head pans is the site measure. A struck 80 litre barrow is 0.08 m³, so
 * the site figure sits a little under a full barrow, which is what a gang
 * actually loads when it is counting pans.
 */
const WHEELBARROW_M3 = Number((HEAD_PAN_M3 * 4).toFixed(4));

const CUBIC_METRE: AggregateUnitOption = {
  key: "cubicmetre",
  label: "Cubic metre",
  plural: "m³",
  cubicMetres: 1,
  note: "Measured volume, the unit used in specifications and take-offs.",
};

const TONNE: AggregateUnitOption = {
  key: "tonne",
  label: "Tonne",
  plural: "t",
  cubicMetres: Number((1 / SAND_TONNES_PER_CUBIC_METRE).toFixed(4)),
  note: "One tonne of damp sharp sand is about 0.625 m³ at 1.6 tonnes per m³.",
};

const WHEELBARROW: AggregateUnitOption = {
  key: "wheelbarrow",
  label: "Wheelbarrow",
  plural: "barrows",
  cubicMetres: WHEELBARROW_M3,
  note: "Counted as four head pans, the Nigerian site measure. A struck 80 litre barrow is 0.08 m³, slightly more.",
  sourceId: "headpan-per-wheelbarrow",
};

const HEAD_PAN: AggregateUnitOption = {
  key: "headpan",
  label: "Head pan",
  plural: "pans",
  cubicMetres: HEAD_PAN_M3,
  note: "About 0.017 m³ heaped. Four pans fill one wheelbarrow on site.",
  sourceId: "headpan-volume",
};

const TRIP: AggregateUnitOption = {
  key: "trip",
  label: "Trip (10 tonne tipper)",
  plural: "trips",
  cubicMetres: 6.25,
  note: "A 10 tonne tipper is about 6.25 m³. Smaller and larger tippers are quoted separately, so check the size you are paying for.",
  sourceId: "trip-size",
};

const SMALL_TRIP: AggregateUnitOption = {
  key: "trip",
  label: "Trip (5 tonne tipper)",
  plural: "trips",
  cubicMetres: 3.125,
  note: "A 5 tonne tipper is about 3.1 m³.",
  sourceId: "trip-size",
};

const BIG_TRIP: AggregateUnitOption = {
  key: "trip",
  label: "Trip (20 tonne tipper)",
  plural: "trips",
  cubicMetres: 12.5,
  note: "A 20 tonne tipper is about 12.5 m³.",
  sourceId: "trip-size",
};

const BULK_BAG: AggregateUnitOption = {
  key: "bulkbag",
  label: "Bulk bag",
  plural: "bulk bags",
  cubicMetres: 0.7,
  note: "A builder's bulk bag is nominally 0.7 m³, about 850 kg of damp sharp sand. Suppliers vary, so confirm on the listing.",
};

const CUBIC_YARD: AggregateUnitOption = {
  key: "cubicyard",
  label: "Cubic yard",
  plural: "cu yd",
  cubicMetres: 0.7646,
  note: "One cubic yard is 0.7646 m³, the unit sand and gravel are sold in.",
};

const SHORT_TON: AggregateUnitOption = {
  key: "shortton",
  label: "Short ton",
  plural: "short tons",
  cubicMetres: 0.567,
  note: "A US short ton is 907 kg, about 0.567 m³ of damp sand.",
};

const BAG_25KG: AggregateUnitOption = {
  key: "bag25kg",
  label: "25 kg bag",
  plural: "bags",
  cubicMetres: 0.0156,
  note: "A 25 kg bag is about 0.016 m³. Bagged sand costs far more per cubic metre than loose, so it suits repairs rather than new work.",
};

/**
 * The order matters: the first unit is the default for that market, because it
 * is what a price is quoted in.
 */
const MARKET_UNITS: Record<string, AggregateUnitOption[]> = {
  // Tipper trips, measured on site by wheelbarrow or head pan.
  NG: [TRIP, SMALL_TRIP, BIG_TRIP, WHEELBARROW, HEAD_PAN, CUBIC_METRE],
  GH: [TRIP, SMALL_TRIP, BIG_TRIP, WHEELBARROW, HEAD_PAN, CUBIC_METRE],
  KE: [TONNE, TRIP, WHEELBARROW, CUBIC_METRE],
  UG: [TRIP, TONNE, WHEELBARROW, CUBIC_METRE],
  TZ: [TRIP, TONNE, WHEELBARROW, CUBIC_METRE],
  ZM: [TRIP, TONNE, WHEELBARROW, CUBIC_METRE],
  ZA: [CUBIC_METRE, TONNE, BULK_BAG],
  EG: [CUBIC_METRE, TONNE, BAG_25KG],
  // Delivered loose by the tonne or the bulk bag.
  GB: [BULK_BAG, TONNE, CUBIC_METRE],
  IE: [BULK_BAG, TONNE, CUBIC_METRE],
  AU: [CUBIC_METRE, TONNE, BULK_BAG],
  NZ: [CUBIC_METRE, TONNE, BULK_BAG],
  // Sold by volume at the yard, priced per cubic yard or per ton.
  US: [CUBIC_YARD, SHORT_TON, CUBIC_METRE],
  CA: [CUBIC_YARD, TONNE, CUBIC_METRE],
  AE: [CUBIC_METRE, TONNE, BAG_25KG],
  SA: [CUBIC_METRE, TONNE, BAG_25KG],
  QA: [CUBIC_METRE, TONNE, BAG_25KG],
  KW: [CUBIC_METRE, TONNE, BAG_25KG],
  PK: [CUBIC_METRE, TONNE, BAG_25KG],
  IN: [CUBIC_METRE, TONNE, BAG_25KG],
};

const FALLBACK_UNITS: AggregateUnitOption[] = [CUBIC_METRE, TONNE, BULK_BAG];

/** Markets where sand is normally bought a tipper at a time. */
export const TRIP_MARKETS = new Set(
  Object.keys(MARKET_UNITS).filter((code) =>
    MARKET_UNITS[code].some((unit) => unit.key === "trip"),
  ),
);

export function sandUnitOptions(
  market: string | null | undefined,
): AggregateUnitOption[] {
  const code = (market ?? "").toUpperCase();
  return MARKET_UNITS[code] ?? FALLBACK_UNITS;
}

export function defaultSandUnit(
  market: string | null | undefined,
): AggregateUnitOption {
  return sandUnitOptions(market)[0];
}

/**
 * Look up a unit by its key and its label, because trip and tonne appear more
 * than once with different sizes. Falls back to the market default so a stale
 * saved template cannot leave the calculator with no unit.
 */
export function findSandUnit(
  market: string | null | undefined,
  key: string | null | undefined,
  label?: string | null,
): AggregateUnitOption {
  const options = sandUnitOptions(market);
  if (!key) return options[0];
  const byKey = options.filter((unit) => unit.key === key);
  if (byKey.length === 0) return options[0];
  if (label) {
    const exact = byKey.find((unit) => unit.label === label);
    if (exact) return exact;
  }
  return byKey[0];
}

/** Cubic metres in one of the chosen units. */
export function unitCubicMetres(unit: AggregateUnitOption): number {
  return unit.cubicMetres;
}

/** How many whole units you have to buy to cover a volume. */
export function unitsToBuy(
  volumeCubicMetres: number,
  unit: AggregateUnitOption,
): number {
  if (!Number.isFinite(volumeCubicMetres) || volumeCubicMetres <= 0) return 0;
  if (!Number.isFinite(unit.cubicMetres) || unit.cubicMetres <= 0) return 0;
  return Math.ceil(volumeCubicMetres / unit.cubicMetres);
}

/** The same volume expressed in the units a site actually counts. */
export function measureInSiteUnits(
  volumeCubicMetres: number,
  market: string | null | undefined,
) {
  const options = sandUnitOptions(market);
  const wheelbarrow =
    options.find((unit) => unit.key === "wheelbarrow") ?? WHEELBARROW;
  const headPan = options.find((unit) => unit.key === "headpan") ?? HEAD_PAN;
  return {
    wheelbarrows: Math.ceil(volumeCubicMetres / wheelbarrow.cubicMetres),
    headPans: Math.ceil(volumeCubicMetres / headPan.cubicMetres),
  };
}

/**
 * Whether a price book row is quoted in the same unit the user picked.
 *
 * A book that holds a sand price "per bag" cannot be applied to a trip: the
 * numbers differ by a factor of tens. Rather than convert silently and pretend
 * the price is verified, the calculator treats a mismatched row as no price
 * and asks for the supplier's figure.
 */
const BOOK_UNIT_WORDS: Record<AggregateUnitKey, string[]> = {
  trip: ["trip", "tipper", "load", "lorry"],
  wheelbarrow: ["wheelbarrow", "barrow"],
  headpan: ["head pan", "headpan", "pan"],
  bulkbag: ["bulk bag", "bulkbag", "bulk"],
  tonne: ["tonne", "ton", "mt", "metric ton"],
  shortton: ["short ton", "us ton"],
  cubicyard: ["cubic yard", "cu yd", "cuyd", "yd3"],
  cubicmetre: ["m3", "m³", "cubic metre", "cubic meter", "cum", "cbm"],
  bag25kg: ["25 kg", "25kg", "bag"],
};

export function bookUnitMatches(
  unitKey: AggregateUnitKey,
  bookUnit: string | null | undefined,
): boolean {
  if (!bookUnit) return false;
  const wanted = BOOK_UNIT_WORDS[unitKey] ?? [];
  const normalised = bookUnit.trim().toLowerCase();
  return wanted.some(
    (word) => normalised === word || normalised.includes(word),
  );
}
