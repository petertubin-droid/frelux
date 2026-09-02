import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Home,
  Building2,
  Trees,
  Fence,
  RotateCcw,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { WorkWeatherBanner } from "@/components/ui/WorkWeatherBanner";
import MultiStepProgress from "@/components/ui/MultiStepProgress";
import TemplatePicker from "@/components/ui/TemplatePicker";
import CountUp from "@/components/ui/CountUp";
import StickyActionBar from "@/components/ui/StickyActionBar";
import { useToast } from "@/components/ui/Toast";
import {
  calculatePaint,
  type CalcConfig,
  SURFACE_CONDITION_FACTORS,
  COLOR_CONDITION_INFO,
} from "@/lib/calc";
import {
  calculateRoom,
  type PaintEngineRoomInput,
  type PaintEngineConfig,
} from "@/lib/estimation/paint-engine";
import type {
  EstimationProduct,
  EstimationProductQuality,
  EstimationPrice,
  EstimationCalcRule,
} from "@/types/estimation";
import {
  fetchEstimationProducts,
  fetchProductQualityLevels,
  fetchActivePrice,
  fetchCalcRules,
} from "@/lib/estimation/queries";
import { track } from "@/lib/analytics";
import {
  logAnalyticsEvent,
  fetchPaintTypes,
  saveUserProject,
} from "@/lib/queries";
import {
  fetchSurfaceConditions,
  fetchColourConditions,
} from "@/lib/estimation/queries";
import { formatNumber } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useCalcDefaults, type CalcDefaults } from "@/lib/use-calc-defaults";
import {
  HowCalculatedSection,
  EstimateDisclaimer,
  ReportCalculationIssue,
  SaveToProjectButton,
} from "@/components/calculators";
import CalculatorNearMe from "@/components/calculators/CalculatorNearMe";
import type {
  CalculatorInput,
  CalculatorResult,
  ProjectType,
  Unit,
  OpeningDimensions,
  SurfaceCondition,
  ColorCondition,
} from "@/types";
import type { DbPaintType } from "@/types/database";
import type {
  EstimationSurfaceCondition,
  EstimationColourCondition,
} from "@/types/estimation";
import { RewardedFeatureGate } from "@/components/rewarded/RewardedFeatureGate";
import { AdvancedCalculator } from "@/components/rewarded/AdvancedCalculator";

const projectTypes: {
  value: ProjectType;
  label: string;
  description: string;
  icon: typeof Home;
}[] = [
  {
    value: "room",
    label: "Room",
    description: "A single interior room",
    icon: Home,
  },
  {
    value: "house",
    label: "House",
    description: "Whole house interior",
    icon: Building2,
  },
  {
    value: "exterior",
    label: "Exterior",
    description: "Outside walls",
    icon: Trees,
  },
  {
    value: "fence",
    label: "Fence or Gate",
    description: "Fence, gate, or railing",
    icon: Fence,
  },
];

// Defaults are fetched from admin-configured calc rules via useCalcDefaults
// WASTE_OPTIONS and defaultDoorDims/defaultWindowDims are set dynamically in the component

const ADVANCED_FEATURES = [
  "AI-powered project analysis & breakdown",
  "Smart cost optimization recommendations",
  "Labour, transport & markup cost adjuster",
  "Multiple waste percentage scenarios",
  "Profit and tax/VAT calculator",
  "Ask AI: get expert answers about your project",
  "Save estimates and export professional PDF quotations",
  "AI risk assessment & quality checks",
  "AI recommendations for reducing waste",
  "AI assistant for calculation questions",
];

import { useSeo } from "@/lib/seo";
import { RelatedTools, CALC_LINKS } from "@/components/seo/SeoSections";
import RelatedToolsLinks from "@/components/ui/RelatedToolsLinks";
import { monitoredCalc } from "@/lib/calculator-monitor";
import AdSlot from "@/components/ui/AdSlot";
import { SITE_URL } from "@/lib/seo";
import { getSafeError } from "@/lib/safeError";
import { Button } from "@/components/ui/shadcn/button";

export default function PaintCalculator({
  embedded = false,
}: { embedded?: boolean } = {}) {
  const { defaults: calcDefaults, rules: _calcRules } =
    useCalcDefaults("painting");
  const WASTE_OPTIONS = (calcDefaults.wasteMarginOptions as number[]) ?? [
    0, 5, 10, 15,
  ];
  const defaultDoorDims: OpeningDimensions = {
    width: calcDefaults.doorWidthM,
    height: calcDefaults.doorHeightM,
  };
  const defaultWindowDims: OpeningDimensions = {
    width: calcDefaults.windowWidthM,
    height: calcDefaults.windowHeightM,
  };
  const { toast } = useToast();
  const { user } = useAuth();
  useSeo(
    !embedded
      ? {
          title: "Paint Calculator — How Much Paint Do I Need?",
          description:
            "Free paint calculator. Enter your room dimensions, doors, windows, and coats to estimate how many paint buckets your project requires.",
          canonicalPath: "/paint-calculator",
          ogType: "website",
          structuredDataArray: [
            {
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "FRELUX Paint Calculator",
              description:
                "Free paint calculator. Enter your room dimensions, doors, windows, and coats to estimate how many paint buckets your project requires.",
              url: `${SITE_URL}/paint-calculator`,
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
                  name: "Calculators",
                  item: `${SITE_URL}/calculators`,
                },
                {
                  "@type": "ListItem",
                  position: 3,
                  name: "Paint Calculator",
                  item: `${SITE_URL}/paint-calculator`,
                },
              ],
            },
          ],
        }
      : null,
  );

  const [step, setStep] = useState(1);
  const [result, setResult] = useState<CalculatorResult | null>(null);
  const [input, setInput] = useState<CalculatorInput>({
    projectType: "room",
    length: 0,
    width: 0,
    wallHeight: 0,
    doors: 0,
    doorDims: defaultDoorDims,
    windows: 0,
    windowDims: defaultWindowDims,
    coats: 2,
    paintType: "",
    unit: "feet",
    includeCeiling: false,
    wasteMargin: 10,
    surfaceCondition: "smooth",
    colorCondition: "same_or_light",
    includePrimer: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paintTypes, setPaintTypes] = useState<DbPaintType[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [typesError, setTypesError] = useState<string | null>(null);
  const [dbSurfaceConditions, setDbSurfaceConditions] = useState<
    EstimationSurfaceCondition[]
  >([]);
  const [dbColourConditions, setDbColourConditions] = useState<
    EstimationColourCondition[]
  >([]);
  const [estProducts, setEstProducts] = useState<EstimationProduct[]>([]);
  const [estQualities, setEstQualities] = useState<
    Map<string, EstimationProductQuality[]>
  >(new Map());
  const [estPrices, setEstPrices] = useState<Map<string, EstimationPrice>>(
    new Map(),
  );
  const [estCalcRules, setEstCalcRules] = useState<
    Map<string, EstimationCalcRule>
  >(new Map());
  const [selectedQualityId, setSelectedQualityId] = useState<string>("");

  const mountedRef = useRef(true);
  useEffect(() => {
    const isMounted = mountedRef;
    async function loadTypes() {
      const { data, error } = await fetchPaintTypes();
      if (error) setTypesError(getSafeError(error));
      if (!isMounted.current) return;
      setPaintTypes(data);
      if (data.length > 0 && !input.paintType) {
        if (!isMounted.current) return;
        setInput((prev) => ({ ...prev, paintType: data[0].id }));
      }
      if (!isMounted.current) return;
      setTypesLoading(false);
    }
    async function loadConditions() {
      const [surfRes, colourRes] = await Promise.all([
        fetchSurfaceConditions(),
        fetchColourConditions(),
      ]);
      if (surfRes.data) setDbSurfaceConditions(surfRes.data);
      if (colourRes.data) setDbColourConditions(colourRes.data);
    }
    async function loadEstimationEngine() {
      try {
        const [prodRes, rulesRes] = await Promise.all([
          fetchEstimationProducts(),
          fetchCalcRules(),
        ]);
        const prodList = (prodRes.data ?? []) as EstimationProduct[];
        setEstProducts(prodList);
        const ruleMap = new Map<string, EstimationCalcRule>();
        for (const r of (rulesRes.data ?? []) as EstimationCalcRule[]) {
          ruleMap.set(r.rule_key, r);
        }
        setEstCalcRules(ruleMap);

        // Load qualities for each product
        const qualMap = new Map<string, EstimationProductQuality[]>();
        const priceMap = new Map<string, EstimationPrice>();
        for (const p of prodList) {
          const { data: quals } = await fetchProductQualityLevels(p.id);
          qualMap.set(p.id, (quals ?? []) as EstimationProductQuality[]);
          // Load prices for each quality
          for (const q of (quals ?? []) as EstimationProductQuality[]) {
            const { data: priceData } = await fetchActivePrice("quality", q.id);
            if (priceData) priceMap.set(q.id, priceData as EstimationPrice);
          }
        }
        setEstQualities(qualMap);
        setEstPrices(priceMap);
      } catch (e) {
        if (import.meta.env.DEV)
          console.error("Failed to load estimation engine config:", e);
      }
    }
    loadTypes();
    loadConditions();
    loadEstimationEngine();
    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Override the hardcoded surface condition factor if DB has a value
  const effectiveSurfaceFactor = useMemo(() => {
    const dbMatch = dbSurfaceConditions.find(
      (s) => s.condition_key === (input.surfaceCondition ?? "smooth"),
    );
    if (dbMatch?.coverage_adjustment_factor != null)
      return dbMatch.coverage_adjustment_factor;
    return (
      SURFACE_CONDITION_FACTORS[input.surfaceCondition ?? "smooth"]?.factor ??
      1.0
    );
  }, [dbSurfaceConditions, input.surfaceCondition]);

  // Override min coats if DB has a value
  const effectiveMinCoats = useMemo(() => {
    const dbMatch = dbColourConditions.find(
      (c) => c.condition_key === (input.colorCondition ?? "same_or_light"),
    );
    if (dbMatch?.min_coats_override != null) return dbMatch.min_coats_override;
    return (
      COLOR_CONDITION_INFO[input.colorCondition ?? "same_or_light"]?.minCoats ??
      2
    );
  }, [dbColourConditions, input.colorCondition]);

  const calcConfig: CalcConfig | undefined = useMemo(() => {
    const selected = paintTypes.find(
      (t) => t.id === input.paintType || t.name === input.paintType,
    );
    if (!selected) return undefined;
    return {
      coverageRate: Number(selected.coverage_rate),
      containerSizes: selected.container_sizes,
      surfaceFactorOverride:
        effectiveSurfaceFactor !== 1.0 ? effectiveSurfaceFactor : undefined,
      minCoatsOverride: effectiveMinCoats > 2 ? effectiveMinCoats : undefined,
    };
  }, [paintTypes, input.paintType, effectiveSurfaceFactor, effectiveMinCoats]);

  const selectedPaintType = paintTypes.find(
    (t) => t.id === input.paintType || t.name === input.paintType,
  );

  // Match the selected paint type to an estimation product for quality selection
  const matchedEstProduct = useMemo(() => {
    if (estProducts.length === 0) return null;
    const selectedPaint = paintTypes.find(
      (t) => t.id === input.paintType || t.name === input.paintType,
    );
    if (!selectedPaint) return null;
    const byName = estProducts.find(
      (p) =>
        p.name.toLowerCase() === selectedPaint.name.toLowerCase() ||
        p.category === selectedPaint.name.toLowerCase(),
    );
    return byName ?? null;
  }, [estProducts, paintTypes, input.paintType]);

  // Active qualities for the matched product (type-specific)
  const availableQualities = useMemo(() => {
    if (!matchedEstProduct) return [];
    const all = estQualities.get(matchedEstProduct.id) ?? [];
    return all.filter((q) => q.is_active);
  }, [matchedEstProduct, estQualities]);

  // The selected quality object
  const selectedQuality = useMemo(() => {
    if (!selectedQualityId || !matchedEstProduct) return null;
    return availableQualities.find((q) => q.id === selectedQualityId) ?? null;
  }, [selectedQualityId, matchedEstProduct, availableQualities]);

  // The price for the selected quality
  const selectedQualityPrice = useMemo(() => {
    if (!selectedQuality) return null;
    return estPrices.get(selectedQuality.id) ?? null;
  }, [selectedQuality, estPrices]);

  // Reset quality when paint type changes
  useEffect(() => {
    setSelectedQualityId("");
  }, [input.paintType]);

  // Merge DB-driven surface conditions with hardcoded fallbacks.
  // If DB has coverage_adjustment_factor, use it; otherwise fall back to hardcoded.
  const surfaceConditionOptions = useMemo(() => {
    const options: {
      key: SurfaceCondition;
      label: string;
      factor: number;
      description: string;
      primerRecommended: boolean;
    }[] = [];
    // If DB has surface conditions, use them
    if (dbSurfaceConditions.length > 0) {
      for (const sc of dbSurfaceConditions) {
        // Map DB condition_key to our SurfaceCondition type
        const key = sc.condition_key as SurfaceCondition;
        const factor =
          sc.coverage_adjustment_factor ??
          SURFACE_CONDITION_FACTORS.smooth.factor;
        // Check if we have a hardcoded label for this key, otherwise use the DB name
        const hardcoded = SURFACE_CONDITION_FACTORS[key];
        options.push({
          key,
          label: sc.name,
          factor,
          description: sc.description ?? hardcoded?.description ?? "",
          primerRecommended: sc.primer_recommended,
        });
      }
    }
    // Always ensure smooth is available as fallback
    if (!options.find((o) => o.key === "smooth")) {
      options.unshift({
        key: "smooth",
        label: SURFACE_CONDITION_FACTORS.smooth.label,
        factor: SURFACE_CONDITION_FACTORS.smooth.factor,
        description: SURFACE_CONDITION_FACTORS.smooth.description,
        primerRecommended: false,
      });
    }
    return options;
  }, [dbSurfaceConditions]);

  // Merge DB-driven colour conditions with hardcoded fallbacks
  const colourConditionOptions = useMemo(() => {
    const options: {
      key: ColorCondition;
      label: string;
      warning: string | null;
      minCoats: number;
    }[] = [];
    if (dbColourConditions.length > 0) {
      for (const cc of dbColourConditions) {
        const key = cc.condition_key as ColorCondition;
        const hardcoded = COLOR_CONDITION_INFO[key];
        options.push({
          key,
          label: cc.name,
          warning: cc.requires_warning
            ? (hardcoded?.warning ??
              "Additional preparation or paint may be required.")
            : null,
          minCoats: cc.min_coats_override ?? hardcoded?.minCoats ?? 2,
        });
      }
    }
    if (!options.find((o) => o.key === "same_or_light")) {
      options.unshift({
        key: "same_or_light",
        label: COLOR_CONDITION_INFO.same_or_light.label,
        warning: null,
        minCoats: 2,
      });
    }
    return options;
  }, [dbColourConditions]);

  function update<K extends keyof CalculatorInput>(
    key: K,
    value: CalculatorInput[K],
  ) {
    setInput((prev) => ({ ...prev, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  }

  function validateStep(s: number): boolean {
    const e: Record<string, string> = {};
    if (s === 2) {
      if (input.length <= 0) e.length = "Enter a valid length";
      // Width is optional for all project types — no validation needed when blank.
      if (input.wallHeight <= 0) e.wallHeight = "Enter a valid wall height";
    }
    if (s === 3) {
      if (input.doors < 0) e.doors = "Doors cannot be negative";
      if (input.windows < 0) e.windows = "Windows cannot be negative";
      if (input.coats < 1) e.coats = "Enter at least 1 coat";
      if (input.wasteMargin < 0 || input.wasteMargin > 100)
        e.wasteMargin = "Waste margin must be 0 to 100";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (!validateStep(step)) return;
    if (step === 1) {
      track("calculator_started", { projectType: input.projectType });
      logAnalyticsEvent("calculator_started", {
        projectType: input.projectType,
      });
    }
    setStep((s) => Math.min(3, s + 1));
  }

  function back() {
    setStep((s) => Math.max(1, s - 1));
  }

  function compute() {
    if (!validateStep(3)) return;

    // Validate quality selection if estimation products are available
    if (
      matchedEstProduct &&
      availableQualities.length > 0 &&
      !selectedQualityId
    ) {
      toast({
        type: "warning",
        title: "Quality required",
        message: "Please select a paint quality level before calculating.",
      });
      return;
    }

    // Try the central Paint Calculation Engine first (uses DB-configured coverage/prices)
    const estProduct = estProducts.find(
      (p) => p.slug === "emulsion" || p.slug === "matt" || p.slug === "satin",
    );
    if (estProduct && estQualities.size > 0) {
      // Use the matched product from the paint type selection
      const matchedProduct = matchedEstProduct ?? estProduct;

      // Use the user-selected quality, not the first one
      const allQuals = estQualities.get(matchedProduct.id) ?? [];
      const matchedQuality = selectedQuality
        ? (allQuals.find((q) => q.id === selectedQuality.id) ?? null)
        : (allQuals.find((q) => q.is_active) ?? null);
      const price = matchedQuality
        ? (estPrices.get(matchedQuality.id) ?? null)
        : null;

      const ceilingRule = estCalcRules.get("ceiling_quantity_per_room") ?? null;
      const ceilingCoverageRule =
        estCalcRules.get("ceiling_coverage_rate") ?? null;
      const packSizeRule = estCalcRules.get("pack_size_bucket_litres") ?? null;
      const roundingRule = estCalcRules.get("purchase_rounding_rule") ?? null;
      const standardHeightRule =
        estCalcRules.get("standard_room_height") ?? null;
      const heightAdjustmentRule =
        estCalcRules.get("height_adjustment_rule") ?? null;
      const openingDeductionRule =
        estCalcRules.get("opening_deduction_rule") ?? null;
      const coatCountRule = estCalcRules.get("standard_coat_count") ?? null;
      const calibrationReferencesRule =
        estCalcRules.get("frelux_calibration_references") ?? null;

      const doorOpenings =
        input.doors > 0
          ? [
              {
                quantity: input.doors,
                width: input.doorDims.width,
                height: input.doorDims.height,
              },
            ]
          : [];
      const windowOpenings =
        input.windows > 0
          ? [
              {
                quantity: input.windows,
                width: input.windowDims.width,
                height: input.windowDims.height,
              },
            ]
          : [];

      const engineInput: PaintEngineRoomInput = {
        room_id: "room-1",
        room_name: "Room",
        length: input.length,
        width: input.width,
        height: input.wallHeight,
        unit: input.unit,
        doors: doorOpenings,
        windows: windowOpenings,
        doors_unknown: false,
        windows_unknown: false,
        product_id: matchedProduct.id,
        quality_id: matchedQuality?.id ?? "",
        coats: input.coats,
        include_ceiling: input.includeCeiling,
        ceiling_colour: "white",
        surface_condition_key: (input.surfaceCondition ?? "smooth") as string,
        colour_condition_key: (input.colorCondition ??
          "same_or_light") as string,
        include_primer: input.includePrimer ?? false,
      };

      const engineConfig: PaintEngineConfig = {
        product: matchedProduct,
        quality: matchedQuality,
        price: price,
        primer_price: null,
        ceilingRule,
        ceilingCoverageRule,
        packSizeRule,
        roundingRule,
        standardHeightRule,
        heightAdjustmentRule,
        openingDeductionRule,
        coatCountRule,
        calibrationReferencesRule,
        colourConditions: dbColourConditions,
        surfaceConditions: dbSurfaceConditions,
        calcVersionId: null,
      };

      const engineResult = calculateRoom(engineInput, engineConfig);

      // Convert engine result to old CalculatorResult format
      const containers =
        engineResult.practical_total_buckets > 0
          ? [
              {
                size: engineResult.pack_size_litres,
                count: engineResult.practical_total_buckets,
              },
            ]
          : [];
      const primerContainers =
        engineResult.primer_buckets > 0
          ? [
              {
                size: engineResult.pack_size_litres,
                count: engineResult.primer_buckets,
              },
            ]
          : [];

      const r: CalculatorResult = {
        projectType: input.projectType,
        unit: input.unit,
        wallArea: engineResult.gross_wall_area_m2,
        ceilingArea: engineResult.ceiling_area_m2,
        doorArea: engineResult.door_area_m2,
        windowArea: engineResult.window_area_m2,
        paintableArea: engineResult.net_wall_area_m2,
        coats: engineResult.effective_coats,
        paintType: input.paintType,
        coverageRate: engineResult.coverage_rate ?? 0,
        baseCoverageRate: engineResult.coverage_rate ?? 0,
        surfaceCondition: (engineResult.surface_condition?.condition_key ??
          "smooth") as SurfaceCondition,
        surfaceConditionFactor: engineResult.surface_factor,
        paintRequiredLiters: engineResult.theoretical_total_litres,
        wasteMargin: input.wasteMargin,
        adjustedLiters: engineResult.theoretical_total_litres,
        recommendedContainers: containers,
        totalRecommendedLiters: engineResult.practical_total_litres,
        leftoverLiters: engineResult.leftover_litres,
        primerLiters: engineResult.primer_litres,
        primerContainers,
        primerTotalLiters:
          engineResult.primer_buckets * engineResult.pack_size_litres,
        heightWarning: engineResult.height_warning,
        colorWarning: engineResult.colour_condition?.requires_warning
          ? engineResult.colour_condition.name
          : null,
        primerRecommended: engineResult.primer_recommended,
      };

      setResult(r);
      track("calculator_completed", {
        projectType: input.projectType,
        area: r.paintableArea,
        liters: r.adjustedLiters,
      });
      logAnalyticsEvent("calculator_completed", {
        projectType: input.projectType,
        area: r.paintableArea,
        liters: r.adjustedLiters,
      });
      return;
    }

    // Fall back to legacy calculation
    if (paintTypes.length === 0) return;
    const r = monitoredCalc("Painting Calculator", () =>
      calculatePaint(input, calcConfig),
    );
    setResult(r);
    track("calculator_completed", {
      projectType: input.projectType,
      area: r.paintableArea,
      liters: r.adjustedLiters,
    });
    logAnalyticsEvent("calculator_completed", {
      projectType: input.projectType,
      area: r.paintableArea,
      liters: r.adjustedLiters,
    });
  }

  function startOver() {
    setStep(1);
    setResult(null);
    setSelectedQualityId("");
    setInput({
      projectType: "room",
      length: 0,
      width: 0,
      wallHeight: 0,
      doors: 0,
      doorDims: defaultDoorDims,
      windows: 0,
      windowDims: defaultWindowDims,
      coats: 2,
      paintType: paintTypes[0]?.id ?? "",
      unit: "feet",
      includeCeiling: false,
      wasteMargin: 10,
      surfaceCondition: "smooth",
      colorCondition: "same_or_light",
      includePrimer: false,
    });
  }

  function handleLoadTemplate(data: Record<string, unknown>) {
    setInput((prev) => ({ ...prev, ...data }) as CalculatorInput);
    toast({
      type: "info",
      title: "Template loaded",
      message: "Adjust values and recalculate.",
    });
  }

  async function handleSave() {
    if (!user) {
      toast({
        type: "warning",
        title: "Sign in required",
        message: "Sign in to save your calculations.",
      });
      return;
    }
    const name = `Paint: ${input.projectType} — ${formatNumber(result?.paintableArea ?? 0)} m²`;
    const { error } = await saveUserProject(
      name,
      "paint_calc",
      { input, result },
      undefined,
    );
    if (error) {
      toast({ type: "error", title: "Failed to save", message: error });
      return;
    }
    toast({
      type: "success",
      title: "Project saved",
      message: "Find it in My Projects.",
    });
  }

  function handleExport() {
    toast({
      type: "info",
      title: "Exporting PDF",
      message:
        "Use the Advanced Calculator export for professional quotations.",
    });
  }

  async function handleShare() {
    if (!result || !user) {
      toast({
        type: "warning",
        title: "Sign in required",
        message: "Sign in to share your calculations.",
      });
      return;
    }
    toast({
      type: "info",
      title: "Share link copied",
      message: "Shareable link copied to clipboard.",
    });
  }

  function handleAskAi() {
    toast({
      type: "info",
      title: "AI Assistant",
      message: "Redirecting to the Smart Color Assistant.",
    });
  }

  return (
    <>
      {!embedded && (
        <>
          <PageHeader
            eyebrow="Tool"
            title="Paint Calculator"
            subtitle="Estimate how many paint buckets your project requires, step by step."
            breadcrumbs={[
              { label: "Home", path: "/" },
              { label: "Calculators", path: "/calculators" },
              { label: "Paint Calculator" },
            ]}
          />
          <WorkWeatherBanner workType="painting" />
        </>
      )}

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {typesError && (
          <div className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Couldn't load paint types: {typesError}. Please try again later.
            </p>
          </div>
        )}

        {!result && paintTypes.length === 0 && !typesLoading && (
          <div className="rounded-xl border border-dashed border-border bg-muted/50 p-8 text-center">
            <p className="text-sm font-semibold text-muted-foreground">
              No paint types configured
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              An administrator needs to add paint types with coverage rates
              before the calculator can produce results.
            </p>
          </div>
        )}

        {!result && paintTypes.length > 0 && (
          <div className="mb-6">
            <MultiStepProgress
              steps={[
                { label: "Project type", shortLabel: "Type" },
                { label: "Measurements", shortLabel: "Measure" },
                { label: "Surface details", shortLabel: "Details" },
              ]}
              current={step - 1}
            />
          </div>
        )}

        {!result && paintTypes.length > 0 ? (
          <div className="mt-8 card p-6 sm:p-8 dark:border-white/5 dark:bg-card">
            <div className="mb-6 flex justify-end">
              <TemplatePicker
                calculatorType="paint"
                onLoad={handleLoadTemplate}
                currentData={input as unknown as Record<string, unknown>}
              />
            </div>
            {step === 1 && <Step1 input={input} update={update} />}
            {step === 2 && (
              <Step2 input={input} update={update} errors={errors} />
            )}
            {step === 3 && (
              <Step3
                input={input}
                update={update}
                errors={errors}
                paintTypes={paintTypes}
                typesLoading={typesLoading}
                wasteOptions={WASTE_OPTIONS}
                surfaceConditionOptions={surfaceConditionOptions}
                colourConditionOptions={colourConditionOptions}
                matchedEstProduct={matchedEstProduct}
                availableQualities={availableQualities}
                selectedQualityId={selectedQualityId}
                onSelectQuality={setSelectedQualityId}
                selectedQualityPrice={selectedQualityPrice}
                qualityPriceMap={estPrices}
              />
            )}

            <div className="mt-8 flex items-center justify-between border-t border-border/50 pt-6">
              <Button variant="secondary"
                type="button"
                onClick={back}
                disabled={step === 1}
                className="disabled:opacity-40"
              >
                Back
              </Button>
              {step < 3 ? (
                <Button variant="default" type="button" onClick={next} className="btn-primary">
                  Continue
                </Button>
              ) : (
                <Button variant="default"
                  type="button"
                  onClick={compute}
                  className="btn-glow"
                >
                  Calculate
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ) : null}

        {result && (
          <ResultCard
            result={result}
            input={input}
            paintTypeName={selectedPaintType?.name ?? input.paintType}
            qualityName={selectedQuality?.name ?? null}
            qualityId={selectedQuality?.id ?? null}
            qualityPrice={selectedQualityPrice?.price ?? null}
            qualityPriceCurrency={selectedQualityPrice?.currency ?? null}
            onAgain={() => setResult(null)}
            onStartOver={startOver}
            calcDefaults={calcDefaults}
            onSave={handleSave}
            onExport={handleExport}
            onShare={handleShare}
            onAskAi={handleAskAi}
          />
        )}

        {result && (
          <div className="mt-4 flex justify-center">
            <SaveToProjectButton
              calculatorType="paint"
              calculatorSlug="paint-calculator"
              calcTitle={`Paint: ${input.projectType} — ${formatNumber(result.paintableArea ?? 0)} m²`}
              calcData={input as unknown as Record<string, unknown>}
              resultSummary={{
                paintableArea: result.paintableArea,
                totalBuckets: result.recommendedContainers.reduce(
                  (sum, c) => sum + c.count,
                  0,
                ),
                totalRecommendedLiters: result.totalRecommendedLiters,
                primerBuckets: result.primerContainers.reduce(
                  (sum, c) => sum + c.count,
                  0,
                ),
                paintType: selectedPaintType?.name ?? input.paintType,
                coats: result.coats,
              }}
              materials={[
                ...result.recommendedContainers.map((c) => ({
                  name: `${c.size}L Container`,
                  category: "paint",
                  quantity: c.count,
                  unit: "containers",
                })),
                ...result.primerContainers.map((c) => ({
                  name: `${c.size}L Primer`,
                  category: "primer",
                  quantity: c.count,
                  unit: "containers",
                })),
              ]}
            />
          </div>
        )}

        {result && <StickyActionBar onRecalculate={() => setResult(null)} />}

        {result && (
          <RewardedFeatureGate
            toolKey="advanced_calculator"
            featureName="AI Advanced Calculator"
            features={ADVANCED_FEATURES}
          >
            {(access) => (
              <AdvancedCalculator
                toolKey="paint"
                toolLabel="Paint Calculator"
                contextSummary={`Paint Calculator Results:
- Project type: ${input.projectType}
- Paintable area: ${formatNumber(result.paintableArea)} m²
- Coats: ${result.coats}
- Paint type: ${selectedPaintType?.name ?? input.paintType}
- Surface condition: ${result.surfaceCondition}
- Coverage rate: ${formatNumber(result.coverageRate, 1)} m²/L per coat
- Paint required: ${formatNumber(result.adjustedLiters)}L (adjusted for ${input.wasteMargin}% waste)
- Recommended containers: ${result.recommendedContainers.map((c) => `${c.count} × ${c.size}L`).join(", ")}
- Total recommended: ${formatNumber(result.totalRecommendedLiters)}L
- Leftover: ${formatNumber(result.leftoverLiters)}L
${result.primerContainers.length > 0 ? `- Primer: ${result.primerContainers.map((c) => `${c.count} × ${c.size}L`).join(", ")} (${formatNumber(result.primerTotalLiters)}L)` : "- Primer: none needed"}
- Waste margin: ${input.wasteMargin}%`}
                clientHash={access.clientHash}
              />
            )}
          </RewardedFeatureGate>
        )}
      </div>
      {!embedded && (
        <RelatedTools
          links={[
            CALC_LINKS.paintCost,
            CALC_LINKS.paintingEstimator,
            CALC_LINKS.aiColor,
            CALC_LINKS.finishEstimator,
            CALC_LINKS.screedingCalc,
            CALC_LINKS.templates,
          ]}
        />
      )}
      <AdSlot slotKey="calculator_bottom" className="mt-8" />
    </>
  );
}

function Step1({
  input,
  update,
}: {
  input: CalculatorInput;
  update: <K extends keyof CalculatorInput>(
    key: K,
    value: CalculatorInput[K],
  ) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold text-foreground dark:text-primary-foreground">
        Choose project type
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Select what you're painting to tailor the calculation.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {projectTypes.map((p) => {
          const Icon = p.icon;
          const selected = input.projectType === p.value;
          return (
            <Button variant="ghost"
              key={p.value}
              type="button"
              onClick={() => update("projectType", p.value)}
              className={
                "select-card flex items-start gap-3 rounded-xl border p-4 text-left " +
                (selected
                  ? "select-card-active border-brand-purple bg-primary/5 ring-2 ring-brand-purple/20"
                  : "border-border")
              }
            >
              <span
                className={
                  "inline-flex h-10 w-10 items-center justify-center rounded-lg " +
                  (selected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground")
                }
              >
                <Icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-foreground dark:text-primary-foreground">
                  {p.label}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {p.description}
                </span>
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function Step2({
  input,
  update,
  errors,
}: {
  input: CalculatorInput;
  update: <K extends keyof CalculatorInput>(
    key: K,
    value: CalculatorInput[K],
  ) => void;
  errors: Record<string, string>;
}) {
  const unitLabel = input.unit === "meters" ? "m" : "ft";
  const isFence = input.projectType === "fence";
  const isExterior = input.projectType === "exterior";

  return (
    <div>
      <h2 className="text-lg font-bold text-foreground dark:text-primary-foreground">
        Enter measurements
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Provide the dimensions of the area you're painting.
      </p>

      <div className="mt-5 inline-flex rounded-lg border border-border p-1">
        {(["meters", "feet"] as Unit[]).map((u) => (
          <Button variant="ghost"
            key={u}
            type="button"
            onClick={() => update("unit", u)}
            className={
              "rounded-md px-4 py-1.5 text-sm font-semibold capitalize transition-all " +
              (input.unit === u
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-brand-purple")
            }
            aria-pressed={input.unit === u}
          >
            {u}
          </Button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Currently using{" "}
        <span className="font-semibold text-muted-foreground">{input.unit}</span>.
      </p>

      <div
        className={
          "mt-6 grid gap-4 " + (isFence ? "sm:grid-cols-2" : "sm:grid-cols-3")
        }
      >
        <Field
          label={isFence ? "Fence length" : "Length"}
          suffix={unitLabel}
          error={errors.length}
        >
          <input
            type="number"
            min={0}
            step="0.01"
            value={input.length || ""}
            onChange={(e) => update("length", Number(e.target.value))}
            className="input-field"
            placeholder="0.00"
          />
        </Field>
        {!isFence && (
          <Field
            label="Width (Optional if not applicable)"
            suffix={unitLabel}
            hint="Leave blank if only one pair of walls needs painting"
          >
            <input
              type="number"
              min={0}
              step="0.01"
              value={input.width || ""}
              onChange={(e) => update("width", Number(e.target.value))}
              className="input-field"
              placeholder="0.00"
            />
          </Field>
        )}
        <Field
          label={isFence ? "Fence height" : "Wall height"}
          suffix={unitLabel}
          error={errors.wallHeight}
        >
          <input
            type="number"
            min={0}
            step="0.01"
            value={input.wallHeight || ""}
            onChange={(e) => update("wallHeight", Number(e.target.value))}
            className="input-field"
            placeholder="0.00"
          />
        </Field>
      </div>

      {!isFence && !isExterior && (
        <div className="mt-6 flex items-center gap-3 rounded-lg border border-border p-4">
          <Toggle
            checked={input.includeCeiling}
            onChange={(v) => update("includeCeiling", v)}
          />
          <div>
            <p className="text-sm font-semibold text-card-foreground">
              Include ceiling
            </p>
            <p className="text-xs text-muted-foreground">
              Adds the ceiling area (length × width) to the paintable surface.
              Requires width to be entered.
            </p>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Calculations are performed in metric internally; feet values are
        converted automatically.
      </p>
    </div>
  );
}

function Step3({
  input,
  update,
  errors,
  paintTypes,
  typesLoading,
  wasteOptions,
  surfaceConditionOptions,
  colourConditionOptions,
  matchedEstProduct,
  availableQualities,
  selectedQualityId,
  onSelectQuality,
  selectedQualityPrice,
  qualityPriceMap,
}: {
  input: CalculatorInput;
  update: <K extends keyof CalculatorInput>(
    key: K,
    value: CalculatorInput[K],
  ) => void;
  errors: Record<string, string>;
  paintTypes: DbPaintType[];
  typesLoading: boolean;
  wasteOptions: number[];
  surfaceConditionOptions: {
    key: SurfaceCondition;
    label: string;
    factor: number;
    description: string;
    primerRecommended: boolean;
  }[];
  colourConditionOptions: {
    key: ColorCondition;
    label: string;
    warning: string | null;
    minCoats: number;
  }[];
  matchedEstProduct: EstimationProduct | null;
  availableQualities: EstimationProductQuality[];
  selectedQualityId: string;
  onSelectQuality: (id: string) => void;
  selectedQualityPrice: EstimationPrice | null;
  qualityPriceMap: Map<string, EstimationPrice>;
}) {
  const [showDoorDims, setShowDoorDims] = useState(false);
  const [showWindowDims, setShowWindowDims] = useState(false);
  const isFence = input.projectType === "fence";
  const isExterior = input.projectType === "exterior";

  // Resolve the selected quality object from availableQualities + selectedQualityId
  const selectedQuality =
    availableQualities.find((q) => q.id === selectedQualityId) ?? null;

  // Fence and exterior projects typically have no doors/windows to subtract.
  const showOpenings = !isFence && !isExterior;

  function updateDoorDim(key: keyof OpeningDimensions, value: number) {
    update("doorDims", { ...input.doorDims, [key]: value });
  }
  function updateWindowDim(key: keyof OpeningDimensions, value: number) {
    update("windowDims", { ...input.windowDims, [key]: value });
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-foreground dark:text-primary-foreground">
        Surface details
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Tell us about the finish you want
        {showOpenings ? ", plus doors and windows" : ""}.
      </p>

      {showOpenings && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <Field label="Number of doors" error={errors.doors}>
              <input
                type="number"
                min={0}
                value={input.doors || ""}
                onChange={(e) => update("doors", Number(e.target.value))}
                placeholder="0"
                className="input-field"
              />
            </Field>
            <Button variant="ghost"
              type="button"
              onClick={() => setShowDoorDims((v) => !v)}
              className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-brand-purple hover:underline"
            >
              <ChevronDown
                className={
                  "h-3 w-3 transition-transform " +
                  (showDoorDims ? "rotate-180" : "")
                }
              />
              Custom door dimensions
            </Button>
            {showDoorDims && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Field label="Door width (m)">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={input.doorDims.width || ""}
                    onChange={(e) =>
                      updateDoorDim("width", Number(e.target.value))
                    }
                    className="input-field text-sm"
                  />
                </Field>
                <Field label="Door height (m)">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={input.doorDims.height || ""}
                    onChange={(e) =>
                      updateDoorDim("height", Number(e.target.value))
                    }
                    className="input-field text-sm"
                  />
                </Field>
              </div>
            )}
          </div>
          <div>
            <Field label="Number of windows" error={errors.windows}>
              <input
                type="number"
                min={0}
                value={input.windows || ""}
                onChange={(e) => update("windows", Number(e.target.value))}
                placeholder="0"
                className="input-field"
              />
            </Field>
            <Button variant="ghost"
              type="button"
              onClick={() => setShowWindowDims((v) => !v)}
              className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-brand-purple hover:underline"
            >
              <ChevronDown
                className={
                  "h-3 w-3 transition-transform " +
                  (showWindowDims ? "rotate-180" : "")
                }
              />
              Custom window dimensions
            </Button>
            {showWindowDims && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Field label="Window width (m)">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={input.windowDims.width || ""}
                    onChange={(e) =>
                      updateWindowDim("width", Number(e.target.value))
                    }
                    className="input-field text-sm"
                  />
                </Field>
                <Field label="Window height (m)">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={input.windowDims.height || ""}
                    onChange={(e) =>
                      updateWindowDim("height", Number(e.target.value))
                    }
                    className="input-field text-sm"
                  />
                </Field>
              </div>
            )}
          </div>
        </div>
      )}

      <div className={"mt-4 " + (showOpenings ? "" : "mt-6")}>
        <Field label="Number of paint coats" error={errors.coats}>
          <input
            type="number"
            min={1}
            max={6}
            value={input.coats}
            onChange={(e) => update("coats", Number(e.target.value))}
            className="input-field"
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Paint type">
          <select
            value={input.paintType}
            onChange={(e) => update("paintType", e.target.value)}
            className="input-field"
          >
            {typesLoading && <option value="">Loading…</option>}
            {paintTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({Number(t.coverage_rate)} m²/L per coat)
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* Quality selection — type-specific, dynamic from admin config */}
      {matchedEstProduct && (
        <div className="mt-4">
          <span className="block text-sm font-semibold text-card-foreground dark:text-muted-foreground/60">
            Quality
          </span>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Select the quality level for {matchedEstProduct.name}.
          </p>
          {availableQualities.length === 0 ? (
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-400">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                No active quality levels are configured for{" "}
                {matchedEstProduct.name}. An administrator needs to add quality
                levels before this paint type can be calculated.
              </span>
            </div>
          ) : (
            <>
              <select
                value={selectedQualityId}
                onChange={(e) => onSelectQuality(e.target.value)}
                className="input-field mt-2"
              >
                <option value="">— Select quality —</option>
                {availableQualities.map((q) => {
                  const qp = qualityPriceMap.get(q.id);
                  const price = qp
                    ? ` · ${qp.currency === "NGN" ? "₦" : ""}${qp.price.toLocaleString()} / bucket`
                    : "";
                  const coverage = q.coverage ? ` · ${q.coverage} m²/L` : "";
                  return (
                    <option key={q.id} value={q.id}>
                      {q.name}
                      {coverage}
                      {price}
                    </option>
                  );
                })}
              </select>
              {selectedQualityId && selectedQuality && (
                <div className="mt-2 rounded-lg border border-brand-purple/20 bg-primary/5 p-3 text-xs dark:border-brand-purple/30 dark:bg-primary/10">
                  <p className="font-semibold text-brand-purple dark:text-brand-purple-lighter">
                    {selectedQuality.name}
                  </p>
                  {selectedQuality.coverage && (
                    <p className="mt-0.5 text-muted-foreground dark:text-muted-foreground">
                      Coverage: {selectedQuality.coverage} m²/L per coat
                    </p>
                  )}
                  {selectedQualityPrice && (
                    <p className="mt-0.5 text-muted-foreground dark:text-muted-foreground">
                      Price:{" "}
                      {selectedQualityPrice.currency === "NGN" ? "₦" : ""}
                      {selectedQualityPrice.price.toLocaleString()} per bucket
                    </p>
                  )}
                  {selectedQuality.description && (
                    <p className="mt-0.5 text-muted-foreground dark:text-muted-foreground">
                      {selectedQuality.description}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="mt-4">
        <span className="block text-sm font-semibold text-card-foreground">
          Waste / safety margin
        </span>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Extra paint added to account for spills, roller waste, and touch ups.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {wasteOptions.map((w: number) => (
            <Button variant="ghost"
              key={w}
              type="button"
              onClick={() => update("wasteMargin", w)}
              className={
                "rounded-lg border px-4 py-2 text-sm font-semibold transition-all " +
                (input.wasteMargin === w
                  ? "border-brand-purple bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-border")
              }
            >
              {w}%
            </Button>
          ))}
        </div>
        {errors.wasteMargin && (
          <span className="mt-1 block text-xs text-red-600">
            {errors.wasteMargin}
          </span>
        )}
      </div>

      {/* Surface condition */}
      <div className="mt-4">
        <span className="block text-sm font-semibold text-card-foreground">
          Surface condition
        </span>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Affects coverage — rough surfaces absorb more paint.
        </p>
        <select
          value={input.surfaceCondition ?? "smooth"}
          onChange={(e) =>
            update("surfaceCondition", e.target.value as SurfaceCondition)
          }
          className="input-field mt-2"
        >
          {surfaceConditionOptions.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label} ({Math.round((1 - opt.factor) * 100)}% more paint)
            </option>
          ))}
        </select>
      </div>

      {/* Colour condition */}
      <div className="mt-4">
        <span className="block text-sm font-semibold text-card-foreground">
          Colour change
        </span>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Dark colours over light may need extra coats or primer.
        </p>
        <select
          value={input.colorCondition ?? "same_or_light"}
          onChange={(e) =>
            update("colorCondition", e.target.value as ColorCondition)
          }
          className="input-field mt-2"
        >
          {colourConditionOptions.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </select>
        {colourConditionOptions.find(
          (o) => o.key === (input.colorCondition ?? "same_or_light"),
        )?.warning && (
          <p className="mt-1 flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
            {
              colourConditionOptions.find(
                (o) => o.key === (input.colorCondition ?? "same_or_light"),
              )?.warning
            }
          </p>
        )}
      </div>

      {/* Primer toggle */}
      <div className="mt-4 flex items-center gap-3 rounded-lg border border-border p-4">
        <Toggle
          checked={input.includePrimer ?? false}
          onChange={(v) => update("includePrimer", v)}
        />
        <div>
          <p className="text-sm font-semibold text-card-foreground">
            Include primer / sealer
          </p>
          <p className="text-xs text-muted-foreground">
            {surfaceConditionOptions.find(
              (o) => o.key === (input.surfaceCondition ?? "smooth"),
            )?.primerRecommended
              ? "Recommended for this surface condition."
              : "Recommended for new surfaces and strong colour transitions."}
          </p>
        </div>
      </div>
    </div>
  );
}

function ResultCard({
  result,
  input,
  paintTypeName,
  qualityName,
  qualityId,
  qualityPrice,
  qualityPriceCurrency,
  onAgain,
  onStartOver,
  onSave: _onSave,
  onExport: _onExport,
  onShare: _onShare,
  onAskAi: _onAskAi,
  calcDefaults,
}: {
  result: CalculatorResult;
  input: CalculatorInput;
  paintTypeName: string;
  qualityName: string | null;
  qualityId: string | null;
  qualityPrice: number | null;
  qualityPriceCurrency: string | null;
  onAgain: () => void;
  onStartOver: () => void;
  onSave?: () => void;
  onExport?: () => void;
  onShare?: () => void;
  onAskAi?: () => void;
  calcDefaults: CalcDefaults;
}) {
  return (
    <div className="mt-8 card overflow-hidden dark:border-white/5 animate-fade-in-up dark:border-white/5">
      <div className="relative bg-gradient-to-br from-background to-primary p-6 text-primary-foreground sm:p-8">
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden="true"
        >
          <div className="absolute -top-1/2 -right-10 h-40 w-40 rounded-full bg-white/5 blur-3xl" />
        </div>
        <div className="relative flex items-center gap-2 text-accent-green">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-widest">
            Your estimate
          </span>
        </div>
        <p className="relative mt-3 text-sm text-primary-foreground/60">
          {input.projectType} project · {result.coats} coat
          {result.coats > 1 ? "s" : ""} · {paintTypeName}
          {qualityName && ` · ${qualityName}`}
          {input.wasteMargin > 0 && ` · ${input.wasteMargin}% waste margin`}
          {result.surfaceCondition !== "smooth" &&
            ` · ${SURFACE_CONDITION_FACTORS[result.surfaceCondition]?.label ?? ""}`}
        </p>
        <p className="relative mt-1 text-4xl font-bold sm:text-5xl animate-count-glow">
          {result.recommendedContainers.reduce((s, c) => s + c.count, 0)}{" "}
          buckets
        </p>
        <p className="relative mt-1 text-sm text-primary-foreground/60">
          estimated paint buckets required for your project
        </p>
      </div>

      <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8 dark:bg-card">
        <Stat
          label="Paintable area"
          value={`${formatNumber(result.paintableArea)} m²`}
          countValue={result.paintableArea}
          suffix=" m²"
        />
        <Stat label="Paint type" value={paintTypeName} />
        {qualityName && <Stat label="Quality" value={qualityName} />}
        <Stat
          label="Coverage rate"
          value={`${formatNumber(result.coverageRate, 1)} m²/L per coat (internal)`}
          countValue={result.coverageRate}
          decimals={1}
          suffix=" m²/L"
        />
        <Stat
          label="Paint buckets (theoretical)"
          value={`${result.recommendedContainers.reduce((s, c) => s + c.count, 0)} buckets`}
          countValue={result.recommendedContainers.reduce(
            (s, c) => s + c.count,
            0,
          )}
          decimals={0}
          suffix=" buckets"
        />
        {input.wasteMargin > 0 && (
          <Stat
            label="After waste margin"
            value={`${result.recommendedContainers.reduce((s, c) => s + c.count, 0)} buckets`}
            countValue={result.recommendedContainers.reduce(
              (s, c) => s + c.count,
              0,
            )}
            decimals={0}
            suffix=" buckets"
          />
        )}
        <Stat
          label="Total buckets to purchase"
          value={`${result.recommendedContainers.reduce((s, c) => s + c.count, 0)} buckets`}
          countValue={result.recommendedContainers.reduce(
            (s, c) => s + c.count,
            0,
          )}
          decimals={0}
          suffix=" buckets"
          highlight
        />
        {result.leftoverLiters > 0 && (
          <Stat
            label="Excess from buckets"
            value={`${formatNumber(result.leftoverLiters, 1)} L`}
            countValue={result.leftoverLiters}
            decimals={1}
            suffix=" L"
          />
        )}
        {result.coats !== input.coats && (
          <Stat label="Effective coats" value={`${result.coats}`} />
        )}
      </div>

      {/* Warnings */}
      {(result.heightWarning || result.colorWarning) && (
        <div className="border-t border-border/50 px-6 py-4 sm:px-8 dark:border-white/5 space-y-2">
          {result.heightWarning && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {result.heightWarning}
            </div>
          )}
          {result.colorWarning && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {result.colorWarning}
            </div>
          )}
        </div>
      )}

      {/* Primer */}
      {result.primerLiters > 0 && (
        <div className="border-t border-border/50 px-6 py-4 sm:px-8 dark:border-white/5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Primer / sealer
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {result.primerContainers.map((c, i) => (
              <span
                key={i}
                className="rounded-lg border border-border bg-muted/50 dark:border-white/5 dark:bg-white/5 px-3 py-1.5 text-sm font-semibold text-foreground dark:text-primary-foreground"
              >
                {c.count} × {c.size} L bucket
              </span>
            ))}
            <span className="rounded-lg border border-brand-purple/20 bg-primary/5 px-3 py-1.5 text-sm font-semibold text-brand-purple">
              {result.primerContainers.reduce((s, c) => s + c.count, 0)} buckets
              needed
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Primer covers ~30% more area per litre than paint. Applied as 1 coat
            before painting.
          </p>
        </div>
      )}

      <div className="border-t border-border/50 px-6 py-4 sm:px-8 dark:border-white/5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Recommended paint buckets
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {result.recommendedContainers.map((c, i) => (
            <span
              key={i}
              className="rounded-lg border border-border bg-muted/50 dark:border-white/5 dark:bg-white/5 px-3 py-1.5 text-sm font-semibold text-foreground dark:text-primary-foreground"
            >
              {c.count} × {c.size} L bucket
            </span>
          ))}
        </div>
      </div>

      <div className="border-t border-border/50 bg-muted/50 px-6 py-4 text-xs text-muted-foreground sm:px-8 dark:border-white/5 dark:bg-white/5 dark:text-muted-foreground">
        Wall area: {formatNumber(result.wallArea)} m²
        {result.ceilingArea > 0 &&
          ` · Ceiling: ${formatNumber(result.ceilingArea)} m²`}
        {result.doorArea > 0 && ` · Doors: ${formatNumber(result.doorArea)} m²`}
        {result.windowArea > 0 &&
          ` · Windows: ${formatNumber(result.windowArea)} m²`}
        <br />
        Base coverage {formatNumber(result.baseCoverageRate, 1)} m²/L → adjusted{" "}
        {formatNumber(result.coverageRate, 1)} m²/L (
        {SURFACE_CONDITION_FACTORS[result.surfaceCondition]?.label ?? "Smooth"}
        ). {result.coats} coat(s). Final amounts vary by surface texture,
        application method, and product.
      </div>

      {/* Find Near Me */}
      <div className="px-6 py-4 sm:px-8">
        <CalculatorNearMe
          tradeSlug="painting"
          materialName={paintTypeName}
          projectType="painting"
        />
      </div>

      <div className="px-6 pb-2 sm:px-8">
        <HowCalculatedSection
          methodologyText={(calcDefaults.howCalculatedText as string) || ""}
          assumptions={[
            {
              label: "Base coverage",
              value: `${formatNumber(result.baseCoverageRate, 1)} m²/L per coat`,
            },
            {
              label: "Adjusted coverage",
              value: `${formatNumber(result.coverageRate, 1)} m²/L (${SURFACE_CONDITION_FACTORS[result.surfaceCondition]?.label ?? "Smooth"})`,
            },
            {
              label: "Coats",
              value: `${result.coats}${result.coats !== input.coats ? ` (min for colour change)` : ""}`,
            },
            { label: "Waste margin", value: `${input.wasteMargin}%` },
            {
              label: "Container sizes",
              value: `${(calcDefaults.containerSizes as number[])?.join(", ") ?? "1, 4, 20"} L`,
            },
            {
              label: "Primer",
              value:
                result.primerLiters > 0
                  ? `${formatNumber(result.primerLiters, 1)} L included`
                  : "Not included",
            },
            {
              label: "Door dimensions",
              value: `${calcDefaults.doorWidthM}m × ${calcDefaults.doorHeightM}m`,
            },
            {
              label: "Window dimensions",
              value: `${calcDefaults.windowWidthM}m × ${calcDefaults.windowHeightM}m`,
            },
          ]}
        />
        <EstimateDisclaimer text={calcDefaults.estimateDisclaimer} />
        <ReportCalculationIssue
          calculatorType="painting"
          userInput={{
            projectType: input.projectType,
            length: input.length,
            width: input.width,
            wallHeight: input.wallHeight,
            coats: input.coats,
            unit: input.unit,
          }}
          actualResult={{
            paintRequiredLiters: result.paintRequiredLiters,
            adjustedLiters: result.adjustedLiters,
            totalRecommendedLiters: result.totalRecommendedLiters,
          }}
        />
      </div>

      <div className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <Button variant="secondary"
          type="button"
          onClick={onAgain}
          className="press-scale"
        >
          <RotateCcw className="h-4 w-4" />
          Calculate Again
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="secondary"
            type="button"
            onClick={onStartOver}
            className="press-scale"
          >
            Start Over
          </Button>
          <Link
            to="/paint-calculator?mode=cost"
            state={{
              projectType: input.projectType,
              paintableArea: result.paintableArea,
              paintLiters: result.adjustedLiters,
              coats: input.coats,
              paintType: input.paintType,
              paintTypeName,
              qualityId,
              qualityName,
              qualityPrice,
              qualityPriceCurrency,
              recommendedContainers: result.recommendedContainers,
              totalRecommendedLiters: result.totalRecommendedLiters,
            }}
            className="btn-primary press-scale group"
          >
            Continue to Cost Estimate
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  countValue,
  decimals = 0,
  suffix,
  highlight,
}: {
  label: string;
  value: string;
  countValue?: number;
  decimals?: number;
  suffix?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition-all ${highlight ? "stat-card-highlight" : "stat-card"}`}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1.5 text-xl font-bold tabular-nums ${highlight ? "text-brand-purple dark:text-brand-purple-lighter" : "text-foreground dark:text-primary-foreground"}`}
      >
        {countValue !== undefined ? (
          <CountUp value={countValue} decimals={decimals} suffix={suffix} />
        ) : (
          value
        )}
      </p>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Button variant="ghost"
      type="button"
      onClick={() => onChange(!checked)}
      style={{ width: "2.25rem", height: "1.25rem", minWidth: "2.25rem" }}
      className={
        "relative inline-flex appearance-none h-5 w-9 shrink-0 rounded-full border-0 p-0 transition-colors " +
        (checked ? "bg-accent-green" : "bg-muted")
      }
      aria-pressed={checked}
    >
      <span
        style={{ width: "1rem", height: "1rem" }}
        className={
          "absolute top-0.5 left-0 rounded-full bg-card shadow transition-transform dark:bg-card " +
          (checked ? "translate-x-4" : "translate-x-0.5")
        }
      />
    </Button>
  );
}

function Field({
  label,
  suffix,
  hint,
  error,
  children,
}: {
  label: string;
  suffix?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-card-foreground">
        {label}
      </span>
      {hint && (
        <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
      )}
      <div className="relative mt-1.5">
        {children}
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <span className="mt-1 block text-xs text-red-600">{error}</span>
      )}
    </label>
  );
}
