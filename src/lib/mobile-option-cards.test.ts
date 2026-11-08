import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

/**
 * Guard for the option-card pattern.
 *
 * These cards are `<Button>` elements, and the button base class carries
 * `whitespace-nowrap`. A card whose label and description cannot wrap takes
 * its whole text as min-content width, so inside a grid it pushes past the
 * phone screen. The layout gate cannot see a page nobody photographed yet, so
 * the class string is checked at the source instead: every `select-card`
 * button must be able to wrap and to shrink.
 */

const ROOT = join(process.cwd(), "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (/\.tsx$/.test(entry) && !/\.test\.tsx$/.test(entry))
      out.push(full);
  }
  return out;
}

describe("option cards", () => {
  it("all select-card buttons can wrap and shrink", () => {
    const offenders: string[] = [];
    for (const file of walk(ROOT)) {
      const source = readFileSync(file, "utf8");
      if (!source.includes("select-card ")) continue;
      // Each class string that starts an option card, up to the closing quote.
      for (const match of source.matchAll(/"select-card flex[^"]*"/g)) {
        const classes = match[0];
        const missing = ["whitespace-normal", "min-w-0"].filter(
          (needle) => !classes.includes(needle),
        );
        if (missing.length) {
          offenders.push(
            `${file.replace(process.cwd() + "/", "")}: missing ${missing.join(", ")}`,
          );
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
