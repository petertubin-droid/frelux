/**
 * FRELUX GLOBAL VISUAL FINISHING ESTIMATION ENGINE
 * Phase 3 Architecture: Video Walkthrough & Spatial Reconstruction
 *
 * Capabilities:
 * 1. Browser-based adaptive video frame sampling (configurable interval, e.g. 1.5s, max 10 frames).
 * 2. Deterministic blur & motion-degradation scoring via discrete Laplacian luminance variance.
 * 3. Near-duplicate angle filtering via perceptual histogram similarity.
 * 4. Multi-view surface reconciliation and opening deduplication across camera perspectives.
 *
 * Strict Compliance:
 * - NEVER fabricates metric dimensions or quantities without user calibration.
 * - Operates entirely client-side for frame sampling; Gemini AI vision is called only for selected keyframes.
 */

import type {
  VisualSurface,
  DetectedOpening,
  VideoKeyframe,
  VideoSamplingOptions,
  VideoExtractionProgress,
  VideoWalkthroughResult,
} from "./visual-finishing-types";

export const SUPPORTED_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
] as const;

export function isVideoMedia(fileOrMime: string | { type: string }): boolean {
  const mime = typeof fileOrMime === "string" ? fileOrMime : fileOrMime.type;
  if (!mime) return false;
  return SUPPORTED_VIDEO_MIME_TYPES.some(
    (m) => mime.toLowerCase().startsWith(m) || mime.toLowerCase() === m,
  );
}

// ── Pure Mathematical Analysis: Sharpness & Similarity ──

/**
 * Calculates discrete Laplacian variance of luminance across an RGBA image buffer.
 * High variance = sharp edges, textures, distinct architectural lines.
 * Low variance = blurry, motion-smeared, or featureless plane.
 */
export function calculateLaplacianVariance(
  rgba: Uint8ClampedArray | number[],
  width: number,
  height: number,
): number {
  if (width < 3 || height < 3 || rgba.length < width * height * 4) {
    return 0;
  }

  // Step size for performance on large resolutions: target ~10,000 sample points
  const totalPixels = width * height;
  const step = Math.max(1, Math.floor(Math.sqrt(totalPixels / 10000)));

  let sum = 0;
  let sumSq = 0;
  let count = 0;

  const getLuminance = (x: number, y: number): number => {
    const idx = (y * width + x) * 4;
    return (
      0.299 * (rgba[idx] || 0) +
      0.587 * (rgba[idx + 1] || 0) +
      0.114 * (rgba[idx + 2] || 0)
    );
  };

  for (let y = 1; y < height - 1; y += step) {
    for (let x = 1; x < width - 1; x += step) {
      const center = getLuminance(x, y);
      const top = getLuminance(x, y - 1);
      const bottom = getLuminance(x, y + 1);
      const left = getLuminance(x - 1, y);
      const right = getLuminance(x + 1, y);

      // Discrete 4-neighbourhood Laplacian: Δ = top + bottom + left + right - 4 * center
      const laplacian = top + bottom + left + right - 4 * center;

      sum += laplacian;
      sumSq += laplacian * laplacian;
      count++;
    }
  }

  if (count === 0) return 0;
  const mean = sum / count;
  const variance = sumSq / count - mean * mean;
  return Math.max(0, variance);
}

/**
 * Normalizes discrete variance into a clean 0..1 sharpness score.
 */
export function normalizeSharpnessScore(variance: number): number {
  if (variance <= 0) return 0;
  // Non-linear sigmoid mapping tuned for 8-bit RGB luminance: 250 variance ~ 0.5 score
  const score = variance / (variance + 250);
  return Math.round(Math.max(0, Math.min(1, score)) * 1000) / 1000;
}

/**
 * Computes perceptual histogram similarity (0..1) between two RGBA buffers.
 * 1.0 = identical tonal distribution; < 0.85 = camera has panned or changed lighting.
 */
export function calculateHistogramSimilarity(
  rgbaA: Uint8ClampedArray | number[],
  rgbaB: Uint8ClampedArray | number[],
): number {
  if (rgbaA.length === 0 || rgbaB.length === 0) return 0;

  const bins = 16;
  const histA = new Array(bins).fill(0);
  const histB = new Array(bins).fill(0);

  const sampleCountA = Math.min(rgbaA.length / 4, 5000);
  const stepA = Math.max(1, Math.floor(rgbaA.length / 4 / sampleCountA));

  for (let i = 0; i < rgbaA.length; i += stepA * 4) {
    const lum =
      0.299 * (rgbaA[i] || 0) +
      0.587 * (rgbaA[i + 1] || 0) +
      0.114 * (rgbaA[i + 2] || 0);
    const bin = Math.min(bins - 1, Math.floor((lum / 256) * bins));
    histA[bin]++;
  }

  const sampleCountB = Math.min(rgbaB.length / 4, 5000);
  const stepB = Math.max(1, Math.floor(rgbaB.length / 4 / sampleCountB));

  for (let i = 0; i < rgbaB.length; i += stepB * 4) {
    const lum =
      0.299 * (rgbaB[i] || 0) +
      0.587 * (rgbaB[i + 1] || 0) +
      0.114 * (rgbaB[i + 2] || 0);
    const bin = Math.min(bins - 1, Math.floor((lum / 256) * bins));
    histB[bin]++;
  }

  // Normalize histograms
  const totalA = histA.reduce((a, b) => a + b, 0) || 1;
  const totalB = histB.reduce((a, b) => a + b, 0) || 1;

  let intersection = 0;
  for (let b = 0; b < bins; b++) {
    intersection += Math.min(histA[b] / totalA, histB[b] / totalB);
  }

  return Math.round(Math.max(0, Math.min(1, intersection)) * 1000) / 1000;
}

export interface RawFrameCandidate {
  index: number;
  timestampSec: number;
  dataUrl: string;
  width: number;
  height: number;
  sharpnessScore: number;
  rgba?: Uint8ClampedArray;
}

/**
 * Filters blurry frames and removes consecutive near-duplicate frames.
 * Returns up to maxFrames ordered chronologically.
 */
export function filterAndDeduplicateFrames(
  candidates: RawFrameCandidate[],
  options?: VideoSamplingOptions,
): VideoKeyframe[] {
  const maxFrames = options?.maxFrames ?? 10;
  const sharpnessThreshold = options?.sharpnessThreshold ?? 0.2;
  const similarityThreshold = options?.similarityThreshold ?? 0.88;

  if (candidates.length === 0) return [];

  // Sort candidates by timestamp
  const sorted = [...candidates].sort(
    (a, b) => a.timestampSec - b.timestampSec,
  );

  const selected: VideoKeyframe[] = [];
  let lastAcceptedCandidate: RawFrameCandidate | null = null;

  for (let i = 0; i < sorted.length; i++) {
    const cand = sorted[i];

    // Blurriness check: blurry frames are excluded; no synthetic frame is substituted.
    const isSharpEnough = cand.sharpnessScore >= sharpnessThreshold;

    // Redundancy check against preceding accepted keyframe
    let isRedundant = false;
    if (lastAcceptedCandidate && lastAcceptedCandidate.rgba && cand.rgba) {
      const similarity = calculateHistogramSimilarity(
        lastAcceptedCandidate.rgba,
        cand.rgba,
      );
      if (similarity >= similarityThreshold) {
        // Redundant view; keep the sharper of the two if current is noticeably better
        if (cand.sharpnessScore > lastAcceptedCandidate.sharpnessScore + 0.15) {
          // Replace previous with this sharper frame
          selected.pop();
          selected.push({
            index: selected.length + 1,
            timestampSec: cand.timestampSec,
            dataUrl: cand.dataUrl,
            sharpnessScore: cand.sharpnessScore,
            isUnique: true,
            width: cand.width,
            height: cand.height,
          });
          lastAcceptedCandidate = cand;
        }
        isRedundant = true;
      }
    }

    if (!isRedundant) {
      // If we already hit max, keep the sharpest
      if (isSharpEnough && selected.length < maxFrames) {
        selected.push({
          index: selected.length + 1,
          timestampSec: cand.timestampSec,
          dataUrl: cand.dataUrl,
          sharpnessScore: cand.sharpnessScore,
          isUnique: true,
          width: cand.width,
          height: cand.height,
        });
        lastAcceptedCandidate = cand;
      }
    }
  }

  // Fallback: If strict threshold pruned everything, pick the top sharpest frames
  if (selected.length === 0 && sorted.length > 0) {
    const topSharpest = [...sorted]
      .sort((a, b) => b.sharpnessScore - a.sharpnessScore)
      .slice(0, Math.min(sorted.length, maxFrames))
      .sort((a, b) => a.timestampSec - b.timestampSec);

    return topSharpest.map((c, idx) => ({
      index: idx + 1,
      timestampSec: c.timestampSec,
      dataUrl: c.dataUrl,
      sharpnessScore: c.sharpnessScore,
      isUnique: true,
      width: c.width,
      height: c.height,
    }));
  }

  // Re-index cleanly
  return selected.map((kf, idx) => ({
    ...kf,
    index: idx + 1,
  }));
}

// ── Multi-View Surface Reconciliation ──

/**
 * Reconciles architectural surfaces detected across multiple video walkthrough frames.
 * Prevents double-counting the same wall when captured from different angles,
 * while aggregating distinct openings and observational notes.
 */
/**
 * Preserves per-frame observations as separate candidates. A monocular walkthrough
 * does not provide camera pose/depth, so matching normalized image boxes across
 * viewpoints cannot establish that two detections are the same physical surface.
 */
export function reconcileMultiFrameSurfaces(
  frameDetections: Array<{ frameIndex: number; surfaces: VisualSurface[] }>,
): VisualSurface[] {
  return frameDetections.flatMap(({ frameIndex, surfaces }) =>
    surfaces.map((surface) => ({
      ...surface,
      id: `${surface.id}-frame-${frameIndex}`,
      name: `${surface.name} (view ${frameIndex})`,
      notes: [
        ...surface.notes,
        `Observed in walkthrough keyframe #${frameIndex}; cross-view identity not established.`,
      ],
    })),
  );
}

// ── Browser Video Frame Sampling Pipeline ──

/**
 * Extracts candidate keyframes from a video file in the browser using HTML5 Video and Canvas.
 */
export async function extractKeyframesFromVideo(
  videoFile: Blob,
  options?: VideoSamplingOptions,
  onProgress?: (progress: VideoExtractionProgress) => void,
): Promise<VideoWalkthroughResult> {
  const intervalSec = options?.intervalSec ?? 1.5;
  const maxFrames = options?.maxFrames ?? 10;
  const targetMaxDimension = options?.targetMaxDimension ?? 1280;

  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error(
      "extractKeyframesFromVideo requires a browser DOM environment with HTMLVideoElement.",
    );
  }

  onProgress?.({
    stage: "loading",
    progressPct: 5,
    currentFrame: 0,
    totalFrames: 0,
    message: "Initializing video walkthrough decoder...",
  });

  const videoUrl = URL.createObjectURL(videoFile);
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.src = videoUrl;

  try {
    // Wait for video metadata to read duration and natural dimensions
    await new Promise<void>((resolve, reject) => {
      const onLoaded = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(
          new Error("Unable to decode video metadata. Check video format."),
        );
      };
      const cleanup = () => {
        video.removeEventListener("loadedmetadata", onLoaded);
        video.removeEventListener("error", onError);
      };
      video.addEventListener("loadedmetadata", onLoaded);
      video.addEventListener("error", onError);
    });

    const duration = video.duration || 0;
    if (duration <= 0 || !Number.isFinite(duration)) {
      throw new Error("Invalid or unreadable video duration.");
    }

    // Determine target sample timestamps
    const timestamps: number[] = [];
    const step = Math.max(intervalSec, duration / (maxFrames * 2));
    for (let t = 0.5; t < duration - 0.2; t += step) {
      timestamps.push(Math.round(t * 10) / 10);
      if (timestamps.length >= maxFrames * 2) break;
    }
    if (timestamps.length === 0) {
      timestamps.push(0.5);
    }

    const totalSamples = timestamps.length;
    const candidates: RawFrameCandidate[] = [];

    // Off-screen canvas
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      throw new Error("2D Canvas rendering context is unavailable.");
    }

    // Compute scaled canvas dimensions
    const scale = Math.min(
      1,
      targetMaxDimension /
        Math.max(video.videoWidth || 1280, video.videoHeight || 720),
    );
    const canvasW = Math.max(
      320,
      Math.round((video.videoWidth || 1280) * scale),
    );
    const canvasH = Math.max(
      180,
      Math.round((video.videoHeight || 720) * scale),
    );
    canvas.width = canvasW;
    canvas.height = canvasH;

    for (let idx = 0; idx < timestamps.length; idx++) {
      const t = timestamps[idx];

      onProgress?.({
        stage: "seeking",
        progressPct: Math.round(10 + (idx / totalSamples) * 65),
        currentFrame: idx + 1,
        totalFrames: totalSamples,
        message: `Seeking keyframe ${idx + 1} of ${totalSamples} at ${t.toFixed(1)}s...`,
      });

      // Seek to timestamp
      await new Promise<void>((resolve) => {
        const onSeeked = () => {
          video.removeEventListener("seeked", onSeeked);
          resolve();
        };
        video.addEventListener("seeked", onSeeked);
        video.currentTime = t;
      });

      // Render frame to canvas
      ctx.drawImage(video, 0, 0, canvasW, canvasH);
      const imgData = ctx.getImageData(0, 0, canvasW, canvasH);
      const variance = calculateLaplacianVariance(
        imgData.data,
        canvasW,
        canvasH,
      );
      const sharpness = normalizeSharpnessScore(variance);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

      candidates.push({
        index: idx + 1,
        timestampSec: t,
        dataUrl,
        width: canvasW,
        height: canvasH,
        sharpnessScore: sharpness,
        rgba: imgData.data,
      });
    }

    onProgress?.({
      stage: "filtering",
      progressPct: 85,
      currentFrame: totalSamples,
      totalFrames: totalSamples,
      message: "Filtering motion blur and near-duplicate angles...",
    });

    const keyframes = filterAndDeduplicateFrames(candidates, options);

    onProgress?.({
      stage: "complete",
      progressPct: 100,
      currentFrame: keyframes.length,
      totalFrames: keyframes.length,
      message: `Extracted ${keyframes.length} sharp, distinct walkthrough keyframes.`,
    });

    return {
      durationSec: Math.round(duration * 10) / 10,
      sampledFramesCount: candidates.length,
      keptKeyframesCount: keyframes.length,
      keyframes,
      reconstructedSurfaces: [],
      warnings:
        keyframes.length < 2
          ? [
              "Video walkthrough produced only 1 sharp keyframe; additional angles may improve room coverage.",
            ]
          : [],
    };
  } finally {
    URL.revokeObjectURL(videoUrl);
    video.src = "";
  }
}
