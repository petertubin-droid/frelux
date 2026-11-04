import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

/**
 * A budget rather than a benchmark: the point is that the first visit must stay
 * affordable on a weak connection. Every new library grouped outside the shell,
 * or an extra module preload, shows up here before it reaches a phone on 3G.
 *
 * Skipped when dist/ has not been built, so unit runs stay fast. Run
 * `npm run build` then `npm run perf:budget` for the full report.
 */
const DIST = join(process.cwd(), "dist");
const htmlPath = join(DIST, "index.html");
const built = existsSync(htmlPath);

const gz = (relative: string) => {
  const path = join(DIST, relative.replace(/^\//, ""));
  return existsSync(path) ? gzipSync(readFileSync(path)).length : 0;
};

describe.skipIf(!built)("first visit budget", () => {
  const html = built ? readFileSync(htmlPath, "utf-8") : "";
  const modules = [
    ...new Set(
      [...html.matchAll(/rel="modulepreload"[^>]*href="([^"]+)"/g)].map(
        (m) => m[1],
      ),
    ),
  ];
  const entry = (html.match(/type="module"[^>]*src="([^"]+)"/) ?? [])[1];
  const scripts = [entry, ...modules].filter(Boolean) as string[];
  const css = [...html.matchAll(/href="(\/assets\/css\/[^"]+\.css)"/g)].map(
    (m) => m[1],
  );
  const scriptBytes = scripts.reduce((sum, file) => sum + gz(file), 0);
  const cssBytes = css.reduce((sum, file) => sum + gz(file), 0);

  it("keeps the JavaScript the first screen needs under 350 KB gzipped", () => {
    expect(Math.round(scriptBytes / 1024)).toBeLessThan(350);
  });

  it("keeps the stylesheet under 50 KB gzipped", () => {
    expect(Math.round(cssBytes / 1024)).toBeLessThan(50);
  });

  it("does not make the browser open more than 30 requests before hydration", () => {
    expect(modules.length + 1).toBeLessThanOrEqual(30);
  });

  it("ships the shell without the optional heavy libraries", () => {
    const shell = readFileSync(join(DIST, entry!.replace(/^\//, "")), "utf-8");
    for (const heavy of ["web-ifc", "maplibre", "jspdf", "recharts"]) {
      expect(shell.toLowerCase()).not.toContain(heavy);
    }
  });
});
