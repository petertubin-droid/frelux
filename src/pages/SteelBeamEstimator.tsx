/**
 * Structural Steel I-Beam Weight & Cost Calculator page.
 *
 * Steel is bought by mass, so the rate is the buyer's, entered from their
 * merchant, and the mass is the part that cannot be argued with.
 */

import { useMemo, useState } from "react";
import {
  calculateSteelBeam,
  OPEN_SPAN_LIMIT_M,
  STEEL_PROFILE_BY_KEY,
  STEEL_PROFILES,
  STEEL_USE_PRESETS,
  steelMassKg,
  type SteelBeamInput,
} from "@/lib/estimation/steel-beam-engine";
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

export default function SteelBeamEstimator() {
  const { priceMap, bookSummary } = useSpecialtyPrices("steel_beam");
  const [preset, setPreset] = useState<string>("custom");
  const [profile, setProfile] = useState<string>("ipe_200");
  const [span, setSpan] = useState("");
  const [count, setCount] = useState("1");
  const [rate, setRate] = useState("");
  const [columns, setColumns] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SpecialtyResult | null>(null);

  const prices = useMemo(
    () => mergePriceOverrides(priceMap, overrides),
    [priceMap, overrides],
  );

  const input: SteelBeamInput = {
    profile,
    span_m: Number(span),
    beam_count: Number(count),
    price_per_tonne: rate.trim() === "" ? null : Number(rate),
    columns_included: columns,
  };

  const mass = useMemo(
    () =>
      steelMassKg({
        profile,
        span_m: Number(span),
        beam_count: Number(count),
        price_per_tonne: null,
        columns_included: columns,
      }),
    [profile, span, count, columns],
  );

  const applyPreset = (key: string) => {
    setPreset(key);
    const found = STEEL_USE_PRESETS.find((p) => p.key === key);
    if (found) setProfile(found.profile);
  };

  const run = () => {
    const res = calculateSteelBeam(input, prices);
    setResult(res);
    track("calculator_completed", {
      calculator: "steel_beam",
      incomplete: res.incomplete,
      lines: res.lines.length,
    });
  };

  return (
    <SpecialtyCalculatorShell
      calculatorType="steel_beam"
      title="Structural Steel I-Beam Weight & Cost Calculator"
      subtitle="Convert span and profile into kilograms, then tonnes, then a cost at your own merchant rate."
      seoTitle="Structural Steel I-Beam Weight and Cost Calculator | FRELUX"
      seoDescription="Calculate the mass of IPE and universal beam sections from span length and nominal weight per metre, and cost them at your steel merchant's rate per tonne."
      breadcrumbName="Steel Beam Calculator"
      faqSlug="steel-beam-calculator"
      routePath="/structural-steel-i-beam-calculator"
      limitations={[
        "This converts a span and a profile into mass and cost. It does not confirm the section is adequate: an engineer sizes steel members.",
        "Open spans beyond 8 m need a deflection check before fabrication, and connections, base plates and bolts are outside the mass figure.",
        "Fabrication, welding, protective coating, transport and erection are not included in a per tonne material rate.",
      ]}
      result={result}
      onRun={run}
      priceOverrides={overrides}
      onPriceOverride={(slug, value) =>
        setOverrides((prev) => ({ ...prev, [slug]: value }))
      }
      bookSummary={bookSummary}
      quoteTitle="FRELUX Structural Steel Estimate"
      quoteFooter="Material mass and indicative cost only. Open spans over 8 m need a structural engineer's deflection check before fabrication."
      crossLinks={[
        {
          label: "Reinforcement estimator",
          to: "/reinforcement",
          description: "Rebar and mesh for the concrete the steel frames into.",
        },
        {
          label: "Structural calculator",
          to: "/structural-calculator",
          description: "Member sizing checks beyond a material takeoff.",
        },
      ]}
      notes={
        <p>
          Mass uses the published nominal weight per metre for each profile.
          Merchant weighbridge tickets are the check on what actually arrives.
        </p>
      }
      inputs={
        <>
          <FieldGroup title="Use">
            <SelectField
              label="What the steel is for"
              value={preset}
              onChange={applyPreset}
              options={[
                { value: "custom", label: "Choose a profile myself" },
                ...STEEL_USE_PRESETS.map((p) => ({
                  value: p.key,
                  label: p.label,
                })),
              ]}
              hint="Picking a use sets the usual profile for it; you can change the profile after."
            />
            <SelectField
              label="Profile"
              value={profile}
              onChange={(v) => {
                setProfile(v);
                setPreset("custom");
              }}
              options={STEEL_PROFILES.map((p) => ({
                value: p.key,
                label: `${p.label}, ${p.kg_per_m} kg/m`,
              }))}
              hint={STEEL_PROFILE_BY_KEY[profile]?.note}
            />
          </FieldGroup>

          <FieldGroup title="Span">
            <NumberField
              label="Span length"
              unit="m"
              value={span}
              onChange={setSpan}
              placeholder="6"
            />
            <NumberField
              label="Number of beams"
              unit="count"
              value={count}
              onChange={setCount}
              min={1}
              step={1}
              hint={
                mass === null
                  ? undefined
                  : `Total mass ${mass.toLocaleString()} kg across these beams.`
              }
            />
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={columns}
                onChange={(e) => setColumns(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border"
              />
              <span>
                Intermediate columns are included in this design
                <span className="block text-xs text-muted-foreground">
                  Leave unticked for an open span. Passed {OPEN_SPAN_LIMIT_M} m,
                  an engineer must check deflection.
                </span>
              </span>
            </label>

            <NumberField
              label="Steel rate per tonne"
              unit="your currency"
              value={rate}
              onChange={setRate}
              placeholder="from your merchant"
              hint="FRELUX does not supply steel rates: merchants quote per tonne and rates move weekly."
            />
          </FieldGroup>
        </>
      }
    />
  );
}
