// =========================================================
// FRELUX AI FOUNDATION, Authoritative Engine Registry
//
// THE AI → DETERMINISTIC BOUNDARY.
//
// Every engine registered here is an EXISTING, authoritative FRELUX
// calculator. The AI orchestration layer may ONLY obtain quantities,
// geometry, material requirements and costs by calling a registered
// engine with `executeEngine`. There is no other sanctioned path and
// no code path for the AI to compute construction mathematics itself.
//
// Existing engines are reused as-is, their formulas are untouched
// and remain the single source of truth.
// =========================================================

import type {
  EngineCostSummary,
  EngineQuantityLine,
  EngineResult,
} from "./types";
import {
  auditFinite,
  normalizeCostSummary,
  normalizeQuantityLine,
} from "./precision";

export interface EngineDescriptor {
  /** Stable id. The orchestrator/agents reference engines by this id only. */
  id: string;
  domain: string; // building | painting | roofing | finishing | measurement
  title: string;
  /** Authoritative, always true; registered engines are THE truth for their math. */
  authoritative: true;
  /** Human note shown in AI surfaces: who calculated this. */
  creditedAs: string;
  /**
   * Deterministic execution. `input` is validated/normalized by the
   * requirements layer before it reaches the engine; the engine output
   * is normalized to EngineResult (quantities + costs + raw).
   */
  run: (input: unknown) => Promise<EngineResult>;
}

export class EngineNotRegisteredError extends Error {
  constructor(public engineId: string) {
    super(
      `Engine "${engineId}" is not registered. FRELUX AI may only call registered deterministic engines and will not approximate its mathematics.`,
    );
    this.name = "EngineNotRegisteredError";
  }
}

// =========================================================
// Build-to-Roof input defaults
//
// Mirrors the defaults the existing BuildToRoofEstimator page ships
// (the same smart defaults users already see). Reused, not reinvented.
// Wastage/prices/labour constants come from the engine itself, so the
// engine stays the single source of truth for its own configuration.
// =========================================================

export interface BuildToRoofInputLike {
  project_name: string;
  location: string;
  building_type: string;
  number_of_floors: number;
  measurement_unit: "m" | "ft";
  building_length: number;
  building_width: number;
  floor_to_floor_height: number;
  wall_thickness: number;
  internal_wall_length: number;
  internal_wall_thickness: number;
  openings: Array<{
    type: string;
    width: number;
    height: number;
    count: number;
  }>;
  foundation_type: string;
  foundation_depth: number;
  foundation_width: number;
  footing_thickness: number;
  blinding_thickness: number;
  hardcore_thickness: number;
  dpc_length: number;
  block_size: string;
  block_length: number;
  block_height: number;
  block_width: number;
  concrete_mix_cement: number;
  concrete_mix_sand: number;
  concrete_mix_granite: number;
  mortar_mix_cement: number;
  mortar_mix_sand: number;
  roof_type: string;
  roof_pitch_degrees: number;
  roof_overhang: number;
  roofing_material: string;
  structural_members: unknown[];
  has_engineer_schedule: boolean;
  contingency_percent: number;
  wastage?: unknown;
  prices?: unknown;
  labour?: unknown;
}

/**
 * Smart defaults, identical to the values the existing estimator page
 * pre-fills. Every value filled from here is labelled as an assumption
 * by the requirements layer (origin: smart_default).
 */
export function defaultBuildToRoofInput(): BuildToRoofInputLike {
  return {
    project_name: "My building",
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
    contingency_percent: 5,
  };
}

// =========================================================
// Result normalization helpers
// =========================================================

/** Guard: all numeric engine inputs must be finite, else error, never NaN math. */
export function requireFiniteNumbers(
  values: Record<string, unknown>,
): string | null {
  for (const [key, value] of Object.entries(values)) {
    const n = Number(value);
    if (!Number.isFinite(n)) return `Invalid numeric input for "${key}"`;
  }
  return null;
}

export function quantityLine(
  label: string,
  quantity: number,
  unit: string,
): EngineQuantityLine {
  return { label, quantity, unit };
}

// =========================================================
// THE REGISTRY
// =========================================================

const REGISTRY = new Map<string, EngineDescriptor>();

/**
 * A second engine claiming an id that is already taken is refused.
 *
 * The registry used to assign unconditionally, so two modules declaring the
 * same id silently resolved to whichever imported last: the AI layer would
 * credit one engine while executing another, with no error anywhere. An id
 * identifies the authoritative implementation of a calculation, and two
 * candidates for one id is a defect, not a configuration.
 */
export class DuplicateEngineIdError extends Error {
  constructor(
    public engineId: string,
    public existingTitle: string,
    public incomingTitle: string,
  ) {
    super(
      `Engine id '${engineId}' is already registered by "${existingTitle}", so "${incomingTitle}" cannot take it. One id, one authoritative engine: give the new engine its own id, or remove the one it replaces.`,
    );
    this.name = "DuplicateEngineIdError";
  }
}

export function registerEngine(descriptor: EngineDescriptor): void {
  const existing = REGISTRY.get(descriptor.id);
  if (existing) {
    // Modules re-register their own engines, sometimes on every call, with a
    // freshly built descriptor each time. Same id, same title and same domain
    // is that engine registering again: the newer object replaces the older
    // one quietly, which is what the callers already assume.
    //
    // A different title under a taken id is a different engine claiming an
    // identity it does not own, and that is refused.
    const sameEngine =
      existing.title === descriptor.title &&
      existing.domain === descriptor.domain;
    if (sameEngine) {
      REGISTRY.set(descriptor.id, descriptor);
      return;
    }
    throw new DuplicateEngineIdError(
      descriptor.id,
      existing.title,
      descriptor.title,
    );
  }
  REGISTRY.set(descriptor.id, descriptor);
}

// ── Build-to-Roof: whole-building quantities & costs (existing engine) ──
registerEngine({
  id: "build_to_roof",
  domain: "building",
  title: "FRELUX Build-to-Roof Engine",
  authoritative: true,
  creditedAs: "Calculated by the authoritative FRELUX Build-to-Roof engine",
  async run(rawInput) {
    const {
      calculateBuildToRoof,
      DEFAULT_PRICES,
      DEFAULT_LABOUR,
      DEFAULT_WASTAGE,
    } = await import("@/lib/estimation/build-to-roof-engine");
    // Nigerian prices and labour are the engine's reference book, not a world
    // price list. They are only injected for a Nigerian run; every other market
    // has to bring its own, and the engine refuses to price without one.
    const requested = (rawInput ?? {}) as {
      market_code?: string;
      market?: string;
    };
    const marketCode = String(requested.market_code ?? requested.market ?? "NG")
      .trim()
      .toUpperCase();
    const nigerian = marketCode === "NG";
    const input = {
      ...defaultBuildToRoofInput(),
      ...(rawInput as Partial<BuildToRoofInputLike>),
      market_code: marketCode,
      wastage: DEFAULT_WASTAGE,
      ...(nigerian ? { labour: DEFAULT_LABOUR, prices: DEFAULT_PRICES } : {}),
    } as never; // the engine owns the authoritative input type

    const result = calculateBuildToRoof(input);
    const quantities: EngineQuantityLine[] = [];
    const costLines: Array<{ label: string; amount: number }> = [];

    for (const stage of result.stages ?? []) {
      for (const m of stage.materials ?? []) {
        quantities.push(quantityLine(m.label, m.final_quantity, m.unit));
        costLines.push({ label: m.label, amount: m.total_cost });
      }
      const labourCost = stage.labour_total ?? 0;
      if (labourCost > 0) {
        costLines.push({
          label: `Labour, ${stage.stage_label}`,
          amount: labourCost,
        });
      }
    }

    const costs: EngineCostSummary = {
      total: result.grand_total,
      currency: "NGN",
      lines: costLines,
      // Engine ships price staleness, surface it honestly.
      regionalDataAvailable: !result.price_stale,
    };

    return {
      ok: true,
      engine: "build_to_roof",
      calculatedAt: new Date().toISOString(),
      quantities,
      costs,
      raw: result,
    };
  },
});

// ── Takeoff: measured schedule to a bill of quantities ──
//
// The takeoff engine is the one that measures rooms, walls, openings and floors
// and derives the materials from them. It is exposed here so the commercial API
// reaches the same code the studio runs, rather than a second implementation.
//
// It is quantity-only: pricing lives in the price book, so costs are null rather
// than a number this engine cannot justify. An input it cannot measure comes
// back as a refusal with the reason, never as zeros.
registerEngine({
  id: "takeoff",
  domain: "estimation",
  title: "FRELUX Takeoff Engine",
  authoritative: true,
  creditedAs: "Calculated by the authoritative FRELUX takeoff engine",
  async run(rawInput) {
    const { runTakeoff, ALL_SCOPES } = await import("@/lib/takeoff/engine");
    const supplied = (rawInput ?? {}) as {
      rooms?: unknown;
      scopes?: unknown;
      specs?: unknown;
      market?: unknown;
    };

    const refuse = (error: string): EngineResult => ({
      ok: false,
      engine: "takeoff",
      calculatedAt: new Date().toISOString(),
      quantities: [],
      costs: null,
      raw: { refusal: error },
      error,
    });

    if (!Array.isArray(supplied.rooms) || supplied.rooms.length === 0) {
      return refuse(
        "A takeoff needs at least one room. Send rooms: [{ walls: [{ length, height }], floor: { length, width } }].",
      );
    }

    let scopes = ALL_SCOPES;
    if (supplied.scopes !== undefined) {
      if (!Array.isArray(supplied.scopes) || supplied.scopes.length === 0) {
        return refuse(
          `scopes must be a non-empty array. Valid scopes: ${ALL_SCOPES.join(", ")}.`,
        );
      }
      const unknown = supplied.scopes.filter(
        (scope) => !ALL_SCOPES.includes(scope as never),
      );
      if (unknown.length) {
        return refuse(
          `Unknown scope${unknown.length === 1 ? "" : "s"} ${unknown.join(", ")}. Valid scopes: ${ALL_SCOPES.join(", ")}.`,
        );
      }
      scopes = supplied.scopes as never;
    }

    if (
      supplied.specs !== undefined &&
      (supplied.specs === null ||
        typeof supplied.specs !== "object" ||
        Array.isArray(supplied.specs))
    ) {
      return refuse("specs must be an object of material overrides.");
    }

    const result = runTakeoff({ id: "api", rooms: supplied.rooms } as never, {
      scopes,
      specs: (supplied.specs ?? {}) as never,
    });

    const quantities: EngineQuantityLine[] = result.lines
      .filter((line) => Number.isFinite(line.quantity) && line.quantity > 0)
      .map((line) =>
        quantityLine(
          `${line.scope}: ${line.description}`,
          line.quantity,
          line.unit,
        ),
      );

    if (!quantities.length) {
      return refuse(
        result.warnings.length
          ? `Nothing was measurable. ${result.warnings.join(" ")}`
          : "Nothing was measurable. Check that each room has a wall length and height, or a floor length and width.",
      );
    }

    return {
      ok: true,
      engine: "takeoff",
      calculatedAt: new Date().toISOString(),
      quantities,
      // Quantity-only. Pricing is a separate, priced source; inventing a cost
      // here would be the exact failure this API exists to avoid.
      costs: null,
      raw: {
        lines: result.lines,
        totals: result.totals,
        warnings: result.warnings,
        assumedLineCount: result.assumedLineCount,
        scopes,
        market: typeof supplied.market === "string" ? supplied.market : null,
      },
    };
  },
});

// ── Window blinds: schedule priced from measured openings (existing engine) ──
interface BlindProjectInputLike {
  market: string;
  unit: "m" | "ft";
  grade: "standard" | "premium";
  openings: Array<{
    id: string;
    label: string;
    typeKey: string;
    width: number;
    height: number;
    quantity: number;
    motorised?: boolean;
  }>;
  install?: boolean;
  extras?: Record<string, number>;
  manualPerM2?: number;
  manualMinimumPerWindow?: number;
}

registerEngine({
  id: "window_blinds",
  domain: "finishing",
  title: "FRELUX Window Blind Engine",
  authoritative: true,
  creditedAs: "Calculated by the authoritative FRELUX window blind engine",
  async run(rawInput) {
    const { calculateBlindProject } =
      await import("@/lib/estimation/window-blinds-engine");
    const supplied = (rawInput ?? {}) as Partial<BlindProjectInputLike>;
    const openings = supplied.openings?.length
      ? supplied.openings
      : [
          {
            id: "default",
            label: "Window",
            typeKey: "day-night",
            width: 4,
            height: 4,
            quantity: 1,
          },
        ];
    const input = {
      market: supplied.market ?? "NG",
      unit: supplied.unit ?? "ft",
      grade: supplied.grade ?? "standard",
      openings,
      install: supplied.install,
      extras: supplied.extras,
      manualPerM2: supplied.manualPerM2,
      manualMinimumPerWindow: supplied.manualMinimumPerWindow,
    } as never;

    const result = calculateBlindProject(input);
    const quantities: EngineQuantityLine[] = result.rows.map((row) =>
      normalizeQuantityLine({
        label: `${row.typeLabel} blind, ${row.label}`,
        quantity: row.quantity,
        unit: "no",
      }),
    );
    quantities.push(
      normalizeQuantityLine({
        label: "Charged blind area",
        quantity: result.geometry.totalChargeableAreaM2,
        unit: "m2",
      }),
    );

    const priced = result.totals.total !== null;
    const costs: EngineCostSummary | null = priced
      ? normalizeCostSummary({
          total: result.totals.total as number,
          currency: result.currency ?? "NGN",
          lines: [
            { label: "Blinds", amount: result.totals.blinds ?? 0 },
            { label: "Extras", amount: result.totals.extras ?? 0 },
            { label: "Fitting", amount: result.totals.installation ?? 0 },
          ],
          regionalDataAvailable:
            result.status === "priced" && result.currency !== null,
        })
      : null;

    return {
      ok: true,
      engine: "window_blinds",
      calculatedAt: new Date().toISOString(),
      quantities,
      costs,
      raw: result,
    };
  },
});

// ── Roof geometry (existing engine function) ──
registerEngine({
  id: "roof_geometry",
  domain: "roofing",
  title: "FRELUX Roof Geometry Engine",
  authoritative: true,
  creditedAs: "Calculated by the authoritative FRELUX roof geometry functions",
  async run(rawInput) {
    const { calculateRoofArea } =
      await import("@/lib/estimation/build-to-roof-engine");
    const input = rawInput as {
      building_length: number;
      building_width: number;
      roof_type: string;
      roof_pitch_degrees: number;
      roof_overhang: number;
    };
    const invalidR = requireFiniteNumbers({
      building_length: input.building_length,
      building_width: input.building_width,
      roof_pitch_degrees: input.roof_pitch_degrees,
      roof_overhang: input.roof_overhang,
    });
    if (invalidR) {
      return {
        ok: false,
        engine: "roof_geometry",
        calculatedAt: new Date().toISOString(),
        quantities: [],
        costs: null,
        raw: null,
        error: invalidR,
      };
    }
    // Authoritative signature: (length, width, pitch, overhang, roofType)
    const area = calculateRoofArea(
      input.building_length,
      input.building_width,
      input.roof_pitch_degrees,
      input.roof_overhang,
      input.roof_type,
    );
    return {
      ok: true,
      engine: "roof_geometry",
      calculatedAt: new Date().toISOString(),
      quantities: [quantityLine("Roof area", Number(area), "m²")],
      costs: null,
      raw: { roofArea: area },
    };
  },
});

// ── Painting wall area (existing engine function) ──
registerEngine({
  id: "painting_wall_area",
  domain: "painting",
  title: "FRELUX Painting Engine, Wall Area",
  authoritative: true,
  creditedAs: "Calculated by the authoritative FRELUX painting engine",
  async run(rawInput) {
    const { calculateWallArea } =
      await import("@/lib/estimation/painting-engine");
    const input = rawInput as { length: number; width: number; height: number };
    const invalid = requireFiniteNumbers(
      input as unknown as Record<string, unknown>,
    );
    if (invalid) {
      return {
        ok: false,
        engine: "painting_wall_area",
        calculatedAt: new Date().toISOString(),
        quantities: [],
        costs: null,
        raw: null,
        error: invalid,
      };
    }
    const area = calculateWallArea(input.length, input.width, input.height);
    return {
      ok: true,
      engine: "painting_wall_area",
      calculatedAt: new Date().toISOString(),
      quantities: [quantityLine("Paintable wall area", Number(area), "m²")],
      costs: null,
      raw: { wallArea: area },
    };
  },
});

// ── Tyrolene partition area (existing engine function) ──
registerEngine({
  id: "tyrolene_partition_area",
  domain: "finishing",
  title: "FRELUX Tyrolene Engine, Partition Area",
  authoritative: true,
  creditedAs: "Calculated by the authoritative FRELUX tyrolene engine",
  async run(rawInput) {
    const { calculatePartitionArea } =
      await import("@/lib/estimation/tyrolene-engine");
    const input = rawInput as { width: number; height: number };
    const invalidT = requireFiniteNumbers(
      input as unknown as Record<string, unknown>,
    );
    if (invalidT) {
      return {
        ok: false,
        engine: "tyrolene_partition_area",
        calculatedAt: new Date().toISOString(),
        quantities: [],
        costs: null,
        raw: null,
        error: invalidT,
      };
    }
    const area = calculatePartitionArea(input.width, input.height);
    return {
      ok: true,
      engine: "tyrolene_partition_area",
      calculatedAt: new Date().toISOString(),
      quantities: [quantityLine("Tyrolene partition area", Number(area), "m²")],
      costs: null,
      raw: { partitionArea: area },
    };
  },
});

// =========================================================
// PUBLIC API
// =========================================================

// ── Plastering: cement, sand and water for a rendered wall ──
//
// Engine Studio could not run the plastering engine at all, so an operator
// checking a wall's cement bags had to open the calculator page and retype the
// inputs. This adapter reaches the same function that page uses, so the number
// produced here is the number the site produces.
interface PlasteringInputLike {
  marketCode?: string;
  surfaceAreaM2?: number;
  wallLengthM?: number;
  wallHeightM?: number;
  wallCount?: number;
  thicknessMm?: number;
  coats?: 1 | 2;
  mixRatio?: "1:3" | "1:4" | "1:5" | "1:6";
  wastePercent?: number;
}

registerEngine({
  id: "plastering_wall",
  domain: "finishing",
  title: "FRELUX Plastering Engine",
  authoritative: true,
  creditedAs: "Calculated by the authoritative FRELUX plastering engine",
  async run(rawInput) {
    const { calculatePlasteringTakeoff } =
      await import("@/lib/estimation/plastering-standalone-engine");
    const supplied = (rawInput ?? {}) as PlasteringInputLike;

    // Defaults describe one 10 m x 3 m wall, 15 mm, two coats, 1:4. They are
    // the calculator page's own starting point, not a new set of assumptions.
    const input = {
      marketCode: supplied.marketCode ?? "NG",
      surfaceAreaM2: supplied.surfaceAreaM2,
      wallLengthM: supplied.wallLengthM ?? 10,
      wallHeightM: supplied.wallHeightM ?? 3,
      wallCount: supplied.wallCount ?? 1,
      thicknessMm: supplied.thicknessMm ?? 15,
      coats: supplied.coats ?? 2,
      mixRatio: supplied.mixRatio ?? "1:4",
      wastePercent: supplied.wastePercent ?? 5,
    } as never;

    const result = calculatePlasteringTakeoff(input);

    const quantities: EngineQuantityLine[] = [
      quantityLine("Cement", result.cementBagsRequired, "bags"),
      quantityLine("Sand", result.sandVolumeM3, "m³"),
      quantityLine("Water", result.waterLiters, "litres"),
    ];
    if (result.bondingAgentLiters) {
      quantities.push(
        quantityLine("Bonding agent", result.bondingAgentLiters, "litres"),
      );
    }

    return {
      ok: true,
      engine: "plastering_wall",
      calculatedAt: new Date().toISOString(),
      quantities,
      // Quantity-only: prices belong to the priced sources, not to this engine.
      costs: null,
      raw: result,
    };
  },
});

// ── Structural steel: section mass and tonnage for a beam run ──
//
// Engine Studio could not check a steel beam at all. This adapter reaches the
// same calculateSteelBeam the calculator page uses, with the buyer's own rate
// left optional: a tonnage is a quantity, and pricing without a rate would be
// invented.
interface SteelBeamInputLike {
  profile?: string;
  span_m?: number;
  beam_count?: number;
  price_per_tonne?: number | null;
  columns_included?: boolean;
}

registerEngine({
  id: "steel_beam",
  domain: "structure",
  title: "FRELUX Structural Steel Beam Engine",
  authoritative: true,
  creditedAs: "Calculated by the authoritative FRELUX structural steel engine",
  async run(rawInput) {
    const { calculateSteelBeam } =
      await import("@/lib/estimation/steel-beam-engine");
    const supplied = (rawInput ?? {}) as SteelBeamInputLike;

    // IPE 180 over a 5 m domestic floor span is the calculator's own starting
    // point, not a new assumption.
    const input = {
      profile: supplied.profile ?? "ipe_180",
      span_m: supplied.span_m ?? 5,
      beam_count: supplied.beam_count ?? 1,
      price_per_tonne: supplied.price_per_tonne ?? null,
      columns_included: supplied.columns_included ?? false,
    } as never;

    const result = calculateSteelBeam(input, {});

    if (!result.ok) {
      return {
        ok: false,
        engine: "steel_beam",
        calculatedAt: new Date().toISOString(),
        quantities: [],
        costs: null,
        raw: result,
        error:
          result.errors.join(" ") || "The steel engine rejected the input.",
      };
    }

    const quantities: EngineQuantityLine[] = result.lines
      .filter((line) => line.quantity !== null)
      .map((line) =>
        quantityLine(line.label, Number(line.quantity), line.unit),
      );

    return {
      ok: true,
      engine: "steel_beam",
      calculatedAt: new Date().toISOString(),
      quantities,
      costs: null,
      raw: result,
    };
  },
});

// ── Foundation: concrete, blockwork, hardcore and formwork below DPC ──
//
// The foundation engine takes rules and a price map. The rules it ships with
// are passed through untouched; the price map stays empty, because this
// adapter answers "how much", not "how much does it cost".
registerEngine({
  id: "foundation_below_dpc",
  domain: "structure",
  title: "FRELUX Foundation Engine",
  authoritative: true,
  creditedAs: "Calculated by the authoritative FRELUX foundation engine",
  async run(rawInput) {
    const { calculateFoundation, DEFAULT_FOUNDATION_RULES } =
      await import("@/lib/estimation/foundation-engine");
    const supplied = (rawInput ?? {}) as Record<string, unknown>;

    const input = {
      concrete_volume_m3: Number(supplied.concrete_volume_m3 ?? 12),
      block_wall_area_m2: Number(supplied.block_wall_area_m2 ?? 40),
      hardcore_volume_m3: Number(supplied.hardcore_volume_m3 ?? 8),
      formwork_area_m2:
        supplied.formwork_area_m2 === undefined
          ? 20
          : supplied.formwork_area_m2 === null
            ? null
            : Number(supplied.formwork_area_m2),
      labour: (supplied.labour as never) ?? { mode: "none" },
    } as never;

    const result = calculateFoundation(input, DEFAULT_FOUNDATION_RULES, {});

    const quantities: EngineQuantityLine[] = result.lines
      .filter((line) => line.quantity !== null)
      .map((line) =>
        quantityLine(line.label, Number(line.quantity), line.unit),
      );

    return {
      ok: result.ok,
      engine: "foundation_below_dpc",
      calculatedAt: new Date().toISOString(),
      quantities,
      costs: null,
      raw: result,
      ...(result.ok
        ? {}
        : {
            error:
              result.errors.join(" ") ||
              "The foundation engine rejected the input.",
          }),
    };
  },
});

// ── ICF walls: blocks, concrete and reinforcement for an insulated wall ──
interface IcfInputLike {
  wallLengthM?: number;
  wallHeightM?: number;
  coreThicknessMm?: number;
  foamType?: string;
}

registerEngine({
  id: "icf_wall",
  domain: "structure",
  title: "FRELUX ICF Wall Engine",
  authoritative: true,
  creditedAs: "Calculated by the authoritative FRELUX ICF wall engine",
  async run(rawInput) {
    const { calculateIcfWall } = await import("@/lib/estimation/icf-engine");
    const supplied = (rawInput ?? {}) as IcfInputLike;

    // A 20 m perimeter at 2.7 m with a 150 mm core: the calculator's own
    // starting point for a domestic wall.
    const input = {
      wallLengthM: supplied.wallLengthM ?? 20,
      wallHeightM: supplied.wallHeightM ?? 2.7,
      coreThicknessMm: supplied.coreThicknessMm ?? 150,
      foamType: supplied.foamType ?? "eps",
    } as never;

    const result = calculateIcfWall(input);

    const quantities: EngineQuantityLine[] = [
      quantityLine(
        "ICF blocks (total)",
        result.blocks.totalBlocksCount,
        "blocks",
      ),
      quantityLine(
        "ICF straight blocks",
        result.blocks.straightBlocksCount,
        "blocks",
      ),
      quantityLine(
        "ICF 90 degree corners",
        result.blocks.corner90BlocksCount,
        "units",
      ),
      quantityLine("Net wall area", result.geometry.netWallAreaM2, "m²"),
      quantityLine("Concrete in core", result.concrete.totalVolumeM3, "m³"),
      quantityLine(
        "Vertical reinforcement",
        result.reinforcement.verticalTotalWeightKg,
        "kg",
      ),
    ];

    return {
      ok: result.ok,
      engine: "icf_wall",
      calculatedAt: new Date().toISOString(),
      quantities,
      costs: null,
      raw: result,
      ...(result.ok
        ? {}
        : {
            error:
              result.errors.join(" ") || "The ICF engine rejected the input.",
          }),
    };
  },
});

// ── Concrete takeoff: volume, cement, sand and aggregate for one element ──
interface ConcreteTakeoffInputLike {
  elementType?: string;
  lengthM?: number;
  widthM?: number;
  depthM?: number;
  cementParts?: number;
  sandParts?: number;
  aggregateParts?: number;
  wastePercent?: number;
  cementBagMassKg?: number;
}

registerEngine({
  id: "concrete_takeoff",
  domain: "structure",
  title: "FRELUX Concrete Takeoff Engine",
  authoritative: true,
  creditedAs: "Calculated by the authoritative FRELUX concrete takeoff engine",
  async run(rawInput) {
    const { calculateConcreteTakeoff } =
      await import("@/lib/estimation/advanced-takeoff-engine");
    const supplied = (rawInput ?? {}) as ConcreteTakeoffInputLike;

    // A 5 m by 4 m slab at 150 mm on a 1:2:4 mix with 5 percent waste.
    const input = {
      elementType: supplied.elementType ?? "slab",
      lengthM: supplied.lengthM ?? 5,
      widthM: supplied.widthM ?? 4,
      depthM: supplied.depthM ?? 0.15,
      cementParts: supplied.cementParts ?? 1,
      sandParts: supplied.sandParts ?? 2,
      aggregateParts: supplied.aggregateParts ?? 4,
      wastePercent: supplied.wastePercent ?? 5,
      cementBagMassKg: supplied.cementBagMassKg ?? 50,
    } as never;

    const outcome = calculateConcreteTakeoff(input);
    if (!outcome.ok || !outcome.data) {
      return {
        ok: false,
        engine: "concrete_takeoff",
        calculatedAt: new Date().toISOString(),
        quantities: [],
        costs: null,
        raw: outcome,
        error:
          outcome.errors.join(" ") ||
          "The concrete takeoff engine rejected the input.",
      };
    }

    const result = outcome.data;
    const quantities: EngineQuantityLine[] = [
      quantityLine("Concrete volume", result.concreteVolumeM3, "m³"),
      quantityLine("Volume with waste", result.volumeWithWasteM3, "m³"),
      quantityLine("Cement bags to buy", result.cementBagsToBuy, "bags"),
      quantityLine("Sand", result.sandM3, "m³"),
      quantityLine("Aggregate", result.aggregateM3, "m³"),
    ];
    if (result.rebarWeightKg !== null) {
      quantities.push(quantityLine("Rebar", result.rebarWeightKg, "kg"));
    }

    return {
      ok: true,
      engine: "concrete_takeoff",
      calculatedAt: new Date().toISOString(),
      quantities,
      costs: null,
      raw: result,
    };
  },
});

export function listEngines(): EngineDescriptor[] {
  return [...REGISTRY.values()];
}

export function getEngineDescriptor(engineId: string): EngineDescriptor | null {
  return REGISTRY.get(engineId) ?? null;
}

/**
 * The single sanctioned execution path for AI surfaces.
 * Unknown ids throw, the AI never falls back to its own math.
 */
export async function executeEngine(
  engineId: string,
  input: unknown,
): Promise<EngineResult> {
  const descriptor = REGISTRY.get(engineId);
  if (!descriptor) throw new EngineNotRegisteredError(engineId);
  try {
    const result = await descriptor.run(input);
    // The precision boundary: an external model will repeat these numbers
    // verbatim, so float noise and non-finite values stop here rather than
    // becoming someone's invoice line or a silent zero.
    if (result.ok) {
      const { nonFinite } = auditFinite(result.quantities, result.costs);
      if (nonFinite.length > 0) {
        return {
          ...result,
          ok: false,
          quantities: [],
          costs: null,
          raw: null,
          error: `Engine "${engineId}" produced a non-finite value (${nonFinite.join(", ")}). Check the inputs: this usually means a zero or negative divisor, such as a tile size or package size that was never supplied.`,
        };
      }
      return {
        ...result,
        quantities: result.quantities.map(normalizeQuantityLine),
        costs: result.costs ? normalizeCostSummary(result.costs) : null,
      };
    }
    return result;
  } catch (error) {
    return {
      ok: false,
      engine: engineId,
      calculatedAt: new Date().toISOString(),
      quantities: [],
      costs: null,
      raw: null,
      error: error instanceof Error ? error.message : "Engine execution failed",
    };
  }
}

// ── Quote Check: a quote measured against the price book ──
//
// The reference prices are supplied by the caller, because only the page
// knows which market the user is in and which price row resolved. The
// engine owns the comparison arithmetic and nothing else.
registerEngine({
  id: "quote_check",
  domain: "cost",
  title: "FRELUX Quote Check Engine",
  authoritative: true,
  creditedAs: "Calculated by the authoritative FRELUX Quote Check engine",
  async run(rawInput) {
    const { checkQuote } = await import("@/lib/estimation/quote-check-engine");
    const input = (rawInput ?? {}) as {
      lines?: Parameters<typeof checkQuote>[0];
      fairBandFraction?: number;
    };
    const result = checkQuote(input.lines ?? [], {
      fairBandFraction: input.fairBandFraction,
    });
    const quantities: EngineQuantityLine[] = result.lines
      .filter((line) => line.quantity > 0)
      .map((line) =>
        quantityLine(
          `${line.description} (${line.status})`,
          line.quantity,
          line.unit || "unit",
        ),
      );
    const costLines: Array<{ label: string; amount: number }> = [
      { label: "Quoted total", amount: result.quotedTotal },
      {
        label: "Comparable lines at market",
        amount: result.comparableReferenceTotal,
      },
      { label: "Above market", amount: result.overpricedAmount },
    ];
    return {
      ok: true,
      engine: "quote_check",
      calculatedAt: new Date().toISOString(),
      quantities,
      costs: normalizeCostSummary({
        total: result.comparableQuotedTotal,
        currency: "quote",
        lines: costLines,
        regionalDataAvailable: false,
      }),
      raw: result,
    };
  },
});

// Register the Phase-2 engines AFTER the registry map exists.
// (Import alone would hoist above the REGISTRY declaration, TDZ.)
import { registerPhase2Engines } from "./engines-phase2";
registerPhase2Engines();

import { registerExpandedEngines } from "./engines-expanded";
registerExpandedEngines();

import { registerStructuralEngines } from "./engines-structural";
registerStructuralEngines();
