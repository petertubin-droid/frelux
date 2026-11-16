/**
 * The split between the tool catalogue and everything else.
 *
 * The 72-tool shell migration reads CONSTRUCTION_TOOLS as the complete list of
 * calculators. That only holds if a calculator cannot exist outside it, so this
 * file pins three things: every catalogue entry resolves to a route, no page
 * answers to two addresses, and a page that renders calculator furniture is
 * either catalogued or declared here with a reason.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { CONSTRUCTION_TOOLS } from "@/config/construction-tools";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");

const APP = read("src/App.tsx");

/** route -> the page component the route renders. */
function routeComponents(app: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const chunk of app.split('path="').slice(1)) {
    const end = chunk.indexOf('"');
    if (end === -1) continue;
    const route = chunk.slice(0, end);
    const tail = chunk.slice(0, 1600);
    const tags = [...tail.matchAll(/<([A-Z]\w+)/g)]
      .map((m) => m[1])
      .filter((t) => !["Suspense", "PageLoader", "Fragment"].includes(t));
    if (tags.length) out.set(route, tags[0]);
  }
  return out;
}

/** component name -> module path, from the lazy declarations in App.tsx. */
function lazyModules(app: string): Map<string, string> {
  const out = new Map<string, string>();
  const re = /const\s+(\w+)\s*=\s*lazy\(\s*\(\)\s*=>\s*import\(\s*"([^"]+)"\s*\)/g;
  for (const m of app.matchAll(re)) out.set(m[1], m[2]);
  return out;
}

const ROUTES = routeComponents(APP);
const MODULES = lazyModules(APP);
const CATALOGUED = new Set(CONSTRUCTION_TOOLS.map((t) => t.to));

const isExactRoute = (route: string) => !route.includes(":") && !route.endsWith("*");

/**
 * Pages that render calculator furniture but are deliberately not catalogue
 * tools. Each needs a reason: the list is the split, and an unlisted entrant
 * fails the suite below.
 */
const DECLARED_NOT_A_TOOL: Record<string, string> = {
  "/boq-studio":
    "A document workspace that saves a priced bill to the database and reopens it, not a one-pass calculator.",
};

describe("tool catalogue split", () => {
  it("has a route for every catalogued tool", () => {
    const missing = CONSTRUCTION_TOOLS.map((t) => t.to).filter((to) => !ROUTES.has(to));
    expect(missing).toEqual([]);
  });

  it("lists each catalogued tool once", () => {
    const paths = CONSTRUCTION_TOOLS.map((t) => t.to);
    expect(new Set(paths).size).toBe(paths.length);
    const slugs = CONSTRUCTION_TOOLS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("does not answer one page at two addresses", () => {
    const byComponent = new Map<string, string[]>();
    for (const [route, comp] of ROUTES) {
      if (!isExactRoute(route)) continue;
      if (comp === "Navigate" || comp.startsWith("Require") || comp.startsWith("Redirect") || comp === "NotFound") continue;
      byComponent.set(comp, [...(byComponent.get(comp) ?? []), route]);
    }
    const duplicated = [...byComponent.entries()]
      .filter(([, routes]) => routes.length > 1)
      // One shared page behind several catalogued tools is reuse, not a
      // duplicate: the stand-alone takeoff page answers for nine tools.
      .filter(([, routes]) => !routes.every((r) => CATALOGUED.has(r)))
      .map(([comp, routes]) => `${comp}: ${routes.join(", ")}`);
    expect(duplicated).toEqual([]);
  });

  it("declares every calculator page outside the catalogue", () => {
    const furniture = /CalculatorResetButton|HowCalculatedSection|ShareEstimateButton/;
    const outside: string[] = [];
    for (const [route, comp] of ROUTES) {
      if (CATALOGUED.has(route)) continue;
      const module = MODULES.get(comp);
      if (!module) continue;
      const rel = module.startsWith("@/") ? `src/${module.slice(2)}` : module;
      const file = rel.endsWith(".tsx") || rel.endsWith(".ts") ? rel : `${rel}.tsx`;
      let source: string;
      try {
        source = read(file);
      } catch {
        continue;
      }
      if (furniture.test(source)) outside.push(route);
    }
    expect(outside.sort()).toEqual(Object.keys(DECLARED_NOT_A_TOOL).sort());
  });

  it("keeps each declared exception pointing at a real route", () => {
    for (const route of Object.keys(DECLARED_NOT_A_TOOL)) {
      expect(ROUTES.has(route), `${route} must exist`).toBe(true);
      expect(CATALOGUED.has(route), `${route} is declared as not a tool`).toBe(false);
    }
  });
});
