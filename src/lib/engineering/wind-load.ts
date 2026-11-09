/**
 * Wind load takeoff: ASCE 7-22 and EN 1991-1-4 velocity-pressure engines.
 *
 * ASCE 7-22 (Chapter 26): qz = 0.613·Kz·Kzt·Kd·V² (SI, N/m², V in m/s)
 *   = 0.00256·Kz·Kzt·Kd·V² (US customary, psf, V in mph)
 *   Kz from exposure category and height (Table 26.10-1 formulas),
 *   Kd = 0.85 (Table 26.6-1, main wind force resisting systems),
 *   Ke per Table 26.9-1 (1.0 below ~300 m elevation).
 * EN 1991-1-4 §4.5: qb = 0.5·rho·vb²; qp(z) = ce(z)·qb = (1 + 7·Iv(z))·qb.
 *
 * Roof uplift and wall pressures use components-and-cladding GCp values for
 * enclosed low-rise buildings (ASCE 7-22 Figs 30.3-2/-3 / 30.4-1) with the
 * GCpi = +/- 0.18 enclosed internal-pressure coefficient (Table 26.13-1).
 *
 * Basic wind speeds are INPUTS: this engine never invents a site wind
 * speed. Indicative national defaults exist only in WIND_ZONE_DEFAULTS and
 * are labelled as values an engineer of record must confirm.
 */

export type WindCode = "ASCE_7_22" | "EN_1991_1_4";
export type ExposureCategory = "B" | "C" | "D";

/** ASCE 7-22 Table 26.9-1: Ke = 1.0 up to ~305 m elevation. */
const KE_DEFAULT = 1.0;

/** ASCE 7-22 Table 26.6-1: Kd = 0.85 for main wind force resisting systems. */
const KD_MWFRS = 0.85;

/** ASCE 7-22 Table 26.13-1: enclosed buildings GCpi = ±0.18. */
export const GCPI_ENCLOSED = 0.18;

const EXPOSURE_PARAMS: Record<
  ExposureCategory,
  { alpha: number; zg: number; zgM: number }
> = {
  // Table 26.10-1: B: alpha 7.0, zg 1200 ft (365.76 m); C: 9.5, 900 ft (274.32 m);
  // D: 11.5, 700 ft (213.36 m).
  B: { alpha: 7.0, zg: 365.76, zgM: 365.76 },
  C: { alpha: 9.5, zg: 274.32, zgM: 274.32 },
  D: { alpha: 11.5, zg: 213.36, zgM: 213.36 },
};

/** ASCE 7-22 velocity-pressure exposure coefficient Kz at height z (m). */
export function asceKz(exposure: ExposureCategory, z: number): number {
  const { alpha, zg } = EXPOSURE_PARAMS[exposure];
  const zz = Math.max(z, 0);
  const floorKz = exposure === "B" ? 0.7 : exposure === "C" ? 0.85 : 1.03;
  if (zz < 9.14) return floorKz; // Table 26.10-1 plateau below 30 ft
  const kz = 2.01 * Math.pow(zz / zg, 2 / alpha);
  return Math.max(kz, floorKz);
}

export interface AsceWindInput {
  /** Basic wind speed V, m/s (Risk Category II/III 3-s gust). */
  v_ms: number;
  exposure: ExposureCategory;
  /** Height above ground, m. */
  z: number;
  /** Topographic factor Kzt (default 1.0, flat site). */
  kzt?: number;
}

export interface AsceWindResult {
  /** Velocity pressure qz, N/m². */
  qz_Nm2: number;
  kz: number;
  kzt: number;
  kd: number;
  ke: number;
  formula: string;
}

/** ASCE 7-22 Eq. 26.10-1 (SI form): qz = 0.613·Kz·Kzt·Kd·Ke·V². */
export function asceVelocityPressure(input: AsceWindInput): AsceWindResult {
  if (!(input.v_ms > 0))
    throw new Error("Basic wind speed V must be positive (m/s).");
  if (!(input.z > 0)) throw new Error("Height z must be positive (m).");
  const kzt = input.kzt ?? 1.0;
  const kz = asceKz(input.exposure, input.z);
  const qz = 0.613 * kz * kzt * KD_MWFRS * KE_DEFAULT * input.v_ms * input.v_ms;
  return {
    qz_Nm2: qz,
    kz,
    kzt,
    kd: KD_MWFRS,
    ke: KE_DEFAULT,
    formula: `qz = 0.613·Kz·Kzt·Kd·Ke·V² = 0.613×${kz.toFixed(3)}×${kzt.toFixed(2)}×${KD_MWFRS}×${KE_DEFAULT}×${input.v_ms}² = ${qz.toFixed(1)} N/m² (ASCE 7-22 Eq. 26.10-1, exposure ${input.exposure})`,
  };
}

/** ASCE 7-22 components-and-cladding zones for gable roofs <= 7° (Fig 30.4-1 family). */
export type RoofCcZone = "interior" | "edge" | "corner";

const ROOF_UPLIFT_GCP: Record<RoofCcZone, number> = {
  // Negative (uplift) GCp for Zone 1 / 2 / 3, enclosed low-rise, Area 10 m²
  interior: -0.9,
  edge: -1.7,
  corner: -2.8,
};

export interface RoofUpliftInput {
  qh_Nm2: number;
  zone: RoofCcZone;
  /** Tributary area of the sheeting/panel, m². */
  area_m2: number;
}

export interface RoofUpliftResult {
  /** Net design uplift pressure, N/m² (already includes +GCpi suction combination). */
  netPressure_Nm2: number;
  /** Total uplift force on the panel area, N. */
  force_N: number;
  gcp: number;
  formula: string;
}

/** ASCE 7-22 §30.4: p = qh·(GCp − GCpi) using the suction-critical +GCpi. */
export function roofUplift(input: RoofUpliftInput): RoofUpliftResult {
  if (!(input.qh_Nm2 > 0))
    throw new Error("Velocity pressure qh must be positive (N/m²).");
  if (!(input.area_m2 > 0))
    throw new Error("Tributary area must be positive (m²).");
  const gcp = ROOF_UPLIFT_GCP[input.zone];
  const p = input.qh_Nm2 * (gcp + GCPI_ENCLOSED);
  return {
    netPressure_Nm2: p,
    force_N: p * input.area_m2,
    gcp,
    formula: `p = qh·(GCp + GCpi) = ${input.qh_Nm2.toFixed(1)}×(${gcp} + ${GCPI_ENCLOSED}) = ${p.toFixed(1)} N/m²; uplift force = p×A = ${p.toFixed(1)}×${input.area_m2} = ${(p * input.area_m2).toFixed(0)} N (ASCE 7-22 Ch. 30, zone: ${input.zone})`,
  };
}

/**
 * Wall racking pressure: windward face, simplified envelope
 * p = qz·(Cp + GCpi) with Cp = +0.8 (Table 27.2-1 windward wall).
 */
export function windwardWallPressure(qz_Nm2: number): number {
  if (!(qz_Nm2 > 0))
    throw new Error("Velocity pressure qz must be positive (N/m²).");
  return qz_Nm2 * (0.8 + GCPI_ENCLOSED);
}

// ── EN 1991-1-4 ──

export interface EnWindInput {
  /** Basic wind speed vb, m/s (mapped 10-min mean, 50-year return). */
  vb_ms: number;
  /** Reference height, m. */
  z: number;
  /** Terrain category II default: z0 = 0.05 m, zmin = 2 m. */
  z0?: number;
  zmin?: number;
  /** Air density, kg/m³ (default 1.25). */
  rho?: number;
}

export interface EnWindResult {
  /** Basic pressure qb, N/m². */
  qb_Nm2: number;
  /** Turbulence intensity Iv(z). */
  iv: number;
  /** Exposure factor ce(z) = 1 + 7·Iv(z). */
  ce: number;
  /** Peak velocity pressure qp(z), N/m². */
  qp_Nm2: number;
  formula: string;
}

/** EN 1991-1-4 §4.5: qp(z) = ce(z)·qb = (1 + 7·Iv(z))·0.5·rho·vb². */
export function enPeakVelocityPressure(input: EnWindInput): EnWindResult {
  const z0 = input.z0 ?? 0.05;
  const zmin = input.zmin ?? 2.0;
  const rho = input.rho ?? 1.25;
  if (!(input.vb_ms > 0))
    throw new Error("Basic wind speed vb must be positive (m/s).");
  if (!(input.z > 0))
    throw new Error("Reference height z must be positive (m).");
  const zEff = Math.max(input.z, zmin);
  const z0Eff = Math.max(z0, 0.003);
  // §4.2 Eq. 4.4 (terrain II): Iv(z) = 1/(c·ln(z/z0)) with c = 1 per Table 4.1
  const iv = 1 / (1.0 * Math.log(zEff / z0Eff));
  const ce = 1 + 7 * iv;
  const qb = 0.5 * rho * input.vb_ms * input.vb_ms;
  const qp = ce * qb;
  return {
    qb_Nm2: qb,
    iv,
    ce,
    qp_Nm2: qp,
    formula: `qb = 0.5·rho·vb² = 0.5×${rho}×${input.vb_ms}² = ${qb.toFixed(1)} N/m²; Iv(${zEff.toFixed(1)} m) = 1/ln(z/z0) = 1/ln(${zEff.toFixed(1)}/${z0Eff}) = ${iv.toFixed(3)}; qp = (1+7·Iv)·qb = ${ce.toFixed(2)}×${qb.toFixed(1)} = ${qp.toFixed(1)} N/m² (EN 1991-1-4 §4.5, Eq. 4.7/4.10)`,
  };
}

// ── Indicative market defaults (engineer of record must confirm) ──

/**
 * Indicative basic wind speeds for market onboarding only. These are NOT
 * site values: ASCE 7-22 and EN 1991-1-4 maps vary by risk category and
 * region within each country. Always labelled as indicative in outputs.
 */
export const WIND_ZONE_DEFAULTS: Record<
  string,
  { code: WindCode; label: string; v_ms: number }
> = {
  US: {
    code: "ASCE_7_22",
    label:
      "Indicative ASCE 7-22 Risk Cat II value (varies 40-90 m/s by region)",
    v_ms: 47,
  },
  CA: {
    code: "ASCE_7_22",
    label: "Indicative NBC 2020 q(1/50) reference (varies by region)",
    v_ms: 26,
  },
  GB: {
    code: "EN_1991_1_4",
    label: "Indicative UK BS EN 1991-1-4 vb map (22-26 m/s by zone)",
    v_ms: 23,
  },
  DE: {
    code: "EN_1991_1_4",
    label: "Indicative DIN EN 1991-1-4 Zone W2 vb (varies W1-W4)",
    v_ms: 25,
  },
  NL: {
    code: "EN_1991_1_4",
    label: "Indicative NEN EN 1991-1-4 vb (24-26 m/s coastal inland)",
    v_ms: 25,
  },
  FR: {
    code: "EN_1991_1_4",
    label: "Indicative NF EN 1991-1-4 regions 1-4 (22-28 m/s)",
    v_ms: 24,
  },
  ES: {
    code: "EN_1991_1_4",
    label: "Indicative CTE DB AE-AE zones A-D",
    v_ms: 26,
  },
  IN: {
    code: "EN_1991_1_4",
    label: "Indicative IS 875 Part 3 50-yr basic (33-50 m/s zones)",
    v_ms: 39,
  },
  AU: {
    code: "EN_1991_1_4",
    label: "Indicative AS/NZS 1170.2 Region A-B non-cyclonic",
    v_ms: 38,
  },
  NZ: {
    code: "EN_1991_1_4",
    label: "Indicative NZS 1170.2 zones (32-45 m/s)",
    v_ms: 37,
  },
  NG: {
    code: "EN_1991_1_4",
    label: "Indicative Lagos/coastal value; confirm with structural engineer",
    v_ms: 30,
  },
  AE: {
    code: "EN_1991_1_4",
    label: "Indicative Dubai/Abu Dhabi; ASCE 7 or local code governs",
    v_ms: 35,
  },
  CN: {
    code: "EN_1991_1_4",
    label:
      "Indicative GB 50009-2012 10-min basic speed; regional pressure maps govern",
    v_ms: 28,
  },
  MX: {
    code: "ASCE_7_22",
    label: "Indicative CFE 3-s gust coastal value; regional isovels govern",
    v_ms: 34,
  },
  SA: {
    code: "ASCE_7_22",
    label: "Indicative SBC 301-18 3-s gust; regional maps govern",
    v_ms: 33,
  },
  JP: {
    code: "EN_1991_1_4",
    label:
      "Indicative AIJ Recommendations 10-min mean; typhoon-exposed coasts are higher",
    v_ms: 30,
  },
  GH: {
    code: "EN_1991_1_4",
    label: "Indicative coastal Ghana value; confirm with local maps",
    v_ms: 27,
  },
  KE: {
    code: "EN_1991_1_4",
    label: "Indicative uplands Kenya value; regional values vary",
    v_ms: 24,
  },
  ZA: {
    code: "EN_1991_1_4",
    label: "Indicative SANS 10160-3 value; coastal interiors differ",
    v_ms: 28,
  },
  ET: {
    code: "EN_1991_1_4",
    label: "Indicative highlands Ethiopia value; confirm locally",
    v_ms: 24,
  },
  EG: {
    code: "EN_1991_1_4",
    label: "Indicative ECP 201 value; coastal sites are higher",
    v_ms: 26,
  },
  TZ: {
    code: "EN_1991_1_4",
    label: "Indicative coastal Tanzania value; confirm locally",
    v_ms: 26,
  },
  CI: {
    code: "EN_1991_1_4",
    label: "Indicative coastal Cote d'Ivoire value; confirm locally",
    v_ms: 25,
  },
  BR: {
    code: "ASCE_7_22",
    label: "Indicative NBR 6123 3-s gust; regional isovels govern",
    v_ms: 33,
  },
  IT: {
    code: "EN_1991_1_4",
    label: "Indicative NTC 2018 zone value (22-30 m/s across zones)",
    v_ms: 25,
  },
  PL: {
    code: "EN_1991_1_4",
    label: "Indicative PN-EN 1991-1-4 zone value (24-26 m/s)",
    v_ms: 24,
  },
  SE: {
    code: "EN_1991_1_4",
    label: "Indicative EKS zone value (22-26 m/s)",
    v_ms: 24,
  },
  CH: {
    code: "EN_1991_1_4",
    label: "Indicative SIA 261 zone value; valley winds are higher",
    v_ms: 26,
  },
  ID: {
    code: "ASCE_7_22",
    label: "Indicative SNI 1727 3-s gust; cyclone-prone regions are higher",
    v_ms: 28,
  },
  KR: {
    code: "ASCE_7_22",
    label: "Indicative KBC 2016 3-s gust; typhoon coasts are higher",
    v_ms: 30,
  },
  SG: {
    code: "EN_1991_1_4",
    label: "Indicative SS EN 1991-1-4 Singapore annex value",
    v_ms: 25,
  },
  TR: {
    code: "EN_1991_1_4",
    label: "Indicative TS EN 1991-1-4 zone value; regional winds vary",
    v_ms: 28,
  },
};
