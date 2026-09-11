// =========================================================
// ARCHIE NATIVE ENGINE — WEB RESEARCH
//
// Real research pipeline implementing §4 of the permanent
// Native Intelligence Architecture:
//   search → retrieve → extract → cross-check → validate
// INTELLIGENT SOURCE SELECTION (2026-09-10 owner directive):
//   understand the question → classify the knowledge domain
//   → select the most appropriate PRIORITY sources
//   → search them FIRST (parallel, site-scoped)
//   → cross-check across independent sources
//   → EARLY STOP when high-confidence agreement is reached
//   → fall back to unrestricted search only when needed
//   → classify and register newly discovered sources
//   → store findings as CANDIDATE knowledge (never fact
//     until validated) with full provenance.
//
// MAXIMUM PRACTICAL SPEED without sacrificing accuracy:
// parallel searches, concurrent retrieval of independent
// sources, result caching with TTL, deduplication, reuse of
// recent findings while still current, fast relevance
// ranking, early stopping. Speed NEVER bypasses
// authentication, robots/rate-limit requirements, terms of
// service, privacy, security controls or copyright — the
// adapter only touches public search pages and never claims
// access that did not happen.
//
// The adapter boundary is pluggable: production uses a real
// fetch-based DuckDuckGo Lite adapter; tests inject an
// explicit labeled test double.
// =========================================================

import type { Fact } from "./types.ts";
import { FactStore } from "./knowledge.ts";
import {
  WebSourceRegistry,
  getWebSourceRegistry,
  type SourceCategory,
  type SourceRecord,
} from "./web-sources.ts";

export interface ResearchHit {
  title: string;
  url: string;
  snippet: string;
  /** Registrable domain of the result — set during ranking. */
  domain?: string;
  /** Extracted PAGE CONTENT (audit Phase 2.2) — set only
   *  when the source page was actually fetched, robots-
   *  checked and content-extracted. Absent = snippet only. */
  content?: string;
}

export interface ResearchReport {
  query: string;
  hits: ResearchHit[];
  /** Honest network result. */
  searched: boolean;
  note: string;
  storedKnowledge: number;
  // --- intelligent source selection (2026-09-10) ---
  /** Knowledge domain the query was classified into. */
  category: SourceCategory | null;
  /** Domains actually searched — never claimed otherwise. */
  sourcesSearched: string[];
  /** ≥2 independent domains agree on the finding. */
  crossChecked: boolean;
  /** Low-agreement cautions between top sources. */
  conflicts: string[];
  /** Answer served from recent findings still in TTL — the
   *  adapter was not called again. */
  reusedCache: boolean;
  /** Searches that ERRORED (honest failure report). */
  sourceFailures: Array<{ domain: string; note: string }>;
  /** New domains classified by the registry this run. */
  discoveredSources: string[];
  // --- real page fetching (audit Phase 2.2) ---
  /** ≥2 independent domains' fetched PAGE CONTENTS agree —
   *  stronger evidence than snippet agreement, raises the
   *  candidate confidence cap. */
  contentCrossChecked: boolean;
  /** Per-page fetch outcomes — honest, never silent. */
  pageFetches: Array<{ url: string; ok: boolean; note: string }>;
}

export interface ResearchAdapter {
  id: string;
  search(query: string): Promise<{ hits: ResearchHit[]; note: string }>;
}

/** Adapter options — injectable for deterministic fixture
 *  tests (CI never depends on the live network). */
export interface DuckDuckGoLiteAdapterOptions {
  /** Retries after a network error, 429 or 5xx (default 2). */
  maxRetries?: number;
  /** Base backoff between retries in ms; doubles per attempt
   *  (default 600). Tests inject 0. */
  baseBackoffMs?: number;
  /** Injectable fetch (tests pass a stub). */
  fetchFn?: typeof fetch;
  /** Injectable sleep for backoff (tests pass a no-op). */
  sleepFn?: (ms: number) => Promise<void>;
}

/** Real adapter: DuckDuckGo Lite HTML endpoint — public,
 *  robots-friendly, no API key, no authentication bypass.
 *
 *  HARDENED (audit phase 8, 2026-09-11):
 *  - quote/order-flexible parser — the live Lite page emits
 *    single-quoted attributes with href before class; the old
 *    double-quote-only regex parsed ZERO hits from real pages
 *    silently. Verified against the live markup.
 *  - HTML drift detection — a 200 response that yields zero
 *    parseable results is classified honestly (layout changed
 *    / genuinely no results) instead of a silent zero-hit
 *    "search completed".
 *  - retry/backoff on network errors, 429 and 5xx. */
export class DuckDuckGoLiteAdapter implements ResearchAdapter {
  readonly id = "duckduckgo-lite";
  private readonly maxRetries: number;
  private readonly baseBackoffMs: number;
  private readonly fetchFn: typeof fetch;
  private readonly sleepFn: (ms: number) => Promise<void>;

  constructor(opts: DuckDuckGoLiteAdapterOptions = {}) {
    this.maxRetries = opts.maxRetries ?? 2;
    this.baseBackoffMs = opts.baseBackoffMs ?? 600;
    this.fetchFn = opts.fetchFn ?? fetch;
    this.sleepFn =
      opts.sleepFn ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  }

  async search(query: string): Promise<{ hits: ResearchHit[]; note: string }> {
    let lastNetworkNote = "";
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      if (attempt > 0) {
        const backoff = this.baseBackoffMs * 2 ** (attempt - 1);
        await this.sleepFn(backoff);
      }
      let res: Response;
      try {
        res = await this.fetchFn("https://lite.duckduckgo.com/lite/", {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
            "user-agent": "ARCHIE-Native-Engine/1.0 (research; contact owner)",
          },
          body: new URLSearchParams({ q: query }).toString(),
        });
      } catch (err) {
        lastNetworkNote = err instanceof Error ? err.message : String(err);
        continue; // retry network errors
      }
      if (res.status === 429 || res.status >= 500) {
        lastNetworkNote = `search endpoint returned ${res.status}`;
        continue; // retry rate-limit and server errors
      }
      if (!res.ok) {
        // Client errors (other than 429) are not retried —
        // the request itself is wrong, not the network.
        return { hits: [], note: `search endpoint returned ${res.status}` };
      }
      const html = await res.text();
      const hits = this.parse(html);
      if (hits.length === 0) {
        // DRIFT DETECTION — zero parsed results is classified
        // honestly, never reported as a silent success.
        const note = this.classifyEmptyParse(html);
        if (note.startsWith("adapter layout changed")) {
          return { hits: [], note }; // drift is structural — retrying won't help
        }
        return { hits: [], note };
      }
      return { hits, note: "search completed" };
    }
    return {
      hits: [],
      note: `network unavailable after ${this.maxRetries + 1} attempt(s): ${lastNetworkNote}`,
    };
  }

  /** Classify a 200 response that parsed to zero hits — the
   *  honest alternative to a silent zero-hit success. */
  classifyEmptyParse(html: string): string {
    const markers =
      (html.match(/class=(["'])result-link\1/gi) ?? []).length +
      (html.match(/class=(["'])result-snippet\1/gi) ?? []).length;
    if (markers > 0) {
      return "adapter layout changed: result markers present but 0 parsed — upstream markup drifted, report this, do not trust the zero-hit result";
    }
    if (/no results/i.test(html)) {
      return "no results found for the query";
    }
    return "adapter layout changed: result page shape unrecognized (0 result markers) — upstream markup drifted, report this, do not trust the zero-hit result";
  }

  /** Parse the Lite result markup (links + snippets).
   *  Attribute matching is quote- and order-flexible: the live
   *  page emits class='result-link' single-quoted with href
   *  before class; drifted pages must not silently yield
   *  zero — see classifyEmptyParse. */
  parse(html: string): ResearchHit[] {
    const hits: ResearchHit[] = [];
    const anchors = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)];
    const links = anchors
      .map((a) => {
        const attrs = a[1];
        const cls = /class=(["'])([^"']*)\1/i.exec(attrs)?.[2] ?? "";
        if (!/\bresult-link\b/.test(cls)) return null;
        const href = /href=(["'])([^"']*)\1/i.exec(attrs)?.[2] ?? "";
        return { href, title: a[2] };
      })
      .filter((x): x is { href: string; title: string } => x !== null);
    const snippets = [
      ...html.matchAll(
        /<t[dh]\b[^>]*class=(["'])result-snippet\1[^>]*>([\s\S]*?)<\/t[dh]>/gi,
      ),
    ];
    for (let i = 0; i < links.length && hits.length < 8; i++) {
      const rawUrl = links[i].href;
      if (!rawUrl) continue;
      const url = rawUrl.startsWith("//") ? `https:${rawUrl}` : rawUrl;
      const isDdgRedirect = url.includes("duckduckgo.com/l/");
      if (isDdgRedirect) continue; // skip wrapped redirects, keep direct results
      const snippet = snippets[i]
        ? snippets[i][2]
            .replace(/<[^>]+>/g, "")
            .replace(/\s+/g, " ")
            .trim()
        : "";
      hits.push({
        title: links[i].title
          .replace(/<[^>]+>/g, "")
          .trim()
          .slice(0, 140),
        url,
        snippet: snippet.slice(0, 300),
      });
    }
    return hits;
  }
}

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------
import { PageFetcher } from "./page-fetch.ts";

const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12h — recent
// findings remain "current" for reuse.

function registrable(host: string): string {
  const labels = host.split(".");
  if (labels.length <= 2) return host;
  const multiPartTlds = ["gov", "ac", "co", "org", "com", "edu"];
  return multiPartTlds.includes(labels[labels.length - 2])
    ? labels.slice(-3).join(".")
    : labels.slice(-2).join(".");
}

/** Salient (stopword-stripped) token set — shared with the
 *  engine for confirmation-target matching. */
export function salientTokens(text: string): Set<string> {
  const stop = new Set([
    "the",
    "and",
    "for",
    "with",
    "that",
    "this",
    "from",
    "are",
    "was",
    "were",
    "has",
    "have",
    "had",
    "not",
    "but",
    "its",
    "his",
    "her",
    "their",
    "they",
    "you",
    "your",
    "our",
    "about",
    "into",
    "also",
    "can",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "one",
    "two",
    "all",
    "any",
    "how",
    "who",
    "what",
    "when",
    "where",
    "which",
  ]);
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9+#.-]+/)
      .filter((w) => w.length > 2 && !stop.has(w)),
  );
}

/** Salient-token Jaccard similarity — the real, cheap
 *  cross-source agreement signal. */
function agreement(a: string, b: string): number {
  const sa = salientTokens(a);
  const sb = salientTokens(b);
  if (sa.size === 0 || sb.size === 0) return 0;
  let shared = 0;
  for (const t of sa) if (sb.has(t)) shared += 1;
  return shared / (sa.size + sb.size - shared);
}

interface ScoredHit {
  hit: ResearchHit;
  score: number;
  overlap: number;
}

export class ResearchPipeline {
  private registry: WebSourceRegistry | null;
  /** Recent findings cache — reuse while still current. */
  private cache = new Map<
    string,
    { report: ResearchReport; expiresAt: number }
  >();

  /** Optional page fetcher (audit Phase 2.2) — when wired,
   *  the top hits are deepened with REAL fetched page content
   *  (robots-checked, timeout-guarded). Absent = snippet-only
   *  legacy behaviour. */
  private readonly facts: FactStore;
  private readonly adapter: ResearchAdapter;
  private readonly pageFetcher: PageFetcher | null;

  constructor(
    facts: FactStore,
    adapter: ResearchAdapter,
    registry?: WebSourceRegistry,
    pageFetcher?: PageFetcher | null,
  ) {
    // Explicit null = legacy single-search mode (backward
    // compatible). The production engine wires the shared
    // priority-source registry.
    this.facts = facts;
    this.adapter = adapter;
    this.registry = registry ?? null;
    this.pageFetcher = pageFetcher ?? null;
  }

  /** Run the §4 pipeline for a query. Findings are stored as
   *  LOW-CONFIDENCE CANDIDATE knowledge — never fact. */
  async research(query: string): Promise<ResearchReport> {
    const trimmed = query.trim();

    // ── CACHE — reuse of recent findings while still current
    const key = trimmed.toLowerCase();
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.report, reusedCache: true };
    }

    // ── LEGACY MODE (no registry wired) — single search,
    //    identical honest behaviour to the original pipeline.
    if (!this.registry) {
      return this.researchLegacy(trimmed);
    }

    // ── INTELLIGENT SOURCE SELECTION ──
    // Understand → classify the domain → pick sources.
    const registry = this.registry;
    const selection = registry.select(trimmed);
    const category = selection.category;

    // ── PRIORITY WAVE — parallel, site-scoped, independent
    //    sources retrieved concurrently (maximum practical
    //    speed). Failures are honest, never fatal.
    const sourcesSearched: string[] = [];
    const sourceFailures: Array<{ domain: string; note: string }> = [];
    const scored: ScoredHit[] = [];
    const queryTokens = salientTokens(trimmed);

    const wave = await Promise.allSettled(
      selection.sources.map((source) =>
        source.accessibility === "restricted"
          ? Promise.resolve({
              hits: [],
              note: "source marked restricted — not searched",
            })
          : this.adapter.search(`${trimmed} site:${source.domain}`),
      ),
    );
    const waveResults = selection.sources.map((source, i) => ({
      source,
      result: wave[i],
    }));
    for (const { source, result } of waveResults) {
      if (result.status === "rejected") {
        sourceFailures.push({
          domain: source.domain,
          note: `search rejected: ${String(result.reason).slice(0, 120)}`,
        });
        continue;
      }
      const { hits, note } = result.value;
      if (
        hits.length === 0 &&
        (note.startsWith("network unavailable") ||
          note.startsWith("adapter layout changed"))
      ) {
        // Adapter drift is as much a failure as a dead network
        // — never counted as a successful search (audit phase 8).
        sourceFailures.push({ domain: source.domain, note });
        continue;
      }
      sourcesSearched.push(source.domain);
      for (const hit of hits) this.rankHit(hit, source, queryTokens, scored);
    }

    // ── CROSS-CHECK + EARLY STOP — if ≥2 independent priority
    //    domains agree, the evidence is sufficient: skip the
    //    fallback wave entirely.
    let crossChecked = this.crossCheckDomains(scored);

    // ── FALLBACK WAVE — only when the priority wave did not
    //    reach cross-validated agreement.
    if (!crossChecked && selection.allowFallback) {
      const unrestricted = await this.adapter
        .search(trimmed)
        .catch((err: unknown) => ({
          hits: [] as ResearchHit[],
          note: `search failed: ${String(err).slice(0, 120)}`,
        }));
      // Honest success check: a zero-hit response from a dead
      // network OR from a drifted page shape is a failure —
      // never claimed as a successful search (audit phase 8).
      const okNote = !(
        unrestricted.hits.length === 0 &&
        (unrestricted.note.startsWith("network unavailable") ||
          unrestricted.note.startsWith("adapter layout changed"))
      );
      if (okNote) {
        sourcesSearched.push("open web (unrestricted query)");
        const discoveredSources: string[] = [];
        for (const hit of unrestricted.hits) {
          // DISCOVERY — classify unseen domains before their
          // content is trusted; never auto-trusted.
          const known = registry.lookup(hit.url);
          let source: SourceRecord;
          if (known) {
            source = known;
          } else {
            source = registry.evaluateDiscovered(hit.url);
            discoveredSources.push(source.domain);
          }
          this.rankHit(hit, source, queryTokens, scored);
        }
        // Re-check agreement after the fallback wave.
        crossChecked = this.crossCheckDomains(scored);
        return this.finish(
          trimmed,
          scored,
          category,
          sourcesSearched,
          crossChecked,
          sourceFailures,
          discoveredSources,
        );
      }
      sourceFailures.push({
        domain: "open web (unrestricted query)",
        note: unrestricted.note,
      });
    }

    return this.finish(
      trimmed,
      scored,
      category,
      sourcesSearched,
      crossChecked,
      sourceFailures,
      [],
    );
  }

  /** Score and insert a hit (dedup by URL). */
  private rankHit(
    hit: ResearchHit,
    source: SourceRecord,
    queryTokens: Set<string>,
    scored: ScoredHit[],
  ): void {
    if (scored.some((s) => s.hit.url === hit.url)) return;
    const snippetTokens = salientTokens(`${hit.title} ${hit.snippet}`);
    let overlap = 0;
    for (const t of queryTokens) if (snippetTokens.has(t)) overlap += 1;
    // Relevance + authority + reliability + trust status.
    let score = overlap * 1.5 + (9 - source.authorityLevel) * 0.4;
    score += source.reliability * 1.0;
    if (source.status === "evaluating") score -= 0.5; // discovered sources rank lower until evaluated
    // Domain label: a known registry source (exact seed match,
    // e.g. attack.mitre.org or pubmed.ncbi.nlm.nih.gov) wins
    // over the crude registrable-domain heuristic.
    const domain =
      this.registry?.lookup(hit.url)?.domain ??
      (() => {
        try {
          return registrable(new URL(hit.url).hostname);
        } catch {
          return source.domain;
        }
      })();
    scored.push({ hit: { ...hit, domain }, score, overlap });
  }

  /** Cross-source agreement: ≥2 distinct domains whose best
   *  snippets share meaningful salient content. */
  private crossCheckDomains(scored: ScoredHit[]): boolean {
    const byDomain = new Map<string, ScoredHit>();
    for (const s of scored) {
      const d = s.hit.domain ?? "";
      const prev = byDomain.get(d);
      if (!prev || s.score > prev.score) byDomain.set(d, s);
    }
    const top = [...byDomain.values()].sort((a, b) => b.score - a.score);
    if (top.length < 2) return false;
    const sim = agreement(
      `${top[0].hit.title} ${top[0].hit.snippet}`,
      `${top[1].hit.title} ${top[1].hit.snippet}`,
    );
    return sim >= 0.15;
  }

  /** Store candidates + build the honest report. */
  private async finish(
    query: string,
    scored: ScoredHit[],
    category: SourceCategory,
    sourcesSearched: string[],
    crossChecked: boolean,
    sourceFailures: Array<{ domain: string; note: string }>,
    discoveredSources: string[],
  ): Promise<ResearchReport> {
    scored.sort((a, b) => b.score - a.score);
    // Deduplicate by domain — diverse sources beat one loud
    // domain. Keep at most 2 hits per domain.
    const perDomain = new Map<string, number>();
    const hits: ResearchHit[] = [];
    for (const s of scored) {
      const d = s.hit.domain ?? "";
      const n = perDomain.get(d) ?? 0;
      if (n < 2) {
        perDomain.set(d, n + 1);
        hits.push(s.hit);
      }
    }

    // CONFLICTS — top hits from ≥2 domains with LOW
    // agreement: uncertainty is reported, never smoothed over.
    const conflicts: string[] = [];
    if (hits.length >= 2 && !crossChecked) {
      const domains = [...new Set(hits.map((h) => h.domain ?? ""))];
      if (domains.length >= 2) {
        conflicts.push(
          `sources do not yet agree — treat findings from ${domains.slice(0, 3).join(", ")} with caution until validated`,
        );
      }
    }

    // ── DEEPEN (audit Phase 2.2) — fetch the actual source
    //    pages behind the top hits: robots-checked, timeout-
    //    guarded, content-extracted. A fetched page is a MUCH
    //    stronger evidence object than a search snippet; when
    //    two independent domains' PAGE CONTENTS agree, the
    //    candidate confidence cap rises (still candidate —
    //    never validated knowledge). Failures are recorded
    //    honestly, never silently skipped.
    const pageFetches: Array<{ url: string; ok: boolean; note: string }> = [];
    let contentCrossChecked = false;
    if (this.pageFetcher && hits.length > 0) {
      // Distinct domains first — diverse evidence beats one
      // loud domain; at most 3 pages per query.
      const deepenTargets: typeof hits = [];
      const seenDomains = new Set<string>();
      for (const h of hits) {
        const d = h.domain ?? "";
        if (seenDomains.has(d)) continue;
        seenDomains.add(d);
        deepenTargets.push(h);
        if (deepenTargets.length >= 3) break;
      }
      const results = await Promise.all(
        deepenTargets.map((h) => this.pageFetcher!.fetch(h.url)),
      );
      for (let i = 0; i < results.length; i += 1) {
        const r = results[i];
        pageFetches.push({ url: r.url, ok: r.ok, note: r.note });
        if (r.ok) deepenTargets[i].content = r.content;
      }
      // Content cross-check: best page of each of ≥2 distinct
      // fetched domains, salient-token agreement on CONTENT.
      const fetched = deepenTargets.filter((h) => h.content);
      const byDomain = new Map<string, string>();
      for (const h of fetched) {
        const d = h.domain ?? "";
        const prev = byDomain.get(d);
        if (prev === undefined || h.content!.length > prev.length) {
          byDomain.set(d, h.content!);
        }
      }
      if (byDomain.size >= 2) {
        const [a, b] = [...byDomain.values()].slice(0, 2);
        contentCrossChecked = agreement(a, b) >= 0.15;
      }
    }
    if (contentCrossChecked) crossChecked = true;

    let stored = 0;
    const registry = this.registry!;
    for (const hit of hits.slice(0, 4)) {
      const record =
        registry.lookup(hit.url) ?? registry.evaluateDiscovered(hit.url);
      // Evidence text: fetched PAGE CONTENT when the page was
      // actually read, otherwise the snippet. Overlap is capped
      // so a huge page cannot buy confidence by length alone.
      const evidenceText = hit.content ?? `${hit.title} ${hit.snippet}`;
      const overlap = Math.min(
        10,
        salientTokens(query).size
          ? [...salientTokens(evidenceText)].filter((t) =>
              salientTokens(query).has(t),
            ).length
          : 0,
      );
      // Confidence cap: content agreement across independent
      // pages (0.6) outranks snippet agreement (0.45) — still
      // candidate knowledge, never validated.
      const confidence = Math.min(
        contentCrossChecked ? 0.6 : 0.45,
        0.15 +
          overlap * 0.03 +
          (crossChecked ? 0.1 : 0) +
          (contentCrossChecked ? 0.15 : 0) +
          (9 - record.authorityLevel) * 0.02,
      );
      // KNOWLEDGE CLASSIFICATION — full metadata into memory:
      // domain, category, authority, timestamp, provenance.
      await this.facts.assert({
        subject: query,
        predicate: "web-finding",
        object: { title: hit.title, snippet: hit.snippet, url: hit.url },
        confidence,
        provenance: {
          source: "web-research",
          note:
            `candidate finding from ${hit.domain} — pending validation · ` +
            (hit.content
              ? "page content FETCHED and extracted (deep evidence) · "
              : "snippet only (page not fetched) · ") +
            `category: ${record.category} · authority ${record.authorityLevel}/8 · ` +
            `registry status: ${record.status} · retrieved ${new Date().toISOString()}`,
        },
        status: "candidate",
      });
      stored += 1;
    }

    const report: ResearchReport = {
      query,
      hits,
      searched: sourcesSearched.length > 0,
      note:
        sourcesSearched.length > 0
          ? `searched ${sourcesSearched.length} source(s): ${sourcesSearched.join(", ")}`
          : "no search executed successfully",
      storedKnowledge: stored,
      category,
      sourcesSearched,
      crossChecked,
      conflicts,
      reusedCache: false,
      sourceFailures,
      discoveredSources,
      contentCrossChecked,
      pageFetches,
    };

    // CACHE the report for reuse while still current.
    this.cache.set(query.toLowerCase(), {
      report,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return report;
  }

  /** Legacy single-search path — used when no registry is
   *  wired (backward compatible, still honest). */
  private async researchLegacy(query: string): Promise<ResearchReport> {
    const { hits, note } = await this.adapter.search(query);
    let stored = 0;
    for (const hit of hits.slice(0, 4)) {
      // Cross-check signal: a snippet that repeats the query terms.
      const overlap = query
        .toLowerCase()
        .split(/\s+/)
        .filter(
          (w) => w.length > 2 && hit.snippet.toLowerCase().includes(w),
        ).length;
      const confidence = Math.min(0.45, 0.15 + overlap * 0.05);
      await this.facts.assert({
        subject: query,
        predicate: "web-finding",
        object: { title: hit.title, snippet: hit.snippet, url: hit.url },
        confidence,
        provenance: {
          source: "web-research",
          note: `candidate finding from ${hit.url} — pending validation`,
        },
        status: "candidate",
      });
      stored += 1;
    }
    return {
      query,
      hits,
      searched: true,
      note,
      storedKnowledge: stored,
      category: null,
      // Legacy mode ran one unrestricted query — reported
      // honestly as exactly that.
      sourcesSearched: ["open web (unrestricted query)"],
      crossChecked: false,
      conflicts: [],
      reusedCache: false,
      sourceFailures: [],
      discoveredSources: [],
      // Legacy mode never deepens — reported honestly.
      contentCrossChecked: false,
      pageFetches: [],
    };
  }
}
