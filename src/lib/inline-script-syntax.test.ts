import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * An inline script that does not parse fails silently in the browser: the whole
 * block is dropped, so the guard inside it never runs, and the only evidence is
 * a console error. One quote slipped into the robots guard that way and shipped,
 * which is exactly what the E2E smoke test caught on the home page.
 *
 * Every inline script served with the shell is compiled here instead.
 */
const root = process.cwd();

function inlineScripts(html: string): string[] {
  return [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
    .map((m) => m[1].trim())
    .filter((body) => body.length > 0);
}

const shells = ["index.html", join("dist", "index.html")].filter((file) =>
  existsSync(join(root, file)),
);

describe("served inline scripts", () => {
  it("finds the shell to check", () => {
    expect(shells.length).toBeGreaterThan(0);
  });

  for (const shell of shells) {
    it(`parses every inline script in ${shell}`, () => {
      const bodies = inlineScripts(readFileSync(join(root, shell), "utf8"));
      expect(bodies.length).toBeGreaterThan(0);
      const broken: string[] = [];
      for (const body of bodies) {
        const isJsonBlock = body.startsWith("{") || body.startsWith("[");
        if (isJsonBlock) {
          try {
            JSON.parse(body);
          } catch {
            broken.push(`invalid JSON-LD: ${body.slice(0, 60)}`);
          }
          continue;
        }
        try {
          // Compiling without calling: a syntax error throws, a valid script
          // returns a function.
          new Function(body);
        } catch (error) {
          broken.push(`${(error as Error).message}: ${body.slice(0, 60)}`);
        }
      }
      expect(broken).toEqual([]);
    });
  }
});
