import { describe, it, expect } from "vitest";
import {
  normalizeIntent,
  DICTIONARY_TOOLS,
} from "@/lib/construction-dictionary/intent-normalizer";

describe("normalizeIntent", () => {
  it("routes paint questions to the paint calculator engine", () => {
    const r = normalizeIntent("how much paint do I need for 2 coats?", "en");
    expect(r.intent).toBe("calculate_material");
    expect(r.tool).toBe("paint_calculator");
    expect(r.engine_key).toBe(DICTIONARY_TOOLS.paint_calculator.engine_key);
  });
  it("extracts protected measurements from the message", () => {
    const r = normalizeIntent("how much paint for 12 sqm wall?", "en");
    expect(r.measurements.length).toBeGreaterThan(0);
    expect(r.measurements[0].value).toBe(12);
  });
  it("falls back to general_question for unrelated text", () => {
    const r = normalizeIntent("what is the weather like today", "en");
    expect(r.intent).toBe("general_question");
    expect(r.tool).toBeNull();
    expect(r.engine_key).toBeNull();
  });
  it("every dictionary tool has an engine key and route", () => {
    for (const [tool, def] of Object.entries(DICTIONARY_TOOLS)) {
      expect(def.engine_key).toBeTruthy();
      expect(def.surface).toMatch(/^\//);
      expect(tool).toMatch(/_calculator$/);
    }
  });
});
