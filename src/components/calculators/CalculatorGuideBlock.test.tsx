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

const renderGuide = () =>
  render(<CalculatorGuideBlock guide={paintCalculatorGuide} />);

describe("CalculatorGuideBlock structure", () => {
  it("renders a heading and the three content sections as real headings", () => {
    renderGuide();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /How the painting calculator works/i,
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 3, name: /How it works/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 3, name: /Worked example/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 3, name: /Questions people ask/i }),
    ).toBeTruthy();
  });

  it("puts the ratio figures in a table with a caption and column headers", () => {
    renderGuide();
    const table = screen
      .getAllByRole("table")
      .find((t) => t.textContent?.includes("Coverage per litre"));
    expect(table).toBeTruthy();
    expect(table?.querySelector("caption")?.textContent).toMatch(
      /Typical coverage per litre/i,
    );
    const headers = Array.from(table?.querySelectorAll("th") ?? []);
    expect(headers.length).toBe(3);
    headers.forEach((th) => expect(th.getAttribute("scope")).toBe("col"));
  });

  it("renders every question as a details element, so it opens without script", () => {
    const { container } = renderGuide();
    const details = Array.from(container.querySelectorAll("details"));
    expect(details).toHaveLength(paintCalculatorGuide.faqs.length);
    details.forEach((d) => {
      expect(
        d.querySelector("summary")?.textContent?.trim().length,
      ).toBeGreaterThan(10);
    });
  });
});

describe("CalculatorGuideBlock content volume", () => {
  it("carries at least 500 words of real text", () => {
    const { container } = renderGuide();
    const words = (container.textContent ?? "")
      .split(/\s+/)
      .filter((w) => /[a-z0-9]/i.test(w));
    expect(words.length).toBeGreaterThanOrEqual(500);
  });

  it("uses no em dashes, per the house style", () => {
    const { container } = renderGuide();
    expect(container.textContent ?? "").not.toContain("\u2014");
    expect(container.textContent ?? "").not.toContain("--");
  });

  it("states what the tool does not do", () => {
    renderGuide();
    expect(screen.getByText(/does not price labour or access/i)).toBeTruthy();
  });
});
