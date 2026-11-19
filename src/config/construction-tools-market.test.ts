import { describe, expect, it } from "vitest";
import {
  CONSTRUCTION_TOOLS,
  toolOfferedInMarket,
  toolsOfferedInMarket,
} from "@/config/construction-tools";

const bySlug = (slug: string) => {
  const tool = CONSTRUCTION_TOOLS.find((t) => t.slug === slug);
  if (!tool) throw new Error(`missing tool ${slug}`);
  return tool;
};

describe("market-aware tool catalogue", () => {
  it("offers the regional trades in their own markets", () => {
    expect(toolOfferedInMarket(bySlug("pop-ceiling"), "NG")).toBe(true);
    expect(toolOfferedInMarket(bySlug("pop-ceiling"), "GH")).toBe(true);
    expect(toolOfferedInMarket(bySlug("finish"), "NG")).toBe(true);
  });

  it("keeps Nigerian trade terms away from markets that do not use them", () => {
    expect(toolOfferedInMarket(bySlug("pop-ceiling"), "US")).toBe(false);
    expect(toolOfferedInMarket(bySlug("pop-ceiling"), "DE")).toBe(false);
    expect(toolOfferedInMarket(bySlug("finish"), "GB")).toBe(false);
  });

  it("offers an untagged tool in every market", () => {
    for (const market of ["NG", "US", "GB", "DE", "JP", "BR"]) {
      expect(toolOfferedInMarket(bySlug("paint"), market)).toBe(true);
    }
  });

  it("does not hide tools from a market it has no profile for", () => {
    // An unknown or blank market is not evidence that the tool is wrong there.
    expect(toolOfferedInMarket(bySlug("pop-ceiling"), "")).toBe(true);
    expect(toolOfferedInMarket(bySlug("pop-ceiling"), null)).toBe(true);
    expect(toolOfferedInMarket(bySlug("pop-ceiling"), "ZZ")).toBe(false);
  });

  it("matches market codes case-insensitively", () => {
    expect(toolOfferedInMarket(bySlug("pop-ceiling"), "ng")).toBe(true);
  });

  it("filters the catalogue without dropping untagged tools", () => {
    const us = toolsOfferedInMarket(CONSTRUCTION_TOOLS, "US");
    const ng = toolsOfferedInMarket(CONSTRUCTION_TOOLS, "NG");
    expect(us.length).toBe(CONSTRUCTION_TOOLS.length - 2);
    expect(ng.length).toBe(CONSTRUCTION_TOOLS.length);
    expect(us.some((t) => t.slug === "pop-ceiling")).toBe(false);
    expect(ng.some((t) => t.slug === "pop-ceiling")).toBe(true);
  });
});
