import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { navToolsByCategory } from "@/config/construction-tools";

/**
 * Guard: every calculator route must render inside the site layout.
 *
 * App.tsx groups routes into blocks, and only blocks wrapped in
 * `<Route element={<Layout />}>` get the site header, the desktop rail and the
 * footer. A second block of 43 routes (the whole Building Services category,
 * masonry, drywall, flooring, foundation and others) had been added beside the
 * layout block instead of inside it, so those calculator pages rendered with no
 * header and no footer at all. Nothing caught it, because the pages themselves
 * are healthy: they were simply mounted outside the chrome.
 *
 * This reads the route table and asserts every registered tool sits inside a
 * layout block, so the next tool cannot be added outside the shell by accident.
 */

const appSource = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");
const lines = appSource.split("\n");

const indentOf = (line: string) => line.length - line.trimStart().length;

/** Line ranges ([start, end], 0-indexed, inclusive) of every layout block. */
function layoutBlockRanges(): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  lines.forEach((line, index) => {
    if (!/^\s*<Route\s+element=\{<Layout\s*\/>\}>/.test(line)) return;
    const indent = indentOf(line);
    const closer = " ".repeat(indent) + "</Route>";
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      if (lines[cursor] === closer) {
        ranges.push([index, cursor]);
        return;
      }
    }
    // An unterminated block is itself a bug worth failing on.
    ranges.push([index, lines.length - 1]);
  });
  return ranges;
}

const ranges = layoutBlockRanges();

/** Does the route for this path sit inside a layout block? */
function isInsideLayout(path: string): boolean {
  const needle = `path="${path}"`;
  const hits: number[] = [];
  lines.forEach((line, index) => {
    if (line.includes(needle)) hits.push(index);
  });
  if (hits.length === 0) return false;
  // Any declaration of the path inside the layout is enough.
  return hits.some((index) =>
    ranges.some(([start, end]) => index > start && index < end),
  );
}

const allTools = navToolsByCategory().flatMap(({ tools }) => tools);

describe("site layout coverage", () => {
  it("wraps calculator routes in the layout", () => {
    expect(ranges.length).toBeGreaterThan(0);
    const unwrapped = allTools
      .map((tool) => tool.to)
      .filter((path) => !isInsideLayout(path));

    // Named so a failure says which calculator lost its chrome.
    expect(unwrapped).toEqual([]);
  });

  it("keeps the Building Services calculators inside the layout", () => {
    const category = navToolsByCategory().find(({ category }) =>
      category.label.toLowerCase().includes("service"),
    );
    expect(category).toBeDefined();

    for (const tool of category?.tools ?? []) {
      expect(
        isInsideLayout(tool.to),
        `${tool.title} (${tool.to}) renders outside the site layout`,
      ).toBe(true);
    }
  });

  it("wraps the other public pages in the layout", () => {
    // These were found outside the shell too: public content that rendered with
    // no way back to the rest of the site.
    const publicPages = [
      "/credits",
      "/gallery",
      "/gallery/new",
      "/case-studies",
      "/case-studies/:id",
      "/learn/build-in-nigeria-from-abroad",
      "/properties",
      "/project-workspace",
      "/project-workspace/:id",
      "/workspace-settings",
    ];
    for (const path of publicPages) {
      expect(
        isInsideLayout(path),
        `${path} renders outside the site layout`,
      ).toBe(true);
    }
  });

  it("leaves the shared token links outside the layout", () => {
    // A client opening an estimate or an invitation gets a single focused
    // page, not the site navigation.
    expect(isInsideLayout("/estimate/:token")).toBe(false);
    expect(isInsideLayout("/invite/:token")).toBe(false);
  });

  it("leaves the auth and admin routes outside the public layout", () => {
    // These carry their own shells by design; wrapping them would double the
    // chrome. The check above must not be "fixed" by wrapping everything.
    expect(isInsideLayout("/login")).toBe(false);
    expect(isInsideLayout("/admin/login")).toBe(false);
  });
});
