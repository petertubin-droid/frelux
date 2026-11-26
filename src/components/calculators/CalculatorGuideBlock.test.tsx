/**
 * CalculatorGuideBlock conformance (AdSense thin-content fix, 2026-11-25).
 *
 * The point of this component is that the words are in the HTML a crawler
 * receives, so the tests check structure and volume rather than appearance:
 * real headings, a real table with a caption and scoped headers, questions that
 * open without JavaScript, and enough words to not be thin.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import CalculatorGuideBlock from "@/components/calculators/CalculatorGuideBlock";
import { paintCalculatorGuide } from "@/content/calculator-guides/paint-calculator";
import { screedingCalculatorGuide } from "@/content/calculator-guides/screeding-calculator";
import { foundationCalculatorGuide } from "@/content/calculator-guides/foundation-calculator";
import { tileCalculatorGuide } from "@/content/calculator-guides/tile-calculator";
import { fenceBlockCalculatorGuide } from "@/content/calculator-guides/fence-block-calculator";
import { germanFloorCalculatorGuide } from "@/content/calculator-guides/german-floor-calculator";
import { plasterRenderCalculatorGuide } from "@/content/calculator-guides/plaster-render-calculator";
import { popCeilingCalculatorGuide } from "@/content/calculator-guides/pop-ceiling-calculator";
import { wallpaperCalculatorGuide } from "@/content/calculator-guides/wallpaper-calculator";
import { waterproofingEstimatorGuide } from "@/content/calculator-guides/waterproofing-estimator";
import { roofFramingEstimatorGuide } from "@/content/calculator-guides/roof-framing-estimator";
import { doorsWindowsEstimatorGuide } from "@/content/calculator-guides/doors-windows-estimator";
import { conduitWiringEstimatorGuide } from "@/content/calculator-guides/conduit-wiring-estimator";
import { plumbingEstimatorGuide } from "@/content/calculator-guides/plumbing-estimator";
import { tvConsoleCalculatorGuide } from "@/content/calculator-guides/tv-console-calculator";
import { reinforcementEstimatorGuide } from "@/content/calculator-guides/reinforcement-estimator";
import { earthworksEstimatorGuide } from "@/content/calculator-guides/earthworks-estimator";
import { retainingWallEstimatorGuide } from "@/content/calculator-guides/retaining-wall-estimator";
import { flooringEstimatorGuide } from "@/content/calculator-guides/flooring-estimator";
import { increteFlooringEstimatorGuide } from "@/content/calculator-guides/increte-flooring-estimator";

const allGuides = [
  paintCalculatorGuide,
  screedingCalculatorGuide,
  foundationCalculatorGuide,
  tileCalculatorGuide,
  fenceBlockCalculatorGuide,
  germanFloorCalculatorGuide,
  plasterRenderCalculatorGuide,
  popCeilingCalculatorGuide,
  wallpaperCalculatorGuide,
  waterproofingEstimatorGuide,
  roofFramingEstimatorGuide,
  doorsWindowsEstimatorGuide,
  conduitWiringEstimatorGuide,
  plumbingEstimatorGuide,
  tvConsoleCalculatorGuide,
  reinforcementEstimatorGuide,
  earthworksEstimatorGuide,
  retainingWallEstimatorGuide,
  flooringEstimatorGuide,
  increteFlooringEstimatorGuide,
];

describe("CalculatorGuideBlock structure", () => {
  it.each(allGuides)(
    "renders headings and content sections for $slug",
    (guide) => {
      const { unmount } = render(<CalculatorGuideBlock guide={guide} />);
      expect(
        screen.getByRole("heading", {
          level: 2,
          name: new RegExp(guide.heading, "i"),
        }),
      ).toBeTruthy();
      expect(
        screen.getByRole("heading", { level: 3, name: /How it works/i }),
      ).toBeTruthy();
      expect(
        screen.getByRole("heading", { level: 3, name: /Worked example/i }),
      ).toBeTruthy();
      expect(
        screen.getByRole("heading", {
          level: 3,
          name: /Questions people ask/i,
        }),
      ).toBeTruthy();
      unmount();
    },
  );

  it.each(allGuides)(
    "puts ratio/coverage figures in a table with caption and headers for $slug",
    (guide) => {
      const { unmount } = render(<CalculatorGuideBlock guide={guide} />);
      const tables = screen.getAllByRole("table");
      expect(tables.length).toBeGreaterThanOrEqual(2);
      const ratioTable = tables[1];
      expect(ratioTable.querySelector("caption")?.textContent).toMatch(
        new RegExp(guide.ratioTable.caption.slice(0, 20), "i"),
      );
      const headers = Array.from(ratioTable.querySelectorAll("th"));
      expect(headers.length).toBe(guide.ratioTable.columns.length);
      headers.forEach((th) => expect(th.getAttribute("scope")).toBe("col"));
      unmount();
    },
  );

  it.each(allGuides)(
    "renders every question as a details element for $slug",
    (guide) => {
      const { container, unmount } = render(
        <CalculatorGuideBlock guide={guide} />,
      );
      const details = Array.from(container.querySelectorAll("details"));
      expect(details).toHaveLength(guide.faqs.length);
      details.forEach((d) => {
        expect(
          d.querySelector("summary")?.textContent?.trim().length,
        ).toBeGreaterThan(10);
      });
      unmount();
    },
  );
});

describe("CalculatorGuideBlock content volume", () => {
  it.each(allGuides)(
    "carries at least 500 words of real text for $slug",
    (guide) => {
      const { container, unmount } = render(
        <CalculatorGuideBlock guide={guide} />,
      );
      const words = (container.textContent ?? "")
        .split(/\s+/)
        .filter((w) => /[a-z0-9]/i.test(w));
      expect(words.length).toBeGreaterThanOrEqual(500);
      unmount();
    },
  );

  it.each(allGuides)(
    "uses no em dashes per the house style for $slug",
    (guide) => {
      const { container, unmount } = render(
        <CalculatorGuideBlock guide={guide} />,
      );
      expect(container.textContent ?? "").not.toContain("—");
      expect(container.textContent ?? "").not.toContain("--");
      unmount();
    },
  );

  it.each(allGuides)(
    "states what the tool does not do in limits for $slug",
    (guide) => {
      const { container, unmount } = render(
        <CalculatorGuideBlock guide={guide} />,
      );
      expect(guide.limits).toBeTruthy();
      expect(container.textContent).toContain(guide.limits!);
      unmount();
    },
  );
});
