import { describe, it, expect } from "vitest";
import { resolveMemberSizing } from "../engineering/member-sizing";
import { designBeam, designColumn, type BeamDesignInput, type ColumnDesignInput } from "../engineering/structural-calculator";

const beam: BeamDesignInput = {
  span: 4.5,
  tributary_width: 3,
  dead_load: 8,
  live_load: 3,
  concrete_grade: "C25",
  steel_grade: "Fe500",
  support_condition: "simply_supported",
  cover_mm: 25,
  beam_type: "suspended_beam",
};

describe("market-scoped member sizing", () => {
  it("NG default is unchanged: 225mm width, no unverified warnings", () => {
    const r = designBeam(beam);
    expect(r.required_width).toBe(225);
    expect(r.warnings.some((w) => w.includes("not yet verified"))).toBe(false);
  });

  it("verified markets use their standard wall unit width", () => {
    const us = designBeam({ ...beam, market_code: "US" });
    expect(us.required_width).toBe(203);
    const gb = designBeam({ ...beam, market_code: "GB" });
    expect(gb.required_width).toBe(100);
    const in_ = designBeam({ ...beam, market_code: "IN" });
    expect(in_.required_width).toBe(230);
  });

  it("frame markets disclose engineer-determined width", () => {
    const au = designBeam({ ...beam, market_code: "AU" });
    expect(au.warnings.some((w) => w.includes("engineer-determined"))).toBe(true);
    expect(au.warnings.some((w) => w.includes("not yet verified"))).toBe(false);
  });

  it("unprofiled markets get explicit unverified disclosure, never silent NG", () => {
    const pl = designBeam({ ...beam, market_code: "PL" });
    expect(pl.warnings.some((w) => w.includes("not yet verified"))).toBe(true);
    expect(pl.warnings.some((w) => w.includes("9-inch"))).toBe(false);
  });

  it("expansion markets (batch 2026-10-14) use their verified wall unit widths", () => {
    const fr = designBeam({ ...beam, market_code: "FR" });
    expect(fr.required_width).toBe(200); // parpaing 20cm
    expect(fr.warnings.some((w) => w.includes("not yet verified"))).toBe(false);
    const mx = designBeam({ ...beam, market_code: "MX" });
    expect(mx.required_width).toBe(150); // block de concreto 15cm
    const cn = designBeam({ ...beam, market_code: "CN" });
    expect(cn.required_width).toBe(240); // 砖混 brick-concrete 240mm
    const ke = designBeam({ ...beam, market_code: "KE" });
    expect(ke.required_width).toBe(225); // 9x9 Ndarugo stone
    const ca = designBeam({ ...beam, market_code: "CA" });
    expect(ca.warnings.some((w) => w.includes("engineer-determined"))).toBe(true);
  });

  it("NG ground beam warning preserved; other markets get generic code note", () => {
    const shallow = { ...beam, span: 1.5, dead_load: 2, live_load: 1 };
    const ngGb = designBeam({ ...shallow, beam_type: "ground_beam", market_code: "NG" });
    expect(ngGb.warnings.some((w) => w.includes("Nigerian practice"))).toBe(true);
    const usGb = designBeam({ ...beam, beam_type: "ground_beam", market_code: "US" });
    expect(usGb.warnings.some((w) => w.includes("local structural codes"))).toBe(true);
  });

  it("column minimum is market-scoped", () => {
    const col: ColumnDesignInput = {
      axial_load: 40,
      height: 3,
      concrete_grade: "C25",
      steel_grade: "Fe500",
      cover_mm: 25,
      is_rectangular: true,
      unbraced_height_ratio: 0,
      market_code: "NG",
    };
    const ng = designColumn(col);
    expect(ng.warnings.some((w) => w.includes("225mm"))).toBe(true);
    const au = designColumn({ ...col, market_code: "AU" });
    expect(au.warnings.some((w) => w.includes("engineer-determined"))).toBe(true);
    const pl = designColumn({ ...col, market_code: "PL" });
    expect(pl.warnings.some((w) => w.includes("not yet verified"))).toBe(true);
    const frCol = designColumn({ ...col, market_code: "FR" });
    expect(frCol.warnings.some((w) => w.includes("200mm"))).toBe(true);
  });

  it("profiles mirror verified wall methodology sources", () => {
    expect(resolveMemberSizing("DE").beamWidthMm).toBe(175);
    expect(resolveMemberSizing("ZA").beamWidthMm).toBe(140);
    expect(resolveMemberSizing("BR").beamWidthMm).toBe(90);
    expect(resolveMemberSizing("JP").confidence).toBe("industry_standard");
    expect(resolveMemberSizing("SA").confidence).toBe("industry_standard");
    expect(resolveMemberSizing("AE").beamWidthMm).toBe(200);
    expect(resolveMemberSizing("GH").beamWidthMm).toBe(225);
    expect(resolveMemberSizing("IT").beamWidthMm).toBeNull();
    expect(resolveMemberSizing("KR").beamWidthMm).toBeNull();
  });
});
