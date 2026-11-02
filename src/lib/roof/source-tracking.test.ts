import { describe, it, expect } from "vitest";
import {
  createAuditEntry,
  appendAuditEntry,
  createEmptyAuditTrail,
  getAuditForTarget,
  getLatestAuditForTarget,
  getAuditBySource,
  getUnverifiedAiEstimates,
  SOURCE_LABELS,
  SOURCE_COLORS,
  requiresVerification,
  createSourceRecord,
  verifySourceRecord,
} from "./source-tracking";

describe("roof/source-tracking", () => {
  describe("audit trail", () => {
    it("createEmptyAuditTrail returns empty trail", () => {
      expect(createEmptyAuditTrail().entries).toEqual([]);
    });

    it("createAuditEntry builds entry with id and timestamp", () => {
      const e = createAuditEntry("create", "section.area", "manual");
      expect(e.id).toContain("audit_");
      expect(e.action).toBe("create");
      expect(e.target).toBe("section.area");
      expect(e.source).toBe("manual");
      expect(e.timestamp).toBeTruthy();
    });

    it("createAuditEntry accepts optional fields", () => {
      const e = createAuditEntry("update", "field", "manual", {
        oldValue: "10",
        newValue: "20",
        note: "Manual correction",
      });
      expect(e.oldValue).toBe("10");
      expect(e.newValue).toBe("20");
      expect(e.note).toBe("Manual correction");
    });

    it("appendAuditEntry adds entry to trail", () => {
      const trail = createEmptyAuditTrail();
      const e = createAuditEntry("create", "field", "manual");
      const updated = appendAuditEntry(trail, e);
      expect(updated.entries.length).toBe(1);
      expect(trail.entries.length).toBe(0); // immutable
    });

    it("getAuditForTarget finds entries for matching target", () => {
      let trail = createEmptyAuditTrail();
      trail = appendAuditEntry(
        trail,
        createAuditEntry("create", "section.area", "manual"),
      );
      trail = appendAuditEntry(
        trail,
        createAuditEntry("update", "section.pitch", "manual"),
      );
      trail = appendAuditEntry(
        trail,
        createAuditEntry("update", "section.area", "manual"),
      );
      const results = getAuditForTarget(trail, "section.area");
      expect(results.length).toBe(2);
    });

    it("getAuditForTarget matches nested paths", () => {
      let trail = createEmptyAuditTrail();
      trail = appendAuditEntry(
        trail,
        createAuditEntry("update", "section.vertices.0.x", "manual"),
      );
      const results = getAuditForTarget(trail, "section.vertices");
      expect(results.length).toBe(1);
    });

    it("getLatestAuditForTarget returns last entry", () => {
      let trail = createEmptyAuditTrail();
      trail = appendAuditEntry(
        trail,
        createAuditEntry("create", "field", "manual", { note: "first" }),
      );
      trail = appendAuditEntry(
        trail,
        createAuditEntry("update", "field", "manual", { note: "second" }),
      );
      const latest = getLatestAuditForTarget(trail, "field");
      expect(latest?.note).toBe("second");
    });

    it("getLatestAuditForTarget returns null when not found", () => {
      const trail = createEmptyAuditTrail();
      expect(getLatestAuditForTarget(trail, "field")).toBeNull();
    });

    it("getAuditBySource filters by source", () => {
      let trail = createEmptyAuditTrail();
      trail = appendAuditEntry(
        trail,
        createAuditEntry("create", "a", "manual"),
      );
      trail = appendAuditEntry(
        trail,
        createAuditEntry("create", "b", "ai_estimated"),
      );
      trail = appendAuditEntry(
        trail,
        createAuditEntry("create", "c", "manual"),
      );
      expect(getAuditBySource(trail, "manual").length).toBe(2);
      expect(getAuditBySource(trail, "ai_estimated").length).toBe(1);
    });

    it("getUnverifiedAiEstimates finds AI entries without verify action", () => {
      let trail = createEmptyAuditTrail();
      trail = appendAuditEntry(
        trail,
        createAuditEntry("estimate", "a", "ai_estimated"),
      );
      trail = appendAuditEntry(
        trail,
        createAuditEntry("verify", "a", "ai_estimated"),
      );
      trail = appendAuditEntry(
        trail,
        createAuditEntry("estimate", "b", "ai_estimated"),
      );
      expect(getUnverifiedAiEstimates(trail).length).toBe(2);
    });
  });

  describe("source display", () => {
    it("SOURCE_LABELS has all source types", () => {
      expect(SOURCE_LABELS.manual).toBe("Manual Entry");
      expect(SOURCE_LABELS.ai_estimated).toBe("AI Estimated");
      expect(SOURCE_LABELS.plan_import).toBe("From Plan Import");
      expect(SOURCE_LABELS.calculated).toBe("Calculated");
      expect(SOURCE_LABELS.imported).toBe("Imported");
      expect(SOURCE_LABELS.default).toBe("Default Value");
    });

    it("SOURCE_COLORS has all source types", () => {
      expect(SOURCE_COLORS.manual).toBeTruthy();
      expect(SOURCE_COLORS.ai_estimated).toBeTruthy();
    });
  });

  describe("requiresVerification", () => {
    it("returns true for ai_estimated", () => {
      expect(requiresVerification("ai_estimated")).toBe(true);
    });

    it("returns true for imported", () => {
      expect(requiresVerification("imported")).toBe(true);
    });

    it("returns false for manual", () => {
      expect(requiresVerification("manual")).toBe(false);
    });

    it("returns false for calculated", () => {
      expect(requiresVerification("calculated")).toBe(false);
    });
  });

  describe("source records", () => {
    it("createSourceRecord builds record with defaults", () => {
      const r = createSourceRecord("area", "manual", "User entered area");
      expect(r.field).toBe("area");
      expect(r.source).toBe("manual");
      expect(r.verified).toBe(false);
      expect(r.timestamp).toBeTruthy();
    });

    it("createSourceRecord accepts options", () => {
      const r = createSourceRecord("pitch", "ai_estimated", "AI detected", {
        verified: true,
        aiConfidence: 0.85,
      });
      expect(r.verified).toBe(true);
      expect(r.aiConfidence).toBe(0.85);
    });

    it("verifySourceRecord marks as verified", () => {
      const r = createSourceRecord("area", "ai_estimated", "AI");
      const verified = verifySourceRecord(r);
      expect(verified.verified).toBe(true);
    });
  });
});
