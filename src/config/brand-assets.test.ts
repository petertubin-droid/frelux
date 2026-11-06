/**
 * Guards the brand assets the link previews and structured data depend on.
 *
 * The social card is what every share, message and search result shows, and it
 * is easy to break silently: point a meta tag at a file that was renamed, or
 * declare a logo size that no longer matches the artwork, and nothing fails
 * until someone shares a link. This suite reads the references and checks them
 * against the files that actually ship.
 */
import { existsSync, readFileSync, statSync } from "fs";
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

  it("ships the full icon set at the sizes each surface expects", () => {
    const expected: Record<string, number> = {
      "public/icon-512.png": 512,
      "public/icon-192.png": 192,
      "public/icon-maskable-512.png": 512,
      "public/apple-touch-icon.png": 180,
      "public/favicon-32.png": 32,
      "public/favicon-16.png": 16,
      "public/logo-mark.png": 256,
      "public/logo-mark-light.png": 256,
    };
    for (const [path, px] of Object.entries(expected)) {
      expect(existsSync(path), path).toBe(true);
      expect(pngSize(path), path).toEqual({ width: px, height: px });
    }
    expect(existsSync("public/favicon.ico"), "favicon.ico").toBe(true);
  });

  it("ships one branded social card at the Open Graph size", () => {
    for (const file of ["social-cover.png", "og-image.png"]) {
      const size = pngSize(`public/${file}`);
      expect(`${size.width}x${size.height}`, file).toBe("1200x630");
      expect(statSync(`public/${file}`).size, file).toBeLessThan(250_000);
    }
    const jpeg = statSync("public/og-image-opt.jpg");
    expect(jpeg.size).toBeLessThan(250_000);
  });

  it("draws the icon and the social card from the same brand accent", () => {
    const mark = read("public/brand/frelux-mark.svg");
    const card = read("scripts/generate-social-card.mjs");
    const icons = read("scripts/generate-brand-icons.mjs");
    for (const source of [mark, card, icons]) {
      expect(source).toContain("#F97316");
      expect(source).not.toContain("#F59E0B");
    }
  });

  it("brands every surface through the shared logo component", () => {
    for (const page of [
      "src/components/layout/Navbar.tsx",
      "src/components/layout/Footer.tsx",
      "src/pages/Login.tsx",
      "src/pages/admin/AdminLogin.tsx",
      "src/components/ui/BrandedLoader.tsx",
    ]) {
      expect(read(page), page).toContain("brand/Logo");
    }
    const share = read("src/pages/QuoteShare.tsx");
    expect(share).toContain("/brand/frelux-mark.svg");
    expect(share).not.toContain("blue-600");
  });

  it("declares the same icons in the manifest and the document head", () => {
    const manifest = JSON.parse(read("public/manifest.json")) as {
      icons: { src: string; sizes: string; purpose?: string }[];
    };
    for (const icon of manifest.icons) {
      expect(existsSync(`public${icon.src}`), icon.src).toBe(true);
      if (icon.src.endsWith(".svg")) {
        // Vector entries declare "any" and are checked by their viewBox instead.
        expect(icon.sizes, icon.src).toBe("any");
        expect(read(`public${icon.src}`)).toContain('viewBox="0 0 512 512"');
        continue;
      }
      const size = pngSize(`public${icon.src}`);
      expect(`${size.width}x${size.height}`, icon.src).toBe(icon.sizes);
    }
    expect(manifest.icons.some((i) => i.purpose === "maskable")).toBe(true);

    const head = read("index.html");
    expect(head).toContain('href="/favicon.ico"');
    expect(head).toContain('sizes="180x180" href="/apple-touch-icon.png"');
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

describe("site icon set", () => {
  const icoSizes = () => {
    const buf = readFileSync("public/favicon.ico");
    const count = buf.readUInt16LE(4);
    const sizes: number[] = [];
    for (let i = 0; i < count; i += 1) {
      const base = 6 + i * 16;
      const declared = buf.readUInt8(base) || 256;
      sizes.push(declared);
    }
    return sizes;
  };

  it("ships every icon size the browsers and platforms ask for", () => {
    const expected: Record<string, number> = {
      "public/favicon-16.png": 16,
      "public/favicon-32.png": 32,
      "public/favicon-48.png": 48,
      "public/apple-touch-icon.png": 180,
      "public/icon-192.png": 192,
      "public/icon-512.png": 512,
      "public/icon-maskable-512.png": 512,
    };
    for (const [path, size] of Object.entries(expected)) {
      expect(existsSync(path), path).toBe(true);
      expect(pngSize(path), path).toEqual({ width: size, height: size });
    }
    expect(existsSync("public/favicon.svg")).toBe(true);
  });

  it("packs three resolutions into the ico container", () => {
    expect(icoSizes().sort((a, b) => a - b)).toEqual([16, 32, 48]);
  });

  it("keeps the tab icon legible: a solid tile, not a thin sliver of art", async () => {
    const sharp = (await import("sharp")).default;
    const { data, info } = await sharp("public/favicon-32.png")
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let opaque = 0;
    let glyph = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 200) opaque += 1;
      // White glyph pixels against the purple tile.
      if (data[i] > 220 && data[i + 1] > 220 && data[i + 2] > 220) glyph += 1;
    }
    const total = info.width * info.height;
    // A rounded tile fills most of the frame; the white monogram is a real mark.
    expect(opaque / total).toBeGreaterThan(0.85);
    expect(glyph / total).toBeGreaterThan(0.08);
    expect(glyph / total).toBeLessThan(0.35);
  });

  it("bleeds the maskable and apple icons edge to edge", async () => {
    const sharp = (await import("sharp")).default;
    for (const path of [
      "public/icon-maskable-512.png",
      "public/apple-touch-icon.png",
    ]) {
      const { data, info } = await sharp(path)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      // Top-left corner must be opaque: no transparent wedge when a platform mask clips it.
      expect(data[3], path).toBe(255);
      expect(data[(info.width - 1) * 4 + 3], path).toBe(255);
    }
  });

  it("ships the in-app mark as vector with a square frame", () => {
    for (const path of [
      "public/brand/frelux-mark.svg",
      "public/brand/frelux-mark-light.svg",
    ]) {
      const svg = read(path);
      expect(svg).toContain('viewBox="0 0 512 512"');
      expect(svg).toContain("#6D28D9");
    }
  });

  it("declares one brand colour across the manifest and the browser chrome", () => {
    const manifest = JSON.parse(read("public/manifest.json"));
    expect(manifest.theme_color).toBe("#6D28D9");
    const icons = manifest.icons.map((icon: { src: string }) => icon.src);
    expect(icons).toContain("/favicon.svg");
    expect(icons).toContain("/icon-maskable-512.png");
    expect(
      manifest.icons.some(
        (icon: { purpose?: string }) => icon.purpose === "maskable",
      ),
    ).toBe(true);
    const index = read("index.html");
    expect(index).toContain(
      'content="#6D28D9" media="(prefers-color-scheme: light)"',
    );
    expect(index).toContain(
      '<link rel="icon" type="image/svg+xml" href="/favicon.svg" />',
    );
    expect(index).not.toContain('content="#7C3AED"');
  });
});
