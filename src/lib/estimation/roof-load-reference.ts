/**
 * Reference-only lookup for ordinary roof live loads transcribed from Table 8.10
 * of Nigeria's National Building Code PDF hosted by the Federal Ministry of
 * Housing and Urban Development. This is not a determination of code adoption,
 * a total design load, or a structural design basis.
 */
export interface NigeriaRoofLiveLoadReference {
  loadKNM2: number;
  slopeBand: "low" | "medium" | "high";
  tributaryAreaBand: "up_to_1000" | "1001_to_3000" | "over_3000";
  sourceTitle: string;
  sourceUrl: string;
  sourceTable: string;
  scopeNote: string;
}

export type RoofLoadReferenceResponse = {
  data: NigeriaRoofLiveLoadReference | null;
  errors: string[];
};

const SOURCE_TITLE = "Federal Republic of Nigeria National Building Code";
const SOURCE_URL = "https://bend.fmhud.gov.ng/upload/download/25080529456.pdf";

/**
 * Returns the Table 8.10 ordinary-roof live-load reference, treating the
 * published values as kN/m² based on the code's structural-load convention.
 * Slope is entered as vertical rise in mm per 1 m horizontal; area in m².
 */
export function lookupNigeriaRoofLiveLoad(
  riseMMPerM: number,
  tributaryAreaM2: number,
): RoofLoadReferenceResponse {
  if (!Number.isFinite(riseMMPerM) || riseMMPerM < 0) {
    return { data: null, errors: ["Roof rise must be zero or greater."] };
  }
  if (!Number.isFinite(tributaryAreaM2) || tributaryAreaM2 <= 0) {
    return {
      data: null,
      errors: ["Tributary loaded area must be greater than zero."],
    };
  }

  const slopeBand =
    riseMMPerM < 100 ? "low" : riseMMPerM < 300 ? "medium" : "high";
  if (
    (tributaryAreaM2 > 1000 && tributaryAreaM2 < 1001) ||
    (tributaryAreaM2 > 3000 && tributaryAreaM2 < 3001)
  ) {
    return {
      data: null,
      errors: [
        "Table 8.10 does not specify how fractional tributary areas in the printed boundary gaps are classified; confirm the applicable interpretation with a qualified local engineer.",
      ],
    };
  }

  const areaBand =
    tributaryAreaM2 <= 1000
      ? "up_to_1000"
      : tributaryAreaM2 <= 3000
        ? "1001_to_3000"
        : "over_3000";
  const values: Record<typeof slopeBand, Record<typeof areaBand, number>> = {
    low: { up_to_1000: 2, "1001_to_3000": 1.5, over_3000: 1.2 },
    medium: { up_to_1000: 1.5, "1001_to_3000": 1.3, over_3000: 1.2 },
    high: { up_to_1000: 1.2, "1001_to_3000": 1.2, over_3000: 1.2 },
  };
  return {
    data: {
      loadKNM2: values[slopeBand][areaBand],
      slopeBand,
      tributaryAreaBand: areaBand,
      sourceTitle: SOURCE_TITLE,
      sourceUrl: SOURCE_URL,
      sourceTable: "Table 8.10, ordinary roof minimum live loads",
      scopeNote:
        "Reference only. Table 8.10 does not print units beside these values; kN/m² is inferred from the surrounding code load conventions and must be confirmed. Ordinary-roof live load is not the total design load. Dead load, wind uplift, earthquake, load combinations, ponding and special-use roof loads are not included. Confirm the applicable adopted code and design basis with a qualified local structural engineer.",
    },
    errors: [],
  };
}

/**
 * Markets whose roof live load can be read from a bundled, published source.
 * NG: National Building Code Table 8.10 (transcribed above).
 * US: ASCE 7-22 §4.8.2 minimum roof live load, Lr = 12·R1·R2 psf.
 * GB/EU: EN 1991-1-3 imposed load on non-accessible roofs, category H.
 */
const NG_MARKETS = new Set(["NG"]);
const US_MARKETS = new Set(["US", "CA"]);
const EN_MARKETS = new Set([
  "GB",
  "IE",
  "DE",
  "FR",
  "IT",
  "ES",
  "NL",
  "PL",
  "SE",
  "CH",
  "AE",
  "SA",
  "TR",
  "EG",
  "ZA",
  "NZ",
  "AU",
]);

const PSF_TO_KNM2 = 0.0478803;

/**
 * ASCE 7-22 §4.8.2: Lr = 12 R1 R2, with 12 psf floor and 20 psf ceiling.
 * R1 depends on the tributary area At (ft²), R2 on the roof slope F (rise in
 * inches per foot of run).
 */
export function asceMinimumRoofLiveLoadPsf(
  tributaryAreaFt2: number,
  riseInPerFt: number,
): number {
  const R1 =
    tributaryAreaFt2 <= 200
      ? 1
      : tributaryAreaFt2 <= 600
        ? 1.2 - 0.001 * tributaryAreaFt2
        : 0.6;
  const R2 =
    riseInPerFt <= 4 ? 1 : riseInPerFt <= 12 ? 1.2 - 0.05 * riseInPerFt : 0.6;
  return Math.min(20, Math.max(12, 12 * R1 * R2));
}

export interface MarketRoofLoadReference {
  loadKNM2: number;
  basis: "NG_NBC_8.10" | "ASCE_7_22_4.8.2" | "EN_1991_1_3_H";
  sourceTitle: string;
  sourceUrl: string;
  sourceClause: string;
  scopeNote: string;
}

/**
 * Market-aware roof live-load reference.
 *
 * The Nigerian Table 8.10 used to be offered to every market, so a US or German
 * roof was quoted a Lagos value. Each market now gets its own published basis,
 * and a market with no bundled source is told to enter its code value rather
 * than being handed another country's numbers.
 *
 * riseMMPerM is vertical rise in mm per 1 m horizontal; area in m².
 */
export function lookupRoofLiveLoad(
  marketCode: string | undefined,
  riseMMPerM: number,
  tributaryAreaM2: number,
): RoofLoadReferenceResponse & { basis?: MarketRoofLoadReference["basis"] } {
  const market = (marketCode ?? "").trim().toUpperCase();

  if (!market) {
    return {
      data: null,
      errors: [
        "Select a market before reading a roof live-load reference: the applicable value comes from the market's own structural code.",
      ],
    };
  }

  if (NG_MARKETS.has(market)) {
    const ng = lookupNigeriaRoofLiveLoad(riseMMPerM, tributaryAreaM2);
    if (!ng.data) return ng;
    return {
      data: {
        ...ng.data,
        sourceTable: ng.data.sourceTable,
      },
      errors: ng.errors,
      basis: "NG_NBC_8.10",
    };
  }

  if (!Number.isFinite(riseMMPerM) || riseMMPerM < 0) {
    return { data: null, errors: ["Roof rise must be zero or greater."] };
  }
  if (!Number.isFinite(tributaryAreaM2) || tributaryAreaM2 <= 0) {
    return {
      data: null,
      errors: ["Tributary loaded area must be greater than zero."],
    };
  }

  if (US_MARKETS.has(market)) {
    // 1 ft² = 0.09290304 m²; rise mm per m converts to in/ft as /12.
    const areaFt2 = tributaryAreaM2 / 0.09290304;
    const riseInPerFt = (riseMMPerM / 1000) * 12;
    const psf = asceMinimumRoofLiveLoadPsf(areaFt2, riseInPerFt);
    return {
      data: {
        loadKNM2: Math.round(psf * PSF_TO_KNM2 * 100) / 100,
        slopeBand:
          riseInPerFt <= 4 ? "low" : riseInPerFt <= 12 ? "medium" : "high",
        tributaryAreaBand:
          areaFt2 <= 200
            ? "up_to_1000"
            : areaFt2 <= 600
              ? "1001_to_3000"
              : "over_3000",
        sourceTitle: "ASCE/SEI 7-22",
        sourceUrl: "https://www.asce.org/publications-and-news/asce-7",
        sourceTable: "§4.8.2 minimum roof live load, Lr = 12 R1 R2 psf",
        scopeNote:
          "Reference only. Lr is the minimum roof live load for ordinary flat, pitched and curved roofs; it excludes dead load, wind uplift, snow, ponding and special-use roof loads. Confirm with a qualified local structural engineer.",
      },
      errors: [],
      basis: "ASCE_7_22_4.8.2",
    };
  }

  if (EN_MARKETS.has(market)) {
    // EN 1991-1-3 Table 6.9: category H roof, qk = 0.4 kN/m² for roofs not
    // normally accessible (1.0 kN/m² where maintenance access is required).
    const load = 0.4;
    return {
      data: {
        loadKNM2: load,
        slopeBand:
          riseMMPerM < 100 ? "low" : riseMMPerM < 300 ? "medium" : "high",
        tributaryAreaBand: "up_to_1000",
        sourceTitle:
          "EN 1991-1-3 (Eurocode 1: Snow loads, imposed loads on roofs)",
        sourceUrl: "https://eurocodes.jrc.ec.europa.eu/",
        sourceTable: "Table 6.9, category H roof, qk = 0.4 kN/m²",
        scopeNote:
          "Reference only. EN 1991-1-3 category H applies 0.4 kN/m² to roofs not normally accessible and 1.0 kN/m² where maintenance access is required; national annexes may differ. Snow, wind and dead load are not included. Confirm the applicable national annex and design basis with a qualified local structural engineer.",
      },
      errors: [],
      basis: "EN_1991_1_3_H",
    };
  }

  return {
    data: null,
    errors: [
      `No roof live-load reference is bundled for ${market}. Enter the value from that market's structural code rather than applying another country's table.`,
    ],
  };
}
