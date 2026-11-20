// =========================================================
// Four-view envelope: stitching four rectified elevations into one building
//
// Stage 2 of the 4-view generator. Every number here comes from the measured
// elevations, one known reference length and trigonometry; nothing is inferred
// from the photograph. Two photographs of the same wall can disagree by a few
// millimetres because perspective rectification is never perfect, so the
// disagreement is averaged and logged rather than hidden.
// =========================================================

export type ViewId = "front" | "back" | "left" | "right";

export const VIEW_ORDER: ViewId[] = ["front", "back", "left", "right"];

export const VIEW_LABELS: Record<ViewId, string> = {
  front: "Front",
  back: "Back",
  left: "Left",
  right: "Right",
};

export interface Opening {
  kind: "window" | "door";
  widthMm: number;
  heightMm: number;
  /** How many identical openings this elevation has. Defaults to 1. */
  count?: number;
}

export interface ElevationMeasurement {
  view: ViewId;
  /** Rectified wall width in millimetres. */
  widthMm: number;
  /** Wall height from ground to the eave line, in millimetres. */
  eaveHeightMm: number;
  /** Ridge height above the eave, in millimetres. Gable views only. */
  roofRiseMm?: number | null;
  openings?: Opening[];
}

export interface EnvelopeOptions {
  /** Allowed disagreement between the two views of one dimension, in percent. */
  tolerancePct?: number;
}

export interface DimensionCheck {
  pair: "width" | "depth";
  firstMm: number;
  secondMm: number;
  reconciledMm: number;
  differenceMm: number;
  differencePct: number;
  withinTolerance: boolean;
}

export interface ViewResult {
  view: ViewId;
  widthMm: number;
  eaveHeightMm: number;
  grossWallAreaM2: number;
  openingAreaM2: number;
  netWallAreaM2: number;
  openingCount: number;
}

export interface EnvelopeResult {
  widthMm: number;
  depthMm: number;
  eaveHeightMm: number;
  footprintAreaM2: number;
  perimeterM: number;
  grossWallAreaM2: number;
  openingAreaM2: number;
  netWallAreaM2: number;
  roofRiseMm: number | null;
  roofPitchDeg: number;
  roofSlopeFactor: number;
  trueRoofAreaM2: number;
  views: ViewResult[];
  checks: DimensionCheck[];
  audit: string[];
  warnings: string[];
}

export type EnvelopeOutcome =
  { ok: true; envelope: EnvelopeResult } | { ok: false; errors: string[] };

const MM2_PER_M2 = 1_000_000;

function round(value: number, decimals = 3): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function openingAreaMm2(opening: Opening): number {
  const count =
    Number.isFinite(opening.count) && (opening.count as number) > 0
      ? Math.floor(opening.count as number)
      : 1;
  if (
    !Number.isFinite(opening.widthMm) ||
    !Number.isFinite(opening.heightMm) ||
    opening.widthMm <= 0 ||
    opening.heightMm <= 0
  ) {
    return 0;
  }
  return opening.widthMm * opening.heightMm * count;
}

/** Average two views of the same dimension and record how far apart they were. */
export function reconcileDimension(
  pair: DimensionCheck["pair"],
  firstMm: number,
  secondMm: number,
  tolerancePct: number,
): DimensionCheck {
  const reconciledMm = (firstMm + secondMm) / 2;
  const differenceMm = Math.abs(firstMm - secondMm);
  const differencePct =
    reconciledMm > 0 ? (differenceMm / reconciledMm) * 100 : 0;
  return {
    pair,
    firstMm: round(firstMm, 1),
    secondMm: round(secondMm, 1),
    reconciledMm: round(reconciledMm, 1),
    differenceMm: round(differenceMm, 1),
    differencePct: round(differencePct, 3),
    withinTolerance: differencePct <= tolerancePct,
  };
}

/**
 * Build the envelope from four measured elevations.
 *
 * The roof is treated as a symmetric gable spanning the depth: the run is half
 * the depth, the pitch is atan(rise / run), and the true sloped area is the
 * footprint divided by cos(pitch). Without a measured rise the roof is reported
 * as flat and the visitor is told so, rather than a pitch being invented.
 */
export function buildEnvelope(
  elevations: readonly ElevationMeasurement[],
  options: EnvelopeOptions = {},
): EnvelopeOutcome {
  const tolerancePct =
    Number.isFinite(options.tolerancePct) &&
    (options.tolerancePct as number) > 0
      ? (options.tolerancePct as number)
      : 2;

  const errors: string[] = [];
  const warnings: string[] = [];
  const audit: string[] = [];

  const byView = new Map<ViewId, ElevationMeasurement>();
  for (const elevation of elevations) {
    if (!VIEW_ORDER.includes(elevation.view)) {
      errors.push(`Unknown view "${elevation.view}".`);
      continue;
    }
    if (byView.has(elevation.view)) {
      errors.push(`${VIEW_LABELS[elevation.view]} is measured twice.`);
      continue;
    }
    if (!Number.isFinite(elevation.widthMm) || elevation.widthMm <= 0) {
      errors.push(`${VIEW_LABELS[elevation.view]} width must be positive.`);
    }
    if (
      !Number.isFinite(elevation.eaveHeightMm) ||
      elevation.eaveHeightMm <= 0
    ) {
      errors.push(
        `${VIEW_LABELS[elevation.view]} eave height must be positive.`,
      );
    }
    byView.set(elevation.view, elevation);
  }

  for (const view of VIEW_ORDER) {
    if (!byView.has(view)) errors.push(`${VIEW_LABELS[view]} is not measured.`);
  }
  if (errors.length > 0) return { ok: false, errors };

  const front = byView.get("front")!;
  const back = byView.get("back")!;
  const left = byView.get("left")!;
  const right = byView.get("right")!;

  const widthCheck = reconcileDimension(
    "width",
    front.widthMm,
    back.widthMm,
    tolerancePct,
  );
  const depthCheck = reconcileDimension(
    "depth",
    left.widthMm,
    right.widthMm,
    tolerancePct,
  );

  for (const check of [widthCheck, depthCheck]) {
    audit.push(
      `${check.pair === "width" ? "Front and back" : "Left and right"} measure ${check.firstMm} mm and ${check.secondMm} mm; reconciled to ${check.reconciledMm} mm (${check.differencePct}% apart).`,
    );
    if (!check.withinTolerance) {
      warnings.push(
        `${check.pair === "width" ? "Front and back widths" : "Left and right depths"} differ by ${check.differencePct}%, beyond the ${tolerancePct}% photo tolerance. Check the corner handles and the reference length before ordering.`,
      );
    }
  }

  const widthMm = widthCheck.reconciledMm;
  const depthMm = depthCheck.reconciledMm;
  const eaveHeightMm = round(
    (front.eaveHeightMm +
      back.eaveHeightMm +
      left.eaveHeightMm +
      right.eaveHeightMm) /
      4,
    1,
  );

  const views: ViewResult[] = [];
  let grossWallAreaMm2 = 0;
  let openingAreaMm2Total = 0;
  for (const view of VIEW_ORDER) {
    const elevation = byView.get(view)!;
    const openings = elevation.openings ?? [];
    const openingArea = openings.reduce(
      (sum, opening) => sum + openingAreaMm2(opening),
      0,
    );
    const gross = elevation.widthMm * elevation.eaveHeightMm;
    const net = Math.max(gross - openingArea, 0);
    if (openingArea > gross) {
      warnings.push(
        `${VIEW_LABELS[view]} openings (${round(openingArea / MM2_PER_M2, 2)} m²) exceed the wall (${round(gross / MM2_PER_M2, 2)} m²).`,
      );
    }
    grossWallAreaMm2 += gross;
    openingAreaMm2Total += openingArea;
    views.push({
      view,
      widthMm: round(elevation.widthMm, 1),
      eaveHeightMm: round(elevation.eaveHeightMm, 1),
      grossWallAreaM2: round(gross / MM2_PER_M2, 3),
      openingAreaM2: round(openingArea / MM2_PER_M2, 3),
      netWallAreaM2: round(net / MM2_PER_M2, 3),
      openingCount: openings.reduce(
        (count, opening) =>
          count +
          (Number.isFinite(opening.count) && (opening.count as number) > 0
            ? Math.floor(opening.count as number)
            : 1),
        0,
      ),
    });
    audit.push(
      `${VIEW_LABELS[view]}: ${round(elevation.widthMm, 1)} x ${round(elevation.eaveHeightMm, 1)} mm gross ${round(gross / MM2_PER_M2, 3)} m², less ${round(openingArea / MM2_PER_M2, 3)} m² of openings = ${round(net / MM2_PER_M2, 3)} m² net.`,
    );
  }

  const footprintAreaM2 = round((widthMm * depthMm) / MM2_PER_M2, 3);
  const perimeterM = round((2 * (widthMm + depthMm)) / 1000, 3);
  audit.push(
    `Footprint ${round(widthMm / 1000, 3)} m x ${round(depthMm / 1000, 3)} m = ${footprintAreaM2} m², perimeter ${perimeterM} m.`,
  );

  const rises = [left.roofRiseMm, right.roofRiseMm].filter(
    (rise): rise is number => Number.isFinite(rise) && (rise as number) > 0,
  );
  const roofRiseMm =
    rises.length > 0
      ? round(rises.reduce((a, b) => a + b, 0) / rises.length, 1)
      : null;

  let roofPitchDeg = 0;
  let roofSlopeFactor = 1;
  // Kept unrounded: the sloped area is computed from the exact angle.
  let pitchRad: number | null = null;
  if (roofRiseMm === null) {
    warnings.push(
      "No roof rise was measured on the left or right elevation, so the roof is reported as flat. Mark the ridge peak to get the true sloped area.",
    );
    audit.push(
      `No rise supplied: roof area taken as the footprint, ${footprintAreaM2} m².`,
    );
  } else {
    const runMm = depthMm / 2;
    if (runMm <= 0) {
      warnings.push("Depth is zero, so no roof pitch can be computed.");
    } else {
      pitchRad = Math.atan2(roofRiseMm, runMm);
      roofPitchDeg = round((pitchRad * 180) / Math.PI, 2);
      roofSlopeFactor = round(1 / Math.cos(pitchRad), 6);
      audit.push(
        `Rise ${roofRiseMm} mm over a half-depth run of ${round(runMm, 1)} mm gives a pitch of ${roofPitchDeg}° and a slope factor of ${roofSlopeFactor}.`,
      );
    }
  }

  // Computed from the exact angle, then reported to three decimals: rounding
  // the pitch or the slope factor first moves a large roof by centimetres.
  const trueRoofAreaM2 = round(footprintAreaM2 / Math.cos(pitchRad ?? 0), 3);
  audit.push(
    `True roof area = footprint ${footprintAreaM2} m² / cos(${roofPitchDeg}°) = ${trueRoofAreaM2} m².`,
  );

  return {
    ok: true,
    envelope: {
      widthMm,
      depthMm,
      eaveHeightMm,
      footprintAreaM2,
      perimeterM,
      grossWallAreaM2: round(grossWallAreaMm2 / MM2_PER_M2, 3),
      openingAreaM2: round(openingAreaMm2Total / MM2_PER_M2, 3),
      netWallAreaM2: round(
        Math.max(grossWallAreaMm2 - openingAreaMm2Total, 0) / MM2_PER_M2,
        3,
      ),
      roofRiseMm,
      roofPitchDeg,
      roofSlopeFactor,
      trueRoofAreaM2,
      views,
      checks: [widthCheck, depthCheck],
      audit,
      warnings,
    },
  };
}
