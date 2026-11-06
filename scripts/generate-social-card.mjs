/**
 * Branded social card generator.
 *
 * Every link preview, message and search result shows one of these files, so
 * the card must carry the same mark as the site icon and header rather than a
 * separate illustration. Outputs the 1200x630 card, its Open Graph copy and a
 * compressed JPEG for platforms that cap image weight.
 *
 * Run with `node scripts/generate-social-card.mjs`.
 */

import { writeFile } from "node:fs/promises";
import sharp from "sharp";

const BRAND = {
  tileTop: "#6D28D9",
  tileBottom: "#3B0B75",
  accent: "#F97316", // matches --brand-accent
  glyph: "#FFFFFF",
  ink: "#0A0A1A",
  body: "#E7E2FB",
  muted: "#B4A9D6",
  faint: "#8C80B4",
};

/** The architectural mark on its 512 grid, drawn at the origin so a group can scale it. */
function markGroup(size) {
  const k = (size / 512).toFixed(5);
  const glyphScale = 1.08;
  const tX = (256 - 258 * glyphScale).toFixed(3);
  const tY = (256 - 273 * glyphScale).toFixed(3);
  return `<g transform="scale(${k})">
    <rect width="512" height="512" rx="112" fill="url(#tile)"/>
    <g transform="translate(${tX} ${tY}) scale(${glyphScale})">
      <path d="M 144 108 L 372 108 L 338 178 L 222 178 L 222 230 L 320 230 L 286 294 L 222 294 L 222 398 L 144 398 Z" fill="${BRAND.glyph}"/>
      <rect x="144" y="412" width="228" height="26" rx="13" fill="${BRAND.accent}"/>
    </g>
  </g>`;
}

function cardSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="tile" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${BRAND.tileTop}"/>
      <stop offset="1" stop-color="${BRAND.tileBottom}"/>
    </linearGradient>
    <linearGradient id="field" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0A0A1A"/>
      <stop offset="0.55" stop-color="#160A33"/>
      <stop offset="1" stop-color="#2A0F5E"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.82" cy="0.18" r="0.55">
      <stop offset="0" stop-color="${BRAND.tileTop}" stop-opacity="0.45"/>
      <stop offset="1" stop-color="${BRAND.tileTop}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#field)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <g transform="translate(84 84)">${markGroup(96)}</g>
  <text x="204" y="150" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-size="44" font-weight="700" letter-spacing="0.5" fill="${BRAND.glyph}">FRELUX</text>
  <text x="206" y="176" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-size="15" font-weight="700" letter-spacing="5" fill="${BRAND.accent}">SMART CALC</text>
  <rect x="84" y="252" width="64" height="6" rx="3" fill="${BRAND.accent}"/>
  <text x="84" y="330" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-size="46" font-weight="700" fill="${BRAND.glyph}">Every trade. Every cost.</text>
  <text x="84" y="386" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-size="46" font-weight="700" fill="${BRAND.glyph}">One platform.</text>
  <text x="84" y="446" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-size="22" fill="${BRAND.body}">Calculators, bill of quantities, market pricing and project planning</text>
  <text x="84" y="480" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-size="22" fill="${BRAND.body}">for builders, quantity surveyors and clients.</text>
  <text x="84" y="570" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-size="20" font-weight="700" letter-spacing="1" fill="${BRAND.faint}">freluxtools.com</text>
  <g transform="translate(1020 470)">${markGroup(92)}</g>
</svg>`;
}

const svg = cardSvg();

await writeFile("public/social-cover.png", await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer());
await writeFile("public/og-image.png", await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer());
await writeFile(
  "public/og-image-opt.jpg",
  await sharp(Buffer.from(svg)).jpeg({ quality: 84, mozjpeg: true, progressive: true }).toBuffer(),
);

const meta = await sharp(Buffer.from(svg)).metadata();
console.log(`social card written: ${meta.width}x${meta.height}, png and jpeg`);
