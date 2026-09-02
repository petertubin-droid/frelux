/**
 * FRELUX Phase 2 — Painting Estimator Page
 *
 * Room-based painting estimator using the Phase 1 estimation engine.
 * Progressive disclosure flow:
 * 1. Project/room → 2. Dimensions → 3. Openings → 4. Paint/product
 * 5. Colour → 6. Surface condition → 7. Ceiling → 8. Coats → 9. Preparation → 10. Calculate → 11. Estimate
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Calculator,
  Save,
  RotateCcw,
  Layers,
  DoorOpen,
  Square,
  Paintbrush,
  Palette,
  Shield,
  Building2,
  Info,
  MapPin,
  Loader2,
  Briefcase,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { WorkWeatherBanner } from "@/components/ui/WorkWeatherBanner";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/estimation/pricing";
import { useSeo } from "@/lib/seo";
import { track } from "@/lib/analytics";
import {
  calculatePaintingProject,
  validateRoomInput,
  type PaintingRoomInput,
  type PaintingProjectInput,
  type PaintingEstimateResult,
  type ProductionRuleRow,
} from "@/lib/estimation/painting-engine";
import type {
  EstimationProduct,
  EstimationProductQuality,
  EstimationPrice,
  EstimationCalcRule,
  EstimationColourCondition,
  EstimationSurfaceCondition,
  OpeningInput,
} from "@/types/estimation";
import {
  fetchEstimationProducts,
  fetchProductQualityLevels,
  fetchActivePrice,
  fetchCalcRules,
  fetchColourConditions,
  fetchSurfaceConditions,
  createEstimate,
  createEstimateItem,
  createAdjustment,
  createAuditLog,
} from "@/lib/estimation/queries";
import { saveUserProject } from "@/lib/queries";
import { SaveToProjectButton } from "@/components/calculators";
import { trackCalculation } from "@/lib/achievements";
import { trackCalculationWithRewards } from "@/lib/rewards-integration";
import { trackRecentTool } from "@/lib/smart-defaults";
import { classNames } from "@/lib/utils";

import {
  FaqSection,
  RelatedTools,
  CALC_LINKS,
} from "@/components/seo/SeoSections";
import { PaintingEstimatorSeo } from "@/components/seo/SeoContent";
import { useCalcDefaults } from "@/lib/use-calc-defaults";
import {
  EstimateDisclaimer,
  ReportCalculationIssue,
} from "@/components/calculators";
import RelatedToolsLinks from "@/components/ui/RelatedToolsLinks";
// Engine integration
import { useEngineFeatures } from "@/lib/measurement";
import { monitoredCalc } from "@/lib/calculator-monitor";
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
// Types
// =========================================================

interface AdminAdjustmentState {
  roomIndex: number;
  fieldName: string;
  originalValue: string;
  adjustedValue: string;
  reason: string;
}

// =========================================================
// Constants
// =========================================================

const PAINT_CATEGORIES = ["emulsion", "matt", "satin"];
// DEFAULT_CEILING_COLOUR and DEFAULT_COATS are now fetched from admin calc rules
// via useCalcDefaults hook in the component

// =========================================================
// Component
// =========================================================

export default function PaintingEstimator({
  embedded = false,
}: { embedded?: boolean } = {}) {
  const { defaults: _calcDefaults, rules: defaultCalcRules } =
    useCalcDefaults("painting");
  const DEFAULT_CEILING_COLOUR =
    ((
      defaultCalcRules["ceiling_default_colour"]?.rule_value as Record<
        string,
        unknown
      >
    )?.colour as string) ?? "white";
  const DEFAULT_COATS =
    ((
      defaultCalcRules["standard_coat_count"]?.rule_value as Record<
        string,
        unknown
      >
    )?.count as number) ?? 2;
  useSeo(
    !embedded
      ? {
          title:
            "Painting Estimator — Complete Paint Project Estimate & Summary",
          description:
            "Complete painting project estimator. Get a room-by-room summary with paint buckets, material costs, finishes, and assumptions — the full project overview.",
          canonicalPath: "/painting-estimator",
          ogType: "website",
          keywords:
            "painting estimator, room painting cost, paint quantity estimator, professional paint calculator, FRELUX methodology",
          structuredDataArray: [
            {
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "FRELUX Painting Estimator",
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
                  name: "Painting Estimator",
                  item: `${SITE_URL}/painting-estimator`,
                },
              ],
            },
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: [
                {
                  "@type": "Question",
                  name: "What is the FRELUX painting estimation methodology?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "The FRELUX methodology calculates paint quantity based on room dimensions, ceiling area, openings, quality tiers, and surface conditions using admin-configured rates.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Can I estimate paint for multiple rooms?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Yes. Add each room with its dimensions and conditions for a combined project estimate.",
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
    trackRecentTool("/painting-estimator", "Painting Estimator", "Calculator");
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ── State: Configuration data from DB ──
  const [products, setProducts] = useState<EstimationProduct[]>([]);
  const [qualities, setQualities] = useState<
    Map<string, EstimationProductQuality[]>
  >(new Map());
  const [prices, setPrices] = useState<Map<string, EstimationPrice>>(new Map());
  const [calcRules, setCalcRules] = useState<Map<string, EstimationCalcRule>>(
    new Map(),
  );
  const [colourConditions, setColourConditions] = useState<
    EstimationColourCondition[]
  >([]);
  const [surfaceConditions, setSurfaceConditions] = useState<
    EstimationSurfaceCondition[]
  >([]);
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
  const [addPrimer] = useState(false);
  const [rooms, setRooms] = useState<PaintingRoomInput[]>([
    createDefaultRoom(),
  ]);
  const [expandedRoom, setExpandedRoom] = useState(0);
  const [showCalculation, setShowCalculation] = useState(false);

  // ── State: Result ──
  const [result, setResult] = useState<PaintingEstimateResult | null>(null);
  // Engine features hook (additive — existing logic unchanged)
  const engine = useEngineFeatures({ calculatorType: "painting" });
  const [alreadyHave, setAlreadyHave] = useState(0);
  const [calculating, setCalculating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [adjustments, setAdjustments] = useState<AdminAdjustmentState[]>([]);

  // =========================================================
  // Load configuration from database
  // =========================================================
  useEffect(() => {
    async function loadConfig() {
      setLoading(true);
      setLoadError(null);
      const warnings: string[] = [];

      try {
        // Fetch products (paint categories only: emulsion, matt, satin)
        const { data: allProducts } = await fetchEstimationProducts(true);
        const paintProducts = (allProducts ?? []).filter((p) =>
          PAINT_CATEGORIES.includes(p.category),
        );
        setProducts(paintProducts);

        if (paintProducts.length === 0) {
          warnings.push(
            "No paint products configured. Admin must configure Emulsion, Matt, and Satin products before estimates can be calculated.",
          );
        }

        // Fetch quality levels for each product
        const qualMap = new Map<string, EstimationProductQuality[]>();
        for (const product of paintProducts) {
          const { data: quals } = await fetchProductQualityLevels(product.id);
          qualMap.set(product.id, quals ?? []);
          // Check if coverage is configured
          for (const q of quals ?? []) {
            if (q.coverage === null || q.coverage === undefined) {
              warnings.push(
                `Coverage not configured for ${product.name}, ${q.name}. Accurate calculation requires Admin coverage configuration.`,
              );
            }
          }
        }
        setQualities(qualMap);

        // Fetch prices
        const priceMap = new Map<string, EstimationPrice>();
        for (const product of paintProducts) {
          const quals = qualMap.get(product.id) ?? [];
          for (const q of quals) {
            const { data: price } = await fetchActivePrice("quality", q.id);
            if (price) priceMap.set(q.id, price);
          }
          // Also try product-level price
          const { data: prodPrice } = await fetchActivePrice(
            "product",
            product.id,
          );
          if (prodPrice) priceMap.set(product.id, prodPrice);
        }
        setPrices(priceMap);

        // Fetch calc rules for painting
        const { data: rules } = await fetchCalcRules("painting");
        const ruleMap = new Map<string, EstimationCalcRule>();
        for (const rule of rules ?? []) {
          ruleMap.set(rule.rule_key, rule);
        }
        setCalcRules(ruleMap);

        // Fetch colour and surface conditions
        const { data: colours } = await fetchColourConditions();
        setColourConditions(colours ?? []);
        const { data: surfaces } = await fetchSurfaceConditions();
        setSurfaceConditions(surfaces ?? []);

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
          .eq("calculator_type", "painting")
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
  // Room management
  // =========================================================
  function createDefaultRoom(): PaintingRoomInput {
    return {
      room_id: `room-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      room_name: "Room 1",
      length: 10,
      breadth: 12,
      height: 8,
      unit: "feet",
      doors: [{ quantity: 1, width: 3, height: 7 }],
      windows: [{ quantity: 1, width: 4, height: 4 }],
      doors_unknown: false,
      windows_unknown: false,
      product_id: "",
      quality_id: "",
      colour_condition_key: "new_unpainted",
      surface_condition_key: "new_plastered",
      coats: DEFAULT_COATS,
      include_ceiling: false,
      ceiling_colour: DEFAULT_CEILING_COLOUR,
    };
  }

  const addRoom = useCallback(() => {
    setRooms((prev) => {
      const newRoom = createDefaultRoom();
      newRoom.room_name = `Room ${prev.length + 1}`;
      return [...prev, newRoom];
    });
    setExpandedRoom(rooms.length);
    setResult(null);
  }, [rooms.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const removeRoom = useCallback((index: number) => {
    setRooms((prev) => prev.filter((_, i) => i !== index));
    setResult(null);
  }, []);

  const updateRoom = useCallback(
    (index: number, updates: Partial<PaintingRoomInput>) => {
      setRooms((prev) =>
        prev.map((r, i) => (i === index ? { ...r, ...updates } : r)),
      );
      setResult(null);
    },
    [],
  );

  const updateDoor = useCallback(
    (roomIndex: number, doorIndex: number, updates: Partial<OpeningInput>) => {
      setRooms((prev) =>
        prev.map((r, i) => {
          if (i !== roomIndex) return r;
          const doors = r.doors.map((d, j) =>
            j === doorIndex ? { ...d, ...updates } : d,
          );
          return { ...r, doors };
        }),
      );
      setResult(null);
    },
    [],
  );

  const addDoor = useCallback((roomIndex: number) => {
    setRooms((prev) =>
      prev.map((r, i) => {
        if (i !== roomIndex) return r;
        return {
          ...r,
          doors: [...r.doors, { quantity: 1, width: 3, height: 7 }],
        };
      }),
    );
    setResult(null);
  }, []);

  const removeDoor = useCallback((roomIndex: number, doorIndex: number) => {
    setRooms((prev) =>
      prev.map((r, i) => {
        if (i !== roomIndex) return r;
        return { ...r, doors: r.doors.filter((_, j) => j !== doorIndex) };
      }),
    );
    setResult(null);
  }, []);

  const updateWindow = useCallback(
    (roomIndex: number, winIndex: number, updates: Partial<OpeningInput>) => {
      setRooms((prev) =>
        prev.map((r, i) => {
          if (i !== roomIndex) return r;
          const windows = r.windows.map((w, j) =>
            j === winIndex ? { ...w, ...updates } : w,
          );
          return { ...r, windows };
        }),
      );
      setResult(null);
    },
    [],
  );

  const addWindow = useCallback((roomIndex: number) => {
    setRooms((prev) =>
      prev.map((r, i) => {
        if (i !== roomIndex) return r;
        return {
          ...r,
          windows: [...r.windows, { quantity: 1, width: 4, height: 4 }],
        };
      }),
    );
    setResult(null);
  }, []);

  const removeWindow = useCallback((roomIndex: number, winIndex: number) => {
    setRooms((prev) =>
      prev.map((r, i) => {
        if (i !== roomIndex) return r;
        return { ...r, windows: r.windows.filter((_, j) => j !== winIndex) };
      }),
    );
    setResult(null);
  }, []);

  // =========================================================
  // Calculate
  // =========================================================
  const handleCalculate = useCallback(async () => {
    setCalculating(true);
    setSaved(false);

    // Validate all rooms
    for (let i = 0; i < rooms.length; i++) {
      const room = rooms[i];
      const product = products.find((p) => p.id === room.product_id) ?? null;
      const quals = qualities.get(room.product_id) ?? [];
      const quality = quals.find((q) => q.id === room.quality_id) ?? null;
      const validation = validateRoomInput(room, product, quality);
      if (!validation.valid) {
        setExpandedRoom(i);
        setCalculating(false);
        return;
      }
    }

    const projectInput: PaintingProjectInput = {
      rooms,
      currency: "NGN",
      user_id: null,
      client_hash: null,
      project_description: projectDescription,
      customer_location: customerLocation,
      add_primer: addPrimer,
    };

    const config = {
      products,
      qualities,
      prices,
      calcRules,
      colourConditions,
      surfaceConditions,
      productionRules,
      calcVersionId,
    };

    const calcResult = monitoredCalc("Painting Estimator", () =>
      calculatePaintingProject(projectInput, config),
    );
    setResult(calcResult);
    setShowCalculation(false);
    setCalculating(false);

    track("painting_estimator_calculated", {
      rooms: rooms.length,
      total_buckets: calcResult.combined_practical_buckets,
      total_cost: calcResult.total_material_cost,
    });
    trackCalculation("painting");
    trackCalculationWithRewards("painting", "Painting Estimator");
  }, [
    rooms,
    products,
    qualities,
    prices,
    calcRules,
    colourConditions,
    surfaceConditions,
    productionRules,
    calcVersionId,
    projectDescription,
    customerLocation,
    addPrimer,
  ]);

  // =========================================================
  // Save estimate
  // =========================================================
  const handleSave = useCallback(async () => {
    if (!result || !result.valid) return;
    setSaved(false);

    try {
      const estimateRef = `PAINT-${Date.now().toString(36).toUpperCase()}`;

      const { data: estimate, error: estError } = await createEstimate({
        estimate_ref: estimateRef,
        user_id: null,
        client_hash: null,
        calculator_type: "painting",
        project_description: projectDescription || "Painting Estimate",
        inputs: { rooms, customerLocation, addPrimer } as Record<
          string,
          unknown
        >,
        calculation_method: "room_based",
        calc_version_id: calcVersionId,
        calculated_quantities: {
          combined_theoretical_litres: result.combined_theoretical_litres,
          combined_theoretical_buckets: result.combined_theoretical_buckets,
          combined_practical_buckets: result.combined_practical_buckets,
          rooms: result.rooms.map((r) => ({
            room_name: r.room_name,
            theoretical_wall_litres: r.theoretical_wall_litres,
            theoretical_ceiling_litres: r.theoretical_ceiling_litres,
            practical_total_buckets: r.practical_total_buckets,
          })),
        } as Record<string, unknown>,
        total_material_cost: result.total_material_cost,
        currency: result.currency,
        labour_status: "not_included",
        warnings: result.warnings,
        recommendations: result.recommendations,
        notes: null,
        status: "calculated",
      });

      if (estError || !estimate) {
        if (import.meta.env.DEV)
          console.error("Failed to save estimate:", estError);
        return;
      }

      // Save line items
      for (let i = 0; i < result.line_items.length; i++) {
        const item = result.line_items[i];
        await createEstimateItem({
          estimate_id: estimate.id,
          item_name: item.item_name,
          item_type: item.item_type,
          product_id: item.product_id ?? null,
          quality_level_id: item.quality_level_id ?? null,
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
          notes: item.notes ?? null,
          sort_order: i,
        });
      }

      // Save adjustments
      for (const adj of adjustments) {
        await createAdjustment({
          estimate_id: estimate.id,
          item_id: null,
          field_name: adj.fieldName,
          original_value: adj.originalValue,
          adjusted_value: adj.adjustedValue,
          reason: adj.reason,
        });
      }

      // Audit log
      await createAuditLog({
        entity_type: "estimate",
        entity_id: estimate.id,
        action: "create",
        old_value: null,
        new_value: { estimate_ref: estimateRef, calculator_type: "painting" },
      });

      // Also save to user projects (local)
      await saveUserProject(
        projectDescription || "Painting Estimate",
        "custom",
        { rooms, result, estimateRef } as Record<string, unknown>,
        "FRELUX Painting Estimator",
      );

      setSaved(true);
    } catch (err) {
      if (import.meta.env.DEV) console.error("Save failed:", err);
    }
  }, [
    result,
    rooms,
    projectDescription,
    customerLocation,
    addPrimer,
    calcVersionId,
    adjustments,
  ]);

  // =========================================================
  // Manual professional adjustment
  // =========================================================
  const addAdjustment = useCallback(
    (
      roomIndex: number,
      fieldName: string,
      originalValue: string,
      adjustedValue: string,
      reason: string,
    ) => {
      setAdjustments((prev) => [
        ...prev,
        { roomIndex, fieldName, originalValue, adjustedValue, reason },
      ]);
    },
    [],
  );

  // =========================================================
  // Render
  // =========================================================

  if (loading) {
    return (
      <>
        {!embedded && (
          <>
            <PageHeader
              eyebrow="FRELUX Estimator"
              title="Painting Estimator"
              subtitle="Complete painting project overview: paint buckets, material costs, finishes, and assumptions."
              breadcrumbs={[
                { label: "Calculators", path: "/paint-calculator" },
                { label: "Painting Estimator" },
              ]}
            />
            <WorkWeatherBanner workType="painting" />
          </>
        )}
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
          <div className="flex items-center justify-center gap-3 text-muted-foreground">
            <Loader2 aria-hidden="true" className="h-6 w-6 animate-spin" />
            <span>Loading configuration…</span>
          </div>
        </div>
      </>
    );
  }

  if (loadError) {
    return (
      <>
        {!embedded && (
          <PageHeader
            eyebrow="FRELUX Estimator"
            title="Painting Estimator"
            subtitle="Complete painting project overview: paint buckets, material costs, finishes, and assumptions."
            breadcrumbs={[
              { label: "Calculators", path: "/paint-calculator" },
              { label: "Painting Estimator" },
            ]}
          />
        )}
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-500/20 dark:bg-red-500/10"
          >
            <AlertCircle
              aria-hidden="true"
              className="mx-auto h-8 w-8 text-red-500"
            />
            <p className="mt-3 text-sm font-semibold text-red-700 dark:text-red-400">
              Failed to load
            </p>
            <p className="mt-1 text-xs text-red-500">{loadError}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {!embedded && (
        <PageHeader
          eyebrow="FRELUX Estimator"
          title="Painting Estimator"
          subtitle="Professional room-based paint quantity and cost estimation using FRELUX methodology."
          breadcrumbs={[
            { label: "Calculators", path: "/paint-calculator" },
            { label: "Painting Estimator" },
          ]}
        />
      )}
      <div
        role="region"
        aria-label="Room painting estimator"
        className="mx-auto max-w-5xl px-4 py-8 sm:px-6"
      >
        {/* Configuration warnings */}
        {configWarnings.length > 0 && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
            <div className="flex items-start gap-3">
              <AlertCircle
                aria-hidden="true"
                className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
              />
              <div>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  Configuration Required
                </p>
                <ul className="mt-1 space-y-1">
                  {configWarnings.map((w, i) => (
                    <li
                      key={i}
                      className="text-xs text-amber-600 dark:text-amber-500"
                    >
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Project description & location */}
        <div className="card mb-6 p-5 sm:p-6 dark:border-white/5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground dark:text-primary-foreground">
            <Building2 className="h-5 w-5 text-brand-purple" />
            Project Details
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="block text-sm font-semibold text-card-foreground dark:text-muted-foreground/60">
                Project Description
              </span>
              <input
                type="text"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="e.g. 3-bedroom apartment painting"
                className="mt-1.5 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm transition-colors focus:border-brand-purple focus:ring-1 focus:ring-brand-purple dark:border-white/10 dark:bg-card dark:text-primary-foreground"
              />
            </label>
            <label className="block">
              <span className="block text-sm font-semibold text-card-foreground dark:text-muted-foreground/60">
                Customer Location
              </span>
              <select
                value={customerLocation}
                onChange={(e) =>
                  setCustomerLocation(
                    e.target.value as "owerri" | "outside_owerri" | "unknown",
                  )
                }
                className="mt-1.5 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm transition-colors focus:border-brand-purple focus:ring-1 focus:ring-brand-purple dark:border-white/10 dark:bg-card dark:text-primary-foreground"
              >
                <option value="unknown">Select location…</option>
                <option value="owerri">Owerri, Imo State</option>
                <option value="outside_owerri">Outside Owerri</option>
              </select>
            </label>
          </div>
        </div>

        {/* Rooms */}
        {rooms.map((room, roomIndex) => (
          <RoomCard
            key={room.room_id}
            room={room}
            roomIndex={roomIndex}
            isExpanded={expandedRoom === roomIndex}
            onToggle={() =>
              setExpandedRoom(expandedRoom === roomIndex ? -1 : roomIndex)
            }
            onUpdate={(updates) => updateRoom(roomIndex, updates)}
            onRemove={() => removeRoom(roomIndex)}
            canRemove={rooms.length > 1}
            products={products}
            qualities={qualities}
            colourConditions={colourConditions}
            surfaceConditions={surfaceConditions}
            onUpdateDoor={(di, u) => updateDoor(roomIndex, di, u)}
            onAddDoor={() => addDoor(roomIndex)}
            onRemoveDoor={(di) => removeDoor(roomIndex, di)}
            onUpdateWindow={(wi, u) => updateWindow(roomIndex, wi, u)}
            onAddWindow={() => addWindow(roomIndex)}
            onRemoveWindow={(wi) => removeWindow(roomIndex, wi)}
          />
        ))}

        {/* Add room button */}
        <Button
          onClick={addRoom}
          className="mb-6 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-brand-purple hover:text-brand-purple dark:border-white/10 dark:text-muted-foreground"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Add Another Room
        </Button>

        {/* Calculate button */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Button variant="default"
            onClick={handleCalculate}
            disabled={calculating}
            className="btn-glow inline-flex items-center gap-2 px-6 py-3 disabled:opacity-50"
          >
            {calculating ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <Calculator className="h-4 w-4" />
            )}
            {calculating ? "Calculating…" : "Calculate Estimate"}
          </Button>
          {result && (
            <Button
              onClick={() => {
                setRooms([createDefaultRoom()]);
                setResult(null);
                setSaved(false);
                setAdjustments([]);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted/50 dark:border-white/10 dark:bg-card dark:text-muted-foreground/60"
            >
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              Reset
            </Button>
          )}
        </div>

        {/* Results */}
        {result && (
          <EstimateResult
            result={result}
            showCalculation={showCalculation}
            onToggleCalculation={() => setShowCalculation(!showCalculation)}
            onSave={handleSave}
            saved={saved}
            onAddAdjustment={addAdjustment}
            engine={engine}
            alreadyHave={alreadyHave}
            onAlreadyHaveChange={setAlreadyHave}
          />
        )}
      </div>

      {!embedded && (
        <>
          <PaintingEstimatorSeo />

          <FaqSection
            faqs={[
              {
                question: "What is the FRELUX painting estimation methodology?",
                answer: (
                  <span>
                    The FRELUX methodology calculates paint quantity based on
                    room-by-room dimensions, ceiling area, door and window
                    deductions, paint quality tiers, colour conditions, and
                    surface conditions. It uses admin-configured coverage rates
                    and product prices for accurate estimates.
                  </span>
                ),
              },
              {
                question: "Can I estimate paint for multiple rooms?",
                answer: (
                  <span>
                    Yes. The Painting Estimator supports multiple rooms. Add
                    each room with its dimensions and conditions to get a
                    combined project estimate.
                  </span>
                ),
              },
              {
                question: "Does the Painting Estimator include labour costs?",
                answer: (
                  <span>
                    Yes. The Painting Estimator includes configurable labour
                    rates alongside material costs for a complete project budget
                    estimate.
                  </span>
                ),
              },
            ]}
          />

          <RelatedTools
            links={[
              CALC_LINKS.paintCalculator,
              CALC_LINKS.buildToRoof,
              CALC_LINKS.finishEstimator,
              CALC_LINKS.finishEstimator,
              CALC_LINKS.buildToRoof,
              CALC_LINKS.imageEstimator,
            ]}
          />
        </>
      )}
    </>
  );
}

// =========================================================
// Room Card Component
// =========================================================

function RoomCard({
  room,
  roomIndex,
  isExpanded,
  onToggle,
  onUpdate,
  onRemove,
  canRemove,
  products,
  qualities,
  colourConditions,
  surfaceConditions,
  onUpdateDoor,
  onAddDoor,
  onRemoveDoor,
  onUpdateWindow,
  onAddWindow,
  onRemoveWindow,
}: {
  room: PaintingRoomInput;
  roomIndex: number;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<PaintingRoomInput>) => void;
  onRemove: () => void;
  canRemove: boolean;
  products: EstimationProduct[];
  qualities: Map<string, EstimationProductQuality[]>;
  colourConditions: EstimationColourCondition[];
  surfaceConditions: EstimationSurfaceCondition[];
  onUpdateDoor: (doorIndex: number, updates: Partial<OpeningInput>) => void;
  onAddDoor: () => void;
  onRemoveDoor: (doorIndex: number) => void;
  onUpdateWindow: (winIndex: number, updates: Partial<OpeningInput>) => void;
  onAddWindow: () => void;
  onRemoveWindow: (winIndex: number) => void;
}) {
  const roomQualities = qualities.get(room.product_id) ?? [];

  return (
    <div className="card mb-4 overflow-hidden dark:border-white/5">
      {/* Header */}
      <div
        onClick={onToggle}
        className="flex cursor-pointer items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-brand-purple">
            {roomIndex + 1}
          </div>
          <div>
            <input
              type="text"
              value={room.room_name}
              onChange={(e) => {
                e.stopPropagation();
                onUpdate({ room_name: e.target.value });
              }}
              onClick={(e) => e.stopPropagation()}
              className="rounded border-transparent bg-transparent text-base font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-brand-purple dark:text-primary-foreground"
              placeholder="Room name"
            />
            <p className="text-xs text-muted-foreground dark:text-muted-foreground">
              {room.length} × {room.breadth} × {room.height} {room.unit}
              {room.include_ceiling ? " • Ceiling" : " • Walls only"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canRemove && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
            </Button>
          )}
          {isExpanded ? (
            <ChevronUp
              aria-hidden="true"
              className="h-5 w-5 text-muted-foreground"
            />
          ) : (
            <ChevronDown
              aria-hidden="true"
              className="h-5 w-5 text-muted-foreground"
            />
          )}
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border/50 px-5 py-5 dark:border-white/5">
          {/* Dimensions */}
          <Section
            icon={<Square className="h-4 w-4" />}
            title="Room Dimensions"
          >
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <NumberField
                label="Length"
                value={room.length}
                onChange={(v) => onUpdate({ length: v })}
                unit={room.unit}
              />
              <NumberField
                label="Breadth"
                value={room.breadth}
                onChange={(v) => onUpdate({ breadth: v })}
                unit={room.unit}
              />
              <NumberField
                label="Wall Height"
                value={room.height}
                onChange={(v) => onUpdate({ height: v })}
                unit={room.unit}
              />
              <label className="block">
                <span className="block text-xs font-semibold text-muted-foreground dark:text-muted-foreground">
                  Unit
                </span>
                <select
                  value={room.unit}
                  onChange={(e) =>
                    onUpdate({ unit: e.target.value as "feet" | "meters" })
                  }
                  className="mt-1.5 w-full rounded-lg border border-border bg-card px-2 py-2 text-sm dark:border-white/10 dark:bg-card dark:text-primary-foreground"
                >
                  <option value="feet">Feet (ft)</option>
                  <option value="meters">Metres (m)</option>
                </select>
              </label>
            </div>
          </Section>

          {/* Doors */}
          <Section icon={<DoorOpen className="h-4 w-4" />} title="Doors">
            <label className="mb-2 flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={room.doors_unknown}
                onChange={(e) => onUpdate({ doors_unknown: e.target.checked })}
                className="rounded"
              />
              <span className="text-muted-foreground dark:text-muted-foreground">
                I don't know the door dimensions
              </span>
            </label>
            {!room.doors_unknown &&
              room.doors.map((door, di) => (
                <div key={di} className="mb-2 flex items-end gap-2">
                  <NumberField
                    label={di === 0 ? "Qty" : ""}
                    value={door.quantity}
                    onChange={(v) => onUpdateDoor(di, { quantity: v })}
                  />
                  <NumberField
                    label={di === 0 ? "Width (ft)" : ""}
                    value={door.width}
                    onChange={(v) => onUpdateDoor(di, { width: v })}
                  />
                  <NumberField
                    label={di === 0 ? "Height (ft)" : ""}
                    value={door.height}
                    onChange={(v) => onUpdateDoor(di, { height: v })}
                  />
                  <Button
                    onClick={() => onRemoveDoor(di)}
                    className="mb-2 rounded p-2 text-muted-foreground hover:text-red-500"
                  >
                    <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            {!room.doors_unknown && (
              <Button
                onClick={onAddDoor}
                className="text-xs font-semibold text-brand-purple hover:underline"
              >
                + Add door type
              </Button>
            )}
          </Section>

          {/* Windows */}
          <Section icon={<Square className="h-4 w-4" />} title="Windows">
            <label className="mb-2 flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={room.windows_unknown}
                onChange={(e) =>
                  onUpdate({ windows_unknown: e.target.checked })
                }
                className="rounded"
              />
              <span className="text-muted-foreground dark:text-muted-foreground">
                I don't know the window dimensions
              </span>
            </label>
            {!room.windows_unknown &&
              room.windows.map((win, wi) => (
                <div key={wi} className="mb-2 flex items-end gap-2">
                  <NumberField
                    label={wi === 0 ? "Qty" : ""}
                    value={win.quantity}
                    onChange={(v) => onUpdateWindow(wi, { quantity: v })}
                  />
                  <NumberField
                    label={wi === 0 ? "Width (ft)" : ""}
                    value={win.width}
                    onChange={(v) => onUpdateWindow(wi, { width: v })}
                  />
                  <NumberField
                    label={wi === 0 ? "Height (ft)" : ""}
                    value={win.height}
                    onChange={(v) => onUpdateWindow(wi, { height: v })}
                  />
                  <Button
                    onClick={() => onRemoveWindow(wi)}
                    className="mb-2 rounded p-2 text-muted-foreground hover:text-red-500"
                  >
                    <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            {!room.windows_unknown && (
              <Button
                onClick={onAddWindow}
                className="text-xs font-semibold text-brand-purple hover:underline"
              >
                + Add window type
              </Button>
            )}
          </Section>

          {/* Paint selection */}
          <Section
            icon={<Paintbrush className="h-4 w-4" />}
            title="Paint Type & Quality"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="block text-xs font-semibold text-muted-foreground dark:text-muted-foreground">
                  Paint Type
                </span>
                <select
                  value={room.product_id}
                  onChange={(e) => {
                    const productId = e.target.value;
                    const quals = qualities.get(productId) ?? [];
                    onUpdate({
                      product_id: productId,
                      quality_id: quals[0]?.id ?? "",
                    });
                  }}
                  className="mt-1.5 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm dark:border-white/10 dark:bg-card dark:text-primary-foreground"
                >
                  <option value="">Select paint type…</option>
                  {products
                    .filter((p) => PAINT_CATEGORIES.includes(p.category))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-xs font-semibold text-muted-foreground dark:text-muted-foreground">
                  Quality Level
                </span>
                <select
                  value={room.quality_id}
                  onChange={(e) => onUpdate({ quality_id: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm dark:border-white/10 dark:bg-card dark:text-primary-foreground"
                  disabled={!room.product_id}
                >
                  <option value="">Select quality…</option>
                  {roomQualities.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {room.product_id &&
              room.quality_id &&
              (() => {
                const q = roomQualities.find((qu) => qu.id === room.quality_id);
                if (q && (q.coverage === null || q.coverage === undefined)) {
                  return (
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                      Coverage not configured for this quality. Admin must
                      configure coverage before accurate calculation.
                    </p>
                  );
                }
                return null;
              })()}
          </Section>

          {/* Colour condition */}
          <Section
            icon={<Palette className="h-4 w-4" />}
            title="Colour Condition"
          >
            <select
              value={room.colour_condition_key}
              onChange={(e) =>
                onUpdate({ colour_condition_key: e.target.value })
              }
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm dark:border-white/10 dark:bg-card dark:text-primary-foreground"
            >
              {colourConditions.map((c) => (
                <option key={c.id} value={c.condition_key}>
                  {c.name}
                </option>
              ))}
            </select>
            {colourConditions.find(
              (c) => c.condition_key === room.colour_condition_key,
            )?.requires_warning && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                ⚠ Strong colour transition detected. Additional preparation or
                paint may be required. Professional adjustment recommended.
              </p>
            )}
          </Section>

          {/* Surface condition */}
          <Section
            icon={<Shield className="h-4 w-4" />}
            title="Surface Condition"
          >
            <select
              value={room.surface_condition_key}
              onChange={(e) =>
                onUpdate({ surface_condition_key: e.target.value })
              }
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm dark:border-white/10 dark:bg-card dark:text-primary-foreground"
            >
              {surfaceConditions.map((s) => (
                <option key={s.id} value={s.condition_key}>
                  {s.name}
                </option>
              ))}
            </select>
            {surfaceConditions.find(
              (s) => s.condition_key === room.surface_condition_key,
            )?.requires_preparation && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                ⚠ Surface preparation may be required before painting.
              </p>
            )}
            {surfaceConditions.find(
              (s) => s.condition_key === room.surface_condition_key,
            )?.primer_recommended && (
              <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                Primer/sealer recommended. You can add it separately in the
                preparation step.
              </p>
            )}
          </Section>

          {/* Ceiling */}
          <Section icon={<Layers className="h-4 w-4" />} title="Ceiling">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={room.include_ceiling}
                  onChange={(e) =>
                    onUpdate({ include_ceiling: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="text-card-foreground dark:text-muted-foreground/60">
                  Include ceiling
                </span>
              </label>
              {room.include_ceiling && (
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground dark:text-muted-foreground">
                    Ceiling colour:
                  </span>
                  <select
                    value={room.ceiling_colour}
                    onChange={(e) =>
                      onUpdate({ ceiling_colour: e.target.value })
                    }
                    className="rounded-lg border border-border bg-card px-2 py-1 text-sm dark:border-white/10 dark:bg-card dark:text-primary-foreground"
                  >
                    <option value="white">White (FRELUX default)</option>
                    <option value="custom">
                      Custom (requires configuration)
                    </option>
                  </select>
                </label>
              )}
            </div>
            {!room.include_ceiling && (
              <p className="mt-2 text-xs text-muted-foreground dark:text-muted-foreground">
                Ceiling excluded, ceiling quantity = 0.
              </p>
            )}
          </Section>

          {/* Coats */}
          <Section icon={<Layers className="h-4 w-4" />} title="Coats">
            <div className="flex items-center gap-3">
              <label className="text-sm text-muted-foreground dark:text-muted-foreground">
                Number of coats:
              </label>
              <select
                value={room.coats}
                onChange={(e) => onUpdate({ coats: parseInt(e.target.value) })}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm dark:border-white/10 dark:bg-card dark:text-primary-foreground"
              >
                <option value={2}>2 (FRELUX standard)</option>
                <option value={3}>3 (Extra finish)</option>
                <option value={4}>4</option>
              </select>
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}

// =========================================================
// Estimate Result Component
// =========================================================

function EstimateResult({
  result,
  showCalculation,
  onToggleCalculation,
  onSave,
  saved,
  onAddAdjustment: _onAddAdjustment,
  engine,
  alreadyHave,
  onAlreadyHaveChange,
}: {
  result: PaintingEstimateResult;
  showCalculation: boolean;
  onToggleCalculation: () => void;
  onSave: () => void;
  saved: boolean;
  onAddAdjustment: (
    roomIndex: number,
    fieldName: string,
    originalValue: string,
    adjustedValue: string,
    reason: string,
  ) => void;
  engine: ReturnType<typeof useEngineFeatures>;
  alreadyHave: number;
  onAlreadyHaveChange: (n: number) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
          <div className="flex items-start gap-3">
            <AlertCircle
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
            />
            <div>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                Warnings & Recommendations
              </p>
              <ul className="mt-1 space-y-1">
                {result.warnings.map((w, i) => (
                  <li
                    key={i}
                    className="text-xs text-amber-600 dark:text-amber-500"
                  >
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Per-room results */}
      {result.rooms.map((room) => (
        <div
          key={room.room_id}
          className="calc-card card overflow-hidden dark:border-white/5"
        >
          <div className="bg-gradient-to-br from-background to-primary px-5 py-4 text-primary-foreground">
            <h3 className="text-base font-bold">{room.room_name}</h3>
            <p className="text-xs text-primary-foreground/70">
              {room.length_m.toFixed(2)} × {room.breadth_m.toFixed(2)} ×{" "}
              {room.height_m.toFixed(2)} m{" • "}
              {room.product?.name ?? "N/A"} ({room.quality?.name ?? "N/A"})
            </p>
          </div>
          <div className="p-5">
            {/* Customer-facing summary — painter language */}
            <div className="rounded-lg border border-border bg-muted/50 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2 md:grid-cols-3">
                <div>
                  <span className="text-muted-foreground dark:text-muted-foreground">
                    Room Size:
                  </span>{" "}
                  <span className="font-medium text-card-foreground dark:text-muted-foreground/60">
                    {room.customer_summary.room_size}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground dark:text-muted-foreground">
                    Wall Height:
                  </span>{" "}
                  <span className="font-medium text-card-foreground dark:text-muted-foreground/60">
                    {room.customer_summary.wall_height}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground dark:text-muted-foreground">
                    Paint:
                  </span>{" "}
                  <span className="font-medium text-card-foreground dark:text-muted-foreground/60">
                    {room.customer_summary.paint}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground dark:text-muted-foreground">
                    Coats:
                  </span>{" "}
                  <span className="font-medium text-card-foreground dark:text-muted-foreground/60">
                    {room.customer_summary.coats}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground dark:text-muted-foreground">
                    Ceiling:
                  </span>{" "}
                  <span className="font-medium text-card-foreground dark:text-muted-foreground/60">
                    {room.customer_summary.ceiling}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground dark:text-muted-foreground">
                    Doors:
                  </span>{" "}
                  <span className="font-medium text-card-foreground dark:text-muted-foreground/60">
                    {room.customer_summary.doors}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground dark:text-muted-foreground">
                    Windows:
                  </span>{" "}
                  <span className="font-medium text-card-foreground dark:text-muted-foreground/60">
                    {room.customer_summary.windows}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground dark:text-muted-foreground">
                    Requirement:
                  </span>{" "}
                  <span className="font-bold text-brand-purple dark:text-brand-purple-lighter">
                    {room.customer_summary.calculated_requirement}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground dark:text-muted-foreground">
                    Purchase:
                  </span>{" "}
                  <span className="font-bold text-brand-purple dark:text-brand-purple-lighter">
                    {room.customer_summary.practical_purchase}
                  </span>
                </div>
              </div>
              {room.customer_summary.material_cost !== "Not configured" && (
                <div className="mt-2 border-t border-border pt-2 dark:border-white/10">
                  <span className="text-muted-foreground dark:text-muted-foreground">
                    Material Cost:
                  </span>{" "}
                  <span className="font-bold text-foreground dark:text-primary-foreground">
                    {room.customer_summary.material_cost}
                  </span>
                </div>
              )}
            </div>

            {/* Height adjustment warning */}
            {room.height_adjustment?.is_high && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 dark:border-amber-500/20 dark:bg-amber-500/10">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  <span className="font-semibold">⚠ Height Notice:</span>{" "}
                  {room.height_adjustment.message}
                </p>
              </div>
            )}

            {/* Professional detail stats (supplementary, not primary) */}
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatBox
                label="Paint Buckets Required"
                value={`${room.practical_total_buckets} bucket(s)`}
                highlight
              />
              <StatBox
                label="Paint Buckets Required"
                value={`${room.theoretical_total_litres.toFixed(2)} L (internal)`}
              />
              <StatBox
                label="Net Wall Area"
                value={`${room.net_wall_area_m2.toFixed(2)} m²`}
              />
              <StatBox
                label="Coverage"
                value={
                  room.coverage_m2_per_liter
                    ? `${room.coverage_m2_per_liter} m²/L`
                    : "N/A"
                }
              />
            </div>

            {/* Ceiling info */}
            {room.include_ceiling && (
              <div className="mt-3 rounded-lg bg-blue-50 px-4 py-2 dark:bg-blue-500/10">
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  Ceiling: {room.ceiling_quantity_buckets} bucket(s) ·{" "}
                  {room.ceiling_colour} · Calculated separately
                </p>
              </div>
            )}

            {/* Leftover */}
            {room.leftover_litres > 0 && (
              <div className="mt-2 text-xs text-muted-foreground dark:text-muted-foreground">
                Estimated remaining: {room.leftover_litres.toFixed(2)} L after
                theoretical requirement
              </div>
            )}

            {/* Colour/surface condition */}
            {(room.colour_condition || room.surface_condition) && (
              <div className="mt-3 space-y-1">
                {room.colour_condition && (
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                    <span className="font-semibold">Colour condition:</span>{" "}
                    {room.colour_condition.name}
                    {room.colour_condition.requires_warning &&
                      ", professional adjustment recommended"}
                  </p>
                )}
                {room.surface_condition && (
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                    <span className="font-semibold">Surface condition:</span>{" "}
                    {room.surface_condition.name}
                    {room.surface_condition.primer_recommended &&
                      ", primer/sealer recommended"}
                  </p>
                )}
              </div>
            )}

            {/* Calculation steps */}
            {showCalculation && room.calculation_steps.length > 0 && (
              <div className="mt-4 rounded-lg border border-border bg-muted/50 p-4 dark:border-white/10 dark:bg-white/5">
                <p className="mb-2 text-xs font-bold text-muted-foreground dark:text-muted-foreground/80">
                  How was this calculated?
                </p>
                <div className="space-y-1">
                  {room.calculation_steps.map((step, si) => (
                    <div
                      key={si}
                      className="flex justify-between gap-4 text-xs"
                    >
                      <span className="text-muted-foreground dark:text-muted-foreground">
                        {step.label}
                      </span>
                      <span className="text-right font-medium text-card-foreground dark:text-muted-foreground/60">
                        {step.value}
                        {step.detail && (
                          <span className="block text-muted-foreground dark:text-muted-foreground">
                            {step.detail}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Combined summary */}
      <div className="calc-card card overflow-hidden dark:border-white/5">
        <div className="bg-gradient-to-br from-primary to-primary-deep px-5 py-4 text-primary-foreground">
          <h3 className="text-lg font-bold">Project Summary</h3>
        </div>
        <div className="p-5 space-y-4">
          {/* Combined quantities */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            <StatBox
              label="Total Paint Buckets"
              value={`${result.combined_practical_buckets} bucket(s)`}
              highlight
            />
            <StatBox
              label="Theoretical (internal)"
              value={`${result.combined_theoretical_litres.toFixed(2)} L`}
            />
          </div>

          {result.combined_leftover_litres > 0 && (
            <p className="text-xs text-muted-foreground dark:text-muted-foreground">
              Estimated remaining after theoretical requirement:{" "}
              {result.combined_leftover_litres.toFixed(2)} L
            </p>
          )}

          {/* Production eligibility */}
          <div
            className={classNames(
              "rounded-lg p-3",
              result.production_eligible
                ? "bg-green-50 dark:bg-green-500/10"
                : "bg-orange-50 dark:bg-orange-500/10",
            )}
          >
            <p className="flex items-center gap-2 text-xs font-semibold">
              <MapPin className="h-4 w-4" />
              {result.production_eligible ? (
                <span className="text-green-700 dark:text-green-400">
                  FRELUX Production Available
                </span>
              ) : (
                <span className="text-orange-700 dark:text-orange-400">
                  FRELUX Production: Minimum Not Met
                </span>
              )}
            </p>
            <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground/80">
              {result.production_message}
            </p>
          </div>

          {/* Breakdown by paint type/quality */}
          {result.breakdown.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-bold text-foreground dark:text-primary-foreground">
                Breakdown by Paint Type & Quality
              </h4>
              <div className="space-y-2">
                {result.breakdown.map((entry, i) => (
                  <div
                    key={i}
                    className="flex flex-wrap justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs dark:bg-white/5"
                  >
                    <div>
                      <span className="font-semibold text-card-foreground dark:text-muted-foreground/60">
                        {entry.label}
                      </span>
                      <span className="ml-2 text-muted-foreground dark:text-muted-foreground">
                        {entry.room_count} room(s)
                      </span>
                    </div>
                    <div className="flex gap-4">
                      <span className="text-muted-foreground dark:text-muted-foreground">
                        {entry.theoretical_litres.toFixed(2)} L theoretical
                      </span>
                      <span className="font-medium text-card-foreground dark:text-muted-foreground/60">
                        {entry.practical_buckets} buckets
                      </span>
                      <span className="font-semibold text-foreground dark:text-primary-foreground">
                        {formatCurrency(entry.material_cost, result.currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total rooms */}
          <div className="text-xs text-muted-foreground dark:text-muted-foreground">
            Total rooms: {result.rooms.length}
          </div>

          {/* Material cost */}
          {result.line_items.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-bold text-foreground dark:text-primary-foreground">
                Material Cost Breakdown
              </h4>
              <div className="space-y-2">
                {result.line_items.map((item, i) => (
                  <div key={i} className="flex justify-between gap-4 text-xs">
                    <div>
                      <span className="font-medium text-card-foreground dark:text-muted-foreground/60">
                        {item.item_name}
                      </span>
                      <span className="block text-muted-foreground dark:text-muted-foreground">
                        {item.practical_purchase_qty} L ×{" "}
                        {formatCurrency(
                          item.unit_price,
                          item.price_snapshot.currency ?? "NGN",
                        )}
                        /L
                      </span>
                    </div>
                    <span className="font-semibold text-foreground dark:text-primary-foreground">
                      {formatCurrency(item.total_price, result.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total */}
          <div className="border-t border-border pt-4 dark:border-white/10">
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-muted-foreground dark:text-muted-foreground/80">
                Estimated Material Cost
              </span>
              <span className="text-lg font-bold text-brand-purple">
                {formatCurrency(result.total_material_cost, result.currency)}
              </span>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-muted-foreground dark:text-muted-foreground">
                Labour
              </span>
              <span className="text-muted-foreground dark:text-muted-foreground">
                Not included, negotiated separately.
              </span>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="font-semibold text-card-foreground dark:text-muted-foreground/60">
                Estimated Total Excluding Labour
              </span>
              <span className="text-lg font-bold text-foreground dark:text-primary-foreground">
                {formatCurrency(result.total_material_cost, result.currency)}
              </span>
            </div>
          </div>

          {/* ── Engine Features (Additive) ── */}
          {/* Confidence badge */}
          <div className="flex items-center gap-2">
            <EngineConfidenceBadge
              result={engine.assessConfidence({
                ruleValid: true,
                inputComplete: true,
                materialSpecComplete: result.rooms.length > 0,
                marketPriceAvailable: result.total_material_cost > 0,
                sourceReliability: "verified",
                productMatched: result.rooms.some((r) => r.product !== null),
              })}
            />
          </div>

          {/* Already-have / Purchase quantity */}
          <EngineAlreadyHaveInput
            required={result.combined_practical_buckets}
            alreadyHave={alreadyHave}
            onAlreadyHaveChange={onAlreadyHaveChange}
            unit="buckets"
          />

          {/* Waste selector */}
          <EngineWasteSelector
            resolution={engine.wasteResolution}
            userWaste={engine.userWaste}
            onUserWasteChange={engine.setUserWaste}
          />

          {/* Engine explanation panel */}
          <EngineExplanationPanel
            result={engine.buildExplanation({
              subject: "Painting Estimate",
              resultSummary: `${result.combined_practical_buckets} paint buckets needed`,
              steps: [
                {
                  description: "Number of rooms",
                  value: String(result.rooms.length),
                },
                {
                  description: "Total paint buckets required",
                  value: `${result.combined_practical_buckets} bucket(s)`,
                },
                {
                  description: "Total theoretical buckets",
                  value: `${result.combined_theoretical_buckets.toFixed(2)}`,
                },
                {
                  description: "Purchase quantity (with waste)",
                  value: `${result.combined_practical_buckets} buckets`,
                },
                {
                  description: "Total material cost",
                  value:
                    result.total_material_cost > 0
                      ? `${result.total_material_cost.toLocaleString()} ${result.currency}`
                      : "Not configured",
                },
              ],
              notes: [
                ...result.warnings,
                ...(alreadyHave > 0
                  ? [
                      `Already have: ${alreadyHave} buckets — purchase ${Math.max(0, result.combined_practical_buckets - alreadyHave)} more`,
                    ]
                  : []),
              ],
            })}
          />

          {/* Confidence detail */}
          <EngineConfidenceDetail
            result={engine.assessConfidence({
              ruleValid: true,
              inputComplete: true,
              materialSpecComplete: result.rooms.length > 0,
              marketPriceAvailable: result.total_material_cost > 0,
              sourceReliability: "verified",
              productMatched: result.rooms.some((r) => r.product !== null),
            })}
          />

          {/* Material summary */}
          <EngineMaterialSummaryCard
            summary={engine.buildMaterialSummary(
              result.rooms.map((room, i) => ({
                materialId: room.product?.id ?? `paint-${i}`,
                productName: room.product?.name ?? "Paint",
                totalQuantity: room.practical_total_buckets,
                quantityUnit: "buckets",
                spaceIds: [room.room_id],
              })),
            )}
          />

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              onClick={onSave}
              className={classNames(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all",
                saved
                  ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                  : "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              {saved ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saved ? "Saved" : "Save Estimate"}
            </Button>
            <SaveToProjectButton
              calculatorType="cost"
              calculatorSlug="painting-estimator"
              calcTitle="Painting Cost Estimate"
              calcData={
                {
                  rooms: result?.rooms,
                  totals: {
                    material_cost: result?.total_material_cost,
                    currency: result?.currency,
                  },
                } as Record<string, unknown>
              }
              resultSummary={
                {
                  grandTotal: result?.total_material_cost,
                  materialCost: result?.total_material_cost,
                  roomCount: result?.rooms?.length,
                } as Record<string, unknown>
              }
              materials={(result?.line_items || []).map((m) => ({
                name: m.item_name,
                category: m.item_type,
                quantity: m.practical_purchase_qty,
                unit: m.unit,
              }))}
              compact
              label="Save to Project"
            />
            <Button
              onClick={onToggleCalculation}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted/50 dark:border-white/10 dark:bg-card dark:text-muted-foreground/60"
            >
              <Info aria-hidden="true" className="h-4 w-4" />
              {showCalculation
                ? "Hide Calculation"
                : "How was this calculated?"}
            </Button>
          </div>

          {/* Post as Job CTA — marketplace integration */}
          <div className="mt-4 rounded-xl border border-brand-purple/20 bg-primary/5 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-foreground dark:text-primary-foreground">
                  Need someone to do the work?
                </p>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                  Post this estimate as a job and get bids from verified pros
                  near you.
                </p>
              </div>
              <a
                href={`/marketplace/post?estimate_ref=${result.estimate_ref || ""}&project_type=painting&budget_min=${Math.round(result.total_material_cost * 0.9)}&budget_max=${Math.round(result.total_material_cost * 1.2)}&title=Painting ${result.rooms.length} ${result.rooms.length === 1 ? "room" : "rooms"}`}
                className="btn-primary btn-glow inline-flex items-center justify-center gap-2 px-4 py-2 whitespace-nowrap"
              >
                <Briefcase className="h-4 w-4" />
                Post as Job
              </a>
            </div>
          </div>

          {/* Trust labels */}
          <div className="flex flex-wrap gap-2 pt-2 text-xs">
            <TrustBadge label="CALCULATED" value="FRELUX engine" />
            <TrustBadge label="CONFIGURED" value="FRELUX Admin" />
            <TrustBadge label="NEGOTIATED" value="Labour (separate)" />
          </div>

          <EstimateDisclaimer text="Estimates are indicative and not a formal quote." />
          <ReportCalculationIssue
            calculatorType="painting"
            userInput={{
              rooms: result.rooms.length,
              totalTheoreticalLitres: result.combined_theoretical_litres,
            }}
            actualResult={{
              totalMaterialCost: result.total_material_cost,
              totalBuckets: result.combined_practical_buckets,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// =========================================================
// Helper Components
// =========================================================

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-card-foreground dark:text-muted-foreground/60">
        {icon}
        {title}
      </h4>
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
}) {
  return (
    <label className="block">
      {label && (
        <span className="block text-xs font-semibold text-muted-foreground dark:text-muted-foreground">
          {label}
        </span>
      )}
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          min={0}
          step={0.1}
          className="mt-0.5 w-full rounded-lg border border-border bg-card px-2 py-2 text-sm focus:border-brand-purple focus:ring-1 focus:ring-brand-purple dark:border-white/10 dark:bg-card dark:text-primary-foreground"
        />
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
    </label>
  );
}

function StatBox({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={classNames(
        "rounded-lg p-3",
        highlight
          ? "bg-primary/10 dark:bg-primary/20"
          : "bg-muted/50 dark:bg-white/5",
      )}
    >
      <p className="text-xs text-muted-foreground dark:text-muted-foreground">{label}</p>
      <p
        className={classNames(
          "mt-1 text-sm font-bold",
          highlight
            ? "text-brand-purple dark:text-brand-purple-lighter"
            : "text-foreground dark:text-primary-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function TrustBadge({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground dark:bg-white/5 dark:text-muted-foreground">
      <span className="font-bold">{label}:</span>
      {value}
    </span>
  );
}
