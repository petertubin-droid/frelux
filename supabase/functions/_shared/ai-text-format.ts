// =========================================================
// AI TEXT FORMAT — plain-text output for user-facing answers
// =========================================================
// Owner directive (2026-10-10): the site's AI answers must read as
// clean plain text in chat bubbles. The chat widgets render raw
// strings, so model markdown shows literally ("**", "##", stray
// asterisks) and em dashes read awkwardly. This sanitizer is the
// safety net applied server-side to every user-facing AI reply;
// the system prompts also ask for plain text, but the model is not
// always obedient, so we normalize regardless.
//
// Intentionally dependency-free (no Deno APIs) so it can be unit
// tested from the webapp's vitest suite.
// =========================================================

/**
 * Normalizes a model answer to plain prose:
 * - strips markdown headings, bold, italic, inline-code markers
 * - converts "* " bullets to "- " so asterisks never appear
 * - removes any leftover stray asterisk pairs
 * - converts em dashes and en dashes to plain hyphens
 * Lists ("-" lines) and line breaks are preserved.
 */
export function sanitizeAiProse(input: string): string {
  if (!input) return input;

  let out = input;

  // Markdown headings ("## Title") -> plain line
  out = out.replace(/^#{1,6}\s+/gm, "");

  // Bold: **text** / __text__ -> text (content may not span lines)
  out = out.replace(/\*\*([^*\n]+)\*\*/g, "$1");
  out = out.replace(/__([^_\n]+)__/g, "$1");

  // Inline code: `text` -> text
  out = out.replace(/`([^`\n]+)`/g, "$1");

  // Italic: *text* -> text. Only when it wraps real content that
  // starts/ends with a non-space, so bullets ("* item") and math
  // ("3 * 4") are untouched.
  out = out.replace(
    /(^|[\s(])\*(?!\s)([^*\n]*?\S)\*(?=[\s).,!?:;]|$)/g,
    "$1$2",
  );

  // Italic with underscores: _text_ -> text (word-internal only)
  out = out.replace(/(^|\s)_(?!\s)([^_\n]*?\S)_(?=[\s.,!?:;]|$)/g, "$1$2");

  // "* " bullets -> "- " (after italics, only line-leading
  // asterisks remain)
  out = out.replace(/^\s*\*\s+/gm, "- ");

  // Protect genuine math ("4 * 2") before junk cleanup — Frelux is a
  // calculator platform, so "5 * 2 rooms" must survive as "5 × 2".
  out = out.replace(/(\d)\s*\*\s*(\d)/g, "$1 × $2");

  // Any leftover bold/italic markers from malformed markdown
  out = out.replace(/\*\*/g, "");
  out = out.replace(/\*/g, "");

  // Em dash / en dash -> hyphen ("a — b" -> "a - b", "2–3" -> "2-3")
  out = out.replace(/—/g, "-").replace(/–/g, "-");

  // Tidy: collapse spaces a sanitizer pass may have doubled
  out = out.replace(/[ \t]{2,}/g, " ");

  return out.trim();
}
