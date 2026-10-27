import { describe, expect, it } from "vitest";
import {
  ec3ResponseToOutcome,
  lookupEc3Epds,
  mergeEpdWithAdminFactors,
  normalizeEpd,
} from "../ec3-epd";

const ec3Epd = {
  id: "frelux-epd-1",
  name: "Ready-Mix Concrete C30/37",
  category: "concrete",
  declared_unit: { name: "m3" },
  embodied_carbon: { value: 320.5 },
  plant: "Lafarge Mississauga Plant",
  publisher: "NSF International",
  date_valid_until: "2028-06-30",
  verified: true,
  lc_modules: ["A1", "A2", "A3"],
};

describe("normalizeEpd", () => {
  it("normalizes an EC3-shaped EPD into a factor with full provenance", () => {
    const f = normalizeEpd(ec3Epd, "ready-mix concrete");
    expect(f).not.toBeNull();
    expect(f!.epd_id).toBe("frelux-epd-1");
    expect(f!.category).toBe("concrete");
    expect(f!.unit).toBe("m3");
    expect(f!.kg_co2e_per_unit).toBe(320.5);
    expect(f!.plant).toBe("Lafarge Mississauga Plant");
    expect(f!.verified).toBe(true);
    expect(f!.valid_until).toBe("2028-06-30");
    expect(f!.modules).toEqual(["A1", "A2", "A3"]);
    expect(f!.source_reference).toContain("EC3 EPD frelux-epd-1");
    expect(f!.source_reference).toContain("plant: Lafarge Mississauga Plant");
  });

  it("accepts OpenEPD-flavoured field names", () => {
    const f = normalizeEpd(
      {
        openEPD: "opd-xyz-2",
        product_name: "Galvanized Steel Sheet",
        unit: "kg",
        gwp: "2.14",
        manufacturer: "ArcelorMittal",
        third_party_verified: "Verified to ISO 14025",
        lc_modules: "A1",
      },
      "steel",
    );
    expect(f).not.toBeNull();
    expect(f!.epd_id).toBe("opd-xyz-2");
    expect(f!.kg_co2e_per_unit).toBe(2.14);
    expect(f!.unit).toBe("kg");
    expect(f!.verified).toBe(true);
    expect(f!.modules).toEqual(["A1"]);
  });

  it("returns null (never a guess) when the declaration has no usable GWP", () => {
    expect(normalizeEpd({ id: "x" }, "cat")).toBeNull();
    expect(normalizeEpd({ id: "x", gwp: "not-a-number" }, "cat")).toBeNull();
    expect(normalizeEpd({ id: "x", embodied_carbon: { value: -5 } }, "cat")).toBeNull();
    expect(normalizeEpd({}, "cat")).toBeNull(); // no id at all
  });
});

describe("ec3ResponseToOutcome", () => {
  it("adopts EPD factors from a well-formed envelope", () => {
    const out = ec3ResponseToOutcome(
      { epds: [ec3Epd, { id: "frelux-epd-2", name: "Other", gwp: 1.2 }] },
      "concrete",
    );
    expect(out.ok).toBe(true);
    expect(out.factors).toHaveLength(2);
    expect(out.rawCount).toBe(2);
    expect(out.dropped).toBe(0);
  });

  it("counts unusable declarations as dropped, never invents values", () => {
    const out = ec3ResponseToOutcome(
      { epds: [ec3Epd, { id: "broken", name: "No GWP" }] },
      "concrete",
    );
    expect(out.ok).toBe(true);
    expect(out.factors).toHaveLength(1);
    expect(out.dropped).toBe(1);
  });

  it("refuses with a precise reason when the payload has no declarations", () => {
    const out = ec3ResponseToOutcome({ error: "EC3 API key is not configured" }, "concrete");
    expect(out.ok).toBe(false);
    expect(out.factors).toHaveLength(0);
    expect(out.reason).toContain("EC3 API key is not configured");
    expect(out.reason).toContain("nothing was invented");
  });

  it("refuses on malformed payloads", () => {
    expect(ec3ResponseToOutcome(null, "x").ok).toBe(false);
    expect(ec3ResponseToOutcome("string", "x").ok).toBe(false);
    expect(ec3ResponseToOutcome({ nothing: true }, "x").reason).toContain("no declaration list");
    expect(ec3ResponseToOutcome({ epds: [{ id: "a" }] }, "x").reason).toContain(
      "none carried a usable GWP",
    );
  });
});

describe("lookupEc3Epds", () => {
  it("translates a transport error into an honest refusal", async () => {
    const out = await lookupEc3Epds(
      { materialQuery: "concrete" },
      async () => {
        throw new Error("Function returned 503");
      },
    );
    expect(out.ok).toBe(false);
    expect(out.reason).toContain("could not reach the API");
    expect(out.reason).toContain("nothing was invented");
  });
});

describe("mergeEpdWithAdminFactors", () => {
  const admin = [
    {
      category: "concrete",
      unit: "m3",
      kg_co2e_per_unit: 350, // the static estimate
      source_reference: "ICE v3 batch estimate",
    },
    {
      category: "paint",
      unit: "litre",
      kg_co2e_per_unit: 3.2,
      source_reference: "admin literature review",
    },
  ];

  it("replaces the admin factor with the verified EPD for the same category", () => {
    const epd = normalizeEpd(ec3Epd, "concrete")!;
    const { factors, replaced, warnings } = mergeEpdWithAdminFactors([epd], admin);
    expect(replaced).toContain("concrete");
    const concrete = factors.find((f) => f.category === "concrete")!;
    expect(concrete.source).toBe("epd");
    expect(concrete.kg_co2e_per_unit).toBe(320.5); // EPD value wins
    expect(concrete.epd_id).toBe("frelux-epd-1");
    expect(concrete.module_stage).toBe("A1");
    const paint = factors.find((f) => f.category === "paint")!;
    expect(paint.source).toBe("admin");
    expect(warnings.join(" ")).toContain("replaced the static admin factor");
  });

  it("keeps admin factors untouched when no EPD covers a category", () => {
    const { factors, replaced } = mergeEpdWithAdminFactors([], admin);
    expect(replaced).toHaveLength(0);
    expect(factors).toHaveLength(2);
    expect(factors.every((f) => f.source === "admin")).toBe(true);
  });

  it("warns when EPDs exist but match nothing on the estimate", () => {
    const epd = normalizeEpd({ ...ec3Epd, category: "cladding" }, "cladding")!;
    const { warnings } = mergeEpdWithAdminFactors([epd], admin);
    expect(warnings.join(" ")).toContain("none matched a category");
  });

  it("ignores duplicate EPD declarations for the same category (first wins)", () => {
    const a = normalizeEpd({ ...ec3Epd, id: "first" }, "concrete")!;
    const b = normalizeEpd({ ...ec3Epd, id: "second", gwp: 999 }, "concrete")!;
    const { factors } = mergeEpdWithAdminFactors([a, b], []);
    expect(factors).toHaveLength(1);
    expect(factors[0].epd_id).toBe("first");
  });
});
