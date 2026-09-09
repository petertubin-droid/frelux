import { describe, it, expect } from "vitest";
import { interpretRequest, planTask, runTask } from "../orchestrator";
import type { FreluxContext } from "../types";

const context: FreluxContext = {
  userId: "user-1",
  project: null,
  location: null,
  calculations: [],
  marketDataAvailable: false,
};

describe("deterministic interpretation (no API call)", () => {
  it("extracts the flagship request: 4-bedroom house estimate", () => {
    const result = interpretRequest(
      "I want to estimate the materials and cost for this 4-bedroom house",
    );
    expect(result.taskType).toBe("building_estimate");
    expect(result.interpretedBy).toBe("deterministic");
    const bedrooms = result.facts.find((f) => f.key === "bedrooms");
    expect(bedrooms?.value).toBe(4);
    expect(bedrooms?.origin).toBe("user_input");
  });

  it("extracts stated dimensions in metres", () => {
    const result = interpretRequest("Estimate a 4-bedroom duplex, 15m by 12m");
    expect(result.facts.find((f) => f.key === "building_length")?.value).toBe(
      15,
    );
    expect(result.facts.find((f) => f.key === "building_width")?.value).toBe(
      12,
    );
    expect(result.facts.find((f) => f.key === "number_of_floors")?.value).toBe(
      2,
    );
  });

  it("converts feet to metres and records the conversion as evidence", () => {
    const result = interpretRequest("estimate a house 50ft x 30ft");
    const length = result.facts.find((f) => f.key === "building_length");
    expect(length?.value).toBeCloseTo(15.24, 2);
    expect(length?.evidence).toContain("converted from ft");
  });

  it("classifies painting, POP, tile, screeding and tyrolene requests", () => {
    // Phase 2: "how much paint" asks for the full materials list (litres +
    // containers), the manual calculator methodology, never m²-only.
    expect(interpretRequest("how much paint for my room").taskType).toBe(
      "painting_materials",
    );
    // Plain area phrasing still routes to the area engine.
    expect(interpretRequest("paintable wall area for my room").taskType).toBe(
      "painting_estimate",
    );
    expect(
      interpretRequest("tyrolene estimate for my partitions").taskType,
    ).toBe("tyrolene_estimate");
  });

  it("only extracts what the user said, never invents values", () => {
    const result = interpretRequest("estimate my house");
    expect(result.facts).toHaveLength(0);
  });
});

describe("planning", () => {
  it("plans a full building estimate with defaults as assumptions (no unnecessary questions)", () => {
    const interp = interpretRequest(
      "estimate materials and cost for a 4-bedroom bungalow",
    );
    const plan = planTask(interp.taskType, context, interp.facts);
    expect(plan.engineId).toBe("build_to_roof");
    expect(plan.steps.map((s) => s.kind)).toEqual([
      "resolve_context",
      "run_engine",
      "present_result",
      "ask_confirmation",
    ]);
  });

  it("asks only for genuinely missing info on tasks without defaults", () => {
    const interp = interpretRequest("how much paint for my room");
    const plan = planTask(interp.taskType, context, interp.facts);
    const missingStep = plan.steps.find(
      (s) => s.kind === "request_missing_info",
    );
    expect(missingStep?.missingFields?.map((f) => f.key)).toContain("length");
  });

  it("REFUSES unsupported requests instead of guessing", () => {
    const plan = planTask("unsupported", context, []);
    expect(plan.steps[0].kind).toBe("refuse");
    expect(plan.reason).toBeDefined();
    expect(plan.engineId).toBeNull();
  });

  it("refuses finish_compare (config-backed, future phase) honestly", () => {
    const plan = planTask("finish_compare", context, []);
    expect(plan.steps[0].kind).toBe("refuse");
  });
});

describe("end-to-end execution", () => {
  it("runs the authoritative Build-to-Roof engine for the flagship request", async () => {
    const interp = interpretRequest(
      "estimate a 4-bedroom bungalow, 15m by 12m",
    );
    const outcome = await runTask(interp.taskType, context, interp.facts);
    expect(outcome.refusal).toBeUndefined();
    expect(outcome.result?.ok).toBe(true);
    expect(outcome.result?.costs?.total).toBeGreaterThan(0);
    expect(outcome.assumptions?.length).toBeGreaterThan(0); // defaults visible
  });

  it("refuses to run when required info is genuinely missing", async () => {
    const interp = interpretRequest("how much paint for my room");
    const outcome = await runTask(interp.taskType, context, interp.facts);
    expect(outcome.refusal).toBeDefined();
    expect(outcome.refusal).toContain("missing");
    expect(outcome.result).toBeUndefined();
  });

  it("accepts user-supplied missing values as trusted facts (Phase 2: full materials parity)", async () => {
    const interp = interpretRequest("how much paint for my room");
    const outcome = await runTask(interp.taskType, context, [
      ...interp.facts,
      {
        key: "length",
        label: "Room length",
        value: 6,
        unit: "m",
        origin: "user_input",
        source: "form",
        confidence: 1,
        trust: "user_confirmed",
      },
      {
        key: "width",
        label: "Room width",
        value: 5,
        unit: "m",
        origin: "user_input",
        source: "form",
        confidence: 1,
        trust: "user_confirmed",
      },
      {
        key: "wallHeight",
        label: "Wall height",
        value: 3,
        unit: "m",
        origin: "user_input",
        source: "form",
        confidence: 1,
        trust: "user_confirmed",
      },
    ]);
    expect(outcome.refusal).toBeUndefined();
    expect(outcome.result?.ok).toBe(true);
    // PARITY: the Copilot result must equal the manual painting calculator
    // invoked directly with the same room + surfaced default assumptions.
    const { calculatePaint, DEFAULT_DOOR_DIMS, DEFAULT_WINDOW_DIMS } =
      await import("@/lib/calc");
    const manual = calculatePaint({
      projectType: "room" as never,
      length: 6,
      width: 5,
      wallHeight: 3,
      doors: 1,
      doorDims: DEFAULT_DOOR_DIMS,
      windows: 2,
      windowDims: DEFAULT_WINDOW_DIMS,
      coats: 2,
      paintType: "standard",
      unit: "meters" as never,
      includeCeiling: true,
      wasteMargin: 10,
    });
    const raw = outcome.result?.raw as typeof manual | undefined;
    expect(raw?.paintableArea).toBe(manual.paintableArea);
    expect(raw?.totalRecommendedLiters).toBe(manual.totalRecommendedLiters);
    expect(raw?.recommendedContainers).toEqual(manual.recommendedContainers);
  });
});
