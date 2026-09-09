// Tests for the AI Construction Document & Image Extraction Layer:
// extraction → validation → user confirmation → Build-to-Roof engine data.
// The deterministic engine is never called here; we verify that ONLY
// user-confirmed, in-range values reach the engine input patch.

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildEnginePatch,
  confidenceBand,
  confidencePercent,
  initialDecisions,
  missingRequiredFields,
  requestConstructionExtraction,
  ConstructionExtractionError,
  type ExtractionField,
  type FieldDecisions,
} from "@/lib/construction-extraction";
import type { OpeningInput } from "@/types/build-to-roof";

// ── Mocks ──

const mockInvoke = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}));
vi.mock("@/lib/errorMonitor", () => ({ captureAiError: vi.fn() }));

function field(
  key: string,
  value: number | string,
  overrides: Partial<ExtractionField> = {},
): ExtractionField {
  return {
    key,
    label: key.replace(/_/g, " "),
    value,
    unit: typeof value === "number" ? "m" : "",
    confidence: 0.95,
    verification: "ai_detected",
    source: "dimension_annotation",
    ...overrides,
  };
}

const DEFAULT_OPENINGS: OpeningInput[] = [
  { type: "door", width: 0.9, height: 2.1, count: 4 },
  { type: "window", width: 1.2, height: 1.2, count: 6 },
];

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Confidence helpers ──

describe("confidence helpers", () => {
  it("bands confidence values correctly", () => {
    expect(confidenceBand(0.96)).toBe("high");
    expect(confidenceBand(0.75)).toBe("medium");
    expect(confidenceBand(0.4)).toBe("low");
  });
  it("converts confidence to a whole percent", () => {
    expect(confidencePercent(0.955)).toBe(96);
    expect(confidencePercent(0.4)).toBe(40);
  });
});

// ── Initial decisions ──

describe("initialDecisions", () => {
  it("auto-accepts only ai_detected fields", () => {
    const decisions = initialDecisions([
      field("building_length", 18.2, { verification: "ai_detected" }),
      field("roof_pitch_degrees", 30, {
        verification: "requires_confirmation",
      }),
    ]);
    expect(decisions["building_length"]).toBe("accepted");
    expect(decisions["roof_pitch_degrees"]).toBe("pending");
  });
});

// ── Engine patch (the critical data flow) ──

describe("buildEnginePatch", () => {
  it("applies accepted fields into the engine input patch", () => {
    const fields = [
      field("building_length", 18.2),
      field("building_width", 11.0),
      field("roof_type", "hip", { unit: "", verification: "ai_detected" }),
    ];
    const { patch, appliedFields } = buildEnginePatch(
      fields,
      initialDecisions(fields),
      {},
      "plan.pdf",
      DEFAULT_OPENINGS,
    );
    expect(patch.building_length).toBe(18.2);
    expect(patch.building_width).toBe(11.0);
    expect(patch.roof_type).toBe("hip");
    expect(appliedFields).toContain("building_length");
    expect(appliedFields).toContain("roof_type");
  });

  it("NEVER applies pending or rejected values", () => {
    const fields = [
      field("building_length", 18.2),
      field("building_width", 11.0),
    ];
    const decisions: FieldDecisions = {
      building_length: "pending",
      building_width: "rejected",
    };
    const { patch, appliedFields } = buildEnginePatch(
      fields,
      decisions,
      {},
      "plan.pdf",
      DEFAULT_OPENINGS,
    );
    expect(patch.building_length).toBeUndefined();
    expect(patch.building_width).toBeUndefined();
    expect(appliedFields).toHaveLength(0);
  });

  it("uses edited values over AI values", () => {
    const fields = [field("building_length", 18.2)];
    const { patch } = buildEnginePatch(
      fields,
      { building_length: "edited" },
      { building_length: 20.5 },
      "plan.pdf",
      DEFAULT_OPENINGS,
    );
    expect(patch.building_length).toBe(20.5);
  });

  it("skips out-of-range values instead of applying them", () => {
    const fields = [
      field("building_length", 99999), // beyond max 300
      field("roof_pitch_degrees", -5), // below min 0
      field("building_type", "skyscraper", { unit: "" }), // not a valid enum
    ];
    const decisions: FieldDecisions = {
      building_length: "accepted",
      roof_pitch_degrees: "accepted",
      building_type: "accepted",
    };
    const { patch, skippedFields } = buildEnginePatch(
      fields,
      decisions,
      {},
      "plan.pdf",
      DEFAULT_OPENINGS,
    );
    expect(patch.building_length).toBeUndefined();
    expect(patch.roof_pitch_degrees).toBeUndefined();
    expect(patch.building_type).toBeUndefined();
    expect(skippedFields).toHaveLength(3);
  });

  it("ignores informational fields (engine derives them itself)", () => {
    const fields = [
      field("perimeter", 58.4),
      field("floor_area", 200.2),
      field("room_count", 5),
    ];
    const decisions: FieldDecisions = {
      perimeter: "accepted",
      floor_area: "accepted",
      room_count: "accepted",
    };
    const { patch } = buildEnginePatch(
      fields,
      decisions,
      {},
      "plan.pdf",
      DEFAULT_OPENINGS,
    );
    expect(patch).not.toHaveProperty("perimeter");
    expect(patch).not.toHaveProperty("floor_area");
    expect(patch).not.toHaveProperty("room_count");
  });

  it("maps confirmed door/window counts into the openings structure", () => {
    const fields = [
      field("doors_count", 7),
      field("door_width", 0.9),
      field("door_height", 2.1),
      field("windows_count", 12),
      field("window_width", 1.2),
      field("window_height", 1.5),
    ];
    const decisions = initialDecisions(fields);
    const { patch } = buildEnginePatch(
      fields,
      decisions,
      {},
      "plan.pdf",
      DEFAULT_OPENINGS,
    );
    expect(patch.openings).toEqual([
      { type: "door", width: 0.9, height: 2.1, count: 7 },
      { type: "window", width: 1.2, height: 1.5, count: 12 },
    ]);
  });

  it("keeps existing openings when the AI found none", () => {
    const fields = [field("building_length", 18.2)];
    const { patch } = buildEnginePatch(
      fields,
      initialDecisions(fields),
      {},
      "plan.pdf",
      DEFAULT_OPENINGS,
    );
    expect(patch.openings).toBeUndefined(); // untouched
  });

  it("produces drawing_analysis meta that feeds the engine confidence", () => {
    const fields = [
      field("building_length", 18.2),
      field("building_width", 11.0),
    ];
    const { drawingAnalysis } = buildEnginePatch(
      fields,
      initialDecisions(fields),
      {},
      "plan.pdf",
      DEFAULT_OPENINGS,
    );
    expect(drawingAnalysis.file_name).toBe("plan.pdf");
    expect(drawingAnalysis.confirmed.building_length).toBe(18.2);
    expect(drawingAnalysis.confirmed.building_width).toBe(11.0);
    expect(drawingAnalysis.detected.building_length).toBe(18.2);
  });

  it("rounds long values to millimetre precision", () => {
    const fields = [field("building_length", 18.23456789)];
    const { patch } = buildEnginePatch(
      fields,
      initialDecisions(fields),
      {},
      "plan.pdf",
      DEFAULT_OPENINGS,
    );
    expect(patch.building_length).toBe(18.235);
  });
});

// ── Missing required fields ──

describe("missingRequiredFields", () => {
  it("lists engine-critical fields the AI did not detect", () => {
    const fields = [
      field("building_length", 18.2),
      field("roof_type", "hip", { unit: "" }),
    ];
    const missing = missingRequiredFields(fields, initialDecisions(fields));
    expect(missing).toContain("building_width");
    expect(missing).toContain("number_of_floors");
    expect(missing).not.toContain("building_length");
  });
  it("treats rejected fields as missing", () => {
    const fields = [field("building_length", 18.2)];
    const missing = missingRequiredFields(fields, {
      building_length: "rejected",
    });
    expect(missing).toContain("building_length");
  });
});

// ── Request + fallback behaviour ──

describe("requestConstructionExtraction", () => {
  it("returns sanitized result data on success", async () => {
    mockInvoke.mockResolvedValue({
      data: {
        documentKind: "architectural_plan",
        fields: [field("building_length", 18.2)],
        notes: [],
        warnings: [],
        processedAt: "2026-09-05T00:00:00Z",
      },
    });
    const result = await requestConstructionExtraction({
      documentKind: "architectural_plan",
      documentDataUrl: "data:image/jpeg;base64,abc",
    });
    expect(result.fields[0].key).toBe("building_length");
  });

  it("throws a friendly error when the function is not deployed (manual fallback)", async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: new Error("fetch failed"),
    });
    await expect(
      requestConstructionExtraction({ documentKind: "architectural_plan" }),
    ).rejects.toThrow(ConstructionExtractionError);
  });

  it("throws with AI_DISABLED and a manual-fallback message when disabled", async () => {
    mockInvoke.mockResolvedValue({
      data: {
        error: "AI extraction is currently disabled.",
        code: "AI_DISABLED",
      },
    });
    const err = await requestConstructionExtraction({
      documentKind: "architectural_plan",
    }).catch((e) => e);
    expect(err).toBeInstanceOf(ConstructionExtractionError);
    expect(err.code).toBe("AI_DISABLED");
    expect(err.message).toContain("manually");
  });

  it("rejects malformed AI responses (no fields array)", async () => {
    mockInvoke.mockResolvedValue({
      data: { documentKind: "architectural_plan" },
    });
    await expect(
      requestConstructionExtraction({ documentKind: "architectural_plan" }),
    ).rejects.toThrow(ConstructionExtractionError);
  });
});
