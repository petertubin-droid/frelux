import { describe, expect, it } from "vitest";
import {
  CORE_CATALOG,
  GENERATED_DICTIONARIES,
  UI_CATALOG,
  approvedOverrides,
  CHROME_COMPLETE_LOCALES,
  coverageFor,
  coverageReport,
  isChromeComplete,
} from "@/lib/i18n-coverage";
import { LANGUAGES, translations } from "@/lib/i18n";
import { INDEXABLE_LOCALES } from "@/lib/translation-index";

const TARGET_LOCALES = [
  "es",
  "fr",
  "de",
  "pt",
  "ar",
  "hi",
  "zh",
  "ja",
  "ru",
  "id",
  "sw",
  "nl",
] as const;

describe("interface coverage", () => {
  it("translates every interface string in every target language", () => {
    for (const language of TARGET_LOCALES) {
      const coverage = coverageFor(language);
      expect(coverage.total).toBe(UI_CATALOG.length);
      expect(coverage.missing, `${language} is missing strings`).toEqual([]);
      expect(coverage.percent).toBe(100);
      expect(isChromeComplete(language)).toBe(true);
    }
  });

  it("covers the navigation and footer catalog everywhere", () => {
    for (const language of TARGET_LOCALES) {
      const dictionary = translations[language] as Record<string, string>;
      for (const key of CORE_CATALOG) {
        expect(dictionary[key], `${language} is missing "${key}"`).toBeTruthy();
      }
    }
  });

  it("counts English as complete without a dictionary", () => {
    const coverage = coverageFor("en");
    expect(coverage.percent).toBe(100);
    expect(coverage.missing).toEqual([]);
  });

  it("holds the same key set in every generated dictionary", () => {
    const baseline = Object.keys(GENERATED_DICTIONARIES.es).sort();
    expect(baseline.length).toBeGreaterThan(500);
    for (const language of TARGET_LOCALES) {
      const keys = Object.keys(GENERATED_DICTIONARIES[language]).sort();
      expect(keys, `${language} key set drifted`).toEqual(baseline);
    }
  });

  it("orders the report worst-first so gaps surface", () => {
    const report = coverageReport();
    for (let i = 1; i < report.length; i += 1) {
      expect(report[i].percent).toBeGreaterThanOrEqual(report[i - 1].percent);
    }
    expect(report).toHaveLength(LANGUAGES.length);
  });
});

describe("translation hygiene", () => {
  it("uses no em dashes in any translation", () => {
    // Owner rule: em dashes stay out of the interface, in every language.
    for (const language of TARGET_LOCALES) {
      const dictionary = GENERATED_DICTIONARIES[language];
      const offenders = Object.entries(dictionary)
        .filter(([, value]) => String(value).includes("\u2014"))
        .map(([key]) => key);
      expect(offenders, `${language} contains em dashes`).toEqual([]);
    }
  });

  it("keeps placeholders intact", () => {
    for (const language of TARGET_LOCALES) {
      for (const [key, value] of Object.entries(
        GENERATED_DICTIONARIES[language],
      )) {
        const sourceTokens = key.match(/\{[a-zA-Z0-9_]+\}|%[sd]/g) ?? [];
        for (const token of sourceTokens) {
          expect(
            String(value),
            `${language}: "${key}" lost ${token}`,
          ).toContain(token);
        }
      }
    }
  });

  it("has no empty values in the approved overrides", () => {
    for (const [language, entries] of Object.entries(approvedOverrides)) {
      if (language.startsWith("_")) continue;
      for (const [key, value] of Object.entries(
        entries as Record<string, string>,
      )) {
        expect(
          String(value).trim().length,
          `${language}: "${key}" is empty`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("curates every navigation and footer label by hand", () => {
    // Navigation is the one place a machine slip is unforgivable: "Developer
    // API" came back as "Desarrollador 20" and every locale shipped it in the
    // header. Chrome labels therefore require an approved override, not just
    // any non-empty translation.
    for (const locale of TARGET_LOCALES) {
      const curated = approvedOverrides[locale] as
        Record<string, string> | undefined;
      for (const key of CORE_CATALOG) {
        expect(
          curated?.[key],
          `${locale} has no curated label for "${key}"`,
        ).toBeTruthy();
      }
    }
  });

  it("keeps acronyms intact in curated labels", () => {
    // A digit inside this label means the engine rewrote "API" as a number
    // ("Desarrollador 20"). Arabic, Indic and CJK locales namespell the term
    // instead, which is correct, so only the Latin-script ones must keep it.
    const LATIN = ["es", "fr", "de", "pt", "id", "sw", "nl"];
    for (const [locale, entries] of Object.entries(approvedOverrides)) {
      if (locale.startsWith("_")) continue;
      const api = (entries as Record<string, string>)["Developer API"];
      if (!api) continue;
      expect(api, `${locale} contains a stray number`).not.toMatch(/\d/);
      if (LATIN.includes(locale)) {
        expect(api, `${locale} lost the API acronym`).toMatch(/API/);
      }
    }
  });

  it("fixes the ambiguous words machine translation gets wrong", () => {
    // Regression guard: a bare "Save" must not become "Ahorrar" (to save money).
    const spanish = approvedOverrides.es as Record<string, string>;
    expect(spanish.Save).toBe("Guardar");
    expect(spanish.Remove).not.toBe(spanish.Delete);
    expect((approvedOverrides.ja as Record<string, string>).Save).toBe("保存");
  });
});

describe("indexing gate", () => {
  it("never indexes a locale whose interface is not fully translated", () => {
    for (const locale of INDEXABLE_LOCALES) {
      expect(isChromeComplete(locale)).toBe(true);
    }
  });

  it("keeps every target locale in the complete set", () => {
    for (const locale of TARGET_LOCALES) {
      expect(CHROME_COMPLETE_LOCALES).toContain(locale);
    }
  });
});
