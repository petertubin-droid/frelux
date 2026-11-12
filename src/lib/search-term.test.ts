import { describe, it, expect } from "vitest";
import { sanitizeSearchTerm, hasSearchTerm } from "./search-term";

describe("sanitizeSearchTerm", () => {
  it("keeps ordinary searches intact", () => {
    expect(sanitizeSearchTerm("cement 50kg")).toBe("cement 50kg");
    expect(sanitizeSearchTerm("  pop   ceiling ")).toBe("pop ceiling");
    expect(sanitizeSearchTerm("paint-brush")).toBe("paint-brush");
    expect(sanitizeSearchTerm("tiles")).toBe("tiles");
  });

  it("keeps non-Latin terms, which are not lesser searches", () => {
    expect(sanitizeSearchTerm("ciment")).toBe("ciment");
    expect(sanitizeSearchTerm("سمنت")).toBe("سمنت");
    expect(sanitizeSearchTerm("瓷砖")).toBe("瓷砖");
    expect(sanitizeSearchTerm("câble")).toBe("câble");
  });

  it("removes the characters that build a PostgREST filter", () => {
    // A comma or a parenthesis turns a value into query syntax.
    expect(sanitizeSearchTerm("cheap,used")).toBe("cheap used");
    expect(sanitizeSearchTerm("a),status.eq.draft")).toBe(
      "a status eq draft",
    );
    expect(sanitizeSearchTerm("100%")).toBe("100");
    expect(sanitizeSearchTerm("or(admin_removed.eq.true)")).toBe(
      "or admin removed eq true",
    );
    expect(sanitizeSearchTerm("*")).toBe("");
  });

  it("caps the length", () => {
    expect(sanitizeSearchTerm("a".repeat(500))).toHaveLength(80);
    expect(sanitizeSearchTerm("a".repeat(500), 20)).toHaveLength(20);
  });

  it("reports when nothing searchable is left", () => {
    expect(hasSearchTerm("   ")).toBe(false);
    expect(hasSearchTerm("%%%")).toBe(false);
    expect(hasSearchTerm("tiles")).toBe(true);
  });
});
