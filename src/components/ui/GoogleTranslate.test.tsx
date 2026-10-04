/**
 * Google Translate integration - unit tests.
 */
import { describe, it, expect } from "vitest";
import {
  mapToGoogleLanguage,
  isGoogleTranslatedLanguage,
} from "./GoogleTranslate";

describe("mapToGoogleLanguage", () => {
  it("maps FRELUX codes to Google widget codes where they differ", () => {
    expect(mapToGoogleLanguage("zh")).toBe("zh-CN");
  });

  it("passes GT-supported languages through unchanged", () => {
    for (const code of ["en", "fr", "pt", "sw", "ar"] as const) {
      expect(mapToGoogleLanguage(code)).toBe(code);
    }
  });

  it("restores English by targeting en", () => {
    expect(mapToGoogleLanguage("en")).toBe("en");
  });
});

describe("isGoogleTranslatedLanguage", () => {
  it("accepts every registered international language", () => {
    for (const code of ["en", "fr", "pt", "sw", "ar", "zh"] as const) {
      expect(isGoogleTranslatedLanguage(code)).toBe(true);
    }
  });
});
