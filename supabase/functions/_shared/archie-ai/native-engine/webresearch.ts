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
}

export interface ResearchAdapter {
  id: string;
  search(query: string): Promise<{ hits: ResearchHit[]; note: string }>;
}

/** Real adapter: DuckDuckGo Lite HTML endpoint — public,
 *  robots-friendly, no API key, no authentication bypass. */
export class DuckDuckGoLiteAdapter implements ResearchAdapter {
  readonly id = "duckduckgo-lite";

  async search(query: string): Promise<{ hits: ResearchHit[]; note: string }> {
    try {
      const res = await fetch("https://lite.duckduckgo.com/lite/", {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "user-agent": "ARCHIE-Native-Engine/1.0 (research; contact owner)",
        },
        body: new URLSearchParams({ q: query }).toString(),
      });
      if (!res.ok) {
        return { hits: [], note: `search endpoint returned ${res.status}` };
      }
      const html = await res.text();
      return { hits: this.parse(html), note: "search completed" };
    } catch (err) {
      return {
        hits: [],
        note: `network unavailable: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  /** Parse the minimal Lite result markup (links + snippets). */
  parse(html: string): ResearchHit[] {
    const hits: ResearchHit[] = [];
    const linkRe =
      /<a[^>]+class="result-link"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    const snippetRe = /<td[^>]*class="result-snippet"[^>]*>([\s\S]*?)<\/td>/gi;
    const links = [...html.matchAll(linkRe)];
    const snippets = [...html.matchAll(snippetRe)];
    for (let i = 0; i < links.length && hits.length < 8; i++) {
      const rawUrl = links[i][1];
      const url = rawUrl.startsWith("//") ? `https:${rawUrl}` : rawUrl;
      const isDdgRedirect = url.includes("duckduckgo.com/l/");
      if (isDdgRedirect) continue; // skip wrapped redirects, keep direct results
      const snippet = snippets[i]
        ? snippets[i][1]
            .replace(/<[^>]+>/g, "")
            .replace(/\s+/g, " ")
            .trim()
        : "";
      hits.push({
        title: links[i][2]
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

  constructor(
    private facts: FactStore,
    private adapter: ResearchAdapter,
    registry?: WebSourceRegistry,
  ) {
    // Explicit null = legacy single-search mode (backward
    // compatible). The production engine wires the shared
    // priority-source registry.
    this.registry = registry ?? null;
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
      if (hits.length === 0 && note.startsWith("network unavailable")) {
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
      const okNote = !(
        unrestricted.hits.length === 0 &&
        unrestricted.note.startsWith("network unavailable")
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

    let stored = 0;
    const registry = this.registry!;
    for (const hit of hits.slice(0, 4)) {
      const record =
        registry.lookup(hit.url) ?? registry.evaluateDiscovered(hit.url);
      const overlap = salientTokens(query).size
        ? [...salientTokens(`${hit.title} ${hit.snippet}`)].filter((t) =>
            salientTokens(query).has(t),
          ).length
        : 0;
      const confidence = Math.min(
        0.45,
        0.15 +
          overlap * 0.03 +
          (crossChecked ? 0.1 : 0) +
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
    };
  }
}
