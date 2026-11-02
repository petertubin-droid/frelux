// =========================================================
// CANONICAL ENGINE MANIFEST
//
// The AI registry and the international inventories name the same
// engines differently. Only seven ids are shared, so a capability
// matrix keyed on international ids reports no engine behind painting,
// tile, structural and foundation, even though each has a tested
// implementation.
//
// This manifest is ADDITIVE. No engine id is renamed, so nothing that
// references one breaks. It records, explicitly, which international
// capability each AI engine corresponds to.
//
// Additive matters: two AI engines plausibly map to one capability
// (painting_project and painting_wall_area to painting), so the mapping
// is many-to-one and a rename would have to delete an id. An alias
// keeps both.
//
// Two entries are deliberately unresolved. Guessing them would be worse
// than recording the uncertainty, so they carry a reason and are listed
// in UNRESOLVED_ENGINE_IDS. Anyone who adds a registry engine without a
// row here fails the test suite.
// =========================================================

export interface CanonicalEngineLink {
  /** Engine id as registered in the AI foundation registry. */
  aiEngineId: string;
  /**
   * Id used by the international capability registry / engine inventory,
   * or null when the correspondence is not yet established.
   */
  canonicalId: string | null;
  /** How sure we are. Only "verified" mappings are safe to build on. */
  confidence: "verified" | "high" | "medium" | "unresolved";
  /** Why, in plain language. Required when canonicalId is null. */
  note: string;
}

/**
 * Engines whose canonical counterpart is not established. Kept as a
 * separate list so "unmapped" is an explicit, reviewed state rather than
 * an absence nobody noticed.
 */
export const UNRESOLVED_ENGINE_IDS = [
  "painting_wall_area",
  "timeline_estimator",
] as const;

export const CANONICAL_ENGINE_MANIFEST: readonly CanonicalEngineLink[] = [
  // The seven ids both vocabularies already agree on.
  {
    aiEngineId: "build_to_roof",
    canonicalId: "build_to_roof",
    confidence: "verified",
    note: "Same id in the registry and both international lists.",
  },
  {
    aiEngineId: "electrical",
    canonicalId: "electrical",
    confidence: "verified",
    note: "Same id in the registry and both international lists.",
  },
  {
    aiEngineId: "margin_calculator",
    canonicalId: "margin_calculator",
    confidence: "verified",
    note: "Same id in the registry and both international lists.",
  },
  {
    aiEngineId: "plumbing",
    canonicalId: "plumbing",
    confidence: "verified",
    note: "Same id in the registry and both international lists.",
  },
  {
    aiEngineId: "pop_ceiling",
    canonicalId: "pop_ceiling",
    confidence: "verified",
    note: "Same id in the registry and both international lists.",
  },
  {
    aiEngineId: "regional_cost",
    canonicalId: "regional_cost",
    confidence: "verified",
    note: "Same id in the registry and both international lists.",
  },
  {
    aiEngineId: "roof_geometry",
    canonicalId: "roof_geometry",
    confidence: "verified",
    note: "Same id in the registry and both international lists.",
  },
  {
    aiEngineId: "foundation",
    canonicalId: "foundation",
    confidence: "verified",
    note: "FRELUX International Foundation Engine. Same id in both international lists.",
  },
  {
    aiEngineId: "doors_windows",
    canonicalId: "doors_windows",
    confidence: "verified",
    note: "FRELUX International Doors & Windows Engine. Same id in both international lists.",
  },
  {
    aiEngineId: "reinforcement",
    canonicalId: "reinforcement",
    confidence: "verified",
    note: "FRELUX International Reinforcement Engine. Same id in both international lists.",
  },

  // The ten that need an alias. These are proposals by purpose, not
  // verified identities: none has been confirmed against the capability
  // registry's own definition of the capability.
  {
    aiEngineId: "painting_project",
    canonicalId: "painting",
    confidence: "high",
    note: "Full painting take-off including materials and containers.",
  },
  {
    aiEngineId: "tile_estimate",
    canonicalId: "tile",
    confidence: "high",
    note: "Tile and adhesive estimate.",
  },
  {
    aiEngineId: "structural_calculator",
    canonicalId: "structural",
    confidence: "high",
    note: "Structural member design.",
  },
  {
    aiEngineId: "foundation_calculator",
    canonicalId: "foundation",
    confidence: "medium",
    note: "Geotechnical footing design, which overlaps the International Foundation Engine on the same capability. Whether this belongs under foundation or structural as design work, while the other covers priced work, is undecided.",
  },
  {
    aiEngineId: "screeding_system",
    canonicalId: "screeding",
    confidence: "high",
    note: "Floor screeding system.",
  },
  {
    aiEngineId: "tyrolene_system",
    canonicalId: "tyrolene",
    confidence: "high",
    note: "Tyrolene finish system.",
  },
  {
    aiEngineId: "tyrolene_partition_area",
    canonicalId: "tyrolene",
    confidence: "medium",
    note: "Second AI engine on the tyrolene capability, so this mapping is many-to-one.",
  },
  {
    aiEngineId: "sequence_planner",
    canonicalId: "sequence",
    confidence: "medium",
    note: "Construction sequence planning.",
  },
  {
    aiEngineId: "painting_wall_area",
    canonicalId: null,
    confidence: "unresolved",
    note: "Could be painting or wall_finishing. Both are defensible and the choice changes what an admin matrix reports, so it waits for an owner decision.",
  },
  {
    aiEngineId: "timeline_estimator",
    canonicalId: null,
    confidence: "unresolved",
    note: "No counterpart found in the capability registry or the engine inventory. It may be a capability the international lists never modelled.",
  },
];

/** Manifest row for one AI engine, or null when it has none. */
export function canonicalLinkFor(
  aiEngineId: string,
): CanonicalEngineLink | null {
  return (
    CANONICAL_ENGINE_MANIFEST.find((l) => l.aiEngineId === aiEngineId) ?? null
  );
}

/** Canonical id for an AI engine, or null when not established. */
export function canonicalIdFor(aiEngineId: string): string | null {
  return canonicalLinkFor(aiEngineId)?.canonicalId ?? null;
}

/** Manifest rows that are safe to build on. */
export function verifiedLinks(): CanonicalEngineLink[] {
  return CANONICAL_ENGINE_MANIFEST.filter(
    (l) => l.confidence === "verified" || l.confidence === "high",
  );
}
