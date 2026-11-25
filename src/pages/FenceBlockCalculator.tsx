import CalculatorGuideBlock from "@/components/calculators/CalculatorGuideBlock";
import { fenceBlockCalculatorGuide } from "@/content/calculator-guides/fence-block-calculator";
import { supabase } from "@/lib/supabase";
import { methodologyText } from "@/lib/calculatorMethodology";
import HowCalculatedSection from "@/components/calculators/HowCalculatedSection";
import CalculatorResetButton from "@/components/calculators/CalculatorResetButton";
import { ShareEstimateButton } from "@/components/ShareEstimateButton";
import { useEffect, useMemo, useState } from "react";
import { Ruler, Layers, BrickWall, Truck } from "lucide-react";
import Container from "@/components/ui/Container";
import MeasurementTip from "@/components/ui/MeasurementTip";
import AdSlot from "@/components/ui/AdSlot";
import { downloadCsv } from "@/lib/export-utils";
import { useLanguage } from "@/lib/i18n";
import {
  PLOT_PRESETS,
  plotPresetsForMarket,
  hasPlotPresets,
  masonryUnitsForMarket,
  type MasonryUnitKey,
  type PlotPresetKey,
} from "@/config/masonry-units";
import { calculateFenceBlockwork } from "@/lib/estimation/fence-blockwork";
import { useAreaUnit, useLengthUnit } from "@/lib/use-length-unit";
import ToolShell from "@/components/tools/ToolShell";
import {
  formatHeight,
  regionalVocabulary,
  vocabularyMarkets,
} from "@/lib/localization/regional-vocabulary";

const labelClass = "text-sm font-medium text-foreground";
const fieldClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary";
const display = (n: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);

const COACH_CHOICES = [3, 4, 5, 6, 7, 8, 9, 10];

export default function FenceBlockCalculator() {
  const resetInputs = () => {
    setPreset("full-plot");
    setCustom({ length: "30.48", width: "15.24" });
    setCoaches(5);
    setUnitKey("ng-block-9");
    setGateWidth("3");
    setGateCoaches("4");
    setFoundationCourses("3");
  };
  const { t } = useLanguage();

  const [market, setMarket] = useState("NG");
  const [preset, setPreset] = useState<PlotPresetKey | "custom">("full-plot");
  const [custom, setCustom] = useState({ length: "30.48", width: "15.24" });
  const [coaches, setCoaches] = useState(5);
  const [unitKey, setUnitKey] = useState<MasonryUnitKey>("ng-block-9");
  const [materialPrices, setMaterialPrices] = useState<{
    block?: number;
    cement?: number;
    sand?: number;
  }>({});

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await supabase
          .from("material_prices")
          .select("name, unit_price, is_active")
          .eq("is_active", true);
        if (cancelled || !data) return;
        const prices: { block?: number; cement?: number; sand?: number } = {};
        for (const item of data) {
          const lower = (item.name || "").toLowerCase();
          const price = Number(item.unit_price) || 0;
          if (price <= 0) continue;
          if (
            unitKey.includes("9") &&
            (lower.includes("9-inch") ||
              lower.includes("9 inch") ||
              (lower.includes("block") && !lower.includes("6")))
          ) {
            prices.block = price;
          } else if (
            unitKey.includes("6") &&
            (lower.includes("6-inch") || lower.includes("6 inch"))
          ) {
            prices.block = price;
          } else if (!prices.block && lower.includes("block")) {
            prices.block = price;
          }
          if (lower.includes("cement") && !lower.includes("white")) {
            prices.cement = price;
          }
          if (
            lower.includes("sand") &&
            (lower.includes("trip") || lower.includes("tipper"))
          ) {
            prices.sand = price;
          }
        }
        setMaterialPrices(prices);
      } catch {
        // fail gracefully
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [unitKey]);
  const [gateWidth, setGateWidth] = useState("3");
  const [gateCoaches, setGateCoaches] = useState("4");
  const [foundationCourses, setFoundationCourses] = useState("3");

  // Plot and gate dimensions are typed in the visitor's length unit and the
  // engine still receives metres; wall areas come back in their area unit.
  const lengthUnit = useLengthUnit("meters");
  const areaUnit = useAreaUnit("sqm");

  const vocab = regionalVocabulary(market);

  // Plot presets are Nigerian land units: switching to any other market drops
  // back to measured dimensions instead of carrying a Lagos plot into Berlin.
  useEffect(() => {
    if (!hasPlotPresets(market)) {
      setPreset((current) => (current === "custom" ? current : "custom"));
    }
  }, [market]);
  const units = vocabularyMarkets();

  /**
   * The purchase list, the wall geometry and the assumptions travel together:
   * a block count without the coaches and gate it was built from cannot be
   * checked, and a quote that hides its assumptions cannot be defended.
   */
  const exportCsv = () => {
    if (!result) return;
    const rows: Record<string, unknown>[] = [
      {
        section: "Wall",
        item: "Perimeter",
        quantity: result.site.perimeterM,
        unit: "m",
        unitCost: "",
        lineTotal: "",
      },
      {
        section: "Wall",
        item: "Coaches",
        quantity: result.wall.coaches,
        unit: "",
        unitCost: "",
        lineTotal: "",
      },
      {
        section: "Wall",
        item: "Wall height",
        quantity: result.wall.heightM,
        unit: "m",
        unitCost: "",
        lineTotal: "",
      },
      {
        section: "Wall",
        item: "Gross wall area",
        quantity: result.wall.grossAreaM2,
        unit: "m2",
        unitCost: "",
        lineTotal: "",
      },
      {
        section: "Wall",
        item: "Built area after gate and foundation courses",
        quantity: result.wall.areaM2,
        unit: "m2",
        unitCost: "",
        lineTotal: "",
      },
      {
        section: "Wall",
        item: "Gate opening deducted",
        quantity: result.gate.deductedAreaM2,
        unit: "m2",
        unitCost: "",
        lineTotal: "",
      },
      {
        section: "Blocks",
        item: `Blocks (${result.unit.label})`,
        quantity: result.blocks.total,
        unit: result.unit.noun,
        unitCost: materialPrices.block || "",
        lineTotal: materialPrices.block
          ? Math.round(result.blocks.total * materialPrices.block)
          : "",
      },
      {
        section: "Blocks",
        item: "Blocks per square metre",
        quantity: result.blocks.perSquareMetre,
        unit: "blocks/m2",
        unitCost: "",
        lineTotal: "",
      },
      {
        section: "Blocks",
        item: "Breakage allowance",
        quantity: result.blocks.breakage,
        unit: result.unit.noun,
        unitCost: "",
        lineTotal: "",
      },
      {
        section: "Blocks",
        item: "Foundation course blocks",
        quantity: result.foundation.blocksTotal,
        unit: result.unit.noun,
        unitCost: "",
        lineTotal: "",
      },
      {
        section: "Foundation",
        item: "Footing concrete",
        quantity: result.foundation.footingConcreteM3,
        unit: "m3",
        unitCost: "",
        lineTotal: "",
      },
      {
        section: "Mortar",
        item: "Dry mortar volume",
        quantity: result.mortar.dryM3,
        unit: "m3",
        unitCost: "",
        lineTotal: "",
      },
      {
        section: "Mortar",
        item: "Mortar sand",
        quantity: result.mortar.sandM3,
        unit: "m3",
        unitCost: "",
        lineTotal: "",
      },
      {
        section: "Cement",
        item: `Cement (${result.cement.bagKg} kg bags)`,
        quantity: result.cement.bags,
        unit: "bags",
        unitCost: "",
        lineTotal: "",
      },
      {
        section: "Sand",
        item: `Sand (${result.sand.defaultUnitLabel})`,
        quantity: result.sand.defaultUnitCount,
        unit: result.sand.defaultUnitLabel,
        unitCost: "",
        lineTotal: "",
      },
      {
        section: "Sand",
        item: "Sand volume",
        quantity: result.sand.cubicMetres,
        unit: "m3",
        unitCost: "",
        lineTotal: "",
      },
      ...result.sand.trips.map((trip) => ({
        section: "Sand",
        item: `Sand by tipper (${trip.label})`,
        quantity: trip.count,
        unit: "trips",
        unitCost: "",
        lineTotal: "",
      })),
      {
        section: "Site",
        item: "Market",
        quantity: "",
        unit: result.market,
        unitCost: "",
        lineTotal: "",
      },
      ...result.assumptions.map((note) => ({
        section: "Assumption",
        item: note,
        quantity: "",
        unit: "",
        unitCost: "",
        lineTotal: "",
      })),
    ];
    downloadCsv("frelux-fence-blockwork", rows, [
      { header: "Section", key: "section" },
      { header: "Item", key: "item" },
      { header: "Quantity", key: "quantity" },
      { header: "Unit", key: "unit" },
    ]);
  };

  const outcome = useMemo(
    () =>
      calculateFenceBlockwork({
        market,
        plotPreset: preset === "custom" ? null : preset,
        lengthM: lengthUnit.toMetres(custom.length),
        widthM: lengthUnit.toMetres(custom.width),
        coaches,
        unitKey,
        gateWidthM: lengthUnit.toMetres(gateWidth),
        gateCoaches: Number(gateCoaches),
        foundationCourses: Number(foundationCourses),
      }),
    [
      market,
      preset,
      custom.length,
      custom.width,
      coaches,
      unitKey,
      gateWidth,
      gateCoaches,
      foundationCourses,
      lengthUnit.unit,
    ],
  );

  const result = outcome.result;

  const headerActions = (
    <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
      {t("Market")}
      <select
        aria-label={t("Market")}
        value={market}
        onChange={(event) => {
          const next = event.target.value;
          setMarket(next);
          // The block list is built from this market, so the selection
          // has to land on a unit that exists in it. Hard coding
          // ng-block-9 left US on a CMU the radios could not show and
          // left UK and India on a Nigerian block.
          setUnitKey(masonryUnitsForMarket(next)[0].key);
        }}
        className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {units.map((option) => (
          <option key={option.code} value={option.code}>
            {option.marketName}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <ToolShell route="/fence-block-calculator" actions={headerActions}>
      <>
        <Container className="max-w-5xl space-y-10 pb-16 pt-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <section
              aria-labelledby="fence-inputs"
              className="rounded-xl border border-border bg-card p-5 sm:p-6"
            >
              <h2
                id="fence-inputs"
                className="font-heading text-lg font-semibold text-foreground"
              >
                {t("Three inputs")}
              </h2>

              <div className="mt-4">
                <MeasurementTip what="market, block size and plot measurement" />
              </div>

              <div className="mt-5 space-y-5">
                <div>
                  <span className={labelClass}>{t("Land size")}</span>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {plotPresetsForMarket(market).map((option) => {
                      const active = preset === option.key;
                      return (
                        <button
                          key={option.key}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setPreset(option.key)}
                          className={
                            active
                              ? "rounded-lg border border-primary bg-primary/10 px-2 py-2 text-xs font-semibold text-foreground"
                              : "rounded-lg border border-border px-2 py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
                          }
                        >
                          {t(option.label)}
                          <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                            {option.idiom}
                          </span>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      aria-pressed={preset === "custom"}
                      onClick={() => setPreset("custom")}
                      className={
                        preset === "custom"
                          ? "rounded-lg border border-primary bg-primary/10 px-2 py-2 text-xs font-semibold text-foreground"
                          : "rounded-lg border border-border px-2 py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
                      }
                    >
                      {t("Measure it")}
                    </button>
                  </div>

                  {preset === "custom" ? (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="text-xs text-muted-foreground">
                          {`${t("Length")} (${lengthUnit.label})`}
                        </span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          inputMode="decimal"
                          value={custom.length}
                          onChange={(event) =>
                            setCustom((prev) => ({
                              ...prev,
                              length: event.target.value,
                            }))
                          }
                          className={`${fieldClass} mt-1`}
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs text-muted-foreground">
                          {`${t("Width")} (${lengthUnit.label})`}
                        </span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          inputMode="decimal"
                          value={custom.width}
                          onChange={(event) =>
                            setCustom((prev) => ({
                              ...prev,
                              width: event.target.value,
                            }))
                          }
                          className={`${fieldClass} mt-1`}
                        />
                      </label>
                      <label className="col-span-2 flex items-center gap-2 text-xs text-muted-foreground">
                        {t("Measuring in")}
                        <select
                          aria-label="Length unit"
                          className={`${fieldClass} w-auto`}
                          value={lengthUnit.unit}
                          onChange={(event) =>
                            lengthUnit.setUnit(event.target.value as never)
                          }
                        >
                          <option value="meters">m</option>
                          <option value="feet">ft</option>
                          <option value="inches">in</option>
                        </select>
                        <select
                          aria-label="Area unit"
                          className={`${fieldClass} w-auto`}
                          value={areaUnit.unit}
                          onChange={(event) =>
                            areaUnit.setUnit(event.target.value as never)
                          }
                        >
                          <option value="sqm">m²</option>
                          <option value="sqft">sq ft</option>
                        </select>
                      </label>
                    </div>
                  ) : null}
                </div>

                <div>
                  <label className="block" htmlFor="fence-coaches">
                    <span className={labelClass}>{t(vocab.heightLabel)}</span>
                    <input
                      id="fence-coaches"
                      type="number"
                      min={1}
                      max={40}
                      step={1}
                      inputMode="numeric"
                      value={coaches}
                      onChange={(event) =>
                        setCoaches(Number(event.target.value))
                      }
                      className={`${fieldClass} mt-1`}
                    />
                  </label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t(vocab.heightHint)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {COACH_CHOICES.map((value) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={coaches === value}
                        onClick={() => setCoaches(value)}
                        className={
                          coaches === value
                            ? "rounded-md border border-primary bg-primary/10 px-2 py-1 text-xs font-semibold"
                            : "rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                        }
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block" htmlFor="fence-gate-width">
                    <span className={labelClass}>
                      {`${t("Gate width")} (${lengthUnit.label})`}
                    </span>
                    <input
                      id="fence-gate-width"
                      type="number"
                      min={0}
                      step="0.1"
                      inputMode="decimal"
                      value={gateWidth}
                      onChange={(event) => setGateWidth(event.target.value)}
                      className={`${fieldClass} mt-1`}
                    />
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {t("0 if the wall has no opening")}
                    </span>
                  </label>
                  <label className="block" htmlFor="fence-gate-coaches">
                    <span className={labelClass}>
                      {t("Gate height (coaches)")}
                    </span>
                    <input
                      id="fence-gate-coaches"
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      value={gateCoaches}
                      onChange={(event) => setGateCoaches(event.target.value)}
                      className={`${fieldClass} mt-1`}
                    />
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {t("Capped at the wall height")}
                    </span>
                  </label>
                </div>

                <label className="block" htmlFor="fence-foundation">
                  <span className={labelClass}>
                    {t("Courses below ground (foundation)")}
                  </span>
                  <input
                    id="fence-foundation"
                    type="number"
                    min={0}
                    max={10}
                    step={1}
                    inputMode="numeric"
                    value={foundationCourses}
                    onChange={(event) =>
                      setFoundationCourses(event.target.value)
                    }
                    className={`${fieldClass} mt-1`}
                  />
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {t(
                      "Courses below ground level over a strip footing. Enter 0 for a wall counted above ground only",
                    )}
                  </span>
                </label>

                <fieldset>
                  <legend className={labelClass}>{t("Block size")}</legend>
                  <div className="mt-2 space-y-2">
                    {masonryUnitsForMarket(market).map((option) => {
                      const key = option.key;
                      const title = t(option.label);
                      const hint = `${(option.thicknessM * 1000).toFixed(0)} mm thick`;
                      return (
                        <label
                          key={key}
                          className={
                            unitKey === key
                              ? "flex cursor-pointer items-start gap-3 rounded-lg border border-primary bg-primary/5 px-3 py-2"
                              : "flex cursor-pointer items-start gap-3 rounded-lg border border-border px-3 py-2"
                          }
                        >
                          <input
                            type="radio"
                            name="block-size"
                            value={key}
                            checked={unitKey === key}
                            onChange={() => setUnitKey(key)}
                            className="mt-1"
                          />
                          <span>
                            <span className="block text-sm font-medium text-foreground">
                              {title}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {hint}, {(option.lengthM * 1000).toFixed(0)} mm
                              long, {(option.heightM * 1000).toFixed(0)} mm high
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              </div>
            </section>

            <section
              aria-labelledby="fence-results"
              className="rounded-xl border border-border bg-card p-5 sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <h2
                  id="fence-results"
                  className="font-heading text-lg font-semibold text-foreground"
                >
                  {t("What to buy")}
                </h2>
                {result && (
                  <button
                    type="button"
                    onClick={exportCsv}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                  >
                    {t("Export CSV")}
                  </button>
                )}
              </div>

              {outcome.errors.length > 0 ? (
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {outcome.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              ) : result ? (
                <div className="mt-4 space-y-5">
                  <CalculatorResetButton
                    onReset={resetInputs}
                    className="mb-4"
                  />
                  <HowCalculatedSection
                    methodologyText={methodologyText("fence-block")}
                    governingStandards={[
                      "NIS 87: Sandcrete Blocks Standard",
                      "BS 6073 / Eurocode 6: Precast Concrete Masonry Units",
                    ]}
                    civilEngineeringConstants={[
                      {
                        label: "Unit Block Size",
                        value: "450mm × 225mm × 225mm (9-inch)",
                        standard: "NIS 87",
                      },
                      {
                        label: "Mortar Joint Thickness",
                        value: "25mm bed & perpend joints",
                      },
                      {
                        label: "Dry-to-Wet Mortar Factor",
                        value: "1.33× dry bulking ratio",
                      },
                      {
                        label: "Cutting & Breakage Allowance",
                        value: "10% standard site allowance",
                      },
                    ]}
                    geometryBreakdown={{
                      grossAreaM2: result.wall.grossAreaM2,
                      deductionsM2: result.gate.deductedAreaM2,
                      netAreaM2: result.wall.areaM2,
                      dimensionsSummary: `${result.site.perimeterM.toFixed(1)}m perimeter × ${result.wall.coaches} courses high`,
                    }}
                    physicalFactors={{
                      mortarDryFactor: 1.33,
                    }}
                    packagingDetails={{
                      theoreticalAmount: result.blocks.net,
                      practicalPurchaseAmount: result.blocks.total,
                      unitLabel: "blocks",
                      packSizeLabel: `${market} standard blocks`,
                    }}
                    assumptions={[
                      {
                        label: "Gate deduction",
                        value: `${result.gate.widthM}m wide`,
                      },
                      {
                        label: "Dry mortar volume",
                        value: `${result.mortar.dryM3.toFixed(2)} m³`,
                      },
                      {
                        label: "Mortar mix ratio",
                        value: `1:${result.mortar.ratio}`,
                      },
                    ]}
                  />
                  <ShareEstimateButton
                    showPdf
                    estimate={{
                      kind: "Fence Block Takeoff",
                      title: `${display(result.wall.coaches)} ${t(vocab.coachWordPlural)} ${t("high")}`,
                      summaryLines: [
                        {
                          label: t("Wall height"),
                          value: formatHeight(result.wall.heightM, market),
                        },
                        {
                          label: t(vocab.cementBagLabel),
                          value: `${display(result.cement.bags)}`,
                        },
                        {
                          label: t("Dry mortar"),
                          value: `${display(result.mortar.dryM3)} m³ at 1:${result.mortar.ratio}`,
                        },
                      ],
                      lineItems: [
                        {
                          description: t(result.unit.noun),
                          quantity: String(display(result.blocks.total)),
                          section: t("Blocks"),
                        },
                        {
                          description: t("laid"),
                          quantity: String(display(result.blocks.net)),
                          section: t("Blocks"),
                        },
                        {
                          description: t("for breakage"),
                          quantity: String(display(result.blocks.breakage)),
                          section: t("Blocks"),
                        },
                        {
                          description: t("below ground"),
                          quantity: String(
                            display(result.foundation.blocksTotal),
                          ),
                          section: t("Blocks"),
                        },
                      ],
                      totals: [
                        {
                          label: t("Blocks to buy"),
                          value: `${display(result.blocks.total)} ${t(result.unit.noun)}`,
                          emphasized: true,
                        },
                      ],
                      link: "/fence-block-calculator",
                    }}
                    compact
                  />
                  <p className="text-sm text-muted-foreground">
                    {t("A wall")} {display(result.wall.coaches)}{" "}
                    {t(vocab.coachWordPlural)} {t("high")}, (
                    {formatHeight(result.wall.heightM, market)}),{" "}
                    {display(result.site.perimeterM)} m {t("of perimeter")}.
                    {result.gate.widthM > 0
                      ? ` ${t("A")} ${display(result.gate.widthM)} m ${t(
                          "gate",
                        )} ${display(result.gate.coaches)} ${t(
                          vocab.coachWordPlural,
                        )} ${t("high is deducted")}.`
                      : ""}
                    {result.foundation.courses > 0
                      ? ` ${display(result.foundation.courses)} ${t(
                          "courses below ground are included over the strip footing",
                        )}.`
                      : ""}
                  </p>

                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <BrickWall
                        aria-hidden="true"
                        className="mt-0.5 h-5 w-5 text-muted-foreground"
                      />
                      <span className="text-sm text-foreground">
                        <strong className="font-semibold">
                          {display(result.blocks.total)} {t(result.unit.noun)}
                        </strong>
                        <span className="block text-xs text-muted-foreground">
                          {display(result.blocks.net)} {t("laid")} +{" "}
                          {display(result.blocks.breakage)} {t("for breakage")}
                          {result.foundation.blocksTotal > 0
                            ? `, ${display(
                                result.foundation.blocksTotal,
                              )} ${t("of them below ground")}`
                            : ""}
                          {result.gate.deductedAreaM2 > 0
                            ? `, ${display(
                                areaUnit.fromSqm(result.gate.deductedAreaM2),
                              )} ${areaUnit.label} ${t("opening deducted")}`
                            : ""}
                        </span>
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Layers
                        aria-hidden="true"
                        className="mt-0.5 h-5 w-5 text-muted-foreground"
                      />
                      <span className="text-sm text-foreground">
                        <strong className="font-semibold">
                          {display(result.cement.bags)}{" "}
                          {t(vocab.cementBagLabel)}
                        </strong>
                        <span className="block text-xs text-muted-foreground">
                          {display(result.mortar.dryM3)} m³{" "}
                          {t("of dry mortar at")} 1:{result.mortar.ratio}
                        </span>
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Truck
                        aria-hidden="true"
                        className="mt-0.5 h-5 w-5 text-muted-foreground"
                      />
                      <span className="text-sm text-foreground">
                        <strong className="font-semibold">
                          {display(result.sand.cubicMetres)} m³{" "}
                          {t("of sharp sand")}
                        </strong>
                        <span className="block text-xs text-muted-foreground">
                          {result.sand.trips.length > 0
                            ? result.sand.trips
                                .map(
                                  (trip) =>
                                    `${display(trip.count)} ${t("trips")} (${trip.label.replace("Trip ", "")})`,
                                )
                                .join(" · ")
                            : `${display(result.sand.defaultUnitCount)} ${vocab.sandPurchaseLabel.toLowerCase()}`}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {display(result.sand.wheelbarrows)} {t("barrows")} ·{" "}
                          {display(result.sand.headPans)} {t("head pans")}
                        </span>
                      </span>
                    </li>
                    {result.foundation.footingConcreteM3 > 0 ? (
                      <li className="flex items-start gap-3">
                        <Layers
                          aria-hidden="true"
                          className="mt-0.5 h-5 w-5 text-muted-foreground"
                        />
                        <span className="text-sm text-foreground">
                          <strong className="font-semibold">
                            {display(result.foundation.footingConcreteM3)} m³{" "}
                            {t("of strip footing concrete")}
                          </strong>
                          <span className="block text-xs text-muted-foreground">
                            {display(result.foundation.cementBags)}{" "}
                            {t(vocab.cementBagLabel)} {t("and")}{" "}
                            {display(result.foundation.sandM3)} m³{" "}
                            {t("sand and")}{" "}
                            {display(result.foundation.aggregateM3)} m³{" "}
                            {t("granite in the totals above")}
                          </span>
                        </span>
                      </li>
                    ) : null}
                    <li className="flex items-start gap-3">
                      <Ruler
                        aria-hidden="true"
                        className="mt-0.5 h-5 w-5 text-muted-foreground"
                      />
                      <span className="text-sm text-foreground">
                        <strong className="font-semibold">
                          {display(areaUnit.fromSqm(result.wall.areaM2))}{" "}
                          {areaUnit.label} {t("of wall")}
                        </strong>
                        <span className="block text-xs text-muted-foreground">
                          {display(result.blocks.perSquareMetre)}{" "}
                          {t(vocab.unitWordPlural)} {t("per square metre")}
                        </span>
                      </span>
                    </li>
                  </ul>

                  {(materialPrices.block ||
                    materialPrices.cement ||
                    materialPrices.sand) && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
                      <p className="font-semibold text-foreground">
                        {t("Estimated Materials Budget (Admin Price Book)")}
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                        {materialPrices.block && (
                          <div>
                            <span className="block">{t("Blocks")}</span>
                            <span className="font-medium text-foreground">
                              ₦
                              {Math.round(
                                result.blocks.total * materialPrices.block,
                              ).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {materialPrices.cement && (
                          <div>
                            <span className="block">
                              {t(vocab.cementBagLabel)}
                            </span>
                            <span className="font-medium text-foreground">
                              ₦
                              {Math.round(
                                result.cement.bags * materialPrices.cement,
                              ).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {materialPrices.sand && (
                          <div>
                            <span className="block">{t("Sand")}</span>
                            <span className="font-medium text-foreground">
                              ₦
                              {Math.round(
                                (result.sand.trips.length > 0
                                  ? result.sand.trips[0].count
                                  : 1) * materialPrices.sand,
                              ).toLocaleString()}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="block font-semibold text-foreground">
                            {t("Total Material Est.")}
                          </span>
                          <span className="font-bold text-primary">
                            ₦
                            {(
                              (materialPrices.block
                                ? result.blocks.total * materialPrices.block
                                : 0) +
                              (materialPrices.cement
                                ? result.cement.bags * materialPrices.cement
                                : 0) +
                              (materialPrices.sand
                                ? (result.sand.trips.length > 0
                                    ? result.sand.trips[0].count
                                    : 1) * materialPrices.sand
                                : 0)
                            ).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg bg-muted px-3 py-3">
                    <p className="text-xs font-semibold text-foreground">
                      {t("How this was worked out")}
                    </p>
                    <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
                      {result.assumptions.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </section>
          </div>

          <AdSlot slotKey="calculator_mid" />

          <CalculatorGuideBlock guide={fenceBlockCalculatorGuide} />
        </Container>
      </>{" "}
    </ToolShell>
  );
}
