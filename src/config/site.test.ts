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
