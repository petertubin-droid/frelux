/**
 * Guards the brand assets the link previews and structured data depend on.
 *
 * The social card is what every share, message and search result shows, and it
 * is easy to break silently: point a meta tag at a file that was renamed, or
 * declare a logo size that no longer matches the artwork, and nothing fails
 * until someone shares a link. This suite reads the references and checks them
 * against the files that actually ship.
 */
import { existsSync, readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

/** PNG header: signature, IHDR width and height at bytes 16 and 20. */
function pngSize(path: string) {
  const buf = readFileSync(path);
  expect(buf.subarray(1, 4).toString("ascii")).toBe("PNG");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe("brand assets behind link previews", () => {
  it("serves the approved artwork at both preview URLs", () => {
    for (const path of ["public/social-cover.png", "public/og-image.png"]) {
      expect(existsSync(path), path).toBe(true);
      expect(pngSize(path), path).toEqual({ width: 1200, height: 630 });
    }
  });

  it("points every preview reference at the current card", () => {
    const index = read("index.html");
    expect(index).toContain(
      'property="og:image" content="https://freluxtools.com/social-cover.png"',
    );
    expect(index).toContain(
      'name="twitter:image" content="https://freluxtools.com/social-cover.png"',
    );
    expect(index).toMatch(/og:image:alt" content="FRELUXTOOLS logo/);
    expect(read("src/lib/seo.ts")).toContain("/social-cover.png");
    expect(read("scripts/prerender.mjs")).toContain("/social-cover.png");
  });

  it("declares the organisation logo at its real size", () => {
    const index = read("index.html");
    const logo =
      /"logo": \{[^}]*"url": "https:\/\/freluxtools\.com\/([a-z0-9-]+\.png)",([^}]*)\}/.exec(
        index,
      );
    expect(logo, "organisation logo block").not.toBeNull();
    const file = `public/${logo![1]}`;
    expect(existsSync(file), file).toBe(true);
    const size = pngSize(file);
    expect(logo![2]).toContain(`"width": ${size.width}`);
    expect(logo![2]).toContain(`"height": ${size.height}`);
  });

  // Third-party promo slots build their logo URL from the partner's own origin,
  // so their "/logo.png" is the partner's file, not ours, and is not checked here.
  it("never references a brand image that does not ship", () => {
    const sources = [
      "index.html",
      "src/lib/seo.ts",
      "src/components/brand/Logo.tsx",
      "src/pages/learn/LearnArticle.tsx",
      "src/pages/learn/WallFinishingArticle.tsx",
      "public/manifest.json",
    ];
    const referenced = new Set<string>();
    for (const source of sources) {
      for (const match of read(source).matchAll(
        /\/(logo[a-z-]*\.png|icon-\d+\.png|social-cover\.png|og-image(?:-opt)?\.(?:png|jpg))/g,
      )) {
        referenced.add(match[1]);
      }
    }
    expect(referenced.size).toBeGreaterThan(0);
    for (const name of referenced) {
      expect(existsSync(`public/${name}`), name).toBe(true);
    }
  });
});
