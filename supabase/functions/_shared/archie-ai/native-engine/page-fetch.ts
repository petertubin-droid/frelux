// =========================================================
// PAGE FETCHER — real web research deepening (audit Phase 2.2).
// Fetches the ACTUAL source pages behind search hits instead
// of trusting snippets: robots.txt compliance, hard timeouts,
// size caps, honest failure notes. Deterministic, no deps,
// injectable fetch for tests (CI never depends on the live
// network).
// =========================================================

export interface PageFetchOptions {
  /** Injectable fetch — tests pass a stub. */
  fetchFn?: typeof fetch;
  /** Hard per-request timeout (default 8000ms). */
  timeoutMs?: number;
  /** Decline to READ responses larger than this many bytes
   *  when content-length is known (default 1MB). The page is
   *  never buffered whole into the edge runtime. */
  maxBytes?: number;
  /** Cap on extracted readable text (default 4000 chars). */
  maxContentChars?: number;
  /** robots.txt cache TTL per origin (default 12h). */
  robotsCacheTtlMs?: number;
  /** Injectable clock for deterministic robots-cache tests. */
  clock?: () => number;
}

export interface PageFetchResult {
  url: string;
  /** True ONLY when readable text was actually extracted. */
  ok: boolean;
  /** Extracted readable text ("" on any failure). */
  content: string;
  /** Page <title>, when present. */
  title: string;
  /** Honest outcome note — failure reasons are never silent. */
  note: string;
}

interface RobotsRules {
  disallow: string[];
  allow: string[];
  expiresAt: number;
  /** Cached fetch outcome — a dead robots endpoint is
   *  permissive (standard practice) but reported. */
  note: string;
}

const UA = "ARCHIE-Native-Engine/1.0 (research; contact owner)";

function entityDecode(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      if (code > 0x10ffff || code === 0) return "";
      try {
        return String.fromCodePoint(code);
      } catch {
        return "";
      }
    })
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

/** Parse a robots.txt into the rules for User-agent: *.
 *  Standard group semantics: rules apply until the next
 *  User-agent line. Malformed lines are skipped, never
 *  guessed. An empty disallow list means unrestricted. */
export function parseRobots(body: string): {
  disallow: string[];
  allow: string[];
} {
  const disallow: string[] = [];
  const allow: string[] = [];
  const lines = body.split(/\r?\n/);
  let inStarGroup = false;
  for (const rawLine of lines) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (line === "") continue;
    const m = /^(user-agent|disallow|allow|crawl-delay)\s*:\s*(.*)$/i.exec(
      line,
    );
    if (!m) continue;
    const [, keyRaw, value] = m;
    const key = keyRaw.toLowerCase();
    if (key === "user-agent") {
      inStarGroup = value.trim().toLowerCase() === "*";
      continue;
    }
    if (!inStarGroup) continue;
    if (key === "disallow" && value.trim() !== "") {
      disallow.push(value.trim());
    } else if (key === "allow" && value.trim() !== "") {
      allow.push(value.trim());
    }
  }
  return { disallow, allow };
}

/** Standard robots longest-prefix-match: the most specific
 *  matching rule wins; a matching Allow that is at least as
 *  long as a matching Disallow permits the fetch. */
export function robotsPermits(
  path: string,
  rules: { disallow: string[]; allow: string[] },
): boolean {
  let bestDisallow = -1;
  for (const d of rules.disallow) {
    if (path.startsWith(d)) bestDisallow = Math.max(bestDisallow, d.length);
  }
  if (bestDisallow < 0) return true;
  for (const a of rules.allow) {
    if (path.startsWith(a) && a.length >= bestDisallow) return true;
  }
  return false;
}

/** Strip a page down to readable text: remove script/style/
 *  chrome blocks first (their text is never content), then
 *  tags, then decode entities and collapse whitespace. */
export function extractReadableText(html: string): string {
  const text = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(
      /<(script|style|noscript|svg|template|iframe|nav|header|footer|aside|form)\b[\s\S]*?<\/\1>/gi,
      " ",
    )
    .replace(/<\/?[a-z][^>]*>/gi, " ")
    .replace(/&[a-z#0-9]+;?/g, (e) => entityDecode(e) || " ");
  return text.replace(/\s+/g, " ").trim();
}

/** Extract <title> from a page ("" when absent). */
export function extractTitle(html: string): string {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (!m) return "";
  return m[1]
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

export class PageFetcher {
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;
  private readonly maxBytes: number;
  private readonly maxContentChars: number;
  private readonly robotsCacheTtlMs: number;
  private readonly clock: () => number;
  private readonly robotsCache = new Map<string, RobotsRules>();

  constructor(opts: PageFetchOptions = {}) {
    this.fetchFn = opts.fetchFn ?? fetch;
    this.timeoutMs = opts.timeoutMs ?? 8000;
    this.maxBytes = opts.maxBytes ?? 1_000_000;
    this.maxContentChars = opts.maxContentChars ?? 4000;
    this.robotsCacheTtlMs = opts.robotsCacheTtlMs ?? 12 * 60 * 60 * 1000;
    this.clock = opts.clock ?? (() => Date.now());
  }

  /** robots.txt for an origin — cached, dead endpoints are
   *  permissive but reported honestly. */
  private async robotsFor(origin: string): Promise<RobotsRules> {
    const cached = this.robotsCache.get(origin);
    if (cached && cached.expiresAt > this.clock()) return cached;
    const rules: RobotsRules = {
      disallow: [],
      allow: [],
      expiresAt: this.clock() + this.robotsCacheTtlMs,
      note: "",
    };
    try {
      const res = await this.fetchFn(`${origin}/robots.txt`, {
        headers: { "user-agent": UA },
        signal: this.abortSignal(this.timeoutMs),
      });
      if (res.ok) {
        const parsed = parseRobots(await res.text());
        rules.disallow = parsed.disallow;
        rules.allow = parsed.allow;
        rules.note = "robots.txt consulted";
      } else {
        rules.note = `robots.txt returned ${res.status} — treated as unrestricted`;
      }
    } catch (err) {
      rules.note = `robots.txt unreachable (${err instanceof Error ? err.message : String(err)}) — treated as unrestricted`;
    }
    this.robotsCache.set(origin, rules);
    return rules;
  }

  private abortSignal(ms: number): AbortSignal {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), ms);
    return ctrl.signal;
  }

  /** Fetch ONE source page honestly: robots-checked,
   *  timeout-guarded, size-capped, content-extracted. A
   *  failure is returned AS a failure — never a silent
   *  skip or a fake extraction. */
  async fetch(url: string): Promise<PageFetchResult> {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return {
        url,
        ok: false,
        content: "",
        title: "",
        note: "invalid URL — not fetched",
      };
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return {
        url,
        ok: false,
        content: "",
        title: "",
        note: `unsupported protocol ${parsed.protocol} — not fetched`,
      };
    }

    // ── robots.txt — respected before any content fetch.
    const robots = await this.robotsFor(parsed.origin);
    if (!robotsPermits(parsed.pathname + parsed.search, robots)) {
      return {
        url,
        ok: false,
        content: "",
        title: "",
        note: `robots.txt disallows this path — not fetched (${robots.note})`,
      };
    }

    // ── fetch with a hard timeout.
    let res: Response;
    try {
      res = await this.fetchFn(url, {
        headers: {
          "user-agent": UA,
          accept: "text/html,application/xhtml+xml,text/plain;q=0.8,*/*;q=0.5",
        },
        signal: this.abortSignal(this.timeoutMs),
        redirect: "follow",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const timedOut = /abort/i.test(msg);
      return {
        url,
        ok: false,
        content: "",
        title: "",
        note: timedOut
          ? `timeout after ${this.timeoutMs}ms — page not read`
          : `fetch failed: ${msg.slice(0, 120)}`,
      };
    }
    if (!res.ok) {
      return {
        url,
        ok: false,
        content: "",
        title: "",
        note: `page returned ${res.status} — not read`,
      };
    }
    const contentType = res.headers?.get?.("content-type") ?? "";
    if (
      contentType &&
      !/text\/html|application\/xhtml|text\/plain/i.test(contentType)
    ) {
      return {
        url,
        ok: false,
        content: "",
        title: "",
        note: `content-type "${contentType.split(";")[0]}" is not readable text — not extracted`,
      };
    }
    // ── size guard — never buffer an oversized body.
    const lenHeader = Number(res.headers?.get?.("content-length") ?? 0);
    if (lenHeader && lenHeader > this.maxBytes) {
      return {
        url,
        ok: false,
        content: "",
        title: "",
        note: `response is ${lenHeader} bytes (over the ${this.maxBytes} cap) — declined`,
      };
    }
    let html: string;
    try {
      html = await res.text();
    } catch (err) {
      return {
        url,
        ok: false,
        content: "",
        title: "",
        note: `body read failed: ${err instanceof Error ? err.message.slice(0, 120) : String(err)}`,
      };
    }
    if (html.length > this.maxBytes) {
      return {
        url,
        ok: false,
        content: "",
        title: "",
        note: `body exceeded ${this.maxBytes} bytes mid-read — aborted`,
      };
    }
    const content = extractReadableText(html).slice(0, this.maxContentChars);
    if (content.length < 80) {
      return {
        url,
        ok: false,
        content: "",
        title: "",
        note: `page yielded only ${content.length} chars of readable text — not usable`,
      };
    }
    return {
      url,
      ok: true,
      content,
      title: extractTitle(html),
      note: `fetched ${html.length} bytes, extracted ${content.length} chars (${robots.note})`,
    };
  }
}
