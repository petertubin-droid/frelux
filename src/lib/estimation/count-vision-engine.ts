/**
 * Counter-Vision Engine (Future Engine 2) - photo counting, honestly
 *
 * An artisan photographs a stack of tiles, cement bags, blocks or
 * paint buckets; Gemini (via the count-vision edge function) counts
 * what is visible. This module owns the CLIENT side of the honesty
 * contract:
 *
 *  - Photo acceptance rules (size, type) are admin-configured and
 *    checked BEFORE upload - a refused photo says the limit, never
 *    a silent downscale.
 *  - A response is only "counted" if the server stood behind it.
 *    Below the admin-configured confidence floor, or above the
 *    reliable count bound, the engine reports "unclear" with the
 *    reason - never a guess.
 *  - The photo never leaves the request: nothing about the image
 *    is stored on the device after the count completes.
 */

// ─────────────────────────────────────────────
// Rules - admin-configurable behaviour
// ─────────────────────────────────────────────

export interface CountVisionRules {
  max_image_mb: number;
  max_count: number;
  min_confidence: number;
}

export const DEFAULT_COUNT_VISION_RULES: CountVisionRules = {
  max_image_mb: 8,
  max_count: 5000,
  min_confidence: 0.6,
};

export interface CalcRuleRow {
  rule_key: string;
  rule_value?: { value?: unknown };
  is_active?: boolean | null;
}

export function parseCountVisionRules(rows: CalcRuleRow[]): CountVisionRules {
  const rules: CountVisionRules = { ...DEFAULT_COUNT_VISION_RULES };
  const get = (key: string): unknown | undefined => {
    const row = rows.find(
      (r) =>
        r.rule_key === key &&
        (r.is_active === undefined ||
          r.is_active === true ||
          r.is_active === null),
    );
    return row?.rule_value?.value;
  };

  const maxImageMb = get("max_image_mb");
  if (
    typeof maxImageMb === "number" &&
    Number.isFinite(maxImageMb) &&
    maxImageMb > 0 &&
    maxImageMb <= 50
  ) {
    rules.max_image_mb = maxImageMb;
  }

  const maxCount = get("max_count");
  if (
    typeof maxCount === "number" &&
    Number.isFinite(maxCount) &&
    maxCount > 0 &&
    Number.isInteger(maxCount)
  ) {
    rules.max_count = maxCount;
  }

  const minConfidence = get("min_confidence");
  if (
    typeof minConfidence === "number" &&
    Number.isFinite(minConfidence) &&
    minConfidence >= 0 &&
    minConfidence <= 1
  ) {
    rules.min_confidence = minConfidence;
  }

  return rules;
}

// ─────────────────────────────────────────────
// Photo validation - before any upload happens
// ─────────────────────────────────────────────

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
] as const;

export interface PhotoCheck {
  ok: boolean;
  reason?: string;
}

export function checkPhoto(file: File, rules: CountVisionRules): PhotoCheck {
  const type = (file.type || "").toLowerCase();
  if (
    !ACCEPTED_IMAGE_TYPES.includes(
      type as (typeof ACCEPTED_IMAGE_TYPES)[number],
    )
  ) {
    return {
      ok: false,
      reason: `That file type (${type || "unknown"}) is not a photo. Use a JPEG, PNG, WebP or HEIC image.`,
    };
  }
  const maxBytes = rules.max_image_mb * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      ok: false,
      reason: `That photo is ${(file.size / (1024 * 1024)).toFixed(1)} MB: the limit is ${rules.max_image_mb} MB. Take it again at normal quality.`,
    };
  }
  if (file.size < 1024) {
    return {
      ok: false,
      reason: "That file is too small to be a real photo.",
    };
  }
  return { ok: true };
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(new Error("Could not read the photo from your device."));
    reader.readAsDataURL(file);
  });
}

// ─────────────────────────────────────────────
// Result types - the honest verdicts
// ─────────────────────────────────────────────

export type CountVerdict = "counted" | "unclear" | "not_found";

export interface CountVisionResult {
  verdict: CountVerdict;
  count: number | null;
  unitLabel: string | null;
  confidence: number;
  reason: string;
}

// ─────────────────────────────────────────────
// Client-side sanity check on the server's answer.
// The server validates too - this is the second, independent
// gate: the page trusts NO response shape blindly.
// ─────────────────────────────────────────────

export function validateCountResult(
  raw: unknown,
  rules: CountVisionRules,
): CountVisionResult {
  if (typeof raw !== "object" || raw === null) {
    return {
      verdict: "unclear",
      count: null,
      unitLabel: null,
      confidence: 0,
      reason: "The counting service returned an unreadable answer.",
    };
  }
  const r = raw as Record<string, unknown>;
  const verdict = String(r.verdict);
  const confidenceRaw = Number(r.confidence);
  const confidence =
    Number.isFinite(confidenceRaw) && confidenceRaw >= 0 && confidenceRaw <= 1
      ? confidenceRaw
      : 0;
  const reason = String(r.reason ?? "").slice(0, 500);
  const unitLabel =
    typeof r.unitLabel === "string" && r.unitLabel.trim()
      ? r.unitLabel.trim().slice(0, 40)
      : null;
  const countRaw = Number(r.count);
  const count =
    Number.isInteger(countRaw) && countRaw > 0 && countRaw <= rules.max_count
      ? countRaw
      : null;

  if (verdict === "not_found") {
    return {
      verdict: "not_found",
      count: null,
      unitLabel: null,
      confidence,
      reason: reason || "No countable material units in the photo.",
    };
  }

  // Anything that claims a count but cannot show a valid one, or
  // sits below the admin-configured confidence floor, is honestly
  // "unclear" - with the reason preserved.
  if (count === null || confidence < rules.min_confidence) {
    return {
      verdict: "unclear",
      count: null,
      unitLabel,
      confidence,
      reason:
        reason ||
        (Number.isInteger(countRaw) && countRaw > rules.max_count
          ? `The reported count exceeds the reliable range (${rules.max_count.toLocaleString()}). Photograph a smaller section.`
          : "The count could not be made reliable from this photo."),
    };
  }

  return {
    verdict: "counted",
    count,
    unitLabel,
    confidence,
    reason,
  };
}

export function verdictLabel(v: CountVerdict): string {
  switch (v) {
    case "counted":
      return "Counted";
    case "unclear":
      return "Cannot count honestly";
    case "not_found":
      return "Nothing to count";
  }
}
