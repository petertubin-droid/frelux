// A locale URL used to serve the English page, so it was a duplicate by
// construction and the whole prefix was noindexed and kept out of the sitemap.
// That is still the default: /<locale> and /<locale>/* carry
// X-Robots-Tag noindex at the edge. The one exception is a reviewed translation:
// prerender writes a real Spanish article at /es/learn/<slug> with index, follow,
// a self-canonical and hreflang alternates, the edge lets that path carry its own
// decision, and the sitemap lists it.
//
// Both halves are asserted here, so a locale can never ship half-protected:
// the blanket noindex must stay, and the only locale URLs in the sitemap may be
// translated articles that the build itself marked indexable.
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

  it("keeps the blanket noindex on every locale root", () => {
    for (const code of LOCALE_PREFIXES) {
      expect(headers).toContain(`/${code}
  X-Robots-Tag: noindex, nofollow`);
      expect(headers).toContain(
        `/${code}/*\n  X-Robots-Tag: noindex, nofollow`,
      );
    }
  });

  it("lets only translated articles carry their own robot decision", () => {
    // The exception must be the article tree, not the whole locale.
    expect(headers).toContain("/es/learn/*\n  X-Robots-Tag: index, follow");
    for (const code of LOCALE_PREFIXES.filter((c) => c !== "es")) {
      expect(headers).not.toContain(
        `/${code}/learn/*\n  X-Robots-Tag: index, follow`,
      );
    }
  });

  it("lists locale URLs only when the build marked them indexable", () => {
    const file = join(root, "public/sitemap.xml");
    if (!existsSync(file)) return;
    const xml = readFileSync(file, "utf8");
    // A market path such as /market/de/ is not a locale path, so match the
    // prefix at the start of the URL only.
    const localeUrls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map((m) => m[1])
      .map((url) => url.replace("https://freluxtools.com", ""))
      .filter((path) => LOCALE_PREFIXES.some((c) => path.startsWith(`/${c}/`)));

    for (const path of localeUrls) {
      const url = `https://freluxtools.com${path}`;
      // Only a translated article, never a locale shell or hub. A library
      // article sits at /es/learn/<slug>, a market-tagged one on its market
      // path (/es/learn/wall-finishing/us/<slug>), which is where its English
      // canonical lives.
      expect(path).toMatch(
        /^\/es\/learn\/(?:[a-z0-9-]+|wall-finishing\/[a-z]{2}\/[a-z0-9-]+)\/$/,
      );
      // And only where the built page itself says it may be indexed.
      const built = join(root, "dist", path, "index.html");
      if (!existsSync(built)) continue;
      const page = readFileSync(built, "utf8");
      expect(page).toContain('content="index, follow');
      expect(page).toContain('hreflang="es"');
      expect(page).toContain(
        `rel="canonical" href="${url.replace(/\/$/, "/")}"`,
      );
    }
  });
});
