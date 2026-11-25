/**
 * Licence compliance for the self-hosted fonts.
 *
 * Serving a font from our own origin makes us its distributor, and both the SIL
 * OFL and the ITF licence require the notice to travel with the files. This
 * fails if a family appears in fonts.css without a notice and, where the licence
 * text is redistributable, without that text beside it.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const fontsDir = join(process.cwd(), "public/fonts");
const css = readFileSync(join(fontsDir, "fonts.css"), "utf8");
const licences = readFileSync(join(fontsDir, "LICENSES.md"), "utf8");

const families = Array.from(
  new Set(
    Array.from(css.matchAll(/font-family:\s*"([^"]+)"/g)).map((m) => m[1]),
  ),
);

describe("self-hosted font licences", () => {
  it("finds the families fonts.css actually declares", () => {
    expect(families.length).toBeGreaterThanOrEqual(3);
    expect(families).toContain("Inter");
  });

  it("names every declared family in LICENSES.md", () => {
    for (const family of families) {
      expect(licences).toContain(family);
    }
  });

  it("ships the redistributable licence text beside the files", () => {
    for (const file of [
      "Inter-OFL.txt",
      "PlusJakartaSans-OFL.txt",
      "ClashDisplay-NOTICE.txt",
      "pdf/OFL.txt",
    ]) {
      const path = join(fontsDir, file);
      expect(existsSync(path)).toBe(true);
      expect(readFileSync(path, "utf8").length).toBeGreaterThan(300);
    }
  });

  it("keeps the OFL texts the real licence, not a summary", () => {
    for (const file of ["Inter-OFL.txt", "PlusJakartaSans-OFL.txt", "pdf/OFL.txt"]) {
      const text = readFileSync(join(fontsDir, file), "utf8");
      expect(text).toContain("SIL OPEN FONT LICENSE Version 1.1");
      expect(text).toContain("PERMISSION & CONDITIONS");
    }
  });

  it("points Clash Display at the foundry's own licence", () => {
    const notice = readFileSync(join(fontsDir, "ClashDisplay-NOTICE.txt"), "utf8");
    expect(notice).toContain("fontshare.com/licenses");
    expect(notice).toContain("ITF Free Font License");
  });
});
