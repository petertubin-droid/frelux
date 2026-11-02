import { describe, it, expect, beforeEach } from "vitest";
import {
  loadFont,
  clearDynamicFonts,
  loadTypographyFonts,
  preloadFontForPreview,
} from "./font-loader";
import { getFont } from "./font-library";

describe("font-loader", () => {
  beforeEach(() => {
    clearDynamicFonts();
  });

  it("loadFont injects a link tag into the document head", () => {
    loadFont("Inter");
    const link = document.head.querySelector('link[data-font-loader="Inter"]');
    expect(link).toBeTruthy();
    expect((link as HTMLLinkElement)?.rel).toBe("stylesheet");
    expect((link as HTMLLinkElement)?.href).toContain(
      "fonts.googleapis.com/css2",
    );
    expect((link as HTMLLinkElement)?.href).toContain("family=Inter");
  });

  it("loadFont does not duplicate for same family", () => {
    loadFont("Inter");
    loadFont("Inter");
    const links = document.head.querySelectorAll(
      'link[data-font-loader="Inter"]',
    );
    expect(links.length).toBe(1);
  });

  it("loadFont uses weights from font-library when available", () => {
    const font = getFont("Inter");
    loadFont("Inter");
    const link = document.head.querySelector(
      'link[data-font-loader="Inter"]',
    ) as HTMLLinkElement;
    if (font) {
      expect(link.href).toContain(font.weights.join(";"));
    }
  });

  it("loadFont uses default weights when font not in library", () => {
    loadFont("UnknownFontXYZ");
    const link = document.head.querySelector(
      'link[data-font-loader="UnknownFontXYZ"]',
    ) as HTMLLinkElement;
    expect(link.href).toContain("400;500;600;700");
  });

  it("loadTypographyFonts loads all unique families from config", () => {
    loadTypographyFonts({
      body: "Inter",
      headings: "Plus Jakarta Sans",
      navigation: "Inter",
      buttons: "Plus Jakarta Sans",
      calculatorTitles: "Inter",
      calculatorResults: "Plus Jakarta Sans",
      admin: "Inter",
    });
    const interLink = document.head.querySelector(
      'link[data-font-loader="Inter"]',
    );
    const pjkLink = document.head.querySelector(
      'link[data-font-loader="Plus Jakarta Sans"]',
    );
    expect(interLink).toBeTruthy();
    expect(pjkLink).toBeTruthy();
  });

  it("preloadFontForPreview calls loadFont", () => {
    preloadFontForPreview("Roboto");
    const link = document.head.querySelector('link[data-font-loader="Roboto"]');
    expect(link).toBeTruthy();
  });

  it("clearDynamicFonts removes all loaded font links", () => {
    loadFont("Inter");
    loadFont("Roboto");
    expect(
      document.head.querySelectorAll("link[data-font-loader]").length,
    ).toBe(2);
    clearDynamicFonts();
    expect(
      document.head.querySelectorAll("link[data-font-loader]").length,
    ).toBe(0);
  });

  it("buildFontUrl encodes spaces as +", () => {
    loadFont("Plus Jakarta Sans");
    const link = document.head.querySelector(
      'link[data-font-loader="Plus Jakarta Sans"]',
    ) as HTMLLinkElement;
    expect(link.href).toContain("family=Plus+Jakarta+Sans");
  });
});
