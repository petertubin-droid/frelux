import { stageStudioImport } from "@/lib/document-studio";
import HeroTitle from "@/components/ui/HeroTitle";
import SaveToProjectButton from "@/components/calculators/SaveToProjectButton";
import { ConstructionExtractionPanel } from "@/components/estimation/ConstructionExtractionPanel";
import React, { useState, useMemo, useCallback, useEffect, useId } from "react";
import { Link } from "react-router-dom";
import MarketScopeNotice from "@/components/MarketScopeNotice";
import { getConstructionTypology } from "@/lib/estimation/construction-typologies";
import { useWasteSettings } from "@/lib/waste/use-waste-settings";
import { startingWastePercent } from "@/lib/waste/waste-factor";
import type { WasteMaterialKey } from "@/lib/waste/waste-factor";
import { useSeoOfferCurrency } from "@/lib/international/market-context";
import {
  resolveMarketCement,
  resolveMarketSandM3,
  resolveMarketRebar,
} from "@/lib/estimation/structural-market";
import { useSeo } from "@/lib/seo";
import { APPROVED_MARKET_CODES } from "@/lib/international/countries";
import { useMarket } from "@/lib/international/market-context";
import { useDisplayCurrency } from "@/lib/international/currency-context";
import { formatAreaDual } from "@/lib/international/units-display";
import { RelatedTools, CALC_LINKS } from "@/components/seo/SeoSections";
import { CalculatorInput } from "@/components/estimation/CalculatorInput";
import {
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/shadcn/form";
import { useEstimatorDraft } from "@/hooks/useEstimatorDraft";
import {
  Check,
  CheckCircle,
  SlidersHorizontal,
  Building2,
  ChevronRight,
  ChevronLeft,
  Calculator,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Info,
  Package,
  Users,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Layers,
  Home,
  Ruler,
  Hammer,
  FolderOpen,
  Printer,
  ArrowRight,
  Settings,
  Camera,
  Gem,
  BadgeCheck,
  FileDown,
} from "lucide-react";
import {
  calculateBuildToRoof,
  convertBuildToRoofUnits,
  validateBuildToRoofInput,
  DEFAULT_PRICES,
  DEFAULT_LABOUR,
  DEFAULT_WASTAGE,
} from "@/lib/estimation/build-to-roof-engine";
import type {
  WastageConfig,
  BuildToRoofInput,
  BuildToRoofResult,
  BuildingType,
  FoundationType,
  RoofType,
  BlockSize,
  RoofingMaterial,
  StructuralMemberInput,
} from "@/types/build-to-roof";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { printQuote, type QuoteOptions } from "@/lib/estimation/quote-export";
import { quoteToShareable } from "@/lib/estimate-sharing";
import { ShareEstimateButton } from "@/components/ShareEstimateButton";
import { SubscriptionGate } from "@/components/subscription/SubscriptionGate";
import { RoofViewPanel } from "@/components/roof-view/RoofViewPanel";
import { RoofGeometryEditor } from "@/components/roof-view/RoofGeometryEditor";
import { createDefaultRoofGeometry } from "@/lib/roof/geometry-engine";
import type { RoofGeometry } from "@/lib/roof/geometry-types";
import { trackBuildToRoofRewards } from "@/lib/rewards-integration";
import { monitoredCalc } from "@/lib/calculator-monitor";
import { SITE_URL } from "@/lib/seo";
import { Button } from "@/components/ui/shadcn/button";
import { useLanguage } from "@/lib/i18n";
import { CalculatorAdBanner } from "@/components/ads/CampaignSlot";

const PHASES = [
  {
    id: 1,
    title: "Building Footprint & Envelope",
    shortTitle: "Envelope",
    description: "Dimensions, openings, project info",
    icon: Home,
  },
  {
    id: 2,
    title: "Assemblies (Modular)",
    shortTitle: "Assemblies",
    description: "Foundation, walls, roofing modules",
    icon: Layers,
  },
  {
    id: 3,
    title: "Material & Labor Rates",
    shortTitle: "Rates & Pricing",
    description: "Market standard or custom rates",
    icon: DollarSign,
  },
  {
    id: 4,
    title: "Summary BOQ & Export",
    shortTitle: "Summary BOQ",
    description: "Complete bill of quantities & export",
    icon: Calculator,
  },
] as const;

// Backward compatibility alias for internal step references
const STEPS = [
  { id: "project", label: "Project", icon: Home },
  { id: "dimensions", label: "Dimensions", icon: Ruler },
  { id: "openings", label: "Openings", icon: FolderOpen },
  { id: "foundation", label: "Foundation", icon: Layers },
  { id: "blocks", label: "Blocks & Mix", icon: Settings },
  { id: "roof", label: "Roof", icon: Building2 },
  { id: "structural", label: "Structural", icon: Hammer },
  { id: "prices", label: "Prices", icon: DollarSign },
  { id: "labour", label: "Labour", icon: Users },
  { id: "drawing", label: "Drawing", icon: Upload },
  { id: "result", label: "Estimate", icon: Calculator },
];

const BUILDING_TYPES: { value: BuildingType; label: string }[] = [
  { value: "bungalow", label: "Bungalow" },
  { value: "duplex", label: "Duplex" },
  { value: "two_storey", label: "Two-Storey" },
  { value: "apartment", label: "Apartment" },
  { value: "office", label: "Office" },
  { value: "shop", label: "Shop / Commercial" },
  { value: "custom", label: "Custom Building" },
];

const FOUNDATION_TYPES: { value: FoundationType; label: string }[] = [
  { value: "strip_footing", label: "Strip Footing" },
  { value: "pad_footing", label: "Pad Footing" },
  { value: "raft", label: "Raft Foundation" },
  { value: "pile", label: "Pile Foundation" },
  { value: "custom", label: "Custom" },
];

const ROOF_TYPES: { value: RoofType; label: string }[] = [
  { value: "gable", label: "Gable" },
  { value: "hip", label: "Hip" },
  { value: "mono_pitch", label: "Mono-Pitch" },
  { value: "flat", label: "Flat" },
  { value: "custom", label: "Custom" },
];

const BLOCK_SIZES: { value: BlockSize; label: string; description: string }[] =
  [
    {
      value: "9inch",
      label: "9-inch Block",
      description: "Hollow · Best for foundations & storey buildings",
    },
    {
      value: "6inch",
      label: "6-inch Block",
      description: "Hollow or solid · Internal walls & partitions",
    },
    {
      value: "5inch",
      label: "5-inch Block",
      description: "Solid only · Non-load-bearing partitions",
    },
    {
      value: "custom",
      label: "Custom",
      description: "Specify custom dimensions",
    },
  ];

const ROOFING_MATERIALS: { value: RoofingMaterial; label: string }[] = [
  { value: "long_span_aluminium", label: "Long Span Aluminium" },
  { value: "stone_coated", label: "Stone Coated" },
  { value: "gi_sheet", label: "GI Sheet" },
  { value: "shingle", label: "Shingle" },
  { value: "custom", label: "Custom" },
];

// ── Reusable input components ──

// Price-field props implementing the owner-approved local-price behavior:
// a price key with no market book value renders EMPTY with an "Enter
// local price" placeholder (never a Nigerian default); typing a value
// supplies the local price and clears the missing flag.
function priceFieldProps(
  key: string,
  prices: BuildToRoofInput["prices"],
  update: (key: "prices", value: BuildToRoofInput["prices"]) => void,
  missing: string[],
  setMissing: (v: string[]) => void,
) {
  const isMissing = missing.includes(key);
  return {
    value: isMissing ? "" : (prices as unknown as Record<string, number>)[key],
    placeholder: isMissing ? "Enter local price" : undefined,
    hint: isMissing
      ? "No verified price in your market - enter yours"
      : undefined,
    onChange: (v: string) => {
      const parsed = parseFloat(v) || 0;
      const next = {
        ...(prices as unknown as Record<string, number>),
        [key]: parsed,
      } as unknown as BuildToRoofInput["prices"];
      update("prices", next);
      if (parsed > 0 && isMissing) setMissing(missing.filter((k) => k !== key));
    },
  };
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "number",
  unit,
  placeholder,
  step,
  min,
  max,
  hint,
  error,
  required,
  className,
}: {
  id?: string;
  label: string;
  value: number | string;
  onChange: (v: string) => void;
  type?: "text" | "number" | "email" | "tel";
  unit?: string;
  placeholder?: string;
  step?: string | number;
  min?: string | number;
  max?: string | number;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <CalculatorInput
      id={id}
      label={label}
      value={value}
      onChange={onChange}
      type={type}
      unit={unit}
      placeholder={placeholder}
      step={step}
      min={min}
      max={max}
      hint={hint}
      error={error}
      required={required}
      className={className}
    />
  );
}

function SelectField({
  id: customId,
  label,
  value,
  onChange,
  options,
  hint,
  error,
  required,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
  error?: string;
  required?: boolean;
}) {
  const reactId = useId();
  const selectId = customId || `select-${reactId}`;
  return (
    <FormItem>
      <FormLabel htmlFor={selectId} error={!!error} required={required}>
        {label}
      </FormLabel>
      <FormControl error={!!error}>
        <select
          id={selectId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 sm:py-3 text-sm text-foreground focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20 transition-all duration-200 hover:border-border cursor-pointer"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </FormControl>
      {hint && !error && <FormDescription>{hint}</FormDescription>}
      {error && <FormMessage>{error}</FormMessage>}
    </FormItem>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
  className = "",
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-card shadow-card p-4 sm:p-6 transition-shadow duration-300 hover:shadow-card-hover ${className}`}
    >
      <div className="flex items-center gap-2.5 mb-4 sm:mb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-brand-purple/10">
          <Icon className="w-4.5 h-4.5 text-brand-purple" />
        </div>
        <h3 className="font-semibold text-foreground text-base sm:text-lg">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

// ── Main component ──

// ── Premium rotating text slide component with smooth slide animation ──
function RotatingText({
  messages,
  interval = 3800,
}: {
  messages: string[];
  interval?: number;
}) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, interval);
    return () => clearInterval(timer);
  }, [messages.length, interval]);

  return (
    <div className="relative h-7 overflow-hidden">
      {messages.map((msg, i) => {
        const isActive = i === index;
        const isPrev = i === (index - 1 + messages.length) % messages.length;
        return (
          <div
            key={i}
            className="absolute inset-0 flex items-center gap-2 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{
              opacity: isActive ? 1 : 0,
              transform: isActive
                ? "translateY(0) translateX(0)"
                : isPrev
                  ? "translateY(-100%) translateX(-8px)"
                  : "translateY(100%) translateX(8px)",
            }}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-green shrink-0 animate-pulse" />
            <span className="text-xs sm:text-sm font-medium text-primary-foreground/80 whitespace-nowrap">
              {msg}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Wastage fields that also exist in the shared allowance catalogue. */
const WASTAGE_TO_MATERIAL: Partial<
  Record<keyof WastageConfig, WasteMaterialKey>
> = {
  cement: "cement",
  sand: "sand",
  granite: "granite",
  timber: "timber",
  roofing_sheets: "roofing",
  reinforcement: "steel",
};

export default function BuildToRoofEstimator() {
  const { t } = useLanguage();
  const { market, marketCode } = useMarket();
  const typology = useMemo(
    () => getConstructionTypology(marketCode),
    [marketCode],
  );
  const { symbol: displayCurrencySymbol } = useDisplayCurrency();
  const currencySymbol = displayCurrencySymbol || market.currencySymbol || "₦";
  const seoOfferCurrency = useSeoOfferCurrency();
  useSeo({
    title:
      "Build-to-Roof Estimator, Construction Planning & Budgeting | FRELUX",
    description:
      "Planning and budgeting estimate for building from foundation to roof. Configure dimensions, materials, and prices. Actual requirements and costs may vary based on location, current material prices, building design, site conditions, and professional specifications.",
    keywords:
      "build to roof, construction cost estimator, foundation to roof, building materials calculator, worldwide",
    canonicalPath: "/build-to-roof-estimator",
    structuredDataArray: [
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "Build-to-Roof Construction Cost Estimator",
        url: `${SITE_URL}/build-to-roof-estimator`,
        description:
          "Calculate materials, quantities, and costs for your building from foundation to roof with market-specific price books for your selected market, community-reported prices worldwide, and clearly disclosed assumptions.",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: seoOfferCurrency,
        },
        audience: {
          "@type": "Audience",
          audienceType: "Homeowners, Builders, Contractors",
        },
        // The configured international market registry (countries.ts).
        // areaServed lists configured markets only; verified data depth
        // varies per market and is disclosed per estimate, not here.
        areaServed: APPROVED_MARKET_CODES.map((code) => ({
          "@type": "Country",
          name: code,
        })),
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
            name: "Build-to-Roof Estimator",
            item: `${SITE_URL}/build-to-roof-estimator`,
          },
        ],
      },
    ],
  });

  const [phase, setPhase] = useState<1 | 2 | 3 | 4>(1);
  const [step, setStep] = useState(0);
  const [useStandardRates, setUseStandardRates] = useState(true);
  const [includedStages, setIncludedStages] = useState({
    foundation: true,
    walls: true,
    roof: true,
  });

  const toggleStage = (stage: "foundation" | "walls" | "roof") => {
    setIncludedStages((prev) => {
      const next = { ...prev, [stage]: !prev[stage] };
      setInput((inp) => ({
        ...inp,
        included_stages: next,
      }));
      return next;
    });
  };

  const [result, setResult] = useState<BuildToRoofResult | null>(null);
  const [roofGeometry, setRoofGeometry] = useState<RoofGeometry>(() =>
    createDefaultRoofGeometry(),
  );

  // Wastage here is per material and long predates the shared allowance. The
  // six materials present in both follow the shared store, so a choice made in
  // one calculator holds in the other. Blocks and hardcore have no shared
  // counterpart and stay as this page configures them.
  const { settings: wasteSettings, setMaterialPercent } = useWasteSettings();
  const bridgedWastage = useMemo<WastageConfig>(() => {
    const shared = (key: WasteMaterialKey, fallback: number) =>
      startingWastePercent(wasteSettings, key, fallback);
    return {
      ...DEFAULT_WASTAGE,
      cement: shared("cement", DEFAULT_WASTAGE.cement),
      sand: shared("sand", DEFAULT_WASTAGE.sand),
      granite: shared("granite", DEFAULT_WASTAGE.granite),
      timber: shared("timber", DEFAULT_WASTAGE.timber),
      roofing_sheets: shared("roofing", DEFAULT_WASTAGE.roofing_sheets),
      reinforcement: shared("steel", DEFAULT_WASTAGE.reinforcement),
    };
  }, [wasteSettings]);
  const setWaste = (key: string, raw: string) => {
    const value = parseFloat(raw) || 0;
    update("wastage", { ...input.wastage, [key]: value });
    const material = WASTAGE_TO_MATERIAL[key as keyof WastageConfig];
    if (material) setMaterialPercent(material, value);
  };

  const [input, setInput] = useState<BuildToRoofInput>({
    project_name: "",
    location: "",
    building_type: "bungalow",
    number_of_floors: 1,
    measurement_unit: "m",
    building_length: 15,
    building_width: 10,
    floor_to_floor_height: 3,
    wall_thickness: 0.225,
    internal_wall_length: 25,
    internal_wall_thickness: 0.15,
    openings: [
      { type: "door", width: 0.9, height: 2.1, count: 4 },
      { type: "window", width: 1.2, height: 1.2, count: 6 },
    ],
    foundation_type: "strip_footing",
    foundation_depth: 0.9,
    foundation_width: 0.675,
    footing_thickness: 0.225,
    blinding_thickness: 0.075,
    hardcore_thickness: 0.15,
    dpc_length: 50,
    block_size: "9inch",
    block_length: 18, // inches (450mm ≈ 18")
    block_height: 9, // inches (225mm ≈ 9")
    block_width: 9, // inches (225mm ≈ 9")
    concrete_mix_cement: 1,
    concrete_mix_sand: 2,
    concrete_mix_granite: 4,
    mortar_mix_cement: 1,
    mortar_mix_sand: 6,
    roof_type: "gable",
    roof_pitch_degrees: 25,
    roof_overhang: 0.6,
    roofing_material: "long_span_aluminium",
    structural_members: [],
    has_engineer_schedule: false,
    wastage: bridgedWastage,
    prices: DEFAULT_PRICES,
    labour: DEFAULT_LABOUR,
    contingency_percent: 5,
    included_stages: {
      foundation: true,
      walls: true,
      roof: true,
    },
  });

  // Draft persistence and recovery hook
  const {
    isRestored,
    hasSavedDraft,
    lastSavedAt,
    clearDraft,
    dismissRestored,
  } = useEstimatorDraft<BuildToRoofInput>("build_to_roof", input, {
    onRestore: (saved) => {
      setInput(saved);
      if (saved.included_stages) {
        setIncludedStages({
          foundation: saved.included_stages.foundation !== false,
          walls: saved.included_stages.walls !== false,
          roof: saved.included_stages.roof !== false,
        });
      }
    },
    showToast: true,
    customToastTitle: "Calculation restored",
    customToastMessage:
      "We restored your previous calculation. Click 'Start fresh' to reset.",
  });

  // Market price book prefill (non-NG only): cement onto the 50 kg bag
  // basis, sand as a real bulk m3 price, and rebar by diameter. Missing books keep the NG default.
  const [marketCementNote, setMarketCementNote] = useState<string | null>(null);
  const [marketRebarNote, setMarketRebarNote] = useState<string | null>(null);
  // Price keys with no market book value and no user-entered local price.
  // Owner-approved behavior (2026-10-24): never carry Nigerian defaults into
  // another market's estimate; unpriced items show "enter your local price".
  const [missingLocalPrices, setMissingLocalPrices] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (marketCode === "NG") {
        setMarketCementNote(null);
        setMarketRebarNote(null);
        return;
      }
      const [cement, sandM3, rebar] = await Promise.all([
        resolveMarketCement(marketCode),
        resolveMarketSandM3(marketCode),
        resolveMarketRebar(marketCode),
      ]);
      if (!alive) return;

      const rebarOverrides: Partial<BuildToRoofInput["prices"]> = {};
      if (rebar.overrides["rebar-12mm-per-length"] != null) {
        rebarOverrides.rebar_12mm_per_length =
          rebar.overrides["rebar-12mm-per-length"];
      }
      if (rebar.overrides["rebar-16mm-per-length"] != null) {
        rebarOverrides.rebar_16mm_per_length =
          rebar.overrides["rebar-16mm-per-length"];
      }
      if (rebar.overrides["rebar-20mm-per-length"] != null) {
        rebarOverrides.rebar_20mm_per_length =
          rebar.overrides["rebar-20mm-per-length"];
      }
      if (rebar.overrides["rebar-25mm-per-length"] != null) {
        rebarOverrides.rebar_25mm_per_length =
          rebar.overrides["rebar-25mm-per-length"];
      }

      // Resolved keys are prefilled from the market's own price book.
      // Unresolved keys are reset (never Nigerian defaults) and marked
      // "enter your local price" per the owner-approved behavior.
      const resolvedKeys = new Set<string>([
        ...(cement ? ["cement_per_bag"] : []),
        ...(sandM3 != null ? ["sand_per_m3"] : []),
        ...Object.keys(rebarOverrides),
      ]);
      const REBAR_KEYS = [
        "rebar_12mm_per_length",
        "rebar_16mm_per_length",
        "rebar_20mm_per_length",
        "rebar_25mm_per_length",
      ];
      // Every material price field that the market's own book did not
      // resolve. No Nigerian default is carried into another market's
      // estimate (owner-approved 2026-10-24); these require a local
      // price. Keys the user already entered are preserved.
      const ALL_PRICE_KEYS = Object.keys(DEFAULT_PRICES).filter(
        (k) =>
          typeof DEFAULT_PRICES[k as keyof typeof DEFAULT_PRICES] === "number",
      );
      const unresolved = ALL_PRICE_KEYS.filter((k) => !resolvedKeys.has(k));
      const missing = unresolved;
      setInput((prev) => ({
        ...prev,
        prices: {
          ...prev.prices,
          ...(cement
            ? { cement_per_bag: cement.price50kgBasis }
            : { cement_per_bag: 0 }),
          ...(sandM3 != null ? { sand_per_m3: sandM3 } : { sand_per_m3: 0 }),
          ...rebarOverrides,
          ...(Object.fromEntries(unresolved.map((k) => [k, 0])) as Partial<
            BuildToRoofInput["prices"]
          >),
        },
      }));
      setMissingLocalPrices(missing);
      setMarketCementNote(
        cement
          ? `Cement prefilled from the ${marketCode} price book: ${cement.materialName} at ${cement.bookPrice} per ${cement.packKg} kg pack, converted to the 50 kg bag basis.`
          : `No verified cement price in the ${marketCode} book. Enter your local price in the Prices step; no default is assumed.`,
      );
      const rebarResolvedCount = Object.keys(rebarOverrides).length;
      if (rebarResolvedCount > 0) {
        setMarketRebarNote(
          `Rebar prefilled from the ${marketCode} price book (${rebarResolvedCount}/4 diameters resolved per 12 m length).${
            rebar.unresolved.length > 0
              ? ` Unresolved diameters (${rebar.unresolved.join(", ")}) require your local price in the Prices step.`
              : ""
          }`,
        );
      } else {
        setMarketRebarNote(
          `No verified rebar prices in the ${marketCode} book. Enter your local prices in the Prices step; no defaults are assumed.`,
        );
      }
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, [marketCode]);

  const update = useCallback(
    <K extends keyof BuildToRoofInput>(key: K, value: BuildToRoofInput[K]) => {
      setInput((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // ── AI extraction: apply user-confirmed values into the existing manual
  // input state. The deterministic engine is untouched, this only fills the
  // same fields the user would have typed by hand. Manual editing in the
  // following steps remains fully available.
  const [extractionApplied, setExtractionApplied] = useState(0);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const applyExtractionPatch = useCallback(
    (
      patch: Partial<BuildToRoofInput>,
      meta: { appliedCount: number; fileName?: string },
    ) => {
      setInput((prev) => {
        // AI-extracted dimensions are validated in METRES (mirrors the
        // server clamps). If the form is in feet, convert them so the
        // engine's own ft→m pass doesn't shrink them by 3.28×.
        let normalized = patch;
        if (prev.measurement_unit === "ft") {
          const factor = 1 / 0.3048;
          normalized = {
            ...patch,
            building_length:
              patch.building_length !== undefined
                ? patch.building_length * factor
                : undefined,
            building_width:
              patch.building_width !== undefined
                ? patch.building_width * factor
                : undefined,
            floor_to_floor_height:
              patch.floor_to_floor_height !== undefined
                ? patch.floor_to_floor_height * factor
                : undefined,
            wall_thickness:
              patch.wall_thickness !== undefined
                ? patch.wall_thickness * factor
                : undefined,
            internal_wall_length:
              patch.internal_wall_length !== undefined
                ? patch.internal_wall_length * factor
                : undefined,
            roof_overhang:
              patch.roof_overhang !== undefined
                ? patch.roof_overhang * factor
                : undefined,
            openings: patch.openings?.map((o) => ({
              ...o,
              width: o.width * factor,
              height: o.height * factor,
            })),
          };
        }
        return { ...prev, ...normalized };
      });
      setExtractionApplied(meta.appliedCount);
    },
    [],
  );

  const calculate = useCallback(() => {
    const fullInput: BuildToRoofInput = {
      ...input,
      included_stages: includedStages,
    };
    const errors = validateBuildToRoofInput(fullInput);
    if (errors.length > 0) {
      setValidationErrors(errors);
      setResult(null);
      return;
    }
    setValidationErrors([]);
    const r = monitoredCalc("Build-to-Roof Estimator", () =>
      calculateBuildToRoof(fullInput),
    );
    setResult(r);
    setPhase(4);
    setStep(STEPS.length - 1);
    trackBuildToRoofRewards();
  }, [input, includedStages]);

  const next = () => step < STEPS.length - 1 && setStep(step + 1);
  const prev = () => step > 0 && setStep(step - 1);

  // ── Step rendering ──

  const canProceed = useMemo(() => {
    if (step === 0) return input.project_name.length > 0;
    return true;
  }, [step, input.project_name]);

  return (
    <SubscriptionGate feature="build_to_roof_estimator">
      <div className="min-h-screen bg-gradient-to-b from-muted/50 to-muted/50">
        <MarketScopeNotice />
        {/* Premium Header with mesh gradient */}
        <div className="relative overflow-hidden bg-brand-navy text-primary-foreground">
          {/* Animated mesh background */}
          <div
            className="absolute inset-0 animate-mesh-float"
            style={{
              background: `radial-gradient(at 15% 20%, rgba(109, 40, 217, 0.28) 0px, transparent 50%), radial-gradient(at 85% 80%, rgba(34, 197, 94, 0.15) 0px, transparent 50%), radial-gradient(at 50% 50%, rgba(109, 40, 217, 0.1) 0px, transparent 50%)`,
            }}
          />
          <div className="absolute inset-0 animate-premium-shimmer" />
          {/* Grid overlay for premium texture */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            }}
          />

          <div className="relative max-w-6xl mx-auto px-4 py-10 sm:py-14">
            <div className="flex items-center gap-3 sm:gap-4 mb-2">
              <div className="flex h-11 w-11 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 ring-1 ring-brand-purple/30 backdrop-blur-sm">
                <Building2
                  aria-hidden="true"
                  className="w-6 h-6 sm:w-8 sm:h-8 text-accent-green"
                />
              </div>
              <div className="min-w-0 flex-1">
                <HeroTitle
                  className="text-xl text-foreground dark:text-primary-foreground sm:text-3xl md:text-4xl"
                  title={t("Build-to-Roof Estimator")}
                />
                <div className="mt-1.5">
                  <RotatingText
                    messages={[
                      "Foundation → Block walls → Structural frame → Roof, all in one estimate",
                      "verified prices for cement, blocks, sand, granite & more",
                      "Engineer-ready material schedules with quantities and costs",
                      "11 guided steps · Full transparency · No hidden assumptions",
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* Feature badges row */}
            <div className="mt-5 flex flex-wrap items-center gap-2 sm:gap-2.5">
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium text-primary-foreground/80 backdrop-blur-md animate-badge-pop-in"
                style={{ animationDelay: "0.1s" }}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-accent-green" />
                <span className="hidden sm:inline">
                  {t("Foundation to Roof")}
                </span>
                <span className="sm:hidden">F→R</span>
              </span>
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium text-primary-foreground/80 backdrop-blur-md animate-badge-pop-in"
                style={{ animationDelay: "0.2s" }}
              >
                <BadgeCheck className="w-3.5 h-3.5 text-accent-green" />
                <span className="hidden sm:inline">
                  {t("Transparent Pricing")}
                </span>
                <span className="sm:hidden">{t("Pricing")}</span>
              </span>
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium text-primary-foreground/80 backdrop-blur-md animate-badge-pop-in"
                style={{ animationDelay: "0.3s" }}
              >
                <Gem className="w-3.5 h-3.5 text-brand-purple-light" />
                <span className="hidden sm:inline">
                  11-Step Professional Flow
                </span>
                <span className="sm:hidden">11-Step</span>
              </span>
            </div>

            <Link
              to="/image-estimator/"
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-accent-green/30 bg-accent-green/10 px-3.5 sm:px-4 py-2.5 text-sm font-semibold text-accent-green backdrop-blur-md transition-all hover:bg-accent-green/20 hover:border-accent-green/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">
                {t("Estimate from a Photo, Try our AI Photo Estimator")}
              </span>
              <span className="sm:hidden">{t("Try AI Photo Estimator")}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Premium sticky 4-Phase progress bar with direct jump */}
        <div className="sticky top-16 z-30 border-b border-border bg-background/95 backdrop-blur-lg shadow-sm">
          <div className="max-w-6xl mx-auto px-3 sm:px-4">
            <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 sm:py-3 scrollbar-hide snap-x">
              {PHASES.map((p) => {
                const Icon = p.icon;
                const isActive = p.id === phase;
                const isDone = p.id < phase;
                return (
                  <Button
                    variant="ghost"
                    key={p.id}
                    onClick={() => {
                      if (p.id === 4) {
                        calculate();
                      } else {
                        setPhase(p.id as 1 | 2 | 3 | 4);
                      }
                    }}
                    className={`flex items-center gap-2 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 snap-start ${
                      isActive
                        ? "bg-gradient-to-r from-primary to-primary-light text-primary-foreground shadow-md shadow-brand-purple/20 scale-[1.02]"
                        : isDone
                          ? "bg-primary/10 text-brand-purple hover:bg-primary/15"
                          : "text-muted-foreground hover:bg-muted/60"
                    }`}
                  >
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                        isActive
                          ? "bg-primary-foreground text-primary"
                          : isDone
                            ? "bg-brand-purple text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isDone ? <Check className="w-3 h-3 stroke-[3]" /> : p.id}
                    </div>
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="hidden md:inline">{p.title}</span>
                    <span className="md:hidden">{p.shortTitle}</span>
                  </Button>
                );
              })}
            </div>

            {/* Progress line with glow */}
            <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent-green transition-all duration-500 ease-out animate-progress-glow rounded-full"
                style={{ width: `${(phase / 4) * 100}%` }}
              />
            </div>

            {/* Draft status & quick actions */}
            <div className="flex items-center justify-between text-xs text-muted-foreground py-1.5 px-0.5">
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-medium text-foreground/80">
                  {hasSavedDraft
                    ? "Draft saved locally"
                    : "Auto-saving draft..."}
                </span>
                {lastSavedAt && (
                  <span className="text-[11px] text-muted-foreground/70 hidden sm:inline">
                    (last saved{" "}
                    {new Date(lastSavedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    )
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      "Start fresh? This will reset all current specifications.",
                    )
                  ) {
                    clearDraft();
                    setInput({
                      project_name: "",
                      location: "",
                      building_type: "bungalow",
                      number_of_floors: 1,
                      measurement_unit: "m",
                      building_length: 15,
                      building_width: 10,
                      floor_to_floor_height: 3,
                      wall_thickness: 0.225,
                      internal_wall_length: 25,
                      internal_wall_thickness: 0.15,
                      openings: [
                        { type: "door", width: 0.9, height: 2.1, count: 4 },
                        { type: "window", width: 1.2, height: 1.2, count: 6 },
                      ],
                      foundation_type: "strip_footing",
                      foundation_depth: 0.9,
                      foundation_width: 0.675,
                      footing_thickness: 0.225,
                      blinding_thickness: 0.075,
                      hardcore_thickness: 0.15,
                      dpc_length: 50,
                      block_size: "9inch",
                      block_length: 18,
                      block_height: 9,
                      block_width: 9,
                      concrete_mix_cement: 1,
                      concrete_mix_sand: 2,
                      concrete_mix_granite: 4,
                      mortar_mix_cement: 1,
                      mortar_mix_sand: 6,
                      roof_type: "gable",
                      roof_pitch_degrees: 25,
                      roof_overhang: 0.6,
                      roofing_material: "long_span_aluminium",
                      structural_members: [],
                      has_engineer_schedule: false,
                      wastage: bridgedWastage,
                      prices: DEFAULT_PRICES,
                      labour: DEFAULT_LABOUR,
                      contingency_percent: 5,
                      included_stages: {
                        foundation: true,
                        walls: true,
                        roof: true,
                      },
                    });
                    setIncludedStages({
                      foundation: true,
                      walls: true,
                      roof: true,
                    });
                    setResult(null);
                    setPhase(1);
                  }
                }}
                className="text-[11px] font-medium text-muted-foreground hover:text-brand-purple hover:underline"
              >
                {t("Start fresh")}
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
          {/* Restored draft banner */}
          {isRestored && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-xs sm:text-sm text-foreground shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{t("We restored your previous calculation draft.")}</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    clearDraft();
                    setResult(null);
                    setPhase(1);
                  }}
                  className="font-semibold text-brand-purple hover:underline"
                >
                  {t("Start fresh")}
                </button>
                <button
                  type="button"
                  onClick={dismissRestored}
                  className="text-muted-foreground hover:text-foreground text-xs"
                >
                  {t("Dismiss")}
                </button>
              </div>
            </div>
          )}

          {/* Phase content */}
          {result && phase === 4 ? (
            <EstimateResult
              result={result}
              missingLocalPrices={missingLocalPrices}
              onBack={() => {
                setResult(null);
                setPhase(3);
              }}
            />
          ) : (
            <>
              <div key={phase} className="animate-step-slide-in space-y-6">
                {/* Phase 1: Building Footprint & Envelope */}
                {phase === 1 && (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <SectionCard title={t("Project Information")} icon={Home}>
                        <div className="grid md:grid-cols-2 gap-4">
                          {/* Regional Construction Typology banner */}
                          <div
                            className="md:col-span-2 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm"
                            data-testid="regional-construction-typology"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-semibold text-foreground">
                                Regional Structural Typology: {typology.name}
                              </p>
                              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                {typology.applicableStandards}
                              </span>
                            </div>
                            <div className="mt-2.5 grid gap-2 sm:grid-cols-2 text-xs text-muted-foreground">
                              <div>
                                <span className="font-medium text-foreground">
                                  Structural System:
                                </span>{" "}
                                {typology.primaryStructuralSystem}
                              </div>
                              <div>
                                <span className="font-medium text-foreground">
                                  Wall Assembly:
                                </span>{" "}
                                {typology.wallTypology}
                              </div>
                              <div>
                                <span className="font-medium text-foreground">
                                  Foundation Typology:
                                </span>{" "}
                                {typology.foundationTypology}
                              </div>
                              <div>
                                <span className="font-medium text-foreground">
                                  Roof System:
                                </span>{" "}
                                {typology.roofTypology}
                              </div>
                            </div>
                            <p className="mt-2.5 text-xs italic text-muted-foreground">
                              {typology.disclaimer}
                            </p>
                          </div>
                          <Field
                            label="Project name"
                            type="text"
                            value={input.project_name}
                            onChange={(v) => update("project_name", v)}
                            placeholder="e.g. 3-Bedroom Bungalow"
                          />
                          <Field
                            label="Location"
                            type="text"
                            value={input.location}
                            onChange={(v) => update("location", v)}
                            placeholder="e.g. Your City"
                          />
                          <SelectField
                            label="Building type"
                            value={input.building_type}
                            onChange={(v) =>
                              update("building_type", v as BuildingType)
                            }
                            options={BUILDING_TYPES}
                          />
                          <Field
                            label="Number of floors"
                            type="number"
                            value={input.number_of_floors}
                            onChange={(v) =>
                              update("number_of_floors", parseInt(v) || 1)
                            }
                          />
                        </div>
                      </SectionCard>
                    </div>
                    <SectionCard title={t("Building Dimensions")} icon={Ruler}>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-sm font-medium text-muted-foreground">
                          Measurement unit:
                        </span>
                        <div className="inline-flex rounded-lg border border-border overflow-hidden">
                          <Button
                            variant="ghost"
                            onClick={() => {
                              if (input.measurement_unit === "ft") {
                                // Convert EVERY ft-mappable field to m, the
                                // engine reads all of them in the active unit.
                                setInput((prev) => ({
                                  ...convertBuildToRoofUnits(prev, 0.3048),
                                  measurement_unit: "m" as const,
                                }));
                              }
                            }}
                            className={`px-3 py-1.5 text-sm font-medium ${input.measurement_unit === "m" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"}`}
                          >
                            {t("Meters (m)")}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              if (input.measurement_unit === "m") {
                                // Convert EVERY ft-mappable field to ft, the
                                // engine reads all of them in the active unit.
                                setInput((prev) => ({
                                  ...convertBuildToRoofUnits(prev, 1 / 0.3048),
                                  measurement_unit: "ft" as const,
                                }));
                              }
                            }}
                            className={`px-3 py-1.5 text-sm font-medium ${input.measurement_unit === "ft" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"}`}
                          >
                            {t("Feet (ft)")}
                          </Button>
                        </div>
                      </div>
                      <div className="grid md:grid-cols-3 gap-4">
                        <Field
                          label="Building length"
                          unit={input.measurement_unit}
                          value={input.building_length}
                          onChange={(v) =>
                            update("building_length", parseFloat(v) || 0)
                          }
                          step="0.1"
                        />
                        <Field
                          label="Building width"
                          unit={input.measurement_unit}
                          value={input.building_width}
                          onChange={(v) =>
                            update("building_width", parseFloat(v) || 0)
                          }
                          step="0.1"
                        />
                        <Field
                          label="Floor-to-floor height"
                          unit={input.measurement_unit}
                          value={input.floor_to_floor_height}
                          onChange={(v) =>
                            update("floor_to_floor_height", parseFloat(v) || 0)
                          }
                          step="0.1"
                        />
                        <Field
                          label="External wall thickness"
                          unit={input.measurement_unit}
                          value={input.wall_thickness}
                          onChange={(v) =>
                            update("wall_thickness", parseFloat(v) || 0)
                          }
                          step="0.025"
                        />
                        <Field
                          label="Internal wall total length"
                          unit={input.measurement_unit}
                          value={input.internal_wall_length}
                          onChange={(v) =>
                            update("internal_wall_length", parseFloat(v) || 0)
                          }
                          step="0.5"
                        />
                        <Field
                          label="Internal wall thickness"
                          unit={input.measurement_unit}
                          value={input.internal_wall_thickness}
                          onChange={(v) =>
                            update(
                              "internal_wall_thickness",
                              parseFloat(v) || 0,
                            )
                          }
                          step="0.025"
                        />
                      </div>
                      <div className="mt-4 rounded-xl bg-blue-50 border border-blue-100 p-3 sm:p-4 flex items-start gap-2">
                        <Info
                          aria-hidden="true"
                          className="w-4 h-4 text-blue-500 mt-0.5 shrink-0"
                        />
                        <p className="text-xs text-blue-700">
                          Enter the total length of all internal partition walls
                          combined. This is used for block and mortar
                          calculations.
                        </p>
                      </div>
                    </SectionCard>
                    <SectionCard
                      title={t("Door & Window Openings")}
                      icon={FolderOpen}
                    >
                      <p className="text-sm text-muted-foreground mb-4">
                        Openings are used only as wall deductions. Door/window
                        purchase and installation costs are NOT included in the
                        Build-to-Roof total.
                      </p>
                      <div className="space-y-3">
                        {input.openings.map((opening, i) => (
                          <div
                            key={i}
                            className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3 items-end p-3 rounded-xl bg-muted/50 border border-border/50"
                          >
                            <div>
                              <label
                                htmlFor={`opening-type-${i}`}
                                className="text-xs font-medium text-muted-foreground mb-1 block"
                              >
                                {t("Type")}
                              </label>
                              <select
                                id={`opening-type-${i}`}
                                aria-label={`Opening ${i + 1} type`}
                                value={opening.type}
                                onChange={(e) => {
                                  const openings = [...input.openings];
                                  openings[i] = {
                                    ...opening,
                                    type: e.target.value as "door" | "window",
                                  };
                                  update("openings", openings);
                                }}
                                className="w-full rounded-lg border border-border px-2.5 py-2 text-sm"
                              >
                                <option value="door">{t("Door")}</option>
                                <option value="window">{t("Window")}</option>
                              </select>
                            </div>
                            <Field
                              label={`Width (${input.measurement_unit})`}
                              value={opening.width}
                              onChange={(v) => {
                                const openings = [...input.openings];
                                openings[i] = {
                                  ...opening,
                                  width: parseFloat(v) || 0,
                                };
                                update("openings", openings);
                              }}
                              step="0.1"
                            />
                            <Field
                              label={`Height (${input.measurement_unit})`}
                              value={opening.height}
                              onChange={(v) => {
                                const openings = [...input.openings];
                                openings[i] = {
                                  ...opening,
                                  height: parseFloat(v) || 0,
                                };
                                update("openings", openings);
                              }}
                              step="0.1"
                            />
                            <Field
                              label="Count"
                              value={opening.count}
                              onChange={(v) => {
                                const openings = [...input.openings];
                                openings[i] = {
                                  ...opening,
                                  count: parseInt(v) || 0,
                                };
                                update("openings", openings);
                              }}
                            />
                            <Button
                              variant="ghost"
                              onClick={() =>
                                update(
                                  "openings",
                                  input.openings.filter((_, idx) => idx !== i),
                                )
                              }
                              className="text-sm text-red-500 hover:text-red-700 font-medium"
                            >
                              {t("Remove")}
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="ghost"
                          onClick={() =>
                            update("openings", [
                              ...input.openings,
                              {
                                type: "window",
                                width: 1.2,
                                height: 1.2,
                                count: 1,
                              },
                            ])
                          }
                          className="text-sm text-brand-purple hover:text-brand-purple-dark font-medium flex items-center gap-1"
                        >
                          + Add opening
                        </Button>
                      </div>
                    </SectionCard>
                    <SectionCard
                      title={t("Upload Architectural Drawing (Optional)")}
                      icon={Upload}
                    >
                      <ConstructionExtractionPanel
                        currentOpenings={input.openings}
                        onApply={applyExtractionPatch}
                      />
                      {extractionApplied > 0 && (
                        <div className="mt-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 p-3 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span className="text-sm text-emerald-700 dark:text-emerald-300">
                            {extractionApplied} confirmed value
                            {extractionApplied === 1 ? "" : "s"} added to your
                            estimate. Review and adjust them in the next steps,
                            or calculate now.
                          </span>
                        </div>
                      )}
                    </SectionCard>
                  </div>
                )}

                {/* Phase 2: Assemblies (Modular / Toggleable) */}
                {phase === 2 && (
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                        <div>
                          <h3 className="text-base sm:text-lg font-bold text-foreground">
                            {t("Modular Assemblies Configuration")}
                          </h3>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                            Include or skip specific building stages. You can
                            customize which assemblies to quantify (e.g. Roof
                            only, Foundation only, or Full Build).
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center rounded-md bg-brand-purple/10 px-2.5 py-1 text-xs font-semibold text-brand-purple">
                            {
                              [
                                includedStages.foundation,
                                includedStages.walls,
                                includedStages.roof,
                              ].filter(Boolean).length
                            }{" "}
                            of 3 Assemblies Active
                          </span>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        {/* Foundation toggle */}
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleStage("foundation")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              toggleStage("foundation");
                            }
                          }}
                          className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                            includedStages.foundation
                              ? "border-brand-purple/50 bg-brand-purple/5 shadow-xs"
                              : "border-border/60 bg-muted/20 opacity-60 hover:opacity-80"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Layers
                                className={`w-4 h-4 ${
                                  includedStages.foundation
                                    ? "text-brand-purple"
                                    : "text-muted-foreground"
                                }`}
                              />
                              <span className="text-sm font-bold text-foreground">
                                {t("Foundation")}
                              </span>
                            </div>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                includedStages.foundation
                                  ? "bg-brand-purple text-primary-foreground"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {includedStages.foundation
                                ? "Included"
                                : "Skipped"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Excavation, footing concrete, blinding, hardcore
                            fill & DPC.
                          </p>
                        </div>

                        {/* Walls toggle */}
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleStage("walls")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              toggleStage("walls");
                            }
                          }}
                          className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                            includedStages.walls
                              ? "border-brand-purple/50 bg-brand-purple/5 shadow-xs"
                              : "border-border/60 bg-muted/20 opacity-60 hover:opacity-80"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Settings
                                className={`w-4 h-4 ${
                                  includedStages.walls
                                    ? "text-brand-purple"
                                    : "text-muted-foreground"
                                }`}
                              />
                              <span className="text-sm font-bold text-foreground">
                                {t("Superstructure Walls")}
                              </span>
                            </div>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                includedStages.walls
                                  ? "bg-brand-purple text-primary-foreground"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {includedStages.walls ? "Included" : "Skipped"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            External & internal blockwork, mortar joints,
                            lintels & window deductions.
                          </p>
                        </div>

                        {/* Roof toggle */}
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleStage("roof")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              toggleStage("roof");
                            }
                          }}
                          className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                            includedStages.roof
                              ? "border-brand-purple/50 bg-brand-purple/5 shadow-xs"
                              : "border-border/60 bg-muted/20 opacity-60 hover:opacity-80"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Building2
                                className={`w-4 h-4 ${
                                  includedStages.roof
                                    ? "text-brand-purple"
                                    : "text-muted-foreground"
                                }`}
                              />
                              <span className="text-sm font-bold text-foreground">
                                {t("Roofing & Trusses")}
                              </span>
                            </div>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                includedStages.roof
                                  ? "bg-brand-purple text-primary-foreground"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {includedStages.roof ? "Included" : "Skipped"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Timber trusses, rafters, purlins, facial boards &
                            covering sheets.
                          </p>
                        </div>
                      </div>
                    </div>

                    {includedStages.foundation ? (
                      <SectionCard
                        title={t("Foundation Details")}
                        icon={Layers}
                      >
                        <div className="grid md:grid-cols-3 gap-4">
                          <SelectField
                            label="Foundation type"
                            value={input.foundation_type}
                            onChange={(v) =>
                              update("foundation_type", v as FoundationType)
                            }
                            options={FOUNDATION_TYPES}
                          />
                          {input.foundation_type !== "strip_footing" && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
                              Quantities are modelled on continuous
                              strip-footing geometry. For pad, raft or pile
                              foundations, treat the excavation, concrete and
                              blockwork figures as strip-footing equivalents,
                              verify with your engineer.
                            </p>
                          )}
                          <Field
                            label="Foundation depth"
                            unit={input.measurement_unit}
                            value={input.foundation_depth}
                            onChange={(v) =>
                              update("foundation_depth", parseFloat(v) || 0)
                            }
                            step="0.1"
                          />
                          <Field
                            label="Foundation width"
                            unit={input.measurement_unit}
                            value={input.foundation_width}
                            onChange={(v) =>
                              update("foundation_width", parseFloat(v) || 0)
                            }
                            step="0.025"
                          />
                          <Field
                            label="Footing thickness"
                            unit={input.measurement_unit}
                            value={input.footing_thickness}
                            onChange={(v) =>
                              update("footing_thickness", parseFloat(v) || 0)
                            }
                            step="0.025"
                          />
                          <Field
                            label="Blinding thickness"
                            unit={input.measurement_unit}
                            value={input.blinding_thickness}
                            onChange={(v) =>
                              update("blinding_thickness", parseFloat(v) || 0)
                            }
                            step="0.025"
                          />
                          <Field
                            label="Hardcore thickness"
                            unit={input.measurement_unit}
                            value={input.hardcore_thickness}
                            onChange={(v) =>
                              update("hardcore_thickness", parseFloat(v) || 0)
                            }
                            step="0.025"
                          />
                          <Field
                            label="DPC length"
                            unit={input.measurement_unit}
                            value={input.dpc_length}
                            onChange={(v) =>
                              update("dpc_length", parseFloat(v) || 0)
                            }
                          />
                        </div>
                      </SectionCard>
                    ) : (
                      <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-4 text-xs text-muted-foreground flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-muted-foreground" />
                          <span>
                            Foundation & Substructure is currently excluded from
                            calculation.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleStage("foundation")}
                          className="font-semibold text-brand-purple hover:underline"
                        >
                          {t("Include Foundation")}
                        </button>
                      </div>
                    )}

                    {includedStages.walls ? (
                      <div className="space-y-4">
                        <SectionCard
                          title={t("Block Specification")}
                          icon={Settings}
                        >
                          <div className="col-span-full -mt-2 mb-2 rounded-lg bg-blue-50 border border-blue-100 p-2.5">
                            <p className="text-xs text-blue-600">
                              <strong>
                                Common block sizes in your market:
                              </strong>{" "}
                              9-inch (hollow) , foundations &amp; external
                              load-bearing walls · 6-inch (hollow or solid),
                              internal partitions · 5-inch (solid only),
                              non-load-bearing partitions
                            </p>
                          </div>
                          <div className="grid md:grid-cols-4 gap-4">
                            <SelectField
                              label="Block size"
                              value={input.block_size}
                              onChange={(v) => {
                                const size = v as BlockSize;
                                const dims: Record<
                                  string,
                                  [number, number, number]
                                > = {
                                  "9inch": [18, 9, 9],
                                  "6inch": [18, 9, 6],
                                  "5inch": [18, 9, 5],
                                };
                                const d = dims[v] || [18, 9, 9];
                                setInput((prev) => ({
                                  ...prev,
                                  block_size: size,
                                  block_length: d[0],
                                  block_height: d[1],
                                  block_width: d[2],
                                }));
                              }}
                              options={BLOCK_SIZES}
                            />
                            <Field
                              label="Block length"
                              unit="in"
                              value={input.block_length}
                              onChange={(v) =>
                                update("block_length", parseFloat(v) || 0)
                              }
                            />
                            <Field
                              label="Block height"
                              unit="in"
                              value={input.block_height}
                              onChange={(v) =>
                                update("block_height", parseFloat(v) || 0)
                              }
                            />
                            <Field
                              label="Block width"
                              unit="in"
                              value={input.block_width}
                              onChange={(v) =>
                                update("block_width", parseFloat(v) || 0)
                              }
                            />
                          </div>
                        </SectionCard>
                        <SectionCard
                          title={t("Concrete Mix Ratio")}
                          icon={Settings}
                        >
                          <div className="grid grid-cols-3 gap-4">
                            <Field
                              label="Cement (parts)"
                              value={input.concrete_mix_cement}
                              onChange={(v) =>
                                update(
                                  "concrete_mix_cement",
                                  parseFloat(v) || 1,
                                )
                              }
                            />
                            <Field
                              label="Sand (parts)"
                              value={input.concrete_mix_sand}
                              onChange={(v) =>
                                update("concrete_mix_sand", parseFloat(v) || 1)
                              }
                            />
                            <Field
                              label="Granite (parts)"
                              value={input.concrete_mix_granite}
                              onChange={(v) =>
                                update(
                                  "concrete_mix_granite",
                                  parseFloat(v) || 1,
                                )
                              }
                            />
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Current ratio: {input.concrete_mix_cement}:
                            {input.concrete_mix_sand}:
                            {input.concrete_mix_granite} (assumed budgeting mix,
                            not a structural specification. Use the mix
                            specified by your engineer's design).
                          </p>
                        </SectionCard>
                        <SectionCard
                          title={t("Mortar Mix Ratio")}
                          icon={Settings}
                        >
                          <div className="grid grid-cols-2 gap-4">
                            <Field
                              label="Cement (parts)"
                              value={input.mortar_mix_cement}
                              onChange={(v) =>
                                update("mortar_mix_cement", parseFloat(v) || 1)
                              }
                            />
                            <Field
                              label="Sand (parts)"
                              value={input.mortar_mix_sand}
                              onChange={(v) =>
                                update("mortar_mix_sand", parseFloat(v) || 1)
                              }
                            />
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Current ratio: {input.mortar_mix_cement}:
                            {input.mortar_mix_sand} (assumed budgeting mix,
                            adjust to your site practice or engineer's
                            specification).
                          </p>
                        </SectionCard>
                        <SectionCard
                          title={t("Wastage Allowances")}
                          icon={TrendingUp}
                        >
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Field
                              label="Blocks"
                              unit="%"
                              value={input.wastage.blocks}
                              onChange={(v) => setWaste("blocks", v)}
                            />
                            <Field
                              label="Cement"
                              unit="%"
                              value={input.wastage.cement}
                              onChange={(v) => setWaste("cement", v)}
                            />
                            <Field
                              label="Sand"
                              unit="%"
                              value={input.wastage.sand}
                              onChange={(v) => setWaste("sand", v)}
                            />
                            <Field
                              label="Granite"
                              unit="%"
                              value={input.wastage.granite}
                              onChange={(v) => setWaste("granite", v)}
                            />
                            <Field
                              label="Reinforcement"
                              unit="%"
                              value={input.wastage.reinforcement}
                              onChange={(v) => setWaste("reinforcement", v)}
                            />
                            <Field
                              label="Timber"
                              unit="%"
                              value={input.wastage.timber}
                              onChange={(v) => setWaste("timber", v)}
                            />
                            <Field
                              label="Roofing sheets"
                              unit="%"
                              value={input.wastage.roofing_sheets}
                              onChange={(v) => setWaste("roofing_sheets", v)}
                            />
                            <Field
                              label="Hardcore"
                              unit="%"
                              value={input.wastage.hardcore}
                              onChange={(v) => setWaste("hardcore", v)}
                            />
                          </div>
                        </SectionCard>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-4 text-xs text-muted-foreground flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Settings className="w-4 h-4 text-muted-foreground" />
                          <span>
                            Superstructure Blockwork & Walls are currently
                            excluded from calculation.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleStage("walls")}
                          className="font-semibold text-brand-purple hover:underline"
                        >
                          {t("Include Walls")}
                        </button>
                      </div>
                    )}

                    {includedStages.roof ? (
                      <SectionCard
                        title={t("Roof Configuration")}
                        icon={Building2}
                      >
                        {/* Roof View, optional aerial imagery (Feature 2) */}
                        <div className="mb-4">
                          <RoofViewPanel />
                        </div>
                        {/* Roof Geometry Editor, editable tracing (Feature 3) */}
                        <div className="mb-4">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">
                            {t("Roof Geometry (trace your roof outline)")}
                          </p>
                          <RoofGeometryEditor
                            geometry={roofGeometry}
                            onChange={setRoofGeometry}
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            Traced geometry is a visual reference only,
                            estimates use the dimensions and roof type you enter
                            below. Complex roof geometry (L-shaped, T-shaped,
                            cross-gable, intersecting hips, multiple ridges or
                            valleys) requires manual configuration or future
                            support.
                          </p>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4">
                          <div>
                            <SelectField
                              label="Roof type"
                              value={input.roof_type}
                              onChange={(v) =>
                                update("roof_type", v as RoofType)
                              }
                              options={ROOF_TYPES}
                            />
                            {input.roof_type === "custom" && (
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
                                Custom roofs are estimated with the explicit
                                gable-equivalent model (2 planes, single ridge)
                                at your entered pitch. Verify quantities
                                manually for non-rectangular or multi-ridge
                                roofs.
                              </p>
                            )}
                          </div>
                          <Field
                            label="Roof pitch"
                            unit="°"
                            value={input.roof_pitch_degrees}
                            onChange={(v) =>
                              update("roof_pitch_degrees", parseFloat(v) || 0)
                            }
                          />
                          <Field
                            label="Overhang"
                            unit={input.measurement_unit}
                            value={input.roof_overhang}
                            onChange={(v) =>
                              update("roof_overhang", parseFloat(v) || 0)
                            }
                            step="0.1"
                          />
                          <SelectField
                            label="Roofing material"
                            value={input.roofing_material}
                            onChange={(v) =>
                              update("roofing_material", v as RoofingMaterial)
                            }
                            options={ROOFING_MATERIALS}
                          />
                        </div>
                      </SectionCard>
                    ) : (
                      <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-4 text-xs text-muted-foreground flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <span>
                            Roofing & Trusses are currently excluded from
                            calculation.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleStage("roof")}
                          className="font-semibold text-brand-purple hover:underline"
                        >
                          {t("Include Roof")}
                        </button>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-6">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <h3 className="font-semibold text-amber-900 mb-1">
                              {t("Structural Engineering Safety Boundary")}
                            </h3>
                            <p className="text-sm text-amber-800">
                              FRELUX does NOT design or certify foundation
                              sizes, column sizes, beam sizes, slab thicknesses,
                              or reinforcement. If you have an engineer's
                              structural schedule, enter the verified dimensions
                              below for accurate material quantification.
                              Without an engineer's schedule, structural
                              quantities cannot be reliably determined and are
                              marked as preliminary.
                            </p>
                          </div>
                        </div>
                      </div>
                      <SectionCard
                        title={t("Engineer-Supplied Structural Schedule")}
                        icon={Hammer}
                      >
                        <label className="flex items-center gap-2 mb-4 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={input.has_engineer_schedule}
                            onChange={(e) =>
                              update("has_engineer_schedule", e.target.checked)
                            }
                            className="w-4 h-4 rounded border-border text-brand-purple focus:ring-brand-purple/20"
                          />
                          <span className="text-sm font-medium text-card-foreground">
                            {t(
                              "I have an engineer-supplied structural schedule",
                            )}
                          </span>
                        </label>
                        {input.has_engineer_schedule && (
                          <div className="space-y-3">
                            {input.structural_members.map((member, i) => (
                              <div
                                key={i}
                                className="grid grid-cols-2 md:grid-cols-6 gap-2 sm:gap-3 items-end p-3 rounded-xl bg-muted/50 border border-border/50"
                              >
                                <div>
                                  <label
                                    htmlFor={`member-type-${i}`}
                                    className="text-xs font-medium text-muted-foreground mb-1 block"
                                  >
                                    {t("Type")}
                                  </label>
                                  <select
                                    id={`member-type-${i}`}
                                    aria-label={`Structural member ${i + 1} type`}
                                    value={member.type}
                                    onChange={(e) => {
                                      const members = [
                                        ...input.structural_members,
                                      ];
                                      members[i] = {
                                        ...member,
                                        type: e.target
                                          .value as StructuralMemberInput["type"],
                                      };
                                      update("structural_members", members);
                                    }}
                                    className="w-full rounded-lg border border-border px-2 py-1.5 text-xs"
                                  >
                                    <option value="column">
                                      {t("Column")}
                                    </option>
                                    <option value="ground_beam">
                                      {t("Ground Beam")}
                                    </option>
                                    <option value="suspended_beam">
                                      {t("Suspended Beam")}
                                    </option>
                                    <option value="ring_beam">
                                      {t("Ring Beam")}
                                    </option>
                                    <option value="lintel">
                                      {t("Lintel")}
                                    </option>
                                    <option value="slab">{t("Slab")}</option>
                                    <option value="other">{t("Other")}</option>
                                  </select>
                                </div>
                                <Field
                                  label="Label"
                                  value={member.label}
                                  onChange={(v) => {
                                    const members = [
                                      ...input.structural_members,
                                    ];
                                    members[i] = { ...member, label: v };
                                    update("structural_members", members);
                                  }}
                                  type="text"
                                />
                                <Field
                                  label={`L (${input.measurement_unit})`}
                                  value={member.length}
                                  onChange={(v) => {
                                    const members = [
                                      ...input.structural_members,
                                    ];
                                    members[i] = {
                                      ...member,
                                      length: parseFloat(v) || 0,
                                    };
                                    update("structural_members", members);
                                  }}
                                  step="0.1"
                                />
                                <Field
                                  label={`W (${input.measurement_unit})`}
                                  value={member.width}
                                  onChange={(v) => {
                                    const members = [
                                      ...input.structural_members,
                                    ];
                                    members[i] = {
                                      ...member,
                                      width: parseFloat(v) || 0,
                                    };
                                    update("structural_members", members);
                                  }}
                                  step="0.025"
                                />
                                <Field
                                  label={`D (${input.measurement_unit})`}
                                  value={member.depth}
                                  onChange={(v) => {
                                    const members = [
                                      ...input.structural_members,
                                    ];
                                    members[i] = {
                                      ...member,
                                      depth: parseFloat(v) || 0,
                                    };
                                    update("structural_members", members);
                                  }}
                                  step="0.025"
                                />
                                <Field
                                  label="Qty"
                                  value={member.quantity}
                                  onChange={(v) => {
                                    const members = [
                                      ...input.structural_members,
                                    ];
                                    members[i] = {
                                      ...member,
                                      quantity: parseInt(v) || 1,
                                    };
                                    update("structural_members", members);
                                  }}
                                />
                                <Button
                                  variant="ghost"
                                  onClick={() =>
                                    update(
                                      "structural_members",
                                      input.structural_members.filter(
                                        (_, idx) => idx !== i,
                                      ),
                                    )
                                  }
                                  className="col-span-2 md:col-span-6 text-xs text-red-500 hover:text-red-700 font-medium text-left"
                                >
                                  {t("Remove member")}
                                </Button>
                              </div>
                            ))}
                            <Button
                              variant="ghost"
                              onClick={() =>
                                update("structural_members", [
                                  ...input.structural_members,
                                  {
                                    id: `m${Date.now()}`,
                                    type: "column",
                                    label: "New Member",
                                    length: 3,
                                    width: 0.225,
                                    depth: 0.225,
                                    quantity: 1,
                                  },
                                ])
                              }
                              className="text-sm text-brand-purple hover:text-brand-purple-dark font-medium"
                            >
                              + Add structural member
                            </Button>
                          </div>
                        )}
                        {!input.has_engineer_schedule && (
                          <div className="rounded-lg bg-muted/50 border border-border/50 p-4">
                            <p className="text-sm text-muted-foreground">
                              No engineer's schedule provided. Structural
                              concrete quantities will not be calculated. The
                              estimate will be labeled as{" "}
                              <span className="font-medium text-amber-600">
                                preliminary
                              </span>{" "}
                              for structural items.
                            </p>
                          </div>
                        )}
                      </SectionCard>
                    </div>
                  </div>
                )}

                {/* Phase 3: Material & Labor Rates */}
                {phase === 3 && (
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-base sm:text-lg font-bold text-foreground">
                            {t("Material & Labor Rates Mode")}
                          </h3>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                            Select whether to calculate using verified country
                            market books or your own custom rates.
                          </p>
                        </div>
                        <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1">
                          <button
                            type="button"
                            onClick={() => setUseStandardRates(true)}
                            className={`rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition-all ${
                              useStandardRates
                                ? "bg-brand-purple text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {t("Country Standard Rates")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setUseStandardRates(false)}
                            className={`rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition-all ${
                              !useStandardRates
                                ? "bg-brand-purple text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {t("Custom Contractor Rates")}
                          </button>
                        </div>
                      </div>

                      {useStandardRates ? (
                        <div className="mt-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 p-3.5 text-xs text-emerald-800 dark:text-emerald-200">
                          <div className="flex items-center gap-2 font-semibold">
                            <BadgeCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span>
                              Active: Country Standard Rates for {marketCode}
                            </span>
                          </div>
                          <p className="mt-1 text-emerald-700 dark:text-emerald-300">
                            Rates are synchronized with the national material
                            price book and regional commodity baseline. To
                            modify individual rates, switch to "Custom
                            Contractor Rates".
                          </p>
                        </div>
                      ) : (
                        <div className="mt-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 p-3.5 text-xs text-amber-800 dark:text-amber-200">
                          <div className="flex items-center gap-2 font-semibold">
                            <SlidersHorizontal className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            <span>Active: Custom Contractor Rates</span>
                          </div>
                          <p className="mt-1 text-amber-700 dark:text-amber-300">
                            All material unit costs and artisan day rates below
                            can be adjusted to match your actual site
                            procurement quotes.
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      <SectionCard
                        title={`Material Prices (${currencySymbol})`}
                        icon={DollarSign}
                      >
                        {marketCementNote && (
                          <p
                            className="mb-3 rounded-md border border-border bg-muted/40 p-2 text-xs text-muted-foreground"
                            data-testid="market-cement-note"
                          >
                            {marketCementNote}
                          </p>
                        )}
                        {marketRebarNote && (
                          <p
                            className="mb-3 rounded-md border border-border bg-muted/40 p-2 text-xs text-muted-foreground"
                            data-testid="market-rebar-note"
                          >
                            {marketRebarNote}
                          </p>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <Field
                            label="Cement per bag"
                            unit={currencySymbol}
                            {...priceFieldProps(
                              "cement_per_bag",
                              input.prices,
                              update,
                              missingLocalPrices,
                              setMissingLocalPrices,
                            )}
                          />
                          <Field
                            label="Block per piece"
                            unit={currencySymbol}
                            {...priceFieldProps(
                              "block_per_piece",
                              input.prices,
                              update,
                              missingLocalPrices,
                              setMissingLocalPrices,
                            )}
                          />
                          <Field
                            label="Sand per m³ (ref)"
                            unit={currencySymbol}
                            {...priceFieldProps(
                              "sand_per_m3",
                              input.prices,
                              update,
                              missingLocalPrices,
                              setMissingLocalPrices,
                            )}
                          />
                          <Field
                            label="Sand per trip (3.5m³)"
                            unit={currencySymbol}
                            {...priceFieldProps(
                              "sand_per_trip",
                              input.prices,
                              update,
                              missingLocalPrices,
                              setMissingLocalPrices,
                            )}
                          />
                          <Field
                            label="Granite per m³ (ref)"
                            unit={currencySymbol}
                            {...priceFieldProps(
                              "granite_per_m3",
                              input.prices,
                              update,
                              missingLocalPrices,
                              setMissingLocalPrices,
                            )}
                          />
                          <Field
                            label="Granite per trip (3.5m³)"
                            unit={currencySymbol}
                            {...priceFieldProps(
                              "granite_per_trip",
                              input.prices,
                              update,
                              missingLocalPrices,
                              setMissingLocalPrices,
                            )}
                          />
                          <Field
                            label="Reinforcement per tonne (bulk)"
                            unit={currencySymbol}
                            {...priceFieldProps(
                              "reinforcement_per_tonne",
                              input.prices,
                              update,
                              missingLocalPrices,
                              setMissingLocalPrices,
                            )}
                          />
                          <div className="col-span-2">
                            <p className="text-xs text-muted-foreground mb-1">
                              Rebar prices (per 12m standard length):
                            </p>
                          </div>
                          <Field
                            label="12mm rebar/length"
                            unit={currencySymbol}
                            {...priceFieldProps(
                              "rebar_12mm_per_length",
                              input.prices,
                              update,
                              missingLocalPrices,
                              setMissingLocalPrices,
                            )}
                          />
                          <Field
                            label="16mm rebar/length"
                            unit={currencySymbol}
                            {...priceFieldProps(
                              "rebar_16mm_per_length",
                              input.prices,
                              update,
                              missingLocalPrices,
                              setMissingLocalPrices,
                            )}
                          />
                          <Field
                            label="20mm rebar/length"
                            unit={currencySymbol}
                            {...priceFieldProps(
                              "rebar_20mm_per_length",
                              input.prices,
                              update,
                              missingLocalPrices,
                              setMissingLocalPrices,
                            )}
                          />
                          <Field
                            label="25mm rebar/length"
                            unit={currencySymbol}
                            {...priceFieldProps(
                              "rebar_25mm_per_length",
                              input.prices,
                              update,
                              missingLocalPrices,
                              setMissingLocalPrices,
                            )}
                          />
                          <Field
                            label="Binding wire per kg"
                            unit={currencySymbol}
                            {...priceFieldProps(
                              "binding_wire_per_kg",
                              input.prices,
                              update,
                              missingLocalPrices,
                              setMissingLocalPrices,
                            )}
                          />
                          <Field
                            label="Timber per meter"
                            unit={currencySymbol}
                            {...priceFieldProps(
                              "timber_per_m",
                              input.prices,
                              update,
                              missingLocalPrices,
                              setMissingLocalPrices,
                            )}
                          />
                          <Field
                            label="Roofing sheet per piece"
                            unit={currencySymbol}
                            {...priceFieldProps(
                              "roofing_sheet_per_piece",
                              input.prices,
                              update,
                              missingLocalPrices,
                              setMissingLocalPrices,
                            )}
                          />
                          <Field
                            label="Ridge cap per meter"
                            unit={currencySymbol}
                            {...priceFieldProps(
                              "ridge_cap_per_meter",
                              input.prices,
                              update,
                              missingLocalPrices,
                              setMissingLocalPrices,
                            )}
                          />
                          <Field
                            label="Roofing screws per piece"
                            unit={currencySymbol}
                            {...priceFieldProps(
                              "roofing_screws_per_piece",
                              input.prices,
                              update,
                              missingLocalPrices,
                              setMissingLocalPrices,
                            )}
                          />
                          <Field
                            label="Fascia per meter"
                            unit={currencySymbol}
                            {...priceFieldProps(
                              "fascia_per_meter",
                              input.prices,
                              update,
                              missingLocalPrices,
                              setMissingLocalPrices,
                            )}
                          />
                          <Field
                            label="DPC per meter"
                            unit={currencySymbol}
                            {...priceFieldProps(
                              "dpc_per_meter",
                              input.prices,
                              update,
                              missingLocalPrices,
                              setMissingLocalPrices,
                            )}
                          />
                          <Field
                            label="Formwork per m²"
                            unit={currencySymbol}
                            {...priceFieldProps(
                              "formwork_per_m2",
                              input.prices,
                              update,
                              missingLocalPrices,
                              setMissingLocalPrices,
                            )}
                          />
                          <Field
                            label="Hardcore per m³"
                            unit={currencySymbol}
                            {...priceFieldProps(
                              "hardcore_per_m3",
                              input.prices,
                              update,
                              missingLocalPrices,
                              setMissingLocalPrices,
                            )}
                          />
                          <Field
                            label="DPM per m²"
                            unit={currencySymbol}
                            {...priceFieldProps(
                              "dpm_per_m2",
                              input.prices,
                              update,
                              missingLocalPrices,
                              setMissingLocalPrices,
                            )}
                          />
                          <Field
                            label="Contingency"
                            unit="%"
                            value={input.contingency_percent}
                            onChange={(v) =>
                              update("contingency_percent", parseFloat(v) || 0)
                            }
                          />
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                          <Info aria-hidden="true" className="w-3.5 h-3.5" />
                          <span>
                            Prices are user-configurable and not permanently
                            stored. Update with current local market rates.
                          </span>
                        </div>
                      </SectionCard>
                    </div>
                    <div className="space-y-4">
                      <SectionCard
                        title={`Task-Based Labour Rates (${currencySymbol})`}
                        icon={Users}
                      >
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <Field
                            label="Excavation per m³"
                            unit={currencySymbol}
                            value={input.labour.excavation_per_m3}
                            onChange={(v) =>
                              update("labour", {
                                ...input.labour,
                                excavation_per_m3: parseFloat(v) || 0,
                              })
                            }
                          />
                          <Field
                            label="Blockwork per block"
                            unit={currencySymbol}
                            value={input.labour.blockwork_per_block}
                            onChange={(v) =>
                              update("labour", {
                                ...input.labour,
                                blockwork_per_block: parseFloat(v) || 0,
                              })
                            }
                          />
                          <Field
                            label="Concrete per m³"
                            unit={currencySymbol}
                            value={input.labour.concrete_per_m3}
                            onChange={(v) =>
                              update("labour", {
                                ...input.labour,
                                concrete_per_m3: parseFloat(v) || 0,
                              })
                            }
                          />
                          <Field
                            label="Reinforcement per tonne"
                            unit={currencySymbol}
                            value={input.labour.reinforcement_per_tonne}
                            onChange={(v) =>
                              update("labour", {
                                ...input.labour,
                                reinforcement_per_tonne: parseFloat(v) || 0,
                              })
                            }
                          />
                          <Field
                            label="Formwork per m²"
                            unit={currencySymbol}
                            value={input.labour.formwork_per_m2}
                            onChange={(v) =>
                              update("labour", {
                                ...input.labour,
                                formwork_per_m2: parseFloat(v) || 0,
                              })
                            }
                          />
                          <Field
                            label="Roofing per m²"
                            unit={currencySymbol}
                            value={input.labour.roofing_per_m2}
                            onChange={(v) =>
                              update("labour", {
                                ...input.labour,
                                roofing_per_m2: parseFloat(v) || 0,
                              })
                            }
                          />
                          <Field
                            label="Blinding per m³"
                            unit={currencySymbol}
                            value={input.labour.blinding_per_m3}
                            onChange={(v) =>
                              update("labour", {
                                ...input.labour,
                                blinding_per_m3: parseFloat(v) || 0,
                              })
                            }
                          />
                          <Field
                            label="Hardcore per m³"
                            unit={currencySymbol}
                            value={input.labour.hardcore_per_m3}
                            onChange={(v) =>
                              update("labour", {
                                ...input.labour,
                                hardcore_per_m3: parseFloat(v) || 0,
                              })
                            }
                          />
                          <Field
                            label="Sand filling per m³"
                            unit={currencySymbol}
                            value={input.labour.sand_filling_per_m3}
                            onChange={(v) =>
                              update("labour", {
                                ...input.labour,
                                sand_filling_per_m3: parseFloat(v) || 0,
                              })
                            }
                          />
                          <Field
                            label="Compaction per m³"
                            unit={currencySymbol}
                            value={input.labour.compaction_per_m3}
                            onChange={(v) =>
                              update("labour", {
                                ...input.labour,
                                compaction_per_m3: parseFloat(v) || 0,
                              })
                            }
                          />
                          <Field
                            label="Backfilling per m³"
                            unit={currencySymbol}
                            value={input.labour.backfilling_per_m3}
                            onChange={(v) =>
                              update("labour", {
                                ...input.labour,
                                backfilling_per_m3: parseFloat(v) || 0,
                              })
                            }
                          />
                          <Field
                            label="General labour per day"
                            unit={currencySymbol}
                            value={input.labour.general_labour_per_day}
                            onChange={(v) =>
                              update("labour", {
                                ...input.labour,
                                general_labour_per_day: parseFloat(v) || 0,
                              })
                            }
                          />
                          <Field
                            label="Site prep days"
                            unit="days"
                            value={input.labour.general_labour_days}
                            onChange={(v) =>
                              update("labour", {
                                ...input.labour,
                                general_labour_days: parseFloat(v) || 0,
                              })
                            }
                          />
                        </div>
                      </SectionCard>
                      <SectionCard
                        title={`Role-Based Daily/Contract Rates (${currencySymbol})`}
                        icon={Users}
                      >
                        <div className="col-span-full -mt-2 mb-2 rounded-lg bg-blue-50 border border-blue-100 p-2.5">
                          <p className="text-xs text-blue-600">
                            <strong>Construction labour roles:</strong> Set
                            daily or contract payment rates for each role. These
                            are added to the labour total alongside task-based
                            rates.
                          </p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <Field
                            label="Bricklayer per day"
                            unit={`${currencySymbol}/day`}
                            value={input.labour.bricklayer_per_day}
                            onChange={(v) =>
                              update("labour", {
                                ...input.labour,
                                bricklayer_per_day: parseFloat(v) || 0,
                              })
                            }
                          />
                          <Field
                            label="Bricklayer days"
                            unit="days"
                            value={input.labour.bricklayer_days}
                            onChange={(v) =>
                              update("labour", {
                                ...input.labour,
                                bricklayer_days: parseFloat(v) || 0,
                              })
                            }
                          />
                          <div></div>
                          <Field
                            label="Foreman per day"
                            unit={`${currencySymbol}/day`}
                            value={input.labour.foreman_per_day}
                            onChange={(v) =>
                              update("labour", {
                                ...input.labour,
                                foreman_per_day: parseFloat(v) || 0,
                              })
                            }
                          />
                          <Field
                            label="Foreman days"
                            unit="days"
                            value={input.labour.foreman_days}
                            onChange={(v) =>
                              update("labour", {
                                ...input.labour,
                                foreman_days: parseFloat(v) || 0,
                              })
                            }
                          />
                          <div></div>
                          <Field
                            label="Supervisor per day"
                            unit={`${currencySymbol}/day`}
                            value={input.labour.supervisor_per_day}
                            onChange={(v) =>
                              update("labour", {
                                ...input.labour,
                                supervisor_per_day: parseFloat(v) || 0,
                              })
                            }
                          />
                          <Field
                            label="Supervisor days"
                            unit="days"
                            value={input.labour.supervisor_days}
                            onChange={(v) =>
                              update("labour", {
                                ...input.labour,
                                supervisor_days: parseFloat(v) || 0,
                              })
                            }
                          />
                          <div></div>
                          <Field
                            label="Carpenter per day"
                            unit={`${currencySymbol}/day`}
                            value={input.labour.carpenter_per_day}
                            onChange={(v) =>
                              update("labour", {
                                ...input.labour,
                                carpenter_per_day: parseFloat(v) || 0,
                              })
                            }
                          />
                          <Field
                            label="Carpenter days"
                            unit="days"
                            value={input.labour.carpenter_days}
                            onChange={(v) =>
                              update("labour", {
                                ...input.labour,
                                carpenter_days: parseFloat(v) || 0,
                              })
                            }
                          />
                          <div></div>
                          <Field
                            label="Concrete labourer per day"
                            unit={`${currencySymbol}/day`}
                            value={input.labour.concrete_labourer_per_day}
                            onChange={(v) =>
                              update("labour", {
                                ...input.labour,
                                concrete_labourer_per_day: parseFloat(v) || 0,
                              })
                            }
                          />
                          <Field
                            label="Concrete labourer days"
                            unit="days"
                            value={input.labour.concrete_labourer_days}
                            onChange={(v) =>
                              update("labour", {
                                ...input.labour,
                                concrete_labourer_days: parseFloat(v) || 0,
                              })
                            }
                          />
                          <div></div>
                          <div className="md:col-span-3 border-t border-border/50 pt-4 mt-2">
                            <p className="text-sm font-medium text-card-foreground mb-3">
                              {t("Contractor Payment")}
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              <div>
                                <label
                                  htmlFor="btr-contractor-fee-type"
                                  className="text-sm font-medium text-muted-foreground mb-1 block"
                                >
                                  {t("Payment type")}
                                </label>
                                <select
                                  id="btr-contractor-fee-type"
                                  value={input.labour.contractor_fee_type}
                                  onChange={(e) =>
                                    update("labour", {
                                      ...input.labour,
                                      contractor_fee_type: e.target.value as
                                        "daily" | "contract",
                                    })
                                  }
                                  className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/20 transition-all"
                                >
                                  <option value="contract">
                                    {t("Lump sum (contract)")}
                                  </option>
                                  <option value="daily">
                                    {t("Daily rate")}
                                  </option>
                                </select>
                              </div>
                              {input.labour.contractor_fee_type ===
                              "contract" ? (
                                <Field
                                  label="Contractor fee (lump sum)"
                                  unit={currencySymbol}
                                  value={input.labour.contractor_fee}
                                  onChange={(v) =>
                                    update("labour", {
                                      ...input.labour,
                                      contractor_fee: parseFloat(v) || 0,
                                    })
                                  }
                                />
                              ) : (
                                <>
                                  <Field
                                    label="Contractor per day"
                                    unit={`${currencySymbol}/day`}
                                    value={input.labour.contractor_fee}
                                    onChange={(v) =>
                                      update("labour", {
                                        ...input.labour,
                                        contractor_fee: parseFloat(v) || 0,
                                      })
                                    }
                                  />
                                  <Field
                                    label="Contractor days"
                                    unit="days"
                                    value={input.labour.contractor_days}
                                    onChange={(v) =>
                                      update("labour", {
                                        ...input.labour,
                                        contractor_days: parseFloat(v) || 0,
                                      })
                                    }
                                  />
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 rounded-lg bg-muted/50 border border-border/50 p-3">
                          <p className="text-xs text-muted-foreground">
                            Role-based total: {currencySymbol}
                            {(
                              input.labour.bricklayer_per_day *
                                input.labour.bricklayer_days +
                              input.labour.foreman_per_day *
                                input.labour.foreman_days +
                              input.labour.supervisor_per_day *
                                input.labour.supervisor_days +
                              input.labour.carpenter_per_day *
                                input.labour.carpenter_days +
                              input.labour.concrete_labourer_per_day *
                                input.labour.concrete_labourer_days +
                              (input.labour.contractor_fee_type === "contract"
                                ? input.labour.contractor_fee
                                : input.labour.contractor_fee *
                                  input.labour.contractor_days)
                            ).toLocaleString()}
                          </p>
                        </div>
                      </SectionCard>
                    </div>
                  </div>
                )}

                {/* Phase 4: Summary BOQ & Export */}
                {phase === 4 && !result && (
                  <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 text-center space-y-4">
                    <Calculator className="w-12 h-12 text-brand-purple mx-auto animate-bounce" />
                    <h3 className="text-xl font-bold text-foreground">
                      Ready to generate your Bill of Quantities?
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      We will calculate all quantities, material shopping lists,
                      labour requirements, and costs according to your active
                      assemblies and pricing specifications.
                    </p>
                    {validationErrors.length > 0 && (
                      <div className="mx-auto max-w-md rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-4 text-left">
                        <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-1.5">
                          Please fix these issues before calculating:
                        </p>
                        <ul className="text-xs text-red-600 dark:text-red-400 space-y-1 list-disc list-inside">
                          {validationErrors.map((e) => (
                            <li key={e}>{e}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <Button
                      onClick={calculate}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-green to-green-600 px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-accent-green/20 hover:shadow-xl hover:shadow-accent-green/30"
                    >
                      <Calculator className="w-4 h-4" />
                      <span>{t("Generate Summary BOQ & Estimate")}</span>
                    </Button>
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="relative flex items-center justify-between mt-6 sm:mt-8 pt-4 border-t border-border/50">
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (phase === 4) setPhase(3);
                    else if (phase === 3) setPhase(2);
                    else if (phase === 2) setPhase(1);
                  }}
                  disabled={phase === 1}
                  className="inline-flex items-center gap-1 rounded-xl px-3.5 sm:px-4 py-2.5 text-sm font-medium text-muted-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors active:scale-95"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("Back")}</span>
                </Button>

                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                  <span>Phase {phase} of 4:</span>
                  <span className="font-semibold text-foreground">
                    {PHASES[phase - 1].shortTitle}
                  </span>
                </div>

                {phase < 3 ? (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      if (phase === 1) setPhase(2);
                      else if (phase === 2) setPhase(3);
                    }}
                    disabled={phase === 1 && !canProceed}
                    className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-primary to-primary-light px-4 sm:px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-md shadow-brand-purple/20 disabled:opacity-40 hover:shadow-lg hover:shadow-brand-purple/25 transition-all active:scale-95"
                  >
                    <span className="hidden sm:inline">{t("Next Phase")}</span>
                    <span className="sm:hidden">{t("Next")}</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                ) : phase === 3 ? (
                  <Button
                    variant="ghost"
                    onClick={calculate}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-green to-green-600 px-5 sm:px-6 py-2.5 sm:py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-accent-green/20 hover:shadow-xl hover:shadow-accent-green/30 transition-all active:scale-95"
                  >
                    <Calculator aria-hidden="true" className="w-4 h-4" />
                    <span className="hidden sm:inline">
                      {t("Generate Summary BOQ")}
                    </span>
                    <span className="sm:hidden">{t("Estimate")}</span>
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={() => setPhase(3)}
                    className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    <span>{t("Adjust Specifications")}</span>
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
        <div className="mt-8">
          <RelatedTools
            links={[
              CALC_LINKS.paintCalculator,
              CALC_LINKS.buildToRoof,
              CALC_LINKS.structuralCalc,
              CALC_LINKS.foundationCalc,
              CALC_LINKS.constructionSeq,
              CALC_LINKS.imageEstimator,
            ]}
          />
        </div>

        {/* Planning & Budgeting Disclaimer */}
        <div className="mx-auto max-w-5xl px-4 sm:px-6 mt-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900">
                  {t("Planning & Budgeting Estimate")}
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  This estimate is for planning and budgeting purposes only.
                  Actual requirements and costs may vary depending on location,
                  current material prices, building design, site conditions, and
                  professional specifications. FRELUX does not replace a
                  qualified structural engineer, architect, or quantity
                  surveyor.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SubscriptionGate>
  );
}

// ── Estimate Result Dashboard ──

function EstimateResult({
  result,
  onBack,
  missingLocalPrices = [],
}: {
  result: BuildToRoofResult;
  onBack: () => void;
  missingLocalPrices?: string[];
}) {
  const { t } = useLanguage();
  const confidenceColors: Record<string, string> = {
    high: "bg-green-50 text-green-700 border-green-200",
    moderate: "bg-amber-50 text-amber-700 border-amber-200",
    preliminary: "bg-orange-50 text-orange-700 border-orange-200",
  };

  // Printable professional quote, worldwide-currency formatted.
  const quoteOptions = (): QuoteOptions => {
    const materialLines = result.stages.flatMap((stage) =>
      stage.materials.map((m) => ({
        label: m.label,
        quantity: formatNumber(m.final_quantity),
        unit: m.unit,
        unit_price: "included",
        line_total: formatCurrency(m.total_cost),
        detail: stage.stage_label,
      })),
    );
    const labourLines = result.stages.flatMap((stage) =>
      stage.labour.map((l) => ({
        label: `${l.label} (labour)`,
        quantity: formatNumber(l.quantity),
        unit: "task",
        unit_price: formatCurrency(l.rate),
        line_total: formatCurrency(l.total_cost),
        detail: stage.stage_label,
      })),
    );
    return {
      title: `FRELUX Build-to-Roof Estimate: ${result.project_name}`,
      subtitle: `Generated ${new Date().toLocaleDateString()} · ${result.total_floor_area} m² · ${result.stages.length} construction stages`,
      metaRows: [
        ["Project", result.project_name],
        ["Total floor area", `${result.total_floor_area} m²`],
        ["Construction stage", result.construction_stage],
        ["Confidence", result.confidence],
        ["Market price age", `${result.price_age_days} day(s) old`],
      ],
      lines: [...materialLines, ...labourLines],
      totals: [
        {
          label: "Materials total",
          value: formatCurrency(result.materials_total),
        },
        { label: "Labour total", value: formatCurrency(result.labour_total) },
        {
          label: "Wastage allowance",
          value: formatCurrency(result.wastage_allowance),
        },
        { label: "Contingency", value: formatCurrency(result.contingency) },
        {
          label: "Grand total",
          value: formatCurrency(result.grand_total),
          strong: true,
        },
      ],
      footer:
        "Estimates are indicative and not a formal quote. Quantities include wastage where the takeoff specifies it; costs use the market prices you entered or loaded at estimate time.",
    };
  };

  const exportQuote = () => {
    printQuote(quoteOptions(), "frelux-build-to-roof-estimate.html");
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-step-slide-in">
      {/* Project Summary */}
      <div className="rounded-2xl border border-border bg-card shadow-card p-4 sm:p-6 animate-card-reveal">
        <div className="flex items-start justify-between flex-wrap gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-bold text-foreground truncate">
              {result.project_name}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {result.location} · {formatAreaDual(result.total_floor_area)}{" "}
              total floor area
            </p>
          </div>
          <div
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${confidenceColors[result.confidence]} animate-badge-pop-in`}
          >
            {result.confidence === "high"
              ? "High Confidence"
              : result.confidence === "moderate"
                ? "Moderate Confidence"
                : "Preliminary Estimate"}
          </div>
        </div>
        <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <ArrowRight className="w-3.5 h-3.5 text-accent-green" />
          {result.construction_stage}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {result.confidence_reason}
        </p>
      </div>

      {/* Owner-approved honesty state: items still missing local prices */}
      {missingLocalPrices.length > 0 && (
        <div
          className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 p-4 text-xs text-amber-800 dark:text-amber-200"
          data-testid="missing-local-prices-notice"
        >
          <p className="font-semibold">
            {missingLocalPrices.length} material price
            {missingLocalPrices.length > 1 ? "s" : ""} still need your local
            rate
          </p>
          <p className="mt-1 leading-relaxed">
            No default was assumed for your market. Quantities are complete; the
            total below excludes {missingLocalPrices.length} unpriced item
            {missingLocalPrices.length > 1 ? "s" : ""} until you enter local
            price{missingLocalPrices.length > 1 ? "s" : ""} in the Prices step (
            {missingLocalPrices.slice(0, 6).join(", ")}
            {missingLocalPrices.length > 6 ? ", …" : ""}).
          </p>
        </div>
      )}

      {/* Grand Total */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-border bg-brand-navy p-4 sm:p-6 text-primary-foreground animate-stat-count-in col-span-2 md:col-span-1 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background:
                "radial-gradient(at 70% 30%, rgba(109, 40, 217, 0.4) 0px, transparent 60%)",
            }}
          />
          <div className="relative">
            <p className="text-xs text-primary-foreground/60 mb-1">
              {missingLocalPrices.length > 0
                ? "Estimated Cost (partial - local prices pending)"
                : "Estimated Build-to-Roof Cost"}
            </p>
            <p className="text-xl sm:text-2xl font-bold">
              {formatCurrency(result.grand_total)}
            </p>
          </div>
        </div>
        <div
          className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-card animate-stat-count-in"
          style={{ animationDelay: "0.1s" }}
        >
          <p className="text-xs text-muted-foreground mb-1">{t("Materials")}</p>
          <p className="text-lg sm:text-xl font-bold text-foreground">
            {formatCurrency(result.materials_total)}
          </p>
        </div>
        <div
          className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-card animate-stat-count-in"
          style={{ animationDelay: "0.2s" }}
        >
          <p className="text-xs text-muted-foreground mb-1">{t("Labour")}</p>
          <p className="text-lg sm:text-xl font-bold text-foreground">
            {formatCurrency(result.labour_total)}
          </p>
        </div>
        <div
          className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-card animate-stat-count-in col-span-2 md:col-span-1"
          style={{ animationDelay: "0.3s" }}
        >
          <p className="text-xs text-muted-foreground mb-1">
            {t("Contingency")}
          </p>
          <p className="text-lg sm:text-xl font-bold text-foreground">
            {formatCurrency(result.contingency)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Wastage: {formatCurrency(result.wastage_allowance)}
          </p>
        </div>
      </div>

      {/* Premium Cost Breakdown Table */}
      <div
        className="rounded-2xl border border-border bg-card shadow-card overflow-hidden animate-card-reveal"
        style={{ animationDelay: "0.4s" }}
      >
        <div className="flex items-center justify-between p-6 pb-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <DollarSign className="w-4 h-4 text-brand-purple" />
            </div>
            {t("Cost Breakdown by Stage")}
          </h3>
          <span className="text-xs font-medium text-muted-foreground">
            {result.stages.length} stages
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border/50 bg-muted/50 text-left">
                <th className="px-6 py-3 font-medium text-muted-foreground">
                  {t("Stage")}
                </th>
                <th className="px-6 py-3 font-medium text-muted-foreground text-right">
                  {t("Materials")}
                </th>
                <th className="px-6 py-3 font-medium text-muted-foreground text-right">
                  {t("Labour")}
                </th>
                <th className="px-4 sm:px-6 py-3 font-medium text-muted-foreground text-right">
                  {t("Total")}
                </th>
              </tr>
            </thead>
            <tbody>
              {result.stages.map((stage, i) => (
                <tr
                  key={i}
                  className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                >
                  <td className="px-4 sm:px-6 py-3 font-medium text-foreground">
                    {stage.stage_label}
                  </td>
                  <td className="px-4 sm:px-6 py-3 text-right text-muted-foreground">
                    {formatCurrency(stage.materials_total)}
                  </td>
                  <td className="px-4 sm:px-6 py-3 text-right text-muted-foreground">
                    {formatCurrency(stage.labour_total)}
                  </td>
                  <td className="px-4 sm:px-6 py-3 text-right font-semibold text-foreground">
                    {formatCurrency(stage.stage_total)}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-border bg-muted/50">
                <td className="px-4 sm:px-6 py-3 font-bold text-foreground">
                  {t("TOTAL")}
                </td>
                <td className="px-4 sm:px-6 py-3 text-right font-semibold text-foreground">
                  {formatCurrency(result.materials_total)}
                </td>
                <td className="px-4 sm:px-6 py-3 text-right font-semibold text-foreground">
                  {formatCurrency(result.labour_total)}
                </td>
                <td className="px-6 py-3 text-right font-bold text-brand-purple">
                  {formatCurrency(result.materials_total + result.labour_total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Premium Shopping List */}
      <div
        className="rounded-2xl border border-border bg-card shadow-card overflow-hidden animate-card-reveal"
        style={{ animationDelay: "0.5s" }}
      >
        <div className="flex items-center justify-between p-4 sm:p-6 pb-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Package className="w-4 h-4 text-brand-purple" />
            </div>
            {t("Consolidated Material Shopping List")}
          </h3>
          <span className="text-xs font-medium text-muted-foreground">
            {result.shopping_list.length} items
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border/50 bg-muted/50 text-left">
                <th className="px-4 sm:px-6 py-3 font-medium text-muted-foreground">
                  {t("Material")}
                </th>
                <th className="px-6 py-3 font-medium text-muted-foreground text-right">
                  {t("Quantity")}
                </th>
                <th className="px-6 py-3 font-medium text-muted-foreground text-right">
                  {t("Unit")}
                </th>
                <th className="px-6 py-3 font-medium text-muted-foreground text-right">
                  {t("Est. Cost")}
                </th>
              </tr>
            </thead>
            <tbody>
              {result.shopping_list.map((item, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="px-4 sm:px-6 py-3 font-medium text-foreground">
                    {item.label}
                  </td>
                  <td className="px-4 sm:px-6 py-3 text-right text-muted-foreground">
                    {formatNumber(item.total_quantity)}
                  </td>
                  <td className="px-4 sm:px-6 py-3 text-right text-muted-foreground">
                    {item.unit}
                  </td>
                  <td className="px-4 sm:px-6 py-3 text-right font-semibold text-foreground">
                    {formatCurrency(item.total_cost)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Premium Reinforcement Breakdown */}
      {result.reinforcement_breakdown &&
        result.reinforcement_breakdown.items.length > 0 && (
          <div
            className="rounded-2xl border border-border bg-card shadow-card p-4 sm:p-6 animate-card-reveal"
            style={{ animationDelay: "0.6s" }}
          >
            <div className="flex items-center gap-2.5 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="w-4 h-4 text-brand-purple" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {t("Reinforcement Breakdown")}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {t(
                "Steel rods split by diameter, priced per 12m standard length",
              )}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      {t("Bar Type")}
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                      {t("Diameter")}
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                      {t("Total Length")}
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                      {t("Std Lengths (12m)")}
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                      {t("Weight")}
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                      {t("Unit Price")}
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                      {t("Cost")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {result.reinforcement_breakdown.items.map((item, i) => (
                    <tr key={i} className="hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {item.label}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {item.diameter_mm}mm
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {item.total_length_m.toFixed(1)} m
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">
                        {item.standard_lengths} lengths
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {item.weight_tonnes.toFixed(3)} t
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground">
                        {formatCurrency(item.total_cost)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-muted/50 font-semibold">
                    <td className="px-4 py-3" colSpan={3}>
                      {t("Total Steel")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {result.reinforcement_breakdown.total_length_m.toFixed(1)}{" "}
                      m
                    </td>
                    <td className="px-4 py-3 text-right">
                      {result.reinforcement_breakdown.total_weight_tonnes.toFixed(
                        3,
                      )}{" "}
                      t
                    </td>
                    <td className="px-4 py-3 text-right" colSpan={2}>
                      {formatCurrency(
                        result.reinforcement_breakdown.total_cost,
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Binding wire:{" "}
              {result.reinforcement_breakdown.binding_wire_kg.toFixed(1)} kg (
              {formatCurrency(result.reinforcement_breakdown.binding_wire_cost)}
              )
            </p>
          </div>
        )}

      {/* Detailed Quantities per Stage */}
      {result.stages.map((stage, i) => (
        <details
          key={i}
          className="rounded-2xl border border-border bg-card shadow-card"
        >
          <summary className="cursor-pointer p-4 sm:p-6 flex items-center justify-between">
            <span className="font-semibold text-foreground flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand-purple" />
              {stage.stage_label}, Detailed Quantities
            </span>
            <span className="text-sm text-muted-foreground">
              {formatCurrency(stage.stage_total)}
            </span>
          </summary>
          <div className="px-6 pb-6 space-y-4">
            {/* Quantities */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">
                {t("Quantity Takeoff")}
              </h4>
              <div className="space-y-2">
                {stage.quantities.map((q, j) => (
                  <div key={j} className="rounded-lg bg-muted/50 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-card-foreground">
                        {q.label}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {formatNumber(q.base_quantity)} {q.unit}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{q.formula}</p>
                    {q.wastage_percent > 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        +{q.wastage_percent}% wastage →{" "}
                        {formatNumber(q.final_quantity)} {q.unit}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
            {/* Materials */}
            {stage.materials.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">
                  {t("Materials")}
                </h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-left">
                      <th className="py-2 font-medium text-muted-foreground">
                        {t("Item")}
                      </th>
                      <th className="py-2 font-medium text-muted-foreground text-right">
                        {t("Qty")}
                      </th>
                      <th className="py-2 font-medium text-muted-foreground text-right">
                        {t("Unit")}
                      </th>
                      <th className="py-2 font-medium text-muted-foreground text-right">
                        {t("Cost")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stage.materials.map((m, j) => (
                      <tr key={j} className="border-b border-border/50">
                        <td className="py-2 text-card-foreground">{m.label}</td>
                        <td className="py-2 text-right text-muted-foreground">
                          {formatNumber(m.final_quantity)}
                        </td>
                        <td className="py-2 text-right text-muted-foreground">
                          {m.unit}
                        </td>
                        <td className="py-2 text-right font-medium text-foreground">
                          {formatCurrency(m.total_cost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {/* Labour */}
            {stage.labour.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">
                  {t("Labour")}
                </h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-left">
                      <th className="py-2 font-medium text-muted-foreground">
                        {t("Task")}
                      </th>
                      <th className="py-2 font-medium text-muted-foreground text-right">
                        {t("Qty")}
                      </th>
                      <th className="py-2 font-medium text-muted-foreground text-right">
                        {t("Rate")}
                      </th>
                      <th className="py-2 font-medium text-muted-foreground text-right">
                        {t("Cost")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stage.labour.map((l, j) => (
                      <tr key={j} className="border-b border-border/50">
                        <td className="py-2 text-card-foreground">{l.label}</td>
                        <td className="py-2 text-right text-muted-foreground">
                          {formatNumber(l.quantity)}
                        </td>
                        <td className="py-2 text-right text-muted-foreground">
                          {formatCurrency(l.rate)}
                        </td>
                        <td className="py-2 text-right font-medium text-foreground">
                          {formatCurrency(l.total_cost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </details>
      ))}

      {/* Premium Assumptions & Limitations */}
      <div className="grid md:grid-cols-2 gap-4">
        <div
          className="rounded-2xl border border-border bg-card shadow-card p-4 sm:p-6 animate-card-reveal"
          style={{ animationDelay: "0.7s" }}
        >
          <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
              <Info aria-hidden="true" className="w-4 h-4 text-blue-500" />
            </div>
            {t("Assumptions")}
          </h3>
          <ul className="space-y-1.5">
            {result.assumptions.map((a, i) => (
              <li
                key={i}
                className="text-sm text-muted-foreground flex items-start gap-2"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
        <div
          className="rounded-2xl border border-border bg-card shadow-card p-4 sm:p-6 animate-card-reveal"
          style={{ animationDelay: "0.8s" }}
        >
          <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            {t("Limitations & Missing Info")}
          </h3>
          <ul className="space-y-1.5">
            {result.limitations.map((l, i) => (
              <li
                key={i}
                className="text-sm text-muted-foreground flex items-start gap-2"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>{l}</span>
              </li>
            ))}
            {result.missing_info.map((m, i) => (
              <li
                key={`m${i}`}
                className="text-sm text-amber-700 flex items-start gap-2"
              >
                <Info
                  aria-hidden="true"
                  className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5"
                />
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Premium Price Info with Freshness Indicator */}
      <div
        className={`rounded-2xl border p-4 sm:p-6 animate-card-reveal ${result.price_stale ? "border-amber-300 bg-gradient-to-r from-amber-50 to-amber-50/30" : "border-border bg-gradient-to-r from-muted/50 to-muted/50/30"}`}
        style={{ animationDelay: "0.9s" }}
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${result.price_stale ? "bg-amber-100" : "bg-green-100"}`}
            >
              {result.price_stale ? (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              ) : (
                <BadgeCheck className="w-4 h-4 text-green-500" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-card-foreground">
                Price Date:
              </span>{" "}
              {result.price_date} ·
              <span className="font-medium text-card-foreground ml-2">
                Source:
              </span>{" "}
              {result.price_source}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              result.price_stale
                ? "bg-amber-100 text-amber-800"
                : "bg-green-100 text-green-800"
            }`}
          >
            {result.price_stale ? "⚠️ Stale" : "✓ Fresh"} (
            {result.price_age_days}d old)
          </span>
        </div>
        {result.price_stale && (
          <p className="mt-2 text-xs text-amber-700">
            Prices are older than 30 days. For accurate estimates, update
            current market prices before procurement.
          </p>
        )}

        {/* Save to Project Workspace */}
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Button
            variant="outline"
            onClick={exportQuote}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors active:scale-95"
          >
            <FileDown className="h-4 w-4" />
            {t("Export quote (PDF)")}
          </Button>
          <ShareEstimateButton
            estimate={quoteToShareable(
              quoteOptions(),
              "/build-to-roof-estimator",
            )}
            compact
          />
          <Button
            variant="outline"
            onClick={() => {
              stageStudioImport({
                title:
                  result.project_name || "Roofing and construction estimate",
                document_type: "bill_of_quantities",
                currency: "NGN",
                notes: `Project: ${result.project_name}. Location: ${result.location}. Floor area: ${result.total_floor_area} m². Materials subtotal: ${result.materials_total}. Labour subtotal: ${result.labour_total}. Wastage allowance: ${result.wastage_allowance}. Contingency: ${result.contingency}. Grand total: ${result.grand_total}. Price source: ${result.price_source}, dated ${result.price_date}.`,
                materials: result.shopping_list.map((item) => ({
                  label: item.label,
                  quantity: item.total_quantity,
                  unit: item.unit,
                  unitPrice: item.unit_price,
                })),
              });
              window.location.assign("/document-studio?calculatorImport=1");
            }}
            className="inline-flex items-center gap-2 rounded-xl border-primary/40 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/5 transition-colors active:scale-95"
          >
            <FileDown className="h-4 w-4" />
            {t("Customize in Studio")}
          </Button>
          <SaveToProjectButton
            calculatorType="build_to_roof"
            calculatorSlug="build-to-roof-estimator"
            calcTitle={`Build-to-Roof: ${result.project_name} (${result.total_floor_area} m²)`}
            calcData={result}
            resultSummary={{
              grand_total: result.grand_total,
              materials_total: result.materials_total,
              labour_total: result.labour_total,
              total_floor_area: result.total_floor_area,
              construction_stage: result.construction_stage,
              confidence: result.confidence,
            }}
            compact
            label="Save to Project Workspace"
          />
        </div>
      </div>

      {/* Premium Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
        <Button
          variant="ghost"
          onClick={onBack}
          className="inline-flex items-center gap-1 rounded-xl px-3.5 sm:px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors active:scale-95"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">{t("Edit Inputs")}</span>
          <span className="sm:hidden">{t("Edit")}</span>
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={exportQuote}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3.5 sm:px-4 py-2.5 text-sm font-medium text-card-foreground hover:bg-muted/50 hover:border-border transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">{t("Print Estimate")}</span>
            <span className="sm:hidden">{t("Print")}</span>
          </Button>
        </div>
      </div>
      <CalculatorAdBanner toolKey="roofing" className="mt-6" />
    </div>
  );
}
