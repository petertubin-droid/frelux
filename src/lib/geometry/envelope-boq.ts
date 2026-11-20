// =========================================================
// Envelope -> BOQ
//
// The 4-view generator measures; it does not price. This module turns a
// reconciled envelope into the pay quantities a BOQ actually carries, and
// deliberately carries no rate: the BOQ contract in src/lib/boq/imports.ts says
// a line is only trustworthy when its quantity came from a calculator that
// validated it, and a rate is never invented. So every line here arrives
// unpriced, and the compiler reports that on export.
//
// Descriptions are written so the existing keyword router files each line in
// the right section: "Blockwork" -> 07, "Concrete floor slab" -> 05,
// "Foundation" -> 04, "Roof covering" -> 08. The word "external" is avoided on
// purpose: the router reads it as External Works (18).
// =========================================================

import type { EnvelopeResult } from "./envelope";

export interface EnvelopeBoqLine {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  /** Always null: this tool measures, it does not price. */
  estimated_price: null;
}

export interface EnvelopeBoqBuild {
  lines: EnvelopeBoqLine[];
  /** What was measured and what was left out, in plain sentences. */
  notes: string[];
  /** Totals the visitor can check against the results panel. */
  totals: {
    netWallAreaM2: number;
    footprintAreaM2: number;
    trueRoofAreaM2: number;
    perimeterM: number;
    openingCount: number;
    openingAreaM2: number;
  };
}

function round(value: number, decimals = 3): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Build the measured BOQ lines for one envelope.
 *
 * Quantities are the reconciled envelope's own numbers, rounded to three
 * decimals for display only; nothing is re-derived and nothing is padded.
 * A zero quantity is dropped rather than emitted as a line of nothing.
 */
export function buildEnvelopeBoqLines(
  envelope: EnvelopeResult,
): EnvelopeBoqBuild {
  const openingCount = envelope.views.reduce(
    (sum, view) => sum + view.openingCount,
    0,
  );

  const candidates: EnvelopeBoqLine[] = [
    {
      name: "Blockwork to walls, net area (openings deducted)",
      category: "walls",
      quantity: round(envelope.netWallAreaM2),
      unit: "m²",
      estimated_price: null,
    },
    {
      name: "Concrete floor slab, footprint area",
      category: "floor",
      quantity: round(envelope.footprintAreaM2),
      unit: "m²",
      estimated_price: null,
    },
    {
      name: "Foundation trench and footing, wall perimeter length",
      category: "foundation",
      quantity: round(envelope.perimeterM),
      unit: "m",
      estimated_price: null,
    },
    {
      name: "Damp proof course, wall perimeter length",
      category: "walls",
      quantity: round(envelope.perimeterM),
      unit: "m",
      estimated_price: null,
    },
    {
      name: "Roof covering, true sloped area",
      category: "roof",
      quantity: round(envelope.trueRoofAreaM2),
      unit: "m²",
      estimated_price: null,
    },
  ];

  const lines = candidates.filter((line) => line.quantity > 0);

  const notes = [
    "Quantities come from the reconciled envelope and are carried to the BOQ unpriced: this tool measures, it does not price, so the rate columns arrive blank for the buyer or quantity surveyor to fill.",
  ];
  if (openingCount > 0) {
    notes.push(
      `${openingCount} opening${openingCount === 1 ? "" : "s"} (${round(envelope.openingAreaM2, 2)} m²) are deducted from the wall area, not listed as a separate item, so they are never paid twice.`,
    );
  }
  if (envelope.roofRiseMm === null) {
    notes.push(
      "No roof rise was measured, so the roof area is the plan footprint and no pitch is claimed. Measure the ridge to get the true sloped area.",
    );
  }

  return {
    lines,
    notes,
    totals: {
      netWallAreaM2: round(envelope.netWallAreaM2),
      footprintAreaM2: round(envelope.footprintAreaM2),
      trueRoofAreaM2: round(envelope.trueRoofAreaM2),
      perimeterM: round(envelope.perimeterM),
      openingCount,
      openingAreaM2: round(envelope.openingAreaM2),
    },
  };
}

/**
 * The record a project save needs.
 *
 * `calculator_type` stays "cost" because project_calculations constrains it to
 * a fixed set and this tool is a measured cost basis; the slug is what the BOQ
 * importer routes on, and "four-view-envelope" is registered for it.
 */
export function toEnvelopeCalculationInput(
  envelope: EnvelopeResult,
  options: { projectId: string; title?: string },
) {
  const build = buildEnvelopeBoqLines(envelope);
  return {
    project_id: options.projectId,
    calculator_type: "cost" as const,
    calculator_slug: "four-view-envelope",
    calc_title: options.title?.trim() || "4-View envelope takeoff",
    calc_data: {
      widthMm: envelope.widthMm,
      depthMm: envelope.depthMm,
      eaveHeightMm: envelope.eaveHeightMm,
      roofRiseMm: envelope.roofRiseMm,
      roofPitchDeg: envelope.roofPitchDeg,
      roofSlopeFactor: envelope.roofSlopeFactor,
      checks: envelope.checks,
      audit: envelope.audit,
      warnings: envelope.warnings,
      boq_notes: build.notes,
    },
    result_summary: {
      footprint_m2: build.totals.footprintAreaM2,
      net_wall_area_m2: build.totals.netWallAreaM2,
      roof_area_m2: build.totals.trueRoofAreaM2,
      roof_pitch_deg: envelope.roofPitchDeg,
      perimeter_m: build.totals.perimeterM,
      opening_count: build.totals.openingCount,
    },
    materials: build.lines,
  };
}
