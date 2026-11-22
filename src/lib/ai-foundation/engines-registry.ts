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

// ── Masonry: blocks, mortar and sand for a wall in a given market ──
//
// The market's own unit is resolved inside the engine (CMU in the US, block in
// the UK, brick in India), so the adapter passes the market code rather than
// assuming a unit size. Defaults are the standalone takeoff page's: a 10 m by
// 3 m single-leaf wall, 1:4 mortar, 5 percent waste.
interface MasonryInputLike {
  marketCode?: string;
  wallLengthM?: number;
  wallHeightM?: number;
  wallCount?: number;
  jointThicknessMm?: number;
  mortarMixRatio?: "1:3" | "1:4" | "1:5" | "1:6";
  wastePercent?: number;
  lengthUnit?: "m" | "ft";
  leafCount?: number;
}

registerEngine({
  id: "masonry",
  domain: "masonry",
  title: "FRELUX Masonry Takeoff Engine",
  authoritative: true,
  creditedAs: "Calculated by the authoritative FRELUX masonry engine",
  async run(rawInput) {
    const { calculateMasonryTakeoff } =
      await import("@/lib/estimation/masonry-standalone-engine");
    const supplied = (rawInput ?? {}) as MasonryInputLike;

    const input = {
      marketCode: supplied.marketCode ?? "NG",
      wallLengthM: supplied.wallLengthM ?? 10,
      wallHeightM: supplied.wallHeightM ?? 3,
      wallCount: supplied.wallCount ?? 1,
      jointThicknessMm: supplied.jointThicknessMm ?? 10,
      mortarMixRatio: supplied.mortarMixRatio ?? "1:4",
      wastePercent: supplied.wastePercent ?? 5,
      lengthUnit: supplied.lengthUnit ?? "m",
      leafCount: supplied.leafCount ?? 1,
    } as never;

    const result = calculateMasonryTakeoff(input);

    const quantities: EngineQuantityLine[] = [
      quantityLine(
        `Units (${result.unit.name})`,
        result.unitsRequiredGross,
        "units",
      ),
      quantityLine("Net wall area", result.netWallAreaM2, "m²"),
      quantityLine("Mortar volume", result.mortarVolumeM3Gross, "m³"),
      quantityLine("Cement", result.cementBagsRequired, "bags"),
      quantityLine("Sand", result.sandVolumeM3, "m³"),
      quantityLine("Water", result.waterLiters, "litres"),
    ];

    return {
      ok: true,
      engine: "masonry",
      calculatedAt: new Date().toISOString(),
      quantities,
      costs: null,
      raw: result,
    };
  },
});

// ── Concrete volume, auditable contract ──
//
// The globalization module states its result as an auditable calculation
// (units, methodology, rounding, assumptions) rather than a line list, and no
// page calls it yet: it exists for the calculations API. It is registered so
// the console can exercise it, with its surface honestly marked as having no
// user-facing entry point.
interface ConcreteVolumeInputLike {
  lengthMm?: number;
  widthMm?: number;
  depthMm?: number;
  wastagePercent?: number;
}

registerEngine({
  id: "concrete_volume",
  domain: "structure",
  title: "FRELUX Concrete Volume (Auditable) Engine",
  authoritative: true,
  creditedAs: "Calculated by the authoritative FRELUX concrete volume engine",
  async run(rawInput) {
    const { calculateConcreteVolume } =
      await import("@/lib/globalization/takeoff-engines");
    const supplied = (rawInput ?? {}) as ConcreteVolumeInputLike;

    // A 5,000 mm by 4,000 mm slab at 150 mm with 5 percent wastage.
    const outcome = calculateConcreteVolume({
      lengthMm: supplied.lengthMm ?? 5000,
      widthMm: supplied.widthMm ?? 4000,
      depthMm: supplied.depthMm ?? 150,
      wastagePercent: supplied.wastagePercent ?? 5,
    } as never);

    if (outcome.status !== "valid" || !outcome.outputs) {
      return {
        ok: false,
        engine: "concrete_volume",
        calculatedAt: new Date().toISOString(),
        quantities: [],
        costs: null,
        raw: outcome,
        error:
          outcome.errors.map((e) => e.message).join(" ") ||
          "The concrete volume engine rejected the input.",
      };
    }

    const out = outcome.outputs;
    return {
      ok: true,
      engine: "concrete_volume",
      calculatedAt: new Date().toISOString(),
      quantities: [
        quantityLine("Base volume", out.baseVolumeM3, "m³"),
        quantityLine("Required volume", out.requiredVolumeM3, "m³"),
        quantityLine("Required volume", out.requiredVolumeYd3, "yd³"),
      ],
      costs: null,
      raw: outcome,
    };
  },
});

// ── Waterproofing: DPC, DPM and wet-area coatings ──
//
// A foundation and wet-area takeoff: how much membrane, coating, tape and
// labour a build needs. Rules are the engine's shipped defaults; the price map
// stays empty because this answers quantities, not cost.
interface WaterproofingInputLike {
  dpc_run_m?: number | null;
  dpm_area_m2?: number | null;
  wet_floor_area_m2?: number | null;
  wet_wall_area_m2?: number | null;
  wet_perimeter_m?: number | null;
  terrace_area_m2?: number | null;
}

registerEngine({
  id: "waterproofing",
  domain: "building",
  title: "FRELUX Waterproofing Engine",
  authoritative: true,
  creditedAs: "Calculated by the authoritative FRELUX waterproofing engine",
  async run(rawInput) {
    const { calculateWaterproofing, DEFAULT_WATERPROOFING_RULES } =
      await import("@/lib/estimation/waterproofing-engine");
    const supplied = (rawInput ?? {}) as WaterproofingInputLike;

    // A typical domestic house: 60 m of DPC, 90 m² of DPM, one bathroom with
    // 6 m² of floor and 18 m² of splash zone, 12 m of perimeter, no terrace.
    const input = {
      dpc_run_m: supplied.dpc_run_m ?? 60,
      dpm_area_m2: supplied.dpm_area_m2 ?? 90,
      wet_floor_area_m2: supplied.wet_floor_area_m2 ?? 6,
      wet_wall_area_m2: supplied.wet_wall_area_m2 ?? 18,
      wet_perimeter_m: supplied.wet_perimeter_m ?? 12,
      terrace_area_m2: supplied.terrace_area_m2 ?? null,
      labour: { mode: "none" },
    } as never;

    const result = calculateWaterproofing(
      input,
      DEFAULT_WATERPROOFING_RULES,
      {},
    );

    const quantities: EngineQuantityLine[] = result.lines
      .filter((line) => line.quantity !== null)
      .map((line) =>
        quantityLine(line.label, Number(line.quantity), line.unit),
      );

    return {
      ok: result.ok,
      engine: "waterproofing",
      calculatedAt: new Date().toISOString(),
      quantities,
      costs: null,
      raw: result,
      ...(result.ok
        ? {}
        : {
            error:
              result.errors.join(" ") ||
              "The waterproofing engine rejected the input.",
          }),
    };
  },
});

// ── Soffit and gutter: fascia boards, gutter run and downpipes ──
interface SoffitGutterInputLike {
  mode?: "perimeter" | "footprint";
  perimeter_m?: number | null;
  building_length_m?: number | null;
  building_width_m?: number | null;
  overhang_m?: number;
  material?: string;
}

registerEngine({
  id: "soffit_gutter",
  domain: "roofing",
  title: "FRELUX Soffit and Gutter Engine",
  authoritative: true,
  creditedAs: "Calculated by the authoritative FRELUX soffit and gutter engine",
  async run(rawInput) {
    const { calculateSoffitGutter, DEFAULT_SOFFIT_GUTTER_RULES } =
      await import("@/lib/estimation/soffit-gutter-engine");
    const supplied = (rawInput ?? {}) as SoffitGutterInputLike;

    // An 18 m by 12 m footprint with a 600 mm overhang, which is the shape the
    // eaves calculator starts from.
    const input = {
      mode: supplied.mode ?? "footprint",
      perimeter_m: supplied.perimeter_m ?? null,
      building_length_m: supplied.building_length_m ?? 18,
      building_width_m: supplied.building_width_m ?? 12,
      overhang_m: supplied.overhang_m ?? 0.6,
      material: supplied.material ?? "pvc",
    } as never;

    const result = calculateSoffitGutter(
      input,
      DEFAULT_SOFFIT_GUTTER_RULES,
      {},
    );

    const quantities: EngineQuantityLine[] = result.lines
      .filter((line) => line.quantity !== null)
      .map((line) =>
        quantityLine(line.label, Number(line.quantity), line.unit),
      );

    return {
      ok: result.ok,
      engine: "soffit_gutter",
      calculatedAt: new Date().toISOString(),
      quantities,
      costs: null,
      raw: result,
      ...(result.ok
        ? {}
        : {
            error:
              result.errors.join(" ") ||
              "The soffit and gutter engine rejected the input.",
          }),
    };
  },
});

// ── Retaining walls: concrete, blockwork and backfill for a retaining wall ──
interface RetainingWallInputLike {
  length_m?: number;
  height_m?: number;
  soil_type?: "stable" | "loose_sand" | "wet_clay" | "lateritic";
  stem_type?: "block" | "concrete";
  marketCode?: string;
  bagWeightKg?: number;
}

registerEngine({
  id: "retaining_wall",
  domain: "structure",
  title: "FRELUX Retaining Wall Engine",
  authoritative: true,
  creditedAs: "Calculated by the authoritative FRELUX retaining wall engine",
  async run(rawInput) {
    const { calculateRetainingWall, DEFAULT_RETAINING_WALL_RULES } =
      await import("@/lib/estimation/retaining-wall-engine");
    const supplied = (rawInput ?? {}) as RetainingWallInputLike;

    // A 10 m wall at 2 m in stable soil with a block stem: the estimator's own
    // starting point. Prices stay empty, since this answers quantities.
    const input = {
      length_m: supplied.length_m ?? 10,
      height_m: supplied.height_m ?? 2,
      soil_type: supplied.soil_type ?? "stable",
      stem_type: supplied.stem_type ?? "block",
      marketCode: supplied.marketCode ?? "NG",
      bagWeightKg: supplied.bagWeightKg ?? null,
    } as never;

    const result = calculateRetainingWall(
      input,
      DEFAULT_RETAINING_WALL_RULES,
      {},
    );

    const quantities: EngineQuantityLine[] = result.lines
      .filter((line) => line.quantity !== null)
      .map((line) =>
        quantityLine(line.label, Number(line.quantity), line.unit),
      );

    return {
      ok: result.ok,
      engine: "retaining_wall",
      calculatedAt: new Date().toISOString(),
      quantities,
      costs: null,
      raw: result,
      ...(result.ok
        ? {}
        : {
            error:
              result.errors.join(" ") ||
              "The retaining wall engine rejected the input.",
          }),
    };
  },
});

// ── Temporary works: formwork sheets and scaffold members ──
interface TemporaryWorksInputLike {
  marketCode?: string;
  formworkReuseCycles?: number;
  formworkWastePercent?: number;
  scaffoldRunLengthM?: number;
  scaffoldWorkingHeightM?: number;
  scaffoldBayLengthM?: number;
  scaffoldLiftHeightM?: number;
  scaffoldDeckWidthM?: number;
}

registerEngine({
  id: "temporary_works",
  domain: "structure",
  title: "FRELUX Temporary Works Engine",
  authoritative: true,
  creditedAs: "Calculated by the authoritative FRELUX temporary works engine",
  async run(rawInput) {
    const { calculateTemporaryWorksTakeoff } =
      await import("@/lib/estimation/temporary-works-standalone-engine");
    const supplied = (rawInput ?? {}) as TemporaryWorksInputLike;

    // A 20 m scaffold run at 6 m working height, and formwork reused 4 times,
    // which is what the estimator starts from.
    const input = {
      marketCode: supplied.marketCode ?? "NG",
      elements: [],
      formworkReuseCycles: supplied.formworkReuseCycles ?? 4,
      formworkWastePercent: supplied.formworkWastePercent ?? 5,
      scaffoldRunLengthM: supplied.scaffoldRunLengthM ?? 20,
      scaffoldWorkingHeightM: supplied.scaffoldWorkingHeightM ?? 6,
      scaffoldBayLengthM: supplied.scaffoldBayLengthM ?? 2.4,
      scaffoldLiftHeightM: supplied.scaffoldLiftHeightM ?? 2,
      scaffoldDeckWidthM: supplied.scaffoldDeckWidthM ?? 0.9,
    } as never;

    const result = calculateTemporaryWorksTakeoff(input);

    return {
      ok: true,
      engine: "temporary_works",
      calculatedAt: new Date().toISOString(),
      quantities: [
        quantityLine("Formwork contact area", result.formContactAreaM2, "m²"),
        quantityLine("Formwork sheets", result.formworkSheets, "sheets"),
        quantityLine("Scaffold standards", result.scaffoldStandards, "members"),
        quantityLine("Scaffold ledgers", result.scaffoldLedgers, "members"),
        quantityLine("Scaffold transoms", result.scaffoldTransoms, "members"),
        quantityLine("Scaffold deck area", result.scaffoldDeckAreaM2, "m²"),
        quantityLine("Guardrail length", result.scaffoldGuardrailLengthM, "m"),
      ],
      costs: null,
      raw: result,
    };
  },
});

// ── Drywall: boards, studs, track, screws, tape and compound ──
interface DrywallInputLike {
  marketCode?: string;
  wallLengthM?: number;
  wallHeightM?: number;
  wallCount?: number;
  boardLayers?: number;
  boardSides?: 1 | 2;
  studSpacingMm?: number;
  wastePercent?: number;
  insulation?: boolean;
}

registerEngine({
  id: "drywall",
  domain: "finishing",
  title: "FRELUX Drywall Takeoff Engine",
  authoritative: true,
  creditedAs: "Calculated by the authoritative FRELUX drywall engine",
  async run(rawInput) {
    const { calculateDrywallTakeoff } =
      await import("@/lib/estimation/drywall-standalone-engine");
    const supplied = (rawInput ?? {}) as DrywallInputLike;

    // One 10 m by 3 m partition, single layer both sides, studs at 600 mm.
    const input = {
      marketCode: supplied.marketCode ?? "NG",
      wallLengthM: supplied.wallLengthM ?? 10,
      wallHeightM: supplied.wallHeightM ?? 3,
      wallCount: supplied.wallCount ?? 1,
      boardLayers: supplied.boardLayers ?? 1,
      boardSides: supplied.boardSides ?? 2,
      studSpacingMm: supplied.studSpacingMm ?? 600,
      wastePercent: supplied.wastePercent ?? 10,
      insulation: supplied.insulation ?? false,
    } as never;

    const result = calculateDrywallTakeoff(input);

    return {
      ok: true,
      engine: "drywall",
      calculatedAt: new Date().toISOString(),
      quantities: [
        quantityLine("Net wall area", result.netWallAreaM2, "m²"),
        quantityLine("Board sheets", result.boardSheets, "sheets"),
        quantityLine("Studs", result.studCount, "studs"),
        quantityLine("Track", result.trackLinearMeters, "m"),
        quantityLine("Track pieces", result.trackStockPieces, "pieces"),
        quantityLine("Screws", result.drywallScrews, "screws"),
        quantityLine("Joint tape", result.jointTapeLinearMeters, "m"),
        quantityLine("Joint compound", result.jointCompoundKg, "kg"),
      ],
      costs: null,
      raw: result,
    };
  },
});

// ── Plaster and render: gypsum, exterior render and Tyrolene ──
interface PlasterRenderInputLike {
  system?: "gypsum_interior" | "exterior_render" | "textured_tyrolene";
  marketCode?: string;
  areaM2?: number;
  openingAreaM2?: number;
  substrate?: string;
  thicknessMm?: number;
  grainMm?: 1.5 | 2 | 3;
  texturedCoatMm?: number;
  externalCornerLengthM?: number;
  openingPerimeterM?: number;
  wastePercent?: number;
  wetZone?: boolean;
}

registerEngine({
  id: "plaster_render",
  domain: "finishing",
  title: "FRELUX Plaster & Render Engine",
  authoritative: true,
  creditedAs:
    "Calculated by the authoritative FRELUX plaster and render engine",
  async run(rawInput) {
    const { calculatePlasterRender } =
      await import("@/lib/estimation/plaster-render-engine");
    const supplied = (rawInput ?? {}) as PlasterRenderInputLike;

    // The calculator page's own starting point: 100 m2 of exterior render at
    // 15 mm on clay brick, 2 mm grain, 4 mm textured coat, 10 per cent waste.
    // No prices are passed: quantities are the job, and a price without a rate
    // would be invented.
    const input = {
      system: supplied.system ?? "exterior_render",
      marketCode: supplied.marketCode ?? "GB",
      areaM2: supplied.areaM2 ?? 100,
      openingAreaM2: supplied.openingAreaM2 ?? 0,
      substrate: supplied.substrate ?? "clay_brick",
      thicknessMm: supplied.thicknessMm ?? 15,
      grainMm: supplied.grainMm ?? 2,
      texturedCoatMm: supplied.texturedCoatMm ?? 4,
      externalCornerLengthM: supplied.externalCornerLengthM ?? 0,
      openingPerimeterM: supplied.openingPerimeterM ?? 0,
      wastePercent: supplied.wastePercent ?? 10,
      wetZone: supplied.wetZone ?? false,
    } as never;

    const result = calculatePlasterRender(input);

    // Every layer and accessory the engine reports, in its own order. The key
    // is appended because a system can repeat a material name across coats.
    const lines = [...result.layers, ...result.accessories];
    return {
      ok: true,
      engine: "plaster_render",
      calculatedAt: new Date().toISOString(),
      quantities: lines.map((line) =>
        quantityLine(
          line.key ? `${line.material} (${line.key})` : line.material,
          line.quantity,
          line.unit,
        ),
      ),
      costs: null,
      raw: result,
    };
  },
});

// ── Insulation: area, volume and packs for a wall or roof ──
interface InsulationInputLike {
  marketCode?: string;
  areaM2?: number;
  layers?: number;
  thicknessMm?: number;
  wastePercent?: number;
  packCoverageM2?: number;
  installationType?: "batt" | "board" | "roll" | "loose_fill";
}

registerEngine({
  id: "insulation",
  domain: "finishing",
  title: "FRELUX Insulation Takeoff Engine",
  authoritative: true,
  creditedAs: "Calculated by the authoritative FRELUX insulation engine",
  async run(rawInput) {
    const { calculateInsulationTakeoff } =
      await import("@/lib/estimation/insulation-standalone-engine");
    const supplied = (rawInput ?? {}) as InsulationInputLike;

    // 100 m² of ceiling, one layer at 100 mm, batts in 5 m² packs.
    const input = {
      marketCode: supplied.marketCode ?? "NG",
      areaM2: supplied.areaM2 ?? 100,
      layers: supplied.layers ?? 1,
      thicknessMm: supplied.thicknessMm ?? 100,
      wastePercent: supplied.wastePercent ?? 5,
      packCoverageM2: supplied.packCoverageM2 ?? 5,
      installationType: supplied.installationType ?? "batt",
    } as never;

    const result = calculateInsulationTakeoff(input);

    const quantities: EngineQuantityLine[] = [
      quantityLine("Net area", result.netAreaM2, "m²"),
      quantityLine("Gross area", result.grossAreaM2, "m²"),
      quantityLine("Installed volume", result.installedVolumeM3, "m³"),
    ];
    if (result.packsRequired !== null) {
      quantities.push(quantityLine("Packs", result.packsRequired, "packs"));
    }

    return {
      ok: true,
      engine: "insulation",
      calculatedAt: new Date().toISOString(),
      quantities,
      costs: null,
      raw: result,
    };
  },
});

// ── Paint: theoretical litres and the buckets a buyer pays for ──
//
// One adapter over two authoritative functions, because they are one answer.
// paint-engine gives the theoretical litres for an area and coat count;
// painting-engine's litresToBuckets converts those litres into packs. The
// painting estimator reaches the same conversion through
// calculatePaintingProject, so reporting litres without buckets would stop
// half way through the sum a buyer actually sees.
//
// Coverage is a product property (10 to 17 m²/L per coat for common emulsions)
// and pack size is a packaging property, so both are inputs with disclosed
// defaults rather than fixed rules. 10 m²/L and a 20 L pack are the defaults
// the plan vision finishing engine already ships.
interface PaintInputLike {
  areaM2?: number;
  coats?: number;
  coverageM2PerLiter?: number;
  packSizeLitres?: number;
}

interface FlooringInputLike {
  flooring_type?: "laminate" | "vinyl" | "parquet";
  floor_area_m2?: number;
  skirting_run_m?: number;
  include_underlay?: boolean;
  include_adhesive?: boolean;
}

registerEngine({
  id: "flooring",
  domain: "finishing",
  title: "FRELUX Flooring Takeoff Engine",
  authoritative: true,
  creditedAs: "Calculated by the authoritative FRELUX flooring engine",
  async run(rawInput) {
    const { calculateFlooring, DEFAULT_FLOORING_RULES } =
      await import("@/lib/estimation/flooring-engine");
    const supplied = (rawInput ?? {}) as FlooringInputLike;

    // The calculator page's own starting point: 100 m2 of laminate with
    // underlay and adhesive, 40 m of skirting, labour priced separately. The
    // rule table is the engine's published default; the price book is empty,
    // so quantities are authoritative and money stays null rather than guessed.
    const input = {
      flooring_type: supplied.flooring_type ?? "laminate",
      floor_area_m2: supplied.floor_area_m2 ?? 100,
      skirting_run_m: supplied.skirting_run_m ?? 40,
      include_underlay: supplied.include_underlay ?? true,
      include_adhesive: supplied.include_adhesive ?? true,
      labour: { mode: "none" as const },
    };

    const result = calculateFlooring(input, DEFAULT_FLOORING_RULES, {});
    if (!result.ok) {
      return {
        ok: false,
        engine: "flooring",
        calculatedAt: new Date().toISOString(),
        quantities: [],
        costs: null,
        raw: result,
        error: result.errors.join(" "),
      };
    }

    return {
      ok: true,
      engine: "flooring",
      calculatedAt: new Date().toISOString(),
      quantities: result.lines
        .filter((line) => line.quantity !== null)
        .map((line) =>
          quantityLine(
            `${line.label} (${line.key})`,
            line.quantity!,
            line.unit,
          ),
        ),
      costs: null,
      raw: result,
    };
  },
});

registerEngine({
  id: "paint",
  domain: "finishing",
  title: "FRELUX Paint Engine",
  authoritative: true,
  creditedAs: "Calculated by the authoritative FRELUX paint engine",
  async run(rawInput) {
    const { calculateTheoreticalLitres } =
      await import("@/lib/estimation/paint-engine");
    const { litresToBuckets } =
      await import("@/lib/estimation/painting-engine");
    const supplied = (rawInput ?? {}) as PaintInputLike;

    const areaM2 = supplied.areaM2 ?? 100;
    const coats = supplied.coats ?? 2;
    const coverageM2PerLiter = supplied.coverageM2PerLiter ?? 10;
    const packSizeLitres = supplied.packSizeLitres ?? 20;

    const litres = calculateTheoreticalLitres(
      areaM2,
      coats,
      coverageM2PerLiter,
    );
    const exactBuckets = litresToBuckets(litres, packSizeLitres);
    // Packs are sold whole, so the purchase figure is the ceiling. This is what
    // the paint calculator and the painting estimator both show.
    const bucketsToBuy = Math.ceil(exactBuckets);

    return {
      ok: litres > 0,
      engine: "paint",
      calculatedAt: new Date().toISOString(),
      quantities: [
        quantityLine("Theoretical paint", litres, "litres"),
        quantityLine("Buckets to buy", bucketsToBuy, "buckets"),
        quantityLine("Buckets (exact)", exactBuckets, "buckets"),
        quantityLine("Paint area", areaM2, "m²"),
      ],
      costs: null,
      raw: {
        litres,
        exactBuckets,
        bucketsToBuy,
        areaM2,
        coats,
        coverageM2PerLiter,
        packSizeLitres,
      },
      ...(litres > 0
        ? {}
        : {
            error:
              "Coverage and area must both be positive, so no paint can be calculated.",
          }),
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
