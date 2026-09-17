// Registry invariants for the semantic graph relationship
// types (spec §4): the registry is the single authority; the
// SQL health mirror and the materialization CASE must stay
// consistent with it.

import { describe, it, expect } from "vitest";
import {
  RELATION_TYPES,
  RELATION_CATEGORIES,
  LEXICON_RELATION_MAPPINGS,
  isKnownRelationType,
  relationCategory,
  relationTypesInCategories,
  lexiconMappingFor,
  CAUSAL_RELATION_TYPES,
} from "./relations.ts";

describe("semantic graph — relationship registry", () => {
  it("every spec §4 minimum type is registered with a category", () => {
    const required = [
      "IS_A",
      "TYPE_OF",
      "SUBTYPE_OF",
      "PART_OF",
      "HAS_PART",
      "CONTAINS",
      "COMPONENT_OF",
      "USED_FOR",
      "USED_BY",
      "REQUIRES",
      "PRODUCES",
      "CONSUMES",
      "OPERATES_ON",
      "CAUSES",
      "CAN_CAUSE",
      "RESULTS_IN",
      "PREVENTS",
      "REDUCES",
      "HAS_PROPERTY",
      "HAS_ATTRIBUTE",
      "HAS_STATE",
      "RELATED_TO",
      "ASSOCIATED_WITH",
      "PRECEDES",
      "FOLLOWS",
      "OCCURS_DURING",
      "LOCATED_IN",
      "CONTAINS_LOCATION",
      "ADJACENT_TO",
      "SIMILAR_TO",
      "DIFFERENT_FROM",
      "CONTRASTS_WITH",
      "USED_IN_DOMAIN",
      "SPECIALIZED_TERM_IN",
    ];
    for (const t of required) {
      expect(isKnownRelationType(t), t).toBe(true);
      expect(RELATION_TYPES[t].category).toBeTruthy();
      expect(RELATION_TYPES[t].description.length).toBeGreaterThan(10);
    }
  });

  it("categories are the fixed ten, and every type maps into one", () => {
    expect(RELATION_CATEGORIES).toHaveLength(10);
    for (const spec of Object.values(RELATION_TYPES)) {
      expect(RELATION_CATEGORIES).toContain(spec.category);
    }
  });

  it("causal types are declared so retrieval can guard them", () => {
    expect(CAUSAL_RELATION_TYPES).toContain("CAUSES");
    for (const t of CAUSAL_RELATION_TYPES) {
      expect(RELATION_TYPES[t].causal).toBe(true);
      expect(relationCategory(t)).toBe("CAUSAL");
    }
  });

  it("inverse metadata is symmetric where declared", () => {
    expect(RELATION_TYPES.IS_A.inverse).toBe("HAS_TYPE");
    expect(RELATION_TYPES.HAS_TYPE.inverse).toBe("IS_A");
    expect(RELATION_TYPES.PART_OF.inverse).toBe("HAS_PART");
    expect(RELATION_TYPES.HAS_PART.inverse).toBe("PART_OF");
    // inverses always resolve to registered types
    for (const spec of Object.values(RELATION_TYPES)) {
      if (spec.inverse) expect(isKnownRelationType(spec.inverse)).toBe(true);
    }
  });

  it("category filtering returns only that category's types", () => {
    const tax = relationTypesInCategories(["TAXONOMIC"]);
    expect(tax).toContain("IS_A");
    expect(tax).not.toContain("CAUSES");
    const causal = relationTypesInCategories(["CAUSAL"]);
    expect(causal).toContain("CAUSES");
    expect(causal).not.toContain("IS_A");
  });

  it("unknown relation types are honestly rejected", () => {
    expect(isKnownRelationType("MADE_UP_RELATION")).toBe(false);
    expect(relationCategory("MADE_UP_RELATION")).toBeNull();
    expect(
      lexiconMappingFor("lexicon_relationships", "TOTALLY_NEW"),
    ).toBeNull();
  });
});

describe("semantic graph — lexicon mapping coverage", () => {
  it("covers every relation type present in the live lexicon (verified 2026-09-16)", () => {
    // relation_type counts from production lexicon_relationships /
    // lexicon_sense_relations — the graph materialization maps
    // ALL of them; anything new in a future import must get a
    // mapping entry (or be reported unmapped, never guessed).
    const synsetRelations = [
      "HYPONYM",
      "HYPERNYM",
      "SIMILAR_TO",
      "DOMAIN_OF_TOPIC",
      "DOMAIN_TOPIC",
      "MERONYM_PART",
      "HOLONYM_PART_OF",
      "ALSO_SEE",
      "EXEMPLIFIES",
      "ATTRIBUTE",
      "MERONYM_SUBSTANCE",
      "HOLONYM_SUBSTANCE_OF",
      "HOLONYM_MEMBER_OF",
      "MERONYM_MEMBER",
      "ENTAILMENT",
      "CAUSES",
      "DOMAIN_REGION",
      "DOMAIN_OF_REGION",
    ];
    for (const rel of synsetRelations) {
      // DOMAIN_OF_TOPIC / DOMAIN_OF_REGION are the INVERSE
      // direction of the domain relation: only the forward
      // direction is mapped (documented decision); everything
      // else maps.
      const mapped = lexiconMappingFor("lexicon_relationships", rel);
      if (rel.startsWith("DOMAIN_OF_")) {
        expect(mapped).toBeNull();
      } else {
        expect(mapped, rel).not.toBeNull();
        expect(isKnownRelationType(mapped!.graphRelation)).toBe(true);
      }
    }
    const senseRelations = [
      "DERIVATION",
      "ANTONYM",
      "ROLE_EVENT",
      "PERTAINYM",
      "EXEMPLIFIES",
      "ROLE_AGENT",
      "ROLE_RESULT",
      "ROLE_BY_MEANS_OF",
      "ALSO_SEE",
      "ROLE_UNDERGOER",
      "ROLE_INSTRUMENT",
      "ROLE_USES",
      "ROLE_STATE",
      "ROLE_PROPERTY",
      "ROLE_LOCATION",
      "ROLE_MATERIAL",
      "ROLE_VEHICLE",
      "ROLE_BODY_PART",
      "ROLE_DESTINATION",
    ];
    for (const rel of senseRelations) {
      const mapped = lexiconMappingFor("lexicon_sense_relations", rel);
      expect(mapped, rel).not.toBeNull();
      expect(isKnownRelationType(mapped!.graphRelation)).toBe(true);
    }
  });

  it("maps only to relation types whose sourced meaning they directly carry", () => {
    for (const m of LEXICON_RELATION_MAPPINGS) {
      expect(isKnownRelationType(m.graphRelation)).toBe(true);
      // provenance + evidence always preserve the original
      expect(m.note).toContain(m.lexiconRelation);
    }
  });
});
