// =========================================================
// FRELUX Wall Finishing — cost engine.
//
// Cost = materials + labour + equipment + transport,
//        then × (1 + contingency%).
//
// Currency guard: every price enters with its own currency;
// mixing currencies is refused with a clear error — never
// silently converted. Prices resolve through the market price
// book with provenance; manual prices are flagged as estimates.
// =========================================================

import type {
  CalcStep,
  LabourRateMethod,
  ProjectCostBreakdown,
  ResolvedLabourRate,
  ResolvedLayerPrice,
} from "@/types/wallfinishing";
import { round } from "./quantity-engine";

export interface LayerCostInput {
  /** purchase quantity in the layer's purchase unit */
  quantity: number;
  purchaseUnit: string;
  price: ResolvedLayerPrice;
  labour?: ResolvedLabourRate | null;
  /** finishing area that drives area-based labour */
  areaM2: number;
  /** per-layer labour rate override (user-typed, in project currency) */
  labourRateOverride?: number;
  layerName: string;
}

export interface LayerCostResult {
  materialCost: number | null;
  labourCost: number | null;
  labourSteps: CalcStep[];
  currency: string;
  errors: string[];
}

export function calculateLayerCost(input: LayerCostInput): LayerCostResult {
  const errors: string[] = [];
  const labourSteps: CalcStep[] = [];
  const currency = input.price.currency;

  // ── material cost ──
  let materialCost: number | null = null;
  if (input.quantity <= 0) {
    materialCost = 0; // labour-only call — no material to price
  } else if (input.price.unitPrice !== null && input.price.unpriced === false) {
    if (input.price.packUnits && input.price.packUnits > 1) {
      // The market sells packs (20 L pail, 4.5 gal pail...): convert the
      // coverage-unit quantity into whole purchase packs.
      const packs = Math.ceil(input.quantity / input.price.packUnits);
      materialCost = round(packs * input.price.unitPrice, 2);
      labourSteps.push({
        label: `${input.layerName} — material`,
        detail:
          `${input.quantity} ${input.purchaseUnit} ÷ ${input.price.packUnits} per ` +
          `${input.price.purchaseLabel ?? "pack"} → ${packs} ${input.price.purchaseLabel ?? "pack(s)"}` +
          ` × ${input.price.unitPrice} ${currency} = ${materialCost} ${currency}`,
        formula: `${packs} × ${input.price.unitPrice} = ${materialCost}`,
      });
    } else {
      materialCost = round(input.quantity * input.price.unitPrice, 2);
      labourSteps.push({
        label: `${input.layerName} — material`,
        detail:
          `${input.quantity} ${input.purchaseUnit} × ${input.price.unitPrice} ${currency}` +
          ` = ${materialCost} ${currency}`,
        formula: `${input.quantity} × ${input.price.unitPrice} = ${materialCost}`,
      });
    }
  } else {
    errors.push(
      `${input.layerName}: no verified price in this market yet — enter your local price to price this layer.`,
    );
  }

  // ── labour cost ──
  let labourCost: number | null = null;
  const override = input.labourRateOverride;
  const rate = input.labour;
  if (override !== undefined && override !== null) {
    if (override < 0) {
      errors.push(
        `${input.layerName}: labour rate override cannot be negative.`,
      );
    } else if (
      rate &&
      rate.method === "per-day-output" &&
      rate.outputPerWorkerDay
    ) {
      const workerDays = input.areaM2 / (override * 1); // override = output per worker-day
      labourCost = round(workerDays * (rate.rate ?? 0), 2);
    } else {
      // default: override is a per-m² rate in the project currency
      labourCost = round(input.areaM2 * override, 2);
      labourSteps.push({
        label: `${input.layerName} — labour (your rate)`,
        detail: `${input.areaM2} m² × ${override} ${currency}/m² = ${labourCost} ${currency}`,
        formula: `${input.areaM2} × ${override} = ${labourCost}`,
      });
    }
  } else if (rate && rate.rate !== null && rate.rate >= 0) {
    labourCost = labourCostForMethod(
      rate,
      input.areaM2,
      input.quantity,
      labourSteps,
      input.layerName,
    );
  } else {
    errors.push(
      `${input.layerName}: no labour rate configured for this market — enter one to include labour.`,
    );
  }

  return { materialCost, labourCost, labourSteps, currency, errors };
}

function labourCostForMethod(
  rate: ResolvedLabourRate,
  areaM2: number,
  quantity: number,
  steps: CalcStep[],
  layerName: string,
): number | null {
  if (rate.rate === null) return null;
  switch (rate.method) {
    case "per-m2": {
      const cost = round(areaM2 * rate.rate, 2);
      steps.push({
        label: `${layerName} — labour (${rate.taskKey})`,
        detail: `${areaM2} m² × ${rate.rate} ${rate.currency}/m² = ${cost} ${rate.currency}`,
        formula: `${areaM2} × ${rate.rate} = ${cost}`,
      });
      return cost;
    }
    case "per-day-output": {
      if (!rate.outputPerWorkerDay || rate.outputPerWorkerDay <= 0) return null;
      const workerDays = areaM2 / rate.outputPerWorkerDay;
      const cost = round(workerDays * rate.rate, 2);
      steps.push({
        label: `${layerName} — labour (${rate.taskKey})`,
        detail:
          `${areaM2} m² ÷ ${rate.outputPerWorkerDay} m²/worker-day = ${round(workerDays, 2)} worker-days` +
          ` × ${rate.rate} ${rate.currency}/day = ${cost} ${rate.currency}`,
      });
      return cost;
    }
    case "hourly": {
      // assume 20 m²/hour of finished wall per painter — configurable via rate rate... kept explicit
      const hours = areaM2 / 20;
      const cost = round(hours * rate.rate, 2);
      steps.push({
        label: `${layerName} — labour (${rate.taskKey}, hourly)`,
        detail: `${areaM2} m² ÷ 20 m²/h = ${round(hours, 2)} h × ${rate.rate} ${rate.currency}/h = ${cost} ${rate.currency}`,
      });
      return cost;
    }
    case "per-unit": {
      const cost = round(quantity * rate.rate, 2);
      steps.push({
        label: `${layerName} — labour (${rate.taskKey}, per unit)`,
        detail: `${quantity} × ${rate.rate} ${rate.currency} = ${cost} ${rate.currency}`,
      });
      return cost;
    }
    default:
      return null;
  }
}

export interface ProjectCostInput {
  /** already-computed per-room totals (each carries its currency) */
  roomTotals: {
    roomId: string;
    name: string;
    total: number;
    currency: string;
  }[];
  projectCurrency: string;
  /** aggregated materials / labour across every priced layer */
  materialsTotal: number;
  labourTotal: number;
  extraCosts: { id: string; label: string; amount: number }[];
  contingencyPercent: number;
}

export function calculateProjectCost(
  input: ProjectCostInput,
): ProjectCostBreakdown {
  const steps: CalcStep[] = [];
  const errors: string[] = [];
  const currency = input.projectCurrency;

  // currency guard — refuse mixed books
  for (const r of input.roomTotals) {
    if (r.currency !== currency) {
      errors.push(
        `Room '${r.name}' costs are in ${r.currency} but the project is in ${currency} — ` +
          `mixed currencies are refused, never converted silently.`,
      );
    }
  }

  const subtotal =
    input.roomTotals.reduce(
      (s, r) => s + (Number.isFinite(r.total) ? r.total : 0),
      0,
    ) +
    input.extraCosts.reduce(
      (s, e) => s + (Number.isFinite(e.amount) ? e.amount : 0),
      0,
    );

  steps.push({
    label: "Room + wall finishing subtotal",
    detail: `${input.roomTotals.length} room total(s) + equipment/transport = ${round(subtotal, 2)} ${currency}`,
  });

  if (input.contingencyPercent < 0 || input.contingencyPercent > 100) {
    errors.push("Contingency must be between 0 and 100 percent.");
  }
  const contingency = round(subtotal * (input.contingencyPercent / 100), 2);
  if (input.contingencyPercent > 0) {
    steps.push({
      label: `Contingency (${input.contingencyPercent}%)`,
      detail: `${round(subtotal, 2)} × ${input.contingencyPercent}% = ${contingency} ${currency}`,
    });
  }

  const total = round(subtotal + contingency, 2);
  steps.push({
    label: "Total estimated cost",
    detail: `${round(subtotal, 2)} + ${contingency} = ${total} ${currency}`,
  });

  return {
    materials: round(input.materialsTotal, 2),
    labour: round(input.labourTotal, 2),
    equipment: round(
      input.extraCosts.reduce(
        (s, e) => s + (Number.isFinite(e.amount) ? e.amount : 0),
        0,
      ),
      2,
    ),
    transport: 0,
    contingency,
    subtotal: round(subtotal, 2),
    total,
    currency,
    steps: [
      ...steps,
      ...(errors.length
        ? [{ label: "Warnings", detail: errors.join(" ") }]
        : []),
    ],
  };
}
