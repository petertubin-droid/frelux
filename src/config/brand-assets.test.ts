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
      // The copies the tab, home screen and manifest actually request.
      "public/brand/favicon-16.png": 16,
      "public/brand/favicon-32.png": 32,
      "public/brand/favicon-48.png": 48,
      "public/brand/icon-192.png": 192,
      "public/brand/icon-512.png": 512,
      "public/brand/icon-maskable-512.png": 512,
      "public/brand/apple-touch-icon.png": 180,
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

  it("cuts every icon from the one transparent master", () => {
    // Owner directive 2026-11-07: the supplied artwork is the brand mark. The
    // generator may not invent a second drawing, so it must read the master and
    // every icon must be a crop of it.
    const icons = read("scripts/generate-brand-icons.mjs");
    expect(icons).toContain("public/brand/frelux-icon.png");
    expect(icons).not.toContain("#F59E0B");
    const card = read("scripts/generate-social-card.mjs");
    expect(card).not.toContain("#F59E0B");
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
    expect(share).toContain("/brand/frelux-mark.png");
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
    expect(head).toContain('href="/brand/favicon.ico');
    expect(head).toContain('sizes="180x180" href="/brand/apple-touch-icon.png');
  });

  it("declares the organisation logo at its real size", () => {
    const index = read("index.html");
    const logo =
      /"logo": \{[^}]*"url": "https:\/\/freluxtools\.com\/([a-z0-9\-/]+\.png)",([^}]*)\}/.exec(
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
    expect(existsSync("public/brand/frelux-icon.png")).toBe(true);
  });

  it("packs three resolutions into the ico container", () => {
    expect(icoSizes().sort((a, b) => a - b)).toEqual([16, 32, 48]);
  });

  it("keeps the tab icon legible on a transparent field", async () => {
    const sharp = (await import("sharp")).default;
    const { data, info } = await sharp("public/favicon-32.png")
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let opaque = 0;
    let white = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 200) {
        opaque += 1;
        // Pure white art would vanish on a white tab bar.
        if (data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245) white += 1;
      }
    }
    const total = info.width * info.height;
    // The artwork fills the frame, the corners stay clear, and the mark is
    // drawn in colour rather than left as a white plate.
    expect(opaque / total).toBeGreaterThan(0.2);
    expect(white / opaque).toBeLessThan(0.4);
    expect(data[3]).toBe(0);
    expect(data[(info.width - 1) * 4 + 3]).toBe(0);
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

  it("ships the in-app mark transparent, with no plate behind it", async () => {
    // Owner directive 2026-11-07: the supplied artwork is the brand mark and it
    // sits on the page with no white plate, no border and no tile. The in-app
    // mark is therefore a transparent crop, not a bordered square.
    const sharp = (await import("sharp")).default;
    const { data, info } = await sharp("public/brand/frelux-mark.png")
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(data[3]).toBe(0);
    expect(data[(info.width - 1) * 4 + 3]).toBe(0);
    let opaque = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 200) opaque += 1;
    // The crop is the artwork, so the mark covers a real share of the frame.
    expect(opaque / (info.width * info.height)).toBeGreaterThan(0.2);
  });

  it("no longer ships the retired monogram vectors", () => {
    for (const path of [
      "public/brand/frelux-mark.svg",
      "public/brand/frelux-mark-light.svg",
      "public/favicon.svg",
    ]) {
      expect(existsSync(path), path).toBe(false);
    }
  });

  it("declares one brand colour across the manifest and the browser chrome", () => {
    const manifest = JSON.parse(read("public/manifest.json"));
    expect(manifest.theme_color).toBe("#6D28D9");
    const icons = manifest.icons.map((icon: { src: string }) => icon.src);
    expect(icons).toContain("/brand/icon-192.png");
    expect(icons).toContain("/brand/icon-maskable-512.png");
    expect(
      manifest.icons.some(
        (icon: { purpose?: string }) => icon.purpose === "maskable",
      ),
    ).toBe(true);
    const index = read("index.html");
    expect(index).toContain(
      'content="#6D28D9" media="(prefers-color-scheme: light)"',
    );
    // A vector tab icon would shadow the new mark, so the raster set is the
    // only source declared in the head.
    expect(index).not.toContain("image/svg+xml");
    expect(index).toContain('<link rel="icon" href="/brand/favicon.ico');
    expect(index).not.toContain('content="#7C3AED"');
  });
});

describe("the tab icon is the current mark", () => {
  it("points the document and the manifest at the served brand copies", () => {
    const index = read("index.html");
    for (const size of [16, 32, 48]) {
      expect(index, `favicon-${size}`).toContain(`/brand/favicon-${size}.png`);
    }
    expect(index).toContain("/brand/favicon.ico");
    expect(index).toContain("/brand/apple-touch-icon.png");
    // Nothing may still ask for the root copies: those are the URLs a phone has
    // already cached, and a browser will show the old mark from them.
    expect(index).not.toMatch(/rel="icon"[^>]*href="\/favicon-/);
    expect(index).not.toMatch(
      /rel="apple-touch-icon"[^>]*href="\/apple-touch-icon/,
    );

    const manifest = JSON.parse(read("public/manifest.json")) as {
      icons: Array<{ src: string }>;
    };
    expect(manifest.icons.length).toBeGreaterThan(0);
    for (const icon of manifest.icons) {
      expect(icon.src, icon.src).toMatch(/^\/brand\/icon-/);
    }
  });

  it("serves the current artwork rather than the old letter mark", async () => {
    // A stale icon is invisible in code review and only shows up as an old
    // letter in someone's tab strip. The retired mark was a single purple
    // plate; the current artwork is a purple-blue-orange-green gradient, so the
    // palette is a stable fingerprint for "this file is the new logo".
    const { default: sharp } = await import("sharp");

    const share = async (path: string) => {
      const { data, info } = await sharp(path)
        .resize(64, 64, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const counts = { purple: 0, blue: 0, green: 0, orange: 0 };
      let opaque = 0;
      for (let i = 0; i < data.length; i += info.channels) {
        if (data[i + 3] < 60) continue;
        opaque += 1;
        const r = data[i] / 255;
        const g = data[i + 1] / 255;
        const b = data[i + 2] / 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const light = (max + min) / 2;
        const sat =
          max === min ? 0 : (max - min) / (1 - Math.abs(2 * light - 1));
        if (sat < 0.2) continue;
        let hue = 0;
        if (max === r) hue = ((g - b) / (max - min)) % 6;
        else if (max === g) hue = (b - r) / (max - min) + 2;
        else hue = (r - g) / (max - min) + 4;
        const deg = (hue * 60 + 360) % 360;
        if (deg >= 250 && deg <= 300) counts.purple += 1;
        else if (deg >= 190 && deg < 250) counts.blue += 1;
        else if (deg >= 60 && deg < 160) counts.green += 1;
        else if (deg >= 20 && deg < 60) counts.orange += 1;
      }
      const total = Math.max(opaque, 1);
      return {
        purple: counts.purple / total,
        cool: (counts.blue + counts.green) / total,
        orange: counts.orange / total,
      };
    };

    for (const path of [
      "public/brand/favicon-32.png",
      "public/brand/favicon-48.png",
      "public/brand/icon-192.png",
    ]) {
      const palette = await share(path);
      // Blue and green only appear in the current gradient artwork.
      expect(palette.cool, `${path} cool hues`).toBeGreaterThan(0.15);
      expect(palette.orange, `${path} warm hues`).toBeGreaterThan(0.05);
      // The retired mark was almost entirely one purple.
      expect(palette.purple, `${path} single-hue dominance`).toBeLessThan(0.45);
    }
  });
});
