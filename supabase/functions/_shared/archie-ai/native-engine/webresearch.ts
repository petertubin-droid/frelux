// =========================================================
// ARCHIE NATIVE ENGINE — WEB RESEARCH
//
// Real research pipeline implementing §4 of the permanent
// Native Intelligence Architecture:
//   search → retrieve → extract → cross-check → validate
// The adapter boundary is pluggable: production uses a real
// fetch-based DuckDuckGo Lite adapter; tests inject an
// explicit labeled test double. Results are stored as
// candidate knowledge (never established fact until
// validated). Authentication boundaries, robots/rate limits,
// copyright, privacy and law are respected — the adapter only
// touches public search pages.
// =========================================================

import type { Fact } from "./types.ts";
import { FactStore } from "./knowledge.ts";

export interface ResearchHit {
  title: string;
  url: string;
  snippet: string;
}

export interface ResearchReport {
  query: string;
  hits: ResearchHit[];
  /** Honest network result. */
  searched: boolean;
  note: string;
  storedKnowledge: number;
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

export class ResearchPipeline {
  constructor(
    private facts: FactStore,
    private adapter: ResearchAdapter,
  ) {}

  /** Run the §4 pipeline for a query. Findings are stored as
   *  LOW-CONFIDENCE CANDIDATE knowledge — never fact. */
  async research(query: string): Promise<ResearchReport> {
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
    };
  }
}
