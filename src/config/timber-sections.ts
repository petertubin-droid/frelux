import { canonicalMarketCode } from "@/lib/international/market-codes";

/**
 * Timber sections as they are actually sold, market by market.
 *
 * The roof framing estimator asks for a rafter in inches, and a user types the
 * name on the timber ticket: 2x4. Those are nominal dimensions. The piece in
 * the yard is planed down: an American 2x4 measures 38 x 89 mm, a British
 * "4x2" measures 47 x 100 mm. Sizing a member on its nominal section claims a
 * section modulus about 40% higher than the timber has.
 *
 * This registry is data only. Engines keep their own formulas; a caller that
 * wants real capacity resolves the section here and passes the dressed width
 * and depth to checkRoofMember.
 *
 * Sourcing: US/CA dressed sizes are the ALSC/NIST softwood standard for
 * surfaced dry timber (37-38 mm thickness). GB sizes are the TRADA/BS 4
 * carcassing range sold as 47 mm finished thickness. NG, AE and other import
 * markets sell nominal sawn sections, so they carry the nominal figure and say
 * so. Nothing here is a grading claim: the grade field names the customary
 * structural grade sold in that market, and a project must confirm the stamp.
 */

export interface TimberSection {
  /** Stable key: market-neutral where the name matches, prefixed otherwise. */
  key: string;
  /** What the timber is called on the ticket. */
  nominal: string;
  /** Finished width, mm, the dimension across the bending axis. */
  widthMm: number;
  /** Finished depth, mm, the dimension in the direction of bending. */
  depthMm: number;
  /** True when the piece is sold at the stated size, not planed down. */
  sawnFull: boolean;
  /** Customary structural grade for this section in this market. */
  grade: string;
  /** Where the dimension came from. */
  sourceId: string;
}

export const TIMBER_SOURCES: {
  id: string;
  label: string;
  reference: string;
}[] = [
  {
    id: "us-dressed-softwood",
    label: "US/CA dressed softwood sections",
    reference:
      "ALSC softwood lumber standard, NIST Handbook 130 dressed sizes (dry)",
  },
  {
    id: "gb-carcassing",
    label: "GB structural carcassing",
    reference: "BS 4 / TRADA span tables, 47 mm finished thickness",
  },
  {
    id: "au-mgp",
    label: "AU seasoned softwood",
    reference: "AS 1684 span tables, MGP10 graded 90/140/190/240 mm depths",
  },
  {
    id: "ng-sawn-hardwood",
    label: "NG sawn hardwood sections",
    reference: "Local sawmill nominal sections; sold sawn, verify on site",
  },
  {
    id: "ae-imported-nominal",
    label: "AE imported nominal sections",
    reference: "Imported nominal sections; sold sawn, verify on site",
  },
];

const US: TimberSection[] = [
  {
    key: "us-2x4",
    nominal: "2x4",
    widthMm: 38,
    depthMm: 89,
    sawnFull: false,
    grade: "Stud / No.2",
    sourceId: "us-dressed-softwood",
  },
  {
    key: "us-2x6",
    nominal: "2x6",
    widthMm: 38,
    depthMm: 140,
    sawnFull: false,
    grade: "Stud / No.2",
    sourceId: "us-dressed-softwood",
  },
  {
    key: "us-2x8",
    nominal: "2x8",
    widthMm: 38,
    depthMm: 184,
    sawnFull: false,
    grade: "No.2",
    sourceId: "us-dressed-softwood",
  },
  {
    key: "us-2x10",
    nominal: "2x10",
    widthMm: 38,
    depthMm: 235,
    sawnFull: false,
    grade: "No.2",
    sourceId: "us-dressed-softwood",
  },
  {
    key: "us-2x12",
    nominal: "2x12",
    widthMm: 38,
    depthMm: 286,
    sawnFull: false,
    grade: "No.2",
    sourceId: "us-dressed-softwood",
  },
];

const GB: TimberSection[] = [
  {
    key: "gb-47x100",
    nominal: "4x2 (47x100)",
    widthMm: 47,
    depthMm: 100,
    sawnFull: false,
    grade: "C16",
    sourceId: "gb-carcassing",
  },
  {
    key: "gb-47x125",
    nominal: "5x2 (47x125)",
    widthMm: 47,
    depthMm: 125,
    sawnFull: false,
    grade: "C16",
    sourceId: "gb-carcassing",
  },
  {
    key: "gb-47x150",
    nominal: "6x2 (47x150)",
    widthMm: 47,
    depthMm: 150,
    sawnFull: false,
    grade: "C16",
    sourceId: "gb-carcassing",
  },
  {
    key: "gb-47x200",
    nominal: "8x2 (47x200)",
    widthMm: 47,
    depthMm: 200,
    sawnFull: false,
    grade: "C16",
    sourceId: "gb-carcassing",
  },
  {
    key: "gb-47x225",
    nominal: "9x2 (47x225)",
    widthMm: 47,
    depthMm: 225,
    sawnFull: false,
    grade: "C24",
    sourceId: "gb-carcassing",
  },
];

const AU: TimberSection[] = [
  {
    key: "au-90x45",
    nominal: "90x45",
    widthMm: 45,
    depthMm: 90,
    sawnFull: false,
    grade: "MGP10",
    sourceId: "au-mgp",
  },
  {
    key: "au-140x45",
    nominal: "140x45",
    widthMm: 45,
    depthMm: 140,
    sawnFull: false,
    grade: "MGP10",
    sourceId: "au-mgp",
  },
  {
    key: "au-190x45",
    nominal: "190x45",
    widthMm: 45,
    depthMm: 190,
    sawnFull: false,
    grade: "MGP10",
    sourceId: "au-mgp",
  },
  {
    key: "au-240x45",
    nominal: "240x45",
    widthMm: 45,
    depthMm: 240,
    sawnFull: false,
    grade: "MGP10",
    sourceId: "au-mgp",
  },
];

const NG: TimberSection[] = [
  {
    key: "ng-50x100",
    nominal: "2x4 sawn",
    widthMm: 50,
    depthMm: 100,
    sawnFull: true,
    grade: "Sawn hardwood",
    sourceId: "ng-sawn-hardwood",
  },
  {
    key: "ng-50x150",
    nominal: "2x6 sawn",
    widthMm: 50,
    depthMm: 150,
    sawnFull: true,
    grade: "Sawn hardwood",
    sourceId: "ng-sawn-hardwood",
  },
  {
    key: "ng-50x200",
    nominal: "2x8 sawn",
    widthMm: 50,
    depthMm: 200,
    sawnFull: true,
    grade: "Sawn hardwood",
    sourceId: "ng-sawn-hardwood",
  },
];

const AE: TimberSection[] = [
  {
    key: "ae-50x100",
    nominal: "2x4 nominal",
    widthMm: 50,
    depthMm: 100,
    sawnFull: true,
    grade: "Imported sawn",
    sourceId: "ae-imported-nominal",
  },
  {
    key: "ae-50x150",
    nominal: "2x6 nominal",
    widthMm: 50,
    depthMm: 150,
    sawnFull: true,
    grade: "Imported sawn",
    sourceId: "ae-imported-nominal",
  },
  {
    key: "ae-75x200",
    nominal: "3x8 nominal",
    widthMm: 75,
    depthMm: 200,
    sawnFull: true,
    grade: "Imported sawn",
    sourceId: "ae-imported-nominal",
  },
];

/** Section sets by canonical market code. Markets absent here have no table. */
export const TIMBER_SECTIONS: Record<string, TimberSection[]> = {
  US: US,
  CA: US,
  GB: GB,
  AU: AU,
  NG: NG,
  AE: AE,
};

/** Every section this market stocks, deepest first. */
export function timberSectionsForMarket(
  market: string | null | undefined,
): TimberSection[] {
  const code = canonicalMarketCode(market, "");
  const rows = TIMBER_SECTIONS[code] ?? [];
  return [...rows].sort(
    (a, b) => b.depthMm - a.depthMm || b.widthMm - a.widthMm,
  );
}

/** One section by key, or undefined when the market does not stock it. */
export function timberSection(
  market: string | null | undefined,
  key: string,
): TimberSection | undefined {
  return timberSectionsForMarket(market).find((s) => s.key === key);
}

/**
 * The section a user means when they type the ticket name, e.g. "2x4" in the
 * US or "4x2" in GB. Returns undefined rather than guessing: a wrong section is
 * worse than an empty list.
 */
export function timberSectionByNominal(
  market: string | null | undefined,
  nominal: string,
): TimberSection | undefined {
  const target = nominal.trim().toLowerCase().replace(/\s+/g, "");
  if (!target) return undefined;
  return timberSectionsForMarket(market).find((s) =>
    s.nominal.toLowerCase().replace(/\s+/g, "").startsWith(target),
  );
}

/** Section modulus (mm³) about the bending axis, for the dressed section. */
export function sectionModulusMm3(
  section: Pick<TimberSection, "widthMm" | "depthMm">,
): number {
  return (section.widthMm * section.depthMm ** 2) / 6;
}

/**
 * How much of the nominal capacity a dressed section actually has, as a ratio.
 * An American 2x4 keeps 38/50.8 of its nominal width and 89/101.6 of its depth.
 */
export function dressedCapacityRatio(
  nominalIn: number,
  depthIn: number,
  section: Pick<TimberSection, "widthMm" | "depthMm">,
): number {
  const nominalWidth = nominalIn * 25.4;
  const nominalDepth = depthIn * 25.4;
  return sectionModulusMm3(section) / ((nominalWidth * nominalDepth ** 2) / 6);
}
