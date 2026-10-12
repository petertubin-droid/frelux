/**
 * Page translation engine for FRELUX.
 *
 * Google discontinued the Website Translator widget on 1 October 2026:
 * element.js still downloads, but it no longer creates the language combo,
 * no longer honors the googtrans cookie, and never translates. The whole
 * cookie/combo/reload machinery that drove it is therefore dead.
 *
 * This engine translates the visible page client-side using the same
 * public translate.googleapis.com endpoint that powers translate.google.com
 * (CORS-open, no key). UI chrome keeps using the i18n dictionaries; this
 * engine covers the authored English content (articles, calculators).
 *
 * Design notes:
 *  - segments are single text nodes (plus placeholders and the document
 *    title), normalized to single lines so they can be batched by joining
 *    with newlines; the endpoint preserves line alignment 1:1
 *  - every translated string is cached per language in memory and in
 *    localStorage, so React re-renders (calculators) are healed instantly
 *    from cache with zero network calls
 *  - a MutationObserver re-applies translation to content that appears or
 *    reverts after SPA route changes and async loads
 *  - admin routes are never translated
 *  - if the endpoint ever goes away, fetchBatch is the single swap-in point
 */

export type SegmentKind = "text" | "attr" | "title";

interface Segment {
  kind: SegmentKind;
  node?: Text;
  element?: Element;
  attr?: string;
  key: string;
}

interface ApplyStats {
  applied: number;
  fetched: number;
  failed: number;
}

const API_BASE = "https://translate.googleapis.com/translate_a/single";
const CHUNK_SIZE = 40;
const MAX_SEGMENTS = 1500;
const REQUEST_TIMEOUT_MS = 10_000;
const REAPPLY_DEBOUNCE_MS = 500;
const PERSIST_DEBOUNCE_MS = 1_000;
const CACHE_WRITE_LIMIT = 600;
const SOURCE_LANG = "en";

/** Elements whose text must never be machine-translated. */
const SKIP_SELECTOR = [
  "script",
  "style",
  "noscript",
  "code",
  "pre",
  "textarea",
  "svg",
  "iframe",
  "canvas",
  "input[type='password']",
  "[contenteditable='true']",
  ".notranslate",
  "[data-no-translate]",
].join(", ");

let activeLang = "en";
let origTitle: string | null = null;
let applying = false;
let observer: MutationObserver | null = null;
let reapplyTimer: ReturnType<typeof setTimeout> | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

/** lang -> (original normalized text -> translated text) */
const cache = new Map<string, Map<string, string>>();
/** lang -> set of translated values (to skip already-translated nodes) */
const translatedValues = new Map<string, Set<string>>();

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function hasLetters(text: string): boolean {
  return /[a-zA-ZÀ-ÿ]/.test(text);
}

export function isActiveLanguageTranslated(): boolean {
  return activeLang !== "en";
}

function langCache(lang: string): Map<string, string> {
  let m = cache.get(lang);
  if (!m) {
    m = new Map();
    cache.set(lang, m);
    try {
      const raw = localStorage.getItem(`frelux_pt_v1:${lang}`);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, string>;
        for (const [k, v] of Object.entries(parsed)) m.set(k, v);
      }
    } catch {
      // storage unavailable or corrupt — start empty
    }
  }
  return m;
}

function persistCache(lang: string): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      const m = cache.get(lang);
      if (!m) return;
      const entries = Array.from(m.entries());
      const bounded = entries.slice(
        Math.max(0, entries.length - CACHE_WRITE_LIMIT),
      );
      localStorage.setItem(
        `frelux_pt_v1:${lang}`,
        JSON.stringify(Object.fromEntries(bounded)),
      );
    } catch {
      // quota exceeded — the in-memory cache still works this session
    }
  }, PERSIST_DEBOUNCE_MS);
}

function isAdminRoute(): boolean {
  return window.location.pathname.startsWith("/admin");
}

/** Collect translatable segments under root. Returns at most MAX_SEGMENTS. */
function collectSegments(root: ParentNode): Segment[] {
  const segments: Segment[] = [];
  const pushText = (node: Text, key: string) => {
    segments.push({ kind: "text", node, key });
  };

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let current = walker.nextNode() as Text | null;
  while (current && segments.length < MAX_SEGMENTS) {
    const el = current.parentElement;
    const value = normalize(current.nodeValue ?? "");
    if (
      el &&
      value.length > 1 &&
      hasLetters(value) &&
      !el.closest(SKIP_SELECTOR)
    ) {
      pushText(current, value);
    }
    current = walker.nextNode() as Text | null;
  }

  if (root === document.body && segments.length < MAX_SEGMENTS) {
    root
      .querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[placeholder]")
      .forEach((el) => {
        if (el.closest(SKIP_SELECTOR)) return;
        const value = normalize(el.getAttribute("placeholder") ?? "");
        if (value.length > 1 && hasLetters(value)) {
          segments.push({
            kind: "attr",
            element: el,
            attr: "placeholder",
            key: value,
          });
        }
      });

    const title = normalize(document.title);
    if (title.length > 1 && hasLetters(title)) {
      segments.push({ kind: "title", key: title });
    }
  }

  return segments;
}

function currentSegmentValue(seg: Segment): string | null {
  if (seg.kind === "text") return seg.node?.nodeValue ?? null;
  if (seg.kind === "attr")
    return seg.element?.getAttribute(seg.attr ?? "") ?? null;
  return document.title;
}

function setSegmentValue(seg: Segment, value: string): void {
  if (seg.kind === "text") {
    if (seg.node) seg.node.nodeValue = value;
  } else if (seg.kind === "attr") {
    seg.element?.setAttribute(seg.attr ?? "placeholder", value);
  } else {
    document.title = value;
  }
}

/**
 * Translate a batch of single-line texts. Returns translations aligned
 * 1:1 with the input, or null when the response could not be aligned
 * (caller falls back to per-item requests).
 */
async function fetchBatch(
  texts: string[],
  targetLang: string,
): Promise<string[] | null> {
  const joined = texts.join("\n");
  const url = `${API_BASE}?client=gtx&sl=${SOURCE_LANG}&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(joined)}`;

  const attempt = async (): Promise<string[] | null> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) return null;
      const data = (await res.json()) as unknown[];
      const sentenceParts = data?.[0];
      if (!Array.isArray(sentenceParts)) return null;
      const concatenated = sentenceParts
        .map((part) =>
          Array.isArray(part) && typeof part[0] === "string" ? part[0] : "",
        )
        .join("");
      const lines = concatenated.split("\n").map((l) => l.trim());
      if (lines.length !== texts.length) return null;
      for (const line of lines) {
        if (!line) return null;
      }
      return lines;
    } catch {
      // network error / abort / bad payload — a null return makes the
      // caller retry the chunk, then fall back to per-item requests
      return null;
    } finally {
      clearTimeout(timer);
    }
  };

  const first = await attempt();
  if (first) return first;
  // one retry (transient 5xx/network)
  return attempt();
}

/** Translate a single text (fallback when a batch comes back misaligned). */
async function fetchSingle(
  text: string,
  targetLang: string,
): Promise<string | null> {
  const batch = await fetchBatch([text], targetLang);
  return batch?.[0] ?? null;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size)
    out.push(items.slice(i, i + size));
  return out;
}

async function translateQueue(
  queue: Segment[],
  targetLang: string,
  stats: ApplyStats,
): Promise<void> {
  const m = langCache(targetLang);
  const seen = translatedValues.get(targetLang) ?? new Set<string>();
  translatedValues.set(targetLang, seen);

  for (const group of chunk(queue, CHUNK_SIZE)) {
    const results = await fetchBatch(
      group.map((s) => s.key),
      targetLang,
    );
    if (results) {
      group.forEach((seg, i) => {
        const translated = results[i];
        m.set(seg.key, translated);
        seen.add(normalize(translated));
        setSegmentValue(seg, translated);
        stats.applied += 1;
        stats.fetched += 1;
      });
      persistCache(targetLang);
      continue;
    }
    // Misaligned or failed batch: translate one by one.
    for (const seg of group) {
      const translated = await fetchSingle(seg.key, targetLang);
      if (translated) {
        m.set(seg.key, translated);
        seen.add(normalize(translated));
        setSegmentValue(seg, translated);
        stats.applied += 1;
        stats.fetched += 1;
      } else {
        stats.failed += 1;
      }
    }
    persistCache(targetLang);
  }
}

/**
 * Translate the whole page (body + placeholders + title) into targetLang.
 * Returns false when the endpoint could not translate anything and the
 * cache had nothing either — callers show the manual fallback.
 */
export async function applyPageTranslation(
  targetLang: string,
): Promise<boolean> {
  if (isAdminRoute()) return true;
  applying = true;
  try {
    if (activeLang !== "en" && activeLang !== targetLang) {
      restoreOriginalText();
    }
    if (!origTitle) origTitle = document.title;
    activeLang = targetLang;

    const m = langCache(targetLang);
    const seen = translatedValues.get(targetLang) ?? new Set<string>();
    translatedValues.set(targetLang, seen);

    const stats: ApplyStats = { applied: 0, fetched: 0, failed: 0 };
    const queue: Segment[] = [];
    let cacheHits = 0;

    for (const seg of collectSegments(document.body)) {
      if (seen.has(seg.key)) continue; // already translated in place
      const cached = m.get(seg.key);
      if (cached) {
        setSegmentValue(seg, cached);
        stats.applied += 1;
        cacheHits += 1;
      } else {
        queue.push(seg);
      }
    }

    await translateQueue(queue, targetLang, stats);

    const ok =
      stats.failed === 0 ||
      stats.applied > 0 ||
      cacheHits > 0 ||
      queue.length === 0;
    startObserver();
    return ok;
  } finally {
    applying = false;
  }
}

/**
 * Restore the original English text of the last applied language.
 */
export function restoreOriginalText(): void {
  const m = cache.get(activeLang);
  if (m && m.size > 0) {
    const reverse = new Map<string, string>();
    for (const [orig, trans] of m) reverse.set(normalize(trans), orig);
    for (const seg of collectSegments(document.body)) {
      const cur = normalize(currentSegmentValue(seg) ?? "");
      const orig = reverse.get(cur);
      if (orig) setSegmentValue(seg, orig);
    }
  }
  if (origTitle) {
    document.title = origTitle;
  }
  stopObserver();
  activeLang = "en";
}

/** Entry point used by GoogleTranslateSync. "en" restores the original page. */
export async function setPageLanguage(langCode: string): Promise<boolean> {
  if (langCode === "en" || isAdminRoute()) {
    if (activeLang !== "en") restoreOriginalText();
    return true;
  }
  return applyPageTranslation(langCode);
}

/** Debounced re-apply for SPA route changes and async content loads. */
export function reapplyCurrentLanguage(): void {
  if (activeLang === "en" || applying) return;
  if (reapplyTimer) clearTimeout(reapplyTimer);
  reapplyTimer = setTimeout(() => {
    reapplyTimer = null;
    void applyPageTranslation(activeLang);
  }, REAPPLY_DEBOUNCE_MS);
}

function startObserver(): void {
  if (observer || typeof MutationObserver === "undefined") return;
  observer = new MutationObserver(() => reapplyCurrentLanguage());
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

/**
 * Reset all engine state (active language, caches, observer). Intended for
 * tests and for a full logout / language-preference reset.
 */
export function resetTranslationState(): void {
  activeLang = "en";
  origTitle = null;
  cache.clear();
  translatedValues.clear();
  stopObserver();
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
}

function stopObserver(): void {
  observer?.disconnect();
  observer = null;
  if (reapplyTimer) {
    clearTimeout(reapplyTimer);
    reapplyTimer = null;
  }
}
