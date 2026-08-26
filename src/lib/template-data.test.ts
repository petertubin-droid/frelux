import { describe, it, expect } from "vitest";
import { FALLBACK_TEMPLATES } from "@/lib/template-data";

describe("template-data — FALLBACK_TEMPLATES", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(FALLBACK_TEMPLATES)).toBe(true);
    expect(FALLBACK_TEMPLATES.length).toBeGreaterThan(0);
  });

  it("has at least 40 templates (per comment in source)", () => {
    expect(FALLBACK_TEMPLATES.length).toBeGreaterThanOrEqual(40);
  });

  it("each template has id, calculator_type, name, and input_data", () => {
    for (const t of FALLBACK_TEMPLATES) {
      expect(t.id).toBeTruthy();
      expect(t.calculator_type).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.input_data).toBeDefined();
      expect(typeof t.input_data).toBe("object");
    }
  });

  it("has templates for each calculator type", () => {
    const types = new Set(FALLBACK_TEMPLATES.map((t) => t.calculator_type));
    expect(types.has("paint")).toBe(true);
    expect(types.has("tile")).toBe(true);
    expect(types.has("pop")).toBe(true);
    expect(types.has("screeding")).toBe(true);
  });

  it("has unique IDs", () => {
    const ids = FALLBACK_TEMPLATES.map((t) => t.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("has unique slugs", () => {
    const slugs = FALLBACK_TEMPLATES.map((t) => t.slug).filter(Boolean);
    const unique = new Set(slugs);
    expect(unique.size).toBe(slugs.length);
  });

  it("each template has a description", () => {
    for (const t of FALLBACK_TEMPLATES) {
      expect(t.description).toBeTruthy();
    }
  });

  it("schema_version is 1 for all", () => {
    for (const t of FALLBACK_TEMPLATES) {
      expect(t.schema_version).toBe(1);
    }
  });

  it("all are public (user_id is null)", () => {
    for (const t of FALLBACK_TEMPLATES) {
      expect(t.user_id).toBeNull();
    }
  });
});
