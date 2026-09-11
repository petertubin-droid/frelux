import { describe, expect, it } from "vitest";
// =========================================================
// REAL PAGE FETCHING (audit Phase 2.2): robots.txt
// compliance, hard timeouts, size caps, content extraction,
// and the research pipeline's deepening — fetched page
// content agreeing across independent domains raises the
// candidate confidence cap; every failure is honest, never
// silent. All network is stubbed — CI never touches the
// live web.
// =========================================================

import {
  PageFetcher,
  extractReadableText,
  parseRobots,
  robotsPermits,
} from "@studio-shared/archie-ai/native-engine/page-fetch.ts";
import { FactStore } from "@studio-shared/archie-ai/native-engine/knowledge.ts";
import {
  ResearchAdapter,
  ResearchHit,
  ResearchPipeline,
} from "@studio-shared/archie-ai/native-engine/webresearch.ts";
import { WebSourceRegistry } from "@studio-shared/archie-ai/native-engine/web-sources.ts";

// ---------------------------------------------------------
// robots.txt parsing
// ---------------------------------------------------------
describe("parseRobots", () => {
  it("reads the User-agent: * group and ignores other agents' rules", () => {
    const rules = parseRobots(
      [
        "User-agent: Googlebot",
        "Disallow: /private",
        "",
        "User-agent: *",
        "Disallow: /admin",
        "Disallow: /tmp/",
        "Allow: /tmp/public",
        "",
        "User-agent: bingbot",
        "Disallow: /hidden",
      ].join("\n"),
    );
    expect(rules.disallow).toEqual(["/admin", "/tmp/"]);
    expect(rules.allow).toEqual(["/tmp/public"]);
  });

  it("an empty star group (empty Disallow) means unrestricted", () => {
    const rules = parseRobots("User-agent: *\nDisallow:\n");
    expect(rules.disallow).toEqual([]);
  });

  it("robotsPermits: longest-prefix match, Allow can override Disallow", () => {
    const rules = { disallow: ["/tmp/"], allow: ["/tmp/public"] };
    expect(robotsPermits("/tmp/public/x", rules)).toBe(true);
    expect(robotsPermits("/tmp/private/x", rules)).toBe(false);
    expect(robotsPermits("/other", rules)).toBe(true);
  });
});

// ---------------------------------------------------------
// content extraction
// ---------------------------------------------------------
describe("extractReadableText", () => {
  it("removes script/style/chrome and decodes entities", () => {
    const html = [
      "<html><head><title>T</title><style>.a{color:red}</style></head>",
      "<body><nav>menu junk</nav><script>var x = 1;</script>",
      "<p>Compressive strength of concrete &amp; curing&nbsp;time</p>",
      "<!-- a comment -->",
      "</body></html>",
    ].join("");
    const text = extractReadableText(html);
    expect(text).toContain("Compressive strength of concrete & curing time");
    expect(text).not.toMatch(/var x|color:red|menu junk|a comment/);
  });
});

// ---------------------------------------------------------
// PageFetcher — honest outcomes, robots, timeout, size
// ---------------------------------------------------------
/** Route a stubbed fetchFn: robots.txt requests resolve from
 *  the map; everything else falls through to the page
 *  handler. */
function stubFetch(
  robotsBodies: Record<string, string | (() => Response)>,
  pageHandler: (url: string) => Response | Promise<Response>,
): typeof fetch {
  return (async (input: any, init?: any) => {
    const url = String(input instanceof URL ? input : input);
    const robotsMatch = /^https?:\/\/[^/]+\/robots\.txt$/.exec(url);
    if (robotsMatch) {
      const body = robotsBodies[url];
      if (typeof body === "function") return body();
      if (body === undefined) {
        return new Response("User-agent: *\nDisallow:\n", { status: 200 });
      }
      return new Response(body, { status: 200 });
    }
    return pageHandler(url);
  }) as unknown as typeof fetch;
}

describe("PageFetcher", () => {
  it("does NOT fetch a robots-disallowed path — the refusal is in the note", async () => {
    const fetcher = new PageFetcher({
      fetchFn: stubFetch(
        {
          "https://example.com/robots.txt":
            "User-agent: *\nDisallow: /private/\n",
        },
        () => {
          throw new Error("page fetch must not happen");
        },
      ),
    });
    const result = await fetcher.fetch("https://example.com/private/doc");
    expect(result.ok).toBe(false);
    expect(result.note).toMatch(/robots\.txt disallows/);
  });

  it("reports a timeout honestly, never a fake extraction", async () => {
    const fetcher = new PageFetcher({
      timeoutMs: 30,
      fetchFn: (async (_input: any, init: any) => {
        return await new Promise((_resolve, reject) => {
          init.signal.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        });
      }) as unknown as typeof fetch,
    });
    const result = await fetcher.fetch("https://slow.example.com/page");
    expect(result.ok).toBe(false);
    expect(result.note).toMatch(/timeout after 30ms/);
    expect(result.content).toBe("");
  });

  it("declines an oversized response before reading it", async () => {
    const fetcher = new PageFetcher({
      maxBytes: 1000,
      fetchFn: stubFetch({}, () => {
        throw new Error(
          "must not be reached — robots allow-all, then size guard",
        );
      }),
    });
    // robots fetch is stubbed; the page handler must serve the
    // oversized header — override after robots: use a raw fn.
    const fn = (async (input: any) => {
      const url = String(input);
      if (url.endsWith("/robots.txt")) {
        return new Response("User-agent: *\nDisallow:\n", { status: 200 });
      }
      return new Response("", {
        status: 200,
        headers: { "content-length": "999999", "content-type": "text/html" },
      });
    }) as unknown as typeof fetch;
    const result = await new PageFetcher({ maxBytes: 1000, fetchFn: fn }).fetch(
      "https://big.example.com/page",
    );
    expect(result.ok).toBe(false);
    expect(result.note).toMatch(/over the 1000 cap/);
    expect(fetcher).toBeTruthy();
  });

  it("extracts readable content from a real HTML page", async () => {
    const fn = (async (input: any) => {
      const url = String(input);
      if (url.endsWith("/robots.txt")) {
        return new Response("User-agent: *\nDisallow:\n", { status: 200 });
      }
      return new Response(
        "<html><head><title>Curing Guide</title></head><body>" +
          "<script>bad()</script><p>Concrete cures properly over 28 days with moisture control, keeping the surface damp so the cement hydration reaction continues and the slab reaches its specified design strength.</p></body></html>",
        {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        },
      );
    }) as unknown as typeof fetch;
    const result = await new PageFetcher({ fetchFn: fn }).fetch(
      "https://guide.example.com/curing",
    );
    expect(result.ok).toBe(true);
    expect(result.content).toContain("Concrete cures properly over 28 days");
    expect(result.content).not.toContain("bad()");
    expect(result.title).toBe("Curing Guide");
    expect(result.note).toMatch(/robots\.txt consulted/);
  });

  it("refuses non-text content types honestly", async () => {
    const fn = (async (input: any) => {
      const url = String(input);
      if (url.endsWith("/robots.txt")) {
        return new Response("User-agent: *\nDisallow:\n", { status: 200 });
      }
      return new Response("%PDF-1.4", {
        status: 200,
        headers: { "content-type": "application/pdf" },
      });
    }) as unknown as typeof fetch;
    const result = await new PageFetcher({ fetchFn: fn }).fetch(
      "https://example.com/doc.pdf",
    );
    expect(result.ok).toBe(false);
    expect(result.note).toMatch(/not readable text/);
  });
});

// ---------------------------------------------------------
// Pipeline deepening — content agreement raises the cap
// ---------------------------------------------------------
class ScriptedAdapter implements ResearchAdapter {
  readonly id = "scripted";
  queries: string[] = [];
  constructor(
    private run: (q: string) => { hits: ResearchHit[]; note: string },
  ) {}
  async search(query: string): Promise<{ hits: ResearchHit[]; note: string }> {
    this.queries.push(query);
    return this.run(query);
  }
}

describe("research pipeline page deepening", () => {
  const AGREEING_BODY = (domain: string) =>
    `<html><body><p>Site ${domain}: Concrete curing requires moisture retention for 28 days to reach design strength and prevent cracking in the slab surface.</p></body></html>`;

  function deepeningFetcher(): typeof fetch {
    return (async (input: any) => {
      const url = String(input);
      if (url.endsWith("/robots.txt")) {
        return new Response("User-agent: *\nDisallow:\n", { status: 200 });
      }
      const m = /^https?:\/\/([a-z0-9.-]+)\//.exec(url);
      const domain = m?.[1] ?? "unknown";
      return new Response(AGREEING_BODY(domain), {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    }) as unknown as typeof fetch;
  }

  it("fetches top hits, cross-checks CONTENT, and stores higher-confidence candidates", async () => {
    const store = new FactStore();
    const adapter = new ScriptedAdapter((query) => {
      const domain = query.match(/site:([a-z.]+)/)?.[1] ?? "unknown.org";
      return {
        hits: [
          {
            title: "Concrete curing guide",
            url: `https://${domain}/curing`,
            snippet: "Concrete curing moisture.",
          },
        ],
        note: "search completed",
      };
    });
    const pipeline = new ResearchPipeline(
      store,
      adapter,
      new WebSourceRegistry(),
      new PageFetcher({ fetchFn: deepeningFetcher() }),
    );
    const report = await pipeline.research("concrete curing best practices");

    expect(report.pageFetches.length).toBeGreaterThan(0);
    expect(report.pageFetches.every((f) => f.ok)).toBe(true);
    expect(report.contentCrossChecked).toBe(true);
    expect(report.crossChecked).toBe(true);
    // The deepened hits carry real extracted content.
    expect(report.hits[0].content ?? "").toContain("moisture retention");
    // The stored candidate's confidence reflects the raised
    // cap — still candidate, never validated.
    const stored = store.list().filter((f) => f.status === "candidate");
    expect(stored.length).toBeGreaterThan(0);
    expect(stored[0].confidence).toBeGreaterThan(0.45);
    expect(stored[0].confidence).toBeLessThanOrEqual(0.6);
    expect(stored[0].provenance.note).toMatch(/page content FETCHED/);
  });

  it("reports failed page fetches honestly and does not claim content agreement", async () => {
    const store = new FactStore();
    const adapter = new ScriptedAdapter((query) => {
      const domain = query.match(/site:([a-z.]+)/)?.[1] ?? "unknown.org";
      return {
        hits: [
          {
            title: "Concrete curing guide",
            url: `https://${domain}/curing`,
            snippet: "Concrete curing moisture.",
          },
        ],
        note: "search completed",
      };
    });
    const failingFetcher = (async (input: any) => {
      const url = String(input);
      if (url.endsWith("/robots.txt")) {
        return new Response("User-agent: *\nDisallow:\n", { status: 200 });
      }
      return new Response("gone", { status: 404 });
    }) as unknown as typeof fetch;
    const pipeline = new ResearchPipeline(
      store,
      adapter,
      new WebSourceRegistry(),
      new PageFetcher({ fetchFn: failingFetcher }),
    );
    const report = await pipeline.research("concrete curing best practices");

    expect(report.pageFetches.length).toBeGreaterThan(0);
    expect(report.pageFetches.every((f) => !f.ok)).toBe(true);
    expect(report.pageFetches[0].note).toMatch(/404/);
    expect(report.contentCrossChecked).toBe(false);
    // No hit carries fake content.
    expect(report.hits.every((h) => h.content === undefined)).toBe(true);
  });

  it("respects robots.txt on the DEEPENING fetch — the page is never read", async () => {
    const store = new FactStore();
    const adapter = new ScriptedAdapter((query) => {
      const domain = query.match(/site:([a-z.]+)/)?.[1] ?? "unknown.org";
      return {
        hits: [
          {
            title: "Concrete curing guide",
            url: `https://${domain}/curing`,
            snippet: "Concrete curing moisture.",
          },
        ],
        note: "search completed",
      };
    });
    const robotsGuardedFetcher = (async (input: any) => {
      const url = String(input);
      if (url.endsWith("/robots.txt")) {
        return new Response("User-agent: *\nDisallow: /\n", { status: 200 });
      }
      throw new Error("page fetch must not happen when robots disallows");
    }) as unknown as typeof fetch;
    const pipeline = new ResearchPipeline(
      store,
      adapter,
      new WebSourceRegistry(),
      new PageFetcher({ fetchFn: robotsGuardedFetcher }),
    );
    const report = await pipeline.research("concrete curing best practices");
    expect(report.pageFetches.length).toBeGreaterThan(0);
    expect(report.pageFetches[0].ok).toBe(false);
    expect(report.pageFetches[0].note).toMatch(/robots\.txt disallows/);
    expect(report.contentCrossChecked).toBe(false);
  });
});
