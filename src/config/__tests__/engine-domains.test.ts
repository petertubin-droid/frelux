import { describe, expect, it } from "vitest";
import {
  DOMAIN_LABELS,
  ENGINE_DOMAINS,
  PLATFORM_TOOLS,
  TOOL_DOMAINS,
  domainForTool,
  resolveDomainTool,
  toolsByDomain,
  toolsInDomain,
} from "@/config/engine-domains";
import { CONSTRUCTION_TOOLS, findTool } from "@/config/construction-tools";
import { ALL_MARKET_CODES } from "@/lib/international/capability-registry";

const catalogueSlugs = CONSTRUCTION_TOOLS.map((tool) => tool.slug);

describe("domain registry coverage", () => {
  it("classifies every catalogue tool exactly once", () => {
    const classified = Object.keys(TOOL_DOMAINS);
    const platform = Object.keys(PLATFORM_TOOLS);
    expect([...classified, ...platform].sort()).toEqual(
      [...catalogueSlugs].sort(),
    );
    expect(new Set([...classified, ...platform]).size).toBe(
      classified.length + platform.length,
    );
    expect(catalogueSlugs.length).toBe(80);
  });

  it("names no tool the catalogue does not have", () => {
    for (const slug of [
      ...Object.keys(TOOL_DOMAINS),
      ...Object.keys(PLATFORM_TOOLS),
    ]) {
      expect(findTool(slug), slug).toBeDefined();
    }
    for (const slug of Object.keys(PLATFORM_TOOLS)) {
      expect(TOOL_DOMAINS[slug], slug).toBeUndefined();
    }
  });

  it("uses only the six domains and leaves none empty", () => {
    for (const domain of Object.values(TOOL_DOMAINS)) {
      expect(ENGINE_DOMAINS).toContain(domain);
    }
    const grouped = toolsByDomain();
    for (const domain of ENGINE_DOMAINS) {
      expect(grouped[domain].length, domain).toBeGreaterThan(0);
      expect(DOMAIN_LABELS[domain].length).toBeGreaterThan(0);
    }
  });

  it("keeps every classified tool on a real route", () => {
    for (const slug of Object.keys(TOOL_DOMAINS)) {
      const tool = findTool(slug);
      expect(tool?.to.startsWith("/"), slug).toBe(true);
    }
  });
});

describe("reading a tool in its domain", () => {
  it("assigns the ground-floor tools to substructure", () => {
    expect(domainForTool("german-floor")).toBe("substructure");
    expect(domainForTool("foundation-designer")).toBe("substructure");
    expect(domainForTool("retaining-wall")).toBe("substructure");
  });

  it("says a platform tool belongs to no domain", () => {
    expect(domainForTool("measurement-converter")).toBeNull();
    expect(domainForTool("photo-estimator")).toBeNull();
    expect(domainForTool("not-a-tool")).toBeNull();
  });

  it("resolves a real tool with its catalogue title and route", () => {
    const resolved = resolveDomainTool("german-floor", "NG");
    expect(resolved).not.toBeNull();
    expect(resolved?.title).toBe(findTool("german-floor")?.title);
    expect(resolved?.path).toBe(findTool("german-floor")?.to);
    expect(resolved?.domain).toBe("substructure");
    expect(resolved?.marketCode).toBe("NG");
    expect(resolved?.marketSupported).toBe(true);
  });

  it("treats UK as GB instead of falling through", () => {
    expect(resolveDomainTool("masonry-calculator", "UK")?.marketCode).toBe(
      "GB",
    );
    expect(resolveDomainTool("masonry-calculator", "gb")?.marketCode).toBe(
      "GB",
    );
  });

  it("keeps an unsupported market visible rather than inventing one", () => {
    const resolved = resolveDomainTool("paint", "ZZ");
    expect(resolved?.marketCode).toBe("ZZ");
    expect(resolved?.marketSupported).toBe(false);
    expect(resolved?.marketBundleCode).toBeNull();
  });

  it("refuses a platform tool and an unknown slug", () => {
    expect(resolveDomainTool("measurement-converter", "NG")).toBeNull();
    expect(resolveDomainTool("does-not-exist", "NG")).toBeNull();
  });

  it("covers the approved markets from the registry, not a copy", () => {
    expect(ALL_MARKET_CODES.length).toBe(32);
    const covered = ALL_MARKET_CODES.filter(
      (code) => resolveDomainTool("paint", code)?.marketSupported,
    );
    expect(covered.length).toBe(ALL_MARKET_CODES.length);
  });

  it("records no tax rate or accuracy figure on a resolved tool", () => {
    const resolved = resolveDomainTool("tile", "KE");
    expect(resolved && "taxRatePct" in resolved).toBe(false);
    expect(resolved && "overallScore" in resolved).toBe(false);
  });

  it("groups tools without losing or duplicating one", () => {
    const grouped = ENGINE_DOMAINS.flatMap((domain) =>
      toolsInDomain(domain).map((tool) => tool.slug),
    );
    expect(grouped.length).toBe(Object.keys(TOOL_DOMAINS).length);
    expect(new Set(grouped).size).toBe(grouped.length);
  });
});
