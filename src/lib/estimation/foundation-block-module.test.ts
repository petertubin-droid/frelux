// Verification of the foundation block module against published dimensions.
//
// A US or Canadian concrete block is published as a nominal face that already
// contains its mortar joint: a nominal 8 x 16 in CMU measures 7-5/8 x 15-5/8 in
// and only reaches 8 x 16 in once the 3/8 in joint is added (ASTM C90; NCMA TEK
// 02-01B publishes 1.125 blocks per square foot of wall, which is 12.11 per
// square metre). A Nigerian or British block is published as the block itself,
// so the joint has to be added. Counting a nominal face with an extra joint is
// the same unit counted twice, and it undercounts by around 7 per cent.

import { describe, expect, it } from "vitest";
import {
  BLOCK_FACE_BY_MARKET,
  marketBlocksPerM2,
} from "@/lib/estimation/foundation-engine";
import { blocksPerM2 } from "@/lib/estimation/build-to-roof-engine";
import { ALL_MARKET_CODES } from "@/lib/international/capability-registry";

const blocks = (code: string) => marketBlocksPerM2(code)?.value ?? 0;

describe("blocks per square metre against published modules", () => {
  it("matches the NCMA figure for a nominal 8 x 16 in unit", () => {
    // 1.125 blocks/ft² is 12.11 per m²; the millimetre rounding of 406 x 203
    // moves this by 0.2 per cent, no more.
    expect(blocks("US")).toBeCloseTo(12.13, 2);
    expect(Math.abs(blocks("US") - 1.125 * 10.7639)).toBeLessThan(0.05);
    expect(blocks("CA")).toBeCloseTo(12.13, 2);
  });

  it("counts a manufactured block plus its joint where that is what is published", () => {
    // Nigerian 450 x 225 sandcrete block with a 12 mm joint: 0.462 x 0.237 m.
    expect(blocks("NG")).toBeCloseTo(1 / (0.462 * 0.237), 4);
    expect(blocks("NG")).toBeCloseTo(9.13, 2);
    // British 440 x 215 block with a 12 mm joint.
    expect(blocks("GB")).toBeCloseTo(1 / (0.452 * 0.227), 4);
  });

  it("does not add a second joint to a nominal face", () => {
    const withJoint = blocksPerM2(406 / 25.4, 203 / 25.4, 0.012);
    // The defect this guard replaces: 11.13 against a published 12.11, an
    // 8 per cent undercount on every US and Canadian wall.
    expect(withJoint).toBeCloseTo(11.13, 2);
    expect(blocks("US")).toBeGreaterThan(withJoint * 1.06);
  });

  it("says whether each face already contains the joint", () => {
    const included = Object.entries(BLOCK_FACE_BY_MARKET)
      .filter(([, face]) => face.jointIncluded)
      .map(([code]) => code)
      .sort();
    expect(included).toEqual(["CA", "US"]);
    for (const [, face] of Object.entries(BLOCK_FACE_BY_MARKET)) {
      expect(typeof face.jointIncluded).toBe("boolean");
      expect(face.label.length).toBeGreaterThan(0);
    }
  });
});

describe("market coverage of the block face table", () => {
  it("publishes a face for 23 of the 32 approved markets", () => {
    expect(Object.keys(BLOCK_FACE_BY_MARKET).length).toBe(23);
    expect(ALL_MARKET_CODES.length).toBe(32);
    const missing = ALL_MARKET_CODES.filter(
      (code) => marketBlocksPerM2(code) === null,
    );
    expect(missing.length).toBe(9);
    for (const code of missing) expect(marketBlocksPerM2(code)).toBeNull();
  });

  it("asks for the rule rather than inventing a face", () => {
    expect(marketBlocksPerM2("ZZ")).toBeNull();
    expect(marketBlocksPerM2(undefined)).toBeNull();
    expect(marketBlocksPerM2("")).toBeNull();
  });
});
