// =========================================================
// FRELUX PROPERTY INTELLIGENCE, DOCUMENT INTELLIGENCE (§5)
//
// Property-related documents (plans, surveys, listings, reports,
// photographs) contribute information ONLY as explicitly
// provenance-tracked field updates:
//   - every extracted fact carries source + confidence +
//     verification status + timestamp
//   - AI-extracted facts are ai_detected and requires_confirmation
//   - verified/user-confirmed values are NEVER overwritten by a
//     document, conflicts are surfaced for the user to resolve
//   - FRELUX does NOT authenticate legal documents; no legal
//     verification claim is made anywhere (§5, §21)
// =========================================================

import type { Provenance } from "./types";

export const DOCUMENT_INTELLIGENCE_LIMITATION =
  "Document-derived facts are recorded observations, not verified truth. FRELUX does not authenticate legal documents and cannot confirm ownership or legal status from any document.";

/** The property fields a document can legitimately contribute to. */
export type DocumentSupportedField =
  | "propertyType"
  | "buildingType"
  | "numberOfBuildings"
  | "numberOfFloors"
  | "numberOfRooms"
  | "landSize"
  | "landUnit"
  | "address"
  | "city"
  | "region"
  | "country"
  | "constructionStatus";

export const DOCUMENT_FIELD_LABELS: Record<DocumentSupportedField, string> = {
  propertyType: "Property type",
  buildingType: "Building type",
  numberOfBuildings: "Number of buildings",
  numberOfFloors: "Number of floors",
  numberOfRooms: "Number of rooms",
  landSize: "Land size",
  landUnit: "Land unit",
  address: "Address",
  city: "City",
  region: "Region",
  country: "Country",
  constructionStatus: "Construction status",
};

/** One raw extraction from a document, usually produced by the
 *  AI extraction layer, always treated as unverified input. */
export interface DocumentExtractionFact {
  field: DocumentSupportedField;
  value: string | number;
  /** 0–1 extractor confidence, if known. */
  confidence?: number;
}

export interface DocumentExtraction {
  documentId: string;
  documentKind:
    | "architectural_plan"
    | "survey_site_plan"
    | "property_document"
    | "development_document"
    | "valuation_document"
    | "inspection_report"
    | "photograph"
    | "listing"
    | "other_user_document";
  extractedAt: string;
  facts: DocumentExtractionFact[];
}

export interface ExtractedFieldUpdate {
  field: DocumentSupportedField;
  fieldLabel: string;
  value: string | number;
  provenance: Provenance;
  dataClass: "ai_detected";
}

export interface DocumentMergeInput {
  /** Currently stored provenance per field, if any. */
  existing: Partial<Record<DocumentSupportedField, Provenance | undefined>>;
}

export interface DocumentMergeOutcome {
  /** Updates safe to apply, nothing conflicts at a higher trust level. */
  updates: ExtractedFieldUpdate[];
  /** Fields whose current value is more trusted, never overwritten. */
  preserved: Array<{
    field: DocumentSupportedField;
    fieldLabel: string;
    reason: string;
  }>;
  /** Duplicate extractions of the same field inside one document. */
  duplicates: Array<{
    field: DocumentSupportedField;
    fieldLabel: string;
    reason: string;
  }>;
  limitation: string;
}

function trustRank(p: Provenance | undefined): number {
  if (!p) return 0;
  if (p.sourceType === "admin_verified" && p.verificationStatus === "verified")
    return 4;
  if (p.sourceType === "user" && p.verificationStatus === "verified") return 3;
  if (p.verificationStatus === "verified") return 3;
  if (p.verificationStatus === "requires_confirmation") return 1;
  return 1; // unverified / undefined
}

/**
 * Convert a document extraction into provenance-tracked field
 * updates. Every fact becomes ai_detected + requires_confirmation :
 * regardless of extractor confidence, a document NEVER self-verifies.
 */
export function extractPropertyFacts(
  extraction: DocumentExtraction,
): ExtractedFieldUpdate[] {
  const seen = new Set<DocumentSupportedField>();
  const updates: ExtractedFieldUpdate[] = [];
  for (const fact of extraction.facts) {
    // First occurrence wins within one document; later duplicates
    // are dropped by the caller (mergeDocumentFacts reports them).
    if (seen.has(fact.field)) continue;
    seen.add(fact.field);
    updates.push({
      field: fact.field,
      fieldLabel: DOCUMENT_FIELD_LABELS[fact.field],
      value: fact.value,
      provenance: {
        source: `document:${extraction.documentKind}:${extraction.documentId}`,
        sourceType: "ai_extraction",
        collectedAt: extraction.extractedAt,
        confidence: fact.confidence,
        verificationStatus: "requires_confirmation",
      },
      dataClass: "ai_detected",
    });
  }
  return updates;
}

/**
 * Merge extracted updates against the existing profile provenance.
 * Verified / user-confirmed values are NEVER overwritten by an
 * AI-extracted document fact, that is a hard trust boundary.
 */
export function mergeDocumentFacts(
  extraction: DocumentExtraction,
  input: DocumentMergeInput,
): DocumentMergeOutcome {
  const updates: ExtractedFieldUpdate[] = [];
  const preserved: DocumentMergeOutcome["preserved"] = [];
  const duplicates: DocumentMergeOutcome["duplicates"] = [];

  const countByField = new Map<DocumentSupportedField, number>();
  for (const fact of extraction.facts) {
    countByField.set(fact.field, (countByField.get(fact.field) ?? 0) + 1);
  }

  for (const update of extractPropertyFacts(extraction)) {
    const existingProvenance = input.existing[update.field];
    const extractionRank = 1; // ai_detected, requires_confirmation
    if (existingProvenance && trustRank(existingProvenance) > extractionRank) {
      preserved.push({
        field: update.field,
        fieldLabel: update.fieldLabel,
        reason: `Current value is ${existingProvenance.verificationStatus} (${existingProvenance.sourceType}), a document extraction may not overwrite it. The document value is kept aside for you to review.`,
      });
      continue;
    }
    updates.push(update);
  }

  for (const [field, count] of countByField) {
    if (count > 1) {
      duplicates.push({
        field,
        fieldLabel: DOCUMENT_FIELD_LABELS[field],
        reason: `Extracted ${count} times in this document, the first occurrence was kept. Review the document for the correct value.`,
      });
    }
  }

  return {
    updates,
    preserved,
    duplicates,
    limitation: DOCUMENT_INTELLIGENCE_LIMITATION,
  };
}
