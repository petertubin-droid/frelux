// =========================================================
// BOQ PDF font support.
//
// jsPDF's core fonts are WinAnsi-only: Latin-1 at best. Anything else
// (Cyrillic, Greek, Arabic, Devanagari, CJK) is dropped or drawn as garbage,
// which is a silent data loss on a document a contractor sends to a client.
//
// Two different problems hide behind that:
//
//  1. Missing glyphs. Solved by embedding a Unicode TTF: Noto Sans covers
//     Latin (extended), Greek and Cyrillic. It is fetched from /fonts/pdf on
//     demand, so the 1.2 MB of font is downloaded only by an export that
//     actually needs it, never by a page load. The fonts are SIL OFL 1.1 and
//     ship with their licence and notice in public/fonts/pdf/OFL.txt.
//  2. Missing shaping. Arabic and Indic scripts need contextual letter forms
//     and reordering; jsPDF has no complex-text layout engine, and CJK needs a
//     font of several megabytes. A font alone cannot fix those, so this module
//     refuses instead of printing a document whose words are wrong.
//
// The refusal is a typed error the caller can explain, not a silent fallback:
// a garbled tender schedule is worse than an honest "use Print".
// =========================================================

/** Characters outside WinAnsi that Noto Sans can still draw correctly. */
const COVERED = /[\u0370-\u03FF\u0400-\u04FF\u1E00-\u1EFF\u2000-\u206F\u20A0-\u20CF]/;

/** Scripts that need shaping or a font we do not ship. */
const UNSUPPORTED_SCRIPTS =
  // eslint-disable-next-line no-misleading-character-class
  /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u0900-\u097F\u0980-\u09FF\u0A00-\u0AFF\u0B80-\u0BFF\u0C00-\u0C7F\u0D00-\u0D7F\u0E00-\u0E7F\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]/;

export class UnrenderableScriptError extends Error {
  constructor() {
    super(
      "This document uses a script the PDF engine cannot shape yet (Arabic, Hebrew, an Indic script or CJK). Export it with Print instead, where the browser lays the text out correctly.",
    );
    this.name = "UnrenderableScriptError";
  }
}

/** True when the text contains characters the core PDF fonts cannot draw. */
export function needsUnicodeFont(text: string): boolean {
  return COVERED.test(text);
}

/** True when the text needs shaping or glyphs no shipped font provides. */
export function hasUnrenderableScript(text: string): boolean {
  return UNSUPPORTED_SCRIPTS.test(text);
}

/** The family name registered with jsPDF. */
export const UNICODE_FAMILY = "NotoSans";

let cachedFonts: { regular: string; bold: string } | null = null;

async function fetchBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font ${url} could not be loaded.`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  // Chunked to stay clear of the argument limit on String.fromCharCode.
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/**
 * Register the embedded Unicode font on a document and return its family name.
 * Cached per session: the bytes are fetched once, not once per export.
 */
export async function registerUnicodeFont(doc: {
  addFileToVFS: (name: string, data: string) => void;
  addFont: (file: string, family: string, style: string) => void;
}): Promise<string> {
  if (!cachedFonts) {
    const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
    const [regular, bold] = await Promise.all([
      fetchBase64(`${base}/fonts/pdf/NotoSans-Regular.ttf`),
      fetchBase64(`${base}/fonts/pdf/NotoSans-Bold.ttf`),
    ]);
    cachedFonts = { regular, bold };
  }
  doc.addFileToVFS("NotoSans-Regular.ttf", cachedFonts.regular);
  doc.addFont("NotoSans-Regular.ttf", UNICODE_FAMILY, "normal");
  doc.addFileToVFS("NotoSans-Bold.ttf", cachedFonts.bold);
  doc.addFont("NotoSans-Bold.ttf", UNICODE_FAMILY, "bold");
  return UNICODE_FAMILY;
}

/** Test hook: forget the fetched bytes. */
export function resetUnicodeFontCache(): void {
  cachedFonts = null;
}
