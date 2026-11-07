import { describe, expect, it } from "vitest";
import sharp from "sharp";

/**
 * The header mark is a transparent crop of the brand artwork. Placed straight
 * on the page, an opaque plate inside the file would draw a white box around
 * the mark, which is exactly the defect this suite exists to prevent.
 */
const MARKS = [
  "public/brand/frelux-mark.png",
  "public/brand/frelux-icon.png",
  "public/logo-mark.png",
  "public/logo-mark-light.png",
];

describe("brand mark transparency", () => {
  it("paints no background of its own", async () => {
    for (const path of MARKS) {
      const { data, info } = await sharp(path)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      // Every corner clear: no tile, no border, no white plate.
      for (const [x, y] of [
        [0, 0],
        [info.width - 1, 0],
        [0, info.height - 1],
        [info.width - 1, info.height - 1],
      ]) {
        expect(data[(y * info.width + x) * 4 + 3], `${path} ${x},${y}`).toBe(0);
      }
    }
  });

  it("carries the artwork rather than an empty canvas", async () => {
    for (const path of MARKS) {
      const { data, info } = await sharp(path)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      let opaque = 0;
      for (let i = 0; i < data.length; i += 4)
        if (data[i + 3] > 200) opaque += 1;
      expect(opaque / (info.width * info.height), path).toBeGreaterThan(0.15);
    }
  });
});
