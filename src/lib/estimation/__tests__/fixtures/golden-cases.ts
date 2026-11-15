/**
 * Registry of the golden benchmark cases.
 *
 * Each entry states what the case is measured against, so a real Bill of
 * Quantities or site receipt can replace the placeholder provenance without
 * touching test logic. The numbers themselves live in the benchmark suite; this
 * file is the index and the tolerance contract.
 */

/** Every golden case must agree with its source within this band. */
export const GOLDEN_TOLERANCE_PERCENT = 5;

export type GoldenEvidence =
  "embedded_takeoff" | "site_receipt" | "quantity_surveyor_boq";

export interface GoldenCase {
  id: string;
  trade: string;
  market: string;
  /** One line describing the physical job being priced. */
  scenario: string;
  evidence: GoldenEvidence;
  /** Where the number came from, in enough detail to re-check it. */
  source: string;
  /** Empty until an external receipt or BOQ has been attached. */
  verifiedBy: string | null;
  recordedOn: string;
  tolerancePercent: number;
}

const caseEntry = (
  id: string,
  trade: string,
  scenario: string,
  overrides: Partial<GoldenCase> = {},
): GoldenCase => ({
  id,
  trade,
  market: "NG",
  scenario,
  evidence: "embedded_takeoff",
  source: "FRELUX benchmark suite, commit 79fafecb",
  verifiedBy: null,
  recordedOn: "2026-11-14",
  tolerancePercent: GOLDEN_TOLERANCE_PERCENT,
  ...overrides,
});

export const GOLDEN_CASES: readonly GoldenCase[] = Object.freeze([
  caseEntry(
    "fence-full-plot-9in",
    "fence_blockwork",
    "100 ft x 50 ft perimeter fence, 10 coaches of 9 inch sandcrete blocks",
  ),
  caseEntry(
    "fence-half-plot-6in",
    "fence_blockwork",
    "50 ft x 50 ft fence, 8 coaches of 6 inch blocks",
  ),
  caseEntry(
    "german-floor-120",
    "concrete_slab",
    "120 m2 German floor slab at 150 mm",
  ),
  caseEntry(
    "shop-slab-48",
    "concrete_slab",
    "48 m2 shop slab, 100 mm concrete over hardcore",
  ),
  caseEntry(
    "plaster-bedroom-4x35x3",
    "plastering",
    "4 m x 3.5 m x 3 m bedroom, 12 mm plaster at 1:5",
  ),
  caseEntry(
    "render-external-145",
    "rendering",
    "145 m2 external rendering at 20 mm, 1:4 mix",
  ),
  caseEntry(
    "pop-ceiling-4x5",
    "pop_ceiling",
    "4 m x 5 m suspended POP ceiling",
  ),
  caseEntry(
    "tile-hall-48-straight",
    "tiling",
    "48 m2 floor tiling, 600 x 600 mm straight grid",
  ),
  caseEntry(
    "tile-bathroom-diagonal",
    "tiling",
    "bathroom floor, diagonal pattern with 14 percent waste",
  ),
  caseEntry(
    "blockwork-internal-partition",
    "blockwork",
    "internal partition in 6 inch blocks",
  ),
  caseEntry(
    "concrete-column-pad",
    "concrete_structure",
    "reinforced pad footing and column concrete takeoff",
  ),
  caseEntry(
    "roofing-sheet-cover",
    "roofing",
    "roof sheet coverage with side and end laps",
  ),
]);
