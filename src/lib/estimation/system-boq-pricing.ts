// =========================================================
// SYSTEM BOQ PRICING
//
// ICF and EIFS takeoffs are quantity engines: they count blocks, mesh,
// concrete and coats. Pricing is a separate question and must not be answered
// inside the engine, because a price is a property of a market and a day, not
// of a wall.
//
// Each BOQ line may name a material role. This module resolves those roles
// through the same city-aware resolver every other calculator uses, so an ICF
// or EIFS estimate carries the same provenance, currency and evidence sentence
// as a paint estimate. A line with no role stays a quantity and is reported as
// unpriced rather than guessed.
// =========================================================

import type {
  MaterialRole,
  ResolvedMaterialPrice,
} from "@/lib/estimation/market-materials";
import { resolveCityAwarePriceByRole } from "@/lib/price-index/calculator-prices";

/**
 * The unit each system role's price is quoted in.
 *
 * A form block is sold per square metre of face, not per block. Ready-mix is
 * per cubic metre. Rebar, base coat and finish are per kilogram. Multiplying a
 * per-m2 price by a block count overstates a wall by more than an order of
 * magnitude, so the quantity is carried in the priced unit explicitly and a
 * disagreement is refused rather than multiplied.
 */
export const ROLE_PRICING_UNIT: Partial<
  Record<MaterialRole, "m²" | "m³" | "kg">
> = {
  "icf-form-block": "m²",
  "icf-concrete": "m³",
  "icf-rebar": "kg",
  "eifs-insulation": "m²",
  "eifs-mesh": "m²",
  "eifs-adhesive": "kg",
  "eifs-basecoat": "kg",
  "eifs-primer": "kg",
  "eifs-finish": "kg",
};

export interface PriceableBoqLine {
  code: string;
  quantity: number;
  priceRole?: MaterialRole;
  /** Quantity in the unit the price is quoted in (see ROLE_PRICING_UNIT). */
  pricingQuantity?: number;
  pricingUnit?: "m²" | "m³" | "kg";
}

export interface PricedBoqLine {
  rate: number;
  amount: number;
  currency: string;
  role: MaterialRole;
  /** Market whose price book supplied the figure; may differ from the request. */
  resolvedMarket: string;
  evidence: ResolvedMaterialPrice["evidence"];
  sourceNote: string;
  effectiveDate: string;
  /** Unit the rate is quoted in, e.g. "m²". */
  unit: string;
  /** Quantity the amount was computed from, in `unit`. */
  pricedQuantity: number;
}

export interface SystemBoqPricing {
  lines: Record<string, PricedBoqLine>;
  /** Sum of priced lines only, in `currency`. */
  total: number;
  currency: string | null;
  /** Roles the market could not price: shown to the user, never filled in. */
  unpricedRoles: MaterialRole[];
  /** Lines with no role at all, e.g. site bracing: quantity only by design. */
  quantityOnlyCodes: string[];
  /** Lines whose engine quantity is not in the role's priced unit. */
  unitMismatches: string[];
  loading: boolean;
}

/** Money for display, in the currency the price book actually quoted. */
export function formatMoney(amount: number, currency: string | null): string {
  if (!currency) return amount.toFixed(2);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function emptyPricing(): SystemBoqPricing {
  return {
    lines: {},
    total: 0,
    currency: null,
    unpricedRoles: [],
    quantityOnlyCodes: [],
    unitMismatches: [],
    loading: false,
  };
}

function sourceNoteFor(p: ResolvedMaterialPrice): string {
  return [p.price.price_source, p.material?.name]
    .filter(Boolean)
    .join(" - ")
    .slice(0, 180);
}

export async function priceSystemBoq(
  boq: PriceableBoqLine[],
  market: string,
  citySlug?: string | null,
): Promise<SystemBoqPricing> {
  const roles = [
    ...new Set(boq.map((l) => l.priceRole).filter(Boolean)),
  ] as MaterialRole[];
  const quantityOnlyCodes = boq.filter((l) => !l.priceRole).map((l) => l.code);

  const resolved = new Map<MaterialRole, ResolvedMaterialPrice>();
  const unpricedRoles: MaterialRole[] = [];

  await Promise.all(
    roles.map(async (role) => {
      const hit = await resolveCityAwarePriceByRole(
        role,
        market,
        citySlug ?? null,
      );
      if (hit) resolved.set(role, hit);
      else unpricedRoles.push(role);
    }),
  );

  const lines: Record<string, PricedBoqLine> = {};
  const unitMismatches: string[] = [];
  let total = 0;
  let currency: string | null = null;

  for (const line of boq) {
    if (!line.priceRole) continue;
    const hit = resolved.get(line.priceRole);
    if (!hit) continue;
    const rate = hit.price.price;
    if (!Number.isFinite(rate) || rate <= 0) continue;

    const expectedUnit = ROLE_PRICING_UNIT[line.priceRole];
    if (expectedUnit && line.pricingUnit && line.pricingUnit !== expectedUnit) {
      unitMismatches.push(
        `${line.code}: quantity in ${line.pricingUnit}, price per ${expectedUnit}`,
      );
      continue;
    }
    const pricedQuantity = line.pricingQuantity ?? line.quantity;
    if (!Number.isFinite(pricedQuantity) || pricedQuantity <= 0) continue;
    const amount = Number((rate * pricedQuantity).toFixed(2));
    lines[line.code] = {
      rate,
      amount,
      currency: hit.price.currency,
      role: line.priceRole,
      resolvedMarket: hit.resolved_market,
      evidence: hit.evidence,
      sourceNote: sourceNoteFor(hit),
      effectiveDate: hit.price.effective_date,
      unit: expectedUnit ?? line.pricingUnit ?? "",
      pricedQuantity,
    };
    total += amount;
    currency ??= hit.price.currency;
  }

  return {
    lines,
    total: Number(total.toFixed(2)),
    currency,
    unpricedRoles: unpricedRoles.sort(),
    quantityOnlyCodes,
    unitMismatches,
    loading: false,
  };
}
