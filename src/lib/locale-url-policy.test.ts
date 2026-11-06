// Locale-prefixed URLs serve the English page, so they are duplicates by
// construction. Production proved the policy was only partly enforced:
// /es/ was the one prefix missing its noindex header, and 157 /es/ URLs were
// still advertised in sitemap.xml. Both halves are asserted here so a new
// locale cannot ship half-protected.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LOCALE_PREFIXES,
  isLocalePrefixed,
} from "../../scripts/lib/locale-paths.mjs";

const root = process.cwd();
const headers = readFileSync(join(root, "public/_headers"), "utf8");
const i18n = readFileSync(join(root, "src/lib/i18n.tsx"), "utf8");
const sitemapScript = readFileSync(
  join(root, "scripts/generate-sitemap.mjs"),
  "utf8",
);

/** Locale codes declared in the LANGUAGES table, excluding the default. */
function declaredLocales(): string[] {
  const block = i18n.slice(
    i18n.indexOf("LANGUAGES"),
    i18n.indexOf("LOCALE_ROUTES"),
  );
  const codes = [...block.matchAll(/value: "([a-z]{2})"/g)].map((m) => m[1]);
  return codes.filter((c) => c !== "en");
}

describe("locale URL policy", () => {
  it("covers every declared language except English", () => {
    const declared = declaredLocales().sort();
    expect(declared.length).toBeGreaterThan(0);
    expect(declared).toEqual([...LOCALE_PREFIXES].sort());
  });

  it.each(declaredLocales())(
    "/%s and its children are noindexed at the edge",
    (code) => {
      expect(headers).toContain(`/${code}\n  X-Robots-Tag: noindex, nofollow`);
      expect(headers).toContain(
        `/${code}/*\n  X-Robots-Tag: noindex, nofollow`,
      );
    },
  );

  it("recognises locale paths and leaves English paths alone", () => {
    expect(isLocalePrefixed("/es/learn/anything")).toBe(true);
    expect(isLocalePrefixed("es")).toBe(true);
    expect(isLocalePrefixed("/fr")).toBe(true);
    // English paths that merely start with the same letters stay in the sitemap.
    expect(isLocalePrefixed("/estimate-refresh")).toBe(false);
    expect(isLocalePrefixed("/escrow")).toBe(false);
    expect(isLocalePrefixed("/")).toBe(false);
  });

  it("filters locale paths when assembling the sitemap", () => {
    expect(sitemapScript).toContain("isLocalePrefixed(r.path)");
  });

  it("ships a sitemap with no locale-prefixed URL", () => {
    const file = join(root, "public/sitemap.xml");
    if (!existsSync(file)) return;
    const xml = readFileSync(file, "utf8");
    for (const code of LOCALE_PREFIXES) {
      expect(xml).not.toContain(`freluxtools.com/${code}/`);
    }
  });
});
