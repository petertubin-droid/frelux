/**
 * FRELUX LABOUR COST ENGINE
 *
 * Feature 19: Labour Cost Estimation
 *
 * Estimates labour costs based on project scope, material quantities,
 * and configurable labour rates. Labour is calculated per-trade,
 * per-activity, using either:
 *   - Rate per unit (m², m³, bags, trips, days)
 *   - Rate per project (lump sum)
 *   - Percentage of material cost
 *
 * Labour rates are NOT hardcoded — they come from admin configuration
 * or user overrides. The engine only does the math.
 *
 * Architecture:
 *   PROJECT SCOPE (area, volume, material quantities)
 *     ↓
 *   LABOUR ACTIVITY (per-trade: foundation, masonry, roofing, finishing)
 *     ↓
 *   RATE × QUANTITY = LABOUR COST
 *     ↓
 *   TRADE SUBTOTALS
 *     ↓
 *   TOTAL LABOUR COST
 *
 * Additive — does not replace existing labour calculations in contractor.ts.
 */

import type { ConfidenceLevel } from './confidence-engine';

// =========================================================
// LABOUR TYPES
// =========================================================

export type LabourRateType = 'per_unit' | 'lump_sum' | 'percentage_of_materials';

export type TradeCategory =
  | 'site_preparation'
  | 'foundation'
  | 'masonry'
  | 'concrete_works'
  | 'roofing'
  | 'plastering'
  | 'tiling'
  | 'painting'
  | 'pop_ceiling'
  | 'screeding'
  | 'electrical'
  | 'plumbing'
  | 'finishing'
  | 'other';

export const TRADE_LABELS: Record<TradeCategory, string> = {
  site_preparation: 'Site Preparation',
  foundation: 'Foundation',
  masonry: 'Masonry / Blockwork',
  concrete_works: 'Concrete Works',
  roofing: 'Roofing',
  plastering: 'Plastering',
  tiling: 'Tiling',
  painting: 'Painting',
  pop_ceiling: 'POP Ceiling',
  screeding: 'Screeding',
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  finishing: 'Finishing',
  other: 'Other',
};

// =========================================================
// LABOUR RATE
// =========================================================

export interface LabourRate {
  activity: string;
  trade: TradeCategory;
  rateType: LabourRateType;
  ratePerUnit: number;
  unit: string;
  lumpSumAmount?: number;
  percentage?: number;
  currency: string;
  source: 'admin_config' | 'user_override' | 'default';
  overridden: boolean;
}

// =========================================================
// LABOUR ACTIVITY INPUT
// =========================================================

export interface LabourActivityInput {
  activity: string;
  trade: TradeCategory;
  quantity: number;
  unit: string;
  materialCostForPercentage?: number;
}

// =========================================================
// LABOUR LINE ITEM
// =========================================================

export interface LabourLineItem {
  id: string;
  activity: string;
  trade: TradeCategory;
  tradeLabel: string;
  rateType: LabourRateType;
  ratePerUnit: number;
  quantity: number;
  unit: string;
  lineTotal: number;
  currency: string;
  rateSource: string;
  rateOverridden: boolean;
  hasRate: boolean;
  explanation: string;
}

// =========================================================
// LABOUR TRADE SUBTOTAL
// =========================================================

export interface LabourTradeSubtotal {
  trade: TradeCategory;
  tradeLabel: string;
  items: LabourLineItem[];
  subtotal: number;
  itemCount: number;
}

// =========================================================
// LABOUR COST RESULT
// =========================================================

export interface LabourCostResult {
  lineItems: LabourLineItem[];
  tradeSubtotals: LabourTradeSubtotal[];
  totalLabourCost: number;
  currency: string;
  confidence: ConfidenceLevel;
  itemCount: number;
  unpricedCount: number;
  overriddenCount: number;
  allPriced: boolean;
  explanation: string[];
}

// =========================================================
// FACTORY
// =========================================================

let labourItemIdCounter = 0;

function generateLabourItemId(): string {
  return `labour_${++labourItemIdCounter}`;
}

// =========================================================
// LABOUR LINE ITEM BUILDER
// =========================================================

export function buildLabourLineItem(
  input: LabourActivityInput,
  rate: LabourRate | null,
): LabourLineItem {
  if (!rate) {
    return {
      id: generateLabourItemId(),
      activity: input.activity,
      trade: input.trade,
      tradeLabel: TRADE_LABELS[input.trade],
      rateType: 'per_unit',
      ratePerUnit: 0,
      quantity: input.quantity,
      unit: input.unit,
      lineTotal: 0,
      currency: '',
      rateSource: 'not_configured',
      rateOverridden: false,
      hasRate: false,
      explanation: `${input.activity}: ${input.quantity} ${input.unit} — no labour rate configured`,
    };
  }

  let lineTotal = 0;
  let explanation = '';

  if (rate.rateType === 'per_unit') {
    lineTotal = input.quantity * rate.ratePerUnit;
    explanation = `${input.activity}: ${input.quantity} ${input.unit} × ${rate.ratePerUnit} ${rate.currency}/${rate.unit}`;
  } else if (rate.rateType === 'lump_sum') {
    lineTotal = rate.lumpSumAmount ?? 0;
    explanation = `${input.activity}: lump sum ${lineTotal} ${rate.currency}`;
  } else if (rate.rateType === 'percentage_of_materials') {
    const materialCost = input.materialCostForPercentage ?? 0;
    lineTotal = materialCost * ((rate.percentage ?? 0) / 100);
    explanation = `${input.activity}: ${rate.percentage}% of ${materialCost} ${rate.currency} (material cost)`;
  }

  if (rate.overridden) {
    explanation += ' (user-overridden rate)';
  }

  return {
    id: generateLabourItemId(),
    activity: input.activity,
    trade: input.trade,
    tradeLabel: TRADE_LABELS[input.trade],
    rateType: rate.rateType,
    ratePerUnit: rate.ratePerUnit,
    quantity: input.quantity,
    unit: input.unit,
    lineTotal,
    currency: rate.currency,
    rateSource: rate.source,
    rateOverridden: rate.overridden,
    hasRate: true,
    explanation,
  };
}

// =========================================================
// LABOUR COST ESTIMATOR
// =========================================================

export function calculateLabourCost(
  activities: LabourActivityInput[],
  rates: Map<string, LabourRate>,
  options?: { currency?: string },
): LabourCostResult {
  const currency = options?.currency ?? 'NGN';

  const lineItems: LabourLineItem[] = activities.map((act) => {
    const rate = rates.get(act.activity) ?? null;
    return buildLabourLineItem(act, rate);
  });

  const tradeMap = new Map<TradeCategory, LabourLineItem[]>();
  for (const item of lineItems) {
    if (!tradeMap.has(item.trade)) tradeMap.set(item.trade, []);
    tradeMap.get(item.trade)!.push(item);
  }

  const tradeSubtotals: LabourTradeSubtotal[] = [];
  for (const [trade, items] of tradeMap) {
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    tradeSubtotals.push({
      trade,
      tradeLabel: TRADE_LABELS[trade],
      items,
      subtotal,
      itemCount: items.length,
    });
  }

  const totalLabourCost = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const unpricedCount = lineItems.filter((item) => !item.hasRate).length;
  const overriddenCount = lineItems.filter((item) => item.rateOverridden).length;

  let confidence: ConfidenceLevel;
  if (unpricedCount > 0) {
    confidence = 'review_required';
  } else if (overriddenCount > lineItems.length / 2) {
    confidence = 'medium';
  } else {
    confidence = 'high';
  }

  const explanation: string[] = [];
  explanation.push(`Total labour cost: ${totalLabourCost.toFixed(2)} ${currency}`);
  explanation.push(`Activities: ${lineItems.length}`);
  explanation.push(`Trades: ${tradeSubtotals.length}`);
  explanation.push(`Confidence: ${confidence.toUpperCase()}`);
  if (unpricedCount > 0) {
    explanation.push(`${unpricedCount} activity(s) without rates`);
  }

  return {
    lineItems,
    tradeSubtotals,
    totalLabourCost,
    currency,
    confidence,
    itemCount: lineItems.length,
    unpricedCount,
    overriddenCount,
    allPriced: unpricedCount === 0,
    explanation,
  };
}

// =========================================================
// DEFAULT LABOUR ACTIVITIES FROM PROJECT SCOPE
// =========================================================

export function generateDefaultLabourActivities(scope: {
  foundationVolumeM3?: number;
  blockWallAreaM2?: number;
  concreteVolumeM3?: number;
  roofAreaM2?: number;
  plasterAreaM2?: number;
  tileAreaM2?: number;
  paintAreaM2?: number;
  screedingAreaM2?: number;
  popCeilingAreaM2?: number;
  generalLabourDays?: number;
}): LabourActivityInput[] {
  const activities: LabourActivityInput[] = [];

  if (scope.foundationVolumeM3 && scope.foundationVolumeM3 > 0) {
    activities.push({ activity: 'Excavation', trade: 'foundation', quantity: scope.foundationVolumeM3, unit: 'm³' });
    activities.push({ activity: 'Blinding concrete', trade: 'foundation', quantity: scope.foundationVolumeM3, unit: 'm³' });
    activities.push({ activity: 'Foundation concrete', trade: 'foundation', quantity: scope.foundationVolumeM3, unit: 'm³' });
  }

  if (scope.blockWallAreaM2 && scope.blockWallAreaM2 > 0) {
    activities.push({ activity: 'Block laying', trade: 'masonry', quantity: scope.blockWallAreaM2, unit: 'm²' });
  }

  if (scope.concreteVolumeM3 && scope.concreteVolumeM3 > 0) {
    activities.push({ activity: 'Concrete works', trade: 'concrete_works', quantity: scope.concreteVolumeM3, unit: 'm³' });
  }

  if (scope.roofAreaM2 && scope.roofAreaM2 > 0) {
    activities.push({ activity: 'Roofing installation', trade: 'roofing', quantity: scope.roofAreaM2, unit: 'm²' });
  }

  if (scope.plasterAreaM2 && scope.plasterAreaM2 > 0) {
    activities.push({ activity: 'Plastering', trade: 'plastering', quantity: scope.plasterAreaM2, unit: 'm²' });
  }

  if (scope.tileAreaM2 && scope.tileAreaM2 > 0) {
    activities.push({ activity: 'Tile installation', trade: 'tiling', quantity: scope.tileAreaM2, unit: 'm²' });
  }

  if (scope.paintAreaM2 && scope.paintAreaM2 > 0) {
    activities.push({ activity: 'Painting', trade: 'painting', quantity: scope.paintAreaM2, unit: 'm²' });
  }

  if (scope.screedingAreaM2 && scope.screedingAreaM2 > 0) {
    activities.push({ activity: 'Screeding', trade: 'screeding', quantity: scope.screedingAreaM2, unit: 'm²' });
  }

  if (scope.popCeilingAreaM2 && scope.popCeilingAreaM2 > 0) {
    activities.push({ activity: 'POP ceiling installation', trade: 'pop_ceiling', quantity: scope.popCeilingAreaM2, unit: 'm²' });
  }

  if (scope.generalLabourDays && scope.generalLabourDays > 0) {
    activities.push({ activity: 'Site clearing & setting out', trade: 'site_preparation', quantity: scope.generalLabourDays, unit: 'days' });
  }

  return activities;
}
