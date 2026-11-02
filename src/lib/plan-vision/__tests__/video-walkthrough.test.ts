import { describe, expect, it } from "vitest";
import {
  calculateHistogramSimilarity,
  calculateLaplacianVariance,
  filterAndDeduplicateFrames,
  isVideoMedia,
  reconcileMultiFrameSurfaces,
} from "../video-walkthrough";
import type { VisualSurface } from "../visual-finishing-types";

describe("video-walkthrough", () => {
  it("recognizes supported video MIME types", () => {
    expect(isVideoMedia("video/mp4")).toBe(true);
    expect(isVideoMedia({ type: "video/webm; codecs=vp9" })).toBe(true);
    expect(isVideoMedia("image/jpeg")).toBe(false);
  });

  it("scores a uniform image as zero laplacian variance and handles invalid bounds", () => {
    const pixels = new Uint8ClampedArray(5 * 5 * 4).fill(100);
    expect(calculateLaplacianVariance(pixels, 5, 5)).toBe(0);
    expect(calculateLaplacianVariance(pixels, 2, 2)).toBe(0);
  });

  it("scores identical histograms as maximally similar", () => {
    const image = new Uint8ClampedArray(20 * 4);
    for (let i = 0; i < image.length; i += 4) {
      image[i] = image[i + 1] = image[i + 2] = i * 2;
      image[i + 3] = 255;
    }
    expect(calculateHistogramSimilarity(image, image)).toBe(1);
  });

  it("filters blurry frames and caps accepted keyframes", () => {
    const frames = Array.from({ length: 15 }, (_, i) => ({
      index: i + 1,
      timestampSec: i,
      dataUrl: `data:image/jpeg;base64,frame${i}`,
      width: 640,
      height: 480,
      sharpnessScore: i === 0 ? 0.05 : 0.7,
    }));
    const selected = filterAndDeduplicateFrames(frames, { maxFrames: 10 });
    expect(selected).toHaveLength(10);
    expect(selected.every((f) => f.sharpnessScore >= 0.2)).toBe(true);
  });

  it("preserves cross-view candidates without claiming spatial identity", () => {
    const surface = (
      id: string,
      confidence: number,
      notes: string[],
    ): VisualSurface => ({
      id,
      category: "wall",
      name: "Front Wall",
      confidence,
      bbox: { x: 0.1, y: 0.1, w: 0.8, h: 0.8 },
      measurementStatus: "incomplete",
      calibrationMethod: "uncalibrated",
      widthM: null,
      heightM: null,
      grossAreaM2: null,
      openings: [],
      deductedOpeningAreaM2: 0,
      netAreaM2: null,
      surfaceCondition: "painted_good",
      isPartiallyObscured: false,
      notes,
    });
    const merged = reconcileMultiFrameSurfaces([
      { frameIndex: 1, surfaces: [surface("a", 0.7, ["frame one"])] },
      { frameIndex: 2, surfaces: [surface("b", 0.9, ["frame two"])] },
    ]);
    expect(merged).toHaveLength(2);
    expect(merged[0].name).toContain("view 1");
    expect(merged[1].name).toContain("view 2");
    expect(merged[1].notes.join(" ")).toContain("identity not established");
  });
});
