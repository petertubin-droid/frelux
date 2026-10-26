import SaveToProjectButton from "@/components/calculators/SaveToProjectButton";
import { printQuote } from "@/lib/estimation/quote-export";
import { useState, useCallback, useEffect, useMemo, useId } from "react";
import { useSeo } from "@/lib/seo";
import {
  designBeam,
  designColumn,
  designSlab,
  getConcreteStandardForMarket,
  getConcreteGradeOptions,
  type BeamDesignInput,
  type ColumnDesignInput,
  type SlabDesignInput,
  type ConcreteGrade,
  type SteelGrade,
  type SupportCondition,
  type BeamType,
  type SlabType,
} from "@/lib/engineering/structural-calculator";
import { useMarket } from "@/lib/international/market-context";
import { DimensionalInput } from "@/components/measurement/DimensionalInput";
import { parseDimensionalInput } from "@/lib/globalization/dimensional-parser";
import type { ExtendedLengthUnit } from "@/lib/measurement/extended-units";
import {
  calculateConcreteTakeoff,
  type ConcreteTakeoffResult,
  type RebarBarGroup,
} from "@/lib/estimation/advanced-takeoff-engine";
import {
  Calculator,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Ruler,
  Layers,
  TrendingUp,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { SubscriptionGate } from "@/components/subscription/SubscriptionGate";
import { RelatedTools, CALC_LINKS } from "@/components/seo/SeoSections";
import RelatedToolsLinks from "@/components/ui/RelatedToolsLinks";
import { monitoredCalc } from "@/lib/calculator-monitor";
import { Button } from "@/components/ui/shadcn/button";
import EngineerReviewBadge from "@/components/EngineerReviewBadge";

type Tab = "beam" | "column" | "slab" | "concrete";

// Printable engineering design sheet: full results, checks,
// formula transparency and warnings for a beam/column/slab run.
function exportDesignSheet(args: {
  kind: "Beam" | "Column" | "Slab";
  title: string;
  metaRows: Array<[string, string]>;
  checks: Array<{ label: string; pass: boolean }>;
  formulas: string[];
  warnings: string[];
}) {
  printQuote(
    {
      title: `FRELUX ${args.kind} Design Sheet`,
      subtitle: `Generated ${new Date().toLocaleDateString()} · ${args.title}`,
      metaRows: [
        ...args.metaRows,
        [
          "Basis",
          "Simplified preliminary calculations; no code-compliance certification",
        ],
      ],
      lines: args.checks.map((c) => ({
        label: c.label,
        quantity: c.pass ? "PASS" : "FAIL",
        unit: "check",
        unit_price: "-",
        line_total: c.pass ? "PASS" : "FAIL",
      })),
      totals: [
        {
          label: "Checks passed",
          value: `${args.checks.filter((c) => c.pass).length}/${args.checks.length}`,
          strong: true,
        },
      ],
      warnings: args.warnings,
      steps: args.formulas.map((f, i) => ({
        label: `Step ${i + 1}`,
        detail: f,
      })),
      footer:
        "Preliminary screening and quantity-planning output only. FRELUX does not certify compliance with BS 8110, Eurocodes, ACI, IS 456, or any jurisdictional building code. Concrete-grade profiles do not mean the full design method for that code is implemented. A locally licensed structural engineer must independently verify the design using current applicable codes, project drawings, load combinations, material data, and site investigations before use or construction.",
    },
    `frelux-${args.kind.toLowerCase()}-design-sheet.html`,
  );
}

export default function StructuralCalculator() {
  useSeo({
    title: "Structural Calculator | FRELUX",
    description:
      "Preliminary beam, column, and slab sizing estimates with formula transparency. Not a certified structural design or code-compliance check.",
    keywords:
      "structural calculator, beam design, column design, slab design, structural engineering",
  });

  const [tab, setTab] = useState<Tab>("beam");

  return (
    <SubscriptionGate feature="structural_calculator">
      <PageHeader
        variant="tool"
        eyebrow="Engineering Tool"
        title="Structural Engineering Calculator"
        subtitle="Preliminary beam, column, and slab sizing estimates with formula transparency. Concrete grade profiles are available for selected standards, but this tool does not implement or certify full jurisdictional code compliance. A locally licensed structural engineer must verify designs before use or construction."
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: "Calculators", path: "/calculators" },
          { label: "Structural Calculator" },
        ]}
      />

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6">
        {/* Tabs */}
        <div className="mb-6 inline-flex flex-wrap rounded-xl border border-border bg-card p-1 dark:border-white/10 dark:bg-card">
          {(
            [
              { id: "beam", label: "Beam Design", icon: Ruler },
              { id: "column", label: "Column Design", icon: Layers },
              { id: "slab", label: "Slab Design", icon: TrendingUp },
              { id: "concrete", label: "Concrete Takeoff", icon: Calculator },
            ] as const
          ).map((t) => (
            <Button
              variant="ghost"
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                tab === t.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground dark:hover:bg-white/5 dark:hover:text-primary-foreground"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </Button>
          ))}
        </div>

        {tab === "beam" && <BeamCalculator />}
        {tab === "column" && <ColumnCalculator />}
        {tab === "slab" && <SlabCalculator />}
        {tab === "concrete" && <ConcreteTakeoffCalculator />}

        {/* Disclaimer */}
        <div className="mt-8 rounded-2xl border border-amber-200/80 bg-amber-50/50 p-5 dark:border-amber-500/20 dark:bg-amber-500/5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">
                Professional Disclaimer
              </p>
              <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-400 mt-1.5">
                Preliminary screening and budget-planning only. Concrete-grade
                profiles do not mean the full design provisions of Eurocode, BS
                8110, ACI 318, IS 456, or local amendments are implemented. This
                tool does not certify code compliance or produce construction
                designs. A locally licensed structural engineer must
                independently verify loads, combinations, detailing, materials,
                drawings, site conditions, and current jurisdictional
                requirements before use.
              </p>
            </div>
          </div>
        </div>
      </div>
    </SubscriptionGate>
  );
}

// ── Concrete quantity takeoff (separate from structural design) ──

export function ConcreteTakeoffCalculator() {
  const [elementType, setElementType] = useState<
    "slab" | "beam" | "column" | "footing"
  >("slab");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [depth, setDepth] = useState("");
  const [cement, setCement] = useState("");
  const [sand, setSand] = useState("");
  const [aggregate, setAggregate] = useState("");
  const [waste, setWaste] = useState("0");
  const [bagMass, setBagMass] = useState("50");
  const [bars, setBars] = useState<
    Array<{ label: string; diameterMm: string; count: string; lengthM: string }>
  >([]);
  const [result, setResult] = useState<ConcreteTakeoffResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const { market, preferredLengthUnit } = useMarket();
  const [dimensionUnit, setDimensionUnit] =
    useState<ExtendedLengthUnit>(preferredLengthUnit);
  useEffect(() => {
    setDimensionUnit(preferredLengthUnit);
  }, [market.marketCode, preferredLengthUnit]);
  const calculate = () => {
    const parsedDimensions = [length, width, depth].map((value) =>
      parseDimensionalInput(value, {
        defaultUnit: dimensionUnit,
        minMm: 0.000001,
        maxMm: 1_000_000_000,
      }),
    );
    const dimensionErrors = parsedDimensions.flatMap((parsed, index) =>
      parsed.ok
        ? []
        : [`${["Length", "Width", "Depth"][index]}: ${parsed.errors[0]}`],
    );
    if (dimensionErrors.length) {
      setErrors(dimensionErrors);
      setResult(null);
      return;
    }
    const [lengthParsed, widthParsed, depthParsed] = parsedDimensions;
    if (!lengthParsed.ok || !widthParsed.ok || !depthParsed.ok) return;
    const scheduled: RebarBarGroup[] = bars.map((bar) => ({
      label: bar.label,
      diameterMm: Number(bar.diameterMm),
      count: Number(bar.count),
      lengthM: Number(bar.lengthM),
    }));
    const response = calculateConcreteTakeoff({
      elementType,
      lengthM: lengthParsed.millimeters / 1000,
      widthM: widthParsed.millimeters / 1000,
      depthM: depthParsed.millimeters / 1000,
      cementParts: Number(cement),
      sandParts: Number(sand),
      aggregateParts: Number(aggregate),
      wastePercent: Number(waste),
      cementBagMassKg: Number(bagMass),
      rebarGroups: scheduled,
    });
    setErrors(response.errors);
    setResult(response.data);
  };
  const field = (
    label: string,
    value: string,
    set: (value: string) => void,
    placeholder: string,
    min = "0",
  ) => (
    <label className="grid gap-1 text-sm font-medium">
      {label}
      <input
        aria-label={label}
        className="input-field"
        type="number"
        min={min}
        step="any"
        value={value}
        onChange={(e) => set(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
  const dimensionField = (
    label: string,
    value: string,
    set: (value: string) => void,
  ) => (
    <DimensionalInput
      label={label}
      value={value}
      onValueChange={set}
      unit={dimensionUnit}
      onUnitChange={setDimensionUnit}
      minMm={0.000001}
      maxMm={1_000_000_000}
    />
  );
  return (
    <div className="space-y-6">
      <div className="card p-5 sm:p-7">
        <h2 className="text-xl font-bold">Measured concrete quantities</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Rectangular element quantity takeoff only. It does not size or design
          structural elements. Measurements accept metric or imperial units;
          bare values use the selected default unit.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="grid gap-1 text-sm font-medium">
            Concrete element type
            <select
              aria-label="Concrete element type"
              className="input-field"
              value={elementType}
              onChange={(e) =>
                setElementType(e.target.value as typeof elementType)
              }
            >
              <option value="slab">Slab</option>
              <option value="beam">Rectangular beam segment</option>
              <option value="column">Rectangular column segment</option>
              <option value="footing">Rectangular pad footing</option>
            </select>
          </label>
          {dimensionField(
            `${elementType === "column" ? "Column height" : elementType === "beam" ? "Beam length" : elementType === "footing" ? "Footing length" : "Slab length"}`,
            length,
            setLength,
          )}
          {dimensionField(
            `${elementType === "column" ? "Column side A" : elementType === "beam" ? "Beam width" : elementType === "footing" ? "Footing width" : "Slab width"}`,
            width,
            setWidth,
          )}
          {dimensionField(
            `${elementType === "column" ? "Column side B" : elementType === "beam" ? "Beam depth" : elementType === "footing" ? "Footing depth" : "Slab thickness"}`,
            depth,
            setDepth,
          )}
          {field("Mix cement parts", cement, setCement, "Specified mix")}
          {field("Mix sand parts", sand, setSand, "Specified mix")}
          {field(
            "Mix coarse aggregate parts",
            aggregate,
            setAggregate,
            "Specified mix",
          )}
          {field(
            "Additional concrete allowance (%)",
            waste,
            setWaste,
            "Enter allowance",
          )}
          {field(
            "Cement bag size (kg)",
            bagMass,
            setBagMass,
            "Enter local bag size",
            "0.1",
          )}
        </div>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">
              Rebar schedule (optional)
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Only calculated from a supplied engineer/drawing schedule. No
              reinforcement design is inferred.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() =>
              setBars((items) => [
                ...items,
                { label: "", diameterMm: "", count: "", lengthM: "" },
              ])
            }
          >
            + Add bar group
          </Button>
        </div>
        {bars.map((bar, i) => (
          <div
            key={i}
            className="mt-3 grid gap-3 rounded-xl bg-muted/40 p-3 sm:grid-cols-4"
          >
            {(
              [
                ["label", "Schedule label"],
                ["diameterMm", "Bar diameter (mm)"],
                ["count", "Bar count"],
                ["lengthM", "Length per bar (m)"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="grid gap-1 text-xs font-medium text-muted-foreground"
              >
                {label}
                <input
                  aria-label={`${label} ${i + 1}`}
                  className="input-field"
                  type={key === "label" ? "text" : "number"}
                  min="0"
                  step="any"
                  value={bar[key]}
                  onChange={(e) =>
                    setBars((items) =>
                      items.map((item, j) =>
                        j === i ? { ...item, [key]: e.target.value } : item,
                      ),
                    )
                  }
                />
              </label>
            ))}
            <button
              type="button"
              className="text-left text-xs text-destructive"
              onClick={() =>
                setBars((items) => items.filter((_, j) => j !== i))
              }
            >
              Remove bar group
            </button>
          </div>
        ))}
        <Button className="mt-5" onClick={calculate}>
          Calculate concrete takeoff
        </Button>
        {errors.length > 0 && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-amber-500/40 bg-amber-50/60 p-4 text-sm text-amber-900 dark:bg-amber-950/20 dark:text-amber-200"
          >
            {errors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        )}
      </div>
      {result && (
        <div className="card-elevated p-5 sm:p-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wider text-primary">
              Material quantity schedule
            </p>
            <EngineerReviewBadge />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              [
                `Wet ${result.elementType} volume`,
                `${result.concreteVolumeM3.toFixed(3)} m³`,
              ],
              [
                "Wet volume with allowance",
                `${result.volumeWithWasteM3.toFixed(3)} m³`,
              ],
              ["Cement", `${result.cementBagsToBuy} whole ${bagMass} kg bags`],
              ["Sand", `${result.sandM3.toFixed(3)} m³`],
              ["Coarse aggregate", `${result.aggregateM3.toFixed(3)} m³`],
              [
                "Rebar weight",
                result.rebarWeightKg === null
                  ? "Not calculated: add an engineer's schedule"
                  : `${result.rebarWeightKg.toFixed(2)} kg (${(result.rebarWeightKg / 1000).toFixed(4)} t)`,
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-border bg-card p-4"
              >
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Mix ratio {result.mixParts.join(":")} · unrounded cement calculation{" "}
            {result.cementBagsRaw.toFixed(2)} bags
          </p>
          <ul className="mt-4 space-y-2 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
            {result.assumptions.map((note) => (
              <li key={note}>• {note}</li>
            ))}
          </ul>
          <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-50/50 p-3 text-xs text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
            Quantity estimating only. Rectangular dimensions, concrete mix and
            reinforcement must match the project specification and qualified
            engineer's schedule. Irregular elements and combined pours are not
            modeled.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Beam Calculator ──

function BeamCalculator() {
  const [span, setSpan] = useState(4.5);
  const [beamType, setBeamType] = useState<BeamType>("suspended_beam");
  const [support, setSupport] = useState<SupportCondition>("simply_supported");
  const [liveLoad, setLiveLoad] = useState(2.0);
  const [deadLoad, setDeadLoad] = useState(3.0);
  const [tribWidth, setTribWidth] = useState(3.0);

  const { market } = useMarket();
  const concreteStandard = useMemo(
    () => getConcreteStandardForMarket(market.marketCode),
    [market.marketCode],
  );
  const concreteOptions = useMemo(
    () => getConcreteGradeOptions(market.marketCode),
    [market.marketCode],
  );

  const [concreteGrade, setConcreteGrade] = useState<ConcreteGrade>(
    () => concreteStandard.defaultGrade as ConcreteGrade,
  );
  const [steelGrade, setSteelGrade] = useState<SteelGrade>("Fe500");
  const [cover, setCover] = useState(25);
  const [result, setResult] = useState<ReturnType<typeof designBeam> | null>(
    null,
  );
  const [showFormulas, setShowFormulas] = useState(false);

  useEffect(() => {
    setConcreteGrade(concreteStandard.defaultGrade as ConcreteGrade);
  }, [market.marketCode, concreteStandard.defaultGrade]);

  const calculate = useCallback(() => {
    const input: BeamDesignInput = {
      span,
      beam_type: beamType,
      support_condition: support,
      live_load: liveLoad,
      dead_load: deadLoad,
      tributary_width: tribWidth,
      concrete_grade: concreteGrade,
      steel_grade: steelGrade,
      cover_mm: cover,
      market_code: market.marketCode,
    };
    setResult(monitoredCalc("Structural Calculator", () => designBeam(input)));
  }, [
    span,
    beamType,
    support,
    liveLoad,
    deadLoad,
    tribWidth,
    concreteGrade,
    steelGrade,
    cover,
    market.marketCode,
  ]);

  if (!result) {
    calculate();
  }

  return (
    <div className="space-y-6">
      <div className="card p-6 sm:p-8 dark:border-white/5 dark:bg-card">
        <InputGrid>
          <NumInput
            label="Span (m)"
            value={span}
            onChange={setSpan}
            step="0.1"
          />
          <SelectInput
            label="Beam type"
            value={beamType}
            onChange={(v) => setBeamType(v as BeamType)}
            options={[
              { v: "ground_beam", l: "Ground Beam" },
              { v: "suspended_beam", l: "Suspended Beam" },
              { v: "ring_beam", l: "Ring Beam" },
              { v: "lintel", l: "Lintel" },
            ]}
          />
          <SelectInput
            label="Support condition"
            value={support}
            onChange={(v) => setSupport(v as SupportCondition)}
            options={[
              { v: "simply_supported", l: "Simply Supported" },
              { v: "fixed", l: "Fixed Ends" },
              { v: "continuous", l: "Continuous" },
              { v: "cantilever", l: "Cantilever" },
            ]}
          />
          <NumInput
            label="Live load (kN/m²)"
            value={liveLoad}
            onChange={setLiveLoad}
            step="0.5"
          />
          <NumInput
            label="Dead load (kN/m²)"
            value={deadLoad}
            onChange={setDeadLoad}
            step="0.5"
          />
          <NumInput
            label="Tributary width (m)"
            value={tribWidth}
            onChange={setTribWidth}
            step="0.5"
          />
          <SelectInput
            label={`Concrete grade (${concreteStandard.name})`}
            value={concreteGrade}
            onChange={(v) => setConcreteGrade(v as ConcreteGrade)}
            options={concreteOptions}
          />
          <SelectInput
            label="Steel grade"
            value={steelGrade}
            onChange={(v) => setSteelGrade(v as SteelGrade)}
            options={[
              { v: "Fe410", l: "Fe410 (410 MPa)" },
              { v: "Fe500", l: "Fe500 (500 MPa)" },
            ]}
          />
          <NumInput
            label="Cover (mm)"
            value={cover}
            onChange={setCover}
            step="5"
          />
        </InputGrid>

        <Button
          variant="default"
          onClick={calculate}
          className="btn-glow press-scale inline-flex items-center gap-2 px-6 py-3"
        >
          <Calculator aria-hidden="true" className="w-4 h-4" /> Calculate Beam
        </Button>
      </div>

      {result && (
        <ResultCard>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <StatBox
              label="Recommended Size"
              value={`${result.recommended_width} × ${result.recommended_depth}`}
              unit="mm"
            />
            <StatBox
              label="Main Bars"
              value={`${result.recommended_bar_count}Y${result.recommended_bar_diameter}`}
              unit=""
            />
            <StatBox
              label="Links"
              value={`Y${result.link_diameter} @ ${result.link_spacing}mm`}
              unit=""
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <CheckRow
              label="Shear Check"
              pass={result.shear_check_pass}
              value={`${result.shear_capacity} kN ≥ ${result.max_shear.toFixed(1)} kN`}
            />
            <CheckRow
              label="Deflection Check"
              pass={result.deflection_check_pass}
              value={`L/d = ${result.span_to_depth_ratio}`}
            />
          </div>

          <div className="grid md:grid-cols-3 gap-3 text-sm">
            <DetailItem
              label="Design load"
              value={`${result.factored_load.toFixed(2)} kN/m`}
            />
            <DetailItem
              label="Max moment"
              value={`${result.max_moment.toFixed(2)} kN·m`}
            />
            <DetailItem
              label="Max shear"
              value={`${result.max_shear.toFixed(2)} kN`}
            />
            <DetailItem
              label="Steel area"
              value={`${result.area_steel_required} mm²`}
            />
            <DetailItem
              label="Min steel"
              value={`${result.min_steel_area} mm²`}
            />
            <DetailItem
              label="Effective span"
              value={`${result.effective_span.toFixed(2)} m`}
            />
          </div>

          {result.warnings.length > 0 && (
            <WarningList warnings={result.warnings} />
          )}

          <FormulaToggle
            show={showFormulas}
            setShow={setShowFormulas}
            formulas={result.formula_transparency}
          />
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() =>
                result &&
                exportDesignSheet({
                  kind: "Beam",
                  title: `${result.recommended_width}×${result.recommended_depth}mm`,
                  metaRows: [
                    [
                      "Recommended size",
                      `${result.recommended_width}×${result.recommended_depth}mm`,
                    ],
                    ["Effective span", `${result.effective_span.toFixed(2)} m`],
                    ["Factored load", `${result.factored_load} kN/m`],
                    ["Max moment", `${result.max_moment} kNm`],
                    [
                      "Steel area required",
                      `${result.area_steel_required} mm²`,
                    ],
                  ],
                  checks: [
                    { label: "Shear check", pass: result.shear_check_pass },
                    {
                      label: "Deflection check",
                      pass: result.deflection_check_pass,
                    },
                  ],
                  formulas: result.formula_transparency,
                  warnings: result.warnings,
                })
              }
              className="rounded-lg border px-4 py-2 text-sm font-semibold"
            >
              Export design sheet (PDF)
            </button>
            <SaveToProjectButton
              calculatorType="structural"
              calculatorSlug="beam-design-calculator"
              calcTitle={`Beam: ${result.recommended_width}×${result.recommended_depth}mm`}
              calcData={result}
              resultSummary={{
                type: "beam",
                recommended_width: result.recommended_width,
                recommended_depth: result.recommended_depth,
                shear_check_pass: result.shear_check_pass,
                deflection_check_pass: result.deflection_check_pass,
                factored_load: result.factored_load,
                max_moment: result.max_moment,
                area_steel_required: result.area_steel_required,
              }}
              compact
              label="Save to Project Workspace"
            />
          </div>
        </ResultCard>
      )}
      <RelatedTools
        links={[
          CALC_LINKS.foundationCalc,
          CALC_LINKS.buildToRoof,
          CALC_LINKS.constructionSeq,
          CALC_LINKS.imageEstimator,
          CALC_LINKS.buildToRoof,
        ]}
      />
      <RelatedToolsLinks />
    </div>
  );
}

// ── Column Calculator ──

function ColumnCalculator() {
  const [axialLoad, setAxialLoad] = useState(200);
  const [height, setHeight] = useState(3.0);

  const { market } = useMarket();
  const concreteStandard = useMemo(
    () => getConcreteStandardForMarket(market.marketCode),
    [market.marketCode],
  );
  const concreteOptions = useMemo(
    () => getConcreteGradeOptions(market.marketCode),
    [market.marketCode],
  );

  const [concreteGrade, setConcreteGrade] = useState<ConcreteGrade>(
    () => concreteStandard.defaultGrade as ConcreteGrade,
  );
  const [steelGrade, setSteelGrade] = useState<SteelGrade>("Fe500");
  const [cover, setCover] = useState(25);
  const [isRect, setIsRect] = useState(true);
  const [result, setResult] = useState<ReturnType<typeof designColumn> | null>(
    null,
  );
  const [showFormulas, setShowFormulas] = useState(false);

  useEffect(() => {
    setConcreteGrade(concreteStandard.defaultGrade as ConcreteGrade);
  }, [market.marketCode, concreteStandard.defaultGrade]);

  const calculate = useCallback(() => {
    const input: ColumnDesignInput = {
      axial_load: axialLoad,
      height,
      concrete_grade: concreteGrade,
      steel_grade: steelGrade,
      cover_mm: cover,
      market_code: market.marketCode,
      is_rectangular: isRect,
      unbraced_height_ratio: 0,
    };
    setResult(
      monitoredCalc("Structural Calculator", () => designColumn(input)),
    );
  }, [axialLoad, height, concreteGrade, steelGrade, cover, isRect]);

  if (!result) calculate();

  return (
    <div className="space-y-6">
      <div className="card p-6 sm:p-8 dark:border-white/5 dark:bg-card">
        <InputGrid>
          <NumInput
            label="Axial load (kN)"
            value={axialLoad}
            onChange={setAxialLoad}
            step="10"
          />
          <NumInput
            label="Height (m)"
            value={height}
            onChange={setHeight}
            step="0.1"
          />
          <SelectInput
            label={`Concrete grade (${concreteStandard.name})`}
            value={concreteGrade}
            onChange={(v) => setConcreteGrade(v as ConcreteGrade)}
            options={concreteOptions}
          />
          <SelectInput
            label="Steel grade"
            value={steelGrade}
            onChange={(v) => setSteelGrade(v as SteelGrade)}
            options={[
              { v: "Fe410", l: "Fe410 (410 MPa)" },
              { v: "Fe500", l: "Fe500 (500 MPa)" },
            ]}
          />
          <NumInput
            label="Cover (mm)"
            value={cover}
            onChange={setCover}
            step="5"
          />
          <SelectInput
            label="Section shape"
            value={isRect ? "rect" : "circular"}
            onChange={(v) => setIsRect(v === "rect")}
            options={[
              { v: "rect", l: "Rectangular" },
              { v: "circular", l: "Circular" },
            ]}
          />
        </InputGrid>

        <Button
          variant="default"
          onClick={calculate}
          className="btn-glow press-scale inline-flex items-center gap-2 px-6 py-3"
        >
          <Calculator aria-hidden="true" className="w-4 h-4" /> Calculate Column
        </Button>
      </div>

      {result && (
        <ResultCard>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <StatBox
              label={isRect ? "Section Size" : "Diameter"}
              value={`${result.recommended_width} × ${result.recommended_depth}`}
              unit="mm"
            />
            <StatBox
              label="Main Bars"
              value={`${result.recommended_bar_count}Y${result.recommended_bar_diameter}`}
              unit=""
            />
            <StatBox
              label="Links"
              value={`Y${result.link_diameter} @ ${result.link_spacing}mm`}
              unit=""
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <CheckRow
              label="Capacity Check"
              pass={result.capacity_check_pass}
              value={`${result.load_capacity} kN ≥ ${result.factored_load.toFixed(1)} kN`}
            />
            <CheckRow
              label="Slenderness"
              pass={result.slenderness_check}
              value={
                result.short_or_slender === "short"
                  ? "Short column ✓"
                  : "Slender, needs detailed analysis"
              }
            />
          </div>

          <div className="grid md:grid-cols-3 gap-3 text-sm">
            <DetailItem
              label="Factored load"
              value={`${result.factored_load.toFixed(1)} kN`}
            />
            <DetailItem
              label="Required area"
              value={`${result.required_area} mm²`}
            />
            <DetailItem label="Steel ratio" value={`${result.steel_ratio}%`} />
            <DetailItem
              label="Min ratio"
              value={`${result.min_steel_ratio}%`}
            />
            <DetailItem
              label="Max ratio"
              value={`${result.max_steel_ratio}%`}
            />
            <DetailItem
              label="Load capacity"
              value={`${result.load_capacity} kN`}
            />
          </div>

          {result.warnings.length > 0 && (
            <WarningList warnings={result.warnings} />
          )}
          <FormulaToggle
            show={showFormulas}
            setShow={setShowFormulas}
            formulas={result.formula_transparency}
          />
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() =>
                result &&
                exportDesignSheet({
                  kind: "Column",
                  title: `${result.required_area}mm² required area`,
                  metaRows: [
                    ["Required area", `${result.required_area} mm²`],
                    ["Steel ratio", `${result.steel_ratio}%`],
                    ["Max steel ratio", `${result.max_steel_ratio}%`],
                    ["Load capacity", `${result.load_capacity} kN`],
                    ["Factored load", `${result.factored_load} kN`],
                  ],
                  checks: [
                    {
                      label: "Capacity vs factored load",
                      pass: result.load_capacity >= result.factored_load,
                    },
                  ],
                  formulas: result.formula_transparency,
                  warnings: result.warnings,
                })
              }
              className="rounded-lg border px-4 py-2 text-sm font-semibold"
            >
              Export design sheet (PDF)
            </button>
            <SaveToProjectButton
              calculatorType="structural"
              calculatorSlug="column-design-calculator"
              calcTitle={`Column: ${result.required_area}mm² area`}
              calcData={result}
              resultSummary={{
                type: "column",
                required_area: result.required_area,
                steel_ratio: result.steel_ratio,
                load_capacity: result.load_capacity,
                factored_load: result.factored_load,
              }}
              compact
              label="Save to Project Workspace"
            />
          </div>
        </ResultCard>
      )}
    </div>
  );
}

// ── Slab Calculator ──

function SlabCalculator() {
  const [spanX, setSpanX] = useState(4.0);
  const [spanY, setSpanY] = useState(6.0);
  const [slabType, setSlabType] = useState<SlabType>("one_way");
  const [support, setSupport] = useState<SupportCondition>("simply_supported");
  const [liveLoad, setLiveLoad] = useState(2.0);
  const [deadLoad, setDeadLoad] = useState(1.5);

  const { market } = useMarket();
  const concreteStandard = useMemo(
    () => getConcreteStandardForMarket(market.marketCode),
    [market.marketCode],
  );
  const concreteOptions = useMemo(
    () => getConcreteGradeOptions(market.marketCode),
    [market.marketCode],
  );

  const [concreteGrade, setConcreteGrade] = useState<ConcreteGrade>(
    () => concreteStandard.defaultGrade as ConcreteGrade,
  );
  const [steelGrade, setSteelGrade] = useState<SteelGrade>("Fe500");
  const [cover, setCover] = useState(20);
  const [result, setResult] = useState<ReturnType<typeof designSlab> | null>(
    null,
  );
  const [showFormulas, setShowFormulas] = useState(false);

  useEffect(() => {
    setConcreteGrade(concreteStandard.defaultGrade as ConcreteGrade);
  }, [market.marketCode, concreteStandard.defaultGrade]);

  const calculate = useCallback(() => {
    const input: SlabDesignInput = {
      span_x: spanX,
      span_y: spanY,
      slab_type: slabType,
      support_condition: support,
      live_load: liveLoad,
      dead_load: deadLoad,
      concrete_grade: concreteGrade,
      steel_grade: steelGrade,
      cover_mm: cover,
      market_code: market.marketCode,
    };
    setResult(monitoredCalc("Structural Calculator", () => designSlab(input)));
  }, [
    spanX,
    spanY,
    slabType,
    support,
    liveLoad,
    deadLoad,
    concreteGrade,
    steelGrade,
    cover,
    market.marketCode,
  ]);

  if (!result) calculate();

  return (
    <div className="space-y-6">
      <div className="card p-6 sm:p-8 dark:border-white/5 dark:bg-card">
        <InputGrid>
          <NumInput
            label="Short span (m)"
            value={spanX}
            onChange={setSpanX}
            step="0.1"
          />
          <NumInput
            label="Long span (m)"
            value={spanY}
            onChange={setSpanY}
            step="0.1"
          />
          <SelectInput
            label="Slab type"
            value={slabType}
            onChange={(v) => setSlabType(v as SlabType)}
            options={[
              { v: "one_way", l: "One-way" },
              { v: "two_way", l: "Two-way" },
              { v: "cantilever_slab", l: "Cantilever" },
            ]}
          />
          <SelectInput
            label="Support condition"
            value={support}
            onChange={(v) => setSupport(v as SupportCondition)}
            options={[
              { v: "simply_supported", l: "Simply Supported" },
              { v: "fixed", l: "Fixed" },
              { v: "continuous", l: "Continuous" },
              { v: "cantilever", l: "Cantilever" },
            ]}
          />
          <NumInput
            label="Live load (kN/m²)"
            value={liveLoad}
            onChange={setLiveLoad}
            step="0.5"
          />
          <NumInput
            label="Dead load (kN/m²)"
            value={deadLoad}
            onChange={setDeadLoad}
            step="0.5"
          />
          <SelectInput
            label={`Concrete grade (${concreteStandard.name})`}
            value={concreteGrade}
            onChange={(v) => setConcreteGrade(v as ConcreteGrade)}
            options={concreteOptions}
          />
          <SelectInput
            label="Steel grade"
            value={steelGrade}
            onChange={(v) => setSteelGrade(v as SteelGrade)}
            options={[
              { v: "Fe410", l: "Fe410" },
              { v: "Fe500", l: "Fe500" },
            ]}
          />
          <NumInput
            label="Cover (mm)"
            value={cover}
            onChange={setCover}
            step="5"
          />
        </InputGrid>

        <Button
          variant="default"
          onClick={calculate}
          className="btn-glow press-scale inline-flex items-center gap-2 px-6 py-3"
        >
          <Calculator aria-hidden="true" className="w-4 h-4" /> Calculate Slab
        </Button>
      </div>

      {result && (
        <ResultCard>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <StatBox
              label="Thickness"
              value={`${result.recommended_thickness}`}
              unit="mm"
            />
            <StatBox
              label="Main Bars"
              value={`Y${result.recommended_bar_diameter} @ ${result.recommended_bar_spacing}mm c/c`}
              unit=""
            />
            <StatBox
              label="Total Load"
              value={`${result.total_load}`}
              unit="kN/m²"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <CheckRow
              label="Deflection Check"
              pass={result.deflection_check_pass}
              value={`L/d = ${result.span_to_depth_ratio}`}
            />
            <CheckRow
              label="Shear"
              pass={result.link_check.includes("No shear")}
              value={result.link_check}
            />
          </div>

          <div className="grid md:grid-cols-3 gap-3 text-sm">
            <DetailItem
              label="Self weight"
              value={`${result.self_weight} kN/m²`}
            />
            <DetailItem
              label="Max moment"
              value={`${result.max_moment} kN·m/m`}
            />
            <DetailItem label="Max shear" value={`${result.max_shear} kN/m`} />
            <DetailItem
              label="Steel area"
              value={`${result.steel_area_required} mm²/m`}
            />
            <DetailItem
              label="Required thickness"
              value={`${result.required_thickness} mm`}
            />
            <DetailItem
              label="Slab type"
              value={result.slab_type.replace(/_/g, " ")}
            />
          </div>

          {result.warnings.length > 0 && (
            <WarningList warnings={result.warnings} />
          )}
          <FormulaToggle
            show={showFormulas}
            setShow={setShowFormulas}
            formulas={result.formula_transparency}
          />
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() =>
                result &&
                exportDesignSheet({
                  kind: "Slab",
                  title: `${result.required_thickness}mm (${result.slab_type.replace(/_/g, " ")})`,
                  metaRows: [
                    ["Required thickness", `${result.required_thickness} mm`],
                    ["Slab type", result.slab_type.replace(/_/g, " ")],
                    ["Max moment", `${result.max_moment} kNm/m`],
                    ["Max shear", `${result.max_shear} kN/m`],
                    [
                      "Steel area required",
                      `${result.steel_area_required} mm²/m`,
                    ],
                  ],
                  checks: [
                    {
                      label: "Thickness vs span",
                      pass: result.required_thickness > 0,
                    },
                  ],
                  formulas: result.formula_transparency,
                  warnings: result.warnings,
                })
              }
              className="rounded-lg border px-4 py-2 text-sm font-semibold"
            >
              Export design sheet (PDF)
            </button>
            <SaveToProjectButton
              calculatorType="structural"
              calculatorSlug="slab-design-calculator"
              calcTitle={`Slab: ${result.required_thickness}mm (${result.slab_type.replace(/_/g, " ")})`}
              calcData={result}
              resultSummary={{
                type: "slab",
                required_thickness: result.required_thickness,
                steel_area_required: result.steel_area_required,
                slab_type: result.slab_type,
                max_moment: result.max_moment,
                max_shear: result.max_shear,
              }}
              compact
              label="Save to Project Workspace"
            />
          </div>
        </ResultCard>
      )}
    </div>
  );
}

// ── Shared UI components ──

function InputGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{children}</div>
  );
}

function NumInput({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: string;
}) {
  const fieldId = useId();
  return (
    <div>
      <label
        htmlFor={fieldId}
        className="text-xs font-medium text-muted-foreground mb-1 block"
      >
        {label}
      </label>
      <input
        id={fieldId}
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="input-field"
      />
    </div>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  const fieldId = useId();
  return (
    <div>
      <label
        htmlFor={fieldId}
        className="text-xs font-medium text-muted-foreground mb-1 block"
      >
        {label}
      </label>
      <select
        id={fieldId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field"
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </select>
    </div>
  );
}

function ResultCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="card-elevated p-6 sm:p-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Preliminary member analysis only · excludes material takeoff and
          project-wide design coordination
        </p>
        <EngineerReviewBadge />
      </div>
      {children}
    </div>
  );
}

function StatBox({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-purple/20 bg-gradient-to-br from-primary/5 to-primary/10 p-5 dark:border-brand-purple/30">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
      <p className="relative text-xs font-medium text-muted-foreground mb-1.5">
        {label}
      </p>
      <p className="relative text-xl font-bold text-foreground dark:text-primary-foreground">
        {value}{" "}
        {unit && (
          <span className="text-sm font-normal text-muted-foreground">
            {unit}
          </span>
        )}
      </p>
    </div>
  );
}

function CheckRow({
  label,
  pass,
  value,
}: {
  label: string;
  pass: boolean;
  value: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl p-4 ${pass ? "bg-emerald-50 dark:bg-emerald-500/5" : "bg-red-50 dark:bg-red-500/5"}`}
    >
      {pass ? (
        <CheckCircle2
          aria-hidden="true"
          className="w-5 h-5 text-emerald-500 shrink-0"
        />
      ) : (
        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
      )}
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground dark:text-primary-foreground">
          {value}
        </p>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border/50 py-2 dark:border-white/5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground dark:text-primary-foreground">
        {value}
      </span>
    </div>
  );
}

function WarningList({ warnings }: { warnings: string[] }) {
  return (
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-500/20 dark:bg-amber-500/5">
      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2">
        ⚠️ Warnings
      </p>
      <ul className="space-y-1.5">
        {warnings.map((w, i) => (
          <li
            key={i}
            className="text-xs leading-relaxed text-amber-600 dark:text-amber-400"
          >
            • {w}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FormulaToggle({
  show,
  setShow,
  formulas,
}: {
  show: boolean;
  setShow: (v: boolean) => void;
  formulas: string[];
}) {
  return (
    <div className="mt-4">
      <Button
        variant="ghost"
        onClick={() => setShow(!show)}
        className="text-xs font-medium text-brand-purple hover:text-brand-purple-dark flex items-center gap-1.5 transition-colors"
      >
        {show ? (
          <ChevronDown aria-hidden="true" className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
        {show ? "Hide" : "Show"} calculation formulas
      </Button>
      {show && (
        <div className="mt-3 overflow-hidden rounded-xl bg-background p-5 dark:bg-black/40 space-y-1">
          {formulas.map((f, i) => (
            <p
              key={i}
              className="text-xs font-mono text-emerald-400 leading-relaxed"
            >
              {f}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
