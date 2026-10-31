/**
 * Guardrails for the tool FAQ registry.
 *
 * FAQ copy is easy to let rot: a tool gets renamed, a route moves, an answer
 * picks up a number the engine does not use. These tests fail on the cheap
 * mistakes so the structured data Google reads stays truthful.
 */

import { describe, expect, it } from "vitest";
import fs from "fs";
import {
  FAQ_CATEGORIES,
  TOOL_FAQS,
  allToolFaqQuestions,
  getToolFaqGroup,
  toolFaqGroupsByCategory,
} from "./tool-faqs";

const appSource = fs.readFileSync("src/App.tsx", "utf-8");
const catIds = FAQ_CATEGORIES.map((c) => c.id);

describe("tool FAQ registry", () => {
  it("has unique slugs and unique questions", () => {
    const slugs = TOOL_FAQS.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);

    const questions = allToolFaqQuestions().map((q) => q.q.toLowerCase());
    expect(new Set(questions).size).toBe(questions.length);
  });

  it("points every group at a route that actually exists", () => {
    for (const group of TOOL_FAQS) {
      const skip = group.route === "/faq";
      if (skip) continue;
      expect(
        appSource,
        `${group.slug} route ${group.route} missing from App.tsx`,
      ).toContain(`path="${group.route}"`);
    }
  });

  it("answers are plain text, not markup or JSX", () => {
    for (const group of TOOL_FAQS) {
      for (const { q, a } of group.questions) {
        expect(
          q.trim().endsWith("?"),
          `question must be a question: ${q}`,
        ).toBe(true);
        expect(a, `answer for "${q}" must not contain HTML`).not.toMatch(
          /<[a-z/][^>]*>/i,
        );
        expect(
          a.length,
          `answer for "${q}" is too short to be useful`,
        ).toBeGreaterThan(60);
        expect(
          a.length,
          `answer for "${q}" is too long for a snippet`,
        ).toBeLessThan(420);
      }
    }
  });

  it("never hardcodes a tax rate or a currency figure", () => {
    for (const { q, a } of allToolFaqQuestions()) {
      expect(a, `answer "${q}" names a tax percentage`).not.toMatch(
        /\b\d{1,2}(?:\.\d+)?\s?%\s?(?:vat|tax)/i,
      );
      expect(a, `answer "${q}" quotes a currency amount`).not.toMatch(
        /[₦$£€]\s?\d/,
      );
    }
  });

  it("gives every tool enough questions to be worth the markup", () => {
    for (const group of TOOL_FAQS) {
      expect(
        group.questions.length,
        `${group.slug} has too few questions`,
      ).toBeGreaterThanOrEqual(3);
      expect(catIds, `${group.slug} has an unknown category`).toContain(
        group.category,
      );
    }
  });

  it("indexes and filters groups by category", () => {
    expect(getToolFaqGroup("using-frelux")?.category).toBe("platform");
    expect(getToolFaqGroup("does-not-exist")).toBeUndefined();

    const finishes = toolFaqGroupsByCategory("finishes");
    expect(finishes.length).toBeGreaterThan(0);
    expect(finishes.every((g) => g.category === "finishes")).toBe(true);
    expect(
      toolFaqGroupsByCategory("finishes").length +
        toolFaqGroupsByCategory("structure").length +
        toolFaqGroupsByCategory("services").length +
        toolFaqGroupsByCategory("platform").length,
    ).toBe(TOOL_FAQS.length);
  });

  it("keeps the four specialty calculators answered", () => {
    for (const slug of [
      "retaining-wall-calculator",
      "soffit-gutter-cost-estimator",
      "conduit-wiring-estimator",
      "steel-beam-calculator",
    ]) {
      expect(getToolFaqGroup(slug), `${slug} has no FAQ group`).toBeDefined();
    }
  });
});

describe("FAQ wiring", () => {
  const read = (p: string) => fs.readFileSync(p, "utf-8");

  it("serves the dedicated page with JSON-LD from the same questions", () => {
    const page = read("src/pages/Faq.tsx");
    expect(appSource).toContain('path="/faq"');
    expect(appSource).toContain("const Faq = lazy(");
    expect(page).toContain("useFaqJsonLd");
    expect(page).toContain("allToolFaqQuestions");
    expect(page).toContain("<FaqSection");
    expect(read("scripts/prerender.mjs")).toContain('path: "/faq"');
    expect(read("scripts/generate-sitemap.mjs")).toContain('path: "/faq"');
  });

  it("emits FAQPage markup from the rendered strings", () => {
    const seo = read("src/lib/seo.ts");
    expect(seo).toContain("export function useFaqJsonLd");
    expect(seo).toContain('"@type": "FAQPage"');
    const component = read("src/components/seo/ToolFaqs.tsx");
    expect(component).toContain("useFaqJsonLd(items)");
    expect(component).toContain("<FaqSection");
  });

  it("wires a real registry slug into every specialty calculator page", () => {
    const pages: [string, string][] = [
      ["src/pages/RetainingWallEstimator.tsx", "retaining-wall-calculator"],
      ["src/pages/SoffitGutterEstimator.tsx", "soffit-gutter-cost-estimator"],
      ["src/pages/ConduitWiringEstimator.tsx", "conduit-wiring-estimator"],
      ["src/pages/SteelBeamEstimator.tsx", "steel-beam-calculator"],
    ];
    for (const [path, slug] of pages) {
      const source = read(path);
      expect(source, `${path} must pass its FAQ slug`).toContain(
        `faqSlug="${slug}"`,
      );
      expect(
        getToolFaqGroup(slug),
        `${slug} missing from the registry`,
      ).toBeDefined();
    }
    expect(
      read("src/components/calculators/SpecialtyCalculatorShell.tsx"),
    ).toContain("<ToolFaqs slug={faqSlug} />");
  });
});

describe("hub FAQ schema", () => {
  const read = (p: string) => fs.readFileSync(p, "utf-8");

  it("the three finished-trade hubs emit markup from their own copy", () => {
    const hubs = [
      "src/pages/PaintingCalculatorHub.tsx",
      "src/pages/TileCalculatorHub.tsx",
      "src/pages/PopCeilingCalculatorHub.tsx",
    ];
    for (const hub of hubs) {
      const source = read(hub);
      expect(source, `${hub} must render through the schema wrapper`).toMatch(
        /<FaqItemsWithSchema faqs=\{/,
      );
      expect(source, `${hub} must not render a bare FaqSection`).not.toMatch(
        /<FaqSection faqs=\{/,
      );
    }
  });

  it("the wrapper pairs the accordion with FAQPage data", () => {
    const component = read("src/components/seo/ToolFaqs.tsx");
    const wrapper = component.slice(
      component.indexOf("export function FaqItemsWithSchema"),
    );
    expect(wrapper).toContain("useFaqJsonLd(faqs)");
    expect(wrapper).toContain("<FaqSection faqs={faqs}");
  });
});
