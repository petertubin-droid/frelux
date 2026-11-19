/**
 * Guards the copy a search result shows, and the redirects that decide which
 * URL earns the click.
 *
 * Two failure modes are pinned here, both of which were live before this file
 * existed: a title longer than the ~60 characters a result displays (so the
 * part that earns the click is cut off), and a description that either runs
 * past ~158 characters or is too thin to say what the tool returns. The four
 * calculators that the build sitemap advertised at priority 0.9 while serving
 * an empty shell are pinned too, because a sitemap entry is a promise that the
 * URL has content.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { CONSTRUCTION_TOOLS } from "@/config/construction-tools";
import {
  ALIASES,
  HOW_MANY,
  NOT_A_QUANTITY,
} from "../../../scripts/lib/how-many.mjs";
import { loadToolRegistry } from "../../../scripts/lib/tool-registry.mjs";
import {
  toolSeoTitle,
  toolSeoDescription,
} from "../../../scripts/lib/tool-seo.mjs";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

const prerenderSrc = read("scripts/prerender.mjs");
const sitemapFnSrc = read("netlify/functions/sitemap.js");
const tomlSrc = read("netlify.toml");

type Route = { path: string; title: string; description: string };

/** Route objects written literally in the prerender catalogue. */
function prerenderedRoutes(): Route[] {
  const out: Route[] = [];
  const re =
    /path:\s*"(\/[^"]*)",\s*\n\s*title:\s*\n?\s*"((?:[^"\\]|\\.)*)",\s*\n\s*description:\s*\n?\s*"((?:[^"\\]|\\.)*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(prerenderSrc))) {
    out.push({ path: m[1], title: m[2], description: m[3] });
  }
  return out;
}

const routes = prerenderedRoutes();
const CALCULATOR =
  /calculator|estimator|takeoff|boq|tools\/|prices|reinforcement|flooring|foundation|plumbing|electrical|waterproofing|masonry|screeding/;
const calculators = routes.filter((r) => CALCULATOR.test(r.path));

type Tool = Parameters<typeof toolSeoTitle>[0];

const tools = loadToolRegistry() as Tool[];
const toolPaths = new Set(tools.map((t) => t.path));
/** Routes whose copy is hand-written because no registry entry owns them. */
const curatedRoutes = routes.filter((r) => !toolPaths.has(r.path));

describe("search listing copy", () => {
  it("parses the prerendered catalogue", () => {
    expect(routes.length).toBeGreaterThan(150);
    expect(tools.length).toBeGreaterThan(70);
  });

  it("keeps every tool title inside the displayed width", () => {
    const tooLong = tools
      .map((t) => ({ path: t.path, title: toolSeoTitle(t) }))
      .filter((x) => x.title.length > 62)
      .map((x) => `${x.path}: ${x.title.length} chars`);
    expect(tooLong).toEqual([]);
  });

  it("writes a description that says what the tool returns", () => {
    const bad = tools
      .map((t) => ({ path: t.path, d: toolSeoDescription(t) }))
      .filter((x) => x.d.length < 100 || x.d.length > 158)
      .map((x) => `${x.path}: ${x.d.length} chars`);
    expect(bad).toEqual([]);
  });

  it("gives every listing its own title and description", () => {
    const titles = tools.map((t) => toolSeoTitle(t));
    const descriptions = tools.map((t) => toolSeoDescription(t));
    expect(titles.filter((t, i) => titles.indexOf(t) !== i)).toEqual([]);
    expect(
      descriptions.filter((d, i) => descriptions.indexOf(d) !== i),
    ).toEqual([]);
  });

  it("keeps hand-written calculator copy inside the same limits", () => {
    // Informational pages (learn articles, standards, market intelligence) are
    // their own pass: this guard covers the calculator surfaces a "how many"
    // search lands on.
    const bad = curatedRoutes
      .filter((r) => CALCULATOR.test(r.path))
      .filter(
        (r) =>
          r.title.length > 62 ||
          r.description.length < 100 ||
          r.description.length > 158,
      )
      .map(
        (r) =>
          `${r.path}: title ${r.title.length}, desc ${r.description.length}`,
      );
    expect(bad).toEqual([]);
  });

  it("never lists the same title twice across the catalogue", () => {
    const all = [
      ...tools.map((t) => toolSeoTitle(t)),
      ...curatedRoutes.map((r) => r.title),
    ];
    expect(all.filter((t, i) => all.indexOf(t) !== i)).toEqual([]);
  });
});

describe("calculators the sitemap advertises", () => {
  // Each of these was listed at priority 0.9 with no prerendered HTML, so a
  // crawler that followed the sitemap got the bare SPA shell.
  const late = [
    "/fence-block-calculator",
    "/german-floor-calculator",
    "/renovation-estimator",
    "/window-blind-calculator",
  ];

  it("is prerendered, with a title, a description and schema", () => {
    for (const path of late) {
      const tool = tools.find((t) => t.path === path);
      expect(tool, `${path} is not in the tool registry`).toBeTruthy();
      expect(toolSeoTitle(tool!).length).toBeLessThanOrEqual(62);
      expect(toolSeoDescription(tool!).length).toBeGreaterThanOrEqual(100);
    }
    const pushed = prerenderSrc.slice(
      prerenderSrc.indexOf("const late = ["),
      prerenderSrc.indexOf("// FAQ surfaces"),
    );
    for (const path of late) {
      expect(pushed).toContain(path);
    }
    expect(pushed).toContain('"@type": "WebApplication"');
    expect(pushed).toContain('"@type": "BreadcrumbList"');
  });

  it("is listed in the live sitemap function", () => {
    for (const path of late) {
      expect(sitemapFnSrc).toContain(`"${path}/"`);
    }
  });

  it("has a static body so the page is readable without JavaScript", async () => {
    const { seoContentMap } =
      (await import("../../../scripts/seo-content-map.mjs")) as {
        seoContentMap: Record<string, string>;
      };
    for (const path of late) {
      const body = seoContentMap[path];
      expect(body, `${path} has no noscript body`).toBeTruthy();
      expect(body.length).toBeGreaterThan(600);
      expect(body).toContain("<h1>");
    }
  });
});

describe("alias consolidation", () => {
  // A slug answered with 200 and then a client-side <Navigate> competes with
  // the real calculator for the same query. Each must be a 301 to the
  // canonical page instead.
  const aliases: Array<[string, string]> = [
    ["/tools/finishes/paint", "/paint-calculator"],
    ["/tools/structure/foundation", "/foundation-calculator"],
    ["/tools/project/boq", "/boq-generator"],
    ["/borehole-estimator", "/borehole-water-system-estimator"],
    ["/price-index", "/material-price-index"],
    ["/prices/regional-indices", "/regional-cost-index"],
  ];

  it("permanently redirects to the canonical calculator", () => {
    for (const [from, to] of aliases) {
      const block = new RegExp(
        `from = "${from}/?"\\n  to = "${to}/"\\n  status = 301`,
      );
      expect(block.test(tomlSrc), `${from} is not a 301 to ${to}`).toBe(true);
    }
  });

  it("never redirects a path that is itself prerendered", () => {
    const prerendered = new Set(routes.map((r) => r.path));
    const conflicting = aliases.filter(([from]) => prerendered.has(from));
    expect(conflicting).toEqual([]);
  });
});

describe("the how-many answer every tool owes a search", () => {
  const toolPaths = CONSTRUCTION_TOOLS.map((t) => t.to);

  it("gives every tool a question, or says why it has none", () => {
    const unanswered = toolPaths.filter(
      (p) => !HOW_MANY[p] && !NOT_A_QUANTITY[p],
    );
    expect(unanswered).toEqual([]);
  });

  it("answers on every calculator route the build emits", () => {
    const emitted = [...prerenderSrc.matchAll(/path:\s*"(\/[^"]*)"/g)].map(
      (m) => m[1],
    );
    const calculatorLike = [...new Set(emitted)].filter((p) =>
      /calculator|estimator|takeoff|prices|price-index|boq|quote|cost|converter|index|planner|timeline|advisor|reference|diagnosis|assessment|preview|assistant|refresh|certificate|credit|footprint|reuse|vision|sync|import/.test(
        p,
      ),
    );
    const silent = calculatorLike.filter(
      (p) => !HOW_MANY[p] && !NOT_A_QUANTITY[p],
    );
    expect(silent).toEqual([]);
  });

  it("answers only for pages the build actually emits", () => {
    const emitted = new Set(
      [...prerenderSrc.matchAll(/path:\s*"(\/[^"]*)"/g)].map((m) => m[1]),
    );
    // A registry tool is a real page even when its route is built rather than
    // written as a literal, so both sources count.
    const strays = Object.keys(HOW_MANY).filter(
      (p) => !emitted.has(p) && !toolPaths.includes(p),
    );
    expect(strays).toEqual([]);
  });

  it("asks a quantity question, and asks each one once", () => {
    const questions = Object.entries(HOW_MANY)
      .filter(([path]) => !ALIASES[path])
      .map(([, v]) => v.q);
    const odd = questions.filter((q) => !/^(How |What size )/.test(q));
    expect(odd).toEqual([]);
    const repeated = questions.filter((q, i, all) => all.indexOf(q) !== i);
    expect(repeated).toEqual([]);
  });

  it("answers in the first sentence, without a currency or a market baked in", () => {
    const bad = Object.entries(HOW_MANY).flatMap(([path, v]) => {
      const problems: string[] = [];
      if (v.a.length < 90 || v.a.length > 320) {
        problems.push(`${path}: ${v.a.length} chars`);
      }
      // The same sentence is served to every market, so a symbol or a country
      // name in it would be wrong somewhere.
      if (/[₦$€£¥₹]|\b(Nigeria|Nigerian|Lagos|Naira)\b/.test(v.a)) {
        problems.push(`${path}: market or currency baked in`);
      }
      return problems;
    });
    expect(bad).toEqual([]);
  });

  it("is injected into the prerendered body and the FAQ schema", () => {
    expect(prerenderSrc).toContain("howManyHtml(route.path)");
    expect(prerenderSrc).toContain("howManyFaq(route.path)");
  });
});
