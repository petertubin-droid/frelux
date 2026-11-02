// Tests for the shared AI plain-text sanitizer
// (supabase/functions/_shared/ai-text-format.ts) used by the
// user-facing AI answers (Learn "Ask AI" + site support chat).
// The module is dependency-free so vitest can import it directly.

import { describe, expect, it } from "vitest";
import { sanitizeAiProse } from "../../supabase/functions/_shared/ai-text-format.ts";

describe("sanitizeAiProse", () => {
  it("strips **bold** and *italic* markers", () => {
    expect(sanitizeAiProse("Use **primer** first, then *two* coats.")).toBe(
      "Use primer first, then two coats.",
    );
  });

  it("removes markdown headings and backticks", () => {
    expect(sanitizeAiProse("## Quick Answer\nPress `Enter` to submit.")).toBe(
      "Quick Answer\nPress Enter to submit.",
    );
  });

  it("converts em and en dashes to plain hyphens", () => {
    expect(sanitizeAiProse("Seal the wall — then wait 2–3 hours.")).toBe(
      "Seal the wall - then wait 2-3 hours.",
    );
    expect(sanitizeAiProse("Primer—cheap insurance.")).toBe(
      "Primer-cheap insurance.",
    );
  });

  it("converts asterisk bullets to dash bullets", () => {
    expect(sanitizeAiProse("Tips:\n* Sand first\n* Dust off")).toBe(
      "Tips:\n- Sand first\n- Dust off",
    );
  });

  it("cleans up malformed markdown leftovers", () => {
    expect(sanitizeAiProse("Cost ***, budget ** NGN")).toBe(
      "Cost , budget NGN",
    );
  });

  it("leaves normal text, lists and numbers untouched", () => {
    expect(sanitizeAiProse("Mix 4 * 2 litres. - item")).toBe(
      "Mix 4 × 2 litres. - item",
    );
    expect(sanitizeAiProse("5*2 rooms")).toBe("5 × 2 rooms");
    expect(sanitizeAiProse("3-4 coats at ₦1,500 per litre")).toBe(
      "3-4 coats at ₦1,500 per litre",
    );
  });

  it("passes through empty and whitespace-only input", () => {
    expect(sanitizeAiProse("")).toBe("");
    expect(sanitizeAiProse("  \n ")).toBe("");
  });

  it("handles a realistic model answer end-to-end", () => {
    const raw =
      "Great question!\n\n**Key steps:**\n1. Clean the wall — dust and grease ruin adhesion\n* Sand with **120-grit** paper\n\nThat's it — you're ready to prime.";
    const out = sanitizeAiProse(raw);
    expect(out).not.toContain("**");
    expect(out).not.toContain("—");
    expect(out).toContain("- Sand with 120-grit paper");
  });
});
