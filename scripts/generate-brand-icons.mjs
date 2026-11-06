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
  accent: "#F59E0B",
  glyph: "#FFFFFF",
};

/** Monogram geometry on a 512 grid, centred on x 256 with an optical centre. */
const GLYPH = {
  stem: { x: 156, y: 120, w: 64, h: 264 },
  topArm: { x: 156, y: 120, w: 200, h: 64 },
  middleArm: { x: 156, y: 232, w: 160, h: 60 },
};

function markSvg({
  radius = 112,
  glyphScale = 1,
  plinth = true,
  tileTop = BRAND.tileTop,
  tileBottom = BRAND.tileBottom,
  bleed = false,
} = {}) {
  const t = (256 - 256 * glyphScale).toFixed(3);
  const glyph = `
    <g transform="translate(${t} ${t}) scale(${glyphScale})">
      <rect x="${GLYPH.stem.x}" y="${GLYPH.stem.y}" width="${GLYPH.stem.w}" height="${GLYPH.stem.h}" fill="${BRAND.glyph}"/>
      <rect x="${GLYPH.topArm.x}" y="${GLYPH.topArm.y}" width="${GLYPH.topArm.w}" height="${GLYPH.topArm.h}" fill="${BRAND.glyph}"/>
      <rect x="${GLYPH.middleArm.x}" y="${GLYPH.middleArm.y}" width="${GLYPH.middleArm.w}" height="${GLYPH.middleArm.h}" fill="${BRAND.glyph}"/>
      ${plinth ? `<rect x="140" y="404" width="232" height="26" rx="13" fill="${BRAND.accent}"/>` : ""}
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

  const appMark = markSvg({ glyphScale: 1.12 });
  const headerMark = markSvg({ radius: 112, glyphScale: 1.12 });
  const headerMarkDark = markSvg({
    radius: 112,
    glyphScale: 1.12,
    tileTop: BRAND.tileTopDark,
    tileBottom: BRAND.tileBottomDark,
  });
  // A tab icon reads at 16 px: flatter radius, no plinth, slightly larger glyph.
  const tabMark = markSvg({ radius: 88, glyphScale: 1.32, plinth: false });
  // Maskable art must survive an aggressive circular crop: full bleed, small glyph.
  const maskable = markSvg({ radius: 0, glyphScale: 0.7, plinth: false, bleed: true });
  // Apple applies its own mask, so the source is a full bleed square.
  const apple = markSvg({ radius: 0, glyphScale: 0.72, bleed: true });

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
