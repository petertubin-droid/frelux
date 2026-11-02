import { describe, it, expect } from "vitest";
import { resolveWallMethodology, listWallMethodologyMarkets } from "../engineering/wall-methodology";
import { generateSequencePlan } from "../engineering/sequence-planner";

describe("wall methodology profiles", () => {
  it("NG profile is verified sandcrete blockwork", () => {
    const p = resolveWallMethodology("NG");
    expect(p.verified).toBe(true);
    expect(p.foundationWall.thicknessMm).toBe(225);
    expect(p.externalWall.unitLabel).toContain("9-inch");
  });

  it("verified markets carry distinct local methodology", () => {
    const gb = resolveWallMethodology("GB");
    expect(gb.verified).toBe(true);
    expect(gb.methodSummary).toContain("cavity");
    const us = resolveWallMethodology("US");
    expect(us.foundationWall.description).toContain("CMU");
    const in_ = resolveWallMethodology("IN");
    expect(in_.externalWall.thicknessMm).toBe(230);
    const br = resolveWallMethodology("BR");
    expect(br.externalWall.unitLabel).toContain("9x19x29");
  });

  it("unprofiled codes get an explicit unverified disclosure, never silent NG", () => {
    const zz = resolveWallMethodology("ZZ");
    expect(zz.verified).toBe(false);
    expect(zz.confidence).toBe("pending_verification");
    expect(zz.methodSummary).toContain("unverified");
    expect(zz.foundationWall.description).not.toContain("9-inch");
  });

  it("sequence plan uses market wall text and NG default is unchanged", () => {
    const ng = generateSequencePlan();
    const step6 = ng.steps.find((s) => s.title.includes("DPC"))!;
    expect(step6.activities[0]).toContain("9-inch (225mm) hollow sandcrete blocks");
    expect(step6.materials_required[0]).toContain("mandatory for foundations");
    expect(ng.methodology_note).toContain("Hollow sandcrete");

    const us = generateSequencePlan(undefined, "US");
    const usStep6 = us.steps.find((s) => s.title.includes("DPC"))!;
    expect(usStep6.activities[0]).toContain("8-inch (203mm) CMU");
    expect(us.methodology_note).toContain("CMU/poured");

    const fr = generateSequencePlan(undefined, "FR");
    expect(fr.methodology_note).toContain("parpaing");
  });

  it("lists all 20 mandate markets", () => {
    const markets = listWallMethodologyMarkets().map((m) => m.code);
    expect(markets).toHaveLength(20);
    expect(markets).toContain("NG");
    expect(markets).toContain("KR");
  });
});

describe("all 20 market wall profiles", () => {
  it("every supported market now has a profiled methodology (no pending generics)", () => {
    const markets = listWallMethodologyMarkets();
    expect(markets.length).toBe(20);
    expect(markets.every((m) => m.verified)).toBe(true);
    for (const m of markets) {
      const p = resolveWallMethodology(m.code);
      expect(p.verified).toBe(true);
      expect(p.confidence).not.toBe("pending_verification");
      expect(p.source.length).toBeGreaterThan(20);
      expect(p.externalWall.thicknessMm).toBeGreaterThan(0);
    }
  });

  it("newly verified profiles carry real market specifics", () => {
    expect(resolveWallMethodology("KE").externalWall.unitLabel).toContain("machine-cut");
    expect(resolveWallMethodology("MX").framingNote).toContain("castillos");
    expect(resolveWallMethodology("FR").externalWall.description).toContain("parpaing");
    expect(resolveWallMethodology("CA").externalWall.description).toContain("2x6");
    expect(resolveWallMethodology("KR").methodSummary).toContain("Reinforced concrete");
    expect(resolveWallMethodology("ID").externalWall.description).toContain("bata merah");
  });

  it("unprofiled codes still fall back to disclosed generics", () => {
    expect(resolveWallMethodology("ZZ").verified).toBe(false);
  });
});
