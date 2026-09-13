// =========================================================
// ARCHIE VOICEPRINT — SPEAKER RECOGNITION CORE TESTS
// src/lib/archie/__tests__/voiceprint.test.ts
//
// Real DSP, verified at the math:
//   * FFT: a pure tone peaks at the exact expected bin
//   * extraction: deterministic, refuses silence/short audio
//   * similarity: same speaker (jittered) scores high across
//     the threshold; a different-pitch speaker scores low
//   * enrollment: deliberate, multi-sample, median-combined
//   * verification: honest determinable:false when data is
//     insufficient — never a guessed match
//   * SECURITY: the signal's limits are labeled on every
//     result (voice ≠ identity, voice ≠ authority)
// =========================================================
import { describe, expect, it } from "vitest";
import {
  DEFAULT_ENROLLMENT_SAMPLES,
  DEFAULT_MATCH_THRESHOLD,
  MIN_VOICED_FRAMES,
  VOICEPRINT_DIM,
  VOICEPRINT_SECURITY_LABEL,
  enrollVoiceprint,
  extractVoiceprint,
  fftMagnitude,
  verifySpeaker,
  voiceprintSimilarity,
  type EnrolledVoiceprint,
  type VoiceprintVector,
} from "@studio-shared/archie-ai/native-engine/voiceprint";

// ---------------------------------------------------------
// Synthetic voiced PCM: harmonic-rich glottal-ish source —
// voiced frames for the pitch tracker, real spectra for
// the FFT path. Deterministic by construction.
// ---------------------------------------------------------
function voicedPcm(opts: {
  pitchHz: number;
  durationSec: number;
  sampleRate?: number;
  noise?: number;
  seed?: number;
}): Float32Array {
  const sr = opts.sampleRate ?? 22_050;
  const n = Math.round(opts.durationSec * sr);
  const out = new Float32Array(n);
  let noiseState = (opts.seed ?? 1) * 7_327;
  const rand = () => {
    // small deterministic LCG noise
    noiseState = (noiseState * 1_103_515_245 + 12_345) % 2_147_483_647;
    return (noiseState / 2_147_483_647) * 2 - 1;
  };
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const f = opts.pitchHz * (1 + 0.02 * Math.sin(2 * Math.PI * 0.5 * t));
    const phase = 2 * Math.PI * f * t;
    // fundamental + 3 harmonics ≈ voiced speech energy
    const v =
      0.6 * Math.sin(phase) +
      0.25 * Math.sin(2 * phase) +
      0.12 * Math.sin(3 * phase) +
      0.06 * Math.sin(4 * phase);
    out[i] =
      v * (0.5 + 0.5 * Math.sin(2 * Math.PI * 1.7 * t)) +
      (opts.noise ?? 0.005) * rand();
  }
  return out;
}

describe("fftMagnitude", () => {
  it("peaks a pure tone at the exact expected bin", () => {
    const sr = 8000;
    const f = 1000; // Hz
    const frame = new Float32Array(2048);
    for (let i = 0; i < frame.length; i++) {
      frame[i] = Math.sin((2 * Math.PI * f * i) / sr);
    }
    const mag = fftMagnitude(frame);
    let peakBin = 0;
    for (let i = 1; i < mag.length; i++) {
      if (mag[i] > mag[peakBin]) peakBin = i;
    }
    // bin = f / (sr/N) = 1000 / (8000/2048) = 256
    expect(peakBin).toBe(256);
  });

  it("refuses non-power-of-two lengths honestly", () => {
    expect(() => fftMagnitude(new Float32Array(1000))).toThrow(/power of two/);
  });
});

describe("extractVoiceprint", () => {
  it("extracts a deterministic fixed-dimension vector from voiced speech", () => {
    const pcm = voicedPcm({ pitchHz: 120, durationSec: 1.2 });
    const a = extractVoiceprint(pcm, 22_050);
    const b = extractVoiceprint(pcm, 22_050);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.vector.features.length).toBe(VOICEPRINT_DIM);
    expect(a.vector.features).toEqual(b.vector.features); // bit-identical
    // median pitch ≈ 120 Hz (within tracker tolerance)
    expect(a.vector.features[0]).toBeGreaterThan(100);
    expect(a.vector.features[0]).toBeLessThan(140);
    expect(a.vector.voicedFrames).toBeGreaterThanOrEqual(MIN_VOICED_FRAMES);
  });

  it("REFUSES silence — never invents a voiceprint", () => {
    const silence = new Float32Array(22_050 * 1.5);
    const res = extractVoiceprint(silence, 22_050);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("SILENCE");
  });

  it("REFUSES too-short audio honestly", () => {
    const res = extractVoiceprint(new Float32Array(1000), 22_050);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("TOO_SHORT");
  });
});

describe("voiceprintSimilarity", () => {
  it("scores 1.0 for identical vectors", () => {
    const v = [120, 0.1, 0.9, 0.02, 900, 600, 0.05, 3];
    expect(voiceprintSimilarity(v, v)).toBe(1);
  });

  it("scores HIGH for the same speaker (natural jitter) and LOW for a different-pitch speaker", () => {
    const pcmA1 = voicedPcm({ pitchHz: 120, durationSec: 1.2, seed: 3 });
    const pcmA2 = voicedPcm({ pitchHz: 122, durationSec: 1.3, seed: 5 }); // same voice, jitter
    const pcmB = voicedPcm({ pitchHz: 250, durationSec: 1.2, seed: 7 }); // different voice
    const a1 = extractVoiceprint(pcmA1, 22_050);
    const a2 = extractVoiceprint(pcmA2, 22_050);
    const b = extractVoiceprint(pcmB, 22_050);
    if (!a1.ok || !a2.ok || !b.ok) throw new Error("fixture failure");
    const same = voiceprintSimilarity(a1.vector.features, a2.vector.features)!;
    const diff = voiceprintSimilarity(a1.vector.features, b.vector.features)!;
    expect(same).toBeGreaterThan(diff);
    expect(same).toBeGreaterThanOrEqual(DEFAULT_MATCH_THRESHOLD);
    expect(diff).toBeLessThan(DEFAULT_MATCH_THRESHOLD);
  });

  it("returns null for malformed input — never a guessed score", () => {
    expect(voiceprintSimilarity([1, 2], [1, 2])).toBeNull();
    expect(
      voiceprintSimilarity(
        [NaN, 0, 0, 0, 0, 0, 0, 0],
        [120, 0.1, 0.9, 0.02, 900, 600, 0.05, 3],
      ),
    ).toBeNull();
    expect(voiceprintSimilarity([], [])).toBeNull();
  });
});

describe("enrollVoiceprint", () => {
  const sample = (pitchHz: number, seed = 1): VoiceprintVector => {
    const res = extractVoiceprint(
      voicedPcm({ pitchHz, durationSec: 1.2, seed }),
      22_050,
    );
    if (!res.ok) throw new Error("fixture failure");
    return res.vector;
  };

  it("REFUSES enrollment with zero usable samples", () => {
    const res = enrollVoiceprint({ samples: [], now: "2026-09-13T00:00:00Z" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("SILENCE");
  });

  it("median-combines deliberate samples and completes at the required count", () => {
    const res = enrollVoiceprint({
      samples: [sample(120, 1), sample(121, 2), sample(119, 3)],
      now: "2026-09-13T00:00:00Z",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.profile.sampleCount).toBe(3);
    expect(res.complete).toBe(true);
    expect(res.profile.features.length).toBe(VOICEPRINT_DIM);
    expect(res.profile.threshold).toBe(DEFAULT_MATCH_THRESHOLD);
  });

  it("is INCOMPLETE below the deliberate-sample minimum", () => {
    const res = enrollVoiceprint({
      samples: [sample(120, 1), sample(121, 2)],
      now: "2026-09-13T00:00:00Z",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.complete).toBe(false);
    expect(res.profile.sampleCount).toBe(2);
    expect(DEFAULT_ENROLLMENT_SAMPLES).toBe(3);
  });

  it("ignores malformed vectors — only real extracted vectors enroll", () => {
    const res = enrollVoiceprint({
      samples: [
        {
          features: [1, 2],
          voicedFrames: 99,
          sampleRate: 22_050,
          durationSec: 1,
        },
      ],
      now: "2026-09-13T00:00:00Z",
    });
    expect(res.ok).toBe(false);
  });
});

describe("verifySpeaker", () => {
  const profile = (): EnrolledVoiceprint => {
    const res = enrollVoiceprint({
      samples: [
        (() => {
          const r = extractVoiceprint(
            voicedPcm({ pitchHz: 120, durationSec: 1.2, seed: 1 }),
            22_050,
          );
          if (!r.ok) throw new Error("fixture failure");
          return r.vector;
        })(),
        (() => {
          const r = extractVoiceprint(
            voicedPcm({ pitchHz: 121, durationSec: 1.2, seed: 2 }),
            22_050,
          );
          if (!r.ok) throw new Error("fixture failure");
          return r.vector;
        })(),
        (() => {
          const r = extractVoiceprint(
            voicedPcm({ pitchHz: 119, durationSec: 1.2, seed: 3 }),
            22_050,
          );
          if (!r.ok) throw new Error("fixture failure");
          return r.vector;
        })(),
      ],
      now: "2026-09-13T00:00:00Z",
    });
    if (!res.ok) throw new Error("fixture failure");
    return res.profile;
  };
  const utterance = (pitchHz: number, seed = 4): VoiceprintVector => {
    const r = extractVoiceprint(
      voicedPcm({ pitchHz, durationSec: 1.2, seed }),
      22_050,
    );
    if (!r.ok) throw new Error("fixture failure");
    return r.vector;
  };

  it("MATCHES the owner's own (jittered) voice across the threshold", () => {
    const result = verifySpeaker(utterance(120, 4), profile());
    expect(result.determinable).toBe(true);
    expect(result.match).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(DEFAULT_MATCH_THRESHOLD);
  });

  it("does NOT match a different-pitch speaker", () => {
    const result = verifySpeaker(utterance(250, 4), profile());
    expect(result.determinable).toBe(true);
    expect(result.match).toBe(false);
  });

  it("is honestly NOT determinable without data — never a guessed match", () => {
    expect(verifySpeaker(null, profile()).determinable).toBe(false);
    expect(verifySpeaker(utterance(120), null).determinable).toBe(false);
    expect(
      verifySpeaker(utterance(120), {
        features: [1, 2],
        sampleCount: 3,
        updatedAt: "x",
        threshold: 0.7,
      }).determinable,
    ).toBe(false);
  });

  it("carries the honest security label on EVERY result — voice is a signal, not identity, not authority", () => {
    for (const result of [
      verifySpeaker(null, null),
      verifySpeaker(utterance(120), profile()),
      verifySpeaker(utterance(250), profile()),
    ]) {
      expect(result.securityLabel).toContain("NOT cryptographic proof");
      expect(result.securityLabel).toContain("never authorize");
    }
    expect(VOICEPRINT_SECURITY_LABEL).toContain("replay");
  });
});
