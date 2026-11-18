import { describe, expect, it } from "vitest";
import { calculateWaterTowerStaging } from "../water-tower-staging-engine";
import { lookupRoofLiveLoad } from "../roof-load-reference";
import { hookGeometry, aciHookGeometry } from "@/lib/engineering/bbs-schedule";
import { calculateTallBuilding } from "@/lib/engineering/tall-building-engine";
import { calculateMathematicalElevation } from "@/lib/engineering/mathematical-elevation-engine";
import {
  blockworkAssembly,
  renderAssembly,
  screedAssembly,
} from "@/lib/takeoff/assemblies";

const tower = (overrides: Record<string, unknown> = {}) =>
  calculateWaterTowerStaging({
    tankVolumeLiters: 5000,
    towerHeightMeters: 6,
    constructionMaterial: "concrete",
    marketCode: "NG",
    soilBearingKpa: 150,
    windSpeedMs: 30,
    ...overrides,
  } as never);

describe("water tower site values are required, not assumed", () => {
  it("refuses to size pads without a soil bearing capacity", () => {
    expect(() => tower({ soilBearingKpa: undefined })).toThrow(
      /soil bearing capacity is required/i,
    );
  });

  it("refuses to check overturning without a wind speed", () => {
    expect(() => tower({ windSpeedMs: undefined })).toThrow(
      /wind speed is required/i,
    );
  });

  it("uses the local cement pack weight rather than a 50 kg bag", () => {
    const ng = tower();
    const us = tower({ marketCode: "US", bagWeightKg: 42.6 });
    expect(ng.structuralBOM.cementBagWeightKg).toBe(50);
    expect(us.structuralBOM.cementBagWeightKg).toBe(42.6);
    expect(us.structuralBOM.cementBags ?? 0).toBeGreaterThan(
      ng.structuralBOM.cementBags ?? 0,
    );
  });
});

describe("roof live load follows the market's own code", () => {
  it("reads the Nigerian table for NG", () => {
    const ng = lookupRoofLiveLoad("NG", 50, 500);
    expect(ng.basis).toBe("NG_NBC_8.10");
    expect(ng.data?.loadKNM2).toBe(2);
  });

  it("applies the ASCE 7-22 minimum for US roofs", () => {
    const us = lookupRoofLiveLoad("US", 0, 20);
    expect(us.basis).toBe("ASCE_7_22_4.8.2");
    // 12 psf floor at a 20 m2 tributary area, converted to kN/m2.
    expect(us.data?.loadKNM2).toBeCloseTo(0.57, 2);
  });

  it("applies the EN 1991-1-3 category H value in Europe", () => {
    const de = lookupRoofLiveLoad("DE", 200, 100);
    expect(de.basis).toBe("EN_1991_1_3_H");
    expect(de.data?.loadKNM2).toBe(0.4);
  });

  it("asks for the local code value where no source is bundled", () => {
    const unknown = lookupRoofLiveLoad("JP", 100, 100);
    expect(unknown.data).toBeNull();
    expect(unknown.errors[0]).toContain("No roof live-load reference");
  });

  it("refuses to answer without a market", () => {
    expect(lookupRoofLiveLoad(undefined, 100, 100).data).toBeNull();
  });
});

describe("hook geometry is code-aware", () => {
  it("gives Eurocode geometry when the caller designs to EN 1992-1-1", () => {
    const ec2 = hookGeometry(20, "primary90", "ec2");
    const aci = aciHookGeometry(20, "primary90");
    expect(ec2.clause).toContain("EN 1992-1-1");
    expect(ec2.insideBendDiameter).toBe(140);
    expect(ec2.straightExtension).toBe(100);
    expect(ec2.straightExtension).not.toBe(aci.straightExtension);
  });
});

describe("tall building declares its design basis", () => {
  it("warns outside the ASCE/ACI jurisdictions", () => {
    const gb = calculateTallBuilding({ market_code: "GB", design_code: "en" });
    const basis = gb.checks.find((c) => c.id === "design-basis");
    expect(basis?.severity).toBe("warning");
    expect(basis?.observed).toContain("GB");
    expect(basis?.threshold).toContain("ASCE 7-22");
  });

  it("does not add the warning for a US design", () => {
    const us = calculateTallBuilding({ market_code: "US" });
    expect(us.checks.some((c) => c.id === "design-basis")).toBe(false);
  });
});

describe("assemblies need a real pack weight", () => {
  it("discloses an assumed pack weight instead of hiding a 50 kg bag", () => {
    const bare = blockworkAssembly(10).find((l) => l.material === "Cement");
    expect(bare?.purchaseUnit).toContain("assumed pack weight");
    const render = renderAssembly(10).find((l) => l.material === "Cement");
    expect(render?.purchaseUnit).toContain("assumed pack weight");
    const screed = screedAssembly(10).find((l) => l.material === "Cement");
    expect(screed?.purchaseUnit).toContain("assumed pack weight");
  });

  it("counts bags on the local pack size", () => {
    const ng = blockworkAssembly(10, { marketCode: "NG" });
    const de = blockworkAssembly(10, { marketCode: "DE" });
    const ngCement = ng.find((l) => l.material === "Cement");
    const deCement = de.find((l) => l.material === "Cement");
    expect(ngCement?.purchaseUnit).toContain("50 kg");
    expect(deCement?.purchaseUnit).not.toContain("50 kg");
  });
});

describe("elevation wall default follows the market module", () => {
  it("uses the US 203 mm module instead of 225 mm", () => {
    const us = calculateMathematicalElevation({
      project_name: "US house",
      market_code: "US",
    });
    const ng = calculateMathematicalElevation({
      project_name: "NG house",
      market_code: "NG",
    });
    expect(us.input.wall_thickness).toBeCloseTo(0.203, 3);
    expect(ng.input.wall_thickness).toBeCloseTo(0.225, 3);
  });
});
