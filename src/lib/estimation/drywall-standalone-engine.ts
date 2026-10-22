/**
 * FRELUX Drywall & Stud Partitioning Engine
 * Deterministic panel, framing, fastener, jointing, and insulation takeoff.
 */

export interface DrywallOpening {
  id: string;
  widthM: number;
  heightM: number;
  quantity: number;
}

export interface DrywallCalculationInput {
  marketCode: string;
  wallLengthM: number;
  wallHeightM: number;
  wallCount?: number;
  openings?: DrywallOpening[];
  boardWidthMm?: number;
  boardLengthMm?: number;
  boardLayers?: number;
  boardSides?: 1 | 2;
  studSpacingMm?: number;
  trackStockLengthM?: number;
  wastePercent?: number;
  insulation?: boolean;
  insulationWastePercent?: number;
}

export interface DrywallCalculationResult {
  marketCode: string;
  grossWallAreaM2: number;
  openingsAreaM2: number;
  netWallAreaM2: number;
  boardAreaM2: number;
  boardSizeMm: { width: number; length: number };
  boardSheets: number;
  boardWastePercent: number;
  studSpacingMm: number;
  studCount: number;
  trackLinearMeters: number;
  trackStockLengthM: number;
  trackStockPieces: number;
  drywallScrews: number;
  jointTapeLinearMeters: number;
  jointCompoundKg: number;
  insulationAreaM2: number;
  marketNotes: string;
}

export interface DrywallMarketProfile {
  boardWidthMm: number;
  boardLengthMm: number;
  studSpacingMm: number;
  trackStockLengthM: number;
  screwDensityPerM2: number;
  jointCompoundKgPerM2: number;
  tapeMetersPerM2: number;
}

/** Verified common board sizes / framing conventions are configurable; market profile is a starting default. */
export const DRYWALL_MARKET_PROFILES: Record<string, DrywallMarketProfile> = {
  NG: {
    boardWidthMm: 1200,
    boardLengthMm: 2400,
    studSpacingMm: 600,
    trackStockLengthM: 3,
    screwDensityPerM2: 20,
    jointCompoundKgPerM2: 0.55,
    tapeMetersPerM2: 1.4,
  },
  US: {
    boardWidthMm: 1219,
    boardLengthMm: 2438,
    studSpacingMm: 406,
    trackStockLengthM: 3.05,
    screwDensityPerM2: 32,
    jointCompoundKgPerM2: 0.65,
    tapeMetersPerM2: 1.5,
  },
  GB: {
    boardWidthMm: 1200,
    boardLengthMm: 2400,
    studSpacingMm: 400,
    trackStockLengthM: 3,
    screwDensityPerM2: 20,
    jointCompoundKgPerM2: 0.55,
    tapeMetersPerM2: 1.4,
  },
  CA: {
    boardWidthMm: 1219,
    boardLengthMm: 2438,
    studSpacingMm: 406,
    trackStockLengthM: 3.05,
    screwDensityPerM2: 32,
    jointCompoundKgPerM2: 0.65,
    tapeMetersPerM2: 1.5,
  },
  AU: {
    boardWidthMm: 1200,
    boardLengthMm: 2400,
    studSpacingMm: 450,
    trackStockLengthM: 3,
    screwDensityPerM2: 20,
    jointCompoundKgPerM2: 0.55,
    tapeMetersPerM2: 1.4,
  },
  NZ: {
    boardWidthMm: 1200,
    boardLengthMm: 2400,
    studSpacingMm: 450,
    trackStockLengthM: 3,
    screwDensityPerM2: 20,
    jointCompoundKgPerM2: 0.55,
    tapeMetersPerM2: 1.4,
  },
  DE: {
    boardWidthMm: 1250,
    boardLengthMm: 2500,
    studSpacingMm: 625,
    trackStockLengthM: 3,
    screwDensityPerM2: 18,
    jointCompoundKgPerM2: 0.5,
    tapeMetersPerM2: 1.3,
  },
  FR: {
    boardWidthMm: 1200,
    boardLengthMm: 2500,
    studSpacingMm: 600,
    trackStockLengthM: 3,
    screwDensityPerM2: 18,
    jointCompoundKgPerM2: 0.5,
    tapeMetersPerM2: 1.3,
  },
  IT: {
    boardWidthMm: 1200,
    boardLengthMm: 2500,
    studSpacingMm: 600,
    trackStockLengthM: 3,
    screwDensityPerM2: 18,
    jointCompoundKgPerM2: 0.5,
    tapeMetersPerM2: 1.3,
  },
  ES: {
    boardWidthMm: 1200,
    boardLengthMm: 2500,
    studSpacingMm: 600,
    trackStockLengthM: 3,
    screwDensityPerM2: 18,
    jointCompoundKgPerM2: 0.5,
    tapeMetersPerM2: 1.3,
  },
  NL: {
    boardWidthMm: 1200,
    boardLengthMm: 2600,
    studSpacingMm: 600,
    trackStockLengthM: 3,
    screwDensityPerM2: 18,
    jointCompoundKgPerM2: 0.5,
    tapeMetersPerM2: 1.3,
  },
  PL: {
    boardWidthMm: 1200,
    boardLengthMm: 2600,
    studSpacingMm: 600,
    trackStockLengthM: 3,
    screwDensityPerM2: 18,
    jointCompoundKgPerM2: 0.5,
    tapeMetersPerM2: 1.3,
  },
  SE: {
    boardWidthMm: 1200,
    boardLengthMm: 2400,
    studSpacingMm: 450,
    trackStockLengthM: 3,
    screwDensityPerM2: 18,
    jointCompoundKgPerM2: 0.5,
    tapeMetersPerM2: 1.3,
  },
  CH: {
    boardWidthMm: 1200,
    boardLengthMm: 2500,
    studSpacingMm: 625,
    trackStockLengthM: 3,
    screwDensityPerM2: 18,
    jointCompoundKgPerM2: 0.5,
    tapeMetersPerM2: 1.3,
  },
  IN: {
    boardWidthMm: 1200,
    boardLengthMm: 2400,
    studSpacingMm: 600,
    trackStockLengthM: 3,
    screwDensityPerM2: 20,
    jointCompoundKgPerM2: 0.55,
    tapeMetersPerM2: 1.4,
  },
  ZA: {
    boardWidthMm: 1200,
    boardLengthMm: 2400,
    studSpacingMm: 600,
    trackStockLengthM: 3,
    screwDensityPerM2: 20,
    jointCompoundKgPerM2: 0.55,
    tapeMetersPerM2: 1.4,
  },
  KE: {
    boardWidthMm: 1200,
    boardLengthMm: 2400,
    studSpacingMm: 600,
    trackStockLengthM: 3,
    screwDensityPerM2: 20,
    jointCompoundKgPerM2: 0.55,
    tapeMetersPerM2: 1.4,
  },
  GH: {
    boardWidthMm: 1200,
    boardLengthMm: 2400,
    studSpacingMm: 600,
    trackStockLengthM: 3,
    screwDensityPerM2: 20,
    jointCompoundKgPerM2: 0.55,
    tapeMetersPerM2: 1.4,
  },
  TZ: {
    boardWidthMm: 1200,
    boardLengthMm: 2400,
    studSpacingMm: 600,
    trackStockLengthM: 3,
    screwDensityPerM2: 20,
    jointCompoundKgPerM2: 0.55,
    tapeMetersPerM2: 1.4,
  },
  CI: {
    boardWidthMm: 1200,
    boardLengthMm: 2400,
    studSpacingMm: 600,
    trackStockLengthM: 3,
    screwDensityPerM2: 20,
    jointCompoundKgPerM2: 0.55,
    tapeMetersPerM2: 1.4,
  },
  ET: {
    boardWidthMm: 1200,
    boardLengthMm: 2400,
    studSpacingMm: 600,
    trackStockLengthM: 3,
    screwDensityPerM2: 20,
    jointCompoundKgPerM2: 0.55,
    tapeMetersPerM2: 1.4,
  },
  EG: {
    boardWidthMm: 1200,
    boardLengthMm: 2400,
    studSpacingMm: 600,
    trackStockLengthM: 3,
    screwDensityPerM2: 20,
    jointCompoundKgPerM2: 0.55,
    tapeMetersPerM2: 1.4,
  },
  SA: {
    boardWidthMm: 1200,
    boardLengthMm: 2400,
    studSpacingMm: 600,
    trackStockLengthM: 3,
    screwDensityPerM2: 20,
    jointCompoundKgPerM2: 0.55,
    tapeMetersPerM2: 1.4,
  },
  AE: {
    boardWidthMm: 1200,
    boardLengthMm: 2400,
    studSpacingMm: 600,
    trackStockLengthM: 3,
    screwDensityPerM2: 20,
    jointCompoundKgPerM2: 0.55,
    tapeMetersPerM2: 1.4,
  },
  TR: {
    boardWidthMm: 1200,
    boardLengthMm: 2500,
    studSpacingMm: 600,
    trackStockLengthM: 3,
    screwDensityPerM2: 18,
    jointCompoundKgPerM2: 0.5,
    tapeMetersPerM2: 1.3,
  },
  JP: {
    boardWidthMm: 910,
    boardLengthMm: 1820,
    studSpacingMm: 455,
    trackStockLengthM: 3,
    screwDensityPerM2: 20,
    jointCompoundKgPerM2: 0.55,
    tapeMetersPerM2: 1.4,
  },
  KR: {
    boardWidthMm: 900,
    boardLengthMm: 1800,
    studSpacingMm: 450,
    trackStockLengthM: 3,
    screwDensityPerM2: 20,
    jointCompoundKgPerM2: 0.55,
    tapeMetersPerM2: 1.4,
  },
  CN: {
    boardWidthMm: 1200,
    boardLengthMm: 2400,
    studSpacingMm: 600,
    trackStockLengthM: 3,
    screwDensityPerM2: 20,
    jointCompoundKgPerM2: 0.55,
    tapeMetersPerM2: 1.4,
  },
  ID: {
    boardWidthMm: 1200,
    boardLengthMm: 2400,
    studSpacingMm: 600,
    trackStockLengthM: 3,
    screwDensityPerM2: 20,
    jointCompoundKgPerM2: 0.55,
    tapeMetersPerM2: 1.4,
  },
  BR: {
    boardWidthMm: 1200,
    boardLengthMm: 1800,
    studSpacingMm: 600,
    trackStockLengthM: 3,
    screwDensityPerM2: 20,
    jointCompoundKgPerM2: 0.55,
    tapeMetersPerM2: 1.4,
  },
  MX: {
    boardWidthMm: 1220,
    boardLengthMm: 2440,
    studSpacingMm: 406,
    trackStockLengthM: 3.05,
    screwDensityPerM2: 32,
    jointCompoundKgPerM2: 0.65,
    tapeMetersPerM2: 1.5,
  },
  SG: {
    boardWidthMm: 1200,
    boardLengthMm: 2400,
    studSpacingMm: 600,
    trackStockLengthM: 3,
    screwDensityPerM2: 20,
    jointCompoundKgPerM2: 0.55,
    tapeMetersPerM2: 1.4,
  },
};

export function calculateDrywallTakeoff(
  input: DrywallCalculationInput,
): DrywallCalculationResult {
  const marketCode = (input.marketCode || "UNSPECIFIED").toUpperCase();
  const profile = DRYWALL_MARKET_PROFILES[marketCode] ?? {
    boardWidthMm: 1200,
    boardLengthMm: 2400,
    studSpacingMm: 600,
    trackStockLengthM: 3,
    screwDensityPerM2: 20,
    jointCompoundKgPerM2: 0.55,
    tapeMetersPerM2: 1.4,
  };
  const wallCount = Math.max(1, input.wallCount ?? 1);
  const wallLengthM = Math.max(0, input.wallLengthM);
  const wallHeightM = Math.max(0, input.wallHeightM);
  const grossWallAreaM2 = wallLengthM * wallHeightM * wallCount;

  const openingsAreaM2 = (input.openings ?? []).reduce(
    (sum, opening) =>
      sum +
      Math.max(0, opening.widthM) *
        Math.max(0, opening.heightM) *
        Math.max(0, opening.quantity),
    0,
  );
  const netWallAreaM2 = Math.max(0, grossWallAreaM2 - openingsAreaM2);
  const boardWidthMm = input.boardWidthMm ?? profile.boardWidthMm;
  const boardLengthMm = input.boardLengthMm ?? profile.boardLengthMm;
  const boardLayers = Math.max(1, Math.floor(input.boardLayers ?? 1));
  const boardSides = input.boardSides ?? 2;
  const boardAreaM2 = netWallAreaM2 * boardSides * boardLayers;
  const boardSheetAreaM2 = (boardWidthMm / 1000) * (boardLengthMm / 1000);
  const boardWastePercent = Math.max(0, input.wastePercent ?? 10);
  const boardSheets =
    boardSheetAreaM2 > 0
      ? Math.ceil(
          (boardAreaM2 / boardSheetAreaM2) * (1 + boardWastePercent / 100),
        )
      : 0;

  const studSpacingMm = Math.max(
    100,
    input.studSpacingMm ?? profile.studSpacingMm,
  );
  const studSpacingM = studSpacingMm / 1000;
  let studCount = 0;
  for (let wallIndex = 0; wallIndex < wallCount; wallIndex += 1) {
    const runStuds = Math.ceil(wallLengthM / studSpacingM) + 1;
    studCount += runStuds;
  }
  // Tracks top + bottom for each wall; opening headers and jamb studs not included in base count.
  const trackLinearMeters =
    wallCount * wallLengthM * 2 * (1 + boardWastePercent / 100);
  const trackStockLengthM = Math.max(
    0.1,
    input.trackStockLengthM ?? profile.trackStockLengthM,
  );
  const trackStockPieces = Math.ceil(trackLinearMeters / trackStockLengthM);

  const drywallScrews = Math.ceil(boardAreaM2 * profile.screwDensityPerM2);
  const jointTapeLinearMeters = Number(
    (boardAreaM2 * profile.tapeMetersPerM2).toFixed(1),
  );
  const jointCompoundKg = Number(
    (boardAreaM2 * profile.jointCompoundKgPerM2).toFixed(1),
  );
  const insulationAreaM2 = input.insulation
    ? Number(
        (
          netWallAreaM2 *
          (1 + Math.max(0, input.insulationWastePercent ?? 5) / 100)
        ).toFixed(2),
      )
    : 0;

  return {
    marketCode,
    grossWallAreaM2: Number(grossWallAreaM2.toFixed(2)),
    openingsAreaM2: Number(openingsAreaM2.toFixed(2)),
    netWallAreaM2: Number(netWallAreaM2.toFixed(2)),
    boardAreaM2: Number(boardAreaM2.toFixed(2)),
    boardSizeMm: { width: boardWidthMm, length: boardLengthMm },
    boardSheets,
    boardWastePercent,
    studSpacingMm,
    studCount,
    trackLinearMeters: Number(trackLinearMeters.toFixed(2)),
    trackStockLengthM,
    trackStockPieces,
    drywallScrews,
    jointTapeLinearMeters,
    jointCompoundKg,
    insulationAreaM2,
    marketNotes: `${DRYWALL_MARKET_PROFILES[marketCode] ? `Illustrative starting profile for ${marketCode}` : `No maintained profile for ${marketCode}; using generic editable dimensions`}. Not a verified national standard. Confirm product datasheets and local framing specification before procurement. Stud counts exclude engineered jamb, lintel, bracing, services and deflection-head details.`,
  };
}
