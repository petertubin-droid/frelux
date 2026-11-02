/**
 * AI Paint Matcher
 * Upload a photo of a painted wall, find the closest color match from the database.
 * Uses canvas-based color extraction (no external AI API needed for basic matching).
 */

import type { DbPaintColor } from '@/types/database';

export interface ColorMatchResult {
  color: DbPaintColor;
  similarity: number; // 0-100, higher is better
  distance: number;   // RGB distance
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Extract the dominant/average color from an image file.
 * Uses canvas to sample pixels and find the most common color cluster.
 */
export async function extractColorFromImage(file: File): Promise<{ rgb: RGB; hex: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Downscale to 50x50 for fast sampling
        const canvas = document.createElement('canvas');
        canvas.width = 50;
        canvas.height = 50;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas not supported'));
          return;
        }
        ctx.drawImage(img, 0, 0, 50, 50);

        const imageData = ctx.getImageData(0, 0, 50, 50);
        const pixels = imageData.data;

        // Accumulate colors, ignoring near-white/near-black outliers
        let totalR = 0, totalG = 0, totalB = 0, count = 0;
        const colorBuckets: Record<string, { r: number; g: number; b: number; count: number }> = {};

        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const a = pixels[i + 3];

          // Skip transparent pixels
          if (a < 128) continue;

          // Skip extreme bright/dark (likely flash or shadow)
          const brightness = (r + g + b) / 3;
          if (brightness < 20 || brightness > 240) continue;

          totalR += r;
          totalG += g;
          totalB += b;
          count++;

          // Bucket colors (quantize to 32-step buckets)
          const bucketR = Math.round(r / 32) * 32;
          const bucketG = Math.round(g / 32) * 32;
          const bucketB = Math.round(b / 32) * 32;
          const key = `${bucketR},${bucketG},${bucketB}`;
          if (!colorBuckets[key]) colorBuckets[key] = { r: 0, g: 0, b: 0, count: 0 };
          colorBuckets[key].r += r;
          colorBuckets[key].g += g;
          colorBuckets[key].b += b;
          colorBuckets[key].count++;
        }

        if (count === 0) {
          reject(new Error('No valid pixels found in image'));
          return;
        }

        // Find the most common bucket (dominant color)
        let dominantBucket: { r: number; g: number; b: number; count: number } | null = null;
        for (const bucket of Object.values(colorBuckets)) {
          if (!dominantBucket || bucket.count > dominantBucket.count) {
            dominantBucket = bucket;
          }
        }

        const avgR = dominantBucket ? Math.round(dominantBucket.r / dominantBucket.count) : Math.round(totalR / count);
        const avgG = dominantBucket ? Math.round(dominantBucket.g / dominantBucket.count) : Math.round(totalG / count);
        const avgB = dominantBucket ? Math.round(dominantBucket.b / dominantBucket.count) : Math.round(totalB / count);

        const hex = rgbToHex(avgR, avgG, avgB);
        resolve({ rgb: { r: avgR, g: avgG, b: avgB }, hex });
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
}

/**
 * Find the closest paint colors from the database to a target RGB.
 * Uses weighted Euclidean distance in RGB space (accounts for human eye sensitivity).
 */
export function findClosestColors(targetRgb: RGB, colors: DbPaintColor[], maxResults = 5): ColorMatchResult[] {
  const results: ColorMatchResult[] = colors.map((color) => {
    const r = color.rgb_r;
    const g = color.rgb_g;
    const b = color.rgb_b;

    // Weighted Euclidean distance (human eye is more sensitive to green)
    const dr = (targetRgb.r - r) * 0.3;
    const dg = (targetRgb.g - g) * 0.59;
    const db = (targetRgb.b - b) * 0.11;
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);

    // Convert distance to similarity percentage (max possible distance ~ 100)
    const similarity = Math.max(0, Math.round(100 - (distance / 100) * 100));

    return { color, similarity, distance };
  });

  results.sort((a, b) => a.distance - b.distance);
  return results.slice(0, maxResults);
}

/**
 * Full pipeline: extract color from image, match against database.
 */
export async function matchPaintColor(
  file: File,
  colors: DbPaintColor[],
): Promise<{ extractedHex: string; extractedRgb: RGB; matches: ColorMatchResult[] }> {
  const { rgb, hex } = await extractColorFromImage(file);
  const matches = findClosestColors(rgb, colors, 5);
  return { extractedHex: hex, extractedRgb: rgb, matches };
}
