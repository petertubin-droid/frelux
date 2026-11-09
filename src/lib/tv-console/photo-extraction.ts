/**
 * Photo handling for the TV console "extract rough dimensions" tool.
 *
 * Why this module exists (2026-11-09): the picker accepted images up to 6 MB
 * while the edge function rejected any data URL longer than 8,000,000
 * characters. Base64 inflates by 4/3, so a 6 MB photo is already 8.4 M
 * characters before any JSON wrapper is added: the largest images the page
 * offered could never be parsed, and a phone photo sits close to that line.
 * Resizing before upload removes the contradiction and makes the vision call
 * cheaper and faster at the same time.
 *
 * The pure parts (target size, payload parsing, error wording) are separated
 * from the canvas call so they can be tested without a browser.
 */

/** Largest file the picker will accept. Kept generous because we downscale. */
export const MAX_PHOTO_BYTES = 12 * 1024 * 1024;

/** Longest edge sent to the model. Enough detail, a fraction of the bytes. */
export const MAX_EDGE_PX = 1600;

/** Must stay below the edge function's own cap (8,000,000 characters). */
export const MAX_DATA_URL_CHARS = 7_500_000;

export const ACCEPTED_PHOTO_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

/** Fit a photo inside a square of `maxEdge` without distorting it. */
export function scaledDimensions(
  width: number,
  height: number,
  maxEdge: number = MAX_EDGE_PX,
): { width: number; height: number } {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return { width: 0, height: 0 };
  }
  const longest = Math.max(width, height);
  if (longest <= maxEdge) {
    return { width: Math.round(width), height: Math.round(height) };
  }
  const ratio = maxEdge / longest;
  return {
    width: Math.max(Math.round(width * ratio), 1),
    height: Math.max(Math.round(height * ratio), 1),
  };
}

/**
 * Read the model's reply even when it is wrapped in a markdown code fence or
 * prefixed with prose. `JSON.parse` on the raw text threw here, which surfaced
 * to the user as "Could not read dimensions from that image" with no clue why.
 */
export function parseVisionPayload(
  text: string,
): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const candidates = [trimmed];
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(fenced[1].trim());
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Try the next shape.
    }
  }
  return null;
}

/**
 * Turn an edge-function failure into something the user can act on. The page
 * used to show whatever `error.message` held, so "Failed to send a request to
 * the Edge Function" and "Active Pro subscription required" looked identical.
 */
export function extractionErrorMessage(
  codeOrMessage: string | null | undefined,
): string {
  const raw = (codeOrMessage ?? "").trim();
  const code = raw.toUpperCase();
  const byCode: Record<string, string> = {
    NOT_CONFIGURED:
      "The photo reader has no vision key configured on the server yet. Enter dimensions manually or pick a preset.",
    AUTH_REQUIRED:
      "Sign in again, then retry: the photo reader verifies your session.",
    PRO_REQUIRED:
      "Photo reading is a Pro feature. Enter dimensions manually, or upgrade to use it.",
    INVALID_IMAGE:
      "That image could not be read. Try a JPEG, PNG or WebP photo taken in good light.",
    VISION_FAILED:
      "The vision service could not read this photo. Try a clearer, well-lit shot, or enter the dimensions manually.",
    INVALID_BODY: "The upload was rejected. Try a different photo.",
    METHOD_NOT_ALLOWED: "The photo reader is unavailable right now.",
    AI_ACCESS_DENIED:
      "AI usage could not be authorised for this account. Enter dimensions manually, or check your plan.",
    GUEST_LIMIT_REACHED:
      "You have used today's free AI operation. Sign in to continue.",
    GUEST_AD_REQUIRED:
      "Watch a sponsor ad to unlock today's free AI operation.",
  };
  if (byCode[code]) return byCode[code];
  if (Object.keys(byCode).some((key) => code.includes(key))) {
    const hit = Object.keys(byCode).find((key) => code.includes(key))!;
    return byCode[hit];
  }
  if (
    /failed to send a request|edge function returned a non-2xx|not found/i.test(
      raw,
    )
  ) {
    return "The photo reader is not deployed on the server yet. Enter dimensions manually or pick a preset, and tell the site owner.";
  }
  return (
    raw ||
    "Could not read that photo. Enter dimensions manually or pick a preset."
  );
}

/**
 * Downscale a photo to a JPEG data URL no larger than `MAX_EDGE_PX` on its
 * longest edge. Falls back to the original data URL when the browser cannot
 * decode the file, so an unusual image still reaches the server.
 */
export async function photoToDataUrl(file: File): Promise<string> {
  const original = await readAsDataUrl(file);
  if (
    typeof document === "undefined" ||
    typeof createImageBitmap !== "function"
  ) {
    return original;
  }
  try {
    const bitmap = await createImageBitmap(file);
    const target = scaledDimensions(bitmap.width, bitmap.height);
    if (!target.width || !target.height) return original;
    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const context = canvas.getContext("2d");
    if (!context) return original;
    context.drawImage(bitmap, 0, 0, target.width, target.height);
    bitmap.close?.();
    const encoded = canvas.toDataURL("image/jpeg", 0.85);
    // Only prefer the resized copy when it is actually smaller.
    return encoded && encoded.length < original.length ? encoded : original;
  } catch {
    return original;
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("The file could not be read."));
    reader.readAsDataURL(file);
  });
}

/** True when the chosen file is an image type we can send. */
export function isAcceptedPhoto(file: Pick<File, "type" | "size">): boolean {
  const type = (file.type || "").toLowerCase();
  return (
    (ACCEPTED_PHOTO_TYPES as readonly string[]).includes(type) &&
    file.size > 0 &&
    file.size <= MAX_PHOTO_BYTES
  );
}
