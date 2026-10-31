/**
 * Electrical Conduit & Wiring Loop Estimator page.
 *
 * Material takeoff only. The sliders are the three numbers an electrician knows
 * before a site visit: floor area, lighting points and socket points.
 */

import { useMemo, useState } from "react";
import {
  calculateConduitWiring,
  parseConduitWiringRules,
  type ConduitWiringInput,
} from "@/lib/estimation/conduit-wiring-engine";
import type { SpecialtyResult } from "@/lib/estimation/specialty";
import {
  mergePriceOverrides,
  useSpecialtyPrices,
} from "@/components/calculators/useSpecialtyPrices";
import SpecialtyCalculatorShell from "@/components/calculators/SpecialtyCalculatorShell";
import {
  SliderField,
  FieldGroup,
} from "@/components/calculators/SpecialtyFields";
import { track } from "@/lib/analytics";

export default function ConduitWiringEstimator() {
  const { priceMap, ruleRows, bookSummary } =
    useSpecialtyPrices("conduit_wiring");
  const [area, setArea] = useState(120);
  const [lights, setLights] = useState(12);
  const [sockets, setSockets] = useState(10);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SpecialtyResult | null>(null);

  const rules = useMemo(() => parseConduitWiringRules(ruleRows), [ruleRows]);
  const prices = useMemo(
    () => mergePriceOverrides(priceMap, overrides),
    [priceMap, overrides],
  );

  const input: ConduitWiringInput = {
    floor_area_m2: area,
    lighting_points: lights,
    socket_points: sockets,
  };

  const run = () => {
    const res = calculateConduitWiring(input, rules, prices);
    setResult(res);
    track("calculator_completed", {
      calculator: "conduit_wiring",
      incomplete: res.incomplete,
      lines: res.lines.length,
    });
  };

  return (
    <SpecialtyCalculatorShell
      calculatorType="conduit_wiring"
      title="Electrical Conduit & Wiring Estimator"
      subtitle="Convert floor area and point counts into conduit lengths, cable coils, boxes, switches and sockets."
      seoTitle="Electrical Conduit and Wiring Material Estimator | FRELUX"
      seoDescription="Estimate PVC conduit, 1.5 mm and 2.5 mm cable coils, junction boxes, switch plates and sockets from floor area and your lighting and socket point counts."
      breadcrumbName="Conduit and Wiring Estimator"
      faqSlug="conduit-wiring-estimator"
      routePath="/electrical-conduit-wiring-estimator"
      limitations={[
        "This is a material takeoff, not a circuit design. Circuit sizing, breaker ratings, earthing and volt drop remain the electrician's responsibility.",
        "Cable lengths are planning allowances per point, not measured routes: ceiling height, wall thickness and switch drops change them.",
        "Conduit is sized from floor area, so a building with long corridors or multiple floors will need a longer run than this figure.",
      ]}
      result={result}
      onRun={run}
      priceOverrides={overrides}
      onPriceOverride={(slug, value) =>
        setOverrides((prev) => ({ ...prev, [slug]: value }))
      }
      bookSummary={bookSummary}
      quoteTitle="FRELUX Electrical Material Estimate"
      quoteFooter="Material takeoff only, not a circuit design. Circuit sizing, earthing and breaker ratings are the electrician's design."
      proCallout={{
        title: "Ready to install wiring conduits?",
        body: "Find verified local electricians near you on Pro Connect, then hand them this shopping list.",
        cta: "Find an electrician",
        to: "/pro-connect",
      }}
      crossLinks={[
        {
          label: "Electrical estimator",
          to: "/electrical",
          description:
            "Full electrical estimate with cable, breakers, switches and sockets by circuit.",
        },
        {
          label: "Solar PV estimator",
          to: "/solar-pv-estimator",
          description:
            "Inverter and panel sizing for the same building once the wiring is in.",
        },
      ]}
      notes={
        <p>
          Rules in use: {rules.conduit_per_m2} m of conduit per m² of floor,{" "}
          {rules.conduit_length_m} m per conduit length,{" "}
          {rules.lighting_cable_per_point_m} m of 1.5 mm cable per lighting
          point, {rules.socket_cable_per_point_m} m of 2.5 mm cable per socket
          point, {rules.junction_per_point} boxes per point.
        </p>
      }
      inputs={
        <>
          <FieldGroup title="Building">
            <SliderField
              label="Total floor area"
              unit="m²"
              value={area}
              onChange={setArea}
              min={10}
              max={1000}
              step={5}
              hint="Floor area of the spaces being wired."
            />
          </FieldGroup>

          <FieldGroup title="Points">
            <SliderField
              label="Lighting points"
              unit="points"
              value={lights}
              onChange={setLights}
              min={0}
              max={200}
              hint="Ceiling lights, including outside lights on the same wiring."
            />
            <SliderField
              label="Socket and outlet points"
              unit="points"
              value={sockets}
              onChange={setSockets}
              min={0}
              max={200}
              hint="Wall sockets, including air conditioner and dedicated outlets."
            />
          </FieldGroup>
        </>
      }
    />
  );
}
