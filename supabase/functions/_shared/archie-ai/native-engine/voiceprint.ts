// =========================================================
// ARCHIE NATIVE ENGINE — VOICEPRINT (SPEAKER RECOGNITION CORE)
// supabase/functions/_shared/archie-ai/native-engine/voiceprint.ts
//
// GENUINE speaker recognition, deterministic and provider-free:
//
//   * FEATURE EXTRACTION: from raw mono PCM, ARCHIE derives a
//     fixed 8-dimensional voiceprint vector — median voiced
//     pitch, pitch spread, voiced-frame ratio, energy-envelope
//     statistics, spectral centroid (via a real radix-2 FFT),
//     spectral spread, zero-crossing rate and syllable-nuclei
//     rate. Real DSP, testable anywhere, no cloud AI.
//   * ENROLLMENT: deliberate, multi-sample. 3+ utterances are
//     median-combined into ONE owner voiceprint. Audio NEVER
//     leaves the device — only the derived vector transits.
//   * MATCHING: normalized weighted distance → score 0..1
//     against a configurable threshold (log-scaled pitch —
//     a doubled pitch is a large perceptual distance, and the
//     metric discriminates it). Too few voiced frames
//     refuses honestly (null), never guesses.
//
// HONEST SECURITY LABEL (spec §§9,10 — never overstated):
//   This is a STATISTICAL SPEAKER-SIMILARITY SIGNAL — an
//   identification hint for personalization. It is NOT
//   cryptographic proof of identity and is vulnerable to
//   replay, recording and synthesis. It can NEVER authorize
//   protected operations: Owner Authority, trusted-device
//   checks and server-side authorization remain the ONLY
//   gates for high-risk actions. Voice recognition ≠ authority.
// =========================================================

/** Voiceprint vector dimensionality (fixed). */
export const VOICEPRINT_DIM = 8;

/** Minimum voiced frames required to derive a vector at all. */
export const MIN_VOICED_FRAMES = 12;

/** Default match threshold on the 0..1 similarity score. */
export const DEFAULT_MATCH_THRESHOLD = 0.72;

/** Default samples required for a COMPLETE enrollment. */
export const DEFAULT_ENROLLMENT_SAMPLES = 3;

export interface VoiceprintVector {
  /** Fixed-length feature vector (VOICEPRINT_DIM). */
  features: number[];
  /** Count of voiced frames the vector was derived from. */
  voicedFrames: number;
  /** Sample rate the features were computed at. */
  sampleRate: number;
  /** Duration of the analyzed audio, seconds. */
  durationSec: number;
}

export type VoiceprintExtraction =
  | { ok: true; vector: VoiceprintVector }
  | { ok: false; code: "SILENCE" | "TOO_SHORT" };

/** Per-dimension weights of the distance metric. Pitch is the
 *  strongest physiological discriminator (log-scaled below —
 *  pitch perception is logarithmic); the rest add speaking-
 *  style separation. Sum = 1. */
const FEATURE_WEIGHTS = [0.45, 0.08, 0.07, 0.06, 0.12, 0.08, 0.06, 0.08];

// ---------------------------------------------------------
// Fundamental frequency (same autocorrelation family as the
// voice bank — deterministic, honest)
// ---------------------------------------------------------
function framePitchHz(frame: Float32Array, sampleRate: number): number {
  const minLag = Math.floor(sampleRate / 400);
  const maxLag = Math.floor(sampleRate / 60);
  let energy = 0;
  for (let i = 0; i < frame.length; i++) energy += frame[i] * frame[i];
  if (energy < 1e-4 * frame.length) return 0;
  let bestCorr = 0;
  let bestLag = -1;
  for (let lag = minLag; lag <= maxLag && lag < frame.length; lag++) {
    let corr = 0;
    let norm = 0;
    for (let i = 0; i + lag < frame.length; i++) {
      corr += frame[i] * frame[i + lag];
      norm += frame[i + lag] * frame[i + lag];
    }
    const normalized = norm > 0 ? corr / Math.sqrt(norm) : 0;
    if (normalized > bestCorr) {
      bestCorr = normalized;
      bestLag = lag;
    }
  }
  return bestLag > 0 ? sampleRate / bestLag : 0;
}

/** In-place iterative radix-2 FFT (real magnitude spectrum).
 *  length must be a power of two. */
export function fftMagnitude(frame: Float32Array): Float32Array {
  const n = frame.length;
  if ((n & (n - 1)) !== 0)
    throw new Error("fftMagnitude: length must be a power of two");
  // Hann window to reduce spectral leakage
  const re = new Float32Array(n);
  const im = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    re[i] = frame[i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)));
  }
  // bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  // butterflies
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const aRe = re[i + k];
        const aIm = im[i + k];
        const bRe = re[i + k + len / 2] * curRe - im[i + k + len / 2] * curIm;
        const bIm = re[i + k + len / 2] * curIm + im[i + k + len / 2] * curRe;
        re[i + k] = aRe + bRe;
        im[i + k] = aIm + bIm;
        re[i + k + len / 2] = aRe - bRe;
        im[i + k + len / 2] = aIm - bIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
  const mag = new Float32Array(n / 2);
  for (let i = 0; i < n / 2; i++) {
    mag[i] = Math.hypot(re[i], im[i]);
  }
  return mag;
}

/** Spectral centroid + spread (Hz) of a magnitude spectrum. */
function spectralStats(
  mag: Float32Array,
  sampleRate: number,
): { centroidHz: number; spreadHz: number } {
  const bins = mag.length;
  const binHz = sampleRate / 2 / bins;
  let sum = 0;
  let weighted = 0;
  for (let i = 0; i < bins; i++) {
    sum += mag[i];
    weighted += mag[i] * i * binHz;
  }
  if (sum <= 0) return { centroidHz: 0, spreadHz: 0 };
  const centroidHz = weighted / sum;
  let variance = 0;
  for (let i = 0; i < bins; i++) {
    const f = i * binHz;
    variance += mag[i] * (f - centroidHz) * (f - centroidHz);
  }
  return { centroidHz, spreadHz: Math.sqrt(variance / sum) };
}

/**
 * Extract a deterministic voiceprint vector from mono PCM.
 * Same audio → same vector, bit for bit. Refuses (never
 * guesses) on silence or too-short audio.
 */
export function extractVoiceprint(
  pcm: Float32Array,
  sampleRate: number,
): VoiceprintExtraction {
  if (!pcm || pcm.length < sampleRate * 0.4 || sampleRate <= 0) {
    return { ok: false, code: "TOO_SHORT" };
  }
  const FRAME = 2048;
  const HOP = 1024;
  const pitches: number[] = [];
  let voicedFrames = 0;
  let totalFrames = 0;
  const energies: number[] = [];
  const centroids: number[] = [];
  const spreads: number[] = [];
  const zcrs: number[] = [];

  for (let i = 0; i + FRAME <= pcm.length; i += HOP) {
    const frame = pcm.subarray(i, i + FRAME);
    totalFrames++;
    const hz = framePitchHz(frame, sampleRate);
    if (hz > 0) {
      voicedFrames++;
      pitches.push(hz);
    }
    // energy of this frame
    let energy = 0;
    for (let j = 0; j < frame.length; j++) energy += frame[j] * frame[j];
    energies.push(energy / frame.length);
    // spectral shape (voiced frames only — speech, not silence)
    if (hz > 0) {
      const mag = fftMagnitude(frame);
      const { centroidHz, spreadHz } = spectralStats(mag, sampleRate);
      centroids.push(centroidHz);
      spreads.push(spreadHz);
      // zero-crossing rate
      let zc = 0;
      for (let j = 1; j < frame.length; j++) {
        if (frame[j - 1] < 0 !== frame[j] < 0) zc++;
      }
      zcrs.push(zc / frame.length);
    }
  }

  if (voicedFrames < MIN_VOICED_FRAMES || pitches.length === 0) {
    return { ok: false, code: "SILENCE" };
  }

  const median = (xs: number[]): number => {
    const s = [...xs].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  };
  const pitchHz = median(pitches);
  // pitch spread: interquartile-style band / median (dimensionless)
  const sortedP = [...pitches].sort((a, b) => a - b);
  const p75 = sortedP[Math.floor(sortedP.length * 0.75)];
  const p25 = sortedP[Math.floor(sortedP.length * 0.25)];
  const pitchSpread = pitchHz > 0 ? (p75 - p25) / pitchHz : 0;

  const durationSec = pcm.length / sampleRate;
  // syllable-nuclei rate (energy-envelope peaks per second),
  // same family as the voice-bank rate estimator
  const win = Math.max(1, Math.round(sampleRate * 0.02));
  const env: number[] = [];
  let acc = 0;
  for (let i = 0; i < pcm.length; i++) {
    acc += pcm[i] * pcm[i];
    if (i >= win) acc -= pcm[i - win] * pcm[i - win];
    if (i % win === win - 1) env.push(acc / win);
  }
  let peaks = 0;
  for (let i = 1; i < env.length - 1; i++) {
    if (env[i] > env[i - 1] && env[i] >= env[i + 1] && env[i] > 0.01) peaks++;
  }
  const nucleiRate = peaks / (durationSec || 1);

  const features = [
    pitchHz,
    pitchSpread,
    voicedFrames / (totalFrames || 1),
    median(energies),
    median(centroids),
    median(spreads),
    median(zcrs),
    nucleiRate,
  ];

  return {
    ok: true,
    vector: {
      features,
      voicedFrames,
      sampleRate,
      durationSec,
    },
  };
}

// ---------------------------------------------------------
// Normalization + distance
// ---------------------------------------------------------

/** Feature scales for normalizing heterogeneous dimensions
 *  into comparable ranges (ratios 0..1, etc.). Dimension 0
 *  (pitch) is LOG-scaled — pitch perception is logarithmic,
 *  so a 120→250 Hz difference reads as the large perceptual
 *  distance it actually is, not a clamped sliver. */
const FEATURE_SCALES = [0, 0.4, 1, 0.05, 2000, 1200, 0.2, 5];

function normalize(features: number[]): number[] {
  return features.map((f, i) => {
    if (i === 0) {
      const logPitch = Math.log2(Math.max(f, 20) / 110) / 1.5;
      return Math.min(1, Math.max(-1, logPitch));
    }
    return Math.min(1, Math.max(-1, f / FEATURE_SCALES[i]));
  });
}

/** Weighted normalized distance between two vectors → 0..1
 *  similarity score (1 = identical). Deterministic. */
export function voiceprintSimilarity(a: number[], b: number[]): number | null {
  if (
    !Array.isArray(a) ||
    !Array.isArray(b) ||
    a.length !== VOICEPRINT_DIM ||
    b.length !== VOICEPRINT_DIM ||
    a.some((x) => !Number.isFinite(x)) ||
    b.some((x) => !Number.isFinite(x))
  ) {
    return null;
  }
  const na = normalize(a);
  const nb = normalize(b);
  let distance = 0;
  let weightSum = 0;
  for (let i = 0; i < VOICEPRINT_DIM; i++) {
    distance += FEATURE_WEIGHTS[i] * Math.abs(na[i] - nb[i]);
    weightSum += FEATURE_WEIGHTS[i];
  }
  return Math.max(0, 1 - distance / (weightSum || 1));
}

// ---------------------------------------------------------
// Enrollment
// ---------------------------------------------------------

export interface EnrolledVoiceprint {
  /** Median-combined owner vector (VOICEPRINT_DIM). */
  features: number[];
  sampleCount: number;
  /** ISO timestamp of the last enrollment change. */
  updatedAt: string;
  /** Match threshold the profile enforces. */
  threshold: number;
}

export type EnrollResult =
  | { ok: true; profile: EnrolledVoiceprint; complete: boolean }
  | { ok: false; code: "INVALID_VECTOR" | "SILENCE" };

/**
 * Combine enrollment samples (median per dimension) into the
 * owner's profile vector. Deliberate, explicit, owner-driven —
 * nothing here auto-enrolls from arbitrary recordings.
 */
export function enrollVoiceprint(input: {
  samples: VoiceprintVector[];
  threshold?: number;
  now: string;
}): EnrollResult {
  const valid = input.samples.filter(
    (s) =>
      Array.isArray(s.features) &&
      s.features.length === VOICEPRINT_DIM &&
      s.features.every((f) => Number.isFinite(f)) &&
      s.voicedFrames >= MIN_VOICED_FRAMES,
  );
  if (valid.length === 0) return { ok: false, code: "SILENCE" };
  const combined: number[] = [];
  for (let d = 0; d < VOICEPRINT_DIM; d++) {
    const dim = valid.map((s) => s.features[d]).sort((a, b) => a - b);
    combined.push(dim[Math.floor(dim.length / 2)]);
  }
  return {
    ok: true,
    profile: {
      features: combined,
      sampleCount: valid.length,
      updatedAt: input.now,
      threshold: input.threshold ?? DEFAULT_MATCH_THRESHOLD,
    },
    complete: valid.length >= DEFAULT_ENROLLMENT_SAMPLES,
  };
}

// ---------------------------------------------------------
// Verification (the authentication SIGNAL — not authority)
// ---------------------------------------------------------

export interface SpeakerMatch {
  /** 0..1 similarity to the owner's enrolled voiceprint. */
  score: number;
  /** Threshold decision at the profile's own threshold. */
  match: boolean;
  /** Whether enough voiced audio existed to judge at all. */
  determinable: boolean;
  /** The honest security label — always surfaced with the
   *  signal, never detached. */
  securityLabel: string;
}

export const VOICEPRINT_SECURITY_LABEL =
  "statistical speaker-similarity signal — an identification hint for personalization, NOT cryptographic proof of identity (vulnerable to replay/recording/synthesis); can never authorize protected operations";

/** Compare an utterance vector against the enrolled owner
 *  profile. Missing/invalid data → determinable:false, never
 *  a guessed match. */
export function verifySpeaker(
  utterance: VoiceprintVector | null,
  profile: EnrolledVoiceprint | null,
): SpeakerMatch {
  if (
    !utterance ||
    !profile ||
    !Array.isArray(profile.features) ||
    profile.features.length !== VOICEPRINT_DIM
  ) {
    return {
      score: 0,
      match: false,
      determinable: false,
      securityLabel: VOICEPRINT_SECURITY_LABEL,
    };
  }
  const score = voiceprintSimilarity(utterance.features, profile.features);
  if (score == null || utterance.voicedFrames < MIN_VOICED_FRAMES) {
    return {
      score: 0,
      match: false,
      determinable: false,
      securityLabel: VOICEPRINT_SECURITY_LABEL,
    };
  }
  const threshold = profile.threshold ?? DEFAULT_MATCH_THRESHOLD;
  return {
    score,
    match: score >= threshold,
    determinable: true,
    securityLabel: VOICEPRINT_SECURITY_LABEL,
  };
}
