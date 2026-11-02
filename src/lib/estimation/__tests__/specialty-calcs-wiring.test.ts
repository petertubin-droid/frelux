/**
 * Wiring tests for the four specialty takeoff calculators.
 *
 * The engines are covered by their own suites. What this pins is that each tool
 * is reachable and discoverable: a route, a lazy import, a Construction Tools
 * registry entry, a sitemap line, a prerender entry, header imagery, and a page
 * that renders through the shared FRELUX page shell. A calculator nobody can
 * reach is a calculator that does not exist.
 */

import { describe, expect, it } from "vitest";

const TOOLS = [
  {
    route: "/retaining-wall-calculator",
    component: "RetainingWallEstimator",
    registryTitle: "Retaining Wall Calculator",
    engine: "retaining-wall-engine",
    calcType: "retaining_wall",
  },
  {
    route: "/rainwater-gutter-soffit-cost-estimator",
    component: "SoffitGutterEstimator",
    registryTitle: "Soffit, Fascia & Gutter",
    engine: "soffit-gutter-engine",
    calcType: "soffit_gutter",
  },
  {
    route: "/electrical-conduit-wiring-estimator",
    component: "ConduitWiringEstimator",
    registryTitle: "Conduit & Wiring Loops",
    engine: "conduit-wiring-engine",
    calcType: "conduit_wiring",
  },
  {
    route: "/structural-steel-i-beam-calculator",
    component: "SteelBeamEstimator",
    registryTitle: "Steel I-Beam Weight",
    engine: "steel-beam-engine",
    calcType: "steel_beam",
  },
] as const;

async function read(rel: string): Promise<string> {
  const fs = await import("fs");
  return fs.readFileSync(rel, "utf-8");
}

describe("specialty calculator wiring", () => {
  it("every tool has a route and a lazy import", async () => {
    const app = await read("src/App.tsx");
    for (const t of TOOLS) {
      expect(app).toContain(`const ${t.component} = lazy(`);
      expect(app).toContain(`path="${t.route}"`);
      expect(app).toContain(`<${t.component} />`);
    }
  });

  it("every tool is in the Construction Tools registry", async () => {
    const registry = await read("src/config/construction-tools.ts");
    for (const t of TOOLS) {
      expect(registry).toContain(`to: "${t.route}"`);
      expect(registry).toContain(`title: "${t.registryTitle}"`);
      expect(registry).toContain(`navVisible: false`);
    }
  });

  it("every tool is in the sitemap and the prerender list", async () => {
    const sitemap = await read("scripts/generate-sitemap.mjs");
    const prerender = await read("scripts/prerender.mjs");
    for (const t of TOOLS) {
      expect(sitemap, `sitemap must include ${t.route}`).toContain(
        `path: "${t.route}"`,
      );
      expect(prerender, `prerender must include ${t.route}`).toContain(
        `path: "${t.route}"`,
      );
    }
  });

  it("every route resolves a header image", async () => {
    const images = await read("src/config/page-header-images.ts");
    expect(images).toContain(
      "retaining-wall-calculator|structural-steel-i-beam-calculator",
    );
    expect(images).toContain("rainwater-gutter-soffit-cost-estimator");
    expect(images).toContain("electrical-conduit-wiring-estimator");
  });

  it("every page renders through the shared shell with its own engine", async () => {
    for (const t of TOOLS) {
      const page = await read(`src/pages/${t.component}.tsx`);
      expect(page, `${t.component} must use its engine`).toContain(t.engine);
      expect(page, `${t.component} must use the shared shell`).toContain(
        'from "@/components/calculators/SpecialtyCalculatorShell"',
      );
      expect(page, `${t.component} must declare its route`).toContain(
        `routePath="${t.route}"`,
      );
      expect(page, `${t.component} must name its calc type`).toContain(
        `useSpecialtyPrices("${t.calcType}")`,
      );
    }
  });

  it("the shell carries the FRELUX page conventions", async () => {
    const shell = await read(
      "src/components/calculators/SpecialtyCalculatorShell.tsx",
    );
    expect(shell).toContain("<PageHeader");
    expect(shell).toContain('variant="tool"');
    expect(shell).toContain("<MarketScopeNotice");
    expect(shell).toContain("<Container");
    expect(shell).toContain('slotKey="calculator_mid"');
    expect(shell).toContain('slotKey="calculator_native"');
    expect(shell).toContain("Not determined");
  });
});
