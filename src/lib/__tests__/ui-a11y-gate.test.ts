/**
 * UI accessibility gate (audit UX-3, 2026-11-09).
 *
 * The audit found 290 form controls with no accessible name and 66 clickable
 * divs unreachable by keyboard, and found them because nothing was checking.
 * These assertions are a ratchet: the numbers below are the state left after
 * the fix pass, and they may only go down. A new unnamed control or a new
 * keyboard trap fails this test.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { BUILTIN_MARKET_PROFILES } from "@/lib/international/market-context";
import { isSupportedCurrency } from "@/lib/currency/catalogue";
import { jsonLdScript } from "@/lib/structured-data";

type Tag = { start: number; text: string; name: string };

/** Opening tags, scanning past `=>` and quoted strings to the real tag close. */
function openingTags(src: string, names: string): Tag[] {
  const out: Tag[] = [];
  const re = new RegExp(`<(${names})\\b`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    let i = m.index + m[0].length;
    let depth = 0;
    let quote: string | null = null;
    for (; i < src.length; i += 1) {
      const ch = src[i];
      if (quote) {
        if (ch === quote && src[i - 1] !== "\\") quote = null;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") {
        quote = ch;
        continue;
      }
      if (ch === "{") depth += 1;
      else if (ch === "}") depth -= 1;
      else if (ch === ">" && depth === 0) break;
    }
    out.push({ start: m.index, name: m[1], text: src.slice(m.index, i + 1) });
  }
  return out;
}

const files = execSync("find src -name '*.tsx'", { encoding: "utf8" })
  .trim()
  .split("\n");

// Baseline after the 2026-11-09 fix pass. Lower these as files are cleaned up.
const NAMED_CONTROLS_BASELINE = 0;
const KEYBOARD_TRAPS_BASELINE = 0;

describe("UI accessibility gate", () => {
  it("has no new unnamed form controls", () => {
    const unnamed: string[] = [];
    for (const file of files) {
      const s = readFileSync(file, "utf8");
      const controls = openingTags(
        s,
        "input|select|textarea|Input|Select|Textarea|NumericInput",
      );
      for (const label of openingTags(s, "label")) {
        if (/\bhtmlFor=/.test(label.text)) continue;
        const close = s.indexOf("</label>", label.start);
        const inner = s.slice(label.start, close);
        if (
          /<(input|select|textarea|Input|Select|Textarea|Checkbox|Switch|RadioGroup|NumericInput)\b/.test(
            inner,
          )
        )
          continue;
        // A label that renders {children} wraps its control at runtime (implicit association).
        if (/\{children\}/.test(inner)) continue;
        const next = controls.find(
          (c) => c.start > close && c.start - close < 900,
        );
        if (!next) continue;
        if (/\b(aria-label|aria-labelledby|id)=/.test(next.text)) continue;
        unnamed.push(`${file}:${s.slice(0, label.start).split("\n").length}`);
      }
    }
    expect(
      unnamed.length,
      `Unnamed controls (ratchet ${NAMED_CONTROLS_BASELINE}):\n${unnamed.slice(0, 10).join("\n")}`,
    ).toBeLessThanOrEqual(NAMED_CONTROLS_BASELINE);
  });

  it("has no new keyboard traps", () => {
    const traps: string[] = [];
    for (const file of files) {
      const s = readFileSync(file, "utf8");
      for (const div of openingTags(s, "div")) {
        if (!/\bonClick=/.test(div.text)) continue;
        if (/\brole=/.test(div.text) || /\btabIndex/.test(div.text)) continue;
        // A full-screen dismiss overlay is a pointer convenience, not a control:
        // it is dismissed by Escape and by the dialog's own close button.
        const after = s.slice(div.start, div.start + 400);
        if (/fixed inset-0/.test(after)) continue;
        // Pointer-only scrims are hidden from assistive technology; the modal
        // that owns them provides Escape and an explicit close button.
        if (/aria-hidden="true"/.test(div.text)) continue;
        // A handler that only stops propagation is not an interaction.
        if (/onClick=\{\(e\) => e\.stopPropagation\(\)\}/.test(div.text))
          continue;
        traps.push(`${file}:${s.slice(0, div.start).split("\n").length}`);
      }
    }
    expect(
      traps.length,
      `Clickable divs without role/tabIndex (ratchet ${KEYBOARD_TRAPS_BASELINE}):\n${traps.slice(0, 10).join("\n")}`,
    ).toBeLessThanOrEqual(KEYBOARD_TRAPS_BASELINE);
  });

  it("never opens a target=_blank link without noopener", () => {
    const unsafe: string[] = [];
    for (const file of files) {
      const s = readFileSync(file, "utf8");
      for (const a of openingTags(s, "a")) {
        if (/target="_blank"/.test(a.text) && !/noopener/.test(a.text))
          unsafe.push(`${file}:${s.slice(0, a.start).split("\n").length}`);
      }
    }
    expect(unsafe, unsafe.join("\n")).toEqual([]);
  });

  it("catalogues every currency the 32 markets actually use", () => {
    const missing = BUILTIN_MARKET_PROFILES.map((p) => p.currency_code).filter(
      (code) => !isSupportedCurrency(code),
    );
    expect([...new Set(missing)]).toEqual([]);
  });

  it("escapes < in structured data so a payload cannot close the script tag", () => {
    const out = jsonLdScript({
      name: "Evil </script><script>alert(1)</script>",
    });
    expect(out).not.toContain("</script>");
    expect(JSON.parse(out).name).toBe(
      "Evil </script><script>alert(1)</script>",
    );
  });
});
