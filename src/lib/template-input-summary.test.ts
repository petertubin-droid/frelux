/**
 * Parity guard for the template configuration table.
 *
 * scripts/lib/template-input-summary.mjs renders the pre-filled settings into
 * the served HTML; templateSummaryForMarket() renders them into the React page.
 * If the two disagree, the static page and the hydrated page would show
 * different numbers for the same template. This compares them for every
 * catalog template, in both unit systems (only the United States is imperial).
 */
import { describe, expect, it } from "vitest";
import { templateInputSummary } from "../../scripts/lib/template-input-summary.mjs";
import { TEMPLATE_CATALOG } from "../../scripts/lib/template-catalog.mjs";
import { templateSummaryForMarket } from "@/lib/templates-global";
import { FALLBACK_TEMPLATES } from "@/lib/template-data";

const marketFor = (imperial: boolean) => ({
  marketCode: imperial ? "US" : "NG",
  measurementSystem: imperial ? "imperial" : "metric",
  defaultLengthUnit: imperial ? "feet" : "meters",
});

describe("template input summary parity", () => {
  for (const imperial of [false, true]) {
    it(`matches templateSummaryForMarket (${imperial ? "imperial" : "metric"})`, () => {
      const mismatches: string[] = [];
      for (const catalog of TEMPLATE_CATALOG) {
        const source = (FALLBACK_TEMPLATES as { slug: string }[]).find(
          (t) => t.slug === catalog.slug,
        );
        if (!source) continue;
        const expected = templateSummaryForMarket(
          source as never,
          marketFor(imperial) as never,
        ).map((i: { label: string; value: string }) => `${i.label}=${i.value}`);
        const actual = templateInputSummary(
          catalog,
          imperial ? "feet" : "meters",
        ).map((i) => `${i.label}=${i.value}`);
        if (JSON.stringify(expected) !== JSON.stringify(actual)) {
          mismatches.push(
            `${catalog.slug}\n  ts:  ${expected.join(", ")}\n  mjs: ${actual.join(", ")}`,
          );
        }
      }
      expect(mismatches).toEqual([]);
    });
  }
});
