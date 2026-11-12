/**
 * Retaining Wall Material & Cost Calculator page.
 *
 * The page owns input state and the buyer's price entries; the engine owns every
 * number. Soil type changes the recommended footing width and the page shows the
 * recommendation next to the width actually used, so nothing geometric happens
 * out of sight.
 */

import { useMemo, useState } from "react";
import {
  calculateRetainingWall,
  parseRetainingWallRules,
  retainingWallGeometry,
  SOIL_LABELS,
  type RetainingWallInput,
  type SoilType,
  type StemType,
} from "@/lib/estimation/retaining-wall-engine";
import type { SpecialtyResult } from "@/lib/estimation/specialty";
import {
  mergePriceOverrides,
  useSpecialtyPrices,
} from "@/components/calculators/useSpecialtyPrices";
import SpecialtyCalculatorShell from "@/components/calculators/SpecialtyCalculatorShell";
import { CalculatorSchematic } from "@/components/engineering/CalculatorSchematic";
import {
  NumberField,
  SelectField,
  FieldGroup,
} from "@/components/calculators/SpecialtyFields";
import { track } from "@/lib/analytics";
import { useMarket } from "@/lib/international/market-context";
import { usePriceBook } from "@/lib/pricing/price-book-context";
import { applyPriceBook } from "@/lib/pricing/price-book";
import UnitToggle from "@/components/measurement/UnitToggle";
import { unitShortLabel, unitToMeters } from "@/lib/utils";
import type { Unit } from "@/types";

export default function RetainingWallEstimator() {
  const { priceMap, ruleRows, bookSummary } =
    useSpecialtyPrices("retaining_wall");
  // Lengths are typed in the visitor's unit and normalised to metres for the
  // engine. Feet is the default: a wall is measured on site in feet.
  const [unit, setUnit] = useState<Unit>("feet");
  const [length, setLength] = useState("");
  const [height, setHeight] = useState("");
  const lengthM = unitToMeters(Number(length), unit);
  const heightM = unitToMeters(Number(height), unit);
  const [soil, setSoil] = useState<SoilType>("stable");
  const [stem, setStem] = useState<StemType>("block");
  const [widthOverride, setWidthOverride] = useState("");
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SpecialtyResult | null>(null);

  const rules = useMemo(() => parseRetainingWallRules(ruleRows), [ruleRows]);
  // The contractor's own supplier rates sit under the market book, in the
  // currency the market book is quoted in. A country code here would match
  // nothing and silently drop the whole book.
  const { resolve } = usePriceBook();
  const { market } = useMarket();
  const priceCurrency = market?.currencyCode ?? "NGN";
  const bookRates = resolve(priceCurrency).rates;
  const prices = useMemo(
    () => mergePriceOverrides(applyPriceBook(priceMap, bookRates), overrides),
    [priceMap, overrides, bookRates],
  );

  const input: RetainingWallInput = {
    length_m: lengthM,
    height_m: heightM,
    soil_type: soil,
    stem_type: stem,
    footing_width_override_m:
      widthOverride.trim() === ""
        ? null
        : unitToMeters(Number(widthOverride), unit),
  };

  const preview = useMemo(() => {
    const length_m = lengthM;
    const height_m = heightM;
    if (!Number.isFinite(length_m) || length_m <= 0) return null;
    if (!Number.isFinite(height_m) || height_m <= 0) return null;
    return retainingWallGeometry(
      {
        length_m,
        height_m,
        soil_type: soil,
        stem_type: stem,
        footing_width_override_m:
          widthOverride.trim() === ""
            ? null
            : unitToMeters(Number(widthOverride), unit),
      },
      rules,
    );
  }, [lengthM, heightM, soil, stem, widthOverride, unit, rules]);

  const run = () => {
    const res = calculateRetainingWall(input, rules, prices);
    setResult(res);
    track("calculator_completed", {
      calculator: "retaining_wall",
      incomplete: res.incomplete,
      lines: res.lines.length,
    });
  };

  const resetInputs = () => {
    setLength("");
    setHeight("");
    setSoil("stable");
    setStem("block");
    setWidthOverride("");
    setOverrides({});
    setResult(null);
  };

  return (
    <SpecialtyCalculatorShell
      onReset={resetInputs}
      methodology="retaining-wall"
      calculatorType="retaining_wall"
      title="Retaining Wall Material Calculator"
      subtitle="Size the footing, stem, reinforcement and drainage for a retaining wall, then cost the materials at your own prices."
      seoTitle="Retaining Wall Material & Cost Calculator | FRELUX"
      seoDescription="Work out footing concrete, blocks, reinforcement and weep holes for a retaining wall from wall length, height and soil type. Soil type widens the recommended footing, and every quantity shows the rule behind it."
      breadcrumbName="Retaining Wall Calculator"
      faqSlug="retaining-wall-calculator"
      routePath="/retaining-wall-calculator"
      limitations={[
        "This is a material takeoff, not a retaining wall design. Footing width, stem thickness and reinforcement are structural engineering decisions.",
        "Excavation labour, backfill, drainage aggregate behind the wall, mortar and plaster are outside the shopping list.",
        "The soil type widens the recommended footing using a printed factor. It cannot replace a site investigation: water behind a wall is what makes walls fail.",
      ]}
      result={result}
      onRun={run}
      priceOverrides={overrides}
      onPriceOverride={(slug, value) =>
        setOverrides((prev) => ({ ...prev, [slug]: value }))
      }
      bookSummary={bookSummary}
      quoteTitle="FRELUX Retaining Wall Estimate"
      quoteFooter="Indicative material estimate, not a structural design. Confirm the footing and stem with a structural engineer before you build."
      crossLinks={[
        {
          label: "Foundation calculator",
          to: "/foundation",
          description:
            "Footings for the building itself, sized from the same soil information.",
        },
        {
          label: "Earthworks cut and fill",
          to: "/earthworks-cut-fill",
          description:
            "Clearing, excavation and leveling volumes for the site around the wall.",
        },
      ]}
      notes={
        <>
          {preview && (
            <>
              <CalculatorSchematic
                kind="retaining-wall"
                length={
                  length ? `${length} ${unitShortLabel(unit)}` : "not entered"
                }
                height={
                  height ? `${height} ${unitShortLabel(unit)}` : "not entered"
                }
                footingWidth={`${preview.footing_width_m} m`}
                soil={SOIL_LABELS[soil]}
                stem={stem === "block" ? "hollow block" : "poured concrete"}
              />
              <div className="mt-4 rounded-lg border border-border bg-card p-3.5 text-xs">
                <div className="flex items-center justify-between font-semibold text-foreground">
                  <span>
                    Geotechnical Stability Check (BS 8002 / Eurocode 7)
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                      preview.stability.overturning_pass &&
                      preview.stability.sliding_pass
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {preview.stability.overturning_pass &&
                    preview.stability.sliding_pass
                      ? "Stable Geometry"
                      : "Review Sizing"}
                  </span>
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-2 text-muted-foreground sm:grid-cols-4">
                  <div>
                    <span className="block font-medium text-foreground">
                      Ka Earth Coeff
                    </span>
                    <span>{preview.stability.ka.toFixed(3)}</span>
                  </div>
                  <div>
                    <span className="block font-medium text-foreground">
                      Active Thrust
                    </span>
                    <span>{preview.stability.active_thrust_kn_m} kN/m</span>
                  </div>
                  <div>
                    <span className="block font-medium text-foreground">
                      FS Overturning
                    </span>
                    <span
                      className={
                        preview.stability.overturning_pass
                          ? "font-medium text-emerald-600 dark:text-emerald-400"
                          : "font-medium text-amber-600 dark:text-amber-400"
                      }
                    >
                      {preview.stability.factor_of_safety_overturning.toFixed(
                        2,
                      )}{" "}
                      (≥1.5)
                    </span>
                  </div>
                  <div>
                    <span className="block font-medium text-foreground">
                      FS Sliding
                    </span>
                    <span
                      className={
                        preview.stability.sliding_pass
                          ? "font-medium text-emerald-600 dark:text-emerald-400"
                          : "font-medium text-amber-600 dark:text-amber-400"
                      }
                    >
                      {preview.stability.factor_of_safety_sliding.toFixed(2)}{" "}
                      (≥1.5)
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-muted-foreground">
                  {preview.stability.status_summary}. Max ground pressure:{" "}
                  {preview.stability.max_bearing_pressure_kpa} kPa.
                </p>
              </div>
            </>
          )}
          <p className="mt-3">
            Rules in use: footing base {rules.footing_width_m} m scaled by
            height and soil, {rules.footing_thickness_m} m base thickness,{" "}
            {rules.blocks_per_m2} blocks per m², {rules.waste_pct}% block waste,
            weep holes every {rules.weep_spacing_m} m, bars at{" "}
            {rules.bar_spacing_m} m centres.
          </p>
        </>
      }
      inputs={
        <>
          <FieldGroup title="Wall">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                Measured in feet by default
              </span>
              <UnitToggle value={unit} onChange={setUnit} />
            </div>
            <NumberField
              label="Wall length"
              required
              unit={unitShortLabel(unit)}
              value={length}
              onChange={setLength}
              placeholder="33"
            />
            <NumberField
              label="Wall height"
              required
              unit={unitShortLabel(unit)}
              value={height}
              onChange={setHeight}
              placeholder="6"
            />
          </FieldGroup>

          <FieldGroup title="Ground and construction">
            <SelectField
              label="Soil type"
              value={soil}
              onChange={setSoil}
              options={(Object.keys(SOIL_LABELS) as SoilType[]).map((s) => ({
                value: s,
                label: SOIL_LABELS[s],
              }))}
              hint="Loose sand and wet clay push harder, so the recommended footing widens."
            />
            <SelectField
              label="Stem construction"
              value={stem}
              onChange={setStem}
              options={[
                { value: "block", label: "Hollow block stem" },
                { value: "concrete", label: "Poured concrete stem" },
              ]}
            />
            <NumberField
              label="Footing width override"
              unit={`${unitShortLabel(unit)}, optional`}
              value={widthOverride}
              onChange={setWidthOverride}
              placeholder="leave blank to use the recommendation"
              hint={
                preview
                  ? `Recommended for this soil: ${preview.recommended_footing_width_m} m. Leave blank to use it.`
                  : "Enter your own width if a design specifies one."
              }
            />
          </FieldGroup>
        </>
      }
    />
  );
}
