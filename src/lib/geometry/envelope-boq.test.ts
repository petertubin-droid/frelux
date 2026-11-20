import { describe, expect, it } from "vitest";

import { buildEnvelope } from "@/lib/geometry/envelope";
import {
  buildEnvelopeBoqLines,
  toEnvelopeCalculationInput,
} from "@/lib/geometry/envelope-boq";
import { previewImport } from "@/lib/boq/imports";

function envelope(roofRiseMm: number | null = 2600) {
  const outcome = buildEnvelope([
    {
      view: "front",
      widthMm: 12000,
      eaveHeightMm: 3000,
      roofRiseMm: null,
      openings: [{ kind: "door", widthMm: 900, heightMm: 2100 }],
    },
    { view: "back", widthMm: 12000, eaveHeightMm: 3000, roofRiseMm: null },
    {
      view: "left",
      widthMm: 8000,
      eaveHeightMm: 3000,
      roofRiseMm,
    },
    { view: "right", widthMm: 8000, eaveHeightMm: 3000, roofRiseMm },
  ]);
  if (!outcome.ok) throw new Error(outcome.errors.join(" "));
  return outcome.envelope;
}

describe("envelope -> BOQ", () => {
  it("carries the reconciled quantities and never a rate", () => {
    const env = envelope();
    const build = buildEnvelopeBoqLines(env);

    const wall = build.lines.find((l) => l.name.startsWith("Blockwork"));
    expect(wall?.quantity).toBeCloseTo(env.netWallAreaM2, 3);
    expect(wall?.unit).toBe("m²");

    const roof = build.lines.find((l) => l.name.startsWith("Roof covering"));
    expect(roof?.quantity).toBeCloseTo(env.trueRoofAreaM2, 3);

    for (const line of build.lines) {
      expect(line.estimated_price).toBeNull();
      expect(line.quantity).toBeGreaterThan(0);
    }
  });

  it("deducts openings instead of billing them, and says so", () => {
    const env = envelope();
    const build = buildEnvelopeBoqLines(env);
    expect(build.totals.openingCount).toBe(1);
    // Five pay items, none of them a billable opening: the deduction happens
    // inside the wall area and is disclosed in the notes.
    expect(build.lines).toHaveLength(5);
    expect(build.notes.join(" ")).toMatch(/deducted/i);
  });

  it("routes each line to the right BOQ section through the importer", () => {
    const env = envelope();
    const input = toEnvelopeCalculationInput(env, { projectId: "p1" });
    const preview = previewImport({
      source_table: "project_calculations",
      ref: "calc-1",
      calculator_slug: input.calculator_slug,
      calculator_type: input.calculator_type,
      title: input.calc_title,
      created_at: new Date("2026-11-20T00:00:00Z").toISOString(),
      materials: input.materials,
    });

    expect(preview.calculator_key).toBe("envelope");
    const sections = new Map(
      preview.lines.map((line) => [line.description, line.section.code]),
    );
    expect(
      sections.get("Blockwork to walls, net area (openings deducted)"),
    ).toBe("07");
    expect(sections.get("Concrete floor slab, footprint area")).toBe("05");
    expect(
      sections.get("Foundation trench and footing, wall perimeter length"),
    ).toBe("04");
    expect(sections.get("Roof covering, true sloped area")).toBe("08");
    // Unpriced lines are a warning the importer is meant to raise, not a
    // failure: this tool measures and never rates.
    expect(preview.warnings.join(" ")).toMatch(/unpriced/i);
  });

  it("states a flat roof rather than claiming a pitch", () => {
    const env = envelope(null);
    const build = buildEnvelopeBoqLines(env);
    expect(env.roofRiseMm).toBeNull();
    expect(build.notes.join(" ")).toMatch(/no roof rise/i);
    expect(build.totals.trueRoofAreaM2).toBeCloseTo(env.footprintAreaM2, 3);
  });
});
