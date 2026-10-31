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
import {
  NumberField,
  SelectField,
  FieldGroup,
} from "@/components/calculators/SpecialtyFields";
import { track } from "@/lib/analytics";

export default function RetainingWallEstimator() {
  const { priceMap, ruleRows, bookSummary } =
    useSpecialtyPrices("retaining_wall");
  const [length, setLength] = useState("");
  const [height, setHeight] = useState("");
  const [soil, setSoil] = useState<SoilType>("stable");
  const [stem, setStem] = useState<StemType>("block");
  const [widthOverride, setWidthOverride] = useState("");
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SpecialtyResult | null>(null);

  const rules = useMemo(() => parseRetainingWallRules(ruleRows), [ruleRows]);
  const prices = useMemo(
    () => mergePriceOverrides(priceMap, overrides),
    [priceMap, overrides],
  );

  const input: RetainingWallInput = {
    length_m: Number(length),
    height_m: Number(height),
    soil_type: soil,
    stem_type: stem,
    footing_width_override_m:
      widthOverride.trim() === "" ? null : Number(widthOverride),
  };

  const preview = useMemo(() => {
    const length_m = Number(length);
    const height_m = Number(height);
    if (!Number.isFinite(length_m) || length_m <= 0) return null;
    if (!Number.isFinite(height_m) || height_m <= 0) return null;
    return retainingWallGeometry(
      {
        length_m,
        height_m,
        soil_type: soil,
        stem_type: stem,
        footing_width_override_m:
          widthOverride.trim() === "" ? null : Number(widthOverride),
      },
      rules,
    );
  }, [length, height, soil, stem, widthOverride, rules]);

  const run = () => {
    const res = calculateRetainingWall(input, rules, prices);
    setResult(res);
    track("calculator_completed", {
      calculator: "retaining_wall",
      incomplete: res.incomplete,
      lines: res.lines.length,
    });
  };

  return (
    <SpecialtyCalculatorShell
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
        <p>
          Rules in use: footing {rules.footing_width_m} m wide and{" "}
          {rules.footing_thickness_m} m thick, {rules.blocks_per_m2} blocks per
          m², {rules.waste_pct}% block waste, weep holes every{" "}
          {rules.weep_spacing_m} m, bars at {rules.bar_spacing_m} m centres.
          These are visible planning defaults, not a design.
        </p>
      }
      inputs={
        <>
          <FieldGroup title="Wall">
            <NumberField
              label="Wall length"
              unit="m"
              value={length}
              onChange={setLength}
              placeholder="10"
            />
            <NumberField
              label="Wall height"
              unit="m"
              value={height}
              onChange={setHeight}
              placeholder="1.8"
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
              unit="m, optional"
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
