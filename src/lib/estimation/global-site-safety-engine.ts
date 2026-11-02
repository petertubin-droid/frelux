/**
 * Planning-only site safety inventory arithmetic.
 * These defaults are user-adjustable planning inputs, not statutory thresholds,
 * compliance findings, or a substitute for a competent person's risk assessment.
 */
export type SafetyFramework = "OSHA_US" | "UK_HSE_CDM" | "INTERNATIONAL_ISO";

export const SAFETY_FRAMEWORKS: Record<
  SafetyFramework,
  {
    name: string;
    jurisdiction: string;
    references: string[];
    signColorReference: string;
    fallProtectionNote: string;
  }
> = {
  OSHA_US: {
    name: "United States · OSHA construction",
    jurisdiction: "United States (federal OSHA; state plans may differ)",
    references: ["29 CFR 1926 Subpart M", "29 CFR 1926.50", "29 CFR 1926.200"],
    signColorReference:
      "Use applicable OSHA requirements and ANSI Z535 where adopted or specified; verify locally.",
    fallProtectionNote:
      "OSHA construction fall protection depends on task and conditions. The 6 ft rule applies to specified situations in 29 CFR 1926.501, not as a universal building-height trigger.",
  },
  UK_HSE_CDM: {
    name: "United Kingdom · HSE / CDM",
    jurisdiction: "United Kingdom",
    references: [
      "Construction (Design and Management) Regulations 2015",
      "Work at Height Regulations 2005",
      "Health and Safety (Safety Signs and Signals) Regulations 1996",
    ],
    signColorReference:
      "Follow applicable UK safety-sign rules and the current adopted sign standards; check site-specific duties.",
    fallProtectionNote:
      "UK work-at-height duties apply where a fall could cause injury. Plan, assess and select controls by risk; 2 m is not a universal trigger.",
  },
  INTERNATIONAL_ISO: {
    name: "International · ISO 7010 reference",
    jurisdiction: "International reference; local adoption must be confirmed",
    references: [
      "ISO 7010 safety sign symbols",
      "ISO 3864 safety sign design principles",
    ],
    signColorReference:
      "ISO 7010 defines registered safety signs; local law and adoption determine what is required.",
    fallProtectionNote:
      "No single international work-at-height threshold is assumed. Apply the governing local law and task risk assessment.",
  },
};

export interface SiteSafetyInput {
  framework: SafetyFramework;
  perimeterMeters: number;
  crewCount: number;
  reservePpe: number;
  signSpacingMeters: number;
  workersAtHeight: number;
  hasFallRisk: boolean;
  hasExcavation: boolean;
  excavationPerimeterMeters: number;
  tapeLines: number;
  excavationSignCount: number;
  hasHotWork: boolean;
  firstAidWorkersPerKit: number;
  fireExtinguisherCount: number;
}

export interface SiteSafetyResult {
  framework: (typeof SAFETY_FRAMEWORKS)[SafetyFramework];
  perimeterSigns: number;
  hardHats: number;
  highVisibilityVests: number;
  safetyBootPairs: number;
  fallProtectionUsers: number;
  excavationTapeMeters: number;
  excavationSigns: number;
  firstAidKits: number;
  fireExtinguishers: number;
}

const safeNonNegative = (n: number) =>
  Number.isFinite(n) ? Math.max(0, n) : 0;

export function calculateSiteSafety(input: SiteSafetyInput): SiteSafetyResult {
  const crew = Math.ceil(safeNonNegative(input.crewCount));
  const reserve = Math.ceil(safeNonNegative(input.reservePpe));
  const spacing = Math.max(0.1, safeNonNegative(input.signSpacingMeters));
  const perimeter = safeNonNegative(input.perimeterMeters);
  const excavationPerimeter = safeNonNegative(input.excavationPerimeterMeters);
  const workersAtHeight = Math.min(
    crew,
    Math.ceil(safeNonNegative(input.workersAtHeight)),
  );
  const workersPerKit = Math.max(
    1,
    Math.floor(safeNonNegative(input.firstAidWorkersPerKit)),
  );

  return {
    framework:
      SAFETY_FRAMEWORKS[input.framework] ?? SAFETY_FRAMEWORKS.INTERNATIONAL_ISO,
    perimeterSigns: perimeter > 0 ? Math.ceil(perimeter / spacing) : 0,
    hardHats: crew + reserve,
    highVisibilityVests: crew + reserve,
    safetyBootPairs: crew,
    fallProtectionUsers: input.hasFallRisk ? workersAtHeight : 0,
    excavationTapeMeters: input.hasExcavation
      ? Math.ceil(excavationPerimeter * Math.max(1, input.tapeLines))
      : 0,
    excavationSigns: input.hasExcavation
      ? Math.ceil(safeNonNegative(input.excavationSignCount))
      : 0,
    firstAidKits: crew > 0 ? Math.ceil(crew / workersPerKit) : 0,
    fireExtinguishers: input.hasHotWork
      ? Math.ceil(safeNonNegative(input.fireExtinguisherCount))
      : 0,
  };
}
