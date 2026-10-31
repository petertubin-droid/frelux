/**
 * Soffit, Fascia & Rainwater Gutter Estimator page.
 *
 * The eaves perimeter can be typed directly or derived from a footprint, and the
 * derived route calls the roof engine's own fascia helper so both tools agree on
 * one perimeter figure.
 */

import { useMemo, useState } from "react";
import {
  BUNGALOW_TEMPLATE,
  calculateSoffitGutter,
  parseSoffitGutterRules,
  SOFFIT_MATERIAL_LABELS,
  type SoffitGutterInput,
  type SoffitMaterial,
} from "@/lib/estimation/soffit-gutter-engine";
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

export default function SoffitGutterEstimator() {
  const { priceMap, ruleRows, bookSummary } =
    useSpecialtyPrices("soffit_gutter");
  const [mode, setMode] = useState<"perimeter" | "footprint">("perimeter");
  const [perimeter, setPerimeter] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [overhang, setOverhang] = useState("0.6");
  const [material, setMaterial] = useState<SoffitMaterial>("aluminium");
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SpecialtyResult | null>(null);

  const rules = useMemo(() => parseSoffitGutterRules(ruleRows), [ruleRows]);
  const prices = useMemo(
    () => mergePriceOverrides(priceMap, overrides),
    [priceMap, overrides],
  );

  const input: SoffitGutterInput = {
    mode,
    perimeter_m: mode === "perimeter" ? Number(perimeter) : null,
    building_length_m: mode === "footprint" ? Number(length) : null,
    building_width_m: mode === "footprint" ? Number(width) : null,
    overhang_m: Number(overhang),
    material,
  };

  const run = () => {
    const res = calculateSoffitGutter(input, rules, prices);
    setResult(res);
    track("calculator_completed", {
      calculator: "soffit_gutter",
      incomplete: res.incomplete,
      lines: res.lines.length,
    });
  };

  const applyTemplate = () => {
    setMode("perimeter");
    setPerimeter(String(BUNGALOW_TEMPLATE.perimeter_m));
    setOverhang(String(BUNGALOW_TEMPLATE.overhang_m));
  };

  return (
    <SpecialtyCalculatorShell
      calculatorType="soffit_gutter"
      title="Soffit, Fascia & Gutter Estimator"
      subtitle="Turn the eaves perimeter into fascia, gutter, soffit area, downpipes and brackets, ready to price."
      seoTitle="Soffit, Fascia and Rainwater Gutter Cost Estimator | FRELUX"
      seoDescription="Estimate fascia board, rainwater gutter, soffit panels, downpipes and brackets from the roof perimeter and eaves overhang, with a 5% cutting allowance and downpipes every 12 m."
      breadcrumbName="Soffit and Gutter Estimator"
      routePath="/rainwater-gutter-soffit-cost-estimator"
      limitations={[
        "This sizes materials from the eaves perimeter you supply. It does not measure a roof or verify the perimeter against the building.",
        "Gutter falls, outlets, stop ends, sealant and the soakaway or storage tank that receives the water are not included.",
        "Soffit support beyond a 0.9 m overhang is not sized here; wider eaves need a bearer or bracket design.",
      ]}
      result={result}
      onRun={run}
      priceOverrides={overrides}
      onPriceOverride={(slug, value) =>
        setOverrides((prev) => ({ ...prev, [slug]: value }))
      }
      bookSummary={bookSummary}
      quoteTitle="FRELUX Soffit and Gutter Estimate"
      quoteFooter="Indicative material estimate from your measured eaves perimeter. Gutter falls, outlets and soakaway are excluded."
      crossLinks={[
        {
          label: "Build to roof estimator",
          to: "/build-to-roof-estimator",
          description:
            "Sheets, purlins and trusses, using the same eaves perimeter this tool starts from.",
        },
        {
          label: "Roof framing calculator",
          to: "/roof-framing-calculator",
          description:
            "Rafters and members for the roof the fascia and gutter sit under.",
        },
      ]}
      notes={
        <p>
          Rules in use: {rules.waste_pct}% cutting waste, downpipes every{" "}
          {rules.downpipe_spacing_m} m, brackets every {rules.bracket_spacing_m}{" "}
          m.
        </p>
      }
      inputs={
        <>
          <button
            type="button"
            onClick={applyTemplate}
            className="w-full rounded-lg border border-dashed px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted"
          >
            Use the {BUNGALOW_TEMPLATE.label.toLowerCase()} (
            {BUNGALOW_TEMPLATE.perimeter_m} m perimeter,{" "}
            {BUNGALOW_TEMPLATE.overhang_m} m overhang)
          </button>

          <FieldGroup title="Eaves">
            <SelectField
              label="How do you have the perimeter"
              value={mode}
              onChange={setMode}
              options={[
                { value: "perimeter", label: "I measured the eaves perimeter" },
                {
                  value: "footprint",
                  label: "Derive it from the building footprint",
                },
              ]}
            />
            {mode === "perimeter" ? (
              <NumberField
                label="Roof perimeter at the eaves"
                unit="m"
                value={perimeter}
                onChange={setPerimeter}
                placeholder="65"
                hint="Measure the overhanging roof edge, not the wall line."
              />
            ) : (
              <>
                <NumberField
                  label="Building length"
                  unit="m"
                  value={length}
                  onChange={setLength}
                />
                <NumberField
                  label="Building width"
                  unit="m"
                  value={width}
                  onChange={setWidth}
                />
              </>
            )}
            <NumberField
              label="Eaves overhang width"
              unit="m"
              value={overhang}
              onChange={setOverhang}
              hint="0.6 m is the common overhang; 0.9 m is used on wider eaves."
            />
          </FieldGroup>

          <FieldGroup title="Material">
            <SelectField
              label="Soffit finish"
              value={material}
              onChange={setMaterial}
              options={(
                Object.keys(SOFFIT_MATERIAL_LABELS) as SoffitMaterial[]
              ).map((m) => ({
                value: m,
                label: SOFFIT_MATERIAL_LABELS[m],
              }))}
            />
          </FieldGroup>
        </>
      }
    />
  );
}
