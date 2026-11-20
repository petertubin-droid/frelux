// =========================================================
// One elevation, measured
//
// Stage 2 of the 4-view generator, per photograph: the four wall corners are
// rectified by a homography, one stated length sets the pixel-to-millimetre
// ratio, and the ridge and every opening travel through the same matrix. Kept
// apart from the page so the numbers can be tested without a canvas.
// =========================================================

import {
  applyHomography,
  applyHomographyToPolygon,
  rectifyingHomography,
} from "./homography";
import type { Point } from "./homography";
import type { ViewId } from "./envelope";
import {
  boundingBox,
  calibrateMillimetresPerPixel,
  distance,
  polygonArea,
} from "./polygon";

/** Working space for the rectified elevation. Arbitrary units, used only as
 * ratios, so the numbers do not depend on how large the photo is displayed. */
export const SPACE = 1000;

export interface OpeningRect {
  id: string;
  kind: "window" | "door";
  /** Normalised corners of the opening rectangle, in the photograph. */
  rect: { x: number; y: number; w: number; h: number };
}

export interface FaceState {
  image: string | null;
  /** Wall corners, normalised: top-left, top-right, bottom-right, bottom-left. */
  quad: Point[];
  /** Ridge peak, normalised, above the eave line. */
  ridge: Point | null;
  openings: OpeningRect[];
  referenceMode: "width" | "height";
  referenceMm: string;
}

const DEFAULT_QUAD: Point[] = [
  { x: 0.12, y: 0.2 },
  { x: 0.88, y: 0.2 },
  { x: 0.88, y: 0.85 },
  { x: 0.12, y: 0.85 },
];

export function emptyFace(): FaceState {
  return {
    image: null,
    quad: DEFAULT_QUAD.map((p) => ({ ...p })),
    ridge: null,
    openings: [],
    referenceMode: "width",
    referenceMm: "",
  };
}

export function initialFaces(): Record<ViewId, FaceState> {
  return {
    front: emptyFace(),
    back: emptyFace(),
    left: emptyFace(),
    right: emptyFace(),
  };
}

function toSpace(p: Point): Point {
  return { x: p.x * SPACE, y: p.y * SPACE };
}

export interface FaceGeometry {
  rectifiedWidthPx: number;
  rectifiedHeightPx: number;
  matrix: ReturnType<typeof rectifyingHomography>;
  millimetresPerPixel: number | null;
  widthMm: number | null;
  eaveHeightMm: number | null;
  roofRiseMm: number | null;
  openings: {
    kind: "window" | "door";
    widthMm: number;
    heightMm: number;
    offsetMm: number;
    areaMm2: number;
  }[];
  ready: boolean;
  problems: string[];
}

/** Everything measurable on one photograph, in millimetres. */
export function measureFace(face: FaceState): FaceGeometry {
  const quad = face.quad.map(toSpace);
  const widthPx = (distance(quad[0], quad[1]) + distance(quad[3], quad[2])) / 2;
  const heightPx =
    (distance(quad[0], quad[3]) + distance(quad[1], quad[2])) / 2;
  const matrix = rectifyingHomography(quad, widthPx, heightPx);

  const problems: string[] = [];
  if (!face.image) problems.push("No photograph loaded.");
  if (!matrix)
    problems.push("The four corners do not form a wall: move them apart.");

  const reference = Number(face.referenceMm);
  const referenceSpan = face.referenceMode === "width" ? widthPx : heightPx;
  const millimetresPerPixel =
    matrix && referenceSpan > 0
      ? calibrateMillimetresPerPixel(reference, referenceSpan)
      : null;
  if (matrix && millimetresPerPixel === null) {
    problems.push("State the known length in millimetres.");
  }

  const scale = millimetresPerPixel;
  const widthMm = scale === null ? null : widthPx * scale;
  const eaveHeightMm = scale === null ? null : heightPx * scale;

  let roofRiseMm: number | null = null;
  if (matrix && scale !== null && face.ridge) {
    const ridge = applyHomography(matrix, toSpace(face.ridge));
    // The eave line is y = 0 in the rectified elevation, so a ridge above it
    // has a negative y; its magnitude is the rise in pixels.
    if (ridge && ridge.y < 0) roofRiseMm = -ridge.y * scale;
  }

  const openings: FaceGeometry["openings"] = [];
  if (matrix && scale !== null) {
    for (const opening of face.openings) {
      const corners = [
        { x: opening.rect.x, y: opening.rect.y },
        { x: opening.rect.x + opening.rect.w, y: opening.rect.y },
        {
          x: opening.rect.x + opening.rect.w,
          y: opening.rect.y + opening.rect.h,
        },
        { x: opening.rect.x, y: opening.rect.y + opening.rect.h },
      ].map(toSpace);
      const mapped = applyHomographyToPolygon(matrix, corners);
      if (!mapped) continue;
      const bounds = boundingBox(mapped);
      if (!bounds) continue;
      openings.push({
        kind: opening.kind,
        widthMm: bounds.width * scale,
        heightMm: bounds.height * scale,
        offsetMm: Math.max(bounds.minX, 0) * scale,
        areaMm2: polygonArea(mapped) * scale * scale,
      });
    }
  }

  return {
    rectifiedWidthPx: widthPx,
    rectifiedHeightPx: heightPx,
    matrix,
    millimetresPerPixel: scale,
    widthMm,
    eaveHeightMm,
    roofRiseMm,
    openings,
    ready:
      !!face.image && !!matrix && widthMm !== null && eaveHeightMm !== null,
    problems,
  };
}
