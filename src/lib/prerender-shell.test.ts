import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// The prerendered crawlable HTML sits in #root with no utility classes, so a
// reload used to flash a wall of raw text before React mounted. The boot shield
// is what covers it; these guards keep the markup and the styles in sync.
describe("prerendered boot shield", () => {
  const prerender = readFileSync(resolve(__dirname, "../../scripts/prerender.mjs"), "utf8");
  const css = readFileSync(resolve(__dirname, "../index.css"), "utf8");

  it("wraps every injected route into the shell", () => {
    expect(prerender).toContain("prerenderShell(pageContent)");
    expect(prerender).toContain("prerenderShell(notFoundContent)");
    expect(prerender).toContain("frelux-prerender__shield");
  });

  it("ships cover styles that do not depend on utilities", () => {
    expect(css).toContain(".frelux-prerender__shield");
    expect(css).toMatch(/position:\s*fixed/);
    // The shield must clear itself for visitors without JavaScript.
    expect(css).toMatch(/animation:\s*frelux-shield-lift[^;]*forwards/);
    expect(css).toContain("@keyframes frelux-shield-lift");
  });
});
