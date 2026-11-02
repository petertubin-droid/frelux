// =========================================================
// CANONICAL MANIFEST INTEGRITY
//
// The manifest exists to make the vocabulary gap visible. These tests
// keep it honest: no engine silently unmapped, no canonical id that does
// not exist, and no unresolved entry quietly promoted to a guess.
// =========================================================

import { describe, it, expect } from "vitest";
import { listEngines } from "./engines-registry";
import {
  CANONICAL_ENGINE_MANIFEST,
  UNRESOLVED_ENGINE_IDS,
  canonicalIdFor,
  canonicalLinkFor,
  verifiedLinks,
} from "./engine-canonical";
import { FULL_ENGINE_INVENTORY } from "../international/engine-inventory";

const inventoryIds = new Set(FULL_ENGINE_INVENTORY.map((e) => e.id));

describe("canonical engine manifest", () => {
  it("has a row for every registered engine", () => {
    const unmapped = listEngines()
      .map((e) => e.id)
      .filter((id) => canonicalLinkFor(id) === null);
    expect(unmapped).toEqual([]);
  });

  it("has no rows for engines that are not registered", () => {
    const registered = new Set(listEngines().map((e) => e.id));
    const ghosts = CANONICAL_ENGINE_MANIFEST.map((l) => l.aiEngineId).filter(
      (id) => !registered.has(id),
    );
    expect(ghosts).toEqual([]);
  });

  it("only points at canonical ids that exist in the inventory", () => {
    const broken = CANONICAL_ENGINE_MANIFEST.filter(
      (l) => l.canonicalId !== null && !inventoryIds.has(l.canonicalId),
    ).map((l) => `${l.aiEngineId} -> ${l.canonicalId}`);
    expect(broken).toEqual([]);
  });

  it("lists exactly the unresolved ids as unresolved", () => {
    const nullRows = CANONICAL_ENGINE_MANIFEST.filter(
      (l) => l.canonicalId === null,
    ).map((l) => l.aiEngineId);
    expect([...nullRows].sort()).toEqual([...UNRESOLVED_ENGINE_IDS].sort());
  });

  it("makes every unresolved row explain itself", () => {
    const silent = CANONICAL_ENGINE_MANIFEST.filter(
      (l) => l.canonicalId === null && l.note.trim().length < 20,
    ).map((l) => l.aiEngineId);
    expect(silent).toEqual([]);
  });

  it("keeps unresolved rows out of the verified set used by callers", () => {
    const verified = verifiedLinks().map((l) => l.aiEngineId);
    for (const id of UNRESOLVED_ENGINE_IDS) {
      expect(verified).not.toContain(id);
    }
  });

  it("resolves the ten ids both vocabularies already share", () => {
    for (const id of [
      "build_to_roof",
      "electrical",
      "margin_calculator",
      "plumbing",
      "pop_ceiling",
      "regional_cost",
      "roof_geometry",
      "foundation",
      "doors_windows",
      "reinforcement",
    ]) {
      expect(canonicalIdFor(id)).toBe(id);
    }
  });

  it("never returns a canonical id for an unresolved engine", () => {
    for (const id of UNRESOLVED_ENGINE_IDS) {
      expect(canonicalIdFor(id)).toBeNull();
    }
  });
});
