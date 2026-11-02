import { describe, expect, it } from "vitest";
import {
  mergeImportedLines,
  previewImport,
  type RawSourceRecord,
} from "./imports";
import type { BoqStudioSection } from "./types";

const calcRecord = (over: Partial<RawSourceRecord> = {}): RawSourceRecord => ({
  source_table: "project_calculations",
  ref: "calc-1",
  calculator_slug: "build-to-roof-estimator",
  title: "Copilot estimate",
  created_at: "2026-10-30T10:00:00.000Z",
  materials: [
    {
      name: "Cement (foundation)",
      unit: "bags",
      quantity: 50.55,
      category: "general",
    },
    { name: "Reinforcement Y12", unit: "kg", quantity: 820 },
    { name: "Blocks (foundation)", unit: "pcs", quantity: 400 },
  ],
  ...over,
});

describe("previewImport", () => {
  it("copies recorded quantities verbatim instead of recomputing them", () => {
    const preview = previewImport(calcRecord());
    const cement = preview.lines.find(
      (l) => l.description === "Cement (foundation)",
    )!;
    expect(cement.quantity).toBe(50.55);
    expect(cement.unit).toBe("bags");
  });

  it("routes each line to the work section its description belongs to", () => {
    const preview = previewImport(calcRecord());
    const byName = Object.fromEntries(
      preview.lines.map((l) => [l.description, l.section.code]),
    );
    expect(byName["Cement (foundation)"]).toBe("05");
    expect(byName["Reinforcement Y12"]).toBe("06");
    expect(byName["Blocks (foundation)"]).toBe("07");
  });

  it("falls back to the calculator's own section for unknown materials", () => {
    const preview = previewImport(
      calcRecord({
        calculator_slug: "screeding-cost-estimator",
        materials: [{ name: "Putty", unit: "buckets", quantity: 7 }],
      }),
    );
    expect(preview.calculator_key).toBe("screeding");
    expect(preview.lines[0].section.code).toBe("13");
  });

  it("maps every requested calculator slug to a known calculator", () => {
    const slugs = [
      "foundation-estimator",
      "cost-estimator",
      "screeding-cost-estimator",
      "tile-cost-estimator",
      "paint-calculator",
      "pop-ceiling-cost-estimator",
      "build-to-roof-estimator",
      "electrical-estimator",
      "plumbing-estimator",
      "foundation-calculator",
      "painting-estimator",
    ];
    const unresolved = slugs
      .map((slug) =>
        previewImport(
          calcRecord({
            calculator_slug: slug,
            materials: [{ name: "Item", unit: "nr", quantity: 1 }],
          }),
        ),
      )
      .filter((p) => p.calculator_key === null);
    expect(unresolved).toHaveLength(0);
  });

  it("flags a source that recorded no itemised quantities", () => {
    const preview = previewImport(calcRecord({ materials: null }));
    expect(preview.lines).toHaveLength(0);
    expect(preview.warnings.join(" ")).toMatch(/nothing to import/i);
  });

  it("imports a rate when the calculator recorded one", () => {
    const preview = previewImport(
      calcRecord({
        materials: [{ name: "Cement", unit: "bag", quantity: 10, rate: 9500 }],
      }),
    );
    expect(preview.lines[0].material_rate).toBe(9500);
  });

  it("leaves an unrecorded rate unpriced and says so", () => {
    const preview = previewImport(calcRecord());
    expect(preview.lines.every((l) => l.material_rate === null)).toBe(true);
    expect(preview.warnings.join(" ")).toMatch(/no recorded rate/i);
  });
});

describe("mergeImportedLines", () => {
  const sections: BoqStudioSection[] = [
    { id: "sec-05", code: "05", title: "Concrete Works", notes: "", items: [] },
  ];

  it("creates missing sections and adds lines", () => {
    const preview = previewImport(calcRecord());
    const { sections: merged, added } = mergeImportedLines(
      sections,
      preview.lines,
    );
    expect(added).toBe(3);
    expect(merged.map((s) => s.code).sort()).toEqual(["05", "06", "07"]);
  });

  it("does not duplicate the same imported line", () => {
    const preview = previewImport(calcRecord());
    const first = mergeImportedLines(sections, preview.lines);
    const second = mergeImportedLines(first.sections, preview.lines);
    expect(second.added).toBe(0);
    expect(second.skipped).toBe(3);
    expect(second.sections.flatMap((s) => s.items)).toHaveLength(3);
  });

  it("keeps the provenance of every imported line", () => {
    const preview = previewImport(calcRecord());
    const { sections: merged } = mergeImportedLines([], preview.lines);
    const line = merged[0].items[0];
    expect(line.source?.ref).toBe("calc-1");
    expect(line.source?.calculator).toBe("build_to_roof");
  });

  it("carries a note when the line arrives without a rate", () => {
    const preview = previewImport(calcRecord());
    const { sections: merged } = mergeImportedLines([], preview.lines);
    expect(merged[0].items[0].notes).toMatch(/rate to be added/i);
  });
});
