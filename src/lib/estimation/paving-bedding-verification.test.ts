import { describe, expect, it } from "vitest";
import { calculatePavingTakeoff } from "./paving-standalone-engine";

/**
 * Bedding sand and paver cutting are separate allowances. The pavers are cut to
 * the edges and around obstructions, so the laying pattern decides their waste;
 * the sand is spread over the whole area and compacted, so its own allowance is
 * the loose-to-compacted factor of the specified bed depth. Applying the pattern
 * waste to the sand made a herringbone area order a tenth more sand than a
 * running bond area of the same size for no reason beyond the bond.
 */
const base = {
  marketCode: "NG",
  areaM2: 100,
  paverLengthMm: 200,
  paverWidthMm: 100,
  jointWidthMm: 3,
  beddingDepthMm: 30,
  subbaseDepthMm: 150,
};

describe("paving bedding sand", () => {
  it("orders loose sand for the compacted bed depth", () => {
    // 100 m2 x 0.03 m x 1.20 = 3.60 m3, which is 5.76 t at 1,600 kg/m3.
    const r = calculatePavingTakeoff({ ...base, wastePercent: 5 });
    expect(r.beddingSandVolumeM3).toBeCloseTo(3.6, 2);
    expect(r.beddingSandTonnes).toBeCloseTo(5.76, 2);
  });

  it("does not let the laying pattern change the sand", () => {
    const running = calculatePavingTakeoff({
      ...base,
      layingPattern: "running",
    });
    const herringbone = calculatePavingTakeoff({
      ...base,
      layingPattern: "herringbone",
    });
    expect(herringbone.beddingSandVolumeM3).toBe(running.beddingSandVolumeM3);
    // The pavers themselves do differ: 5 per cent against 10 per cent cutting.
    expect(herringbone.paversRequired).toBeGreaterThan(running.paversRequired);
  });

  it("follows the bed depth and the compaction factor", () => {
    const shallow = calculatePavingTakeoff({ ...base, beddingDepthMm: 20 });
    const deep = calculatePavingTakeoff({ ...base, beddingDepthMm: 40 });
    expect(deep.beddingSandVolumeM3).toBeCloseTo(
      shallow.beddingSandVolumeM3 * 2,
      3,
    );

    const loose = calculatePavingTakeoff({
      ...base,
      beddingCompactionFactor: 1.3,
    });
    expect(loose.beddingSandVolumeM3).toBeCloseTo(3.9, 2);
    // A factor below one would order less sand than the compacted bed holds, so
    // it is held at one: 100 x 0.03 x 1.00 = 3.00 m3.
    const floored = calculatePavingTakeoff({
      ...base,
      beddingCompactionFactor: 0.5,
    });
    expect(floored.beddingSandVolumeM3).toBeCloseTo(3.0, 2);
  });
});
