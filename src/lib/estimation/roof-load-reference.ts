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
    return { data: null, errors: ["Tributary loaded area must be greater than zero."] };
  }

  const slopeBand = riseMMPerM < 100 ? "low" : riseMMPerM < 300 ? "medium" : "high";
  if ((tributaryAreaM2 > 1000 && tributaryAreaM2 < 1001) || (tributaryAreaM2 > 3000 && tributaryAreaM2 < 3001)) {
    return { data: null, errors: ["Table 8.10 does not specify how fractional tributary areas in the printed boundary gaps are classified; confirm the applicable interpretation with a qualified local engineer."] };
  }

  const areaBand = tributaryAreaM2 <= 1000
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
