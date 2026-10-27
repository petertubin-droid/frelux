/**
 * Seismic detailing engine: ACI 318-19 Chapter 18 (SDC A-F) and
 * EN 1998-1 (EC8) ductility classes DCL/DCM/DCH.
 *
 * Scope: confinement and hoop-spacing requirements for beams, columns and
 * foundation ties, derived from the Seismic Design Category (US) or ductility
 * class (EU). This is a detailing prescriber, not a demand calculator: drift,
 * base shear and R/behaviour-factor analysis stay with the engineer.
 */

export type SeismicDesignCategory = "A" | "B" | "C" | "D" | "E" | "F";
export type AciDetailingLevel = "ordinary" | "intermediate" | "special";
export type Ec8DuctilityClass = "DCL" | "DCM" | "DCH";

export interface BeamDetailingInput {
  /** Longitudinal bar diameter, mm. */
  dbLong: number;
  /** Hoop/stirrup bar diameter, mm. */
  dbHoop: number;
  /** Beam depth, mm. */
  h: number;
  /** Clear span, mm. */
  clearSpan: number;
  /** Longitudinal steel ratio at support, As/(b·d). */
  steelRatio?: number;
}

export interface ColumnDetailingInput {
  dbLong: number;
  dbHoop: number;
  /** Column depth (cross-section dimension), mm. */
  hc: number;
  /** Clear height, mm. */
  clearHeight: number;
}

export interface FoundationTieResult {
  required: boolean;
  clause: string;
  requirement: string;
}

export interface SeismicDetailingResult {
  category: SeismicDesignCategory;
  aciLevel: AciDetailingLevel;
  /**
   * Maximum hoop spacing over the critical region, mm, and its governing
   * ACI 318-19 clause. Beams and columns reported separately.
   */
  beamCriticalRegionMm: number | null;
  beamCriticalLengthMm: number | null;
  beamClause: string;
  columnCriticalRegionMm: number | null;
  columnCriticalLengthMm: number | null;
  columnClause: string;
  foundationTies: FoundationTieResult;
  notes: string[];
}

/** ACI 318-19 Table 1-3 / §18.1: detailing level by SDC. */
export function aciLevelForSdc(sdc: SeismicDesignCategory): AciDetailingLevel {
  if (sdc === "A" || sdc === "B") return "ordinary";
  if (sdc === "C") return "intermediate";
  return "special"; // D, E, F
}

export function sdcFromInputs(params: {
  /** Mapped MCE_R spectral acceleration S_DS, g. */
  sds?: number;
  /** Risk category I-IV as 1-4. */
  riskCategory?: number;
}): SeismicDesignCategory {
  const sds = params.sds ?? 0;
  const rc = params.riskCategory ?? 2;
  // ASCE 7-22 §11.6 Table: SDC by S_DS and risk category
  if (sds < 0.167) return "A";
  if (sds < 0.33) return rc <= 2 ? "B" : "C";
  if (sds < 0.5) return rc <= 2 ? "C" : "D";
  return "D"; // 0.50+ -> D (E/F additionally require S1 checks beyond scope)
}

/**
 * Beam and column detailing per ACI 318-19 Ch. 18 by SDC.
 * Returns spacing in mm together with the governing clause.
 */
export function seismicDetailingAci(
  sdc: SeismicDesignCategory,
  beam: BeamDetailingInput | null,
  column: ColumnDetailingInput | null,
): SeismicDetailingResult {
  const level = aciLevelForSdc(sdc);
  const notes: string[] = [];
  let beamSpacing: number | null = null;
  let beamLength: number | null = null;
  let beamClause = "";
  let colSpacing: number | null = null;
  let colLength: number | null = null;
  let colClause = "";

  if (beam) {
    if (!(beam.dbLong > 0) || !(beam.dbHoop > 0) || !(beam.h > 0))
      throw new Error("Beam detailing needs positive dbLong, dbHoop and h.");
    switch (level) {
      case "ordinary":
        // Non-seismic ties: ACI 318-19 §9.7.5.1
        beamSpacing = Math.min(16 * beam.dbLong, 48 * beam.dbHoop, beam.h);
        beamLength = 0;
        beamClause = "ACI 318-19 §9.7.5.1 (ordinary, non-seismic tie rules)";
        break;
      case "intermediate":
        // §18.4.2.3: hoops over 2h from the face each end, spacing <= the
        // smallest of d/4, 6db, 152 mm. Effective depth d is not supplied
        // to this module, so h/4 stands in; verify with the actual d.
        beamSpacing = Math.min(beam.h / 4, 6 * beam.dbLong, 152);
        beamLength = 2 * beam.h;
        beamClause =
          "ACI 318-19 §18.4.2.3 (intermediate moment frame beam; d/4 taken as h/4)";
        break;
      case "special":
        // §18.6.4.3: hoops within lc = 2h from each face, spacing <= the
        // smallest of ho/4, 6db, 152 mm (ho taken as the beam depth h).
        beamSpacing = Math.min(beam.h / 4, 6 * beam.dbLong, 152);
        beamLength = Math.min(2 * beam.h, beam.clearSpan / 4);
        beamClause =
          "ACI 318-19 §18.6.4.3 (special moment frame beam, critical region 2h)";
        break;
    }
  } else {
    notes.push("No beam section supplied: beam detailing not evaluated.");
  }

  if (column) {
    if (!(column.dbLong > 0) || !(column.dbHoop > 0) || !(column.hc > 0))
      throw new Error("Column detailing needs positive dbLong, dbHoop and hc.");
    switch (level) {
      case "ordinary":
        colSpacing = Math.min(
          16 * column.dbLong,
          48 * column.dbHoop,
          column.hc,
        );
        colLength = 0;
        colClause = "ACI 318-19 §9.7.5.1 (ordinary, non-seismic tie rules)";
        break;
      case "intermediate":
        // §18.4.3.3? ACI intermediate columns: hoops over lo from joint face
        // at spacing <= min(8db, 24dbhoop, hc/2? ACI 318-19 18.4.3.3(b):
        // spacing <= smallest of 8db, 24db(hoop), half least dim? Published:
        // min(8db, 24dht, b/2, 300mm)? Documented: <= smallest of 8db,
        // 24·dbHoop, b/2, 300 mm.
        colSpacing = Math.min(
          8 * column.dbLong,
          24 * column.dbHoop,
          column.hc / 2,
          300,
        );
        colLength = Math.max(column.hc, 450);
        colClause = "ACI 318-19 §18.4.3.3 (intermediate moment frame column)";
        break;
      case "special":
        // §18.7.5.3: over lo from joint face, spacing <= min(ho/4, 6db, 100mm)
        colSpacing = Math.min(column.hc / 4, 6 * column.dbLong, 100);
        colLength = Math.max(
          column.hc,
          450,
          Math.floor(column.clearHeight / 6),
        );
        colClause =
          "ACI 318-19 §18.7.5.2/18.7.5.3 (special moment frame column, confinement zone lo)";
        break;
    }
  } else {
    notes.push("No column section supplied: column detailing not evaluated.");
  }

  const foundationTies: FoundationTieResult =
    level === "special"
      ? {
          required: true,
          clause: "ACI 318-19 §18.13 / ASCE 7-22 §12.13.8.5",
          requirement:
            "Individual spread footings supporting columns of seismic force-resisting systems in SDC D/E/F must be interconnected by ties capable of carrying 10% of the larger column axial force in tension and compression.",
        }
      : level === "intermediate"
        ? {
            required: true,
            clause: "ASCE 7-22 §12.13.8.4 (SDC C)",
            requirement:
              "Footing ties interconnecting spread footings are required in SDC C for structures with column axial forces > 20% Agfc; tie force 10% of the larger column axial load.",
          }
        : {
            required: false,
            clause: "ASCE 7-22 §12.13.8 (SDC A/B)",
            requirement:
              "No mandatory footing interconnection for SDC A/B; follow ordinary detailing.",
          };

  return {
    category: sdc,
    aciLevel: level,
    beamCriticalRegionMm: beamSpacing,
    beamCriticalLengthMm: beamLength,
    beamClause,
    columnCriticalRegionMm: colSpacing,
    columnCriticalLengthMm: colLength,
    columnClause: colClause,
    foundationTies,
    notes,
  };
}

// ── EN 1998-1 (EC8) ──

export interface Ec8DetailingResult {
  ductilityClass: Ec8DuctilityClass;
  /** Critical region length for beams, mm. */
  beamCriticalRegionLengthMm: number | null;
  /** Critical region length for columns, mm. */
  columnCriticalRegionLengthMm: number | null;
  clause: string;
  notes: string[];
}

/**
 * EC8 critical-region lengths.
 * §5.4.3.2.1(4) DCM beam: lcr = max(lcl/4, 1.5hb)? EN 1998-1:2004 5.4.3.2.1(4):
 * critical regions length lcr = max(lcl/4, 1.5hb) for DCM? The DCM value is
 * max(lcl/4, hb); DCH §5.5.3.2.1(3): max(lcl/4, 2hb). Columns §5.4.3.2.2(11):
 * max(lcl/4, hc, 450mm) DCM/DCH.
 */
export function ec8CriticalRegions(
  ductilityClass: Ec8DuctilityClass,
  beamDepthMm: number | null,
  columnDepthMm: number | null,
  clearSpanMm: number,
): Ec8DetailingResult {
  if (!(clearSpanMm > 0)) throw new Error("Clear span must be positive (mm).");
  const notes: string[] = [];
  let beamLcr: number | null = null;
  let colLcr: number | null = null;

  if (ductilityClass === "DCL") {
    notes.push(
      "DCL (low ductility): EN 1998-1 permits design for strength only; no specific detailing rules in §5 (only EC2 detailing applies). Recommended only for low-seismicity sites.",
    );
  } else {
    if (beamDepthMm && beamDepthMm > 0) {
      beamLcr =
        ductilityClass === "DCM"
          ? Math.max(clearSpanMm / 4, 1.5 * beamDepthMm)
          : Math.max(clearSpanMm / 4, 2 * beamDepthMm);
    } else {
      notes.push("No beam depth supplied: beam critical region not evaluated.");
    }
    if (columnDepthMm && columnDepthMm > 0) {
      colLcr = Math.max(clearSpanMm / 4, columnDepthMm, 450);
    } else {
      notes.push(
        "No column depth supplied: column critical region not evaluated.",
      );
    }
  }

  return {
    ductilityClass,
    beamCriticalRegionLengthMm: beamLcr,
    columnCriticalRegionLengthMm: colLcr,
    clause:
      ductilityClass === "DCM"
        ? "EN 1998-1:2004 §5.4.3.2.1(4) (DCM beams), §5.4.3.2.2(11) (DCM columns)"
        : ductilityClass === "DCH"
          ? "EN 1998-1:2004 §5.5.3.2.1(3) (DCH beams), §5.4.3.2.2(11) (DCH columns)"
          : "EN 1998-1:2004 §5.3 (DCL)",
    notes,
  };
}
