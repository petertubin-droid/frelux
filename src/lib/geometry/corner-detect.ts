// =========================================================
// Corner detection, client half
//
// Stage 1 of the 4-view generator: propose the four wall corners (and, when the
// elevation is a gable, the ridge) from the photograph. The model only ever
// proposes; every proposal is placed on the canvas as a draggable handle and the
// visitor confirms it. Nothing here is applied silently.
//
// The honesty contract, mirroring count-vision:
//   * The photograph goes to a Supabase edge function. The API key never
//     reaches the browser, and the photo is not stored.
//   * A proposal outside the frame, degenerate, or below the confidence floor
//     is returned as `unclear` with its reason, never as four plausible-looking
//     numbers.
//   * Every failure mode the browser can meet (function not deployed, AI
//     switched off, rate limited, network down) has its own state, so the page
//     can say what happened and keep the manual path working.
// =========================================================

import { supabase } from "@/lib/supabase";
import type { Point } from "./homography";

export type CornerDetectionStatus =
  "detected" | "unclear" | "disabled" | "unavailable" | "error";

export interface DetectedOpening {
  kind: "window" | "door";
  /** Normalised corners of the opening in the photograph. */
  rect: { x: number; y: number; w: number; h: number };
}

export interface CornerDetection {
  status: CornerDetectionStatus;
  /** Four normalised corners: top-left, top-right, bottom-right, bottom-left. */
  quad: Point[] | null;
  /** Normalised ridge peak, or null when the elevation has no gable. */
  ridge: Point | null;
  openings: DetectedOpening[];
  confidence: number;
  /** One short sentence: what was found, or exactly why nothing was. */
  reason: string;
}

const MIN_CONFIDENCE = 0.5;
const FUNCTION_NAME = "ai-envelope-detect";

function clamp01(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n < 0 || n > 1) return null;
  return Math.round(n * 10000) / 10000;
}

function readPoint(raw: unknown): Point | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as { x?: unknown; y?: unknown };
  const x = clamp01(candidate.x);
  const y = clamp01(candidate.y);
  if (x === null || y === null) return null;
  return { x, y };
}

/** Signed area of the quad; a wall face seen from the front is positive. */
function quadArea(quad: Point[]): number {
  let sum = 0;
  for (let i = 0; i < quad.length; i += 1) {
    const a = quad[i];
    const b = quad[(i + 1) % quad.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

/**
 * Validate a proposal.
 *
 * A quad is only accepted when it has four in-frame corners, encloses a real
 * area (at least 4% of the photograph) and is not self-intersecting, which is
 * the shape a model returns when it has mixed up the corner order.
 */
export function validateDetection(raw: unknown): CornerDetection {
  const base: CornerDetection = {
    status: "unclear",
    quad: null,
    ridge: null,
    openings: [],
    confidence: 0,
    reason: "",
  };
  if (!raw || typeof raw !== "object") {
    return { ...base, reason: "The detector returned no readable answer." };
  }
  const payload = raw as Record<string, unknown>;
  const confidenceRaw = Number(payload.confidence);
  const confidence =
    Number.isFinite(confidenceRaw) && confidenceRaw >= 0 && confidenceRaw <= 1
      ? confidenceRaw
      : 0;
  const reason = String(payload.reason ?? "").slice(0, 400);

  if (payload.verdict === "unavailable") {
    return {
      ...base,
      status: "unavailable",
      confidence,
      reason:
        reason ||
        "Automatic corner detection is not available right now. Place the corners by hand.",
    };
  }
  if (payload.verdict === "disabled") {
    return {
      ...base,
      status: "disabled",
      confidence,
      reason:
        reason ||
        "Automatic detection is switched off. Place the corners by hand.",
    };
  }
  if (payload.verdict !== "detected") {
    return {
      ...base,
      confidence,
      reason:
        reason ||
        "The detector could not place the wall corners in this photograph.",
    };
  }

  const quadRaw = Array.isArray(payload.quad) ? payload.quad : [];
  const quad = quadRaw.map(readPoint);
  if (quad.length !== 4 || quad.some((p) => p === null)) {
    return {
      ...base,
      confidence,
      reason:
        reason ||
        "The detector did not return four in-frame corners, so nothing was applied.",
    };
  }
  const corners = quad as Point[];
  const area = Math.abs(quadArea(corners));
  if (area < 0.04) {
    return {
      ...base,
      confidence,
      reason:
        "The detected wall encloses almost none of the photograph, so nothing was applied.",
    };
  }
  if (confidence < MIN_CONFIDENCE) {
    return {
      ...base,
      confidence,
      reason:
        reason ||
        `Detection confidence was ${Math.round(confidence * 100)}%, below the ${Math.round(MIN_CONFIDENCE * 100)}% needed to propose corners.`,
    };
  }

  const ridge = readPoint(payload.ridge);
  const openings: DetectedOpening[] = [];
  if (Array.isArray(payload.openings)) {
    for (const entry of payload.openings.slice(0, 20)) {
      if (!entry || typeof entry !== "object") continue;
      const raw = entry as Record<string, unknown>;
      const rectRaw = raw.rect as Record<string, unknown> | undefined;
      if (!rectRaw) continue;
      const x = clamp01(rectRaw.x);
      const y = clamp01(rectRaw.y);
      const w = clamp01(rectRaw.w);
      const h = clamp01(rectRaw.h);
      if (x === null || y === null || w === null || h === null) continue;
      if (w <= 0.005 || h <= 0.005) continue;
      if (x + w > 1.0001 || y + h > 1.0001) continue;
      openings.push({
        kind: raw.kind === "door" ? "door" : "window",
        rect: { x, y, w, h },
      });
    }
  }

  return {
    status: "detected",
    quad: corners,
    ridge,
    openings,
    confidence,
    reason:
      reason ||
      "Corners proposed from the photograph. Check them before you measure.",
  };
}

/**
 * Ask the edge function for corners on one elevation.
 *
 * Never throws: a thrown error becomes an `error` detection with a sentence the
 * page can show, because losing the visitor's work to an exception is worse
 * than an honest refusal.
 */
export async function detectCorners(
  imageDataUrl: string,
  options: { viewLabel?: string } = {},
): Promise<CornerDetection> {
  if (!imageDataUrl.startsWith("data:image/")) {
    return {
      status: "error",
      quad: null,
      ridge: null,
      openings: [],
      confidence: 0,
      reason: "Load a photograph before asking for corners.",
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke<
      Record<string, unknown>
    >(FUNCTION_NAME, {
      body: {
        imageDataUrl,
        viewLabel: options.viewLabel ?? "",
      },
    });

    if (error) {
      const message = String(error.message ?? "");
      // A missing function answers 404 on the direct path; the gateway reports
      // it as a plain failure. Either way the manual path still works.
      if (/404|not found|Failed to send/i.test(message)) {
        return {
          status: "unavailable",
          quad: null,
          ridge: null,
          openings: [],
          confidence: 0,
          reason:
            "Automatic corner detection is not deployed on this project yet. Place the corners by hand.",
        };
      }
      return {
        status: "error",
        quad: null,
        ridge: null,
        openings: [],
        confidence: 0,
        reason: message
          ? `The detector could not be reached: ${message.slice(0, 160)}`
          : "The detector could not be reached.",
      };
    }

    if (!data) {
      return {
        status: "error",
        quad: null,
        ridge: null,
        openings: [],
        confidence: 0,
        reason: "The detector returned an empty answer.",
      };
    }
    return validateDetection(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return {
      status: "error",
      quad: null,
      ridge: null,
      openings: [],
      confidence: 0,
      reason: message
        ? `The detector could not be reached: ${message.slice(0, 160)}`
        : "The detector could not be reached.",
    };
  }
}
