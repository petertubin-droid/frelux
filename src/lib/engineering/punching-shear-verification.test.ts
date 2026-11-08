import { describe, it, expect } from "vitest";
import { designSlab, designBeam } from "./structural-calculator";

/**
 * Punching shear, shear enhancement and the doubly reinforced compression zone.
 *
 * The punching numbers are recomputed here from the published formulae rather
 * than from the engine's own outputs, so the engine has to agree with an
 * independent implementation of BS 8110-1 Cl 3.7.7 and Table 3.8.
 */

const PANEL = {
  span_x: 6,
  span_y: 7,
  slab_type: "two_way" as const,
  support_condition: "continuous" as const,
  live_load: 2.5,
  dead_load: 1.5,
  concrete_grade: "C25/30" as const,
  steel_grade: "Fe500" as const,
  cover_mm: 25,
};

describe("punching shear at a column (BS 8110-1 Cl 3.7.7)", () => {
  it("reports NOT CHECKED, never a pass, without a column reaction", () => {
    const r = designSlab(PANEL);
    expect(r.punch_shear?.status).toBe("NOT CHECKED");
    expect(r.punch_shear?.missing_input).toBe("column_load_kN");
    expect(r.punch_shear?.notes.join(" ")).toMatch(/NOT CHECKED/);
  });

  it("computes the critical perimeter and stress independently", () => {
    const r = designSlab({
      ...PANEL,
      column_load_kN: 400,
      column_width_mm: 300,
      column_depth_mm: 300,
    });
    const d = r.recommended_thickness - PANEL.cover_mm - 10;
    const u = 2 * (300 + 300) + 3 * Math.PI * d;
    const expectedV = (400 * 1000) / (u * d);
    expect(r.punch_shear?.critical_perimeter_mm).toBe(Math.round(u));
    expect(r.punch_shear?.v_ed).toBeCloseTo(expectedV, 1);
    // v_face = N / (u_face d), u_face = 2(300 + 300)
    expect(r.punch_shear?.v_face).toBeCloseTo(
      (400 * 1000) / (1200 * d),
      1,
    );
    // v_max = min(0.8 √f_cu, 5). C25/30 carries f_cu = 30.
    expect(r.punch_shear?.v_max).toBeCloseTo(
      Math.min(0.8 * Math.sqrt(30), 5),
      1,
    );
  });

  it("agrees with its own Table 3.8 resistance", () => {
    const r = designSlab({ ...PANEL, column_load_kN: 400 });
    const d = r.recommended_thickness - PANEL.cover_mm - 10;
    const pct = Math.min((100 * r.steel_area_required) / (1000 * d), 2);
    const vc =
      (0.79 / 1.25) *
      Math.cbrt(30 / 25) *
      Math.cbrt(pct) *
      Math.pow(400 / Math.min(d, 400), 0.25);
    expect(r.punch_shear?.v_c).toBeCloseTo(vc, 2);
    const shouldPass = (r.punch_shear?.v_ed as number) <= vc;
    expect(r.punch_shear?.status).toBe(shouldPass ? "PASS" : "FAIL");
  });

  it("fails a heavy reaction and says punching reinforcement is the fix", () => {
    const r = designSlab({ ...PANEL, column_load_kN: 1200 });
    expect(r.punch_shear?.status).toBe("FAIL");
    expect(r.warnings.join(" ")).toMatch(/Punching shear FAILS/);
    expect(r.punch_shear?.notes.join(" ")).toMatch(/Punching reinforcement/);
  });

  it("rejects a negative reaction rather than treating it as zero", () => {
    const r = designSlab({ ...PANEL, column_load_kN: -50 });
    expect(r.punch_shear?.status).toBe("NOT CHECKED");
  });
});

describe("beam shear enhancement (BS 8110-1 Cl 3.4.5.8)", () => {
  const BEAM = {
    span: 5,
    dead_load: 12,
    live_load: 8,
    tributary_width: 2.5,
    concrete_grade: "C30" as const,
    steel_grade: "Fe500" as const,
    cover_mm: 25,
    support_condition: "simply_supported" as const,
    market_code: "NG",
    beam_type: "suspended_beam" as const,
  };

  it("doubles the resistance for a load at half an effective depth", () => {
    const plain = designBeam(BEAM);
    const d = plain.recommended_depth - BEAM.cover_mm - 25;
    const enhanced = designBeam({ ...BEAM, load_av_mm: d / 2 });
    expect(Math.round(enhanced.shear_capacity / 10) * 10).toBe(
      Math.round((2 * plain.shear_capacity) / 10) * 10,
    );
    expect(enhanced.formula_transparency.join(" ")).toMatch(/3\.4\.5\.8/);
  });

  it("applies nothing once the load is 2d away", () => {
    const plain = designBeam(BEAM);
    const d = plain.recommended_depth - BEAM.cover_mm - 25;
    const far = designBeam({ ...BEAM, load_av_mm: 2 * d + 10 });
    expect(Math.round(far.shear_capacity)).toBe(
      Math.round(plain.shear_capacity),
    );
  });

  it("never exceeds the 2d/a_v cap of 2", () => {
    const plain = designBeam(BEAM);
    const veryClose = designBeam({ ...BEAM, load_av_mm: 20 });
    expect(Math.round(veryClose.shear_capacity / 10) * 10).toBe(
      Math.round((2 * plain.shear_capacity) / 10) * 10,
    );
  });
});

describe("doubly reinforced compression zone", () => {
  const OVERLOADED = {
    span: 5,
    dead_load: 15,
    live_load: 10,
    tributary_width: 5,
    concrete_grade: "C25" as const,
    steel_grade: "Fe500" as const,
    cover_mm: 25,
    support_condition: "simply_supported" as const,
    market_code: "NG",
    beam_type: "suspended_beam" as const,
    existing_width: 300,
  };

  it("flags a compression steel that cannot reach its design strength", () => {
    // d = 350 - 50 = 350... the section is shallow enough that d′/x passes the
    // f_y = 500 limit of 0.379.
    const r = designBeam({ ...OVERLOADED, existing_depth: 400 });
    expect(r.compression_steel_area).toBeGreaterThan(0);
    expect(r.compression_steel_yields).toBe(false);
    expect(r.warnings.join(" ")).toMatch(/does not reach|NOT sufficient/);
  });

  it("accepts compression steel that does yield", () => {
    const r = designBeam({ ...OVERLOADED, existing_depth: 800 });
    expect(r.compression_steel_area).toBeGreaterThan(0);
    expect(r.compression_steel_yields).toBe(true);
  });
});

describe("support steel for continuous panels", () => {
  const PANEL_SS = { ...PANEL, support_condition: "simply_supported" as const };

  it("designs top steel for a continuous panel", () => {
    const r = designSlab(PANEL);
    expect(r.support_steel_area).toBeGreaterThan(0);
    // The support is given the span moment: an envelope, disclosed as one.
    expect(r.support_moment).toBeCloseTo(r.max_moment, 2);
    expect(r.warnings.join(" ")).toMatch(/conservative envelope/);
  });

  it("designs top steel for a fixed panel too", () => {
    const r = designSlab({ ...PANEL, support_condition: "fixed" });
    expect(r.support_steel_area).toBeGreaterThan(0);
  });

  it("reports none where there is no continuity", () => {
    const r = designSlab(PANEL_SS);
    expect(r.support_steel_area).toBeUndefined();
    expect(r.support_moment).toBeUndefined();
  });

  it("never falls below the minimum steel", () => {
    const r = designSlab({ ...PANEL, live_load: 0.5, dead_load: 0.5 });
    expect(r.support_steel_area).toBeGreaterThanOrEqual(r.steel_area_required);
  });
});
