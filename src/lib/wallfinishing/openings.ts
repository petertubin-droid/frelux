// =========================================================
// FRELUX Wall Finishing — openings engine.
//
// Openings (doors, windows, archways, vents, custom) deduct
// from the gross wall area; reveals/returns add finishing area
// back. Every step is exposed for calculation transparency.
// =========================================================

import type { CalcStep, OpeningInput } from "@/types/wallfinishing";

export interface OpeningAreaResult {
  openingAreaM2: number;
  revealAreaM2: number;
  steps: CalcStep[];
  warnings: string[];
}

/** Perimeter of a rectangular opening, in metres. */
function perimeter(opening: OpeningInput): number {
  return 2 * (opening.widthM + opening.heightM);
}

export function calculateOpeningAreas(
  openings: OpeningInput[],
): OpeningAreaResult {
  const steps: CalcStep[] = [];
  const warnings: string[] = [];
  let openingAreaM2 = 0;
  let revealAreaM2 = 0;

  for (const o of openings) {
    const eachArea = o.widthM * o.heightM;
    if (!Number.isFinite(eachArea) || eachArea < 0) {
      warnings.push(
        `Opening '${o.type}' has invalid dimensions — skipped instead of guessed.`,
      );
      continue;
    }
    const totalArea = eachArea * Math.max(1, Math.floor(o.quantity) || 1);
    if (o.deduct) {
      openingAreaM2 += totalArea;
      steps.push({
        label: `Deduct ${o.type}`,
        detail: `${o.quantity} × (${o.widthM} m × ${o.heightM} m) = ${round(totalArea, 3)} m²`,
        formula: `${o.quantity} × ${o.widthM} × ${o.heightM} = ${round(totalArea, 3)} m²`,
      });
    }
    if (o.revealDepthM > 0) {
      const reveal =
        perimeter(o) *
        o.revealDepthM *
        Math.max(1, Math.floor(o.quantity) || 1);
      revealAreaM2 += reveal;
      steps.push({
        label: `Add ${o.type} reveals/returns`,
        detail:
          `Perimeter ${round(perimeter(o), 2)} m × reveal ${o.revealDepthM} m × ${o.quantity}` +
          ` = ${round(reveal, 3)} m² (reveals also get finished)`,
      });
    }
  }

  return { openingAreaM2, revealAreaM2, steps, warnings };
}

export function validateOpening(o: OpeningInput): string | null {
  if (o.widthM <= 0 || o.heightM <= 0)
    return "Opening dimensions must be positive.";
  if (o.quantity < 1) return "Opening quantity must be at least 1.";
  if (o.revealDepthM < 0) return "Reveal depth cannot be negative.";
  return null;
}

function round(v: number, d: number): number {
  const f = Math.pow(10, d);
  return Math.round(v * f) / f;
}
