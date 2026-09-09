// =========================================================
// FRELUX AI MULTILINGUAL CONSTRUCTION DICTIONARY
// CORE TYPES AND CATEGORY TAXONOMY
//
// A dictionary record is NOT a word-for-word translation
// entry: it carries the construction MEANING of the term,
// its technical and simple definitions, measurement context,
// local Nigerian usage and translation governance fields.
// =========================================================

/** Translation governance: never invent, flag what is weak. */
export type TranslationStatus =
  | "verified"
  | "provisional"
  | "needs_review"
  | "untranslated";

/** Spec §4: Nigerian local terminology layers. */
export interface NigerianLocalTerminology {
  formal_term: string;
  nigerian_common_term: string;
  local_expression?: string;
  technical_equivalent: string;
  /** ambiguous local expressions are flagged, never guessed */
  is_ambiguous?: boolean;
  ambiguity_note?: string;
}

/** Spec §14: source management (concise definitions only,
 *  never copied documents). */
export interface TermSource {
  source_name: string;
  source_url?: string;
  author_or_organization?: string;
  publication_date?: string;
  country?: string;
  document_title?: string;
  license_or_usage?: string;
}

/** The full dictionary record (mirrors construction_terms). */
export interface ConstructionTerm {
  id: string;
  canonical_term: string;
  category: ConstructionCategory;
  definition: string;
  technical_definition: string;
  simple_definition: string;
  language: string;
  translation: string | null;
  alternative_terms: string[];
  local_terms: string[];
  synonyms: string[];
  abbreviations: string[];
  unit: string | null;
  measurement_type: string | null;
  construction_context: string;
  example_usage: string;
  related_terms: string[];
  common_mistakes: string[];
  translation_notes: string | null;
  country: string;
  region: string;
  source: string | null;
  source_url: string | null;
  source_date: string | null;
  confidence_score: number; // 0-1
  verified: boolean;
  verified_by: string | null;
  translation_status: TranslationStatus;
  /** true when the term should stay in English even in other
   *  languages (spec §8.5): technical terms with no reliable
   *  translation are preserved, not invented. */
  keep_in_english: boolean;
  /** true when a translation requires an explanation note */
  explanation_required: boolean;
  nigerian_terminology: NigerianLocalTerminology | null;
  source_details: TermSource | null;
  version: number;
  created_at: string;
  updated_at: string;
}

/** Dictionary draft for admin creation (id/version/timestamps
 *  are assigned by the persistence layer). */
export type ConstructionTermDraft = Omit<
  ConstructionTerm,
  "id" | "version" | "created_at" | "updated_at" | "verified" | "verified_by"
>;

/** Spec §3 category taxonomy. Categories are data; new ones
 *  are added to this array, nothing else changes. */
export const CONSTRUCTION_CATEGORIES = [
  "building",
  "roofing",
  "concrete",
  "foundation",
  "finishing",
  "estimating",
  "measurements",
  "tools_equipment",
  "materials",
  "safety",
  "project_management",
] as const;

export type ConstructionCategory = (typeof CONSTRUCTION_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ConstructionCategory, string> = {
  building: "Building",
  roofing: "Roofing",
  concrete: "Concrete",
  foundation: "Foundation",
  finishing: "Finishing",
  estimating: "Estimating",
  measurements: "Measurements",
  tools_equipment: "Tools and Equipment",
  materials: "Materials",
  safety: "Safety",
  project_management: "Project Management",
};

export function isValidCategory(category: string): boolean {
  return (CONSTRUCTION_CATEGORIES as readonly string[]).includes(category);
}
