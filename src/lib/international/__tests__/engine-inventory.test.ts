import { describe, it, expect } from "vitest";
import {
  FULL_ENGINE_INVENTORY,
  ALL_20_MARKETS,
  getEngineInventoryItem,
  getEngineByMarketMatrix,
  getDiscrepancyReport,
} from "../engine-inventory";
import {
  CONSTRUCTION_TYPOLOGIES,
  getConstructionTypology,
} from "../../estimation/construction-typologies";
import {
  ELECTRICAL_PROFILES,
  getElectricalProfile,
} from "../../estimation/electrical-profiles";
import {
  PLUMBING_PROFILES,
  getPlumbingProfile,
} from "../../estimation/plumbing-profiles";

describe("Comprehensive Engine Inventory & 20-Market Matrix", () => {
  it("inventories all 56 discovered engines across FRELUX", () => {
    expect(FULL_ENGINE_INVENTORY.length).toBe(56);
    const ids = FULL_ENGINE_INVENTORY.map((e) => e.id);
    expect(new Set(ids).size).toBe(56);
  });

  it("every engine item has non-empty metadata, source files, and formulas", () => {
    for (const e of FULL_ENGINE_INVENTORY) {
      expect(e.id).toBeTruthy();
      expect(e.name).toBeTruthy();
      expect(e.category).toBeTruthy();
      expect(e.classification).toBeTruthy();
      expect(e.sourceFiles.length).toBeGreaterThan(0);
      expect(e.calculationPurpose.length).toBeGreaterThan(0);
      expect(e.keyFormulas.length).toBeGreaterThan(0);
      expect(e.marketAssumptions.length).toBeGreaterThan(0);
    }
  });

  it("every engine has a complete 20-market support matrix with honest statuses", () => {
    const validStatuses = new Set([
      "verified",
      "partially_verified",
      "requires_local_inputs",
      "unpriced",
      "not_implemented",
      "unavailable",
      "requires_verification",
    ]);

    for (const e of FULL_ENGINE_INVENTORY) {
      for (const mCode of ALL_20_MARKETS) {
        const support = e.marketMatrix[mCode];
        expect(support).toBeDefined();
        expect(validStatuses.has(support.status)).toBe(true);
        expect(support.notes.length).toBeGreaterThan(0);
      }
    }
  });

  it("CONSTRUCTION_TYPOLOGIES provides verified explicit profiles for all 20 markets", () => {
    expect(Object.keys(CONSTRUCTION_TYPOLOGIES).length).toBe(20);
    for (const code of ALL_20_MARKETS) {
      const t = getConstructionTypology(code);
      expect(t).toBeDefined();
      expect(t.name).toBeTruthy();
      expect(t.primaryStructuralSystem).toBeTruthy();
      expect(t.wallTypology).toBeTruthy();
      expect(t.foundationTypology).toBeTruthy();
      expect(t.disclaimer).toBeTruthy();
    }
  });

  it("ELECTRICAL_PROFILES provides verified explicit profiles for all inventory markets", () => {
    // Every inventory market must have a fully native profile.
    // Additional markets are allowed only when equally native
    // (explicit standards reference), never via fallbacks.
    expect(Object.keys(ELECTRICAL_PROFILES).length).toBeGreaterThanOrEqual(
      ALL_20_MARKETS.length,
    );
    for (const code of ALL_20_MARKETS) {
      const p = getElectricalProfile(code);
      expect(p).toBeDefined();
      expect(p.nominalVoltage).toBeTruthy();
      expect(p.lightingConductorSize).toBeTruthy();
      expect(p.socketConductorSize).toBeTruthy();
      expect(p.standardsRef).toBeTruthy();
    }
    for (const code of Object.keys(ELECTRICAL_PROFILES)) {
      expect(
        ELECTRICAL_PROFILES[code as keyof typeof ELECTRICAL_PROFILES]
          .standardsRef,
      ).toBeTruthy();
    }
  });

  it("PLUMBING_PROFILES provides verified explicit profiles for all inventory markets", () => {
    expect(Object.keys(PLUMBING_PROFILES).length).toBeGreaterThanOrEqual(
      ALL_20_MARKETS.length,
    );
    for (const code of ALL_20_MARKETS) {
      const p = getPlumbingProfile(code);
      expect(p).toBeDefined();
      expect(p.waterSupplyMaterial).toBeTruthy();
      expect(p.drainageDwvMaterial).toBeTruthy();
      expect(p.drainageSlopeRule).toBeTruthy();
      expect(p.standardsRef).toBeTruthy();
    }
    for (const code of Object.keys(PLUMBING_PROFILES)) {
      expect(
        PLUMBING_PROFILES[code as keyof typeof PLUMBING_PROFILES].standardsRef,
      ).toBeTruthy();
    }
  });

  it("reconciles discovered engines against legacy registry and reports discrepancies", () => {
    const report = getDiscrepancyReport();
    expect(report.discoveredCount).toBe(56);
    expect(report.canonicalCapabilityCount).toBe(34);
    expect(report.unregisteredEngines.length).toBe(20);
    expect(report.reconciliationNotes.length).toBeGreaterThan(0);
  });

  it("retrieves individual engine items accurately by ID", () => {
    const paint = getEngineInventoryItem("painting");
    expect(paint).toBeDefined();
    expect(paint?.category).toBe("finishing");
    expect(paint?.marketMatrix.NG.status).toBe("verified");
    expect(paint?.marketMatrix.US.status).toBe("verified");

    const elec = getEngineInventoryItem("electrical");
    expect(elec).toBeDefined();
    expect(elec?.category).toBe("mep");
    expect(elec?.marketMatrix.DE.status).toBe("verified");
  });

  it("generates an engine-by-market status matrix mapping every engine to 20 markets", () => {
    const matrix = getEngineByMarketMatrix();
    expect(Object.keys(matrix).length).toBe(56);
    for (const engineId of Object.keys(matrix)) {
      expect(Object.keys(matrix[engineId]).length).toBe(20);
      expect(matrix[engineId].NG).toBeDefined();
      expect(matrix[engineId].US).toBeDefined();
      expect(matrix[engineId].IT).toBeDefined();
    }
  });
});
