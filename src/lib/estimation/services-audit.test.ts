import { describe, expect, it } from "vitest";
import { calculatePlumbingEngineeringMetrics } from "./plumbing-engine";
import { blockworkAssembly, CEMENT_BAG_KG, CEMENT_DENSITY_KG_M3 } from "@/lib/takeoff/assemblies";

describe("plumbing header sizing", () => {
  it("reports the bore of the pipe it recommends, not the theoretical minimum", () => {
    // 2 taps (2.0) + 1 WC (2.5) = 4.5 WSFU, under the 10 WSFU knee, so
    // peak = 0.25 x 4.5^0.75 = 0.7725 L/s. At 1.8 m/s that needs
    // sqrt(4 x 0.7725/1000/1.8/pi) x 1000 = 23.4 mm, so the next standard PN20
    // pipe is 26.6 mm bore (40 mm PPR). Before this fix the metric reported 23.4
    // mm while the label named the 40 mm pipe, so the number and the pipe
    // disagreed by a whole size.
    const metrics = calculatePlumbingEngineeringMetrics({
      taps: 2,
      wcs: 1,
      showers: 0,
      sinks: 0,
      floor_drains: 0,
    });
    expect(metrics.total_wsfu).toBeCloseTo(4.5, 6);
    expect(metrics.peak_flow_lps).toBeCloseTo(0.77, 2);
    expect(metrics.peak_flow_lpm).toBeCloseTo(46.3, 1);
    expect(metrics.required_bore_mm).toBeCloseTo(23.4, 1);
    expect(metrics.recommended_header_bore_mm).toBeCloseTo(26.6, 6);
    expect(metrics.recommended_header_pipe_label).toMatch(/40 mm PPR \(26\.6 mm bore/);
  });

  it("keeps the two numbers consistent on the largest demand", () => {
    const metrics = calculatePlumbingEngineeringMetrics({
      taps: 3,
      wcs: 2,
      showers: 2,
      sinks: 1,
      floor_drains: 0,
    });
    expect(metrics.total_wsfu).toBeCloseTo(13.5, 6);
    expect(metrics.required_bore_mm).toBeGreaterThan(33.2);
    expect(metrics.recommended_header_bore_mm).toBeCloseTo(42, 6);
    expect(metrics.recommended_header_pipe_label).toMatch(/63 mm PPR/);
    expect(metrics.recommended_header_bore_mm).toBeGreaterThanOrEqual(metrics.required_bore_mm);
  });
});

describe("a cement bag is a package, not a unit of cement", () => {
  it("counts more 42.6 kg bags than 50 kg bags for the same wall", () => {
    const fifty = blockworkAssembly(10, { mix: { cement: 1, sand: 6 } });
    const ninetyFour = blockworkAssembly(10, { mix: { cement: 1, sand: 6 }, cementBagKg: 42.6 });
    const cementOf = (lines: ReturnType<typeof blockworkAssembly>) =>
      lines.find((l) => l.material === "Cement")!;

    // The cement mass is the same either way; only the package changes. A 10 m2
    // 225 mm wall at 0.03 m3/m2 with 10 percent waste is 0.4389 m3 dry, so
    // 0.0627 m3 of cement, which is 90.3 kg whatever the bag weighs.
    expect(cementOf(ninetyFour).netQuantity).toBeCloseTo(90.29, 1);
    expect(cementOf(ninetyFour).netQuantity).toBeCloseTo(cementOf(fifty).netQuantity, 6);
    expect(Number(cementOf(ninetyFour).purchaseQuantity)).toBeGreaterThan(
      Number(cementOf(fifty).purchaseQuantity),
    );
    expect(cementOf(ninetyFour).purchaseUnit).toBe("bags of 42.6 kg");
    expect(cementOf(fifty).purchaseUnit).toBe(`bags of ${CEMENT_BAG_KG} kg`);
  });

  it("derives the bag volume from mass and density", () => {
    const cement = blockworkAssembly(10, { mix: { cement: 1, sand: 6 } }).find(
      (l) => l.material === "Cement",
    )!;
    expect(Number(cement.derivation.inputs?.bagM3)).toBeCloseTo(50 / CEMENT_DENSITY_KG_M3, 4);
    expect(cement.derivation.inputs?.bagKg).toBe(50);
  });
});
