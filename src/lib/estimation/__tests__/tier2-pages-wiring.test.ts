/**
 * Tier 2 estimator pages wiring tests (Engines: electrical,
 * plumbing, waterproofing, flooring, reinforcement, foundation,
 * doors_windows, generator)
 *
 * The deterministic math is covered by each engine's test file
 * (146 tests total). The page components are ports of the
 * shared estimator template (already covered by the older
 * estimator page tests' rendering pattern). What these pin is
 * the WIRING: a route, a Calculators card, a sitemap entry and
 * an admin rules type for each of the eight engines — the
 * regression net that catches silent wiring aborts.
 */

import { describe, it, expect } from "vitest";

const ENGINES = [
  {
    route: "/electrical",
    slug: "ElectricalEstimator",
    calc: "electrical",
    card: "Electrical",
  },
  {
    route: "/plumbing",
    slug: "PlumbingEstimator",
    calc: "plumbing",
    card: "Plumbing",
  },
  {
    route: "/waterproofing",
    slug: "WaterproofingEstimator",
    calc: "waterproofing",
    card: "Waterproofing",
  },
  {
    route: "/flooring",
    slug: "FlooringEstimator",
    calc: "flooring",
    card: "Flooring",
  },
  {
    route: "/reinforcement",
    slug: "ReinforcementEstimator",
    calc: "reinforcement",
    card: "Reinforcement / Steel",
  },
  {
    route: "/foundation",
    slug: "FoundationEstimator",
    calc: "foundation",
    card: "Foundation",
  },
  {
    route: "/doors-windows",
    slug: "DoorsWindowsEstimator",
    calc: "doors_windows",
    card: "Doors & Windows",
  },
  {
    route: "/generator",
    slug: "GeneratorEstimator",
    calc: "generator",
    card: "Backup Power / Generator",
  },
] as const;

async function read(rel: string): Promise<string> {
  const fs = await import("fs");
  return fs.readFileSync(rel, "utf-8");
}

describe("Tier 2 estimator pages wiring", () => {
  it("every engine has a route, a lazy import and a Calculators card", async () => {
    const app = await read("src/App.tsx");
    const cards = await read("src/pages/Calculators.tsx");
    for (const e of ENGINES) {
      expect(app, `App.tsx must lazy-import ${e.slug}`).toContain(e.slug);
      expect(app, `App.tsx must register the ${e.route} route`).toContain(
        `path="${e.route}"`,
      );
      expect(cards, `Calculators.tsx must card-link ${e.route}`).toContain(
        `to: "${e.route}"`,
      );
      expect(cards, `Calculators.tsx must title the ${e.route} card`).toContain(
        e.card,
      );
    }
  });

  it("every engine has a sitemap entry (SEO)", async () => {
    const sitemap = await read("scripts/generate-sitemap.mjs");
    for (const e of ENGINES) {
      expect(sitemap, `sitemap must include ${e.route}`).toContain(
        `path: '${e.route}'`,
      );
    }
  });

  it("every engine's calculator type is admin-configurable (Calc Rules)", async () => {
    const config = await read("src/pages/admin/AdminEstimationConfig.tsx");
    for (const e of ENGINES) {
      expect(config, `Admin Calc Rules must list '${e.calc}'`).toMatch(
        new RegExp(`["']${e.calc}["']`),
      );
    }
  });

  it("the generator admin type was corrected from 'backup_power'", async () => {
    const config = await read("src/pages/admin/AdminEstimationConfig.tsx");
    expect(config).not.toMatch(/["']backup_power["']/);
    expect(config).toMatch(/["']generator["']/);
  });

  it("every engine page uses its own calculator_type and engine", async () => {
    for (const e of ENGINES) {
      const page = await read(`src/pages/${e.slug}.tsx`);
      expect(page, `${e.slug} must fetch its own rules`).toContain(
        `fetchCalcRules("${e.calc}")`,
      );
      expect(page, `${e.slug} must log its own calculator_type`).toContain(
        `calculator_type: "${e.calc}"`,
      );
    }
  });
});
