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

  it("unprofiled markets get an explicit unverified disclosure, never silent NG", () => {
    const fr = resolveWallMethodology("FR");
    expect(fr.verified).toBe(false);
    expect(fr.confidence).toBe("pending_verification");
    expect(fr.methodSummary).toContain("unverified");
    expect(fr.foundationWall.description).not.toContain("9-inch");
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
    expect(fr.methodology_note).toContain("not yet verified");
  });

  it("lists all 20 mandate markets", () => {
    const markets = listWallMethodologyMarkets().map((m) => m.code);
    expect(markets).toHaveLength(20);
    expect(markets).toContain("NG");
    expect(markets).toContain("KR");
  });
});
