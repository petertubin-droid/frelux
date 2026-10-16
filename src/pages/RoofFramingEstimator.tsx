import { useState } from "react";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { useSeo } from "@/lib/seo";
import { COUNTRY_OPTIONS } from "@/lib/international/countries";
import { getRoofMarketEvidence, ROOF_DESIGN_MARKET_CODES } from "@/lib/estimation/roof-market-research";
import { calculateRectangularSectionProperties, checkRoofMember, type RoofMemberCheckResult } from "@/lib/estimation/roof-member-design";
import { lookupNigeriaRoofLiveLoad } from "@/lib/estimation/roof-load-reference";
import {
  calculateRoofFraming,
  type RoofFramingInput,
  type RoofFramingResult,
} from "@/lib/estimation/advanced-takeoff-engine";

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary";
const format = (value: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
const blankSections = (): RoofFramingInput["sections"] => ({
  common: { widthIn: 0, depthIn: 0 },
  jack: { widthIn: 0, depthIn: 0 },
  hip: { widthIn: 0, depthIn: 0 },
  ridge: { widthIn: 0, depthIn: 0 },
});

type Form = {
  lengthM: string;
  widthM: string;
  pitchRisePer12: string;
  overhangM: string;
  spacingM: string;
  roofType: "gable" | "hip";
  sections: Record<
    keyof RoofFramingInput["sections"],
    { widthIn: string; depthIn: string }
  >;
  extra: {
    label: string;
    count: string;
    lengthM: string;
    widthIn: string;
    depthIn: string;
  }[];
};
const initialForm = (): Form => ({
  lengthM: "",
  widthM: "",
  pitchRisePer12: "",
  overhangM: "",
  spacingM: "",
  roofType: "gable",
  sections: {
    common: { widthIn: "", depthIn: "" },
    jack: { widthIn: "", depthIn: "" },
    hip: { widthIn: "", depthIn: "" },
    ridge: { widthIn: "", depthIn: "" },
  },
  extra: [],
});

type DesignForm = {
  market: string; material: "timber" | "steel"; spanM: string; spacingM: string;
  areaLoadKNM2: string; sectionModulusMM3: string; secondMomentMM4: string;
  sectionWidthMM: string; sectionDepthMM: string; roofRiseMMPerM: string; tributaryAreaM2: string;
  shearAreaMM2: string; elasticModulusGPa: string; bendingResistanceMPa: string;
  shearResistanceMPa: string; deflectionRatio: string;
};
const initialDesignForm = (): DesignForm => ({
  market: "", material: "timber", spanM: "", spacingM: "", areaLoadKNM2: "",
  sectionModulusMM3: "", secondMomentMM4: "", shearAreaMM2: "",
  sectionWidthMM: "", sectionDepthMM: "", roofRiseMMPerM: "", tributaryAreaM2: "",
  elasticModulusGPa: "", bendingResistanceMPa: "", shearResistanceMPa: "",
  deflectionRatio: "200",
});

export default function RoofFramingEstimator() {
  useSeo({
    title: "Roof Framing & Board-Foot Calculator | FRELUX",
    description:
      "Calculate common, jack, hip, and ridge member layouts, lengths, linear metres and board feet for a measured rectangular gable or hip roof.",
  });
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState<RoofFramingResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [mode, setMode] = useState<"takeoff" | "design">("takeoff");
  const [designForm, setDesignForm] = useState(initialDesignForm);
  const [designResult, setDesignResult] = useState<RoofMemberCheckResult | null>(null);
  const [designErrors, setDesignErrors] = useState<string[]>([]);
  const [sectionErrors, setSectionErrors] = useState<string[]>([]);
  const [roofLoadReference, setRoofLoadReference] = useState<{ loadKNM2: number; sourceUrl: string; sourceTable: string; scopeNote: string } | null>(null);
  const [roofLoadErrors, setRoofLoadErrors] = useState<string[]>([]);
  const update = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const run = () => {
    const response = calculateRoofFraming({
      lengthM: Number(form.lengthM),
      widthM: Number(form.widthM),
      pitchRisePer12: Number(form.pitchRisePer12),
      overhangM: Number(form.overhangM),
      spacingM: Number(form.spacingM),
      roofType: form.roofType,
      sections: Object.fromEntries(
        Object.entries(form.sections).map(([key, section]) => [
          key,
          {
            widthIn: Number(section.widthIn),
            depthIn: Number(section.depthIn),
          },
        ]),
      ) as RoofFramingInput["sections"],
      additionalMembers: form.extra.map((member) => ({
        label: member.label,
        count: Number(member.count),
        lengthM: Number(member.lengthM),
        widthIn: Number(member.widthIn),
        depthIn: Number(member.depthIn),
      })),
    });
    setErrors(response.errors);
    setResult(response.data);
  };
  const updateDesign = <K extends keyof DesignForm>(key: K, value: DesignForm[K]) => {
    setDesignForm((current) => ({ ...current, [key]: value }));
    setDesignResult(null);
    setDesignErrors([]);
  };
  const calculateSection = () => {
    const response = calculateRectangularSectionProperties(
      Number(designForm.sectionWidthMM), Number(designForm.sectionDepthMM),
    );
    setSectionErrors(response.errors);
    if (response.data) {
      setDesignForm((current) => ({
        ...current,
        sectionModulusMM3: String(response.data!.sectionModulusMM3),
        secondMomentMM4: String(response.data!.secondMomentMM4),
        shearAreaMM2: String(response.data!.effectiveShearAreaMM2),
      }));
      setDesignResult(null);
      setDesignErrors([]);
    }
  };
  const lookupRoofLoad = () => {
    if (!designForm.roofRiseMMPerM.trim() || !designForm.tributaryAreaM2.trim()) {
      setRoofLoadReference(null);
      setRoofLoadErrors(["Enter roof rise and tributary loaded area before looking up the reference."]);
      return;
    }
    const response = lookupNigeriaRoofLiveLoad(
      Number(designForm.roofRiseMMPerM), Number(designForm.tributaryAreaM2),
    );
    setRoofLoadErrors(response.errors);
    setRoofLoadReference(response.data);
  };
  const runDesignCheck = () => {
    if (!designForm.market) {
      setDesignResult(null);
      setDesignErrors(["Select a market context before running this preliminary check."]);
      return;
    }
    const response = checkRoofMember({
      spanM: Number(designForm.spanM), spacingM: Number(designForm.spacingM),
      designAreaLoadKNM2: Number(designForm.areaLoadKNM2),
      sectionModulusMM3: Number(designForm.sectionModulusMM3),
      secondMomentMM4: Number(designForm.secondMomentMM4),
      shearAreaMM2: Number(designForm.shearAreaMM2),
      elasticModulusGPa: Number(designForm.elasticModulusGPa),
      bendingResistanceMPa: Number(designForm.bendingResistanceMPa),
      shearResistanceMPa: Number(designForm.shearResistanceMPa),
      maxDeflectionRatio: Number(designForm.deflectionRatio),
    });
    setDesignErrors(response.errors);
    setDesignResult(response.data);
  };
  const addExtra = () =>
    update("extra", [
      ...form.extra,
      { label: "", count: "", lengthM: "", widthIn: "", depthIn: "" },
    ]);
  return (
    <>
      <PageHeader
        variant="tool"
        eyebrow="Roof structure takeoff"
        title="Roof Framing & Board Feet"
        subtitle="Plan member quantities from a measured rectangular roof, requested rafter spacing, and your selected timber sections. Geometry and board feet stay visible, while complex valleys remain tied to your verified drawing or schedule."
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: "Construction Tools", path: "/construction-tools" },
          { label: "Roof Framing" },
        ]}
      />
      <Container className="py-8 sm:py-10">
        <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-2">
          <button type="button" aria-pressed={mode === "takeoff"} onClick={() => setMode("takeoff")} className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${mode === "takeoff" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>Quantity takeoff</button>
          <button type="button" aria-pressed={mode === "design"} onClick={() => setMode("design")} className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${mode === "design" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>Preliminary structural check</button>
        </div>
        {mode === "takeoff" ? <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(330px,.8fr)]">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-bold">Roof geometry</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use measured wall dimensions and choose a simple rectangular roof
              type.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium">
                Roof type
                <select
                  className={inputClass}
                  value={form.roofType}
                  onChange={(e) =>
                    update("roofType", e.target.value as Form["roofType"])
                  }
                >
                  <option value="gable">Gable</option>
                  <option value="hip">Equal-pitch hip</option>
                </select>
              </label>
              {(
                [
                  ["lengthM", "Building length (m)"],
                  ["widthM", "Building width (m)"],
                  ["pitchRisePer12", "Roof pitch (rise per 12 horizontal)"],
                  ["overhangM", "Eave overhang (m)"],
                  ["spacingM", "Maximum rafter spacing (m)"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="grid gap-1 text-sm font-medium">
                  {label}
                  <input
                    aria-label={label}
                    className={inputClass}
                    type="number"
                    min="0"
                    step="any"
                    value={form[key]}
                    onChange={(e) => update(key, e.target.value)}
                    placeholder="Enter measured/specification value"
                  />
                </label>
              ))}
            </div>
            <h3 className="mt-7 text-base font-semibold">Timber sections</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Enter actual section dimensions in inches. Board feet are
              calculated only from these inputs.
            </p>
            <div className="mt-3 grid gap-3">
              {(
                Object.keys(form.sections) as Array<keyof Form["sections"]>
              ).map((key) => (
                <div
                  key={key}
                  className="grid grid-cols-[1fr_1fr_1fr] items-end gap-2 rounded-xl bg-muted/35 p-3"
                >
                  <p className="pb-2 text-sm font-medium capitalize">
                    {key === "common"
                      ? "Common rafters"
                      : key === "jack"
                        ? "Jack rafters"
                        : key === "hip"
                          ? "Hip rafters"
                          : "Ridge member"}
                  </p>
                  {(["widthIn", "depthIn"] as const).map((dimension) => (
                    <label
                      key={dimension}
                      className="grid gap-1 text-xs text-muted-foreground"
                    >
                      {dimension === "widthIn" ? "Width (in)" : "Depth (in)"}
                      <input
                        aria-label={`${key} ${dimension}`}
                        className={inputClass}
                        type="number"
                        min="0"
                        step="any"
                        value={form.sections[key][dimension]}
                        onChange={(e) =>
                          update("sections", {
                            ...form.sections,
                            [key]: {
                              ...form.sections[key],
                              [dimension]: e.target.value,
                            },
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">
                  Additional measured members
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add purlins, ties, trimmers or valley members only from a
                  measured drawing or engineer schedule.
                </p>
              </div>
              <button
                type="button"
                onClick={addExtra}
                className="rounded-lg border border-border px-3 py-2 text-sm font-semibold"
              >
                + Add schedule row
              </button>
            </div>
            {form.extra.map((member, index) => (
              <div
                key={index}
                className="mt-3 grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-5"
              >
                {(
                  [
                    ["label", "Member label"],
                    ["count", "Count"],
                    ["lengthM", "Length (m)"],
                    ["widthIn", "Width (in)"],
                    ["depthIn", "Depth (in)"],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="grid gap-1 text-xs font-medium text-muted-foreground"
                  >
                    {label}
                    <input
                      className={inputClass}
                      type={key === "label" ? "text" : "number"}
                      min={
                        key === "count" ||
                        key === "lengthM" ||
                        key === "widthIn" ||
                        key === "depthIn"
                          ? "0"
                          : undefined
                      }
                      step="any"
                      value={member[key]}
                      onChange={(e) =>
                        update(
                          "extra",
                          form.extra.map((row, i) =>
                            i === index
                              ? { ...row, [key]: e.target.value }
                              : row,
                          ),
                        )
                      }
                    />
                  </label>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    update(
                      "extra",
                      form.extra.filter((_, i) => i !== index),
                    )
                  }
                  className="text-left text-xs text-destructive"
                >
                  Remove schedule row
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={run}
              className="mt-6 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
            >
              Calculate framing takeoff
            </button>
            {errors.length > 0 && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-amber-400/50 bg-amber-50/60 p-4 text-sm text-amber-900 dark:bg-amber-950/20 dark:text-amber-200"
              >
                {errors.map((error) => (
                  <p key={error}>{error}</p>
                ))}
              </div>
            )}
          </section>
          <aside className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-primary">
              Quantity schedule
            </p>
            <h2 className="mt-2 text-xl font-bold">Timber report</h2>
            {result ? (
              <>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-primary/5 p-4">
                    <p className="text-xs text-muted-foreground">
                      Total board feet
                    </p>
                    <p className="mt-1 text-2xl font-bold">
                      {format(result.totalBoardFeet)} BF
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-4">
                    <p className="text-xs text-muted-foreground">
                      Total linear timber
                    </p>
                    <p className="mt-1 text-2xl font-bold">
                      {format(result.totalLinearM)} m
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-4">
                    <p className="text-xs text-muted-foreground">
                      Ridge length
                    </p>
                    <p className="mt-1 text-xl font-bold">
                      {format(result.ridgeLengthM)} m
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-4">
                    <p className="text-xs text-muted-foreground">Roof rise</p>
                    <p className="mt-1 text-xl font-bold">
                      {format(result.roofRiseM)} m
                    </p>
                  </div>
                </div>
                <div className="mt-5 space-y-2">
                  <h3 className="text-sm font-semibold">Member layout</h3>
                  {result.groups.map((group) => (
                    <div
                      key={group.label}
                      className="rounded-xl border border-border p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <b className="text-sm">{group.label}</b>
                        <span className="text-sm">
                          {group.count} × {format(group.lengthM)} m
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {group.layout}
                      </p>
                      <p className="mt-1 text-xs font-medium">
                        Section {group.widthIn}″ × {group.depthIn}″ ·{" "}
                        {format(group.boardFeet)} BF
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-50/50 p-3 text-xs leading-relaxed text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
                  {result.valleyStatus}
                </div>
                <ul className="mt-5 space-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
                  {result.assumptions.map((note) => (
                    <li key={note}>• {note}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-5 rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
                Enter measured roof geometry and section sizes. A schedule row
                is available for measured purlins and valleys.
              </p>
            )}
          </aside>
        </div> : (
          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(330px,.9fr)]">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
              <p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Engineer-input design basis</p>
              <h2 className="mt-2 text-xl font-bold">Single-span member check</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Enter design loads and section properties/resistances from the applicable, independently reviewed design basis. This preliminary elastic check does not select a code, load, section or material grade for you.</p>
              <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-50/60 p-4 text-sm leading-relaxed text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">Jurisdictional structural design is not yet available for any FRELUX market. The selector below records context only; this generic preliminary check does not apply local codes or certify a design.</div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1 text-sm font-medium">Market research context<select required className={inputClass} value={designForm.market} onChange={(e) => updateDesign("market", e.target.value)}><option value="">Select a FRELUX market</option>{COUNTRY_OPTIONS.map((group) => { const markets = group.countries.filter((country) => ROOF_DESIGN_MARKET_CODES.includes(country.code)); return markets.length ? <optgroup key={group.group} label={group.group}>{markets.map((country) => <option key={country.code} value={country.code}>{country.name} — not enabled for code design</option>)}</optgroup> : null; })}</select><span className="text-xs font-normal text-muted-foreground">Research/status only. All 20 configured FRELUX markets remain unavailable for code-based design calculations.</span></label>
                {designForm.market && (() => { const evidence = getRoofMarketEvidence(designForm.market); return evidence ? <div className="sm:col-span-2 rounded-xl border border-border bg-muted/20 p-4" aria-live="polite"><p className="text-sm font-semibold">{COUNTRY_OPTIONS.flatMap((group) => group.countries).find((country) => country.code === evidence.code)?.name}: research finding</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{evidence.finding}</p><p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">Status: reference/research context only. This is not an enabled code basis or a design approval.</p>{evidence.sourceUrl && evidence.reference ? <a className="mt-2 inline-block text-xs font-medium text-primary underline" href={evidence.sourceUrl} target="_blank" rel="noreferrer">{evidence.reference} · open source</a> : <p className="mt-2 text-xs text-muted-foreground">No verified primary-source reference link is available for this market in this research pass.</p>}</div> : null; })()}
                <label className="grid gap-1 text-sm font-medium">Roof member material<select className={inputClass} value={designForm.material} onChange={(e) => updateDesign("material", e.target.value as DesignForm["material"])}><option value="timber">Timber</option><option value="steel">Steel</option></select><span className="text-xs font-normal text-muted-foreground">Material-specific stability, connection, grade and code checks are not included.</span></label>
                {([["spanM", "Clear span (m)"], ["spacingM", "Tributary spacing, horizontal (m)"], ["areaLoadKNM2", "Total downward load per plan area (kN/m²)"], ["sectionModulusMM3", "Section modulus S (mm³)"], ["secondMomentMM4", "Second moment I (mm⁴)"], ["shearAreaMM2", "Effective shear area (mm²)"], ["elasticModulusGPa", "Elastic modulus E (GPa)"], ["bendingResistanceMPa", "Design bending resistance (MPa)"], ["shearResistanceMPa", "Design shear resistance (MPa)"], ["deflectionRatio", "Deflection limit span / ratio"]] as const).map(([key, label]) => <label key={key} className="grid gap-1 text-sm font-medium">{label}<input aria-label={label} className={inputClass} type="number" min="0" step="any" value={designForm[key]} onChange={(e) => updateDesign(key, e.target.value)} /></label>)}
              </div>
              <div className="sm:col-span-2 rounded-xl border border-border bg-muted/20 p-4">
                <h3 className="font-semibold">Solid rectangular section properties</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Enter actual width and depth; properties are calculated about the strong axis of a solid rectangular section and copied into S, I, and effective shear area. Hollow, built-up, tapered, notched, or weak-axis sections are not represented.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <label className="grid gap-1 text-sm font-medium">Section width (mm)<input aria-label="Section width (mm)" className={inputClass} type="number" min="0" step="any" value={designForm.sectionWidthMM} onChange={(e) => updateDesign("sectionWidthMM", e.target.value)} /></label>
                  <label className="grid gap-1 text-sm font-medium">Section depth (mm)<input aria-label="Section depth (mm)" className={inputClass} type="number" min="0" step="any" value={designForm.sectionDepthMM} onChange={(e) => updateDesign("sectionDepthMM", e.target.value)} /></label>
                  <button type="button" onClick={calculateSection} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted">Calculate section properties</button>
                </div>
                {sectionErrors.length > 0 && <div role="alert" className="mt-3 text-xs text-destructive">{sectionErrors.map((error) => <p key={error}>{error}</p>)}</div>}
              </div>
              <div className="sm:col-span-2 rounded-xl border border-primary/25 bg-primary/5 p-4">
                <p className="text-sm font-semibold">Nigeria roof live-load reference</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Reference-only values transcribed from Table 8.10 of the National Building Code hosted by Nigeria’s Federal Ministry of Housing and Urban Development. The table omits units beside the values; kN/m² is inferred from nearby load provisions and must be confirmed by a qualified engineer. This lookup does not assert current adoption or replace a complete design basis.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm font-medium">Roof rise (mm per 1 m horizontal)<input aria-label="Roof rise (mm per 1 m horizontal)" className={inputClass} type="number" min="0" step="any" value={designForm.roofRiseMMPerM} onChange={(e) => { updateDesign("roofRiseMMPerM", e.target.value); setRoofLoadReference(null); }} /></label>
                  <label className="grid gap-1 text-sm font-medium">Member tributary loaded area (m²)<input aria-label="Member tributary loaded area (m²)" className={inputClass} type="number" min="0" step="any" value={designForm.tributaryAreaM2} onChange={(e) => { updateDesign("tributaryAreaM2", e.target.value); setRoofLoadReference(null); }} /></label>
                </div>
                <button type="button" onClick={lookupRoofLoad} className="mt-3 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold hover:bg-muted">Look up published live-load reference</button>
                {roofLoadErrors.length > 0 && <div role="alert" className="mt-3 text-xs text-destructive">{roofLoadErrors.map((error) => <p key={error}>{error}</p>)}</div>}
                {roofLoadReference && <div className="mt-3 rounded-lg bg-background p-3 text-sm"><p className="font-semibold">{format(roofLoadReference.loadKNM2)} kN/m² ordinary-roof live load</p><p className="mt-1 text-xs text-muted-foreground">Not automatically added to your total design load. Dead load, wind/uplift, earthquake, combinations, ponding, and special-use loads are not covered.</p><a className="mt-2 inline-block text-xs font-medium text-primary underline" href={roofLoadReference.sourceUrl} target="_blank" rel="noreferrer">{roofLoadReference.sourceTable} · open source PDF</a><p className="mt-1 text-xs text-muted-foreground">{roofLoadReference.scopeNote}</p></div>}
              </div>
              <button type="button" onClick={runDesignCheck} className="mt-6 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Run preliminary member check</button>
              {designErrors.length > 0 && <div role="alert" className="mt-4 rounded-xl border border-amber-400/50 bg-amber-50/60 p-4 text-sm text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">{designErrors.map((error) => <p key={error}>{error}</p>)}</div>}
            </div>
            <aside className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
              <p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Preliminary results</p><h2 className="mt-2 text-xl font-bold">{designForm.material === "timber" ? "Timber" : "Steel"} member</h2>
              {designResult ? <><p className={`mt-4 rounded-xl p-4 text-sm font-semibold ${designResult.passesEnteredChecks ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200" : "bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"}`}>{designResult.passesEnteredChecks ? "Passes the entered bending, shear and deflection limits" : "One or more entered limits are exceeded"}</p>
                <div className="mt-4 grid grid-cols-2 gap-3">{([["Line load", designResult.lineLoadKNM, "kN/m"], ["Support reaction", designResult.supportReactionKN, "kN"], ["Max moment", designResult.maxMomentKNM, "kN·m"], ["Max shear", designResult.maxShearKN, "kN"], ["Bending utilization", designResult.bendingUtilization, "×"], ["Shear utilization", designResult.shearUtilization, "×"], ["Deflection", designResult.deflectionMM, "mm"], ["Deflection limit", designResult.deflectionLimitMM, "mm"]] as const).map(([label, value, unit]) => <div key={label} className="rounded-xl bg-muted/40 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-bold">{format(value)} <span className="text-xs font-medium">{unit}</span></p></div>)}</div>
                <p className="mt-3 text-xs text-muted-foreground">Deflection utilization: {format(designResult.deflectionUtilization)}× · Model: {designResult.model}</p>
                <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-50/50 p-4 text-xs leading-relaxed text-amber-900 dark:bg-amber-950/20 dark:text-amber-200"><b>Scope limitations</b><ul className="mt-2 list-disc space-y-1 pl-4">{designResult.exclusions.map((note) => <li key={note}>{note}</li>)}</ul></div>
              </> : <p className="mt-5 rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">Enter a complete design basis and run the check. No default material properties, code loads or safety factors are assumed.</p>}
            </aside>
          </section>
        )}
      </Container>
    </>
  );
}
