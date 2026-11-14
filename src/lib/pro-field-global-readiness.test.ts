import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Global readiness for the Pro & Field tools.
 *
 * These seven tools import drawings, price books and site data from anywhere,
 * so their copy and their arithmetic must not assume one country. The rules
 * held here are the ones that break silently when they slip:
 *
 *  - no hardcoded naira sign, so a price cannot be shown without its currency;
 *  - no locale-dependent number formatting, which renders differently per
 *    browser and contradicts the site's own number format;
 *  - no market fallback that invents Nigeria for a row that names no market;
 *  - regular expressions for units come from the shared factor table.
 */
const ROOT = process.cwd();

const PRO_FIELD_FILES = [
  "src/pages/UnitConverter.tsx",
  "src/pages/BlueprintTakeoff.tsx",
  "src/pages/GlobalSiteSafetyEstimator.tsx",
  "src/pages/DefectDiagnosis.tsx",
  "src/pages/BimIfcImport.tsx",
  "src/pages/FieldSync.tsx",
  "src/pages/MaterialPrices.tsx",
  "src/lib/estimation/global-site-safety-engine.ts",
  "src/lib/estimation/defect-diagnosis-engine.ts",
  "src/lib/estimation/ifc-parser.ts",
  "src/lib/estimation/ifc-takeoff-export.ts",
  "src/lib/estimation/offline-field-engine.ts",
  "src/lib/estimation/plan-scale.ts",
  "src/lib/international/price-currency.ts",
];

function source(file: string): string {
  return readFileSync(join(ROOT, file), "utf8");
}

describe("Pro & Field global readiness", () => {
  it("never prints a naira sign directly", () => {
    const offenders = PRO_FIELD_FILES.filter((f) => source(f).includes("₦"));
    expect(offenders).toEqual([]);
  });

  it("formats numbers independently of the browser locale", () => {
    const offenders = PRO_FIELD_FILES.filter((f) =>
      /toLocaleString\(\s*\)/.test(source(f)),
    );
    expect(offenders).toEqual([]);
  });

  it("never assumes a market when a row does not state one", () => {
    const offenders = PRO_FIELD_FILES.filter((f) =>
      /\?\?\s*["']NG["']/.test(source(f)),
    );
    expect(offenders).toEqual([]);
  });

  it("converts drawing units through the shared factor table", () => {
    const scale = source("src/lib/estimation/plan-scale.ts");
    expect(scale).toContain('from "@/lib/convert/units"');
    // A hand-written foot or inch factor would drift from the single source.
    expect(scale).not.toMatch(/0\.3048|0\.0254/);
  });

  it("converts IFC units through declared project units, not a fixed guess", () => {
    const parser = source("src/lib/estimation/ifc-parser.ts");
    expect(parser).toContain("IFCSIUNIT");
    expect(parser).toContain("prefixFactor");
  });

  it("keeps the safety engine jurisdiction-neutral", () => {
    const engine = source("src/lib/estimation/global-site-safety-engine.ts");
    for (const framework of ["OSHA_US", "UK_HSE_CDM", "INTERNATIONAL_ISO"]) {
      expect(engine).toContain(framework);
    }
    expect(engine).not.toMatch(/is required by law|must comply with/i);
  });
});
