/**
 * Timber sections and stock lengths by market.
 *
 * A 2x4 is not a 2 inch by 4 inch piece of wood: it is a nominal name for a
 * 38 x 89 mm section, and the market decides whether it is sold in 8, 10, 12
 * and 16 foot lengths or in 2.4, 3.0 and 4.8 metre lengths. Quoting a US
 * project in metric stock, or a European project in feet, produces a cutting
 * list the yard cannot fill.
 *
 * The sizes below are the section actually milled, not the nominal name, so the
 * structural numbers stay correct in either system. A market with no entry
 * falls back to the metric schedule and says so rather than assuming feet.
 */

export type TimberUnitSystem = "imperial" | "metric";

export interface TimberSection {
  /** What the trade calls it, e.g. "2x4" or "38 x 89 CLS". */
  label: string;
  /** Milled width, mm. */
  widthMm: number;
  /** Milled depth, mm. */
  depthMm: number;
  /** How this market sells it. */
  system: TimberUnitSystem;
}

export interface TimberSchedule {
  market: string | null;
  system: TimberUnitSystem;
  /** Sections in trade order, smallest first. */
  sections: TimberSection[];
  /** Stock lengths, metres, as sold in this market. */
  stockLengthsM: number[];
  /** Honest note when the market had no schedule of its own. */
  note?: string;
}

const IMPERIAL = (
  label: string,
  widthMm: number,
  depthMm: number,
): TimberSection => ({
  label,
  widthMm,
  depthMm,
  system: "imperial",
});

const METRIC = (
  label: string,
  widthMm: number,
  depthMm: number,
): TimberSection => ({
  label,
  widthMm,
  depthMm,
  system: "metric",
});

/** Sections as milled. Nominal imperial names carry their true metric size. */
const IMPERIAL_SECTIONS: TimberSection[] = [
  IMPERIAL("2x3 (38 x 64 mm)", 38, 64),
  IMPERIAL("2x4 (38 x 89 mm)", 38, 89),
  IMPERIAL("2x6 (38 x 140 mm)", 38, 140),
  IMPERIAL("2x8 (38 x 184 mm)", 38, 184),
  IMPERIAL("4x4 (89 x 89 mm)", 89, 89),
];

const METRIC_SECTIONS: TimberSection[] = [
  METRIC("38 x 63 CLS", 38, 63),
  METRIC("38 x 89 CLS", 38, 89),
  METRIC("38 x 140 CLS", 38, 140),
  METRIC("38 x 184 CLS", 38, 184),
  METRIC("45 x 95 C24", 45, 95),
  METRIC("45 x 145 C24", 45, 145),
  METRIC("95 x 95 post", 95, 95),
];

/** Feet converted exactly: 8 ft = 2.4384 m, 16 ft = 4.8768 m. */
const IMPERIAL_STOCK_M = [2.4384, 3.048, 3.6576, 4.8768];
const METRIC_STOCK_M = [2.4, 3.0, 3.6, 4.8];

/** Markets that buy timber by the foot. */
const IMPERIAL_TIMBER_MARKETS = new Set(["US", "CA", "PR", "BZ", "GY"]);

export function timberSystemForMarket(
  marketCode: string | null | undefined,
): TimberUnitSystem {
  const code = (marketCode ?? "").trim().toUpperCase();
  return IMPERIAL_TIMBER_MARKETS.has(code) ? "imperial" : "metric";
}

/**
 * The timber schedule a market's yards actually stock.
 *
 * A market outside the imperial list, including one FRELUX has no profile for,
 * gets the metric schedule with a note. It does not get a silent conversion:
 * a 2x4 label on a metric section is how cutting lists go wrong.
 */
export function timberScheduleForMarket(
  marketCode: string | null | undefined,
): TimberSchedule {
  const code = (marketCode ?? "").trim().toUpperCase();
  if (IMPERIAL_TIMBER_MARKETS.has(code)) {
    return {
      market: code,
      system: "imperial",
      sections: IMPERIAL_SECTIONS,
      stockLengthsM: IMPERIAL_STOCK_M,
    };
  }
  return {
    market: code || null,
    system: "metric",
    sections: METRIC_SECTIONS,
    stockLengthsM: METRIC_STOCK_M,
    note: code
      ? `No timber schedule is configured for ${code}; the metric schedule is shown. Confirm the yard's stock before ordering.`
      : "No market was supplied; the metric schedule is shown. Confirm the yard's stock before ordering.",
  };
}

/** The section a stud wall starts from in this market: 2x4 or 38 x 89. */
export function defaultTimberSection(
  marketCode: string | null | undefined,
): TimberSection {
  const schedule = timberScheduleForMarket(marketCode);
  return (
    schedule.sections.find((s) => s.widthMm === 38 && s.depthMm === 89) ??
    schedule.sections[1] ??
    schedule.sections[0]
  );
}

export interface StudWallInput {
  /** Wall length, metres. */
  lengthM: number;
  /** Wall height, metres. */
  heightM: number;
  /** Stud centres, metres (0.406 for 16 in, 0.6 for metric). */
  spacingM: number;
  /** Openings measured along the wall, metres of width. */
  openingsWidthM?: number;
  /** Extra studs per opening for trimmers and cripples. Defaults to 4. */
  studsPerOpening?: number;
  /** Horizontal rows of blocking between studs. Defaults to 1. */
  nogginRows?: number;
  /** Waste allowance, percent. Defaults to 10. */
  wastagePercent?: number;
}

export interface StudWallResult {
  /** Studs, plates and nogs, before waste. */
  studs: number;
  plates: number;
  noggins: number;
  totalMembers: number;
  /** Total member length, metres, including waste. */
  totalLengthM: number;
  /** Pieces to buy at the market's stock length. */
  piecesAtStockLength: number;
  stockLengthM: number;
  wastagePercent: number;
  /** What the count assumes, stated for the cutting list. */
  assumptions: string[];
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Stud wall takeoff from the market's own spacing and stock length.
 *
 * Deterministic: studs at centres, two plates per wall (top and bottom),
 * blocking rows between studs, plus trimmer studs at each opening. Length is
 * summed per member and converted to stock pieces with the waste allowance.
 */
export function studWallTakeoff(
  input: StudWallInput,
  marketCode?: string | null,
): StudWallResult {
  const schedule = timberScheduleForMarket(marketCode);
  const stockLengthM = schedule.stockLengthsM[0];
  const lengthM = Number.isFinite(input.lengthM)
    ? Math.max(0, input.lengthM)
    : 0;
  const heightM = Number.isFinite(input.heightM)
    ? Math.max(0, input.heightM)
    : 0;
  const spacingM =
    Number.isFinite(input.spacingM) && input.spacingM > 0
      ? input.spacingM
      : 0.6;
  const openings = Number.isFinite(input.openingsWidthM)
    ? Math.max(0, input.openingsWidthM ?? 0)
    : 0;
  const studsPerOpening = Math.max(0, input.studsPerOpening ?? 4);
  const nogginRows = Math.max(0, Math.floor(input.nogginRows ?? 1));
  const wastagePercent = Math.max(0, input.wastagePercent ?? 10);

  const solidLengthM = Math.max(0, lengthM - openings);
  const fieldStuds =
    solidLengthM > 0 ? Math.ceil(solidLengthM / spacingM) + 1 : 0;
  const openingCount =
    openings > 0 ? Math.max(1, Math.round(openings / 0.9)) : 0;
  const studs = fieldStuds + openingCount * studsPerOpening;

  const plates = lengthM > 0 ? 2 : 0;
  const noggins =
    nogginRows > 0 && fieldStuds > 1 ? nogginRows * (fieldStuds - 1) : 0;

  const studLengthM = studs * heightM;
  const plateLengthM = plates * lengthM;
  const nogginLengthM = noggins * spacingM;
  const rawLengthM = studLengthM + plateLengthM + nogginLengthM;
  const totalLengthM = round3(rawLengthM * (1 + wastagePercent / 100));

  return {
    studs,
    plates,
    noggins,
    totalMembers: studs + plates + noggins,
    totalLengthM,
    piecesAtStockLength:
      stockLengthM > 0 ? Math.ceil(totalLengthM / stockLengthM) : 0,
    stockLengthM,
    wastagePercent,
    assumptions: [
      `Studs at ${spacingM} m centres over ${round3(solidLengthM)} m of solid wall.`,
      `Plates: top and bottom, ${lengthM} m each.`,
      noggins > 0
        ? `Blocking: ${nogginRows} row(s) between studs.`
        : "No blocking between studs.",
      openingCount > 0
        ? `${openingCount} opening(s) of ${openings} m total, ${studsPerOpening} trimmer studs each.`
        : "No openings in this run.",
      `Stock length ${stockLengthM} m (${schedule.system} schedule), ${wastagePercent}% waste.`,
      ...(schedule.note ? [schedule.note] : []),
    ],
  };
}
