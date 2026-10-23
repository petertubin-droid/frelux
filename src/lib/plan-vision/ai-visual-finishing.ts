/**
 * Client integration for Gemini-powered visual finishing detection.
 * The edge function returns surface topology only: no metric dimensions,
 * material quantities or prices. User calibration and deterministic engines
 * remain authoritative.
 */
import { supabase } from "@/lib/supabase";
import { captureAiError } from "@/lib/errorMonitor";
import { reconcileMultiFrameSurfaces } from "./video-walkthrough";
import type {
  AiVisualFinishingResponse,
  VisualFinishingActivity,
  VisualMediaInput,
  VisualSurface,
} from "./visual-finishing-types";

export class AiVisualFinishingError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "AiVisualFinishingError";
    this.code = code;
  }
}

interface DetectOptions {
  media: VisualMediaInput;
  preferredActivity?: VisualFinishingActivity;
  roomTypeHint?: string;
  frameDataUrls?: string[];
}

function normalizeFallback(): AiVisualFinishingResponse {
  return {
    detected_surfaces: [],
    scene_notes: [],
    warnings: [
      "Gemini visual analysis is unavailable. No surfaces were inferred locally; retry analysis or enter measured surfaces manually.",
    ],
    provider: "local-heuristic",
    processed_at: new Date().toISOString(),
  };
}

function validateSurface(value: unknown): VisualSurface | null {
  if (!value || typeof value !== "object") return null;
  const s = value as Record<string, unknown>;
  const bbox = s.bbox as Record<string, unknown> | null;
  if (
    !bbox ||
    ![bbox.x, bbox.y, bbox.w, bbox.h].every(
      (n) => typeof n === "number" && Number.isFinite(n),
    )
  )
    return null;
  if (!(["wall", "ceiling", "floor"] as unknown[]).includes(s.category))
    return null;
  if (
    typeof s.id !== "string" ||
    typeof s.name !== "string" ||
    typeof s.confidence !== "number" ||
    !Number.isFinite(s.confidence)
  )
    return null;
  const numbers = [bbox.x, bbox.y, bbox.w, bbox.h] as number[];
  if (
    numbers.some((n) => n < 0 || n > 1) ||
    (bbox.x as number) + (bbox.w as number) > 1.001 ||
    (bbox.y as number) + (bbox.h as number) > 1.001
  )
    return null;
  const openings = Array.isArray(s.openings)
    ? s.openings
        .flatMap((value) => {
          if (!value || typeof value !== "object") return [];
          const opening = value as Record<string, unknown>;
          const openingBox = opening.bbox as Record<string, unknown> | null;
          if (
            !(opening.type === "door" || opening.type === "window") ||
            typeof opening.id !== "string" ||
            typeof opening.label !== "string" ||
            typeof opening.confidence !== "number" ||
            !openingBox
          )
            return [];
          if (
            ![openingBox.x, openingBox.y, openingBox.w, openingBox.h].every(
              (n) => typeof n === "number" && Number.isFinite(n),
            )
          )
            return [];
          const ox = openingBox.x as number,
            oy = openingBox.y as number,
            ow = openingBox.w as number,
            oh = openingBox.h as number;
          if (
            [ox, oy, ow, oh].some((n) => n < 0 || n > 1) ||
            ox + ow > 1.001 ||
            oy + oh > 1.001
          )
            return [];
          return [
            {
              id: opening.id.slice(0, 80),
              type: opening.type,
              label: opening.label.slice(0, 60),
              confidence: Math.max(0, Math.min(1, opening.confidence)),
              bbox: { x: ox, y: oy, w: ow, h: oh },
              widthM: null,
              heightM: null,
              areaM2: null,
              deduct: opening.deduct === true,
            },
          ];
        })
        .slice(0, 16)
    : [];
  return {
    ...(s as unknown as VisualSurface),
    id: s.id.slice(0, 80),
    name: s.name.slice(0, 80),
    confidence: Math.max(0, Math.min(1, s.confidence)),
    bbox: {
      x: bbox.x as number,
      y: bbox.y as number,
      w: bbox.w as number,
      h: bbox.h as number,
    },
    widthM: null,
    heightM: null,
    grossAreaM2: null,
    netAreaM2: null,
    deductedOpeningAreaM2: 0,
    measurementStatus: "incomplete",
    calibrationMethod: "uncalibrated",
    openings: openings as VisualSurface["openings"],
    notes: Array.isArray(s.notes)
      ? s.notes.filter((n): n is string => typeof n === "string").slice(0, 10)
      : [],
    surfaceCondition: (
      ["smooth_new", "painted_good", "rough_damaged", "plastered"] as unknown[]
    ).includes(s.surfaceCondition)
      ? (s.surfaceCondition as VisualSurface["surfaceCondition"])
      : "painted_good",
    isPartiallyObscured: s.isPartiallyObscured === true,
  };
}

function validateAiResponse(data: unknown): AiVisualFinishingResponse | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.detected_surfaces)) return null;
  const surfaces = obj.detected_surfaces
    .map(validateSurface)
    .filter((s): s is VisualSurface => s !== null)
    .slice(0, 12);
  return {
    detected_surfaces: surfaces,
    detected_room_type:
      typeof obj.detected_room_type === "string"
        ? obj.detected_room_type.slice(0, 50)
        : undefined,
    scene_notes: Array.isArray(obj.scene_notes)
      ? obj.scene_notes
          .filter((x): x is string => typeof x === "string")
          .slice(0, 10)
      : [],
    warnings: Array.isArray(obj.warnings)
      ? obj.warnings
          .filter((x): x is string => typeof x === "string")
          .slice(0, 10)
      : [],
    provider: "gemini-live",
    processed_at:
      typeof obj.processed_at === "string"
        ? obj.processed_at
        : new Date().toISOString(),
  };
}

/**
 * Calls the authenticated/rate-limited `ai-visual-finishing` Edge Function.
 * On service or configuration errors, returns local fallback observations so
 * manual estimation workflow remains usable.
 */
export async function requestAiVisualFinishing(
  options: DetectOptions,
): Promise<AiVisualFinishingResponse> {
  const preferredActivity = options.preferredActivity ?? "painting";
  const frameDataUrls = (options.frameDataUrls ?? []).slice(0, 10);
  const imageInputs =
    frameDataUrls.length > 0
      ? frameDataUrls
      : options.media.dataUrl
        ? [options.media.dataUrl]
        : [];
  if (imageInputs.length === 0) return normalizeFallback();

  try {
    const perFrame = await Promise.all(
      imageInputs.map(async (imageDataUrl) => {
        const { data, error } = await supabase.functions.invoke<
          AiVisualFinishingResponse | { error: string; code?: string }
        >("ai-visual-finishing", {
          body: {
            imageDataUrl,
            preferredActivity,
            roomTypeHint: options.roomTypeHint,
          },
        });

        if (error || !data || ("error" in data && data.error)) {
          const code =
            data && "code" in data
              ? (data.code ?? "FUNCTION_ERROR")
              : "FUNCTION_UNAVAILABLE";
          throw new AiVisualFinishingError(
            "Gemini visual analysis is unavailable.",
            code,
          );
        }
        const result = validateAiResponse(data);
        if (!result)
          throw new AiVisualFinishingError(
            "Gemini returned an incomplete visual response.",
            "INVALID_RESPONSE",
          );
        return result;
      }),
    );
    const combined =
      perFrame.length === 1
        ? perFrame[0].detected_surfaces
        : reconcileMultiFrameSurfaces(
            perFrame.map((frame, index) => ({
              frameIndex: index + 1,
              surfaces: frame.detected_surfaces,
            })),
          );
    return {
      detected_surfaces: combined,
      detected_room_type: perFrame.find((frame) => frame.detected_room_type)
        ?.detected_room_type,
      scene_notes: perFrame.flatMap((frame) => frame.scene_notes).slice(0, 10),
      warnings: perFrame.flatMap((frame) => frame.warnings).slice(0, 10),
      provider: "gemini-live",
      processed_at: new Date().toISOString(),
    };
  } catch (error) {
    captureAiError(error, {
      feature: "Visual Finishing Detection",
      provider: "google-ai",
    });
    return normalizeFallback();
  }
}
