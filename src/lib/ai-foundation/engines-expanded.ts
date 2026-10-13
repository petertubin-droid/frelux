/**
 * FRELUX AI Foundation, Expanded Engine Registrations
 *
 * Wraps authoritative deterministic calculation engines for AI orchestration.
 * Guarantees that AI features (conversational estimator, photo estimator, etc.)
 * execute physical formulas and calculations deterministically without hallucination.
 */

import type { EngineResult } from "./types";
import { getCountryCurrency } from "@/lib/international/countries";
import { registerEngine, quantityLine } from "./engines-registry";
import {
  fetchCalcRules,
  fetchEstimationMaterials,
  fetchMarketPriceBook,
} from "@/lib/estimation/queries";
import type {
  EstimationCalcRule,
  EstimationMaterial,
} from "@/types/estimation";

/** Shared result scaffolding so every adapter returns a valid EngineResult. */
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

/**
 * Build the slug -> price map the electrical/plumbing engines expect, from
 * the shared material catalog + the market price book (same source the
 * estimator pages use). NG is the reference market for the AI layer unless
 * the caller passes a marketCode.
 */
async function buildSlugPriceMap(
  marketCode: string,
): Promise<Record<string, number | null>> {
  const [book, matsRes] = await Promise.all([
    fetchMarketPriceBook(marketCode),
    fetchEstimationMaterials(true),
  ]);
  const map: Record<string, number | null> = {};
  for (const m of (matsRes.data ?? []) as EstimationMaterial[]) {
    map[m.slug] = book.byRef.get(m.id) ?? null;
  }
  return map;
}

export function registerExpandedEngines(): void {
  // ── Electrical Wiring Engine ──
  registerEngine({
    id: "electrical",
    domain: "building",
    title: "FRELUX International Electrical Engine",
    authoritative: true,
    creditedAs: "Calculated by the authoritative FRELUX electrical engine",
    async run(rawInput) {
      const {
        calculateElectrical,
        parseElectricalRules,
      } = await import("@/lib/estimation/electrical-engine");
      const typed = rawInput as {
        marketCode?: string;
        currency?: string;
      };
      const marketCode = typed.marketCode?.trim().toUpperCase();
      if (!marketCode) {
        return engineFail(
          "electrical",
          "Market code is required (e.g. NG, US, GB). FRELUX AI will not assume a country — specify the project location so the correct price book and wiring rules apply.",
        );
      }
      try {
        const [rulesRes, priceMap] = await Promise.all([
          fetchCalcRules("electrical"),
          buildSlugPriceMap(marketCode),
        ]);
        const rules = parseElectricalRules(
          (rulesRes.data ?? []) as unknown as EstimationCalcRule[],
        );
        const input = rawInput as Parameters<
          typeof calculateElectrical
        >[0];
        const result = calculateElectrical(input, rules, priceMap);
        if (!result.ok) {
          return engineFail(
            "electrical",
            result.errors.join("; ") || "Electrical calculation failed",
          );
        }
        const quantities = result.lines
          .filter((l) => l.quantity != null && l.quantity > 0)
          .map((l) => quantityLine(l.label, l.quantity as number, l.unit));
        return engineOk(
          "electrical",
          quantities,
          {
            total: result.material_subtotal ?? result.priced_subtotal,
            currency: typed.currency || getCountryCurrency(marketCode) || "USD",
            lines: result.lines
              .filter((l) => l.line_total != null)
              .map((l) => ({
                label: l.label,
                amount: l.line_total as number,
              })),
            regionalDataAvailable: marketCode === "NG" || Object.values(priceMap).some((p) => p != null),
          },
          result,
        );
      } catch (err) {
        return engineFail("electrical", String(err));
      }
    },
  });

  // ── Plumbing Engine ──
  registerEngine({
    id: "plumbing",
    domain: "building",
    title: "FRELUX International Plumbing Engine",
    authoritative: true,
    creditedAs: "Calculated by the authoritative FRELUX plumbing engine",
    async run(rawInput) {
      const {
        calculatePlumbing,
        parsePlumbingRules,
      } = await import("@/lib/estimation/plumbing-engine");
      const typed = rawInput as {
        marketCode?: string;
        currency?: string;
      };
      const marketCode = typed.marketCode?.trim().toUpperCase();
      if (!marketCode) {
        return engineFail(
          "plumbing",
          "Market code is required (e.g. NG, US, GB). FRELUX AI will not assume a country — specify the project location so the correct price book and pipe sizing rules apply.",
        );
      }
      try {
        const [rulesRes, priceMap] = await Promise.all([
          fetchCalcRules("plumbing"),
          buildSlugPriceMap(marketCode),
        ]);
        const rules = parsePlumbingRules(
          (rulesRes.data ?? []) as unknown as EstimationCalcRule[],
        );
        const input = rawInput as Parameters<typeof calculatePlumbing>[0];
        const result = calculatePlumbing(input, rules, priceMap);
        if (!result.ok) {
          return engineFail(
            "plumbing",
            result.errors.join("; ") || "Plumbing calculation failed",
          );
        }
        const quantities = result.lines
          .filter((l) => l.quantity != null && l.quantity > 0)
          .map((l) => quantityLine(l.label, l.quantity as number, l.unit));
        return engineOk(
          "plumbing",
          quantities,
          {
            total: result.material_subtotal ?? result.priced_subtotal,
            currency: typed.currency || getCountryCurrency(marketCode) || "USD",
            lines: result.lines
              .filter((l) => l.line_total != null)
              .map((l) => ({
                label: l.label,
                amount: l.line_total as number,
              })),
            regionalDataAvailable: marketCode === "NG" || Object.values(priceMap).some((p) => p != null),
          },
          result,
        );
      } catch (err) {
        return engineFail("plumbing", String(err));
      }
    },
  });

  // ── Regional Cost Index Engine ──
  registerEngine({
    id: "regional_cost",
    domain: "cost",
    title: "FRELUX Regional Cost Index Engine",
    authoritative: true,
    creditedAs: "Calculated by the authoritative FRELUX regional cost engine",
    async run(rawInput) {
      const {
        applyRegionalCost,
      } = await import("@/lib/estimation/regional-cost-engine");
      const typed = rawInput as { currency?: string; marketCode?: string };
      const input = rawInput as Parameters<typeof applyRegionalCost>[0];
      const result = applyRegionalCost(input);
      if (!result.ok) {
        return engineFail(
          "regional_cost",
          result.warnings.join("; ") || "No regional cost index available",
        );
      }
      return engineOk(
        "regional_cost",
        [
          quantityLine(
            "Applied Multiplier",
            result.applied_factor ?? 1,
            "factor",
          ),
        ],
        {
          total: result.adjusted_cost ?? 0,
          currency:
            typed.currency ||
            (typed.marketCode ? getCountryCurrency(typed.marketCode) : "") ||
            "USD",
          lines: [
            {
              label: "Location-Adjusted Cost",
              amount: result.adjusted_cost ?? 0,
            },
          ],
          regionalDataAvailable: result.applied_source !== "national_baseline",
        },
        result,
      );
    },
  });

  // ── Roof Geometry Engine ──
  
  // ── Contractor Margin & Markup Engine ──
  registerEngine({
    id: "margin_calculator",
    domain: "cost",
    title: "FRELUX Contractor Margin & Markup Engine",
    authoritative: true,
    creditedAs: "Calculated by the authoritative FRELUX margin engine",
    async run(rawInput) {
      const {
        calculateMargin,
      } = await import("@/lib/estimation/margin-engine");
      const typed = rawInput as { currency?: string };
      const input = rawInput as Parameters<typeof calculateMargin>[0];
      const result = calculateMargin(input);
      if (!result.ok || result.basis == null) {
        return engineFail(
          "margin_calculator",
          result.warnings.join("; ") || "Margin calculation failed",
        );
      }
      return engineOk(
        "margin_calculator",
        [
          quantityLine(
            result.basis === "markup_on_cost"
              ? "Margin (markup on cost)"
              : "Margin (margin on price)",
            result.margin_percent ?? 0,
            "%",
          ),
          quantityLine("Profit", result.profit ?? 0, "amount"),
          quantityLine("Equivalent Other-Basis Margin", result.equivalent_other_basis_percent ?? 0, "%"),
        ],
        {
          total: result.quote_total ?? result.priced_subtotal ?? result.base_cost ?? 0,
          currency: typed.currency || "USD",
          lines: [
            { label: "Base Cost", amount: result.base_cost ?? 0 },
            { label: "Profit", amount: result.profit ?? 0 },
            {
              label: "Price before VAT",
              amount: result.priced_subtotal ?? 0,
            },
            { label: `VAT (${result.vat_rate ?? 0}%)`, amount: result.vat_amount ?? 0 },
            { label: "Quote Total", amount: result.quote_total ?? 0 },
          ],
          regionalDataAvailable: true,
        },
        result,
      );
    },
  });
}
