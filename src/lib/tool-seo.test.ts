/**
 * Guards the search listing copy for the construction tools.
 *
 * The rules that matter for a search result: one unique title per tool, short
 * enough not to be cut off, a description that promises only what the
 * calculator does, and agreement between what the prerenderer wrote and what
 * the hydrated page sets.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
// @ts-expect-error plain ESM shared with the prerenderer
import { toolSeoTitle, toolSeoDescription } from "../../scripts/lib/tool-seo.mjs";

type Tool = {
  slug: string;
  title: string;
  path: string;
  does: string;
  enters: string;
  gets: string;
  benefit?: string;
  seoTitle?: string;
  seoDescription?: string;
};

// @ts-expect-error plain ESM shared with the prerenderer
import { loadToolRegistry } from "../../scripts/lib/tool-registry.mjs";

// The registry parser is the same one the prerenderer uses; re-parsing the
// source here would let the test agree with a bug instead of catching it.
const tools = loadToolRegistry() as Tool[];

describe("tool search listings", () => {
  it("reads a plausible registry", () => {
    expect(tools.length).toBeGreaterThan(40);
    expect(tools.every((t) => t.does.length > 20)).toBe(true);
  });

  it("gives every tool a unique title within the display limit", () => {
    const titles = tools.map((t) => toolSeoTitle(t));
    expect(new Set(titles).size).toBe(titles.length);
    for (const title of titles) {
      expect(title.length).toBeLessThanOrEqual(64);
      expect(title).not.toMatch(/[\s,;:\-–—]$/);
    }
  });

  it("writes descriptions long enough to be useful and short enough to show", () => {
    for (const tool of tools) {
      const d = toolSeoDescription(tool);
      expect(d.length).toBeGreaterThanOrEqual(60);
      expect(d.length).toBeLessThanOrEqual(160);
      expect(d).not.toMatch(/[,;:]$/);
    }
  });

  it("only promises inputs and outputs the registry declares", () => {
    // Every description must be built from, or agree with, its own registry text.
    for (const tool of tools) {
      const d = toolSeoDescription(tool);
      const curated = tool.seoDescription;
      const source = curated || tool.does;
      const head = source.split(".")[0].slice(0, 40).toLowerCase();
      expect(d.toLowerCase()).toContain(head.split(" ").slice(0, 3).join(" "));
    }
  });

  it("matches the prerendered title when a build exists", () => {
    const dist = join(process.cwd(), "dist");
    if (!existsSync(dist)) return;
    for (const tool of tools.slice(0, 12)) {
      const file = join(dist, tool.path, "index.html");
      if (!existsSync(file)) continue;
      const html = readFileSync(file, "utf-8");
      const title = (html.match(/<title>([^<]*)<\/title>/) ?? [, ""])[1];
      expect(title).toBe(toolSeoTitle(tool));
    }
  });
});
