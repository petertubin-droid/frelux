import CalculatorResetButton from "@/components/calculators/CalculatorResetButton";
import HowCalculatedSection from "@/components/calculators/HowCalculatedSection";
import { RelatedTools, CALC_LINKS } from "@/components/seo/SeoSections";
import { useState } from "react";
import { useEngineAccess } from "@/lib/use-engine-access";
import { EnginePreviewLock } from "@/components/premium/EnginePreviewLock";
import Container from "@/components/ui/Container";
import MeasurementTip from "@/components/ui/MeasurementTip";
import MissingFieldsNotice from "@/components/ui/MissingFieldsNotice";
import { useCalculatorFeedback } from "@/hooks/useCalculatorFeedback";
import PageHeader from "@/components/ui/PageHeader";
import RecommendedProducts from "@/components/estimation/RecommendedProducts";
import { useSeo } from "@/lib/seo";
import { downloadCsv } from "@/lib/export-utils";
import { ShareEstimateButton } from "@/components/ShareEstimateButton";
import AdSlot from "@/components/ui/AdSlot";
import { useLanguage } from "@/lib/i18n";
import {
  calculateEarthwork,
  type EarthworkResult,
} from "@/lib/estimation/advanced-takeoff-engine";
import EstimateDisclaimer from "@/components/calculators/EstimateDisclaimer";

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary";
const blankStation = (): {
  chainageM: string;
  cutAreaM2: string;
  fillAreaM2: string;
} => ({
  chainageM: "",
  cutAreaM2: "",
  fillAreaM2: "",
});
const display = (n: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);

export default function EarthworksEstimator() {
  // Back to two empty stations. Nothing else on this page is loaded data.
  const resetInputs = () => {
    setStations([
      { chainageM: "", cutAreaM2: "", fillAreaM2: "" },
      { chainageM: "", cutAreaM2: "", fillAreaM2: "" },
    ]);
    setSoilDescription("");
    setBulking("");
    setShrinkage("");
    setReuse(false);
    setErrors([]);
    setResult(null);
  };
  const { t } = useLanguage();
  const engineAccess = useEngineAccess("/earthworks-cut-fill");
  useSeo({
    title: "Earthworks Cut & Fill Estimator | FRELUX",
    description:
      "Calculate surveyed cut and fill quantities from cross-section areas, chainages and project-specific bulking and shrinkage factors.",
  });
  const [stations, setStations] = useState<
    Array<{ chainageM: string; cutAreaM2: string; fillAreaM2: string }>
  >([
    { chainageM: "", cutAreaM2: "", fillAreaM2: "" },
    { chainageM: "", cutAreaM2: "", fillAreaM2: "" },
  ]);
  const [soilDescription, setSoilDescription] = useState("");
  const [bulking, setBulking] = useState("");
  const [shrinkage, setShrinkage] = useState("");
  const [reuse, setReuse] = useState(false);
  const [result, setResult] = useState<EarthworkResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const run = () => {
    if (
      stations.some((s) => Object.values(s).some((v) => v.trim() === "")) ||
      bulking === "" ||
      shrinkage === ""
    ) {
      setErrors([
        "Enter every station chainage and cut/fill area, plus project-specific bulking and shrinkage percentages. Use 0 only when that measured quantity or confirmed factor is zero.",
      ]);
      setResult(null);
      return;
    }
    const response = calculateEarthwork({
      stations: stations.map((s) => ({
        chainageM: Number(s.chainageM),
        cutAreaM2: Number(s.cutAreaM2),
        fillAreaM2: Number(s.fillAreaM2),
      })),
      bulkingPercent: Number(bulking),
      shrinkagePercent: Number(shrinkage),
      cutSuitableForFill: reuse,
    });
    setErrors(response.errors);
    setResult(response.data);
  };
  // The summary above the fold is the preview, so it reads from one list.
  const earthworkRows: Array<[string, number, string]> = result
    ? [
        ["Bank cut", result.cutBankM3, "m³"],
        ["Compacted fill", result.fillCompactedM3, "m³"],
        ["Loose haul", result.cutLooseM3, "m³"],
        ["Bank-equivalent fill", result.fillBankEquivalentM3, "m³"],
      ]
    : [];

  /**
   * One file carries both the volume summary and the interval schedule, because
   * a summary without its intervals cannot be checked back to the survey.
   */
  const exportCsv = () => {
    if (!result) return;
    const rows: Record<string, unknown>[] = [
      ...earthworkRows.map(([item, value, unit]) => ({
        section: "Summary",
        item,
        from: "",
        to: "",
        cut: "",
        fill: "",
        value,
        unit,
      })),
      ...(result.netBankSurplusM3 !== null
        ? [
            {
              section: "Balance",
              item:
                result.importBankM3 === 0
                  ? "Potential bank-volume surplus"
                  : "Indicative bank-volume import",
              from: "",
              to: "",
              cut: "",
              fill: "",
              value:
                result.importBankM3 === 0
                  ? result.netBankSurplusM3
                  : result.importBankM3,
              unit: "m³",
            },
          ]
        : []),
      ...result.intervals.map((row) => ({
        section: "Interval",
        item: `Chainage ${row.fromM} to ${row.toM} m`,
        from: row.fromM,
        to: row.toM,
        cut: row.cutM3,
        fill: row.fillM3,
        value: "",
        unit: "m³",
      })),
      {
        section: "Input",
        item: "Bulking factor",
        from: "",
        to: "",
        cut: "",
        fill: "",
        value: Number(bulking),
        unit: "%",
      },
      {
        section: "Input",
        item: "Shrinkage factor",
        from: "",
        to: "",
        cut: "",
        fill: "",
        value: Number(shrinkage),
        unit: "%",
      },
      {
        section: "Input",
        item: "Cut suitable for fill",
        from: "",
        to: "",
        cut: "",
        fill: "",
        value: reuse ? "yes" : "no",
        unit: "",
      },
    ];
    downloadCsv("frelux-earthworks-cut-fill", rows, [
      { header: "Section", key: "section" },
      { header: "Item", key: "item" },
      { header: "From (m)", key: "from" },
      { header: "To (m)", key: "to" },
      { header: "Cut (m3)", key: "cut" },
      { header: "Fill (m3)", key: "fill" },
      { header: "Value", key: "value" },
      { header: "Unit", key: "unit" },
    ]);
  };

  const { fieldsRef, resultsRef, missing, handleCalculate } =
    useCalculatorFeedback<HTMLDivElement>();

  return (
    <>
      <PageHeader
        variant="tool"
        eyebrow="Measured survey takeoff"
        title={t("Earthworks: Cut & Fill")}
        subtitle="Enter cross-section areas from a survey or design and site-specific material factors. FRELUX calculates interval volumes with the average end-area method, without guessing soil behavior."
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: "Construction Tools", path: "/construction-tools" },
          { label: "Earthworks Cut & Fill" },
        ]}
      />
      <Container className="py-8 sm:py-10">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,.8fr)]">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
            <div ref={fieldsRef}>
              <MeasurementTip what="chainage and section area units" />
            </div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">
                  {t("Survey cross-sections")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Chainage in metres; section areas in square metres.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStations((v) => [...v, blankStation()])}
                className="rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
              >
                + Add station
              </button>
            </div>
            <div className="mt-5 space-y-3">
              {stations.map((station, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-xl bg-muted/35 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
                >
                  {(
                    [
                      ["chainageM", "Chainage (m)"],
                      ["cutAreaM2", "Cut area (m²)"],
                      ["fillAreaM2", "Fill area (m²)"],
                    ] as const
                  ).map(([key, label]) => (
                    <label
                      key={key}
                      className="grid gap-1 text-xs font-medium text-muted-foreground"
                    >
                      {label}
                      <input
                        aria-label={`Station ${index + 1} ${label}`}
                        className={inputClass}
                        type="number"
                        min="0"
                        step="any"
                        value={station[key]}
                        onChange={(e) =>
                          setStations((all) =>
                            all.map((item, i) =>
                              i === index
                                ? { ...item, [key]: e.target.value }
                                : item,
                            ),
                          )
                        }
                        placeholder={t("Enter survey value")}
                      />
                    </label>
                  ))}
                  <button
                    type="button"
                    aria-label={`Remove station ${index + 1}`}
                    disabled={stations.length <= 2}
                    onClick={() =>
                      setStations((all) => all.filter((_, i) => i !== index))
                    }
                    className="self-end rounded-lg px-3 py-2 text-sm text-destructive disabled:opacity-30"
                  >
                    {t("Remove")}
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium">
                {t("Soil description (informational)")}
                <span className="text-xs font-normal text-muted-foreground">
                  Optional description from the site investigation; it does not
                  set or change volume factors.
                </span>
                <input
                  className={inputClass}
                  value={soilDescription}
                  onChange={(e) => setSoilDescription(e.target.value)}
                  placeholder={t("Optional project soil description")}
                />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Bulking factor (%)
                <span className="text-xs font-normal text-muted-foreground">
                  From site investigation or project specification. Not inferred
                  from soil type.
                </span>
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  max="300"
                  step="any"
                  value={bulking}
                  onChange={(e) => setBulking(e.target.value)}
                  placeholder={t("Enter verified factor")}
                />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Shrinkage factor (%)
                <span className="text-xs font-normal text-muted-foreground">
                  Volume reduction from bank to compacted fill, per
                  geotechnical/project specification. Not inferred from soil
                  type.
                </span>
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  max="99.9"
                  step="any"
                  value={shrinkage}
                  onChange={(e) => setShrinkage(e.target.value)}
                  placeholder={t("Enter verified factor")}
                />
              </label>
            </div>
            <label className="mt-4 flex items-start gap-3 rounded-xl border border-border p-3 text-sm">
              <input
                className="mt-1"
                type="checkbox"
                checked={reuse}
                onChange={(e) => setReuse(e.target.checked)}
              />
              <span>
                <b>
                  Project engineer confirms cut material is suitable for this
                  fill.
                </b>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Only then show an indicative bank-volume import/surplus
                  balance.
                </span>
              </span>
            </label>
            <button
              type="button"
              onClick={() => handleCalculate(run)}
              className="mt-5 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm"
            >
              {t("Calculate cut & fill")}
            </button>
            <div className="mt-4">
              <MissingFieldsNotice fields={missing} />
            </div>
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
          <aside
            ref={resultsRef}
            className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7"
          >
            <p className="text-xs font-bold uppercase tracking-[.14em] text-primary">
              {t("Quantity report")}
            </p>
            <h2 className="mt-2 text-xl font-bold">{t("Measured volumes")}</h2>
            {result ? (
              <>
                <div className="mt-5 grid gap-3">
                  {(engineAccess.limited
                    ? earthworkRows.slice(0, engineAccess.visibleLines)
                    : earthworkRows
                  ).map(([label, value, unit]) => (
                    <div
                      key={String(label)}
                      className="flex items-center justify-between rounded-xl bg-muted/40 p-3"
                    >
                      <span className="text-sm text-muted-foreground">
                        {label}
                      </span>
                      <b>
                        {display(Number(value))} {unit}
                      </b>
                    </div>
                  ))}
                </div>
                {engineAccess.limited && engineAccess.engine && (
                  <div className="mt-4">
                    <EnginePreviewLock
                      engine={engineAccess.engine}
                      hiddenLines={engineAccess.hiddenLines(
                        earthworkRows.length,
                      )}
                    />
                  </div>
                )}
                {result.netBankSurplusM3 !== null && (
                  <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
                    {result.importBankM3 === 0 ? (
                      <>
                        <b>{display(result.netBankSurplusM3)} m³</b> potential
                        bank-volume surplus
                      </>
                    ) : (
                      <>
                        <b>{display(result.importBankM3!)} m³</b> indicative
                        bank-volume import required
                      </>
                    )}
                  </div>
                )}
                <div className="mt-5">
                  <CalculatorResetButton
                    onReset={resetInputs}
                    className="mb-4"
                  />
                  <HowCalculatedSection
                    methodologyText={`Volumes use the average end area method, the standard site method for cut and fill.

For each pair of stations the calculator takes the two cross-section areas, averages them, and multiplies by the chainage distance between them. Three stations give two volumes, one per interval.

Cut volumes are multiplied by your bulking factor, because excavated soil swells and the lorry is paid in loose cubic metres. Fill volumes are multiplied by your shrinkage factor, because fill compacts down and the material you import must exceed the void it fills.

With reuse switched on, suitable cut is netted against fill before anything is bought in or taken away, so you only pay to import the shortfall or remove the surplus.

The soil description is recorded for the job record. It does not change the quantities.`}
                    assumptions={[
                      { label: "Method", value: "Average end area" },
                      { label: "Bulking and shrinkage", value: "Your factors" },
                    ]}
                  />
                  <ShareEstimateButton
                    estimate={{
                      kind: "Earthworks Quantity Report",
                      title: "Cut and fill volumes",
                      summaryLines: [
                        {
                          label: "Sections measured",
                          value: String(result.intervals.length),
                        },
                        {
                          label: "Stations in schedule",
                          value: String(result.intervals.length * 2),
                        },
                      ],
                      lineItems: (engineAccess.limited
                        ? earthworkRows.slice(0, engineAccess.visibleLines)
                        : earthworkRows
                      ).map(([label, value, unit]) => ({
                        description: String(label),
                        quantity: `${display(Number(value))} ${unit}`,
                      })),
                      totals:
                        result.netBankSurplusM3 !== null
                          ? [
                              {
                                label:
                                  result.importBankM3 === 0
                                    ? "Potential bank-volume surplus"
                                    : "Indicative bank-volume import",
                                value: `${display(
                                  result.importBankM3 === 0
                                    ? result.netBankSurplusM3
                                    : result.importBankM3!,
                                )} m³`,
                                emphasized: true,
                              },
                            ]
                          : [],
                      notes: result.assumptions,
                      link: "/earthworks-estimator",
                    }}
                    compact
                  />
                </div>
                <div className="mt-5">
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold">
                      {t("Interval schedule")}
                    </h3>
                    <button
                      type="button"
                      onClick={exportCsv}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                    >
                      Export CSV
                    </button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {result.intervals.map((row) => (
                      <p
                        key={`${row.fromM}-${row.toM}`}
                        className="text-xs text-muted-foreground"
                      >
                        {row.fromM}–{row.toM} m: cut {display(row.cutM3)} m³ ·
                        fill {display(row.fillM3)} m³
                      </p>
                    ))}
                  </div>
                </div>
                <ul className="mt-5 space-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
                  {soilDescription.trim() && (
                    <li>
                      • User-provided soil description: {soilDescription.trim()}
                      . This label does not affect computed factors.
                    </li>
                  )}
                  {result.assumptions.map((note) => (
                    <li key={note}>• {note}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-5 rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
                Complete each surveyed station and enter project-specific
                factors to see results. No soil or survey values are prefilled.
              </p>
            )}
            <p className="mt-5 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
              Estimating only. Not a survey, geotechnical report, compaction
              specification, or civil-engineering design. Check cross-sections,
              material suitability, and factors with the responsible engineer.
            </p>
          </aside>
        </div>

        {/* Ad slot, placement "calculator_mid" */}
        <RecommendedProducts category="aggregate" />

        <AdSlot slotKey="calculator_mid" className="mt-8" />
        {/* Native banner slot, placement "calculator_native" */}
        <AdSlot slotKey="calculator_native" className="mt-8" />
        <EstimateDisclaimer />
      </Container>
      <div className="mt-10">
        <RelatedTools
          links={[
            CALC_LINKS.buildToRoof,
            CALC_LINKS.structuralCalc,
            CALC_LINKS.foundationCalc,
          ]}
        />
      </div>
    </>
  );
}
