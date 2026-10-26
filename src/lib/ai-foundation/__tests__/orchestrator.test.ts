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
      wasteMargin: 0,
    });
    const raw = outcome.result?.raw as typeof manual | undefined;
    expect(raw?.paintableArea).toBe(manual.paintableArea);
    expect(raw?.totalRecommendedLiters).toBe(manual.totalRecommendedLiters);
    expect(raw?.recommendedContainers).toEqual(manual.recommendedContainers);
  });
});

describe("market-aware unitless dimension interpretation (globalization audit)", () => {
  // A bare "12 by 12" is ambiguous: NG rooms are spoken in feet,
  // metric markets speak metres. Before this fix the copilot
  // silently read metres for everyone - a 10x area inflation for
  // NG paint requests (12x12m ≈ 3-4 x 20L drums for a small room).
  const NG_MARKET = {
    marketCode: "NG",
    measurementSystem: "mixed" as const,
    defaultLengthUnit: "meters" as const,
  };
  const METRIC_MARKET = {
    marketCode: "FR",
    measurementSystem: "metric" as const,
    defaultLengthUnit: "meters" as const,
  };

  it("assumes feet for unitless paint dims in the NG market", () => {
    const result = interpretRequest(
      "how much paint do I need for a 12 by 12 room",
      new Date().toISOString(),
      NG_MARKET,
    );
    expect(result.taskType).toBe("painting_materials");
    const length = result.facts.find((f) => f.key === "length");
    const width = result.facts.find((f) => f.key === "width");
    expect(length?.value).toBeCloseTo(3.66, 1); // 12 ft in metres
    expect(width?.value).toBeCloseTo(3.66, 1);
    expect(length?.evidence).toContain("feet");
    expect(length?.evidence).toContain("assumed");
  });

  it("assumes metres for unitless paint dims in a metric market", () => {
    const result = interpretRequest(
      "how much paint do I need for a 12 by 12 room",
      new Date().toISOString(),
      METRIC_MARKET,
    );
    expect(result.facts.find((f) => f.key === "length")?.value).toBe(12);
  });

  it("keeps explicit feet regardless of market", () => {
    const result = interpretRequest(
      "how much paint for a 12ft by 12ft room",
      new Date().toISOString(),
      METRIC_MARKET,
    );
    expect(result.facts.find((f) => f.key === "length")?.value).toBeCloseTo(
      3.66,
      1,
    );
  });

  it("keeps explicit metres regardless of market", () => {
    const result = interpretRequest(
      "how much paint for a 12m by 12m room",
      new Date().toISOString(),
      NG_MARKET,
    );
    expect(result.facts.find((f) => f.key === "length")?.value).toBe(12);
  });

  it("without a market hint, preserves the legacy metres reading", () => {
    const result = interpretRequest("paint estimate for a 12 by 12 room");
    expect(result.facts.find((f) => f.key === "length")?.value).toBe(12);
  });

  it("assumes metres for unitless building dims in NG (build-to-roof page convention)", () => {
    const result = interpretRequest(
      "estimate a 12 by 12 bungalow",
      new Date().toISOString(),
      NG_MARKET,
    );
    expect(result.taskType).toBe("building_estimate");
    expect(result.facts.find((f) => f.key === "building_length")?.value).toBe(
      12,
    );
  });

  it("assumes metres for unitless tile dims in NG (tile page convention)", () => {
    const result = interpretRequest(
      "how many tiles for a 12 by 12 room",
      new Date().toISOString(),
      NG_MARKET,
    );
    expect(result.taskType).toBe("tile_estimate");
    expect(result.facts.find((f) => f.key === "length")?.value).toBe(12);
  });
});
