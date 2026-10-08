import { describe, it, expect } from "vitest";
import {
  detectSuggestedLanguage,
  languageForBrowserLocales,
  languageForTimezone,
} from "./locale-suggest";

describe("languageForTimezone", () => {
  it("maps a Paris visitor to French", () => {
    expect(languageForTimezone("Europe/Paris")).toBe("fr");
  });

  it("maps the other home markets", () => {
    expect(languageForTimezone("Europe/Berlin")).toBe("de");
    expect(languageForTimezone("America/Sao_Paulo")).toBe("pt");
    expect(languageForTimezone("Asia/Shanghai")).toBe("zh");
    expect(languageForTimezone("Asia/Kolkata")).toBe("hi");
    expect(languageForTimezone("Africa/Nairobi")).toBe("sw");
    expect(languageForTimezone("Asia/Jakarta")).toBe("id");
    expect(languageForTimezone("Africa/Cairo")).toBe("ar");
    expect(languageForTimezone("Europe/Moscow")).toBe("ru");
    expect(languageForTimezone("Europe/Madrid")).toBe("es");
  });

  it("returns null for English and unknown zones", () => {
    expect(languageForTimezone("Europe/London")).toBeNull();
    expect(languageForTimezone("America/New_York")).toBeNull();
    expect(languageForTimezone("Mars/Olympus_Mons")).toBeNull();
    expect(languageForTimezone(null)).toBeNull();
  });
});

describe("languageForBrowserLocales", () => {
  it("uses the first supported non-English browser language", () => {
    expect(languageForBrowserLocales(["fr-FR", "fr", "en-US", "en"])).toBe(
      "fr",
    );
    expect(languageForBrowserLocales(["en-US", "de-DE"])).toBe("de");
  });

  it("skips English entirely — it is the default, nothing to suggest", () => {
    expect(languageForBrowserLocales(["en-US", "en-GB"])).toBeNull();
  });

  it("handles empty and malformed input", () => {
    expect(languageForBrowserLocales([])).toBeNull();
    expect(languageForBrowserLocales(null)).toBeNull();
    expect(languageForBrowserLocales(["xx-YY"])).toBeNull();
  });
});

describe("detectSuggestedLanguage", () => {
  it("location (timezone) wins over browser language — the Paris case", () => {
    expect(
      detectSuggestedLanguage({
        timezone: "Europe/Paris",
        browserLanguages: ["en-US", "en"],
      }),
    ).toBe("fr");
  });

  it("falls back to the browser language when the timezone is unmapped", () => {
    expect(
      detectSuggestedLanguage({
        timezone: "America/New_York",
        browserLanguages: ["fr-CA", "en-US"],
      }),
    ).toBe("fr");
  });

  it("returns null when both signals are unmapped", () => {
    expect(
      detectSuggestedLanguage({
        timezone: "America/New_York",
        browserLanguages: ["en-US"],
      }),
    ).toBeNull();
  });
});
