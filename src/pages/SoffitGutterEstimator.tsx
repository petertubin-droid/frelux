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
import { CalculatorSchematic } from "@/components/engineering/CalculatorSchematic";
import {
  NumberField,
  SelectField,
  FieldGroup,
} from "@/components/calculators/SpecialtyFields";
import { track } from "@/lib/analytics";
import { useBuildingSize } from "@/lib/measurement/building-size-context";
import { buildingEnvelope } from "@/lib/measurement/building-schedule";
import { usePriceBook } from "@/lib/pricing/price-book-context";
import { applyPriceBook } from "@/lib/pricing/price-book";
import { useMarket } from "@/lib/international/market-context";
import UnitToggle from "@/components/measurement/UnitToggle";
import { unitShortLabel, unitToMeters } from "@/lib/utils";
import type { Unit } from "@/types";

export default function SoffitGutterEstimator() {
  const { priceMap, ruleRows, bookSummary } =
    useSpecialtyPrices("soffit_gutter");
  // Lengths are typed in the visitor's unit and normalised to metres for the
  // engine. Feet is the default.
  const [unit, setUnit] = useState<Unit>("feet");
  const [mode, setMode] = useState<"perimeter" | "footprint">("perimeter");
  const [perimeter, setPerimeter] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [overhang, setOverhang] = useState("2");
  const [material, setMaterial] = useState<SoffitMaterial>("aluminium");
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SpecialtyResult | null>(null);
  const { building } = useBuildingSize();
  const [envelopeNote, setEnvelopeNote] = useState<string | null>(null);

  const rules = useMemo(() => parseSoffitGutterRules(ruleRows), [ruleRows]);
  // Precedence: market book, then the contractor's price book, then the rate
  // typed on this page for this run.
  const { resolve } = usePriceBook();
  const { market } = useMarket();
  // The market book this page reads is quoted in the market's currency, so the
  // book is resolved in that currency. Passing the country code here would match
  // nothing and silently drop every stored rate.
  const priceCurrency = market?.currencyCode ?? "NGN";
  const prices = useMemo(
    () =>
      mergePriceOverrides(
        applyPriceBook(priceMap, resolve(priceCurrency).rates),
        overrides,
      ),
    [priceMap, overrides, resolve, priceCurrency],
  );

  const input: SoffitGutterInput = {
    mode,
    perimeter_m:
      mode === "perimeter" ? unitToMeters(Number(perimeter), unit) : null,
    building_length_m:
      mode === "footprint" ? unitToMeters(Number(length), unit) : null,
    building_width_m:
      mode === "footprint" ? unitToMeters(Number(width), unit) : null,
    overhang_m: unitToMeters(Number(overhang), unit),
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

  /**
   * Fill the eaves from the measured building. The schedule measures wall lines,
   * so the perimeter read here is the wall perimeter, not the roof edge: the
   * eaves perimeter grows by four overhangs, which is why the overhang field is
   * kept and the note says the roof line was not measured.
   */
  const applyMeasuredBuilding = () => {
    const envelope = buildingEnvelope(building);
    if ("reason" in envelope) {
      setEnvelopeNote(envelope.reason);
      return;
    }
    setMode("footprint");
    setLength(envelope.lengthM.toFixed(2));
    setWidth(envelope.widthM.toFixed(2));
    setEnvelopeNote(
      `Read from the measured building: ${envelope.lengthM.toFixed(2)} m x ${envelope.widthM.toFixed(2)} m, wall perimeter ${envelope.perimeterM.toFixed(2)} m. The roof edge adds the overhang on each side, so the eaves perimeter is longer than the wall line.`,
    );
  };

  const resetInputs = () => {
    setMode("perimeter");
    setPerimeter("");
    setLength("");
    setWidth("");
    setOverhang("2");
    setMaterial("aluminium");
    setOverrides({});
    setEnvelopeNote(null);
    setResult(null);
  };

  return (
    <SpecialtyCalculatorShell
      methodology="soffit-gutter"
      onReset={resetInputs}
      calculatorType="soffit_gutter"
      title="Soffit, Fascia & Gutter Estimator"
      subtitle="Turn the eaves perimeter into fascia, gutter, soffit area, downpipes and brackets, ready to price."
      seoTitle="Soffit, Fascia and Rainwater Gutter Cost Estimator | FRELUX"
      seoDescription="Estimate fascia board, rainwater gutter, soffit panels, downpipes and brackets from the roof perimeter and eaves overhang, with a 5% cutting allowance and downpipes every 12 m."
      breadcrumbName="Soffit and Gutter Estimator"
      faqSlug="soffit-gutter-cost-estimator"
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
        <>
          <CalculatorSchematic
            kind="gutter"
            perimeter={
              mode === "perimeter"
                ? `${perimeter || "0"} m`
                : `${(2 * (Number(length || 0) + Number(width || 0))).toFixed(1)} m (derived from footprint)`
            }
            overhang={overhang ? `${overhang} m` : "not entered"}
            material={SOFFIT_MATERIAL_LABELS[material]}
            downpipes={
              result?.lines
                .find((line) => /downpipe/i.test(line.label))
                ?.quantity?.toString() ?? "calculated after takeoff"
            }
          />
          <p className="mt-3">
            Rules in use: {rules.waste_pct}% cutting waste, downpipes every{" "}
            {rules.downpipe_spacing_m} m, brackets every{" "}
            {rules.bracket_spacing_m} m.
          </p>
        </>
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

          <button
            type="button"
            onClick={applyMeasuredBuilding}
            className="w-full rounded-lg border border-dashed px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted"
          >
            Use the measured building footprint
          </button>
          {envelopeNote && (
            <p
              role="status"
              className="rounded-md border border-border bg-muted/30 p-2 text-[11px] leading-relaxed text-muted-foreground"
            >
              {envelopeNote}
            </p>
          )}

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
                required
                unit={unitShortLabel(unit)}
                value={perimeter}
                onChange={setPerimeter}
                placeholder="65"
                hint="Measure the overhanging roof edge, not the wall line."
              />
            ) : (
              <>
                <NumberField
                  label="Building length"
                  required
                  unit={unitShortLabel(unit)}
                  value={length}
                  onChange={setLength}
                />
                <NumberField
                  label="Building width"
                  required
                  unit={unitShortLabel(unit)}
                  value={width}
                  onChange={setWidth}
                />
              </>
            )}
            <NumberField
              label="Eaves overhang width"
              required
              unit={unitShortLabel(unit)}
              value={overhang}
              onChange={setOverhang}
              hint="About 2 ft is the common overhang; 3 ft is used on wider eaves."
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
