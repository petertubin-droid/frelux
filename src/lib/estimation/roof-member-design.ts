/**
 * Preliminary elastic check for a single, simply-supported roof member under
 * a uniform vertical design load. This is deliberately code-agnostic: loads,
 * section properties and resistances must be supplied from an independently
 * reviewed, market-appropriate design basis. It is not a code-compliance check.
 */
export interface RoofMemberCheckInput {
  spanM: number;
  spacingM: number;
  /** Total downward design area load, including member self-weight, kN/m². */
  designAreaLoadKNM2: number;
  /** Elastic section modulus about the bending axis, mm³. */
  sectionModulusMM3: number;
  /** Second moment of area about the bending axis, mm⁴. */
  secondMomentMM4: number;
  /** Effective shear area for the applied shear direction, mm². */
  shearAreaMM2: number;
  /** Elastic modulus, GPa. */
  elasticModulusGPa: number;
  /** User-supplied design bending resistance, MPa. */
  bendingResistanceMPa: number;
  /** User-supplied design shear resistance, MPa. */
  shearResistanceMPa: number;
  /** Deflection limit ratio, e.g. 200 means span/200. */
  maxDeflectionRatio: number;
}

export interface RoofMemberCheckResult {
  lineLoadKNM: number;
  supportReactionKN: number;
  maxMomentKNM: number;
  maxShearKN: number;
  bendingStressMPa: number;
  bendingUtilization: number;
  shearStressMPa: number;
  shearUtilization: number;
  deflectionMM: number;
  deflectionLimitMM: number;
  deflectionUtilization: number;
  passesEnteredChecks: boolean;
  model: "single-span simply-supported member with uniform vertical load";
  exclusions: string[];
}

export type RoofMemberCheckResponse = {
  data: RoofMemberCheckResult | null;
  errors: string[];
};

const positiveValues: Array<[keyof RoofMemberCheckInput, string]> = [
  ["spanM", "Clear span"],
  ["spacingM", "Tributary spacing"],
  ["designAreaLoadKNM2", "Total downward design area load"],
  ["sectionModulusMM3", "Section modulus"],
  ["secondMomentMM4", "Second moment of area"],
  ["shearAreaMM2", "Effective shear area"],
  ["elasticModulusGPa", "Elastic modulus"],
  ["bendingResistanceMPa", "Design bending resistance"],
  ["shearResistanceMPa", "Design shear resistance"],
  ["maxDeflectionRatio", "Deflection limit ratio"],
];

export function checkRoofMember(
  input: RoofMemberCheckInput,
): RoofMemberCheckResponse {
  const errors = positiveValues
    .filter(([key]) => !Number.isFinite(input[key]) || input[key] <= 0)
    .map(([, label]) => `${label} must be greater than zero.`);
  if (errors.length) return { data: null, errors };

  const lineLoadKNM = input.designAreaLoadKNM2 * input.spacingM;
  const supportReactionKN = (lineLoadKNM * input.spanM) / 2;
  const maxMomentKNM = (lineLoadKNM * input.spanM ** 2) / 8;
  const maxShearKN = supportReactionKN;
  // 1 kN·m = 1,000,000 N·mm; 1 MPa = 1 N/mm².
  const bendingStressMPa = (maxMomentKNM * 1_000_000) / input.sectionModulusMM3;
  const bendingUtilization = bendingStressMPa / input.bendingResistanceMPa;
  const shearStressMPa = (maxShearKN * 1_000) / input.shearAreaMM2;
  const shearUtilization = shearStressMPa / input.shearResistanceMPa;
  // Numerically, 1 kN/m = 1 N/mm and 1 GPa = 1,000 N/mm².
  const spanMM = input.spanM * 1_000;
  const deflectionMM =
    (5 * lineLoadKNM * spanMM ** 4) /
    (384 * input.elasticModulusGPa * 1_000 * input.secondMomentMM4);
  const deflectionLimitMM = spanMM / input.maxDeflectionRatio;
  const deflectionUtilization = deflectionMM / deflectionLimitMM;
  const passesEnteredChecks =
    bendingUtilization <= 1 &&
    shearUtilization <= 1 &&
    deflectionUtilization <= 1;

  return {
    data: {
      lineLoadKNM,
      supportReactionKN,
      maxMomentKNM,
      maxShearKN,
      bendingStressMPa,
      bendingUtilization,
      shearStressMPa,
      shearUtilization,
      deflectionMM,
      deflectionLimitMM,
      deflectionUtilization,
      passesEnteredChecks,
      model: "single-span simply-supported member with uniform vertical load",
      exclusions: [
        "No jurisdictional code, load factors, load combinations, or material grades are applied.",
        "No wind uplift, lateral-torsional buckling, local buckling, bearing, connections, vibration, cantilevers, or multi-span behavior is checked.",
        "Results are preliminary checks against the values you entered, not a construction-ready design or compliance certificate.",
      ],
    },
    errors: [],
  };
}
