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

  it("maps francophone West/Central Africa to French (i18n batch 2026-10-23)", () => {
    // ECOWAS/CEMAC construction markets — previously undetectable.
    expect(languageForTimezone("Africa/Abidjan")).toBe("fr");
    expect(languageForTimezone("Africa/Dakar")).toBe("fr");
    expect(languageForTimezone("Africa/Bamako")).toBe("fr");
    expect(languageForTimezone("Africa/Ouagadougou")).toBe("fr");
    expect(languageForTimezone("Africa/Niamey")).toBe("fr");
    expect(languageForTimezone("Africa/Lome")).toBe("fr");
    expect(languageForTimezone("Africa/Porto-Novo")).toBe("fr");
    expect(languageForTimezone("Africa/Conakry")).toBe("fr");
    expect(languageForTimezone("Africa/Douala")).toBe("fr");
    expect(languageForTimezone("Africa/Libreville")).toBe("fr");
    expect(languageForTimezone("Africa/Brazzaville")).toBe("fr");
    expect(languageForTimezone("Africa/Kinshasa")).toBe("fr");
    expect(languageForTimezone("Africa/Bangui")).toBe("fr");
  });

  it("maps Lusophone Africa to Portuguese and the Maghreb to Arabic (i18n batch 2026-10-23)", () => {
    expect(languageForTimezone("Africa/Luanda")).toBe("pt");
    expect(languageForTimezone("Africa/Maputo")).toBe("pt");
    expect(languageForTimezone("Africa/Algiers")).toBe("ar");
    expect(languageForTimezone("Africa/Casablanca")).toBe("ar");
    expect(languageForTimezone("Africa/Tunis")).toBe("ar");
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
