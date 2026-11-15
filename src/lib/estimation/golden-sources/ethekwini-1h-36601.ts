/**
 * A measured, citable source document for the golden bank.
 *
 * This is not a hand-made benchmark. It is the Bill of Quantities of a real
 * municipal housing contract, recovered from the employer's own tender
 * publication, and transcribed with the bill and item numbers intact so any
 * line can be checked against the original.
 *
 * What it does and does not prove:
 *
 * - It proves quantities. A quantity surveyor measured the blockwork, plaster,
 *   ceilings, tiling and paint for 28 units and wrote the areas down. Those
 *   areas are the best available reference for whether an engine's take-off of
 *   the same job is sane.
 * - It does not prove material consumption. A bill states areas and lengths,
 *   never bags, litres or block counts, because the contractor prices the item.
 *   Material-level cases still need invoices or delivery notes.
 *
 * So this file supplies the expected side of a take-off case. It is deliberately
 * not wired into a variance test that would compare it with an engine input we
 * computed ourselves, because that would compare the engine with itself.
 */

export interface BoqLine {
  /** Bill number as printed on the document. */
  bill: number;
  billTitle: string;
  /** Item number as printed on the document. */
  item: string;
  description: string;
  unit: "m2" | "m" | "nr" | "sum";
  quantity: number;
}

/** Provenance. A reader must be able to reach the original from these fields. */
export const ETHEKWINI_1H_36601_SOURCE = {
  kind: "published_tender_boq" as const,
  employer: "eThekwini Metropolitan Municipality",
  department: "Human Settlements",
  contractNumber: "1H-36601",
  tenderNumber: "1H 36601",
  project:
    "Construction of 28 Community Residential Units [Block E], 8 Donnelly Road, Bluff, Durban",
  /** 20 one-bedroom and 8 two-bedroom units, four storey walk-ups. */
  dwellingMix: "20 x 1 bedroom, 8 x 2 bedroom",
  unitCount: 28,
  contractPeriodWorkingDays: 90,
  documentVersion: "01/12/2025",
  billOfQuantitiesPages: 110,
  portal: "South Africa National Treasury eTenders portal",
  portalUrl: "https://www.etenders.gov.za/",
  /** Attachment as published: "Procurement document Part B.pdf". */
  attachmentName: "Procurement document Part B.pdf",
  attachmentPages: 155,
  /** Bills 5 to 16 sit on these pages of the attachment. */
  extractionMethod:
    "Rendered at 150 dpi in greyscale, OCR at page level, then every transcribed line read back against the rendered page",
  extractedOn: "2026-11-15",
  /** No person has signed this transcription. Say so rather than imply it. */
  transcribedBy: "Solene (automated extraction, line by line review)",
  crossChecked: false,
} as const;

export const ETHEKWINI_1H_36601_LINES: readonly BoqLine[] = Object.freeze([
  // Bill 5 Masonry, pages -24- to -27-
  {
    bill: 5,
    billTitle: "Masonry",
    item: "1",
    description: "190mm walls in M200 blocks, foundations",
    unit: "m2",
    quantity: 94,
  },
  {
    bill: 5,
    billTitle: "Masonry",
    item: "2",
    description: "90mm walls in M100 blocks, superstructure",
    unit: "m2",
    quantity: 788,
  },
  {
    bill: 5,
    billTitle: "Masonry",
    item: "3",
    description: "190mm walls in M200 blocks, superstructure",
    unit: "m2",
    quantity: 1451,
  },
  {
    bill: 5,
    billTitle: "Masonry",
    item: "4",
    description: "190mm walls in M200 blocks, beamfilling",
    unit: "m2",
    quantity: 17,
  },
  {
    bill: 5,
    billTitle: "Masonry",
    item: "5",
    description: "190mm walls in M200 blocks above wall plate level",
    unit: "m2",
    quantity: 64,
  },
  {
    bill: 5,
    billTitle: "Masonry",
    item: "6",
    description:
      "75mm wide galvanised blockwork reinforcement built in horizontally",
    unit: "m",
    quantity: 1970,
  },
  {
    bill: 5,
    billTitle: "Masonry",
    item: "7",
    description:
      "150mm wide galvanised blockwork reinforcement built in horizontally",
    unit: "m",
    quantity: 4301,
  },
  {
    bill: 5,
    billTitle: "Masonry",
    item: "8",
    description: "90 x 110mm fabricated lintels, lengths not exceeding 3m",
    unit: "m",
    quantity: 87,
  },
  {
    bill: 5,
    billTitle: "Masonry",
    item: "9",
    description: "140 x 110mm fabricated lintels, lengths not exceeding 3m",
    unit: "m",
    quantity: 237,
  },
  {
    bill: 5,
    billTitle: "Masonry",
    item: "10",
    description:
      "30 x 1,6mm wall tie 500mm long, shot pinned one end, built in the other",
    unit: "nr",
    quantity: 679,
  },
  {
    bill: 5,
    billTitle: "Masonry",
    item: "11",
    description:
      "30 x 1,6mm roof tie 1,5m long, fixed to timber, built into blockwork",
    unit: "nr",
    quantity: 92,
  },
  {
    bill: 5,
    billTitle: "Masonry",
    item: "12",
    description:
      "150 x 15mm natural grey window sills set sloping, metal fixing lugs",
    unit: "m",
    quantity: 133,
  },
  {
    bill: 5,
    billTitle: "Masonry",
    item: "13",
    description:
      "Type GB113 bird proof grille blocks, 190mm walls, pointed both sides",
    unit: "m2",
    quantity: 149,
  },

  // Bill 6 Waterproofing, page -29-
  {
    bill: 6,
    billTitle: "Waterproofing",
    item: "1",
    description: "375 micron embossed damp proof course in walls",
    unit: "m2",
    quantity: 45,
  },
  {
    bill: 6,
    billTitle: "Waterproofing",
    item: "2",
    description:
      "375 micron embossed damp proof course in walls under window cills",
    unit: "m2",
    quantity: 31,
  },
  {
    bill: 6,
    billTitle: "Waterproofing",
    item: "3",
    description:
      "250 micron waterproof sheeting under surface beds, sealed laps",
    unit: "m2",
    quantity: 452,
  },

  // Bill 9 Ceilings and partitions, pages -39- to -40-
  {
    bill: 9,
    billTitle: "Ceilings & Partitions",
    item: "1",
    description:
      "6,4mm Rhino gypsum plasterboard ceilings on 38 x 38mm brandering at 400mm centres",
    unit: "m2",
    quantity: 266,
  },
  {
    bill: 9,
    billTitle: "Ceilings & Partitions",
    item: "2",
    description:
      "Extra over ceilings for 650 x 650mm trap door in wrot softwood framing",
    unit: "nr",
    quantity: 7,
  },
  {
    bill: 9,
    billTitle: "Ceilings & Partitions",
    item: "3",
    description:
      "4mm Everite Nutec fibre cement board ceilings on 38 x 50mm brandering at 400mm centres",
    unit: "m2",
    quantity: 108,
  },
  {
    bill: 9,
    billTitle: "Ceilings & Partitions",
    item: "4",
    description:
      "Extra over ceilings for 650 x 650mm trap door complete with trimmers and frame",
    unit: "nr",
    quantity: 5,
  },
  {
    bill: 9,
    billTitle: "Ceilings & Partitions",
    item: "5",
    description: "75mm coved cornices",
    unit: "m",
    quantity: 1459,
  },

  // Bill 12 Plastering and screeds, pages -51- to -52-
  {
    bill: 12,
    billTitle: "Plastering & Screeds",
    item: "1",
    description: "Screed average 50mm thick on ledges",
    unit: "m2",
    quantity: 24,
  },
  {
    bill: 12,
    billTitle: "Plastering & Screeds",
    item: "2",
    description: "Screed average 60mm thick on floors to falls",
    unit: "m2",
    quantity: 12,
  },
  {
    bill: 12,
    billTitle: "Plastering & Screeds",
    item: "3",
    description: "25mm tinted granolithic on floors and landings",
    unit: "m2",
    quantity: 1620,
  },
  {
    bill: 12,
    billTitle: "Plastering & Screeds",
    item: "4",
    description:
      "25mm tinted granolithic on treads and risers of stairs, including reedings",
    unit: "m2",
    quantity: 52,
  },
  {
    bill: 12,
    billTitle: "Plastering & Screeds",
    item: "5",
    description: "25mm tinted granolithic on narrow widths",
    unit: "m2",
    quantity: 1,
  },
  {
    bill: 12,
    billTitle: "Plastering & Screeds",
    item: "6",
    description: "100mm high granolithic skirting",
    unit: "m",
    quantity: 1724,
  },
  {
    bill: 12,
    billTitle: "Plastering & Screeds",
    item: "7",
    description:
      "100mm high granolithic skirting stepped over treads and risers",
    unit: "m",
    quantity: 86,
  },
  {
    bill: 12,
    billTitle: "Plastering & Screeds",
    item: "8",
    description: "Cement plaster on blockwork walls, internal",
    unit: "m2",
    quantity: 2898,
  },
  {
    bill: 12,
    billTitle: "Plastering & Screeds",
    item: "9",
    description: "Cement plaster on narrow widths, internal",
    unit: "m2",
    quantity: 67,
  },
  {
    bill: 12,
    billTitle: "Plastering & Screeds",
    item: "10",
    description: "Cement plaster on concrete ceilings, internal",
    unit: "m2",
    quantity: 1356,
  },
  {
    bill: 12,
    billTitle: "Plastering & Screeds",
    item: "11",
    description: "Cement plaster on walls, external",
    unit: "m2",
    quantity: 1975,
  },
  {
    bill: 12,
    billTitle: "Plastering & Screeds",
    item: "12",
    description: "Cement plaster on narrow widths, external",
    unit: "m2",
    quantity: 150,
  },
  {
    bill: 12,
    billTitle: "Plastering & Screeds",
    item: "13",
    description: "Cement plaster on projecting and isolated columns",
    unit: "m2",
    quantity: 98,
  },
  {
    bill: 12,
    billTitle: "Plastering & Screeds",
    item: "14",
    description: "Cement plaster on projecting and isolated beams",
    unit: "m2",
    quantity: 98,
  },
  {
    bill: 12,
    billTitle: "Plastering & Screeds",
    item: "15",
    description: "Cement plaster on ceilings, external",
    unit: "m2",
    quantity: 412,
  },
  {
    bill: 12,
    billTitle: "Plastering & Screeds",
    item: "16",
    description: "Cement plaster on raking soffits of stairs",
    unit: "m2",
    quantity: 34,
  },
  {
    bill: 12,
    billTitle: "Plastering & Screeds",
    item: "17",
    description: "Cement plaster on narrow widths to soffits",
    unit: "m2",
    quantity: 19,
  },

  // Bill 13 Tiling, page -54-
  {
    bill: 13,
    billTitle: "Tiling",
    item: "1",
    description:
      "150 x 150mm ceramic wall tiles fixed with adhesive to plaster, tinted waterproof jointing",
    unit: "m2",
    quantity: 118,
  },
  {
    bill: 13,
    billTitle: "Tiling",
    item: "2",
    description:
      "Fair exposed cutting and fitting around pipes not exceeding 50mm diameter",
    unit: "nr",
    quantity: 112,
  },
  {
    bill: 13,
    billTitle: "Tiling",
    item: "3",
    description: "PVC edge trim",
    unit: "m",
    quantity: 157,
  },

  // Bill 16 Paintwork, pages -73- to -74-
  {
    bill: 16,
    billTitle: "Paintwork",
    item: "3",
    description:
      "Acrylic copolymer emulsion, primer, undercoat and finishing coat, on plastered ceilings and beams",
    unit: "m2",
    quantity: 1901,
  },
  {
    bill: 16,
    billTitle: "Paintwork",
    item: "4",
    description:
      "Pure acrylic emulsion, primer, undercoat and two coats, on fibre cement ceilings and cornices",
    unit: "m2",
    quantity: 108,
  },
  {
    bill: 16,
    billTitle: "Paintwork",
    item: "5",
    description: "Pure acrylic emulsion on fascias and barge boards",
    unit: "m2",
    quantity: 53,
  },
  {
    bill: 16,
    billTitle: "Paintwork",
    item: "6",
    description: "Emulsion paint on plasterboard ceilings and beams",
    unit: "m2",
    quantity: 382,
  },
  {
    bill: 16,
    billTitle: "Paintwork",
    item: "7",
    description:
      "Calcium plumbate primer on backs of frames not exceeding 300mm girth",
    unit: "m",
    quantity: 490,
  },
  {
    bill: 16,
    billTitle: "Paintwork",
    item: "8",
    description:
      "Primer, undercoat and polyurethane velvet enamel on galvanised steel door frames",
    unit: "m2",
    quantity: 147,
  },
  {
    bill: 16,
    billTitle: "Paintwork",
    item: "9",
    description:
      "Wood primer, undercoat and polyurethane velvet enamel on doors",
    unit: "m2",
    quantity: 270,
  },
]);

/** Sum of a named set of bill items, used for the cross-check totals below. */
const sumOf = (pick: (line: BoqLine) => boolean): number =>
  ETHEKWINI_1H_36601_LINES.filter(pick).reduce(
    (total, line) => total + line.quantity,
    0,
  );

/**
 * Totals a reader can check by hand against the document.
 *
 * These exist so a transcription error shows up as a failed assertion rather
 * than as a quietly wrong benchmark.
 */
export const ETHEKWINI_1H_36601_TOTALS = {
  /** All blockwork in square metres, foundation through to above wall plate. */
  blockworkAreaM2: sumOf(
    (l) => l.bill === 5 && l.unit === "m2" && l.item !== "13",
  ),
  masonryM2: sumOf((l) => l.bill === 5 && l.unit === "m2"),
  masonryReinforcementM: sumOf(
    (l) => l.bill === 5 && /reinforcement/.test(l.description),
  ),
  internalPlasterM2: sumOf(
    (l) => l.bill === 12 && /internal/.test(l.description),
  ),
  externalPlasterM2: sumOf(
    (l) =>
      l.bill === 12 && /external|columns|beams|soffit/i.test(l.description),
  ),
  ceilingBoardM2: sumOf((l) => l.bill === 9 && l.unit === "m2"),
  floorScreedM2: sumOf(
    (l) =>
      l.bill === 12 &&
      /granolithic on floors|granolithic on treads/.test(l.description),
  ),
  wallTilingM2: sumOf((l) => l.bill === 13 && l.unit === "m2"),
  paintedCeilingsM2: sumOf(
    (l) => l.bill === 16 && /ceilings and beams/.test(l.description),
  ),
} as const;

/**
 * Per dwelling unit, which is the form an engine takes: one house at a time.
 *
 * Divide by the unit count, not by the number of blocks. Twenty eight units in
 * four storey walk-ups share external walls, so the external plaster per unit
 * is a share of a shared envelope, not a standalone house figure.
 */
export const ETHEKWINI_1H_36601_PER_UNIT = {
  blockworkAreaM2: Number(
    (ETHEKWINI_1H_36601_TOTALS.blockworkAreaM2 / 28).toFixed(2),
  ),
  internalPlasterM2: Number(
    (ETHEKWINI_1H_36601_TOTALS.internalPlasterM2 / 28).toFixed(2),
  ),
  ceilingBoardM2: Number(
    (ETHEKWINI_1H_36601_TOTALS.ceilingBoardM2 / 28).toFixed(2),
  ),
  floorScreedM2: Number(
    (ETHEKWINI_1H_36601_TOTALS.floorScreedM2 / 28).toFixed(2),
  ),
} as const;
