/**
 * Pillar 2: Automated Bar Bending Schedules (BBS).
 *
 * Sources verified against the primary documents:
 * - BS 8666:2020 "Scheduling, dimensioning, bending and cutting of steel
 *   reinforcement for concrete" Table 2 (minimum scheduling radii, mandrel
 *   diameters, end projections, hook diameters) and Table 3 (standard shape
 *   total-length formulas).
 * - ACI 318-19/318M-19 Chapter 25: Table 25.3.1 (standard hook geometry),
 *   Table 25.3.2 (stirrup/tie/hoop bend diameters and extensions),
 *   25.3.4 (seismic hooks), 25.4.2.3 (simplified tension development with
 *   Table 25.4.2.5 modification factors), 25.4.9 (compression development),
 *   25.5.2.1 (tension lap Classes A/B), 25.5.5.1 (compression lap splices).
 *   ACI SP-66/CRSI detail these same standard hook and stirrup dimensions
 *   for shop drawing production.
 * - EN 1992-1-1 (Eurocode 2) 8.4 (anchorage, bond conditions eta1 good/poor)
 *   and 8.7 (laps).
 *
 * Honest scope: this engine produces scheduling-grade lengths and code
 * detailing values. It does not certify code compliance; fabricator
 * tolerances and local amendments govern production.
 */

// ── BS 8666:2020 Table 2 ──

/** Minimum scheduling radius r and bending mandrel diameter M per bar size. */
export const BS8666_TABLE2: Record<
  number,
  { r: number; M: number; pGeneral: number; pLink: number; q: number }
> = {
  // d(mm): r, M, min end projection general, min end projection links <150
  // bend, anticipated hook diameter q (N/A for 50mm hooks)
  6: { r: 12, M: 24, pGeneral: 110, pLink: 45, q: 110 },
  8: { r: 16, M: 32, pGeneral: 110, pLink: 60, q: 110 },
  10: { r: 20, M: 40, pGeneral: 115, pLink: 70, q: 130 },
  12: { r: 24, M: 48, pGeneral: 120, pLink: 85, q: 155 },
  16: { r: 32, M: 64, pGeneral: 140, pLink: 115, q: 210 },
  20: { r: 70, M: 140, pGeneral: 190, pLink: 200, q: 290 },
  25: { r: 87, M: 175, pGeneral: 235, pLink: 250, q: 365 },
  32: { r: 112, M: 224, pGeneral: 305, pLink: 320, q: 465 },
  40: { r: 140, M: 280, pGeneral: 380, pLink: 400, q: 580 },
  50: { r: 175, M: 350, pGeneral: 475, pLink: NaN, q: NaN },
};

/** Bar mass per linear metre (BS 8666 Table "Bar Mass and Radius"). */
export const BAR_MASS_KG_M: Record<number, number> = {
  6: 0.222,
  8: 0.395,
  10: 0.616,
  12: 0.888,
  16: 1.579,
  20: 2.466,
  25: 3.854,
  32: 6.313,
  40: 9.864,
  50: 15.413,
};

export type BsShapeCode =
  "00" | "11" | "21" | "33" | "41" | "51" | "63" | "67" | "77";

export interface BsShapeInput {
  /** Dimension letters per BS 8666:2020 Table 3, mm. */
  A: number;
  B?: number;
  C?: number;
  D?: number;
  E?: number;
  /** Bar nominal size d, mm. */
  d: number;
  /** Scheduling radius r, mm. Defaults to the Table 2 minimum for d. */
  r?: number;
}

export interface BsShapeResult {
  /** Total cutting length of the bar, mm. */
  L: number;
  /** Formula applied, with values substituted (audit transparency). */
  formula: string;
  shapeCode: BsShapeCode;
}

/**
 * BS 8666:2020 Table 3 total length of bar L.
 *
 * Note on shape 67: the owner brief called 67 the "helical tie", but in
 * BS 8666:2020 shape 67 is scheduled as a single dimension A with bending
 * per Clause 10, while the HELIX is shape 77 (C*pi*(A-d)). This engine
 * follows the standard: 67 = A (Clause 10 special), 77 = helix.
 */
export function bsShapeLength(
  shapeCode: BsShapeCode,
  input: BsShapeInput,
): BsShapeResult {
  const { A, d } = input;
  const B = input.B ?? 0;
  const C = input.C ?? 0;
  const D = input.D ?? 0;
  const E = input.E ?? 0;
  const table2 = BS8666_TABLE2[d];
  const r = input.r ?? table2?.r ?? 2 * d;
  if (!(A > 0)) throw new Error("Dimension A must be positive (mm).");
  if (!(d > 0)) throw new Error("Bar size d must be positive (mm).");
  const val = (x: number) => x.toFixed(0);
  let L: number;
  let formula: string;
  switch (shapeCode) {
    case "00":
      L = A;
      formula = `L = A = ${val(A)} mm (BS 8666:2020 Table 3, shape 00, cut straight)`;
      break;
    case "11":
      L = A + B - 0.5 * r - d;
      formula = `L = A + (B) - 0.5r - d = ${val(A)} + ${val(B)} - 0.5x${val(r)} - ${val(d)} = ${val(L)} mm (BS 8666:2020 Table 3, shape 11)`;
      break;
    case "21":
      L = A + B + C - r - 2 * d;
      formula = `L = A + B + (C) - r - 2d = ${val(L)} mm (BS 8666:2020 Table 3, shape 21)`;
      break;
    case "33":
      L = 2 * A + 1.7 * B + 2 * C - 4 * d;
      formula = `L = 2A + 1.7B + 2(C) - 4d = ${val(L)} mm (BS 8666:2020 Table 3, shape 33)`;
      break;
    case "41":
      L = A + B + C + D + E - 2 * r - 4 * d;
      formula = `L = A + B + C + D + (E) - 2r - 4d = ${val(L)} mm (BS 8666:2020 Table 3, shape 41)`;
      break;
    case "51": {
      L = 2 * (A + B + C) - 2.5 * r - 5 * d;
      formula = `L = 2[A + B + (C)] - 2.5r - 5d = ${val(L)} mm (BS 8666:2020 Table 3, shape 51)`;
      break;
    }
    case "63": {
      // 2A + 3B + (2C) - 3r - 6d, with the standard's minimized-hook variant
      L = 2 * A + 3 * B + 2 * C - 3 * r - 6 * d;
      formula = `L = 2A + 3B + (2C) - 3r - 6d = ${val(L)} mm (BS 8666:2020 Table 3, shape 63)`;
      break;
    }
    case "67":
      L = A;
      formula = `L = A = ${val(A)} mm (BS 8666:2020 shape 67: scheduled to dimension A, bending per Clause 10; see also shape 77 for helices)`;
      break;
    case "77": {
      const turns = C;
      if (!(turns > 0))
        throw new Error("Shape 77 requires C = number of turns > 0.");
      if (B > A / 5) {
        L = turns * Math.sqrt(Math.pow(Math.PI * (A - d), 2) + B * B);
        formula = `B > A/5: L = C{[pi(A-d)]^2 + B^2}^0.5 = ${val(L)} mm (BS 8666:2020 Table 3, shape 77, B = ${val(B)} is the lap)`;
      } else {
        L = turns * Math.PI * (A - d);
        formula = `L = C x pi(A - d) = ${val(turns)} x pi x ${val(A - d)} = ${val(L)} mm (BS 8666:2020 Table 3, shape 77 helix, B is the lap)`;
      }
      break;
    }
    default:
      throw new Error(`Unsupported BS 8666 shape code: ${shapeCode}`);
  }
  return { L, formula, shapeCode };
}

/**
 * Shape 51/63 minimized-hook variants from Table 3 footnotes: where the hook
 * legs (C) and (D) are to be minimized, fabricators may use these simpler
 * formulas instead of scheduling the hook dimensions explicitly.
 */
export function bsMinimizedLinkLength(
  shapeCode: "51" | "63",
  input: BsShapeInput,
): BsShapeResult {
  const { A, d } = input;
  const B = input.B ?? 0;
  if (!(A > 0) || !(B > 0) || !(d > 0))
    throw new Error("A, B and d must be positive (mm).");
  let L: number;
  let formula: string;
  if (shapeCode === "51") {
    L = 2 * A + 2 * B + Math.max(16 * d, 160);
    formula = `L = 2A + 2B + max(16d, 160) = ${L.toFixed(0)} mm (BS 8666:2020 Table 3, shape 51 with (C)/(D) minimized)`;
  } else {
    L =
      d <= 16 ? 2 * A + 3 * B + Math.max(14 * d, 140) : 2 * A + 3 * B + 13 * d;
    formula =
      d <= 16
        ? `L = 2A + 3B + max(14d, 140) = ${L.toFixed(0)} mm (shape 63, bars <= 16, hooks minimized)`
        : `L = 2A + 3B + 13d = ${L.toFixed(0)} mm (shape 63, bars >= 20, hooks minimized)`;
  }
  return { L, formula, shapeCode };
}

// ── ACI SP-66 / CRSI / ACI 318-19 hook geometry ──

export type AciHookType =
  | "primary90"
  | "primary180"
  | "stirrup90"
  | "stirrup135"
  | "stirrup180"
  | "seismic135";

export interface AciHookGeometry {
  hookType: AciHookType;
  /** Minimum inside bend diameter, mm. */
  insideBendDiameter: number;
  /** Straight extension beyond the bend, mm. */
  straightExtension: number;
  clause: string;
  notes: string[];
}

/** ACI 318-19 Table 25.3.1/25.3.2 + 25.3.4 (SP-66/CRSI standard dimensions). */
export function aciHookGeometry(
  barDia: number,
  hookType: AciHookType,
): AciHookGeometry {
  if (!(barDia > 0)) throw new Error("Bar diameter must be positive (mm).");
  // ACI bar sizes: No.10-25 => <= 25.4mm, No.29-36 => 28.7-35.8mm, No.43+ >= 43mm
  const primaryBendDia = barDia <= 25.4 ? 6 : barDia <= 35.8 ? 8 : 10;
  const stirrupBendDia = barDia <= 15.9 ? 4 : barDia <= 25.4 ? 6 : NaN;
  const notes: string[] = [];
  switch (hookType) {
    case "primary90":
      return {
        hookType,
        insideBendDiameter: primaryBendDia * barDia,
        straightExtension: 12 * barDia,
        clause: "ACI 318-19 Table 25.3.1 (90-degree hook)",
        notes,
      };
    case "primary180":
      return {
        hookType,
        insideBendDiameter: primaryBendDia * barDia,
        straightExtension: Math.max(4 * barDia, 65),
        clause: "ACI 318-19 Table 25.3.1 (180-degree hook)",
        notes,
      };
    case "stirrup90":
      notes.push(
        "The 90-degree stirrup hook with 6db extension is limited to No. 16 bars and smaller (R25.3.2).",
      );
      return {
        hookType,
        insideBendDiameter: stirrupBendDia * barDia,
        straightExtension:
          barDia <= 15.9 ? Math.max(6 * barDia, 75) : 12 * barDia,
        clause: "ACI 318-19 Table 25.3.2 (90-degree stirrup/tie hook)",
        notes,
      };
    case "stirrup135":
      return {
        hookType,
        insideBendDiameter: stirrupBendDia * barDia,
        straightExtension: Math.max(6 * barDia, 75),
        clause: "ACI 318-19 Table 25.3.2 (135-degree stirrup/tie hook)",
        notes,
      };
    case "stirrup180":
      return {
        hookType,
        insideBendDiameter: stirrupBendDia * barDia,
        straightExtension: Math.max(4 * barDia, 65),
        clause: "ACI 318-19 Table 25.3.2 (180-degree stirrup/tie hook)",
        notes,
      };
    case "seismic135":
      notes.push(
        "Seismic hook: minimum bend 135 degrees (90 degrees only for circular hoops); the hook must engage longitudinal reinforcement and the extension must project into the interior of the stirrup or hoop (ACI 318-19 25.3.4).",
        "Seismic stirrups, ties and hoops are limited to No. 25 bars and smaller (R25.3.2).",
      );
      return {
        hookType,
        insideBendDiameter: stirrupBendDia * barDia,
        straightExtension: Math.max(6 * barDia, 75),
        clause: "ACI 318-19 Table 25.3.2 + 25.3.4 (135-degree seismic hook)",
        notes,
      };
  }
}

// ── ACI 318-19 development and lap lengths (318M metric) ──

export interface AciDevelopmentInput {
  /** Bar diameter, mm. */
  db: number;
  /** Yield strength, MPa (280, 420, 550 or 690 grades per Table 25.4.2.5). */
  fy: number;
  /** Compressive strength fc', MPa. */
  fc: number;
  /** Casting position: "top" places > 300 mm of fresh concrete below. */
  castingPosition?: "top" | "other";
  /** Epoxy coating condition per Table 25.4.2.5. */
  epoxy?: "lowCover" | "other" | "none";
  /** Spacing/cover case: "good" = Table 25.4.2.3 first row. */
  spacingCase?: "good" | "other";
  /** Lightweight concrete (lambda = 0.75). */
  lightweight?: boolean;
}

export interface AciDevelopmentResult {
  ld: number;
  formula: string;
  factors: { lambda: number; psiT: number; psiE: number; psiG: number };
}

/** ACI 318M-19 25.4.2.3 simplified tension development with 25.4.2.5 factors. */
export function aciTensionDevelopment(
  input: AciDevelopmentInput,
): AciDevelopmentResult {
  const { db, fy, fc } = input;
  if (!(db > 0)) throw new Error("Bar diameter must be positive (mm).");
  if (!(fy > 0)) throw new Error("fy must be positive (MPa).");
  if (!(fc > 0)) throw new Error("fc must be positive (MPa).");
  const lambda = input.lightweight ? 0.75 : 1.0;
  const psiT = input.castingPosition === "top" ? 1.3 : 1.0;
  const psiE =
    input.epoxy === "lowCover" ? 1.5 : input.epoxy === "other" ? 1.2 : 1.0;
  const psiTtimesE = Math.min(psiT * psiE, 1.7); // Table 25.4.2.5 [1]
  const psiG = fy <= 420 ? 1.0 : fy <= 550 ? 1.15 : 1.3;
  // sqrt(fc') cap per 25.4.1.4 (metric: sqrt(fc') <= 8.3 MPa)
  const sqrtFc = Math.min(Math.sqrt(fc), 8.3);
  // Table 25.4.2.3 denominators embed the size factor psi_s
  const small = db <= 19.1; // No. 19 and smaller
  const denom =
    input.spacingCase === "good"
      ? small
        ? 2.1 * lambda * sqrtFc
        : 1.7 * lambda * sqrtFc
      : small
        ? 1.4 * lambda * sqrtFc
        : 1.1 * lambda * sqrtFc;
  const ldCalc = (fy * psiTtimesE * psiG * db) / denom;
  const ld = Math.max(ldCalc, 300); // 25.4.2.1(b)
  return {
    ld,
    formula: `ld = fy x psit x psie x psig x db / (${small ? (input.spacingCase === "good" ? "2.1" : "1.4") : input.spacingCase === "good" ? "1.7" : "1.1"} x lambda x sqrt(fc')) = ${fy} x ${psiTtimesE} x ${psiG} x ${db} / ${denom.toFixed(2)} = ${ldCalc.toFixed(0)} mm, not less than 300 mm => ${ld.toFixed(0)} mm (ACI 318M-19 Table 25.4.2.3 with Table 25.4.2.5 factors; ld >= 300 mm per 25.4.2.1(b))`,
    factors: { lambda, psiT, psiE, psiG },
  };
}

/** ACI 318M-19 25.4.9 compression development ldc. */
export function aciCompressionDevelopment(
  input: AciDevelopmentInput & { confined?: boolean },
): AciDevelopmentResult {
  const { db, fy, fc } = input;
  const lambda = input.lightweight ? 0.75 : 1.0;
  const psiR = input.confined ? 0.75 : 1.0; // Table 25.4.9.3
  const sqrtFc = Math.min(Math.sqrt(fc), 8.3);
  const a = (0.24 * fy * psiR * db) / (lambda * sqrtFc);
  const b = 0.043 * fy * psiR * db;
  const ldc = Math.max(a, b, 200); // 25.4.9.1(b)
  return {
    ld: ldc,
    formula: `ldc = max(0.24 x fy x psir x db / (lambda x sqrt(fc')), 0.043 x fy x psir x db, 200) = max(${a.toFixed(0)}, ${b.toFixed(0)}, 200) = ${ldc.toFixed(0)} mm (ACI 318M-19 25.4.9.2, psi_r = ${psiR})`,
    factors: { lambda, psiT: 1, psiE: 1, psiG: 1 },
  };
}

/** ACI 318M-19 Table 25.5.2.1 tension lap splice (Class A or B). */
export function aciTensionLap(
  input: AciDevelopmentInput & { spliceClass?: "A" | "B" },
): { ls: number; formula: string } {
  const cls = input.spliceClass ?? "B";
  const { ld } = aciTensionDevelopment(input);
  const ls = Math.max(cls === "A" ? 1.0 * ld : 1.3 * ld, 300);
  return {
    ls,
    formula: `lst = ${cls === "A" ? "1.0" : "1.3"} x ld = ${ls.toFixed(0)} mm, not less than 300 mm (ACI 318M-19 Table 25.5.2.1, Class ${cls}; Class A requires As,provided/As,required >= 2.0 and no more than 50 percent of As spliced within the lap)`,
  };
}

/** ACI 318M-19 25.5.5.1 compression lap splice lsc. */
export function aciCompressionLap(input: AciDevelopmentInput): {
  ls: number;
  formula: string;
  notes: string[];
} {
  const { db, fy, fc } = input;
  if (db > 35.8)
    throw new Error(
      "Compression lap splices are not permitted for bars larger than No. 36 (ACI 318-19 25.5.5.2).",
    );
  const notes: string[] = [];
  let ls: number;
  if (fy <= 420) {
    ls = Math.max(0.071 * fy * db, 300);
    notes.push(
      "fy <= 420 MPa: lsc is the longer of 0.071fydb and 300 mm (25.5.5.1(a)).",
    );
  } else {
    ls = Math.max((0.13 * fy - 24) * db, 300);
    notes.push(
      `420 < fy: lsc is the longer of (0.13fy - 24)db and 300 mm (25.5.5.1(b)); fy > 550 additionally requires the tension lap check (25.5.5.1(c)).`,
    );
  }
  if (fc < 21) {
    ls *= 4 / 3;
    notes.push(
      "fc' < 21 MPa: the lap length is increased by one-third (25.5.5.1).",
    );
  }
  return {
    ls,
    formula: `lsc = ${ls.toFixed(0)} mm (ACI 318M-19 25.5.5.1, fy = ${fy} MPa, db = ${db} mm, fc' = ${fc} MPa)`,
    notes,
  };
}

// ── EN 1992-1-1 (Eurocode 2) anchorage and laps by bond condition ──

export interface Ec2DevelopmentInput {
  /** Bar diameter, mm. */
  db: number;
  /** Characteristic yield strength fyk, MPa (default 500). */
  fyk?: number;
  /** Characteristic concrete compressive strength fck, MPa. */
  fck: number;
  /** Bond condition per 8.4.2: "good" or "poor" (eta1). */
  bondCondition?: "good" | "poor";
  /** Ratio As,required / As,provided at the section (0 < x <= 1). */
  asRatio?: number;
  /** Lightweight aggregate concrete (eta2 = 0.7? handled via fctd path). */
}

export interface Ec2DevelopmentResult {
  lbd: number;
  fbd: number;
  lbRqd: number;
  formula: string;
}

/**
 * EN 1992-1-1 8.4.4 simplified anchorage (straight bars, ribbed,
 * good confinement defaults alpha1..alpha5 = 1.0). Bond stress
 * fbd = 2.25 x eta1 x fctd (ribbed bars, good/poor bond conditions).
 */
export function ec2AnchorageLength(
  input: Ec2DevelopmentInput & { member?: "tension" | "compression" },
): Ec2DevelopmentResult {
  const db = input.db;
  const fyk = input.fyk ?? 500;
  const fck = input.fck;
  const eta1 = input.bondCondition === "poor" ? 0.7 : 1.0;
  const asRatio = Math.min(Math.max(input.asRatio ?? 1, 0), 1);
  if (!(db > 0)) throw new Error("Bar diameter must be positive (mm).");
  if (!(fck > 0)) throw new Error("fck must be positive (MPa).");
  // 3.1.6: fctd = fctk,0.05 / gamma_c, fctk,0.05 = 0.21 fck^(2/3), gamma_c = 1.5
  const fctd = (0.21 * Math.pow(fck, 2 / 3)) / 1.5;
  const fbd = 2.25 * eta1 * fctd;
  const sigmaSd = fyk / 1.15; // full yield design stress
  const lbRqd = (db / 4) * (sigmaSd / fbd);
  const lbd = Math.max(lbRqd * asRatio, 10 * db);
  const isCompression = input.member === "compression";
  const lbMin = isCompression
    ? Math.max(10 * db, 0.6 * lbRqd)
    : Math.max(10 * db, 0.3 * lbRqd);
  const lbdFinal = Math.max(lbd, lbMin);
  return {
    lbd: lbdFinal,
    fbd,
    lbRqd,
    formula: `fctd = 0.21 x fck^(2/3) / 1.5 = ${fctd.toFixed(3)} MPa; fbd = 2.25 x ${eta1 === 1 ? "1.0 (good bond)" : "0.7 (poor bond)"} x fctd = ${fbd.toFixed(3)} MPa; lb,rqd = (db/4)(sigma_sd/fbd) = (${db}/4)(${sigmaSd.toFixed(1)}/${fbd.toFixed(3)}) = ${lbRqd.toFixed(0)} mm; lbd = ${lbdFinal.toFixed(0)} mm (EN 1992-1-1 8.4.4, straight ribbed bars, alpha factors = 1.0, As ratio = ${asRatio.toFixed(2)}; lb,min per 8.4.4(6))`,
  };
}

/** EN 1992-1-1 8.7.3 lap length l0 with alpha6 stagger factor. */
export function ec2LapLength(
  input: Ec2DevelopmentInput & { percentLapped?: number },
): { l0: number; alpha6: number; formula: string } {
  const percent = Math.min(Math.max(input.percentLapped ?? 25, 1), 100);
  const base = ec2AnchorageLength(input);
  const alpha6 = Math.min(Math.max(Math.sqrt(percent / 25), 1.0), 1.5);
  // l0 = alpha1 alpha2 alpha3 alpha5 alpha6 x lb,rqd x As,req/As,prov (8.7.3)
  const asRatio = Math.min(Math.max(input.asRatio ?? 1, 0), 1);
  const l0raw = alpha6 * base.lbRqd * asRatio;
  const l0Min = Math.max(0.3 * alpha6 * base.lbRqd, 15 * input.db, 200);
  const l0 = Math.max(l0raw, l0Min);
  return {
    l0,
    alpha6,
    formula: `l0 = alpha6 x lb,rqd x As,req/As,prov = ${alpha6.toFixed(2)} x ${base.lbRqd.toFixed(0)} x ${asRatio.toFixed(2)} = ${l0raw.toFixed(0)} mm, not less than l0,min = max(0.3 x alpha6 x lb,rqd, 15db, 200) = ${l0Min.toFixed(0)} mm => ${l0.toFixed(0)} mm (EN 1992-1-1 8.7.3; alpha6 = sqrt(${percent}/25) = ${alpha6.toFixed(2)} for ${percent}% of bars lapped in the zone)`,
  };
}

// ── BVBS export (Stabliste subset) ──

export interface BbsItem {
  /** Schedule/position number. */
  pos: string;
  /** Number of bars. */
  count: number;
  /** Bar diameter, mm. */
  dia: number;
  /** Steel grade label, e.g. "B500B". */
  steelGrade: string;
  /** Total cutting length per bar, mm. */
  lengthMm: number;
  /** BS 8666 shape code. */
  shapeCode: BsShapeCode;
  /** Bending dimensions A..E, mm. */
  dims: { A: number; B?: number; C?: number; D?: number; E?: number };
}

export interface BvbsExportMeta {
  projectName: string;
  sender: string;
}

/**
 * BVBS (Bundesvereinigung Bausoftware / Datenverbund Bau) Stabliste bar list
 * export subset for CNC shear/bend lines. Record lines are prefixed with the
 * ~X001 record type and @-separated fields, per the widely implemented BVBS
 * exchange subset used by rebar fabrication software.
 *
 * HONEST LIMITATION: this is a compatible subset of the BVBS exchange
 * format, not the full proprietary specification. Verify import into the
 * target machine controller (Schnell, Pile, aXbol, EVG, Progress) on a
 * sample position before production use.
 */
export function generateBvbsFile(
  items: BbsItem[],
  meta: BvbsExportMeta,
): string {
  if (items.length === 0) throw new Error("No schedule items to export.");
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const lines: string[] = [];
  lines.push(
    `~U001@"${meta.projectName}"@"FRELUX Bar Bending Schedule (BS 8666:2020)"`,
  );
  lines.push(
    `~A001@"${meta.sender}"@"BVBS Stabliste"@"${dd}.${mm}.${yyyy}"@"${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}"@"1"`,
  );
  lines.push(`~B001@"1"@"${meta.projectName}"@"mm"`);
  for (const it of items) {
    const dm = it.dims;
    const fields = [
      it.pos,
      String(it.count),
      String(it.dia),
      it.steelGrade,
      String(Math.round(it.lengthMm)),
      it.shapeCode,
      String(dm.A ?? 0),
      String(dm.B ?? 0),
      String(dm.C ?? 0),
      String(dm.D ?? 0),
      String(dm.E ?? 0),
    ];
    lines.push(`~C001@"${fields.join('"@"')}"`);
  }
  lines.push(`~E001@"1"`);
  return lines.join("\r\n") + "\r\n";
}

/** Mass of a schedule item, kg (BS 8666 bar mass table). */
export function bbsItemMassKg(item: BbsItem): number {
  const massPerM = BAR_MASS_KG_M[item.dia];
  if (!massPerM) throw new Error(`No bar mass for diameter ${item.dia} mm.`);
  return (item.lengthMm / 1000) * item.count * massPerM;
}
