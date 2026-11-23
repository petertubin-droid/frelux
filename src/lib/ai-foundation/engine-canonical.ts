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
  "quote_check",
  "exterior_finish",
  "wall_areas",
  "window_blinds",
  "takeoff",
  "plastering_wall",
  "steel_beam",
  "foundation_below_dpc",
  "icf_wall",
  "concrete_takeoff",
  "masonry",
  "concrete_volume",
  "waterproofing",
  "soffit_gutter",
  "retaining_wall",
  "temporary_works",
  "drywall",
  "insulation",
  "paint",
  "plaster_render",
  "flooring",
] as const;

export const CANONICAL_ENGINE_MANIFEST: readonly CanonicalEngineLink[] = [
  {
    aiEngineId: "takeoff",
    canonicalId: null,
    confidence: "unresolved",
    note: "The takeoff engine measures one schedule across seven scopes (blockwork, render, paint, ceiling, floor tiles, screed, skirting), so no single international capability describes it. Mapping it to block, tile or painting would each be true of one scope and false of the rest, which is exactly the guess this manifest exists to avoid.",
  },
  {
    aiEngineId: "window_blinds",
    canonicalId: null,
    confidence: "unresolved",
    note: "Blind pricing is a window treatment, not part of the doors and windows opening schedule, so it has no canonical counterpart in the international inventory yet. Pricing rests on the Nigerian scan recorded in the engine.",
  },
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
    aiEngineId: "flooring",
    canonicalId: null,
    confidence: "unresolved",
    note: "The canonical vocabulary carries tile and screeding as floor finishes but nothing for board, vinyl or parquet flooring with its underlay and skirting, so this takeoff has no id to claim.",
  },
  {
    aiEngineId: "exterior_finish",
    canonicalId: null,
    confidence: "unresolved",
    note: "The canonical vocabulary carries EIFS and DEFS as wall systems rather than as a takeoff of their layers, so this adapter has no quantity id to claim.",
  },
  {
    aiEngineId: "wall_areas",
    canonicalId: null,
    confidence: "unresolved",
    note: "Measured wall area is an intermediate of every finishing trade rather than a canonical trade of its own, so there is no id to claim.",
  },
  {
    aiEngineId: "paint",
    canonicalId: null,
    confidence: "unresolved",
    note: "Painting already has two registry engines, painting_project and painting_wall_area, and both are themselves unresolved against the international vocabulary. A third row claiming a canonical id would repeat that guess rather than settle it.",
  },
  {
    aiEngineId: "drywall",
    canonicalId: null,
    confidence: "unresolved",
    note: "Drywall is described as a partition system in the international lists, with plasterboard as its material. Neither id covers a board, stud and screw takeoff as one calculation.",
  },
  {
    aiEngineId: "plaster_render",
    canonicalId: null,
    confidence: "unresolved",
    note: "The canonical lists carry tyrolene as one textured finish and plastering as cement-sand work. This engine spans gypsum plaster, exterior render and Tyrolene in one calculation, so mapping it to either id would claim more than that id covers.",
  },
  {
    aiEngineId: "insulation",
    canonicalId: null,
    confidence: "unresolved",
    note: "Insulation appears only as a material property inside roof, wall and floor systems. There is no standalone insulation id to map onto.",
  },
  {
    aiEngineId: "retaining_wall",
    canonicalId: null,
    confidence: "unresolved",
    note: "Retaining structures appear in the inventory under substructure and earth retention. Neither id distinguishes a block stem from a concrete stem, which is what changes this engine's output.",
  },
  {
    aiEngineId: "temporary_works",
    canonicalId: null,
    confidence: "unresolved",
    note: "Formwork and scaffolding are site establishment items in the international lists, not a single engine, so no id covers a combined takeoff.",
  },
  {
    aiEngineId: "waterproofing",
    canonicalId: null,
    confidence: "unresolved",
    note: "The inventory treats damp-proofing as a membrane material inside substructure and wet areas, not as a combined DPC, DPM and coating engine, so no id matches this shape.",
  },
  {
    aiEngineId: "soffit_gutter",
    canonicalId: null,
    confidence: "unresolved",
    note: "Roof drainage appears only as a rainwater system in the international lists. This engine measures eaves and downpipes, which is narrower than that id claims.",
  },
  {
    aiEngineId: "masonry",
    canonicalId: null,
    confidence: "unresolved",
    note: "The international lists model masonry as a system with market-specific unit profiles, while this engine resolves the unit from the market code. The ids describe different shapes, so no mapping is claimed.",
  },
  {
    aiEngineId: "concrete_volume",
    canonicalId: null,
    confidence: "unresolved",
    note: "A second concrete entry point, stated as an auditable contract in millimetres. Mapping it onto the concrete id would claim one implementation serves both, which is not true.",
  },
  {
    aiEngineId: "icf_wall",
    canonicalId: null,
    confidence: "unresolved",
    note: "Insulated concrete forms are a wall system the international lists group under masonry or structure. Neither id describes a formwork cavity, so the mapping waits.",
  },
  {
    aiEngineId: "concrete_takeoff",
    canonicalId: null,
    confidence: "unresolved",
    note: "The inventory models concrete as a material inside systems rather than as a per-element takeoff, so there is no id to point at.",
  },
  {
    aiEngineId: "steel_beam",
    canonicalId: null,
    confidence: "unresolved",
    note: "The capability registry lists structural steel framing as a system rather than a beam-mass check, so no id describes this engine yet.",
  },
  {
    aiEngineId: "foundation_below_dpc",
    canonicalId: null,
    confidence: "unresolved",
    note: "A second foundation entry point: the below-DPC takeoff. It reports the same substructure the verified foundation id covers, so mapping it to that id would claim two registry engines share one implementation, which they do not.",
  },
  {
    aiEngineId: "plastering_wall",
    canonicalId: null,
    confidence: "unresolved",
    note: "The international capability lists describe plastering under wall finishing, but this engine covers plaster and render only. Mapping it to wall_finishing would overstate what it measures, so it waits for an owner decision.",
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
  {
    aiEngineId: "quote_check",
    canonicalId: null,
    confidence: "unresolved",
    note: "The registry judges a third party quote against the price book. The international capability lists have no matching id, so no mapping is claimed.",
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
