import { describe, it, expect } from "vitest";
import {
  resolveTemplateRoomUnit,
  convertTemplateInputForUnit,
  convertTemplateInputForMarket,
  describeTemplateForMarket,
  templateDimsSentence,
  templateSummaryForMarket,
} from "@/lib/templates-global";
import { FALLBACK_TEMPLATES } from "@/lib/template-data";
import { BUILTIN_MARKET_PROFILES } from "@/lib/international/market-context";
import { COUNTRY_OPTIONS } from "@/lib/international/countries";
import type { DbCalculatorTemplate } from "@/types/database";
import type { MarketProfile } from "@/types/international";

/** Build a market-view context from a builtin profile, without React. */
function ctx(code: string): { marketCode: string } & Partial<MarketProfile> {
  const p = BUILTIN_MARKET_PROFILES.find((m) => m.country_code === code);
  if (!p) throw new Error(`no profile for ${code}`);
  return {
    marketCode: p.country_code,
    measurementSystem: p.default_measurement_system,
    defaultLengthUnit: p.default_length_unit,
  } as { marketCode: string } & Partial<MarketProfile>;
}

const paint = FALLBACK_TEMPLATES.find((t) => t.id === "fb-paint-1")!;
const tile = FALLBACK_TEMPLATES.find((t) => t.calculator_type === "tile")!;

describe("market coverage", () => {
  it("every website country option resolves to a builtin market profile", () => {
    const codes = COUNTRY_OPTIONS.flatMap((g) =>
      g.countries.map((c) => c.code),
    );
    expect(codes.length).toBeGreaterThanOrEqual(32);
    for (const code of codes) {
      const profile = BUILTIN_MARKET_PROFILES.find(
        (p) => p.country_code === code,
      );
      expect(profile, `missing market profile for ${code}`).toBeDefined();
    }
  });
});

describe("resolveTemplateRoomUnit", () => {
  it("keeps NG on meters (legacy template default)", () => {
    expect(resolveTemplateRoomUnit(ctx("NG"))).toBe("meters");
  });
  it("gives imperial markets feet", () => {
    expect(resolveTemplateRoomUnit(ctx("US"))).toBe("feet");
    expect(resolveTemplateRoomUnit(ctx("CA"))).toBe("feet");
    // GB is deliberately metric on this platform (UK construction
    // practice) and AU metric — both keep meters.
    expect(resolveTemplateRoomUnit(ctx("GB"))).toBe("meters");
    expect(resolveTemplateRoomUnit(ctx("AU"))).toBe("meters");
  });
  it("gives metric markets meters, including the 12 globalization markets", () => {
    for (const code of [
      "DE",
      "FR",
      "ET",
      "EG",
      "TZ",
      "CI",
      "ES",
      "NL",
      "PL",
      "SE",
      "CH",
      "SG",
      "TR",
      "NZ",
      "KE",
      "GH",
    ]) {
      expect(resolveTemplateRoomUnit(ctx(code))).toBe("meters");
    }
  });
  it("falls back to meters for an unresolved market", () => {
    expect(resolveTemplateRoomUnit({})).toBe("meters");
  });
});

describe("convertTemplateInputForUnit", () => {
  it("converts canonical metric paint dims to feet (4×5×3 m → 13.1×16.4×9.8 ft)", () => {
    const out = convertTemplateInputForUnit(
      paint.input_data as Record<string, unknown>,
      "feet",
    ) as Record<string, number>;
    expect(out.length).toBeCloseTo(13.1, 1);
    expect(out.width).toBeCloseTo(16.4, 1);
    expect(out.wallHeight).toBeCloseTo(9.8, 1);
    expect(out.unit).toBe("feet");
    // Non-dimension fields pass through untouched.
    expect(out.coats).toBe(2);
    expect(out.doors).toBe(1);
  });
  it("does not mutate the stored template", () => {
    const before = JSON.stringify(paint.input_data);
    convertTemplateInputForUnit(
      paint.input_data as Record<string, unknown>,
      "feet",
    );
    expect(JSON.stringify(paint.input_data)).toBe(before);
  });
  it("round-trips meters → feet → meters within display tolerance", () => {
    const ft = convertTemplateInputForUnit(
      paint.input_data as Record<string, unknown>,
      "feet",
    );
    const back = convertTemplateInputForUnit(ft, "meters") as Record<
      string,
      number
    >;
    expect(back.length).toBeCloseTo(4, 1);
    expect(back.width).toBeCloseTo(5, 1);
    expect(back.wallHeight).toBeCloseTo(3, 1);
  });
  it("converts tile/screeding/pop room fields too", () => {
    const screed = FALLBACK_TEMPLATES.find(
      (t) => t.calculator_type === "screeding",
    )!;
    const out = convertTemplateInputForUnit(
      screed.input_data as Record<string, unknown>,
      "feet",
    ) as Record<string, number>;
    expect(out.roomLength).toBeGreaterThan(3);
    expect(out.unit).toBe("feet");
  });
  it("is a no-op when already in the target unit", () => {
    const out = convertTemplateInputForUnit(
      tile.input_data as Record<string, unknown>,
      "meters",
    );
    expect(out).toEqual(tile.input_data as Record<string, unknown>);
  });
});

describe("describeTemplateForMarket", () => {
  it("keeps the Nigerian qualifier for NG visitors", () => {
    const d = describeTemplateForMarket(paint, ctx("NG"));
    expect(d).toMatch(/Nigerian living room/);
    expect(d).toMatch(/4 × 5 m/);
  });
  it("drops the Nigerian qualifier and shows feet for US visitors", () => {
    const d = describeTemplateForMarket(paint, ctx("US"));
    expect(d).not.toMatch(/Nigerian/);
    expect(d).toMatch(/13\.1 × 16\.4 ft/);
    expect(d).toMatch(/9\.8 ft ceiling/);
  });
});

describe("templateDimsSentence", () => {
  it("paint: dims, ceiling, coats, openings, waste", () => {
    const s = templateDimsSentence(paint, "meters");
    expect(s).toContain("4 × 5 m");
    expect(s).toContain("3 m ceiling");
    expect(s).toContain("2 coats");
    expect(s).toContain("1 door");
    expect(s).toContain("2 windows");
  });
  it("tile: includes tile size in mm (unit-agnostic)", () => {
    const s = templateDimsSentence(tile, "feet");
    expect(s).toContain("mm tiles");
  });
});

describe("templateSummaryForMarket", () => {
  it("labels paint dims in feet for US", () => {
    const items = templateSummaryForMarket(paint, ctx("US"));
    const len = items.find((i) => i.label === "Length")!;
    expect(len.value).toMatch(/ft$/);
    const height = items.find((i) => i.label === "Wall Height")!;
    expect(height.value).toMatch(/ft$/);
  });
  it("labels paint dims in meters for NG and ET", () => {
    for (const code of ["NG", "ET"]) {
      const items = templateSummaryForMarket(paint, ctx(code));
      const len = items.find((i) => i.label === "Length")!;
      expect(len.value).toMatch(/m$/);
    }
  });
});

describe("all 40 fallback templates globalize cleanly", () => {
  const markets = [
    "NG",
    "US",
    "GB",
    "DE",
    "ET",
    "EG",
    "TZ",
    "CI",
    "ES",
    "NL",
    "PL",
    "SE",
    "CH",
    "SG",
    "TR",
    "NZ",
    "KE",
    "ZA",
    "JP",
    "FR",
  ];
  it("every template produces a description, dims sentence, summary and converted input in every market", () => {
    expect(FALLBACK_TEMPLATES.length).toBeGreaterThanOrEqual(40);
    for (const t of FALLBACK_TEMPLATES) {
      for (const code of markets) {
        const m = ctx(code);
        const desc = describeTemplateForMarket(
          t as DbCalculatorTemplate,
          m as never,
        );
        expect(desc.length, `${t.id} desc in ${code}`).toBeGreaterThan(10);
        expect(
          templateDimsSentence(
            t as DbCalculatorTemplate,
            resolveTemplateRoomUnit(m as never),
          ),
        ).not.toBe("");
        expect(
          templateSummaryForMarket(t as DbCalculatorTemplate, m as never)
            .length,
        ).toBeGreaterThan(0);
        const converted = convertTemplateInputForMarket(
          t as DbCalculatorTemplate,
          m as never,
        );
        expect(converted.unit).toBe(resolveTemplateRoomUnit(m as never));
      }
    }
  });
});
