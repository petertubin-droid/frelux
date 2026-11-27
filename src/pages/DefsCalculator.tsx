import CalculatorGuideBlock from "@/components/calculators/CalculatorGuideBlock";
import { defsCalculatorGuide } from "@/content/calculator-guides/defs-calculator";
import OpeningsEditor, {
  type OpeningRow,
} from "@/components/estimators/OpeningsEditor";
import { ShareEstimateButton } from "@/components/ShareEstimateButton";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Info, Layers, RotateCcw } from "lucide-react";

import ToolShell from "@/components/tools/ToolShell";
import AdSlot from "@/components/ui/AdSlot";
import Container from "@/components/ui/Container";
import { Badge } from "@/components/ui/shadcn/badge";
import { Button } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";
import { Label } from "@/components/ui/shadcn/label";
import UnitToggle from "@/components/measurement/UnitToggle";
import { BoqPricingPanel } from "@/components/tools/BoqPricingPanel";
import { useSeo, useFaqJsonLd, useBreadcrumbJsonLd } from "@/lib/seo";
import { useMarket } from "@/lib/international/market-context";
import { getActiveDisplayCurrency } from "@/lib/international/fx-display";
import { formatNumber } from "@/lib/convert/units";
import { useLengthUnit } from "@/lib/use-length-unit";
import { unitToMeters, unitShortLabel } from "@/lib/utils";
import { useTechnicalLabels } from "@/lib/construction-dictionary/use-technical-labels";
import {
  calculateDefs,
  exteriorInputFromEifs,
  type DefsSubstrate,
  type ExteriorFinishResult,
} from "@/lib/estimation/exterior-finish-engine";
import { resolveDefsPrices } from "@/lib/estimation/icf-eifs-market";
import type { EifsFinishTexture } from "@/lib/estimation/eifs-engine";
import type { Unit } from "@/types";

const DEFS_FAQ = [
  {
    question: "What is the difference between DEFS and EIFS?",
    answer:
      "EIFS puts a rigid insulation board on the wall and embeds the reinforcing mesh in a base coat over that board. DEFS is a direct-applied system: there is no foam at all. The same mesh and polymer-modified base coat go straight onto cement board, exterior gypsum sheathing or sound masonry, with the board joints taped and the boards screwed off first. The finish is the same textured acrylic or silicone coat, so the two look alike from outside. The difference is what sits behind the mesh, and that decides the R-value: DEFS adds no continuous insulation.",
  },
  {
    question:
      "How much base coat and mesh do I need for Direct-Applied Exterior Finish Systems?",
    answer:
      "Allow 4.5 kg of polymer-modified base coat per square metre of net wall area, with the fiberglass mesh laid at a 10% overlap, so 1.1 m² of mesh per m² of wall. A 100 m² elevation therefore takes 110 m² of mesh, about 3 rolls at 50 m², and 450 kg of base coat, which is 18 bags at 25 kg. Add the seam tape for the board joints separately: about 1.15 m of alkali-resistant tape per m² of board.",
  },
  {
    question: "Can DEFS be applied directly over concrete block or masonry?",
    answer:
      "Yes. Over sound masonry the reinforced base coat goes directly onto the prepared blockwork, so no sheathing board, board screws or joint tape are bought at all. The surface must be sound, clean and flat, and any suction has to be controlled with a primer or a bonding agent before the base coat, exactly as for a stucco base. This calculator switches to the masonry route when you choose that substrate and says in the result that the board lines were omitted rather than shown as zero.",
  },
];

type SubstrateOption = {
  value: DefsSubstrate;
  label: string;
  hint: string;
};

const SUBSTRATES: SubstrateOption[] = [
  {
    value: "cement-board",
    label: "Cement sheathing board",
    hint: "The default facade backing: moisture-resistant, 1.2 x 2.4 m sheets.",
  },
  {
    value: "exterior-gypsum",
    label: "Exterior gypsum sheathing",
    hint: "Soffits, canopies and protected elevations. Not a weather-exposed substrate.",
  },
  {
    value: "masonry",
    label: "Concrete block / masonry",
    hint: "Direct application: no board, no screws, no seam tape.",
  },
];

const TEXTURES: Array<{ value: EifsFinishTexture; label: string }> = [
  { value: "fine_sand", label: "Fine sand (1.0 mm)" },
  { value: "medium_swirl", label: "Medium swirl (1.5 mm)" },
  { value: "coarse_rough", label: "Coarse rough (2.0 mm)" },
  { value: "elastomeric_smooth", label: "Elastomeric smooth" },
];

export default function DefsCalculator() {
  const { t: tLabel } = useTechnicalLabels();
  useSeo({
    title:
      "DEFS Calculator: Direct-Applied Exterior Finish System Estimator (2026)",
    description:
      "Calculate cement board, fiberglass mesh, base coat, and finish quantities for Direct-Applied Exterior Finish Systems (DEFS). Free, instant BOQ with local market prices.",
    canonicalPath: "/defs-calculator",
    ogType: "website",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "FRELUX DEFS Calculator",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offer: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  });
  useFaqJsonLd(DEFS_FAQ);
  useBreadcrumbJsonLd([
    { name: "Calculators", path: "/construction-tools" },
    { name: "DEFS Calculator", path: "/defs-calculator" },
  ]);

  const { marketCode } = useMarket();
  const { unit, setUnit, toMetres } = useLengthUnit("meters");
  const switchUnit = (nextUnit: Unit) => {
    const scale = unitToMeters(1, unit) / unitToMeters(1, nextUnit);
    setWallLength((value) => String((Number(value) || 0) * scale));
    setWallHeight((value) => String((Number(value) || 0) * scale));
    setUnit(nextUnit);
  };
  const [wallLength, setWallLength] = useState("40");
  const [wallHeight, setWallHeight] = useState("3.0");
  const [substrate, setSubstrate] = useState<DefsSubstrate>("cement-board");
  const [wastage, setWastage] = useState("10");
  const [texture, setTexture] = useState<EifsFinishTexture>("medium_swirl");
  const [openings, setOpenings] = useState<OpeningRow[]>([
    {
      id: "opening-1",
      label: "Opening 1",
      widthM: 1.2,
      heightM: 1.2,
      count: 2,
    },
  ]);

  const [priceResolution, setPriceResolution] = useState<Awaited<
    ReturnType<typeof resolveDefsPrices>
  > | null>(null);
  const [pricesLoading, setPricesLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPricesLoading(true);
    resolveDefsPrices(marketCode).then((res) => {
      if (!cancelled) {
        setPriceResolution(res);
        setPricesLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [marketCode]);

  const result: ExteriorFinishResult = useMemo(() => {
    const input = exteriorInputFromEifs(
      {
        wallLengthM: toMetres(wallLength),
        wallHeightM: toMetres(wallHeight),
        // Only used to size the wall; DEFS ignores the insulation fields.
        insulationThicknessMm: 50,
        openings: openings.map((opening) => ({
          id: opening.id,
          label: opening.label,
          widthM: opening.widthM,
          heightM: opening.heightM,
          count: opening.count,
        })),
        marketCode,
      },
      {
        substrate,
        wastagePercent: Number(wastage) || 0,
        finishTexture: texture,
      },
    );
    return calculateDefs(input);
  }, [
    wallLength,
    wallHeight,
    toMetres,
    openings,
    substrate,
    wastage,
    texture,
    marketCode,
  ]);

  function handleReset() {
    setWallLength("40");
    setWallHeight("3.0");
    setSubstrate("cement-board");
    setWastage("10");
    setTexture("medium_swirl");
    setOpenings([
      {
        id: "opening-1",
        label: "Opening 1",
        widthM: 1.2,
        heightM: 1.2,
        count: 2,
      },
    ]);
  }

  const defs = result.defs;
  const layers = result.layers;

  return (
    <ToolShell route="/defs-calculator">
      <Container className="py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/30 p-3 rounded-lg border border-border/60">
          <div className="inline-flex rounded-md border border-input bg-background p-0.5 shadow-xs">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs px-3"
              onClick={() => {
                window.location.assign("/eifs-calculator");
              }}
            >
              EIFS (with foam insulation)
            </Button>
            <Button type="button" size="sm" className="h-7 text-xs px-3">
              DEFS (direct-applied, no foam)
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={handleReset}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Defaults
          </Button>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-xs font-semibold text-primary border-primary/30"
            >
              Exterior Finish Systems
            </Badge>
            <Badge variant="secondary" className="text-xs font-mono">
              No continuous insulation
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            DEFS (Direct-Applied Exterior Finish System) Material &amp; Cost
            Calculator
          </h1>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            The same reinforced base coat and textured finish as EIFS, applied
            straight onto cement board, exterior gypsum or masonry with no foam
            board. Board, corrosion-resistant screws, alkali-resistant seam
            tape, weep screed, mesh, base coat, primer and finish, priced from
            your own market where a rate exists.
          </p>
        </div>

        {result.errors.length > 0 && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" />
              <span>Check the inputs</span>
            </div>
            <ul className="mt-1 list-disc list-inside space-y-0.5">
              {result.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Wall</h2>
              <UnitToggle value={unit} onChange={switchUnit} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">
                  Facade length ({unitShortLabel(unit)})
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={wallLength}
                  onChange={(event) => setWallLength(event.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">
                  Wall height ({unitShortLabel(unit)})
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={wallHeight}
                  onChange={(event) => setWallHeight(event.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">
                Substrate (what the base coat goes onto)
              </Label>
              <div className="space-y-1">
                {SUBSTRATES.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-start gap-2 rounded-lg border border-border/60 p-2 text-xs"
                  >
                    <input
                      type="radio"
                      name="substrate"
                      className="mt-0.5"
                      checked={substrate === option.value}
                      onChange={() => setSubstrate(option.value)}
                    />
                    <span>
                      <span className="font-medium">{option.label}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {option.hint}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 space-y-3">
            <h2 className="text-sm font-semibold">Finish and allowance</h2>
            <div className="space-y-1">
              <Label className="text-xs">Finish texture</Label>
              <select
                className="w-full rounded-lg border border-border bg-background p-2 text-sm"
                value={texture}
                onChange={(event) =>
                  setTexture(event.target.value as EifsFinishTexture)
                }
                aria-label="Finish texture"
              >
                {TEXTURES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">
                Cutting and breakage allowance (%)
              </Label>
              <Input
                type="number"
                min="0"
                max="25"
                step="1"
                value={wastage}
                onChange={(event) => setWastage(event.target.value)}
                className="h-8 text-sm"
              />
            </div>

            <OpeningsEditor
              variant="bare"
              showLabels={false}
              openings={openings}
              onChange={setOpenings}
              title="Openings deducted"
              addLabel="Add opening"
              emptyHint="No openings deducted; the wall is measured as solid."
              createRow={() => ({
                id: `opening-${Date.now()}`,
                label: "Opening",
                widthM: 1.0,
                heightM: 2.1,
                count: 1,
              })}
              unitSystem={unit}
            />
          </div>
        </div>

        {result.ok && defs && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: "Net wall area",
                  value: `${formatNumber(result.geometry.netWallAreaM2, 2)} m²`,
                },
                {
                  label: defs.boardsOmitted
                    ? "Sheathing board"
                    : "Sheathing boards",
                  value: defs.boardsOmitted
                    ? "Masonry: none"
                    : `${defs.boardsCount}`,
                },
                {
                  label: "Board screws",
                  value: defs.boardsOmitted
                    ? "Masonry: none"
                    : `${defs.screwsCount}`,
                },
                {
                  label: "Seam tape",
                  value: defs.boardsOmitted
                    ? "Masonry: none"
                    : `${formatNumber(defs.jointTapeM, 1)} m`,
                },
                {
                  label: "Mesh (10% overlap)",
                  value: `${formatNumber(layers.meshAreaM2, 1)} m²`,
                },
                {
                  label: "Base coat",
                  value: `${formatNumber(layers.baseCoatKg, 0)} kg`,
                },
                {
                  label: "Primer",
                  value: `${formatNumber(layers.primerKg, 1)} kg`,
                },
                {
                  label: "Finish coat",
                  value: `${formatNumber(layers.finishCoatKg, 0)} kg`,
                },
              ].map((tile) => (
                <div key={tile.label} className="rounded-xl border bg-card p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {tile.label}
                  </p>
                  <p className="mt-1 text-lg font-semibold">{tile.value}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <ShareEstimateButton
                showPdf
                estimate={{
                  kind: "Direct-Applied Exterior Finish (DEFS)",
                  link: "/calculators/defs",
                  summaryLines: [
                    {
                      label: "Net Facade Area",
                      value: `${formatNumber(result.geometry.netWallAreaM2, 1)} m²`,
                    },
                    {
                      label: "Substrate",
                      value:
                        SUBSTRATES.find((s) => s.value === substrate)?.label ??
                        substrate,
                    },
                    {
                      label: "Sheathing Boards",
                      value: defs.boardsOmitted
                        ? "Masonry: none"
                        : `${defs.boardsCount}`,
                    },
                    {
                      label: "Base Coat",
                      value: `${formatNumber(layers.baseCoatKg, 0)} kg`,
                    },
                    {
                      label: "Finish Coat",
                      value: `${formatNumber(layers.finishCoatKg, 0)} kg`,
                    },
                  ],
                  lineItems: result.boq.slice(0, 10).map((item) => ({
                    description: tLabel(item.description),
                    quantity: `${formatNumber(item.quantity, 1)} ${item.unit}`,
                  })),
                  totals: [
                    {
                      label: "Net wall area",
                      value: `${formatNumber(result.geometry.netWallAreaM2, 2)} m²`,
                    },
                  ],
                }}
              />
            </div>

            <BoqPricingPanel
              boq={result.boq.map((item) => ({
                code: item.code,
                description: tLabel(item.description),
                quantity: item.quantity,
                unit: item.unit,
              }))}
              resolution={priceResolution}
              currencyCode={getActiveDisplayCurrency()}
              loading={pricesLoading}
            />

            <div className="rounded-xl border bg-card p-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Layers className="h-4 w-4" />
                What this takeoff does and does not include
              </h2>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {result.disclosures.map((note) => (
                  <li key={note}>· {note}</li>
                ))}
              </ul>
            </div>
          </>
        )}

        <div className="rounded-xl border bg-card p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Info className="h-4 w-4" />
            DEFS vs EIFS
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Both systems are the same finish: fiberglass mesh embedded in a
            polymer-modified base coat, primed, then a textured acrylic or
            silicone coat. EIFS sets that build-up over a rigid insulation board
            fixed to the wall. DEFS omits the foam and applies the reinforced
            base coat directly over cement board, exterior gypsum sheathing or
            sound masonry, with the board joints taped and the boards screwed
            off first. DEFS suits soffits, canopies, parapets and high-impact
            lower walls where the extra insulation is not wanted, and it adds no
            continuous R-value.
          </p>
        </div>

        <AdSlot slotKey="calculator_mid" className="mt-8" />

        <div className="mt-8">
          <CalculatorGuideBlock guide={defsCalculatorGuide} />
        </div>
      </Container>
    </ToolShell>
  );
}
