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
      m.calculateFoundation(input as never, rules as never, prices) as unknown as StructuralOutcome,
  };
}

async function loadDoorsWindowsEngine(): Promise<StructuralEngineModule> {
  const m = await import("@/lib/estimation/doors-windows-engine");
  return {
    parseRules: (rows) => m.parseDoorsWindowsRules(rows as never),
    calculate: (input, rules, prices) =>
      m.calculateDoorsWindows(input as never, rules as never, prices) as unknown as StructuralOutcome,
  };
}

async function loadReinforcementEngine(): Promise<StructuralEngineModule> {
  const m = await import("@/lib/estimation/reinforcement-engine");
  return {
    parseRules: (rows) => m.parseReinforcementRules(rows as never),
    calculate: (input, rules, prices) =>
      m.calculateReinforcement(input as never, rules as never, prices) as unknown as StructuralOutcome,
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
      applied.push(`${key} = ${JSON.stringify(b[key])} (engine default, disclosed)`);
    }
  }
  if (!("labour" in a)) applied.push("labour = { mode: 'none' } (engine default, disclosed)");
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
        const sanitized = (ENGINE_INPUT_SANITIZERS[engineId] ?? ((r) => r))(rawInput);
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
}
