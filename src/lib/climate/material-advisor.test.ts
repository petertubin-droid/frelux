import { describe, expect, it } from "vitest";
import { ADVISOR_DISCLOSURES, buildAdvisor } from "./material-advisor";
import { deriveEnvironmentalFactors } from "./climate-factors";
import type { ClimateNormals, EnvironmentalFactors } from "./types";

const COASTAL_HUMID: ClimateNormals = {
  tempMeanC: 27.2,
  tempMinC: 22.1,
  tempMaxC: 33.4,
  humidityPct: 86,
  precipMmPerDay: 4.4,
  uvIndex: 1.8,
  frostDaysPerYear: 0,
  windMs: 2.4,
};

const COLD_CONTINENTAL: ClimateNormals = {
  tempMeanC: 6.1,
  tempMinC: -4.2,
  tempMaxC: 18.3,
  humidityPct: 78,
  precipMmPerDay: 1.6,
  uvIndex: 0.7,
  frostDaysPerYear: 95,
  windMs: 3.6,
};

const DRY_INLAND: ClimateNormals = {
  tempMeanC: 27.9,
  tempMinC: 18.2,
  tempMaxC: 41,
  humidityPct: 24,
  precipMmPerDay: 0.09,
  uvIndex: 1.87,
  frostDaysPerYear: 0,
  windMs: 3.2,
};

function factorsFor(
  point: { lat: number; lon: number },
  normals: ClimateNormals,
  elevationM: number | null = 15,
): EnvironmentalFactors {
  return deriveEnvironmentalFactors({
    point,
    normals,
    elevationM,
    sources: [],
  });
}

const LAGOS = factorsFor({ lat: 6.455, lon: 3.395 }, COASTAL_HUMID, 8);
const RURAL_INLAND = factorsFor({ lat: 12.0, lon: 8.59 }, COASTAL_HUMID, 480);
const NORTHERN_WINTER = factorsFor(
  { lat: 60.17, lon: 24.94 },
  COLD_CONTINENTAL,
  30,
);
const DESERT = factorsFor({ lat: 24.71, lon: 46.68 }, DRY_INLAND, 620);

const byId = (
  list: ReturnType<typeof buildAdvisor>["categories"],
  id: string,
) => list.find((entry) => entry.id === id)!;

describe("advisor output shape", () => {
  it("always covers the eight required material groups", () => {
    const advisor = buildAdvisor(LAGOS);
    expect(advisor.categories.map((c) => c.id)).toEqual([
      "exterior-paint",
      "waterproofing",
      "roofing",
      "flooring-tiles",
      "concrete-exposure",
      "steel-coatings",
      "insulation",
      "drainage",
    ]);
  });

  it("labels climate-derived advice as climate-matched and lists its drivers", () => {
    const advisor = buildAdvisor(LAGOS);
    expect(advisor.confidence).toBe("climate-matched");
    expect(advisor.drivers.some((d) => /rainfall/i.test(d))).toBe(true);
    for (const category of advisor.categories) {
      expect(category.confidence).toBe("climate-matched");
      expect(category.properties.length).toBeGreaterThan(0);
      expect(category.standards.length).toBeGreaterThan(0);
    }
  });
});

describe("climate-matched rules", () => {
  it("drives coastal salt protection from a coast-adjacent site", () => {
    const roofing = byId(buildAdvisor(LAGOS).categories, "roofing");
    const text = [...roofing.properties, ...roofing.why]
      .join(" ")
      .toLowerCase();
    expect(text).toContain("marine-grade");
    expect(text).toContain("chlorid");
  });

  it("does not add salt advice for an inland site with the same climate", () => {
    const roofing = byId(buildAdvisor(RURAL_INLAND).categories, "roofing");
    const text = [...roofing.properties, ...roofing.why]
      .join(" ")
      .toLowerCase();
    expect(text).not.toContain("marine-grade");
  });

  it("elevates the steel protection category with coastal corrosivity", () => {
    const lagos = byId(buildAdvisor(LAGOS).categories, "steel-coatings");
    const dryInland = byId(buildAdvisor(DESERT).categories, "steel-coatings");
    expect(lagos.summary).toMatch(/C5/);
    // Warm but dry and far inland: moderate category, never the marine one.
    expect(dryInland.summary).toMatch(/C3/);
    expect(dryInland.summary).not.toMatch(/C5/);
  });

  it("adds freeze-thaw and snow guidance for a cold continental site", () => {
    const advisor = buildAdvisor(NORTHERN_WINTER);
    const tiles = byId(advisor.categories, "flooring-tiles");
    const roofing = byId(advisor.categories, "roofing");
    const concrete = byId(advisor.categories, "concrete-exposure");
    expect([...tiles.properties, ...tiles.why].join(" ")).toMatch(/frost/i);
    expect([...roofing.properties, ...roofing.why].join(" ")).toMatch(/snow/i);
    expect([...concrete.why, ...concrete.properties].join(" ")).toMatch(
      /XF1|freeze-thaw/i,
    );
  });

  it("refuses to gate snow on summertime minima of a hot site", () => {
    const roofing = byId(buildAdvisor(LAGOS).categories, "roofing");
    expect(roofing.properties.join(" ")).not.toMatch(/snow-retention/i);
  });

  it("adds reflective/radiant guidance for a hot dry site and no rain advice", () => {
    const advisor = buildAdvisor(DESERT);
    const insulation = byId(advisor.categories, "insulation");
    const waterproofing = byId(advisor.categories, "waterproofing");
    expect([...insulation.properties, ...insulation.why].join(" ")).toMatch(
      /reflect/i,
    );
    expect(waterproofing.properties.join(" ")).not.toMatch(
      /High-performance membrane/,
    );
  });

  it("indicates chloride concrete exposure at the coast", () => {
    const concrete = byId(buildAdvisor(LAGOS).categories, "concrete-exposure");
    const text = [...concrete.properties, ...concrete.why].join(" ");
    expect(text).toMatch(/XS1/);
    expect(text).toMatch(/ACI 318/);
  });

  it("always states that flood exposure is not assessed", () => {
    const advisor = buildAdvisor(LAGOS);
    expect(advisor.missing).toContain("flood_map");
    const text = advisor.categories
      .flatMap((c) => [...c.risks, ...c.why, ...c.properties])
      .join(" ");
    expect(text).toMatch(/not assessed/i);
  });

  it("never claims certification or code compliance for a product", () => {
    const advisor = buildAdvisor(LAGOS);
    const text = advisor.categories
      .flatMap((c) => [
        c.summary,
        ...c.properties,
        ...c.why,
        ...c.risks,
        ...c.standards.map((s) => `${s.code} ${s.name} ${s.applies}`),
        ...c.installation,
      ])
      .join(" ");
    expect(text).not.toMatch(
      /certified|certification|certificate|approved product|code[- ]compliant/i,
    );
    expect(text).not.toMatch(/guarantee/i);
  });

  it("keeps standards as frameworks with confirmation caveats", () => {
    const advisor = buildAdvisor(LAGOS);
    for (const category of advisor.categories) {
      for (const standard of category.standards) {
        expect(standard.code.length).toBeGreaterThan(1);
        expect(standard.applies).toMatch(
          /Framework|Reference|caveat|confirm|approval|measurement|classification|guidance|Ask suppliers|test/i,
        );
      }
    }
  });

  it("carries the safety disclosures on every result", () => {
    const advisor = buildAdvisor(LAGOS);
    expect(advisor.disclosures).toEqual(ADVISOR_DISCLOSURES);
    expect(advisor.disclosures.join(" ")).toMatch(
      /not a structural engineering assessment/i,
    );
    expect(advisor.disclosures.join(" ")).toMatch(/No product certification/i);
  });
});

describe("unavailable-data mode", () => {
  it("returns general guidance, clearly labelled, with all eight groups", () => {
    const advisor = buildAdvisor(null);
    expect(advisor.confidence).toBe("general");
    expect(advisor.categories).toHaveLength(8);
    for (const category of advisor.categories) {
      expect(category.confidence).toBe("general");
      expect(category.why.join(" ")).toMatch(/no environmental data/i);
    }
    expect(advisor.disclosures).toEqual(ADVISOR_DISCLOSURES);
    expect(advisor.missing).toContain("climate_normals");
  });
});
