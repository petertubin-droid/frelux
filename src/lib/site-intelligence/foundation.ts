/**
 * Foundation scenario comparison and cost impact.
 *
 * Two rules are enforced here rather than left to the UI:
 *
 *  1. A scenario cannot run without a bearing capacity the user supplied or a
 *     reviewer verified. There is no fallback value, and nothing derived from a
 *     city, a postcode or a soil label.
 *  2. Quantities come from the existing foundation calculator, so the geometry
 *     that FRELUX already uses for sizing is the geometry costed here. This
 *     module adds procurement quantities and prices, not a second design method.
 */
import {
  designFoundation,
  type FoundationShape,
} from "@/lib/engineering/foundation-calculator";
import { fetchListings } from "@/lib/price-index/queries";
import { resolveMaterialPrice } from "@/lib/price-index/resolver";
import type {
  CostLine,
  FoundationScenarioResult,
  FoundationType,
  ScenarioAssumptions,
  ScenarioCost,
  ScenarioQuantities,
} from "./types";

/** Typical 1:2:4 mix, stated openly and overridable by the caller. */
export const DEFAULT_CONCRETE_MIX = {
  cement_bags_per_m3: 6.5,
  sand_m3_per_m3: 0.45,
  granite_m3_per_m3: 0.9,
};

export const DEFAULT_REINFORCEMENT_KG_PER_M3 = 80;

/** Materials the price index tracks, used to cost the quantities. */
export const COST_MATERIALS = {
  cement: "ng-cement-dangote-3x-50kg",
  sand: "ng-aggregate-sharp-sand",
  granite: "ng-aggregate-granite-34",
  rebar: "ng-rebar-12mm-12m",
} as const;

const REBAR_KG_PER_BAR = 10.66; // 12 mm bar, 12 m, 0.888 kg/m

export class ScenarioInputError extends Error {}

export function emptyQuantities(): ScenarioQuantities {
  return {
    excavation_m3: 0,
    concrete_m3: 0,
    blinding_m3: 0,
    hardcore_m3: 0,
    reinforcement_kg: 0,
    formwork_m2: 0,
    dewatering_allowance: 0,
    ground_improvement_m2: 0,
    pile_metres: 0,
  };
}

export function computeQuantities(
  type: FoundationType,
  a: ScenarioAssumptions,
): { quantities: ScenarioQuantities; warnings: string[]; design: FoundationScenarioResult["design"] } {
  const warnings: string[] = [];
  if (!Number.isFinite(a.bearing_capacity_kpa) || a.bearing_capacity_kpa <= 0) {
    throw new ScenarioInputError(
      "A bearing capacity is required. Use a value from a reviewed report, or your own stated assumption.",
    );
  }
  if (!a.bearing_source) {
    throw new ScenarioInputError("State where the bearing capacity came from.");
  }
  if (a.bearing_source === "report_verified") {
    warnings.push("Bearing capacity taken from a report marked verified by a reviewer.");
  } else {
    warnings.push(
      "Bearing capacity is an unverified assumption entered by the user. Treat the comparison as illustrative until a report is reviewed.",
    );
  }

  const quantities = emptyQuantities();
  const design: FoundationScenarioResult["design"] = {
    required_width_mm: null,
    recommended_width_mm: null,
    bearing_check_pass: null,
    applied_pressure_kpa: null,
  };

  if (type === "strip" || type === "pad" || type === "raft") {
    const shape = type as FoundationShape;
    const result = designFoundation({
      shape,
      soil_type: "custom",
      custom_bearing_capacity: a.bearing_capacity_kpa,
      wall_load: a.wall_load_kn_m ?? 0,
      column_load: a.column_load_kn ?? 0,
      foundation_depth: a.depth_m,
      concrete_grade: a.concrete_grade ?? "C25",
      building_length: a.building_length_m,
      building_width: a.building_width_m,
    });

    quantities.excavation_m3 = round(result.excavation_volume, 2);
    quantities.concrete_m3 = round(result.concrete_volume, 2);
    quantities.blinding_m3 = round(result.blinding_volume, 2);
    quantities.hardcore_m3 = round(result.hardcore_volume, 2);
    design.required_width_mm = result.required_width;
    design.recommended_width_mm = result.recommended_width;
    design.bearing_check_pass = result.bearing_check_pass;
    design.applied_pressure_kpa = round(result.applied_pressure, 1);
    warnings.push(...result.warnings);
    if (!result.bearing_check_pass) {
      warnings.push(
        "The applied pressure exceeds the capacity entered for this scenario. That is a signal to revisit the assumptions, not a design instruction.",
      );
    }
  }

  if (type === "pile") {
    const count = a.pile_count ?? 0;
    const depth = a.pile_depth_m ?? 0;
    if (count <= 0 || depth <= 0) {
      throw new ScenarioInputError("Enter a pile count and depth you are willing to cost.");
    }
    quantities.pile_metres = round(count * depth, 2);
    quantities.concrete_m3 = round(count * Math.PI * 0.225 * 0.225 * depth, 2);
    quantities.excavation_m3 = round(count * Math.PI * 0.35 * 0.35 * depth, 2);
    warnings.push(
      "Pile quantities are geometric only. Pile type, capacity and reinforcement are a specialist design decision.",
    );
  }

  if (type === "ground_improvement") {
    const area = a.ground_improvement_area_m2 ?? 0;
    if (area <= 0) {
      throw new ScenarioInputError("Enter the area to be improved.");
    }
    quantities.ground_improvement_m2 = round(area, 2);
    warnings.push(
      "Ground improvement is costed from the area and rate you provide. The technique and its suitability need geotechnical advice.",
    );
  }

  const intensity =
    a.reinforcement_kg_per_m3 ?? (type === "raft" ? 90 : DEFAULT_REINFORCEMENT_KG_PER_M3);
  quantities.reinforcement_kg = round(quantities.concrete_m3 * intensity, 1);
  if (a.reinforcement_kg_per_m3 == null && quantities.concrete_m3 > 0) {
    warnings.push(
      `Reinforcement uses an assumed ${intensity} kg/m³ intensity. Change it to your design figure before relying on the cost.`,
    );
  }
  quantities.formwork_m2 = round(a.formwork_area_m2 ?? 0, 2);
  quantities.dewatering_allowance = round(a.dewatering_allowance ?? 0, 2);

  return { quantities, warnings, design };
}

export function round(value: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round((value + Number.EPSILON) * f) / f;
}

/**
 * Price the quantities from the material index.
 *
 * Unpriced lines stay null and are named, so the subtotal is reported as
 * incomplete instead of quietly understating the job.
 */
export async function costScenario(params: {
  quantities: ScenarioQuantities;
  citySlug?: string | null;
  groundImprovementRate?: number | null;
  dewateringRate?: number | null;
  mix?: typeof DEFAULT_CONCRETE_MIX;
}): Promise<ScenarioCost> {
  const { quantities, citySlug, groundImprovementRate, dewateringRate } = params;
  const mix = params.mix ?? DEFAULT_CONCRETE_MIX;

  // Fetch without a material filter, then resolve each wanted material by its
  // real id: the resolver matches on id, never on a slug it was handed.
  const { listings } = await fetchListings({
    citySlug: citySlug ?? null,
    limit: 500,
  });

  const priceFor = (slug: string) => {
    const sample = listings.find((l) => l.slug === slug);
    if (!sample) return { status: "unavailable" as const };
    return resolveMaterialPrice({
      materialId: sample.material_id,
      citySlug: citySlug ?? null,
      listings,
    });
  };

  const cementBags = quantities.concrete_m3 * mix.cement_bags_per_m3;
  const sandM3 = quantities.concrete_m3 * mix.sand_m3_per_m3;
  const graniteM3 = quantities.concrete_m3 * mix.granite_m3_per_m3;
  const rebarBars = quantities.reinforcement_kg / REBAR_KG_PER_BAR;

  const lines: CostLine[] = [];
  const push = (
    key: string,
    label: string,
    quantity: number,
    unit: string,
    slug: string | null,
  ) => {
    if (quantity <= 0) return;
    if (!slug) {
      lines.push({
        key,
        label,
        quantity: round(quantity, 2),
        unit,
        unit_price: null,
        amount: null,
        price_note: "Priced from the rate you entered.",
      });
      return;
    }
    const resolved = priceFor(slug);
    if (resolved.status !== "ok") {
      lines.push({
        key,
        label,
        quantity: round(quantity, 2),
        unit,
        unit_price: null,
        amount: null,
        material_slug: slug,
        price_note:
          "No qualifying market price yet, so this line is unpriced rather than estimated.",
      });
      return;
    }
    lines.push({
      key,
      label,
      quantity: round(quantity, 2),
      unit,
      unit_price: resolved.price,
      amount: round(resolved.price * quantity, 2),
      material_slug: slug,
      price_note: [
        resolved.basis === "city" ? "City median" : "National median",
        `${resolved.sample_size} prices`,
        resolved.last_observed_at ?? null,
        resolved.indicative ? "reported, unverified" : "verified",
      ]
        .filter(Boolean)
        .join(" · "),
    });
  };

  push("cement", "Cement", cementBags, "50 kg bag", COST_MATERIALS.cement);
  push("sand", "Sharp sand", sandM3, "m³", COST_MATERIALS.sand);
  push("granite", "Granite (3/4)", graniteM3, "m³", COST_MATERIALS.granite);
  push("rebar", "Reinforcement, 12 mm", rebarBars, "12 m bar", COST_MATERIALS.rebar);

  if (quantities.ground_improvement_m2 > 0) {
    const rate = groundImprovementRate ?? null;
    lines.push({
      key: "ground_improvement",
      label: "Ground improvement",
      quantity: quantities.ground_improvement_m2,
      unit: "m²",
      unit_price: rate,
      amount: rate == null ? null : round(rate * quantities.ground_improvement_m2, 2),
      price_note:
        rate == null
          ? "Enter a rate from your contractor: no market rate is published for this."
          : "Priced from the rate you entered.",
    });
  }

  if (quantities.pile_metres > 0) {
    const rate = groundImprovementRate ?? null;
    lines.push({
      key: "piling",
      label: "Piling",
      quantity: quantities.pile_metres,
      unit: "m",
      unit_price: rate,
      amount: rate == null ? null : round(rate * quantities.pile_metres, 2),
      price_note:
        rate == null
          ? "Enter a rate from your piling contractor: no market rate is published for this."
          : "Priced from the rate you entered.",
    });
  }

  if (quantities.dewatering_allowance > 0) {
    lines.push({
      key: "dewatering",
      label: "Dewatering allowance",
      quantity: quantities.dewatering_allowance,
      unit: "allowance",
      unit_price: dewateringRate ?? null,
      amount: dewateringRate == null ? null : round(quantities.dewatering_allowance * dewateringRate, 2),
      price_note:
        dewateringRate == null
          ? "An allowance you entered. FRELUX does not infer dewatering from map data."
          : "Priced from the rate you entered.",
    });
  }

  const priced = lines.filter((l) => l.amount != null);
  const unpriced = lines.filter((l) => l.amount == null).map((l) => l.label);
  const subtotal = lines.length
    ? round(priced.reduce((sum, l) => sum + (l.amount ?? 0), 0), 2)
    : null;

  const withPrices = lines.filter((l) => l.material_slug);
  const verifiedCount = withPrices.filter((l) =>
    (l.price_note ?? "").includes("verified") && !(l.price_note ?? "").includes("unverified"),
  ).length;

  return {
    currency: "NGN",
    lines,
    subtotal: unpriced.length ? null : subtotal,
    unpriced,
    price_basis: {
      city_slug: citySlug ?? null,
      representative_date: withPrices.length
        ? (listings.find((l) => l.slug === COST_MATERIALS.cement)?.effective_date ?? null)
        : null,
      sample_size: withPrices.length ? withPrices.length : null,
      verification:
        withPrices.length === 0
          ? "none"
          : verifiedCount === withPrices.length
            ? "verified"
            : verifiedCount === 0
              ? "reported"
              : "mixed",
      note:
        "Material lines are priced from the FRELUX Material Price Index for this market. Labour, plant and contractor margin are not included.",
    },
  };
}

export async function runScenario(params: {
  type: FoundationType;
  assumptions: ScenarioAssumptions;
  citySlug?: string | null;
  groundImprovementRate?: number | null;
  dewateringRate?: number | null;
}): Promise<FoundationScenarioResult> {
  const { quantities, warnings, design } = computeQuantities(params.type, params.assumptions);
  const cost = await costScenario({
    quantities,
    citySlug: params.citySlug ?? null,
    groundImprovementRate: params.groundImprovementRate,
    dewateringRate: params.dewateringRate,
  });
  return { quantities, design, warnings, cost };
}
