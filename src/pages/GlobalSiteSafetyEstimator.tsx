import { methodologyText } from "@/lib/calculatorMethodology";
import HowCalculatedSection from "@/components/calculators/HowCalculatedSection";
import CalculatorResetButton from "@/components/calculators/CalculatorResetButton";
import EstimateDisclaimer from "@/components/calculators/EstimateDisclaimer";
import AdSlot from "@/components/ui/AdSlot";
import { ShareEstimateButton } from "@/components/ShareEstimateButton";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSeo, useBreadcrumbJsonLd } from "@/lib/seo";
import { siteUrl } from "@/lib/site-config";
import {
  calculateSiteSafety,
  type SafetyFramework,
} from "@/lib/estimation/global-site-safety-engine";
import PageHeader from "@/components/ui/PageHeader";
import Container from "@/components/ui/Container";
import ToolFaqs from "@/components/seo/ToolFaqs";
import SaveToProjectButton from "@/components/calculators/SaveToProjectButton";
import { RelatedTools, CALC_LINKS } from "@/components/seo/SeoSections";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/shadcn/card";
import { Badge } from "@/components/ui/shadcn/badge";
import { Button } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";
import { Label } from "@/components/ui/shadcn/label";
import {
  AlertTriangle,
  Download,
  HardHat,
  ShieldCheck,
  Signpost,
  Briefcase,
  Flame,
  Ruler,
  Footprints,
  Shirt,
  FileSpreadsheet,
} from "lucide-react";

const num = (value: string, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
};

function QuantityField({
  label,
  value,
  onChange,
  min = 0,
  step = 1,
  unit,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  step?: number;
  unit?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {unit ? ` (${unit})` : ""}
      </Label>
      <Input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(event) => onChange(num(event.target.value))}
      />
    </div>
  );
}

export default function GlobalSiteSafetyEstimator() {
  const resetInputs = () => {
    setPerimeterMeters(120);
    setCrewCount(10);
    setReservePpe(2);
    setSignSpacingMeters(15);
    setHasFallRisk(true);
    setWorkersAtHeight(4);
    setHasExcavation(false);
    setTapeLines(2);
    setExcavationSignCount(4);
    setHasHotWork(false);
    setFirstAidWorkersPerKit(10);
    setFireExtinguisherCount(1);
  };
  const [framework, setFramework] =
    useState<SafetyFramework>("INTERNATIONAL_ISO");
  const [perimeterMeters, setPerimeterMeters] = useState(120);
  const [crewCount, setCrewCount] = useState(10);
  const [reservePpe, setReservePpe] = useState(2);
  const [signSpacingMeters, setSignSpacingMeters] = useState(15);
  const [hasFallRisk, setHasFallRisk] = useState(true);
  const [workersAtHeight, setWorkersAtHeight] = useState(4);
  const [hasExcavation, setHasExcavation] = useState(false);
  const [excavationPerimeterMeters, setExcavationPerimeterMeters] =
    useState(20);
  const [tapeLines, setTapeLines] = useState(2);
  const [excavationSignCount, setExcavationSignCount] = useState(4);
  const [hasHotWork, setHasHotWork] = useState(false);
  const [firstAidWorkersPerKit, setFirstAidWorkersPerKit] = useState(10);
  const [fireExtinguisherCount, setFireExtinguisherCount] = useState(1);

  useSeo({
    title: "Global Construction Site Safety & PPE Estimator | FRELUX",
    description:
      "Plan construction-site PPE, warning signs, excavation barriers, first-aid kit and fire-extinguisher quantities with editable assumptions and OSHA, UK HSE/CDM or ISO 7010 references. Not a compliance certification.",
    canonicalPath: "/global-site-safety-estimator",
    keywords:
      "construction site safety estimator, PPE calculator, OSHA construction, UK HSE CDM, ISO 7010 safety signs",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "FRELUX Global Site Safety & PPE Estimator",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "Planning estimator for site safety inventory quantities with selectable regulatory references and editable assumptions.",
      url: siteUrl("/global-site-safety-estimator/"),
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  });
  useBreadcrumbJsonLd([
    { name: "Construction Tools", path: "/construction-tools" },
    {
      name: "Global Site Safety & PPE Estimator",
      path: "/global-site-safety-estimator",
    },
  ]);

  const result = useMemo(
    () =>
      calculateSiteSafety({
        framework,
        perimeterMeters,
        crewCount,
        reservePpe,
        signSpacingMeters,
        workersAtHeight,
        hasFallRisk,
        hasExcavation,
        excavationPerimeterMeters,
        tapeLines,
        excavationSignCount,
        hasHotWork,
        firstAidWorkersPerKit,
        fireExtinguisherCount,
      }),
    [
      framework,
      perimeterMeters,
      crewCount,
      reservePpe,
      signSpacingMeters,
      workersAtHeight,
      hasFallRisk,
      hasExcavation,
      excavationPerimeterMeters,
      tapeLines,
      excavationSignCount,
      hasHotWork,
      firstAidWorkersPerKit,
      fireExtinguisherCount,
    ],
  );

  const materialsForSave = useMemo(
    () => [
      {
        name: "Perimeter Warning Signs",
        category: "Safety",
        quantity: result.perimeterSigns,
        unit: "signs",
      },
      {
        name: "Protective Hard Hats",
        category: "PPE",
        quantity: result.hardHats,
        unit: "pieces",
      },
      {
        name: "High-Visibility Safety Vests",
        category: "PPE",
        quantity: result.highVisibilityVests,
        unit: "pieces",
      },
      {
        name: "Safety Boots",
        category: "PPE",
        quantity: result.safetyBootPairs,
        unit: "pairs",
      },
      ...(result.fallProtectionUsers > 0
        ? [
            {
              name: "Fall Protection Equipment (Worker Allowance)",
              category: "Fall Protection",
              quantity: result.fallProtectionUsers,
              unit: "people",
            },
          ]
        : []),
      ...(result.excavationTapeMeters > 0
        ? [
            {
              name: "Excavation Barricade Hazard Tape",
              category: "Site Caution",
              quantity: result.excavationTapeMeters,
              unit: "m",
            },
          ]
        : []),
      ...(result.excavationSigns > 0
        ? [
            {
              name: "Excavation Warning Signs",
              category: "Site Caution",
              quantity: result.excavationSigns,
              unit: "signs",
            },
          ]
        : []),
      ...(result.firstAidKits > 0
        ? [
            {
              name: "Industrial First-Aid Kits (Site Planning Allowance)",
              category: "First Aid & Welfare",
              quantity: result.firstAidKits,
              unit: "kits",
            },
          ]
        : []),
      ...(result.fireExtinguishers > 0
        ? [
            {
              name: "Fire Extinguishers (Site Assessed Quantity)",
              category: "Fire Safety",
              quantity: result.fireExtinguishers,
              unit: "units",
            },
          ]
        : []),
    ],
    [result],
  );

  const exportCsv = () => {
    const rows = [
      ["FRELUX Global Site Safety Planning Estimate", ""],
      ["Framework reference", result.framework.name],
      ["Jurisdiction", result.framework.jurisdiction],
      ["Perimeter warning signs", String(result.perimeterSigns)],
      ["Hard hats", String(result.hardHats)],
      ["High-visibility vests", String(result.highVisibilityVests)],
      ["Safety boot pairs", String(result.safetyBootPairs)],
      [
        "Workers needing selected fall controls",
        String(result.fallProtectionUsers),
      ],
      ["Excavation barrier tape (m)", String(result.excavationTapeMeters)],
      ["Excavation signs", String(result.excavationSigns)],
      ["First-aid kits (planning quantity)", String(result.firstAidKits)],
      [
        "Fire extinguishers (user-set quantity)",
        String(result.fireExtinguishers),
      ],
      [
        "Disclaimer",
        "Planning inventory only. Not a risk assessment, legal interpretation, safety plan or compliance certificate. Confirm requirements with a competent local safety professional.",
      ],
    ];
    const blob = new Blob(
      [
        rows
          .map((row) =>
            row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","),
          )
          .join("\n"),
      ],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "frelux-site-safety-planning-estimate.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const quantities = [
    {
      label: "Perimeter warning signs",
      value: result.perimeterSigns,
      unit: "signs",
      icon: Signpost,
    },
    {
      label: "Hard hats",
      value: result.hardHats,
      unit: "pieces",
      icon: HardHat,
    },
    {
      label: "High-visibility vests",
      value: result.highVisibilityVests,
      unit: "pieces",
      icon: Shirt,
    },
    {
      label: "Safety boots",
      value: result.safetyBootPairs,
      unit: "pairs",
      icon: Footprints,
    },
    {
      label: "Fall-control workers",
      value: result.fallProtectionUsers,
      unit: "people",
      icon: ShieldCheck,
    },
    {
      label: "Excavation barrier tape",
      value: result.excavationTapeMeters,
      unit: "m",
      icon: Ruler,
    },
    {
      label: "Excavation warning signs",
      value: result.excavationSigns,
      unit: "signs",
      icon: Signpost,
    },
    {
      label: "First-aid kits",
      value: result.firstAidKits,
      unit: "planning quantity",
      icon: Briefcase,
    },
    {
      label: "Fire extinguishers",
      value: result.fireExtinguishers,
      unit: "user-set",
      icon: Flame,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        variant="tool"
        eyebrow="Site Planning & Safety"
        title="Global Site Safety & PPE Estimator"
        subtitle="Build a transparent planning inventory for PPE, warning signs and site controls. Choose a framework reference, then set the assumptions that fit your worksite."
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: "Construction Tools", path: "/construction-tools" },
          { label: "Site Safety Estimator" },
        ]}
      />
      <Container className="space-y-8 py-8">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Planning inputs
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Quantities are driven by the values you enter, not hidden
                regulatory ratios.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="framework">Regulatory reference</Label>
                <select
                  id="framework"
                  value={framework}
                  onChange={(e) =>
                    setFramework(e.target.value as SafetyFramework)
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="INTERNATIONAL_ISO">
                    International · ISO 7010 reference
                  </option>
                  <option value="OSHA_US">
                    United States · OSHA construction
                  </option>
                  <option value="UK_HSE_CDM">United Kingdom · HSE / CDM</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Selecting a reference changes the cited framework notes only.
                  It does not apply unverified statutory thresholds.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <QuantityField
                  label="Site perimeter"
                  value={perimeterMeters}
                  onChange={setPerimeterMeters}
                  step={0.1}
                  unit="m"
                />
                <QuantityField
                  label="Active crew"
                  value={crewCount}
                  onChange={setCrewCount}
                />
                <QuantityField
                  label="Additional PPE reserve"
                  value={reservePpe}
                  onChange={setReservePpe}
                />
                <QuantityField
                  label="Sign spacing assumption"
                  value={signSpacingMeters}
                  onChange={setSignSpacingMeters}
                  min={0.1}
                  step={0.1}
                  unit="m"
                />
                <QuantityField
                  label="Workers requiring fall controls"
                  value={workersAtHeight}
                  onChange={setWorkersAtHeight}
                />
                <QuantityField
                  label="Workers per first-aid kit planning allowance"
                  value={firstAidWorkersPerKit}
                  onChange={setFirstAidWorkersPerKit}
                  min={1}
                />
              </div>
              <div className="space-y-4 rounded-xl border bg-muted/30 p-4">
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1 accent-primary"
                    checked={hasFallRisk}
                    onChange={(e) => setHasFallRisk(e.target.checked)}
                  />
                  <span>
                    <b>Fall hazard identified</b>
                    <span className="block text-muted-foreground">
                      Count only the workers you entered for site-specific fall
                      controls; the tool does not select harnesses or design a
                      protection system.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1 accent-primary"
                    checked={hasExcavation}
                    onChange={(e) => setHasExcavation(e.target.checked)}
                  />
                  <span>
                    <b>Open excavation present</b>
                    <span className="block text-muted-foreground">
                      Barrier and sign quantities use the perimeter and
                      line/sign assumptions below.
                    </span>
                  </span>
                </label>
                {hasExcavation && (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <QuantityField
                      label="Excavation perimeter"
                      value={excavationPerimeterMeters}
                      onChange={setExcavationPerimeterMeters}
                      step={0.1}
                      unit="m"
                    />
                    <QuantityField
                      label="Barrier lines"
                      value={tapeLines}
                      onChange={setTapeLines}
                    />
                    <QuantityField
                      label="Warning signs"
                      value={excavationSignCount}
                      onChange={setExcavationSignCount}
                    />
                  </div>
                )}
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1 accent-primary"
                    checked={hasHotWork}
                    onChange={(e) => setHasHotWork(e.target.checked)}
                  />
                  <span>
                    <b>Hot work planned</b>
                    <span className="block text-muted-foreground">
                      Set extinguisher quantities from your permit, fire
                      assessment and local requirements.
                    </span>
                  </span>
                </label>
                {hasHotWork && (
                  <QuantityField
                    label="Fire extinguishers set by site assessment"
                    value={fireExtinguisherCount}
                    onChange={setFireExtinguisherCount}
                  />
                )}
              </div>
            </CardContent>
          </Card>
          <div className="space-y-6">
            <Card className="overflow-hidden border-primary/20 shadow-sm">
              <CardHeader className="bg-primary/[0.04]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Badge variant="outline" className="mb-2">
                      Planning output · not a compliance verdict
                    </Badge>
                    <CardTitle>Safety allocation inventory</CardTitle>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      onClick={exportCsv}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      CSV
                    </Button>
                    <CalculatorResetButton
                      onReset={resetInputs}
                      className="mb-4"
                    />
                    <HowCalculatedSection
                      methodologyText={methodologyText("site-safety")}
                    />
                    <ShareEstimateButton
                      estimate={{
                        kind: "Site Safety Inventory",
                        title: "Planned PPE and site safety allocation",
                        summaryLines: [
                          {
                            label: "Fall protection users",
                            value: String(result.fallProtectionUsers),
                          },
                          {
                            label: "Excavation tape",
                            value: `${result.excavationTapeMeters} m`,
                          },
                        ],
                        lineItems: [
                          {
                            description: "Hard hats",
                            quantity: String(result.hardHats),
                          },
                          {
                            description: "High visibility vests",
                            quantity: String(result.highVisibilityVests),
                          },
                          {
                            description: "Safety boots",
                            quantity: `${result.safetyBootPairs} pairs`,
                          },
                          {
                            description: "First aid kits",
                            quantity: String(result.firstAidKits),
                          },
                          {
                            description: "Fire extinguishers",
                            quantity: String(result.fireExtinguishers),
                          },
                          {
                            description: "Perimeter signs",
                            quantity: String(result.perimeterSigns),
                          },
                          {
                            description: "Excavation signs",
                            quantity: String(result.excavationSigns),
                          },
                        ],
                        totals: [
                          {
                            label: "Items to procure",
                            value: String(
                              result.hardHats +
                                result.highVisibilityVests +
                                result.safetyBootPairs +
                                result.firstAidKits +
                                result.fireExtinguishers +
                                result.perimeterSigns +
                                result.excavationSigns,
                            ),
                            emphasized: true,
                          },
                        ],
                        notes: [
                          "Planning output for procurement, not a compliance verdict.",
                        ],
                        link: "/global-site-safety-estimator",
                      }}
                      compact
                    />
                    <SaveToProjectButton
                      compact
                      calculatorType="safety"
                      calculatorSlug="global-site-safety-estimator"
                      calcTitle="Site Safety & PPE Allocation"
                      calcData={{
                        framework,
                        perimeterMeters,
                        crewCount,
                        reservePpe,
                        signSpacingMeters,
                        workersAtHeight,
                        hasFallRisk,
                        hasExcavation,
                        excavationPerimeterMeters,
                        tapeLines,
                        excavationSignCount,
                        hasHotWork,
                        firstAidWorkersPerKit,
                        fireExtinguisherCount,
                      }}
                      resultSummary={{
                        framework: result.framework.name,
                        perimeterSigns: result.perimeterSigns,
                        hardHats: result.hardHats,
                        highVisibilityVests: result.highVisibilityVests,
                        safetyBootPairs: result.safetyBootPairs,
                        fallProtectionUsers: result.fallProtectionUsers,
                        excavationTapeMeters: result.excavationTapeMeters,
                        excavationSigns: result.excavationSigns,
                        firstAidKits: result.firstAidKits,
                        fireExtinguishers: result.fireExtinguishers,
                      }}
                      materials={materialsForSave}
                      label="Save"
                    />
                    <Link to="/boq-studio">
                      <Button variant="outline" size="sm" className="gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        BOQ Studio
                      </Button>
                    </Link>
                  </div>
                </div>
                <p className="pt-2 text-sm font-medium text-foreground">
                  {result.framework.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {result.framework.jurisdiction}
                </p>
              </CardHeader>
              <CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
                {quantities.map(({ label, value, unit, icon: Icon }) => (
                  <div key={label} className="rounded-xl border bg-card p-4">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums">
                      {value.toLocaleString()}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        {unit}
                      </span>
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Framework notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>
                  <strong>References:</strong>{" "}
                  {result.framework.references.join(" · ")}
                </p>
                <p>{result.framework.signColorReference}</p>
                <p>{result.framework.fallProtectionNote}</p>
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-muted-foreground">
                  <AlertTriangle className="mr-2 inline h-4 w-4 text-amber-600" />
                  This is a material-planning aid, not a safety plan, risk
                  assessment, legal interpretation or compliance certificate. A
                  competent local professional must verify hazards, controls,
                  training, access, rescue and emergency arrangements.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reference sources</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-2">
            <a
              className="text-primary underline"
              href="https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.501"
              target="_blank"
              rel="noopener noreferrer"
            >
              OSHA 29 CFR 1926.501 · fall protection
            </a>
            <a
              className="text-primary underline"
              href="https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.50"
              target="_blank"
              rel="noopener noreferrer"
            >
              OSHA 29 CFR 1926.50 · first aid
            </a>
            <a
              className="text-primary underline"
              href="https://www.hse.gov.uk/Construction/faq-height.htm"
              target="_blank"
              rel="noopener noreferrer"
            >
              UK HSE · work at height guidance
            </a>
            <a
              className="text-primary underline"
              href="https://www.iso.org/standard/72424.html"
              target="_blank"
              rel="noopener noreferrer"
            >
              ISO 7010 · registered safety signs
            </a>
          </CardContent>
        </Card>
        <AdSlot slotKey="calculator_mid" className="mt-8" />
        <AdSlot slotKey="calculator_native" className="mt-8" />
        <RelatedTools
          links={[
            CALC_LINKS.buildToRoof,
            CALC_LINKS.foundationCalc,
            CALC_LINKS.structuralCalc,
            CALC_LINKS.constructionSeq,
            CALC_LINKS.projectTimeline,
          ]}
        />
        <ToolFaqs slug="global-site-safety-estimator" />
      </Container>
      <EstimateDisclaimer />
    </div>
  );
}
