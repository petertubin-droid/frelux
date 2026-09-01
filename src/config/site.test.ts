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
describe("navWorkspaces — Smart Calculator entry", () => {
  // Smart Calculator lives inside the Construction workspace's children
  const construction = navWorkspaces.find((w) => w.label === "Construction");
  const allChildren = (construction?.children ?? []) as {
    label: string;
    path: string;
    section?: string;
  }[];

  it("Construction workspace exists", () => {
    expect(construction).toBeTruthy();
  });

  it("includes a Smart Calculator entry in Construction children", () => {
    const smart = allChildren.find((c) => c.label === "Smart Calculator");
    expect(smart).toBeTruthy();
    expect(smart!.path).toBe("/smart-calculator");
  });

  it("Smart Calculator is in the AI Tools section", () => {
    const smart = allChildren.find((c) => c.label === "Smart Calculator");
    expect(smart!.section).toBe("AI Tools");
  });
});
