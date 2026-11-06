/**
 * Brand icon generator.
 *
 * The site icon, favicon and PWA icons are generated from one deterministic
 * vector source so every size is sharp and every surface shows the same mark.
 * Run with `node scripts/generate-brand-icons.mjs`.
 *
 * Design rules the assets must satisfy:
 * - The mark is designed for a 16 px tab, not downscaled from a wide lockup.
 * - The glyph sits on a brand tile with real ink coverage, never a white plate.
 * - Maskable and Apple icons carry a full bleed and a safe margin so no
 *   platform mask or corner radius clips the glyph.
 */

import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const BRAND = {
  tileTop: "#6D28D9",
  tileBottom: "#3B0B75",
  tileTopDark: "#8B5CF6",
  tileBottomDark: "#6D28D9",
  accent: "#F97316",
  glyph: "#FFFFFF",
};

/**
 * Architectural Cantilever Monogram on a 512 grid.
 *
 * Precision structural engineering geometry:
 * - Vertical structural column: x 144 to 222 (width 78, y 108 to 398)
 * - Upper cantilever beam with 45° chamfered end: x 144 to 372 (height 70, y 108 to 178)
 * - Mid cantilever beam with matching 45° chamfer: x 144 to 320 (height 64, y 230 to 294)
 * - Foundation grade beam / datum plinth in #F97316: x 144 to 372 (height 26, rx 13)
 *   aligning the mark into a balanced structural silhouette.
 */
function markSvg({
  radius = 112,
  glyphScale = 1.08,
  plinth = true,
  tileTop = BRAND.tileTop,
  tileBottom = BRAND.tileBottom,
  bleed = false,
} = {}) {
  // Center of glyph assembly: x = 258, y = 273
  const tX = (256 - 258 * glyphScale).toFixed(3);
  const tY = (256 - 273 * glyphScale).toFixed(3);
  const glyph = `
    <g transform="translate(${tX} ${tY}) scale(${glyphScale})">
      <!-- Architectural Cantilever Monogram F -->
      <path d="M 144 108 L 372 108 L 338 178 L 222 178 L 222 230 L 320 230 L 286 294 L 222 294 L 222 398 L 144 398 Z" fill="${BRAND.glyph}"/>
      ${plinth ? `<rect x="144" y="412" width="228" height="26" rx="13" fill="${BRAND.accent}"/>` : ""}
    </g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="FRELUX">
  <defs>
    <linearGradient id="tile" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${tileTop}"/>
      <stop offset="1" stop-color="${tileBottom}"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${bleed ? 0 : radius}" fill="url(#tile)"/>
${glyph}
</svg>`;
}

/** Build a multi-resolution ICO container from PNG buffers (PNG is valid inside ICO). */
function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  const dir = Buffer.alloc(16 * entries.length);
  let offset = 6 + dir.length;
  entries.forEach((entry, i) => {
    const base = i * 16;
    dir.writeUInt8(entry.size >= 256 ? 0 : entry.size, base);
    dir.writeUInt8(entry.size >= 256 ? 0 : entry.size, base + 1);
    dir.writeUInt8(0, base + 2);
    dir.writeUInt8(0, base + 3);
    dir.writeUInt16LE(1, base + 4);
    dir.writeUInt16LE(32, base + 6);
    dir.writeUInt32LE(entry.png.length, base + 8);
    dir.writeUInt32LE(offset, base + 12);
    offset += entry.png.length;
  });
  return Buffer.concat([header, dir, ...entries.map((e) => e.png)]);
}

const png = (svg, size) =>
  sharp(Buffer.from(svg), { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

async function main() {
  await mkdir("public/brand", { recursive: true });

  const appMark = markSvg({ glyphScale: 1.08 });
  const headerMark = markSvg({ radius: 112, glyphScale: 1.08 });
  const headerMarkDark = markSvg({
    radius: 112,
    glyphScale: 1.08,
    tileTop: BRAND.tileTopDark,
    tileBottom: BRAND.tileBottomDark,
  });
  // Tab icon: slightly flatter radius, crisp optical weight
  const tabMark = markSvg({ radius: 88, glyphScale: 1.15, plinth: true });
  // Maskable art must survive an aggressive circular crop: full bleed, small glyph inside safe zone.
  const maskable = markSvg({ radius: 0, glyphScale: 0.72, plinth: true, bleed: true });
  // Apple applies its own mask, so the source is a full bleed square.
  const apple = markSvg({ radius: 0, glyphScale: 0.74, bleed: true });

  await writeFile("public/brand/frelux-mark.svg", appMark);
  await writeFile("public/brand/frelux-mark-light.svg", headerMarkDark);
  await writeFile("public/favicon.svg", tabMark);

  await writeFile("public/icon-192.png", await png(appMark, 192));
  await writeFile("public/icon-512.png", await png(appMark, 512));
  await writeFile("public/icon-maskable-512.png", await png(maskable, 512));
  await writeFile("public/apple-touch-icon.png", await png(apple, 180));
  await writeFile("public/logo-mark.png", await png(headerMark, 256));
  await writeFile("public/logo-mark-light.png", await png(headerMarkDark, 256));

  const sizes = [16, 32, 48];
  const icoEntries = [];
  for (const size of sizes) {
    const buf = await png(tabMark, size);
    await writeFile(`public/favicon-${size}.png`, buf);
    icoEntries.push({ size, png: buf });
  }
  await writeFile("public/favicon.ico", buildIco(icoEntries));

  console.log("brand icons written: favicon.svg, favicon.ico (16/32/48), icon-192, icon-512, maskable, apple-touch, logo-mark");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
