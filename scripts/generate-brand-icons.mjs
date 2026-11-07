/**
 * Brand icon generator.
 *
 * Every icon, favicon, Apple touch icon and the in-nav mark is cut from one
 * transparent master, public/brand/frelux-icon.png, so no surface can drift
 * from the others. Run with `node scripts/generate-brand-icons.mjs`.
 *
 * Design rules the assets must satisfy:
 * - The artwork keeps a transparent background everywhere the surface can show
 *   through a PNG: no white plate, no border, no rounded tile drawn in.
 * - Maskable and Apple icons need an opaque edge, because a platform mask or the
 *   iOS home screen paints its own colour behind a transparent corner. Those
 *   two composited on the brand night surface instead of white.
 * - Nothing is regenerated from a wider lockup: the mark is the artwork crop.
 */

import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const SOURCE = "public/brand/frelux-icon.png";
const NIGHT = { r: 10, g: 10, b: 26, alpha: 1 };

const master = sharp(SOURCE).trim({ threshold: 1 });

/** Artwork fitted inside a square, transparent outside the art. */
async function transparentSquare(size, coverage) {
  const art = await master
    .clone()
    .resize(Math.round(size * coverage), Math.round(size * coverage), {
      fit: "inside",
      withoutEnlargement: false,
      kernel: "lanczos3",
    })
    .png()
    .toBuffer();
  const meta = await sharp(art).metadata();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: art,
        left: Math.round((size - (meta.width ?? size)) / 2),
        top: Math.round((size - (meta.height ?? size)) / 2),
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Opaque brand tile, artwork inside the platform safe zone. */
async function opaqueSquare(size, coverage) {
  const art = await master
    .clone()
    .resize(Math.round(size * coverage), Math.round(size * coverage), {
      fit: "inside",
      kernel: "lanczos3",
    })
    .png()
    .toBuffer();
  const meta = await sharp(art).metadata();
  return sharp({
    create: { width: size, height: size, channels: 4, background: NIGHT },
  })
    .composite([
      {
        input: art,
        left: Math.round((size - (meta.width ?? size)) / 2),
        top: Math.round((size - (meta.height ?? size)) / 2),
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function write(path, buffer) {
  await mkdir(path.replace(/\/[^/]+$/, ""), { recursive: true });
  await sharp(buffer).toFile(path);
  return path;
}

// The in-nav mark keeps the artwork crop: a square canvas would pad a wide
// composition and make the mark look small in the header.
await sharp(SOURCE)
  .trim({ threshold: 1 })
  .resize({ width: 512, kernel: "lanczos3" })
  .png({ compressionLevel: 9 })
  .toFile("public/brand/frelux-mark.png");

await write("public/icon-512.png", await transparentSquare(512, 0.94));
await write("public/icon-192.png", await transparentSquare(192, 0.94));
await write("public/favicon-48.png", await transparentSquare(48, 0.98));
await write("public/favicon-32.png", await transparentSquare(32, 0.98));
await write("public/favicon-16.png", await transparentSquare(16, 0.98));

// Maskable and Apple icons bleed to the edge: their platform paints the mask.
await write("public/icon-maskable-512.png", await opaqueSquare(512, 0.7));
await write("public/apple-touch-icon.png", await opaqueSquare(180, 0.78));

// Legacy raster marks still referenced by share cards.
for (const path of ["public/logo-mark.png", "public/logo-mark-light.png"]) {
  await write(path, await transparentSquare(256, 0.94));
}

/**
 * Pack PNG buffers into one .ico container. sharp cannot encode ICO, and the
 * format is a short header plus the PNG payloads Windows already understands.
 */
function packIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + images.length * 16;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

// The .ico container holds the three sizes Windows and old browsers ask for.
const icoImages = await Promise.all(
  [48, 32, 16].map(async (size) => ({
    size,
    data: await transparentSquare(size, 0.98),
  })),
);
await mkdir("public", { recursive: true });
await writeFile("public/favicon.ico", packIco(icoImages));

console.log("brand icons regenerated from", SOURCE);
