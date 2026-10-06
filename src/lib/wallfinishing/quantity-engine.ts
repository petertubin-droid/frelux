// =========================================================
// FRELUX Wall Finishing — quantity calculation engine.
//
// Deterministic, pure, fully transparent:
//
//   Gross area = length × height
//   Net area   = gross − opening areas − exclusions
//   Finishing area = net area + reveal areas
//
//   area-coverage: qty = area × coats ÷ coverageRate
//   volume:       wet = area × thickness; dry = wet × 1.33;
//                 component = dry × parts ÷ total parts
//   per-area:     qty = area × unitsPerM2
//
//   adjusted = base × (1 + waste%)
//   purchase = rounded up to the purchase unit
//
// Never silently produces zero: every invalid input becomes an
// explicit error in the result.
// =========================================================

import type {
  CalcStep,
  LayerQuantityResult,
  MixComponent,
  OverrideIndicator,
  WallAssemblyTemplate,
  WallLayerOverrides,
  WallLayerTemplate,
  WallSpec,
  WallSpecOverrides,
} from "@/types/wallfinishing";
import { calculateOpeningAreas } from "./openings";

/** Dry-volume factor for wet mortar (standard shrinkage allowance). */
export const MORTAR_DRY_FACTOR = 1.33;
/** Volume of one 50 kg cement bag, m³ (standard). */
export const CEMENT_BAG_VOLUME_M3 = 0.035;

export interface WallAreaResult {
  ok: boolean;
  grossAreaM2: number;
  openingAreaM2: number;
  excludedAreaM2: number;
  netAreaM2: number;
  revealAreaM2: number;
  finishingAreaM2: number;
  steps: CalcStep[];
  errors: string[];
}

export function calculateWallAreas(wall: WallSpec): WallAreaResult {
  const steps: CalcStep[] = [];
  const errors: string[] = [];

  const length = Number(wall.lengthM);
  const height = Number(wall.heightM);
  if (!Number.isFinite(length) || length <= 0) {
    errors.push(`Wall '${wall.label}': length must be a positive number.`);
  }
  if (!Number.isFinite(height) || height <= 0) {
    errors.push(`Wall '${wall.label}': height must be a positive number.`);
  }
  if (errors.length > 0) {
    return {
      ok: false,
      grossAreaM2: 0,
      openingAreaM2: 0,
      excludedAreaM2: 0,
      netAreaM2: 0,
      revealAreaM2: 0,
      finishingAreaM2: 0,
      steps,
      errors,
    };
  }

  const gross = round(length * height, 3);
  steps.push({
    label: "Gross area",
    detail: `${length} m × ${height} m = ${gross} m²`,
    formula: `${length} × ${height} = ${gross} m²`,
  });

  const {
    openingAreaM2,
    revealAreaM2,
    steps: openingSteps,
    warnings,
  } = calculateOpeningAreas(wall.openings);
  steps.push(...openingSteps);
  for (const w of warnings) errors.push(`Wall '${wall.label}': ${w}`);

  const excluded =
    Number.isFinite(wall.excludedAreaM2) && wall.excludedAreaM2 > 0
      ? round(wall.excludedAreaM2, 3)
      : 0;
  if (excluded > 0) {
    steps.push({
      label: "Excluded area",
      detail: `${excluded} m² manually excluded (fixed furniture, chimney breast...)`,
    });
  }

  const net = round(Math.max(0, gross - openingAreaM2 - excluded), 3);
  const finishing = round(net + revealAreaM2, 3);

  if (openingAreaM2 > 0 || excluded > 0) {
    steps.push({
      label: "Net area",
      detail: `${gross} − ${round(openingAreaM2, 3)} (openings) − ${excluded} (excluded) = ${net} m²`,
    });
  }
  if (revealAreaM2 > 0) {
    steps.push({
      label: "Finishing area",
      detail: `${net} m² net + ${round(revealAreaM2, 3)} m² reveals = ${finishing} m²`,
    });
  }

  return {
    ok: true,
    grossAreaM2: gross,
    openingAreaM2: round(openingAreaM2, 3),
    excludedAreaM2: excluded,
    netAreaM2: net,
    revealAreaM2: round(revealAreaM2, 3),
    finishingAreaM2: finishing,
    steps,
    errors,
  };
}

/** Purchase rounding per unit family — always rounded UP, never under-bought. */
export function roundPurchaseQuantity(qty: number, unit: string): number {
  if (!Number.isFinite(qty) || qty <= 0) return 0;
  const u = unit.toLowerCase();
  if (u.includes("m³") || u.includes("m3") || u.includes("tonne")) {
    return round(Math.ceil(qty * 10) / 10, 2);
  }
  // Whole items first — a "25 kg bag" is bought as whole bags, never half.
  if (
    u.includes("bag") ||
    u.includes("pail") ||
    u.includes("sack") ||
    u.includes("container") ||
    u.includes("roll") ||
    u.includes("gallon") ||
    u.includes("sheet")
  ) {
    return Math.ceil(qty);
  }
  if (u.includes("kg") || u.includes("litre") || u.includes("liter")) {
    // ≥ 10-unit buys are sold in 1-unit steps; small quantities in 0.5 steps.
    return qty >= 10 ? Math.ceil(qty) : Math.ceil(qty * 2) / 2;
  }
  // generic fallback: half-unit granularity
  return Math.ceil(qty * 2) / 2;
}

export interface LayerQuantityInput {
  layer: WallLayerTemplate;
  areaM2: number;
  overrides?: WallLayerOverrides;
  /** disabled when the user removed an optional layer */
  includeOptional: boolean;
}

export function calculateLayerQuantity(
  input: LayerQuantityInput,
): LayerQuantityResult {
  const { layer, areaM2 } = input;
  const steps: CalcStep[] = [];
  const overridden: OverrideIndicator[] = [];
  const o = input.overrides ?? {};

  if (!input.includeOptional && layer.optional) {
    return emptyLayerResult(layer, steps, [], []);
  }
  if (!Number.isFinite(areaM2) || areaM2 <= 0) {
    return emptyLayerResult(
      layer,
      steps,
      [],
      ["Wall area must be positive — quantity refused instead of guessed."],
    );
  }

  let baseQuantity: number;
  const coats = o.coats ?? layer.coats;
  if (o.coats !== undefined && o.coats !== layer.coats)
    overridden.push("coats");
  if (
    o.coverageRateM2PerUnit !== undefined &&
    o.coverageRateM2PerUnit !== layer.coverageRateM2PerUnit
  ) {
    overridden.push("coverage");
  }
  if (o.wastePercent !== undefined && o.wastePercent !== layer.wastePercent) {
    overridden.push("waste");
  }

  switch (layer.quantityMode) {
    case "area-coverage": {
      const coverage = o.coverageRateM2PerUnit ?? layer.coverageRateM2PerUnit;
      if (!coverage || coverage <= 0) {
        return emptyLayerResult(
          layer,
          steps,
          [],
          [
            `Layer '${layer.name}': coverage rate missing or invalid — quantity refused instead of guessed.`,
          ],
        );
      }
      baseQuantity = (areaM2 * coats) / coverage;
      steps.push({
        label: `${layer.name} — required ${layer.unit}`,
        detail: `${areaM2} m² × ${coats} coat${coats > 1 ? "s" : ""} ÷ ${coverage} m² per ${layer.unit}`,
        formula: `${areaM2} × ${coats} ÷ ${coverage} = ${round(baseQuantity, 3)}`,
      });
      break;
    }
    case "volume": {
      const thicknessMm = o.thicknessMm ?? layer.thickness?.default ?? null;
      if (
        o.thicknessMm !== undefined &&
        layer.thickness &&
        o.thicknessMm !== layer.thickness.default
      ) {
        overridden.push("thickness");
      }
      if (!thicknessMm || thicknessMm <= 0) {
        return emptyLayerResult(
          layer,
          steps,
          [],
          [
            `Layer '${layer.name}': thickness missing or invalid — quantity refused instead of guessed.`,
          ],
        );
      }
      if (
        layer.thickness &&
        (thicknessMm < layer.thickness.min || thicknessMm > layer.thickness.max)
      ) {
        return emptyLayerResult(
          layer,
          steps,
          [],
          [
            `Layer '${layer.name}': thickness ${thicknessMm} mm is outside the valid range ` +
              `(${layer.thickness.min}–${layer.thickness.max} mm).`,
          ],
        );
      }
      const wet = areaM2 * (thicknessMm / 1000);
      const dry = wet * MORTAR_DRY_FACTOR;
      steps.push({
        label: `${layer.name} — wet mortar volume`,
        detail: `${areaM2} m² × ${thicknessMm} mm = ${round(wet, 4)} m³`,
      });
      steps.push({
        label: "Dry volume (shrinkage factor)",
        detail: `${round(wet, 4)} m³ × ${MORTAR_DRY_FACTOR} = ${round(dry, 4)} m³`,
        formula: `${round(wet, 4)} × ${MORTAR_DRY_FACTOR} = ${round(dry, 4)} m³`,
      });
      baseQuantity = dry; // caller prices the mix components from this
      break;
    }
    case "per-area": {
      const rate = layer.unitsPerM2 ?? 0;
      if (rate <= 0) {
        return emptyLayerResult(
          layer,
          steps,
          [],
          [
            `Layer '${layer.name}': per-area rate missing — quantity refused instead of guessed.`,
          ],
        );
      }
      baseQuantity = areaM2 * rate;
      steps.push({
        label: `${layer.name} — ${layer.unit}`,
        detail: `${areaM2} m² × ${rate} per m² = ${round(baseQuantity, 4)}`,
        formula: `${areaM2} × ${rate} = ${round(baseQuantity, 4)}`,
      });
      break;
    }
    default: {
      return emptyLayerResult(
        layer,
        steps,
        [],
        [
          `Layer '${layer.name}': unsupported quantity mode '${layer.quantityMode}'.`,
        ],
      );
    }
  }

  const waste = o.wastePercent ?? layer.wastePercent;
  const adjusted = baseQuantity * (1 + waste / 100);
  steps.push({
    label: "Waste allowance",
    detail: `${round(baseQuantity, 3)} × (1 + ${waste}%) = ${round(adjusted, 3)}`,
  });

  const purchase = roundPurchaseQuantity(adjusted, layer.unit);
  if (purchase !== round(adjusted, 3)) {
    steps.push({
      label: "Purchase quantity",
      detail: `${round(adjusted, 3)} rounded up to ${purchase} ${layer.unit}`,
    });
  }

  return {
    layerTemplateId: layer.id,
    layerName: layer.name,
    category: layer.category,
    materialName: layer.materialRole,
    baseQuantity: round(baseQuantity, 4),
    wastePercent: waste,
    adjustedQuantity: round(adjusted, 3),
    purchaseQuantity: purchase,
    purchaseUnit: layer.unit,
    steps,
    overridden,
    surfaceWarning: null,
  };
}

/** Volume-mode layers are priced as their mix components. */
export function mixComponentQuantity(
  dryVolumeM3: number,
  mix: MixComponent[],
): {
  component: MixComponent;
  quantity: number;
  unit: string;
  formula: string;
}[] {
  const totalParts = mix.reduce((s, c) => s + c.parts, 0);
  return mix.map((component) => {
    const volume = dryVolumeM3 * (component.parts / totalParts);
    if (component.role === "concrete-mix") {
      // cement: dry mortar share → 50 kg bags
      const bags = volume / CEMENT_BAG_VOLUME_M3;
      return {
        component,
        quantity: bags,
        unit: "50 kg bag",
        formula: `${round(volume, 4)} m³ ÷ ${CEMENT_BAG_VOLUME_M3} m³/bag = ${round(bags, 3)} bags`,
      };
    }
    return {
      component,
      quantity: volume,
      unit: "m³",
      formula: `${round(volume, 4)} m³ (sand share ${component.parts}/${totalParts})`,
    };
  });
}

export interface AssemblyQuantityResult {
  layers: LayerQuantityResult[];
  /** volume-mode layers expand to priced components */
  components: {
    layerTemplateId: string;
    layerName: string;
    role: string;
    quantity: number;
    unit: string;
    formula: string;
  }[];
  errors: string[];
}

export function calculateAssemblyQuantities(
  assembly: WallAssemblyTemplate,
  areaM2: number,
  overrides?: WallSpecOverrides,
): AssemblyQuantityResult {
  const errors: string[] = [];
  const layers: LayerQuantityResult[] = [];
  const components: AssemblyQuantityResult["components"] = [];
  const oMap = overrides?.layers ?? {};

  // duplicate layer ids are a data bug — refuse loudly
  const ids = assembly.layers.map((l) => l.id);
  if (new Set(ids).size !== ids.length) {
    errors.push(
      `Assembly '${assembly.name}' contains duplicate layer ids — refused instead of guessed.`,
    );
  }

  for (const layer of assembly.layers) {
    if (overrides?.removedLayers?.includes(layer.id)) continue;
    const result = calculateLayerQuantity({
      layer,
      areaM2,
      overrides: oMap[layer.id],
      includeOptional: true,
    });
    errors.push(...(result.steps.length === 0 ? [] : []));
    layers.push(result);
    if (result.baseQuantity === 0) continue;

    if (layer.quantityMode === "volume" && layer.mix) {
      const comps = mixComponentQuantity(result.baseQuantity, layer.mix);
      for (const c of comps) {
        const wasteAdjusted =
          c.quantity *
          (1 + (oMap[layer.id]?.wastePercent ?? layer.wastePercent) / 100);
        components.push({
          layerTemplateId: layer.id,
          layerName: layer.name,
          role: c.component.role,
          quantity: round(wasteAdjusted, 3),
          unit: c.unit,
          formula: `${c.formula}; × (1 + ${layer.wastePercent}%) = ${round(wasteAdjusted, 3)}`,
        });
      }
    }
  }

  return { layers, components, errors };
}

function emptyLayerResult(
  layer: WallLayerTemplate,
  steps: CalcStep[],
  overridden: OverrideIndicator[],
  errors: string[],
): LayerQuantityResult {
  for (const e of errors) steps.push({ label: "Refused", detail: e });
  return {
    layerTemplateId: layer.id,
    layerName: layer.name,
    category: layer.category,
    materialName: layer.materialRole,
    baseQuantity: 0,
    wastePercent: layer.wastePercent,
    adjustedQuantity: 0,
    purchaseQuantity: 0,
    purchaseUnit: layer.unit,
    steps,
    overridden,
    surfaceWarning: errors.length > 0 ? errors.join(" ") : null,
  };
}

export function round(v: number, d: number): number {
  const f = Math.pow(10, d);
  return Math.round(v * f) / f;
}
