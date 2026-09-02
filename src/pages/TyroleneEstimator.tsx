/**
 * FRELUX Phase 3 — Tyrolene Estimator Page
 *
 * Partition-based Tyrolene exterior finishing estimator.
 * Progressive disclosure flow:
 * 1. Project → 2. Number of partitions → 3. Optional actual measurements
 * 4. Material calculation → 5. Review → 6. Estimate
 *
 * Exterior only. No quality levels. Labour not included.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Calculator,
  Save,
  RotateCcw,
  Shield,
  Info,
  MapPin,
  Loader2,
  Layers,
  Building2,
  Eye,
  EyeOff,
  Package,
  Box,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { WorkWeatherBanner } from "@/components/ui/WorkWeatherBanner";
import Container from "@/components/ui/Container";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/estimation/pricing";
import { useSeo } from "@/lib/seo";
import { useCalcDefaults } from "@/lib/use-calc-defaults";
import {
  HowCalculatedSection,
  EstimateDisclaimer,
  ReportCalculationIssue,
} from "@/components/calculators";
import { track } from "@/lib/analytics";
import {
  calculateTyroleneProject,
  parseMaterialRatio,
  parseStandardPartition,
  type TyroleneProjectInput,
  type TyroleneEstimateResult,
  type TyroleneMaterialResult,
  type PartitionTypeInput,
  type ProductionRuleRow,
  type TyroleneCalcConfig,
} from "@/lib/estimation/tyrolene-engine";
import type {
  EstimationProduct,
  EstimationMaterial,
  EstimationPrice,
  EstimationCalcRule,
  EstimationPackSize,
} from "@/types/estimation";
import {
  fetchEstimationProducts,
  fetchEstimationMaterials,
  fetchActivePrice,
  fetchCalcRules,
  createEstimate,
  createEstimateItem,
  createAuditLog,
} from "@/lib/estimation/queries";
import { saveUserProject } from "@/lib/queries";
import { trackCalculation } from "@/lib/achievements";
import { trackCalculationWithRewards } from "@/lib/rewards-integration";
import { trackRecentTool } from "@/lib/smart-defaults";
import { classNames } from "@/lib/utils";
import { formatNumber } from "@/lib/utils";

import {
  FaqSection,
  RelatedTools,
  CALC_LINKS,
} from "@/components/seo/SeoSections";
import { TyroleneEstimatorSeo } from "@/components/seo/SeoContent";
// Engine integration
import { useEngineFeatures } from "@/lib/measurement";
import { monitoredCalc } from "@/lib/calculator-monitor";
import SaveToProjectButton from "@/components/calculators/SaveToProjectButton";
import { SITE_URL } from "@/lib/seo";
import {
  EngineConfidenceBadge,
  EngineConfidenceDetail,
  EngineExplanationPanel,
  EngineAlreadyHaveInput,
  EngineWasteSelector,
  EngineMaterialSummaryCard,
} from "@/components/engine";
import { getSafeError } from "@/lib/safeError";
import { Button } from "@/components/ui/shadcn/button";
// =========================================================
// Constants
// =========================================================

const CALCULATOR_TYPE = "tyrolene";

// =========================================================
// Component
// =========================================================

export default function TyroleneEstimator({
  embedded = false,
}: { embedded?: boolean } = {}) {
  const { defaults: calcDefaults } = useCalcDefaults("tyrolene");
  useSeo(
    !embedded
      ? {
          title:
            "FRELUX Tyrolene Estimator: Partition-Based Exterior Finishing Calculator",
          description:
            "Professional Tyrolene estimator. Calculate cement, sand, acrylic bond, water seal, and anti-fungal requirements based on partition count. Exterior only. FRELUX production methodology.",
          canonicalPath: "/tyrolene-estimator",
          ogType: "website",
          keywords:
            "tyrolene estimator, exterior finish calculator, tyrolene material, exterior wall finish, cement sand calculator",
          structuredDataArray: [
            {
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "FRELUX Tyrolene Estimator",
              applicationCategory: "CalculatorApplication",
              operatingSystem: "Web",
              offers: { "@type": "Offer", price: "0", priceCurrency: "NGN" },
            },
            {
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Home",
                  item: SITE_URL,
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "Tyrolene Estimator",
                  item: `${SITE_URL}/tyrolene-estimator`,
                },
              ],
            },
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: [
                {
                  "@type": "Question",
                  name: "What is Tyrolene?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Tyrolene is a textured exterior wall finish made from cement, sand, acrylic bond, and water seal for weather resistance.",
                  },
                },
                {
                  "@type": "Question",
                  name: "How is Tyrolene calculated?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Tyrolene is calculated based on wall area and partition count. The estimator determines cement, sand, acrylic bond, and water seal quantities.",
                  },
                },
              ],
            },
          ],
        }
      : null,
  );

  const mountedRef = useRef(true);
  useEffect(() => {
    trackRecentTool("/tyrolene-estimator", "Tyrolene Estimator", "Calculator");
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ── State: Configuration data from DB ──
  const [product, setProduct] = useState<EstimationProduct | null>(null);
  const [materials, setMaterials] = useState<EstimationMaterial[]>([]);
  const [prices, setPrices] = useState<Map<string, EstimationPrice>>(new Map());
  const [packSizes, setPackSizes] = useState<Map<string, EstimationPackSize>>(
    new Map(),
  );
  const [calcRules, setCalcRules] = useState<Map<string, EstimationCalcRule>>(
    new Map(),
  );
  const [productionRules, setProductionRules] = useState<ProductionRuleRow[]>(
    [],
  );
  const [calcVersionId, setCalcVersionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [configWarnings, setConfigWarnings] = useState<string[]>([]);

  // ── State: Project input ──
  const [projectDescription, setProjectDescription] = useState("");
  const [customerLocation, setCustomerLocation] = useState<
    "owerri" | "outside_owerri" | "unknown"
  >("unknown");
  const [inputMode, setInputMode] = useState<"standard" | "actual">("standard");
  const [standardCount, setStandardCount] = useState<number>(4);
  const [partitionTypes, setPartitionTypes] = useState<PartitionTypeInput[]>([
    { id: "pt1", label: "Partition Type 1", quantity: 10, width: 3, height: 3 },
  ]);

  // ── State: Result ──
  const [result, setResult] = useState<TyroleneEstimateResult | null>(null);
  // Engine features
  const engine = useEngineFeatures({ calculatorType: "tyrolene" });
  const [alreadyHave, setAlreadyHave] = useState(0);
  const [calculating, setCalculating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  // =========================================================
  // Load configuration from database
  // =========================================================
  useEffect(() => {
    async function loadConfig() {
      setLoading(true);
      setLoadError(null);
      const warnings: string[] = [];

      try {
        // Fetch Tyrolene product
        const { data: allProducts } = await fetchEstimationProducts(true);
        const tyroleneProduct = (allProducts ?? []).find(
          (p) => p.category === "tyrolene",
        );
        setProduct(tyroleneProduct ?? null);

        if (!tyroleneProduct) {
          warnings.push(
            "Tyrolene product is not configured. Admin must configure the Tyrolene product before estimates can be calculated.",
          );
        }

        // Fetch materials (filter for Tyrolene materials by slug)
        const { data: allMaterials } = await fetchEstimationMaterials(true);
        const tyroleneSlugs = [
          "cement",
          "sand",
          "acrylic-bond",
          "water-seal",
          "anti-fungal",
        ];
        const tyroleneMaterials = (allMaterials ?? []).filter((m) =>
          tyroleneSlugs.includes(m.slug),
        );
        setMaterials(tyroleneMaterials);

        if (tyroleneMaterials.length < 5) {
          warnings.push(
            `Only ${tyroleneMaterials.length}/5 Tyrolene materials configured. Admin must configure: cement, sand, acrylic-bond, water-seal, anti-fungal.`,
          );
        }

        // Fetch prices for each material
        const priceMap = new Map<string, EstimationPrice>();
        for (const mat of tyroleneMaterials) {
          const { data: price } = await fetchActivePrice("material", mat.id);
          if (price) {
            priceMap.set(mat.slug, price);
          } else {
            warnings.push(
              `Material '${mat.name}' does not have a configured price. Material cost will be incomplete until FRELUX admin configures the price.`,
            );
          }
        }
        setPrices(priceMap);

        // Fetch pack sizes for each material
        const packSizeMap = new Map<string, EstimationPackSize>();
        for (const mat of tyroleneMaterials) {
          const { data: packs } = await supabase
            .from("estimation_pack_sizes")
            .select("*")
            .eq("ref_type", "material")
            .eq("ref_id", mat.id)
            .eq("is_active", true)
            .order("sort_order", { ascending: true })
            .limit(1);
          if (packs && packs.length > 0) {
            packSizeMap.set(mat.slug, packs[0] as EstimationPackSize);
          }
        }
        setPackSizes(packSizeMap);

        // Fetch calc rules for tyrolene
        const { data: rules } = await fetchCalcRules("tyrolene");
        const ruleMap = new Map<string, EstimationCalcRule>();
        for (const rule of rules ?? []) {
          ruleMap.set(rule.rule_key, rule);
        }
        setCalcRules(ruleMap);

        // Check standard partition dimensions
        const spRule = ruleMap.get("standard_partition_dimensions");
        const sp = parseStandardPartition(spRule ?? null);
        if (sp.width === null || sp.height === null) {
          warnings.push(
            "Standard partition dimensions are not configured. Admin must configure the standard partition width and height before actual-dimension calculations can be used.",
          );
        }

        // Fetch production rules
        const { data: prodRules, error: prodError } = await supabase
          .from("estimation_production_rules")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });
        if (!prodError && prodRules) {
          setProductionRules(prodRules as ProductionRuleRow[]);
        }

        // Fetch calc version
        const { data: versions } = await supabase
          .from("estimation_calc_versions")
          .select("*")
          .eq("calculator_type", "tyrolene")
          .eq("is_active", true)
          .order("version_number", { ascending: false })
          .limit(1);
        if (versions && versions.length > 0) {
          setCalcVersionId(versions[0].id);
        }

        setConfigWarnings(warnings);
      } catch (err) {
        setLoadError(
          getSafeError(err, "Failed to load configuration."),
        );
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, []);

  // =========================================================
  // Handlers
  // =========================================================

  const handleCalculate = useCallback(async () => {
    setCalculating(true);
    setShowSteps(false);
    setSaved(false);

    try {
      const input: TyroleneProjectInput = {
        partition_types: inputMode === "actual" ? partitionTypes : [],
        standard_partition_count:
          inputMode === "standard" ? standardCount : null,
        currency: "NGN",
        user_id: null,
        client_hash: null,
        project_description: projectDescription || "Tyrolene Estimate",
        customer_location: customerLocation,
      };

      const config: TyroleneCalcConfig = {
        product,
        materials,
        prices,
        packSizes,
        calcRules,
        productionRules,
        calcVersionId,
      };

      const calcResult = monitoredCalc("Tyrolene Estimator", () =>
        calculateTyroleneProject(input, config),
      );
      setResult(calcResult);

      track("tyrolene_estimator_calculated", {
        equivalent_partitions: calcResult.equivalent_standard_partitions,
        has_dimensional_adjustment: calcResult.has_dimensional_adjustment,
        material_cost: calcResult.practical_purchase_cost,
        valid: calcResult.valid,
      });
    } catch (err) {
      setLoadError(getSafeError(err, "Calculation failed."));
    } finally {
      setCalculating(false);
    }
  }, [
    inputMode,
    partitionTypes,
    standardCount,
    projectDescription,
    customerLocation,
    product,
    materials,
    prices,
    packSizes,
    calcRules,
    productionRules,
    calcVersionId,
  ]);

  const handleSave = useCallback(async () => {
    if (!result || !result.valid) return;

    setCalculating(true);
    try {
      // Create estimate record
      const estimateRef = `TYR-${Date.now().toString(36).toUpperCase()}`;
      const { data: estimate, error: estError } = await createEstimate({
        estimate_ref: estimateRef,
        user_id: null,
        client_hash: null,
        calculator_type: CALCULATOR_TYPE,
        project_description: projectDescription || "Tyrolene Estimate",
        inputs: {
          input_mode: inputMode,
          standard_partition_count:
            inputMode === "standard" ? standardCount : null,
          partition_types: inputMode === "actual" ? partitionTypes : [],
          customer_location: customerLocation,
        },
        calculation_method: "partition_based",
        calc_version_id: calcVersionId,
        calculated_quantities: {
          equivalent_standard_partitions: result.equivalent_standard_partitions,
          has_dimensional_adjustment: result.has_dimensional_adjustment,
          materials: result.materials.map((m) => ({
            slug: m.material_slug,
            theoretical: m.theoretical_quantity,
            practical: m.practical_purchase_quantity,
            unit: m.theoretical_unit,
          })),
          material_ratio: result.material_ratio,
        },
        total_material_cost: result.practical_purchase_cost,
        currency: "NGN",
        labour_status: "not_included",
        warnings: result.warnings,
        recommendations: result.recommendations,
        status: "calculated",
      });

      if (estError) {
        setLoadError(`Failed to save estimate: ${estError.message}`);
        return;
      }

      // Save estimate items
      if (estimate) {
        for (let i = 0; i < result.line_items.length; i++) {
          const item = result.line_items[i];
          await createEstimateItem({
            estimate_id: estimate.id,
            item_name: item.item_name,
            item_type: item.item_type,
            material_id: item.material_id ?? null,
            quantity_required: item.quantity_required,
            practical_purchase_qty: item.practical_purchase_qty,
            unit: item.unit,
            pack_size: item.pack_size ?? null,
            unit_price: item.unit_price,
            total_price: item.total_price,
            price_snapshot: item.price_snapshot,
            calculation_source: item.calculation_source,
            adjustment_status: "none",
            sort_order: i,
          });
        }

        // Audit log
        await createAuditLog({
          entity_type: "estimate",
          entity_id: estimate.id,
          action: "create",
          new_value: {
            estimate_ref: estimateRef,
            calculator_type: CALCULATOR_TYPE,
          },
        });
      }

      // Save to user projects
      await saveUserProject(
        projectDescription || "Tyrolene Estimate",
        "custom",
        {
          type: "tyrolene",
          result: JSON.parse(JSON.stringify(result)),
          estimate_ref: estimateRef,
        },
        "Tyrolene estimation project",
      );

      setSaved(true);
      trackCalculation("tyrolene");
      trackCalculationWithRewards("tyrolene", "Tyrolene Estimator");
    } catch (err) {
      setLoadError(
        getSafeError(err, "Failed to save estimate."),
      );
    } finally {
      setCalculating(false);
    }
  }, [
    result,
    projectDescription,
    inputMode,
    standardCount,
    partitionTypes,
    customerLocation,
    calcVersionId,
  ]);

  const handleReset = useCallback(() => {
    setResult(null);
    setSaved(false);
    setShowSteps(false);
    setStandardCount(4);
    setPartitionTypes([
      {
        id: "pt1",
        label: "Partition Type 1",
        quantity: 10,
        width: 3,
        height: 3,
      },
    ]);
  }, []);

  const addPartitionType = useCallback(() => {
    setPartitionTypes((prev) => [
      ...prev,
      {
        id: `pt${Date.now()}`,
        label: `Partition Type ${prev.length + 1}`,
        quantity: 1,
        width: 3,
        height: 3,
      },
    ]);
  }, []);

  const removePartitionType = useCallback((id: string) => {
    setPartitionTypes((prev) =>
      prev.length > 1 ? prev.filter((pt) => pt.id !== id) : prev,
    );
  }, []);

  const updatePartitionType = useCallback(
    (id: string, field: keyof PartitionTypeInput, value: string | number) => {
      setPartitionTypes((prev) =>
        prev.map((pt) => (pt.id === id ? { ...pt, [field]: value } : pt)),
      );
    },
    [],
  );

  // =========================================================
  // Render: Loading
  // =========================================================
  if (loading) {
    return (
      <Container className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            aria-hidden="true"
            className="h-8 w-8 animate-spin text-brand-purple"
          />
          <p className="text-sm text-muted-foreground dark:text-muted-foreground">
            Loading Tyrolene configuration…
          </p>
        </div>
      </Container>
    );
  }

  // =========================================================
  // Render: Main
  // =========================================================

  const materialRatio = parseMaterialRatio(
    calcRules.get("material_ratio") ?? null,
  );
  const standardPartition = parseStandardPartition(
    calcRules.get("standard_partition_dimensions") ?? null,
  );

  return (
    <>
      {!embedded && (
        <>
          <PageHeader
            title="Tyrolene Estimator"
            subtitle="Partition-based exterior finishing calculator: FRELUX production methodology"
            breadcrumbs={[
              { label: "Calculators", path: "/paint-calculator" },
              { label: "Tyrolene Estimator" },
            ]}
          />
          <WorkWeatherBanner workType="tyrolene" />
        </>
      )}

      <Container className="py-8 space-y-6 max-w-4xl">
        {/* Product Info Banner */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                FRELUX Tyrolene: Exterior Only
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                Tyrolene is a textured exterior finishing system.
                Partition-based estimation. Labour is not included, negotiated
                separately.
              </p>
            </div>
          </div>
        </div>

        {/* Material Ratio Display */}
        <div className="rounded-lg border border-border bg-muted/50 dark:border-border border-border dark:bg-card-foreground/50 p-4">
          <div className="flex items-start gap-3">
            <Info
              aria-hidden="true"
              className="h-5 w-5 text-brand-purple flex-shrink-0 mt-0.5"
            />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground dark:text-primary-foreground">
                FRELUX Tyrolene Material Ratio
              </p>
              <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1 mb-2">
                Based on {materialRatio.partitions_per_ratio} standard
                partitions:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {materialRatio.materials.map((m) => (
                  <div
                    key={m.slug}
                    className="text-xs rounded-md bg-card dark:bg-card-foreground/90 border border-border dark:border-border border-border px-3 py-2"
                  >
                    <span className="font-medium text-card-foreground dark:text-muted-foreground/80">
                      {m.slug.replace(/-/g, " ")}:
                    </span>{" "}
                    <span className="text-foreground dark:text-primary-foreground">
                      {m.quantity} {m.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Config Warnings */}
        {configWarnings.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle
                aria-hidden="true"
                className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
              />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-900 dark:text-red-200">
                  Configuration Required
                </p>
                <ul className="mt-2 space-y-1">
                  {configWarnings.map((w, i) => (
                    <li
                      key={i}
                      className="text-xs text-red-700 dark:text-red-300"
                    >
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Load Error */}
        {loadError && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30 p-4">
            <div className="flex items-center gap-3">
              <AlertCircle
                aria-hidden="true"
                className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0"
              />
              <p className="text-sm text-red-900 dark:text-red-200">
                {loadError}
              </p>
            </div>
          </div>
        )}

        {/* Project Info */}
        <div className="calc-card rounded-xl border border-border bg-card dark:border-border border-border dark:bg-card-foreground/90 p-5 space-y-4">
          <h3 className="font-display text-base font-bold text-foreground dark:text-primary-foreground flex items-center gap-2">
            <Building2
              aria-hidden="true"
              className="h-4 w-4 text-brand-purple"
            />
            Project Information
          </h3>
          <div>
            <label className="block text-xs font-medium text-muted-foreground dark:text-muted-foreground mb-1">
              Project Description
            </label>
            <input
              type="text"
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="e.g., Residential fence. Owerri"
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground dark:text-muted-foreground mb-1">
              Customer Location
            </label>
            <div className="flex gap-2">
              {[
                { value: "owerri", label: "Owerri" },
                { value: "outside_owerri", label: "Outside Owerri" },
                { value: "unknown", label: "Unknown" },
              ].map((opt) => (
                <Button
                  key={opt.value}
                  onClick={() =>
                    setCustomerLocation(
                      opt.value as "owerri" | "outside_owerri" | "unknown",
                    )
                  }
                  className={classNames(
                    "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors border",
                    customerLocation === opt.value
                      ? "border-brand-purple bg-primary/10 text-brand-purple dark:text-brand-purple-lighter"
                      : "border-border dark:border-border text-muted-foreground dark:text-muted-foreground hover:border-border",
                  )}
                >
                  <MapPin className="h-3.5 w-3.5" />
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Input Mode Toggle */}
        <div className="rounded-xl border border-border bg-card dark:border-border border-border dark:bg-card-foreground/90 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-base font-bold text-foreground dark:text-primary-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-brand-purple" />
              Partition Input
            </h3>
            <div className="flex gap-2">
              <Button
                onClick={() => setInputMode("standard")}
                className={classNames(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border",
                  inputMode === "standard"
                    ? "border-brand-purple bg-primary/10 text-brand-purple dark:text-brand-purple-lighter"
                    : "border-border dark:border-border text-muted-foreground dark:text-muted-foreground",
                )}
              >
                Standard Count
              </Button>
              <Button
                onClick={() => setInputMode("actual")}
                className={classNames(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border",
                  inputMode === "actual"
                    ? "border-brand-purple bg-primary/10 text-brand-purple dark:text-brand-purple-lighter"
                    : "border-border dark:border-border text-muted-foreground dark:text-muted-foreground",
                )}
              >
                Actual Dimensions
              </Button>
            </div>
          </div>

          {/* Standard Partition Count Input */}
          {inputMode === "standard" && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground dark:text-muted-foreground mb-2">
                Number of Standard Partitions
              </label>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() =>
                    setStandardCount(Math.max(0, standardCount - 1))
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-border dark:border-border text-muted-foreground hover:border-brand-purple"
                >
                  –
                </Button>
                <input
                  type="number"
                  min="0"
                  value={standardCount}
                  onChange={(e) =>
                    setStandardCount(Math.max(0, parseInt(e.target.value) || 0))
                  }
                  className="w-24 text-center rounded-lg border border-border dark:border-border bg-card dark:bg-background px-3 py-2 text-lg font-semibold text-foreground dark:text-primary-foreground focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple outline-none"
                />
                <Button
                  onClick={() => setStandardCount(standardCount + 1)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-border dark:border-border text-muted-foreground hover:border-brand-purple"
                >
                  +
                </Button>
              </div>
              {standardPartition.width && standardPartition.height && (
                <p className="text-xs text-muted-foreground mt-2">
                  Standard partition: {standardPartition.width}m ×{" "}
                  {standardPartition.height}m ={" "}
                  {(standardPartition.width * standardPartition.height).toFixed(
                    2,
                  )}
                  m²
                </p>
              )}
            </div>
          )}

          {/* Actual Dimension Input */}
          {inputMode === "actual" && (
            <div className="space-y-4">
              {standardPartition.width === null ||
              standardPartition.height === null ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 p-3">
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Standard partition dimensions are not configured. Actual
                    dimension calculation requires admin to configure the
                    standard partition width and height.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Standard partition: {standardPartition.width}m ×{" "}
                  {standardPartition.height}m ={" "}
                  {(standardPartition.width * standardPartition.height).toFixed(
                    2,
                  )}
                  m². Enter actual partition dimensions, the system will
                  calculate equivalent standard partitions.
                </p>
              )}

              {partitionTypes.map((pt, _idx) => (
                <div
                  key={pt.id}
                  className="rounded-lg border border-border dark:border-border p-3 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                      {pt.label}
                    </span>
                    {partitionTypes.length > 1 && (
                      <Button
                        onClick={() => removePartitionType(pt.id)}
                        className="text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        Qty
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={pt.quantity}
                        onChange={(e) =>
                          updatePartitionType(
                            pt.id,
                            "quantity",
                            Math.max(0, parseInt(e.target.value) || 0),
                          )
                        }
                        className="w-full rounded-md border border-border dark:border-border bg-card dark:bg-background px-2 py-1.5 text-sm text-foreground dark:text-primary-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        Width (m)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={pt.width}
                        onChange={(e) =>
                          updatePartitionType(
                            pt.id,
                            "width",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="w-full rounded-md border border-border dark:border-border bg-card dark:bg-background px-2 py-1.5 text-sm text-foreground dark:text-primary-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        Height (m)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={pt.height}
                        onChange={(e) =>
                          updatePartitionType(
                            pt.id,
                            "height",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="w-full rounded-md border border-border dark:border-border bg-card dark:bg-background px-2 py-1.5 text-sm text-foreground dark:text-primary-foreground"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Area: {(pt.quantity * pt.width * pt.height).toFixed(2)}m²
                  </p>
                </div>
              ))}

              <Button
                onClick={addPartitionType}
                className="flex items-center gap-1.5 text-xs font-medium text-brand-purple hover:text-brand-purple-dark"
              >
                <Plus className="h-4 w-4" />
                Add Partition Type
              </Button>
            </div>
          )}
        </div>

        {/* Calculate Button */}
        <div className="flex gap-3">
          <Button variant="default"
            onClick={handleCalculate}
            disabled={
              calculating ||
              (inputMode === "actual" &&
                (!standardPartition.width || !standardPartition.height))
            }
            className="btn-glow flex flex-1 items-center justify-center gap-2 px-4 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {calculating ? (
              <>
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />{" "}
                Calculating…
              </>
            ) : (
              <>
                <Calculator aria-hidden="true" className="h-4 w-4" /> Calculate
                Tyrolene Estimate
              </>
            )}
          </Button>
          {result && (
            <Button
              onClick={handleReset}
              className="flex items-center justify-center gap-2 rounded-lg border border-border dark:border-border px-4 py-3 text-sm font-medium text-muted-foreground hover:border-border"
            >
              <RotateCcw aria-hidden="true" className="h-4 w-4" /> Reset
            </Button>
          )}
        </div>

        {/* Result */}
        {result && (
          <div className="space-y-4">
            {/* Errors */}
            {result.errors.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle
                    aria-hidden="true"
                    className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-semibold text-red-900 dark:text-red-200">
                      Accurate Tyrolene calculation unavailable until the
                      required FRELUX configuration is completed.
                    </p>
                    <ul className="mt-2 space-y-1">
                      {result.errors.map((e, i) => (
                        <li
                          key={i}
                          className="text-xs text-red-700 dark:text-red-300"
                        >
                          {e}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Warnings */}
            {result.warnings.length > 0 && result.valid && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle
                    aria-hidden="true"
                    className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
                  />
                  <ul className="space-y-1">
                    {result.warnings.map((w, i) => (
                      <li
                        key={i}
                        className="text-xs text-amber-700 dark:text-amber-300"
                      >
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Valid Result */}
            {result.valid && (
              <>
                {/* Summary Card */}
                <div className="rounded-xl border border-border bg-card dark:border-border border-border dark:bg-card-foreground/90 overflow-hidden">
                  <div className="bg-primary px-5 py-4">
                    <h3 className="font-display text-lg font-bold text-primary-foreground flex items-center gap-2">
                      <Box className="h-5 w-5" />
                      Tyrolene Estimate
                    </h3>
                    <p className="text-xs text-brand-purple-lighter mt-1">
                      Exterior Only · {projectDescription || "Tyrolene Project"}
                    </p>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Partition Summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="rounded-lg bg-muted/50 dark:bg-black/50 p-3">
                        <p className="text-xs text-muted-foreground">Partitions</p>
                        <p className="text-lg font-bold text-foreground dark:text-primary-foreground">
                          {result.equivalent_standard_partitions}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/50 dark:bg-black/50 p-3">
                        <p className="text-xs text-muted-foreground">
                          Standard Partition
                        </p>
                        <p className="text-sm font-semibold text-foreground dark:text-primary-foreground">
                          {result.standard_partition_width}m ×{" "}
                          {result.standard_partition_height}m
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/50 dark:bg-black/50 p-3">
                        <p className="text-xs text-muted-foreground">Adjusted</p>
                        <p className="text-sm font-semibold text-foreground dark:text-primary-foreground">
                          {result.has_dimensional_adjustment
                            ? "Yes · measured"
                            : "No · standard count"}
                        </p>
                      </div>
                    </div>

                    {/* Dimensional Adjustment Info */}
                    {result.has_dimensional_adjustment &&
                      result.partition_breakdown.length > 0 && (
                        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/30 p-3">
                          <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">
                            Dimensional Adjustment Applied
                          </p>
                          <div className="space-y-1">
                            {result.partition_breakdown.map((b, i) => (
                              <p
                                key={i}
                                className="text-xs text-blue-600 dark:text-blue-400"
                              >
                                {b.label}: {b.quantity} × {b.width}m ×{" "}
                                {b.height}m = {b.area}m² →{" "}
                                {b.equivalent_partitions} equivalent
                              </p>
                            ))}
                            <p className="text-xs font-medium text-blue-700 dark:text-blue-300 pt-1">
                              Total equivalent standard partitions:{" "}
                              {result.equivalent_standard_partitions}
                            </p>
                          </div>
                        </div>
                      )}

                    {/* Material Requirements */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground dark:text-primary-foreground mb-3 flex items-center gap-2">
                        <Package className="h-4 w-4 text-brand-purple" />
                        Material Requirement
                      </h4>
                      <div className="space-y-2">
                        {result.materials.map((m) => (
                          <div
                            key={m.material_slug}
                            className="rounded-lg border border-border dark:border-border p-3"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-foreground dark:text-primary-foreground">
                                {m.material_name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {m.rounding_rule} · pack {m.pack_size}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">
                                  Theoretical:{" "}
                                </span>
                                <span className="font-medium text-foreground dark:text-primary-foreground">
                                  {m.theoretical_quantity} {m.theoretical_unit}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Practical:{" "}
                                </span>
                                <span className="font-medium text-foreground dark:text-primary-foreground">
                                  {m.practical_purchase_quantity}{" "}
                                  {m.theoretical_unit}
                                </span>
                                {m.leftover_quantity > 0 && (
                                  <span className="text-muted-foreground ml-1">
                                    (+{m.leftover_quantity} leftover)
                                  </span>
                                )}
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Price:{" "}
                                </span>
                                <span className="font-medium text-foreground dark:text-primary-foreground">
                                  {formatCurrency(
                                    m.unit_price,
                                    result.currency,
                                  )}{" "}
                                  / {m.theoretical_unit}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Total:{" "}
                                </span>
                                <span className="font-semibold text-brand-purple dark:text-brand-purple-lighter">
                                  {formatCurrency(
                                    m.total_price,
                                    result.currency,
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Cost Summary */}
                    <div className="rounded-lg bg-muted/50 dark:bg-black/50 p-4 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground dark:text-muted-foreground">
                          Theoretical Material Cost
                        </span>
                        <span className="font-medium text-foreground dark:text-primary-foreground">
                          {formatCurrency(
                            result.theoretical_material_cost,
                            result.currency,
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground dark:text-muted-foreground">
                          Practical Purchase Cost
                        </span>
                        <span className="font-bold text-brand-purple dark:text-brand-purple-lighter text-lg">
                          {formatCurrency(
                            result.practical_purchase_cost,
                            result.currency,
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Labour */}
                    <div className="rounded-lg border border-border dark:border-border p-3">
                      <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                        {result.labour_note}
                      </p>
                    </div>

                    {/* Production Eligibility */}
                    <div
                      className={classNames(
                        "rounded-lg p-3",
                        result.production_eligible
                          ? "border border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/30"
                          : "border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30",
                      )}
                    >
                      <p className="text-xs font-medium text-foreground dark:text-primary-foreground mb-1">
                        Production:{" "}
                        {result.production_eligible
                          ? "Available"
                          : "Check Required"}
                      </p>
                      <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                        {result.production_message}
                      </p>
                      {!result.production_min_configured && (
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                          Production minimum not configured for outside Owerri.
                          Contact FRELUX to confirm.
                        </p>
                      )}
                    </div>

                    {/* Customer Trust Indicators */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="rounded-md bg-muted/50 dark:bg-black/50 px-3 py-2">
                        <span className="text-muted-foreground">CALCULATED:</span>{" "}
                        <span className="text-foreground dark:text-primary-foreground">
                          FRELUX Engine
                        </span>
                      </div>
                      <div className="rounded-md bg-muted/50 dark:bg-black/50 px-3 py-2">
                        <span className="text-muted-foreground">NEGOTIATED:</span>{" "}
                        <span className="text-foreground dark:text-primary-foreground">
                          Labour (separately)
                        </span>
                      </div>
                    </div>

                    {/* Calculation Steps Toggle */}
                    <Button
                      onClick={() => setShowSteps(!showSteps)}
                      className="flex items-center gap-1.5 text-xs font-medium text-brand-purple hover:text-brand-purple-dark"
                    >
                      {showSteps ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                      {showSteps
                        ? "Hide calculation breakdown"
                        : "How was this calculated?"}
                    </Button>

                    {showSteps && (
                      <div className="rounded-lg border border-border dark:border-border p-3 space-y-2">
                        {result.calculation_steps.map((step, i) => (
                          <div key={i} className="flex flex-col">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-card-foreground dark:text-muted-foreground/80">
                                {step.label}
                              </span>
                              <span className="text-xs font-semibold text-foreground dark:text-primary-foreground">
                                {step.value}
                              </span>
                            </div>
                            {step.detail && (
                              <span className="text-xs text-muted-foreground mt-0.5">
                                {step.detail}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ── Engine Features (Additive) ── */}
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <EngineConfidenceBadge
                          result={engine.assessConfidence({
                            ruleValid: result.valid,
                            inputComplete: true,
                            materialSpecComplete: result.materials.length > 0,
                            marketPriceAvailable:
                              result.practical_purchase_cost > 0,
                            sourceReliability: "verified",
                            productMatched: result.materials.length > 0,
                          })}
                        />
                      </div>

                      <EngineAlreadyHaveInput
                        required={result.materials.reduce(
                          (sum, m) => sum + m.practical_purchase_quantity,
                          0,
                        )}
                        alreadyHave={alreadyHave}
                        onAlreadyHaveChange={setAlreadyHave}
                        unit="units"
                      />

                      <EngineWasteSelector
                        resolution={engine.wasteResolution}
                        userWaste={engine.userWaste}
                        onUserWasteChange={engine.setUserWaste}
                      />

                      <EngineExplanationPanel
                        result={engine.buildExplanation({
                          subject: "Tyrolene Estimate",
                          resultSummary: `${result.equivalent_standard_partitions} equivalent standard partitions, ${result.materials.length} materials`,
                          steps: [
                            {
                              description: "Standard partitions",
                              value: String(
                                result.equivalent_standard_partitions,
                              ),
                            },
                            {
                              description: "Dimensional adjustment",
                              value: result.has_dimensional_adjustment
                                ? "Yes"
                                : "No",
                            },
                            ...(result.has_dimensional_adjustment
                              ? [
                                  {
                                    description: "Partition breakdown",
                                    value: `${result.partition_breakdown.length} sections`,
                                  },
                                ]
                              : []),
                            ...result.materials.map((m) => ({
                              description: m.material_name,
                              value: `${m.practical_purchase_quantity} ${m.theoretical_unit}`,
                            })),
                            {
                              description: "Theoretical cost",
                              value: formatCurrency(
                                result.theoretical_material_cost,
                              ),
                            },
                            {
                              description: "Practical purchase cost",
                              value: formatCurrency(
                                result.practical_purchase_cost,
                              ),
                            },
                          ],
                          notes: [
                            ...(result.warnings ?? []),
                            `Standard partition: ${result.standard_partition_width}m × ${result.standard_partition_height}m`,
                          ],
                        })}
                      />

                      <EngineConfidenceDetail
                        result={engine.assessConfidence({
                          ruleValid: result.valid,
                          inputComplete: true,
                          materialSpecComplete: result.materials.length > 0,
                          marketPriceAvailable:
                            result.practical_purchase_cost > 0,
                          sourceReliability: "verified",
                          productMatched: result.materials.length > 0,
                        })}
                      />

                      <EngineMaterialSummaryCard
                        summary={engine.buildMaterialSummary(
                          result.materials.map((m) => ({
                            materialId: m.material_slug,
                            productName: m.material_name,
                            totalQuantity: m.practical_purchase_quantity,
                            quantityUnit: m.theoretical_unit,
                            spaceIds: ["exterior"],
                          })),
                        )}
                      />
                    </div>

                    <HowCalculatedSection
                      methodologyText={
                        (calcDefaults.howCalculatedText as string) || ""
                      }
                      assumptions={[
                        {
                          label: "Standard partition",
                          value: `${result.standard_partition_width}m × ${result.standard_partition_height}m`,
                        },
                        {
                          label: "Partitions",
                          value: `${result.equivalent_standard_partitions}`,
                        },
                        {
                          label: "Dimensional adjustment",
                          value: result.has_dimensional_adjustment
                            ? "Yes"
                            : "No",
                        },
                      ]}
                    />
                    <EstimateDisclaimer
                      text={calcDefaults.estimateDisclaimer}
                    />
                    <ReportCalculationIssue
                      calculatorType="tyrolene"
                      userInput={{
                        partitions: result.equivalent_standard_partitions,
                        hasAdjustment: result.has_dimensional_adjustment,
                      }}
                      actualResult={{
                        theoreticalCost: result.theoretical_material_cost,
                        practicalCost: result.practical_purchase_cost,
                      }}
                    />

                    {/* Save Button */}
                    <div className="flex gap-3 pt-2">
                      <Button
                        onClick={handleSave}
                        disabled={calculating || saved}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {saved ? (
                          <>
                            <CheckCircle2 className="h-4 w-4" /> Saved
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" /> Save Estimate
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="pt-2 flex justify-center">
                      <SaveToProjectButton
                        calculatorType="tyrolene"
                        calculatorSlug="tyrolene-estimator"
                        calcTitle={`Tyrolene: ${formatNumber(result.partition_breakdown.reduce((sum, p) => sum + p.area, 0))} m²`}
                        calcData={
                          {
                            inputMode,
                            standardCount,
                            partitionTypes,
                            ...result,
                          } as Record<string, unknown>
                        }
                        resultSummary={
                          {
                            theoreticalCost: result.theoretical_material_cost,
                            practicalCost: result.practical_purchase_cost,
                          } as Record<string, unknown>
                        }
                        materials={(result.materials || []).map(
                          (m: TyroleneMaterialResult) => ({
                            name: m.material_name,
                            category: "tyrolene",
                            quantity: m.pack_count,
                            unit: "packs",
                          }),
                        )}
                        compact
                        label="Save to Project Workspace"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </Container>

      {!embedded && (
        <>
          <TyroleneEstimatorSeo />

          <FaqSection
            faqs={[
              {
                question: "What is Tyrolene?",
                answer: (
                  <span>
                    Tyrolene is a textured exterior wall finish made from a
                    mixture of cement, sand, acrylic bond, and water seal. It
                    provides weather resistance and a decorative texture to
                    building exteriors.
                  </span>
                ),
              },
              {
                question: "How is Tyrolene calculated?",
                answer: (
                  <span>
                    Tyrolene is calculated based on the wall area and the number
                    of partitions (coats/layers). The estimator uses
                    partition-based methodology to determine cement, sand,
                    acrylic bond, water seal, and anti-fungal quantities.
                  </span>
                ),
              },
              {
                question: "Is Tyrolene only for exterior walls?",
                answer: (
                  <span>
                    Yes, Tyrolene is designed for exterior surfaces. It provides
                    weather protection and decorative texture for building
                    facades.
                  </span>
                ),
              },
            ]}
          />

          <RelatedTools
            links={[
              CALC_LINKS.finishEstimator,
              CALC_LINKS.paintCalculator,
              CALC_LINKS.buildToRoof,
              CALC_LINKS.paintCalculator,
              CALC_LINKS.buildToRoof,
              CALC_LINKS.imageEstimator,
            ]}
          />
        </>
      )}
    </>
  );
}
