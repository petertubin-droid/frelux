/**
 * Counter-Vision engine tests (Future Engine 2)
 *
 * The Gemini call itself runs in the count-vision edge function
 * (admin-gated, rate-limited, key never on the client). These
 * tests pin the CLIENT honesty contract: rules parsing,
 * photo acceptance before upload, and the independent second
 * validation gate on the server's answer — a count below the
 * confidence floor or beyond the reliable bound is never shown
 * as a number.
 */

import { describe, it, expect } from "vitest";
import {
  DEFAULT_COUNT_VISION_RULES,
  parseCountVisionRules,
  checkPhoto,
  validateCountResult,
  verdictLabel,
  type CountVisionRules,
} from "../count-vision-engine";

const rules: CountVisionRules = { ...DEFAULT_COUNT_VISION_RULES };

// ─────────────────────────────────────────────
// Rules parsing — admin-configured, clamped sanely
// ─────────────────────────────────────────────

describe("parseCountVisionRules", () => {
  it("keeps the built-in defaults when nothing is configured", () => {
    expect(parseCountVisionRules([])).toEqual(DEFAULT_COUNT_VISION_RULES);
  });

  it("applies configured rule values", () => {
    const parsed = parseCountVisionRules([
      { rule_key: "max_image_mb", rule_value: { value: 4 } },
      { rule_key: "max_count", rule_value: { value: 1200 } },
      { rule_key: "min_confidence", rule_value: { value: 0.75 } },
    ]);
    expect(parsed).toEqual({
      max_image_mb: 4,
      max_count: 1200,
      min_confidence: 0.75,
    });
  });

  it("ignores inactive rules", () => {
    const parsed = parseCountVisionRules([
      { rule_key: "max_count", rule_value: { value: 100 }, is_active: false },
    ]);
    expect(parsed.max_count).toBe(DEFAULT_COUNT_VISION_RULES.max_count);
  });

  it("refuses nonsense values — never adopts a broken config", () => {
    const parsed = parseCountVisionRules([
      { rule_key: "max_image_mb", rule_value: { value: -5 } },
      { rule_key: "max_image_mb", rule_value: { value: 999 } }, // absurdly high
      { rule_key: "max_count", rule_value: { value: 0 } },
      { rule_key: "max_count", rule_value: { value: 1.5 } }, // not an integer
      { rule_key: "min_confidence", rule_value: { value: 3 } }, // out of range
    ]);
    expect(parsed).toEqual(DEFAULT_COUNT_VISION_RULES);
  });

  it("missing rule_value keeps the default", () => {
    const parsed = parseCountVisionRules([
      { rule_key: "max_count" }, // malformed row from a bad config
    ]);
    expect(parsed.max_count).toBe(DEFAULT_COUNT_VISION_RULES.max_count);
  });
});

// ─────────────────────────────────────────────
// Photo acceptance — refused BEFORE upload, with the reason
// ─────────────────────────────────────────────

describe("checkPhoto", () => {
  const ok = (name: string, type: string, size: number): File =>
    new File([new ArrayBuffer(size > 1024 ? size : 1025)], name, { type });

  it("accepts normal phone photos", () => {
    for (const type of [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
    ]) {
      const check = checkPhoto(ok("site.jpg", type, 2 * 1024 * 1024), rules);
      expect(check.ok).toBe(true);
    }
  });

  it("refuses non-image files with the type named", () => {
    const check = checkPhoto(
      ok("doc.pdf", "application/pdf", 100 * 1024),
      rules,
    );
    expect(check.ok).toBe(false);
    expect(check.reason).toMatch(/application\/pdf/);
  });

  it("refuses oversized photos with the limit stated", () => {
    const big = ok(
      "huge.jpg",
      "image/jpeg",
      rules.max_image_mb * 1024 * 1024 + 1,
    );
    const check = checkPhoto(big, rules);
    expect(check.ok).toBe(false);
    expect(check.reason).toMatch(/limit is 8 MB/);
  });

  it("enforces a smaller admin-configured limit", () => {
    const smallRules = { ...rules, max_image_mb: 2 };
    const twoMbAndABit = ok("mid.jpg", "image/jpeg", 2 * 1024 * 1024 + 100);
    expect(checkPhoto(twoMbAndABit, smallRules).ok).toBe(false);
    expect(
      checkPhoto(ok("under.jpg", "image/jpeg", 1 * 1024 * 1024), smallRules).ok,
    ).toBe(true);
  });

  it("refuses files too small to be real photos", () => {
    const stub = new File(["x"], "fake.jpg", { type: "image/jpeg" });
    expect(checkPhoto(stub, rules).ok).toBe(false);
    expect(checkPhoto(stub, rules).reason).toMatch(/too small/i);
  });
});

// ─────────────────────────────────────────────
// Result validation — the independent second gate
// ─────────────────────────────────────────────

describe("validateCountResult", () => {
  it("accepts a confident counted answer", () => {
    const result = validateCountResult(
      {
        verdict: "counted",
        count: 42,
        unitLabel: "bags",
        confidence: 0.9,
        reason: "Two neat rows of cement bags",
      },
      rules,
    );
    expect(result).toEqual({
      verdict: "counted",
      count: 42,
      unitLabel: "bags",
      confidence: 0.9,
      reason: "Two neat rows of cement bags",
    });
  });

  it("downgrades a count below the admin confidence floor to unclear — the reason survives", () => {
    const result = validateCountResult(
      {
        verdict: "counted",
        count: 7,
        unitLabel: "tiles",
        confidence: 0.4,
        reason: "Tiles partially hidden behind the stack",
      },
      rules,
    );
    expect(result.verdict).toBe("unclear");
    expect(result.count).toBeNull();
    expect(result.reason).toMatch(/partially hidden/i);
  });

  it("honours a stricter admin-configured confidence floor", () => {
    const strict = { ...rules, min_confidence: 0.95 };
    const result = validateCountResult(
      {
        verdict: "counted",
        count: 10,
        unitLabel: "blocks",
        confidence: 0.9,
        reason: "",
      },
      strict,
    );
    expect(result.verdict).toBe("unclear");
    expect(result.count).toBeNull();
  });

  it("downgrades a count beyond the reliable bound", () => {
    const result = validateCountResult(
      {
        verdict: "counted",
        count: 9000,
        unitLabel: "tiles",
        confidence: 0.99,
        reason: "",
      },
      rules, // max_count 5000
    );
    expect(result.verdict).toBe("unclear");
    expect(result.count).toBeNull();
    expect(result.reason).toMatch(/reliable range/i);
  });

  it("a claimed count with no valid integer is unclear, never zero", () => {
    const result = validateCountResult(
      {
        verdict: "counted",
        count: "many",
        unitLabel: "bags",
        confidence: 0.9,
        reason: "",
      },
      rules,
    );
    expect(result.verdict).toBe("unclear");
    expect(result.count).toBeNull();
  });

  it("passes through an honest not_found verdict", () => {
    const result = validateCountResult(
      {
        verdict: "not_found",
        count: null,
        unitLabel: null,
        confidence: 0.8,
        reason: "This is a photo of a room, not materials.",
      },
      rules,
    );
    expect(result.verdict).toBe("not_found");
    expect(result.count).toBeNull();
    expect(result.reason).toMatch(/room/i);
  });

  it("passes through an honest unclear verdict from the server", () => {
    const result = validateCountResult(
      {
        verdict: "unclear",
        count: null,
        unitLabel: "bags",
        confidence: 0.3,
        reason: "Stack too deep to count hidden layers",
      },
      rules,
    );
    expect(result.verdict).toBe("unclear");
    expect(result.reason).toMatch(/hidden layers/i);
  });

  it("survives garbage input — unreadable, not invented", () => {
    expect(validateCountResult(null, rules).verdict).toBe("unclear");
    expect(validateCountResult("42", rules).verdict).toBe("unclear");
    expect(validateCountResult({}, rules).verdict).toBe("unclear");
    expect(
      validateCountResult({ verdict: "counted", count: NaN }, rules).verdict,
    ).toBe("unclear");
  });

  it("clamps an out-of-range confidence instead of trusting it", () => {
    const result = validateCountResult(
      {
        verdict: "counted",
        count: 5,
        unitLabel: "bags",
        confidence: 7,
        reason: "",
      },
      rules,
    );
    expect(result.confidence).toBe(0);
    expect(result.verdict).toBe("unclear");
  });
});

// ─────────────────────────────────────────────
// Labels — the UI never shows a raw enum to a human
// ─────────────────────────────────────────────

describe("verdictLabel", () => {
  it("labels every verdict in plain words", () => {
    expect(verdictLabel("counted")).toBe("Counted");
    expect(verdictLabel("unclear")).toBe("Cannot count honestly");
    expect(verdictLabel("not_found")).toBe("Nothing to count");
  });
});
