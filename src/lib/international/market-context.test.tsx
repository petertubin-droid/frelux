import { describe, it, expect } from "vitest";
import {
  DEFAULT_MARKET_CODE,
  NIGERIA_DEFAULTS,
} from "@/lib/international/market-context";

describe("DEFAULT_MARKET_CODE", () => {
  it("is NG", () => {
    expect(DEFAULT_MARKET_CODE).toBe("NG");
  });
});

describe("NIGERIA_DEFAULTS", () => {
  it("has Nigeria country name", () => {
    expect(NIGERIA_DEFAULTS.countryName).toBe("Nigeria");
  });
  it("uses NGN currency", () => {
    expect(NIGERIA_DEFAULTS.currencyCode).toBe("NGN");
    expect(NIGERIA_DEFAULTS.currencySymbol).toBe("₦");
  });
  it("uses mixed measurement system", () => {
    expect(NIGERIA_DEFAULTS.measurementSystem).toBe("mixed");
  });
  it("defaults to meters and sqm", () => {
    expect(NIGERIA_DEFAULTS.defaultLengthUnit).toBe("meters");
    expect(NIGERIA_DEFAULTS.defaultAreaUnit).toBe("sqm");
  });
  it("supports feet and inches", () => {
    expect(NIGERIA_DEFAULTS.supportedLengthUnits).toContain("feet");
    expect(NIGERIA_DEFAULTS.supportedLengthUnits).toContain("inches");
  });
  it("supports sqft", () => {
    expect(NIGERIA_DEFAULTS.supportedAreaUnits).toContain("sqft");
  });
  it("defaults to English language", () => {
    expect(NIGERIA_DEFAULTS.defaultLanguage).toBe("en");
  });
  it("has local terminology for paint bucket", () => {
    expect(NIGERIA_DEFAULTS.localTerminology.paint_bucket).toContain("gallon");
  });
  it("has local terminology for cement bag", () => {
    expect(NIGERIA_DEFAULTS.localTerminology.cement_bag).toContain("50kg");
  });
  it("has local terminology for tile carton", () => {
    expect(NIGERIA_DEFAULTS.localTerminology.tile_carton).toBe("carton");
  });
  it("is active", () => {
    expect(NIGERIA_DEFAULTS.status).toBe("active");
  });
  it("has profile version", () => {
    expect(NIGERIA_DEFAULTS.profileVersion).toBeTruthy();
  });
  it("has all required localTerminology keys", () => {
    const keys = Object.keys(NIGERIA_DEFAULTS.localTerminology);
    expect(keys).toContain("paint_bucket");
    expect(keys).toContain("cement_bag");
    expect(keys).toContain("white_cement_bag");
    expect(keys).toContain("screeding_mix");
    expect(keys).toContain("tile_carton");
    expect(keys).toContain("pop_bag");
  });
});
