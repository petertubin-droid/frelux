/**
 * FRELUX Configurable Finish Calculator (Phases 3-4)
 *
 * Deterministic, database-configured estimation for finish categories
 * with database-verified product data (Mineral Stone, Stucco).
 *
 * - Every business value comes from the database through
 *   fetchConfigurableFinishProducts('mineral_stone'):
 *   products, application profiles, package sizes, prices.
 * - The calculation is performed ONLY by calculateMineralStone.
 *   This page renders and saves the result; it never computes quantities.
 * - Missing configuration produces explicit data-requirement warnings,
 *   never guessed values.
 * - No placeholder/demo products: if nothing is configured, the page says so.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useSeo, useBreadcrumbJsonLd } from "@/lib/seo";
import { track, type TrackEvent } from "@/lib/analytics";
import { trackCalculation } from "@/lib/achievements";
import { trackRecentTool } from "@/lib/smart-defaults";
import { formatNumber, formatArea, SQFT_PER_SQM } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { ShareEstimateButton } from "@/components/ShareEstimateButton";
import { printQuote } from "@/lib/estimation/quote-export";
import { getSafeError } from "@/lib/safeError";
import Container from "@/components/ui/Container";
import MeasurementTip from "@/components/ui/MeasurementTip";
import MissingFieldsNotice from "@/components/ui/MissingFieldsNotice";
import { useCalculatorFeedback } from "@/hooks/useCalculatorFeedback";
import { missingField } from "@/lib/forms/missing-fields";
import LabourCostSection, {
  useLabourConfig,
} from "@/components/labour/LabourCostSection";
import { useMarket } from "@/lib/international/market-context";
import { resolveMarketAreaUnit } from "@/lib/international/room-unit-defaults";
import { BuildingTemplatePanel } from "@/components/measurement/BuildingTemplatePanel";
import { useBuildingSize } from "@/lib/measurement/building-size-context";
import { buildingAreaM2 } from "@/lib/measurement/building-schedule";
import { useCurrencySymbol } from "@/lib/international";
import { calculateLabourCost } from "@/lib/labour";
import PageHeader from "@/components/ui/PageHeader";
import { EstimateDisclaimer } from "@/components/calculators";
import { useLanguage } from "@/lib/i18n";
import {
  fetchConfigurableFinishProducts,
  createEstimate,
  createEstimateItem,
  type ConfigurableFinishProduct,
} from "@/lib/estimation/queries";
import {
  calculateMineralStone,
  type MineralStoneResult,
} from "@/lib/estimation/mineral-stone-engine";

export interface ConfigurableFinishCalculatorProps {
  /** Product category loaded from the database ('mineral_stone' | 'stucco') */
  category: "mineral_stone" | "stucco";
  /** estimate_ref prefix, e.g. MST / STC */
  refPrefix: string;
  /** Page header + PDF title */
  title: string;
  subtitle: string;
  /** analytics event name */
  calcEvent: TrackEvent;
  /** calculator_type used for estimates, achievements and recent tools */
  calculatorType: string;
  embedded?: boolean;
}

function fmt(n: number, digits = 2): string {
  return formatNumber(n, digits);
}

/**
 * Areas leave this calculator in the unit the customer typed. The engine works
 * in square metres and stays there; only the labelling changes.
 */
function areaUnitOf(areaUnit: string | null | undefined): "sqft" | "sqm" {
  return areaUnit === "m2" ? "sqm" : "sqft";
}

function rangeLabel(
  min: number | null,
  max: number | null,
  unit: string,
  digits = 2,
): string {
  if (min === null || max === null) return "N/A";
  if (min === max) return `${fmt(min, digits)} ${unit}`;
  return `${fmt(min, digits)}–${fmt(max, digits)} ${unit}`;
}

export default function ConfigurableFinishCalculator({
  category,
  refPrefix,
  title,
  subtitle,
  calcEvent,
  calculatorType,
  embedded = false,
}: ConfigurableFinishCalculatorProps) {
  const { t } = useLanguage();
  const market = useMarket();
  const { marketCode } = market;
  useBreadcrumbJsonLd([
    { name: "Calculators", path: "/calculators" },
    {
      name: "Configurable Finish Calculator",
      path: "/configurable-finish-calculator",
    },
  ]);
  useSeo({
    title: `${title}: FRELUX`,
    description: `${subtitle} Deterministic calculator with database-verified product coverage and consumption data, package quantities, waste configuration and full calculation breakdown.`,
  });

  const [searchParams] = useSearchParams();

  // ── Config state ──
  // Market currency for the visitor's selected market.
  const currencySymbol = useCurrencySymbol();

  const [products, setProducts] = useState<ConfigurableFinishProduct[]>([]);
  const [configError, setConfigError] = useState<string | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [calcVersionId, setCalcVersionId] = useState<string | null>(null);

  // ── User input ──
  const [productId, setProductId] = useState<string>("");
  const [profileId, setProfileId] = useState<string>("");
  const [area, setArea] = useState("");
  const [areaUnit, setAreaUnit] = useState<"m2" | "ft2">("m2");
  // Market-aware area unit: NG keeps the established square-metre
  // default; imperial markets open in square feet. Re-seeds only when
  // the resolved market changes (never on every render).
  const marketAreaUnit = resolveMarketAreaUnit(market.market, "m2");
  const [areaUnitSeeded, setAreaUnitSeeded] = useState(false);
  useEffect(() => {
    if (areaUnitSeeded) return;
    if (market.isLoading) return;
    setAreaUnit(marketAreaUnit);
    setAreaUnitSeeded(true);
  }, [marketAreaUnit, market.isLoading, areaUnitSeeded]);
  const [coats, setCoats] = useState<string>("");

  // ── Result / save state ──
  const [result, setResult] = useState<MineralStoneResult | null>(null);
  // Shared labour layer: completes the estimate to the very end
  const { config: labourConfig, setConfig: setLabourConfig } = useLabourConfig(
    "global",
    marketCode,
  );
  const labourAreaM2 = result?.area_m2 ?? 0;
  const labourCost = calculateLabourCost(labourConfig, labourAreaM2);
  const [calculating, setCalculating] = useState(false);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [saveMessage, setSaveMessage] = useState<string>("");

  // ── Load database configuration ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setConfigLoading(true);
      try {
        const { data, error } = await fetchConfigurableFinishProducts(category);
        if (cancelled) return;
        if (error) {
          setConfigError(error);
        } else {
          setProducts(data);
          const fromUrl = searchParams.get("product");
          if (fromUrl && data.some((p) => p.slug === fromUrl)) {
            setProductId(data.find((p) => p.slug === fromUrl)!.id);
          } else if (data.length > 0) {
            setProductId(data[0].id);
          }
        }
        const { data: versions } = await supabase
          .from("estimation_calc_versions")
          .select("id")
          .eq("calculator_type", calculatorType)
          .eq("is_active", true)
          .order("version_number", { ascending: false })
          .limit(1);
        if (!cancelled && versions && versions.length > 0) {
          setCalcVersionId(versions[0].id);
        }
      } catch (err) {
        if (!cancelled)
          setConfigError(getSafeError(err, "Failed to load configuration."));
      } finally {
        if (!cancelled) setConfigLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId) ?? null,
    [products, productId],
  );

  const selectedProfile = useMemo(
    () => selectedProduct?.profiles.find((q) => q.id === profileId) ?? null,
    [selectedProduct, profileId],
  );

  // When the product changes, select its first profile and seed coats
  useEffect(() => {
    if (!selectedProduct) {
      setProfileId("");
      setCoats("");
      return;
    }
    const first = selectedProduct.profiles[0];
    setProfileId(first ? first.id : "");
    setCoats(
      first?.default_coats !== null && first?.default_coats !== undefined
        ? String(first.default_coats)
        : "",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const {
    fieldsRef,
    resultsRef,
    missing,
    handleCalculate: calculateWithScroll,
    reportMissing,
  } = useCalculatorFeedback<HTMLDivElement>();

  // ── Calculation (engine call only - no math in this page) ──
  const handleCalculate = useCallback(() => {
    if (!selectedProduct || !selectedProfile) {
      setResult(null);
      return;
    }
    setCalculating(true);
    setSaveState("idle");
    try {
      const engineResult = calculateMineralStone(
        {
          area: area ? Number(area) : NaN,
          area_unit: areaUnit,
          coats: coats ? Number(coats) : null,
        },
        {
          product: {
            id: selectedProduct.id,
            name: selectedProduct.name,
            slug: selectedProduct.slug,
            brand: selectedProduct.brand,
            product_notes: selectedProduct.product_notes,
            technical_spec: selectedProduct.technical_spec,
            standard_pack_size: selectedProduct.standard_pack_size,
            pack_unit_symbol: selectedProduct.pack_unit_symbol,
            price_per_pack: selectedProduct.price_per_pack,
          },
          profile: {
            id: selectedProfile.id,
            name: selectedProfile.name,
            slug: selectedProfile.slug,
            is_active: selectedProfile.is_active,
            calculation_model: selectedProfile.calculation_model,
            coverage: null,
            coverage_min: selectedProfile.coverage_min,
            coverage_max: selectedProfile.coverage_max,
            coverage_unit: "m2_per_package",
            consumption_min: selectedProfile.consumption_min,
            consumption_max: selectedProfile.consumption_max,
            consumption_unit: selectedProfile.consumption_unit,
            default_coats: selectedProfile.default_coats,
            waste_percentage: selectedProfile.waste_percentage,
          },
        },
      );
      setResult(engineResult);
      track(calcEvent, {
        calculable: engineResult.calculable,
      });
      if (engineResult.calculable) {
        trackCalculation(calculatorType as never);
        trackRecentTool(
          "/finishing-calculator?mode=mineral-stone",
          "Mineral Stone Calculator",
          "Calculator",
        );
      }
    } finally {
      setCalculating(false);
    }
  }, [selectedProduct, selectedProfile, area, areaUnit, coats]);

  // ── Save estimate (authoritative result, price snapshot included) ──
  const handleSave = useCallback(async () => {
    if (!result || !result.calculable || !selectedProduct || !selectedProfile)
      return;
    setSaveState("saving");
    setSaveMessage("");
    try {
      const estimateRef = `${refPrefix}-${Date.now().toString(36).toUpperCase()}`;
      const totalCost = result.cost_min ?? 0;
      const { data: estimate, error: estError } = await createEstimate({
        estimate_ref: estimateRef,
        user_id: null,
        client_hash: null,
        calculator_type: calculatorType,
        project_description: `Mineral Stone: ${selectedProduct.name} / ${selectedProfile.name}`,
        inputs: {
          product_id: selectedProduct.id,
          product_name: selectedProduct.name,
          profile_id: selectedProfile.id,
          profile_name: selectedProfile.name,
          area: Number(area),
          area_unit: areaUnit,
          area_m2: result.area_m2,
          coats: result.coats,
        },
        calculation_method: "area_based",
        calc_version_id: calcVersionId,
        calculated_quantities: {
          calculation_model: result.calculation_model,
          coverage_min: result.coverage_min,
          coverage_max: result.coverage_max,
          consumption_min: result.consumption_min,
          consumption_max: result.consumption_max,
          consumption_unit: result.consumption_unit,
          pack_size: result.pack_size,
          pack_unit: result.pack_unit,
          waste_percentage: result.waste_percentage,
          material_min: result.material_min,
          material_max: result.material_max,
          material_unit: result.material_unit,
          with_waste_min: result.with_waste_min,
          with_waste_max: result.with_waste_max,
          purchase_min: result.purchase_min,
          purchase_max: result.purchase_max,
          price_per_pack: result.price_per_pack,
          cost_min: result.cost_min,
          cost_max: result.cost_max,
          steps: result.steps,
          product_notes: result.product_notes,
          technical_spec: result.technical_spec,
        },
        total_material_cost: totalCost,
        currency: "NGN",
        labour_status: labourConfig.includeLabour ? "included" : "not_included",
        warnings: result.warnings,
        recommendations: [],
        status: "calculated",
      });
      if (estError || !estimate) {
        setSaveState("error");
        setSaveMessage(estError?.message ?? "Save failed.");
        return;
      }
      const { error: itemError } = await createEstimateItem({
        estimate_id: estimate.id,
        item_name: selectedProduct.name,
        item_type: "product",
        product_id: selectedProduct.id,
        quality_level_id: selectedProfile.id,
        quantity_required: result.material_min ?? 0,
        practical_purchase_qty: result.purchase_min ?? 0,
        unit: result.purchase_unit ?? "package",
        pack_size: result.pack_size,
        unit_price: result.price_per_pack ?? 0,
        total_price: totalCost,
        price_snapshot: {
          price_type: "product",
          ref_id: selectedProduct.id,
          price: result.price_per_pack ?? 0,
          currency: "NGN",
          captured_at: new Date().toISOString(),
        },
        calculation_source: "calculated",
        adjustment_status: "none",
        sort_order: 0,
      });
      if (itemError) throw itemError;
      setSaveState("saved");
      setSaveMessage(`Saved as estimate ${estimateRef}.`);
    } catch (err) {
      setSaveState("error");
      setSaveMessage(getSafeError(err, "Save failed."));
    }
  }, [result, selectedProduct, selectedProfile, area, areaUnit, calcVersionId]);

  // ── PDF export: printable document built from the SAME result ──
  const handleExportPdf = useCallback(() => {
    if (!result) return;
    const costValue =
      result.cost_min === null
        ? "Price not configured"
        : result.cost_min === result.cost_max
          ? formatCurrency(result.cost_min)
          : `${formatCurrency(result.cost_min)} – ${formatCurrency(result.cost_max ?? 0)}`;
    printQuote(
      {
        title: `FRELUX Estimate: ${result.product_name}${result.brand ? ` (${result.brand})` : ""}`,
        subtitle: `Generated ${new Date().toLocaleDateString()} · ${result.profile_name}`,
        metaRows: [
          [
            "Product",
            `${result.product_name}${result.brand ? ` (${result.brand})` : ""}`,
          ],
          ["Application profile", result.profile_name],
          [
            "Surface area",
            `${fmt(result.area_input)} ${result.area_unit === "m2" ? "m²" : "ft²"}`,
          ],
          [
            "Coats/layers",
            result.coats === null ? "not configured" : String(result.coats),
          ],
          [
            "Material requirement",
            rangeLabel(
              result.with_waste_min,
              result.with_waste_max,
              result.material_unit ?? "",
              2,
            ),
          ],
          [
            "Purchase quantity",
            `${result.purchase_min ?? "N/A"}–${result.purchase_max ?? "N/A"} ${result.purchase_unit ?? ""}`,
          ],
        ],
        lines: [
          {
            label: result.product_name,
            quantity: `${result.purchase_min ?? "N/A"}–${result.purchase_max ?? "N/A"}`,
            unit: result.purchase_unit ?? "",
            unit_price:
              result.price_per_pack === null
                ? "included"
                : formatCurrency(result.price_per_pack),
            line_total: costValue,
          },
        ],
        totals: [
          { label: "Material cost", value: costValue },
          { label: "Labour", value: formatCurrency(labourCost) },
          {
            label: "Grand total (materials + labour)",
            value: formatCurrency((result.cost_min ?? 0) + labourCost),
            strong: true,
          },
        ],
        warnings: result.warnings,
        steps: result.steps,
        footer: `${result.product_notes ? `${result.product_notes} ` : ""}${result.technical_spec ? `${result.technical_spec} ` : ""}Generated by the FRELUX deterministic calculation engine. Quantities are estimates: verify on site before purchase.`,
      },
      "frelux-finish-estimate.html",
    );
  }, [result, labourCost]);

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────

  const sharedBuilding = useBuildingSize();
  // Both surfaces are offered because paint, screed and tiling all read a
  // different face of the same rooms, and each figure is the measured one.
  const sharedAreaChoices = sharedBuilding.building
    ? [
        { surface: "wall" as const, label: "walls after openings" },
        { surface: "floor" as const, label: "floors" },
      ].map((choice) => ({
        ...choice,
        areaM2: buildingAreaM2(sharedBuilding.building, choice.surface),
        title: `Use ${sharedBuilding.building!.label}: ${choice.label}`,
      }))
    : [];

  return (
    <div
      className={embedded ? "pb-8" : "min-h-screen bg-background pt-8 pb-16"}
    >
      <Container>
        {!embedded && <PageHeader title={title} subtitle={subtitle} />}

        {sharedAreaChoices.length > 0 && (
          <div className="mb-6 grid gap-2 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:grid-cols-2">
            <p className="text-sm font-medium sm:col-span-2">
              {t("Measured from your building")}
            </p>
            {sharedAreaChoices.map((choice) => (
              <button
                key={choice.surface}
                type="button"
                className="rounded-lg border border-border bg-background px-3 py-2 text-left text-sm hover:bg-accent"
                onClick={() => {
                  setArea(
                    choice.areaM2 > 0
                      ? String(Math.round(choice.areaM2 * 100) / 100)
                      : "",
                  );
                  setAreaUnit("m2");
                }}
              >
                <span className="font-medium">{choice.title}</span>
                <span className="block text-xs text-muted-foreground">
                  {Math.round(choice.areaM2 * 100) / 100} m² measured from its
                  rooms
                </span>
              </button>
            ))}
          </div>
        )}
        {configLoading ? (
          <p className="text-sm text-muted-foreground">
            Loading product configuration…
          </p>
        ) : configError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            Failed to load calculator configuration: {configError}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">
              {t("No products configured yet")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The calculator uses only verified product data from the database:
              it never estimates with assumed coverage rates. An administrator
              must configure at least one Mineral Stone product (with a
              calculation model, coverage or consumption data, package size and
              coat count) under <b>Admin → Estimation Products</b> before this
              calculator can produce results.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* ── Inputs ── */}
            <div
              ref={fieldsRef}
              className="rounded-lg border border-border bg-card p-6"
            >
              <h2 className="mb-4 text-base font-semibold">{t("Inputs")}</h2>
              <div className="mb-4">
                <MeasurementTip what="measurement unit and surface area" />
              </div>
              <div className="grid gap-4">
                <label className="grid gap-1 text-sm font-medium">
                  {t("Product")}
                  <select
                    id="finish-product"
                    className="rounded-lg border border-border bg-background px-3 py-2"
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.brand ? `: ${p.brand}` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1 text-sm font-medium">
                  {t("Application profile")}
                  <select
                    id="finish-profile"
                    className="rounded-lg border border-border bg-background px-3 py-2"
                    value={profileId}
                    onChange={(e) => {
                      setProfileId(e.target.value);
                      const prof = selectedProduct?.profiles.find(
                        (q) => q.id === e.target.value,
                      );
                      setCoats(
                        prof?.default_coats !== null &&
                          prof?.default_coats !== undefined
                          ? String(prof.default_coats)
                          : "",
                      );
                    }}
                    disabled={
                      !selectedProduct || selectedProduct.profiles.length === 0
                    }
                  >
                    {selectedProduct?.profiles.length ? (
                      selectedProduct.profiles.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.name}
                        </option>
                      ))
                    ) : (
                      <option value="">
                        {t("No application profile configured")}
                      </option>
                    )}
                  </select>
                </label>

                <BuildingTemplatePanel
                  marketCode={marketCode}
                  surface="wall"
                  onChange={(areaM2) => {
                    // Template area replaces the manual figure in m²; the unit
                    // selector stays available for anyone measuring by hand.
                    setArea(
                      areaM2 > 0 ? String(Math.round(areaM2 * 100) / 100) : "",
                    );
                    setAreaUnit("m2");
                  }}
                />

                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <label className="grid gap-1 text-sm font-medium">
                    {t("Surface area")}
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="rounded-lg border border-border bg-background px-3 py-2"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      placeholder="e.g. 53.89"
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-medium">
                    {t("Unit")}
                    <select
                      className="rounded-lg border border-border bg-background px-3 py-2"
                      value={areaUnit}
                      onChange={(e) =>
                        setAreaUnit(e.target.value as "m2" | "ft2")
                      }
                    >
                      <option value="m2">m²</option>
                      <option value="ft2">ft²</option>
                    </select>
                  </label>
                </div>

                <label className="grid gap-1 text-sm font-medium">
                  {t("Coats / layers")}
                  <input
                    type="number"
                    min={1}
                    step={1}
                    className="rounded-lg border border-border bg-background px-3 py-2"
                    value={coats}
                    onChange={(e) => setCoats(e.target.value)}
                    placeholder={
                      selectedProfile?.default_coats != null
                        ? `configured default: ${selectedProfile.default_coats}`
                        : "not configured for this product"
                    }
                  />
                  <span className="text-xs font-normal text-muted-foreground">
                    Seeded from the product's configured default. Left blank
                    when no default is configured: the engine will not guess a
                    coat count.
                  </span>
                </label>

                <MissingFieldsNotice fields={missing} />

                <button
                  type="button"
                  onClick={() => {
                    if (!selectedProduct || !selectedProfile) {
                      reportMissing([
                        ...(!selectedProduct
                          ? [missingField("finish-product", "Product")]
                          : []),
                        ...(!selectedProfile
                          ? [
                              missingField(
                                "finish-profile",
                                "Application profile",
                              ),
                            ]
                          : []),
                      ]);
                      return;
                    }
                    calculateWithScroll(handleCalculate);
                  }}
                  disabled={calculating}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {t("Calculate")}
                </button>
              </div>
            </div>

            {/* ── Result ── */}
            <div
              ref={resultsRef}
              className="rounded-lg border border-border bg-card p-6"
            >
              <h2 className="mb-4 text-base font-semibold">{t("Result")}</h2>
              {!result ? (
                <p className="text-sm text-muted-foreground">
                  {t("Enter the surface area and press Calculate.")}
                </p>
              ) : (
                <div className="grid gap-4">
                  {result.warnings.length > 0 && (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
                      <p className="font-semibold">{t("Data requirements")}</p>
                      <ul className="mt-2 list-disc pl-5">
                        {result.warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.calculable && (
                    <>
                      <div className="rounded-lg border border-border p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {t("Material requirement (with waste)")}
                        </p>
                        <p className="mt-1 text-xl font-bold">
                          {rangeLabel(
                            result.with_waste_min,
                            result.with_waste_max,
                            result.material_unit ?? "",
                          )}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Raw:{" "}
                          {rangeLabel(
                            result.material_min,
                            result.material_max,
                            result.material_unit ?? "",
                          )}
                          {result.waste_percentage !== null &&
                            ` · waste +${fmt(result.waste_percentage)}%`}
                        </p>
                      </div>

                      <div className="rounded-lg border border-border p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {t("Purchase quantity")}
                        </p>
                        <p className="mt-1 text-xl font-bold">
                          {result.purchase_min === result.purchase_max
                            ? `${result.purchase_min} ${result.purchase_unit}`
                            : `${result.purchase_min}–${result.purchase_max} ${result.purchase_unit}`}
                        </p>
                      </div>

                      <div className="rounded-lg border border-border p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {t("Total cost")}
                        </p>
                        <p className="mt-1 text-xl font-bold">
                          {result.cost_min === null
                            ? "Price not configured"
                            : result.cost_min === result.cost_max
                              ? formatCurrency(result.cost_min)
                              : `${formatCurrency(result.cost_min)} – ${formatCurrency(result.cost_max ?? 0)}`}
                        </p>
                        {result.price_per_pack !== null && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatCurrency(result.price_per_pack)} per package
                          </p>
                        )}
                      </div>

                      {/* Labour: complete the estimate to the very end */}
                      <LabourCostSection
                        market={marketCode}
                        estimatorKey="global"
                        config={labourConfig}
                        onChange={setLabourConfig}
                        currencySymbol={currencySymbol}
                        area={labourAreaM2}
                        last
                      />
                      <div className="rounded-lg border border-border p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {t("Grand total (materials + labour)")}
                        </p>
                        <p className="mt-1 text-xl font-bold">
                          {formatCurrency((result.cost_min ?? 0) + labourCost)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Materials {formatCurrency(result.cost_min ?? 0)} +
                          Labour {formatCurrency(labourCost)}
                        </p>
                      </div>

                      <div className="md:col-span-2">
                        <ShareEstimateButton
                          estimate={{
                            kind: "Finish Material Estimate",
                            title: `${result.product_name}${result.brand ? ` (${result.brand})` : ""}`,
                            summaryLines: [
                              {
                                label: "Surface area",
                                value: `${fmt(result.area_input)} ${
                                  result.area_unit === "m2" ? "m²" : "ft²"
                                }`,
                              },
                              {
                                label: "Application profile",
                                value: result.profile_name,
                              },
                              {
                                label: "Coats/layers",
                                value:
                                  result.coats === null
                                    ? "not configured"
                                    : String(result.coats),
                              },
                              {
                                label: "Purchase quantity",
                                value:
                                  result.purchase_min === result.purchase_max
                                    ? `${result.purchase_min} ${result.purchase_unit}`
                                    : `${result.purchase_min}–${result.purchase_max} ${result.purchase_unit}`,
                              },
                            ],
                            lineItems: [
                              {
                                description: "Materials",
                                amount: formatCurrency(result.cost_min ?? 0),
                              },
                              {
                                section: "Labour",
                                description: "Application labour",
                                amount: formatCurrency(labourCost),
                              },
                            ],
                            totals: [
                              {
                                label: "Grand total (materials + labour)",
                                value: formatCurrency(
                                  (result.cost_min ?? 0) + labourCost,
                                ),
                                emphasized: true,
                              },
                            ],
                            link:
                              category === "stucco"
                                ? "/stucco-calculator"
                                : "/mineral-stone-calculator",
                          }}
                          compact
                        />
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={handleSave}
                          disabled={saveState === "saving"}
                          className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground disabled:opacity-50"
                        >
                          {saveState === "saving" ? "Saving…" : "Save estimate"}
                        </button>
                        <button
                          type="button"
                          onClick={handleExportPdf}
                          className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground"
                        >
                          {t("Export PDF")}
                        </button>
                        {saveMessage && (
                          <span
                            className={`self-center text-xs ${saveState === "error" ? "text-red-600" : "text-muted-foreground"}`}
                          >
                            {saveMessage}
                          </span>
                        )}
                      </div>
                    </>
                  )}

                  {/* Configuration echo */}
                  <div className="rounded-lg border border-border p-4 text-xs text-muted-foreground">
                    <p className="mb-2 font-semibold text-foreground">
                      {t("Configuration used")}
                    </p>
                    <p>Model: {result.calculation_model ?? "not configured"}</p>
                    {result.calculation_model === "coverage_based" && (
                      <p>
                        Coverage:{" "}
                        {areaUnitOf(result.area_unit) === "sqm"
                          ? rangeLabel(
                              result.coverage_min,
                              result.coverage_max,
                              "m²/package",
                              4,
                            )
                          : rangeLabel(
                              result.coverage_min === null
                                ? null
                                : result.coverage_min * SQFT_PER_SQM,
                              result.coverage_max === null
                                ? null
                                : result.coverage_max * SQFT_PER_SQM,
                              "sq ft/package",
                              2,
                            )}
                      </p>
                    )}
                    {(result.calculation_model === "mass_per_area" ||
                      result.calculation_model === "volume_per_area") && (
                      <p>
                        Consumption:{" "}
                        {areaUnitOf(result.area_unit) === "sqm"
                          ? rangeLabel(
                              result.consumption_min,
                              result.consumption_max,
                              `${result.consumption_unit ?? ""} per m² per coat`,
                              4,
                            )
                          : rangeLabel(
                              result.consumption_min === null
                                ? null
                                : result.consumption_min / SQFT_PER_SQM,
                              result.consumption_max === null
                                ? null
                                : result.consumption_max / SQFT_PER_SQM,
                              `${result.consumption_unit ?? ""} per sq ft per coat`,
                              4,
                            )}
                      </p>
                    )}
                    <p>
                      Package:{" "}
                      {result.pack_size !== null && result.pack_unit
                        ? `${fmt(result.pack_size)} ${result.pack_unit}`
                        : "not configured"}
                    </p>
                    <p>Coats: {result.coats ?? "not configured"}</p>
                    {result.product_notes && (
                      <p className="mt-2">
                        Product notes: {result.product_notes}
                      </p>
                    )}
                    {result.technical_spec && (
                      <p>Technical spec: {result.technical_spec}</p>
                    )}
                  </div>

                  {/* Calculation breakdown */}
                  <div className="rounded-lg border border-border p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("Calculation breakdown")}
                    </p>
                    <ol className="grid gap-2 text-sm">
                      {result.steps.map((s, i) => (
                        <li key={i}>
                          <span className="font-medium">{s.label}:</span>{" "}
                          <span className="text-muted-foreground">
                            {s.detail}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-8">
          <EstimateDisclaimer />
        </div>
      </Container>
    </div>
  );
}
