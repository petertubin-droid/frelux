/**
 * FRELUX Flooring Estimator (Tier 2, Engine 4)
 *
 * Deterministic plank/sheet flooring MATERIAL estimation:
 * measured floor area and skirting run → laminate packs, vinyl or
 * parquet m², underlay, adhesive and skirting quantities, with
 * coverage, pack sizes and waste visible in the breakdown, prices
 * from the shared material database (never invented), labour
 * separate.
 *
 * This is ESTIMATION, not a flooring specification.
 */

import { useEffect, useState, useMemo, useCallback } from "react";
import MeasurementTip from "@/components/ui/MeasurementTip";
import { BuildingTemplatePanel } from "@/components/measurement/BuildingTemplatePanel";
import RecommendedProducts from "@/components/estimation/RecommendedProducts";
import { useAuth } from "@/lib/auth";
import { useMarket } from "@/lib/international/market-context";
import {
  convertArea,
  convertLength,
  type AreaUnit,
  type LengthUnit,
} from "@/lib/convert/units";
import { track } from "@/lib/analytics";
import { getSafeError } from "@/lib/safeError";
import {
  fetchCalcRules,
  fetchEstimationMaterials,
  fetchMarketPriceBook,
  createEstimate,
  createEstimateItem,
} from "@/lib/estimation/queries";
import {
  SaveToProjectButton,
  CopyResultsButton,
} from "@/components/calculators";
import {
  summarisePriceBook,
  type PriceBookSummary,
} from "@/lib/prices/freshness";
import { formatCurrency } from "@/lib/utils";
import { useDisplayCurrency } from "@/lib/international/currency-context";
import { exportQuoteToDocumentStudio } from "@/lib/estimation/quote-export";
import SpecialtyCalculatorShell from "@/components/calculators/SpecialtyCalculatorShell";
import { mergePriceOverrides } from "@/components/calculators/useSpecialtyPrices";
import type { SpecialtyResult } from "@/lib/estimation/specialty";
import {
  calculateFlooring,
  parseFlooringRules,
  type FlooringInput,
  type FlooringPriceMap,
  type FlooringResult,
} from "@/lib/estimation/flooring-engine";
import type {
  EstimationCalcRule,
  EstimationMaterial,
} from "@/types/estimation";

import { useLanguage } from "@/lib/i18n";
import { NearbySuppliersLink } from "@/components/map/NearbySuppliersLink";
import { WasteFactorControl } from "@/components/calculators/WasteFactorControl";
import { useWasteBridge } from "@/lib/waste/use-waste-settings";

type FloorType = "laminate" | "vinyl" | "parquet";

const FLOOR_TYPES: { value: FloorType; label: string }[] = [
  { value: "laminate", label: "Laminate (packs)" },
  { value: "vinyl", label: "Vinyl / PVC (m²)" },
  { value: "parquet", label: "Parquet (m²)" },
];

export default function FlooringEstimator() {
  const [templateResetKey, setTemplateResetKey] = useState(0);

  const resetInputs = () => {
    setTemplateResetKey((value) => value + 1);
    setFloorType("laminate");
    setAreaInput("");
    setSkirtingInput("");
    setIncludeUnderlay(true);
    setIncludeAdhesive(false);
    setLabourMode("none");
    setLabourRate("");
    setResult(null);
  };
  const { t } = useLanguage();
  const { symbol: displayCurrencySymbol } = useDisplayCurrency();
  const { user } = useAuth();
  const {
    marketCode,
    market,
    preferredAreaUnit,
    preferredLengthUnit,
    setAreaUnit,
    setLengthUnit,
  } = useMarket();
  const areaUnit: AreaUnit = preferredAreaUnit === "sqft" ? "ft2" : "m2";
  const lengthUnit: LengthUnit = preferredLengthUnit === "feet" ? "ft" : "m";
  const areaLabel = areaUnit === "ft2" ? "ft²" : "m²";
  const lengthLabel = lengthUnit === "ft" ? "ft" : "m";
  /** Money per square metre, whichever area unit the visitor is typing in. */
  const rateFactor = convertArea(1, "m2", areaUnit) ?? 1;
  const currencySymbol = market?.currencySymbol || displayCurrencySymbol || "₦";
  const currencyCode = market?.currencyCode || "NGN";

  const [floorType, setFloorType] = useState<FloorType>("laminate");
  const [areaInput, setAreaInput] = useState("");
  const [skirtingInput, setSkirtingInput] = useState("");
  const [includeUnderlay, setIncludeUnderlay] = useState(true);
  const [includeAdhesive, setIncludeAdhesive] = useState(false);
  const [labourMode, setLabourMode] = useState<"none" | "per_m2" | "lump_sum">(
    "none",
  );
  const [labourRate, setLabourRate] = useState("");
  const [result, setResult] = useState<FlooringResult | null>(null);
  const [saveState, setSaveState] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // A buyer's own supplier price for a line the book does not cover. Kept per
  // material so the same price survives a recalculation.
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  const [priceMap, setPriceMap] = useState<FlooringPriceMap>({});
  const [bookFreshness, setBookFreshness] = useState<PriceBookSummary | null>(
    null,
  );
  const [ruleRows, setRuleRows] = useState<EstimationCalcRule[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [rulesRes, matsRes, book] = await Promise.all([
        fetchCalcRules("flooring"),
        fetchEstimationMaterials(true),
        fetchMarketPriceBook(marketCode),
      ]);
      if (!alive) return;
      setBookFreshness(summarisePriceBook(book));
      const byRef = book.byRef;
      const map: FlooringPriceMap = {};
      for (const m of (matsRes.data ?? []) as EstimationMaterial[]) {
        map[m.slug] = byRef.get(m.id) ?? null;
      }
      setPriceMap(map);
      setRuleRows(rulesRes.data as unknown as EstimationCalcRule[]);
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, [marketCode]);

  const rules = useMemo(
    () => parseFlooringRules(ruleRows as never),
    [ruleRows],
  );

  // Floor waste comes from the owner's rule unless the visitor chooses one for
  // flooring materials. The engine applies it once, in calculateFlooring.
  const sharedWaste = useWasteBridge("flooring", rules.floor_waste_pct);
  const calcRules = useMemo(
    () => ({ ...rules, floor_waste_pct: sharedWaste.value }),
    [rules, sharedWaste.value],
  );

  const displayToAreaM2 = useCallback(
    (value: number) => convertArea(value, areaUnit, "m2") ?? value,
    [areaUnit],
  );
  const displayToLengthM = useCallback(
    (value: number) => convertLength(value, lengthUnit, "m") ?? value,
    [lengthUnit],
  );
  const areaM2ToDisplay = (value: number) =>
    convertArea(value, "m2", areaUnit) ?? value;
  const lengthMToDisplay = (value: number) =>
    convertLength(value, "m", lengthUnit) ?? value;

  const input: FlooringInput = useMemo(() => {
    const run = (v: string): number | null => {
      const trimmed = v.trim();
      if (!trimmed) return null;
      const n = Number(trimmed);
      return Number.isFinite(n) ? n : Number.NaN;
    };
    const area = run(areaInput);
    const skirting = run(skirtingInput);
    const rate = run(labourRate);
    return {
      flooring_type: floorType,
      floor_area_m2: area === null ? null : displayToAreaM2(area),
      skirting_run_m: skirting === null ? null : displayToLengthM(skirting),
      include_underlay: includeUnderlay,
      include_adhesive: includeAdhesive,
      labour: {
        mode: labourMode,
        per_m2_rate:
          labourMode === "per_m2" && rate !== null && Number.isFinite(rate)
            ? rate * rateFactor
            : null,
        lump_sum: labourMode === "lump_sum" ? rate : null,
      },
    };
  }, [
    floorType,
    areaInput,
    skirtingInput,
    includeUnderlay,
    includeAdhesive,
    labourMode,
    labourRate,
    displayToAreaM2,
    displayToLengthM,
    rateFactor,
  ]);

  const pricedMap = useMemo<FlooringPriceMap>(
    () => mergePriceOverrides(priceMap, overrides),
    [priceMap, overrides],
  );

  const run = useCallback(() => {
    const res = calculateFlooring(input, calcRules, pricedMap);
    setResult(res);
    track("calculator_completed", {
      calculator: "flooring",
      incomplete: res.incomplete,
      lines: res.lines.length,
    });
  }, [input, calcRules, pricedMap]);

  // Printable professional quote, worldwide-currency formatted.
  const exportToDocumentStudio = () => {
    if (!result?.ok) return;
    exportQuoteToDocumentStudio(
      {
        title: "FRELUX Flooring Estimate",
        subtitle: `Generated ${new Date().toLocaleDateString()} · ${result.lines.length} line item(s)`,
        metaRows: result.steps.map(
          (step) => [step.label, step.detail] as [string, string],
        ),
        lines: result.lines.map((line) => ({
          label: line.label,
          quantity:
            line.quantity === null ? "unavailable" : String(line.quantity),
          unit: line.unit,
          unit_price:
            line.unit_price === null ? "unavailable" : String(line.unit_price),
          line_total:
            line.line_total === null ? "unavailable" : String(line.line_total),
          detail: line.detail,
        })),
        totals: [
          {
            label: "Estimate total",
            value:
              result.grand_total === null
                ? "Unavailable"
                : String(result.grand_total),
          },
        ],
        warnings: result.warnings,
      },
      currencyCode,
      "quotation",
    );
    window.location.assign("/document-studio");
  };

  const save = useCallback(async () => {
    if (!result || !result.ok || saving) return;
    setSaving(true);
    setSaveState(null);
    try {
      const ref = `FLOOR-${Date.now().toString(36).toUpperCase()}`;
      const { data: estimate, error } = await createEstimate({
        estimate_ref: ref,
        user_id: user?.id ?? null,
        client_hash: null,
        calculator_type: "flooring",
        project_description: "Flooring estimate",
        inputs: input as unknown as Record<string, unknown>,
        calculation_method: "flooring_v1",
        calculated_quantities: {
          lines: result.lines,
          priced_subtotal: result.priced_subtotal,
          material_subtotal: result.material_subtotal,
          labour_total: result.labour_total,
          incomplete: result.incomplete,
        },
        total_material_cost: result.material_subtotal ?? 0,
        currency: currencyCode,
        labour_status:
          labourMode === "none"
            ? "not_included"
            : result.labour_total > 0
              ? "included"
              : "negotiated_separately",
        warnings: [
          ...result.warnings,
          ...result.missing.map((m) => `Missing: ${m}`),
        ],
        recommendations: [],
        notes: null,
        status: result.incomplete ? "draft" : "saved",
      });
      if (error) throw error;
      for (const line of result.lines) {
        const { error: itemError } = await createEstimateItem({
          estimate_id: estimate!.id,
          item_name: line.label,
          item_type: "material",
          product_id: null,
          quality_level_id: null,
          material_id: null,
          quantity_required: line.quantity ?? 0,
          practical_purchase_qty: line.quantity ?? 0,
          unit: line.unit,
          pack_size: null,
          unit_price: line.unit_price ?? 0,
          total_price: line.line_total ?? 0,
          price_snapshot: { base: line.unit_price, currency: currencyCode },
          calculation_source: "calculated",
          notes: line.detail,
        } as never);
        if (itemError) throw itemError;
      }
      setSaveState(
        result.incomplete
          ? `Saved as draft (${ref}): complete the missing inputs for a final estimate.`
          : `Saved (${ref}). Import it into a BOQ or project from your estimates.`,
      );
      track("calculator_completed", { calculator: "flooring_saved", ref });
    } catch (err) {
      setSaveState(`Could not save: ${getSafeError(err)}`);
    } finally {
      setSaving(false);
    }
  }, [result, saving, user, input, labourMode, currencyCode]);

  const numberInput = (
    label: string,
    state: string,
    setter: (v: string) => void,
    placeholder = "0",
    key?: string,
    required?: boolean,
  ) => (
    <label key={key ?? label} className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        value={state}
        onChange={(e) => setter(e.target.value)}
        placeholder={placeholder}
        aria-required={required ? "true" : undefined}
        data-required={required ? "true" : undefined}
        data-field-label={label}
        className="w-full rounded-md border border-input bg-background px-3 py-2"
      />
    </label>
  );

  /**
   * Switching a unit converts the typed figure, so a measurement never
   * silently changes meaning between m² and ft².
   */
  const switchAreaUnit = (next: "m2" | "ft2") => {
    if (next === areaUnit) return;
    const value = Number(areaInput);
    if (Number.isFinite(value) && value > 0) {
      const converted = convertArea(value, areaUnit, next);
      if (converted !== null) {
        setAreaInput(String(Math.round(converted * 100) / 100));
      }
    }
    void setAreaUnit(next === "ft2" ? "sqft" : "sqm");
  };

  const switchLengthUnit = (next: LengthUnit) => {
    if (next === lengthUnit) return;
    const value = Number(skirtingInput);
    if (Number.isFinite(value) && value > 0) {
      const converted = convertLength(value, lengthUnit, next);
      if (converted !== null) {
        setSkirtingInput(String(Math.round(converted * 100) / 100));
      }
    }
    void setLengthUnit(next === "ft" ? "feet" : "meters");
  };

  const specialtyResult: SpecialtyResult | null = result
    ? { ...result, tax_status: "tax_not_determined" }
    : null;

  return (
    <SpecialtyCalculatorShell
      calculatorType="flooring"
      title={t("Flooring Estimator")}
      subtitle="Enter your measured floor area and skirting run. The engine sizes laminate packs, vinyl or parquet m², underlay, adhesive and skirting with the visible coverage, pack-size and waste rules. Estimation only: not a flooring specification."
      seoTitle="Flooring Estimator: Laminate, Vinyl, Parquet, Underlay & Skirting | FRELUX"
      seoDescription="Deterministic flooring material estimation: enter your floor area and skirting run and get laminate packs, vinyl or parquet m², underlay, adhesive and skirting quantities with pack coverage and waste shown in the breakdown. Estimation only: not a flooring specification."
      breadcrumbName="Flooring Estimator"
      routePath="/flooring"
      methodology="flooring"
      limitations={[
        "This sizes materials from a floor area and skirting run you measured. It does not measure a room or verify the area against the building.",
        "Substrate preparation, levelling compound, damp proofing and screeding are separate jobs and are not included here.",
        "Labour is added only when you enter a rate or a lump sum; installation method and acclimatisation are your decision.",
        "This is material estimation, not a flooring specification.",
      ]}
      result={specialtyResult}
      onRun={run}
      priceOverrides={overrides}
      onPriceOverride={(slug, value) =>
        setOverrides((prev) => ({ ...prev, [slug]: value }))
      }
      bookSummary={bookFreshness}
      quoteTitle="FRELUX Flooring Estimate"
      quoteFooter="Indicative flooring material estimate from your measured area and skirting run. Substrate preparation and levelling are excluded."
      onReset={resetInputs}
      crossLinks={[
        {
          label: "Tile calculator",
          to: "/tile-calculator",
          description:
            "Tile counts and adhesive for a wet or hard floor, using the same measured area.",
        },
        {
          label: "Finish estimator",
          to: "/finish-estimator",
          description:
            "Compare floor and wall finishes side by side before you commit to one.",
        },
        {
          label: "Skirting calculator",
          to: "/skirting-calculator",
          description:
            "The same skirting run priced on its own, with mitres and fixing.",
        },
      ]}
      notes={
        <p>
          Rules in use: {calcRules.floor_waste_pct}% waste on flooring
          materials. Laminate is ordered in whole packs; vinyl and parquet in
          whole square metres. Prices come from the shared FRELUX material
          database, and an unpriced line stays unpriced rather than guessing.
        </p>
      }
      extraActions={
        <>
          {result?.ok && (
            <button
              onClick={save}
              disabled={saving || result.lines.length === 0}
              className="rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save estimate"}
            </button>
          )}
          {result?.ok && (
            <button
              onClick={exportToDocumentStudio}
              className="rounded-md border px-4 py-2 text-sm font-medium"
            >
              {t("Customize in Document Studio")}
            </button>
          )}
          {result?.ok && (
            <CopyResultsButton
              block={{
                title: "Flooring estimate",
                lines: result.lines.map((line) => ({
                  label: line.label,
                  value:
                    line.quantity === null
                      ? "unavailable"
                      : `${line.quantity} ${line.unit}`,
                })),
                total:
                  result.grand_total === null
                    ? "Grand total: not available until every line is priced"
                    : `Grand total: ${formatCurrency(result.grand_total, currencySymbol)}`,
                sourceUrl:
                  typeof window === "undefined"
                    ? undefined
                    : window.location.href,
              }}
            />
          )}
          {result?.ok && (
            <SaveToProjectButton
              calculatorType="flooring"
              calculatorSlug="flooring-estimator"
              calcTitle="Flooring estimate"
              calcData={input as unknown as Record<string, unknown>}
              resultSummary={{
                grand_total: result.grand_total,
                material_subtotal: result.material_subtotal,
                labour_total: result.labour_total,
                incomplete: result.incomplete,
              }}
              materials={result.lines
                .filter((l) => l.quantity !== null)
                .map((l) => ({
                  name: l.label,
                  category: "flooring",
                  quantity: l.quantity ?? 0,
                  unit: l.unit,
                  estimated_price: l.unit_price ?? undefined,
                }))}
            />
          )}
          {saveState && (
            <p
              className="text-sm text-muted-foreground"
              data-testid="save-state"
            >
              {saveState}
            </p>
          )}
        </>
      }
      afterResults={
        <>
          <NearbySuppliersLink material="floor tiles" />
          <RecommendedProducts category="flooring" />
        </>
      }
      inputs={
        <>
          <h3 className="mb-1 font-semibold">
            {t("Flooring type and measurements")}
          </h3>
          <p className="mb-2 text-xs text-muted-foreground">
            The engine never assumes areas. Enter your measured floor area and
            skirting run. Leave a field blank when it needs a decision (the
            estimate is marked incomplete); enter 0 only when there is truly
            none.
          </p>
          <div className="mb-4">
            <MeasurementTip what="flooring unit and waste setting" />
          </div>
          <div className="mb-4">
            <BuildingTemplatePanel
              marketCode={marketCode}
              resetKey={templateResetKey}
              surface="floor"
              onChange={(areaM2, totals) => {
                setAreaInput(
                  areaM2 > 0
                    ? String(Math.round(areaM2ToDisplay(areaM2) * 100) / 100)
                    : "",
                );
                setSkirtingInput(
                  totals && totals.perimeterM > 0
                    ? String(
                        Math.round(lengthMToDisplay(totals.perimeterM) * 100) /
                          100,
                      )
                    : "",
                );
                setResult(null);
              }}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Templates provide starting room dimensions only. The skirting
              figure is the sum of room perimeters, so a wall shared by two
              rooms is counted twice and door openings are not deducted. Edit
              the schedule, measure the floor area and skirting, and deduct
              shared partitions and door openings before ordering.
            </p>
          </div>
          <label className="mb-3 block text-sm sm:max-w-xs">
            <span className="mb-1 block font-medium">{t("Flooring type")}</span>
            <select
              value={floorType}
              onChange={(e) => setFloorType(e.target.value as FloorType)}
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            >
              {FLOOR_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">{t("Units")}</span>
            <div className="inline-flex overflow-hidden rounded-md border border-input">
              {(["m2", "ft2"] as const).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  aria-pressed={areaUnit === unit}
                  aria-label={`Area in ${unit === "ft2" ? "ft²" : "m²"}`}
                  onClick={() => switchAreaUnit(unit)}
                  className={`px-2.5 py-1.5 ${areaUnit === unit ? "bg-primary font-semibold text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  {unit === "ft2" ? "ft²" : "m²"}
                </button>
              ))}
            </div>
            <div className="inline-flex overflow-hidden rounded-md border border-input">
              {(["m", "ft"] as const).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  aria-pressed={lengthUnit === unit}
                  aria-label={`Length in ${unit === "ft" ? "ft" : "m"}`}
                  onClick={() => switchLengthUnit(unit)}
                  className={`px-2.5 py-1.5 ${lengthUnit === unit ? "bg-primary font-semibold text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  {unit === "ft" ? "ft" : "m"}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {numberInput(
              `Floor area (${areaLabel})`,
              areaInput,
              setAreaInput,
              "0",
              undefined,
              true,
            )}
            {numberInput(
              `Skirting run: room perimeter (${lengthLabel})`,
              skirtingInput,
              setSkirtingInput,
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeUnderlay}
                onChange={(e) => setIncludeUnderlay(e.target.checked)}
              />
              {t("Include underlay")}
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeAdhesive}
                onChange={(e) => setIncludeAdhesive(e.target.checked)}
              />
              {t("Include adhesive (glue-down installations)")}
            </label>
          </div>
          <div className="mt-4">
            <WasteFactorControl
              material="flooring"
              baseQuantity={
                Number(areaInput) > 0
                  ? displayToAreaM2(Number(areaInput))
                  : undefined
              }
              unit="m²"
              packageSize={calcRules.laminate_pack_coverage_m2 ?? null}
              compact
            />
          </div>

          <h3 className="mt-5 mb-2 font-semibold">{t("Labour")}</h3>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium">{t("Labour mode")}</span>
              <select
                value={labourMode}
                onChange={(e) =>
                  setLabourMode(e.target.value as typeof labourMode)
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 sm:w-56"
              >
                <option value="none">{t("Not included")}</option>
                <option value="per_m2">{`Per ${areaLabel} treated (rate)`}</option>
                <option value="lump_sum">{t("Lump sum")}</option>
              </select>
            </label>
            {labourMode !== "none" &&
              numberInput(
                labourMode === "per_m2"
                  ? `Rate per ${areaLabel} (${currencySymbol})`
                  : `Lump sum (${currencySymbol})`,
                labourRate,
                setLabourRate,
              )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Labour is always separate from material quantities and is never
            added automatically.
          </p>
        </>
      }
    />
  );
}
