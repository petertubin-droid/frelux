// =========================================================
// INTERNATIONAL CODE REFERENCE CONFORMANCE (audit #33)
//
// The reference set's whole claim is that it names documents rather than
// borrowing another country's parameters. That claim is structural, so it can
// be tested without judging the codes themselves:
//
//  - a family's default edition must exist in that family's editions, or the
//    page shows a blank edition;
//  - every family must declare at least one jurisdiction, and every jurisdiction
//    must map to a family that exists;
//  - FAMILY_ORDER must cover every family exactly once, or a family is silently
//    unreachable in the UI;
//  - no family may present itself as adopted by a named municipality: it states
//    who adopts it, never that a city has approved it.
// =========================================================
import { describe, expect, it } from "vitest";
import {
  CODE_FAMILIES,
  DEFAULT_FAMILY_BY_JURISDICTION,
  FAMILY_ORDER,
  REGISTRY_VERSION,
  getFamily,
} from "../library";
import { JURISDICTIONS } from "../types";

const families = Object.values(CODE_FAMILIES);

describe("code reference: registry integrity", () => {
  it("carries a version stamp", () => {
    expect(REGISTRY_VERSION).toMatch(/^\d{4}\.\d{2}\.\d{2}/);
  });

  it("points every default edition at an edition it actually lists", () => {
    for (const f of families) {
      const ids = f.editions.map((e) => e.id);
      expect(ids, `${f.id} editions`).toContain(f.defaultEditionId);
    }
  });

  it("lists at least one edition and a non-empty label for each", () => {
    for (const f of families) {
      expect(f.editions.length, `${f.id}`).toBeGreaterThan(0);
      for (const e of f.editions) {
        expect(e.label.trim().length, `${f.id}/${e.id}`).toBeGreaterThan(0);
      }
    }
  });

  it("declares only years that could be a real edition", () => {
    for (const f of families) {
      for (const e of f.editions) {
        if (e.year === null) continue;
        expect(e.year, `${f.id}/${e.id}`).toBeGreaterThanOrEqual(1950);
        expect(e.year, `${f.id}/${e.id}`).toBeLessThanOrEqual(2026);
      }
    }
  });

  it("gives every family at least one jurisdiction", () => {
    for (const f of families) {
      expect(f.jurisdictions.length, f.id).toBeGreaterThan(0);
    }
  });

  it("maps every offered jurisdiction to a family that exists", () => {
    for (const j of JURISDICTIONS) {
      const familyId = DEFAULT_FAMILY_BY_JURISDICTION[j.code];
      expect(familyId, j.code).toBeTruthy();
      expect(Object.keys(CODE_FAMILIES)).toContain(familyId);
    }
  });

  it("covers every family exactly once in FAMILY_ORDER", () => {
    const orderIds = [...FAMILY_ORDER].sort();
    const familyIds = Object.keys(CODE_FAMILIES).sort();
    expect(orderIds).toEqual(familyIds);
  });

  it("resolves a family by id and refuses an unknown one", () => {
    expect(getFamily(FAMILY_ORDER[0]).id).toBe(FAMILY_ORDER[0]);
    expect(() => getFamily("not-a-family" as never)).toThrow();
  });

  it("never claims municipal approval", () => {
    for (const f of families) {
      const text = `${f.adoptingAuthorities} ${f.adoptionNote}`.toLowerCase();
      expect(text, f.id).not.toMatch(/approved by the city|municipal approval/);
      expect(f.adoptingAuthorities.trim().length, f.id).toBeGreaterThan(0);
    }
  });

  it("states that Eurocode parameters do not transfer between member states", () => {
    const eurocode = CODE_FAMILIES.eurocode;
    const text = [...eurocode.scopeNotes, eurocode.adoptionNote]
      .join(" ")
      .toLowerCase();
    expect(text).toMatch(/national annex/);
  });
});
