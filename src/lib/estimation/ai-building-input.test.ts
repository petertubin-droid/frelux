import { describe, expect, it } from "vitest";
import {
  buildEstimateInput,
  parseVisionJson,
  normaliseBlockSize,
  type AiAnalysis,
} from "../../../supabase/functions/_shared/ai-building-input";
import { validateBuildToRoofInput } from "./build-to-roof-engine";

const analysis = (patch: Partial<AiAnalysis> = {}): AiAnalysis => ({
  detected_building_type: "bungalow",
  detected_building_type_confidence: 0.8,
  estimated_length: 15,
  estimated_width: 10,
  estimated_floors: 1,
  estimated_height_per_floor: 3,
  detected_roof_type: "gable",
  estimated_roof_pitch: 25,
  detected_roofing_material: "long_span_aluminium",
  detected_block_type: "9inch",
  estimated_internal_wall_length: 25,
  detected_openings: [
    {
      type: "door",
      estimated_width: 0.9,
      estimated_height: 2.1,
      estimated_count: 2,
    },
    {
      type: "window",
      estimated_width: 1.2,
      estimated_height: 1.2,
      estimated_count: 4,
    },
  ],
  ...patch,
});

const build = (patch: Partial<AiAnalysis> = {}) => {
  const result = buildEstimateInput(
    analysis(patch),
    "Test",
    "Nigeria",
    "2026-11-07",
  );
  if (!result.input) throw new Error("expected an input");
  return {
    input: result.input,
    notes: result.notes,
    fieldSources: result.fieldSources,
    needsConfirmation: result.needsConfirmation,
    measurements: result.measurements,
  };
};

describe("buildEstimateInput", () => {
  it("builds 6-inch blockwork when the photo reports 6-inch blocks", () => {
    const nine = build();
    const six = build({ detected_block_type: "6 inch" });
    // The model's own block reading used to change nothing: every detection
    // produced 18x9x9 and a 225 mm wall.
    expect(nine.input.block_width).toBe(9);
    expect(nine.input.wall_thickness).toBeCloseTo(0.225, 3);
    expect(six.input.block_size).toBe("6inch");
    expect(six.input.block_width).toBe(6);
    expect(six.input.wall_thickness).toBeCloseTo(0.15, 3);
    expect(six.input.internal_wall_thickness).toBeCloseTo(0.15, 3);
  });

  it("accepts the spellings a model returns and records what it had to assume", () => {
    expect(normaliseBlockSize("9-inch")).toBe("9inch");
    expect(normaliseBlockSize('6"')).toBe("6inch");

    const loose = build({ detected_roof_type: "Hip Roof" });
    expect(loose.input.roof_type).toBe("hip");

    const unknown = build({ detected_roof_type: "attic truss" });
    expect(unknown.input.roof_type).toBe("gable");
    expect(unknown.notes.join(" ")).toMatch(
      /not recognised, so the engine's gable roof was used/i,
    );
  });

  it("refuses to invent the facade it could not see", () => {
    const result = buildEstimateInput(
      analysis({ estimated_width: null }),
      "Test",
      "Nigeria",
      "2026-11-07",
    );
    // A width derived from a building-type ratio priced a shape nobody saw.
    expect(result.input).toBeNull();
    expect(result.refusal).toMatch(/measurable width/i);
    expect(result.needsConfirmation).toContain("estimated_width");
    // The reading it did get is handed back for the form.
    // The fixture reports a 15 m frontage and no depth.
    expect(result.measurements.building_length_m).toBe(15);
    expect(result.measurements.building_width_m).toBeNull();
  });

  it("refuses to price a photo with no usable dimension", () => {
    const result = buildEstimateInput(
      analysis({ estimated_length: null, estimated_width: null }),
      "Test",
      "Nigeria",
    );
    expect(result.input).toBeNull();
    expect(result.refusal).toMatch(/did not show a measurable length or width/i);
  });

  it("deducts no openings rather than inventing them by floor area", () => {
    const result = build({ detected_openings: [] });
    // One door per 20 m2 and one window per 15 m2 were inventions dressed as
    // detections. Nothing is deducted now, and the field asks to be confirmed.
    expect(result.input.openings).toEqual([]);
    const flagged = buildEstimateInput(
      analysis({ detected_openings: [] }),
      "Test",
      "Nigeria",
      "2026-11-07",
    );
    expect(flagged.needsConfirmation).toContain("detected_openings");
    expect(flagged.fieldSources.openings).toBe("default");
    expect(flagged.notes.join(" ")).toMatch(/no openings were identified/i);
  });

  it("labels a corrected pitch as a default, not a reading", () => {
    const flat = build({
      detected_roof_type: "flat",
      estimated_roof_pitch: 25,
    });
    expect(flat.input.roof_pitch_degrees).toBe(5);
    expect(flat.notes.join(" ")).toMatch(/outside the range for a flat roof/i);
    expect(flat.fieldSources.roof_pitch_degrees).toBe("default");
    expect(flat.needsConfirmation).toContain("estimated_roof_pitch");
  });

  it("marks every measurement as measured and every default as default", () => {
    const result = build();
    expect(result.fieldSources.building_length).toBe("measured");
    expect(result.fieldSources.building_width).toBe("measured");
    expect(result.fieldSources.openings).toBe("measured");
    expect(result.fieldSources.roof_pitch_degrees).toBe("measured");
    expect(result.fieldSources.internal_wall_length).toBe("measured");
    expect(result.needsConfirmation).toEqual([]);
  });

  it("clamps openings to plausible sizes and drops entries with no count", () => {
    const result = build({
      detected_openings: [
        {
          type: "door",
          estimated_width: 12,
          estimated_height: 9,
          estimated_count: 2,
        },
        {
          type: "window",
          estimated_width: 1.2,
          estimated_height: 1.2,
          estimated_count: 0,
        },
      ],
    });
    const door = result.input.openings.find((o) => o.type === "door");
    expect(door?.width).toBe(2.4);
    expect(door?.height).toBe(3);
    expect(result.input.openings).toHaveLength(1);
    expect(result.notes.join(" ")).toMatch(/had no usable count/i);
  });

  it("produces input the engine accepts without changes", () => {
    const result = build();
    expect(validateBuildToRoofInput(result.input)).toEqual([]);
  });
});

describe("parseVisionJson", () => {
  it("reads JSON out of a markdown fence or a sentence", () => {
    expect(parseVisionJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(
      parseVisionJson('Here is the analysis: {"a":2} hope that helps'),
    ).toEqual({ a: 2 });
    expect(() => parseVisionJson("no json here")).toThrow(/readable JSON/i);
  });
});

describe("engine enum guard", () => {
  it("rejects an unrecognised roof type instead of silently pricing another one", () => {
    const result = build();
    const errors = validateBuildToRoofInput({
      ...result.input,
      roof_type: "hip roof" as never,
    });
    expect(errors.join(" ")).toMatch(/Roof type "hip roof" is not recognised/i);
  });
});
