/**
 * FRELUX AI Foundation — Structural engine family adapters
 *
 * Wraps the authoritative foundation / doors-windows / reinforcement
 * engines for AI orchestration. Mirrors exactly what the estimator pages
 * do: fetch the calc rules, resolve the ACTIVE MARKET's price book (with
 * the structural market-pricing overlay for foundation), run the
 * deterministic engine, and report unpriced roles honestly.
 *
 * There is NO silent NG fallback: without an explicit marketCode the
 * adapter fails with a clear message so the AI asks the user for their
 * country/market instead of guessing.
 */

import type { EngineResult } from "./types";
import { registerEngine, quantityLine } from "./engines-registry";
import {
  fetchCalcRules,
  fetchEstimationMaterials,
  fetchMarketPriceBook,
} from "@/lib/estimation/queries";
import { resolveStructuralMarketPricing } from "@/lib/estimation/structural-market";
import { getCountryCurrency } from "@/lib/international/countries";
import type { EstimationMaterial } from "@/types/estimation";
import type {
  SteelGrade,
  SupportCondition,
  BeamType,
  SlabType,
} from "@/lib/engineering/structural-calculator";
import type {
  FoundationShape,
  SoilType,
} from "@/lib/engineering/foundation-calculator";
import type {
  ProjectComplexity,
  WorkforceSize,
  Season,
} from "@/lib/engineering/timeline-estimator";

function engineOk(
  id: string,
  quantities: EngineResult["quantities"],
  costs: EngineResult["costs"],
  raw: unknown,
): EngineResult {
  return {
    ok: true,
    engine: id,
    calculatedAt: new Date().toISOString(),
    quantities,
    costs,
    raw,
  };
}

function engineFail(id: string, error: string): EngineResult {
  return {
    ok: false,
    engine: id,
    calculatedAt: new Date().toISOString(),
    quantities: [],
    costs: null,
    raw: null,
    error,
  };
}

/** Shared structural line shape used by all three engines. */
interface StructuralLine {
  label: string;
  quantity: number | null;
  unit: string;
  line_total: number | null;
  unit_price?: number | null;
  material_slug?: string;
}

interface StructuralOutcome {
  ok: boolean;
  errors: string[];
  warnings: string[];
  lines: StructuralLine[];
  priced_subtotal: number;
  material_subtotal: number | null;
  labour_total: number;
  grand_total: number | null;
  missing: string[];
}

/**
 * Build the slug -> price map from the ACTIVE market's price book,
 * applying the structural market-pricing overlay (pack-size conversions,
 * per-tonne rebar anchors) exactly like the estimator pages.
 */
async function buildStructuralPriceMap(
  marketCode: string,
): Promise<Record<string, number | null>> {
  const [book, matsRes, marketPricing] = await Promise.all([
    fetchMarketPriceBook(marketCode),
    fetchEstimationMaterials(true),
    resolveStructuralMarketPricing(marketCode),
  ]);
  const map: Record<string, number | null> = {};
  for (const m of (matsRes.data ?? []) as EstimationMaterial[]) {
    map[m.slug] = book.byRef.get(m.id) ?? null;
  }
  for (const [k, v] of Object.entries(marketPricing.overrides)) {
    map[k] = v;
  }
  return map;
}

/** Async loaders so each engine module is imported exactly once per run. */
type StructuralEngineModule = {
  parseRules: (rows: unknown[]) => unknown;
  calculate: (
    input: unknown,
    rules: unknown,
    prices: Record<string, number | null>,
  ) => StructuralOutcome;
};

async function loadFoundationEngine(): Promise<StructuralEngineModule> {
  const m = await import("@/lib/estimation/foundation-engine");
  return {
    parseRules: (rows) => m.parseFoundationRules(rows as never),
    calculate: (input, rules, prices) =>
      m.calculateFoundation(
        input as never,
        rules as never,
        prices,
      ) as unknown as StructuralOutcome,
  };
}

async function loadDoorsWindowsEngine(): Promise<StructuralEngineModule> {
  const m = await import("@/lib/estimation/doors-windows-engine");
  return {
    parseRules: (rows) => m.parseDoorsWindowsRules(rows as never),
    calculate: (input, rules, prices) =>
      m.calculateDoorsWindows(
        input as never,
        rules as never,
        prices,
      ) as unknown as StructuralOutcome,
  };
}

async function loadReinforcementEngine(): Promise<StructuralEngineModule> {
  const m = await import("@/lib/estimation/reinforcement-engine");
  return {
    parseRules: (rows) => m.parseReinforcementRules(rows as never),
    calculate: (input, rules, prices) =>
      m.calculateReinforcement(
        input as never,
        rules as never,
        prices,
      ) as unknown as StructuralOutcome,
  };
}

/**
 * Per-engine input sanitation. Engines expect explicit nulls for
 * decision-pending quantities and a labour object; absent optional fields
 * get the SAME defaults the estimator pages use, and every default the
 * adapter applied is disclosed in raw.adapter_assumptions.
 */
const ENGINE_INPUT_SANITIZERS: Record<string, (raw: unknown) => unknown> = {
  foundation: (raw) => {
    const r = raw as Record<string, unknown>;
    return {
      ...r,
      concrete_volume_m3: r.concrete_volume_m3 ?? null,
      block_wall_area_m2: r.block_wall_area_m2 ?? null,
      hardcore_volume_m3: r.hardcore_volume_m3 ?? null,
      formwork_area_m2: r.formwork_area_m2 ?? null,
      labour: r.labour ?? { mode: "none" },
    };
  },
  doors_windows: (raw) => {
    const r = raw as Record<string, unknown>;
    return {
      ...r,
      include_locksets: r.include_locksets ?? true,
      labour: r.labour ?? { mode: "none" },
    };
  },
  reinforcement: (raw) => {
    const r = raw as Record<string, unknown>;
    return {
      ...r,
      len_12mm_m: r.len_12mm_m ?? null,
      len_16mm_m: r.len_16mm_m ?? null,
      len_20mm_m: r.len_20mm_m ?? null,
      len_25mm_m: r.len_25mm_m ?? null,
      labour: r.labour ?? { mode: "none" },
    };
  },
};

/** Which optional inputs the adapter defaulted (for disclosure). */
function listAdapterDefaults(raw: unknown, sanitized: unknown): string[] {
  const a = raw as Record<string, unknown>;
  const b = sanitized as Record<string, unknown>;
  const applied: string[] = [];
  for (const key of Object.keys(b)) {
    if (key !== "labour" && !(key in a) && b[key] !== undefined) {
      applied.push(
        `${key} = ${JSON.stringify(b[key])} (engine default, disclosed)`,
      );
    }
  }
  if (!("labour" in a))
    applied.push("labour = { mode: 'none' } (engine default, disclosed)");
  return applied;
}

function registerStructuralAdapter(
  engineId: string,
  ruleKey: "foundation" | "doors_windows" | "reinforcement",
  title: string,
  loadEngine: () => Promise<StructuralEngineModule>,
): void {
  registerEngine({
    id: engineId,
    domain: "building",
    title,
    authoritative: true,
    creditedAs: `Calculated by the authoritative FRELUX ${engineId.replace("_", " ")} engine`,
    async run(rawInput) {
      const typed = rawInput as { marketCode?: string };
      const marketCode = typed.marketCode?.trim().toUpperCase();
      if (!marketCode) {
        return engineFail(
          engineId,
          "Market code is required (e.g. NG, US, GB). FRELUX AI will not assume a country — specify the project location so the correct price book and methodology apply.",
        );
      }
      try {
        const [rulesRes, priceMap, engine] = await Promise.all([
          fetchCalcRules(ruleKey),
          buildStructuralPriceMap(marketCode),
          loadEngine(),
        ]);
        const rules = engine.parseRules(rulesRes.data ?? []);
        const sanitized = (ENGINE_INPUT_SANITIZERS[engineId] ?? ((r) => r))(
          rawInput,
        );
        const adapterDefaults = listAdapterDefaults(rawInput, sanitized);
        const result = engine.calculate(sanitized, rules, priceMap);
        if (!result.ok) {
          return engineFail(
            engineId,
            result.errors.join("; ") || `${engineId} calculation failed`,
          );
        }
        const quantities = result.lines
          .filter((l) => l.quantity != null && l.quantity > 0)
          .map((l) => quantityLine(l.label, l.quantity as number, l.unit));
        const currency = getCountryCurrency(marketCode) || "USD";
        const anyUnpriced = result.lines.some(
          (l) => l.quantity != null && l.unit_price == null,
        );
        return engineOk(
          engineId,
          quantities,
          {
            total: result.grand_total ?? result.priced_subtotal ?? 0,
            currency,
            lines: result.lines
              .filter((l) => l.line_total != null)
              .map((l) => ({
                label: l.label,
                amount: l.line_total as number,
              })),
            regionalDataAvailable: !anyUnpriced,
          },
          {
            ...result,
            marketCode,
            adapter_assumptions: adapterDefaults,
            unpriced_lines: result.lines
              .filter((l) => l.quantity != null && l.unit_price == null)
              .map((l) => l.label),
            missing: result.missing,
          },
        );
      } catch (err) {
        return engineFail(engineId, String(err));
      }
    },
  });
}

function registerStructuralCalculatorAdapter(): void {
  registerEngine({
    id: "structural_calculator",
    domain: "building",
    title: "FRELUX Structural Engineering Calculator",
    authoritative: true,
    creditedAs:
      "Calculated by the authoritative FRELUX structural engineering engine (BS 8110, Eurocode 2, ACI 318, IS 456)",
    async run(rawInput) {
      const typed = rawInput as Record<string, unknown>;
      const marketCode = (typed.marketCode as string | undefined)
        ?.trim()
        .toUpperCase();
      if (!marketCode) {
        return engineFail(
          "structural_calculator",
          "Market code is required (e.g. NG, US, GB). FRELUX AI will not assume a country — specify the project location so the correct engineering standards and member sizing apply.",
        );
      }
      try {
        const {
          designBeam,
          designColumn,
          designSlab,
          getConcreteStandardForMarket,
          resolveConcreteGrade,
        } = await import("@/lib/engineering/structural-calculator");

        const memberType = (
          (typed.member_type as string) || "beam"
        ).toLowerCase();
        const appliedDefaults: string[] = [];

        if (memberType === "column") {
          const axial_load =
            typeof typed.axial_load === "number" ? typed.axial_load : 200;
          const height = typeof typed.height === "number" ? typed.height : 3.0;
          if (
            Number.isNaN(axial_load) ||
            axial_load <= 0 ||
            Number.isNaN(height) ||
            height <= 0
          ) {
            return engineFail(
              "structural_calculator",
              "Invalid column dimensions or load",
            );
          }
          const defaultGrade =
            getConcreteStandardForMarket(marketCode).defaultGrade;
          const concrete_grade =
            (typed.concrete_grade as string) || defaultGrade;
          const steel_grade = ((typed.steel_grade as string) ||
            "Fe500") as SteelGrade;
          const cover_mm =
            typeof typed.cover_mm === "number" ? typed.cover_mm : 25;
          const is_rectangular = typed.is_rectangular !== false;
          const unbraced_height_ratio =
            typeof typed.unbraced_height_ratio === "number"
              ? typed.unbraced_height_ratio
              : 10;

          if (!typed.axial_load) appliedDefaults.push("axial_load = 200 kN");
          if (!typed.height) appliedDefaults.push("height = 3.0 m");

          const res = designColumn({
            axial_load,
            height,
            concrete_grade,
            steel_grade,
            cover_mm,
            is_rectangular,
            unbraced_height_ratio,
            market_code: marketCode,
          });

          const quantities = [
            quantityLine(
              "Column section",
              res.recommended_width,
              `× ${res.recommended_depth} mm`,
            ),
            quantityLine("Gross area", res.required_area, "mm²"),
            quantityLine(
              "Main reinforcement",
              res.recommended_bar_count,
              `T${res.recommended_bar_diameter}`,
            ),
            quantityLine(
              "Lateral ties",
              1,
              `T${res.link_diameter} @ ${res.link_spacing}mm c/c`,
            ),
          ];

          return engineOk("structural_calculator", quantities, null, {
            ...res,
            member_type: "column",
            marketCode,
            concrete_standard: resolveConcreteGrade(concrete_grade, marketCode)
              .standard,
            adapter_assumptions: appliedDefaults,
          });
        } else if (memberType === "slab") {
          const span_x = typeof typed.span_x === "number" ? typed.span_x : 4.0;
          const span_y = typeof typed.span_y === "number" ? typed.span_y : 6.0;
          if (
            Number.isNaN(span_x) ||
            span_x <= 0 ||
            Number.isNaN(span_y) ||
            span_y <= 0
          ) {
            return engineFail(
              "structural_calculator",
              "Invalid slab span dimensions",
            );
          }
          const defaultGrade =
            getConcreteStandardForMarket(marketCode).defaultGrade;
          const concrete_grade =
            (typed.concrete_grade as string) || defaultGrade;
          const steel_grade = ((typed.steel_grade as string) ||
            "Fe500") as SteelGrade;
          const cover_mm =
            typeof typed.cover_mm === "number" ? typed.cover_mm : 20;
          const slab_type = ((typed.slab_type as string) ||
            "one_way") as SlabType;
          const support_condition = ((typed.support_condition as string) ||
            "simply_supported") as SupportCondition;
          const live_load =
            typeof typed.live_load === "number" ? typed.live_load : 2.0;
          const dead_load =
            typeof typed.dead_load === "number" ? typed.dead_load : 1.5;

          if (!typed.span_x) appliedDefaults.push("span_x = 4.0 m");
          if (!typed.span_y) appliedDefaults.push("span_y = 6.0 m");

          const res = designSlab({
            span_x,
            span_y,
            slab_type,
            support_condition,
            live_load,
            dead_load,
            concrete_grade,
            steel_grade,
            cover_mm,
            market_code: marketCode,
          });

          const quantities = [
            quantityLine("Slab thickness", res.recommended_thickness, "mm"),
            quantityLine(
              "Steel area required",
              res.steel_area_required,
              "mm²/m",
            ),
            quantityLine(
              "Bottom reinforcement",
              1,
              `T${res.recommended_bar_diameter} @ ${res.recommended_bar_spacing}mm c/c`,
            ),
          ];

          return engineOk("structural_calculator", quantities, null, {
            ...res,
            member_type: "slab",
            marketCode,
            concrete_standard: resolveConcreteGrade(concrete_grade, marketCode)
              .standard,
            adapter_assumptions: appliedDefaults,
          });
        } else {
          // Beam (default)
          const span = typeof typed.span === "number" ? typed.span : 4.5;
          if (Number.isNaN(span) || span <= 0) {
            return engineFail("structural_calculator", "Invalid beam span");
          }
          const beam_type = ((typed.beam_type as string) ||
            "suspended_beam") as BeamType;
          const support_condition = ((typed.support_condition as string) ||
            "simply_supported") as SupportCondition;
          const live_load =
            typeof typed.live_load === "number" ? typed.live_load : 2.0;
          const dead_load =
            typeof typed.dead_load === "number" ? typed.dead_load : 3.0;
          const tributary_width =
            typeof typed.tributary_width === "number"
              ? typed.tributary_width
              : 3.0;
          const defaultGrade =
            getConcreteStandardForMarket(marketCode).defaultGrade;
          const concrete_grade =
            (typed.concrete_grade as string) || defaultGrade;
          const steel_grade = ((typed.steel_grade as string) ||
            "Fe500") as SteelGrade;
          const cover_mm =
            typeof typed.cover_mm === "number" ? typed.cover_mm : 25;

          if (!typed.span) appliedDefaults.push("span = 4.5 m");

          const res = designBeam({
            span,
            beam_type,
            support_condition,
            live_load,
            dead_load,
            tributary_width,
            concrete_grade,
            steel_grade,
            cover_mm,
            market_code: marketCode,
          });

          const quantities = [
            quantityLine("Beam depth", res.recommended_depth, "mm"),
            quantityLine("Beam width", res.recommended_width, "mm"),
            quantityLine(
              "Tension steel required",
              res.area_steel_required,
              "mm²",
            ),
            quantityLine(
              "Main reinforcement",
              res.recommended_bar_count,
              `T${res.recommended_bar_diameter}`,
            ),
            quantityLine(
              "Shear links",
              1,
              `T${res.link_diameter} @ ${res.link_spacing}mm c/c`,
            ),
          ];

          return engineOk("structural_calculator", quantities, null, {
            ...res,
            member_type: "beam",
            marketCode,
            concrete_standard: resolveConcreteGrade(concrete_grade, marketCode)
              .standard,
            adapter_assumptions: appliedDefaults,
          });
        }
      } catch (err) {
        return engineFail("structural_calculator", String(err));
      }
    },
  });
}

function registerFoundationCalculatorAdapter(): void {
  registerEngine({
    id: "foundation_calculator",
    domain: "building",
    title: "FRELUX Geotechnical Foundation Design Calculator",
    authoritative: true,
    creditedAs:
      "Calculated by the authoritative FRELUX foundation engineering engine (BS 8004 / Eurocode 7)",
    async run(rawInput) {
      const typed = rawInput as Record<string, unknown>;
      const marketCode = (typed.marketCode as string | undefined)
        ?.trim()
        .toUpperCase();
      if (!marketCode) {
        return engineFail(
          "foundation_calculator",
          "Market code is required (e.g. NG, US, GB). FRELUX AI will not assume a country — specify the project location so the correct geotechnical profile applies.",
        );
      }
      try {
        const { designFoundation } =
          await import("@/lib/engineering/foundation-calculator");

        const shape = ((typed.shape as string) || "strip") as FoundationShape;
        const soil_type = ((typed.soil_type as string) ||
          (marketCode === "NG" ? "lateritic" : "firm_clay")) as SoilType;
        const wall_load =
          typeof typed.wall_load === "number" ? typed.wall_load : 80;
        const column_load =
          typeof typed.column_load === "number" ? typed.column_load : undefined;
        const foundation_depth =
          typeof typed.foundation_depth === "number"
            ? typed.foundation_depth
            : 1.0;
        const concrete_grade = (typed.concrete_grade as string) || "C20";
        const building_length =
          typeof typed.building_length === "number"
            ? typed.building_length
            : 15;
        const building_width =
          typeof typed.building_width === "number" ? typed.building_width : 10;
        const safety_factor =
          typeof typed.safety_factor === "number" ? typed.safety_factor : 3.0;

        if (Number.isNaN(wall_load) || wall_load <= 0) {
          return engineFail(
            "foundation_calculator",
            "Invalid wall load for foundation design",
          );
        }

        const res = designFoundation({
          shape,
          soil_type,
          wall_load,
          column_load,
          foundation_depth,
          concrete_grade,
          building_length,
          building_width,
          safety_factor,
        });

        const quantities = [
          quantityLine("Footing width", res.recommended_width, "mm"),
          quantityLine("Excavation volume", res.excavation_volume, "m³"),
          quantityLine("Concrete volume", res.concrete_volume, "m³"),
          quantityLine("Blinding volume", res.blinding_volume, "m³"),
          quantityLine("Hardcore volume", res.hardcore_volume, "m³"),
        ];

        return engineOk("foundation_calculator", quantities, null, {
          ...res,
          marketCode,
        });
      } catch (err) {
        return engineFail("foundation_calculator", String(err));
      }
    },
  });
}

function registerSequencePlannerAdapter(): void {
  registerEngine({
    id: "sequence_planner",
    domain: "building",
    title: "FRELUX Construction Sequence Planner",
    authoritative: true,
    creditedAs:
      "Calculated by the authoritative FRELUX construction sequence planning engine",
    async run(rawInput) {
      const typed = rawInput as Record<string, unknown>;
      const marketCode = (typed.marketCode as string | undefined)
        ?.trim()
        .toUpperCase();
      if (!marketCode) {
        return engineFail(
          "sequence_planner",
          "Market code is required (e.g. NG, US, GB). FRELUX AI will not assume a country — specify the project location so the market's wall and structural methodology apply.",
        );
      }
      try {
        const { generateSequencePlan } =
          await import("@/lib/engineering/sequence-planner");

        const buildingType = typed.building_type as string | undefined;
        const plan = generateSequencePlan(buildingType, marketCode);

        const quantities = [
          quantityLine("Sequence steps", plan.total_steps, "stages"),
          quantityLine("Sequence stages", plan.stages.length, "phases"),
          quantityLine(
            "Quality gates",
            plan.quality_gates.length,
            "inspection gates",
          ),
        ];

        return engineOk("sequence_planner", quantities, null, {
          ...plan,
          marketCode,
        });
      } catch (err) {
        return engineFail("sequence_planner", String(err));
      }
    },
  });
}

function registerTimelineEstimatorAdapter(): void {
  registerEngine({
    id: "timeline_estimator",
    domain: "building",
    title: "FRELUX Climate-Aware Project Timeline Estimator",
    authoritative: true,
    creditedAs:
      "Calculated by the authoritative FRELUX climate-aware project timeline engine",
    async run(rawInput) {
      const typed = rawInput as Record<string, unknown>;
      const marketCode = (typed.marketCode as string | undefined)
        ?.trim()
        .toUpperCase();
      if (!marketCode) {
        return engineFail(
          "timeline_estimator",
          "Market code is required (e.g. NG, US, GB). FRELUX AI will not assume a country — specify the project location so climate multipliers and regional seasons apply.",
        );
      }
      try {
        const { estimateTimeline } =
          await import("@/lib/engineering/timeline-estimator");

        const building_length =
          typeof typed.building_length === "number"
            ? typed.building_length
            : 15;
        const building_width =
          typeof typed.building_width === "number" ? typed.building_width : 10;
        const number_of_floors =
          typeof typed.number_of_floors === "number"
            ? typed.number_of_floors
            : 1;
        const building_type = (typed.building_type as string) || "residential";
        const foundation_type = (typed.foundation_type as string) || "strip";
        const roof_type = (typed.roof_type as string) || "timber_truss";
        const complexity = ((typed.complexity as string) ||
          "standard") as ProjectComplexity;
        const workforce = ((typed.workforce as string) ||
          "medium") as WorkforceSize;
        const season = ((typed.season as string) || "dry") as Season;
        const has_engineer_schedule = typed.has_engineer_schedule === true;

        if (
          Number.isNaN(building_length) ||
          building_length <= 0 ||
          Number.isNaN(building_width) ||
          building_width <= 0
        ) {
          return engineFail(
            "timeline_estimator",
            "Invalid building dimensions for timeline estimation",
          );
        }

        const res = estimateTimeline({
          building_length,
          building_width,
          number_of_floors,
          building_type,
          foundation_type,
          roof_type,
          complexity,
          workforce,
          season,
          has_engineer_schedule,
          market_code: marketCode,
        });

        const quantities = [
          quantityLine("Total duration", res.total_days, "working days"),
          quantityLine("Duration in weeks", res.total_weeks, "weeks"),
          quantityLine("Duration in months", res.total_months, "months"),
          ...res.stages.map((st) =>
            quantityLine(st.stage_label, st.estimated_days, "days"),
          ),
        ];

        return engineOk("timeline_estimator", quantities, null, {
          ...res,
          marketCode,
        });
      } catch (err) {
        return engineFail("timeline_estimator", String(err));
      }
    },
  });
}

export function registerStructuralEngines(): void {
  registerStructuralAdapter(
    "foundation",
    "foundation",
    "FRELUX International Foundation Engine",
    loadFoundationEngine,
  );
  registerStructuralAdapter(
    "doors_windows",
    "doors_windows",
    "FRELUX International Doors & Windows Engine",
    loadDoorsWindowsEngine,
  );
  registerStructuralAdapter(
    "reinforcement",
    "reinforcement",
    "FRELUX International Reinforcement Engine",
    loadReinforcementEngine,
  );
  registerStructuralCalculatorAdapter();
  registerFoundationCalculatorAdapter();
  registerSequencePlannerAdapter();
  registerTimelineEstimatorAdapter();
}
