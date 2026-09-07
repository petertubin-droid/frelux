// =========================================================
// PROPERTY CONDITION + DOCUMENT INTELLIGENCE TESTS (§5, §6)
// =========================================================

import { describe, it, expect } from "vitest";
import { assessCondition } from "./property-condition";
import {
  extractPropertyFacts,
  mergeDocumentFacts,
  type DocumentExtraction,
} from "./document-intelligence";

describe("assessCondition (§6 careful wording)", () => {
  it('words findings as "Potential issue detected" — never a certification', () => {
    const a = assessCondition([
      {
        category: "visible_cracks",
        observation: "crack above the kitchen door",
        source: "user_reported",
      },
      {
        category: "visible_moisture_damage",
        observation: "water stain on ceiling",
        source: "ai_vision",
        provenance: {
          source: "photo-1",
          sourceType: "ai_extraction",
          confidence: 0.6,
          verificationStatus: "requires_confirmation",
        },
      },
    ]);
    expect(a.findings).toHaveLength(2);
    for (const f of a.findings) {
      expect(f.finding).toContain("Potential issue detected");
      expect(f.finding).not.toMatch(/structural(ly)? (unsafe|sound)/i);
    }
    expect(a.findings[0].dataClass).toBe("user_provided");
    expect(a.findings[1].dataClass).toBe("ai_detected");
    expect(a.findings[1].requiresConfirmation).toBe(true);
  });

  it("never certifies structural integrity — limitation always attached", () => {
    const a = assessCondition([]);
    expect(a.limitation).toContain("cannot certify structural integrity");
    expect(a.hasNoObservations).toBe(true);
    // unassessed categories are explicit gaps
    expect(a.unassessedCategories).toContain("roof_condition");
  });

  it("AI vision findings always require confirmation, even at high confidence", () => {
    const a = assessCondition([
      {
        category: "roof_condition",
        observation: "missing roof sheet",
        source: "ai_vision",
        provenance: {
          source: "photo",
          sourceType: "ai_extraction",
          confidence: 0.98,
          verificationStatus: "requires_confirmation",
        },
      },
    ]);
    expect(a.findings[0].requiresConfirmation).toBe(true);
    expect(a.findings[0].dataClass).toBe("ai_detected");
  });
});

const extraction: DocumentExtraction = {
  documentId: "doc-1",
  documentKind: "survey_site_plan",
  extractedAt: "2026-09-01T00:00:00Z",
  facts: [
    { field: "landSize", value: 645.9, confidence: 0.92 },
    { field: "landSize", value: 700, confidence: 0.4 }, // duplicate
    { field: "city", value: "Lagos", confidence: 0.88 },
    { field: "numberOfFloors", value: 2, confidence: 0.81 },
  ],
};

describe("document intelligence (§5)", () => {
  it("maps every extracted fact to ai_detected + requires_confirmation", () => {
    const updates = extractPropertyFacts(extraction);
    expect(updates).toHaveLength(3); // duplicate dropped
    for (const u of updates) {
      expect(u.dataClass).toBe("ai_detected");
      expect(u.provenance.verificationStatus).toBe("requires_confirmation");
      expect(u.provenance.sourceType).toBe("ai_extraction");
      expect(u.provenance.source).toContain("survey_site_plan");
    }
    // first occurrence wins
    expect(updates.find((u) => u.field === "landSize")?.value).toBe(645.9);
  });

  it("NEVER overwrites verified values with document extractions (§21 trust boundary)", () => {
    const outcome = mergeDocumentFacts(extraction, {
      existing: {
        landSize: {
          source: "Land registry extract",
          sourceType: "provider",
          verificationStatus: "verified",
        },
      },
    });
    expect(outcome.updates.find((u) => u.field === "landSize")).toBeUndefined();
    const preserved = outcome.preserved.find((p) => p.field === "landSize");
    expect(preserved?.reason).toContain("may not overwrite");
    // unverified fields remain updatable
    expect(outcome.updates.map((u) => u.field)).toEqual(
      expect.arrayContaining(["city", "numberOfFloors"]),
    );
  });

  it("reports duplicates explicitly", () => {
    const outcome = mergeDocumentFacts(extraction, { existing: {} });
    expect(outcome.duplicates[0].field).toBe("landSize");
    expect(outcome.duplicates[0].reason).toContain("first occurrence was kept");
  });

  it("never claims legal verification", () => {
    const outcome = mergeDocumentFacts(extraction, { existing: {} });
    expect(outcome.limitation).toContain(
      "does not authenticate legal documents",
    );
  });
});
