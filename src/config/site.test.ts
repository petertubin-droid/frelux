import { describe, it, expect } from "vitest";
import { siteConfig, navWorkspaces, navLinks } from "./site";

describe("config/site", () => {
  it("siteConfig has required fields", () => {
    expect(siteConfig.name).toBeTruthy();
    expect(siteConfig.shortName).toBeTruthy();
    expect(siteConfig.tagline).toBeTruthy();
    expect(siteConfig.email).toBeTruthy();
  });

  it("siteConfig has whatsapp config", () => {
    expect(siteConfig.whatsappNumber).toBeTruthy();
    expect(siteConfig.whatsappDisplay).toBeTruthy();
  });

  it("siteConfig has adsense config", () => {
    expect(siteConfig.adsense).toBeTruthy();
    expect(typeof siteConfig.adsense.publisherId).toBe("string");
  });

  it("navWorkspaces has entries", () => {
    expect(navWorkspaces.length).toBeGreaterThan(0);
  });

  it("each navWorkspace has label and path", () => {
    for (const ws of navWorkspaces) {
      expect(ws.label).toBeTruthy();
      expect(ws.path).toBeTruthy();
    }
  });

  it("navLinks maps from navWorkspaces", () => {
    expect(navLinks.length).toBe(navWorkspaces.length);
    for (const link of navLinks) {
      expect(link.label).toBeTruthy();
      expect(link.path).toBeTruthy();
    }
  });
});
describe("navWorkspaces, Smart Calculator entry", () => {
  // Smart Calculator lives inside the Construction Tools library, surfaced
  // through the AI Assistants section of the generated dropdown.
  const tools = navWorkspaces.find((w) => w.label === "Construction Tools");
  const allChildren = (tools?.children ?? []) as {
    label: string;
    path: string;
    section?: string;
  }[];

  it("Construction Tools workspace exists", () => {
    expect(tools).toBeTruthy();
    expect(tools!.path).toBe("/construction-tools");
  });

  it("includes a Smart Calculator entry in Construction Tools children", () => {
    const smart = allChildren.find((c) => c.label === "Smart Calculator");
    expect(smart).toBeTruthy();
    expect(smart!.path).toBe("/smart-calculator");
  });

  it("Smart Calculator is in the AI Assistants section", () => {
    const smart = allChildren.find((c) => c.label === "Smart Calculator");
    expect(smart!.section).toBe("AI Assistants");
  });

  it("has no calculator/estimator duplicate nav entries", () => {
    // The old nav exposed mode variants as separate tools (e.g. "Screeding
    // Cost Estimator" = /screeding-calculator?mode=cost). Every nav child
    // must now point at the authoritative tool route, one entry per route.
    // One nav entry per authoritative route: no mode-query duplicates.
    const paths = allChildren.map((c) => c.path.replace(/\?.*$/, ""));
    const dupes = paths.filter((p, i) => paths.indexOf(p) !== i);
    expect(dupes).toEqual([]);
    // The old mode-duplicate labels must be gone from the nav (genuine
    // product names like "Build-to-Roof Estimator" are allowed).
    const banned = [
      "Paint Cost Estimator",
      "Screeding Cost Estimator",
      "POP Cost Estimator",
      "Tile Cost Estimator",
      "Tyrolene Estimator",
    ];
    const labels = allChildren.map((c) => c.label);
    expect(labels.filter((l) => banned.includes(l))).toEqual([]);
  });
});
