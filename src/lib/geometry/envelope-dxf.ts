// =========================================================
// ASCII DXF export of the reconciled footprint
//
// A DXF of the envelope is the hand-off to CAD: the exterior perimeter as one
// closed LWPOLYLINE, the wall thickness as a second one, and each measured
// opening as a plan block on the wall it was measured on. Units are
// millimetres ($INSUNITS 4), which is what every CAD package expects from a
// building drawing.
// =========================================================

import type { ViewId } from "./envelope";

export interface DxfOpening {
  view: ViewId;
  kind: "window" | "door";
  widthMm: number;
  heightMm: number;
  /** Distance from the left end of that elevation to the opening's near edge. */
  offsetMm: number;
}

export interface EnvelopeDxfInput {
  widthMm: number;
  depthMm: number;
  /** Exterior wall thickness; the inner face is offset by this much. */
  wallThicknessMm?: number;
  openings?: DxfOpening[];
  /** Free-text note written into the drawing as a TEXT entity. */
  note?: string;
}

const LAYER_FOOTPRINT = "FRELUX-FOOTPRINT";
const LAYER_INNER = "FRELUX-INNER-FACE";
const LAYER_OPENINGS = "FRELUX-OPENINGS";
const LAYER_NOTES = "FRELUX-NOTES";

function pair(code: number, value: string | number): string {
  return `${code}\n${value}\n`;
}

function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function polyline(layer: string, points: [number, number][]): string {
  let out = pair(0, "LWPOLYLINE") + pair(8, layer) + pair(90, points.length);
  out += pair(70, 1); // closed
  for (const [x, y] of points) {
    out += pair(10, round(x)) + pair(20, round(y));
  }
  return out;
}

function line(
  layer: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): string {
  return (
    pair(0, "LINE") +
    pair(8, layer) +
    pair(10, round(x1)) +
    pair(20, round(y1)) +
    pair(30, 0) +
    pair(11, round(x2)) +
    pair(21, round(y2)) +
    pair(31, 0)
  );
}

function text(
  layer: string,
  x: number,
  y: number,
  height: number,
  value: string,
): string {
  return (
    pair(0, "TEXT") +
    pair(8, layer) +
    pair(10, round(x)) +
    pair(20, round(y)) +
    pair(30, 0) +
    pair(40, round(height, 0)) +
    pair(1, value)
  );
}

/** Where an opening sits in plan, given the wall it was measured on. */
function openingPlan(
  opening: DxfOpening,
  widthMm: number,
  depthMm: number,
): { x: number; y: number; horizontal: boolean } {
  const offset = Number.isFinite(opening.offsetMm) ? opening.offsetMm : 0;
  const span = Number.isFinite(opening.widthMm) ? opening.widthMm : 0;
  switch (opening.view) {
    case "front":
      return { x: offset, y: 0, horizontal: true };
    case "back":
      // Back elevations are read left-to-right from the far side, so the
      // offset mirrors onto the top edge.
      return { x: widthMm - offset - span, y: depthMm, horizontal: true };
    case "left":
      return { x: 0, y: offset, horizontal: false };
    case "right":
      return { x: widthMm, y: depthMm - offset - span, horizontal: false };
  }
}

/**
 * Build the DXF text. Invalid or missing dimensions throw rather than writing a
 * drawing that a CAD package would open as an empty or nonsensical plan.
 */
export function buildEnvelopeDxf(input: EnvelopeDxfInput): string {
  const { widthMm, depthMm } = input;
  if (!Number.isFinite(widthMm) || widthMm <= 0) {
    throw new Error(
      "Footprint width must be a positive length in millimetres.",
    );
  }
  if (!Number.isFinite(depthMm) || depthMm <= 0) {
    throw new Error(
      "Footprint depth must be a positive length in millimetres.",
    );
  }
  const thickness =
    Number.isFinite(input.wallThicknessMm) &&
    (input.wallThicknessMm as number) > 0
      ? Math.min(
          input.wallThicknessMm as number,
          Math.min(widthMm, depthMm) / 2,
        )
      : 230;

  const outer: [number, number][] = [
    [0, 0],
    [widthMm, 0],
    [widthMm, depthMm],
    [0, depthMm],
  ];
  const inner: [number, number][] = [
    [thickness, thickness],
    [widthMm - thickness, thickness],
    [widthMm - thickness, depthMm - thickness],
    [thickness, depthMm - thickness],
  ];

  let entities = polyline(LAYER_FOOTPRINT, outer);
  entities += polyline(LAYER_INNER, inner);

  for (const opening of input.openings ?? []) {
    const plan = openingPlan(opening, widthMm, depthMm);
    const half = thickness / 2;
    if (plan.horizontal) {
      const y = plan.y;
      entities += line(LAYER_OPENINGS, plan.x, y - half, plan.x, y + half);
      entities += line(
        LAYER_OPENINGS,
        plan.x + opening.widthMm,
        y - half,
        plan.x + opening.widthMm,
        y + half,
      );
      entities += text(
        LAYER_OPENINGS,
        plan.x,
        y + half * 2,
        120,
        `${opening.kind.toUpperCase()} ${Math.round(opening.widthMm)}x${Math.round(opening.heightMm)}`,
      );
    } else {
      const x = plan.x;
      entities += line(LAYER_OPENINGS, x - half, plan.y, x + half, plan.y);
      entities += line(
        LAYER_OPENINGS,
        x - half,
        plan.y + opening.widthMm,
        x + half,
        plan.y + opening.widthMm,
      );
      entities += text(
        LAYER_OPENINGS,
        x + half * 2,
        plan.y,
        120,
        `${opening.kind.toUpperCase()} ${Math.round(opening.widthMm)}x${Math.round(opening.heightMm)}`,
      );
    }
  }

  const note =
    input.note ??
    `FRELUX envelope ${round(widthMm / 1000, 3)} x ${round(depthMm / 1000, 3)} m`;
  entities += text(LAYER_NOTES, 0, -300, 150, note);

  return (
    pair(0, "SECTION") +
    pair(2, "HEADER") +
    pair(9, "$INSUNITS") +
    pair(70, 4) +
    pair(0, "ENDSEC") +
    pair(0, "SECTION") +
    pair(2, "ENTITIES") +
    entities +
    pair(0, "ENDSEC") +
    pair(0, "EOF")
  );
}

/** Suggested download name, stable for a given footprint. */
export function envelopeDxfFileName(widthMm: number, depthMm: number): string {
  const w = Math.round(widthMm) / 1000;
  const d = Math.round(depthMm) / 1000;
  return `frelux-envelope-${w}m-x-${d}m.dxf`;
}
