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
    expect(mapToGoogleLanguage("fulfulde")).toBe("ff");
    expect(mapToGoogleLanguage("kanuri")).toBe("kr");
  });

  it("passes GT-supported languages through unchanged", () => {
    for (const code of ["en", "yo", "ha", "ig"] as const) {
      expect(mapToGoogleLanguage(code)).toBe(code);
    }
  });

  it("restores English by targeting en", () => {
    expect(mapToGoogleLanguage("en")).toBe("en");
  });
});

describe("isGoogleTranslatedLanguage", () => {
  it("accepts the major Nigerian languages Google supports", () => {
    expect(isGoogleTranslatedLanguage("yo")).toBe(true);
    expect(isGoogleTranslatedLanguage("ha")).toBe(true);
    expect(isGoogleTranslatedLanguage("ig")).toBe(true);
    expect(isGoogleTranslatedLanguage("fulfulde")).toBe(true);
    expect(isGoogleTranslatedLanguage("kanuri")).toBe(true);
  });

  it("flags languages Google does not offer as dictionary-only", () => {
    for (const code of [
      "pidgin",
      "efik",
      "tiv",
      "ijaw",
      "nupe",
      "ebira",
      "ibibio",
      "igala",
      "urhobo",
      "eso",
    ]) {
      expect(isGoogleTranslatedLanguage(code as any)).toBe(false);
    }
  });
});
